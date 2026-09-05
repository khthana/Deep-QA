'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');

const { ACCOUNTS } = require('../support/accounts');
const { COHORTS, PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { menuLink } = require('../support/shell');
const {
  PATH,
  openHeatmap,
  showIntake,
  orderPicker,
  WEAKEST_FIRST,
  codesOnScreen,
  belowCounts,
} = require('../support/all-students-screen');

/**
 * docs/acceptance/43-program-level-all-students.md — the half a browser can prove.
 *
 * `backend/test/program-results-students.test.js` owns every number: the
 * two-step roll-up, the band each score falls in, what a blank leaves out, the
 * two counts the order is built from, and who is refused which curriculum.
 * Repeating any of it here would be the same claim asserted twice.
 *
 * What is here exists only in front of the screen:
 *
 * - the roll comes from the **register** and not from the marks — every
 *   student of the intake has a row, including the ones nobody has assessed,
 *   which is the row a committee most needs to find and the one a heatmap
 *   built from `activity_scores` would silently omit;
 * - the order control **reorders** — the ticket's fourth criterion is a
 *   sequence of two drawings and cannot be seen in one payload;
 * - a grid wider than the window **scrolls in its own frame**, which is a
 *   measurement of layout and belongs nowhere else;
 * - an intake nobody has marked gets a sentence rather than a grid of dashes.
 *
 * ## The empty row builds its own cohort
 *
 * Every seeded intake has marks, so the row that wants an unmarked one enrols
 * a cohort of its own through the pool and takes it out again — 38a's shape
 * and 42a's, for the same reason: teardown through the screen would share a
 * defect with the subject.
 */

const db = createPool({ schema: E2E_SCHEMA });

const QUIET_INTAKE = '2401';
const QUIET_STUDENT = 'E43Q001';

/**
 * A student of the *seeded* intake whom nobody has marked.
 *
 * The seed marks everybody, so without this the first row could not tell a
 * roll taken from the register from one taken from the marks — and the mutation
 * sweep said so: `rollfrommarks` killed nothing until this student existed.
 * They are put on the register and taken off again, which is the ordinary shape
 * of a row that needs a situation the seed does not contain.
 */
const UNMARKED_STUDENT = 'E43U001';

test.afterAll(() => db.end());

test('the committee reaches the heatmap from the menu, and every student of the intake has a row', async ({
  page,
}) => {
  // Criterion 1. Both counts are read from the database at the moment of the
  // assertion rather than written here, so the row keeps saying *everybody* if
  // the roll or the curriculum grows.
  await signIn(page, ACCOUNTS.committee0501);
  const [current] = COHORTS;

  // Somebody on the register whom nobody has assessed. Every student the seed
  // enrols has marks, so a grid built from `activity_scores` would draw the
  // same 113 rows as one built from the register and the row would prove
  // nothing — which is what the sweep found.
  await db.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status)
     VALUES ($1, 'ยังไม่มีใคร', 'ประเมิน',
             (SELECT department_id FROM programs WHERE program_id = $2), $2, $3, 'active')`,
    [UNMARKED_STUDENT, PROGRAM, current.admission],
  );

  try {
    await menuLink(page, 'การประเมินผลการเรียนรู้').click();
    await menuLink(page, 'ระดับหลักสูตรของนักศึกษาทุกคน').click();
    await page.waitForURL(PATH);
    await showIntake(page, current.admission);

    const { rows } = await db.query(
      `SELECT
         (SELECT count(*)::int FROM student
           WHERE program_id = $1 AND admission_year = $2) AS roll,
         (SELECT count(*)::int FROM learning_outcomes
           WHERE program_id = $1 AND parent_outcome_id IS NULL) AS plos`,
      [PROGRAM, current.admission],
    );

    await expect(page.locator('tbody tr')).toHaveCount(rows[0].roll);
    // And the unassessed student is one of them, named, rather than a row that
    // happens to make the count come out right.
    await expect(page.getByText(UNMARKED_STUDENT)).toBeVisible();

    // Three columns of their own before the outcomes: code, name, and the
    // fraction the order is built from.
    await expect(page.locator('thead th')).toHaveCount(rows[0].plos + 3);
  } finally {
    await db.query(`DELETE FROM student WHERE student_id = $1`, [UNMARKED_STUDENT]);
  }
});

test('the order control puts the students with the most outcomes under the line first', async ({
  page,
}) => {
  // Criterion 4, which is two drawings and not one payload. The assertion is
  // that the sequence is non-increasing and that the first row is a worst row —
  // not that a particular student is first, which would be a fact about the
  // seed rather than about the sort.
  await signIn(page, ACCOUNTS.committee0501);
  await openHeatmap(page);

  const [current] = COHORTS;
  await showIntake(page, current.admission);

  const byCode = await codesOnScreen(page);
  expect(byCode).toEqual([...byCode].sort());

  await orderPicker(page).selectOption(WEAKEST_FIRST);

  const counts = await belowCounts(page);
  expect(counts.length).toBe(byCode.length);
  expect(counts).toEqual([...counts].sort((a, b) => b - a));
  expect(counts[0]).toBe(Math.max(...counts));

  // And the sort actually moved something: a control that reordered nothing
  // would satisfy every assertion above on a roll that happened to arrive in
  // the right order already.
  expect(counts[0]).toBeGreaterThan(counts[counts.length - 1]);
  expect(await codesOnScreen(page)).not.toEqual(byCode);
});

test('the heatmap scrolls in its own frame, so the far outcomes stay reachable', async ({
  page,
}) => {
  // Criterion 3. The shell clips sideways overflow, so a grid wider than a
  // narrow window does not push the page along — it loses its right-hand
  // columns off the edge with nothing to scroll them back, unless the frame
  // #98 established is there.
  await signIn(page, ACCOUNTS.committee0501);
  await openHeatmap(page);
  // A cohort with marks, or there is no grid to measure: the import rows
  // earlier in this suite enrol a newer intake than the seed has, the screen
  // opens on it, and an unmarked intake draws the sentence instead. #42's
  // lesson, and this row is where it was learned a second time.
  //
  // This comment was right and the guard under it was not: `showIntake` waited
  // for the report to arrive and not for the screen to draw it, so this row
  // read `document.querySelector('table')` in the gap and got null. It passed
  // twenty times alone and failed in the full suite, which is the only place
  // the previous intake is an unmarked one. The wait now ends on the cohort
  // line; see the helper.
  await showIntake(page, COHORTS[0].admission);
  await page.setViewportSize({ width: 640, height: 900 });

  const measured = await page.evaluate(() => {
    const table = document.querySelector('table');
    const frame = table.parentElement;
    frame.scrollLeft = 9999;
    return {
      wider: table.scrollWidth > frame.clientWidth,
      reachable: frame.scrollLeft > 0,
      pageScrollsSideways:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  expect(measured.wider).toBe(true);
  expect(measured.reachable).toBe(true);
  expect(measured.pageScrollsSideways).toBe(false);
});

test('an intake nobody has marked reads as a sentence, not as a grid of dashes', async ({
  page,
}) => {
  // Criterion 5. The cohort is on the roll and has sat nothing that has been
  // marked, and the screen says which of those two it is.
  await signIn(page, ACCOUNTS.committee0501);
  const section = await db.query(
    `SELECT cs.section_id FROM course_sections cs ORDER BY cs.section_id ASC LIMIT 1`,
  );
  await db.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status)
     VALUES ($1, 'รุ่น', 'ที่ยังไม่มีคะแนน',
             (SELECT department_id FROM programs WHERE program_id = $2), $2, $3, 'active')`,
    [QUIET_STUDENT, PROGRAM, QUIET_INTAKE],
  );
  await db.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
    QUIET_STUDENT,
    section.rows[0].section_id,
  ]);

  try {
    await openHeatmap(page);
    await showIntake(page, QUIET_INTAKE);

    await expect(page.getByText('ยังไม่มีคะแนนของนักศึกษารุ่นนี้')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  } finally {
    await db.query(`DELETE FROM student_course WHERE student_id = $1`, [QUIET_STUDENT]);
    await db.query(`DELETE FROM student WHERE student_id = $1`, [QUIET_STUDENT]);
  }
});

test('a teacher who types the address is refused, and is not left waiting for an answer that will never come', async ({
  page,
}) => {
  // Criterion 6, and the defect the hand-walk found underneath it.
  //
  // The refusal itself is the server's and is proved at the HTTP seam. What is
  // only here is what the refused screen then *does*: `loading` starts true and
  // the fetch returns early when there is no curriculum to ask about, so the
  // screen used to sit under its own refusal saying *กำลังโหลดข้อมูล…* for ever.
  // Nothing to ask for is an answer, not a wait.
  //
  // Every other row in this file signs in as an account that reaches the
  // screen, which is exactly why none of them could see it.
  await signIn(page, ACCOUNTS.teacherOne);
  await page.goto(PATH);

  await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('กำลังโหลดข้อมูล')).toHaveCount(0);
});

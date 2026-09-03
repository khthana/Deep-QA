'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { COHORTS, PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { menuLink } = require('../support/shell');
const {
  PATH,
  openReport,
  cohortLine,
  outcomeRow,
  showIntake,
  verdictOf,
  sourceButton,
  drillDown,
} = require('../support/program-results-screen');

/**
 * docs/acceptance/42-program-level-by-intake.md — the half a browser can prove.
 *
 * `backend/test/program-results.test.js` owns every number: the two steps of
 * the roll-up, the sixty per cent rule, what a blank leaves out of the
 * fraction, and who is refused which curriculum. Repeating any of that here
 * would be the same claim asserted twice, and the copy in the browser is the
 * one that goes stale.
 *
 * What is here exists only in front of the screen:
 *
 * - the two pickers **drive** the report rather than decorate it — changing the
 *   intake changes the cohort on screen, which no HTTP test can see because at
 *   that seam the two intakes are simply two different requests;
 * - the drill-down **opens on demand** and puts itself away, which is the whole
 *   of the fourth criterion's *selecting a PLO reveals* and is a sequence of
 *   states rather than a payload;
 * - an outcome nobody was measured against is drawn as a **third state**, and
 *   its chip carries the words as well as the colour — the defect #38 shipped
 *   and a hand-walk caught, built out of this screen from the start;
 * - the external assessor, whose only menu entry this is, actually arrives.
 *
 * ## Every row names the cohort it means
 *
 * The screen opens on the newest intake the curriculum has students in, and the
 * import rows earlier in this suite put students on the roll whose codes make
 * them newer than anything the seed has. A row that read whatever the report
 * opened on would be reading an unmarked cohort — and would pass on its own and
 * fail in the suite, which is the failure that teaches the least.
 *
 * ## The empty row builds its own cohort
 *
 * Every seeded intake has marks, which is the case the report is for and not
 * the case the sixth criterion is about. So the row that wants an unmarked
 * cohort enrols one of its own through the pool and takes it out again — the
 * shape 38a uses, and for the same reason: teardown through the screen would
 * share a defect with the subject.
 */

const db = createPool({ schema: E2E_SCHEMA });

/** The intake with no marks against it, invented by the row that needs one. */
const QUIET_INTAKE = '2400';
const QUIET_STUDENT = 'E42Q001';

test.afterAll(() => db.end());

test('the committee reaches the report from the menu and reads one row per outcome', async ({
  page,
}) => {
  // Criterion 1, as a person arrives at it. The count is the curriculum's own
  // outcomes read back from the database rather than a number written here,
  // so the row keeps saying *every outcome* if the curriculum grows one.
  await signIn(page, ACCOUNTS.committee0501);

  // The committee's entry sits under a group that opens on click, and is named
  // for the cohort rather than for the level — the assessor's single entry two
  // rows down is the one that reads *ผลการเรียนรู้ระดับหลักสูตร*. Two menus,
  // two labels, one screen.
  await menuLink(page, 'การประเมินผลการเรียนรู้').click();
  await menuLink(page, 'ระดับหลักสูตรตามรุ่นปีรับเข้า').click();
  await page.waitForURL(PATH);
  await showIntake(page, COHORTS[0].admission);

  const { rows } = await db.query(
    `SELECT count(*)::int AS main FROM learning_outcomes
      WHERE program_id = $1 AND parent_outcome_id IS NULL`,
    [PROGRAM],
  );
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(rows[0].main + 1);
  await expect(outcomeRow(page, 'PLO-1')).toBeVisible();
});

test('changing the intake changes the cohort the report is about', async ({ page }) => {
  // The pickers are the screen, not a label on it. Both seeded intakes are
  // offered and each brings back its own cohort — sizes read from the seed, so
  // the row asserts the two are *different* rather than asserting two numbers
  // it invented.
  await signIn(page, ACCOUNTS.committee0501);
  await openReport(page);

  const [current, prior] = COHORTS;
  await showIntake(page, current.admission);
  await expect(cohortLine(page)).toContainText(`ปีรับเข้า ${current.admission}`);
  await expect(cohortLine(page)).toContainText(`${current.students} คน`);

  await showIntake(page, prior.admission);
  await expect(cohortLine(page)).toContainText(`ปีรับเข้า ${prior.admission}`);
  await expect(cohortLine(page)).toContainText(`${prior.students} คน`);
});

test('selecting an outcome opens what is behind its figure, and closing puts it away', async ({
  page,
}) => {
  // The fourth criterion. PLO-2 is the outcome the seed gives three CLOs of the
  // taught Subject, so it is the one with something behind it; the panel names
  // the Subject and at least one Activity, and the button that opened it closes
  // it again.
  await signIn(page, ACCOUNTS.committee0501);
  await openReport(page);
  await showIntake(page, COHORTS[0].admission);

  await expect(drillDown(page)).toHaveCount(0);

  await sourceButton(page, 'PLO-2').click();
  await expect(drillDown(page)).toBeVisible();
  await expect(sourceButton(page, 'PLO-2')).toHaveText('ซ่อนที่มา');

  // The Subject the panel should name is the one whose CLOs name PLO-2, not
  // *a* Subject of the curriculum: the program-subjects import rows earlier in
  // this suite attach Subjects of their own to 0501, and a `LIMIT 1` with
  // nothing to order by picked one of those and failed on a report that was
  // perfectly right.
  const { rows } = await db.query(
    `SELECT DISTINCT sub.subject_id, sub.subject_name_th
       FROM subject_clo c
       JOIN subjects sub ON sub.subject_id = c.subject_id
       JOIN learning_outcomes o ON o.outcome_id = c.plo_id
      WHERE c.program_id = $1 AND o.outcome_code = 'PLO-2'`,
    [PROGRAM],
  );
  expect(rows).toHaveLength(1);
  const panel = page.getByText(`${rows[0].subject_id} ${rows[0].subject_name_th}`);
  await expect(panel).toBeVisible();

  await sourceButton(page, 'PLO-2').click();
  // The button and not only the panel. A drill-down that re-fetched instead of
  // closing would empty the panel for as long as the request took, and a row
  // that asked only *is the heading gone* would pass on that gap on its way to
  // the same panel coming back. The button says which state the row is in for
  // as long as it is in it.
  await expect(sourceButton(page, 'PLO-2')).toHaveText('ดูที่มา');
  await expect(drillDown(page)).toHaveCount(0);
});

test('an outcome nobody has been measured against is neither passed nor failed', async ({
  page,
}) => {
  // Three states and not two. PLO-4 has no CLO naming it in this curriculum, so
  // nobody in any cohort has a score for it: its chip is the neutral one and it
  // says so in words, which is the half of the claim a colour cannot make.
  await signIn(page, ACCOUNTS.committee0501);
  await openReport(page);
  await showIntake(page, COHORTS[0].admission);

  const unmeasured = verdictOf(page, 'PLO-4');
  await expect(unmeasured).toHaveAttribute('aria-label', 'PLO-4 ยังไม่มีการวัด');
  await expect(unmeasured).toHaveClass(/bg-slate-100/);
  await expect(unmeasured).not.toHaveClass(/emerald/);

  const measured = verdictOf(page, 'PLO-2');
  await expect(measured).toHaveAttribute('aria-label', /^PLO-2 (ผ่าน|ไม่ผ่าน) — /);
});

test('a cohort nobody has marked reads as a sentence, not as a table of dashes', async ({
  page,
}) => {
  // The sixth criterion. The cohort is on the roll and has sat nothing that has
  // been marked; the report says so rather than drawing thirteen rows of em
  // dashes for a committee to look for a pattern in.
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
    await openReport(page);
    await showIntake(page, QUIET_INTAKE);

    await expect(page.getByText('ยังไม่มีคะแนนของนักศึกษารุ่นนี้')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  } finally {
    await db.query(`DELETE FROM student_course WHERE student_id = $1`, [QUIET_STUDENT]);
    await db.query(`DELETE FROM student WHERE student_id = $1`, [QUIET_STUDENT]);
  }
});

test('the external assessor arrives at the one screen the shell offers them', async ({ page }) => {
  // Their menu has a single entry and it points here, so this is the whole of
  // what that account can do today. Before #42 it led to a page saying the
  // screen did not exist yet.
  await signIn(page, ACCOUNTS.externalAssessor);

  await menuLink(page, 'ผลการเรียนรู้ระดับหลักสูตร').click();
  await page.waitForURL(PATH);

  // The report before the cohort: what this row is about is that the account
  // arrives at a report at all, so the assertion that fails when it does not
  // should be this one rather than a helper's wait for a picker.
  await expect(cohortLine(page)).toBeVisible();
  await showIntake(page, COHORTS[0].admission);
  await expect(outcomeRow(page, 'PLO-2')).toBeVisible();
});

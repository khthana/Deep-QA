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
  openIndividual,
  showIntake,
  searchBox,
  rollRows,
  rollRow,
  chooseStudent,
  whoLine,
  sourceButton,
  drillDown,
  scoreCell,
  unmeasuredCell,
} = require('../support/program-student-screen');
const {
  openHeatmap,
  showIntake: showHeatmapIntake,
} = require('../support/all-students-screen');

/**
 * docs/acceptance/45-program-level-individual.md — the half a browser can prove.
 *
 * `backend/test/program-results.test.js` owns every figure and every refusal:
 * the roll-up, what a blank leaves out, the agreement with #43's heatmap, the
 * student of another curriculum, the code no register issued. Repeating any of
 * it here would be the same claim in the place that goes stale.
 *
 * What is only here is in front of the screen:
 *
 * - the roll is the **register's**, so the student nobody has assessed can be
 *   chosen — the case an appeal is most likely to be about, and the one a
 *   picker built from `activity_scores` would silently not offer;
 * - choosing a student **changes what is reported**, which no HTTP test can
 *   see: at that seam two students are simply two requests;
 * - the figure a person reads here is the one the heatmap drew for them —
 *   asserted by reading a cell off #43's screen and finding it again on this
 *   one, which is the only place the two screens exist at once;
 * - the drill-down **opens on demand** and puts itself away, and is a sequence
 *   of states rather than a payload;
 * - an outcome nobody measured them on offers **nothing to open** — #40's
 *   walk finding, which is a control that answered perfectly on nothing;
 * - a student nobody has marked gets a sentence rather than a page of dashes.
 *
 * ## Two rows build a situation the seed does not contain
 *
 * Every student the seed enrols has marks, so the roll rows enrol an unmarked
 * student of their own through the pool and take them out again — 43a's shape,
 * and for its reason: teardown through the screen would share a defect with
 * the subject.
 */

const db = createPool({ schema: E2E_SCHEMA });

/** Somebody on the register whom nobody has assessed. */
const UNMARKED_STUDENT = 'E45U001';
const UNMARKED_NAME = 'ยังไม่มีใคร ประเมิน';

test.afterAll(() => db.end());

/** Enrols the unassessed student on the seeded intake, and takes them off again. */
async function withUnmarkedStudent(admissionYear, body) {
  await db.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status)
     VALUES ($1, 'ยังไม่มีใคร', 'ประเมิน',
             (SELECT department_id FROM programs WHERE program_id = $2), $2, $3, 'active')`,
    [UNMARKED_STUDENT, PROGRAM, admissionYear],
  );
  try {
    await body();
  } finally {
    await db.query(`DELETE FROM student WHERE student_id = $1`, [UNMARKED_STUDENT]);
  }
}

/** One student of the seeded intake who has marks, read from the register. */
async function markedStudent(admissionYear) {
  // Marked *on PLO-2* specifically, and enrolled in the Section the Activity
  // belongs to — the same two conditions `cohortMarks` puts on a mark before
  // it counts. A student picked on *any* mark could be one whose marks are all
  // under some other outcome, and the row that compares this screen with the
  // heatmap would then compare two blanks.
  const { rows } = await db.query(
    `SELECT DISTINCT st.student_id, st.full_name_th
       FROM student st
       JOIN activity_scores s ON s.student_id = st.student_id
       JOIN activities a ON a.id = s.activity_id
       JOIN student_course sc
         ON sc.student_id = s.student_id AND sc.section_id = a.section_id
       JOIN subject_clo c ON c.clo_id = s.clo_id
       JOIN learning_outcomes o ON o.outcome_id = c.plo_id
      WHERE st.program_id = $1 AND st.admission_year = $2
        AND s.score IS NOT NULL AND c.program_id = $1 AND o.outcome_code = 'PLO-2'
      ORDER BY st.student_id ASC
      LIMIT 1`,
    [PROGRAM, admissionYear],
  );
  expect(rows, 'the seeded intake should have a student marked on PLO-2').toHaveLength(1);
  return rows[0];
}

test('the committee reaches the screen from the menu, and the roll is the register — including the student nobody has assessed', async ({
  page,
}) => {
  // Criterion 1. The roll and the tag together: a picker built from the marks
  // would draw the same list minus one row, and *ยังไม่มีคะแนน* is what tells a
  // committee which row that is before they click.
  await signIn(page, ACCOUNTS.committee0501);
  const [current] = COHORTS;

  await withUnmarkedStudent(current.admission, async () => {
    await menuLink(page, 'การประเมินผลการเรียนรู้').click();
    await menuLink(page, 'ระดับหลักสูตรรายคน').click();
    await page.waitForURL(PATH);
    await showIntake(page, current.admission);

    const { rows } = await db.query(
      `SELECT count(*)::int AS roll FROM student
        WHERE program_id = $1 AND admission_year = $2`,
      [PROGRAM, current.admission],
    );

    const listed = rollRow(page, UNMARKED_STUDENT, UNMARKED_NAME);
    await expect(listed).toBeVisible();
    await expect(listed).toContainText('ยังไม่มีคะแนน');
    await expect(rollRows(page)).toHaveCount(rows[0].roll);

    // And the search box narrows it to one, on the code a committee would be
    // given. A roll of a hundred and thirteen is not a list anybody scrolls.
    await searchBox(page).fill(UNMARKED_STUDENT);
    await expect(rollRows(page)).toHaveCount(1);
  });
});

test('choosing a student reports on that student, against every outcome the curriculum promises', async ({
  page,
}) => {
  // Criteria 1 and 2. Two things at once and both only visible here: the report
  // arrives when a person is chosen and not before, and it has a row for every
  // main outcome rather than only the ones this student was measured on.
  await signIn(page, ACCOUNTS.committee0501);
  const [current] = COHORTS;
  await openIndividual(page);
  await showIntake(page, current.admission);

  // Nothing is reported until somebody is chosen, and the screen says which of
  // the two states it is in rather than sitting blank.
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('เลือกนักศึกษาหนึ่งคนจากรายชื่อ')).toBeVisible();

  const student = await markedStudent(current.admission);
  await chooseStudent(page, student.student_id, student.full_name_th);

  await expect(whoLine(page, student.student_id, student.full_name_th)).toBeVisible();

  const { rows } = await db.query(
    `SELECT count(*)::int AS plos FROM learning_outcomes
      WHERE program_id = $1 AND parent_outcome_id IS NULL`,
    [PROGRAM],
  );
  await expect(page.locator('tbody tr')).toHaveCount(rows[0].plos);

  // PLO-4 has no CLO naming it in this curriculum, so nobody has ever been
  // measured against it — the row is there and says so in words, which is the
  // half of #38's three states a colour cannot make.
  await expect(unmeasuredCell(page, 'PLO-4')).toBeVisible();
});

test('the figure on a student’s report is the one the heatmap drew for them', async ({ page }) => {
  // Criterion 5, in the only place both screens exist. The server proves the
  // two answers agree; what this proves is that the two *drawings* do — a
  // report that rounded its own copy, or read the wrong cell out of the row,
  // would satisfy every assertion at the HTTP seam.
  await signIn(page, ACCOUNTS.committee0501);
  const [current] = COHORTS;
  const student = await markedStudent(current.admission);

  await openHeatmap(page);
  await showHeatmapIntake(page, current.admission);

  // Read PLO-2 off the heatmap — the outcome the seed gives CLOs of the taught
  // Subject, so it is the one with a figure behind it.
  const onHeatmap = await page
    .locator(`[aria-label^="${student.student_id} PLO-2 "]`)
    .getAttribute('aria-label');
  expect(onHeatmap, 'the heatmap cell should say the score in words').toMatch(
    /^\S+ PLO-2 \d\.\d\d คะแนน/,
  );
  const figure = /PLO-2 (\d\.\d\d) คะแนน/.exec(onHeatmap)[1];

  await openIndividual(page);
  await showIntake(page, current.admission);
  await chooseStudent(page, student.student_id, student.full_name_th);

  await expect(scoreCell(page, student.student_id, 'PLO-2')).toHaveAttribute(
    'aria-label',
    new RegExp(`^${student.student_id} PLO-2 ${figure} คะแนน `),
  );
  // And on the page, not only in the label — the two ways the figure is given.
  await expect(scoreCell(page, student.student_id, 'PLO-2')).toContainText(figure);
});

test('opening an outcome shows what this student was marked on, and closing puts it away', async ({
  page,
}) => {
  // Criteria 3 and 4. The panel is a sequence of states rather than a payload:
  // it is not there, it is fetched, and the button that opened it closes it.
  // The evidence attached to the Activity is a control with the file's name on
  // it — opening the file is #35's and is proved at its own seam.
  await signIn(page, ACCOUNTS.committee0501);
  const [current] = COHORTS;
  const student = await markedStudent(current.admission);

  await openIndividual(page);
  await showIntake(page, current.admission);
  await chooseStudent(page, student.student_id, student.full_name_th);

  await expect(drillDown(page)).toHaveCount(0);

  await sourceButton(page, 'PLO-2').click();
  await expect(drillDown(page)).toBeVisible();
  await expect(sourceButton(page, 'PLO-2')).toHaveText('ซ่อนที่มา');

  // The heading names the student as well as the outcome, because this panel
  // and #42's are the same drawing of two different things — one is what a
  // cohort was marked on and one is what this person was, and a panel that did
  // not say which would be read as the other.
  await expect(drillDown(page)).toContainText(student.student_id);

  // The Subject whose CLOs name PLO-2, and not *a* Subject of the curriculum:
  // the program-subjects import rows earlier in this suite attach Subjects of
  // their own to 0501, which is how 42a's version of this row once failed on a
  // report that was perfectly right.
  const { rows } = await db.query(
    `SELECT DISTINCT sub.subject_id, sub.subject_name_th
       FROM subject_clo c
       JOIN subjects sub ON sub.subject_id = c.subject_id
       JOIN learning_outcomes o ON o.outcome_id = c.plo_id
      WHERE c.program_id = $1 AND o.outcome_code = 'PLO-2'`,
    [PROGRAM],
  );
  expect(rows).toHaveLength(1);
  await expect(page.getByText(`${rows[0].subject_id} ${rows[0].subject_name_th}`)).toBeVisible();

  await sourceButton(page, 'PLO-2').click();
  // The button and not only the panel: a drill-down that re-fetched instead of
  // closing would empty the panel for as long as the request took, and a row
  // that asked only *is the heading gone* would pass on that gap.
  await expect(sourceButton(page, 'PLO-2')).toHaveText('ดูที่มา');
  await expect(drillDown(page)).toHaveCount(0);
});

test('an outcome nobody measured this student against offers nothing to open', async ({ page }) => {
  // #40's hand-walk finding, kept out of this screen rather than found on it.
  // Every automated row of that ticket asked whether the disclosure *worked*,
  // and it worked perfectly — on an empty panel. An outcome with no score has
  // no contributing Activity by definition, so there is no button to press.
  await signIn(page, ACCOUNTS.committee0501);
  const [current] = COHORTS;
  const student = await markedStudent(current.admission);

  await openIndividual(page);
  await showIntake(page, current.admission);
  await chooseStudent(page, student.student_id, student.full_name_th);

  await expect(sourceButton(page, 'PLO-4')).toHaveCount(0);
  await expect(unmeasuredCell(page, 'PLO-4')).toBeVisible();
  // And the outcome that does have a figure still offers one, or the row above
  // would pass on a screen that had lost the control altogether.
  await expect(sourceButton(page, 'PLO-2')).toBeVisible();
});

test('a student nobody has marked reads as a sentence, not as a page of dashes', async ({
  page,
}) => {
  // Criterion 6. This student is on the register and has sat nothing that has
  // been marked, and the report says which of those two it is. Thirteen rows of
  // dashes beside a named person reads as a report that they failed everything.
  await signIn(page, ACCOUNTS.committee0501);
  const [current] = COHORTS;

  await withUnmarkedStudent(current.admission, async () => {
    await openIndividual(page);
    await showIntake(page, current.admission);
    await chooseStudent(page, UNMARKED_STUDENT, UNMARKED_NAME);

    await expect(page.getByText('ยังไม่มีคะแนนของนักศึกษาคนนี้')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
    // The counts are still drawn, because *0 จาก 13* is a fact about this
    // person and the sentence above is about the marking.
    await expect(whoLine(page, UNMARKED_STUDENT, UNMARKED_NAME)).toBeVisible();
  });
});

test('a teacher who types the address is refused, and is not left waiting for an answer that will never come', async ({
  page,
}) => {
  // Criterion 7, and the defect #43's hand-walk found underneath it. The
  // refusal is the server's and is proved at the HTTP seam; what is only here
  // is what the refused screen then does — `loading` must not sit under the
  // refusal saying *กำลังโหลดข้อมูล…* for ever. Every other row in this file
  // signs in as an account that reaches the screen, which is exactly why none
  // of them could see it.
  await signIn(page, ACCOUNTS.teacherOne);
  await page.goto(PATH);

  await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('กำลังโหลดข้อมูล')).toHaveCount(0);
});

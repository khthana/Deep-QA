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
  openTrend,
  showRange,
  trendTable,
  yearHeader,
  cellOf,
} = require('../support/program-trend-screen');
const {
  openReport,
  outcomeRow,
  showIntake,
} = require('../support/program-results-screen');

/**
 * docs/acceptance/44-program-level-across-intakes.md — the half a browser can
 * prove.
 *
 * `backend/test/program-results.test.js` owns every number and every refusal,
 * including the assertion that a year read here says what the same year says
 * on #42's report. Repeating the arithmetic would be the same claim in a second
 * place, and the copy in the browser is the one that goes stale.
 *
 * What is here exists only in front of the screen:
 *
 * - the two ends of the range **drive** the report rather than label it;
 * - a year nobody was admitted in is drawn as **a column of its own**, and its
 *   header says which of the two kinds of empty it is — the thing that cannot
 *   be seen at the HTTP seam, where a column is a row of a payload and a
 *   missing one looks like a shorter list;
 * - a figure a committee could check by holding two printouts side by side
 *   **does agree** — the fourth criterion asked the way the person asks it,
 *   which is with two screens open and not with two payloads;
 * - an outcome nobody was measured against is blank in every column rather than
 *   nought in every column, which on a trend is the difference between a gap
 *   and a collapse.
 *
 * ## The gap year is built and taken away again
 *
 * The seed's two intakes are consecutive, so nothing in it can show what a year
 * with nobody admitted looks like. Two rows enrol one student two years before
 * the older cohort and take them out afterwards — 38a's shape, and for its
 * reason: teardown through the screen would share a defect with the subject.
 */

const db = createPool({ schema: E2E_SCHEMA });

/** The older of the two seeded intakes, and the gap this file opens before it. */
const [CURRENT, PRIOR] = COHORTS;
const EARLY_INTAKE = String(Number(PRIOR.admission) - 2);
const GAP_INTAKE = String(Number(PRIOR.admission) - 1);
const EARLY_STUDENT = 'E44G001';

/** Puts one unmarked student on the roll of an intake two years before the seed's. */
async function enrolEarly() {
  const section = await db.query(
    `SELECT cs.section_id FROM course_sections cs ORDER BY cs.section_id ASC LIMIT 1`,
  );
  await db.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status)
     VALUES ($1, 'รุ่น', 'ก่อนหน้า',
             (SELECT department_id FROM programs WHERE program_id = $2), $2, $3, 'active')`,
    [EARLY_STUDENT, PROGRAM, EARLY_INTAKE],
  );
  await db.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
    EARLY_STUDENT,
    section.rows[0].section_id,
  ]);
}

async function removeEarly() {
  await db.query(`DELETE FROM student_course WHERE student_id = $1`, [EARLY_STUDENT]);
  await db.query(`DELETE FROM student WHERE student_id = $1`, [EARLY_STUDENT]);
}

test.afterAll(() => db.end());

test('the committee reaches the comparison from the menu and reads one column per year', async ({
  page,
}) => {
  // Criterion 1, as a person arrives at it. The range is the two seeded intakes
  // and they are consecutive, so the grid is two columns of years beside the
  // two that name the outcome — a count taken from the range rather than
  // written down, so the row keeps meaning *one column per year* if the seed
  // gains an intake.
  await signIn(page, ACCOUNTS.committee0501);

  await menuLink(page, 'การประเมินผลการเรียนรู้').click();
  await menuLink(page, 'เปรียบเทียบระดับหลักสูตร').click();
  await page.waitForURL(PATH);

  await showRange(page, PRIOR.admission, CURRENT.admission);

  await expect(yearHeader(page, PRIOR.admission)).toBeVisible();
  await expect(yearHeader(page, CURRENT.admission)).toBeVisible();
  await expect(page.getByRole('columnheader')).toHaveCount(4);
  await expect(yearHeader(page, CURRENT.admission)).toContainText(`${CURRENT.students} คน`);
  await expect(yearHeader(page, PRIOR.admission)).toContainText(`${PRIOR.students} คน`);
});

test('moving an end of the range redraws the report against a different set of years', async ({
  page,
}) => {
  // The ends are the screen, not a pair of labels on it. The narrow range has
  // one year in it and the wide one has two, and the column that appears is the
  // one that was asked for — a picker that answered nothing would leave the
  // same grid on screen and still look like it had worked.
  //
  // **Each end is moved on its own**, and the order is what arranges that. The
  // screen opens on the whole register, so pulling the start forward moves only
  // the start; pushing it back again moves only the start; and pulling the end
  // back to meet it moves only the end. A row that only ever moved them
  // together would prove that *a* control drives the report and leave the other
  // one free to be a label.
  await signIn(page, ACCOUNTS.committee0501);
  await openTrend(page);

  await showRange(page, CURRENT.admission, CURRENT.admission);
  await expect(yearHeader(page, CURRENT.admission)).toBeVisible();
  await expect(yearHeader(page, PRIOR.admission)).toHaveCount(0);

  await showRange(page, PRIOR.admission, CURRENT.admission);
  await expect(yearHeader(page, PRIOR.admission)).toBeVisible();
  await expect(yearHeader(page, CURRENT.admission)).toBeVisible();

  await showRange(page, PRIOR.admission, PRIOR.admission);
  await expect(yearHeader(page, PRIOR.admission)).toBeVisible();
  await expect(yearHeader(page, CURRENT.admission)).toHaveCount(0);
});

test('a year nobody was admitted in is a column of its own, and says which kind of empty it is', async ({
  page,
}) => {
  // The third criterion, and the decision the ticket turns on. A range that
  // listed only the years the register has somebody in would draw these two
  // intakes side by side with a year standing between them, and a reader
  // following the line across would take them for consecutive. So the year is
  // there — and the header distinguishes *nobody admitted* from *admitted and
  // not yet marked*, which are two different facts about the curriculum and
  // would otherwise be one row of blanks.
  await signIn(page, ACCOUNTS.committee0501);
  await enrolEarly();

  try {
    await openTrend(page);
    await showRange(page, EARLY_INTAKE, PRIOR.admission);

    await expect(yearHeader(page, GAP_INTAKE)).toBeVisible();
    await expect(yearHeader(page, GAP_INTAKE)).toContainText('ไม่มีนักศึกษารุ่นนี้');
    await expect(yearHeader(page, EARLY_INTAKE)).toContainText('ยังไม่มีคะแนน');
    await expect(yearHeader(page, PRIOR.admission)).toContainText(`${PRIOR.students} คน`);
  } finally {
    await removeEarly();
  }
});

test('a range nobody in it has been marked in reads as a sentence, not a grid of dashes', async ({
  page,
}) => {
  // The fifth criterion. This intake is on the roll and has sat nothing that
  // has been marked, and the screen says so rather than drawing thirteen rows
  // of em dashes for a committee to look for a pattern in.
  //
  // The range is one year and both its ends are the same, because both ends are
  // chosen from the register: a year nobody was admitted in appears as a
  // *column* when the range spans it, and never as an end of the range. Which
  // is right — a range is asked for between two intakes, not between two
  // absences.
  await signIn(page, ACCOUNTS.committee0501);
  await enrolEarly();

  try {
    await openTrend(page);
    await showRange(page, EARLY_INTAKE, EARLY_INTAKE);

    await expect(page.getByText('ยังไม่มีคะแนนของรุ่นใดในช่วงปีที่เลือก')).toBeVisible();
    await expect(trendTable(page)).toHaveCount(0);
  } finally {
    await removeEarly();
  }
});

test('a figure on this screen is the figure the by-intake report shows for the same year', async ({
  page,
}) => {
  // The fourth criterion, asked the way the person asks it. At the HTTP seam
  // this is two payloads compared by a test; here it is what a committee
  // actually does, which is hold one printout beside another. Both figures are
  // read off the screens rather than written here, so the row stays true of
  // whatever the marks come to.
  await signIn(page, ACCOUNTS.committee0501);

  await openReport(page);
  await showIntake(page, CURRENT.admission);
  const cells = outcomeRow(page, 'PLO-2').getByRole('cell');
  const mean = (await cells.nth(3).innerText()).trim();
  const rate = (await cells.nth(4).innerText()).trim();
  expect(mean).toMatch(/^\d+\.\d\d$/);

  await openTrend(page);
  await showRange(page, PRIOR.admission, CURRENT.admission);

  // The label rather than the cell text, because it carries both figures and
  // the verdict — a screen that agreed about the mean and disagreed about the
  // share that earned it would pass a row that read only the number.
  await expect(cellOf(page, 'PLO-2', CURRENT.admission)).toHaveAttribute(
    'aria-label',
    new RegExp(`คะแนนเฉลี่ย ${mean} .* ผ่าน ${rate.replace('%', '')}% `),
  );
});

test('an outcome nobody has been measured against is blank in every year, not nought in every year', async ({
  page,
}) => {
  // Three states, along a line. PLO-4 has no CLO naming it in this curriculum,
  // so no cohort has ever had a score for it: every cell of its row says *not
  // measured* rather than showing a figure. A nought here would be a collapse
  // running the width of the report, and a committee acts on those.
  await signIn(page, ACCOUNTS.committee0501);
  await openTrend(page);
  await showRange(page, PRIOR.admission, CURRENT.admission);

  for (const year of [PRIOR.admission, CURRENT.admission]) {
    await expect(cellOf(page, 'PLO-4', year)).toHaveAttribute(
      'aria-label',
      `PLO-4 ปีรับเข้า ${year} ยังไม่มีการวัด`,
    );
    await expect(cellOf(page, 'PLO-4', year)).toHaveText('—');
  }

  await expect(cellOf(page, 'PLO-2', CURRENT.admission)).toHaveAttribute(
    'aria-label',
    /คะแนนเฉลี่ย \d+\.\d\d /,
  );
});

test('a ผู้สอน who types the address is refused, and is not left waiting underneath it', async ({
  page,
}) => {
  // The sixth criterion is the server's and is proved there. What is proved
  // here is the defect #43's hand-walk found on the two screens beside this
  // one: `loading` starts true and the screen has nothing to ask for, so a
  // refused account read *กำลังโหลดข้อมูล…* under the refusal for ever. Nothing
  // to ask for is an answer, not a wait.
  await signIn(page, ACCOUNTS.teacherOne);

  await page.goto(PATH);

  await expect(page.getByText('บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้')).toBeVisible();
  await expect(page.getByText('กำลังโหลดข้อมูล…')).toHaveCount(0);
  await expect(trendTable(page)).toHaveCount(0);
});

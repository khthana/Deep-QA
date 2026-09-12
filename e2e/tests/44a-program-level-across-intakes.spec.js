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
  REPORT_API,
  openTrend,
  fromPicker,
  toPicker,
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
/** A register that reaches past the seed on the other side as well — #129's row. */
const LATE_INTAKE = String(Number(CURRENT.admission) + 2);
const LATE_STUDENT = 'E44L001';

/**
 * The two columns that name the outcome, beside one column per year of the
 * range. Counted from the range rather than written down, so a row here keeps
 * meaning *one column per year* if the seed gains an intake.
 */
const NAMING_COLUMNS = 2;
const columnsFor = (from, to) => NAMING_COLUMNS + (Number(to) - Number(from) + 1);

/** Puts one unmarked student on the roll of an intake the seed does not have. */
async function enrol(studentId, year) {
  const section = await db.query(
    `SELECT cs.section_id FROM course_sections cs ORDER BY cs.section_id ASC LIMIT 1`,
  );
  await db.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status)
     VALUES ($1, 'รุ่น', 'ก่อนหน้า',
             (SELECT department_id FROM programs WHERE program_id = $2), $2, $3, 'active')`,
    [studentId, PROGRAM, year],
  );
  await db.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
    studentId,
    section.rows[0].section_id,
  ]);
}

async function unenrol(studentId) {
  await db.query(`DELETE FROM student_course WHERE student_id = $1`, [studentId]);
  await db.query(`DELETE FROM student WHERE student_id = $1`, [studentId]);
}

/**
 * A register wider than the seed's at both ends — #129's two rows.
 *
 * Both ends have to be outside the range those rows ask for, or the screen
 * opens on the range they want and fires no request at all.
 */
async function enrolBothEnds() {
  await enrol(EARLY_STUDENT, EARLY_INTAKE);
  await enrol(LATE_STUDENT, LATE_INTAKE);
}

async function removeBothEnds() {
  await unenrol(EARLY_STUDENT);
  await unenrol(LATE_STUDENT);
}

/** Every request for this screen's report, whatever range it carries. */
const anyReport = (url) => url.pathname === REPORT_API;

test.afterAll(() => db.end());

test('the committee reaches the comparison from the menu and reads one column per year', async ({
  page,
}) => {
  // Criterion 1, as a person arrives at it. The range is the two seeded intakes
  // and they are consecutive, so the grid is two columns of years beside the
  // two that name the outcome — a count taken from the range rather than
  // written down, so the row keeps meaning *one column per year* if the seed
  // gains an intake. It said that in this comment and asserted a literal `4`
  // until #129, which is the promise a comment makes on an assertion's behalf.
  await signIn(page, ACCOUNTS.committee0501);

  await menuLink(page, 'การประเมินผลการเรียนรู้').click();
  await menuLink(page, 'เปรียบเทียบระดับหลักสูตร').click();
  await page.waitForURL(PATH);

  await showRange(page, PRIOR.admission, CURRENT.admission);

  await expect(yearHeader(page, PRIOR.admission)).toBeVisible();
  await expect(yearHeader(page, CURRENT.admission)).toBeVisible();
  await expect(page.getByRole('columnheader')).toHaveCount(
    columnsFor(PRIOR.admission, CURRENT.admission),
  );
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
  await enrol(EARLY_STUDENT, EARLY_INTAKE);

  try {
    await openTrend(page);
    await showRange(page, EARLY_INTAKE, PRIOR.admission);

    await expect(yearHeader(page, GAP_INTAKE)).toBeVisible();
    await expect(yearHeader(page, GAP_INTAKE)).toContainText('ไม่มีนักศึกษารุ่นนี้');
    await expect(yearHeader(page, EARLY_INTAKE)).toContainText('ยังไม่มีคะแนน');
    await expect(yearHeader(page, PRIOR.admission)).toContainText(`${PRIOR.students} คน`);
  } finally {
    await unenrol(EARLY_STUDENT);
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
  await enrol(EARLY_STUDENT, EARLY_INTAKE);

  try {
    await openTrend(page);
    await showRange(page, EARLY_INTAKE, EARLY_INTAKE);

    await expect(page.getByText('ยังไม่มีคะแนนของรุ่นใดในช่วงปีที่เลือก')).toBeVisible();
    await expect(trendTable(page)).toHaveCount(0);
  } finally {
    await unenrol(EARLY_STUDENT);
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

test('the report of a range the pickers have already left does not land on top of the one they are on', async ({
  page,
}) => {
  // #129. Moving both ends fires a request per end, and the first of them asks
  // for a range that is half old: the `to` has moved and the `from` has not.
  // Nothing tied an answer to the request that caused it, so whichever arrived
  // **last** was drawn — and a person changing both ends quickly on a slow
  // connection read a report of a range the pickers were no longer showing,
  // which the screen's own docstring calls *showing a report about one range
  // while saying another*.
  //
  // The situation is built rather than waited for. On the seeded register the
  // opening range is already the one these rows ask for, so `showRange` fires
  // no request at all and there is nothing to race; it took a full-suite run,
  // where `17b` and `17c` leave students of two other intakes behind, for the
  // screen to open wide enough for the middle request to exist. Two students
  // put that register here on purpose, and the middle answer is held back so
  // the outcome is a fact about the code rather than about the network.
  await signIn(page, ACCOUNTS.committee0501);
  await enrolBothEnds();

  const HELD_MS = 1_500;
  // The middle request is the one still carrying the `from` the screen opened
  // on, with the `to` already moved. **Which year that `from` is depends on the
  // register**, and in a full-suite run the register holds intakes other specs
  // left behind — an earlier draft named `EARLY_INTAKE` here and asserted the
  // pickers opened on it, which is true of the seeded register and false of the
  // one the suite actually leaves. All this row needs of that year is that it is
  // not the one being asked for, so it is read off the screen instead.
  const stale = (url) =>
    anyReport(url) &&
    url.searchParams.get('to_year') === CURRENT.admission &&
    url.searchParams.get('from_year') !== PRIOR.admission;

  try {
    await page.route(
      anyReport,
      async (route, request) => {
        if (stale(new URL(request.url()))) {
          await new Promise((resolve) => setTimeout(resolve, HELD_MS));
        }
        await route.continue();
      },
    );

    await openTrend(page);
    // A middle request exists only if both ends move: the opening range has to
    // begin before the range asked for and end after it. The two students are
    // what guarantee that on the seeded register; a leak can only widen it.
    await expect
      .poll(async () => Number(await fromPicker(page).inputValue()))
      .toBeLessThan(Number(PRIOR.admission));
    await expect
      .poll(async () => Number(await toPicker(page).inputValue()))
      .toBeGreaterThan(Number(CURRENT.admission));

    const staleArrived = page.waitForResponse((answer) => stale(new URL(answer.url())));
    await showRange(page, PRIOR.admission, CURRENT.admission);
    // The settle point is the held answer arriving, not a guess at how long it
    // takes: the row reads the screen once, after the thing it is about has
    // happened. The margin afterwards is for the render that answer would
    // cause, and decides nothing — with the guard gone this row fails by six
    // columns to four, and `staleanswerwins` is what says the margin is
    // enough.
    await staleArrived;
    await page.waitForTimeout(250);

    expect(await page.getByRole('columnheader').count()).toBe(
      columnsFor(PRIOR.admission, CURRENT.admission),
    );
    expect(await fromPicker(page).inputValue()).toBe(PRIOR.admission);
    expect(await toPicker(page).inputValue()).toBe(CURRENT.admission);
  } finally {
    await page.unroute(anyReport);
    await removeBothEnds();
  }
});

test('an answer the screen has stopped waiting for does not say it has finished loading', async ({
  page,
}) => {
  // #129, the other half of the same guard and one state along. The spinner is
  // drawn while there is nothing to draw instead, so the request that matters
  // here is the **first** one: superseded before it ever answered, on a screen
  // that has no report on it yet. An answer nobody is waiting for that clears
  // the spinner leaves *nothing at all* on screen — no report, no sentence, no
  // spinner — while the report that was asked for is still out, which is #43's
  // defect reached from the other end.
  //
  // The range is changed without waiting for the answer, which is why this row
  // drives the picker rather than `showRange`: the whole situation is the one
  // where the first answer has not arrived.
  await signIn(page, ACCOUNTS.committee0501);
  await enrolBothEnds();

  // Only the `to` end moves here, so the two requests are told apart by it, and
  // for the same reason as the row above: the year the screen opens on belongs
  // to the register, not to this file.
  const asked = (url) => anyReport(url) && url.searchParams.get('to_year') === CURRENT.admission;
  const opening = (url) => anyReport(url) && !asked(url);
  // Both holds are waited for by name rather than counted on: the row reads the
  // screen after `openingArrived` and again after `askedArrived`, so what the
  // two numbers decide is only which arrives first. They are far apart because
  // a margin costs nothing here and a near-miss would make the row about the
  // machine; `staleclearsloading` is what says the reading itself is real.
  const HELD_OPENING_MS = 2_000;
  const HELD_ASKED_MS = 4_000;

  try {
    await page.route(anyReport, async (route, request) => {
      const url = new URL(request.url());
      await new Promise((resolve) =>
        setTimeout(resolve, asked(url) ? HELD_ASKED_MS : HELD_OPENING_MS),
      );
      await route.continue();
    });

    const openingArrived = page.waitForResponse((answer) => opening(new URL(answer.url())));
    const askedArrived = page.waitForResponse((answer) => asked(new URL(answer.url())));

    await page.goto(PATH);
    // The pickers are filled from the list of intakes, which is not held.
    await expect
      .poll(async () => Number(await toPicker(page).inputValue()))
      .toBeGreaterThan(Number(CURRENT.admission));
    await toPicker(page).selectOption(CURRENT.admission);

    await openingArrived;
    // Read once, at the settle point the row is about: the superseded answer
    // has landed and the one the screen is waiting for has not.
    expect(await page.getByText('กำลังโหลดข้อมูล…').count()).toBe(1);

    await askedArrived;
    await expect(yearHeader(page, CURRENT.admission)).toBeVisible();
    await expect(page.getByText('กำลังโหลดข้อมูล…')).toHaveCount(0);
  } finally {
    await page.unroute(anyReport);
    await removeBothEnds();
  }
});

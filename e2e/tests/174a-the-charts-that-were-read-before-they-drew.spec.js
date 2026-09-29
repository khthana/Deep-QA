'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { COHORTS } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const { axesOf, pointsOf } = require('../support/radar-chart');
const { holdBack, wentThroughTheWindow } = require('../support/late-answer');

const { addYear, openResults, yearBox } = require('../support/section-results-screen');
const { offeredCodes, openStudentResults } = require('../support/student-results-screen');
const {
  cohortLine,
  openReport,
  outcomeRow,
  showIntake,
} = require('../support/program-results-screen');
const clos = require('../support/clos-screen');

/**
 * #174 — the screens #171's census could not see, and the read after a delete.
 *
 * #170 and #171 closed eight screens that shared one hole: `openAt(page, path,
 * waitForX)` returns when the answer's **headers** land, the screen draws from a
 * body that arrives after them and from state React sets after that, and a
 * non-retrying read on the next line reads a screen that has drawn nothing.
 *
 * #171's census counted card-and-grid screens, which is a shape and not the
 * species: what decides the risk is whether a settle point stands in front of the
 * read. Counted that way, three chart-and-report screens were left, and the read
 * that follows a **delete** on #27.
 */

/** The outcome every cohort in the seed has been measured against. */
const OUTCOME = 'PLO-2';

/** teacher.one@ and the ตอนเรียน their dashboard opens on. */
async function teacherSection(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  return section;
}

test('36: the chart axes are read after the chart is drawn, not before', async ({ page }) => {
  await holdBack(page, '/results$');
  const section = await teacherSection(page);

  const answer = await openResults(page, section);
  // The read comes first and everything else after it: a probe in front of the
  // read it is measuring changes the answer, because a round trip is a turn for
  // the renderer (#170). `wentThroughTheWindow` is a `page.evaluate` and the
  // response's own body is a probe too — nothing consumes it until the screen's
  // continuation does, which is the very thing the window holds back.
  const drawn = await axesOf(page);

  await wentThroughTheWindow(page);
  const body = await answer.json();
  // Counted as well as read (#164): an undrawn screen and an Offering with no
  // outcomes both read `[]`, and only the count tells them apart.
  expect(body.clos.length).toBeGreaterThan(0);
  expect(drawn).toEqual(body.clos.map((clo) => clo.clo_number));
});

test('36: the second year is read after its line is drawn, not before', async ({ page }) => {
  await holdBack(page, '/results$');
  const section = await teacherSection(page);

  // The year comes off the answer rather than out of the database: the picker
  // lists `available_years` and nothing else, so this is the screen's own offer.
  const opened = await openResults(page, section);
  const { available_years: offered } = await opened.json();
  expect(offered.length, 'the seed offers a year to compare').toBeGreaterThan(0);
  const [year] = offered.map((one) => one.academic_year);

  await expect(yearBox(page, year)).toBeVisible();
  const answer = await addYear(page, section, year);
  // Read raw and read first, which is what `36a:138` does: an `expect` here
  // would retry until the line arrived and could not fail whatever the helper
  // waited for, and a probe in front of it would hand the renderer a turn.
  const drawn = Object.keys(await pointsOf(page));

  await wentThroughTheWindow(page);
  const { comparison } = await answer.json();
  expect(comparison).toHaveLength(1);
  expect(drawn).toContain(`ปีการศึกษา ${year}`);
});

test('37: the roll and the axes are read after the screen is drawn, not before', async ({
  page,
}) => {
  await holdBack(page, '/learning-details$');
  const section = await teacherSection(page);

  const answer = await openStudentResults(page, section);
  // Both reads before anything else, for the reason on the row above.
  const roll = await offeredCodes(page);
  const axes = await axesOf(page);

  await wentThroughTheWindow(page);
  const body = await answer.json();
  expect(body.students.length).toBeGreaterThan(0);
  expect(roll.sort()).toEqual(body.students.map((student) => student.student_id).sort());
  // Not the whole list of outcomes: this chart caps its axes at `MAX_AXES`, and
  // a row that spelled the cap out here would be holding a copy of a rule that
  // lives in the component. What is claimed is that the axes are the answer's
  // and that they are there at all.
  expect(axes.length).toBeGreaterThan(0);
  expect(axes[0]).toBe(body.clos[0].clo_number);
});

/** The third cell of an outcome's row — จำนวนผู้เรียนที่ถูกวัด, the cohort's own count. */
const MEASURED = 2;

test('42/44: the figures are read after the new cohort is drawn, not before', async ({ page }) => {
  await holdBack(page, '/by-intake$');
  await signIn(page, ACCOUNTS.committee0501);

  // The window here is a **stale** one rather than a blank one: a cell that has
  // not been redrawn holds the last cohort's figure, and a read that only asked
  // whether it looked like a number would pass on it. So the row changes intake
  // and asks whether what it reads is what the new answer carried — built where
  // the two disagree, because where they agree nothing can see the difference
  // (#117).
  const [a, b] = COHORTS.map((cohort) => cohort.admission);
  await openReport(page);

  // The first cohort is settled before the second is asked for, and that is the
  // situation rather than an ornament: with nothing drawn yet the read is a
  // **wait** and not an assertion — `innerText` on a cell that does not exist
  // waits for it and then reads the right answer (#139). Measured: read done 820ms
  // after the switch, on a screen that had never drawn. What this row is about is
  // the other window, where a table **is** drawn and holds the last cohort's
  // figures.
  await showIntake(page, a);
  await expect(cohortLine(page)).toContainText(`ปีรับเข้า ${a}`);
  const cells = outcomeRow(page, OUTCOME).getByRole('cell');
  const was = (await cells.nth(MEASURED).innerText()).trim();

  const answer = await showIntake(page, b);
  expect(answer, 'changing intake is a request').not.toBeNull();

  // The read comes **first**, before anything else is asked of the page: a probe
  // in front of the read it is measuring changes the answer (#170), and the
  // response's own body is such a probe — nothing consumes it until the screen's
  // continuation does, which is the very thing the window holds back.
  const drawn = (await cells.nth(MEASURED).innerText()).trim();

  await wentThroughTheWindow(page);
  const body = await answer.json();
  const now = String(body.plos.find((plo) => plo.outcome_code === OUTCOME).student_count);
  // Asserted where it is used (#51): where the two cohorts agree on this figure
  // a stale cell and a fresh one read the same, and the row would pass on the
  // screen it was written to catch.
  expect(was, 'the two cohorts differ on this figure').not.toBe(now);
  expect(drawn).toBe(now);
});

test('42: the outcome rows are counted after the report is drawn, not before', async ({ page }) => {
  await holdBack(page, '/by-intake$');
  await signIn(page, ACCOUNTS.committee0501);

  // The other way into this screen, and the other window: on the open there is
  // nothing drawn at all, where a read of a cell would **wait** rather than fail
  // (#139). What can fail on a screen that has drawn nothing is a list read once,
  // raw, with nothing retrying in front — `[]` there and thirteen codes here.
  //
  // The codes and not the row count, although the count is the cheaper read: the
  // settle point's own clauses are the cohort sentence and the row count, and a
  // row that re-read the row count would be restating the helper rather than
  // asking the screen (#96).
  const answer = await openReport(page);
  const drawn = await page
    .locator('table tbody tr td:first-child p:first-child')
    .allTextContents();

  await wentThroughTheWindow(page);
  const body = await answer.json();
  expect(body.empty, 'the report opens on a cohort somebody has marked').toBe(false);
  expect(drawn.map((text) => text.trim())).toEqual(body.plos.map((plo) => plo.outcome_code));
});

/** A code no seeded row uses and `27a` does not use either. */
const SPARE = 'CLO-91';

const DRAFT = {
  รหัสผลการเรียนรู้: SPARE,
  รายละเอียดผลการเรียนรู้: 'อ่านผลลัพธ์หลังการลบได้ตรงกับที่หน้าจอวาด',
  วิธีการสอน: 'บรรยาย',
  วิธีการวัดผล: 'ตรวจผลงาน',
};

test('27: the codes after a delete are read after the reload is drawn, not before', async ({
  page,
}) => {
  await holdBack(page, '/clos$');
  const section = await teacherSection(page);

  const opened = await clos.openClos(page, section);
  const { clos: before } = await opened.json();

  try {
    await page.getByRole('button', { name: 'เพิ่มผลการเรียนรู้รายวิชา' }).click();
    expect((await clos.submitClo(page, DRAFT, 'POST')).status()).toBe(201);
    await expect(clos.cloCard(page, SPARE)).toHaveCount(1);

    expect((await clos.removeClo(page, SPARE)).status()).toBe(204);

    // Read with nothing retrying in front of it and nothing else either, because
    // what is being measured is `removeClo` and not the row: `27a`'s own line has
    // a retrying count on the removed card ahead of it, and a probe here would
    // hand the renderer the turn the window exists to deny it.
    const codes = await clos.codesOnScreen(page);

    await wentThroughTheWindow(page);
    expect(codes).not.toContain(SPARE);
    expect(codes).toEqual(before.map((clo) => clo.clo_number));
  } finally {
    // In `finally`, because a fixture that puts itself back only when its row
    // passes inflates the next run (#89).
    const left = await clos.cloCard(page, SPARE).count();
    if (left > 0) await clos.removeClo(page, SPARE);
  }
});

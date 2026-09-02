'use strict';

const { DASHBOARD } = require('./teaching-screen');

/**
 * คะแนนกิจกรรมการเรียนรู้ — #34, as a browser reaches it.
 *
 * The screen is one Activity at a time under two toggles, and the helpers here
 * exist to keep a row from asserting the wrong grid by accident. `setMode` and
 * `setEntry` are separate calls with required arguments for the reason
 * `groups-screen.js`' `place()` takes its verb: the two toggles produce four
 * grids, and a row that meant one and read another would still pass or fail —
 * for a reason that is not the row's.
 *
 * A cell is found by its label rather than by its position. Per-CLO cells are
 * labelled `<row> <CLO-n>` and whole-Activity cells `คะแนนของ <row>`, so the
 * locator itself says which toggle the row believes it is in, and a row that
 * flipped a toggle and forgot fails at the locator rather than silently reading
 * the column next door.
 */

const API = sectionId => `/api/teaching/sections/${sectionId}/activities`;

const path = sectionId => `${DASHBOARD}/${sectionId}/activityScores`;

/** The screen's own read of one Activity's marks, whatever it answers. */
const waitForScores = (page, sectionId) =>
  page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname.startsWith(API(sectionId)) &&
      new URL(answer.url()).pathname.endsWith('/scores') &&
      answer.request().method() === 'GET',
  );

/** Opens the marks screen of one ตอนเรียน and hands back the marks read. */
async function openScores(page, sectionId) {
  const [response] = await Promise.all([waitForScores(page, sectionId), page.goto(path(sectionId))]);
  return response;
}

/**
 * Chooses which Activity is being marked, and waits for its grid.
 *
 * Choosing the one already chosen fires no change and therefore no request, so
 * that case returns without waiting rather than timing out. The screen opens on
 * the first Activity of the scheme's first หมวด, and which Activity that is is
 * the seed's business rather than a row's — a row that named it would be
 * asserting against the fixture's order instead of against the screen.
 */
async function chooseActivity(page, sectionId, activityId) {
  const picker = page.getByLabel('กิจกรรม', { exact: true });
  if ((await picker.inputValue()) === String(activityId)) return null;
  const [response] = await Promise.all([
    waitForScores(page, sectionId),
    picker.selectOption(String(activityId)),
  ]);
  return response;
}

/** ต่อกิจกรรม or ต่อผลการเรียนรู้ — which columns the grid has. */
const setMode = (page, mode) =>
  page
    .getByRole('button', { name: mode === 'clo' ? 'ต่อผลการเรียนรู้' : 'ต่อกิจกรรม', exact: true })
    .click();

/** รายคน or รายกลุ่ม — which rows the grid has. */
const setEntry = (page, entry) =>
  page
    .getByRole('button', { name: entry === 'group' ? 'รายกลุ่ม' : 'รายคน', exact: true })
    .click();

/** The whole-Activity cell of one row, by the name the row is drawn under. */
const wholeCell = (page, label) => page.getByLabel(`คะแนนของ ${label}`, { exact: true });

/** One outcome's cell on one row. */
const cloCell = (page, label, cloNumber) =>
  page.getByLabel(`${label} ${cloNumber}`, { exact: true });

/** Presses บันทึกคะแนน and hands back the write. */
async function saveScores(page, sectionId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname.startsWith(API(sectionId)) &&
        answer.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'บันทึกคะแนน', exact: true }).click(),
  ]);
  return response;
}

/**
 * The heading over the grid's first column, which is the group toggle's own
 * answer to *whose marks are these*. Read rather than the toggle's own styling
 * because what a row cares about is the grid it got, not which button looks
 * pressed.
 */
const whoColumn = async page =>
  (await page.locator('table thead th').first().innerText()).trim();

/** The column headings of the grid, which is what a toggle changes. */
const columns = page =>
  page.locator('table').filter({ hasText: 'รหัสนักศึกษา' }).locator('thead th').allInnerTexts();

module.exports = {
  API,
  path,
  waitForScores,
  openScores,
  chooseActivity,
  setMode,
  setEntry,
  wholeCell,
  cloCell,
  saveScores,
  columns,
  whoColumn,
};

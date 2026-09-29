'use strict';

const { expect } = require('@playwright/test');

const { DASHBOARD } = require('./teaching-screen');
const { openAt } = require('./navigation');

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

/**
 * Waits until what the answer carried is what the grid is showing — #171.
 *
 * `waitForScores` resolves when the answer's headers land, and the grid is drawn
 * from a body that arrives after them. Measured with #170's fixture on
 * 29 September 2569, `columns` read `[]` on **ten opens out of ten**.
 *
 * The heading is the clause drawn only from `data`: it is `data.activity`'s own
 * name rather than the picker's option — the two can disagree, which is what #133
 * is about — so it says *this* answer is drawn rather than *an* answer.
 *
 * The count clause is the grid's rows, and **which rows those are is the answer's
 * to say rather than the caller's**. This was measured the wrong way round first:
 * the screen looks as though it opens on รายคน (`useState('student')`), and the
 * first draft therefore took an option to switch the count off wherever a row
 * might have pressed รายกลุ่ม. It does not open there. `ActivityScores.js:269` sets
 * the toggle from `activity.activity_type`, so a group Activity draws the six กลุ่ม
 * and not the fifty-seven students — which is why the probe read six rows where
 * the roll said fifty-seven. The count is therefore taken from the same field the
 * screen takes it from.
 *
 * **Once per Activity, though, and not once per answer** — the effect above is
 * guarded by a ref keyed on `activity.id`, and that file's own comment says why:
 * what the work was is a fact, how a teacher enters marks for it is a preference,
 * and a save answers with a new `data.activity` object every time. So this helper
 * is wired only where the Activity is new to the document: an open, whose ref
 * starts empty, and `chooseActivity`, which is the press that changes it. A row
 * that presses รายคน by hand keeps it — `setEntry` sends no request, so no answer
 * lands and nothing here runs — and a save's own re-read does not snap it back,
 * which is `34a` row 11's subject and not this helper's.
 *
 * What neither clause can see is an Activity the grid does not draw at all: the
 * form is behind `clo_rows.length > 0 && rows.length > 0`, so on an Activity with
 * no attributions, or one whose own kind of row is empty, there is no heading to
 * wait for. That case returns without waiting rather than spending the timeout
 * saying so, and the rows about it assert the empty state through retrying
 * matchers.
 */
async function untilScoresDrawn(page, response) {
  const answered = await response.json();
  const drawn =
    answered.activity?.activity_type === 'group' ? answered.groups : answered.students;
  if (!answered.clo_rows?.length || !drawn?.length) return response;

  await expect(gridHeading(page)).toHaveText(answered.activity.activity_name);
  await expect(gridRows(page)).toHaveCount(drawn.length);
  return response;
}

/** Opens the marks screen of one ตอนเรียน and hands back the marks read. */
async function openScores(page, sectionId) {
  return openAt(page, path(sectionId), async fresh => {
    const response = await waitForScores(fresh, sectionId);
    if (response.ok()) await untilScoresDrawn(fresh, response);
    return response;
  });
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
/** The กิจกรรม picker, which is the control that decides which grid is drawn. */
const activityPicker = (page) => page.getByLabel('กิจกรรม', { exact: true });

async function chooseActivity(page, sectionId, activityId) {
  const picker = activityPicker(page);
  if ((await picker.inputValue()) === String(activityId)) return null;
  const [response] = await Promise.all([
    waitForScores(page, sectionId),
    picker.selectOption(String(activityId)),
  ]);
  // The same settle point as the open's, because the same thing decides the
  // grid: choosing an Activity re-reads it and the screen sets the toggle from
  // what came back. `untilScoresDrawn` says where that was measured.
  if (response.ok()) await untilScoresDrawn(page, response);
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

/** The button that writes the grid. Separate from `saveScores` for #133's row,
 * which presses it while holding the answer back and so cannot wait for it. */
const saveButton = page => page.getByRole('button', { name: 'บันทึกคะแนน', exact: true });

/** Presses บันทึกคะแนน and hands back the write. */
async function saveScores(page, sectionId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname.startsWith(API(sectionId)) &&
        answer.request().method() === 'PUT',
    ),
    saveButton(page).click(),
  ]);
  return response;
}

/**
 * The heading over the grid, which is the answer's own name for what is being
 * marked — `data.activity.activity_name` rather than the picker's option. The
 * two can disagree, and #133 is the ticket about the moment they do.
 */
const gridHeading = page => page.locator('form h2');

/**
 * The grid's own rows — one per person or per group, whichever the Activity is.
 *
 * Scoped to the form rather than filtered by a heading's words, unlike `columns`:
 * the first column is named รหัสนักศึกษา or กลุ่ม depending on the Activity, so a
 * filter on either one would find no table at all on the other kind — which is
 * the first way this was written and what the measurement caught.
 */
const gridRows = page => page.locator('form table tbody tr');

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
  untilScoresDrawn,
  openScores,
  activityPicker,
  chooseActivity,
  setMode,
  setEntry,
  wholeCell,
  cloCell,
  saveButton,
  saveScores,
  gridHeading,
  gridRows,
  columns,
  whoColumn,
};

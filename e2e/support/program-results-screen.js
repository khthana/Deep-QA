'use strict';

const { expect } = require('@playwright/test');

/**
 * ผลการเรียนรู้ระดับหลักสูตรตามปีรับเข้า — #42, as a browser reaches it.
 *
 * All readers: the screen owns no data and writes nothing. What the rows here
 * are for is the half that only exists in front of the screen — that the two
 * pickers actually drive the report, that opening an outcome fetches its
 * drill-down and closing it puts it away, and that an outcome nobody was
 * measured against is drawn as a third state rather than as a pass.
 *
 * The arithmetic is not here. `backend/test/program-results.test.js` owns the
 * roll-up, the sixty per cent rule and what a blank leaves out, and a row here
 * asserting a mean would be the same claim in a second place — the place that
 * goes stale.
 */

const PATH = '/main/programLevelByIntake';

const REPORT_API = '/api/program-results/by-intake';

/** Opens the screen and waits for the report the pickers default to. */
async function openReport(page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === REPORT_API && answer.request().method() === 'GET',
    ),
    page.goto(PATH),
  ]);
  return response;
}

/**
 * The intake dropdown.
 *
 * There is no helper for the curriculum picker beside it, because a caller who
 * reaches one curriculum is shown a label rather than a dropdown — and every
 * account in the seed reaches one. A helper for a control the suite cannot
 * exercise would be a promise the support module cannot keep.
 */
const intakePicker = (page) => page.getByLabel('ปีรับเข้า');

/**
 * Puts one intake on screen, whichever one the report opened on.
 *
 * A row that means a particular cohort has to ask for it. The screen opens on
 * the newest intake the curriculum has students in, and *newest* is not a
 * constant: the import rows earlier in this suite enrol students whose codes
 * make them a later intake than anything the seed has, so a row that read
 * whatever the report opened on would be reading a cohort nobody has marked —
 * and would pass alone and fail in the suite, which is the worst of both.
 *
 * Selecting the year that is already selected is not a change and fires no
 * request, so the wait only happens when there is something to wait for.
 */
async function showIntake(page, admissionYear) {
  const picker = intakePicker(page);
  await expect(picker).not.toHaveValue('');
  if ((await picker.inputValue()) === admissionYear) return null;
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) => new URL(answer.url()).searchParams.get('admission_year') === admissionYear,
    ),
    picker.selectOption(admissionYear),
  ]);
  return response;
}

/** The line under the pickers that says which cohort is on screen. */
const cohortLine = (page) => page.getByText(/^ปีรับเข้า \d+ · \d+ คน/);

/** One outcome's row, found by the code in its first cell. */
const outcomeRow = (page, code) =>
  page.getByRole('row').filter({ has: page.getByText(code, { exact: true }) });

/**
 * The verdict chip of one outcome, addressed by the sentence it is read aloud
 * as rather than by the single letter it shows.
 *
 * A chip that says only `Y` is two ways of saying one thing to a reader who can
 * see both the letter and the colour, and no way at all to one who can see
 * neither — the defect #38's hand-walk found. Addressing by the label is how a
 * row here asserts the label exists.
 */
const verdictOf = (page, code) => page.locator(`[aria-label^="${code} "]`);

/** Opens or closes one outcome's drill-down. */
const sourceButton = (page, code) =>
  outcomeRow(page, code).getByRole('button', { name: /ที่มา$/ });

/** The panel the drill-down is drawn in, once it has arrived. */
const drillDown = (page) => page.getByRole('heading', { name: /^ที่มาของ / });

module.exports = {
  PATH,
  openReport,
  showIntake,
  intakePicker,
  cohortLine,
  outcomeRow,
  verdictOf,
  sourceButton,
  drillDown,
};

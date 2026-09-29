'use strict';

const { expect } = require('@playwright/test');
const { BACKEND_URL } = require('./env');
const { openAt } = require('./navigation');

/**
 * การเชื่อมโยงผลการเรียนรู้กับรายวิชา — #20, as a browser reaches it.
 *
 * Three things make these helpers different from every other screen's.
 *
 * *There is one request, not a list call and a filter call.* The screen asks
 * for the whole grid of one หลักสูตร at once — rows, columns and cells — so
 * `waitForGrid` is the only thing a row ever waits for after the reachable
 * curricula have arrived.
 *
 * *A square is found by its two names, not by its position.* Fifty-two columns
 * means an `nth()` that is off by one is a square in the wrong outcome and
 * nothing on screen says so. Every select carries `รหัสวิชา × รหัส PLO` as its
 * accessible name for exactly this reason, so `square` reads like the acceptance
 * row does.
 *
 * *There is no way back to an empty square through the screen.* The dropdown
 * offers the five levels and nothing else, and `ยังไม่ระบุ` is disabled. A row
 * that wants an untouched square has to use one nobody has written to.
 */

const MAPPING = '/main/mapping-plo';
const API = '/api/plo-mapping';

/** The หลักสูตร every row here works in, and the one it is refused on. */
const PROGRAM = '0501';
const OTHER_PROGRAM = '0503';

/** Waits for the grid the screen asks for, whatever the answer turns out to be. */
function waitForGrid(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/**
 * Waits until what the answer carried is what the grid is showing — #171.
 *
 * `waitForGrid` resolves when the answer's headers land; the grid is drawn from a
 * body that arrives after them, and between the two the screen holds an empty
 * `grid`. Measured with #170's fixture on 29 September 2569, `listedCodes` read
 * `[]` on **ten opens out of ten**.
 *
 * Two counts and no text, because this screen's heading is a constant — the
 * curriculum's name is in a picker, and a picker is drawn whether or not the grid
 * is. So the clauses are the two axes: one column per ผลการเรียนรู้ and one row per
 * รายวิชา, which between them cannot both be right on a half-drawn grid.
 *
 * What neither clause can see is a curriculum with no outcomes or no subjects:
 * the screen then draws a placeholder row instead of a body, so the row count is
 * `1` against an answer's `0`, and the column count is `0` on both sides of the
 * drawing. Such a curriculum is waited for by neither clause and returns at once;
 * the rows about that state assert the placeholder through a retrying matcher.
 */
async function untilGridDrawn(page, response) {
  const answered = await response.json();
  if (!answered.outcomes?.length || !answered.subjects?.length) return response;

  await expect(page.locator('table thead tr th:not(:first-child)')).toHaveCount(
    answered.outcomes.length,
  );
  await expect(page.locator('table tbody tr')).toHaveCount(answered.subjects.length);
  return response;
}

/** Opens the screen and asserts the grid a passing row is about to read. */
async function openMapping(page) {
  const response = await openAt(page, MAPPING, async fresh => {
    const answer = await waitForGrid(fresh);
    if (answer.ok()) await untilGridDrawn(fresh, answer);
    return answer;
  });
  expect(response.status()).toBe(200);
  return response;
}

/**
 * One square of the grid, as its two names identify it.
 *
 * `exact` because `PLO-1` is a prefix of `PLO-13` and of `PLO-1-1`, and on a
 * screen whose columns are all prefixes of each other a loose match is the
 * worst kind of false pass.
 */
const square = (page, subjectId, outcomeCode) =>
  page.getByLabel(`${subjectId} × ${outcomeCode}`, { exact: true });

/** One row of the grid, found by the รหัสวิชา in its sticky first cell. */
const subjectRow = (page, subjectId) =>
  page
    .locator('table tbody tr')
    .filter({ has: page.locator('td:first-child', { hasText: subjectId }) });

/** The frame the table sits in — the element whose scrollbar a person uses. */
const frameOf = locator => locator.locator('xpath=..');

/**
 * Chooses a level on one square and waits for the write to land.
 *
 * The response is returned rather than swallowed, for `switchTo`'s reason: a
 * helper that only selected and watched the control change would pass against a
 * screen that wrote nothing at all.
 */
async function choose(page, subjectId, outcomeCode, level) {
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        new URL(response.url()).pathname === API && response.request().method() === 'PUT',
    ),
    square(page, subjectId, outcomeCode).selectOption(level),
  ]);
  return answer;
}

/** What each square of one row is showing, keyed by the column's code. */
async function rowLevels(page, subjectId, codes) {
  const entries = await Promise.all(
    codes.map(async code => [code, await square(page, subjectId, code).inputValue()]),
  );
  return Object.fromEntries(entries);
}

/** The column codes the header is drawing, in the order it draws them. */
const listedCodes = page =>
  page
    .locator('table thead tr th:not(:first-child)')
    .allInnerTexts()
    .then(cells => cells.map(cell => cell.trim()));

/**
 * The grid as the server answers it, asked for directly.
 *
 * `page.request` carries the browser context's cookies, so this is the signed-in
 * account asking — which is what makes it usable for the refusal rows. The
 * screen offers no way to name a curriculum outside the account's reach (the
 * picker is built from the reach), so the sixth criterion's "enforced at the
 * server" has no control to press and is asked in the only way a browser can.
 */
const askFor = (page, programId) =>
  page.request.get(`${BACKEND_URL}${API}?program_id=${programId}`);

/** Presses *ส่งออก PDF* and hands back the file the browser was given. */
async function exportPdf(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'ส่งออก PDF', exact: true }).click(),
  ]);
  return download;
}

module.exports = {
  MAPPING,
  API,
  PROGRAM,
  OTHER_PROGRAM,
  waitForGrid,
  untilGridDrawn,
  openMapping,
  square,
  subjectRow,
  frameOf,
  choose,
  rowLevels,
  listedCodes,
  askFor,
  exportPdf,
};

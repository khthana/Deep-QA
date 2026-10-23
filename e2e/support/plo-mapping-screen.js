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

/**
 * Injects into the grid answer the screen is about to draw from — #196.
 *
 * Two rows need this and they are in two files: #117's row 8 lengthens a
 * รายวิชา name, and #195's row adds outcomes until there are twenty. The pipe
 * either of them needs is the same pipe whole — fetch the real answer, rewrite a
 * field of the body, fulfil with the rewritten body — and only what each injects
 * differs. `late-answer.js` answered this same question in writing for the same
 * endpoint: it is an **instrument and not an assertion**, so #68's rule about a
 * hook behind many claims does not bite, because no row's claim lives in here
 * (#171). What lives in here is the pipe.
 *
 * Measured on 23 October 2569, the merge costs the proof nothing, and that is a
 * census with a date on it rather than a law about the seam: of the 369 `FILES`
 * entries across `mutation/*.py` that day, **none** names a path under `e2e/` —
 * `117:notwrappedgrid` and `20:narrowpage` both edit
 * `frontend/src/components/ploMapping/exportPdf.js` — so there is nothing to
 * re-aim. One names a test file at all (`backend/test/auth.test.js`, #187's), and
 * `mutation/README.md` records that `e2e/support/auth.js` was once in `66`'s
 * `FILES`, so a support file holding a mutant is not impossible, only absent
 * today. What would expire the figure is a leaf taking a path under `e2e/`.
 *
 * Both rows keep asserting, each in its own file, that the injection landed:
 * #117's that the long name reached the document whole, and #195's that the
 * header drew twenty columns. That is `late-answer.js`'s `wentThroughTheWindow`
 * in the shape this instrument needs: **the precondition stays where it is used**
 * (#51), because a route that never fired reads perfectly and proves nothing —
 * measured by breaking this pipe on purpose, which turned both rows red and
 * nothing else (2 failed / 20 passed, 23 October 2569).
 *
 * ## Why the method guard is here although neither caller presses a square
 *
 * The same path takes the PUT a level choice writes, so a row that chooses a
 * level with this installed would have its write answered out of a rewritten GET
 * body. Measured on 23 October 2569, no caller of this helper writes a level, so
 * the clause is reached by nothing today; it is conserved from `20a`, where it
 * was written, and costs #117's row 8 nothing.
 *
 * ## The three other places this shape appears, and why they are not callers
 *
 * A census by the mechanism — `route.fetch()` under `e2e/`, 23 October 2569 —
 * finds four sites: this one, `tests/139a-superseded-row-detail.spec.js`,
 * `tests/152a-the-refusal-wins.spec.js` and `support/gate.js`. The other three
 * **hold** an answer and release it, at other endpoints, for claims about
 * ordering rather than about what an answer carries. Making one instrument of all
 * four is a different question with a different price (#68), not this merge.
 *
 * ## What this cannot do
 *
 * Open the window between an answer and its drawing. A fulfilled route is
 * answered all at once, which is `late-answer.js`'s own reason for existing
 * (#170); a row about that race wants `holdBack`, not this.
 *
 * @param edit called with the parsed grid, which it changes in place.
 */
async function withInjectedGrid(page, edit) {
  await page.route(
    address => new URL(address).pathname === API,
    async route => {
      if (route.request().method() !== 'GET') return route.fallback();
      const answer = await route.fetch();
      const grid = await answer.json();
      await edit(grid);
      await route.fulfill({ response: answer, json: grid });
    },
  );
}

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
  withInjectedGrid,
  exportPdf,
};

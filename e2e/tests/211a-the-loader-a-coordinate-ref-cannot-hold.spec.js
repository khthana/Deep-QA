'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { PROGRAM } = require('../../db/seed');
const { OTHER_PROGRAM } = require('../support/plo-mapping-screen');
const { signIn } = require('../support/auth');
const { gate, isGet, isWrite } = require('../support/gate');
const { panel } = require('../support/confirm-dialog');
const { hold } = require('../support/hold');
const {
  API,
  openPlos,
  filterTo,
  programFilter,
  ploRow,
  listedCodes,
  startRemoval,
  addOutcome,
  untilListed,
  waitForList,
} = require('../support/plos-screen');

/**
 * #211 — the two handlers on this screen that read the list again, and the
 * loader a ref holding a *coordinate* cannot hand them.
 *
 * #208 gave nineteen page files one shape: the handler reads the loader live
 * out of the ref it is kept in, so the read is a read of the page and the
 * filters the screen is on *now*. `Plos.js` was outside that population,
 * because its `onScreen` holds the chosen หลักสูตร rather than the loader —
 * which answers *is the filter still where it was when I was sent* perfectly
 * well (#133, `133a`), and cannot answer *which loader should do the reading*.
 *
 * So the three callers here went on passing the loader they closed over, and
 * #208's second mechanism stayed alive at two of them:
 *
 * `load` raises `loading` before it asks and lowers it only `if (isCurrent())`.
 * A loader whose `program` is the curriculum the screen has **left** therefore
 * raises the placeholder and nothing lowers it: its own `finally` refuses, and
 * the read that replaced it has long since lowered its own. The table stays at
 * *กำลังโหลด…* until something else reads — under the success sentence of the
 * removal, or under the error banner of the refusal, both of which are said.
 *
 * ## What makes the stale loader the *last* reader, which is the whole point
 *
 * Moving the filter is not enough. It replaces `load`, and the effect keyed on
 * it immediately reads the new curriculum and lowers the placeholder when that
 * answer lands: the stale read arriving afterwards is refused and takes nothing
 * down, which is exactly what #133 asks for.
 *
 * The defect needs the stale loader to be **called** after the live read has
 * settled, and that is what a handler does: it reads again when its own request
 * comes back. So both rows hold the handler's request at the route, move the
 * filter while it is out, let the new list arrive and be drawn, and only then
 * let the handler's answer go. What the handler reads next is the claim.
 *
 * ## The two ways in, and the one that is not here
 *
 * - **ลบ** (`confirmRemoval`) — the `DELETE` is out while the table and the
 *   filter are still drawn, the dialog being a full-screen `bg-black/50`
 *   overlay with the question in the middle of it. The overlay eats a click
 *   (#199's measurement), so this way in is the keyboard: `ConfirmDialog` traps
 *   no focus (#204), and a focused `<select>` answers ArrowDown. It expires the
 *   day a focus trap lands, and the first row says so - #204 closed on
 *   18 ตุลาคม 2569 with the half that announces (role, modality, a name, a
 *   description, focus moved in, Escape) and not with the half that contains,
 *   which is #217.
 * - **แก้ไข refused** (`openEditor`'s `catch`) — nothing is drawn over anything
 *   here: the form appears only when the answer lands, so while the read is out
 *   the filter is an ordinary mouse click. That way in waits on nothing and is
 *   the row that says this is not an accessibility footnote. What it needs
 *   instead is a refusal, which `gate`'s 409 supplies — the row a colleague has
 *   just removed, `139a`'s reason for making one up rather than causing it.
 * - **บันทึก** (`save`) is the third caller and is **not** reachable for this
 *   mechanism: the form replaces the table while the write is out, and `save`
 *   clears `editing` and calls `load` in the same tick, so there is no moment
 *   at which the filter is on screen and the loader not yet read. Measured on
 *   15 October 2569 by reading the order in the file; `133a`'s seventh row owns
 *   that caller's superseded-answer claim, and it keeps it.
 *
 * Measured against the unfixed code before either mutant was written (#203):
 * both rows red at the curriculum the handler asked for again — `0501`, the one
 * the screen had left — and the placeholder still up behind the sentence.
 *
 * `mode: 'serial'` and one `hold()`: the first row really removes an outcome,
 * and the schema is put back when the file ends (#134).
 */
test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** The row the table draws between asking and answering — what both rows are about. */
const LOADING = 'กำลังโหลด…';

/** What the first row presses, and what the screen says when the removal lands. */
const CONFIRM = 'ลบผลการเรียนรู้';
const REMOVED = 'ลบผลการเรียนรู้เรียบร้อยแล้ว';

/** What the second row's refusal says. Made up, like `139a`'s, and for its reason. */
const REFUSED = 'ไม่พบผลการเรียนรู้ที่ต้องการ';

/** The outcome the first row adds so that it has one it may really remove. */
const ADDED = 'PLO-Z211';

/** A read of one outcome, and a removal of one: the same path, told apart by method. */
const DETAIL = /^\/api\/plos\/\d+$/;

const programOf = request => new URL(request.url()).searchParams.get('program_id');

const loadingRows = page => page.locator('table').getByText(LOADING).count();

/**
 * Moves the filter to the other curriculum and waits for that list to be drawn,
 * answering `press` or `selectOption` as the way in says.
 *
 * Returns the codes the answer carried, which is what the rows assert the table
 * is showing: read from the answer rather than from the table, so that a screen
 * drawing nothing cannot agree with it (`pager.js`'s reason for `reading`).
 */
async function moveFilter(page, move) {
  const filter = programFilter(page);
  await expect(filter, 'the filter, while the handler’s request is out').toBeVisible();
  const moved = waitForList(page);
  await move(filter);
  const answer = await moved;
  expect(programOf(answer.request()), 'the curriculum the filter asked for').toBe(OTHER_PROGRAM);
  expect(answer.status()).toBe(200);
  await untilListed(page);
  const codes = (await answer.json()).plos.map(plo => plo.outcome_code);
  expect(await listedCodes(page), 'the list the filter put on the screen').toEqual(codes);
  return codes;
}

/**
 * What the handler reads once its own answer is let go, and whether it is drawn.
 *
 * The curriculum is asserted before the drawing is waited for, deliberately: on
 * the unfixed code the stale loader asks for the curriculum the screen has left,
 * and a row that waited for the table first would die in `settled` at the
 * placeholder — a timeout, which says where the row waited and not what the
 * screen decided (#160).
 */
async function handlerReads(page, held, codes) {
  const reloaded = waitForList(page);
  held.open();
  await held.answered;
  const answer = await reloaded;
  expect(programOf(answer.request()), 'the curriculum the handler read again').toBe(OTHER_PROGRAM);
  expect(answer.status()).toBe(200);
  await untilListed(page);
  expect(await listedCodes(page), 'the list the handler’s own read drew').toEqual(codes);
  expect(await loadingRows(page), 'the placeholder, which nothing would have taken down').toBe(0);
}

test('a removal reads the list of the หลักสูตร the filter has moved to', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openPlos(page);
  await filterTo(page, PROGRAM);

  // A row of its own to remove, rather than the first the seed happens to give
  // (#129): every ข้อหลัก in `0501` still has ข้อย่อย under it, and a removal the
  // server refuses never reaches the reload this row is about — measured, as the
  // first draft of this row, which died waiting for a request nobody was going
  // to make (#77).
  await addOutcome(page, { code: ADDED, title: 'ผลการเรียนรู้ของแถว 211', type: 'knowledge', order: 9 });
  const here = await listedCodes(page);
  expect(here, 'the outcome this row removes, on the curriculum the screen opens on').toContain(ADDED);

  const write = await gate(page, DETAIL, isWrite);
  await startRemoval(page, ADDED);
  await panel(page).getByRole('button', { name: CONFIRM, exact: true }).click();
  await write.sent;

  // The premise of the way in, asserted rather than assumed (#51): the question
  // is still up with its answer held, and the filter behind it takes the
  // keyboard. ArrowDown and not `selectOption`, because what a person can reach
  // through that overlay is what this row is about.
  //
  // This half expires the day a focus trap lands (#204 closed on
  // 18 ตุลาคม 2569 without one): the dialog traps no focus today, so
  // a focused `<select>` answers ArrowDown, and a dialog that trapped it would
  // leave this way in with nothing to press (measured 15 October 2569 — the
  // condition beside the thing it conditions, rather than only in the
  // docblock).
  await expect(panel(page), 'the confirmation, its answer held at the route').toBeVisible();
  const there = await moveFilter(page, filter => filter.focus().then(() => filter.press('ArrowDown')));
  expect(there, 'two curricula, two different lists — the premise of every assertion below')
    .not.toEqual(here);

  await handlerReads(page, write, there);
  await expect(page.getByRole('status'), 'the banner of the removal').toHaveText(REMOVED);
});

test('a refused แก้ไข reads the list of the หลักสูตร the filter has moved to', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openPlos(page);
  await filterTo(page, PROGRAM);

  const here = await listedCodes(page);
  const [code] = here;

  const read = await gate(page, DETAIL, isGet, { refusal: REFUSED });
  await ploRow(page, code).getByRole('button', { name: 'แก้ไข' }).click();
  await read.sent;

  // No overlay anywhere near this one: the form is drawn only when the answer
  // lands, so the filter is where it always was and takes a mouse.
  const there = await moveFilter(page, filter => filter.selectOption(OTHER_PROGRAM));
  expect(there, 'two curricula, two different lists — the premise').not.toEqual(here);

  await handlerReads(page, read, there);
  // The refusal is said, which is what makes the reload happen at all: this
  // caller reads the list again precisely because the form did not open.
  await expect(page.getByRole('alert'), 'the banner of the refused read').toHaveText(REFUSED);
  await expect(
    page.getByRole('heading', { name: 'แก้ไขผลการเรียนรู้ของหลักสูตร' }),
    'no form, the read having been refused',
  ).toHaveCount(0);
});

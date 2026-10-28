'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { gate, isGet } = require('../support/gate');
const { dismiss } = require('../support/confirm-dialog');
const { hold } = require('../support/hold');
const { keysOn, next, previous, reading, toLastPage, untilDrawn } = require('../support/pager');
const departments = require('../support/departments-screen');

/**
 * #206 - the step back is made from the page the pager is on, not from the one
 * the handler closed over.
 *
 * #205 gave the handed-over sentence a key, so that the read which draws the
 * list says it and a read of anything else does not. Seven removals write that
 * key as `readOf(page - 1, ...)` out of the `page` their render closed over,
 * while the move itself is `setPage(current => current - 1)`, made from the
 * page the pager is on. For somebody standing still the two are one number;
 * for anybody who moved they are two, and the sentence is then keyed for a read
 * nobody is going to make - so it is **never said**, which is a different
 * failure from #205's *said over another list*.
 *
 * ## The way in, which moved on 19 ตุลาคม 2569
 *
 * Until that day the way in was the pager itself. `ConfirmDialog` draws a
 * `fixed inset-0` overlay; it trapped no focus until 18 ตุลาคม 2569 (#204,
 * contained by #217 that same day), and this screen's `Pager` was given no
 * `busy`, so its own buttons were live for as long as the removal was out -
 * reachable by keyboard from under the cover until that date, and by ยกเลิก and
 * an ordinary click after it (#203). #199 closed on 15 ตุลาคม 2569 and left them
 * live, its new prop defaulting to `false`.
 *
 * #210 asked whether those ten callers were unchanged by measurement or by
 * construction, and the owner's answer on 19 ตุลาคม 2569 was to send `busy` to
 * all six administration screens. The premise below is therefore the opposite
 * one, and it is still asserted at the control rather than assumed (#51): the
 * pager is **dead** while the removal is out, which `210a` is the file that
 * proves, at each of the six.
 *
 * What survives is the import panel: it keeps its own flag, the screen's `busy`
 * does not reach it, and its `onImported` goes to page one, so a person can
 * still make this screen read a list while a removal of their own is held. Both
 * rows arrange their situation through it now
 * (`departments.importOneRow`), and the claims they make about the key are
 * unchanged - the price of closing a way in is paid in re-aims wherever the
 * person has another way to the same situation (#217).
 *
 * `207a` had no other way: its three rows need a read of the page the person is
 * standing on, and the import always goes to page one. There the price was
 * nets, and three of #207's five mutants withdrawn for want of a killer.
 *
 * ## Why the destination has to be more than one page back
 *
 * The page the handler closed over is the last one, so the stale key names
 * `pages - 1`, and a destination one page back makes the wrong key right by
 * accident: the mutant that writes it survived 1 of 1 where the mutant that
 * drops the comparison died. Two presses used to put the destination at
 * `pages - 2`; the import's own move puts it at page one, and the fixture holds
 * three pages, so the two still disagree - #154's rule the other way up, the
 * row having been built where they coincide.
 *
 * ## Why this screen
 *
 * Six of the seven sites are this shape exactly - `Departments`, `Programs`,
 * `Subjects`, `ProgramSubjects`, `Rubrics` and `Offerings`, each with its own
 * copy and its own filter in the key. The seventh is `SubjectStudents`, where
 * the move is `setPage(page - 1)` from the same closed-over page, so there the
 * key and the destination agree and what the defect does instead is carry the
 * person off the page they moved to. It has no row: a step back needs a last
 * page holding exactly one **removable** row, and the seed's three sections
 * hold 57, 56 and 60 enrolments whose highest codes all carry marks, which
 * `backend/routes/enrolment.js` refuses to remove (`enrolmentHasScores`).
 * Measured 13 October 2569; it is a seed change, so it is the owner's to
 * decide (`docs/06` §Out of Scope).
 *
 * `mode: 'serial'` and a `hold()`: the rows share the departments this file
 * imports to have a third page, and they are taken out again when it ends
 * (#134).
 */
test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/**
 * The departments the way in imports, taken out again between rows.
 *
 * Two letters after the prefix, which `threePagesEndingIn` never writes - its
 * codes are one letter - so neither row's import can be a duplicate of the
 * fixture's. Taken out because the fixture counts what is in the table (#132)
 * and tops it up with codes it has written before, which one row left behind
 * would make it write twice.
 */
const IMPORTED = ['XZZ', 'XZY'];

/**
 * The one fixture row a removal takes for real - #209, 19 ตุลาคม 2569.
 *
 * `threePagesEndingIn` is idempotent against a table nobody has deleted from:
 * it counts the total, works out how many to add and writes the codes it has
 * written before, so an import of `add` rows after a deletion adds nothing and
 * its own poll fails (measured - *Expected 21, Received 20*). The row that now
 * lets the write through therefore says which code went, and it is put back
 * here, below the seam and in this file's own idiom (#181). Nothing asserts its
 * names: the fixture reads the pager's total.
 */
let removed = null;
test.afterEach(async ({ page }) => {
  for (const code of IMPORTED) {
    await page.request.delete(`${BACKEND_URL}${departments.API}/${code}`);
  }
  if (removed) {
    const code = removed;
    removed = null;
    const put = await page.request.post(`${BACKEND_URL}${departments.API}`, {
      data: {
        department_id: code,
        department_name_th: 'ภาควิชาทดสอบแบ่งหน้า คืนค่า',
        department_name_en: 'Restored by 206a',
      },
    });
    expect(put.status(), `the fixture row ${code} put back`).toBe(201);
  }
});

/** What the screen says when the removal lands. */
const REMOVED = 'ลบภาควิชาเรียบร้อยแล้ว';

const pageOf = request => new URL(request.url()).searchParams.get('page');

/**
 * The answer two of these three rows hold the removal with: fulfilled by the
 * route, so it reaches no database - what those rows are about is what the
 * screen does when a removal succeeds, not what it removed (#146), and nothing
 * has to be put back. The asking itself is shared (#236).
 */
const ANSWERED_AT_THE_ROUTE = { answer: { success: {} } };

/**
 * The move that survives #210, made while the removal is still out: a row
 * imported through the panel, whose `onImported` goes to page one.
 *
 * The pager's own two presses did this until 19 ตุลาคม 2569 - from under the
 * dialog's overlay with the keyboard until 18 ตุลาคม 2569, because the cover ate
 * a click and contained nothing (#204), and by ยกเลิก and an ordinary click
 * after #217 contained it (#203). The situation is the same one and only the
 * way in has moved again; what the rows claim about the key is untouched.
 *
 * Returns the list read the move started, which the caller draws or holds.
 */
async function moveByImport(page, code) {
  const moved = departments.waitForList(page);
  await departments.importOneRow(page, {
    code,
    name: 'ภาควิชาทดสอบทางเข้า',
    note: 'Row 206 - the way in that survives #210',
  });
  const answer = await moved;
  expect(answer.status()).toBe(200);
  expect(pageOf(answer.request()), 'the page the import takes them to').toBe('1');
  return answer;
}

test.describe('ข้อมูลภาควิชา (Departments.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await departments.openDepartments(page);
    await departments.threePagesEndingIn(page, { rows: 1, prefix: 'X', note: 'Row 206' });
  });

  test('a removal says its sentence on the page the person moved to, and leaves them there', async ({
    page,
  }) => {
    const table = departments.listTable(page);
    const pages = await toLastPage(page, table, departments.waitForList);
    expect(pages).toBeGreaterThanOrEqual(3);
    const last = await keysOn(table);
    expect(last, 'one row on the last page, which is what a step back needs').toHaveLength(1);

    const write = await departments.askToRemove(page, last[0], ANSWERED_AT_THE_ROUTE);
    await dismiss(page);
    // The premise, the other way up since #210: the pager is dead while the
    // removal is out, so the move below is not made with it. Asserted rather
    // than assumed, because it is what decides which way in the row takes
    // (#51) - and read with the question put away, which is where a person
    // reads it.
    await expect(previous(page), 'ก่อนหน้า while the removal is out').toBeDisabled();
    await expect(next(page), 'ถัดไป while the removal is out').toBeDisabled();

    const moved = await moveByImport(page, 'XZZ');
    await untilDrawn(page, moved);
    expect((await reading(page, table)).shown, 'the page the person moved to').toBe(1);

    // The removal lands. Nothing steps back, because the page that lost its
    // last row is not the one in front of the person, and the list they are on
    // is read here instead - that read is the one the sentence is keyed for.
    const drawn = departments.waitForList(page);
    write.open();
    await write.answered;
    const answer = await drawn;
    expect(pageOf(answer.request()), 'the page the handler read').toBe('1');
    await untilDrawn(page, answer);

    // Drawn, and drawn where they were standing. A row that only said *I saw
    // the sentence* would pass on a screen that drew nothing (#203), and one
    // that only read the page would pass on the defect's own silence.
    expect(await keysOn(table), 'the full page they moved to').toHaveLength(10);
    expect((await reading(page, table)).shown, 'the page the pager still reads').toBe(1);
    await expect(page.getByRole('status'), 'the banner of the removal').toHaveText(REMOVED);
  });

  /**
   * The row the guard must not touch, and the one the two refusal halves cannot
   * fail on (#48): a guard of the shape *only while the pager is still there* is
   * wrong in two directions, and this is the other one.
   *
   * `57a` row 3 already asserts that a removal of the last row steps the page
   * back; what it does not read is the sentence, which is the half the handover
   * exists for.
   */
  test('a removal nobody moved away from still steps the page back and says it there', async ({
    page,
  }) => {
    const table = departments.listTable(page);
    const pages = await toLastPage(page, table, departments.waitForList);
    const last = await keysOn(table);
    expect(last).toHaveLength(1);

    removed = last[0];
    // 19 ตุลาคม 2569, #209 - the exception the paragraph above `ANSWERED_AT_THE_ROUTE`
    // cannot cover, and the reason this row passes no answer. Since the owner's
    // answer the step back is the server's to decide, from the `total` of the
    // read that follows, so a removal answered at the route would leave the page
    // exactly as full as it was and the screen would be right not to move
    // anybody. That is #209's own second reading met in this fixture: the
    // behaviour the old code gave here came from the count of the list *drawn*.
    // The row whose claim is the step back therefore lets the write through -
    // `gate` with neither `success` nor `refusal` fulfils with the server's own
    // answer - and puts nothing back, because `threePagesEndingIn` counts what is
    // in the table and tops it up with the codes it has written before (#132).
    const write = await departments.askToRemove(page, last[0]);
    // 19 ตุลาคม 2569, #209 - two reads where this row used to see one, and the
    // claim below is untouched. The owner's answer took the step back off this
    // client: the removal re-reads the page the person is standing on, and the
    // server's `total` is what says that page is past the end, so the first
    // read asks for the page that has just gone and the second for the page it
    // is handed. Nothing is drawn from the first (`HANDED_ON` in
    // `frontend/src/pages/Departments.js`), which is why the ten rows, the page
    // the pager reads and the sentence are all read after the second.
    //
    // Both waiters are registered before the press, because the second read is
    // sent from the first one's own answer: one registered after it could be
    // registered after the response it is waiting for. The second is matched by
    // the page its request asks for, which is what identifies it, and nothing
    // below asserts that number back (#116) - that the person is on it is
    // `reading(...).shown` further down.
    const drawn = departments.waitForList(page);
    const handed = page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === departments.API &&
        answer.request().method() === 'GET' &&
        pageOf(answer.request()) === String(pages - 1),
    );
    write.open();
    await write.answered;
    const asked = await drawn;
    expect(pageOf(asked.request()), 'the page the removal re-read').toBe(String(pages));
    await untilDrawn(page, await handed);

    expect(await keysOn(table)).toHaveLength(10);
    expect((await reading(page, table)).shown, 'the page the pager stepped back to').toBe(
      pages - 1,
    );
    await expect(page.getByRole('status'), 'the banner of the removal').toHaveText(REMOVED);
  });

  /**
   * The same claim as the first row, measured inside the window #207 opened.
   *
   * #207 reads the live count only while its key says the drawn list is this
   * page's, and in the first row's situation that key does not match either -
   * both presses have landed, so the list in front of the person is another
   * page's. Two clauses are false there and no mutant of one of them can fail
   * the row, which the re-sweep of 14 October 2569 said out loud:
   * `206:movecanbeofanypage` survived 14 of 14 where it had killed the first
   * row, and a fix that splits a guard shrinks every mutant that quoted the
   * block whole (#203).
   *
   * Here the move's own read is **held at the route**, so the list drawn is
   * still the page the removal was sent from: #207's key matches, and the only
   * thing left saying the move may not be made is that the pager has been asked
   * for somewhere else. That is this file's claim, with nothing else holding it
   * up - and since #210 the asking is done by the import panel's `onImported`
   * rather than by a press, which writes `page` exactly as the pager did.
   */
  test('a removal moves nobody while the page the pager asked for has not landed', async ({
    page,
  }) => {
    const table = departments.listTable(page);
    const pages = await toLastPage(page, table, departments.waitForList);
    expect(pages).toBeGreaterThanOrEqual(3);
    const last = await keysOn(table);
    expect(last, 'one row on the last page, which is what a step back needs').toHaveLength(1);

    const write = await departments.askToRemove(page, last[0], ANSWERED_AT_THE_ROUTE);
    await dismiss(page);
    // The move, with the list it asks for held: the screen has been moved to
    // page one and the rows in front of the person are still the last page's.
    const heldList = await gate(page, new RegExp(`^${departments.API}$`), isGet);
    await departments.importOneRow(page, {
      code: 'XZY',
      name: 'ภาควิชาทดสอบทางเข้า',
      note: 'Row 206 - the window the move opens',
    });
    await heldList.sent;
    expect(pageOf(heldList.request), 'the page the move asked for').toBe('1');

    // The removal lands inside that window. Nothing moves: the read is of the
    // page the person has asked for, and the sentence is keyed for it.
    const follow = page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === departments.API &&
        answer.request().method() === 'GET' &&
        answer.request() !== heldList.request,
    );
    write.open();
    await write.answered;
    const answer = await follow;
    expect(pageOf(answer.request()), 'the page the handler read').toBe('1');
    heldList.open();
    await untilDrawn(page, answer);

    expect(await keysOn(table), 'the full page the move asked for').toHaveLength(10);
    expect((await reading(page, table)).shown, 'the page the pager reads now').toBe(1);
    await expect(page.getByRole('status'), 'the banner of the removal').toHaveText(REMOVED);
  });
});

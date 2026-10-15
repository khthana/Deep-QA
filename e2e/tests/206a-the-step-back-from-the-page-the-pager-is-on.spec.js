'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isGet, isWrite } = require('../support/gate');
const { panel } = require('../support/confirm-dialog');
const { hold } = require('../support/hold');
const { downloadTemplate, headerOf, csv } = require('../support/import-panel');
const { keysOn, previous, reading, toLastPage, untilDrawn } = require('../support/pager');
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
 * ## The way in, and why it needs no race
 *
 * `ConfirmDialog` draws a `fixed inset-0` overlay and traps no focus (#204),
 * and this screen's `Pager` is given no `busy`: the pager's own buttons are
 * therefore reachable by keyboard and enabled for as long as the removal is
 * out. Both rows below take that way in - focus the control and press Enter -
 * and the first asserts that it is open, because that is the premise of the
 * whole file (#51). The day either of those tickets closes is the day to
 * measure this way in again; the claim the rows make about the key does not
 * depend on it.
 *
 * #199 closed on 15 October 2569 and this way in survived it: what the owner
 * decided is that **the enrolment screen's** pager goes dead while one of its
 * own writes is out, and `Pager`'s new prop defaults to `false`, so the ten
 * other callers - these screens among them - are unchanged. The premise is
 * asserted at the control below either way, which is what makes the survival a
 * measurement rather than a reading of the diff.
 *
 * ## Why the first row moves two pages
 *
 * One press is not enough to see the whole fix. The page the handler closed
 * over is the last one, so `readOf(page - 1)` names the page one press reaches
 * and the key is then right by accident: the mutant that writes the stale key
 * survived 1 of 1, where the mutant that drops the comparison died. Two
 * presses put the destination at `pages - 2` and the stale key at `pages - 1`,
 * which is the point where the two disagree - #154's rule the other way up,
 * the row having been built where they coincide.
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

/** `X…` sorts after the seeded departments and after `57a`'s own `Z…`. */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** What the row presses, and what the screen says when the removal lands. */
const REMOVE = 'ลบ';
const CONFIRM = 'ลบภาควิชา';
const REMOVED = 'ลบภาควิชาเรียบร้อยแล้ว';

const pageOf = request => new URL(request.url()).searchParams.get('page');

/**
 * Enough departments for a third page holding exactly one row.
 *
 * Computed from what is in the table rather than written down, because what the
 * files before this one left there decides it (#132) - and idempotent, so the
 * second row finds the first row's import rather than adding to it. The rows
 * are imported through the screen's own panel, which is the only way this
 * account writes departments.
 */
async function threePagesWithOneOnTheLast(page) {
  const { total: before, pages } = await reading(page, departments.listTable(page));
  if (before % 10 === 1 && pages >= 3) return;

  const header = headerOf(await downloadTemplate(page));
  let add = (1 - (before % 10) + 10) % 10;
  if (add === 0) add = 10;
  while (before + add < 21) add += 10;
  const codes = Array.from({ length: add }, (unused, i) => `X${ALPHABET[i]}`);

  await departments.importDepartments(
    page,
    csv(header, ...codes.map((code, i) => `${code},ภาควิชาทดสอบแบ่งหน้า ${i},Row 206 ${i}`)),
  );
  // The total the pager reads out is the evidence the import landed; `14b` is
  // the file that asserts the panel's own sentence.
  await expect
    .poll(async () => (await reading(page, departments.listTable(page))).total)
    .toBe(before + add);
}

/**
 * Asks to remove the one row of the last page, with the answer held at the
 * route so it reaches no database - what the rows are about is what the screen
 * does when a removal succeeds, not what it removed (#146), and nothing has to
 * be put back.
 */
async function askToRemove(page, code) {
  await departments.departmentRow(page, code).getByRole('button', { name: REMOVE }).click();
  const write = await gate(page, new RegExp(`^${departments.API}/[^/]+$`), isWrite, {
    success: {},
  });
  await panel(page).getByRole('button', { name: CONFIRM }).click();
  await write.sent;
  return write;
}

/** The pager's own way back, from under the dialog's overlay. */
async function stepBackByKeyboard(page) {
  const moved = departments.waitForList(page);
  await previous(page).focus();
  await previous(page).press('Enter');
  const answer = await moved;
  expect(answer.status()).toBe(200);
  return answer;
}

test.describe('ข้อมูลภาควิชา (Departments.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await departments.openDepartments(page);
    await threePagesWithOneOnTheLast(page);
  });

  test('a removal says its sentence on the page the person moved to, and leaves them there', async ({
    page,
  }) => {
    const table = departments.listTable(page);
    const pages = await toLastPage(page, table, departments.waitForList);
    expect(pages).toBeGreaterThanOrEqual(3);
    const last = await keysOn(table);
    expect(last, 'one row on the last page, which is what a step back needs').toHaveLength(1);

    const write = await askToRemove(page, last[0]);
    // The premise: the pager under the overlay is enabled and takes focus,
    // which is this screen's missing `busy` (#199, which did not reach it) and
    // #204's missing focus trap.
    await expect(previous(page), 'the pager while the removal is out').toBeEnabled();
    const first = await stepBackByKeyboard(page);
    expect(pageOf(first.request()), 'the page the first press asked for').toBe(String(pages - 1));
    expect(
      await previous(page).evaluate(node => node === document.activeElement),
      'the focus the keyboard reached the pager with',
    ).toBe(true);
    await untilDrawn(page, first);
    const moved = await stepBackByKeyboard(page);
    expect(pageOf(moved.request()), 'the page the person moved to').toBe(String(pages - 2));

    // The removal lands. Nothing steps back, because the page that lost its
    // last row is not the one in front of the person, and the list they are on
    // is read here instead - that read is the one the sentence is keyed for.
    const drawn = departments.waitForList(page);
    write.open();
    await write.answered;
    const answer = await drawn;
    expect(pageOf(answer.request()), 'the page the handler read').toBe(String(pages - 2));
    await untilDrawn(page, answer);

    // Drawn, and drawn where they were standing. A row that only said *I saw
    // the sentence* would pass on a screen that drew nothing (#203), and one
    // that only read the page would pass on the defect's own silence.
    expect(await keysOn(table), 'the full page they moved to').toHaveLength(10);
    expect((await reading(page, table)).shown, 'the page the pager still reads').toBe(pages - 2);
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

    const write = await askToRemove(page, last[0]);
    const drawn = departments.waitForList(page);
    write.open();
    await write.answered;
    const answer = await drawn;
    expect(pageOf(answer.request()), 'the page the step back asked for').toBe(String(pages - 1));
    await untilDrawn(page, answer);

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
   * Here the press is **held at the route**, so the list drawn is still the
   * page the removal was sent from: #207's key matches, and the only thing left
   * saying the move may not be made is that the pager has asked for somewhere
   * else. That is this file's claim, with nothing else holding it up.
   */
  test('a removal moves nobody while the page the pager asked for has not landed', async ({
    page,
  }) => {
    const table = departments.listTable(page);
    const pages = await toLastPage(page, table, departments.waitForList);
    const last = await keysOn(table);
    expect(last, 'one row on the last page, which is what a step back needs').toHaveLength(1);

    const write = await askToRemove(page, last[0]);
    // One press back, with that page's list held: the pager has asked for
    // another page and the rows in front of the person are still this one's.
    const heldList = await gate(page, new RegExp(`^${departments.API}$`), isGet);
    await previous(page).focus();
    await previous(page).press('Enter');
    await heldList.sent;
    expect(pageOf(heldList.request), 'the page the press asked for').toBe(String(pages - 1));

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
    expect(pageOf(answer.request()), 'the page the handler read').toBe(String(pages - 1));
    heldList.open();
    await untilDrawn(page, answer);

    expect(await keysOn(table), 'the full page the press asked for').toHaveLength(10);
    expect((await reading(page, table)).shown, 'the page the pager reads now').toBe(pages - 1);
    await expect(page.getByRole('status'), 'the banner of the removal').toHaveText(REMOVED);
  });
});

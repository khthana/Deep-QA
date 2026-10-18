'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { panel } = require('../support/confirm-dialog');
const { hold } = require('../support/hold');
const { keysOn, next, previous, reading, toLastPage, untilDrawn } = require('../support/pager');
const departments = require('../support/departments-screen');
const {
  openUsers,
  userRow,
  search,
  startStatusChange,
  confirmStatusChange,
  listTable: usersTable,
} = require('../support/users-screen');

/**
 * #208 - a handler that reads the list again reads it with the loader it was
 * sent with, and that loader belongs to the page and the filter the screen was
 * on at the press.
 *
 * `load` is a `useCallback` keyed on what the read is of - the page on every
 * paged screen, the filters as well on the accounts screen - so a control that
 * changes any of those replaces it. A handler is torn down by nothing (#133),
 * so the one the handler closed over is still callable afterwards and its
 * `isCurrent()` is false before its request even leaves. Two things follow, and
 * they are two mechanisms of one symptom rather than a choice between
 * explanations (#148, #149):
 *
 * 1. the answer is thrown away by #140's guard, so the list in front of the
 *    person still holds the row the write changed; and
 * 2. `load` raises `loading` before it asks and lowers it only for a read the
 *    screen still wants, so a read superseded **before it started** leaves the
 *    placeholder row up with nothing coming that will take it down - the table
 *    stays at *กำลังโหลด…* until something else reads, with the success
 *    sentence over it.
 *
 * The second is the more general of the two: any read superseded before it
 * starts does it, the read that replaced it having lowered its own `loading`
 * already. What produces such a read is a caller that passes a loader it
 * closed over, and after this ticket there is none - the fix is to read with
 * the loader the screen is on, which is the shape this screen's own middle
 * branch already used, and `frontend/scripts/dead-loaders.js` is the instrument
 * that keeps it so.
 *
 * ## The two ways in, and why both are here
 *
 * Both rows below are reachability claims about one line of code each, and the
 * code they reach is the same shape (#191). What they do not share is what it
 * costs to lose them:
 *
 * - **Departments** is where the defect was measured, on 14 October 2569 while
 *   #207 was being built, and the way in is the pager under the confirmation's
 *   overlay: keyboard only, because `bg-black/50` eats the click (#199's own
 *   measurement), so it expires the day a focus trap lands - #204 itself
 *   closed on 18 ตุลาคม 2569 with the announcing half, which traps nothing,
 *   and the trap is #217 - unless the six
 *   screens of #210 are given `busy` first, which closes it one screen sooner.
 * - **The accounts screen** asked nothing before it switched a status when this
 *   was written: no overlay, no dialog, and the search box and the pager were
 *   ordinary clicks while the `PUT` was out - a way in reachable with a bare
 *   mouse, waiting on nothing, and the row that said this ticket was not an
 *   accessibility footnote. #86 restored that screen's question on
 *   16 ตุลาคม 2569 and the overlay is now over this row too. What is left of
 *   the claim is that the way in needs no second defect **of the dialog's**:
 *   `fill()` focuses the search box rather than clicking it, so the search box
 *   is still reachable while the box is open where a click would be eaten, and
 *   the row runs unchanged. But a person reaches that field with the mouse, so
 *   the sentence above is no longer true of anybody and this ticket's two rows
 *   now expire together, with the containment half of #204, now #217 (re-dated
 *   18 ตุลาคม 2569: #204 closed with the announcing half and the box still
 *   contains nothing).
 *
 * Measured against the unfixed code before either mutant was written (#203):
 * both rows red, each at the moment the handler's answer should have been
 * drawn.
 *
 * `mode: 'serial'` and one `hold()`: the first row imports departments and
 * really removes one of them, the second really suspends a teacher, and the
 * schema is put back when the file ends (#134).
 */
test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** What the first row presses, and what the screen says when the removal lands. */
const REMOVE = 'ลบ';
const CONFIRM = 'ลบภาควิชา';
const REMOVED = 'ลบภาควิชาเรียบร้อยแล้ว';

/** The row the table draws between asking and answering - what row 1 is about. */
const LOADING = 'กำลังโหลด…';

/** What the second row presses, and what the row reads once the switch lands. */
const SUSPEND = 'ระงับ';
const RESTORE = 'เปิดใช้งาน';

const pageOf = request => new URL(request.url()).searchParams.get('page');

/**
 * Asks to remove one row, with the `DELETE` held at the route until the row
 * lets it go - and really answered, because what the row is about is the list
 * the screen draws after a removal that happened.
 */
async function askToRemove(page, code) {
  await departments.departmentRow(page, code).getByRole('button', { name: REMOVE }).click();
  const write = await gate(page, new RegExp(`^${departments.API}/${code}$`), isWrite);
  await panel(page).getByRole('button', { name: CONFIRM }).click();
  await write.sent;
  return write;
}

/**
 * One press of the pager, from under the dialog's overlay.
 *
 * Focus and Enter rather than a click, which the overlay would take: the way in
 * `206a` and `207a` measured, and the premise the row asserts (#51).
 */
async function pressPager(page, button) {
  const moved = departments.waitForList(page);
  await button.focus();
  await button.press('Enter');
  const answer = await moved;
  expect(answer.status()).toBe(200);
  return untilDrawn(page, answer);
}

/**
 * Back one page and forward again: the pager where it started, and a `load` the
 * screen has replaced twice over.
 *
 * Twice over on purpose. One press would leave the person on another page,
 * which is a different branch of the same handler (#206's), and what this
 * ticket is about is the branch that moves nobody: the page the removal was
 * sent from is the page they are standing on, and the loader that reads it is
 * still not the one the handler holds.
 */
async function awayAndBack(page) {
  await pressPager(page, previous(page));
  return pressPager(page, next(page));
}

test.describe('ภาควิชา — the removal that moves nobody (Departments.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await departments.openDepartments(page);
  });

  test('a removal draws the list of the page the pager came back to', async ({ page }) => {
    const table = departments.listTable(page);
    await departments.threePagesEndingIn(page, { rows: 3, prefix: 'ZZ', note: 'Row 208' });
    const pages = await toLastPage(page, table, departments.waitForList);
    const last = await keysOn(table);
    expect(
      last,
      'three rows on the last page, which is what makes the removal take the branch that moves nobody',
    ).toHaveLength(3);

    const write = await askToRemove(page, last[0]);
    // The premise of the way in, asserted rather than assumed (#51): this
    // screen's `Pager` is given no `busy` - #199 gave one to the enrolment
    // screen and to no other, the prop defaulting to `false` - and the
    // confirmation traps no focus (#204), so the pager answers Enter from
    // under the overlay.
    await expect(previous(page), 'the pager while the removal is out').toBeEnabled();

    await awayAndBack(page);
    expect(
      await keysOn(table),
      'the rows the page still holds, the removal not having landed yet',
    ).toEqual(last);
    const { total: before } = await reading(page, table);

    const drawn = departments.waitForList(page);
    write.open();
    await write.answered;
    const answer = await drawn;
    expect(pageOf(answer.request()), 'the page the handler read').toBe(String(pages));
    // The claim: the answer to that read is drawn. Not *I saw no placeholder* -
    // a row that says only what it did not see passes for the wrong reason
    // (#203) - but the count and the page the line reads out, which move only
    // when `setData` runs.
    await untilDrawn(page, answer);

    expect(await keysOn(table), 'the rows left on the page nobody moved off').toEqual(last.slice(1));
    expect((await reading(page, table)).total, 'the count the line reads out').toBe(before - 1);
    expect(
      await table.getByText(LOADING).count(),
      'the placeholder, which nothing would have taken down',
    ).toBe(0);
    await expect(page.getByRole('status'), 'the banner of the removal').toHaveText(REMOVED);
  });
});

test.describe('บัญชีผู้ใช้ — the switch, read through its own search box (Users.js)', () => {
  test('a status switch draws the list the search box put on the screen', async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openUsers(page);
    const table = usersTable(page);

    // Found through the search box, because ten seeded accounts and a page of
    // ten mean no particular row is certain to be on page one (`202a`), and
    // the two teachers are the pair that is never the account signed in.
    await search(page, 'teacher');
    const row = userRow(page, ACCOUNTS.teacherTwo);
    await expect(row, 'the row the switch is pressed on').toHaveCount(1);
    await expect(
      row.getByRole('button', { name: SUSPEND }),
      'the account is live before the press',
    ).toBeVisible();

    const write = await gate(page, /^\/api\/users\/[^/]+\/status$/, isWrite);
    await startStatusChange(page, ACCOUNTS.teacherTwo, SUSPEND);
    await confirmStatusChange(page);
    await write.sent;

    // The way in. There is an overlay over it since #86 - the question the
    // switch now asks is still open, the write being held - and `fill()`
    // reaches the box through focus rather than through a click, which is what
    // the overlay would take. `load` here is keyed on
    // `[filters, page]`, and the search box writes `filters` on every
    // keystroke. One term narrows the list to the account being suspended, so
    // what the handler's read is of and what the person is looking at are the
    // same page of the same question - and the loader that reads it is still
    // not the one the handler holds.
    await search(page, ACCOUNTS.teacherTwo);
    await expect(row, 'the one row the search leaves on the screen').toHaveCount(1);

    const drawn = page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === '/api/users' && answer.request().method() === 'GET',
    );
    write.open();
    await write.answered;
    const answer = await drawn;
    // The first claim, and the one the pager cannot make: a loader carries the
    // filters of the render that built it, so the question the stale one asks
    // is the one the search box has replaced. On the departments screen the
    // two loaders ask for the same page and only the drawing tells them apart;
    // here the request says it outright.
    expect(
      new URL(answer.url()).searchParams.get('q'),
      'the question the handler asked again',
    ).toBe(ACCOUNTS.teacherTwo);
    expect(answer.status(), "the handler's own read of the narrowed list").toBe(200);

    // And the second: that answer is drawn. The switch is a real one, so what
    // says so is the row's own control reading the other way round.
    await expect(
      row.getByRole('button', { name: RESTORE }),
      'the row the answer carried, drawn',
    ).toBeVisible();
    expect(
      await table.getByText(LOADING).count(),
      'the placeholder, which nothing would have taken down',
    ).toBe(0);
  });
});

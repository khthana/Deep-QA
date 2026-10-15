'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { gate, isGet, isWrite } = require('../support/gate');
const { panel } = require('../support/confirm-dialog');
const { hold } = require('../support/hold');
const { downloadTemplate, headerOf, csv } = require('../support/import-panel');
const {
  keysOn,
  next,
  pagerLine,
  previous,
  reading,
  toLastPage,
  untilDrawn,
} = require('../support/pager');
const departments = require('../support/departments-screen');

/**
 * #207 - how many rows the step back counts is the count of the page the
 * removal was sent from, which is the live ref only while the pager is still
 * on that page.
 *
 * #206 gave the step back the page the pager is on. The line above it still
 * asks `data.departments.length === 1` of the `data` the render closed over,
 * which is the claim #201 is about and not the claim #205 is about: the two sit
 * on neighbouring lines in one handler and are two claims.
 *
 * ## The way in, measured 14 October 2569
 *
 * After #206 a page move alone cannot reach it - a person who moved takes the
 * branch that moves nobody. What is left is a read that lands **while the
 * removal is out and the pager ends up where it started**, and the only such
 * read on this screen comes from the pager itself: the list is re-read on every
 * press, this screen's `Pager` is given no `busy` (#199 gave one to the
 * enrolment screen's on 15 October 2569 and to no other, the prop defaulting to
 * `false`), and the confirmation traps no focus (#204), so going back one page
 * and forward again replaces `data` without moving anybody. Anything that changed the page's rows meanwhile is then on
 * the screen and absent from the handler.
 *
 * The rows below build that with a second actor on the same account -
 * `page.request` is the browser's own cookie (`12a`), and the two presses are
 * the keyboard's, because the overlay is over the pager (`206a`).
 *
 * ## What it costs to be wrong
 *
 * The handler counted two rows, so it does not step back; the list in front of
 * the person holds one, and that one is what the removal takes. They are left
 * on a page whose rows are gone, reading the row that has just been removed,
 * because the read the handler then makes belongs to a `load` the pager
 * replaced (#140) and is thrown away. The mirror - a handler that counted one
 * row stepping back off a page that has since filled - is the same staleness
 * and is read in the second row.
 *
 * ## Why this screen
 *
 * All seven sites carry the line. `Departments` is the one whose situation is
 * buildable without a second screen: it needs a last page of two rows, which
 * its own import panel can make, and a removal that really lands, which this
 * account may make here. `206a` says why `SubjectStudents` has no row.
 *
 * `mode: 'serial'` and a `hold()`: the rows share the departments this file
 * imports, and the schema is put back when it ends (#134).
 */
test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/**
 * `Y<tag><letter>` sorts after the seeded departments and after `206a`'s `X...`,
 * and the tag keeps one row's import from being another's duplicate - the codes
 * outlive the rows that made them (`hold` puts the schema back when the file
 * ends, not between its rows), so the third row carries its own tag rather than
 * the count it shares with the second.
 */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** What the rows press, and what the screen says when the removal lands. */
const REMOVE = 'ลบ';
const CONFIRM = 'ลบภาควิชา';
const REMOVED = 'ลบภาควิชาเรียบร้อยแล้ว';

/**
 * The row the table draws between asking and answering, which `load` puts up
 * before it asks - so inside the third row's window it is what is on the
 * screen, and the rows of the page before are not. `support/pager.js` waits for
 * it to go away; this file is the one that waits for it to be there.
 */
const LOADING = 'กำลังโหลด…';

/**
 * The rows the third row has somebody else add, and they have to land on the
 * page the removal was sent from: the list is ordered by the code, so these
 * sort above everything this file imports, `YY` and `YZ` of the second row
 * included.
 */
const ARRIVED = ['YZA', 'YZB'];

const pageOf = request => new URL(request.url()).searchParams.get('page');

/**
 * Which page the line reads out, without waiting for the table to settle.
 *
 * `reading()` waits for rows, and the second row cannot have them: the read its
 * handler makes is thrown away by #140's guard - it is made with the `load` the
 * pager replaced - and `load` raises `loading` before it asks and lowers it
 * only for a read the screen still wants, so the table keeps the placeholder
 * until something else reads. What that row is about is the page, and the page
 * is written on the line.
 */
const pageTheLineReads = async page =>
  Number((await pagerLine(page).innerText()).match(/\d+/g)[1]);

/**
 * Enough departments for a third page holding exactly `rows` of them.
 *
 * Counted from what is in the table rather than written down, because what the
 * files before this one left there decides it (#132), and idempotent in the
 * same way `206a`'s is - the second row finds the first row's import. The rows
 * go in through the screen's own panel, the only way this account writes
 * departments.
 */
async function threePagesEndingIn(page, rows, tag = `${rows}`) {
  const { total: before, pages } = await reading(page, departments.listTable(page));
  if (before % 10 === rows % 10 && pages >= 3) return before;

  const header = headerOf(await downloadTemplate(page));
  let add = ((rows - before) % 10 + 10) % 10;
  if (add === 0) add = 10;
  while (before + add < 20 + rows) add += 10;
  const codes = Array.from({ length: add }, (unused, i) => `Y${tag}${ALPHABET[i]}`);

  await departments.importDepartments(
    page,
    csv(header, ...codes.map((code, i) => `${code},ภาควิชาทดสอบแบ่งหน้า ${i},Row 207 ${i}`)),
  );
  await expect
    .poll(async () => (await reading(page, departments.listTable(page))).total)
    .toBe(before + add);
  return before + add;
}

/**
 * Asks to remove one row, with the answer held at the route until the row lets
 * it go - and really answered, because what the rows are about is the page the
 * screen lands on after a removal that happened.
 *
 * The hold names the one id, so a second actor's removal of the other row is
 * not routed at all.
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
 * Focus and Enter rather than a click, which the overlay would take: the same
 * way in `206a` measured, and the premise the first row asserts (#51).
 */
async function pressPager(page, button) {
  const moved = departments.waitForList(page);
  await button.focus();
  await button.press('Enter');
  const answer = await moved;
  expect(answer.status()).toBe(200);
  return untilDrawn(page, answer);
}

/** Back one page and forward again: two reads, and the pager where it started. */
async function awayAndBack(page) {
  await pressPager(page, previous(page));
  return pressPager(page, next(page));
}

test.describe('ข้อมูลภาควิชา (Departments.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await departments.openDepartments(page);
  });

  test('a removal steps back from a page the rows left while it was out', async ({ page }) => {
    const table = departments.listTable(page);
    await threePagesEndingIn(page, 2);
    const pages = await toLastPage(page, table, departments.waitForList);
    const last = await keysOn(table);
    expect(last, 'two rows on the last page, which is what makes the handler count two').toHaveLength(
      2,
    );

    const write = await askToRemove(page, last[0]);
    // The premise of both rows: the pager under the overlay is enabled and
    // takes focus, which is this screen's missing `busy` (#199, which did not
    // reach it) and #204's missing focus trap (#51 - a premise a row rests on
    // is asserted, not assumed).
    await expect(previous(page), 'the pager while the removal is out').toBeEnabled();
    // The other row goes while the removal is out, on this browser's own
    // cookie: the second actor the situation needs, and the only part of it
    // that does not come from the screen.
    const removedElsewhere = await page.request.delete(
      `${BACKEND_URL}${departments.API}/${last[1]}`,
    );
    expect(removedElsewhere.status(), 'the other row, removed by somebody else').toBe(204);

    // Two presses of the pager, and the person is back where they were with a
    // list that is one row shorter. The count assertion is the precondition the
    // whole row rests on, and it is read off the table rather than off the
    // response (#50).
    await awayAndBack(page);
    expect(await keysOn(table), 'the row the page is down to').toEqual([last[0]]);
    expect((await reading(page, table)).shown, 'the page the pager is still on').toBe(pages);

    const drawn = departments.waitForList(page);
    write.open();
    await write.answered;
    const answer = await drawn;
    expect(pageOf(answer.request()), 'the page the step back asked for').toBe(String(pages - 1));
    await untilDrawn(page, answer);

    // Drawn, where the step back went, with the sentence that belongs to it.
    expect(await keysOn(table), 'the full page they were taken back to').toHaveLength(10);
    expect((await reading(page, table)).shown, 'the page the pager reads now').toBe(pages - 1);
    await expect(page.getByRole('status'), 'the banner of the removal').toHaveText(REMOVED);
  });

  /**
   * The mirror, and the direction a guard of this shape is wrong in the other
   * way (#48): the handler counted one row and would step back off a page that
   * has since filled up.
   */
  test('a removal stays on a page the rows arrived at while it was out', async ({ page }) => {
    const table = departments.listTable(page);
    await threePagesEndingIn(page, 1);
    const pages = await toLastPage(page, table, departments.waitForList);
    const last = await keysOn(table);
    expect(last, 'one row on the last page, which is what makes the handler count one').toHaveLength(
      1,
    );

    const write = await askToRemove(page, last[0]);
    // Two more rows arrive on that page while the removal is out, through the
    // API for the reason the first row's removal does: the panel's own
    // `onImported` goes to page one, which would move the person and take the
    // branch #206 wrote instead of this one.
    for (const code of ['YY', 'YZ']) {
      const added = await page.request.post(`${BACKEND_URL}${departments.API}`, {
        data: { department_id: code, department_name_th: `ภาควิชาทดสอบแบ่งหน้า ${code}`, is_active: true },
      });
      expect(added.status(), 'a row somebody else added').toBe(201);
    }

    await awayAndBack(page);
    expect(await keysOn(table), 'the rows the page has grown to').toHaveLength(3);

    const drawn = departments.waitForList(page);
    write.open();
    await write.answered;
    const answer = await drawn;
    expect(pageOf(answer.request()), 'the page the handler read').toBe(String(pages));

    // Nobody moved, and the sentence is said where they are standing. The
    // sentence is the settle point here, because `untilDrawn` cannot be: this
    // read is made with the `load` the handler closed over, which the pager's
    // two presses replaced, so #140's guard throws the answer away and the
    // table keeps the placeholder it drew while asking, which is a screen with
    // no rows on it at all. Measured on 14 October 2569 by a throwaway row at a
    // count that does not change (three rows, one removed), and measured that
    // way **at `HEAD` as well as with this fix**, both green: so it is a defect
    // this ticket walked into and not one it caused (#103), it has a draft
    // ticket of its own, and it is not this row's claim - the count the decision reads
    // is. Which is why the sentence is the settle point here and the page is
    // read off the line.
    await expect(page.getByRole('status'), 'the banner of the removal').toHaveText(REMOVED);
    expect(await pageTheLineReads(page), 'the page the pager is still on').toBe(pages);
  });

  /**
   * The window, which is the third thing the count can be wrong about and the
   * one neither of the rows above can see: they both wait for the returning
   * list, and inside that wait the two refs disagree.
   *
   * `onPage` is written by an effect on `[page]`, at the press; the count by an
   * effect on `[data]`, at the answer. So between the press that brings the
   * pager back and that page's list landing, `onPage` reads this page while the
   * count is still the previous page's - what is on the screen in that gap is
   * the placeholder, and the line and the ref are the two things the screen
   * keeps from the page before. Both axes of
   * this ticket's review asked for the key that tells them apart, and a
   * throwaway row measured the window on 14 October 2569 before this row
   * replaced it.
   *
   * Aimed this way round, the window is a claim: the stale reading may decide
   * which loader reads - which is the branch a person who moved takes - and it
   * may not move anybody. Aimed the other way round it is not, and that half is
   * written down on the mutation file and on the sheet: the count of the page
   * the removal was sent from, once the screen shows another page's list, is a
   * read of a page nobody is looking at and no reading here can give it.
   */
  test('a removal moves nobody on a count that belongs to another page', async ({ page }) => {
    const table = departments.listTable(page);
    await threePagesEndingIn(page, 1, 'W');
    const pages = await toLastPage(page, table, departments.waitForList);
    const last = await keysOn(table);
    expect(last, 'one row on the last page, which is what makes the handler count one').toHaveLength(
      1,
    );

    const write = await askToRemove(page, last[0]);
    // The page fills up again while the removal is out, as in the second row:
    // what this row adds is **when** the handler reads the count, not what the
    // count is.
    for (const code of ARRIVED) {
      const added = await page.request.post(`${BACKEND_URL}${departments.API}`, {
        data: { department_id: code, department_name_th: `ภาควิชาทดสอบแบ่งหน้า ${code}`, is_active: true },
      });
      expect(added.status(), 'a row somebody else added').toBe(201);
    }

    // Back one page, drawn, so the count is of that page and holds ten.
    await pressPager(page, previous(page));
    expect(await keysOn(table), 'the full page they stepped back to').toHaveLength(10);

    // Forward again, with that page's list held at the route: the pager is back
    // where it started and the list in front of the person is not. This is the
    // window, and it is the premise of the row (#51).
    const heldList = await gate(page, new RegExp(`^${departments.API}$`), isGet);
    await next(page).focus();
    await next(page).press('Enter');
    await heldList.sent;
    expect(pageOf(heldList.request), 'the page the returning press asked for').toBe(String(pages));
    // The line reads the page the **answer** describes (`shown ?? page`), which
    // is #57's own reason for that fallback, so inside the window it and the
    // rows are still the page before. That is the window, stated twice.
    expect(await pageTheLineReads(page), 'the page the line still reads').toBe(pages - 1);
    await expect(
      table.locator('tbody tr td').first(),
      'the table, waiting for the page the pager has gone back to',
    ).toHaveText(LOADING);

    // The removal lands inside the window. The count the handler can trust is
    // of another page, so nothing moves; the list the person is waiting for is
    // read by the loader that belongs to it, and that read says the sentence.
    const follow = page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === departments.API &&
        answer.request().method() === 'GET' &&
        answer.request() !== heldList.request,
    );
    write.open();
    await write.answered;
    const answer = await follow;
    expect(pageOf(answer.request()), 'the page the handler read').toBe(String(pages));
    heldList.open();
    await untilDrawn(page, answer);

    // Drawn where they were standing, with the two rows somebody else added and
    // without the one this screen removed.
    expect(await keysOn(table), 'the rows left on the page nobody moved off').toEqual(ARRIVED);
    expect((await reading(page, table)).shown, 'the page the pager still reads').toBe(pages);
    await expect(page.getByRole('status'), 'the banner of the removal').toHaveText(REMOVED);
  });
});

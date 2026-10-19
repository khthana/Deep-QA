'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { dismiss, panel } = require('../support/confirm-dialog');
const { hold } = require('../support/hold');
const { keysOn, previous, reading, toLastPage, untilDrawn } = require('../support/pager');
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
 * `false`), so going back one page and forward again replaces `data` without
 * moving anybody - under the cover with the keyboard until 18 ตุลาคม 2569,
 * when #217 contained the focus, and by dismissing the question first since
 * (#203, the same situation and only the way in moved). Anything that changed the page's rows meanwhile is then on
 * the screen and absent from the handler.
 *
 * The rows below build that with a second actor on the same account -
 * `page.request` is the browser's own cookie (`12a`), and the two presses were
 * the keyboard's while the overlay was over the pager and contained nothing
 * (`206a`); since #217 they are ordinary clicks taken after ยกเลิก.
 *
 * ## What it costs to be wrong
 *
 * The handler counted two rows, so it does not step back; the list in front of
 * the person holds one, and that one is what the removal takes. They are left
 * on a page whose rows are gone, reading the row that has just been removed -
 * until something reads that page again, which until #208 was *nothing*,
 * because the read the handler then made belonged to a `load` the pager had
 * replaced and #140's guard threw it away. Since 15 October 2569 the handler
 * reads with the loader the screen is on, so the stale count is still the whole
 * of the defect and the screen is no longer stuck as well. The mirror - a
 * handler that counted one row stepping back off a page that has since filled -
 * is the same staleness and is read in the second row.
 *
 * ## Why this screen
 *
 * All seven sites carry the line. `Departments` is the one whose situation is
 * buildable without a second screen: it needs a last page of two rows, which
 * its own import panel can make, and a removal that really lands, which this
 * account may make here. `206a` says why `SubjectStudents` has no row.
 *
 * ## The way in closed on 19 ตุลาคม 2569, and this file is a net
 *
 * #210 asked whether `Pager`'s other ten callers were unchanged by measurement
 * or by construction, and the owner's answer that day was to send `busy` to all
 * six administration screens. The pager was the only control that re-read **the
 * page the person is standing on**: the import panel keeps its own flag and is
 * live while a removal is out, but its `onImported` goes to page one, which is a
 * move, and a person who moved takes #206's branch and never reaches the line
 * this file is about; the editor's save and the confirmation's own button are
 * `disabled={busy}`, and this screen has no filter and no search box. Read from
 * `Departments.js` and measured on the screen on 19 ตุลาคม 2569.
 *
 * So the three rows that stood here are withdrawn, and one net stands in their
 * place asserting the **mechanism** rather than the absence (#203, #47): the
 * pager dead while the removal is out, and the one read a person can still
 * start asking for page one. What the three claimed is unreachable, not
 * disproved -
 *
 * 1. a removal steps back from a page the rows left while it was out;
 * 2. a removal stays on a page the rows arrived at while it was out;
 * 3. a removal moves nobody on a count that belongs to another page.
 *
 * - and **four** of this ticket's five mutants had no other killer and came
 * out the same day, the reason written beside each on
 * `mutation/207-the-rows-the-step-back-counts.py`: `closurerowcount`,
 * `trustthestalecount`, `refalwaysone` and `alwaysthelivecount`. The fourth was
 * named as staying while this paragraph was first written, because its killer
 * was `206a`'s first row rather than one of these three; the re-sweep an hour
 * later found it surviving that row as well, the import panel having made the
 * closure's count and the ref's count the same number (#206's tenth reading of
 * a survivor). Only `refnevermoves` stays, killed by `206a`'s second row and
 * `57a` row 3. All four were run against fifteen rows before coming out -
 * `206a` one row at a time (#67), this net, `57a` and `208a` - and survived
 * every one of them.
 *
 * What would make the claims reachable again, and so bring the rows and the
 * mutants back: any control on this screen that re-reads the page the person is
 * on while a write of theirs is out - the owner reversing #210, a filter or a
 * search box arriving here, or `onImported` reloading the current page instead
 * of going to page one.
 *
 * One `hold()`: the net imports a department and holds a removal, and the
 * schema is put back when the file ends (#134).
 */
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** What the net presses. The sentence the removal says is `206a`'s claim. */
const REMOVE = 'ลบ';
const CONFIRM = 'ลบภาควิชา';

const pageOf = request => new URL(request.url()).searchParams.get('page');

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
  // The question is put away with the answer still held at the route - what
  // the net needs and is not about: a person reads the pager with the box gone
  // (#217), and dismissing cancels nothing that has left the browser.
  await dismiss(page);
  return write;
}

test.describe('ข้อมูลภาควิชา (Departments.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await departments.openDepartments(page);
  });

  /**
   * The net. What it asserts is the mechanism that makes the three withdrawn
   * claims unreachable, not that they were not met: a row that says only *I saw
   * nothing* passes on a screen that draws nothing (#203).
   *
   * The situation is the first withdrawn row's up to the point where it needed
   * the pager - a last page of two rows and a removal held at the route - and
   * what is read there is the pager, dead both ways, and then the one read a
   * person can still start, which asks for page one. Those two readings are
   * what say the count the handler trusts can no longer be made stale by
   * anybody on this screen.
   */
  test('nothing a person can press re-reads the page a removal was sent from', async ({ page }) => {
    const table = departments.listTable(page);
    await departments.threePagesEndingIn(page, { rows: 2, prefix: 'Y2', note: 'Row 207' });
    const pages = await toLastPage(page, table, departments.waitForList);
    expect(pages, 'a page that is not page one, which the count claims needed').toBeGreaterThan(1);
    const last = await keysOn(table);
    expect(last, 'two rows on the last page, which is what made the handler count two').toHaveLength(
      2,
    );

    // The premise (#171): the last page is not page one, so `ก่อนหน้า` is live
    // with nothing out and the read below is able to fail. Its twin `ถัดไป` is
    // not read at all here, for the mirror of the reason `210a` does not read
    // `ก่อนหน้า`: on the last page #57's end rule closes it whatever the flag
    // says (#50, #214). The two files hold one half each, on the page that can
    // put that half at risk.
    await expect(
      previous(page),
      'the premise: the last page, so the end rule is quiet on ก่อนหน้า',
    ).toBeEnabled();

    const write = await askToRemove(page, last[0]);

    // The control the three rows used, read with the question already put away.
    await expect(previous(page), 'ก่อนหน้า while the removal is out').toBeDisabled();

    // And the one read that survives, which is a move: `onImported` asks for
    // page one, so the handler takes #206's branch and the count is never
    // reached. `206a` row 1 is the row that claims what it then does.
    const moved = departments.waitForList(page);
    await departments.importOneRow(page, {
      code: 'Y2ZZ',
      name: 'ภาควิชาทดสอบทางเข้า',
      note: 'Row 207 - the net of 19 ตุลาคม 2569',
    });
    const arrived = await moved;
    expect(pageOf(arrived.request()), 'the page the surviving read asks for').toBe('1');
    await untilDrawn(page, arrived);
    expect((await reading(page, table)).shown, 'the page it leaves them on').toBe(1);

    // Let the removal land, so the file holds nothing open and the schema
    // `hold()` puts back is one the route really wrote. A drain and not a
    // claim: the first draft polled `shown` for 1, which the line above has
    // just read as 1, and a poll returns on its first success - an assertion
    // that cannot fail (#50, #214). The count cannot stand in for it either,
    // because what this row is about is that nothing re-reads the page the
    // removal was sent from, so the list the screen is holding is not expected
    // to move when the answer lands.
    write.open();
    await write.answered;
  });
});

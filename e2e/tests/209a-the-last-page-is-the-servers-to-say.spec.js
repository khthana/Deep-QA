'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { hold } = require('../support/hold');
const { keysOn, reading, toLastPage } = require('../support/pager');
const departments = require('../support/departments-screen');

/**
 * #209 - which page still exists is the server's to say, and a person whose
 * page has gone is taken to the last page that has not.
 *
 * ## The question, and whose it was
 *
 * #207 gave the step back the count of the page the removal was sent from, and
 * #209 is the half it could not close: in the direction where rows *arrive*
 * while the removal is out, no reading on the client answers *how many rows has
 * that page now*. The live ref is of whatever list is drawn and the render's own
 * `data` is of another time, and rearranging two readings does not produce a
 * third. The ticket therefore asked the owner a question rather than proposing a
 * fix (`docs/06` §Out of Scope), and the answer on 19 ตุลาคม 2569 was option
 * ก - *let the server say how many pages there are, and if the page the person
 * is on no longer exists, take them to the last page that does*.
 *
 * So the step back is not a step back any more. `load` reads the page the person
 * is on, reads `total` out of the answer, and hands the page on when the answer
 * says the page it just asked for is past the end. The handlers decide nothing
 * about the page and hand their sentence over, keyed for the read that draws it
 * (#205).
 *
 * ## The way in, measured on 19 ตุลาคม 2569
 *
 * **No race.** A second actor writing this screen's rows before the person
 * confirms is enough: the page the person is standing on is a page of a list
 * somebody else has changed, and the only reading that can be both fresh and of
 * that page is the server's. #199 and #204 are the ways in #207's rows needed,
 * and #210 closed the one of them that mattered here on the same day - this file
 * needs neither. That is why it stands where `207a`'s three rows were withdrawn:
 * what #210 closed was the way in to *those three claims*, not the species.
 *
 * ## Why this screen
 *
 * All seven paged screens carry the shape, and the rule lives in `load` on each
 * of them. `Departments` is the one whose situation is buildable without a
 * second screen - its own import panel makes the pages, and this account may
 * really delete here (`206a` says why `SubjectStudents` has no row). Where the
 * code is shared no mutant can tell the screens apart (#68); what each screen
 * adds is that its own way in arrives there, and no row claims that here.
 *
 * ## Run against the unfixed code first (#203)
 *
 * All three rows were run against `HEAD` - the code as it stood before the
 * owner's answer - before their mutants were written, and all three were red
 * there, each at its own assertion. The numbers are on
 * `docs/acceptance/14-departments.md` §#209.
 *
 * ## Where this file's fixtures now live, 25 ตุลาคม 2569
 *
 * `removeAsSecondActor` and `aFourthPage` were written here and moved to
 * `support/departments-screen.js` by #224, which needs the same situation one
 * press further along: a fixture built inside one test file is one no other file
 * has (#96), and neither holds any claim of this file's (#171). The rows are
 * unchanged, and this file's mutants are anchored in `Departments.js` rather
 * than here - what proves the move is `209a` running green beside `224a`.
 *
 * `mode: 'serial'` and a `hold()`: the rows share the departments this file
 * imports, each row taking its own prefix so no row's import is another's
 * duplicate, and the schema is put back when the file ends (#134).
 */
test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** What the screen says when a removal lands. */
const REMOVED = 'ลบภาควิชาเรียบร้อยแล้ว';

const pageOf = request => new URL(request.url()).searchParams.get('page');

/** The second actor, writing instead: two codes that sort onto the last page. */
async function addAsSecondActor(page, after) {
  for (const code of [`${after}Y`, `${after}Z`]) {
    const answer = await page.request.post(`${BACKEND_URL}${departments.API}`, {
      data: {
        department_id: code,
        department_name_th: 'ภาควิชาทดสอบผู้กระทำคนที่สอง',
        department_name_en: 'Written by the second actor',
      },
    });
    expect(answer.status(), `the second actor's row ${code}`).toBe(201);
  }
}

/**
 * Removes one row through the screen's own confirmation, for real, and answers
 * the first list read that follows.
 *
 * For real because every row here is about what the server says afterwards: a
 * removal answered by the fixture leaves the page exactly as full as it was, and
 * the screen is then right not to move anybody (`206a` carries that reading).
 */
async function remove(page, code) {
  await departments.departmentRow(page, code).getByRole('button', { name: 'ลบ' }).click();
  const [answer] = await Promise.all([
    departments.waitForList(page),
    page.getByRole('button', { name: 'ลบภาควิชา' }).click(),
  ]);
  expect(answer.status()).toBe(200);
  return answer;
}

test.describe('ข้อมูลภาควิชา (Departments.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await departments.openDepartments(page);
  });

  /**
   * The owner's answer, in the situation that made the question necessary: the
   * page the person is standing on stops existing while they are on it.
   *
   * Four pages and nineteen rows left, so the three answers a reader of this
   * code might give are three different numbers - the server's own last page is
   * 2, one page back is 3, and page one is 1. A fixture is built where the
   * implementations disagree (#154, #117), and the first draft of this row left
   * two of the three at 1.
   *
   * Two readings, because they fail differently. The pager's line is polled -
   * a screen that lands somewhere else fails it with the numbers it is showing,
   * where a waiter for a page nobody asks for would die at a timeout instead
   * (#139). The pages the screen *asked for* are collected as they go and read
   * once that has settled, which is what catches a landing that is wrong on the
   * way and right in the end: one page back does not exist either, so the rule
   * this ticket replaced would walk 4, 3, 2 and arrive where the poll expects.
   */
  test('a page that has stopped existing hands the person to the last page that has not', async ({
    page,
  }) => {
    const table = departments.listTable(page);
    await departments.threePagesEndingIn(page, { rows: 2, prefix: 'W9', note: 'Row 209' });
    const total = await departments.aFourthPage(page, { prefix: 'W9', note: 'Row 209' });
    const pages = await toLastPage(page, table, departments.waitForList);
    expect(pages, 'the page the person is standing on').toBeGreaterThan(3);
    const last = await keysOn(table);
    expect(last, 'two rows on the last page').toHaveLength(2);

    // Down to twenty rows, the person's own removal making it nineteen: the
    // last page that exists is then page two, and they are standing on page
    // four or further out.
    await departments.removeAsSecondActor(page, { below: last, count: total - 20 });

    const walk = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname === departments.API && request.method() === 'GET') {
        walk.push(pageOf(request));
      }
    });

    const asked = await remove(page, last[0]);
    expect(pageOf(asked.request()), 'the page the removal re-reads').toBe(String(pages));

    await expect
      .poll(() => reading(page, table), {
        message: 'where the person is left, and what the pager says there',
      })
      .toEqual({ total: 19, shown: 2, pages: 2 });
    // Nine, not ten: nineteen rows make page two the remainder, which is what
    // the pager's own line says above.
    expect(await keysOn(table), 'the rows on the page they were handed').toHaveLength(9);
    expect(walk, 'the pages the screen asked for, in order').toEqual([String(pages), '2']);
  });

  /**
   * The direction the ticket is named for, which is the same question answered
   * the other way: the page filled up again while the removal was out, so
   * nobody is moved. The old code read the count of the list it had drawn - one
   * row - and carried the person off a page that by then held three.
   *
   * The settle point is the pager reading out what this answer carried, which is
   * what makes the rows below a read of this answer's screen and not of the one
   * before it (#132). Polled rather than waited for with `untilDrawn`, because
   * every way of getting this wrong *moves* the person: the drawing this row is
   * about then never happens at all, and a wait for it dies at a timeout, which
   * is what a mutant that stopped the application prints too (#139). The poll
   * fails with the page and the total the screen is showing.
   *
   * The total is read out of the answer rather than counted here: the second
   * actor's two rows and the person's one removal are a sum over whatever the
   * files before this one left (#132).
   */
  test('a page that filled up again while the removal was out moves nobody', async ({ page }) => {
    const table = departments.listTable(page);
    await departments.threePagesEndingIn(page, { rows: 1, prefix: 'W8', note: 'Row 209' });
    const pages = await toLastPage(page, table, departments.waitForList);
    const last = await keysOn(table);
    expect(last, 'one row on the last page, which is what a step back used to need').toHaveLength(
      1,
    );

    await addAsSecondActor(page, last[0]);

    const asked = await remove(page, last[0]);
    expect(pageOf(asked.request()), 'the page the removal re-reads').toBe(String(pages));
    // Read at once, while Chromium still holds the body (`untilDrawn` says why).
    const { total } = await asked.json();

    await expect
      .poll(() => reading(page, table), { message: 'the page they are left on' })
      .toEqual({ total, shown: pages, pages });
    expect(await keysOn(table), 'the rows that arrived while the removal was out').toHaveLength(2);
    await expect(page.getByText(REMOVED), 'the sentence, where they still are').toBeVisible();
  });

  /**
   * The sentence crosses the hand-on.
   *
   * A removal hands its sentence to the read that draws the list, keyed on that
   * read (#205). A read that hands the page on has drawn nothing, so the key it
   * was given is the key of a read nobody will make again - and `load` re-keys
   * it for the read it hands to, and the `finally` that clears a sentence a read
   * has finished with leaves that one alone. Its own row, because the landing
   * above and the sentence are two claims and the mutants that kill them are
   * different ones (#88).
   */
  test('the sentence is said on the page the person was handed', async ({ page }) => {
    const table = departments.listTable(page);
    await departments.threePagesEndingIn(page, { rows: 2, prefix: 'W7', note: 'Row 209' });
    const total = await departments.aFourthPage(page, { prefix: 'W7', note: 'Row 209' });
    const pages = await toLastPage(page, table, departments.waitForList);
    expect(pages, 'the page the person is standing on').toBeGreaterThan(3);
    const last = await keysOn(table);
    expect(last, 'two rows on the last page').toHaveLength(2);

    await departments.removeAsSecondActor(page, { below: last, count: total - 20 });
    await remove(page, last[0]);

    await expect
      .poll(() => reading(page, table), { message: 'the page they were handed' })
      .toEqual({ total: 19, shown: 2, pages: 2 });
    await expect(
      page.getByText(REMOVED),
      'the sentence, on the page the read was handed to',
    ).toBeVisible();
  });
});

'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate } = require('../support/gate');
const { hold } = require('../support/hold');
const { keysOn, next, reading, toLastPage } = require('../support/pager');
const departments = require('../support/departments-screen');

/**
 * #224 - a sentence keyed for one read, and a read of another page that hands
 * the page on. Two directions, and the arithmetic picks which one happens.
 *
 * ## The clause, and the direction nobody had read
 *
 * Since #209 `load` has a third answer - it hands the page on - and three lines
 * decide what becomes of a sentence somebody is waiting to hear:
 *
 *     if (answer.page > lastPage) {
 *       handedOn = true
 *       if (waiting.current && waiting.current.of === key) {
 *         waiting.current = { of: readOf(lastPage), said: waiting.current.said }
 *       }
 *     ...
 *     if (!handedOn) waiting.current = null
 *
 * The re-key is for the read the page was handed to, and only when the waiting
 * sentence is **this** read's. The `finally` leaves a sentence alone when the
 * page was handed on, and clears it - whatever its key - when the read drew. So
 * a sentence belonging to some *other* read is neither re-keyed nor cleared by
 * the hand-on, and #224 asked whether that is a defect: before #209 the
 * `finally` cleared it every time, and this clause is a *refuse only where X*,
 * which is wrong in two directions (#108). `209a` row 3 reads the direction
 * where the keys match; this file reads both, because the measurement found
 * that they are two behaviours and not one (#152).
 *
 * ## What the census found, 25 ตุลาคม 2569
 *
 * Asked by the mechanism and not by the buttons' names (#174, #139): what writes
 * `waiting`, and what can change the page between the write and the read.
 *
 * - **eighteen** sites hand a sentence to a read - `waiting.current = { of:`
 *   counted across `frontend/src/pages/`, minus the seven re-keys inside `load`
 *   itself. Thirteen key it on `readOf(onPage.current, …)`, the page the person
 *   is on when the write lands, and five on the read of page one, where that
 *   write's own subject will be (`Offerings.copyTerm` twice, `Students.reload`
 *   twice, `SubjectStudents.reload`). Sixteen by handler, two of the eighteen
 *   being a branch of another;
 * - the seven screens whose `load` can hand a page on are `Departments`,
 *   `Offerings`, `Programs`, `ProgramSubjects`, `Rubrics`, `Subjects` and
 *   `SubjectStudents` - `Students` writes `waiting` and never hands on;
 * - every one of the eighteen holds `writing` while its read is out, and since
 *   #210 the six administration pagers carry `busy`, so the pager cannot move
 *   the page *while* a sentence is being handed over;
 * - what can move it **after a hand-on** is the pager itself: nothing was drawn,
 *   so `data` still carries the total of the page before, `Pager` computes its
 *   page count from that, and ถัดไป is live and offers a page the list no longer
 *   has. The import panel can also start a read of its own, keeping its own flag
 *   (`Departments.js`'s comment, and `importOneRow` in
 *   `support/departments-screen.js`), but `onImported` reads page one, which is
 *   never past the end, so it draws and the `finally` clears - the same
 *   behaviour row 2 below measures, reached a different way.
 *
 * So the situation needs no race between two people and no second defect: one
 * person, one removal, and a second actor who shrank the list - #209's own way
 * in, one press further along.
 *
 * ## What the two rows measure, and the answer to #224
 *
 * The two rows are the same situation with one number moved, which is what the
 * clause's own condition turns on - whether the page the hand-on lands on is
 * the page the sentence is keyed for:
 *
 * | row | the list after the person's removal | the hand-on lands on | the sentence |
 * |---|---|---|---|
 * | 1 | 19 rows, so the last page is 2 | page 2, the keyed page | **said**, on the page they were handed |
 * | 2 | 10 rows, so the last page is 1 | page 1 | **dropped**, and the person hears nothing |
 *
 * Row 2's drop is not the clause under test doing it: the hand-on leaves the
 * stranded sentence alone, and the read of page one that the hand-on asks for
 * **draws**, so its own `finally` clears it with `handedOn` false. That is also
 * why the ticket's stated harm - *the sentence turns up late, over a list
 * fresher than what it is about* - is **unreachable**: every hand-on is followed
 * by a drawing read of the page it handed to, and that read clears whatever it
 * did not say. A later read of the keyed page cannot come first.
 *
 * So the answer to #224 is neither of its two options, and not *the clause is
 * right* either: the system holds **two behaviours** and an invisible number
 * picks, which is #199's species. Option 1 - clear a sentence whose key does not
 * match - makes row 1 behave like row 2 and takes the sentence away from the
 * person who did the act, which is the loss #152 and #205 were filed about.
 * Option 2 - re-key every sentence - makes row 2 behave like row 1 and says a
 * removal's sentence over a page the removal was not about. Which single
 * behaviour the person should get is the owner's question, and both options are
 * now held: `mutation/224-the-stranded-sentence-and-a-hand-on.py` carries each
 * one made to run (#48), one per row.
 *
 * Run against the clause as it stands and against both mutants, 25 ตุลาคม 2569;
 * the numbers are on `docs/acceptance/14-departments.md` §#224.
 *
 * `mode: 'serial'` and a `hold()`: the rows import departments and remove
 * others, each row taking its own prefix so no row's import is another's
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

/** The pages the screen asks for, collected as they go (`209a`'s reading). */
function pagesAsked(page) {
  const walk = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === departments.API && request.method() === 'GET') {
      walk.push(pageOf(request));
    }
  });
  return walk;
}

/**
 * Builds the situation both rows start from and leaves the sentence waiting.
 *
 * Four pages, two rows on the last of them, the list cut to twenty by a second
 * actor, and then the person's own removal: nineteen rows, so the page they are
 * standing on has stopped existing and `load` hands it on. The read the hand-on
 * asks for is held at the route, so the sentence is still unsaid when it
 * answers - keyed, by the re-key, for page two.
 *
 * Answers the gate, the page count the person was standing on, and the two codes
 * that were on that page.
 */
async function aSentenceWaitingForPageTwo(page, prefix) {
  const table = departments.listTable(page);
  await departments.threePagesEndingIn(page, { rows: 2, prefix, note: 'Row 224' });
  const total = await departments.aFourthPage(page, { prefix, note: 'Row 224' });
  const pages = await toLastPage(page, table, departments.waitForList);
  expect(pages, 'the page the person is standing on').toBeGreaterThan(3);
  const last = await keysOn(table);
  expect(last, 'two rows on the last page').toHaveLength(2);

  // Down to twenty rows, the person's own removal making it nineteen.
  await departments.removeAsSecondActor(page, { below: last, count: total - 20 });

  // The read the hand-on asks for, held: the first list read of page two. The
  // reads that follow are later requests and go through, the gate holding one
  // request and only the first (`support/gate.js`).
  const handed = await gate(
    page,
    /^\/api\/departments$/,
    request => request.method() === 'GET' && pageOf(request) === '2',
  );

  await departments.departmentRow(page, last[0]).getByRole('button', { name: 'ลบ' }).click();
  const [removed] = await Promise.all([
    departments.waitForList(page),
    page.getByRole('button', { name: 'ลบภาควิชา' }).click(),
  ]);
  expect(removed.status(), 'the removal re-reading the page it was sent from').toBe(200);
  expect(pageOf(removed.request()), 'the page the removal re-reads').toBe(String(pages));
  await handed.sent;
  return { handed, pages, last };
}

/**
 * ถัดไป, pressed while the held read is still out.
 *
 * Read once with `isDisabled()` rather than waited for: a retrying enable-wait
 * in front of a press that has to land inside a held window moves the press
 * instead of failing the row, and both of these rows are built on that window
 * (#225, #209). The precondition is asserted rather than assumed because it is
 * what makes this a press and not a race - the pager is live only because the
 * hand-on drew nothing and is still counting pages from the total of the page
 * before.
 */
async function pressNextInsideTheWindow(page) {
  expect(await next(page).isDisabled(), 'ถัดไป, live because the hand-on drew nothing').toBe(false);
  await next(page).click();
}

test.describe('ข้อมูลภาควิชา (Departments.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await departments.openDepartments(page);
  });

  /**
   * The direction where the keys coincide: the sentence survives a hand-on of a
   * page it is not about, and is said where it belongs.
   *
   * | # | what happens | the sentence |
   * |---|---|---|
   * | 1 | the removal re-reads page four, which has stopped existing | keyed for page four, then re-keyed for page two |
   * | 2 | the read of page two is held at the route | pending |
   * | 3 | ถัดไป, live because nothing was drawn, asks for page three | pending, and page three is not its page |
   * | 4 | page three has stopped existing too, so that read hands on to page two | **neither re-keyed nor cleared** - the clause under test |
   * | 5 | the read of page two draws nine rows | said |
   *
   * The gate is what makes step 3 a press and not a race: a `setTimeout` would
   * be deciding the order by a timer (#142).
   */
  test('a sentence keyed for another read survives a hand-on and is said where it belongs', async ({
    page,
  }) => {
    const table = departments.listTable(page);
    const { handed, pages } = await aSentenceWaitingForPageTwo(page, 'V4');
    const walk = pagesAsked(page);

    await pressNextInsideTheWindow(page);

    // Let the superseded answer land. It is of a read the screen moved off
    // before it arrived, so it says nothing and takes nothing away (#205).
    handed.open();
    await handed.answered;

    await expect
      .poll(() => reading(page, table), { message: 'where the person is left' })
      .toEqual({ total: 19, shown: 2, pages: 2 });
    expect(await keysOn(table), 'the rows on the page they were handed').toHaveLength(9);
    await expect(
      page.getByText(REMOVED),
      'the sentence, kept across a hand-on of a page it was not keyed for',
    ).toBeVisible();
    expect(walk, 'the pages the screen asked for, after the press').toEqual(['3', '2']);
    expect(pages, 'the page the removal was sent from, for the row above').toBeGreaterThan(3);
  });

  /**
   * The direction where they do not: the hand-on lands somewhere else, and the
   * sentence is dropped without anybody hearing it.
   *
   * The one number that differs from row 1 is the length of the list when the
   * press lands - ten rows rather than nineteen, so the last page that exists is
   * page one and not page two, which is the page the sentence is keyed for. The
   * second actor's second removal is what moves it, and it lands while the read
   * of page two is held, so the person cannot see it happen.
   *
   * | # | what happens | the sentence |
   * |---|---|---|
   * | 1-2 | as row 1: keyed for page two, that read held | pending |
   * | 3 | the second actor cuts the list to ten rows | pending |
   * | 4 | ถัดไป asks for page three | pending |
   * | 5 | the last page is now 1, so that read hands on to page **one** | key 2, read 3: **not re-keyed** |
   * | 6 | the read of page one draws ten rows | **cleared by that read's `finally`** |
   *
   * Which is why nothing can say it late: the drawing read that every hand-on
   * asks for clears what it did not say, so no later read of page two can find
   * it. The row therefore asserts the absence at the landing, read once at the
   * settle point the poll gives it rather than retried - what removes the notice
   * here is the code under test and nothing else (#50, #214).
   */
  test('a sentence keyed for a page the hand-on does not land on is dropped, and nobody hears it', async ({
    page,
  }) => {
    const table = departments.listTable(page);
    const { handed, last } = await aSentenceWaitingForPageTwo(page, 'V5');
    const walk = pagesAsked(page);

    // Nineteen rows down to ten, while the read of page two is held: the last
    // page that exists is now page one, which is not the page the sentence was
    // keyed for.
    await departments.removeAsSecondActor(page, { below: last, count: 9 });

    await pressNextInsideTheWindow(page);

    handed.open();
    await handed.answered;

    await expect
      .poll(() => reading(page, table), { message: 'where the person is left' })
      .toEqual({ total: 10, shown: 1, pages: 1 });
    expect(await keysOn(table), 'the rows on the only page there is').toHaveLength(10);
    expect(
      await page.getByText(REMOVED).count(),
      'the sentence, dropped by the drawing read that the hand-on asked for',
    ).toBe(0);
    expect(walk, 'the pages the screen asked for, after the press').toEqual(['3', '1']);
  });
});

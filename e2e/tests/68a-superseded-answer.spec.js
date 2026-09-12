'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  STUDENT_DATA,
  openRegister,
  listTable,
} = require('../support/students-screen');
const { pagerLine, previous, next, keysOn, reading } = require('../support/pager');

/**
 * #68 — a paged list draws the answer to the request it is still on.
 *
 * Every server-paged panel on this system read its answer the same way:
 * `setData(await listSomething(…))`, with nothing tying that answer to the
 * request that caused it. Two lists in flight at once — *ถัดไป* pressed twice,
 * a filter moved before the first list came back, one slow connection — and
 * the answer that **arrives** last won rather than the one **asked for** last.
 * The table then draws a page the pager is no longer on, and the superseded
 * answer's `setLoading(false)` reports the request that is still out as
 * finished.
 *
 * Fifteen panels carry the fix — twelve that read a list (`Users`,
 * `Departments`, `Programs`, `Subjects`, `ProgramSubjects`, `Rubrics`,
 * `Offerings`, `SubjectStudents`, `UserHistory`, `users/HistoryPanel`,
 * `groups/GroupHistory` and the register these rows are written against) and
 * three reports driven by `CohortPickers` (`ProgramLevelByIntake`,
 * `ProgramLevelIndividual`, `ProgramLevelAllStudents`). The ticket's body named
 * seven; the rest came from asking what its grep could not have found, and from
 * its own comment, which had already measured the three reports. The register is
 * where the proof is because it is the one screen no mutation sheet holds, so
 * the mutants of `mutation/68-superseded-answer.py` can be swept without
 * colliding with another sheet's — and because the seed puts 173 students on it,
 * so a second page exists without this file writing one.
 *
 * The other fourteen are changed by the same rule and are proved by the pattern
 * rather than by a row of their own. That is written on
 * `docs/acceptance/57-pager.md`, and on the three report sheets, rather than
 * left to be assumed.
 *
 * **All three rows build the race themselves.** The superseded answer is held
 * back with `page.route` and the one that supersedes it is not, so which answer
 * arrives second is a fact about this file rather than about the machine it
 * runs on, and each row reads the screen once, at the moment the held answer
 * lands. One row per clause the guard has: the rows it draws, the flag it
 * clears, and the refusal it reports.
 */

const LIST = '/api/students';
const SEEDED_PROGRAM = '0501';

const anyList = url => url.pathname === LIST;
/** `page` is always sent, so page one is `page=1` and not a missing parameter. */
const onPage = (url, number) =>
  anyList(url) && url.searchParams.get('page') === String(number);

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
});

test('the list of a page the pager has already left does not land on top of the one it is on', async ({
  page,
}) => {
  await openRegister(page);
  const table = listTable(page);

  // The shape this row needs, asserted rather than assumed: a register with a
  // second page to ask for. The seed's 173 students give eighteen, and the
  // import specs before this one can only add.
  const { pages } = await reading(page, table);
  expect(pages).toBeGreaterThan(1);
  const firstPage = await keysOn(table);

  // Long enough for page one's unheld answer to be back before page two's is
  // let go. If it ever were not, this row fails rather than passes: the table
  // draws the placeholder and nothing else while it waits, so `keysOn` would
  // read an empty list where page one's codes are expected.
  const HELD_MS = 2_000;

  try {
    await page.route(anyList, async (route, request) => {
      if (onPage(new URL(request.url()), 2)) {
        await new Promise(resolve => setTimeout(resolve, HELD_MS));
      }
      await route.continue();
    });

    const secondArrived = page.waitForResponse(answer =>
      onPage(new URL(answer.url()), 2),
    );
    // Forward and straight back, without waiting in between: *ก่อนหน้า* is
    // enabled against the page that was **asked for**, so the press lands while
    // page two is still out. Page one's list is not held and comes back first;
    // page two's is the superseded answer and arrives on a screen that has
    // moved on.
    await next(page).click();
    await previous(page).click();

    await secondArrived;
    // The margin is for the render that answer would cause, and decides
    // nothing: with the guard gone this row fails on both halves of the
    // assertion below, and `staleanswerwins` is what says the margin is enough.
    await page.waitForTimeout(250);

    // Both halves in one assertion, deliberately. `shown` is the page the
    // server confirmed, so a superseded answer moves the label as well as the
    // rows — the pager would read "หน้า 2" over the rows of page one — and two
    // `expect`s would leave the second one unreached on the run that proves the
    // first, which is a claim nothing has measured.
    expect({
      keys: await keysOn(table),
      line: await pagerLine(page).innerText(),
    }).toEqual({
      keys: firstPage,
      line: expect.stringContaining('หน้า 1 จาก'),
    });
  } finally {
    await page.unroute(anyList);
  }
});

test('a list the filter has left behind does not say the one being waited for has arrived', async ({
  page,
}) => {
  // The other half of the same guard, one state along. The register draws
  // *กำลังโหลด…* and nothing else while it waits, so a superseded answer that
  // clears that flag puts the screen into a state no request is behind: under
  // `staleclearsloading` the register says *ยังไม่มีนักศึกษาในหลักสูตรนี้* —
  // a sentence about an empty หลักสูตร that holds 173 students — while their
  // list is still on its way.
  //
  // The opening list is superseded before it ever answers, which is why this
  // row moves the filter without waiting for it.
  const HELD_OPENING_MS = 2_000;
  const HELD_ASKED_MS = 4_000;
  const asked = url =>
    anyList(url) && url.searchParams.get('program_id') === SEEDED_PROGRAM;
  const opening = url => anyList(url) && !url.searchParams.get('program_id');

  try {
    await page.route(anyList, async (route, request) => {
      const url = new URL(request.url());
      await new Promise(resolve =>
        setTimeout(resolve, asked(url) ? HELD_ASKED_MS : HELD_OPENING_MS),
      );
      await route.continue();
    });

    const openingArrived = page.waitForResponse(answer =>
      opening(new URL(answer.url())),
    );
    const askedArrived = page.waitForResponse(answer =>
      asked(new URL(answer.url())),
    );

    await page.goto(STUDENT_DATA);
    const table = listTable(page);
    const filter = page.getByLabel('หลักสูตร');
    // The filter's options come from `/api/students/programs`, which is not
    // held: the หลักสูตร can be chosen while the list it is filtering is out.
    await expect(filter.locator(`option[value="${SEEDED_PROGRAM}"]`)).toHaveCount(1);
    await filter.selectOption(SEEDED_PROGRAM);

    await openingArrived;
    // Read once, at the settle point this row is about: the superseded answer
    // has landed and the list the register is waiting for has not. Both halves
    // in one assertion, because `staleclearsloading` breaks both and two
    // `expect`s would leave the second unreached on the run that proves it.
    expect({
      waiting: await table.getByText('กำลังโหลด…').count(),
      empty: await table.getByText('ยังไม่มีนักศึกษาในหลักสูตรนี้').count(),
    }).toEqual({ waiting: 1, empty: 0 });

    const listed = (await (await askedArrived).json()).students;
    // The หลักสูตร the seed files every student under, so the closing read is
    // a list and not an empty table.
    expect(listed.length).toBeGreaterThan(0);
    expect(await keysOn(table)).toEqual(listed.map(student => student.student_id));
    expect(await table.getByText('กำลังโหลด…').count()).toBe(0);
  } finally {
    await page.unroute(anyList);
  }
});

test('a refusal meant for a page the pager has left does not raise a banner on the page it is on', async ({
  page,
}) => {
  // The third clause of the same guard, and the one a reader is most likely to
  // think does not need it. `report` is `if (!error.expired) setNotice(…)`, so
  // an answer that fails **after** the screen has moved on would put a red
  // banner over a list that arrived perfectly well — the person is told the
  // thing in front of them failed. Nothing on this screen removes that banner
  // except another action.
  //
  // A refusal is the only way to reach this clause with a superseded request,
  // so the row makes one: the page-two list is failed rather than delayed into
  // arriving late.
  await openRegister(page);
  const table = listTable(page);

  const { pages } = await reading(page, table);
  expect(pages).toBeGreaterThan(1);
  const firstPage = await keysOn(table);

  const HELD_MS = 2_000;

  try {
    await page.route(anyList, async (route, request) => {
      if (!onPage(new URL(request.url()), 2)) {
        await route.continue();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, HELD_MS));
      // The shape `api/client.js` reads a refusal out of: `{ message }`, which
      // is what the screen would draw in the banner.
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'เซิร์ฟเวอร์ขัดข้องระหว่างอ่านรายชื่อ' }),
      });
    });

    const refusalArrived = page.waitForResponse(answer =>
      onPage(new URL(answer.url()), 2),
    );
    await next(page).click();
    await previous(page).click();

    await refusalArrived;
    // The same margin as the first row, for the render the refusal would cause,
    // and deciding nothing: `staleerrorwins` is what says it is enough.
    await page.waitForTimeout(250);

    // One assertion again: no banner, and the list the screen is on is still
    // the list it is drawing — a refusal that is ignored has to be ignored
    // whole, and the second half must be read on the run that breaks the first.
    expect({
      banners: await page.getByRole('alert').count(),
      keys: await keysOn(table),
    }).toEqual({ banners: 0, keys: firstPage });
  } finally {
    await page.unroute(anyList);
  }
});

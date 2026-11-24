'use strict';

const { test, expect } = require('@playwright/test');
const { BACKEND_URL } = require('../support/env');
const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { openUsers, search, setStatusByHand } = require('../support/users-screen');
const {
  ACTIONS,
  API,
  openHistory,
  searchHistory,
  waitForHistory,
  entries,
  entryCell,
  pagerLine,
} = require('../support/history-panel');

/**
 * docs/acceptance/13-user-activity-history.md - the audit log, read through
 * the screen that draws it.
 *
 * The backend suite already proves what the routes answer. What only a browser
 * can show is the half this ticket is actually about: that a line is filed
 * under whoever *acted* rather than under whoever was acted upon, that the
 * account it touched is named, and that the timestamp is Bangkok time on a
 * machine whose clock is not - which is the one row a hand-walk can barely do
 * at all, because it asks the walker to change the operating system's timezone
 * and change it back.
 *
 * Since #305 (24 November 2569) the screen is one table of every account's
 * lines with a search box over it, where until then a picker chose one
 * account's history. The rows keep their numbers and their claims; what they
 * arrive through is the box, which narrows the table to an account by its id -
 * the lines it wrote and the lines written about it - where they used to pick
 * the person. Row 6 was about the picker swapping the person and is now about
 * the box changing the term, which is the same claim one control along: a new
 * filter starts on page one and never asks for the page the last one was on.
 *
 * `mode: 'serial'` because these rows write into the log they then read, and
 * because several are about what the newest lines are. Each still makes the
 * state it asserts on rather than inheriting it from the row above.
 */
test.describe.configure({ mode: 'serial' });

/**
 * This file signs accounts in and out to make history to read, which writes to the
 * rows behind them - put back when the file ends (#137).
 *
 * `support/hold.js` says what it puts back, and what it does not.
 */
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

const STATUS_CHANGE = ACTIONS.SET_USER_STATUS;
const SIGNED_IN = ACTIONS.LOGIN;
const SIGNED_OUT = ACTIONS.LOGOUT;

/** The lines of the drawn table one account wrote, whatever rows they landed on. */
const linesBy = (page, userId) =>
  entries(page).filter({ has: page.getByRole('cell', { name: userId, exact: true }) });

/**
 * Signs an account in and out again through the API, to give it more log lines
 * than a page holds.
 *
 * Through the API rather than a browser because the rows this serves are about
 * paging and filing, not about signing in, and a dozen real sign-ins would cost
 * a minute to prove something the row does not ask about. The lines written are
 * the same lines: it is the same two routes the sign-in screen posts to.
 */
async function churn(request, email, times) {
  for (let index = 0; index < times; index += 1) {
    const inn = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email, password: PASSWORD },
    });
    expect(inn.status()).toBe(200);
    const out = await request.post(`${BACKEND_URL}/api/auth/logout`);
    expect(out.status()).toBe(200);
  }
}

test('rows 1, 2 and 4: the status change is filed under whoever pressed the button', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.teacherOne);

  // Suspended and let back in, so the account is left as the seed had it and
  // the row below can still sign in as it. Two presses each way since #86 -
  // the button asks and ยืนยันการเปลี่ยน answers - which is why this goes
  // through `setStatusByHand` rather than pressing the row's button itself;
  // what this row is about is the lines the two changes leave behind.
  await setStatusByHand(page, ACCOUNTS.teacherOne, IDS.teacherOne, 'ระงับ');
  await expect(page.getByText('ระงับการใช้งานบัญชีเรียบร้อยแล้ว')).toBeVisible();
  await setStatusByHand(page, ACCOUNTS.teacherOne, IDS.teacherOne, 'เปิดใช้งาน');
  await expect(page.getByText('เปิดใช้งานบัญชีเรียบร้อยแล้ว')).toBeVisible();

  await openHistory(page);
  // The table narrowed to the suspended account: its own lines, and the lines
  // somebody wrote about it, which are the two this row has just made.
  await searchHistory(page, IDS.teacherOne);

  // Criterion 1: the newest line is the thing just done, which is what "newest
  // first" means when the reader is looking for what happened a moment ago -
  // and it is filed under the administrator who pressed the button, not under
  // the account the button was pressed on.
  await expect(entryCell(page, 0, 'กิจกรรม')).toHaveText(STATUS_CHANGE);
  await expect(entryCell(page, 0, 'รหัสผู้ใช้งาน')).toHaveText(IDS.systemAdmin);

  // Criterion 2: and it says which record it was about. The id is printed raw
  // and the kind is translated, so the cell names the account rather than
  // leaving the reader to guess which of the ten it was.
  await expect(entryCell(page, 0, 'ทำกับข้อมูล')).toHaveText(
    `บัญชีผู้ใช้ ${IDS.teacherOne}`,
  );

  // Criterion 4: an activity whose only object is the actor's own account
  // leaves the column blank rather than repeating the actor's id, which would
  // read as though somebody had signed in *to* somebody else's account.
  // `admin@` signed in at the top of this row, so its line is certainly here.
  await searchHistory(page, IDS.systemAdmin);
  const signedIn = entries(page).filter({
    has: page.getByRole('cell', { name: SIGNED_IN, exact: true }),
  });
  await expect(signedIn.first().getByRole('cell').nth(5)).toHaveText('—');
});

test('row 3: nothing about the suspension is filed under the suspended account', async ({
  page,
  request,
}) => {
  // A line of its own first, so the assertion below is about *which* lines are
  // here rather than about an account that happens to have written none - no
  // lines at all would satisfy "no status line" without a single rule being
  // enforced.
  await churn(request, ACCOUNTS.teacherOne, 1);

  await signIn(page, ACCOUNTS.systemAdmin);
  await openHistory(page);
  await searchHistory(page, IDS.teacherOne);

  const own = linesBy(page, IDS.teacherOne);
  await expect(own.filter({ hasText: SIGNED_IN }).first()).toBeVisible();

  // The point of the criterion. The suspension was done *to* this account, and
  // a log written from the subject's side would file it here. It is the
  // administrator's line instead, and page one is where it would be if it were
  // misfiled - it is newer than the sign-in above.
  await expect(own.filter({ hasText: STATUS_CHANGE })).toHaveCount(0);
});

test('row 7: a sign-in and a sign-out of their own both land in the history', async ({
  page,
  browser,
}) => {
  // Their own browser, driving the real sign-in screen and the real sign-out
  // button - the two lines this row is about are written by those two routes
  // and by nothing else.
  const theirs = await browser.newContext();
  const other = await theirs.newPage();
  await signIn(other, ACCOUNTS.teacherTwo);
  const [out] = await Promise.all([
    other.waitForResponse(
      answer => new URL(answer.url()).pathname === '/api/auth/logout',
    ),
    other.getByRole('button', { name: 'ออกจากระบบ' }).click(),
  ]);
  expect(out.status()).toBe(200);
  await theirs.close();

  await signIn(page, ACCOUNTS.systemAdmin);
  await openHistory(page);
  await searchHistory(page, IDS.teacherTwo);

  // Both, and in this order: signing out is the newer of the two. A log that
  // recorded only the sign-in - which is the easy half to remember - would
  // leave an audit that can say when somebody arrived and never when they
  // left.
  await expect(entryCell(page, 0, 'กิจกรรม')).toHaveText(SIGNED_OUT);
  await expect(entryCell(page, 0, 'รหัสผู้ใช้งาน')).toHaveText(IDS.teacherTwo);
  await expect(entryCell(page, 1, 'กิจกรรม')).toHaveText(SIGNED_IN);
  await expect(entryCell(page, 1, 'รหัสผู้ใช้งาน')).toHaveText(IDS.teacherTwo);
});

test('row 6: a new search term starts on page one, and never asks for the page the last one was on', async ({
  page,
  request,
}) => {
  // More lines than a page holds, so there is a page two to be left behind.
  await churn(request, ACCOUNTS.teacherOne, 6);

  await signIn(page, ACCOUNTS.systemAdmin);
  await openHistory(page);
  await searchHistory(page, IDS.teacherOne);

  const [second] = await Promise.all([
    waitForHistory(page, { q: IDS.teacherOne, pageNumber: 2 }),
    page.getByRole('button', { name: 'ถัดไป' }).click(),
  ]);
  expect(second.status()).toBe(200);
  await expect(pagerLine(page)).toContainText('หน้า 2');

  // The new term. Every read of it is collected, because the assertion below
  // is about how many there are as much as about what they asked for.
  const asked = [];
  page.on('response', answer => {
    const url = new URL(answer.url());
    if (url.pathname === API && url.searchParams.get('q') === IDS.teacherTwo) asked.push(answer);
  });
  const swapped = await searchHistory(page, IDS.teacherTwo);

  // Settled on the first page rather than on the second. Page two of the last
  // term's lines is not page two of this one's, and on a shorter list it is
  // nothing at all - which draws an empty table and reads as "this person did
  // nothing".
  await expect(pagerLine(page)).toContainText('หน้า 1');

  // And page two of the new term was never asked for on the way here. A screen
  // that carried the page number across and corrected itself afterwards would
  // settle on page one too, so the settled state alone cannot tell the two
  // apart - the wasted read is the only thing that can. (The development
  // server runs React's strict mode, so there is more than one read of page
  // one; what matters is that none of them is of page two.)
  expect(asked.length).toBeGreaterThan(0);
  for (const answer of asked) {
    expect(new URL(answer.url()).searchParams.get('page')).toBe('1');
  }

  // And what is drawn is this term's lines rather than the last one's.
  // Counted against the answer the server just gave, so a table left unchanged
  // behind a request that did happen would fail here.
  const body = await swapped.json();
  expect(body.entries.length).toBeGreaterThan(0);
  await expect(entries(page)).toHaveCount(body.entries.length);
  await expect(entryCell(page, 0, 'รหัสผู้ใช้งาน')).toHaveText(body.entries[0].user_id);
});

test('rows 8 and 9: the date and time are Bangkok\'s on a machine whose clock is not', async ({
  browser,
}) => {
  // The whole row, and the reason it is worth a spec at all: a hand-walk of it
  // means changing the operating system's timezone and changing it back, which
  // is why it has sat unwalked. Here the browser is simply told it is
  // somewhere else.
  const abroad = await browser.newContext({ timezoneId: 'UTC' });
  const page = await abroad.newPage();

  await signIn(page, ACCOUNTS.systemAdmin);
  await openHistory(page);
  const answer = await searchHistory(page, IDS.systemAdmin);

  const [newest] = (await answer.json()).entries;
  expect(newest).toBeTruthy();

  // What the two columns should read, and what the time would read if the
  // screen had let the machine decide. The second is computed in this same
  // browser, so it is the clock the screen was actually running against -
  // seven hours behind, so the two hours can never coincide. The day can, for
  // seventeen hours of every day, which is why the time is the half that tells.
  const [day, time, local] = await page.evaluate(instant => {
    const zone = { timeZone: 'Asia/Bangkok' };
    const clock = { hour: '2-digit', minute: '2-digit' };
    return [
      new Date(instant).toLocaleDateString('th-TH', {
        ...zone,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      `เวลา ${new Date(instant).toLocaleTimeString('th-TH', { ...zone, ...clock })} น.`,
      `เวลา ${new Date(instant).toLocaleTimeString('th-TH', clock)} น.`,
    ];
  }, newest.time_stamp);
  expect(time).not.toBe(local);

  await expect(entryCell(page, 0, 'เวลา')).toHaveText(time);
  await expect(entryCell(page, 0, 'วันที่')).toHaveText(day);

  await abroad.close();
});

test('row 12: a department administrator does not see the lines of an account outside the department', async ({
  page,
  request,
}) => {
  // Both accounts have a line to find, so what the search below does not show
  // is withheld rather than absent.
  await churn(request, ACCOUNTS.departmentAdmin01, 1);
  await churn(request, ACCOUNTS.teacherOne, 1);

  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openHistory(page);

  // The neighbouring department's administrator. Narrowed out by the server in
  // the same read that counts the lines (ADR-0002), so there is no page on
  // which it could appear - searched by the address, which matches the actor
  // alone.
  const refused = await searchHistory(page, ACCOUNTS.departmentAdmin01);
  expect((await refused.json()).total).toBe(0);
  await expect(page.getByText('ไม่พบข้อมูลประวัติการใช้งาน', { exact: true })).toBeVisible();

  // The control the assertion above needs. A table that showed nobody at all -
  // a search that matched nothing, a read that failed quietly - would satisfy
  // it without a single rule being enforced.
  await searchHistory(page, ACCOUNTS.teacherOne);
  await expect(linesBy(page, IDS.teacherOne).first()).toBeVisible();
});

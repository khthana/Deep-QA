'use strict';

const { test, expect } = require('@playwright/test');
const { BACKEND_URL } = require('../support/env');
const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUsers, search, userRow } = require('../support/users-screen');
const {
  ACTIONS,
  openHistory,
  pick,
  waitForHistory,
  entries,
  entryCell,
  pagerLine,
  historyPath,
} = require('../support/history-panel');

/**
 * docs/acceptance/13-user-activity-history.md - the audit log, read through
 * the screen that draws it.
 *
 * The backend suite already proves what the route answers. What only a browser
 * can show is the half this ticket is actually about: that a line is filed
 * under whoever *acted* rather than under whoever was acted upon, that the
 * account it touched is named, and that the timestamp is Bangkok time on a
 * machine whose clock is not - which is the one row a hand-walk can barely do
 * at all, because it asks the walker to change the operating system's timezone
 * and change it back.
 *
 * `mode: 'serial'` because these rows write into the log they then read, and
 * because two of them are about what the newest lines are. Each still makes
 * the state it asserts on rather than inheriting it from the row above.
 */
test.describe.configure({ mode: 'serial' });

const STATUS_CHANGE = ACTIONS.SET_USER_STATUS;
const SIGNED_IN = ACTIONS.LOGIN;
const SIGNED_OUT = ACTIONS.LOGOUT;

/** A line of the drawn history, whatever row it landed on. */
const lineFor = (page, activity) =>
  entries(page)
    .filter({ has: page.getByRole('cell', { name: activity, exact: true }) });

/**
 * Signs an account in and out again through the API, to give it more log lines
 * than a page holds.
 *
 * Through the API rather than a browser because the row this serves is about
 * paging, not about signing in, and a dozen real sign-ins would cost a minute
 * to prove something the row does not ask about. The lines written are the
 * same lines: it is the same two routes the sign-in screen posts to.
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
  // the row below can still sign in as it.
  const row = userRow(page, ACCOUNTS.teacherOne);
  await row.getByRole('button', { name: 'ระงับ' }).click();
  await expect(page.getByText('ระงับการใช้งานบัญชีเรียบร้อยแล้ว')).toBeVisible();
  await row.getByRole('button', { name: 'เปิดใช้งาน' }).click();
  await expect(page.getByText('เปิดใช้งานบัญชีเรียบร้อยแล้ว')).toBeVisible();

  await openHistory(page);
  await pick(page, { userId: IDS.systemAdmin, q: ACCOUNTS.systemAdmin });

  // Criterion 1: the newest line is the thing just done, which is what "newest
  // first" means when the reader is looking for what happened a moment ago.
  await expect(entryCell(page, 0, 'กิจกรรม')).toHaveText(STATUS_CHANGE);

  // Criterion 2: and it says which record it was about. The id is printed raw
  // and the kind is translated, so the cell names the account rather than
  // leaving the reader to guess which of the ten it was.
  await expect(entryCell(page, 0, 'ทำกับข้อมูล')).toHaveText(
    `บัญชีผู้ใช้ ${IDS.teacherOne}`,
  );

  // Criterion 4, on this same page: an activity whose only object is the
  // actor's own account leaves the column blank rather than repeating the
  // actor's id, which would read as though somebody had signed in *to*
  // somebody else's account. `admin@` signed in at the top of this row, so the
  // line is certainly here.
  await expect(lineFor(page, SIGNED_IN).first().getByRole('cell').nth(1)).toHaveText('—');
});

test('row 3: nothing about the suspension appears in the suspended account\'s own history', async ({
  page,
  request,
}) => {
  // A line of its own first, so the assertion below is about *which* lines are
  // here rather than about a history that happens to be empty - an empty table
  // would satisfy "no status line" without a single rule being enforced.
  await churn(request, ACCOUNTS.teacherOne, 1);

  await signIn(page, ACCOUNTS.systemAdmin);
  await openHistory(page);
  await pick(page, { userId: IDS.teacherOne, q: ACCOUNTS.teacherOne });

  await expect(lineFor(page, SIGNED_IN).first()).toBeVisible();

  // The point of the criterion. The suspension was done *to* this account, and
  // a log written from the subject's side would put it here. It is in the
  // administrator's history instead, and page one is where it would be if it
  // were misfiled - it would be newer than the sign-in above.
  await expect(lineFor(page, STATUS_CHANGE)).toHaveCount(0);
});

test('row 7: a sign-in and a sign-out of their own both land in the account\'s history', async ({
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
  await pick(page, { userId: IDS.teacherTwo, q: ACCOUNTS.teacherTwo });

  // Both, and in this order: signing out is the newer of the two. A log that
  // recorded only the sign-in - which is the easy half to remember - would
  // leave an audit that can say when somebody arrived and never when they
  // left.
  await expect(entryCell(page, 0, 'กิจกรรม')).toHaveText(SIGNED_OUT);
  await expect(entryCell(page, 1, 'กิจกรรม')).toHaveText(SIGNED_IN);
});

test('row 6: choosing a different person swaps the history and goes back to page one', async ({
  page,
  request,
}) => {
  // More lines than a page holds, so there is a page two to be left behind.
  await churn(request, ACCOUNTS.teacherOne, 6);

  await signIn(page, ACCOUNTS.systemAdmin);
  await openHistory(page);
  await pick(page, { userId: IDS.teacherOne, q: 'teacher' });

  const [second] = await Promise.all([
    waitForHistory(page, IDS.teacherOne, 2),
    page.getByRole('button', { name: 'ถัดไป' }).click(),
  ]);
  expect(new URL(second.url()).searchParams.get('page')).toBe('2');
  await expect(pagerLine(page)).toContainText('หน้า 2');

  // The swap. The same search term still offers both teachers, so what changes
  // here is only which of them is chosen.
  //
  // Every read of the new person's history is collected, because the assertion
  // below is about how many there are as much as about what they asked for.
  const asked = [];
  page.on('response', answer => {
    if (new URL(answer.url()).pathname === historyPath(IDS.teacherTwo)) asked.push(answer);
  });
  const [swapped] = await Promise.all([
    waitForHistory(page, IDS.teacherTwo, 1),
    page.getByRole('combobox').selectOption(IDS.teacherTwo),
  ]);

  // Settled on the first page rather than on the fourth. Page two of the last
  // person's history is not page two of this one's, and on a shorter history it
  // is nothing at all - which draws an empty table and reads as "this person
  // did nothing".
  await expect(pagerLine(page)).toContainText('หน้า 1');

  // And page two of the new person was never asked for on the way here. A panel
  // that carried the page number across the swap and corrected itself in an
  // effect would settle on page one too, so the settled state alone cannot tell
  // the two apart - the wasted read is the only thing that can. (The
  // development server runs React's strict mode, so there is more than one read
  // of page one; what matters is that none of them is of page two.)
  for (const answer of asked) {
    expect(new URL(answer.url()).searchParams.get('page')).toBe('1');
  }
  const body = await swapped.json();

  // And what is drawn is this person's history rather than the last one's.
  // Counted against the answer the server just gave, so a table left unchanged
  // behind a request that did happen would fail here.
  expect(body.entries.length).toBeGreaterThan(0);
  await expect(entries(page)).toHaveCount(body.entries.length);
  await expect(entries(page).first()).toContainText(
    ACTIONS[body.entries[0].activity] ?? body.entries[0].activity,
  );
});

test('rows 8 and 9: the time is Bangkok time on a machine whose clock is not', async ({
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
  const answer = await pick(page, { userId: IDS.systemAdmin, q: ACCOUNTS.systemAdmin });

  const [newest] = (await answer.json()).entries;
  expect(newest).toBeTruthy();

  // What the panel should read, and what it would read if it had let the
  // machine decide. The second is computed in this same browser, so it is the
  // clock the screen was actually running against - seven hours behind, so the
  // two strings can never coincide.
  const [bangkok, local] = await page.evaluate(instant => {
    const style = { dateStyle: 'medium', timeStyle: 'medium' };
    return [
      new Date(instant).toLocaleString('th-TH', { ...style, timeZone: 'Asia/Bangkok' }),
      new Date(instant).toLocaleString('th-TH', style),
    ];
  }, newest.time_stamp);
  expect(bangkok).not.toBe(local);

  await expect(entryCell(page, 0, 'เมื่อ')).toHaveText(bangkok);

  await abroad.close();
});

test('row 12: a department administrator cannot pick a person outside the department', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openHistory(page);

  // The neighbouring department's administrator. Not merely absent from a
  // menu: the picker is filled from `GET /api/users`, which arrives already
  // narrowed by the acting grant, so there is no option to choose.
  await search(page, ACCOUNTS.departmentAdmin01);
  await expect(page.getByText('ไม่พบผู้ใช้งานตามคำค้นนี้')).toBeVisible();
  await expect(
    page.locator(`select option[value="${IDS.departmentAdmin01}"]`),
  ).toHaveCount(0);

  // The control the assertion above needs. A picker that offered nobody at all
  // - a search box that matched nothing, a list that failed quietly - would
  // satisfy it without a single rule being enforced.
  const chosen = await pick(page, { userId: IDS.teacherOne, q: ACCOUNTS.teacherOne });
  expect(chosen.status()).toBe(200);
  await expect(entries(page).first()).toBeVisible();
});

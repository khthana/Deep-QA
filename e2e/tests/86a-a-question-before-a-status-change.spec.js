'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS } = require('../support/accounts');
const { ACCOUNTS: SEEDED } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { BACKEND_URL } = require('../support/env');
const { saidBy } = require('../support/confirm-dialog');
const {
  openUsers,
  search,
  userRow,
  statusPath,
  statusButton,
  startStatusChange,
  confirmStatusChange,
  setStatusByHand,
} = require('../support/users-screen');

/**
 * #86 - a status change asks before it happens, in both directions.
 *
 * The delivered screen asked: a `Switch` in the สถานะ column opened a
 * `StatusConfirmModal` naming the account. The rebuild drew the control as a
 * text button beside แก้ไข and dropped the question, which the walk of
 * 21 สิงหาคม 2569 recorded on sheet `11` as *กดครั้งเดียวไม่มีกล่องยืนยัน* -
 * not a failed row, because the third criterion of #11 never asked for a box,
 * which is why #86 was a question for the specification owner rather than a
 * defect. The answer, on 16 ตุลาคม 2569, was to ask in both directions from the
 * button where it is.
 *
 * ## What each row is about
 *
 * The claims are split so that no row rests on another's (#88): that the press
 * asks and writes **nothing**, that ยกเลิก leaves the account exactly as it
 * was, that ยืนยันการเปลี่ยน suspends and says so, that the reactivating
 * direction asks the same question about the same account, and that answering
 * it restores. The two sentences are this screen's own, unchanged by this
 * ticket; what is new is that neither is reachable without an answer.
 *
 * Every row arranges the status it needs through the route rather than through
 * the screen (#181): the precondition of *asking to suspend* is an account that
 * is live, and arranging it with the control under test would make each row
 * wait on the row before it.
 *
 * ## What the rows cost elsewhere
 *
 * Seventeen presses in six closed tickets' spec files went through this button
 * and now go through the box as well, and two of those files' rows change what
 * they are reachable *through*: with a dialog open the table underneath it is
 * covered by `fixed inset-0`, so a mouse click is eaten and Enter is not
 * (#204). `202a`'s two Users rows join the nine that are already keyboard-only;
 * `208a`'s row keeps its way in - `fill()` focuses the search box rather than
 * clicking it - but it is no longer the row that says that ticket is reachable
 * with a bare mouse. Both are written down on their own files with the date.
 *
 * `hold()`, because this file really suspends an account (#134).
 */

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/**
 * How long the commit of a drawing is given before a negative is read -
 * `146a`'s constant, and it can decide (#52). Nothing below rests on it alone:
 * each negative it stands behind is read beside the stored status, which is the
 * claim the timing cannot make true.
 */
const SETTLE_MS = 250;

const QUESTION = 'ยืนยันการเปลี่ยนสถานะ';

/**
 * The account as the box names it.
 *
 * Read off the seed rather than written out, so that an account renamed there
 * fails this row instead of quietly leaving the screen free to name somebody
 * else. `personName` prefers the Thai name and falls back twice; this account
 * has all three Thai parts, so the join is that rule exactly for this one row
 * (#96).
 */
const TEACHER_TWO = SEEDED.find(account => account.alias === 'U_TEACH2');
const NAMED = `${IDS.teacherTwo} ${TEACHER_TWO.th.join(' ')}`;

const SUSPEND_ASKS =
  `ต้องการระงับการใช้งานบัญชีของ ${NAMED} ใช่หรือไม่ ` +
  'บัญชีที่ถูกระงับจะถูกปฏิเสธทุกคำขอตั้งแต่คำขอถัดไป แม้ผู้ใช้งานจะยังเปิดหน้าจอค้างอยู่';
const RESTORE_ASKS = `ต้องการเปิดใช้งานบัญชีของ ${NAMED} ใช่หรือไม่`;

const SUSPENDED = 'ระงับการใช้งานบัญชีเรียบร้อยแล้ว';
const RESTORED = 'เปิดใช้งานบัญชีเรียบร้อยแล้ว';

const heading = page => page.getByRole('heading', { name: QUESTION, exact: true });

/** What the account's status is, asked of the server rather than of the screen. */
async function stored(page) {
  const answer = await page.request.get(`${BACKEND_URL}/api/users/${IDS.teacherTwo}`);
  expect(answer.status()).toBe(200);
  return (await answer.json()).user.status;
}

/**
 * The faculty administrator on the accounts screen, with the account this file
 * is about in the status the row needs and on the screen.
 *
 * Found through the search box for `202a`'s reason: thirteen seeded accounts
 * and a page of ten mean no particular row is certain to be on page one,
 * and the two teachers are the pair that is never the account signed in -
 * ระงับ is disabled on one's own row, and for good reason (#84).
 */
async function arrive(page, status) {
  await signIn(page, ACCOUNTS.facultyAdmin);
  const arranged = await page.request.put(`${BACKEND_URL}${statusPath(IDS.teacherTwo)}`, {
    data: { status },
  });
  expect(arranged.status(), 'the status this row needs to start from').toBe(200);

  await openUsers(page);
  await search(page, 'teacher');
  await expect(userRow(page, ACCOUNTS.teacherTwo), 'the row the switch is pressed on').toHaveCount(
    1,
  );
  // The verb this row is about to press, read before pressing it - #213.
  //
  // `startStatusChange` finds the control *by* the verb, so a screen showing
  // the wrong one leaves these rows with nothing to click and they die in the
  // locator at the timeout rather than at a claim (#139). Asserted here, the
  // rule the verb follows is a claim in both directions instead of an
  // arrangement: `86:alwaysoffersuspend` fails the rows that arrive suspended
  // and `86:alwaysofferrestore` the rows that arrive live, each on this line.
  await expect(
    statusButton(page, ACCOUNTS.teacherTwo, status === 'active' ? 'ระงับ' : 'เปิดใช้งาน'),
    'the change the row arrives offering',
  ).toBeVisible();
}

/** Every `PUT` to this account's status route, in the order it was sent. */
function writesTo(page) {
  const sent = [];
  page.on('request', request => {
    if (
      request.method() === 'PUT' &&
      new URL(request.url()).pathname === statusPath(IDS.teacherTwo)
    ) {
      sent.push(request.url());
    }
  });
  return sent;
}

test('row 1: the press asks, naming the account and what suspending it does', async ({ page }) => {
  await arrive(page, 'active');
  const writes = writesTo(page);

  await startStatusChange(page, ACCOUNTS.teacherTwo, 'ระงับ');

  await expect(heading(page), "the question's own heading").toBeVisible();
  expect(await saidBy(page), 'what the box asks').toBe(SUSPEND_ASKS);

  // And it has written nothing. The count is a net - it could pass on a slow
  // machine for the wrong reason - so the claim is the line below it: the
  // stored status, read while the question is still on the screen.
  await page.waitForTimeout(SETTLE_MS);
  expect(writes, 'writes made before anybody answered').toEqual([]);
  expect(await stored(page), 'the account the question is about').toBe('active');
  await expect(
    statusButton(page, ACCOUNTS.teacherTwo, 'ระงับ'),
    'the row, still offering the same change',
  ).toBeVisible();
});

test('row 2: ยกเลิก leaves the account as it was', async ({ page }) => {
  await arrive(page, 'active');
  const writes = writesTo(page);

  await startStatusChange(page, ACCOUNTS.teacherTwo, 'ระงับ');
  await expect(heading(page)).toBeVisible();
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();

  await expect(heading(page), 'the question, dismissed').toHaveCount(0);
  await page.waitForTimeout(SETTLE_MS);
  expect(writes, 'writes made by a question that was answered no').toEqual([]);
  expect(await stored(page), 'the account nobody decided anything about').toBe('active');
  expect(
    await page.getByText(SUSPENDED).count(),
    'a sentence about something that did not happen',
  ).toBe(0);
});

test('row 3: answering it suspends the account and says so', async ({ page }) => {
  await arrive(page, 'active');

  const answer = await setStatusByHand(page, ACCOUNTS.teacherTwo, IDS.teacherTwo, 'ระงับ');
  expect(answer.status(), 'the one write the answer sent').toBe(200);

  await expect(page.getByRole('status'), "the switch's sentence").toHaveText(SUSPENDED);
  await expect(heading(page), 'the question, closed by its own answer').toHaveCount(0);
  await expect(
    userRow(page, ACCOUNTS.teacherTwo).getByText('ถูกระงับ'),
    "the row's own status cell",
  ).toBeVisible();
  await expect(
    statusButton(page, ACCOUNTS.teacherTwo, 'เปิดใช้งาน'),
    'the control, now offering the way back',
  ).toBeVisible();
});

test('row 4: the reactivating direction asks the same question about the same account', async ({
  page,
}) => {
  await arrive(page, 'inactive');
  const writes = writesTo(page);

  await startStatusChange(page, ACCOUNTS.teacherTwo, 'เปิดใช้งาน');

  await expect(heading(page), "the question's own heading").toBeVisible();
  // The same account named the same way, and nothing about a session being cut
  // off: reactivation takes nothing away from anybody.
  expect(await saidBy(page), 'what the box asks on the way back').toBe(RESTORE_ASKS);

  await page.waitForTimeout(SETTLE_MS);
  expect(writes, 'writes made before anybody answered').toEqual([]);
  expect(await stored(page), 'the account the question is about').toBe('inactive');
});

test('row 5: answering it opens the account again and says so', async ({ page }) => {
  await arrive(page, 'inactive');

  const answer = await setStatusByHand(page, ACCOUNTS.teacherTwo, IDS.teacherTwo, 'เปิดใช้งาน');
  expect(answer.status(), 'the one write the answer sent').toBe(200);

  await expect(page.getByRole('status'), "the switch's sentence").toHaveText(RESTORED);
  await expect(heading(page), 'the question, closed by its own answer').toHaveCount(0);
  await expect(
    userRow(page, ACCOUNTS.teacherTwo).getByText('ใช้งานอยู่'),
    "the row's own status cell",
  ).toBeVisible();
  await expect(
    statusButton(page, ACCOUNTS.teacherTwo, 'ระงับ'),
    'the control, back to the change it offered before',
  ).toBeVisible();
});

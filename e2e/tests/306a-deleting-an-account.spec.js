'use strict';

const { test, expect } = require('@playwright/test');
const { createPool } = require('../../db/pool');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { E2E_SCHEMA } = require('../support/env');
const { hold } = require('../support/hold');
const { panel, saidBy } = require('../support/confirm-dialog');
const { ACTIONS, openHistory, searchHistory, entryCell } = require('../support/history-panel');
const { openUsers, search, userRow, listTable } = require('../support/users-screen');

/**
 * docs/acceptance/11-user-accounts.md §#306.
 *
 * The trash can the delivered table had, back on every row
 * (`docs/users-screen.md` rule 4 and §การลบบัญชี, the owner's answers of
 * 22 November 2569), asking first and the server deciding. The words - the
 * question, its button, the refusal, the banner, and the reader's own row being
 * disabled as its switch is - are the owner's of 24 November 2569.
 *
 * What makes an account deletable is held at the HTTP seam
 * (`backend/test/account-deletion.test.js`); what is held here is that the
 * screen asks, sends, and says what the server answered.
 *
 * `hold()`, because rows 2 and 5 really delete an account: the two are written
 * below the seam after the hold, so the release takes out whatever is left of
 * them, and the administrator's lines about them stay in `user_log` as #134
 * decided for every file.
 */

let release;
const db = createPool({ schema: E2E_SCHEMA });

/** Two accounts nothing refers to, one per row that deletes. */
const FRESH = [
  { id: '306del_a', email: '306del.a@kmitl.ac.th', first: 'ทดลบ', last: 'หนึ่ง' },
  { id: '306del_b', email: '306del.b@kmitl.ac.th', first: 'ทดลบ', last: 'สอง' },
];
const nameOf = account => `${account.first} ${account.last}`;

test.beforeAll(async () => {
  release = await hold();
  for (const account of FRESH) {
    await db.query(
      `INSERT INTO users (user_id, email, first_name_th, last_name_th, department_id,
                          is_verified, status)
       VALUES ($1, $2, $3, $4, '05', true, 'active')`,
      [account.id, account.email, account.first, account.last],
    );
    await db.query(
      `INSERT INTO user_roles (user_id, role_id, scope_id) VALUES ($1, 'TEACHER', '05')`,
      [account.id],
    );
  }
});
test.afterAll(async () => {
  try {
    await release();
  } finally {
    await db.end();
  }
});

/** The trash can of the row whose address is `email`. */
const trash = (page, email) => userRow(page, email).getByRole('button', { name: /^ลบ / });

/** Whether a DELETE of this account was sent, counted from the page's own requests. */
function deletesOf(page, userId) {
  const sent = [];
  page.on('request', request => {
    if (
      request.method() === 'DELETE' &&
      new URL(request.url()).pathname === `/api/users/${userId}`
    ) {
      sent.push(request);
    }
  });
  return sent;
}

test('row 1: every row has a trash can named for its account, and the reader\'s own is disabled', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  // Another account's: live, and named for whose account it deletes.
  await search(page, ACCOUNTS.teacherOne);
  const other = trash(page, ACCOUNTS.teacherOne);
  await expect(other).toHaveAccessibleName('ลบ ดร. อนันต์ สอนดี');
  await expect(other).toBeEnabled();

  // The reader's own: drawn, and disabled with the server's own sentence -
  // the copy in `Users.js` held to `REFUSALS.selfDelete` here (#84's shape).
  await search(page, ACCOUNTS.systemAdmin);
  const own = trash(page, ACCOUNTS.systemAdmin);
  await expect(own).toBeVisible();
  await expect(own).toBeDisabled();
  await expect(own).toHaveAttribute('title', REFUSALS.selfDelete);
});

test('row 2: the question is asked first, and ลบผู้ใช้งาน deletes the account and says so', async ({
  page,
}) => {
  const [account] = FRESH;
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, account.email);
  const sent = deletesOf(page, account.id);

  await trash(page, account.email).click();
  const box = panel(page);
  await expect(box.getByRole('heading', { name: 'ยืนยันการลบผู้ใช้งาน' })).toBeVisible();
  expect(await saidBy(page)).toBe(
    `ต้องการลบบัญชี ${account.id} ${nameOf(account)} ใช่หรือไม่ หากบัญชีนี้มีข้อมูลอ้างอิงอยู่ ระบบจะไม่ลบ ให้ระงับการใช้งานแทน`,
  );
  // Asking is all the press did.
  expect(sent, 'nothing is sent before the question is answered').toHaveLength(0);

  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname === `/api/users/${account.id}`,
    ),
    box.getByRole('button', { name: 'ลบผู้ใช้งาน', exact: true }).click(),
  ]);
  expect(answer.status()).toBe(204);

  await expect(page.getByText('ลบบัญชีเรียบร้อยแล้ว')).toBeVisible();
  await expect(userRow(page, account.email)).toHaveCount(0);
  await expect(box).toHaveCount(0);
  const { rowCount } = await db.query('SELECT 1 FROM users WHERE user_id = $1', [account.id]);
  expect(rowCount, 'the account is gone from the database').toBe(0);
});

test('row 3: an account something refers to is refused with the way round it, and stays', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  // teach01 teaches a section of the seed (`course_sections_teacher`).
  await search(page, ACCOUNTS.teacherOne);

  await trash(page, ACCOUNTS.teacherOne).click();
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname === `/api/users/${IDS.teacherOne}`,
    ),
    panel(page).getByRole('button', { name: 'ลบผู้ใช้งาน', exact: true }).click(),
  ]);
  expect(answer.status()).toBe(409);

  await expect(page.getByText(REFUSALS.userInUse)).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
  await expect(userRow(page, ACCOUNTS.teacherOne)).toHaveCount(1);
});

test('row 4: ยกเลิก sends nothing and leaves the account where it was', async ({ page }) => {
  const [, account] = FRESH;
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, account.email);
  const sent = deletesOf(page, account.id);

  await trash(page, account.email).click();
  await panel(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(panel(page)).toHaveCount(0);

  await expect(listTable(page)).toBeVisible();
  await expect(userRow(page, account.email)).toHaveCount(1);
  expect(sent, 'ยกเลิก sent no DELETE').toHaveLength(0);
});

test('row 5: the deletion is a line in the history, in this system\'s words', async ({ page }) => {
  const [, account] = FRESH;
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, account.email);

  await trash(page, account.email).click();
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname === `/api/users/${account.id}`,
    ),
    panel(page).getByRole('button', { name: 'ลบผู้ใช้งาน', exact: true }).click(),
  ]);
  expect(answer.status()).toBe(204);

  // The account's id finds what was done to it (#305), and the newest of
  // those is the deletion, by the administrator who pressed it.
  await openHistory(page);
  await searchHistory(page, account.id);
  await expect(entryCell(page, 0, 'รหัสผู้ใช้งาน')).toHaveText(IDS.systemAdmin);
  await expect(entryCell(page, 0, 'กิจกรรม')).toHaveText(ACTIONS.DELETE_USER);
  await expect(entryCell(page, 0, 'ทำกับข้อมูล')).toContainText(account.id);
});

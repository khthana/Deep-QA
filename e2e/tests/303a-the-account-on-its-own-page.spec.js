'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { hold } = require('../support/hold');
const { OUTSIDE_THE_FILTER } = require('../support/outside-the-filter');
const { saidBy } = require('../support/confirm-dialog');
const { PROGRAMS } = require('../../db/seed');
const { reading, step } = require('../support/pager');
const {
  USERS,
  EDIT,
  openUsers,
  search,
  listTable,
  editButton,
  waitForList,
  backToList,
  openAccount,
  openDetails,
  saveDetails,
} = require('../support/users-screen');
const {
  ROLE_NAMES,
  openEditor,
  grantsList,
  grantRow,
  grantCell,
  grantDialog,
  addGrant,
  closeGrantDialog,
  revokeButton,
  revoke,
} = require('../support/grants-panel');

/**
 * docs/acceptance/11-user-accounts.md §#303 - one account's own page.
 *
 * `docs/users-screen.md` rules 6-9, back to the delivered `EditUser.js`: the
 * row's แก้ไข opens a page of its own with the account in the address and the
 * list it came from in its query, two tabs, a view mode the details open in,
 * and the grants as cards with a dialog to add one and a question before one
 * is revoked. The history is not on this page.
 *
 * Serial, because the rows write to one seeded account and read it back; the
 * schema is put back at the end of the file (#134).
 */

test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

const HEADING = 'แก้ไขข้อมูลผู้ใช้งานระบบ';
const BACK = 'แสดงรายชื่อผู้ใช้งานทั้งหมด';
const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';
const NAME = 'ดร. อนันต์ สอนดี';
const SURNAME = page => page.getByLabel('นามสกุล (ไทย)', { exact: true });

test('row 1: แก้ไข opens the account on its own page, named, in the address', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openAccount(page, ACCOUNTS.teacherOne);

  expect(new URL(page.url()).pathname, 'the account is in the address').toBe(
    `${EDIT}${IDS.teacherOne}`,
  );
  await expect(page.getByRole('heading', { name: HEADING, exact: true })).toBeVisible();
  await expect(page.getByText(NAME, { exact: true }), 'and whose it is').toBeVisible();
  await expect(page.getByRole('tab')).toHaveText(['ข้อมูลทั่วไป', 'สิทธิ์ของระบบ']);
  await expect(page.getByRole('tab', { name: 'ข้อมูลทั่วไป' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByRole('table'),
    'no history on this page and no list under it - rule 9',
  ).toHaveCount(0);
});

test('row 2: the address alone draws the page, a reload included', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  const [read] = await Promise.all([
    page.waitForResponse(answer => new URL(answer.url()).pathname === `/api/users/${IDS.teacherOne}`),
    page.goto(`${EDIT}${IDS.teacherOne}`),
  ]);
  expect(read.status()).toBe(200);
  await expect(page.getByLabel('อีเมล', { exact: true })).toHaveValue(ACCOUNTS.teacherOne);

  await page.reload();
  await expect(page.getByLabel('อีเมล', { exact: true }), 'a reload keeps the account').toHaveValue(
    ACCOUNTS.teacherOne,
  );
});

test('row 3: an account the reader does not reach is said, and no form is drawn', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  const refused = await page.request.get(`${BACKEND_URL}/api/users/${IDS.departmentAdmin01}`);
  expect(refused.status(), 'the precondition: the server refuses this reader').toBe(404);

  await page.goto(`${EDIT}${IDS.departmentAdmin01}`);
  await expect(page.getByRole('alert')).toHaveText(REFUSALS.userNotFound);
  await expect(page.getByRole('tab'), 'no tabs').toHaveCount(0);
  await expect(page.getByRole('textbox'), 'and no empty form').toHaveCount(0);
});

test('row 4: an account that does not exist reads the same', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await page.goto(`${EDIT}nobody303`);
  await expect(page.getByRole('alert')).toHaveText(REFUSALS.userNotFound);
  await expect(page.getByRole('textbox')).toHaveCount(0);
});

test('row 5: the bare edit-user address goes back to the list', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await Promise.all([waitForList(page), page.goto('/main/users/edit-user')]);
  expect(new URL(page.url()).pathname).toBe(USERS);
});

test('row 6: the details open in view mode, and แก้ไขข้อมูล opens them', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openAccount(page, ACCOUNTS.teacherOne);

  await expect(SURNAME(page), 'closed until it is asked for').toBeDisabled();
  await expect(saveDetails(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'แก้ไขข้อมูล', exact: true }).click();
  await expect(SURNAME(page)).toBeEnabled();
  await expect(saveDetails(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'ยกเลิก', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'แก้ไขข้อมูล', exact: true })).toHaveCount(0);
  await expect(
    page.getByLabel('รหัสผู้ใช้', { exact: true }),
    'the id is the address, and stays closed',
  ).toBeDisabled();
});

test('row 7: ยกเลิก puts back what was saved and closes the fields', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openDetails(page, ACCOUNTS.teacherOne);

  await SURNAME(page).fill('ไม่บันทึก');
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(SURNAME(page)).toHaveValue('สอนดี');
  await expect(SURNAME(page)).toBeDisabled();
});

test('row 8: บันทึกข้อมูล saves, says so, and goes back to view mode', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openDetails(page, ACCOUNTS.teacherOne);

  await SURNAME(page).fill('สอนดีมาก');
  const [saved] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === `/api/users/${IDS.teacherOne}` &&
        answer.request().method() === 'PUT',
    ),
    saveDetails(page).click(),
  ]);
  expect(saved.status()).toBe(200);
  await expect(page.getByRole('status')).toHaveText(SAVED);
  await expect(SURNAME(page)).toHaveValue('สอนดีมาก');
  await expect(SURNAME(page), 'view mode again').toBeDisabled();
  await expect(page.getByText('ดร. อนันต์ สอนดีมาก', { exact: true }), 'the heading too').toBeVisible();

  await page.reload();
  await expect(SURNAME(page), 'what the database holds').toHaveValue('สอนดีมาก');
});

test('row 9: a save that moves the account out of the list it came from says so', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await search(page, 'สอนดีมาก');
  await openDetails(page, ACCOUNTS.teacherOne, { searched: true });

  await SURNAME(page).fill('สอนดี');
  await saveDetails(page).click();
  await expect(
    page.getByRole('status'),
    "the list's search no longer holds the surname, and the page says so - #247",
  ).toHaveText(`${SAVED} ${OUTSIDE_THE_FILTER}`);
});

test('row 10: a save inside the list it came from says only what it did', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await search(page, 'สอนดี');
  await openDetails(page, ACCOUNTS.teacherOne, { searched: true });

  await page.getByLabel('ชื่อ (ไทย)', { exact: true }).fill('อนันต์');
  await saveDetails(page).click();
  await expect(page.getByRole('status')).toHaveText(SAVED);
});

const STATUS_BOX = 'select:has(option:text-is("ทุกสถานะ"))';

/** A filter and a page both chosen, so the way back has two things to keep. */
async function toPageTwoOfActive(page) {
  await Promise.all([waitForList(page), page.locator(STATUS_BOX).selectOption('active')]);
  const first = await reading(page, listTable(page));
  expect(first.pages, 'the precondition: a page two to leave from').toBeGreaterThan(1);
  await step(page, 'forward', waitForList);
  const at = new URL(page.url()).searchParams;
  expect([at.get('page'), at.get('status')], 'and the list says both in its address').toEqual([
    '2',
    'active',
  ]);
}

test('row 11: the back button returns to the page and filter the account was opened from', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await toPageTwoOfActive(page);
  const before = new URL(page.url());
  const shown = await reading(page, listTable(page));

  const row = page.locator('tbody tr').first();
  await Promise.all([
    page.waitForResponse(answer => /^\/api\/users\/[^/]+$/.test(new URL(answer.url()).pathname)),
    editButton(row).click(),
  ]);
  expect(new URL(page.url()).search, 'the edit page carries the list').toBe(before.search);

  await backToList(page);
  expect(new URL(page.url()).search).toBe(before.search);
  await expect(page.locator(STATUS_BOX)).toHaveValue('active');
  expect(await reading(page, listTable(page)), 'the same page').toEqual(shown);
});

test("row 12: the browser's back lands on the same place", async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await toPageTwoOfActive(page);
  const before = new URL(page.url()).search;

  const row = page.locator('tbody tr').first();
  await editButton(row).click();
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible();

  await Promise.all([waitForList(page), page.goBack()]);
  expect(new URL(page.url()).pathname).toBe(USERS);
  expect(new URL(page.url()).search).toBe(before);
  await expect(page.locator(STATUS_BOX)).toHaveValue('active');
});

test('row 13: a grant is a card - สิทธิ์ and the scope under the word for its kind, and who and when', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  const card = grantRow(page, ROLE_NAMES.TEACHER, '05');
  await expect(card).toHaveCount(1);
  await expect(card.locator('dt')).toHaveText(['สิทธิ์ :', 'ภาควิชา :']);
  await expect(grantCell(page, ROLE_NAMES.TEACHER, '05', 'ผู้กำหนด')).toHaveText('admin01');
  await expect(revokeButton(page, ROLE_NAMES.TEACHER, '05')).toBeEnabled();
});

test('row 14: เพิ่มสิทธิ์ opens a dialog named for the account, and its ยกเลิก adds nothing', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  let posted = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && /\/roles$/.test(request.url())) posted += 1;
  });
  await page.getByRole('button', { name: 'เพิ่มสิทธิ์', exact: true }).click();
  await expect(page.getByRole('dialog', { name: `เพิ่มสิทธิ์ ${NAME}` })).toBeVisible();
  await closeGrantDialog(page);
  expect(posted).toBe(0);
  await expect(grantsList(page).getByRole('listitem')).toHaveCount(1);
});

test('row 15: a grant made in the dialog closes it, is said, and is a new card', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  const answer = await addGrant(page, { role: 'PROG_MANAGER', scope: '0501' });
  expect(answer.status()).toBe(201);
  await expect(grantDialog(page)).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('เพิ่มสิทธิ์เรียบร้อยแล้ว');
  await expect(grantRow(page, ROLE_NAMES.PROG_MANAGER, '0501')).toHaveCount(1);
});

test('row 16: a refused grant is said inside the dialog, which stays open', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  // The pickers offer only what the server allows and a grant made twice is
  // answered 201, so no press here is refused: the refusal is built at the
  // seam, in the shape the server writes one (#155 - asked, not assumed).
  await page.route(/\/api\/users\/[^/]+\/roles$/, route =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ message: REFUSALS.scopeNotYours }),
        })
      : route.continue(),
  );
  const answer = await addGrant(page, { role: 'PROG_MANAGER', scope: '0501' });
  expect(answer.status()).toBe(403);
  await expect(grantDialog(page).getByRole('alert')).toHaveText(REFUSALS.scopeNotYours);
  await expect(grantDialog(page)).toBeVisible();
  await closeGrantDialog(page);
});

test('row 17: the trash can asks first, and its ยกเลิก revokes nothing', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  let deleted = 0;
  page.on('request', request => {
    if (request.method() === 'DELETE') deleted += 1;
  });
  await revokeButton(page, ROLE_NAMES.PROG_MANAGER, '0501').click();
  const question = page.getByRole('dialog', { name: 'ยืนยันการยกเลิกสิทธิ์' });
  await expect(question).toBeVisible();
  // Read whole, the joiners the dialog breaks Thai with taken out (#165).
  expect(await saidBy(page), 'what goes, where, and whose').toBe(
    `ต้องการยกเลิกสิทธิ์${ROLE_NAMES.PROG_MANAGER} หลักสูตร${PROGRAMS.find(p => p.id === '0501').th} ของ ${NAME} ใช่หรือไม่`,
  );
  await question.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(question).toHaveCount(0);
  expect(deleted).toBe(0);
  await expect(grantRow(page, ROLE_NAMES.PROG_MANAGER, '0501')).toHaveCount(1);
});

test('row 18: answering the question revokes the grant and says so', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  expect((await revoke(page, ROLE_NAMES.PROG_MANAGER, '0501')).status()).toBe(200);
  await expect(page.getByRole('status')).toHaveText('ยกเลิกสิทธิ์เรียบร้อยแล้ว');
  await expect(grantRow(page, ROLE_NAMES.PROG_MANAGER, '0501')).toHaveCount(0);
});

test('row 19: the last grant may be revoked - the server has no such rule, so the screen has none', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  await expect(grantsList(page).getByRole('listitem'), 'the precondition: one grant').toHaveCount(1);
  await expect(revokeButton(page, ROLE_NAMES.TEACHER, '05')).toBeEnabled();
  expect((await revoke(page, ROLE_NAMES.TEACHER, '05')).status()).toBe(200);
  await expect(page.getByText('บัญชีนี้ยังไม่ได้รับสิทธิ์ใด', { exact: true })).toBeVisible();
});

test('row 20: your own account - every trash can is dead, and says why', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.departmentAdmin05);

  const own = revokeButton(page, ROLE_NAMES.DEPT_ADMIN, '05');
  await expect(own).toBeDisabled();
  await expect(own).toHaveAttribute('title', REFUSALS.selfRevoke);
  expect(REFUSALS.selfRevoke, 'in the tab\'s word').toBe('ยกเลิกสิทธิ์ของตัวเองไม่ได้');
});

test('row 21: a tab is shown, not drawn - switching does not read the grants again', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherTwo);
  await expect(grantRow(page, ROLE_NAMES.TEACHER, '05')).toHaveCount(1);

  // Counted from here and not from the opening: the development build mounts
  // every effect twice (React's StrictMode), so the opening's own count is a
  // property of the build and not of the page.
  let reads = 0;
  page.on('request', request => {
    if (request.method() === 'GET' && /\/api\/users\/[^/]+\/roles$/.test(request.url())) reads += 1;
  });
  await page.getByRole('tab', { name: 'ข้อมูลทั่วไป' }).click();
  await expect(page.getByLabel('อีเมล', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'สิทธิ์ของระบบ' }).click();
  await expect(grantRow(page, ROLE_NAMES.TEACHER, '05')).toBeVisible();
  expect(reads).toBe(0);
});

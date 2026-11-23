'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isWrite } = require('../support/gate');
const { openUsers, openDetails, saveDetails } = require('../support/users-screen');
const { REFUSALS } = require('../../backend/auth/refusals');
const { openEditor, grantDialog, openGrantDialog } = require('../support/grants-panel');

/**
 * #146's rule on the account's own page - ticket #303.
 *
 * Until #303 an account was edited in a form drawn over the list on
 * `/main/users`, and `146a` held there that a save answered after the person
 * had moved on - ยกเลิก, then a second แก้ไข - closes nothing and says nothing
 * over the form that took its place. The edit has its own page since then
 * (`pages/EditUser.js`), and the list's copy of the rule is now about its add
 * alone, so `146a` presses the add on that screen and these rows hold the
 * same rule where the edit went: *แก้ไขข้อมูล* writes the page's own `showing`
 * ref, *ยกเลิก* does not, and a save whose answer finds a later opening leaves
 * that opening alone.
 *
 * The write is held at the route and **forwarded**, not faked: the page draws
 * its header from the save's answer (`setAccount(user)`, a save's answer being
 * a read - #133), so a made-up body would be a different screen. `hold()` puts
 * the account back. The refusal is faked, because the server has no refusal a
 * save of an unchanged account can be given (#155 - asked, not assumed).
 */

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';
const REFUSED = 'ไม่อนุญาตให้บันทึกรายการนี้ (แถวของ #303)';
const TYPED = 'ข้อความที่พิมพ์ค้างไว้ของแถว #303';
const SETTLE_MS = 250;

const WRITE = new RegExp(`^/api/users/${IDS.teacherOne}$`);
const named = page => page.getByLabel('ชื่อ (ไทย)', { exact: true });
const button = (page, name) => page.getByRole('button', { name, exact: true });

/** Sends the save, holds it at the route, and leaves edit mode by ยกเลิก. */
async function saveAndCancel(page, answer) {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await openDetails(page, ACCOUNTS.teacherOne);

  const write = await gate(page, WRITE, isWrite, answer);
  await saveDetails(page).click();
  await write.sent;

  // ยกเลิก is not disabled by the save - #142's measurement, on this page.
  await button(page, 'ยกเลิก').click();
  await expect(named(page), 'view mode after ยกเลิก').toBeDisabled();
  return write;
}

test('row 1: a save that lands after แก้ไขข้อมูล was pressed again leaves those fields open', async ({
  page,
}) => {
  const write = await saveAndCancel(page, {});

  await button(page, 'แก้ไขข้อมูล').click();
  await expect(named(page)).toBeEnabled();
  await named(page).fill(TYPED);

  write.open();
  await write.answered;
  await page.waitForTimeout(SETTLE_MS);

  await expect(named(page), 'the opening after the save answered').toBeEnabled();
  expect(await named(page).inputValue()).toBe(TYPED);
  expect(await page.getByText(SAVED).count(), "the first save's banner").toBe(0);
});

test('row 2: a save refused after the page moved on says nothing over the new opening', async ({
  page,
}) => {
  const write = await saveAndCancel(page, { refusal: REFUSED });

  await button(page, 'แก้ไขข้อมูล').click();
  await expect(named(page)).toBeEnabled();

  write.open();
  await write.answered;
  await page.waitForTimeout(SETTLE_MS);

  expect(await page.getByText(REFUSED).count(), 'the overtaken refusal').toBe(0);
  await expect(named(page), 'the opening after the refusal').toBeEnabled();
});

test('row 3: a save that nothing took the place of says what it did', async ({ page }) => {
  const write = await saveAndCancel(page, {});

  // ยกเลิก and then nothing: the person who pressed บันทึกข้อมูล is owed the
  // news, as `146a`'s row of the same name says on the list (#146).
  write.open();
  await write.answered;

  await expect(page.getByText(SAVED, { exact: true })).toBeVisible();
  await expect(named(page), 'still in view mode').toBeDisabled();
});

/**
 * Rows 4 and 5 - the same rule for the grant dialog, from the review of 23
 * November 2569. *ยกเลิก* in the dialog is live while its save is out (#253),
 * and so is *เพิ่มสิทธิ์*, so the person can be in a second opening when the
 * first answer lands: until the review the panel closed the dialog on every
 * success, which shut that second opening over what was picked in it. The
 * grant is held at the route and forwarded - it is a real grant, which
 * `hold()` takes back.
 */
const GRANTS = new RegExp(`^/api/users/${IDS.teacherOne}/roles$`);
const ROLE = 'PROG_MANAGER';

async function grantAndCancel(page, answer) {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  const dialog = await openGrantDialog(page);
  await dialog.getByRole('combobox', { name: 'บทบาท', exact: true }).selectOption(ROLE);
  await dialog.getByRole('combobox', { name: 'ขอบเขตของบทบาท' }).selectOption('0501');
  const write = await gate(page, GRANTS, isWrite, answer);
  await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;

  await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(grantDialog(page), 'the first opening is put away').toHaveCount(0);
  return write;
}

test('row 4: a grant that lands after เพิ่มสิทธิ์ was pressed again leaves that opening open', async ({
  page,
}) => {
  const write = await grantAndCancel(page, {});

  const second = await openGrantDialog(page);
  const role = second.getByRole('combobox', { name: 'บทบาท', exact: true });
  await role.selectOption(ROLE);

  write.open();
  await write.answered;
  await expect(page.getByRole('status'), "the first grant's news").toHaveText(
    'เพิ่มสิทธิ์เรียบร้อยแล้ว',
  );

  await expect(grantDialog(page), 'the second opening').toBeVisible();
  await expect(role, 'and what was picked in it').toHaveValue(ROLE);
});

test('row 5: a grant refused after its dialog was put away is said on the page', async ({
  page,
}) => {
  const write = await grantAndCancel(page, { refusal: REFUSALS.scopeNotYours });

  write.open();
  await write.answered;

  await expect(page.getByRole('alert'), 'the person is told the grant was not made').toHaveText(
    REFUSALS.scopeNotYours,
  );
  await expect(grantDialog(page)).toHaveCount(0);
});

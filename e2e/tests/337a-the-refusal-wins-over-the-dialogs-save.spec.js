'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { dismiss, panel } = require('../support/confirm-dialog');
const departments = require('../support/departments-screen');
const programs = require('../support/programs-screen');
const {
  ADD: ADD_ACCOUNT,
  CONFIRM_STATUS,
  openUsers,
  search,
  statusPath,
  statusSwitch,
  userRow,
} = require('../support/users-screen');

/**
 * #337 - a refusal that lands behind a form dialog is not written over by that
 * dialog's own *บันทึกข้อมูลเรียบร้อยแล้ว*.
 *
 * The three screens that draw their form as a dialog (`Users.js` since #304,
 * `Departments.js` since #319, `Programs.js` since #320) leave the page's
 * banner undrawn while it is open, and #307's answer is that a sentence landing
 * then is said on the page once the dialog goes. When the dialog goes because
 * its save **worked**, the reload says the save's sentence through
 * `setNotice`, and until this ticket that replaced the refusal nobody had read.
 *
 * The owner's answer of 28 November 2569 is ข.: the refusal wins (#203's rule).
 * The saved row is in the list for anybody to see; the refusal is nowhere else.
 *
 * ## What each row is for
 *
 * One row per screen, because the rule is copied into each screen's `load` and
 * not shared (#83) - each row is the way in for its own copy's mutant (#191).
 * Every row builds the ticket's way in: a write the screen's confirmation
 * question was put away from while it was out (#204, #217), the form dialog
 * opened, the write refused at the route behind the cover, then a save that
 * succeeds.
 *
 * ## The settle point
 *
 * The refusal is drawn the moment the dialog closes and the save's sentence
 * only when the reload lands, so a retrying read of the refusal would pass on
 * the broken screen in the window between them (#50). Each row waits for the
 * reload's answer and then for the loading line to go, which is the render the
 * sentence is said in, and reads the banner once there.
 *
 * Nothing is written: the refused writes and the saves are answered at the
 * route (`gate`'s `refusal` and `success`), so the file needs no `hold()`.
 */

const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';

/**
 * The one read of the banner, taken once the reload has drawn: which sentence
 * it holds, read by the role `Notice` gives each kind - `alert` for a refusal,
 * `status` for a success (#111).
 */
async function bannerOnceReloaded(page, reload) {
  await reload;
  await expect(page.getByText('กำลังโหลด…')).toHaveCount(0);
  const refusals = await page.getByRole('alert').allTextContents();
  const successes = await page.getByRole('status').filter({ hasText: SAVED }).count();
  return { refusals, successes };
}

/** What every row reads: the refusal, alone, where the save's sentence would be. */
function theRefusalWon({ refusals, successes }, refused) {
  expect(refusals, 'the refusal on the page once the list is back').toEqual([refused]);
  expect(successes, 'the save\'s sentence over it').toBe(0);
}

/**
 * `fillNewAccount`'s fields without its press of เพิ่มผู้ใช้งาน: row 3 has to
 * open the dialog while a write is out and fill it after that write is refused,
 * which the shared helper's one press cannot be split around.
 */
async function fillTheOpenDialog(page, { id, email, first }) {
  await page.getByLabel('รหัสผู้ใช้', { exact: true }).fill(id);
  await page.getByLabel('อีเมล', { exact: true }).fill(email);
  await page.getByLabel('ชื่อ (ไทย)', { exact: true }).fill(first);
  await page.getByLabel('นามสกุล (ไทย)', { exact: true }).fill('ผู้ทดสอบ');
  await page.getByRole('combobox', { name: 'ภาควิชา', exact: true }).selectOption('05');
  await page.locator('select:has(option:text-is("— เลือกบทบาท —"))').selectOption('TEACHER');
  const scopes = page.locator('select:has(option:text-is("— เลือกขอบเขต —"))');
  await expect(scopes.locator('option[value="05"]')).toHaveCount(1);
  await scopes.selectOption('05');
}

const listRead = api => page =>
  page.waitForResponse(
    answer => new URL(answer.url()).pathname === api && answer.request().method() === 'GET',
  );

test('row 1: ข้อมูลภาควิชา - a removal refused behind the edit dialog outlives its save', async ({
  page,
}) => {
  const REFUSED = 'ปฏิเสธการลบเพื่อแถว 1 ของ #337';
  await signIn(page, ACCOUNTS.facultyAdmin);
  await departments.openDepartments(page);

  const removal = await departments.askToRemove(page, '05', { answer: { refusal: REFUSED } });
  await dismiss(page);
  await departments.openEditor(page, '05');
  removal.open();
  await removal.answered;
  const dialog = page.getByRole('dialog', { name: 'แก้ไขภาควิชา', exact: true });
  // The flag the removal held comes down in the render its refusal is handled in.
  await expect(dialog.getByRole('button', { name: 'บันทึก', exact: true })).toBeEnabled();

  const saving = await gate(page, /^\/api\/departments\/05$/, isWrite, { success: {} });
  const reload = listRead('/api/departments')(page);
  await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
  saving.open();
  await saving.answered;
  await expect(dialog).toHaveCount(0);

  theRefusalWon(await bannerOnceReloaded(page, reload), REFUSED);
});

test('row 2: ข้อมูลหลักสูตร - a removal refused behind the edit dialog outlives its save', async ({
  page,
}) => {
  const REFUSED = 'ปฏิเสธการลบเพื่อแถว 2 ของ #337';
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await programs.openPrograms(page);

  await programs.programRow(page, '0501').getByRole('button', { name: 'ลบ' }).click();
  const removal = await gate(page, /^\/api\/programs\/0501$/, isWrite, { refusal: REFUSED });
  await panel(page).getByRole('button', { name: 'ลบหลักสูตร' }).click();
  await removal.sent;
  await dismiss(page);
  await programs.openEditor(page, '0501');
  removal.open();
  await removal.answered;
  const dialog = page.getByRole('dialog', { name: 'แก้ไขหลักสูตร', exact: true });
  await expect(dialog.getByRole('button', { name: 'บันทึก', exact: true })).toBeEnabled();

  const saving = await gate(page, /^\/api\/programs\/0501$/, isWrite, { success: {} });
  const reload = listRead('/api/programs')(page);
  await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
  saving.open();
  await saving.answered;
  await expect(dialog).toHaveCount(0);

  theRefusalWon(await bannerOnceReloaded(page, reload), REFUSED);
});

test('row 3: ข้อมูลผู้ใช้งาน - a switch refused behind the add dialog outlives its save', async ({
  page,
}) => {
  const REFUSED = 'ปฏิเสธการเปลี่ยนสถานะเพื่อแถว 3 ของ #337';
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, 'teacher');
  await expect(userRow(page, ACCOUNTS.teacherTwo), 'the row the switch is pressed on').toHaveCount(1);

  const write = await gate(page, new RegExp(`^${statusPath(IDS.teacherTwo)}$`), isWrite, {
    refusal: REFUSED,
  });
  await statusSwitch(page, ACCOUNTS.teacherTwo).click();
  await panel(page).getByRole('button', { name: CONFIRM_STATUS, exact: true }).click();
  await write.sent;
  // The question goes while its write is out - #204's way in, as `307a` row 2.
  await page.keyboard.press('Escape');
  await panel(page).waitFor({ state: 'detached' });

  // The dialog is opened while the write is out and filled once it has been
  // refused: its fields wait for the page's flag like บันทึก does (#228).
  await page.getByRole('button', { name: ADD_ACCOUNT, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: ADD_ACCOUNT, exact: true });
  await expect(dialog).toBeVisible();
  write.open();
  await write.answered;
  await expect(dialog.getByRole('button', { name: 'บันทึก', exact: true })).toBeEnabled();
  await fillTheOpenDialog(page, { id: 'z337c', email: 'z337c@kmitl.ac.th', first: 'สามสามเจ็ด' });

  const saving = await gate(page, /^\/api\/users$/, isWrite, { success: {} });
  const reload = listRead('/api/users')(page);
  await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
  saving.open();
  await saving.answered;
  await expect(dialog).toHaveCount(0);

  theRefusalWon(await bannerOnceReloaded(page, reload), REFUSED);
});

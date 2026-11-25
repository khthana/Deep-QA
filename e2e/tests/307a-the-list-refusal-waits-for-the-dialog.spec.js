'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isGet, isWrite } = require('../support/gate');
const {
  ADD,
  CONFIRM_STATUS,
  fillNewAccount,
  openUsers,
  search,
  statusPath,
  statusSwitch,
  userRow,
} = require('../support/users-screen');
const { panel } = require('../support/confirm-dialog');

/**
 * #307 - a refusal of the list's own read is not drawn inside the add dialog.
 *
 * Since #304 (24 November 2569) the add dialog draws the page's notice whole,
 * so that the refusal of **its save** is where the person is looking. But the
 * page's notice is also where `load` says a refused read, and a read sent
 * before เพิ่มผู้ใช้งาน was pressed and refused after the dialog opened was
 * drawn under the heading *เพิ่มผู้ใช้งาน*, over what was being typed, which
 * reads as the save being refused before anybody pressed บันทึก.
 *
 * The owner's answer of 25 November 2569 is ข.: the dialog draws only its own
 * save's refusal, kept in a state of its own (`refused` in `Users.js`), and
 * any other refusal waits in the page's notice, which is not drawn while the
 * dialog is open, until it closes.
 *
 * ## What each row is for
 *
 * 1. a list read refused while the dialog is open says nothing inside it, and
 *    says it on the page once the dialog is put away;
 * 2. the same for a switch whose question was put away with Escape while its
 *    write was out - `ConfirmDialog` lets it go while `busy` (#204), and the
 *    code review of 25 November 2569 found this way in, which the first version
 *    of this fix (b51801e, a held refusal in `load` only) did not cover;
 * 3. the dialog's own refusal goes with the dialog: not on the page after
 *    Escape, and not in the next opening;
 * 4. but a refusal of its save that arrives after Escape is said on the page -
 *    the person who pressed บันทึก is owed it (#146), and the dialog is no
 *    longer there to say it. Written for `307:s307lateinthedialog`, which
 *    survived the first sweep: `146a` holds this half on another screen
 *    (`refusalRow`) and not on this one (#118).
 *
 * The dialog's own refusal staying inside it is `304a` row 4, which this
 * ticket does not change.
 *
 * ## How the read is out while the dialog opens
 *
 * The cover holds the pointer and the focus once the dialog is open (#217), so
 * nothing under it can start a read then. The read is started first, by the
 * search box, held at the route (#142), and refused only after the dialog is
 * on the screen - the way in the ticket names: a read already out when
 * เพิ่มผู้ใช้งาน is pressed.
 *
 * Row 2's write is held the same way and refused at the route. A removal
 * reaches the dialog by the same Escape and `report`, and has no row: the
 * mechanism is the page's notice not being drawn, which is one site (#191).
 *
 * Nothing is written: every request is answered at the route, so the file
 * needs no `hold()`.
 */

const dialog = page => page.getByRole('dialog', { name: ADD, exact: true });
const LIST = /^\/api\/users$/;

test('row 1: a refused list read waits for the add dialog to close, and is said on the page then', async ({
  page,
}) => {
  const REFUSED = 'ปฏิเสธการอ่านรายการเพื่อแถว 1';
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  const read = await gate(page, LIST, isGet, { refusal: REFUSED });
  await page.getByPlaceholder('ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้').fill('z307');
  await read.sent;

  await page.getByRole('button', { name: ADD, exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByLabel('รหัสผู้ใช้', { exact: true }).fill('z307a');

  read.open();
  await read.answered;
  // The settle point: the loading line goes in the same render the refusal is
  // handled in, so once it is gone the `catch` has run (#50 - read once, here).
  await expect(page.getByText('กำลังโหลด…')).toHaveCount(0);
  expect(await dialog(page).getByRole('alert').count(), 'alerts inside the dialog').toBe(0);
  expect(await page.getByRole('alert').count(), 'alerts on the page').toBe(0);

  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole('alert')).toHaveText(REFUSED);
});

test('row 2: a refused switch whose question was put away waits for the add dialog to close', async ({
  page,
}) => {
  const REFUSED = 'ปฏิเสธการเปลี่ยนสถานะเพื่อแถว 2';
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
  // The question goes while its write is out - #204's way in.
  await page.keyboard.press('Escape');
  await panel(page).waitFor({ state: 'detached' });

  await page.getByRole('button', { name: ADD, exact: true }).click();
  await expect(dialog(page)).toBeVisible();

  write.open();
  await write.answered;
  // The settle point: the flag comes down in the same render the refusal is
  // handled in, and the dialog's บันทึก is behind it.
  await expect(dialog(page).getByRole('button', { name: 'บันทึก', exact: true })).toBeEnabled();
  expect(await dialog(page).getByRole('alert').count(), 'alerts inside the dialog').toBe(0);
  expect(await page.getByRole('alert').count(), 'alerts on the page').toBe(0);

  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole('alert')).toHaveText(REFUSED);
});

test("row 3: the dialog's own refusal goes with the dialog", async ({ page }) => {
  const REFUSED = 'ปฏิเสธการบันทึกเพื่อแถว 3';
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  await fillNewAccount(page, { id: 'z307c', email: 'z307c@kmitl.ac.th', first: 'สามศูนย์เจ็ด' });
  const write = await gate(page, LIST, isWrite, { refusal: REFUSED });
  await dialog(page).getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;
  write.open();
  await write.answered;
  await expect(dialog(page).getByRole('alert')).toHaveText(REFUSED);

  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  expect(await page.getByRole('alert').count(), 'alerts on the page after Escape').toBe(0);

  await page.getByRole('button', { name: ADD, exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  expect(await dialog(page).getByRole('alert').count(), 'alerts in the next opening').toBe(0);
});

test('row 4: a refusal of the save that arrives after Escape is said on the page', async ({ page }) => {
  const REFUSED = 'ปฏิเสธการบันทึกเพื่อแถว 4';
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  await fillNewAccount(page, { id: 'z307d', email: 'z307d@kmitl.ac.th', first: 'สามศูนย์เจ็ด' });
  const write = await gate(page, LIST, isWrite, { refusal: REFUSED });
  await dialog(page).getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();

  write.open();
  await write.answered;
  await expect(page.getByRole('alert')).toHaveText(REFUSED);
});

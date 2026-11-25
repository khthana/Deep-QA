'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isGet } = require('../support/gate');
const { ADD, openUsers } = require('../support/users-screen');

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
 * save's refusal, and any other refusal waits for the dialog to close - the
 * held sentence of #246, which this screen already carries for a success
 * sentence whose list is under the cover.
 *
 * ## What each row is for
 *
 * 1. a list read refused while the dialog is open says nothing inside it, and
 *    says it on the page once the dialog is put away.
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
 * Nothing is written: the read is answered at the route, so the file needs no
 * `hold()`.
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

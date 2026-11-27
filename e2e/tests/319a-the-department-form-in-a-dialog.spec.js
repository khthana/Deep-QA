'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const {
  openDepartments,
  departmentRow,
  openEditor,
  listTable,
} = require('../support/departments-screen');

/**
 * #319 - ข้อมูลภาควิชา's add and edit form is a dialog over the list
 * (`docs/ui-consistency.md` rule 8, the owner's answer of 27 November 2569).
 *
 * Until this ticket the form was drawn **in place of** the table. It is now
 * drawn by `components/FormDialog.js`, which this screen is the first to use
 * and which #320-#334 will use one screen at a time. Its look is #304's
 * add-an-account dialog, and so is the page's handling of the sentences that
 * land while it is open (#307's answer on `Users.js`).
 *
 * ## What each row is for
 *
 * 1. เพิ่มภาควิชา opens a dialog named by the form's own heading, over a list
 *    that is still drawn, and takes the focus in; Escape puts it away and the
 *    focus goes back to the button that opened it;
 * 2. แก้ไข does the same with the edit heading, and ยกเลิก hands the focus
 *    back to that row's แก้ไข;
 * 3. Escape does nothing while the form's save is out, and puts the dialog
 *    away once it has answered - ยกเลิก inside the form is not asked here,
 *    being #228's and #249's and free on this screen;
 * 4. a refusal of the save is drawn inside the dialog, once, over what was
 *    typed.
 *
 * ## What this file does not say (#123)
 *
 * - **Whether the dialog looks like the add-an-account one.** Appearance; it is
 *   the walked row of `docs/acceptance/319-department-form-dialog.md`.
 * - **The late answers.** A save that lands after the dialog was put away is
 *   `146a`'s, through `showing`, which this ticket did not change; the
 *   sentence held until the list is visible is `held-sentences.js`' and the
 *   departments rows of `206a` and `208a`.
 * - **#91's two clearings.** `14c` reads them, extended by this ticket for the
 *   banner that is now behind a cover.
 *
 * Every row refuses or never sends its write, so nothing reaches the database
 * and the file needs no `hold()`.
 *
 * **Not run on 27 November 2569** - the owner asked for the browser runs of
 * #312-#334 to be made together, in #336.
 */

const ADD = 'เพิ่มภาควิชา';
const EDIT = 'แก้ไขภาควิชา';
const dialog = (page, name) => page.getByRole('dialog', { name, exact: true });

const WRITE = /^\/api\/departments(?:\/[^/]+)?$/;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);
});

test('row 1: เพิ่มภาควิชา opens a dialog over the list, and Escape hands the focus back', async ({
  page,
}) => {
  const opener = page.getByRole('button', { name: ADD, exact: true });
  await opener.click();
  await expect(dialog(page, ADD)).toHaveAttribute('aria-modal', 'true');
  // The list is behind the dialog, not replaced by it.
  await expect(listTable(page)).toBeVisible();
  await expect(departmentRow(page, '05')).toHaveCount(1);
  expect(
    await dialog(page, ADD).evaluate(box => box.contains(document.activeElement)),
    'focus is inside the dialog',
  ).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog(page, ADD)).toHaveCount(0);
  await expect(opener, 'the focus is back where the dialog came from').toBeFocused();
});

test('row 2: แก้ไข opens the edit dialog over the list, and ยกเลิก hands the focus back to it', async ({
  page,
}) => {
  await openEditor(page, '05');
  await expect(dialog(page, EDIT)).toBeVisible();
  await expect(dialog(page, EDIT).getByLabel('รหัสภาควิชา')).toHaveValue('05');
  await expect(listTable(page)).toBeVisible();

  await dialog(page, EDIT).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog(page, EDIT)).toHaveCount(0);
  await expect(
    departmentRow(page, '05').getByRole('button', { name: 'แก้ไข' }),
    'the focus is back on the row that was edited',
  ).toBeFocused();
});

test('row 3: Escape does nothing while the save is out, and puts the dialog away once it has answered', async ({
  page,
}) => {
  const REFUSED = 'ปฏิเสธเพื่อแถว 3 ของ #319';
  await openEditor(page, '05');

  const write = await gate(page, WRITE, isWrite, { refusal: REFUSED });
  await dialog(page, EDIT).getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;

  await page.keyboard.press('Escape');
  // Read after the press has been handled: the dialog is still there, and so
  // is the field that says which department the save is about.
  await expect(dialog(page, EDIT).getByLabel('รหัสภาควิชา')).toHaveValue('05');
  await expect(dialog(page, EDIT), 'Escape while the save is out').toHaveCount(1);

  write.open();
  await write.answered;
  await expect(dialog(page, EDIT).getByRole('alert')).toHaveText(REFUSED);

  await page.keyboard.press('Escape');
  await expect(dialog(page, EDIT), 'Escape once it has answered').toHaveCount(0);
});

test('row 4: a refusal is drawn inside the dialog, once, over what was typed', async ({ page }) => {
  const REFUSED = 'ปฏิเสธเพื่อแถว 4 ของ #319';
  await page.getByRole('button', { name: ADD, exact: true }).click();
  await dialog(page, ADD).getByLabel('รหัสภาควิชา').fill('Z9');
  await dialog(page, ADD).getByLabel('ชื่อภาควิชา (ไทย)').fill('สามหนึ่งเก้า');

  const write = await gate(page, WRITE, isWrite, { refusal: REFUSED });
  await dialog(page, ADD).getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;
  write.open();
  await write.answered;

  await expect(dialog(page, ADD).getByRole('alert')).toHaveText(REFUSED);
  // Once: the page's own banner is behind the cover while the dialog is open,
  // and a second copy there would be a sentence nobody can read.
  expect(await page.getByRole('alert').count(), 'alerts on the page').toBe(1);
  await expect(dialog(page, ADD).getByLabel('รหัสภาควิชา')).toHaveValue('Z9');
});

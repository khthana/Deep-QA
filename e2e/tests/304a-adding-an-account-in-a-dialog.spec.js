'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { DEPARTMENTS } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { ADD, openUsers, listTable } = require('../support/users-screen');

/**
 * #304 - adding an account is a dialog again, as the delivered
 * `AddUserDialog.js` was (`docs/users-screen.md` rule 10, the owner's answer
 * of 22 November 2569).
 *
 * Until this ticket the add form was drawn **in place of** the list. Rule 10
 * puts it in a dialog over the list, with the same fields as #303's
 * *ข้อมูลทั่วไป* tab plus the first grant, the password field offered only to
 * the two roles that sign in with one, laid out by `docs/ui-form-layout.md`,
 * and scrolling inside a box no taller than `max-h-[90vh]`.
 *
 * ## What each row is for
 *
 * 1. the dialog is a dialog, over a list that is still drawn;
 * 2. the password field exists only for `FULL_ADMIN` and `EXT_ASSESSOR`;
 * 3. a password typed for one of those roles is not sent once the role no
 *    longer needs one - the field is gone from the screen, so a value it still
 *    held would be a value nobody can see being sent;
 * 4. a refusal is drawn inside the dialog, once, and the dialog keeps what was
 *    typed - the page's own `Notice` is behind the cover while it is open;
 * 5. Escape puts the dialog away, and the next opening starts empty (#167);
 * 6. the box is no taller than nine tenths of the screen and scrolls inside,
 *    so บันทึก is reachable on a short screen.
 *
 * ## What this file does not say (#123)
 *
 * - **Whether the layout is right.** `docs/ui-form-layout.md` §การพิสูจน์:
 *   layout is appearance, and its rows are walked by hand in
 *   `docs/acceptance/11-user-accounts.md` §#304.
 * - **#247's sentence after a save.** `247b` presses the same button into this
 *   dialog and reads the sentence on the page after it closes; its mutants are
 *   the proof, re-swept by this ticket.
 * - **A late answer from an opening that was put away** (#146, #254). `146a`'s
 *   users rows hold it through `showing`, which this ticket did not change.
 *
 * Every row refuses or never sends its write, so nothing reaches the database
 * and the file needs no `hold()`.
 */

const dialog = page => page.getByRole('dialog', { name: ADD, exact: true });

/** The form's two grant boxes, found by their sentinel options (#180). */
const rolePicker = page => page.locator('select:has(option:text-is("— เลือกบทบาท —"))');
const scopePicker = page => page.locator('select:has(option:text-is("— เลือกขอบเขต —"))');

/** The password field, whichever of its two wordings it carries. */
const password = page => dialog(page).getByLabel(/^รหัสผ่าน/);

const DEPARTMENT = DEPARTMENTS[0].id;

async function openAdd(page) {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await page.getByRole('button', { name: ADD, exact: true }).click();
  await expect(dialog(page)).toBeVisible();
}

async function fillAccount(page, id) {
  const box = dialog(page);
  await box.getByLabel('รหัสผู้ใช้', { exact: true }).fill(id);
  await box.getByLabel('อีเมล', { exact: true }).fill(`${id}@kmitl.ac.th`);
  await box.getByLabel('ชื่อ (ไทย)', { exact: true }).fill('สามศูนย์สี่');
  await box.getByLabel('นามสกุล (ไทย)', { exact: true }).fill('ผู้ทดสอบ');
  await box.getByRole('combobox', { name: 'ภาควิชา', exact: true }).selectOption(DEPARTMENT);
}

const USERS_WRITE = /^\/api\/users$/;

test('row 1: เพิ่มผู้ใช้งาน opens a dialog over the list, which stays drawn', async ({ page }) => {
  await openAdd(page);
  await expect(dialog(page)).toHaveAttribute('aria-modal', 'true');
  // The list is behind the dialog, not replaced by it.
  await expect(listTable(page)).toBeVisible();
  // Focus is taken into the box, so a keyboard user is inside what opened.
  expect(
    await dialog(page).evaluate(box => box.contains(document.activeElement)),
    'focus is inside the dialog',
  ).toBe(true);
});

test('row 2: the password field is offered only to the two roles that sign in with one', async ({
  page,
}) => {
  await openAdd(page);
  await expect(password(page)).toHaveCount(0);

  await rolePicker(page).selectOption('TEACHER');
  await expect(password(page)).toHaveCount(0);

  for (const role of ['EXT_ASSESSOR', 'FULL_ADMIN']) {
    await rolePicker(page).selectOption(role);
    await expect(password(page), role).toBeVisible();
    await expect(password(page), role).toHaveAttribute('required', '');
  }

  await rolePicker(page).selectOption('PROG_MANAGER');
  await expect(password(page)).toHaveCount(0);
});

test('row 3: a password typed for a role that needs one is not sent once the role does not', async ({
  page,
}) => {
  await openAdd(page);
  await fillAccount(page, 'z304c');
  await rolePicker(page).selectOption('EXT_ASSESSOR');
  await password(page).fill('secret304');
  await rolePicker(page).selectOption('TEACHER');
  await scopePicker(page).selectOption(DEPARTMENT);

  const write = await gate(page, USERS_WRITE, isWrite, { refusal: 'ปฏิเสธเพื่อแถว 3' });
  await dialog(page).getByRole('button', { name: 'บันทึก', exact: true }).click();
  const request = await write.sent;
  write.open();
  await write.answered;

  const body = request.postDataJSON();
  expect(body.role).toEqual({ role_id: 'TEACHER', scope_id: DEPARTMENT });
  expect(body.password ?? '', 'the hidden password').toBe('');
});

test('row 4: a refusal is drawn inside the dialog, once, over what was typed', async ({ page }) => {
  const REFUSED = 'ปฏิเสธเพื่อแถว 4';
  await openAdd(page);
  await fillAccount(page, 'z304d');
  await rolePicker(page).selectOption('TEACHER');
  await scopePicker(page).selectOption(DEPARTMENT);

  const write = await gate(page, USERS_WRITE, isWrite, { refusal: REFUSED });
  await dialog(page).getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;
  write.open();
  await write.answered;

  await expect(dialog(page).getByRole('alert')).toHaveText(REFUSED);
  // Once: the page's own notice is behind the cover while the dialog is open,
  // and a second copy there would be a sentence nobody can read.
  expect(await page.getByRole('alert').count(), 'alerts on the page').toBe(1);
  await expect(dialog(page).getByLabel('รหัสผู้ใช้', { exact: true })).toHaveValue('z304d');
});

test('row 5: Escape puts the dialog away, and the next opening starts empty', async ({ page }) => {
  await openAdd(page);
  await dialog(page).getByLabel('รหัสผู้ใช้', { exact: true }).fill('z304e');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();

  await page.getByRole('button', { name: ADD, exact: true }).click();
  await expect(dialog(page).getByLabel('รหัสผู้ใช้', { exact: true })).toHaveValue('');
});

test('row 6: the box is no taller than nine tenths of a short screen, and scrolls to บันทึก', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await openAdd(page);

  const box = await dialog(page).boundingBox();
  expect(box.height, 'the box against 90% of 480').toBeLessThanOrEqual(432 + 1);
  expect(box.y, 'the top of the box is on the screen').toBeGreaterThanOrEqual(0);
  expect(
    await dialog(page).evaluate(element => element.scrollHeight > element.clientHeight),
    'the box scrolls inside',
  ).toBe(true);

  const save = dialog(page).getByRole('button', { name: 'บันทึก', exact: true });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
});

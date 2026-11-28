'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { dismiss, panel } = require('../support/confirm-dialog');
const {
  API,
  openSubjects,
  subjectRow,
  openEditor,
  listTable,
} = require('../support/subjects-screen');

/**
 * #321 - ข้อมูลรายวิชา's add and edit form is a dialog over the list
 * (`docs/ui-consistency.md` rule 8, the owner's answer of 27 November 2569),
 * in #319's shape as it stands after #336 and #337: `components/FormDialog.js`,
 * the page banner behind the cover while it is open, Escape inert only while
 * this opening's own save is out, and a refusal that landed behind the cover
 * not written over by the save's sentence.
 *
 * The component's own behaviours are written once in `FormDialog.js` and their
 * mutants are `mutation/319-the-department-form-in-a-dialog.py`'s. What this
 * file adds is that this screen's ways in reach them (#191), and the rows for
 * the lines this screen holds its own copy of (#83).
 *
 * ## What each row is for
 *
 * 1. เพิ่มรายวิชา opens a dialog over a list that is still drawn; Escape puts
 *    it away and hands the focus back;
 * 2. แก้ไข opens the edit dialog over the list; ยกเลิก hands the focus back to
 *    that row's แก้ไข;
 * 3. Escape does nothing while the save is out, the save's refusal is drawn
 *    inside the dialog, once, and Escape works again once it has answered;
 * 4. Escape puts away a form whose own save is not out while another
 *    opening's save still is (#336);
 * 5. a removal refused behind the edit dialog outlives that dialog's
 *    successful save (#337's rule, which the owner gave to #319-#334).
 *
 * ## What this file does not say (#123)
 *
 * - **Whether the dialog looks right.** The walked row of
 *   `docs/acceptance/321-subject-form-dialog.md`.
 * - **The late answers** - `146a`'s subjects rows, through `showing`.
 *
 * Every row refuses, answers at the route or never sends its write, so the file
 * needs no `hold()`.
 */

const ADD = 'เพิ่มรายวิชา';
const EDIT = 'แก้ไขรายวิชา';
const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';
const dialog = (page, name) => page.getByRole('dialog', { name, exact: true });
const CODE = 'รหัสวิชา';

const WRITE = /^\/api\/subjects(?:\/[^/]+)?$/;

/** The one subject of the department this account manages, in the seed. */
const SUBJECT = '01076105';

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openSubjects(page);
});

test('row 1: เพิ่มรายวิชา opens a dialog over the list, and Escape hands the focus back', async ({
  page,
}) => {
  const opener = page.getByRole('button', { name: ADD, exact: true });
  await opener.click();
  await expect(dialog(page, ADD)).toHaveAttribute('aria-modal', 'true');
  await expect(listTable(page)).toBeVisible();
  await expect(subjectRow(page, SUBJECT)).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(dialog(page, ADD)).toHaveCount(0);
  await expect(opener, 'the focus is back where the dialog came from').toBeFocused();
});

test('row 2: แก้ไข opens the edit dialog over the list, and ยกเลิก hands the focus back to it', async ({
  page,
}) => {
  await openEditor(page, SUBJECT);
  await expect(dialog(page, EDIT)).toBeVisible();
  await expect(dialog(page, EDIT).getByLabel(CODE, { exact: true })).toHaveValue(SUBJECT);
  await expect(listTable(page)).toBeVisible();

  await dialog(page, EDIT).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog(page, EDIT)).toHaveCount(0);
  await expect(
    subjectRow(page, SUBJECT).getByRole('button', { name: 'แก้ไข' }),
    'the focus is back on the row that was edited',
  ).toBeFocused();
});

test('row 3: Escape does nothing while the save is out, and the refusal is drawn in the dialog once', async ({
  page,
}) => {
  const REFUSED = 'ปฏิเสธเพื่อแถว 3 ของ #321';
  await openEditor(page, SUBJECT);

  const write = await gate(page, WRITE, isWrite, { refusal: REFUSED });
  await dialog(page, EDIT).getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;

  await page.keyboard.press('Escape');
  await expect(dialog(page, EDIT).getByLabel(CODE, { exact: true })).toHaveValue(SUBJECT);
  await expect(dialog(page, EDIT), 'Escape while the save is out').toHaveCount(1);

  write.open();
  await write.answered;
  await expect(dialog(page, EDIT).getByRole('alert')).toHaveText(REFUSED);
  expect(await page.getByRole('alert').count(), 'alerts on the page').toBe(1);

  // Once: the page's banner is not drawn while the dialog is open, so a copy
  // written there too would only show once the dialog goes - read it then.
  await page.keyboard.press('Escape');
  await expect(dialog(page, EDIT), 'Escape once it has answered').toHaveCount(0);
  expect(await page.getByText(REFUSED).count(), 'the refusal on the page once the dialog has gone').toBe(0);
});

test("row 4: Escape puts away a form whose own save is not out, while another opening's save still is", async ({
  page,
}) => {
  const REFUSED = 'ปฏิเสธเพื่อแถว 4 ของ #321';
  await openEditor(page, SUBJECT);

  const write = await gate(page, WRITE, isWrite, { refusal: REFUSED });
  await dialog(page, EDIT).getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;
  await dialog(page, EDIT).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog(page, EDIT)).toHaveCount(0);

  await page.getByRole('button', { name: ADD, exact: true }).click();
  await expect(dialog(page, ADD).getByLabel(CODE, { exact: true })).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(dialog(page, ADD), 'Escape in a form whose own save is not out').toHaveCount(0);

  write.open();
  await write.answered;
});

test('row 5: a removal refused behind the edit dialog outlives its save', async ({ page }) => {
  // #337's way in, as `337a` row 2: the question goes while its write is out
  // (#204, #217), the edit dialog is opened, the write is refused behind the
  // cover, and then the dialog's save succeeds.
  const REFUSED = 'ปฏิเสธการลบเพื่อแถว 5 ของ #321';
  await subjectRow(page, SUBJECT).getByRole('button', { name: 'ลบ' }).click();
  const removal = await gate(page, new RegExp(`^${API}/${SUBJECT}$`), isWrite, { refusal: REFUSED });
  await panel(page).getByRole('button', { name: 'ลบรายวิชา' }).click();
  await removal.sent;
  await dismiss(page);
  await openEditor(page, SUBJECT);
  removal.open();
  await removal.answered;
  await expect(dialog(page, EDIT).getByRole('button', { name: 'บันทึก', exact: true })).toBeEnabled();

  const saving = await gate(page, new RegExp(`^${API}/${SUBJECT}$`), isWrite, { success: {} });
  const reload = page.waitForResponse(
    answer => new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
  await dialog(page, EDIT).getByRole('button', { name: 'บันทึก', exact: true }).click();
  saving.open();
  await saving.answered;
  await expect(dialog(page, EDIT)).toHaveCount(0);

  // Read once, in the render the save's sentence would be said in (#50).
  await reload;
  await expect(page.getByText('กำลังโหลด…')).toHaveCount(0);
  expect(await page.getByRole('alert').allTextContents(), 'the refusal on the page once the list is back').toEqual([
    REFUSED,
  ]);
  expect(
    await page.getByRole('status').filter({ hasText: SAVED }).count(),
    "the save's sentence over it",
  ).toBe(0);
});

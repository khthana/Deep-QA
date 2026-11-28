'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const {
  openPrograms,
  programRow,
  openEditor,
  listTable,
} = require('../support/programs-screen');

/**
 * #320 - ข้อมูลหลักสูตร's add and edit form is a dialog over the list
 * (`docs/ui-consistency.md` rule 8, the owner's answer of 27 November 2569),
 * in #319's shape: `components/FormDialog.js`, and `Users.js`' handling of the
 * sentences that land while it is open (#307).
 *
 * The component's own behaviours - Escape inert while the save is out, the
 * focus handed back - are written once in `FormDialog.js` and their mutants
 * are `mutation/319-the-department-form-in-a-dialog.py`'s. What this file adds
 * is that this screen's ways in reach them (#191): one mutant on shared code
 * cannot tell the screens apart, so each screen's row is a reachability claim
 * and its kill is the proof.
 *
 * ## What each row is for
 *
 * 1. เพิ่มหลักสูตร opens a dialog over a list that is still drawn; Escape puts
 *    it away and hands the focus back;
 * 2. แก้ไข opens the edit dialog over the list; ยกเลิก hands the focus back to
 *    that row's แก้ไข;
 * 3. Escape does nothing while the save is out, and the save's refusal is drawn
 *    inside the dialog, once.
 * 4. Escape puts away a form whose own save is not out while another
 *    opening's save still is - the owner's answer of 28 November 2569 (#336).
 *
 * ## What this file does not say (#123)
 *
 * - **Whether the dialog looks right.** The walked row of
 *   `docs/acceptance/320-programme-form-dialog.md`.
 * - **The late answers** - `146a`'s programmes rows, through `showing`.
 *
 * Every row refuses or never sends its write, so the file needs no `hold()`.
 *
 * **Not run on 27 November 2569** - the owner asked for the browser runs of
 * #312-#334 to be made together, in #336.
 */

const ADD = 'เพิ่มหลักสูตร';
const EDIT = 'แก้ไขหลักสูตร';
const dialog = (page, name) => page.getByRole('dialog', { name, exact: true });

const WRITE = /^\/api\/programs(?:\/[^/]+)?$/;

/** A programme of the department this account manages, in the seed. */
const PROGRAM = '0501';

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openPrograms(page);
});

test('row 1: เพิ่มหลักสูตร opens a dialog over the list, and Escape hands the focus back', async ({
  page,
}) => {
  const opener = page.getByRole('button', { name: ADD, exact: true });
  await opener.click();
  await expect(dialog(page, ADD)).toHaveAttribute('aria-modal', 'true');
  await expect(listTable(page)).toBeVisible();
  await expect(programRow(page, PROGRAM)).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(dialog(page, ADD)).toHaveCount(0);
  await expect(opener, 'the focus is back where the dialog came from').toBeFocused();
});

test('row 2: แก้ไข opens the edit dialog over the list, and ยกเลิก hands the focus back to it', async ({
  page,
}) => {
  await openEditor(page, PROGRAM);
  await expect(dialog(page, EDIT)).toBeVisible();
  await expect(dialog(page, EDIT).getByLabel('รหัสหลักสูตร', { exact: true })).toHaveValue(PROGRAM);
  await expect(listTable(page)).toBeVisible();

  await dialog(page, EDIT).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog(page, EDIT)).toHaveCount(0);
  await expect(
    programRow(page, PROGRAM).getByRole('button', { name: 'แก้ไข' }),
    'the focus is back on the row that was edited',
  ).toBeFocused();
});

test('row 3: Escape does nothing while the save is out, and the refusal is drawn in the dialog once', async ({
  page,
}) => {
  const REFUSED = 'ปฏิเสธเพื่อแถว 3 ของ #320';
  await openEditor(page, PROGRAM);

  const write = await gate(page, WRITE, isWrite, { refusal: REFUSED });
  await dialog(page, EDIT).getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;

  await page.keyboard.press('Escape');
  await expect(dialog(page, EDIT).getByLabel('รหัสหลักสูตร', { exact: true })).toHaveValue(PROGRAM);
  await expect(dialog(page, EDIT), 'Escape while the save is out').toHaveCount(1);

  write.open();
  await write.answered;
  await expect(dialog(page, EDIT).getByRole('alert')).toHaveText(REFUSED);
  expect(await page.getByRole('alert').count(), 'alerts on the page').toBe(1);

  // Once: the page's banner is not drawn while the dialog is open, so a copy
  // written there too would only show once the dialog goes - read it then.
  // Put away with Escape rather than ยกเลิก since #336: once the save has
  // answered Escape is the way out again, which is the half `319a` row 3 reads
  // on the other screen (the code is copied, not shared - #83).
  await page.keyboard.press('Escape');
  await expect(dialog(page, EDIT), 'Escape once it has answered').toHaveCount(0);
  expect(await page.getByText(REFUSED).count(), 'the refusal on the page once the dialog has gone').toBe(0);
});

test("row 4: Escape puts away a form whose own save is not out, while another opening's save still is", async ({
  page,
}) => {
  // The owner's answer of 28 November 2569 (#336): Escape is inert only while
  // *this* dialog's save is out. A save left out behind ยกเลิก - free while it
  // is out, #228 and #249 - is another opening's, and the add form opened
  // after it has sent nothing.
  const REFUSED = 'ปฏิเสธเพื่อแถว 4 ของ #320';
  await openEditor(page, PROGRAM);

  const write = await gate(page, WRITE, isWrite, { refusal: REFUSED });
  await dialog(page, EDIT).getByRole('button', { name: 'บันทึก', exact: true }).click();
  await write.sent;
  await dialog(page, EDIT).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog(page, EDIT)).toHaveCount(0);

  await page.getByRole('button', { name: ADD, exact: true }).click();
  await expect(dialog(page, ADD).getByLabel('รหัสหลักสูตร', { exact: true })).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(dialog(page, ADD), 'Escape in a form whose own save is not out').toHaveCount(0);

  write.open();
  await write.answered;
});

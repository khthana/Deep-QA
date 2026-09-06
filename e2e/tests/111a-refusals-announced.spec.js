'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  openDepartments,
  departmentRow,
  importDepartments,
} = require('../support/departments-screen');
const { openUsers } = require('../support/users-screen');
const { ROLE_NAMES, openEditor, grantRow, revoke } = require('../support/grants-panel');
const { openChangePassword, submitPasswordChange } = require('../support/shell');
const { headerOf, downloadTemplate, csv } = require('../support/import-panel');

/**
 * A refusal that is drawn but never announced — ticket #111.
 *
 * Twenty screens answer with a banner when a request comes back 400 or 403. A
 * sighted person watches it appear; somebody using a screen reader gets
 * nothing at all, because the banner is inserted into a region they are not
 * reading and no live region declares it. The button they pressed simply does
 * not report back. #38 got the same reasoning right for the heatmap - a person
 * who cannot see a shade still needs the fact - and a refusal that only
 * appears is the same omission with worse consequences.
 *
 * ## What this file asserts, and what it cannot
 *
 * A browser can be asked whether the live-region attribute is on the element
 * that carries the sentence. It cannot be asked whether a screen reader says
 * the words out loud. **Those are different claims and only the first is
 * here** - the acceptance sheet marks the second ◐ and leaves it to an ear.
 *
 * ## Why these rows find the banner by its role, and 55a still does not
 *
 * [#85](https://github.com/khthana/Deep-QA/issues/85) moved the sign-in
 * banner's locator onto `getByRole('alert')` and paid a price for it: nine
 * rows in `50a` then depended on that role to find their subject at all, so a
 * mutant removing the attribute failed all nine identically and proved
 * nothing about any of them. **An attribute a locator is built on becomes the
 * premise of those rows rather than a claim any of them makes.**
 *
 * The rows below use the role too, and that is deliberate and safe for a
 * reason worth stating: they are the rows *about* the role, and they are the
 * only rows in the store that use it for these banners. Removing the
 * attribute kills exactly them. Everywhere else - `14c`, `55a`, `12a`, `10a`,
 * `11b` - the banner is still found by its text or by its Tailwind class, so
 * those rows keep asserting what they were written to assert and this file
 * keeps the role falsifiable. **The trap is not using a role in a locator; it
 * is using it in the locator every other row shares.**
 *
 * ## Assertive or polite is a decision, and it is made once
 *
 * The ticket asks for that judgement per banner and says the assertive case is
 * a refusal the person just caused by pressing a button. All of these are
 * that. A *success* is not: it is worth hearing, but interrupting whatever the
 * reader is in the middle of to say *saved* is a worse experience than
 * queueing it. So `Notice` chooses on the one thing it already knows about
 * itself - `role="alert"` when it is an error, `role="status"` when it is not -
 * and no caller decides it. The polite row below is what stops that from
 * quietly becoming *alert everywhere*.
 */

/** The banner carrying `text`, found by the role that is this file's subject. */
const announced = (page, role, text) =>
  page.getByRole(role).filter({ hasText: text });

test.describe('#111: a refusal is announced, not only drawn', () => {
  test('the shared banner announces a refusal assertively', async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openDepartments(page);

    await page.getByRole('button', { name: 'เพิ่มภาควิชา' }).click();
    // `05` is seeded, so the server refuses it - the same driver 14c uses.
    await page.getByLabel('รหัสภาควิชา').fill('05');
    await page.getByLabel('ชื่อภาควิชา (ไทย)').fill('ซ้ำกับที่มีอยู่');
    await page.getByRole('button', { name: 'บันทึก' }).click();

    // The sentence is on the screen at all: without this the row below could
    // pass by finding nothing on a page that refused nothing.
    await expect(page.getByText(REFUSALS.duplicateDepartmentId)).toBeVisible();

    await expect(
      announced(page, 'alert', REFUSALS.duplicateDepartmentId),
    ).toHaveCount(1);
  });

  test('the same banner announces a success politely, and does not interrupt', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openDepartments(page);

    // An edit saved unchanged: this row is about the banner, not the row, and
    // 57a-pager.spec.js is what counts departments.
    await departmentRow(page, '05').getByRole('button', { name: 'แก้ไข' }).click();
    await page.getByRole('button', { name: 'บันทึก' }).click();

    const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';
    await expect(page.getByText(SAVED)).toBeVisible();

    await expect(announced(page, 'status', SAVED)).toHaveCount(1);
    // And it is *not* the assertive one. This is the assertion that keeps the
    // decision a decision rather than `role="alert"` applied everywhere.
    await expect(announced(page, 'alert', SAVED)).toHaveCount(0);
  });

  test('the grants panel announces its refusal, from its own copy of the banner', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await openEditor(page, ACCOUNTS.departmentAdmin05);

    // Revoking your own grant, refused at the server - 12a row 6's driver.
    const refused = await revoke(page, ROLE_NAMES.DEPT_ADMIN, '05');
    expect(refused.status()).toBe(403);

    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
    await expect(announced(page, 'alert', REFUSALS.forbidden)).toHaveCount(1);

    // The grant is still held: 12a asserts this too, and it is repeated here
    // because a panel that switched the row off and then complained would
    // lock this account out on its next request - a far worse defect than the
    // one this file is about, and cheap to notice from here.
    await expect(grantRow(page, ROLE_NAMES.DEPT_ADMIN, '05')).toHaveCount(1);
  });

  test('the change-password dialog announces its refusal', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherTwo);
    await openChangePassword(page);

    const answer = await submitPasswordChange(
      page,
      'not-the-password',
      'deep-core-changed',
    );
    expect(answer.status()).toBe(403);

    await expect(page.getByText(REFUSALS.wrongPassword)).toBeVisible();
    await expect(announced(page, 'alert', REFUSALS.wrongPassword)).toHaveCount(1);
  });

  test('the import panel announces that nothing was imported', async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openDepartments(page);

    const header = headerOf(await downloadTemplate(page));
    // A row with no identifier, so the server writes nothing - 14c's driver.
    await importDepartments(page, csv(header, ',ไม่มีรหัส,No Identifier'));

    const NOTHING_SAVED = 'ไม่ได้บันทึกรายการใด';
    await expect(page.getByText(NOTHING_SAVED)).toBeVisible();
    await expect(announced(page, 'alert', NOTHING_SAVED)).toHaveCount(1);
  });
});

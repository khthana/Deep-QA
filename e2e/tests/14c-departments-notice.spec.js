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
const {
  headerOf,
  downloadTemplate,
  csv,
  reportedLines,
} = require('../support/import-panel');

/**
 * The banner that outlived what it was about — ticket #91.
 *
 * Found while hand-walking row 1 of docs/acceptance/14-departments.md. The
 * screen's banner was only ever overwritten, never cleared, so it stood there
 * across actions that had nothing to do with it: a refusal still on the screen
 * after the form that caused it had been cancelled, and *บันทึกข้อมูลเรียบร้อยแล้ว*
 * floating above an empty form that had saved nothing.
 *
 * #91 calls this an appearance row, and it is not: every case below is a
 * question about whether an element is on the screen after a click, which is
 * behaviour and is exactly what the browser seam is for. What would be
 * appearance - that the bar is red rather than green, that the words are the
 * right words - is asserted nowhere here. So this file takes the two ways the
 * walk actually found, on the screen it found them on, and a third the code
 * review found afterwards: the import, which begins an action without
 * touching the form or the confirmation and so was missed by the first pass.
 *
 * The other five screens named in #91 take the same lines and the same
 * `onStart`, and are left to the eye. The fix is not shared code (see the comment in Departments.js on
 * why an intent and a completion cannot both go through one helper), so this
 * file proves the rule rather than the roll-out.
 *
 * What must NOT pass here is a timeout: #85 is the ticket about a banner that
 * vanished before it could be read. Nothing below waits for a clock - each
 * assertion follows a click, and the banner is gone because of the click.
 */

test('#91: a refusal does not outlive the form that caused it', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);

  await page.getByRole('button', { name: 'เพิ่มภาควิชา' }).click();
  // `05` is seeded, so the server refuses it and the screen gets its red bar.
  await page.getByLabel('รหัสภาควิชา').fill('05');
  await page.getByLabel('ชื่อภาควิชา (ไทย)').fill('ซ้ำกับที่มีอยู่');
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await expect(page.getByText(REFUSALS.duplicateDepartmentId)).toBeVisible();

  // Cancelling puts the person back on a list with nothing wrong with it, and
  // the sentence saying something is wrong has to go with the form.
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(page.getByText(REFUSALS.duplicateDepartmentId)).toHaveCount(0);
  // Back on the list rather than merely banner-less.
  await expect(departmentRow(page, '05')).toHaveCount(1);
});

test('#91: a success does not outlive the action it reports', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);

  // An edit saved unchanged, because this row is about the banner and not
  // about the row: the count of departments is what 57a-pager.spec.js asserts
  // on, and a test that adds one to prove a point about a banner would be
  // paid for by a different file.
  await departmentRow(page, '05').getByRole('button', { name: 'แก้ไข' }).click();
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();

  // The success belongs to the save that just happened. Opening a new form is
  // a new action, and it starts with nothing saved.
  await page.getByRole('button', { name: 'เพิ่มภาควิชา' }).click();
  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toHaveCount(0);
  // The form really is open and empty, so the assertion above is about the
  // banner rather than about a click that did nothing.
  await expect(page.getByLabel('รหัสภาควิชา')).toHaveValue('');
});

test('#91: an upload clears the banner from whatever came before it', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);

  // Any banner will do; a save is the cheapest one that writes nothing.
  await departmentRow(page, '05').getByRole('button', { name: 'แก้ไข' }).click();
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();

  // The import panel is the one place a new action begins without touching
  // the form or the confirmation, which is why the first pass at #91 walked
  // past it and the code review had to find it.
  //
  // The file below is refused *with* a per-row report, which is the case that
  // makes this a real question: the panel draws its own table and never
  // touches the screen's banner, so a "saved" from before the upload stays
  // where it is unless the upload clears it. A header-only file would not
  // have asked anything - its refusal has no rows, so it becomes the screen's
  // banner and overwrites the previous one whether anything clears it or not.
  // That first draft passed against the mutant and was rewritten.
  const header = headerOf(await downloadTemplate(page));
  await importDepartments(page, csv(header, ',ไม่มีรหัส,No Identifier'));
  await expect.poll(() => reportedLines(page)).toEqual([2]);
  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toHaveCount(0);
});

'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  downloadTemplate,
  headerOf,
  csv,
  total,
  reportTable,
  reportedLines,
  reportedReason,
} = require('../support/import-panel');
const {
  openDepartments,
  importDepartments,
  departmentRow,
} = require('../support/departments-screen');

/**
 * docs/acceptance/14-departments.md, rows 5-7 — the import.
 *
 * The same six shapes the register's rows 12-17 walk, against the same
 * `ImportPanel` and the same `lib/importer`; what is different here is what a
 * department is, and that the import inserts rather than corrects, so a code
 * the table already holds is an error rather than an update.
 *
 * Every file is built on the header the screen's own template button produced,
 * and each spec owns a code range, so no spec depends on another having run.
 * Counts are measured against what the table holds at that moment rather than
 * against the seeded two, because the specs here write into the same schema.
 *
 * `mode: 'serial'` because they share one table: the counts these rows assert
 * are only meaningful if nothing else is writing to it.
 */
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);
});

test('row 5: the template as it arrives is a file the import accepts', async ({ page }) => {
  const template = await downloadTemplate(page);
  expect(template.name).toBe('departments-template.csv');

  const before = await total(page);
  // Uploaded unmodified, byte-order mark and all - the bytes the browser saved
  // are the bytes that go back up. That is the whole row: a template whose
  // sample row the import would refuse is a form that teaches the wrong shape.
  await importDepartments(page, template.text, template.name);

  await expect(page.getByText('นำเข้าสำเร็จ 1 รายการ')).toBeVisible();
  await expect.poll(() => total(page)).toBe(before + 1);
  await expect(departmentRow(page, '07')).toHaveCount(1);
});

test('row 6: a good file creates every row, and the English name is optional', async ({
  page,
}) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);

  await importDepartments(
    page,
    csv(
      header,
      'X1,วิศวกรรมทดสอบหนึ่ง,Test Engineering One',
      'X2,วิศวกรรมทดสอบสอง,Test Engineering Two',
      // The English column left empty, which the template says is optional.
      'X3,วิศวกรรมทดสอบสาม,',
    ),
  );

  await expect(page.getByText('นำเข้าสำเร็จ 3 รายการ')).toBeVisible();
  await expect.poll(() => total(page)).toBe(before + 3);
  for (const code of ['X1', 'X2', 'X3']) {
    await expect(departmentRow(page, code)).toHaveCount(1);
  }
  // The row with no English name was written, not silently dropped, and the
  // Thai name it did carry is what the table draws. What is drawn in the empty
  // column is a matter of appearance and stays a hand-walked row.
  await expect(departmentRow(page, 'X3')).toContainText('วิศวกรรมทดสอบสาม');
});

test('row 7: every bad row is reported at once, and nothing is written', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);
  const name = 'departments-bad.csv';

  await importDepartments(
    page,
    csv(
      header,
      'Y1,วิศวกรรมดี,Good Engineering',
      ',ไม่มีรหัส,No Identifier',
      'Y3,,No Thai Name',
      'Y1,ซ้ำกับแถวแรก,Repeat Of Line Two',
      '05,รหัสที่มีอยู่แล้ว,Already Taken',
    ),
    name,
  );

  // Two tables are on the screen once an import is refused. If the filter
  // matched both, the table's own first column would join the reported lines
  // and the assertion below would be a coincidence.
  await expect.poll(() => reportTable(page).count()).toBe(1);

  // Line 1 is the header, so the five data rows are lines 2 to 6 and the four
  // bad ones are 3, 4, 5 and 6 - all of them, in line order, rather than
  // stopping at the first row that is wrong.
  await expect.poll(() => reportedLines(page)).toEqual([3, 4, 5, 6]);

  // The database can say that line 5 collides; only the importer can say what
  // it collides with, and that is what makes the file fixable without guessing.
  await expect(reportedReason(page, 5)).toContainText('ซ้ำกับบรรทัดที่ 2');

  // Nothing was written - not even line 2, which was fine. That is the rule: an
  // import applies whole or not at all.
  await page.reload();
  await openDepartments(page);
  await expect.poll(() => total(page)).toBe(before);
  await expect(departmentRow(page, 'Y1')).toHaveCount(0);

  // The same file name again, once it has been corrected. The input's value is
  // cleared after every upload, so choosing the file that was just refused
  // starts a new upload rather than doing nothing at all.
  await importDepartments(page, csv(header, 'Y1,วิศวกรรมดี,Good Engineering'), name);
  await expect(page.getByText('นำเข้าสำเร็จ 1 รายการ')).toBeVisible();
  await expect.poll(() => departmentRow(page, 'Y1').count()).toBe(1);
});

test('row 7: a file with nothing but a header says so', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);

  await importDepartments(page, `${header}\r\n`);

  await expect(page.getByText(REFUSALS.importEmpty)).toBeVisible();
  // An empty file is a refusal, not a success with a count of zero: the two
  // read very differently to somebody who uploaded the wrong file.
  await expect(page.getByText(/นำเข้าสำเร็จ/)).toHaveCount(0);
  expect(await total(page)).toBe(before);
});

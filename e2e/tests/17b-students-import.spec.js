'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  BOM,
  openRegister,
  downloadTemplate,
  headerOf,
  csv,
  importCsv,
  total,
  reportedLines,
  reportTable,
} = require('../support/students-screen');
const { BACKEND_URL } = require('../support/env');

/**
 * docs/acceptance/17-students.md, rows 12-17 — the import.
 *
 * These are the rows the checklist repeats on every screen with an ImportPanel
 * on it, and #25 is about to reuse that panel for section enrolment. What is
 * asserted is the rule each row states, not the keystrokes it describes: every
 * file here is built on the header the screen's own template button produced,
 * and each spec owns a code range so that no spec depends on another having
 * run, or on the walk of row 5 having happened.
 *
 * `mode: 'serial'` because they share one register: the counts these rows
 * assert are only meaningful if nothing else is writing to it.
 */
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openRegister(page);
});

test('row 12: the template is four columns and one sample, and keeps its byte-order mark', async ({
  page,
}) => {
  const template = await downloadTemplate(page);

  expect(template.name).toBe('students-template.csv');
  // #62: the client puts the mark back that reading the response stripped, so
  // Excel opens a Thai template as UTF-8 rather than as cp874 mojibake.
  expect(template.text.startsWith(BOM)).toBe(true);

  const lines = template.text.replace(BOM, '').trim().split(/\r?\n/);
  expect(lines[0].split(',')).toEqual([
    'student_id',
    'first_name_th',
    'last_name_th',
    'program_id',
  ]);
  // No department and no admission year: both are the server's answers, and a
  // column for either is a column somebody fills in and is then believed.
  expect(lines[0]).not.toContain('department_id');
  expect(lines[0]).not.toContain('admission_year');
  expect(lines).toHaveLength(2);

  // The one sample row is `66010001` — the first student of the seeded 66
  // cohort. Uploading the template as it arrives therefore does not demonstrate
  // an import; it renames a real student. Asserted rather than merely noted so
  // that the day the sample stops colliding, this row says so (#67).
  const sample = await page.request.get(`${BACKEND_URL}/api/students/${lines[1].split(',')[0]}`);
  expect(sample.status()).toBe(200);
});

test('row 13: a good file is applied and its students are on the first page', async ({
  page,
}) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);

  await importCsv(
    page,
    csv(
      header,
      '68020001,ทดสอบหนึ่ง,นำเข้า,0501',
      '68020002,ทดสอบสอง,นำเข้า,0501',
      '68020003,ทดสอบสาม,นำเข้า,0501',
    ),
  );

  await expect(page.getByText('นำเข้าสำเร็จ 3 รายการ')).toBeVisible();
  await expect.poll(() => total(page)).toBe(before + 3);

  // Newest-added first, so all three are on the page the import returns to.
  for (const code of ['68020001', '68020002', '68020003']) {
    await expect(page.getByText(code)).toBeVisible();
  }
});

test('row 14: a file with bad rows is refused whole, naming every bad line', async ({
  page,
}) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);

  await importCsv(
    page,
    csv(
      header,
      '68030001,ดีหนึ่ง,นำเข้า,0501',
      '6803000X,รหัสผิด,นำเข้า,0501',
      '68030003,ไม่มีนามสกุล,,0501',
      '68030004,หลักสูตรผิด,นำเข้า,9999',
      '68030005,ดีสอง,นำเข้า,0501',
    ),
  );

  // Line 1 is the header, so the five data rows are lines 2 to 6 and the three
  // bad ones are 3, 4 and 5.
  await expect.poll(() => reportedLines(page)).toEqual([3, 4, 5]);

  // Nothing was written — not even the two rows that were fine. That is the
  // rule: an import applies whole or not at all.
  await page.reload();
  await openRegister(page);
  await expect.poll(() => total(page)).toBe(before);
  await expect(page.getByText('68030001')).toHaveCount(0);
  await expect(page.getByText('68030005')).toHaveCount(0);
});

test('row 15: two rows of one file claiming one code is refused, naming the second', async ({
  page,
}) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);

  await importCsv(
    page,
    csv(header, '68040001,ซ้ำหนึ่ง,นำเข้า,0501', '68040001,ซ้ำสอง,นำเข้า,0501'),
  );

  // Two tables are on the screen once an import is refused. If the filter
  // matched both, the register's own first column would join the reported
  // lines and the assertion below would be a coincidence.
  await expect.poll(() => reportTable(page).count()).toBe(1);

  // The database cannot catch this one: an import that meets an existing code
  // updates it, so the second row would be read as a correction to the first
  // and nothing would be reported at all.
  await expect.poll(() => reportedLines(page)).toEqual([3]);

  await page.reload();
  await openRegister(page);
  await expect.poll(() => total(page)).toBe(before);
  await expect(page.getByText('68040001')).toHaveCount(0);
});

test('row 16: a code the register already holds is corrected, not duplicated', async ({
  page,
}) => {
  const header = headerOf(await downloadTemplate(page));

  await importCsv(page, csv(header, '68050001,แก้ไข,ก่อนแก้,0501'));
  await expect(page.getByText('นำเข้าสำเร็จ 1 รายการ')).toBeVisible();
  await expect.poll(() => page.getByText('68050001').count()).toBe(1);
  const before = await total(page);

  await importCsv(page, csv(header, '68050001,แก้ไข,แก้ไขแล้ว,0501'));

  await expect(page.getByText('นำเข้าสำเร็จ 1 รายการ')).toBeVisible();
  // The count is the whole rule: the same code twice is one student.
  await expect.poll(() => total(page)).toBe(before);
  await expect(page.getByText('แก้ไข แก้ไขแล้ว')).toBeVisible();
});

test('row 17: a column the template does not have is ignored, not believed', async ({
  page,
}) => {
  const header = headerOf(await downloadTemplate(page));

  // The admission year is derived from the code — 68… is 2568 — and a file
  // that claims otherwise is not allowed to overrule it.
  await importCsv(page, csv(`${header},admission_year`, '68060001,ปีเข้า,นำเข้า,0501,2599'));

  await expect(page.getByText('นำเข้าสำเร็จ 1 รายการ')).toBeVisible();
  // Read off the screen rather than out of the API: the row the register
  // draws is where the person would be misled, and the year it shows is the
  // one the server derived.
  const row = page.getByRole('row').filter({ hasText: '68060001' });
  await expect(row).toContainText('2568');
  await expect(row).not.toContainText('2599');
});

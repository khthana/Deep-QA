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
const { REFUSALS } = require('../../backend/auth/refusals');

/**
 * docs/acceptance/17-students.md, rows 12-17 and 23 — the import.
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

test('row 12: the template is four columns and no sample row, and keeps its byte-order mark', async ({
  page,
}) => {
  const template = await downloadTemplate(page);

  expect(template.name).toBe('students-template.csv');
  // #62: the client puts the mark back that reading the response stripped, so
  // Excel opens a Thai template as UTF-8 rather than as cp874 mojibake. Since
  // #67 the file it protects has no Thai left in it - the four column names
  // are ASCII - so this assertion now proves the mark survives the round trip
  // and no longer demonstrates the mojibake it exists to prevent. That is one
  // of the two things #67 cost, and 11b still shows the other end of it: the
  // users template is Thai from its second line down.
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
  expect(lines).toHaveLength(1);

  // #67, and this row is the one that asked for it. It used to read
  // `toHaveLength(2)` and then fetch the sample's code, asserting
  // `GET /api/students/66010001` answered 200 — pinning the collision on
  // purpose, so that the day the sample stopped naming a real student the row
  // would fail and point at the ticket. This is that day, so the row now says
  // what it was waiting to be able to say.
  //
  // Not a line count. A code can arrive in a comment row or a second header
  // and leave the count at one, and what the ticket is about is a code in the
  // file, wherever it sits.
  expect(template.text).not.toMatch(/\d{8}/);
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

test('row 23: the template uploaded unchanged is refused, and renames nobody', async ({
  page,
}) => {
  // #67's other half, and the half a person walks into rather than reads:
  // download the template, upload it without editing it, and see what the
  // register looks like afterwards. It used to answer นำเข้าสำเร็จ 1 รายการ
  // over a real student it had just renamed.
  //
  // Appended rather than inserted beside row 12: the specs and the sheet cite
  // each other by row number, and a number that moves is four files to chase.
  //
  // `66010001` is typed here where `students.test.js` derives it from the
  // seed's cohort prefixes. The literal is the point at this seam: this is the
  // code the template shipped, and the row is about that code and not about
  // whichever student the seed happens to number first.
  const template = await downloadTemplate(page);
  const before = await total(page);
  const seeded = await page.request.get(`${BACKEND_URL}/api/students/66010001`);
  expect(seeded.status()).toBe(200);
  const { student } = await seeded.json();

  await importCsv(page, template.text);

  await expect(page.getByText(REFUSALS.importEmpty)).toBeVisible();
  await expect.poll(() => total(page)).toBe(before);

  // The count cannot see this defect: the row was never added, it was written
  // over, and the register was the same size either way.
  const after = await page.request.get(`${BACKEND_URL}/api/students/66010001`);
  expect((await after.json()).student).toEqual(student);
});

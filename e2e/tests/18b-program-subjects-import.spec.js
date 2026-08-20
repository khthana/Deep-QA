'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  BOM,
  downloadTemplate,
  headerOf,
  csv,
  total,
  reportTable,
  reportedLines,
  reportedReason,
} = require('../support/import-panel');
const {
  openSubjects,
  importSubjects,
} = require('../support/subjects-screen');
const {
  openProgramSubjects,
  importProgramSubjects,
  pairRow,
  listedCodes,
  nextPage,
} = require('../support/program-subjects-screen');

/**
 * docs/acceptance/18-program-subjects.md, criteria 7 and 9 — the import, and
 * the paging the import is the quickest way to reach.
 *
 * The same `ImportPanel` and the same `lib/importer` every screen before this
 * one uses; what is different is what a row *is*. The key is a pair, so a file
 * may name one programme many times and one subject many times and only the
 * same pair twice is a mistake, and a row can be wrong in a way no earlier
 * screen's could: naming a subject the catalogue does not hold.
 *
 * The template is not uploaded back unmodified the way #14's row 5 uploads
 * theirs. Its sample row is `0501,01076105,required`, which is the pairing the
 * seed already made — the sample deliberately names a real one — so the file
 * that arrives is refused as a duplicate rather than accepted. What the row is
 * about, the shape of the file and the byte-order mark, is asserted on the
 * bytes that reached the disk.
 *
 * `mode: 'serial'` because these rows count one curriculum they are all writing
 * into, and because the paging row needs the rows the import rows put there.
 */
test.describe.configure({ mode: 'serial' });

/** This file's own catalogue range, so no row here depends on another spec. */
const CODES = Array.from({ length: 10 }, (unused, index) => `010798${21 + index}`);

/**
 * The catalogue entries these rows place. Made through the ข้อมูลรายวิชา
 * screen's own import, by the one account that reaches it for department 05.
 */
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openSubjects(page);
    const header = headerOf(await downloadTemplate(page));
    await importSubjects(
      page,
      csv(
        header,
        ...CODES.map(
          (code, index) => `${code},วิชานำเข้าทดสอบ ${index + 1},Imported Test ${index + 1},3,05,,`,
        ),
      ),
    );
    await expect(page.getByText(`นำเข้าสำเร็จ ${CODES.length} รายการ`)).toBeVisible();
  } finally {
    await context.close();
  }
});

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);
});

test('row 7: the template is the file the import expects, mark and all', async ({ page }) => {
  const template = await downloadTemplate(page);

  expect(template.name).toBe('program-subjects-template.csv');

  // The mark is the row's Thai half: without it Excel reads the file as the
  // system codepage and the Thai in a filled-in row comes back mangled (#62).
  // The Fetch specification strips it, so the client re-adds it, which means
  // the bytes on disk and the bytes the endpoint answered are not the same and
  // only the download can be asked.
  expect(template.text.startsWith(BOM)).toBe(true);

  // Three columns, in the order the importer reads them, and one sample row -
  // the pairing the seed made, so the sample is a real one rather than an
  // invented code.
  expect(headerOf(template).split(',')).toEqual([
    'program_id',
    'subject_id',
    'subject_type',
  ]);
  const lines = template.text.replace(BOM, '').trim().split(/\r?\n/);
  expect(lines).toHaveLength(2);
  expect(lines[1]).toBe('0501,01076105,required');
});

test('row 7: a good file places every pairing it holds', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);

  await importProgramSubjects(
    page,
    csv(header, `0501,${CODES[0]},required`, `0501,${CODES[1]},elective`),
  );

  await expect(page.getByText('นำเข้าสำเร็จ 2 รายการ')).toBeVisible();
  await expect.poll(() => total(page)).toBe(before + 2);
  await expect(pairRow(page, CODES[0])).toHaveCount(1);
  await expect(pairRow(page, CODES[1])).toHaveCount(1);
});

test('row 7: one bad row keeps the whole file out', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);
  const name = 'program-subjects-bad.csv';

  await importProgramSubjects(
    page,
    csv(
      header,
      // Line 2 is fine. That is the point of the row: it is not written either.
      `0501,${CODES[2]},required`,
      `0501,09999999,required`,
    ),
    name,
  );

  // Two tables are on the screen once an import is refused, and the report's
  // own first column is line numbers - if the filter matched both, the
  // assertion below would be a coincidence.
  await expect.poll(() => reportTable(page).count()).toBe(1);

  // Line 1 is the header, so the bad row is line 3, and the reason names what
  // is wrong rather than reporting a foreign key.
  await expect.poll(() => reportedLines(page)).toEqual([3]);
  await expect(reportedReason(page, 3)).toContainText(REFUSALS.subjectNotInCatalogue);

  // Nothing was written - not even line 2. The whole file or none of it.
  //
  // Read afresh rather than off the screen. A refused import does not reload
  // the list, so the numbers standing on it are the ones from before the
  // upload and would agree with a file that had been written whole - which is
  // exactly what a broken rollback looks like.
  await openProgramSubjects(page);
  expect(await total(page)).toBe(before);
  await expect(pairRow(page, CODES[2])).toHaveCount(0);

  // And the same file name again once it is corrected: the input's value is
  // cleared after every upload, so choosing the file that was just refused
  // starts a new upload rather than doing nothing at all.
  await importProgramSubjects(page, csv(header, `0501,${CODES[2]},required`), name);
  await expect(page.getByText('นำเข้าสำเร็จ 1 รายการ')).toBeVisible();
  await expect.poll(() => pairRow(page, CODES[2]).count()).toBe(1);
});

test('row 9: past ten rows the list is paged, in one order and with no repeats', async ({
  page,
}) => {
  const header = headerOf(await downloadTemplate(page));

  // However many the rows above left behind, this takes the curriculum past
  // ten - the count is read rather than assumed, because every spec in this
  // suite shares one schema.
  const before = await total(page);
  const wanted = CODES.slice(3);
  await importProgramSubjects(
    page,
    csv(header, ...wanted.map(code => `0501,${code},required`)),
  );
  await expect.poll(() => total(page)).toBe(before + wanted.length);
  const counted = await total(page);
  expect(counted).toBeGreaterThan(10);
  const pages = Math.ceil(counted / 10);

  // A full page and no more, whatever the total is.
  const first = await listedCodes(page);
  expect(first).toHaveLength(10);
  await expect(page.getByText(`ทั้งหมด ${counted} รายการ · หน้า 1 จาก ${pages}`)).toBeVisible();

  await nextPage(page);
  const second = await listedCodes(page);
  await expect(page.getByText(`ทั้งหมด ${counted} รายการ · หน้า 2 จาก ${pages}`)).toBeVisible();
  expect(second).toHaveLength(counted - 10);

  // The two halves of one list rather than two overlapping reads of the same
  // one: no code appears twice, and the pages continue the sort rather than
  // each restarting it.
  expect(new Set([...first, ...second]).size).toBe(counted);
  expect([...first, ...second]).toEqual([...first, ...second].slice().sort());
});

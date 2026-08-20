'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { downloadTemplate, headerOf, csv, total } = require('../support/import-panel');
const {
  openSubjects,
  importSubjects,
  subjectRow,
} = require('../support/subjects-screen');
const {
  CELL,
  openProgramSubjects,
  pairRow,
  programFilter,
  programPicker,
  typePicker,
  statusPicker,
  cataloguePicker,
  offered,
  openAddForm,
  searchCatalogue,
  openEditor,
  save,
  startRemoval,
  confirmRemoval,
} = require('../support/program-subjects-screen');

/**
 * docs/acceptance/18-program-subjects.md — what a curriculum is made of, read
 * through the screen that makes it.
 *
 * The backend suite already proves what the routes answer. What only a browser
 * can show is the half these rows are about: that a committee member holding
 * one programme is told which rather than asked, that the subject is chosen out
 * of a catalogue the form searches rather than typed into a box that could name
 * anything, that both halves of the key are frozen once the pair exists, and
 * that a removal the server turns into a deactivation is drawn as a pairing
 * still there and closed rather than as one gone.
 *
 * `mode: 'serial'` because these rows write into the one curriculum they then
 * count, and because the pairing row 1 places is the row rows 2, 4, 5 and 6 act
 * on. Each still makes the state it asserts on rather than inheriting an
 * assertion.
 *
 * The catalogue this file needs is made in `beforeAll` rather than assumed.
 * `16a-subjects.spec.js` runs first against the same schema and leaves subjects
 * of its own behind, and a row that leaned on one of those would be a row whose
 * meaning depends on a file it never mentions.
 */
test.describe.configure({ mode: 'serial' });

/** The subject rows 1, 2, 4, 5 and 6 place, remove and place again. */
const PLACED = '01079811';

/** The subject row 10's second half retires, to show a retired one is not offered. */
const RETIRED = '01079812';

/** A subject of the neighbouring department — row 10's first half. */
const CROSS = '01019801';

/** The seeded pairing, the one with an Offering and marks hanging off it. */
const SEEDED = '01076105';

/**
 * The catalogue entries this file chooses from.
 *
 * Through the ข้อมูลรายวิชา screen's own import, as the acceptance document's
 * prerequisites say to: `dept.admin.05@` is the only account that reaches that
 * screen for department 05 since #61, and department 01's subject has to be
 * filed by the administrator who holds department 01.
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
        `${PLACED},วิศวกรรมหลักสูตรหนึ่ง,Curriculum Engineering One,3,05,,`,
        `${RETIRED},วิศวกรรมหลักสูตรสอง,Curriculum Engineering Two,3,05,,`,
      ),
    );
    await expect(page.getByText('นำเข้าสำเร็จ 2 รายการ')).toBeVisible();

    await context.clearCookies();
    await signIn(page, ACCOUNTS.departmentAdmin01);
    await openSubjects(page);
    await importSubjects(
      page,
      csv(header, `${CROSS},คณิตศาสตร์วิศวกรรมทดสอบ,Engineering Mathematics Test,3,01,,`),
    );
    await expect(page.getByText('นำเข้าสำเร็จ 1 รายการ')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('row 1: one programme is stated rather than asked, and it is the one the server takes', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);

  // The list says which curriculum is being read without offering a choice
  // there is none of - a กรรมการหลักสูตร holds exactly one.
  await expect(programFilter(page)).toHaveCount(0);
  await expect(page.getByText('0501 วิศวกรรมคอมพิวเตอร์', { exact: true })).toBeVisible();

  await openAddForm(page);

  // And the form's picker offers that one and has already chosen it. What can
  // be chosen is what the server will accept, so the form cannot build a
  // request that comes back refused.
  expect(await offered(programPicker(page))).toEqual(['', '0501']);
  await expect(programPicker(page)).toHaveValue('0501');
});

test('row 1: a subject chosen out of the catalogue appears in the curriculum', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);
  const before = await total(page);

  await openAddForm(page);
  await searchCatalogue(page, PLACED);
  await cataloguePicker(page).selectOption(PLACED);
  await typePicker(page).selectOption('required');
  await save(page);

  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();

  // Read off the reloaded list rather than off the form that was submitted:
  // บังคับ because that was chosen, and in use because a subject is placed in a
  // curriculum in order to be taught.
  await expect.poll(() => total(page)).toBe(before + 1);
  const row = pairRow(page, PLACED);
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('cell').nth(CELL.type)).toHaveText('วิชาบังคับ');
  await expect(row.getByRole('cell').nth(CELL.status)).toHaveText('ใช้งานอยู่');
});

test('row 2: the type changes afterwards', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);

  await openEditor(page, PLACED);
  await typePicker(page).selectOption('elective');
  await save(page);

  // Only the naming half of the row. That the badge changes colour is the
  // class the changed word carries, and #65 leaves what the screen draws to the
  // walker; what is asserted is that the table now reads the other type.
  await expect(pairRow(page, PLACED).getByRole('cell').nth(CELL.type)).toHaveText('วิชาเลือก');
});

test('row 2: neither half of the key can be edited', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);

  await openEditor(page, PLACED);

  // The grey the row describes is what the browser draws from these two
  // attributes; the attributes are the reason, and they are what is asserted.
  await expect(programPicker(page)).toBeDisabled();
  await expect(page.getByRole('textbox')).toBeDisabled();
  await expect(page.getByRole('textbox')).toHaveValue(new RegExp(`^${PLACED}`));

  // And the form says why, rather than leaving a person to guess that the two
  // boxes are broken.
  await expect(
    page.getByText('ย้ายรายวิชาข้ามหลักสูตรไม่ได้ ให้ลบออกแล้วเพิ่มในหลักสูตรใหม่'),
  ).toBeVisible();

  // The catalogue search is not drawn at all on an edit: there is nothing to
  // search for when the subject is fixed.
  await expect(cataloguePicker(page)).toHaveCount(0);
});

test('row 3: a code the catalogue does not hold cannot be chosen', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);

  await openAddForm(page);
  await searchCatalogue(page, '09999999');

  // Nothing to choose but the empty prompt, and a sentence saying where a
  // subject comes from. The server refuses the same code again if one is sent
  // anyway - that half is `backend/test/program-subjects.test.js`'s.
  expect(await offered(cataloguePicker(page))).toEqual(['']);
  await expect(
    page.getByText(
      'ไม่พบรายวิชาที่ตรงกับคำค้น หากยังไม่มีในคลังรายวิชา ต้องเพิ่มที่หน้าข้อมูลรายวิชาก่อน',
    ),
  ).toBeVisible();
});

test('row 4: the same subject cannot be placed in the same curriculum twice', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);
  const before = await total(page);

  await openAddForm(page);
  await searchCatalogue(page, PLACED);
  await cataloguePicker(page).selectOption(PLACED);
  await page.getByRole('button', { name: 'บันทึก' }).click();

  await expect(page.getByText(REFUSALS.duplicateProgramSubject)).toBeVisible();

  // And nothing was written. The refusal is the database's - the pair is the
  // primary key - so a second row would mean the key had stopped holding.
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect.poll(() => total(page)).toBe(before);
  await expect(pairRow(page, PLACED)).toHaveCount(1);
});

test('row 6: a removal asks first, and says what it is about to remove', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);
  const before = await total(page);

  await startRemoval(page, PLACED);

  // The question names the record in its own words - both halves of the key and
  // the subject's name - and says that a referenced pairing is closed rather
  // than deleted, which is the answer the next row gets.
  const dialog = page.getByText('ต้องการนำรายวิชา', { exact: false });
  await expect(dialog).toContainText(PLACED);
  await expect(dialog).toContainText('วิศวกรรมหลักสูตรหนึ่ง');
  await expect(dialog).toContainText('0501');
  await expect(dialog).toContainText('ปิดการใช้งานให้แทนการลบ');

  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect.poll(() => total(page)).toBe(before);
  await expect(pairRow(page, PLACED)).toHaveCount(1);
});

test('row 5: a pairing nothing points at is really removed', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);
  const before = await total(page);

  await startRemoval(page, PLACED);
  await confirmRemoval(page);

  await expect(page.getByText('นำรายวิชาออกจากหลักสูตรเรียบร้อยแล้ว')).toBeVisible();
  await expect.poll(() => total(page)).toBe(before - 1);
  await expect(pairRow(page, PLACED)).toHaveCount(0);
});

test('row 5: a pairing with marks under it is closed instead, and can be opened again', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);
  const before = await total(page);

  await startRemoval(page, SEEDED);
  await confirmRemoval(page);

  // Not "removed", and not a refusal either. The seed hangs an Offering, its
  // CLOs, the weighting scheme and every mark off this pair.
  await expect(
    page.getByText('ระบบจึงปิดการใช้งานแทนการลบ', { exact: false }),
  ).toBeVisible();

  // Still listed, closed. Counted as well as looked at, because a deactivation
  // that quietly dropped the row would leave the status assertion with nothing
  // to fail on.
  await expect.poll(() => total(page)).toBe(before);
  await expect(pairRow(page, SEEDED).getByRole('cell').nth(CELL.status)).toHaveText('ปิดใช้งาน');

  // And the way back, which is the only one there is: placing the subject again
  // would collide with the row that is still there.
  await openEditor(page, SEEDED);
  await statusPicker(page).selectOption('active');
  await save(page);
  await expect(pairRow(page, SEEDED).getByRole('cell').nth(CELL.status)).toHaveText('ใช้งานอยู่');
});

test('row 10: a subject of another department can be placed in this curriculum', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);

  await openAddForm(page);
  await searchCatalogue(page, CROSS);

  // Offered at all, which is the row: a computer engineering curriculum holds
  // mathematics and general education subjects owned by other departments, and
  // a catalogue narrowed to the programme's own department could not express
  // one. The subject was filed under department 01 in `beforeAll`.
  expect(await offered(cataloguePicker(page))).toEqual(['', CROSS]);

  await cataloguePicker(page).selectOption(CROSS);
  await save(page);

  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();
  await expect(pairRow(page, CROSS)).toHaveCount(1);
});

/**
 * Last in the file on purpose: it retires a subject, and puts it back. A
 * failure here cannot take rows with it that were already green.
 */
test('row 10: a subject the university has retired is not offered', async ({ page, browser }) => {
  // The catalogue is the department administrator's, not the committee's - so
  // retiring the subject happens in their browser, on their screen.
  const department = await browser.newContext();
  const theirs = await department.newPage();
  await signIn(theirs, ACCOUNTS.departmentAdmin05);
  await openSubjects(theirs);

  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);

  // Offered while it is open, so the absence below is the retirement and not a
  // search that never matched.
  await openAddForm(page);
  await searchCatalogue(page, RETIRED);
  expect(await offered(cataloguePicker(page))).toEqual(['', RETIRED]);

  try {
    await subjectRow(theirs, RETIRED).getByRole('button', { name: 'แก้ไข' }).click();
    await theirs.getByRole('checkbox', { name: 'เปิดใช้งาน' }).uncheck();
    await theirs.getByRole('button', { name: 'บันทึก' }).click();
    await expect(theirs.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();

    await searchCatalogue(page, `${RETIRED} `);
    await searchCatalogue(page, RETIRED);
    expect(await offered(cataloguePicker(page))).toEqual(['']);
  } finally {
    await subjectRow(theirs, RETIRED).getByRole('button', { name: 'แก้ไข' }).click();
    await theirs.getByRole('checkbox', { name: 'เปิดใช้งาน' }).check();
    await theirs.getByRole('button', { name: 'บันทึก' }).click();
    await expect(theirs.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();
    await department.close();
  }
});

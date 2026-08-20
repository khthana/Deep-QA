'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { downloadTemplate, headerOf, csv, total } = require('../support/import-panel');
const { openDepartments, departmentRow } = require('../support/departments-screen');
const {
  SUBJECTS,
  waitForList,
  openSubjects,
  importSubjects,
  subjectRow,
  departmentPicker,
  fillNewSubject,
  save,
} = require('../support/subjects-screen');

/**
 * docs/acceptance/16-subjects.md — the subject catalogue, read through the
 * screen that draws it.
 *
 * The backend suite already proves what the routes answer, including the
 * department confinement of #61. What only a browser can show is the half
 * these rows are actually about: that the form cannot even *offer* a
 * department the server would refuse, that a delete which the server turns
 * into a deactivation is drawn as a subject still there and closed rather than
 * as a subject gone, and that a department retired after the fact still shows
 * where its subjects live while refusing to take new ones — a disabled
 * `<option>` no API test can see.
 *
 * `mode: 'serial'` because these rows write into the one catalogue they then
 * count, and because the last row edits a subject an earlier row created. Each
 * still makes the state it asserts on rather than inheriting an assertion.
 */
test.describe.configure({ mode: 'serial' });

/** The subject row 1 adds, and rows 82 and 89 count around. */
const ADDED = {
  subject_id: '01076106',
  subject_name_th: 'โครงสร้างข้อมูลและอัลกอริทึม',
  subject_name_en: 'DATA STRUCTURES AND ALGORITHMS',
  credits: 3,
  department_id: '05',
  description_th: 'โครงสร้างข้อมูลพื้นฐานและการวิเคราะห์อัลกอริทึม',
  description_en: 'Fundamental data structures and algorithm analysis',
};

/** The subject the seed files under department 05, and everything that hangs off it. */
const SEEDED = '01076105';

/** The subject row 76 adds, in the neighbouring department. */
const CIVIL = {
  subject_id: '01016101',
  subject_name_th: 'กลศาสตร์วัสดุ',
  subject_name_en: 'MECHANICS OF MATERIALS',
  credits: 3,
  department_id: '01',
};

/** The values the department picker offers, blank option included. */
const offeredDepartments = page =>
  departmentPicker(page).locator('option').evaluateAll(options =>
    options.map(option => option.value),
  );

test('row 66: the department is chosen from what this account reaches, not typed', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openSubjects(page);
  await page.getByRole('button', { name: 'เพิ่มรายวิชา' }).click();

  // A control rather than a text box, which is the row in as many words: what
  // can be chosen is what the server will accept, so the form cannot build a
  // request that gets refused.
  await expect(departmentPicker(page)).toBeVisible();

  // And what it offers is the one department this account covers. Department
  // 01 exists — the seed creates it, and row 76 files a subject under it — so
  // its absence here is the confinement being drawn rather than an empty list.
  expect(await offeredDepartments(page)).toEqual(['', '05']);

  // Already chosen, because with one department to file under there is no
  // choice to make.
  await expect(departmentPicker(page)).toHaveValue('05');
});

test('row 65: a subject added with every box filled appears in the table', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openSubjects(page);

  await fillNewSubject(page, ADDED);
  await save(page);

  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();

  // The row as the table draws it: the credits that were typed, and a subject
  // that is open for use. Both are read off the reloaded list rather than off
  // the form that was just submitted.
  const row = subjectRow(page, ADDED.subject_id);
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('cell').nth(1)).toContainText(ADDED.subject_name_th);
  await expect(row.getByRole('cell').nth(1)).toContainText(ADDED.subject_name_en);
  await expect(row.getByRole('cell').nth(2)).toHaveText(String(ADDED.credits));
  await expect(row.getByRole('cell').nth(4)).toHaveText('ใช้งานอยู่');
});

test('row 92: the header names the catalogue being read', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openSubjects(page);

  // Only the naming half of the row. That the line is *text and not a control*
  // is a claim about what the screen draws, and #65 leaves drawn things to the
  // walker; what is asserted here is that the line says which department's
  // catalogue this is, which comes from `GET /api/departments/reachable`.
  await expect(
    page.getByText('05 วิศวกรรมคอมพิวเตอร์', { exact: true }),
  ).toBeVisible();
});

test('row 75: a faculty administrator is refused the catalogue itself', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);

  const [answer] = await Promise.all([waitForList(page), page.goto(SUBJECTS)]);

  // The half of the row that is enforced. The missing menu entry is a
  // convenience and a drawn thing; this is the rule, and it holds for an
  // account that reached the screen by typing its address.
  expect(answer.status()).toBe(403);
  await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();

  // And the screen is the catalogue screen, drawn and empty, rather than a
  // redirect somewhere else that would satisfy the line above by never having
  // asked.
  await expect(page.getByRole('heading', { name: 'ข้อมูลรายวิชา' })).toBeVisible();
  await expect(subjectRow(page, SEEDED)).toHaveCount(0);
});

test('rows 76 and 77: the neighbouring department files its own and sees only its own', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin01);
  await openSubjects(page);

  await fillNewSubject(page, CIVIL);
  // The same one-department picker as row 66, from the other side: this
  // account is offered 01 and never 05, so the two rows together say the list
  // is derived from the grant rather than fixed.
  expect(await offeredDepartments(page)).toEqual(['', '01']);
  await save(page);

  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();
  await expect(subjectRow(page, CIVIL.subject_id)).toHaveCount(1);

  // Criterion 3. The subject the seed files under department 05 is not here —
  // and the table is not empty, so the absence is the confinement rather than
  // a list that failed to load.
  await expect(subjectRow(page, SEEDED)).toHaveCount(0);
  await expect(subjectRow(page, ADDED.subject_id)).toHaveCount(0);
});

test('row 82: a subject something else refers to is closed rather than deleted', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openSubjects(page);

  const before = await total(page);

  await subjectRow(page, SEEDED).getByRole('button', { name: 'ลบ' }).click();
  await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'ลบรายวิชา' }).click(),
  ]);

  // What the person is told, which is the row's point: not "deleted", and not
  // a refusal either. The seed hangs a programme, a section and the outcome
  // weightings off this subject, so deleting it would take those with it.
  await expect(
    page.getByText('รายวิชานี้มีข้อมูลอื่นอ้างอิงอยู่ ระบบจึงปิดการใช้งานแทนการลบ', {
      exact: false,
    }),
  ).toBeVisible();

  // Still in the table, closed. Counted as well as looked at, because a
  // deactivation that quietly dropped the row would leave the status assertion
  // below with nothing to fail on.
  await expect.poll(() => total(page)).toBe(before);
  const row = subjectRow(page, SEEDED);
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('cell').nth(4)).toHaveText('ปิดใช้งาน');
});

test('row 89: a good file creates every row it holds', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openSubjects(page);

  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);
  const codes = ['01079901', '01079902', '01079903'];

  await importSubjects(
    page,
    csv(
      header,
      `${codes[0]},วิศวกรรมทดสอบหนึ่ง,Test Engineering One,3,05,,`,
      `${codes[1]},วิศวกรรมทดสอบสอง,Test Engineering Two,2,05,,`,
      // The optional description columns filled on one row, to prove the two
      // shapes go up in the same file.
      `${codes[2]},วิศวกรรมทดสอบสาม,Test Engineering Three,1,05,คำอธิบายไทย,English description`,
    ),
  );

  await expect(page.getByText('นำเข้าสำเร็จ 3 รายการ')).toBeVisible();
  await expect.poll(() => total(page)).toBe(before + 3);
  for (const code of codes) {
    await expect(subjectRow(page, code)).toHaveCount(1);
  }
});

/**
 * Last in the file on purpose: it retires a department every other row in this
 * suite depends on being open, and puts it back at the end. A failure here
 * cannot take rows with it that were already green.
 */
test('row 97: a department retired afterwards still says where its subjects live', async ({
  page,
  browser,
}) => {
  // The faculty administrator's own browser. Closing a department is still
  // their job — #61 narrowed the subject screen, not the department one.
  const faculty = await browser.newContext();
  const theirs = await faculty.newPage();
  await signIn(theirs, ACCOUNTS.facultyAdmin);
  await openDepartments(theirs);
  await departmentRow(theirs, '01').getByRole('button', { name: 'แก้ไข' }).click();
  await theirs.getByRole('checkbox', { name: 'เปิดใช้งาน' }).uncheck();
  await theirs.getByRole('button', { name: 'บันทึก' }).click();
  await expect(theirs.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();

  try {
    await signIn(page, ACCOUNTS.departmentAdmin01);
    await openSubjects(page);

    await subjectRow(page, CIVIL.subject_id).getByRole('button', { name: 'แก้ไข' }).click();

    // Where the subject lives, still shown, and shown as unchoosable. Dropping
    // the retired department from the list would leave the picker blank on a
    // subject that has a department, and the first save would move it.
    await expect(departmentPicker(page)).toHaveValue('01');
    const option = departmentPicker(page).locator('option[value="01"]');
    await expect(option).toHaveText(/ปิดใช้งาน/);
    // By attribute rather than `toBeDisabled`, which reports an `<option>`
    // carrying the attribute as enabled — the check it makes is for the
    // controls a person types into, and the option is not one.
    await expect(option).toHaveAttribute('disabled', '');

    // And the edit still saves, which is the second half of the row: a closed
    // department freezes what may be filed under it, not what is already there.
    await save(page);
    await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();

    // The other direction. A new subject has no department yet, so there is
    // nothing to keep the closed one in the list, and this account reaches no
    // other — the form offers nothing to file under.
    await page.getByRole('button', { name: 'เพิ่มรายวิชา' }).click();
    expect(await offeredDepartments(page)).toEqual(['']);
  } finally {
    // Put it back, whatever happened above: every other spec file in this
    // suite runs against the same schema and expects department 01 open.
    await departmentRow(theirs, '01').getByRole('button', { name: 'แก้ไข' }).click();
    await theirs.getByRole('checkbox', { name: 'เปิดใช้งาน' }).check();
    await theirs.getByRole('button', { name: 'บันทึก' }).click();
    await expect(theirs.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();
    await faculty.close();
  }
});

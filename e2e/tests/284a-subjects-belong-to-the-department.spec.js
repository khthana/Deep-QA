'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const {
  csv,
  downloadTemplate,
  headerOf,
  importCsv,
  reportTable,
  total,
} = require('../support/import-panel');
const { facultyContext, switchOff } = require('../support/retiring');
const { API, openSubjects, listTable } = require('../support/subjects-screen');
const { statedLabel } = require('../support/stated-label');

/**
 * #284 — a subject belongs to the Department Admin's own department.
 *
 * #282's answer for ข้อมูลหลักสูตร, given for ข้อมูลรายวิชา by the owner on
 * 19 พ.ย. 2569, two rows:
 *
 * 1. The table has no ภาควิชา column, the list no ภาควิชา filter (drawn since
 *    #61 as the one department's name), the form no ภาควิชา field and the
 *    import template no `department_id` column. A Department Admin holds one
 *    department, so every one of them said the same thing on every row. What
 *    is added is filed under the acting grant's department by the server.
 * 2. A retired own department refuses a new subject with the owner's
 *    sentence - #282's with รายวิชา for หลักสูตร.
 *
 * The Faculty Admin half of #282 has no row here: #61 took this screen off
 * that role in August, and `16a` row 75 holds it.
 *
 * Every row here was red against the code before #284 or has a mutant in
 * `mutation/284-subjects-belong-to-the-department.py` that makes it so; the
 * table of which kills which was written before the sweep (#255).
 */

/** Department 05: `deptadm05`'s one department. */
const DEPT_05 = '05';

/** Codes nothing in the seed carries, so finding one is finding this row's own. */
const CREATED = '02840001';
const REFUSED = '02840002';
/** The two rows of #285's file, which a mutant could let through. */
const FILED = ['02850001', '02850002'];

/** The owner's wording of 19 พ.ย. 2569, word for word. */
const RETIRED_SENTENCE = 'ภาควิชาของคุณถูกปิดใช้งาน จึงเพิ่มรายวิชาใหม่ไม่ได้';

/** The template's header as the owner's answer leaves it, written out (#16's reason). */
const TEMPLATE_HEADER =
  'subject_id,subject_name_th,subject_name_en,credits,description_th,description_en';

/**
 * A failed restore, remembered for the last hook rather than thrown from a
 * `finally`, which would replace the row's own error (#181).
 */
let cleanupFailure = null;

test.afterAll(() => {
  if (cleanupFailure) throw new Error(cleanupFailure);
});

/**
 * The subjects this file made, taken out over HTTP by the account that may
 * (#132). Below the seam, so a mutant in the frontend cannot stop it (#181).
 * A subject nothing points at is deleted, so 204; 404 is a subject never made.
 */
async function removeOverHttp(playwright, subjectId) {
  const owner = await playwright.request.newContext();
  try {
    const inn = await owner.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.departmentAdmin05, password: PASSWORD },
    });
    if (inn.status() !== 200) {
      cleanupFailure = `the owner of ${subjectId} could not sign in to remove it`;
      return;
    }
    const gone = await owner.delete(`${BACKEND_URL}${API}/${subjectId}`);
    if (![204, 404].includes(gone.status())) {
      cleanupFailure = `${subjectId} was answered ${gone.status()} when removed`;
    }
  } catch (error) {
    cleanupFailure = `${subjectId} could not be removed: ${error.message}`;
  } finally {
    await owner.dispose().catch(() => {});
  }
}

/** Fills the add form's required boxes - there is no department to choose. */
async function fillNew(page, subjectId, name) {
  await page.getByRole('button', { name: 'เพิ่มรายวิชา' }).click();
  await page.getByLabel('รหัสวิชา', { exact: true }).fill(subjectId);
  await page.getByLabel('ชื่อวิชา (ไทย)', { exact: true }).fill(name);
  await page.getByLabel('ชื่อวิชา (อังกฤษ)', { exact: true }).fill(`Subject ${subjectId}`);
  await page.getByLabel('หน่วยกิต', { exact: true }).fill('3');
}

/** Presses บันทึก and hands back the server's answer to the POST. */
async function saveNew(page) {
  const [answer] = await Promise.all([
    page.waitForResponse(
      response => new URL(response.url()).pathname === API && response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return answer;
}

test('row 1: the table, the list, the form and the template say nothing about a department, and what is added lands in the grant’s own', async ({
  page,
  playwright,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openSubjects(page);

  // The control first (#171): the header is drawn, with the column after which
  // ภาควิชา used to stand.
  const table = listTable(page);
  await expect(table.getByRole('columnheader', { name: 'หน่วยกิต' }), 'the header is drawn').toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'ภาควิชา' }), 'with no department column').toHaveCount(0);

  // The filter bar: the search box is drawn, and beside it there is neither a
  // ภาควิชา dropdown nor the statement of the one department that #61 drew in
  // its place (`support/stated-label.js`, which is the read `16a` row 92 made).
  await expect(page.getByRole('searchbox', { name: 'ค้นหารายวิชา' }), 'the filter bar is drawn').toBeVisible();
  await expect(page.getByRole('combobox', { name: 'ภาควิชา' }), 'with no department filter').toHaveCount(0);
  await expect(
    statedLabel(page, 'ภาควิชา', 'วิศวกรรมคอมพิวเตอร์'),
    'and no statement of the one department',
  ).toHaveCount(0);

  // The template, read the way a person gets it.
  const template = await downloadTemplate(page);
  expect(headerOf(template), 'the template carries no department column').toBe(TEMPLATE_HEADER);

  await page.getByRole('button', { name: 'เพิ่มรายวิชา' }).click();
  const code = page.getByLabel('รหัสวิชา', { exact: true });
  await expect(code, 'the add form is open').toBeVisible();
  // By role and name, for `subjects-screen.js`'s `statusField` reason: `Field`
  // wraps its control in the label, so a select's options are in its text.
  await expect(page.getByRole('combobox', { name: 'ภาควิชา' }), 'and has no department field').toHaveCount(0);
  await page.getByRole('button', { name: 'ยกเลิก' }).click();

  try {
    await fillNew(page, CREATED, 'รายวิชาของ #284');
    const created = await saveNew(page);
    expect(created.status(), 'the server took it').toBe(201);

    // The claim: filed under the department the grant holds, which nobody
    // typed or chose. Read off the answer, because the screen no longer
    // draws a department anywhere.
    const { subject } = await created.json();
    expect(subject.department_id, 'filed under the grant’s own department').toBe(DEPT_05);
  } finally {
    await removeOverHttp(playwright, CREATED);
  }
});

test('row 2: a retired own department refuses a new subject with the owner’s sentence', async ({
  page,
  playwright,
}) => {
  // The seed has no retired department, so the row retires `deptadm05`'s own
  // over HTTP and puts it back (#181) - the faculty administrator keeps the
  // departments screen, which is what may switch one off.
  const faculty = await facultyContext(playwright);
  const switchBackOn = await switchOff(faculty, `/api/departments/${DEPT_05}`, 'department', {
    onFailure: sentence => {
      cleanupFailure = cleanupFailure ?? sentence;
    },
  });

  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openSubjects(page);

    await fillNew(page, REFUSED, 'รายวิชาที่ภาคปิดแล้ว');
    const refused = await saveNew(page);
    expect(refused.status(), 'the server refuses it').toBe(403);

    // The owner's sentence, as text and not as a pattern (#231) - typed out
    // here rather than read from `REFUSALS`, because the wording is the claim:
    // read from the file the server speaks from, the expected value would move
    // with a mutant that puts the old sentence back (#104, `282a` row 3).
    await expect(
      page.getByRole('alert').filter({ hasText: RETIRED_SENTENCE }),
      'the screen says why, in the owner’s words',
    ).toBeVisible();
  } finally {
    await switchBackOn();
    // Not created, but taken out if a mutant let it through, so the next file
    // is not handed it (#132).
    await removeOverHttp(playwright, REFUSED);
  }
});

/**
 * #285 — the owner's answer of 19 พ.ย. 2569: a file sent under a retired own
 * department hears the sentence once, not once per line. Appended rather than
 * inserted, so no row number above moves (#97, #173).
 */
test('row 3: a file under a retired own department hears the owner’s sentence once, and writes nothing — #285', async ({
  page,
  playwright,
}) => {
  const faculty = await facultyContext(playwright);
  const switchBackOn = await switchOff(faculty, `/api/departments/${DEPT_05}`, 'department', {
    onFailure: sentence => {
      cleanupFailure = cleanupFailure ?? sentence;
    },
  });

  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openSubjects(page);
    const before = await total(page);

    // Two good rows: under the per-row report each would carry the sentence,
    // which is what the count below is for.
    const answer = await importCsv(page, {
      path: `${API}/import`,
      text: csv(TEMPLATE_HEADER, `${FILED[0]},รายวิชานำเข้าแรก,First imported,3,,`, `${FILED[1]},รายวิชานำเข้าที่สอง,Second imported,3,,`),
      name: 'subjects-under-a-retired-department.csv',
    });
    expect(answer.status(), 'the server refuses the file').toBe(400);

    // Visible first, as the settle point the count is read at (#50) - then the
    // claim, which a retrying read would also pass at one of two.
    const sentence = page.getByText(RETIRED_SENTENCE, { exact: true });
    await expect(sentence.first(), 'the screen says why, in the owner’s words').toBeVisible();
    expect(await sentence.count(), 'once, and not once per line').toBe(1);
    expect(await reportTable(page).count(), 'with no line named').toBe(0);
    await expect.poll(() => total(page), { message: 'and nothing was written' }).toBe(before);
  } finally {
    await switchBackOn();
    for (const id of FILED) await removeOverHttp(playwright, id);
  }
});

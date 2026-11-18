'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { menuLink } = require('../support/shell');
const { facultyContext, switchOff } = require('../support/retiring');
const { PROGRAMS, API, waitForList, openPrograms, listTable } = require('../support/programs-screen');

/**
 * #282 — a programme belongs to the Department Admin's own department.
 *
 * The owner's three answers of 18 พ.ย. 2569, each one a row:
 *
 * 1. The Faculty Admin is taken off the programmes screen - the menu entry and
 *    the server both. CONTEXT.md gives that role the department records and
 *    nothing under them.
 * 2. The table has no ภาควิชา column and the form no ภาควิชา field: a Department
 *    Admin holds one department, so both said the same thing on every row.
 * 3. A new programme is filed under the acting grant's department by the
 *    server, and a retired own department refuses it with the owner's sentence
 *    of the same day.
 *
 * Every row here was red against the code before #282 or has a mutant in
 * `mutation/282-programmes-belong-to-the-department.py` that makes it so; the
 * table of which kills which was written before the sweep (#255).
 */

/** Department 05: `deptadm05`'s one department, and where `0501` is filed. */
const DEPT_05 = '05';

/** A code nothing in the seed carries, so finding it is finding this row's own. */
const CREATED = 'T2821';
const REFUSED = 'T2822';

/** The owner's wording of 18 พ.ย. 2569, word for word. */
const RETIRED_SENTENCE = 'ภาควิชาของคุณถูกปิดใช้งาน จึงเพิ่มหลักสูตรใหม่ไม่ได้';

const DEPARTMENT_ADMIN_MENU = 'ข้อมูลภาควิชา';
const PROGRAMMES_MENU = 'ข้อมูลหลักสูตร';

/**
 * A failed restore, remembered for the last hook rather than thrown from a
 * `finally`, which would replace the row's own error (#181).
 */
let cleanupFailure = null;

test.afterAll(() => {
  if (cleanupFailure) throw new Error(cleanupFailure);
});

/**
 * The programmes this file made, taken out over HTTP by the account that may
 * (#132). Below the seam, so a mutant in the frontend cannot stop it (#181).
 */
async function removeOverHttp(playwright, programId) {
  const owner = await playwright.request.newContext();
  try {
    const inn = await owner.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.departmentAdmin05, password: PASSWORD },
    });
    if (inn.status() !== 200) {
      cleanupFailure = `the owner of ${programId} could not sign in to remove it`;
      return;
    }
    const gone = await owner.delete(`${BACKEND_URL}${API}/${programId}`);
    if (![204, 404].includes(gone.status())) {
      cleanupFailure = `${programId} was answered ${gone.status()} when removed`;
    }
  } catch (error) {
    cleanupFailure = `${programId} could not be removed: ${error.message}`;
  } finally {
    await owner.dispose().catch(() => {});
  }
}

test('row 1: the faculty administrator has no programmes in the menu, and the address is refused', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.facultyAdmin);

  // The control, seen green before the absence is read (#171): the group the
  // entry used to sit in is open and drawing its one remaining entry, so a
  // count of zero below is a menu without the entry and not a menu not drawn.
  await expect(menuLink(page, DEPARTMENT_ADMIN_MENU), 'the group is drawn and open').toBeVisible();
  await expect(menuLink(page, PROGRAMMES_MENU), 'and the programmes entry is not in it').toHaveCount(0);

  // The address typed by hand. `AppRoutes.js` guards no route by role, so the
  // screen is drawn and the server is what refuses (#49): the claim is the
  // refusal, read off the answer and off the screen.
  const [answer] = await Promise.all([waitForList(page), page.goto(PROGRAMS)]);
  expect(answer.status(), 'the server refuses the list').toBe(403);
  await expect(page.getByText(REFUSALS.forbidden), 'and the screen says so').toBeVisible();
});

test('row 2: the table and the form say nothing about a department, and what is added lands in the grant’s own', async ({
  page,
  playwright,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openPrograms(page);

  // The control first (#171): the header is drawn, with the column after which
  // ภาควิชา used to stand.
  const table = listTable(page);
  await expect(table.getByRole('columnheader', { name: 'ชื่อหลักสูตร' }), 'the header is drawn').toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'ภาควิชา' }), 'with no department column').toHaveCount(0);

  await page.getByRole('button', { name: 'เพิ่มหลักสูตร' }).click();
  const code = page.getByLabel('รหัสหลักสูตร', { exact: true });
  await expect(code, 'the add form is open').toBeVisible();
  // By role and name, for `233a`'s old reason: `Field` wraps its control in
  // the label, so a select's options would be in the label's text (#180).
  await expect(page.getByRole('combobox', { name: 'ภาควิชา' }), 'and has no department field').toHaveCount(0);

  try {
    await code.fill(CREATED);
    await page.getByLabel('ชื่อหลักสูตร (ไทย)', { exact: true }).fill('หลักสูตรของ #282');

    const [created] = await Promise.all([
      page.waitForResponse(
        response =>
          new URL(response.url()).pathname === API && response.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'บันทึก' }).click(),
    ]);
    expect(created.status(), 'the server took it').toBe(201);

    // The claim: filed under the department the grant holds, which nobody
    // typed or chose. Read off the answer, because the screen no longer
    // draws a department anywhere.
    const { program } = await created.json();
    expect(program.department_id, 'filed under the grant’s own department').toBe(DEPT_05);
  } finally {
    await removeOverHttp(playwright, CREATED);
  }
});

test('row 3: a retired own department refuses a new programme with the owner’s sentence', async ({
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
    await openPrograms(page);

    await page.getByRole('button', { name: 'เพิ่มหลักสูตร' }).click();
    await page.getByLabel('รหัสหลักสูตร', { exact: true }).fill(REFUSED);
    await page.getByLabel('ชื่อหลักสูตร (ไทย)', { exact: true }).fill('หลักสูตรที่ภาคปิดแล้ว');

    const [refused] = await Promise.all([
      page.waitForResponse(
        response =>
          new URL(response.url()).pathname === API && response.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'บันทึก' }).click(),
    ]);
    expect(refused.status(), 'the server refuses it').toBe(403);

    // The owner's sentence, as text and not as a pattern (#231) - and typed out
    // here rather than read from `REFUSALS`, because the wording is the claim:
    // read from the file the server speaks from, the expected value moved with
    // `282:s282oldsentence` and the row passed under it (measured 18 พ.ย. 2569,
    // the shared constant as premise of #104).
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

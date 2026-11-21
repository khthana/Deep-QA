'use strict';

const { test, expect } = require('@playwright/test');
const { DEPARTMENTS, PROGRAMS } = require('../../db/seed');
const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUsers } = require('../support/users-screen');
const { openEditor } = require('../support/grants-panel');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');

/**
 * #296 - the accounts form's department and programme are chosen by name.
 *
 * Until #296 they were two text boxes, `รหัสภาควิชา` and `รหัสหลักสูตร`, with
 * `05` and `0501` as placeholders: the one place on the screen where an
 * administrator typed a code. The owner answered on 20 November 2569 that both
 * become dropdowns, the programmes filtered by the department chosen; that
 * every account has a department except where the Central Admin leaves it
 * blank (21 November 2569, after being shown that this refuses a department
 * administrator the three seeded assessors' shape); and that a value the
 * account holds is shown as it is and never changed by nobody's choice.
 *
 * The options come from `GET /api/users/grantable`, which since #296 says
 * which department each programme sits under. *ไม่ระบุ* on the department is
 * offered exactly when that list offers the whole university, which is the
 * server's own condition for leaving it blank (`scopes === null`).
 *
 * The two server refusals the ticket adds are not reached from this screen:
 * the filter offers no programme outside the department, and the department is
 * `required` wherever it may not be blank. `users.test.js` §#296 holds both at
 * the HTTP seam, which is where a body that did not come from this form
 * arrives.
 *
 * The selects are found by role and name rather than by label: a label that
 * wraps a `<select>` reads as its own words plus every option (#180).
 */

const DEPARTMENT = DEPARTMENTS.find(entry => entry.id === '05');
const CIVIL = DEPARTMENTS.find(entry => entry.id === '01');
const PROGRAM = PROGRAMS.find(entry => entry.id === '0501');
const UNDER_05 = PROGRAMS.filter(entry => entry.department === DEPARTMENT.id).map(entry => entry.id);
const UNDER_01 = PROGRAMS.filter(entry => entry.department === CIVIL.id).map(entry => entry.id);

const UNSPECIFIED = 'ไม่ระบุ';
const ADD = 'เพิ่มผู้ใช้งาน';

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(() => db.end());

const departmentField = page => page.getByRole('combobox', { name: 'ภาควิชา', exact: true });
const programField = page => page.getByRole('combobox', { name: 'หลักสูตร', exact: true });
const values = field => field.locator('option').evaluateAll(options => options.map(o => o.value));

/** The account's place as the database holds it, read below the seam. */
async function placeOf(userId) {
  const { rows } = await db.query(
    'SELECT department_id, program_id FROM users WHERE user_id = $1',
    [userId],
  );
  return rows[0];
}

/** Presses บันทึก on an edit and waits for the PUT it sends. */
async function saveEdit(page, userId) {
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        new URL(response.url()).pathname === `/api/users/${userId}` &&
        response.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return answer;
}

test('row 1: a department administrator picks from their own units, by name', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await page.getByRole('button', { name: ADD }).click();

  // The claim first (#233): the department is chosen by name, out of what this
  // administrator reaches, and may not be left blank.
  await expect(departmentField(page).locator(`option[value="${DEPARTMENT.id}"]`)).toHaveText(
    DEPARTMENT.th,
  );
  expect(await values(departmentField(page))).toEqual(['', DEPARTMENT.id]);
  await expect(departmentField(page).locator('option[value=""]')).not.toHaveText(UNSPECIFIED);
  await expect(departmentField(page)).toHaveJSProperty('required', true);

  // The programme may be left out, and offers the programmes this reach holds.
  await expect(programField(page).locator(`option[value="${PROGRAM.id}"]`)).toHaveText(PROGRAM.th);
  await expect(programField(page).locator('option[value=""]')).toHaveText(UNSPECIFIED);
  expect(await values(programField(page))).toEqual(['', ...UNDER_05]);

  // And nothing on the form asks for a code by name any more.
  await expect(page.getByRole('textbox', { name: 'รหัสภาควิชา' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'รหัสหลักสูตร' })).toHaveCount(0);
});

test('row 2: the programmes follow the department the Central Admin chooses', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await page.getByRole('button', { name: ADD }).click();

  await expect(departmentField(page).locator('option[value=""]')).toHaveText(UNSPECIFIED);
  await expect(departmentField(page)).toHaveJSProperty('required', false);

  await departmentField(page).selectOption(CIVIL.id);
  await expect.poll(() => values(programField(page))).toEqual(['', ...UNDER_01]);

  // A programme chosen under one department does not survive a move to
  // another it is not under: it is cleared at the choice, not kept as a pair
  // the server would refuse.
  await programField(page).selectOption(UNDER_01[0]);
  await departmentField(page).selectOption(DEPARTMENT.id);
  await expect(programField(page)).toHaveValue('');
  await expect.poll(() => values(programField(page))).toEqual(['', ...UNDER_05]);
});

test('row 3: the Central Admin saves an assessor with no department untouched', async ({
  page,
}) => {
  const before = await placeOf(IDS.externalAssessor);
  expect(before, 'ext01 is the seeded shape').toEqual({
    department_id: null,
    program_id: PROGRAM.id,
  });

  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.externalAssessor);

  await expect(programField(page).locator(`option[value="${PROGRAM.id}"]`)).toHaveText(PROGRAM.th);
  await expect(departmentField(page)).toHaveValue('');
  await expect(programField(page)).toHaveValue(PROGRAM.id);

  const answer = await saveEdit(page, IDS.externalAssessor);
  expect(answer.status()).toBe(200);
  expect(await placeOf(IDS.externalAssessor)).toEqual(before);
});

test('row 4: a department administrator has to place that assessor before saving', async ({
  page,
}) => {
  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await openEditor(page, ACCOUNTS.externalAssessor);

    await expect(programField(page)).toHaveValue(PROGRAM.id);
    await expect(departmentField(page)).toHaveValue('');
    // The form refuses before the server would (#296's first rule): the field
    // is required and empty, so the browser does not send the form.
    expect(await departmentField(page).evaluate(field => field.validity.valueMissing)).toBe(true);

    await departmentField(page).selectOption(DEPARTMENT.id);
    // Choosing the department the programme is under keeps the programme.
    await expect(programField(page)).toHaveValue(PROGRAM.id);
    const answer = await saveEdit(page, IDS.externalAssessor);
    expect(answer.status()).toBe(200);
    expect(await placeOf(IDS.externalAssessor)).toEqual({
      department_id: DEPARTMENT.id,
      program_id: PROGRAM.id,
    });
  } finally {
    await db.query('UPDATE users SET department_id = NULL WHERE user_id = $1', [
      IDS.externalAssessor,
    ]);
  }
});

test('row 5: a held department the list no longer offers is shown, and kept', async ({
  page,
}) => {
  // A department switched off is left out of `grantable`, and an account can
  // still be filed under it. The account holds no name for it, so the option
  // reads the way a unit with no name reads (#294 rule 6).
  const { rowCount } = await db.query(
    'UPDATE departments SET is_active = false WHERE department_id = $1 AND is_active',
    [DEPARTMENT.id],
  );
  expect(rowCount, 'department 05 was active to switch off').toBe(1);
  try {
    const before = await placeOf(IDS.teacherOne);
    expect(before.department_id).toBe(DEPARTMENT.id);

    await signIn(page, ACCOUNTS.systemAdmin);
    await openUsers(page);
    await openEditor(page, ACCOUNTS.teacherOne);

    await expect(departmentField(page)).toHaveValue(DEPARTMENT.id);
    await expect(departmentField(page).locator(`option[value="${DEPARTMENT.id}"]`)).toHaveText(
      `ภาควิชา ${DEPARTMENT.id}`,
    );

    const answer = await saveEdit(page, IDS.teacherOne);
    expect(answer.status()).toBe(200);
    expect(await placeOf(IDS.teacherOne)).toEqual(before);
  } finally {
    await db.query('UPDATE departments SET is_active = true WHERE department_id = $1', [
      DEPARTMENT.id,
    ]);
  }
});

test('row 6: a held programme the department filter leaves out is still named', async ({
  page,
}) => {
  // A pair that does not match - which #299 says a programme moved to another
  // department leaves behind - filed below the seam. The filter offers only
  // civil's programmes, so 0501 is held but not offered, and its name has to
  // come from the whole list rather than from the filtered one (#296's third
  // answer). Saving it is refused, which `users.test.js` holds.
  const { rowCount } = await db.query(
    'UPDATE users SET department_id = $1 WHERE user_id = $2 AND department_id IS NULL',
    [CIVIL.id, IDS.externalAssessor],
  );
  expect(rowCount, 'ext01 had no department to replace').toBe(1);
  try {
    await signIn(page, ACCOUNTS.systemAdmin);
    await openUsers(page);
    await openEditor(page, ACCOUNTS.externalAssessor);

    await expect(departmentField(page)).toHaveValue(CIVIL.id);
    await expect(programField(page)).toHaveValue(PROGRAM.id);
    await expect(programField(page).locator(`option[value="${PROGRAM.id}"]`)).toHaveText(PROGRAM.th);
    expect(await values(programField(page))).toEqual(['', ...UNDER_01, PROGRAM.id]);
  } finally {
    await db.query('UPDATE users SET department_id = NULL WHERE user_id = $1', [
      IDS.externalAssessor,
    ]);
  }
});

test('row 7: a department with no Thai name is offered by its kind and code', async ({
  page,
}) => {
  // #294 rule 6 and #297's fallback, on this form's own options rather than on
  // the scope picker 297a reads. The name is taken away below the seam and put
  // back in `finally`.
  const { rows } = await db.query(
    `UPDATE departments d SET department_name_th = NULL
       FROM (SELECT department_id, department_name_th FROM departments
              WHERE department_id = $1 FOR UPDATE) old
      WHERE d.department_id = old.department_id
      RETURNING old.department_name_th AS was`,
    [DEPARTMENT.id],
  );
  expect(rows, 'department 05 exists to take the name from').toHaveLength(1);
  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await page.getByRole('button', { name: ADD }).click();

    await expect(departmentField(page).locator(`option[value="${DEPARTMENT.id}"]`)).toHaveText(
      `ภาควิชา ${DEPARTMENT.id}`,
    );
  } finally {
    await db.query('UPDATE departments SET department_name_th = $1 WHERE department_id = $2', [
      rows[0].was,
      DEPARTMENT.id,
    ]);
  }
});

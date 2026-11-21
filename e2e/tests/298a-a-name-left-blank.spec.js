'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const programs = require('../support/programs-screen');
const departments = require('../support/departments-screen');
const { openPlos } = require('../support/plos-screen');
const { JOINER } = require('../support/line-breaks');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');

/**
 * #298 - a name column that is empty.
 *
 * `program_name_en`, `revision_year` and `department_name_en` are written as
 * `NULL` by the application's own routes when their box is left blank
 * (`blankToNull`), and `program_name_th` and `department_name_th` may be null
 * in the schema although no route of the application writes one. #297 gave the
 * scope picker and the role picker a fallback; this file is the rest.
 *
 * Rows 1 and 2 are the defect the ticket put first: an edit of a programme or a
 * department whose English name was left blank is saved untouched, and the
 * form calls `.trim()` on the `null` it was seeded with. Both rows build their
 * record through the screen's own add form, because *the application writes
 * this itself* is what makes it a defect rather than a question about data
 * from elsewhere. Each reads, after บันทึก, that the form has gone - which it
 * does only once the save was answered - and counts the writes that left.
 *
 * Rows 3 to 5 are the owner's answer of 21 November 2569: a unit with no Thai
 * name is read by its kind word and its code (`หลักสูตร 0501`), and the removal
 * question, which already says the kind and the code (#294 rule 2), simply
 * leaves the missing name out. The name is taken away below the seam and put
 * back in `finally`, `297a`'s way.
 */

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(() => db.end());

const PROGRAM = 'T2981';
const DEPARTMENT = 'T2982';

/** The writes a save sends to one record, counted from the moment this is called. */
function writesTo(page, path) {
  const sent = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === path && request.method() === 'PUT') sent.push(request);
  });
  return sent;
}

/** Takes one unit's Thai name away below the seam for `body`, and puts it back. */
async function withoutItsName({ table, key, column, id }, body) {
  const { rows } = await db.query(
    `UPDATE ${table} t SET ${column} = NULL
       FROM (SELECT ${key}, ${column} FROM ${table} WHERE ${key} = $1 FOR UPDATE) old
      WHERE t.${key} = old.${key}
      RETURNING old.${column} AS was`,
    [id],
  );
  expect(rows, `${table} ${id} exists to take the name from`).toHaveLength(1);
  try {
    await body();
  } finally {
    await db.query(`UPDATE ${table} SET ${column} = $1 WHERE ${key} = $2`, [rows[0].was, id]);
  }
}

/**
 * What a dialog says, as a person reads it: the word joiners the line-break
 * rule puts between Thai letters (`line-breaks.js`) taken out, because they
 * are not something anybody reads.
 */
const said = dialog =>
  dialog.evaluate((element, joiner) => element.textContent.split(joiner).join(''), JOINER);

test('row 1: a programme added with no English name and no year saves untouched', async ({
  page,
}) => {
  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await programs.openPrograms(page);

    await page.getByRole('button', { name: 'เพิ่มหลักสูตร' }).click();
    await page.getByLabel('รหัสหลักสูตร', { exact: true }).fill(PROGRAM);
    await page.getByLabel('ชื่อหลักสูตร (ไทย)', { exact: true }).fill('หลักสูตรของ #298');
    await programs.save(page);
    const { rows } = await db.query(
      'SELECT program_name_en, revision_year FROM programs WHERE program_id = $1',
      [PROGRAM],
    );
    expect(rows[0], 'the application wrote the blanks as null').toEqual({
      program_name_en: null,
      revision_year: null,
    });

    await programs.openEditor(page, PROGRAM);
    const sent = writesTo(page, `${programs.API}/${PROGRAM}`);
    await page.getByRole('button', { name: 'บันทึก' }).click();

    await expect(page.getByRole('heading', { name: 'แก้ไขหลักสูตร' })).toBeHidden();
    expect(sent).toHaveLength(1);
  } finally {
    await db.query('DELETE FROM programs WHERE program_id = $1', [PROGRAM]);
  }
});

test('row 2: a department added with no English name saves untouched', async ({ page }) => {
  try {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await departments.openDepartments(page);

    await page.getByRole('button', { name: 'เพิ่มภาควิชา' }).click();
    await page.getByLabel('รหัสภาควิชา', { exact: true }).fill(DEPARTMENT);
    await page.getByLabel('ชื่อภาควิชา (ไทย)', { exact: true }).fill('ภาควิชาของ #298');
    await departments.save(page);
    const { rows } = await db.query(
      'SELECT department_name_en FROM departments WHERE department_id = $1',
      [DEPARTMENT],
    );
    expect(rows[0], 'the application wrote the blank as null').toEqual({
      department_name_en: null,
    });

    await departments.openEditor(page, DEPARTMENT);
    const sent = writesTo(page, `${departments.API}/${DEPARTMENT}`);
    await page.getByRole('button', { name: 'บันทึก' }).click();

    await expect(page.getByRole('heading', { name: 'แก้ไขภาควิชา' })).toBeHidden();
    expect(sent).toHaveLength(1);
  } finally {
    await db.query('DELETE FROM departments WHERE department_id = $1', [DEPARTMENT]);
  }
});

test('row 3: the removal question for a department with no Thai name leaves the name out', async ({
  page,
}) => {
  await withoutItsName(
    { table: 'departments', key: 'department_id', column: 'department_name_th', id: '05' },
    async () => {
      await signIn(page, ACCOUNTS.facultyAdmin);
      await departments.openDepartments(page);
      await departments.departmentRow(page, '05').getByRole('button', { name: 'ลบ' }).click();

      const question = page.getByRole('dialog');
      await expect(question).toBeVisible();
      await expect.poll(() => said(question)).toContain('ต้องการลบภาควิชา 05 ใช่หรือไม่');
      expect(await said(question)).not.toContain('null');
    },
  );
});

test('row 4: the removal question for a programme with no Thai name leaves the name out', async ({
  page,
}) => {
  await withoutItsName(
    { table: 'programs', key: 'program_id', column: 'program_name_th', id: '0501' },
    async () => {
      await signIn(page, ACCOUNTS.departmentAdmin05);
      await programs.openPrograms(page);
      await programs.programRow(page, '0501').getByRole('button', { name: 'ลบ' }).click();

      const question = page.getByRole('dialog');
      await expect(question).toBeVisible();
      await expect.poll(() => said(question)).toContain('ต้องการลบหลักสูตร 0501 ใช่หรือไม่');
      expect(await said(question)).not.toContain('null');
    },
  );
});

test('row 5: a programme with no Thai name is offered by its kind and code', async ({ page }) => {
  await withoutItsName(
    { table: 'programs', key: 'program_id', column: 'program_name_th', id: '0501' },
    async () => {
      await signIn(page, ACCOUNTS.departmentAdmin05);
      await openPlos(page);

      await expect(
        page.getByRole('combobox', { name: 'หลักสูตร', exact: true }).locator('option[value="0501"]'),
      ).toHaveText('หลักสูตร 0501');
    },
  );
});

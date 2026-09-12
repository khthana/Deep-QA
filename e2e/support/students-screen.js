'use strict';

const { expect } = require('@playwright/test');
const {
  BOM,
  downloadTemplate,
  headerOf,
  csv,
  importCsv,
  total,
  reportTable,
  reportedLines,
} = require('./import-panel');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('./env');

const STUDENT_DATA = '/main/student-data';

/**
 * Opens the register and waits for the list it is about to assert on - #132.
 *
 * The response arriving is not the list being drawn. React sets state after it
 * resolves, and a row whose next line reads the pager reads the screen's empty
 * state instead: `const before = await total(page)` returns 0, and a later
 * `expect.poll(...).toBe(before)` can never pass, because what is wrong is the
 * expected value and not the read. Two full runs found three rows that way, in
 * two files, all of them reading 0 - and each of those rows passes when its
 * file runs alone, which is what makes it look like leftovers and is not.
 *
 * So this waits for the number the response carried to be the number on the
 * screen. Anything narrower - a row being visible, a timeout - is the same
 * promise made again without keeping it. Waiting for the pager line to exist
 * would not do: the screen draws it as *0* while the read is in flight, which
 * is the value that was being believed.
 *
 * The body is read here and not a line later, and `enrolment-screen.js` says
 * why in full: Chromium keeps a response body only until the page navigates
 * away from it, so a helper that opens a screen and reads that screen's JSON
 * after doing anything else is racing the navigation. Between the response and
 * this read there is nothing.
 */
async function openRegister(page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === '/api/students' &&
        answer.request().method() === 'GET',
    ),
    page.goto(STUDENT_DATA),
  ]);
  expect(response.status()).toBe(200);
  const { total: carried } = await response.json();
  await expect(page.getByText(`ทั้งหมด ${carried} รายการ`)).toBeVisible();
  return response;
}

/** The register's own import, bound to the endpoint this screen posts to. */
const importStudents = (page, text, name = 'students.csv') =>
  importCsv(page, { path: '/api/students/import', text, name });

/**
 * Adds one student the way the screen does, and returns the server's own
 * answer.
 *
 * The answer is returned rather than asserted because both outcomes are rows
 * of the checklist: row 5 adds a student, row 11 adds one the register already
 * holds and must be refused. A helper that insisted on 200 could only walk one
 * of them.
 */
async function addStudent(page, { code, first, last, program }) {
  await page.getByRole('button', { name: 'เพิ่มนักศึกษา' }).click();
  await page.getByLabel('รหัสนักศึกษา').fill(code);
  await page.getByLabel('ชื่อ', { exact: true }).fill(first);
  await page.getByLabel('นามสกุล', { exact: true }).fill(last);
  await page.getByLabel('หลักสูตร').selectOption(program);

  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === '/api/students' &&
        answer.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return response;
}

/**
 * Moves the หลักสูตร filter and waits for the list it asks for, so what
 * follows reads the rows the filter chose rather than the ones still on screen
 * from before it moved.
 */
async function filterProgram(page, programId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === '/api/students' &&
        answer.request().method() === 'GET',
    ),
    page.getByLabel('หลักสูตร').selectOption(programId),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

/** The register's own row for one code, header row excluded. */
const registerRow = (page, code) =>
  page.locator('tbody tr').filter({ hasText: code });

/**
 * The screen's own list, told apart from the rejection report's table.
 *
 * `first()` because the list is drawn above the import panel, and a refused
 * import puts the report's table on the screen underneath it. The same shape
 * as every other screen's, so `support/pager.js` can be handed it.
 */
const listTable = page => page.locator('table').first();

/**
 * Every table that points at `student`, and the column that does it.
 *
 * Asked of the catalogue rather than written here, for the reason the rule in
 * CLAUDE.md gives: a list kept in a file is right until a migration adds the
 * fifth table, and then it is wrong silently. Four tables reference `student`
 * today and every one of them is `ON DELETE RESTRICT`, so a student with a row
 * in any of them cannot be removed until that row is - which is exactly the
 * case a hand-written `student_course` alone would miss.
 *
 * One level deep, and it says so: if a table that points at `student` is
 * itself pointed at under RESTRICT, the delete below fails with the database's
 * own message rather than quietly leaving the student behind.
 */
async function studentReferrers(db) {
  const { rows } = await db.query(
    `SELECT c.conname,
            c.conrelid::regclass::text AS table_name,
            array_agg(a.attname::text) AS columns
       FROM pg_constraint c
       JOIN LATERAL unnest(c.conkey) AS k(att) ON true
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.att
      WHERE c.contype = 'f'
        AND c.confrelid = format('%I.%I', $1::text, 'student')::regclass
      GROUP BY c.conname, c.conrelid`,
    [E2E_SCHEMA],
  );
  return rows.map(row => {
    if (!Array.isArray(row.columns) || row.columns.length !== 1) {
      throw new Error(
        `${row.table_name} points at student through ${JSON.stringify(row.columns)}, ` +
          `which is more than one column and more than this can undo`,
      );
    }
    return { table: row.table_name, column: row.columns[0] };
  });
}

/** Every student code the register holds, right now. */
async function registerCodes() {
  const db = createPool({ schema: E2E_SCHEMA });
  try {
    const { rows } = await db.query(`SELECT student_id FROM student`);
    return rows.map(row => row.student_id);
  } finally {
    await db.end();
  }
}

/**
 * Remembers the register, and hands back what puts it back - #132.
 *
 * A spec that adds students and does not undo it leaves them for every file
 * that runs after it, and more than one of those files reads the register's
 * totals. There is no route that deletes a student, for the reason #67
 * records, so the way back out is raw SQL against the schema this suite runs
 * on, the way `44a` already does it.
 *
 * **What it takes out is what appeared while the file ran, not a list of codes
 * written here.** A list would be right only for the rows that exist today: an
 * import spec deliberately offers codes it expects to be refused, and the day
 * one of those is accepted - which is the day somebody changes the importer,
 * and exactly when this matters - the list would still name the old five and
 * the new student would stay. Asking the register is the same move the report
 * at the end of the run makes, one file down.
 *
 * Called around the file rather than around a row: the rows of an import spec
 * build on each other, and a row that cleaned up after itself would take away
 * the register the next row is asserting about.
 *
 * ```js
 * let release;
 * test.beforeAll(async () => { release = await holdRegister(); });
 * test.afterAll(() => release());
 * ```
 *
 * It cannot put back a student a spec removed, and nothing needs it to: no
 * screen and no route deletes one. `workers: 1` is what makes "appeared while
 * the file ran" mean "this file did it".
 */
async function holdRegister() {
  const before = new Set(await registerCodes());

  return async function release() {
    const added = (await registerCodes()).filter(code => !before.has(code));
    if (added.length === 0) return added;

    const db = createPool({ schema: E2E_SCHEMA });
    try {
      // What points at the student goes first, and what points at it is asked,
      // not remembered. A student added through this screen has no rows in any
      // of them, which is why the first version got away with naming one.
      for (const { table, column } of await studentReferrers(db)) {
        await db.query(`DELETE FROM ${table} WHERE "${column}" = ANY($1)`, [added]);
      }
      await db.query(`DELETE FROM student WHERE student_id = ANY($1)`, [added]);
    } finally {
      await db.end();
    }
    return added;
  };
}

module.exports = {
  STUDENT_DATA,
  BOM,
  openRegister,
  downloadTemplate,
  headerOf,
  csv,
  importCsv: importStudents,
  total,
  reportTable,
  reportedLines,
  addStudent,
  holdRegister,
  filterProgram,
  registerRow,
  listTable,
};

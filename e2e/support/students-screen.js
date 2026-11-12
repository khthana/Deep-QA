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
const { untilDrawn } = require('./pager');
const { openAt } = require('./navigation');

const STUDENT_DATA = '/main/student-data';

/**
 * Opens the register and waits for the list it is about to assert on to be drawn.
 *
 * #132 found this one reading the pager as *0* in a full run and fixed it here
 * by hand; #135 moved the wait into `pager.js`'s `untilDrawn`, which carries the
 * reasoning, so every helper that waits for a paged list keeps one rule.
 */
async function openRegister(page) {
  const response = await openAt(page, STUDENT_DATA, fresh =>
    fresh.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === '/api/students' &&
        answer.request().method() === 'GET',
    ),
  );
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
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
 * Moves the หลักสูตร filter and waits for the list it asks for to be drawn, so
 * what follows reads the count the filter chose rather than the one still on
 * screen from before it moved.
 *
 * It waited for the answer alone until #135, and `17c` row 10 reads `total` on
 * the very next line. The rows are a different matter: `untilDrawn` cannot tell
 * a list of the same length from the one before it, so a row that reads rows
 * here asserts them, retrying.
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
  return untilDrawn(page, response);
}

/** The register's own row for one code, header row excluded. */
const registerRow = (page, code) =>
  page.locator('tbody tr').filter({ hasText: code });

/**
 * The screen's own list, told apart from the rejection report's table.
 *
 * Any table not inside a dialog: since #270 (12 November 2569) a refused
 * import's report is drawn in the import window, which is mounted *above* the
 * list, so the `first()` this used to be would have read the report while the
 * window was open. The same shape
 * as every other screen's, so `support/pager.js` can be handed it.
 */
const listTable = page =>
  page.locator('xpath=//table[not(ancestor::*[@role="dialog"])]').first();

/**
 * A crafted answer to an addition, shaped like the row `backend/routes/students.js`
 * returns from `POST /api/students` (`{ student }`, the columns of `RETURNED`).
 *
 * Until #272 the register's `save` read nothing out of its answer, so a row that
 * gated the write could answer it with `{}`. Since 12 November 2569 it reads the
 * stored row, to ask whether the student holds the search the list is on - the
 * full name and the admission year are derived by the server and never sent by
 * the form - and an empty body throws inside `save`, which a row about what the
 * save does next would read as that row's own failure. #146's Offerings rows
 * crafted a readable body for the same reason. The values matter only to a
 * search, and they are the server's own derivations so that a row that does
 * search reads what the server would have said.
 */
const answerOfAnAddition = ({ code, first, last, program }) => ({
  student: {
    student_id: code,
    first_name_th: first,
    last_name_th: last,
    full_name_th: `${first} ${last}`,
    department_id: null,
    program_id: program,
    admission_year: String(2500 + Number(code.slice(0, 2))),
    status: 'active',
  },
});

module.exports = {
  STUDENT_DATA,
  answerOfAnAddition,
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
  filterProgram,
  registerRow,
  listTable,
};

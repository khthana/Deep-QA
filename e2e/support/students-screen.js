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

const STUDENT_DATA = '/main/student-data';

/** Opens the register and waits for the list it is about to assert on. */
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
  filterProgram,
  registerRow,
};

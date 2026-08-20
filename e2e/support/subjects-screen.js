'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');

const SUBJECTS = '/main/subjects';
const API = '/api/subjects';

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/**
 * Opens the screen and waits for the list a passing row is about to assert on.
 *
 * The answer is returned rather than swallowed, because two of the rows here
 * read what the server sent as well as what the table drew. The refusal row
 * does not use this: it wants the same wait without the assertion, and calls
 * `waitForList` itself.
 */
async function openSubjects(page) {
  const [response] = await Promise.all([waitForList(page), page.goto(SUBJECTS)]);
  expect(response.status()).toBe(200);
  return response;
}

/** This screen's import, bound to the endpoint it posts to. */
const importSubjects = (page, text, name = 'subjects.csv') =>
  importCsv(page, { path: `${API}/import`, text, name });

/**
 * One row of the table, found by the code in its first cell.
 *
 * By cell rather than by `hasText`, for `departmentRow`'s reason: a code is a
 * prefix of nothing here, but the department column and the confirmation
 * dialog both repeat one, and a row matched loosely would make a count
 * assertion true by accident.
 */
const subjectRow = (page, subjectId) =>
  page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: subjectId, exact: true }) });

/**
 * The form's department picker.
 *
 * By role rather than by label, because `Field` wraps the whole control in the
 * `<label>`, so a name lookup would have to match every option's text as well
 * as the label's.
 */
const departmentPicker = page => page.getByRole('combobox');

/**
 * Opens the เพิ่มรายวิชา form and fills every box the acceptance row names.
 *
 * By label rather than by position, so a field added to the form later cannot
 * silently shift what this fills. The picker is the one exception, above.
 */
async function fillNewSubject(page, subject) {
  await page.getByRole('button', { name: 'เพิ่มรายวิชา' }).click();
  await page.getByLabel('รหัสวิชา', { exact: true }).fill(subject.subject_id);
  await departmentPicker(page).selectOption(subject.department_id);
  await page.getByLabel('ชื่อวิชา (ไทย)', { exact: true }).fill(subject.subject_name_th);
  await page.getByLabel('ชื่อวิชา (อังกฤษ)', { exact: true }).fill(subject.subject_name_en);
  await page.getByLabel('หน่วยกิต', { exact: true }).fill(String(subject.credits));
  if (subject.description_th !== undefined) {
    await page
      .getByLabel('คำอธิบายรายวิชา (ไทย)', { exact: true })
      .fill(subject.description_th);
  }
  if (subject.description_en !== undefined) {
    await page
      .getByLabel('คำอธิบายรายวิชา (อังกฤษ)', { exact: true })
      .fill(subject.description_en);
  }
}

/** Presses *บันทึก* and waits for the list the save reloads. */
async function save(page) {
  const [reloaded] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return reloaded;
}

module.exports = {
  SUBJECTS,
  API,
  waitForList,
  openSubjects,
  importSubjects,
  subjectRow,
  departmentPicker,
  fillNewSubject,
  save,
};

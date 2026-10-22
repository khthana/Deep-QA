'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');
const { untilDrawn } = require('./pager');
const { openAt } = require('./navigation');

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
 * Opens the screen and waits for the list a passing row is about to assert on to
 * be drawn.
 *
 * The answer is returned rather than swallowed, because two of the rows here
 * read what the server sent as well as what the table drew. The refusal row
 * does not use this: it wants the same wait without the assertion, and calls
 * `waitForList` itself.
 */
async function openSubjects(page) {
  const response = await openAt(page, SUBJECTS, waitForList);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
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
 * By role **and name** since #180, which put a second combobox on this form -
 * the status field, a checkbox until then - and made every read through this
 * locator a strict-mode violation. It was unfiltered because `Field` wraps the
 * whole control in the `<label>`, which is true of `getByLabel` and not of the
 * name here: a wrapping label's text content carries the `<option>`s with it,
 * while the accessible name is the label's own words. Measured on #180's first
 * run - the snapshot printed `combobox "สถานะ"` for a label whose text was
 * `สถานะใช้งานอยู่ปิดใช้งาน`.
 */
const departmentPicker = page => page.getByRole('combobox', { name: 'ภาควิชา' });

/**
 * The form's status control, a `select` since #180.
 *
 * Here rather than in a spec because two files press it - `16a` row 97 and
 * `18a` row 10 - and a fixture a second file needs is shared (#171): no row's
 * claim lives in it, only the situation. `16-subjects.md`'s own rows about the
 * field's shape and wording are hand-walked, which is why there is no mutant
 * for this form's options in `180-the-status-field-shape.py`.
 *
 * By the **role and name** for `departmentPicker`'s reason, above.
 */
const statusField = page => page.getByRole('combobox', { name: 'สถานะ' });

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

/**
 * The screen's own list, told apart from the rejection report's table.
 *
 * `first()` because the list is drawn above the import panel, and a refused
 * import puts the report's table on the screen underneath it.
 */
const listTable = page => page.locator('table').first();

module.exports = {
  SUBJECTS,
  API,
  waitForList,
  openSubjects,
  importSubjects,
  subjectRow,
  departmentPicker,
  statusField,
  fillNewSubject,
  save,
  listTable,
};

'use strict';

const { expect } = require('@playwright/test');

/**
 * ข้อมูล Rubric กลาง — #21, as a browser reaches it.
 *
 * Two things make these helpers different from #19's, and they are the two the
 * route file names.
 *
 * *There is a pager.* A rubric list is flat, so it pages at ten like every
 * other master-data screen, and a row that wants the eleventh rubric has to
 * walk to it. `e2e/support/pager.js` does the walking; `table` below is the
 * table it needs to know when the screen has finished drawing.
 *
 * *A code is an identifier, and here that is the whole point.* `rubric_code` is
 * UNIQUE across the institution, so unlike #19's helpers nothing here has to
 * narrow the list to one curriculum before a code names one row. `filterTo` is
 * still the control an administrator uses to narrow, but a code found without
 * it is not ambiguous.
 *
 * The pickers are located by an option only each of them has rather than by
 * their labels, for `program-subjects-screen`'s reason: `Field` wraps the
 * control inside the `<label>`, so a select's accessible name is its label
 * *and* every option's text.
 */

const RUBRICS = '/main/rubrics';
const API = '/api/rubrics';

/** The list's table — what `pager.js` reads rows and settledness from. */
const table = page => page.locator('table');

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer => new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/** Opens the screen and asserts the list a passing row is about to read. */
async function openRubrics(page) {
  const [response] = await Promise.all([waitForList(page), page.goto(RUBRICS)]);
  expect(response.status()).toBe(200);
  return response;
}

/**
 * One row of the table, found by the code in its first cell.
 *
 * Scoped to the table so the confirmation dialog, which repeats a code in a
 * sentence, cannot be matched instead. The lookahead stops `RUB-1` from
 * matching `RUB-11`, which on a seed numbered to eleven is not hypothetical.
 */
const rubricRow = (page, code) =>
  page
    .locator('table tbody tr')
    .filter({ has: page.locator('td:first-child', { hasText: new RegExp(`^${code}(?![\\w-])`) }) });

/** The form's curriculum picker — the only select offering a curriculum code. */
const programPicker = page =>
  page.getByRole('combobox').filter({ has: page.locator('option[value="0501"]') });

/** The list's own curriculum filter, drawn only when more than one is reached. */
const programFilter = page =>
  page.getByRole('combobox').filter({ has: page.locator('option[value=""]') });

/** Opens *เพิ่ม Rubric*. */
const openAddForm = page => page.getByRole('button', { name: 'เพิ่ม Rubric', exact: true }).click();

/**
 * Opens the editor on one row and waits for the rubric to be read back.
 *
 * The path is matched whole rather than by its start: `${API}/programs` is
 * fetched when the screen mounts, and a prefix would let that answer stand in
 * for this one if it were still in flight when the แก้ไข click landed.
 */
async function openEditor(page, code) {
  const reading = new RegExp(`^${API}/[0-9]+$`);
  await Promise.all([
    page.waitForResponse(
      answer => reading.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
    ),
    rubricRow(page, code).getByRole('button', { name: 'แก้ไข' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'แก้ไข Rubric' })).toBeVisible();
}

/** Fills the add form and presses บันทึก, waiting for the list the save reloads. */
async function addRubric(page, { program, code, th, en, order }) {
  await openAddForm(page);
  if (program) await programPicker(page).selectOption(program);
  await page.getByPlaceholder(/เช่น RUB-/).fill(code);
  await page.getByPlaceholder('เช่น การนำเสนอผลงาน').fill(th);
  await page.getByPlaceholder('เช่น Presentation').fill(en);
  await page.locator('input[type="number"]').fill(String(order));
  return save(page);
}

/**
 * Presses *บันทึก*.
 *
 * A save that the server refuses reloads nothing, so the wait is on the save's
 * own request rather than on the list that follows a successful one - a helper
 * that waited for the list would hang on exactly the rows about refusals.
 */
async function save(page) {
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        new URL(response.url()).pathname.startsWith(API) &&
        ['POST', 'PUT'].includes(response.request().method()),
    ),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return answer;
}

/** Presses *ลบ* on a row; the dialog is left open for the caller to answer. */
const startRemoval = (page, code) =>
  rubricRow(page, code).getByRole('button', { name: 'ลบ', exact: true }).click();

/** Answers the removal dialog. */
const confirmRemoval = page =>
  page.getByRole('button', { name: 'ลบ Rubric', exact: true }).click();

/** The codes the table is showing, in the order it draws them. */
const listedCodes = page =>
  page
    .locator('table tbody tr td:first-child')
    .allInnerTexts()
    .then(cells => cells.map(cell => cell.trim()));

/** Narrows the list to one curriculum through the screen's own filter. */
async function filterTo(page, programId) {
  await Promise.all([waitForList(page), programFilter(page).selectOption(programId)]);
}

/** The link one row offers into its criteria — the fifth criterion's way in. */
const criteriaLink = (page, code) => rubricRow(page, code).getByRole('link');

module.exports = {
  RUBRICS,
  API,
  table,
  waitForList,
  openRubrics,
  rubricRow,
  programPicker,
  programFilter,
  openAddForm,
  openEditor,
  addRubric,
  save,
  startRemoval,
  confirmRemoval,
  listedCodes,
  filterTo,
  criteriaLink,
};

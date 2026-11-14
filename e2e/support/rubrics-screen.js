'use strict';

const { expect } = require('@playwright/test');
const { BACKEND_URL } = require('./env');
const { untilDrawn } = require('./pager');
const { openAt } = require('./navigation');

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
 * still the control an account holding two curricula uses to move between
 * them, but a code found without it is not ambiguous.
 *
 * ## Since #276 the add and edit forms are rows of the table
 *
 * The owner's answer of 14 พ.ย. 2569 drew them the delivered screen's way, so
 * the helpers that open them wait for a row rather than for a heading, and the
 * row being changed has inputs where its cells had text: `rubricRow` cannot
 * find it while it is open, `editRow` does. The form's curriculum picker went
 * with the form - a new rubric is written into the curriculum the list shows -
 * so `programPicker` is gone, and `program` handed to `addRubric` moves the
 * list there first.
 *
 * The list's picker is located by an option it has rather than by its label,
 * for `program-subjects-screen`'s reason: the `<label>` wraps the control, so
 * its accessible name is its label *and* every option's text. Until #276 the
 * option was *ทุกหลักสูตร*'s empty value, which the picker no longer offers.
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

/** Opens the screen and asserts the list a passing row is about to read, once it is drawn. */
async function openRubrics(page) {
  const response = await openAt(page, RUBRICS, waitForList);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
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

/** The list's own curriculum picker, drawn only when more than one is reached. */
const programFilter = page =>
  page.getByRole('combobox').filter({ has: page.locator('option[value="0501"]') });

/**
 * The row the open form is - the add row or the edit row, whichever is drawn.
 *
 * Found by its field rather than by a cell's text, because the code it holds is
 * a value and not text. At most one is open at a time.
 */
const editRow = page =>
  page.locator('table tbody tr').filter({ has: page.getByRole('textbox', { name: 'รหัส Rubric' }) });

/** Opens *เพิ่ม Rubric*, and waits for the add row. */
async function openAddForm(page) {
  await page.getByRole('button', { name: 'เพิ่ม Rubric', exact: true }).click();
  await expect(editRow(page)).toHaveCount(1);
}

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
  await expect(page.getByRole('textbox', { name: 'รหัส Rubric' })).toHaveValue(code);
}

/**
 * Fills the add row and presses บันทึก, waiting for the save's own answer.
 *
 * `program`, where given, moves the list to that curriculum first, a new
 * rubric being written into the one the list shows (#276).
 */
async function addRubric(page, { program, code, th, en, order }) {
  if (program) await filterTo(page, program);
  await openAddForm(page);
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

/**
 * Removes a rubric over HTTP, for a teardown rather than for a claim (#235).
 *
 * Below the seam the browser rows are about, so it lands while a mutant has the
 * frontend broken, and it cannot be stopped by a dialog a failed row left open
 * (#181). It asserts nothing and hands the answer back: whether a teardown that
 * was refused should fail the file is the caller's to decide, in a hook that
 * cannot speak over the row that has just failed.
 */
const clearRubric = (page, rubricId) =>
  page.request.delete(`${BACKEND_URL}${API}/${rubricId}`);

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

/**
 * Opens the screen on one named curriculum and hands back that list's answer.
 *
 * Since #276 (14 พ.ย. 2569) the list opens on the first curriculum in reach and
 * has no *every curriculum* option, so a row that needs the rubrics of one
 * curriculum cannot take whatever the screen started on: a spec that makes
 * curricula of its own in the same department moves which one is first - 140a's
 * did, and its rows opened on an empty list. The filter is moved only where the
 * screen did not already start there, because choosing the value a select
 * already holds asks for nothing.
 */
async function openRubricsOn(page, programId) {
  const opened = await openRubrics(page);
  if (new URL(opened.url()).searchParams.get('program_id') === programId) return opened;
  const [answer] = await Promise.all([waitForList(page), programFilter(page).selectOption(programId)]);
  expect(answer.status()).toBe(200);
  return untilDrawn(page, answer);
}

/**
 * The eye one row offers into its criteria — the fifth criterion's way in, a
 * link since #273 and in ดำเนินการ since #276.
 */
const criteriaLink = (page, code) =>
  rubricRow(page, code).getByRole('link', { name: 'ดูเกณฑ์การให้คะแนน' });

module.exports = {
  RUBRICS,
  API,
  openRubricsOn,
  table,
  waitForList,
  openRubrics,
  rubricRow,
  editRow,
  programFilter,
  openAddForm,
  openEditor,
  addRubric,
  save,
  startRemoval,
  confirmRemoval,
  clearRubric,
  listedCodes,
  filterTo,
  criteriaLink,
};

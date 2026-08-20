'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');

/**
 * รายวิชาในหลักสูตร — #18, as a browser reaches it.
 *
 * Two things about this screen make its helpers different from #16's and they
 * are the same two the route file names. The key is a *pair*, so a row is found
 * by its subject code but named by both halves, and the form's programme half
 * is a control on an add and a frozen box on an edit. And the subject is chosen
 * out of a searched catalogue rather than typed, so every helper that fills the
 * add form has to wait for the search to have answered before there is anything
 * to choose.
 *
 * The pickers are located by an option only each of them has rather than by
 * their labels. `Field` wraps the control inside the `<label>`, so a select's
 * accessible name is its label *and* every option's text and the hint under it
 * — a name lookup would be matching the contents of the thing it is trying to
 * find. `option[value=…]` is stable and says which picker is meant.
 */

const PROGRAM_SUBJECTS = '/main/course-in-program';
const API = '/api/program-subjects';
const CATALOGUE_API = '/api/program-subjects/catalogue';

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/** Waits for the catalogue search the form makes as it is typed into. */
function waitForCatalogue(page) {
  return page.waitForResponse(
    answer => new URL(answer.url()).pathname === CATALOGUE_API,
  );
}

/** Opens the screen and asserts the list a passing row is about to read. */
async function openProgramSubjects(page) {
  const [response] = await Promise.all([
    waitForList(page),
    page.goto(PROGRAM_SUBJECTS),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

/** This screen's import, bound to the endpoint it posts to. */
const importProgramSubjects = (page, text, name = 'program-subjects.csv') =>
  importCsv(page, { path: `${API}/import`, text, name });

/**
 * One row of the table, found by the code in its first cell.
 *
 * By cell rather than by `hasText`, for `subjectRow`'s reason: the removal
 * dialog repeats a code in a sentence, and a row matched loosely would make a
 * count assertion true by accident.
 */
const pairRow = (page, subjectId) =>
  page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: subjectId, exact: true }) });

/** The columns, by what the table's header calls them. */
const CELL = { code: 0, name: 1, credits: 2, type: 3, program: 4, status: 5 };

/** The form's programme picker — the only select offering a programme code. */
const programPicker = page =>
  page.getByRole('combobox').filter({ has: page.locator('option[value="0501"]') });

/** The list's own programme filter, drawn only when more than one is reached. */
const programFilter = page =>
  page.getByRole('combobox').filter({ has: page.locator('option[value=""]') });

/** The form's บังคับ/เลือก picker. */
const typePicker = page =>
  page.getByRole('combobox').filter({ has: page.locator('option[value="required"]') });

/** The edit form's status picker, which is the way back from a deactivation. */
const statusPicker = page =>
  page.getByRole('combobox').filter({ has: page.locator('option[value="active"]') });

/**
 * The add form's catalogue list.
 *
 * A `<select size={6}>`, which is a listbox rather than a combobox — that is
 * what tells it apart from the three pickers above without naming a class.
 */
const cataloguePicker = page => page.getByRole('listbox');

/** The values a picker offers, in the order it offers them. */
const offered = picker =>
  picker.locator('option').evaluateAll(options => options.map(option => option.value));

/** Opens *เพิ่มรายวิชาเข้าหลักสูตร* and waits for the catalogue's first answer. */
async function openAddForm(page) {
  await Promise.all([
    waitForCatalogue(page),
    page.getByRole('button', { name: 'เพิ่มรายวิชาเข้าหลักสูตร' }).click(),
  ]);
}

/** Types into the catalogue box and waits for the answer that search produces. */
async function searchCatalogue(page, term) {
  await Promise.all([
    waitForCatalogue(page),
    page.getByPlaceholder(/เช่น 01076105/).fill(term),
  ]);
}

/** Opens the editor on one row and waits for the pair to be read back. */
async function openEditor(page, subjectId) {
  await Promise.all([
    page.waitForResponse(answer =>
      new URL(answer.url()).pathname.startsWith(`${API}/`) &&
      answer.request().method() === 'GET'),
    pairRow(page, subjectId).getByRole('button', { name: 'แก้ไข' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'แก้ไขรายวิชาในหลักสูตร' })).toBeVisible();
}

/** Presses *บันทึก* and waits for the list the save reloads. */
async function save(page) {
  const [reloaded] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return reloaded;
}

/** Presses *นำออก* on a row; the dialog is left open for the caller to answer. */
const startRemoval = (page, subjectId) =>
  pairRow(page, subjectId).getByRole('button', { name: 'นำออก' }).click();

/** Answers the removal dialog and waits for the list it reloads. */
async function confirmRemoval(page) {
  const [reloaded] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'นำออกจากหลักสูตร' }).click(),
  ]);
  return reloaded;
}

/**
 * The subject codes the table is showing, in the order it draws them.
 *
 * Scoped to the list's own table by a column only it has: once an import has
 * been refused there are two tables on the screen, and the report's first
 * column is line numbers.
 */
const listedCodes = page =>
  page
    .locator('table')
    .filter({ hasText: 'หน่วยกิต' })
    .locator('tbody tr td:first-child')
    .allInnerTexts();

/**
 * Narrows the list to one curriculum through the screen's own filter.
 *
 * Needed rather than convenient: an administrator reaches every curriculum
 * under them and the list is ten to a page in `program_id, subject_id` order,
 * so a row of the second curriculum is not on the first page.
 */
async function filterTo(page, programId) {
  await Promise.all([
    waitForList(page),
    programFilter(page).selectOption(programId),
  ]);
}

/** Steps to the next page and waits for the rows it fetches. */
async function nextPage(page) {
  await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'ถัดไป' }).click(),
  ]);
}

module.exports = {
  PROGRAM_SUBJECTS,
  API,
  CATALOGUE_API,
  CELL,
  waitForList,
  waitForCatalogue,
  openProgramSubjects,
  importProgramSubjects,
  pairRow,
  programPicker,
  programFilter,
  typePicker,
  statusPicker,
  cataloguePicker,
  offered,
  openAddForm,
  searchCatalogue,
  openEditor,
  save,
  startRemoval,
  confirmRemoval,
  listedCodes,
  filterTo,
  nextPage,
};

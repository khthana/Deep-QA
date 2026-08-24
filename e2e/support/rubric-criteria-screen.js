'use strict';

const { expect } = require('@playwright/test');

/**
 * เกณฑ์การให้คะแนนของ Rubric — #22, as a browser reaches it.
 *
 * Three things make these helpers different from #21's, and each of them is a
 * property of the screen rather than a preference.
 *
 * *There is no pager.* The list does not page, so nothing here walks to a
 * second page and `settled` has no total to wait on — a row waits for the
 * screen's own list request instead.
 *
 * *A row is found by its Thai name.* A criterion has no code; its name is the
 * only thing a person recognises it by, and it is what the first cell holds.
 * The names these rows make are therefore distinctive on purpose.
 *
 * *The address is the rubric.* Every request this screen makes is under
 * `/api/rubrics/:id/criteria`, and the id is not known until a rubric has been
 * made — so `criteriaPathOf` builds the matchers from the id the browser
 * actually landed on rather than from a constant.
 */

const RUBRICS = '/main/rubrics';

/** The list's table. */
const table = page => page.locator('table');

/** `/api/rubrics/:id/criteria`, for whatever rubric the page is on. */
const criteriaPath = /^\/api\/rubrics\/[0-9]+\/criteria$/;

/** `/api/rubrics/:id/criteria/:id`, which the editor reads one criterion from. */
const criterionPath = /^\/api\/rubrics\/[0-9]+\/criteria\/[0-9]+$/;

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      criteriaPath.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );
}

/**
 * Opens one rubric's criteria the way a person does — from #21's list, through
 * the link that row offers.
 *
 * Going straight to the address would test the same route and skip the join
 * between the two tickets, which is the one thing about this screen that only a
 * browser can show.
 */
async function openCriteriaVia(page, rubricRow) {
  const [response] = await Promise.all([waitForList(page), rubricRow.getByRole('link').click()]);
  expect(response.status()).toBe(200);
  return response;
}

/** Opens the screen by address, for the rows about somebody who typed one. */
async function openCriteriaAt(page, rubricId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === `/api/rubrics/${rubricId}/criteria` &&
        answer.request().method() === 'GET',
    ),
    page.goto(`${RUBRICS}/${rubricId}/criteria`),
  ]);
  return response;
}

/**
 * One row of the table, found by the Thai name in its first cell.
 *
 * Scoped to the table so the confirmation dialog, which repeats the name in a
 * sentence, cannot be matched instead.
 */
const criterionRow = (page, nameTh) =>
  page
    .locator('table tbody tr')
    .filter({ has: page.locator('td:first-child', { hasText: nameTh }) });

/** Opens *เพิ่มเกณฑ์*. */
const openAddForm = page => page.getByRole('button', { name: 'เพิ่มเกณฑ์', exact: true }).click();

/** Opens the editor on one row and waits for the criterion to be read back. */
async function openEditor(page, nameTh) {
  await Promise.all([
    page.waitForResponse(
      answer =>
        criterionPath.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
    ),
    criterionRow(page, nameTh).getByRole('button', { name: 'แก้ไข' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'แก้ไขเกณฑ์การให้คะแนน' })).toBeVisible();
}

/** The four band boxes, highest first, as the form draws them. */
const bandBoxes = page => page.locator('textarea');

/** Fills the open form. Every field, because every field is required. */
async function fillCriterion(page, { th, en, weight, order, bands }) {
  await page.getByPlaceholder('เช่น ความถูกต้องของเนื้อหา').fill(th);
  await page.getByPlaceholder('เช่น Accuracy of content').fill(en);
  const numbers = page.locator('input[type="number"]');
  await numbers.nth(0).fill(String(weight));
  await numbers.nth(1).fill(String(order));
  for (let index = 0; index < bands.length; index += 1) {
    await bandBoxes(page).nth(index).fill(bands[index]);
  }
}

/**
 * Presses *บันทึก*.
 *
 * The wait is on the save's own request rather than on the list that follows a
 * successful one, for #21's reason: a save the server refuses reloads nothing,
 * and a helper that waited for the list would hang on exactly the rows about
 * refusals.
 */
async function save(page) {
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        new URL(response.url()).pathname.startsWith('/api/rubrics/') &&
        ['POST', 'PUT'].includes(response.request().method()),
    ),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return answer;
}

/** Adds one criterion through the form. */
async function addCriterion(page, criterion) {
  await openAddForm(page);
  await fillCriterion(page, criterion);
  return save(page);
}

/** Presses *ลบ* on a row; the dialog is left open for the caller to answer. */
const startRemoval = (page, nameTh) =>
  criterionRow(page, nameTh).getByRole('button', { name: 'ลบ', exact: true }).click();

/** Answers the removal dialog. */
const confirmRemoval = page => page.getByRole('button', { name: 'ลบเกณฑ์', exact: true }).click();

/** The names the table is showing, in the order it draws them. */
const listedNames = page =>
  page
    .locator('table tbody tr td:first-child')
    .allInnerTexts()
    .then(cells => cells.map(cell => cell.split('\n')[0].trim()));

module.exports = {
  RUBRICS,
  table,
  criteriaPath,
  waitForList,
  openCriteriaVia,
  openCriteriaAt,
  criterionRow,
  openAddForm,
  openEditor,
  bandBoxes,
  fillCriterion,
  addCriterion,
  save,
  startRemoval,
  confirmRemoval,
  listedNames,
};

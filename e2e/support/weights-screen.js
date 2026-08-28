'use strict';

const { DASHBOARD } = require('./teaching-screen');
const { mySectionIds } = require('./enrolment-screen');

/**
 * สัดส่วนคะแนน — #30, as a browser reaches it.
 *
 * The screen is one draft saved whole, so the helpers here read and write a
 * *form*, not cards: the categories and weights live in inputs, the running
 * total is a line of text, and the one write is the PUT behind บันทึก.
 * Removal is a draft edit — nothing crosses the wire until the save — which
 * is why `removeRow` hands back nothing and the cancel row asserts state
 * rather than absent requests.
 *
 * `mySectionIds` is the `page.request` copy, re-exported as the sibling
 * screens re-export it.
 */

const API = /^\/api\/teaching\/sections\/\d+\/weights/;

const path = (sectionId) => `${DASHBOARD}/${sectionId}/gradingWeights`;

/** Waits for the screen's own read, whatever the answer turns out to be. */
const waitForWeights = page =>
  page.waitForResponse(
    answer =>
      API.test(new URL(answer.url()).pathname) &&
      new URL(answer.url()).pathname.endsWith('/weights') &&
      answer.request().method() === 'GET',
  );

/** Goes to the scheme and hands back the read a row asserts on. */
async function openWeights(page, sectionId) {
  const [response] = await Promise.all([waitForWeights(page), page.goto(path(sectionId))]);
  return response;
}

const categoryInput = (page, no) =>
  page.getByLabel(`ชื่อหมวดคะแนนที่ ${no}`, { exact: true });
const weightInput = (page, no) =>
  page.getByLabel(`น้ำหนักหมวดคะแนนที่ ${no}`, { exact: true });

/** The draft as the person sees it: category and weight per row, in order. */
async function schemeOnScreen(page) {
  const categories = await page.getByLabel(/^ชื่อหมวดคะแนนที่ /).all();
  const rows = [];
  for (const [index, category] of categories.entries()) {
    rows.push({
      score_category: await category.inputValue(),
      weight: await weightInput(page, index + 1).inputValue(),
    });
  }
  return rows;
}

/** The courtesy line under the form — `รวม <n> / 100`. */
const totalLine = page => page.getByText(/^รวม \d+ \/ 100$/);

/**
 * Presses บันทึก and hands back the PUT, whatever it answered.
 *
 * The reload wait is registered before the click: the screen re-reads the
 * scheme as soon as a save lands, and a row that read the inputs while that
 * read was in flight would be reading a draft mid-replacement — 27a's
 * line-231 lesson, closed here rather than re-learned.
 */
async function saveScheme(page) {
  const reloaded = waitForWeights(page);
  const [response] = await Promise.all([
    page.waitForResponse(
      answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  if (response.status() === 200) await reloaded;
  else reloaded.catch(() => {});
  return response;
}

/**
 * Presses the bin on one row and answers the dialog. A draft edit either way
 * — the wire is untouched until the save — so nothing is handed back.
 */
async function removeRow(page, no, { confirm = true } = {}) {
  await page.getByRole('button', { name: `ลบหมวดคะแนนที่ ${no}`, exact: true }).click();
  await page.getByRole('button', { name: confirm ? 'ลบ' : 'ยกเลิก', exact: true }).click();
}

module.exports = {
  API,
  path,
  waitForWeights,
  openWeights,
  mySectionIds,
  categoryInput,
  weightInput,
  schemeOnScreen,
  totalLine,
  saveScheme,
  removeRow,
};

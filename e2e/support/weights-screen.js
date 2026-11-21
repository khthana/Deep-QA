'use strict';

const { DASHBOARD } = require('./teaching-screen');
const { mySectionIds } = require('./enrolment-screen');
const { expect } = require('@playwright/test');
const { openAt } = require('./navigation');

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

/**
 * The list read itself, which is what **identifies** this screen's own answer.
 *
 * `API` accepts the template's own GET as well, which is why this waiter has
 * always asked a second question about the tail. Since #218 it asks it as one
 * anchored matcher instead, so the instrument in `list-reads.test.js` can read
 * what this waiter accepts rather than having to recognise a spelling (#141).
 */
const WEIGHTS_LIST = /^\/api\/teaching\/sections\/\d+\/weights$/;

const isWeightsList = url => WEIGHTS_LIST.test(new URL(url).pathname);

const path = (sectionId) => `${DASHBOARD}/${sectionId}/gradingWeights`;

/** Waits for the screen's own read, whatever the answer turns out to be. */
const waitForWeights = page =>
  page.waitForResponse(
    answer => isWeightsList(answer.url()) && answer.request().method() === 'GET',
  );

/**
 * Waits until what the answer carried is what the screen is showing - #300.
 *
 * #171's settle point, for the screen #171's census did not hold: its seven were
 * the helpers that already read a list, and this one's read is `schemeOnScreen`,
 * a walk over inputs rather than headings. Measured on 21 November 2569 with
 * `support/late-answer.js` at 400ms: `schemeOnScreen` read `[]` on every open,
 * three by the menu and three through `openWeights`, and the same read behind
 * this wait read the seeded three on twelve opens of twelve, late and not.
 *
 * The count is the rows the answer carried, which are what `draft` is built
 * from; the clause drawn from `data` is the Offering's รหัสวิชา. An answer with
 * no rows draws no inputs, so the count waits for nothing there and the clause
 * is what holds.
 */
async function untilWeightsDrawn(page, response) {
  const answered = await response.json();
  await expect(page.getByLabel(/^ชื่อหมวดคะแนนที่ /)).toHaveCount(answered.weights.length);
  await expect(
    page.getByText(answered.offering.subject_id, { exact: true }).first(),
  ).toBeVisible();
  return response;
}

/**
 * Goes to the scheme and hands back the read a row asserts on.
 *
 * The drawing is waited for only on an answer that succeeded, for `openPlan`'s
 * reason: a refused read draws no scheme to wait for.
 */
async function openWeights(page, sectionId) {
  return openAt(page, path(sectionId), async fresh => {
    const response = await waitForWeights(fresh);
    if (response.ok()) await untilWeightsDrawn(fresh, response);
    return response;
  });
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
  isWeightsList,
  path,
  waitForWeights,
  openWeights,
  mySectionIds,
  categoryInput,
  weightInput,
  untilWeightsDrawn,
  schemeOnScreen,
  totalLine,
  saveScheme,
  removeRow,
};

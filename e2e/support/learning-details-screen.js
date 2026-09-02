'use strict';

const { DASHBOARD } = require('./teaching-screen');

/**
 * รายละเอียดผลการเรียนรู้ — #38, as a browser reaches it.
 *
 * The screen is one read and no writes, so these helpers are all readers. A
 * cell is found by the label it carries rather than by its position in the row,
 * because the heatmap's columns are the Offering's outcomes and a row that
 * counted columns would be asserting against the seed's order.
 *
 * That label is a whole sentence — `<รหัส> <CLO-n> <คะแนน> [ต่ำกว่าเกณฑ์]` — because
 * it is what a screen reader is given instead of the cell's own text, so
 * addressing on the first two words means matching a **prefix** and not the
 * whole of it. The trailing space is what keeps `CLO-1` off `CLO-10`.
 *
 * `bandOf` reads the colour class rather than the number, because the band is
 * the only thing on this screen a person can see that the number does not
 * already say. What it returns is the Tailwind token, not a name for it: a row
 * that said "red" would be translating, and the acceptance sheet asks for
 * colours by their token for exactly that reason.
 */

const path = (sectionId) => `${DASHBOARD}/${sectionId}/learningDetails`;

const API = (sectionId) => `/api/teaching/sections/${sectionId}/learning-details`;

/** Opens the screen and hands back the read, whatever it answered. */
async function openDetails(page, sectionId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === API(sectionId) && answer.request().method() === 'GET',
    ),
    page.goto(path(sectionId)),
  ]);
  return response;
}

/** One student's cell for one outcome, addressed by the head of its label. */
const cell = (page, studentId, cloNumber) =>
  page.locator(`[aria-label^="${studentId} ${cloNumber} "]`);

/** What that cell is given to a reader who is not looking at the colour. */
const spokenAt = (page, studentId, cloNumber) =>
  cell(page, studentId, cloNumber).getAttribute('aria-label');

/** The band a cell is drawn in, as the background token it carries. */
async function bandOf(page, studentId, cloNumber) {
  const classes = await cell(page, studentId, cloNumber).getAttribute('class');
  return (classes.match(/bg-[a-z]+-\d+/) ?? [null])[0];
}

/** The foot of one outcome's column: mean, pass rate and the Y/N of BR-17. */
const summaryOf = (page, cloNumber) => page.getByLabel(`สรุป ${cloNumber}`, { exact: true });

/** The outcome numbers listed as needing attention. */
async function attentionNumbers(page) {
  const labels = await page.locator('[aria-label^="ควรปรับปรุง "]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label')),
  );
  return labels.map((label) => label.replace('ควรปรับปรุง ', ''));
}

/** The column headings, which are the Section's outcomes. */
const columns = (page) =>
  page.locator('table thead th').evaluateAll((nodes) => nodes.map((node) => node.innerText.trim()));

module.exports = {
  path,
  API,
  openDetails,
  cell,
  spokenAt,
  bandOf,
  summaryOf,
  attentionNumbers,
  columns,
};

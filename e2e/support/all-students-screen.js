'use strict';

const { expect } = require('@playwright/test');

/**
 * ผลการเรียนรู้ระดับหลักสูตรของนักศึกษาทุกคน — #43, as a browser reaches it.
 *
 * The screen owns no data and writes nothing, so what the rows here are for is
 * the half that only exists once the grid is drawn: that the roll is the
 * register's and not the marks', that the order control actually reorders,
 * that a grid wider than the window scrolls inside its own frame rather than
 * dragging the page along, and that an intake nobody has marked gets a
 * sentence.
 *
 * The arithmetic is not here. `backend/test/program-results-students.test.js`
 * owns every figure — the two-step roll-up, the band each score falls in, and
 * the two counts the order is built from — and a row here asserting a score
 * would be the same claim in the place that goes stale.
 */

const PATH = '/main/programLevelAllStudents';

const HEATMAP_API = '/api/program-results/by-intake/students';

/** Opens the screen and waits for the grid the pickers default to. */
async function openHeatmap(page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === HEATMAP_API && answer.request().method() === 'GET',
    ),
    page.goto(PATH),
  ]);
  return response;
}

const intakePicker = (page) => page.getByLabel('ปีรับเข้า');

/**
 * Puts one intake on screen, whichever one the grid opened on.
 *
 * #42's helper and its reason unchanged: the screen opens on the newest intake
 * the curriculum has students in, and the import rows earlier in this suite
 * enrol students whose codes make them a later intake than anything the seed
 * has. A row that read whatever the screen opened on would pass alone and fail
 * in the suite.
 */
async function showIntake(page, admissionYear) {
  const picker = intakePicker(page);
  await expect(picker).not.toHaveValue('');
  if ((await picker.inputValue()) === admissionYear) return null;
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) => new URL(answer.url()).searchParams.get('admission_year') === admissionYear,
    ),
    picker.selectOption(admissionYear),
  ]);
  return response;
}

/** The order control, and the value that puts the weakest first. */
const orderPicker = (page) => page.getByLabel('เรียงตาม');
const WEAKEST_FIRST = 'weakest';

/** The student codes the grid is drawing, in the order it is drawing them. */
const codesOnScreen = (page) =>
  page.locator('tbody tr td:first-child').allTextContents();

/**
 * The *below the line* fraction of each row, in screen order, as numbers.
 *
 * Read off the cell's label rather than its text, because the label is what a
 * reader who cannot see the table is given and a row that only checked the
 * text would let the label rot.
 */
async function belowCounts(page) {
  const labels = await page.locator('tbody tr td[aria-label*="ต่ำกว่าเกณฑ์"]').all();
  const counts = [];
  for (const cell of labels) {
    const label = await cell.getAttribute('aria-label');
    // Asserted rather than parsed and hoped for. A label that lost its
    // fraction would otherwise make this helper throw, and a helper throwing
    // is a broken test rather than a failed claim — the row would go red
    // saying `Cannot read properties of null` instead of saying what is wrong.
    expect(label, 'the below-the-line cell should say the whole fraction').toMatch(
      /ต่ำกว่าเกณฑ์ \d+ จาก \d+ ข้อที่วัดได้$/,
    );
    counts.push(Number(/ต่ำกว่าเกณฑ์ (\d+) จาก/.exec(label)[1]));
  }
  return counts;
}

module.exports = {
  PATH,
  openHeatmap,
  showIntake,
  orderPicker,
  WEAKEST_FIRST,
  codesOnScreen,
  belowCounts,
};

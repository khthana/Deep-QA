'use strict';

const { DASHBOARD } = require('./teaching-screen');

/**
 * การประเมินผลการเรียนรู้ — #40, as a browser reaches it.
 *
 * One read and one download, so every helper here is a reader except
 * `exportPdf`.
 *
 * Each figure is addressed by an `aria-label` carrying the outcome's number,
 * rather than by a column index. `36a` and `39a` both learned the same thing:
 * a row read by position passes for as long as nobody adds a column, and then
 * asserts a different quantity without failing. The labels also make the
 * screen readable aloud, which is a claim this screen has to make anyway —
 * ผ่าน and ไม่ผ่าน are shown as a word with a colour behind it precisely so
 * that the colour is never the only statement.
 */

const path = (sectionId) => `${DASHBOARD}/${sectionId}/AssessmentCLO`;

const API = (sectionId) => `/api/teaching/sections/${sectionId}/clo-assessment`;

/** Opens the screen and hands back the read, whatever it answered. */
async function openReport(page, sectionId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === API(sectionId) && answer.request().method() === 'GET',
    ),
    page.goto(path(sectionId)),
  ]);
  return response;
}

/** One outcome's verdict chip — the word, not the colour. */
const verdictOf = (page, cloNumber) =>
  page.locator(`[aria-label^="ผลการประเมิน ${cloNumber} "]`);

/** The share of measured students who met the criterion, as the screen writes it. */
const rateOf = (page, cloNumber) => page.locator(`[aria-label^="ร้อยละ ${cloNumber} "]`);

/** The fraction beside that share. */
const fractionOf = (page, cloNumber) => page.locator(`[aria-label^="ผ่าน ${cloNumber} "]`);

/** One outcome's mean, out of five. */
const meanOf = (page, cloNumber) => page.locator(`[aria-label^="เฉลี่ย ${cloNumber} "]`);

/** Every verdict on the screen, in the order the table draws them. */
const verdicts = (page) =>
  page
    .locator('[aria-label^="ผลการประเมิน "]')
    .evaluateAll((nodes) => nodes.map((one) => one.getAttribute('aria-label')));

/** Presses *บันทึกเป็น PDF* and hands back the file the browser was given. */
async function exportPdf(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'บันทึกเป็น PDF' }).click(),
  ]);
  return download;
}

/** The disclosure holding #29's four bands, and the control that opens it. */
const rubricToggle = (page) =>
  page.getByRole('button', { name: 'เกณฑ์การบรรลุผลสี่ระดับของแต่ละข้อ (อ้างอิง)' });

module.exports = {
  path,
  API,
  openReport,
  verdictOf,
  rateOf,
  fractionOf,
  meanOf,
  verdicts,
  exportPdf,
  rubricToggle,
};

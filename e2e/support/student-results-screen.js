'use strict';

const { DASHBOARD } = require('./teaching-screen');

/**
 * ผลลัพธ์การเรียนรู้รายบุคคล — #37, as a browser reaches it.
 *
 * One read and no writes, so every helper here is a reader.
 *
 * The read is **#38's**, not one of this screen's own. The grain #37 needs —
 * every student of this ตอนเรียน against every outcome of it, plus the
 * Section's mean per outcome — is exactly what the heatmap already computes
 * behind exactly this guard, and `backend/lib/attainment.js` is explicit that
 * the query stays in the route because *what counts as the marks in scope* is
 * what differs between screens. Here it does not differ at all. So the two
 * screens agree by construction rather than by a test that would have to catch
 * them drifting.
 *
 * The consequence for a browser row is that the roll arrives with the chart:
 * choosing a student redraws from data already on the page and makes no
 * request, which is why nothing here waits for a response after the first.
 */

const path = (sectionId) => `${DASHBOARD}/${sectionId}/studentResults`;

const API = (sectionId) => `/api/teaching/sections/${sectionId}/learning-details`;

/** The label the Section's own line carries, in the chart and in the table. */
const AVERAGE = 'ค่าเฉลี่ยของตอนเรียน';

/** Opens the screen and hands back the read, whatever it answered. */
async function openStudentResults(page, sectionId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === API(sectionId) && answer.request().method() === 'GET',
    ),
    page.goto(path(sectionId)),
  ]);
  return response;
}

/**
 * One student's box in the picker, addressed by their code.
 *
 * By label and not by position: the picker filters as it is typed into, so a
 * row that counted boxes would be asserting against whatever the search box
 * happened to hold.
 */
const studentBox = (page, studentId) =>
  page.locator(`input[type="checkbox"][aria-label^="${studentId} "]`);

/** Puts one student on the chart. No request — the roll came with the read. */
const choose = (page, studentId) => studentBox(page, studentId).check();

/** Takes one student off it again. */
const drop = (page, studentId) => studentBox(page, studentId).uncheck();

/** Narrows the picker to what matches, the way a person with a class of sixty does. */
const search = (page, term) => page.getByPlaceholder(/ค้นหา/).fill(term);

/** Every box the picker is currently offering, as the codes they carry. */
const offeredCodes = (page) =>
  page
    .locator('input[type="checkbox"][aria-label]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label').split(' ')[0]));

module.exports = {
  API,
  AVERAGE,
  choose,
  drop,
  offeredCodes,
  openStudentResults,
  path,
  search,
  studentBox,
};

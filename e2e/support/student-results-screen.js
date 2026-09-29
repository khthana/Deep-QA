'use strict';

const { expect } = require('@playwright/test');

const { DASHBOARD } = require('./teaching-screen');
const { openAt } = require('./navigation');

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

/**
 * Waits until what the answer carried is what the picker is showing — #174.
 *
 * `waitForResponse` resolves when the answer's headers land, and this screen
 * draws its roll and its chart from the body that arrives after them. Measured
 * with #170's fixture on 29 September 2569, `offeredCodes` read `[]` and
 * `axesOf` read `[]` on **ten opens out of ten**.
 *
 * Two clauses, because each covers the other's blind spot:
 *
 * - One box per student the answer carried, which is this screen's own count
 *   (#68): next door on #36 the same-looking read counts outcomes.
 * - The subject line, which is the clause that holds for a ตอนเรียน with nobody
 *   on the roll, where the count is `0` before the screen has drawn anything
 *   and after.
 *
 * That second clause matches a **substring** on purpose, unlike `untilClosDrawn`'s
 * `{ exact: true }` four files away: this screen draws the code and the subject's
 * name in one element — `{subject_id} {subject_name_en}` — so an exact match would
 * find nothing on a screen that is fully drawn. What it claims is that the line
 * carrying the answer's code is on the page, not that an element equals it (#118).
 */
async function untilRollDrawn(page, response) {
  const answered = await response.json();
  // A ตอนเรียน nobody has marked draws a sentence where the picker and the chart
  // go, so there is no box to count — the roll is only offered beside a chart.
  if (!answered.empty) {
    await expect(page.locator('input[type="checkbox"][aria-label]')).toHaveCount(
      answered.students.length,
    );
  }
  await expect(page.getByText(answered.section.subject_id).first()).toBeVisible();
  return response;
}

/**
 * Opens the screen and hands back the read, whatever it answered.
 *
 * The drawing is waited for only on an answer that succeeded: the refusal rows
 * open somebody else's ตอนเรียน and there is no roll on that screen to wait for.
 */
async function openStudentResults(page, sectionId) {
  return openAt(page, path(sectionId), async (fresh) => {
    const response = await fresh.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === API(sectionId) && answer.request().method() === 'GET',
    );
    if (response.ok()) await untilRollDrawn(fresh, response);
    return response;
  });
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
  untilRollDrawn,
};

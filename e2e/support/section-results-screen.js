'use strict';

const { expect } = require('@playwright/test');

const { DASHBOARD } = require('./teaching-screen');
const { openAt } = require('./navigation');

/**
 * ผลลัพธ์การเรียนรู้รายวิชา — #36, as a browser reaches it.
 *
 * One read and no writes, so every helper here is a reader.
 *
 * The chart is hand-drawn SVG rather than a library's canvas, and that is what
 * makes it assertable: a canvas is a picture, and a picture cannot be. How the
 * drawing is read lives in `radar-chart.js`, because #37 draws the same
 * component with students on it instead of years and a second copy of the
 * reader would be a second thing to fix when the chart moves. What is left
 * here is what is this screen's alone: its address, its read, and its year
 * picker.
 */

const path = (sectionId) => `${DASHBOARD}/${sectionId}/courseResults`;

const API = (sectionId) => `/api/teaching/sections/${sectionId}/results`;

/**
 * Waits until what the answer carried is what the chart and its table are
 * showing — #174.
 *
 * `waitForResponse` resolves when the answer's headers land; the screen draws
 * from a body that arrives after them and from state React sets after that, and
 * draws no chart at all in between — `data` starts `null`. Measured with #170's
 * fixture on 29 September 2569, `axesOf` read `[]` on **ten opens out of ten**.
 *
 * Two clauses, because each covers the other's blind spot:
 *
 * - One table row per outcome the answer carried, which is the clause that
 *   holds on the open, where nothing is drawn.
 * - One column header per year the answer named, which is the clause that holds
 *   when a year is ticked onto a chart that is **already** drawn: the row count
 *   does not move then, and a stale table would satisfy the first clause alone.
 *
 * Written with this screen's own locators rather than a shared helper's (#68):
 * the count that means *drawn* here is a count of outcomes, and on #37 next door
 * the same-looking read counts students.
 */
async function untilChartDrawn(page, response) {
  const answered = await response.json();
  // An Offering nobody has marked draws a sentence where the chart and the
  // table go, so there is no row to count and no year to name. What is left to
  // wait for is the heading line, which is drawn from the answer either way —
  // matched as a substring, because the screen draws the code and the subject's
  // name in one element, where an exact match would find nothing (#118).
  if (answered.empty) {
    await expect(page.getByText(answered.section.subject_id).first()).toBeVisible();
    return response;
  }
  await expect(page.locator('table tbody tr')).toHaveCount(answered.clos.length);
  for (const { academic_year: year } of [answered.section, ...answered.comparison]) {
    await expect(page.getByRole('columnheader', { name: `ปีการศึกษา ${year}` })).toHaveCount(1);
  }
  return response;
}

/**
 * Opens the screen and hands back the read, whatever it answered.
 *
 * The drawing is waited for only on an answer that succeeded: the refusal rows
 * open somebody else's ตอนเรียน and there is no chart on that screen to wait for.
 */
async function openResults(page, sectionId) {
  return openAt(page, path(sectionId), async (fresh) => {
    const response = await fresh.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === API(sectionId) && answer.request().method() === 'GET',
    );
    if (response.ok()) await untilChartDrawn(fresh, response);
    return response;
  });
}

/** The year picker's box for one academic year. */
const yearBox = (page, year) =>
  page.getByRole('checkbox', { name: new RegExp(`ปีการศึกษา ${year}`) });

/** Ticks a year and waits for the read that ticking it makes. */
async function addYear(page, sectionId, year) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === API(sectionId) &&
        new URL(answer.url()).searchParams.get('years') !== null,
    ),
    yearBox(page, year).check(),
  ]);
  // At the request and not only at the opener (#174's third criterion): ticking
  // a year is a second read, and the table it lands in is the first read's.
  if (response.ok()) await untilChartDrawn(page, response);
  return response;
}

module.exports = {
  API,
  addYear,
  openResults,
  path,
  untilChartDrawn,
  yearBox,
};

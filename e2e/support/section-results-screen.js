'use strict';

const { DASHBOARD } = require('./teaching-screen');

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

/** Opens the screen and hands back the read, whatever it answered. */
async function openResults(page, sectionId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === API(sectionId) && answer.request().method() === 'GET',
    ),
    page.goto(path(sectionId)),
  ]);
  return response;
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
  return response;
}

module.exports = {
  API,
  addYear,
  openResults,
  path,
  yearBox,
};

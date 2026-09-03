'use strict';

const { DASHBOARD } = require('./teaching-screen');

/**
 * ผลลัพธ์การเรียนรู้รายวิชา — #36, as a browser reaches it.
 *
 * One read and no writes, so every helper here is a reader.
 *
 * The chart is hand-drawn SVG rather than a library's canvas, and this file is
 * half of the reason why: a canvas is a picture and a picture cannot be
 * asserted. Each point carries a `<title>` naming its series, its axis and its
 * score, so `pointsOf` reads the drawing itself — not the table beside it, and
 * not the JSON that produced either. A chart drawn from stale state or drawn
 * for the wrong year would still leave the table right.
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

/**
 * What the chart actually drew, read out of the SVG.
 *
 * Returns `{ 'ปีการศึกษา 2569': { 'CLO-1': { said: 3.92, drawn: 3.92 }, … }, … }`
 * — one entry per point that has a marker. An axis a series has no score on has
 * no marker at all, so it is absent here rather than present as a nought, which
 * is the distinction the whole drawing exists to keep.
 *
 * **`said` and `drawn` are two different readings and both are needed.** `said`
 * is the point's own title, which is what a screen reader is given; `drawn` is
 * where the marker physically is, recovered from its distance to the centre
 * against the outermost ring. The first sweep of `mutation/36-section-results.py`
 * is why: a mutant that put every marker at four out of five killed nothing,
 * because this helper was reading the label and the label was still right. A
 * chart can be titled correctly and drawn wrongly, and that is precisely the
 * failure a hand-drawn chart is exposed to.
 *
 * The scale is read off the drawing rather than written here — the centre from
 * where the axis lines start, the full-scale radius from the outer ring — so
 * this stays true if the chart is ever resized.
 */
async function pointsOf(page) {
  const chart = page.locator('svg[role="img"]');
  const [cx, cy] = await chart.locator('g > line').first().evaluate((line) => [
    Number(line.getAttribute('x1')),
    Number(line.getAttribute('y1')),
  ]);
  // The last ring is the one at full scale, so its vertices are five out of five.
  const radius = await chart.locator('polygon').last().evaluate(
    (ring, [x, y]) => {
      const [px, py] = ring.getAttribute('points').split(' ')[0].split(',').map(Number);
      return Math.hypot(px - x, py - y);
    },
    [cx, cy],
  );

  const markers = await chart.locator('circle').evaluateAll((nodes) =>
    nodes.map((node) => ({
      title: node.querySelector('title').textContent,
      x: Number(node.getAttribute('cx')),
      y: Number(node.getAttribute('cy')),
    })),
  );

  const drawn = {};
  for (const marker of markers) {
    // `<label> <CLO-n> <score>` — the label is the only part with spaces in it,
    // so it is what is left after the last two fields are taken off the end.
    const parts = marker.title.trim().split(' ');
    const said = Number(parts.pop());
    const axis = parts.pop();
    const label = parts.join(' ');
    drawn[label] = {
      ...(drawn[label] ?? {}),
      [axis]: {
        said,
        drawn: (Math.hypot(marker.x - cx, marker.y - cy) / radius) * 5,
      },
    };
  }
  return drawn;
}

/** The axis labels, in the order the chart puts them round the circle. */
const axesOf = (page) => page.locator('svg[role="img"] > g > text').allTextContents();

/** One outcome's row in the table under the chart, by the cell of one series. */
const tableCell = (page, cloNumber, seriesLabel) =>
  page.getByLabel(new RegExp(`^${cloNumber} ${seriesLabel} `));

/** The legend's lines, as the words they carry. */
const legendLines = (page) => page.locator('ul li svg + text, ul li').allTextContents();

module.exports = {
  API,
  addYear,
  axesOf,
  legendLines,
  openResults,
  path,
  pointsOf,
  tableCell,
  yearBox,
};

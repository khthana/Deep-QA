'use strict';

const { DASHBOARD } = require('./teaching-screen');

/**
 * ความเชื่อมโยงผลการเรียนรู้และกิจกรรม — #39, as a browser reaches it.
 *
 * One read and no writes, so every helper here is a reader.
 *
 * The one that matters is `bandsOf`, and it reads each band **twice**: what
 * the band says about itself, and how thick it was actually drawn. The first
 * sweep of `mutation/36-section-results.py` is why that habit exists — a
 * mutant that drew every point in the wrong place killed nothing, because the
 * helper was reading titles and the titles were still right. A diagram can be
 * labelled correctly and drawn wrongly, and on this screen the drawing *is*
 * the claim: the whole of what the diagram adds to the table underneath it is
 * that one band is visibly fatter than another.
 *
 * `drawn` is the stroke width rather than a distance measured between two
 * edges, because the bands are stroked curves rather than filled shapes. That
 * is a choice made in `OutcomeActivityFlow.js` for exactly this reason.
 */

const path = (sectionId) => `${DASHBOARD}/${sectionId}/outcomeActivityMapping`;

const API = (sectionId) => `/api/teaching/sections/${sectionId}/outcome-activity-map`;

/** Opens the screen and hands back the read, whatever it answered. */
async function openMap(page, sectionId) {
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
 * Every band in the diagram: what it says, and what it was drawn at.
 *
 * The label is `เส้น <CLO-n> <ชื่อกิจกรรม> <น้ำหนัก>% <คะแนน> คะแนน`. The Activity's
 * name is the only field that can hold spaces, so it is what is left after the
 * first field is taken off the head and the last three off the tail — the same
 * shape `radar-chart.js` reads its titles in, and for the same reason.
 */
async function bandsOf(page) {
  const bands = await page.locator('svg[role="img"] path[aria-label]').evaluateAll((nodes) =>
    nodes.map((node) => ({
      said: node.getAttribute('aria-label'),
      drawn: Number(node.getAttribute('stroke-width')),
    })),
  );

  return bands.map((band) => {
    const parts = band.said.trim().split(' ');
    parts.pop(); // คะแนน
    const marks = Number(parts.pop());
    const weight = Number(parts.pop().replace('%', ''));
    parts.shift(); // เส้น
    const clo = parts.shift();
    return { clo, activity: parts.join(' '), weight, marks, drawn: band.drawn };
  });
}

/** One node of the diagram, addressed by the head of its label. */
const node = (page, label) => page.locator(`svg[role="img"] [aria-label^="โหนด ${label} "]`);

/** One outcome's row in the outcome table — its mean, as the screen writes it. */
const meanOf = (page, cloNumber) =>
  page.locator(`[aria-label^="เฉลี่ย ${cloNumber} "]`);

/** How many Activities that outcome's row says reach it. */
const activityCountOf = (page, cloNumber) =>
  page.locator(`[aria-label^="จำนวนกิจกรรม ${cloNumber} "]`);

/** One row of the detail table, by the two things it joins. */
const detailRow = (page, cloNumber, activityName) =>
  page.locator(`[aria-label^="เชื่อมโยง ${cloNumber} ${activityName} "]`);

/** Every detail row's label, in the order the table draws them. */
const detailLabels = (page) =>
  page
    .locator('[aria-label^="เชื่อมโยง "]')
    .evaluateAll((nodes) => nodes.map((one) => one.getAttribute('aria-label')));

module.exports = {
  path,
  API,
  openMap,
  bandsOf,
  node,
  meanOf,
  activityCountOf,
  detailRow,
  detailLabels,
};

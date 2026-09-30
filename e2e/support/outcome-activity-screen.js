'use strict';

const { DASHBOARD } = require('./teaching-screen');
const { openAt } = require('./navigation');

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
  return openAt(page, path(sectionId), (fresh) =>
    fresh.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === API(sectionId) && answer.request().method() === 'GET',
    ),
  );
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

/**
 * Every label of the diagram, measured — #115.
 *
 * A label is the text of the diagram that carries a tooltip: criterion row 1
 * says the full name lives in one, so the locator is the criterion rather than
 * an attribute added for the suite. Both columns have one, because a cut is
 * honest only while what was cut is still reachable.
 *
 * `width` is `getComputedTextLength()`, the advance of the glyphs the font
 * actually shaped, and `x`, `anchor` and the `viewBox` come off the same
 * element. All of it is in the diagram's own user units, which is the only space
 * in which *does this label fit* has one answer: the `svg` is `w-full` inside a
 * scrolling frame, so CSS pixels are whatever the window makes of them.
 *
 * `from` and `to` are where the drawn glyphs begin and end, and which of those
 * is `x` depends on the anchor: the left column's labels are anchored at their
 * end and grow backwards towards nought, so the edge that clips them is the one
 * the right column can never reach. A reader that assumed `x + width` would
 * report them as fitting however long they were.
 *
 * `drawn` is assembled from the text nodes alone. `textContent` on one of these
 * would hand back the label with the whole tooltip appended to it — the cut
 * string and the full name concatenated, which reads as a label that was never
 * cut.
 */
async function labelsOf(page) {
  return page.locator('svg[role="img"] text:has(title)').evaluateAll((nodes) =>
    nodes.map((one) => {
      const x = one.x.baseVal.getItem(0).value;
      const width = one.getComputedTextLength();
      const backwards = getComputedStyle(one).textAnchor === 'end';
      return {
        drawn: [...one.childNodes]
          .filter((child) => child.nodeType === 3)
          .map((child) => child.nodeValue)
          .join(''),
        full: one.querySelector('title').textContent,
        column: backwards ? 'left' : 'right',
        from: backwards ? x - width : x,
        to: backwards ? x : x + width,
        width,
        room: backwards ? x : one.ownerSVGElement.viewBox.baseVal.width - x,
        edge: one.ownerSVGElement.viewBox.baseVal.width,
      };
    }),
  );
}

/**
 * What the diagram's own font makes of `candidate`, in the same user units.
 *
 * A clone of a label that is appended, measured and removed inside one
 * evaluation, so no frame is ever drawn holding it. Cloned rather than built,
 * because a `<text>` assembled here would be a second opinion about which font
 * and which size the labels are written in, and the row's precondition would
 * then be evidence about this helper. The clone is shallow, so what is measured
 * is the candidate and not the candidate with a tooltip's worth of text after
 * it.
 */
async function widthInDiagram(page, candidate) {
  return page.locator('svg[role="img"]').first().evaluate((svg, text) => {
    const probe = svg.querySelector('text:has(title)').cloneNode(false);
    probe.textContent = text;
    svg.append(probe);
    const width = probe.getComputedTextLength();
    probe.remove();
    return width;
  }, candidate);
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
  labelsOf,
  widthInDiagram,
  node,
  meanOf,
  activityCountOf,
  detailRow,
  detailLabels,
};

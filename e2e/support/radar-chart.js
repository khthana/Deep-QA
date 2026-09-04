'use strict';

/**
 * How a browser reads the hand-drawn radar — shared by #36 and #37.
 *
 * `frontend/src/components/RadarChart.js` is one component drawing two
 * screens, so the reader of it is one module too. It lived inside
 * `section-results-screen.js` while there was only one screen; #37 draws the
 * same SVG with a Section average and up to four students on it instead of
 * four academic years, and a second copy of `pointsOf` would be a second thing
 * to fix the next time the drawing moves.
 *
 * Nothing here knows which screen it is on. What it knows is the chart's
 * contract: one `svg[role="img"]`, one `<title>` per marker naming its series,
 * its axis and its score, an axis line from the centre, and an outermost
 * polygon at full scale.
 */

/**
 * What the chart actually drew, read out of the SVG.
 *
 * Returns `{ '<series>': { 'CLO-1': { said: 3.92, drawn: 3.92 }, … }, … }` —
 * one entry per point that has a marker. An axis a series has no score on has
 * no marker at all, so it is absent here rather than present as a nought,
 * which is the distinction the whole drawing exists to keep.
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
    // #37's labels are ordinary Thai names and lean on that: the field count
    // is fixed at the tail, not at the head.
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

/**
 * One outcome's cell for one series, in the table that carries the chart's
 * numbers.
 *
 * Here rather than in either screen's own file because both screens write the
 * same label - `<CLO-n> <series> <score>` - and the two copies of this reader
 * were byte-identical. Addressed by the head of the label and not by column
 * position: the columns are whatever has been ticked.
 *
 * The trailing space in the pattern is what keeps `CLO-1` off `CLO-10`.
 */
const tableCell = (page, cloNumber, seriesLabel) =>
  page.getByLabel(new RegExp(`^${cloNumber} ${seriesLabel} `));

module.exports = { axesOf, pointsOf, tableCell };

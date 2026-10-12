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

/**
 * How far each series' drawn line strays from its own markers, in pixels.
 *
 * Returns `{ '<series>': 0.07, ... }` - one number per series that has a line,
 * the furthest any vertex of its path falls from the nearest marker of the same
 * series.
 *
 * Why this and not a reading of the markers. `RadarChart` draws a marker at
 * `pointAt(index, count, value)`, where `count` is `axes.length` - so a marker
 * is on its axis whatever the series is - and draws the line through
 * `pointAt(index, values.length, ...)`. Those two agree only while a series is
 * as long as the axes. Hand it eleven values on ten axes and the markers stay
 * put while the line is drawn at eleven-fold angles through none of them, with
 * every radius, every title and every table cell still right.
 *
 * #112's first reader asked the markers for their angle and the mutant for this
 * survived 8 of 8, which is the eighth reading of a survivor and #152's twin:
 * not a claim never at risk but **the row reading the wrong element**.
 *
 * `pathOf` writes its vertices to one decimal place, so each coordinate can be
 * out by 0.05 and a vertex by `hypot(0.05, 0.05)` = 0.071 with the drawing
 * exactly right. The rows assert 0.2 - that rounding with room over it - and
 * the stray a series longer than its axes draws is whole pixels, not
 * hundredths: at eleven-fold angles on a ten-fold frame the first vertex past
 * the top is already degrees away on a radius of 128.
 */
async function pathErrorsOf(page) {
  const chart = page.locator('svg[role="img"]');
  // One `<g>` per series, and a series' group is the one with markers in it:
  // the axes live in a group of their own, with lines and labels and no circle.
  const groups = await chart.locator('g:has(circle)').evaluateAll((nodes) =>
    nodes.map((node) => ({
      titles: [...node.querySelectorAll('circle > title')].map((one) => one.textContent),
      markers: [...node.querySelectorAll('circle')].map((one) => [
        Number(one.getAttribute('cx')),
        Number(one.getAttribute('cy')),
      ]),
      paths: [...node.querySelectorAll('path')].map((one) => one.getAttribute('d')),
    })),
  );

  const errors = {};
  for (const group of groups) {
    if (group.titles.length === 0) continue;
    // `<label> <CLO-n> <score>`, read from the tail as in `pointsOf`.
    const parts = group.titles[0].trim().split(' ');
    parts.pop();
    parts.pop();
    const label = parts.join(' ');
    let worst = 0;
    for (const d of group.paths) {
      const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      for (let at = 0; at + 1 < numbers.length; at += 2) {
        const [x, y] = [numbers[at], numbers[at + 1]];
        const nearest = group.markers.reduce(
          (best, [mx, my]) => Math.min(best, Math.hypot(mx - x, my - y)),
          Number.POSITIVE_INFINITY,
        );
        worst = Math.max(worst, nearest);
      }
    }
    errors[label] = worst;
  }
  return errors;
}

/**
 * The axis cap `RadarChart` exports, as the specs state it.
 *
 * Restated rather than imported, because a helper written to restate a rule is
 * evidence about the rule and an import is not (#96). What it cannot see: if
 * the component's cap ever changes, this copy goes stale and the cap rows pass
 * against the old number. Nothing reports that - the mutants are about whether
 * a cap is applied, not about what it is.
 */
const MAX_AXES = 10;

/**
 * Which Offering a Section belongs to - ADR-0003's grain, not the Section's.
 *
 * Here rather than in either spec because both screens' cap rows need it, and
 * #37's copy was the only one until #112 asked the same question of #36.
 */
async function offeringOf(db, section) {
  const { rows } = await db.query(
    `SELECT sc.program_id, sc.subject_id, sc.academic_year
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1`,
    [section],
  );
  if (rows.length !== 1)
    throw new Error(`offeringOf: ${section} belongs to ${rows.length} Offerings`);
  return rows[0];
}

/**
 * Takes an Offering past the chart's cap, remembering how to put it back.
 *
 * The seed holds nine outcomes, so neither screen's cap is reachable without
 * building the situation - and a criterion whose situation the seed does not
 * contain is still walkable and still provable, as long as something builds it
 * and puts it back (#39, #89).
 *
 * The outcomes are added to the **Offering** rather than to the Subject
 * because that is the grain a CLO has (ADR-0003), and they carry no marks,
 * which is beside the point here: the cap is about how many labels fit round a
 * circle and not about what is on them. With #96 closed the eleven read
 * `CLO-1..CLO-11`, so **the one past the tenth axis is CLO-11**.
 *
 * `years` is why this is shared rather than copied. #37 draws one year, so one
 * year is enough there. #36 lays previous years of the same Subject over the
 * same axes, and the server offers a year for comparison only when the two
 * years' CLO numbers match exactly - so a row about the comparison line has to
 * add the same outcomes to **both** years or the picker it needs goes away.
 *
 * The undo is pushed onto the caller's queue **before** the insert, so a queue
 * drained in reverse deletes the outcomes after whatever else the row did to
 * them; any other order would try to delete a `subject_clo` that still has
 * marks against it, which the schema refuses.
 */
async function pastTheCap(db, restore, offering, options = {}) {
  // Two outcomes, which is what puts one past the cap and leaves one on it.
  const numbers = ['CLO-10', 'CLO-11'];
  const years = options.years ?? [offering.academic_year];
  restore.push(() =>
    db.query(
      `DELETE FROM subject_clo
        WHERE program_id = $1 AND subject_id = $2 AND academic_year = ANY($3)
          AND clo_number = ANY($4)`,
      [offering.program_id, offering.subject_id, years, numbers],
    ),
  );
  for (const academicYear of years)
    for (const number of numbers)
      await db.query(
        `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
         VALUES ($1, $2, $3, $4, $5)`,
        [offering.program_id, offering.subject_id, academicYear, number, 'ผลการเรียนรู้ที่เพิ่มเพื่อทดสอบเพดานของกราฟ'],
      );
  return numbers;
}

module.exports = {
  MAX_AXES,
  axesOf,
  offeringOf,
  pastTheCap,
  pathErrorsOf,
  pointsOf,
  tableCell,
};

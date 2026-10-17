'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const { choose, openStudentResults } = require('../support/student-results-screen');
const { openResults } = require('../support/section-results-screen');

/**
 * #114 — the radar chart's legend sits under the chart, not beside it.
 *
 * **Why this file exists at all.** The ticket's fourth criterion says *เดินด้วยตา
 * ซ้ำ เพราะเป็นเรื่องรูปลักษณ์ล้วน ไม่มี seam ไหนพิสูจน์แทนได้* — walk it by eye,
 * no seam can prove it. That is a claim like the ticket's numbers (#141), and it
 * is wrong: what the ticket asks for is *how many lines a legend row runs to at
 * a given window width*, which is a number a browser reads. What stays with the
 * hand is whether the result is tidy — the ticket's own word for the defect was
 * รุงรัง — and that row is on `docs/acceptance/37-individual-student-results.md`.
 *
 * **Why this file sets its own viewport.** The criterion names `innerWidth`
 * 1396 with the left menu open, which is the default state; the project default
 * is `devices['Desktop Chrome']` at 1280. The defect lives in what the width
 * leaves over, so the width is the experiment — `98a-narrow-window` says the
 * same thing from the narrow end, and this is the first file to widen.
 *
 * **What the rows claim, and why one line rather than two.** The ticket's first
 * criterion asks for *at most two lines*. The fix the owner chose on 17 October
 * 2569 — the legend under the chart at every width, rather than the ticket's
 * `whitespace-nowrap` or `min-w-[18rem]` — gives **one**, measured at every
 * width from 1152 up. A row asserting *at most two* would pass under the two
 * options that were not chosen, so it would not hold the decision (#48). The
 * criterion is still the criterion; the row is stronger than it on purpose, and
 * `mutation/114-the-legend-under-the-chart.py` makes each declined option run
 * so that the stronger claim is the one under test.
 */

test.use({ viewport: { width: 1396, height: 900 } });

/**
 * The legend, addressed through the chart rather than through its own text.
 *
 * The dash labels — *เส้นทึบ*, *เส้นประยาว* — would be a locator built out of a
 * source string (#118), and worse, this file's claim is about **where** the
 * list is drawn. Reaching it as the chart's next sibling is true under the fix
 * and under every mutant of it, so a row that cannot find the legend is saying
 * the legend is gone, not that the layout moved.
 */
const legendOf = (page) => page.locator('svg[role="img"] + ul');

const chartOf = (page) => page.locator('svg[role="img"]');

/**
 * The claim both screens' rows share: the legend starts below the chart.
 *
 * It is one assertion in two rows rather than one row, because the layout is
 * **copied** into the two pages and not shared between them — `besidesection`
 * puts the old layout back in `SectionResults.js` alone and leaves
 * `StudentResults.js` fixed, which is the whole reason criterion 3 is a claim
 * of its own (#191: what each row adds is that its own way in arrives here).
 */
async function expectLegendBelowChart(page) {
  const chart = await chartOf(page).boundingBox();
  const legend = await legendOf(page).boundingBox();
  expect(legend.y, 'the legend starts below the chart').toBeGreaterThanOrEqual(
    chart.y + chart.height,
  );
  return chart;
}

/** `text-sm` is a 20px line box; a row's height divided by it is its line count. */
async function lineCounts(page) {
  return legendOf(page)
    .locator('li')
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        Math.round(node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight)),
      ),
    );
}

let section;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) [section] = await mySectionIds(page);
});

/**
 * Puts the ticket's own situation on the screen: four students whose names are
 * Thai and of ordinary length, which is what the legend has to carry.
 *
 * The names are asserted rather than assumed. A seed that grew four short or
 * Latin names would leave every row below green while measuring nothing, and
 * that is a claim about the seed worth failing loudly (#102).
 */
async function fourStudents(page) {
  const answer = await openStudentResults(page, section);
  const chosen = (await answer.json()).students.slice(0, 4);
  expect(chosen.length, 'the roll should hold at least four').toBe(4);

  for (const student of chosen) {
    const label = `${student.student_id} ${student.full_name_th}`;
    expect(label, 'a legend row carries a code and a Thai name').toMatch(/[\u0E00-\u0E7F]/);
    expect(label.length, `${label} is shorter than an ordinary Thai name`).toBeGreaterThanOrEqual(20);
    await choose(page, student.student_id);
  }

  await expect(legendOf(page).locator('li')).toHaveCount(chosen.length + 1);
}

test('every legend row is one line at 1396 with the menu open', async ({ page }) => {
  await fourStudents(page);

  // Five rows: the Section's average and the four students.
  expect(await lineCounts(page)).toEqual([1, 1, 1, 1, 1]);
});

test('nothing overflows and the page does not scroll sideways', async ({ page }) => {
  await fourStudents(page);

  const document_ = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(document_.scroll, 'the page does not scroll sideways').toBe(document_.client);
});

test('the legend is under the chart, so the chart keeps its own width', async ({ page }) => {
  await fourStudents(page);

  const chart = await expectLegendBelowChart(page);

  // `max-w-md` is 448, and beside the legend the chart never reached it: the
  // card is the narrow half of a grid whose other column is the 20rem picker,
  // so the two shared 578px and the chart measured 366 at this width - and 0 at
  // 1024. The claim is that the legend no longer takes any of it, not the 448
  // itself, so it is read against the cap with room to spare (#145).
  expect(chart.width).toBeGreaterThan(440);
});

test('#36 draws the same shared layout', async ({ page }) => {
  await openResults(page, section);
  await expect(legendOf(page).locator('li').first()).toBeVisible();

  // How many rows there are is the seed's business, not this row's claim:
  // this screen draws one per academic year it compares, so a `toEqual([1])`
  // would go red the day a year is seeded, for a reason with nothing to do
  // with #114 (#129). What the row claims is that every row there is runs to
  // one line.
  const counts = await lineCounts(page);
  expect(counts.length, 'the legend should carry at least one row').toBeGreaterThan(0);
  expect(counts, 'every legend row is one line').toEqual(counts.map(() => 1));

  const chart = await expectLegendBelowChart(page);

  // This card is not inside #37's picker grid, so the chart reaches its whole
  // `max-w-md` here - which is what the fix buys a screen whose legend rows
  // were always short enough not to show #37's defect. Read against the cap
  // with room to spare, as row 3 is.
  expect(chart.width, 'the chart keeps its own width').toBeGreaterThan(440);
});

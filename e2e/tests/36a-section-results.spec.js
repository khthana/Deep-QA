'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { REFUSALS } = require('../../backend/auth/refusals');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const {
  addYear,
  axesOf,
  openResults,
  path,
  pointsOf,
  tableCell,
  yearBox,
} = require('../support/section-results-screen');

/**
 * docs/acceptance/36-section-results.md — the half a browser can prove.
 *
 * `backend/test/section-results.test.js` owns every rule: the scale of five,
 * the sixty per cent and where it is not met, which prior years may be compared
 * and which are refused. None of it is repeated here.
 *
 * What is only here is **the drawing**. #36's chart is hand-written SVG rather
 * than a chart library's canvas, and these rows are the reason that was worth
 * doing: every point is an element with a title, so a row can ask what the
 * chart drew rather than what the endpoint answered. Three things follow that
 * no HTTP assertion reaches —
 *
 * - a year ticked in the picker actually appears **as a second line**, rather
 *   than only in the table or only in the JSON;
 * - an outcome nobody was measured on leaves a **gap** in the line rather than
 *   a point at the centre, which is the same *blank is not a nought* rule the
 *   arithmetic keeps and the easiest place in the application to break it;
 * - a ผู้สอน who types another ตอนเรียน's address is refused **and is not left
 *   reading กำลังโหลดข้อมูล… underneath the refusal**, which is the defect #43's
 *   hand-walk found on two screens and which no green suite had seen.
 */

const db = createPool({ schema: E2E_SCHEMA });

let section;
let restore;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) [section] = await mySectionIds(page);
  restore = [];
});

test.afterEach(async () => {
  for (const row of restore) {
    await db.query(
      `UPDATE activity_scores SET score = $1
        WHERE student_id = $2 AND activity_id = $3 AND clo_id = $4`,
      [row.score, row.student_id, row.activity_id, row.clo_id],
    );
  }
});

/** The prior year the seed offers for comparison, read rather than written here. */
async function priorYear() {
  const { rows } = await db.query(
    `SELECT DISTINCT sc.academic_year
       FROM semester_courses sc
       JOIN course_sections cs ON cs.semester_course_id = sc.id
      WHERE (sc.program_id, sc.subject_id) = (
              SELECT b.program_id, b.subject_id FROM semester_courses b
                JOIN course_sections bc ON bc.semester_course_id = b.id
               WHERE bc.section_id = $1)
        AND sc.academic_year < (
              SELECT b.academic_year FROM semester_courses b
                JOIN course_sections bc ON bc.semester_course_id = b.id
               WHERE bc.section_id = $1)
      ORDER BY sc.academic_year DESC
      LIMIT 1`,
    [section],
  );
  expect(rows.length, 'the seed should offer a prior year of this Subject').toBe(1);
  return rows[0].academic_year;
}

/** Takes one outcome out of the reckoning entirely, remembering how to put it back. */
async function blankOut(cloNumber) {
  const { rows } = await db.query(
    `SELECT s.student_id, s.activity_id, s.clo_id, s.score
       FROM activity_scores s
       JOIN activities a ON a.id = s.activity_id
       JOIN subject_clo c ON c.clo_id = s.clo_id
      WHERE a.section_id = $1 AND c.clo_number = $2 AND s.score IS NOT NULL`,
    [section, cloNumber],
  );
  expect(rows.length, 'nothing to blank out for ' + cloNumber).toBeGreaterThan(0);
  restore.push(...rows);
  await db.query(
    `UPDATE activity_scores SET score = NULL
      WHERE student_id = ANY($1) AND clo_id = ANY($2) AND activity_id = ANY($3)`,
    [
      rows.map((row) => row.student_id),
      rows.map((row) => row.clo_id),
      rows.map((row) => row.activity_id),
    ],
  );
}

test('the chart draws one point per outcome, and the table under it says the same numbers', async ({
  page,
}) => {
  const answer = await openResults(page, section);
  expect(answer.status()).toBe(200);
  const body = await answer.json();

  const axes = await axesOf(page);
  expect(axes).toEqual(body.clos.map((clo) => clo.clo_number));

  const drawn = await pointsOf(page);
  const thisYear = `ปีการศึกษา ${body.section.academic_year}`;
  expect(Object.keys(drawn)).toEqual([thisYear]);

  for (const clo of body.clos) {
    if (clo.mean === null) continue;
    // Three readings of one number, and the middle one is the reason this row
    // exists: what the point says it is, **where the point actually is**, and
    // what the table says. A chart can be labelled correctly and plotted
    // wrongly, and only the second reading can tell.
    expect(drawn[thisYear][clo.clo_number].said).toBeCloseTo(clo.mean, 2);
    expect(drawn[thisYear][clo.clo_number].drawn).toBeCloseTo(clo.mean, 1);
    await expect(tableCell(page, clo.clo_number, thisYear)).toHaveText(clo.mean.toFixed(2));
  }
});

test('ticking a previous year puts a second line on the same axes', async ({ page }) => {
  await openResults(page, section);
  const year = await priorYear();

  await expect(yearBox(page, year)).toBeVisible();
  const answer = await addYear(page, section, year);
  expect(answer.status()).toBe(200);
  const body = await answer.json();

  const drawn = await pointsOf(page);
  const thisYear = `ปีการศึกษา ${body.section.academic_year}`;
  const thatYear = `ปีการศึกษา ${year}`;
  expect(Object.keys(drawn).sort()).toEqual([thatYear, thisYear].sort());

  // Two lines, on one set of axes, carrying two different sets of numbers. If
  // the second series were drawn from the first — the mistake a chart makes
  // silently — every axis would agree, and across nine of them that does not
  // happen by chance.
  const differs = body.clos.some(
    (clo, index) =>
      clo.mean !== null &&
      body.comparison[0].clos[index].mean !== null &&
      clo.mean !== body.comparison[0].clos[index].mean,
  );
  expect(differs, 'the two years should not be the same numbers').toBe(true);
  for (const clo of body.comparison[0].clos) {
    if (clo.mean === null) continue;
    expect(drawn[thatYear][clo.clo_number].said).toBeCloseTo(clo.mean, 2);
    expect(drawn[thatYear][clo.clo_number].drawn).toBeCloseTo(clo.mean, 1);
  }
});

test('an outcome nobody was measured on leaves a gap, not a point at the centre', async ({
  page,
}) => {
  // The seed marks every student on every outcome, so the situation has to be
  // built: one outcome emptied, and put back by `afterEach`.
  await blankOut('CLO-2');

  const answer = await openResults(page, section);
  const body = await answer.json();
  const blanked = body.clos.find((clo) => clo.clo_number === 'CLO-2');
  expect(blanked.mean, 'the outcome should have come back unmeasured').toBeNull();

  const drawn = await pointsOf(page);
  const thisYear = `ปีการศึกษา ${body.section.academic_year}`;
  expect(Object.keys(drawn[thisYear])).not.toContain('CLO-2');
  // And it is a gap rather than a missing chart: the other outcomes are still
  // drawn, so the reader sees eight points and a break in the line.
  expect(Object.keys(drawn[thisYear]).length).toBe(body.clos.length - 1);

  await expect(tableCell(page, 'CLO-2', thisYear)).toHaveText('—');
});

test('a ผู้สอน who types another ตอนเรียน’s address is refused, and is not left waiting', async ({
  page,
}) => {
  const { rows } = await db.query(
    `SELECT cs.section_id FROM course_sections cs
      WHERE cs.section_id <> $1
        AND NOT EXISTS (SELECT 1 FROM course_sections_teacher t
                         WHERE t.section_id = cs.section_id AND t.user_id = 'teach01')
      ORDER BY cs.section_id LIMIT 1`,
    [section],
  );
  expect(rows.length, 'the seed should hold a ตอนเรียน this ผู้สอน does not teach').toBe(1);

  await page.goto(path(rows[0].section_id));
  await expect(page.getByText(REFUSALS.sectionNotFound)).toBeVisible();
  await expect(page.locator('svg[role="img"]')).toHaveCount(0);
  await expect(page.getByText('กำลังโหลดข้อมูล')).toHaveCount(0);
});

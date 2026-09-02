'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { REFUSALS } = require('../../backend/auth/refusals');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const {
  openDetails,
  cell,
  spokenAt,
  bandOf,
  summaryOf,
  attentionNumbers,
  columns,
} = require('../support/learning-details-screen');

/**
 * docs/acceptance/38-learning-detail-heatmap.md — the half a browser can prove.
 *
 * The backend suite owns the arithmetic: the fraction, the five bands, the
 * sixty per cent rule and what a blank leaves out of each. Repeating those here
 * would be asserting the same rule twice in two places, and the second place
 * would be the one that goes stale.
 *
 * What is here is what only exists in front of the screen. A heatmap is a claim
 * about **colour**: that a number and the shade behind it say the same thing,
 * that the flagged band is distinguishable by something other than hue, and
 * that a wide grid stays inside its own frame. None of that is visible at the
 * HTTP surface, where the answer is a number and a band and no pixels at all.
 *
 * ## Every row puts its own marks in and takes them out again
 *
 * The seed's marks sit between 3.8 and 4.0, which is two bands of five. So the
 * rows that are about colour write the marks they need through the pool and
 * `afterEach` puts back exactly what was there — read before the row ran, for
 * 25a's reason: teardown through the screen shares a defect with the subject.
 */

const db = createPool({ schema: E2E_SCHEMA });

let section;
let marked;
let invented;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) [section] = await mySectionIds(page);
  marked = [];
  invented = [];
});

test.afterEach(async () => {
  for (const row of marked) {
    await db.query(
      `UPDATE activity_scores SET score = $1
        WHERE student_id = $2 AND activity_id = $3 AND clo_id = $4`,
      [row.score, row.student_id, row.activity_id, row.clo_id],
    );
  }
  for (const cloId of invented) {
    await db.query('DELETE FROM subject_clo WHERE clo_id = $1', [cloId]);
  }
});

/**
 * An outcome of this Offering that no Activity assesses.
 *
 * The seed has an Activity behind every outcome it ships, so the case this row
 * is about — a column with nothing measuring it — does not exist until a row
 * makes it. Without it the heatmap looks identical whether the columns come
 * from the Offering or from the attribution table, and the row proves neither.
 */
async function unassessedOutcome(number) {
  const { rows } = await db.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
     SELECT sc.program_id, sc.subject_id, sc.academic_year, $2, $3
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1
     RETURNING clo_id`,
    [section, number, 'ผลการเรียนรู้ที่ยังไม่มีกิจกรรมใดวัด'],
  );
  invented.push(rows[0].clo_id);
  return rows[0].clo_id;
}

test.afterAll(async () => {
  await db.end();
});

/** The roll, lowest code first — the order the heatmap's rows are in. */
async function roll() {
  const { rows } = await db.query(
    `SELECT sc.student_id FROM student_course sc
      WHERE sc.section_id = $1 ORDER BY sc.student_id ASC`,
    [section],
  );
  return rows.map((row) => row.student_id);
}

/** One outcome's attribution rows in this Section. */
async function attributionOf(cloNumber) {
  const { rows } = await db.query(
    `SELECT m.activity_id, m.clo_id, m.score
       FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
       JOIN subject_clo c ON c.clo_id = m.clo_id
      WHERE a.section_id = $1 AND c.clo_number = $2
      ORDER BY m.activity_id ASC`,
    [section, cloNumber],
  );
  expect(rows.length).toBeGreaterThan(0);
  return rows;
}

/** What these students hold for this outcome now, so `afterEach` can put it back. */
async function remember(cloId, activityIds, studentIds) {
  const { rows } = await db.query(
    `SELECT student_id, activity_id, clo_id, score FROM activity_scores
      WHERE clo_id = $1 AND activity_id = ANY($2) AND student_id = ANY($3)`,
    [cloId, activityIds, studentIds],
  );
  marked.push(...rows);
}

/**
 * Puts one student on an exact score out of five for one outcome — the whole of
 * the wanted fraction on the first attribution row, and the rest left blank,
 * which the server leaves out of both halves rather than reading as noughts.
 */
async function place(studentId, rows, outOfFive) {
  const [first] = rows;
  await db.query(
    `UPDATE activity_scores SET score = NULL
      WHERE student_id = $1 AND clo_id = $2 AND activity_id = ANY($3)`,
    [studentId, first.clo_id, rows.map((row) => row.activity_id)],
  );
  await db.query(
    `UPDATE activity_scores SET score = $1
      WHERE student_id = $2 AND activity_id = $3 AND clo_id = $4`,
    [Math.round(((Number(first.score) * outOfFive) / 5) * 100) / 100, studentId, first.activity_id, first.clo_id],
  );
}

test('row 1: the heatmap opens with the roll down the side and every outcome across the top', async ({
  page,
}) => {
  // Every outcome of the Offering, not only the ones some Activity reaches. The
  // one that proves the difference has to be made here: the seed measures all
  // of its own, so on the seed alone the two readings agree and the row would
  // be asserting nothing.
  await unassessedOutcome('CLO-91');

  const response = await openDetails(page, section);
  expect(response.status()).toBe(200);

  const enrolled = await roll();

  const { rows } = await db.query(
    `SELECT c.clo_number FROM subject_clo c
       JOIN semester_courses sc
         ON sc.program_id = c.program_id AND sc.subject_id = c.subject_id
        AND sc.academic_year = c.academic_year
       JOIN course_sections cs ON cs.semester_course_id = sc.id
      WHERE cs.section_id = $1 ORDER BY c.clo_number ASC, c.clo_id ASC`,
    [section],
  );

  await expect(cell(page, enrolled[0], rows[0].clo_number)).toBeVisible();
  expect(await columns(page)).toEqual([
    'รหัสนักศึกษา',
    'ชื่อ',
    ...rows.map((row) => row.clo_number),
  ]);

  // Named rather than left to the list above, because it is the whole point:
  // the outcome nothing measures is a column of blanks and not an absence.
  expect(await columns(page)).toContain('CLO-91');
  await expect(cell(page, enrolled[0], 'CLO-91')).toHaveText('—');
});

test('row 2: a cell’s colour is the band its number is in, across all five', async ({ page }) => {
  const enrolled = await roll();
  const rows = await attributionOf('CLO-1');
  await remember(rows[0].clo_id, rows.map((row) => row.activity_id), enrolled.slice(0, 5));

  // One student on each band, so the five shades are read off one column.
  const edges = [2.99, 3.0, 3.5, 4.0, 4.5];
  for (const [index, score] of edges.entries()) {
    await place(enrolled[index], rows, score);
  }

  await openDetails(page, section);

  const shades = [];
  for (const [index] of edges.entries()) {
    shades.push(await bandOf(page, enrolled[index], 'CLO-1'));
  }

  // The whole ramp, in order. Asserting only that five shades differ would let
  // a permuted map through — five colours, each on the wrong band, which is a
  // heatmap that is exactly as wrong as one painted in a single colour.
  expect(shades).toEqual([
    'bg-red-100',
    'bg-amber-100',
    'bg-yellow-50',
    'bg-lime-100',
    'bg-emerald-100',
  ]);
});

test('row 3: below three is flagged by something that is not only a colour', async ({ page }) => {
  const enrolled = await roll();
  const rows = await attributionOf('CLO-2');
  await remember(rows[0].clo_id, rows.map((row) => row.activity_id), enrolled.slice(0, 2));

  await place(enrolled[0], rows, 2.99);
  await place(enrolled[1], rows, 3.0);

  await openDetails(page, section);

  // The mark rides in the cell's own text, so it survives being printed, being
  // read aloud, and being looked at by somebody who cannot tell the two
  // shades apart.
  await expect(cell(page, enrolled[0], 'CLO-2')).toContainText('!');
  await expect(cell(page, enrolled[1], 'CLO-2')).not.toContainText('!');

  // And the same thing again for a reader who never sees the cell: the label
  // carries the score and says the outcome is under the line.
  expect(await spokenAt(page, enrolled[0], 'CLO-2')).toContain('ต่ำกว่าเกณฑ์');
  expect(await spokenAt(page, enrolled[1], 'CLO-2')).not.toContain('ต่ำกว่าเกณฑ์');
});

test('row 4: the three figures are on the screen and agree with the column feet', async ({
  page,
}) => {
  await openDetails(page, section);

  const enrolled = await roll();
  await expect(page.getByText(`${enrolled.length} คน`, { exact: true })).toBeVisible();

  // The foot of a column carries that outcome's own mean, its pass rate and
  // the Y or N that BR-17 decides — the same rule the attention list uses.
  const foot = await summaryOf(page, 'CLO-1').innerText();
  expect(foot).toMatch(/\d\.\d+/);
  expect(foot).toMatch(/%/);
  expect(foot).toMatch(/[YN]/);
});

test('row 5: an outcome that fails the sixty per cent rule is named in the list, not left to the colours', async ({
  page,
}) => {
  const enrolled = await roll();
  const rows = await attributionOf('CLO-3');
  await remember(rows[0].clo_id, rows.map((row) => row.activity_id), enrolled);

  // Everybody under the line, so this outcome cannot clear BR-17.
  for (const student of enrolled) {
    await place(student, rows, 2.0);
  }

  await openDetails(page, section);

  expect(await attentionNumbers(page)).toContain('CLO-3');
  await expect(summaryOf(page, 'CLO-3')).toContainText('N');
});

test('row 6: the heatmap scrolls in its own frame, so the far columns stay reachable', async ({
  page,
}) => {
  await openDetails(page, section);
  await page.setViewportSize({ width: 640, height: 900 });

  // The shell around every screen clips sideways overflow, so a grid wider than
  // a narrow window does not push the page along — it simply loses its
  // right-hand columns off the edge, with nothing to scroll them back. That is
  // what #98's frame is for here, and *reachable* is the half of it that a
  // measurement can see: the page never scrolls sideways either way.
  const measured = await page.evaluate(() => {
    const table = document.querySelector('table');
    const frame = table.parentElement;
    frame.scrollLeft = 9999;
    return {
      wider: table.scrollWidth > frame.clientWidth,
      reachable: frame.scrollLeft > 0,
      pageScrollsSideways:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  expect(measured.wider).toBe(true);
  expect(measured.reachable).toBe(true);
  expect(measured.pageScrollsSideways).toBe(false);
});

test('row 7: a Section with no marks says so instead of drawing a grid of dashes', async ({
  page,
}) => {
  const { rows: before } = await db.query(
    `SELECT student_id, activity_id, clo_id, score FROM activity_scores
      WHERE activity_id IN (SELECT id FROM activities WHERE section_id = $1)`,
    [section],
  );
  marked.push(...before);

  await db.query(
    `UPDATE activity_scores SET score = NULL
      WHERE activity_id IN (SELECT id FROM activities WHERE section_id = $1)`,
    [section],
  );

  await openDetails(page, section);

  await expect(page.getByText('ยังไม่มีคะแนนในตอนเรียนนี้')).toBeVisible();
  await expect(page.locator('table')).toHaveCount(0);
});

test('row 9: an outcome nobody has been asked about is not counted as one that passed', async ({
  page,
}) => {
  // The walk of this sheet found the screen saying *every outcome passed* on a
  // page whose last column showed a dash for that very verdict. Nothing failed,
  // so the attention list was empty, and an empty list was being read as good
  // news rather than as an unfinished question.
  await unassessedOutcome('CLO-92');

  await openDetails(page, section);

  const box = page.locator('div', { hasText: 'ผลการเรียนรู้ที่ควรปรับปรุง' }).last();
  await expect(box).toContainText('CLO-92');
  await expect(box).not.toContainText('ทุกผลการเรียนรู้ผ่านเกณฑ์');

  // And the column's own foot agrees: no verdict there either.
  await expect(summaryOf(page, 'CLO-92')).not.toContainText('Y');
});

test('row 8: the ตอนเรียน of another account is refused rather than drawn', async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.teacherTwo);

  const response = await openDetails(page, section);

  expect(response.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound, { exact: true })).toBeVisible();
});

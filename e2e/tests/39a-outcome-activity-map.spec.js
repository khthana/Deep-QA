'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS } = require('../support/accounts');
const { REFUSALS } = require('../../backend/auth/refusals');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const {
  openMap,
  bandsOf,
  node,
  meanOf,
  activityCountOf,
  detailRow,
  detailLabels,
} = require('../support/outcome-activity-screen');

/**
 * docs/acceptance/39-outcome-to-activity-map.md — the half a browser can prove.
 *
 * The backend suite owns the answer: which outcomes and which Activities are
 * in it, what a link carries, that a node with nothing attached is still a
 * node, and that another account's ตอนเรียน is refused. Repeating any of that
 * here would be asserting one rule in two places, and the second place is the
 * one that goes stale.
 *
 * What is here is what only exists in front of the screen, and on this screen
 * that is unusually large: **the diagram is a claim in pixels**. Its whole
 * contribution over the table underneath is that one band is visibly fatter
 * than another, and nothing at the HTTP surface can tell whether that came out
 * right. So the rows below read what was drawn — the stroke width — and not
 * only what the drawing says about itself.
 *
 * ## The seed cannot tell marks from per cent, so a row has to make it
 *
 * Every Activity in the seed is worth a hundred marks, which is the one mark
 * at which *34 per cent of it* and *34 marks* are the same number. A diagram
 * drawn from the wrong one of those two columns would look perfect on the seed
 * alone. Row 1 halves an Activity's mark and puts it back afterwards, which is
 * the only way that band's width becomes evidence of anything.
 */

const db = createPool({ schema: E2E_SCHEMA });

let section;
let restoreActivity;
let invented;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) [section] = await mySectionIds(page);
  restoreActivity = [];
  invented = { clos: [], activities: [], sections: [] };
});

test.afterEach(async () => {
  for (const row of restoreActivity) {
    await db.query('UPDATE activities SET score_number = $2 WHERE id = $1', [
      row.id,
      row.score_number,
    ]);
    await db.query(
      `UPDATE activity_clo_mapping SET score = ROUND($2::numeric * weight / 100.0, 2)
        WHERE activity_id = $1`,
      [row.id, row.score_number],
    );
  }
  for (const cloId of invented.clos) {
    await db.query('DELETE FROM subject_clo WHERE clo_id = $1', [cloId]);
  }
  for (const activityId of invented.activities) {
    await db.query('DELETE FROM activities WHERE id = $1', [activityId]);
  }
  for (const sectionId of invented.sections) {
    await db.query('DELETE FROM course_sections_teacher WHERE section_id = $1', [sectionId]);
    await db.query('DELETE FROM course_sections WHERE section_id = $1', [sectionId]);
  }
});

test.afterAll(async () => {
  await db.end();
});

/**
 * Re-marks one Activity out of forty instead of a hundred, the way #33's
 * editor would: the attribution is recomputed in the database from the weight,
 * so the per cent stays where it was and the marks move.
 */
async function worthForty(activityId) {
  const { rows } = await db.query('SELECT id, score_number FROM activities WHERE id = $1', [
    activityId,
  ]);
  restoreActivity.push(rows[0]);
  await db.query('UPDATE activities SET score_number = 40 WHERE id = $1', [activityId]);
  await db.query(
    'UPDATE activity_clo_mapping SET score = ROUND(40 * weight / 100.0, 2) WHERE activity_id = $1',
    [activityId],
  );
}

/** An outcome of this Offering that no Activity assesses — the seed has none. */
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
  invented.clos.push(rows[0].clo_id);
  return rows[0].clo_id;
}

/**
 * A piece of work in this ตอนเรียน that is attributed to no outcome.
 *
 * The seed ships one of these — #32 needs an Activity nothing points at, so
 * that something in the whole dataset can be deleted — and row 3 read it for a
 * while. It was wrong to: `32a` deletes that very Activity, so the row passed
 * alone and failed in a full run, which is the worst way for a row to be
 * wrong. A row that needs a situation builds the situation, as the one above
 * does for an outcome nothing assesses.
 */
async function unattributedActivity(name) {
  const { rows } = await db.query(
    `INSERT INTO activities (section_id, activity_type, activity_name, description, score_number)
     VALUES ($1, 'individual', $2, $3, 10)
     RETURNING id`,
    [section, name, 'ใบงานที่เพิ่งสร้าง ยังไม่ได้ผูกกับผลการเรียนรู้'],
  );
  invented.activities.push(rows[0].id);
  return rows[0].id;
}

/** A ตอนเรียน of the same Offering with nothing set in it yet. */
async function bareSection(number) {
  const { rows } = await db.query(
    `INSERT INTO course_sections (semester_course_id, section_number)
     SELECT cs.semester_course_id, $2 FROM course_sections cs WHERE cs.section_id = $1
     RETURNING section_id`,
    [section, number],
  );
  const bare = rows[0].section_id;
  invented.sections.push(bare);
  await db.query('INSERT INTO course_sections_teacher (section_id, user_id) VALUES ($1, $2)', [
    bare,
    IDS.teacherOne,
  ]);
  return bare;
}

test('row 1: a band is drawn as thick as the marks it carries, and not as its per cent', async ({
  page,
}) => {
  // One Activity re-marked out of forty. Its bands keep the per cent the ผู้สอน
  // typed and lose more than half their marks, so a diagram drawn from the
  // wrong column parts company with the right one here and nowhere else.
  const { rows } = await db.query(
    `SELECT m.activity_id FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
      WHERE a.section_id = $1 AND m.weight >= 50
      ORDER BY m.activity_id ASC LIMIT 1`,
    [section],
  );
  await worthForty(rows[0].activity_id);

  await openMap(page, section);
  const bands = await bandsOf(page);

  const { rows: links } = await db.query(
    `SELECT count(*)::int AS n FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
      WHERE a.section_id = $1 AND m.clo_id IS NOT NULL`,
    [section],
  );
  expect(bands.length).toBe(links[0].n);

  // Every band drawn on one scale — the same marks, the same width — so a
  // reader comparing two of them is comparing marks and nothing else.
  const perMark = bands[0].drawn / bands[0].marks;
  for (const band of bands) {
    expect(band.drawn).toBeCloseTo(band.marks * perMark, 1);
  }

  // And the halved one, named: it says fifty per cent and twenty marks, and it
  // is drawn thinner than a band saying thirty-three of each.
  const halved = bands.find((band) => band.weight === 50 && band.marks === 20);
  const third = bands.find((band) => band.weight === 33 && band.marks === 33);
  expect(halved).toBeTruthy();
  expect(third).toBeTruthy();
  expect(halved.drawn).toBeLessThan(third.drawn);
});

test('row 2: an outcome no Activity assesses is drawn and named, not left out', async ({
  page,
}) => {
  await unassessedOutcome('CLO-95');

  await openMap(page, section);

  // In the diagram, with a body: a node scaled honestly to nought marks would
  // be nought pixels tall, which is the one drawing that hides it.
  const bar = node(page, 'CLO-95');
  await expect(bar).toHaveCount(1);
  expect(Number(await bar.getAttribute('height'))).toBeGreaterThan(0);

  // And in words, because what a ผู้สอน is meant to act on should not have to
  // be spotted in a picture.
  await expect(page.getByRole('status').filter({ hasText: 'ยังไม่มีกิจกรรมใดวัด' })).toContainText(
    'CLO-95',
  );

  // And in the outcome table, where the count of what reaches it is nought.
  // What it shows for a *mean* is row 5's claim and is asserted there, against
  // every outcome at once rather than against this one twice.
  await expect(activityCountOf(page, 'CLO-95')).toHaveText('0');
});

test('row 3: work attributed to no outcome is drawn and named too', async ({ page }) => {
  const name = 'ใบงานที่ยังไม่ได้ผูก (แถวของ 39a)';
  await unattributedActivity(name);

  await openMap(page, section);

  await expect(node(page, name)).toHaveCount(1);
  await expect(
    page.getByRole('status').filter({ hasText: 'ยังไม่ได้ผูกกับผลการเรียนรู้' }),
  ).toContainText(name);
});

test('row 4: the three counts are on the screen and agree with what is drawn', async ({ page }) => {
  await openMap(page, section);

  const { rows } = await db.query(
    `SELECT (SELECT count(*)::int FROM subject_clo c
               JOIN semester_courses sc
                 ON sc.program_id = c.program_id AND sc.subject_id = c.subject_id
                AND sc.academic_year = c.academic_year
               JOIN course_sections cs ON cs.semester_course_id = sc.id
              WHERE cs.section_id = $1) AS clos,
            (SELECT count(*)::int FROM activities WHERE section_id = $1) AS activities,
            (SELECT count(*)::int FROM activity_clo_mapping m
               JOIN activities a ON a.id = m.activity_id
              WHERE a.section_id = $1 AND m.clo_id IS NOT NULL) AS links`,
    [section],
  );

  await expect(page.getByText(`${rows[0].clos} ข้อ`, { exact: true })).toBeVisible();
  await expect(page.getByText(`${rows[0].activities} กิจกรรม`, { exact: true })).toBeVisible();
  await expect(page.getByText(`${rows[0].links} เส้น`, { exact: true })).toBeVisible();

  // And the diagram has a node for every one of them. A card that said nine
  // over a drawing of eight would be a screen arguing with itself in front of
  // the person reading it — how *many* bands there are is row 1's claim and is
  // left there, so that a diagram mutant kills one row rather than two.
  await expect(page.locator('svg[role="img"] rect')).toHaveCount(
    rows[0].clos + rows[0].activities,
  );
});

test('row 5: each outcome carries its own mean, and says what the mean is of', async ({
  page,
}) => {
  const response = await openMap(page, section);
  const body = await response.json();

  // Against the answer rather than against a shape. `\d.\d\d` would be
  // satisfied by any number on the screen — the marks attached to the outcome,
  // for one, which is a plausible field to reach for and is not a mean of
  // anything. The figure has to be *that outcome's* mean, and a mean is one of
  // the two numbers on this screen a ผู้สอน cannot check by looking at the
  // diagram.
  for (const clo of body.clos) {
    await expect(meanOf(page, clo.clo_number)).toContainText(
      clo.mean === null ? '—' : clo.mean.toFixed(2),
    );
  }

  // And it says what it counted. A figure that does not is read as a share of
  // the class however it is worded — #38's card note, one screen over.
  expect(await meanOf(page, 'CLO-1').innerText()).toMatch(/จาก \d+ คนที่มีคะแนน/);
});

test('row 6: every band has a row of its own in the detail table, with its per cent and its marks', async ({
  page,
}) => {
  // Halved again, for row 1's reason: on the seed alone the per cent column
  // and the marks column hold the same number, and a table printing one of
  // them twice would read perfectly.
  const { rows } = await db.query(
    `SELECT m.activity_id FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
      WHERE a.section_id = $1 AND m.weight >= 50
      ORDER BY m.activity_id ASC LIMIT 1`,
    [section],
  );
  await worthForty(rows[0].activity_id);

  await openMap(page, section);

  // Against the attribution table itself rather than against the diagram. The
  // detail table is the only one of the three readings on this screen that a
  // person can check a number in, so what it is held against is the rows the
  // numbers came from — and a mutant that broke the drawing then kills row 1
  // alone rather than this row with it.
  const { rows: expected } = await db.query(
    `SELECT c.clo_number, a.activity_name, m.weight, m.score::float AS marks
       FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
       JOIN subject_clo c ON c.clo_id = m.clo_id
      WHERE a.section_id = $1`,
    [section],
  );

  const labels = await detailLabels(page);
  expect(labels.length).toBe(expected.length);

  for (const link of expected) {
    const row = detailRow(page, link.clo_number, link.activity_name);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(`${link.weight}%`);
    await expect(row).toContainText(link.marks.toFixed(2));
  }
});

test('row 7: the diagram scrolls in its own frame, so a narrow window never moves the page', async ({
  page,
}) => {
  await openMap(page, section);
  await page.setViewportSize({ width: 640, height: 900 });

  const measured = await page.evaluate(() => {
    const diagram = document.querySelector('svg[role="img"]').parentElement;
    const frame = diagram.parentElement;
    frame.scrollLeft = 9999;
    return {
      wider: diagram.scrollWidth > frame.clientWidth,
      reachable: frame.scrollLeft > 0,
      pageScrollsSideways:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  expect(measured.wider).toBe(true);
  expect(measured.reachable).toBe(true);
  expect(measured.pageScrollsSideways).toBe(false);
});

test('row 8: a ตอนเรียน with no Activities says so instead of drawing half a diagram', async ({
  page,
}) => {
  const bare = await bareSection('91');

  const response = await openMap(page, bare);
  expect(response.status()).toBe(200);

  await expect(page.getByText('ยังไม่มีกิจกรรมการเรียนรู้ในตอนเรียนนี้')).toBeVisible();
  await expect(page.locator('svg[role="img"]')).toHaveCount(0);
  await expect(page.locator('table')).toHaveCount(0);
});

test('row 9: the ตอนเรียน of another account is refused rather than drawn', async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.teacherTwo);

  const response = await openMap(page, section);

  expect(response.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound, { exact: true })).toBeVisible();

  // And nothing underneath it. #43's hand-walk found two screens showing a
  // refusal with กำลังโหลดข้อมูล… below it for ever, because the read cleared its
  // loading flag only on the way out through success.
  await expect(page.getByText('กำลังโหลดข้อมูล…')).toHaveCount(0);
});

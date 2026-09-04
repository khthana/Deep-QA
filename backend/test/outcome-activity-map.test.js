'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/39-outcome-to-activity-map.md — the server half.
 *
 * #39 draws the attribution table. Everything on the screen is one of three
 * things: a node, a band between two nodes, or a count of those. So what is
 * asserted here is what the answer has to contain for a diagram to be drawn
 * from it at all, and one number that is not the diagram's — the mean per
 * outcome, which #38 also shows and which the two screens are not allowed to
 * disagree about.
 *
 * ## The width of a band is marks, not per cent
 *
 * `activity_clo_mapping` carries both. `weight` is a percentage *of its own
 * Activity* — BR-11 makes each Activity's weights sum to a hundred — and
 * `score` is what that percentage comes to in marks, computed in the database
 * when the row is saved so the two cannot drift.
 *
 * A diagram drawn on `weight` would say that a ten-mark exercise giving all of
 * itself to one outcome loads that outcome as heavily as a hundred-mark
 * project does, because both rows read 100. Every band on this screen is
 * therefore marks, and the per cent travels beside it in the table because it
 * is what a ผู้สอน typed and will recognise.
 *
 * ## Two nodes with nothing attached to them, and both are the point
 *
 * An outcome no Activity assesses is the fifth criterion in as many words. An
 * Activity attributed to no outcome is the same fact from the other end, and
 * the seed ships one on purpose — #32's undeletable-Activity problem left it
 * there. Both are in the answer with no links against them, because a node
 * that vanishes when it has nothing attached is a screen that hides exactly
 * the case it exists to show.
 */

const DEPT_COMPUTER = '05';

let api;
let teacherOne;
let teacherTwo;
let section;
let theirs;

before(async () => {
  api = await startApi('outcome_activity_map', { withSeed: true });
  teacherOne = await teaching('U_TEACH');
  teacherTwo = await teaching('U_TEACH2');
  section = await seededSection('U_TEACH', CURRENT_YEAR);
  theirs = await seededSection('U_MULTI', CURRENT_YEAR);
});
after(() => api.close());

const emailOf = (alias) => ACCOUNTS.find((account) => account.alias === alias).email;

async function signInAs(alias) {
  const response = await request(api.app)
    .post('/api/auth/login')
    .send({ email: emailOf(alias), password: PASSWORD });
  assert.equal(response.status, 200, 'sign-in failed for ' + alias + ': ' + response.body.message);
  return response.headers['set-cookie'];
}

async function actingAsTeacher(cookie) {
  const switched = await request(api.app)
    .put('/api/me/acting-role')
    .set('Cookie', cookie)
    .send({ role_id: 'TEACHER', scope_id: DEPT_COMPUTER });
  assert.equal(switched.status, 200, switched.body.message);
  return switched.headers['set-cookie'];
}

async function teaching(alias) {
  const cookie = await signInAs(alias);
  return alias === 'U_MULTI' ? actingAsTeacher(cookie) : cookie;
}

async function seededSection(alias, year) {
  const { rows } = await api.pool.query(
    `SELECT cs.section_id FROM course_sections_teacher cst
       JOIN course_sections cs ON cs.section_id = cst.section_id
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cst.user_id = $1 AND sc.academic_year = $2 AND sc.semester = $3`,
    [byAlias(alias), year, SEMESTER],
  );
  assert.equal(rows.length, 1, 'expected exactly one seeded section for ' + alias);
  return rows[0].section_id;
}

const map = (sectionId, cookie) =>
  request(api.app)
    .get(`/api/teaching/sections/${sectionId}/outcome-activity-map`)
    .set('Cookie', cookie);

const details = (sectionId, cookie) =>
  request(api.app).get(`/api/teaching/sections/${sectionId}/learning-details`).set('Cookie', cookie);

/** The attribution rows of this Section, straight from the table. */
async function attribution() {
  const { rows } = await api.pool.query(
    `SELECT m.activity_id, m.clo_id, m.weight, m.score::float AS marks
       FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
      WHERE a.section_id = $1 AND m.clo_id IS NOT NULL
      ORDER BY m.activity_id ASC, m.sequence_order ASC`,
    [section],
  );
  assert.ok(rows.length > 0, 'the seed has no attribution rows to map');
  return rows;
}

test('the map answers with every outcome of the Offering and every Activity of the ตอนเรียน', async () => {
  const response = await map(section, teacherOne);
  assert.equal(response.status, 200);

  // The outcomes are the Offering's — (program, subject, year), ADR-0003 —
  // and not the ones the attribution table happens to reach.
  const { rows: outcomes } = await api.pool.query(
    `SELECT c.clo_number FROM subject_clo c
       JOIN semester_courses sc
         ON sc.program_id = c.program_id AND sc.subject_id = c.subject_id
        AND sc.academic_year = c.academic_year
       JOIN course_sections cs ON cs.semester_course_id = sc.id
      WHERE cs.section_id = $1 ORDER BY c.clo_number ASC, c.clo_id ASC`,
    [section],
  );
  assert.deepEqual(
    response.body.clos.map((one) => one.clo_number),
    outcomes.map((row) => row.clo_number),
  );

  // In the order #32's list draws them — by หมวดคะแนน, then by age — so that
  // the diagram's rows are the ones the ผู้สอน already knows the order of.
  const { rows: activities } = await api.pool.query(
    `SELECT a.id FROM activities a
       LEFT JOIN subject_score_ratio r ON r.score_ratio_id = a.score_ratio_id
      WHERE a.section_id = $1
      ORDER BY r.sequence_order ASC NULLS LAST, a.id ASC`,
    [section],
  );
  assert.deepEqual(
    response.body.activities.map((one) => one.activity_id),
    activities.map((row) => row.id),
  );
});

test('a link carries the per cent it was saved with and the marks that per cent comes to', async () => {
  const rows = await attribution();
  const { links } = (await map(section, teacherOne)).body;

  assert.deepEqual(
    links.map((one) => ({
      activity_id: one.activity_id,
      clo_id: one.clo_id,
      weight: one.weight,
      marks: one.marks,
    })),
    rows.map((row) => ({
      activity_id: row.activity_id,
      clo_id: row.clo_id,
      weight: row.weight,
      marks: row.marks,
    })),
  );

  // Every Activity in the seed is worth a hundred marks, which is the one mark
  // at which a per cent and the marks it comes to are the same number. So the
  // answer above cannot tell the two apart, and a route that sent `weight`
  // twice would pass every assertion in it. The row below is what separates
  // them, and it has to make the situation itself.
  assert.ok(links.every((one) => one.weight === one.marks));
});

test('the marks of a link follow the Activity’s own mark, and the per cent does not', async () => {
  const rows = await attribution();
  const [link] = rows;
  const { rows: was } = await api.pool.query(
    'SELECT score_number FROM activities WHERE id = $1',
    [link.activity_id],
  );

  // Forty marks rather than a hundred, with the attribution recomputed the way
  // #33's editor computes it — in the database, from the weight, so that the
  // share and the full mark cannot drift apart by a rounding step taken in
  // another language.
  await api.pool.query('UPDATE activities SET score_number = 40 WHERE id = $1', [
    link.activity_id,
  ]);
  await api.pool.query(
    'UPDATE activity_clo_mapping SET score = ROUND(40 * weight / 100.0, 2) WHERE activity_id = $1',
    [link.activity_id],
  );

  try {
    const body = (await map(section, teacherOne)).body;
    const moved = body.links.filter((one) => one.activity_id === link.activity_id);

    assert.ok(moved.length > 0);
    for (const one of moved) {
      // The per cent is what the ผู้สอน typed and has not changed. The marks
      // are what it comes to and have.
      assert.equal(one.weight, rows.find((row) => row.clo_id === one.clo_id).weight);
      assert.equal(one.marks, Math.round((40 * one.weight) / 100 * 100) / 100);
      assert.notEqual(one.marks, one.weight);
    }

    // And the node the band is drawn from is the marks and not the per cent:
    // an Activity now worth forty carries forty, however its weights read.
    const node = body.activities.find((one) => one.activity_id === link.activity_id);
    assert.equal(node.marks, 40);
  } finally {
    await api.pool.query('UPDATE activities SET score_number = $2 WHERE id = $1', [
      link.activity_id,
      was[0].score_number,
    ]);
    await api.pool.query(
      `UPDATE activity_clo_mapping SET score = ROUND($2::numeric * weight / 100.0, 2)
        WHERE activity_id = $1`,
      [link.activity_id, was[0].score_number],
    );
  }
});

test('an Activity of another ตอนเรียน is not in the map, and neither are its links', async () => {
  const { activities, links } = (await map(section, teacherOne)).body;

  const { rows: mine } = await api.pool.query(
    'SELECT id FROM activities WHERE section_id = $1',
    [section],
  );
  const ids = new Set(mine.map((row) => row.id));

  assert.ok(activities.every((one) => ids.has(one.activity_id)));
  assert.ok(links.every((one) => ids.has(one.activity_id)));
});

test('the counts are the lists’ own lengths, not a second reading of the tables', async () => {
  const { counts, clos, activities, links } = (await map(section, teacherOne)).body;

  assert.equal(counts.clos, clos.length);
  assert.equal(counts.activities, activities.length);
  assert.equal(counts.links, links.length);

  // And the lengths themselves are the tables', so the three cards cannot all
  // agree with each other and with nothing else.
  const { rows } = await api.pool.query(
    `SELECT (SELECT count(*)::int FROM activities WHERE section_id = $1) AS activities,
            (SELECT count(*)::int FROM activity_clo_mapping m
               JOIN activities a ON a.id = m.activity_id
              WHERE a.section_id = $1 AND m.clo_id IS NOT NULL) AS links`,
    [section],
  );
  assert.equal(counts.activities, rows[0].activities);
  assert.equal(counts.links, rows[0].links);
});

test('a node carries the marks of the links attached to it, on both sides', async () => {
  const rows = await attribution();
  const { clos, activities } = (await map(section, teacherOne)).body;

  const total = (list, key, id) =>
    Math.round(
      list.filter((row) => row[key] === id).reduce((sum, row) => sum + row.marks, 0) * 100,
    ) / 100;

  for (const clo of clos) {
    assert.equal(clo.marks, total(rows, 'clo_id', clo.clo_id), 'marks of ' + clo.clo_number);
    assert.equal(clo.link_count, rows.filter((row) => row.clo_id === clo.clo_id).length);
  }
  for (const activity of activities) {
    assert.equal(activity.marks, total(rows, 'activity_id', activity.activity_id));
    assert.equal(
      activity.link_count,
      rows.filter((row) => row.activity_id === activity.activity_id).length,
    );
  }
});

test('an Activity attributed to no outcome is a node with no links, not an absence', async () => {
  // The seed ships exactly one, and it is there for #32's reason rather than
  // this one: every other Activity has marks against it and cannot be deleted.
  const { rows } = await api.pool.query(
    `SELECT a.id, a.activity_name FROM activities a
      WHERE a.section_id = $1
        AND NOT EXISTS (SELECT 1 FROM activity_clo_mapping m WHERE m.activity_id = a.id)`,
    [section],
  );
  assert.equal(rows.length, 1, 'the seed’s unmapped Activity is what this row is about');

  const { activities, links } = (await map(section, teacherOne)).body;
  const node = activities.find((one) => one.activity_id === rows[0].id);

  assert.ok(node, 'the unmapped Activity is a node');
  assert.equal(node.activity_name, rows[0].activity_name);
  assert.equal(node.link_count, 0);
  assert.equal(node.marks, 0);
  assert.ok(!links.some((one) => one.activity_id === rows[0].id));
});

test('an outcome no Activity assesses is a node with no links, not a missing node', async () => {
  const { rows: made } = await api.pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
     SELECT sc.program_id, sc.subject_id, sc.academic_year, $2, $3
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1
     RETURNING clo_id`,
    [section, 'CLO-99', 'ผลการเรียนรู้ที่ยังไม่มีกิจกรรมใดวัด'],
  );
  const cloId = made[0].clo_id;
  try {
    const { clos, links, counts } = (await map(section, teacherOne)).body;
    const node = clos.find((one) => one.clo_id === cloId);

    assert.ok(node, 'the unassessed outcome is a node');
    assert.equal(node.link_count, 0);
    assert.equal(node.marks, 0);
    // Not a mean of nought: nobody has been measured on it at all.
    assert.equal(node.mean, null);
    assert.equal(node.student_count, 0);
    assert.ok(!links.some((one) => one.clo_id === cloId));
    assert.equal(counts.clos, clos.length);
  } finally {
    await api.pool.query('DELETE FROM subject_clo WHERE clo_id = $1', [cloId]);
  }
});

test('an attribution row pointing at another year’s outcome is not a link here', async () => {
  // The mapping table carries `clo_id` and nothing else, so nothing in the
  // schema stops a row pointing at an outcome of a different Offering —
  // `activities.js`' save path is the only guard, and it is not this route's.
  // Counted but not drawable, such a row would put the ความเชื่อมโยง card one
  // ahead of the diagram under it.
  const { rows: stray } = await api.pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
     SELECT sc.program_id, sc.subject_id, '2500', $2, $3
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1
     RETURNING clo_id`,
    [section, 'CLO-1', 'ผลการเรียนรู้ของการเปิดสอนปีอื่น'],
  );
  const cloId = stray[0].clo_id;

  const { rows: host } = await api.pool.query(
    `SELECT m.activity_id, m.score_ratio_id, max(m.sequence_order) AS last
       FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
      WHERE a.section_id = $1
      GROUP BY m.activity_id, m.score_ratio_id
      ORDER BY m.activity_id ASC LIMIT 1`,
    [section],
  );
  await api.pool.query(
    `INSERT INTO activity_clo_mapping (activity_id, sequence_order, clo_id, weight, score_ratio_id, score)
     VALUES ($1, $2, $3, 10, $4, 10)`,
    [host[0].activity_id, Number(host[0].last) + 1, cloId, host[0].score_ratio_id],
  );

  try {
    const { links, counts, clos, activities } = (await map(section, teacherOne)).body;

    assert.ok(!links.some((one) => one.clo_id === cloId));
    assert.ok(!clos.some((one) => one.clo_id === cloId));
    assert.equal(counts.links, links.length);

    // And the Activity it was attached to is unchanged: the row is dropped,
    // not the work it was written against.
    const node = activities.find((one) => one.activity_id === host[0].activity_id);
    assert.equal(node.link_count, links.filter((one) => one.activity_id === node.activity_id).length);
  } finally {
    await api.pool.query('DELETE FROM activity_clo_mapping WHERE clo_id = $1', [cloId]);
    await api.pool.query('DELETE FROM subject_clo WHERE clo_id = $1', [cloId]);
  }
});

test('the mean per outcome is the same figure the heatmap shows for it', async () => {
  // Two screens, one Section, one number. #38 computes it from the roll
  // outward and this route from the marks inward, which is the shape drift
  // takes: both go on rendering plausible figures and only somebody holding
  // the two side by side would see them disagree.
  const [mapped, heat] = await Promise.all([
    map(section, teacherOne),
    details(section, teacherOne),
  ]);

  const means = new Map(heat.body.clos.map((clo) => [clo.clo_id, clo.mean]));
  assert.ok(means.size > 0);

  for (const clo of mapped.body.clos) {
    assert.equal(clo.mean, means.get(clo.clo_id), 'mean of ' + clo.clo_number);
    assert.equal(
      clo.student_count,
      heat.body.clos.find((one) => one.clo_id === clo.clo_id).student_count,
    );
  }
});

test('a mark left blank is left out of the mean here too, and not read as a nought', async () => {
  const { rows } = await api.pool.query(
    `SELECT m.activity_id, m.clo_id FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
       JOIN subject_clo c ON c.clo_id = m.clo_id
      WHERE a.section_id = $1 AND c.clo_number = $2`,
    [section, 'CLO-7'],
  );
  assert.ok(rows.length > 0);

  const { rows: roll } = await api.pool.query(
    'SELECT student_id FROM student_course WHERE section_id = $1 ORDER BY student_id ASC',
    [section],
  );
  const student = roll[0].student_id;

  const before = (await map(section, teacherOne)).body.clos.find(
    (one) => one.clo_number === 'CLO-7',
  );

  await api.pool.query(
    `UPDATE activity_scores SET score = NULL
      WHERE student_id = $1 AND clo_id = $2 AND activity_id = ANY($3)`,
    [student, rows[0].clo_id, rows.map((row) => row.activity_id)],
  );

  const after = (await map(section, teacherOne)).body.clos.find((one) => one.clo_number === 'CLO-7');

  // One fewer student measured, not one more student at nought. The count is
  // what says which of the two happened; the mean alone could move either way.
  assert.equal(after.student_count, before.student_count - 1);
});

test('a ตอนเรียน with no Activities answers empty rather than with an empty diagram', async () => {
  const { rows: made } = await api.pool.query(
    `INSERT INTO course_sections (semester_course_id, section_number)
     SELECT cs.semester_course_id, $2 FROM course_sections cs WHERE cs.section_id = $1
     RETURNING section_id`,
    [section, '90'],
  );
  const bare = made[0].section_id;
  await api.pool.query(
    `INSERT INTO course_sections_teacher (section_id, user_id) VALUES ($1, $2)`,
    [bare, byAlias('U_TEACH')],
  );
  try {
    const response = await map(bare, teacherOne);
    assert.equal(response.status, 200);
    assert.equal(response.body.empty, true);
    assert.deepEqual(response.body.activities, []);
    assert.deepEqual(response.body.links, []);
    // The outcomes are still there: they belong to the Offering and not to the
    // Activities, and a ตอนเรียน that has set no work still has outcomes to set
    // it against.
    assert.ok(response.body.clos.length > 0);
  } finally {
    await api.pool.query('DELETE FROM course_sections_teacher WHERE section_id = $1', [bare]);
    await api.pool.query('DELETE FROM course_sections WHERE section_id = $1', [bare]);
  }
});

test('a ตอนเรียน this account does not teach is refused, and the refusal is the server’s', async () => {
  const response = await map(theirs, teacherTwo);
  assert.equal(response.status, 404);
  assert.equal(response.body.message, REFUSALS.sectionNotFound);
});

test('a ตอนเรียน that is not a ตอนเรียน is refused the same way', async () => {
  const response = await map(999999, teacherOne);
  assert.equal(response.status, 404);
  assert.equal(response.body.message, REFUSALS.sectionNotFound);
});

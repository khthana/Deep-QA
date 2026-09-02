'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/38-learning-detail-heatmap.md — the server half.
 *
 * #38 is the first screen that *computes* rather than records, and every number
 * on it is an opinion about marks that #34 stored. The opinions are here rather
 * than in the browser for the reason docs/06 gives: a normalisation error shows
 * up as a plausible-looking wrong number, not as a crash, so the place to pin
 * it is where the number is made.
 *
 * ## Four rules, and where each of them comes from
 *
 * - **BR-18** puts a CLO score on a scale of five. A student's score for one
 *   outcome is what they earned over what was available to them, times five.
 * - **BR-20** bands it: under 3.0, 3.0–3.4, 3.5–3.9, 4.0–4.4, 4.5 and over.
 *   The first band is the flagged one.
 * - **BR-17** passes a CLO when *more than* sixty per cent of its students
 *   passed it. Exactly sixty does not, which `docs/04` TC-EVAL-004 asks for in
 *   so many words.
 * - A student passes an outcome at **3.0 of five**, which is not in the schema
 *   because the criteria table holds four sentences rather than a number. Two
 *   rules already agree on it: sixty per cent of five is three exactly, and
 *   three is where BR-20 stops flagging. Settled with the user before building.
 *
 * ## What a blank mark means here
 *
 * #34's rule — blank is *not marked*, never nought — decides more on this
 * screen than on the one that stores it. An Activity a student has no mark for
 * is left out of **both halves** of the fraction rather than counted as a zero
 * earned, because counting it would be reading a blank as a nought a term
 * before anybody marked the work. A student with no marks at all for an
 * outcome has no score, and is absent from that outcome's mean and pass rate
 * rather than dragging them down.
 *
 * ## The band edges are seeded, not hoped for
 *
 * The seed's own marks land between 3.8 and 4.0, which exercises two bands of
 * the five. So the rows that are about the boundaries write their own marks on
 * each edge — 2.99 and 3.0, 3.4 and 3.5, 3.9 and 4.0, 4.4 and 4.5 — which is
 * the ticket's eighth criterion asking for exactly that.
 */

const DEPT_COMPUTER = '05';

let api;
let teacherOne;
let teacherTwo;
let section;
let theirs;

before(async () => {
  api = await startApi('learning_details', { withSeed: true });
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

const details = (sectionId, cookie) =>
  request(api.app).get(`/api/teaching/sections/${sectionId}/learning-details`).set('Cookie', cookie);

/** The roll, in the order the grid draws it. */
async function roll() {
  const { rows } = await api.pool.query(
    `SELECT sc.student_id FROM student_course sc
      WHERE sc.section_id = $1 ORDER BY sc.student_id ASC`,
    [section],
  );
  return rows.map((row) => row.student_id);
}

/** One outcome's attribution rows in this Section, and what each is worth. */
async function attributionOf(cloNumber) {
  const { rows } = await api.pool.query(
    `SELECT m.id, m.activity_id, m.clo_id, m.score
       FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
       JOIN subject_clo c ON c.clo_id = m.clo_id
      WHERE a.section_id = $1 AND c.clo_number = $2
      ORDER BY m.activity_id ASC`,
    [section, cloNumber],
  );
  assert.ok(rows.length > 0, 'no attribution rows for ' + cloNumber);
  return rows;
}

/**
 * Puts one student on an exact score out of five for one outcome, by clearing
 * every attribution row of it and writing the whole of the wanted fraction onto
 * the first. The rest stay blank, which is the same as being left out — that is
 * the rule the third row below is about, used here as a tool.
 */
async function place(studentId, cloNumber, outOfFive) {
  const rows = await attributionOf(cloNumber);
  const [first] = rows;
  const wanted = (Number(first.score) * outOfFive) / 5;
  await api.pool.query(
    `UPDATE activity_scores SET score = NULL
      WHERE student_id = $1 AND clo_id = $2 AND activity_id = ANY($3)`,
    [studentId, first.clo_id, rows.map((row) => row.activity_id)],
  );
  await api.pool.query(
    `UPDATE activity_scores SET score = $1
      WHERE student_id = $2 AND activity_id = $3 AND clo_id = $4`,
    [Math.round(wanted * 100) / 100, studentId, first.activity_id, first.clo_id],
  );
}

/** One student's cell for one outcome, out of the answer. */
function cellOf(body, studentId, cloNumber) {
  const clo = body.clos.find((one) => one.clo_number === cloNumber);
  assert.ok(clo, 'no outcome ' + cloNumber + ' in the answer');
  const student = body.students.find((one) => one.student_id === studentId);
  assert.ok(student, 'no student ' + studentId + ' in the answer');
  return student.scores[String(clo.clo_id)];
}

test('the heatmap answers with every enrolled student and every outcome of the Section', async () => {
  const response = await details(section, teacherOne);
  assert.equal(response.status, 200);

  const enrolled = await roll();
  assert.equal(response.body.students.length, enrolled.length);
  assert.deepEqual(
    response.body.students.map((one) => one.student_id),
    enrolled,
  );

  const { rows } = await api.pool.query(
    `SELECT DISTINCT c.clo_number FROM subject_clo c
       JOIN activity_clo_mapping m ON m.clo_id = c.clo_id
       JOIN activities a ON a.id = m.activity_id
      WHERE a.section_id = $1 ORDER BY c.clo_number ASC`,
    [section],
  );
  assert.deepEqual(
    response.body.clos.map((one) => one.clo_number),
    rows.map((row) => row.clo_number),
  );
});

test('a student’s outcome score is what they earned over what was available, out of five', async () => {
  const [student] = await roll();
  const rows = await attributionOf('CLO-1');

  // Half of every attribution row is half of the outcome, which is 2.5 of five
  // whatever the Activities happen to be worth.
  for (const row of rows) {
    await api.pool.query(
      `UPDATE activity_scores SET score = $1
        WHERE student_id = $2 AND activity_id = $3 AND clo_id = $4`,
      [Math.round((Number(row.score) / 2) * 100) / 100, student, row.activity_id, row.clo_id],
    );
  }

  const response = await details(section, teacherOne);
  assert.equal(cellOf(response.body, student, 'CLO-1').score, 2.5);
});

test('an Activity the student has no mark for is left out, not counted as a nought', async () => {
  const [student] = await roll();
  const rows = await attributionOf('CLO-1');
  assert.ok(rows.length > 1, 'this row needs an outcome assessed by more than one Activity');

  // Full marks on the first, and nothing at all on the rest. Counting the
  // blanks as noughts would make this a fraction of five rather than five.
  await api.pool.query(
    `UPDATE activity_scores SET score = NULL
      WHERE student_id = $1 AND clo_id = $2 AND activity_id = ANY($3)`,
    [student, rows[0].clo_id, rows.map((row) => row.activity_id)],
  );
  await api.pool.query(
    `UPDATE activity_scores SET score = $1
      WHERE student_id = $2 AND activity_id = $3 AND clo_id = $4`,
    [rows[0].score, student, rows[0].activity_id, rows[0].clo_id],
  );

  const response = await details(section, teacherOne);
  assert.equal(cellOf(response.body, student, 'CLO-1').score, 5);
});

test('a student with no marks at all for an outcome has no score, and is not in its mean', async () => {
  const enrolled = await roll();
  const student = enrolled[1];
  const rows = await attributionOf('CLO-2');

  await api.pool.query(
    `UPDATE activity_scores SET score = NULL
      WHERE student_id = $1 AND clo_id = $2 AND activity_id = ANY($3)`,
    [student, rows[0].clo_id, rows.map((row) => row.activity_id)],
  );

  const response = await details(section, teacherOne);
  const cell = cellOf(response.body, student, 'CLO-2');
  assert.equal(cell.score, null);
  assert.equal(cell.band, null);

  const clo = response.body.clos.find((one) => one.clo_number === 'CLO-2');
  assert.equal(clo.student_count, enrolled.length - 1);
});

test('the five bands, with a mark seeded on each edge', async () => {
  const enrolled = await roll();
  const edges = [
    [2.99, 1],
    [3.0, 2],
    [3.4, 2],
    [3.5, 3],
    [3.9, 3],
    [4.0, 4],
    [4.4, 4],
    [4.5, 5],
    [5.0, 5],
  ];

  for (const [index, [score]] of edges.entries()) {
    await place(enrolled[index], 'CLO-3', score);
  }

  const response = await details(section, teacherOne);
  for (const [index, [score, band]] of edges.entries()) {
    const cell = cellOf(response.body, enrolled[index], 'CLO-3');
    assert.equal(cell.score, score, 'score at edge ' + score);
    assert.equal(cell.band, band, 'band at edge ' + score);
  }
});

test('below three is the flagged band, and nothing at or above three is', async () => {
  const enrolled = await roll();
  await place(enrolled[0], 'CLO-4', 2.99);
  await place(enrolled[1], 'CLO-4', 3.0);

  const response = await details(section, teacherOne);
  assert.equal(cellOf(response.body, enrolled[0], 'CLO-4').flagged, true);
  assert.equal(cellOf(response.body, enrolled[1], 'CLO-4').flagged, false);
});

test('an outcome passes when more than sixty per cent of its students passed it', async () => {
  const enrolled = await roll();
  // Three of five above the line is sixty per cent exactly; four is more.
  const five = enrolled.slice(0, 5);
  await clearOutcome('CLO-5', enrolled);
  for (const [index, student] of five.entries()) {
    await place(student, 'CLO-5', index < 4 ? 4 : 2);
  }

  const response = await details(section, teacherOne);
  const clo = response.body.clos.find((one) => one.clo_number === 'CLO-5');
  assert.equal(clo.student_count, 5);
  assert.equal(clo.pass_rate, 80);
  assert.equal(clo.passed, true);
});

test('sixty per cent exactly does not pass, because the rule is more than sixty', async () => {
  const enrolled = await roll();
  const five = enrolled.slice(0, 5);
  await clearOutcome('CLO-6', enrolled);
  for (const [index, student] of five.entries()) {
    await place(student, 'CLO-6', index < 3 ? 4 : 2);
  }

  const response = await details(section, teacherOne);
  const clo = response.body.clos.find((one) => one.clo_number === 'CLO-6');
  assert.equal(clo.pass_rate, 60);
  assert.equal(clo.passed, false);
});

test('the outcomes needing attention are the ones that did not pass, named rather than coloured', async () => {
  const response = await details(section, teacherOne);
  const failing = response.body.clos.filter((one) => one.passed === false);

  assert.deepEqual(
    response.body.attention.map((one) => one.clo_number),
    failing.map((one) => one.clo_number),
  );
  for (const one of response.body.attention) {
    assert.equal(typeof one.clo_detail, 'string');
    assert.ok(one.clo_detail.length > 0);
    assert.equal(typeof one.pass_rate, 'number');
  }
});

test('mean, pass rate and student count agree with the marks underneath them', async () => {
  const response = await details(section, teacherOne);
  const { students, summary } = response.body;

  const scored = students.flatMap((student) =>
    Object.values(student.scores)
      .map((cell) => cell.score)
      .filter((score) => score !== null),
  );
  const mean = scored.reduce((sum, score) => sum + score, 0) / scored.length;

  assert.equal(summary.student_count, students.length);
  assert.equal(summary.mean, Math.round(mean * 100) / 100);
  assert.equal(
    summary.pass_rate,
    Math.round((scored.filter((score) => score >= 3).length / scored.length) * 1000) / 10,
  );
});

test('the figures agree with the marks in the database, not only with each other', async () => {
  // The check above reads the summary against the cells the same answer sent,
  // which proves the two halves of one response consistent and nothing more. A
  // route that computed every cell from the wrong column would pass it. So this
  // one goes back to `activity_scores` and does the arithmetic again from there.
  const { rows } = await api.pool.query(
    `SELECT s.student_id, s.clo_id,
            SUM(s.score)::float AS earned,
            SUM(m.score)::float AS available
       FROM activity_scores s
       JOIN activities a ON a.id = s.activity_id
       JOIN activity_clo_mapping m
         ON m.activity_id = s.activity_id AND m.clo_id = s.clo_id
      WHERE a.section_id = $1 AND s.score IS NOT NULL
      GROUP BY s.student_id, s.clo_id`,
    [section],
  );
  const expected = rows
    .filter((row) => Number(row.available) > 0)
    .map((row) => Math.round((Number(row.earned) / Number(row.available)) * 5 * 100) / 100);
  assert.ok(expected.length > 0);

  const { summary, students } = (await details(section, teacherOne)).body;

  assert.equal(
    summary.mean,
    Math.round((expected.reduce((sum, score) => sum + score, 0) / expected.length) * 100) / 100,
  );
  assert.equal(
    summary.pass_rate,
    Math.round((expected.filter((score) => score >= 3).length / expected.length) * 1000) / 10,
  );

  // And the roll is the roll, not the count of anything that was marked.
  const { rows: enrolled } = await api.pool.query(
    'SELECT count(*)::int AS n FROM student_course WHERE section_id = $1',
    [section],
  );
  assert.equal(summary.student_count, enrolled[0].n);
  assert.equal(students.length, enrolled[0].n);
});

test('the flagged mark and the lowest band are the same line, at every edge', async () => {
  // The payload carries both, and two derivations of one fact can drift. They
  // coincide because the user put the pass line on a band floor; if that ever
  // moves, this is the test that says so rather than a screen that quietly
  // draws a red cell next to a mark saying the student passed.
  const enrolled = await roll();
  const edges = [2.9, 2.99, 3.0, 3.01, 3.4, 3.5, 4.4, 4.5, 5.0];
  for (const [index, wanted] of edges.entries()) {
    await place(enrolled[index], 'CLO-1', wanted);
  }

  const body = (await details(section, teacherOne)).body;
  for (const [index] of edges.entries()) {
    const cell = cellOf(body, enrolled[index], 'CLO-1');
    assert.equal(cell.flagged, cell.band === 1, `band ${cell.band} at ${cell.score}`);
  }
});

test('an outcome no Activity assesses is a column of blanks, not a missing column', async () => {
  // The teaching plan's gap is the thing worth seeing. Selecting the columns
  // through the attribution table would have drawn no column at all, which is
  // the one answer that hides it.
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
    const body = (await details(section, teacherOne)).body;
    const column = body.clos.find((clo) => clo.clo_id === cloId);

    assert.ok(column, 'the unassessed outcome is a column');
    assert.equal(column.student_count, 0);
    assert.equal(column.mean, null);
    assert.equal(column.pass_rate, null);
    // Not failed and not passed: nobody has been asked.
    assert.equal(column.passed, null);
    assert.ok(!body.attention.some((one) => one.clo_id === cloId));
    for (const student of body.students) {
      assert.equal(student.scores[cloId].score, null);
      assert.equal(student.scores[cloId].band, null);
      assert.equal(student.scores[cloId].flagged, false);
    }
  } finally {
    await api.pool.query('DELETE FROM subject_clo WHERE clo_id = $1', [cloId]);
  }
});

test('the bands the legend draws come from the rule, not from the browser', async () => {
  // BR-20's edges travel with the data so the legend under the heatmap has no
  // second copy of them to go stale.
  const { band_floors: floors } = (await details(section, teacherOne)).body;
  assert.deepEqual(floors, [0, 3.0, 3.5, 4.0, 4.5]);
});

test('a Section with no marks at all answers empty rather than with noughts', async () => {
  await api.pool.query(
    `UPDATE activity_scores SET score = NULL
      WHERE activity_id IN (SELECT id FROM activities WHERE section_id = $1)`,
    [section],
  );

  const response = await details(section, teacherOne);
  assert.equal(response.status, 200);
  assert.equal(response.body.empty, true);
  assert.equal(response.body.summary.mean, null);
  assert.equal(response.body.summary.pass_rate, null);
  assert.equal(response.body.summary.student_count, (await roll()).length);
  assert.deepEqual(response.body.attention, []);
});

test('a Section this account does not teach is refused, and the refusal is the server’s', async () => {
  const response = await details(theirs, teacherTwo);
  assert.equal(response.status, 404);
  assert.equal(response.body.message, REFUSALS.sectionNotFound);
});

test('a Section that is not a Section is refused the same way', async () => {
  const response = await details(999999, teacherOne);
  assert.equal(response.status, 404);
  assert.equal(response.body.message, REFUSALS.sectionNotFound);
});

/** Blanks every mark of one outcome, so a row can build its own cohort. */
async function clearOutcome(cloNumber, enrolled) {
  const rows = await attributionOf(cloNumber);
  await api.pool.query(
    `UPDATE activity_scores SET score = NULL
      WHERE clo_id = $1 AND activity_id = ANY($2) AND student_id = ANY($3)`,
    [rows[0].clo_id, rows.map((row) => row.activity_id), enrolled],
  );
}

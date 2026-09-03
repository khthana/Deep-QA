'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, COHORTS, PROGRAM, PROGRAM_INTL } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/43-program-level-all-students.md — the server half.
 *
 * #42 asks how an intake did on each outcome. This asks the question that
 * average cannot answer: *who*. A curriculum can meet its mean on an outcome
 * while a quarter of the cohort has never once reached the line, and the mean
 * is the one figure that will not say so.
 *
 * The arithmetic is #42's, unchanged and shared through `lib/cohort.js` — a
 * student's CLO score is what they earned over what was available times five,
 * their outcome score is the mean of the CLO scores naming it. What is new
 * here is that the roll-up stops one step earlier: #42 takes those per-student
 * scores and reduces them to one figure per outcome, and this hands them over
 * as they are.
 *
 * ## Counting what a rule defines, not inventing a figure
 *
 * The ticket asks for the weakest students to be reachable without scanning,
 * which needs an order, which needs a number per student. There is no such
 * number in the rules: BR-17 is about one outcome across a cohort, BR-18 and
 * BR-20 about one student on one outcome, and a mean across a student's
 * outcomes would be a threshold nobody agreed to — the same trap #38 declined
 * to walk into when it refused to give a student a Section-wide score.
 *
 * So the order is built from a **count of things the rules do define**: how
 * many outcomes this student is below BR-18's line on, out of how many they
 * have been measured on at all. `2 จาก 7` is checkable against the row it sits
 * beside; a mean of 3.14 across seven outcomes is not checkable against
 * anything. Agreed with the user before this was built.
 */

let api;
before(async () => {
  api = await startApi('program_results_students', { withSeed: true });
  await seedFixtureCohort();
});
after(() => api.close());

const emailOf = (alias) => ACCOUNTS.find((account) => account.alias === alias).email;

async function signInAs(alias) {
  const response = await request(api.app)
    .post('/api/auth/login')
    .send({ email: emailOf(alias), password: PASSWORD });
  assert.equal(response.status, 200, `sign-in failed for ${alias}: ${response.body.message}`);
  return response.headers['set-cookie'];
}

const CURRENT_COHORT = COHORTS[0];

const heatmap = (cookie, query) =>
  request(api.app).get(`/api/program-results/by-intake/students${query}`).set('Cookie', cookie);

const forIntake = (cookie, admission, program = PROGRAM) =>
  heatmap(cookie, `?program_id=${program}&admission_year=${admission}`);

/**
 * A cohort of this file's own, with four students who differ in the way the
 * screen exists to show.
 *
 * All four sit the same Activity, worth a hundred to each of the three CLOs
 * that name PLO-2, so every CLO score is the mark below over a hundred times
 * five and every PLO-2 score is the mean of three of them.
 *
 *   ก  80 / 60 / 100  →  4.0, 3.0, 5.0  →  PLO-2 = 4.00   below the line on 0
 *   ข  40 / 50 /  90  →  2.0, 2.5, 4.5  →  PLO-2 = 3.00   below the line on 0
 *   ค  20 / 30 /  40  →  1.0, 1.5, 2.0  →  PLO-2 = 1.50   below the line on 1
 *   ง  no marks at all                  →  PLO-2 = —      measured on 0
 *
 * ข is the one that matters most: three exactly is BR-18's line and the line
 * is *at or above*, so a count written with `<=` instead of `<` would call ข
 * failing and nothing else on the screen would look wrong.
 */
const FIXTURE_INTAKE = '2600';
const FIXTURE_FULL_MARK = 100;
const FIXTURE_STUDENTS = [
  { student_id: 'X60001', name: 'ก', marks: [80, 60, 100], plo2: 4.0, band: 4, below: 0, measured: 1 },
  { student_id: 'X60002', name: 'ข', marks: [40, 50, 90], plo2: 3.0, band: 2, below: 0, measured: 1 },
  { student_id: 'X60003', name: 'ค', marks: [20, 30, 40], plo2: 1.5, band: 1, below: 1, measured: 1 },
  { student_id: 'X60004', name: 'ง', marks: null, plo2: null, band: null, below: 0, measured: 0 },
];

/** A second intake: on the roll, and nobody has marked anything yet. */
const UNMARKED_INTAKE = '2601';
const UNMARKED_STUDENT = 'X60101';

/** The three CLOs of the current Offering that name PLO-2, lowest number first. */
async function clos() {
  const { rows } = await api.pool.query(
    `SELECT c.clo_id, c.clo_number FROM subject_clo c
       JOIN learning_outcomes o ON o.outcome_id = c.plo_id
      WHERE c.program_id = $1 AND c.academic_year = $2 AND o.outcome_code = 'PLO-2'
      ORDER BY c.clo_number ASC`,
    [PROGRAM, CURRENT_COHORT.year],
  );
  assert.equal(rows.length, 3, 'the seed is expected to give PLO-2 three CLOs');
  return rows;
}

/** The Section the current cohort's first group sits in. */
async function firstSection() {
  const { rows } = await api.pool.query(
    `SELECT cs.section_id FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE sc.program_id = $1 AND sc.academic_year = $2
      ORDER BY cs.section_id ASC LIMIT 1`,
    [PROGRAM, CURRENT_COHORT.year],
  );
  return rows[0].section_id;
}

async function enrol(studentId, name, admission, section) {
  await api.pool.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status)
     VALUES ($1, $2, 'ทดสอบ', (SELECT department_id FROM programs WHERE program_id = $3), $3, $4, 'active')`,
    [studentId, name, PROGRAM, admission],
  );
  await api.pool.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
    studentId,
    section,
  ]);
}

async function seedFixtureCohort() {
  const outcomes = await clos();
  const section = await firstSection();

  const { rows: activity } = await api.pool.query(
    `INSERT INTO activities (section_id, score_ratio_id, activity_type, activity_name, score_number)
     VALUES ($1, (SELECT score_ratio_id FROM subject_score_ratio
                   WHERE program_id = $2 AND subject_id = (SELECT subject_id FROM semester_courses
                                                            WHERE program_id = $2 AND academic_year = $3
                                                            ORDER BY id ASC LIMIT 1)
                     AND academic_year = $3
                   ORDER BY sequence_order ASC LIMIT 1),
             'individual', 'งานของชุดทดสอบ #43', $4)
     RETURNING id`,
    [section, PROGRAM, CURRENT_COHORT.year, FIXTURE_FULL_MARK * outcomes.length],
  );
  const activityId = activity[0].id;

  for (const [index, clo] of outcomes.entries()) {
    await api.pool.query(
      `INSERT INTO activity_clo_mapping (activity_id, sequence_order, clo_id, weight, score_ratio_id, score)
       VALUES ($1, $2, $3, $4, (SELECT score_ratio_id FROM activities WHERE id = $1), $5)`,
      [activityId, index + 1, clo.clo_id, FIXTURE_FULL_MARK, FIXTURE_FULL_MARK],
    );
  }

  for (const student of FIXTURE_STUDENTS) {
    await enrol(student.student_id, student.name, FIXTURE_INTAKE, section);
    if (student.marks === null) continue;
    for (const [index, clo] of outcomes.entries()) {
      await api.pool.query(
        `INSERT INTO activity_scores (student_id, activity_id, clo_id, score) VALUES ($1, $2, $3, $4)`,
        [student.student_id, activityId, clo.clo_id, student.marks[index]],
      );
    }
  }

  await enrol(UNMARKED_STUDENT, 'จ', UNMARKED_INTAKE, section);

}

/** The row of one fixture student, by code. */
const rowOf = (body, studentId) =>
  body.students.find((student) => student.student_id === studentId);

test('the heatmap has a row for every student of the intake and a column for every outcome', async () => {
  const cookie = await signInAs('U_COM');
  const response = await forIntake(cookie, FIXTURE_INTAKE);

  assert.equal(response.status, 200);

  // Every student on the roll, including the one nobody has marked. A heatmap
  // built from the marks would have drawn three rows and said nothing about
  // the fourth, and *nobody has assessed this student at all* is the row a
  // committee most needs to find.
  assert.equal(response.body.students.length, FIXTURE_STUDENTS.length);
  for (const student of FIXTURE_STUDENTS) {
    assert.ok(rowOf(response.body, student.student_id), `${student.student_id} is missing`);
  }

  // Every main outcome of the curriculum, not only the ones some CLO names —
  // #42's rule, and for its reason.
  const { rows } = await api.pool.query(
    `SELECT count(*)::int AS main FROM learning_outcomes
      WHERE program_id = $1 AND parent_outcome_id IS NULL`,
    [PROGRAM],
  );
  assert.equal(response.body.plos.length, rows[0].main);
});

const ploIdOf = (body, code) =>
  body.plos.find((plo) => plo.outcome_code === code).outcome_id;

test("a cell is that student's own score for that outcome, banded", async () => {
  const cookie = await signInAs('U_COM');
  const { body } = await forIntake(cookie, FIXTURE_INTAKE);
  const plo2 = ploIdOf(body, 'PLO-2');

  // The four figures are the ones worked out on paper in the comment above the
  // fixture, and the bands are BR-20's floors read against them: 4.00 has
  // reached 4.0 and not 4.5, 3.00 has reached 3.0 and not 3.5, 1.50 has
  // reached nothing and is the flagged band.
  for (const student of FIXTURE_STUDENTS.filter((row) => row.marks !== null)) {
    assert.deepEqual(
      rowOf(body, student.student_id).scores[plo2],
      { score: student.plo2, band: student.band, flagged: student.plo2 < 3 },
      `${student.student_id} PLO-2`,
    );
  }

  // The student nobody has marked has a cell for every outcome and a score in
  // none of them — a row of dashes rather than a row of noughts, which would
  // have said they sat everything and earned nothing.
  const unmarked = rowOf(body, 'X60004');
  assert.equal(unmarked.scores[plo2].score, null);
  assert.equal(unmarked.scores[plo2].band, null);
  assert.equal(Object.keys(unmarked.scores).length, body.plos.length);
});

test('the two counts a reader is ordered by are counts of things the rules define', async () => {
  const cookie = await signInAs('U_COM');
  const { body } = await forIntake(cookie, FIXTURE_INTAKE);

  for (const student of FIXTURE_STUDENTS) {
    const row = rowOf(body, student.student_id);
    assert.equal(row.measured_count, student.measured, `${student.student_id} measured_count`);
    assert.equal(row.below_count, student.below, `${student.student_id} below_count`);
  }

  // ข is the row that decides the boundary: three exactly is BR-18's line and
  // the line is *at or above*, so a count written with `<=` calls ข failing.
  assert.equal(rowOf(body, 'X60002').below_count, 0);
});

test('an intake on the roll with nothing marked gets a sentence, not a grid of noughts', async () => {
  const cookie = await signInAs('U_COM');
  const { body } = await forIntake(cookie, UNMARKED_INTAKE);

  assert.equal(body.empty, true);
  // The roll still comes back — the students exist and the screen may say how
  // many there are — and every cell of it is empty rather than nought.
  assert.equal(body.students.length, 1);
  assert.equal(rowOf(body, UNMARKED_STUDENT).measured_count, 0);
  for (const cell of Object.values(rowOf(body, UNMARKED_STUDENT).scores)) {
    assert.equal(cell.score, null);
  }
});

test('a year nobody was admitted in is an empty roll rather than a refusal', async () => {
  const cookie = await signInAs('U_COM');
  const { status, body } = await forIntake(cookie, '2999');

  assert.equal(status, 200);
  assert.deepEqual(body.students, []);
  assert.equal(body.empty, true);
});

test('the committee is answered for its own curriculum and refused another, at the server', async () => {
  const ours = await signInAs('U_COM');
  const theirs = await forIntake(ours, FIXTURE_INTAKE, PROGRAM_INTL);

  // Not found rather than forbidden, and the same answer a curriculum that does
  // not exist gets: a refusal that distinguishes them tells the caller which
  // curricula are real (ADR-0002).
  assert.equal(theirs.status, 404);
  assert.equal(theirs.body.message, REFUSALS.programNotFound);

  // And the guard is a guard rather than a blanket: 0503's own committee reads
  // 0503 and is refused 0501, which is the mirror of the line above.
  const other = await signInAs('U_COM2');
  assert.equal((await forIntake(other, CURRENT_COHORT.admission, PROGRAM_INTL)).status, 200);
  assert.equal((await forIntake(other, FIXTURE_INTAKE, PROGRAM)).status, 404);
});

test('a ผู้สอน does not reach the whole-cohort heatmap at all', async () => {
  const cookie = await signInAs('U_TEACH');
  assert.equal((await forIntake(cookie, FIXTURE_INTAKE)).status, 403);
});

test('the external assessor reads it, as they read the report beside it', async () => {
  const cookie = await signInAs('U_EXT');
  assert.equal((await forIntake(cookie, FIXTURE_INTAKE)).status, 200);
});

test("the legend's ranges travel with the answer rather than being known by the browser", async () => {
  const cookie = await signInAs('U_COM');
  const { body } = await forIntake(cookie, FIXTURE_INTAKE);

  // BR-20's floors themselves. The screen draws its legend by reading these,
  // so a payload without them is a legend that renders nothing or throws —
  // and the *same five ranges as the course-level heatmap* is the second
  // criterion, which cannot be met by a screen that has its own copy.
  assert.deepEqual(body.band_floors, [0, 3.0, 3.5, 4.0, 4.5]);
});

test('marks that reach no column leave the grid empty rather than nearly empty', async () => {
  const cookie = await signInAs('U_COM');

  // A CLO of this curriculum that names no outcome — `subject_clo.plo_id` is
  // nullable — carrying a mark for a student of an intake of its own. There
  // are marks, and not one of them belongs to any column of this screen.
  const { rows: taught } = await api.pool.query(
    `SELECT subject_id FROM semester_courses
      WHERE program_id = $1 AND academic_year = $2 ORDER BY id ASC LIMIT 1`,
    [PROGRAM, CURRENT_COHORT.year],
  );
  const { rows: clo } = await api.pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail, plo_id)
     VALUES ($1, $2, $3, 'CLO-ไร้ข้อผูก', 'ไม่ได้ชี้ไปที่ผลการเรียนรู้ข้อใด', NULL)
     RETURNING clo_id`,
    [PROGRAM, taught[0].subject_id, CURRENT_COHORT.year],
  );
  const { rows: activity } = await api.pool.query(
    `INSERT INTO activities (section_id, score_ratio_id, activity_type, activity_name, score_number)
     VALUES ($1,
             (SELECT score_ratio_id FROM subject_score_ratio
               WHERE program_id = $2 AND academic_year = $3 ORDER BY sequence_order ASC LIMIT 1),
             'individual', 'งานที่ไม่ผูกกับผลการเรียนรู้ข้อใด', 100)
     RETURNING id`,
    [await firstSection(), PROGRAM, CURRENT_COHORT.year],
  );
  await api.pool.query(
    `INSERT INTO activity_clo_mapping (activity_id, sequence_order, clo_id, weight, score_ratio_id, score)
     VALUES ($1, 1, $2, 100, (SELECT score_ratio_id FROM activities WHERE id = $1), 100)`,
    [activity[0].id, clo[0].clo_id],
  );
  const student = 'X60201';
  await enrol(student, 'ฉ', '2602', (await firstSection()));
  await api.pool.query(
    `INSERT INTO activity_scores (student_id, activity_id, clo_id, score) VALUES ($1, $2, $3, 90)`,
    [student, activity[0].id, clo[0].clo_id],
  );

  try {
    const { body } = await forIntake(cookie, '2602');
    // Not one cell has a figure in it, so the screen says so. Counted from the
    // rows the marks query returned, this would have answered *not empty* and
    // drawn thirteen columns of dashes.
    assert.equal(rowOf(body, student).measured_count, 0);
    assert.equal(body.empty, true);
  } finally {
    await api.pool.query(`DELETE FROM activity_scores WHERE student_id = $1`, [student]);
    await api.pool.query(`DELETE FROM student_course WHERE student_id = $1`, [student]);
    await api.pool.query(`DELETE FROM student WHERE student_id = $1`, [student]);
    await api.pool.query(`DELETE FROM activity_clo_mapping WHERE activity_id = $1`, [activity[0].id]);
    await api.pool.query(`DELETE FROM activities WHERE id = $1`, [activity[0].id]);
    await api.pool.query(`DELETE FROM subject_clo WHERE clo_id = $1`, [clo[0].clo_id]);
  }
});

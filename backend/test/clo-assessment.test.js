'use strict';

const test = require('node:test');
const { before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/40-clo-assessment-report.md — the server half.
 *
 * #40 is the formal assessment table: one row per outcome, the criterion it
 * was judged by, the share of students who met it, and whether the outcome
 * passed. It is the document that goes in the course file, so what is asserted
 * here is mostly *is the number on the paper the number the rule produces*.
 *
 * ## The criterion is the rule, not the rubric
 *
 * `subject_clo_achievement_criteria` holds four **sentences** per outcome —
 * ดีเยี่ยม / ดี / พอใช้ / ต้องปรับปรุง — and not one number among them. The line
 * that actually decides pass or fail is `PASS = 3` out of five, which
 * `lib/attainment.js` is explicit did not come from that table, plus BR-17's
 * sixty per cent of the class.
 *
 * So the criterion column states the rule that judged, and the four bands
 * travel beside it as the reference they are. A report printing a rubric
 * sentence next to a figure computed from a different rule would invite every
 * reader to believe the sentence produced the figure — the same failure as a
 * band drawn from marks under a heading that says per cent.
 *
 * ## The threshold is asserted from both sides
 *
 * The eighth criterion asks for marks *at and either side of* the line, and
 * there are two lines here, not one. BR-20's `PASS` decides whether one
 * student met the outcome; BR-17's sixty per cent decides whether the outcome
 * itself passed on the share who did. Both are pinned below by rewriting marks
 * rather than by trusting the seed, because the seed sits nowhere near either
 * edge — every outcome in it passes comfortably, which is the one arrangement
 * that cannot show a threshold working.
 */

const DEPT_COMPUTER = '05';

let api;
let teacherOne;
let teacherTwo;
let section;
let theirs;
let snapshot;

before(async () => {
  api = await startApi('clo_assessment', { withSeed: true });
  teacherOne = await teaching('U_TEACH');
  teacherTwo = await teaching('U_TEACH2');
  section = await seededSection('U_TEACH', CURRENT_YEAR);
  theirs = await seededSection('U_MULTI', CURRENT_YEAR);
  // In this hook and not a second `before`: node:test does not run two of them
  // in registration order, so a snapshot taken in its own hook read an `api`
  // that was still undefined.
  snapshot = await allMarks();
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

const report = (sectionId, cookie) =>
  request(api.app).get(`/api/teaching/sections/${sectionId}/clo-assessment`).set('Cookie', cookie);

const details = (sectionId, cookie) =>
  request(api.app).get(`/api/teaching/sections/${sectionId}/learning-details`).set('Cookie', cookie);

/**
 * Every mark of this ตอนเรียน, kept so a test can put them all back.
 *
 * Three of the tests below rewrite marks to stand a threshold on its edge.
 * Restoring from a snapshot rather than from a remembered handful is what
 * stops the fourth test reading the third's leftovers — the failure mode
 * `39a` hit when a row read the seed's own unmapped Activity.
 */
async function allMarks() {
  const { rows } = await api.pool.query(
    `SELECT s.score_id, s.score
       FROM activity_scores s
       JOIN activities a ON a.id = s.activity_id
      WHERE a.section_id = $1`,
    [section],
  );
  return rows;
}

async function restore(snapshot) {
  for (const row of snapshot) {
    await api.pool.query(`UPDATE activity_scores SET score = $1 WHERE score_id = $2`, [
      row.score,
      row.score_id,
    ]);
  }
}

/** The students on the roll who have a mark against one outcome, in a fixed order. */
async function measuredOn(cloNumber) {
  const { rows } = await api.pool.query(
    `SELECT DISTINCT s.student_id
       FROM activity_scores s
       JOIN activities a ON a.id = s.activity_id
       JOIN student_course e
         ON e.section_id = a.section_id AND e.student_id = s.student_id
       JOIN subject_clo c ON c.clo_id = s.clo_id
      WHERE a.section_id = $1 AND s.score IS NOT NULL AND c.clo_number = $2
      ORDER BY s.student_id ASC`,
    [section, cloNumber],
  );
  return rows.map((row) => row.student_id);
}

/**
 * Give these students every mark, and those students none, on one outcome.
 *
 * The scores are set to the Activity's own full mark and to nought, so the
 * resulting outcome score is exactly five or exactly nought — comfortably
 * either side of `PASS` — and the share who passed is the share named here.
 * That is what lets the sixty-per-cent edge be placed on a chosen student
 * count rather than hoped for.
 */
async function markOutcome(cloNumber, passing) {
  await api.pool.query(
    `UPDATE activity_scores s
        SET score = CASE WHEN s.student_id = ANY($3) THEN m.score ELSE 0 END
       FROM activities a, activity_clo_mapping m, subject_clo c
      WHERE s.activity_id = a.id AND a.section_id = $1
        AND m.activity_id = s.activity_id AND m.clo_id = s.clo_id
        AND c.clo_id = s.clo_id AND c.clo_number = $2
        AND s.score IS NOT NULL`,
    [section, cloNumber, passing],
  );
}

const lineOf = (body, cloNumber) => body.clos.find((one) => one.clo_number === cloNumber);

beforeEach(async () => {
  await restore(snapshot);
});

test('the report answers with every outcome of the Offering, in reading order', async () => {
  const response = await report(section, teacherOne);
  assert.equal(response.status, 200);

  // ADR-0003's grain: the outcomes belong to the (Program, Subject, year), not
  // to the ตอนเรียน, and not to whatever the marks happen to reach.
  const { rows: outcomes } = await api.pool.query(
    `SELECT c.clo_number, c.clo_detail FROM subject_clo c
       JOIN semester_courses sc
         ON sc.program_id = c.program_id AND sc.subject_id = c.subject_id
        AND sc.academic_year = c.academic_year
       JOIN course_sections cs ON cs.semester_course_id = sc.id
      WHERE cs.section_id = $1 ORDER BY c.clo_number ASC, c.clo_id ASC`,
    [section],
  );
  assert.ok(outcomes.length > 0, 'the seed has no outcomes to report on');
  assert.deepEqual(
    response.body.clos.map((one) => one.clo_number),
    outcomes.map((row) => row.clo_number),
  );
  assert.deepEqual(
    response.body.clos.map((one) => one.clo_detail),
    outcomes.map((row) => row.clo_detail),
  );
});

test('the rule the report judged by travels with it, rather than being typed on the screen', async () => {
  const { body } = await report(section, teacherOne);

  // The three numbers of the criterion sentence, from `lib/attainment.js` and
  // not from a copy: a score is out of five, three of five is the line one
  // student passes on, and more than sixty per cent of the measured students
  // must have reached it. A page component writing these out itself is a copy
  // that would go on printing the old rule after the rule moved.
  assert.deepEqual(body.rule, { scale: 5, pass_score: 3, pass_percent: 60 });
});

test('each outcome carries the four achievement bands, best band first', async () => {
  const { body } = await report(section, teacherOne);

  for (const clo of body.clos) {
    const { rows } = await api.pool.query(
      `SELECT criteria_no, achievement_level, criteria_detail
         FROM subject_clo_achievement_criteria
        WHERE clo_id = $1 ORDER BY criteria_no ASC`,
      [clo.clo_id],
    );
    assert.deepEqual(
      clo.criteria.map((one) => one.achievement_level),
      rows.map((row) => row.achievement_level),
      'bands out of order on ' + clo.clo_number,
    );
    assert.deepEqual(
      clo.criteria.map((one) => one.criteria_detail),
      rows.map((row) => row.criteria_detail),
    );
  }

  // R065's four, and the seed writes them best first — so the reference table
  // on the report reads down from ดีเยี่ยม the way a rubric is read.
  assert.deepEqual(
    body.clos[0].criteria.map((one) => one.achievement_level),
    ['ดีเยี่ยม', 'ดี', 'พอใช้', 'ต้องปรับปรุง'],
  );
});

test('an outcome nobody has been marked on is blank rather than failing', async () => {
  const { rows } = await api.pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
     SELECT sc.program_id, sc.subject_id, sc.academic_year, 'CLO-97', $2
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1
     RETURNING clo_id`,
    [section, 'ผลการเรียนรู้ที่ยังไม่มีใครถูกวัด'],
  );
  try {
    const line = lineOf((await report(section, teacherOne)).body, 'CLO-97');
    assert.ok(line, 'an outcome with no marks fell out of the report');

    // Not nought and not false. An outcome nobody has been measured against
    // has not failed its criterion; it has not been assessed, and a formal
    // report that printed *ไม่ผ่าน* against it would be making an accusation
    // the marks do not support.
    assert.equal(line.student_count, 0);
    assert.equal(line.passed_count, 0);
    assert.equal(line.mean, null);
    assert.equal(line.pass_rate, null);
    assert.equal(line.passed, null);

    // It still carries whatever criteria it has, which for a fresh outcome is
    // none — the report says *เกณฑ์ยังไม่ได้กำหนด* rather than drawing a gap.
    assert.deepEqual(line.criteria, []);
  } finally {
    await api.pool.query(`DELETE FROM subject_clo WHERE clo_id = $1`, [rows[0].clo_id]);
  }
});

test('the fraction on the report is the pass rate it is printed beside', async () => {
  const { body } = await report(section, teacherOne);

  for (const clo of body.clos) {
    if (clo.student_count === 0) continue;
    assert.ok(clo.passed_count <= clo.student_count, clo.clo_number + ' passed more than measured');

    // The percentage a reader sees and the fraction beside it must be one
    // quantity written twice, to the tenth `passRateOf` rounds to.
    const fromFraction = Math.round((clo.passed_count / clo.student_count) * 1000) / 10;
    assert.equal(clo.pass_rate, fromFraction, 'fraction and per cent disagree on ' + clo.clo_number);
  }
});

test('a student exactly on the pass line counts as having met the criterion', async () => {
  const number = 'CLO-1';
  const roll = await measuredOn(number);
  assert.ok(roll.length >= 5, 'need a few measured students to place the line');

  // Everybody at nought first, so the outcome is unambiguously failing, then
  // one student lifted to exactly three of five — sixty per cent of the marks
  // available to them. BR-20 reads `>=`, so that student has met it.
  await markOutcome(number, []);
  const bottom = lineOf((await report(section, teacherOne)).body, number);
  assert.equal(bottom.passed_count, 0);
  assert.equal(bottom.pass_rate, 0);
  // The third side of BR-17's edge. At sixty exactly and above sixty are
  // asserted in their own tests below; nought is the side that says the
  // comparison is a comparison at all rather than a constant.
  assert.equal(bottom.passed, false);

  await api.pool.query(
    `UPDATE activity_scores s
        SET score = m.score * 0.6
       FROM activities a, activity_clo_mapping m, subject_clo c
      WHERE s.activity_id = a.id AND a.section_id = $1
        AND m.activity_id = s.activity_id AND m.clo_id = s.clo_id
        AND c.clo_id = s.clo_id AND c.clo_number = $2
        AND s.student_id = $3 AND s.score IS NOT NULL`,
    [section, number, roll[0]],
  );

  const line = lineOf((await report(section, teacherOne)).body, number);
  assert.equal(line.passed_count, 1, 'a score of exactly 3.00 was not counted as a pass');
});

test('a student just under the pass line does not', async () => {
  const number = 'CLO-1';
  const roll = await measuredOn(number);

  await markOutcome(number, []);
  await api.pool.query(
    `UPDATE activity_scores s
        SET score = m.score * 0.59
       FROM activities a, activity_clo_mapping m, subject_clo c
      WHERE s.activity_id = a.id AND a.section_id = $1
        AND m.activity_id = s.activity_id AND m.clo_id = s.clo_id
        AND c.clo_id = s.clo_id AND c.clo_number = $2
        AND s.student_id = $3 AND s.score IS NOT NULL`,
    [section, number, roll[0]],
  );

  const line = lineOf((await report(section, teacherOne)).body, number);
  assert.ok(line.mean < 3, 'the arrangement did not put the student under the line');
  assert.equal(line.passed_count, 0, 'a score under 3.00 was counted as a pass');
});

test('an outcome exactly sixty per cent of whose students passed has not passed', async () => {
  const number = 'CLO-1';
  const roll = await measuredOn(number);

  // BR-17 reads *มากกว่า 60%*, strictly. Three of five is sixty exactly, which
  // is the case the word *more* exists to exclude and the one an implementation
  // written with `>=` gets wrong in the direction nobody notices: a report that
  // passes an outcome the rule fails.
  const five = roll.slice(0, 5);
  await markOutcome(number, five.slice(0, 3));
  await api.pool.query(
    `UPDATE activity_scores s SET score = NULL
       FROM activities a, subject_clo c
      WHERE s.activity_id = a.id AND a.section_id = $1
        AND c.clo_id = s.clo_id AND c.clo_number = $2
        AND NOT (s.student_id = ANY($3))`,
    [section, number, five],
  );

  const line = lineOf((await report(section, teacherOne)).body, number);
  assert.equal(line.student_count, 5);
  assert.equal(line.passed_count, 3);
  assert.equal(line.pass_rate, 60);
  assert.equal(line.passed, false, 'sixty per cent exactly was treated as passing');
});

test('and one student more than that has', async () => {
  const number = 'CLO-1';
  const roll = await measuredOn(number);

  const five = roll.slice(0, 5);
  await markOutcome(number, five.slice(0, 4));
  await api.pool.query(
    `UPDATE activity_scores s SET score = NULL
       FROM activities a, subject_clo c
      WHERE s.activity_id = a.id AND a.section_id = $1
        AND c.clo_id = s.clo_id AND c.clo_number = $2
        AND NOT (s.student_id = ANY($3))`,
    [section, number, five],
  );

  const line = lineOf((await report(section, teacherOne)).body, number);
  assert.equal(line.pass_rate, 80);
  assert.equal(line.passed, true);
});

test('the report names the Subject, ตอนเรียน, year and semester the PDF has to carry', async () => {
  const { body } = await report(section, teacherOne);

  const { rows } = await api.pool.query(
    `SELECT cs.section_number, sc.academic_year, sc.semester, sc.subject_id,
            s.subject_name_th, s.subject_name_en
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
       JOIN subjects s ON s.subject_id = sc.subject_id
      WHERE cs.section_id = $1`,
    [section],
  );
  const seeded = rows[0];

  assert.equal(body.section.section_number, seeded.section_number);
  assert.equal(body.section.academic_year, seeded.academic_year);
  assert.equal(body.section.semester, seeded.semester);
  assert.equal(body.section.subject_id, seeded.subject_id);

  // The Thai name specifically. `sectionOf` carries the English one because
  // #26's heading wanted it, and a course file submitted in Thai naming its
  // subject in English is the document failing at the first line.
  assert.equal(body.subject.subject_name_th, seeded.subject_name_th);
  assert.ok(body.subject.subject_name_th.length > 0);
});

test('the per-outcome figures are the ones #38 reports for the same ตอนเรียน', async () => {
  const mine = (await report(section, teacherOne)).body;
  const theirs38 = (await details(section, teacherOne)).body;

  // The two screens fold the same marks with the same library, from two
  // queries. This is the assertion that makes the day they part company a red
  // test rather than the day somebody puts two printouts side by side.
  const byNumber = new Map(theirs38.clos.map((clo) => [clo.clo_number, clo]));
  for (const clo of mine.clos) {
    const other = byNumber.get(clo.clo_number);
    assert.ok(other, '#38 does not report ' + clo.clo_number);
    assert.equal(clo.mean, other.mean, 'means differ on ' + clo.clo_number);
    assert.equal(clo.pass_rate, other.pass_rate, 'pass rates differ on ' + clo.clo_number);
    assert.equal(clo.passed, other.passed, 'pass verdicts differ on ' + clo.clo_number);
    assert.equal(clo.student_count, other.student_count);
  }
});

test('a ตอนเรียน with no marks yet says so instead of reporting a column of blanks', async () => {
  await api.pool.query(
    `UPDATE activity_scores s SET score = NULL
       FROM activities a
      WHERE s.activity_id = a.id AND a.section_id = $1`,
    [section],
  );

  const { body } = await report(section, teacherOne);
  assert.equal(body.empty, true);

  // The outcomes are still in the answer — they are what the report is about,
  // and this route does not decide what a screen draws. `empty` is the flag
  // that lets it choose; #40's page replaces the table with a sentence, as
  // #39's does, rather than drawing nine dashes for a reader to interpret.
  assert.ok(body.clos.length > 0);
  assert.ok(body.clos.every((one) => one.mean === null && one.passed === null));
});

test('a รายวิชา whose outcomes nobody has written yet is its own answer, not "no marks"', async () => {
  // `[].every()` is true, so an Offering with no CLOs would report `empty` and
  // the screen would say *ยังไม่มีคะแนน* about a รายวิชา whose real problem is
  // that there is nothing to mark against. Two situations, two sentences, and
  // the review found this one by reading the expression rather than the tests.
  //
  // Built rather than carved out of the seed: every seeded outcome has marks
  // and mappings pointing at it, and deleting them to make this case would be
  // a test that dismantles the fixture every other test in the file reads.
  const { rows: offering } = await api.pool.query(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     SELECT sc.program_id, sc.subject_id, '2500', 1
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1
     RETURNING id`,
    [section],
  );
  const { rows: fresh } = await api.pool.query(
    `INSERT INTO course_sections (semester_course_id, section_number)
     VALUES ($1, '1') RETURNING section_id`,
    [offering[0].id],
  );
  const bare = fresh[0].section_id;
  await api.pool.query(
    `INSERT INTO course_sections_teacher (section_id, user_id) VALUES ($1, $2)`,
    [bare, byAlias('U_TEACH')],
  );

  try {
    const { body } = await report(bare, teacherOne);
    assert.deepEqual(body.clos, []);
    assert.equal(body.no_outcomes, true);
    // And not the other sentence. This is the assertion the bug would fail.
    assert.equal(body.empty, false);
  } finally {
    await api.pool.query(`DELETE FROM course_sections_teacher WHERE section_id = $1`, [bare]);
    await api.pool.query(`DELETE FROM course_sections WHERE section_id = $1`, [bare]);
    await api.pool.query(`DELETE FROM semester_courses WHERE id = $1`, [offering[0].id]);
  }
});

test('the ตอนเรียน of another account is refused, and refused the same way a missing one is', async () => {
  const refused = await report(section, teacherTwo);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.sectionNotFound);

  const missing = await report(999999, teacherOne);
  assert.equal(missing.status, 404);
  assert.equal(missing.body.message, REFUSALS.sectionNotFound);

  // ADR-0002 in the only form a single account can show it: the first call
  // above and this one differ by nothing but the ตอนเรียน asked for, and both
  // are refused, because neither belongs to this account. The positive half —
  // that the same URL answers 200 for the ผู้สอน who does teach it — is every
  // other test in this file.
  const anothersAgain = await report(theirs, teacherTwo);
  assert.equal(anothersAgain.status, 404);
  assert.equal(anothersAgain.body.message, REFUSALS.sectionNotFound);
});

test('an all-digit id that overflows an integer is a refusal, not a five hundred', async () => {
  // #107's shape, and the guard is `sectionOf`'s rather than a new one.
  const response = await report('99999999999999999999', teacherOne);
  assert.equal(response.status, 404);
  assert.equal(response.body.message, REFUSALS.sectionNotFound);
});

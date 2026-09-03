'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, PRIOR_YEAR, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/36-section-results.md — the server half.
 *
 * #36 asks the same question of a Section that #38 does and answers it in one
 * line per outcome rather than one line per student: how did this ตอนเรียน do
 * against each of its CLOs. The arithmetic is therefore not new — BR-18's scale
 * of five, BR-17's sixty per cent, the blank that is not a nought — and this
 * file does not re-prove it. `learning-details.test.js` owns those rules, and a
 * second copy here would be the same claim asserted twice in the place that
 * goes stale.
 *
 * What is new, and is what this file is about, is **the comparison across
 * years**, and it turns on two decisions that no rule in `docs/01`–`05` makes
 * for us.
 *
 * ## Whose ตอนเรียน a prior year is
 *
 * Every ตอนเรียน of the Subject in that year, pooled into one figure — not the
 * ones this ผู้สอน happened to teach. R079 asks whether *the Subject* is
 * improving, and a Subject taught by three people in 2568 has one answer to
 * that and not three. It is a widening of what a ผู้สอน may read, so it is
 * written into ADR-0002 rather than left here, and it is bounded: the pooled
 * year is the only grain that comes back. No section number, no teacher, no
 * student, and no way to ask for one.
 *
 * ## Which prior years may be drawn on the same chart at all
 *
 * A radar overlays two years on one set of axes, and the axes are CLOs. But a
 * CLO belongs to a (Program, Subject, academic year) — ADR-0003 — so 2568's
 * CLO-3 and 2569's CLO-3 are two different rows that need not be the same
 * sentence. Matching them by number is the only join available, and it is only
 * honest when the two years agree about what the numbers are.
 *
 * So a prior year is offered when **its set of CLO numbers is exactly the base
 * year's**, and not otherwise. The delivered service reached for the same idea
 * from the other end — it compared the set of PLOs the CLOs mapped to and
 * required a hundred per cent match — which is the same instinct against a
 * schema where CLOs hung off a Section.
 *
 * A year with no marks in it is not offered either. It would draw a polygon of
 * blanks, and a control that produces nothing is worse than no control.
 */

const DEPT_COMPUTER = '05';

let api;
let teacherOne;
let stranger;
let section;
let theirs;
let priorSection;

before(async () => {
  api = await startApi('section_results', { withSeed: true });
  teacherOne = await teaching('U_TEACH');
  // `U_MULTI` and not `U_TEACH2`: the second teacher account holds no ตอนเรียน
  // in the current year at all, so a refusal from it would prove only that it
  // teaches nothing. `U_MULTI` teaches ตอนเรียน 2 of this very Subject, which
  // is the refusal worth having — being inside the same Offering is not being
  // inside the same ตอนเรียน.
  stranger = await teaching('U_MULTI');
  section = await seededSection('U_TEACH', CURRENT_YEAR);
  theirs = await seededSection('U_MULTI', CURRENT_YEAR);
  priorSection = await seededSection('U_TEACH', PRIOR_YEAR);
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
      WHERE cst.user_id = $1 AND sc.academic_year = $2`,
    [byAlias(alias), year],
  );
  assert.equal(rows.length, 1, 'expected exactly one seeded section for ' + alias + ' in ' + year);
  return rows[0].section_id;
}

const results = (sectionId, cookie, query = '') =>
  request(api.app)
    .get(`/api/teaching/sections/${sectionId}/results${query}`)
    .set('Cookie', cookie);

/** One outcome's line out of the answer, addressed the way the chart addresses it. */
function axis(body, cloNumber) {
  const found = body.clos.find((one) => one.clo_number === cloNumber);
  assert.ok(found, 'no outcome ' + cloNumber + ' in the answer');
  return found;
}

/** One outcome's attribution rows in a Section, and what each is worth. */
async function attributionOf(sectionId, cloNumber) {
  const { rows } = await api.pool.query(
    `SELECT m.activity_id, m.clo_id, m.score
       FROM activity_clo_mapping m
       JOIN activities a ON a.id = m.activity_id
       JOIN subject_clo c ON c.clo_id = m.clo_id
      WHERE a.section_id = $1 AND c.clo_number = $2
      ORDER BY m.activity_id ASC`,
    [sectionId, cloNumber],
  );
  assert.ok(rows.length > 0, 'no attribution rows for ' + cloNumber + ' in section ' + sectionId);
  return rows;
}

/** The roll of one Section, lowest code first. */
async function rollOf(sectionId) {
  const { rows } = await api.pool.query(
    'SELECT student_id FROM student_course WHERE section_id = $1 ORDER BY student_id ASC',
    [sectionId],
  );
  return rows.map((row) => row.student_id);
}

/**
 * Puts one student on an exact score out of five for one outcome.
 *
 * The whole of the wanted fraction goes onto the first attribution row and the
 * rest are cleared, which works because a blank is left out of both halves —
 * #34's rule, used here as a tool. Lifted from `learning-details.test.js`,
 * where the same tool is what makes an exact boundary reachable at all.
 */
async function place(sectionId, studentId, cloNumber, outOfFive) {
  const rows = await attributionOf(sectionId, cloNumber);
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

/**
 * One student taken out of one outcome's reckoning altogether.
 *
 * Not a score of nought — a blank, which #34's rule leaves out of both halves
 * of the fraction. It is the only way to control how many students an outcome
 * has, and controlling that is what makes an exact sixty per cent reachable.
 */
async function clear(sectionId, studentId, cloNumber) {
  const rows = await attributionOf(sectionId, cloNumber);
  await api.pool.query(
    `UPDATE activity_scores SET score = NULL
      WHERE student_id = $1 AND clo_id = $2 AND activity_id = ANY($3)`,
    [studentId, rows[0].clo_id, rows.map((row) => row.activity_id)],
  );
}

/** Every mark of one Section wiped, and put back afterwards. */
async function withoutMarks(sectionId, run) {
  const { rows } = await api.pool.query(
    `SELECT s.student_id, s.activity_id, s.clo_id, s.score
       FROM activity_scores s JOIN activities a ON a.id = s.activity_id
      WHERE a.section_id = $1 AND s.score IS NOT NULL`,
    [sectionId],
  );
  await api.pool.query(
    `UPDATE activity_scores SET score = NULL
      WHERE activity_id IN (SELECT id FROM activities WHERE section_id = $1)`,
    [sectionId],
  );
  try {
    await run();
  } finally {
    for (const row of rows) {
      await api.pool.query(
        `UPDATE activity_scores SET score = $1
          WHERE student_id = $2 AND activity_id = $3 AND clo_id = $4`,
        [row.score, row.student_id, row.activity_id, row.clo_id],
      );
    }
  }
}

test('the radar answers with every outcome of the Offering, on a scale of five', async () => {
  const response = await results(section, teacherOne);
  assert.equal(response.status, 200, response.body.message);

  const { rows } = await api.pool.query(
    `SELECT c.clo_number FROM subject_clo c
       JOIN semester_courses sc
         ON sc.program_id = c.program_id
        AND sc.subject_id = c.subject_id
        AND sc.academic_year = c.academic_year
       JOIN course_sections cs ON cs.semester_course_id = sc.id
      WHERE cs.section_id = $1
      ORDER BY c.clo_number ASC`,
    [section],
  );
  assert.deepEqual(
    response.body.clos.map((one) => one.clo_number),
    rows.map((row) => row.clo_number),
  );

  // Every axis is a number out of five or a blank, and never anything else.
  for (const clo of response.body.clos) {
    if (clo.mean === null) continue;
    assert.ok(clo.mean >= 0 && clo.mean <= 5, clo.clo_number + ' scored ' + clo.mean);
  }
  assert.deepEqual(response.body.band_floors, [0, 3, 3.5, 4, 4.5]);
});

test('the three headline figures agree with the marks underneath them', async () => {
  const response = await results(section, teacherOne);
  const { summary, clos } = response.body;

  assert.equal(summary.student_count, (await rollOf(section)).length);

  // The mean and the pass rate are pooled over every (student, outcome) that
  // has a score — the same pool `scored_count` counts — so the two can be
  // checked against each other without re-implementing the fraction.
  const counted = clos.reduce((total, clo) => total + clo.student_count, 0);
  assert.equal(summary.scored_count, counted);
  assert.ok(summary.passed_count <= summary.scored_count);
  assert.equal(
    summary.pass_rate,
    Math.round((summary.passed_count / summary.scored_count) * 1000) / 10,
  );
});

test('a CLO passes above sixty per cent of its students and not at sixty exactly', async () => {
  // TC-EVAL-004, at the edge that decides it — and the edge has to be built,
  // because sixty per cent of a roll of fifty-seven is not a whole number of
  // students. So the roll is cleared off this outcome entirely and exactly ten
  // are put back: six above the line and four below is sixty per cent to the
  // digit, and BR-17 does not pass it.
  const roll = await rollOf(section);
  for (const student of roll) await clear(section, student, 'CLO-1');

  const measured = roll.slice(0, 10);
  for (const [index, student] of measured.entries()) {
    await place(section, student, 'CLO-1', index < 6 ? 4 : 2);
  }

  const atSixty = await results(section, teacherOne);
  const sixty = axis(atSixty.body, 'CLO-1');
  assert.equal(sixty.student_count, 10, 'only the ten placed students are measured');
  assert.equal(sixty.pass_rate, 60, 'the fixture did not land on sixty exactly');
  assert.equal(sixty.passed, false, 'sixty per cent exactly is not a pass');

  // One more over the line — seven of eleven — and it passes. The pass line
  // for one student is 3.0, so the row also says which side of it 3.0 is on.
  await place(section, roll[10], 'CLO-1', 3);
  const overSixty = await results(section, teacherOne);
  const over = axis(overSixty.body, 'CLO-1');
  assert.equal(over.student_count, 11);
  assert.ok(over.pass_rate > 60, 'seven of eleven is over sixty');
  assert.equal(over.passed, true);
});

test('a Section with no marks yet answers with its outcomes and says it is empty', async () => {
  await withoutMarks(section, async () => {
    const response = await results(section, teacherOne);
    assert.equal(response.status, 200, response.body.message);
    assert.equal(response.body.empty, true);
    assert.ok(response.body.clos.length > 0, 'an empty Section still has outcomes');
    for (const clo of response.body.clos) {
      assert.equal(clo.mean, null);
      assert.equal(clo.passed, null, 'an outcome nobody was measured on has not failed');
    }
    assert.equal(response.body.summary.mean, null);
    assert.equal(response.body.summary.scored_count, 0);
  });
});

test('the prior year of the same Subject is offered, and is not one ตอนเรียน of it', async () => {
  const response = await results(section, teacherOne);
  const offered = response.body.available_years;

  assert.deepEqual(
    offered.map((year) => year.academic_year),
    [PRIOR_YEAR],
    'the seed has exactly one comparable prior year',
  );

  // Pooled, and the pooling is the point: the count is every student of that
  // year's Subject, not the roll of the one ตอนเรียน this ผู้สอน taught.
  const { rows } = await api.pool.query(
    `SELECT count(DISTINCT scr.student_id)::int AS students,
            count(DISTINCT cs.section_id)::int AS sections
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
       JOIN student_course scr ON scr.section_id = cs.section_id
      WHERE sc.academic_year = $1
        AND (sc.program_id, sc.subject_id) = (
              SELECT b.program_id, b.subject_id FROM semester_courses b
                JOIN course_sections bc ON bc.semester_course_id = b.id
               WHERE bc.section_id = $2)`,
    [PRIOR_YEAR, section],
  );
  assert.equal(offered[0].student_count, rows[0].students);
  assert.equal(offered[0].section_count, rows[0].sections);

  // Nothing about the answer names a ตอนเรียน of that year, or who taught it.
  assert.equal(JSON.stringify(offered).includes('section_id'), false);
  assert.equal(JSON.stringify(offered).includes('teacher'), false);
});

test('a year that is asked for comes back on the same axes as the base year', async () => {
  const response = await results(section, teacherOne, `?years=${PRIOR_YEAR}`);
  assert.equal(response.status, 200, response.body.message);
  assert.equal(response.body.comparison.length, 1);

  const [year] = response.body.comparison;
  assert.equal(year.academic_year, PRIOR_YEAR);
  // Matched by number, because the two years' CLOs are different rows — which
  // is why the series carries `clo_number` and no `clo_id` at all.
  assert.deepEqual(
    year.clos.map((one) => one.clo_number),
    response.body.clos.map((one) => one.clo_number),
  );
  assert.equal(JSON.stringify(year).includes('clo_id'), false);

  // And it is the prior year's marks, not this year's copied over. The prior
  // year pools sixty students against this year's fifty-seven, so the two
  // cannot be the same reading of the same rows.
  const priorRoll = await rollOf(priorSection);
  assert.ok(priorRoll.length > 0);
  assert.equal(year.summary.student_count, response.body.available_years[0].student_count);
  assert.notEqual(year.summary.student_count, response.body.summary.student_count);
});

test('a year whose CLO numbers differ from this year’s is not offered, and is refused if asked for', async () => {
  // The situation the seed does not contain, built and put back. One outcome
  // renamed is enough: the sets stop being equal, and an axis of the chart
  // would have nothing honest to line up against.
  const { rows } = await api.pool.query(
    `SELECT clo_id, clo_number FROM subject_clo c
      WHERE c.academic_year = $1 ORDER BY c.clo_number DESC LIMIT 1`,
    [PRIOR_YEAR],
  );
  const [renamed] = rows;
  assert.ok(renamed, 'the seed should have prior-year outcomes');

  await api.pool.query('UPDATE subject_clo SET clo_number = $1 WHERE clo_id = $2', [
    'CLO-99',
    renamed.clo_id,
  ]);
  try {
    const response = await results(section, teacherOne);
    assert.deepEqual(response.body.available_years, []);

    const asked = await results(section, teacherOne, `?years=${PRIOR_YEAR}`);
    assert.equal(asked.status, 400);
    assert.equal(asked.body.message, REFUSALS.yearNotComparable);
  } finally {
    await api.pool.query('UPDATE subject_clo SET clo_number = $1 WHERE clo_id = $2', [
      renamed.clo_number,
      renamed.clo_id,
    ]);
  }
});

test('a year with no marks in it is not offered', async () => {
  await withoutMarks(priorSection, async () => {
    const response = await results(section, teacherOne);
    assert.deepEqual(
      response.body.available_years,
      [],
      'a year that would draw a polygon of blanks is not a year to offer',
    );
  });
});

test('the current year and a year that does not exist are both refused', async () => {
  const thisYear = await results(section, teacherOne, `?years=${CURRENT_YEAR}`);
  assert.equal(thisYear.status, 400, 'a Section cannot be compared against itself');
  assert.equal(thisYear.body.message, REFUSALS.yearNotComparable);

  const never = await results(section, teacherOne, '?years=2499');
  assert.equal(never.status, 400);
  assert.equal(never.body.message, REFUSALS.yearNotComparable);
});

test('a ผู้สอน is refused a ตอนเรียน they do not teach, and the refusal is the server’s', async () => {
  const other = await results(theirs, teacherOne);
  assert.equal(other.status, 404);
  assert.equal(other.body.message, REFUSALS.sectionNotFound);

  // Both ways: the ตอนเรียน of the same Offering that the other ผู้สอน teaches
  // is refused to this one, and this one's is refused to them.
  const mine = await results(section, stranger);
  assert.equal(mine.status, 404);
  assert.equal(mine.body.message, REFUSALS.sectionNotFound);

  const unauthenticated = await request(api.app).get(
    `/api/teaching/sections/${section}/results`,
  );
  assert.equal(unauthenticated.status, 401);
});

test('a student who has left the ตอนเรียน stops counting, as they do on #38’s screen', async () => {
  // The review found this one. #38 walks the roll and looks marks up against
  // it, so an unenrolled student simply is not a row there. This route folds
  // from the marks outward, and without a join back to `student_course` a mark
  // left behind by somebody who has gone on counting toward the mean here and
  // not there — the same ตอนเรียน carrying two different
  // *คะแนนเฉลี่ยรายคนรายข้อ* on two screens, which is exactly the drift
  // `lib/attainment.js`' own header exists to warn about.
  const roll = await rollOf(section);
  const leaving = roll[0];
  await place(section, leaving, 'CLO-3', 5);
  for (const student of roll.slice(1)) await place(section, student, 'CLO-3', 1);

  const before = axis((await results(section, teacherOne)).body, 'CLO-3');
  assert.equal(before.student_count, roll.length);

  const { rows } = await api.pool.query(
    'DELETE FROM student_course WHERE section_id = $1 AND student_id = $2 RETURNING *',
    [section, leaving],
  );
  assert.equal(rows.length, 1);
  try {
    const after = axis((await results(section, teacherOne)).body, 'CLO-3');
    assert.equal(after.student_count, roll.length - 1, 'their score is still being counted');
    assert.ok(after.mean < before.mean, 'the mean should fall when the top score leaves');
  } finally {
    // Put them back exactly as they were, columns and all — this row is not
    // the only one that reads this roll.
    const [row] = rows;
    await api.pool.query(
      'INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)',
      [row.student_id, row.section_id],
    );
  }
});

test('the class list of this ตอนเรียน is served by an endpoint that exists', async () => {
  // The ticket's seventh criterion. The inherited hook called an endpoint that
  // was never written and then discarded its answer unconditionally, so this
  // screen and #37's both drew an empty class in every case. There is no such
  // hook in the rebuild — #17 built the register and this row is what says so
  // rather than leaving the criterion to be assumed.
  const response = await request(api.app)
    .get(`/api/teaching/sections/${section}/students`)
    .set('Cookie', teacherOne);
  assert.equal(response.status, 200, response.body.message);
  assert.ok(response.body.students.length > 0, 'the class list came back empty');
  assert.equal(response.body.total, (await rollOf(section)).length);
});

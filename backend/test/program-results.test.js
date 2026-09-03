'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  PASSWORD,
  ACCOUNTS,
  PLOS,
  COHORTS,
  PROGRAM,
  PROGRAM_INTL,
} = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/42-program-level-by-intake.md — the server half.
 *
 * #42 is the first screen that reports on a *cohort* rather than on a room.
 * Everything it says is an opinion about the same marks #34 stored and #38
 * already has an opinion about, one level up: #38 asks how one Section did on
 * one CLO, and this asks how an intake did on one PLO across every Subject it
 * has sat.
 *
 * ## The two steps of the roll-up, and why they are two
 *
 * A student's score for one CLO is #38's rule unchanged — what they earned over
 * what was available to them, times five, with an unmarked Activity left out of
 * both halves. That rule lives in `lib/attainment.js` so that this file and
 * #38 cannot drift apart on it.
 *
 * A student's score for one PLO is then the **mean of their CLO scores** for
 * the CLOs that name it, each CLO counting once. Agreed with the user before
 * this was built, and it is the delivered system's rule as well
 * (`DEEP-QA-BACKEND/services/ploScoreService.js`). The alternative — pooling
 * the marks themselves, which is #38's rule applied one level higher — would
 * let a CLO that happens to carry more assessed work speak louder for its PLO
 * than one that carries less, and nothing in the requirements says it should.
 * A committee reading *PLO-2 is the average of the three CLOs that serve it*
 * can check the arithmetic; a weighted pool they cannot see the weights of,
 * they cannot.
 *
 * ## Which outcomes the report has rows for
 *
 * Every **main** PLO of the Program, whether or not any CLO names it. The
 * grain is main-PLO because that is what `subject_clo.plo_id` points at and
 * what #100 settled for the coverage grid; and it is *every* one of them for
 * #38's reason — an outcome with nothing behind it is the row worth seeing,
 * and selecting through the CLOs would have drawn no row at all.
 */

let api;
before(async () => {
  api = await startApi('program_results', { withSeed: true });
  fixture = await seedFixtureCohort();
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

/** The cohort that sits the current year's Offering, across two Sections. */
const CURRENT_COHORT = COHORTS[0];

const byIntake = (cookie, query) =>
  request(api.app).get(`/api/program-results/by-intake${query}`).set('Cookie', cookie);

const forCohort = (cookie, cohort = CURRENT_COHORT, program = PROGRAM) =>
  byIntake(cookie, `?program_id=${program}&admission_year=${cohort.admission}`);

/**
 * A cohort of this test file's own, with marks chosen so the arithmetic can be
 * checked on paper — the ticket's ninth criterion in so many words.
 *
 * Two students, one Activity of their own worth a hundred to each of the three
 * CLOs that name PLO-2, and no mark anywhere else. Their CLO scores are
 * therefore the marks below over a hundred times five, and their PLO-2 scores
 * the mean of three of those. Every other outcome of the curriculum has nobody
 * measured against it, which is the case the *empty column* rows are about.
 *
 *   ก  80 / 60 / 100  →  4.0, 3.0, 5.0  →  PLO-2 = 4.00
 *   ข  40 / 50 /  90  →  2.0, 2.5, 4.5  →  PLO-2 = 3.00
 *
 *   PLO-2 across the cohort: mean 3.50, both at or above 3.0, so 100% passed.
 */
const FIXTURE_INTAKE = '2500';
const FIXTURE_MARKS = [
  { student: 'X50001', name: 'ก ทดสอบ', scores: [80, 60, 100], plo2: 4.0 },
  { student: 'X50002', name: 'ข ทดสอบ', scores: [40, 50, 90], plo2: 3.0 },
];
const FIXTURE_FULL_MARK = 100;

/** A second intake: enrolled, on the roll, and nobody has marked anything yet. */
const UNMARKED_INTAKE = '2501';
const UNMARKED_STUDENT = 'X50101';

/**
 * A third intake of one student, marked on two of the three CLOs of PLO-2 and
 * left blank on the third.
 *
 *   80 → 4.0, 60 → 3.0, blank → nothing  ⇒  PLO-2 = 3.50
 *
 * Read as a nought the same student would come out at (4+3+0)/3 = 2.33, so the
 * two readings of a blank cannot both be right and the assertion can tell.
 */
const BLANK_INTAKE = '2502';
const BLANK_STUDENT = 'X50201';
const BLANK_MARKS = [80, 60, null];

/** Two files on the fixture Activity: one attached, one since removed. */
const EVIDENCE_FILE = 'โจทย์โครงงาน.pdf';
const REMOVED_FILE = 'ฉบับที่ถอนแล้ว.pdf';

let fixture;

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
             'individual', 'งานของชุดทดสอบ #42', $4)
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

  for (const student of FIXTURE_MARKS) {
    await api.pool.query(
      `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status)
       VALUES ($1, $2, 'ทดสอบ', (SELECT department_id FROM programs WHERE program_id = $3), $3, $4, 'active')`,
      [student.student, student.name, PROGRAM, FIXTURE_INTAKE],
    );
    await api.pool.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
      student.student,
      section,
    ]);
    for (const [index, clo] of outcomes.entries()) {
      await api.pool.query(
        `INSERT INTO activity_scores (student_id, activity_id, clo_id, score) VALUES ($1, $2, $3, $4)`,
        [student.student, activityId, clo.clo_id, student.scores[index]],
      );
    }
  }

  await api.pool.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status)
     VALUES ($1, 'ค', 'ทดสอบ', (SELECT department_id FROM programs WHERE program_id = $2), $2, $3, 'active')`,
    [UNMARKED_STUDENT, PROGRAM, UNMARKED_INTAKE],
  );
  await api.pool.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
    UNMARKED_STUDENT,
    section,
  ]);

  await api.pool.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status)
     VALUES ($1, 'ง', 'ทดสอบ', (SELECT department_id FROM programs WHERE program_id = $2), $2, $3, 'active')`,
    [BLANK_STUDENT, PROGRAM, BLANK_INTAKE],
  );
  await api.pool.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
    BLANK_STUDENT,
    section,
  ]);
  for (const [index, clo] of outcomes.entries()) {
    await api.pool.query(
      `INSERT INTO activity_scores (student_id, activity_id, clo_id, score) VALUES ($1, $2, $3, $4)`,
      [BLANK_STUDENT, activityId, clo.clo_id, BLANK_MARKS[index]],
    );
  }

  // One live file and one that has been removed, so the drill-down can be
  // asked to tell them apart rather than merely to count.
  const { rows: kept } = await api.pool.query(
    `INSERT INTO activity_evidence
       (section_id, activity_id, evidence_type, description, file_name, file_path, mime_type, file_size, uploaded_by, is_deleted)
     VALUES ($1, $2, 'assignment', 'โจทย์ของงานชิ้นนี้', $3, '/uploads/test/brief.pdf', 'application/pdf', 2048, NULL, false)
     RETURNING evidence_id`,
    [section, activityId, EVIDENCE_FILE],
  );
  await api.pool.query(
    `INSERT INTO activity_evidence
       (section_id, activity_id, evidence_type, file_name, file_path, is_deleted)
     VALUES ($1, $2, 'assignment', $3, '/uploads/test/gone.pdf', true)`,
    [section, activityId, REMOVED_FILE],
  );

  return { activityId, section, outcomes, evidenceId: kept[0].evidence_id };
}

const plo = (body, code) => body.plos.find((row) => row.outcome_code === code);

const contributions = (cookie, outcomeId, query) =>
  request(api.app)
    .get(`/api/program-results/by-intake/outcomes/${outcomeId}${query}`)
    .set('Cookie', cookie);

/** The outcome id of one of the curriculum's main outcomes, by its code. */
async function outcomeId(code, program = PROGRAM) {
  const { rows } = await api.pool.query(
    `SELECT outcome_id FROM learning_outcomes
      WHERE program_id = $1 AND outcome_code = $2 AND parent_outcome_id IS NULL`,
    [program, code],
  );
  return rows[0].outcome_id;
}

test('the report has a row for every main outcome of the curriculum', async () => {
  // The first criterion. Thirteen outcomes are seeded for this curriculum and
  // seven of them have a CLO naming them; the report is thirteen rows long
  // either way, because an outcome nothing measures is the one worth seeing.
  const cookie = await signInAs('U_COM');

  const response = await forCohort(cookie);

  assert.equal(response.status, 200, response.body.message);
  assert.equal(response.body.plos.length, PLOS.length);
  assert.deepEqual(
    response.body.plos.map((plo) => plo.outcome_code),
    PLOS.map((_, index) => `PLO-${index + 1}`),
  );
});

test('an outcome score is the mean over the cohort of each student mean of their CLO scores', async () => {
  // The second and third criteria, on marks chosen so the answer can be worked
  // out on paper: 4.00 and 3.00 average to 3.50, and both are at or above the
  // pass line, so the outcome passes with every one of its students.
  const cookie = await signInAs('U_COM');

  const response = await byIntake(
    cookie,
    `?program_id=${PROGRAM}&admission_year=${FIXTURE_INTAKE}`,
  );

  assert.equal(response.status, 200, response.body.message);
  const second = plo(response.body, 'PLO-2');
  assert.equal(second.student_count, FIXTURE_MARKS.length);
  assert.equal(second.mean, 3.5);
  assert.equal(second.pass_rate, 100);
  assert.equal(second.passed, true);
});

test('an intake that is on the roll but has no marks reports itself empty, not nought', async () => {
  // The sixth criterion. The cohort exists and is enrolled; nobody has marked
  // any of its work. Every figure is absent rather than zero, because a zero
  // here would read as *this intake scored nothing* on the first day of term.
  const cookie = await signInAs('U_COM');

  const response = await byIntake(
    cookie,
    `?program_id=${PROGRAM}&admission_year=${UNMARKED_INTAKE}`,
  );

  assert.equal(response.status, 200, response.body.message);
  assert.equal(response.body.empty, true);
  assert.equal(response.body.cohort.student_count, 1);
  assert.equal(response.body.plos.length, PLOS.length);
  for (const row of response.body.plos) {
    assert.equal(row.student_count, 0, row.outcome_code);
    assert.equal(row.mean, null, row.outcome_code);
    assert.equal(row.pass_rate, null, row.outcome_code);
    assert.equal(row.passed, null, row.outcome_code);
  }
});

test('an intake with marks does not report itself empty', async () => {
  // The other side of the same rule: `empty` is about the marks, not about
  // whether every outcome has been measured. This cohort has been marked
  // against three CLOs of thirteen outcomes and is not an empty report.
  const cookie = await signInAs('U_COM');

  const response = await byIntake(
    cookie,
    `?program_id=${PROGRAM}&admission_year=${FIXTURE_INTAKE}`,
  );

  assert.equal(response.body.empty, false);
  assert.equal(response.body.cohort.student_count, FIXTURE_MARKS.length);
});

test('a committee member is refused another curriculum, and told nothing about it', async () => {
  // The eighth criterion. `U_COM` holds 0501 and asks for 0503. A curriculum
  // that is somebody else's and one that does not exist answer alike, because
  // telling them apart would turn this into a way of listing other people's
  // curricula.
  const cookie = await signInAs('U_COM');

  const theirs = await byIntake(
    cookie,
    `?program_id=${PROGRAM_INTL}&admission_year=${CURRENT_COHORT.admission}`,
  );
  const nonexistent = await byIntake(
    cookie,
    `?program_id=0000&admission_year=${CURRENT_COHORT.admission}`,
  );

  assert.equal(theirs.status, 404);
  assert.equal(theirs.body.message, REFUSALS.programNotFound);
  assert.equal(nonexistent.status, 404);
  assert.equal(nonexistent.body.message, theirs.body.message);
  assert.equal(theirs.body.plos, undefined);
});

test('the committee member of the other curriculum reads their own and not this one', async () => {
  // The same rule from the other side, which is what keeps the refusal from
  // being a blanket one: `U_COM2` holds 0503 and is answered for it.
  const cookie = await signInAs('U_COM2');

  const theirs = await byIntake(
    cookie,
    `?program_id=${PROGRAM_INTL}&admission_year=${CURRENT_COHORT.admission}`,
  );
  const ours = await byIntake(
    cookie,
    `?program_id=${PROGRAM}&admission_year=${CURRENT_COHORT.admission}`,
  );

  assert.equal(theirs.status, 200, theirs.body.message);
  assert.equal(ours.status, 404);
});

test('a teacher does not reach the programme report at all', async () => {
  // Not a curriculum boundary but a role one: this screen belongs to the
  // committee and to the assessor reviewing it, and no hat a teacher wears
  // opens it.
  const cookie = await signInAs('U_TEACH');

  const response = await forCohort(cookie);

  assert.equal(response.status, 403);
});

test('an external assessor reads the report of the curriculum they were given', async () => {
  // The shell sends this role here and nowhere else
  // (frontend/src/components/SidebarItem/ExtAssessor.js), so the server has to
  // answer it. Scoped like everybody else: their grant names one curriculum.
  const cookie = await signInAs('U_EXT');

  const ours = await forCohort(cookie);
  const theirs = await byIntake(
    cookie,
    `?program_id=${PROGRAM_INTL}&admission_year=${CURRENT_COHORT.admission}`,
  );

  assert.equal(ours.status, 200, ours.body.message);
  assert.equal(ours.body.plos.length, PLOS.length);
  assert.equal(theirs.status, 404);
});

test('an unmarked piece of work is left out of the roll-up, not read as a nought', async () => {
  // #34's blank rule, one level up. The student has been marked on two of the
  // three CLOs behind PLO-2 and left blank on the third, and is judged on the
  // two: 3.50 rather than the 2.33 a nought would produce.
  const cookie = await signInAs('U_COM');

  const response = await byIntake(
    cookie,
    `?program_id=${PROGRAM}&admission_year=${BLANK_INTAKE}`,
  );

  assert.equal(response.status, 200, response.body.message);
  const second = plo(response.body, 'PLO-2');
  assert.equal(second.student_count, 1);
  assert.equal(second.mean, 3.5);
});

test('the roll-up crosses every Section the intake sits in', async () => {
  // The second criterion, and the reason this screen is not #38 with a wider
  // WHERE: the seeded intake sits the one Offering in two Sections taught by
  // two different people, and the cohort is the whole of it. A roll-up that
  // stopped at one Section would report half the intake and say so nowhere.
  const cookie = await signInAs('U_COM');

  const response = await forCohort(cookie);

  assert.equal(response.status, 200, response.body.message);
  assert.equal(response.body.cohort.student_count, CURRENT_COHORT.students);
  const second = plo(response.body, 'PLO-2');
  assert.equal(
    second.student_count,
    CURRENT_COHORT.students,
    'every student of the intake is measured against PLO-2, whichever Section they sit in',
  );
});

test('selecting an outcome reveals the Subjects and the Activities behind its figure', async () => {
  // The fourth criterion. The fixture cohort has been marked on one Activity of
  // one Subject, and the drill-down names both — with the CLOs that Activity
  // was attributed to, which is the link between a mark and this outcome.
  const cookie = await signInAs('U_COM');
  const second = await outcomeId('PLO-2');

  const response = await contributions(
    cookie,
    second,
    `?program_id=${PROGRAM}&admission_year=${FIXTURE_INTAKE}`,
  );

  assert.equal(response.status, 200, response.body.message);
  assert.equal(response.body.outcome.outcome_code, 'PLO-2');
  assert.equal(response.body.subjects.length, 1);

  const [subject] = response.body.subjects;
  assert.ok(subject.subject_name_th, 'the Subject is named, not only coded');
  assert.deepEqual(
    subject.clos.map((clo) => clo.clo_number).sort(),
    fixture.outcomes.map((clo) => clo.clo_number).sort(),
  );

  const ours = subject.activities.find((activity) => activity.id === fixture.activityId);
  assert.ok(ours, 'the Activity the marks were entered against is listed');
  assert.equal(ours.section_id, fixture.section);
  assert.deepEqual(
    ours.clos.map((clo) => clo.clo_number).sort(),
    fixture.outcomes.map((clo) => clo.clo_number).sort(),
  );
});

test('an outcome of another curriculum is not a way into that curriculum', async () => {
  // The eighth criterion again, on the second endpoint: the outcome id is a
  // number in the address, and the guard is the grant rather than the number.
  const cookie = await signInAs('U_COM');
  const theirs = await outcomeId('PLO-2', PROGRAM_INTL);

  const throughTheirProgram = await contributions(
    cookie,
    theirs,
    `?program_id=${PROGRAM_INTL}&admission_year=${FIXTURE_INTAKE}`,
  );
  const throughOurs = await contributions(
    cookie,
    theirs,
    `?program_id=${PROGRAM}&admission_year=${FIXTURE_INTAKE}`,
  );

  assert.equal(throughTheirProgram.status, 404);
  assert.equal(throughTheirProgram.body.message, REFUSALS.programNotFound);
  assert.equal(throughOurs.status, 404, 'an outcome of another curriculum is not found in ours');
});

test('the drill-down names the evidence a figure rests on, and not the removed file', async () => {
  // The fifth criterion, as far as this ticket takes it. The file is named,
  // typed and sized so a person can see there *is* evidence and what it is;
  // opening it is #35's, which owns the upload and the authenticated retrieval
  // the delivered system did without. Recorded as half-met on the sheet.
  const cookie = await signInAs('U_COM');
  const second = await outcomeId('PLO-2');

  const response = await contributions(
    cookie,
    second,
    `?program_id=${PROGRAM}&admission_year=${FIXTURE_INTAKE}`,
  );

  const activity = response.body.subjects[0].activities.find(
    (row) => row.id === fixture.activityId,
  );
  assert.deepEqual(
    activity.evidence.map((file) => file.file_name),
    [EVIDENCE_FILE],
    'a removed file is not evidence anybody should be offered',
  );
  assert.equal(activity.evidence[0].evidence_id, fixture.evidenceId);
  assert.equal(activity.evidence[0].mime_type, 'application/pdf');
  assert.equal(activity.evidence[0].file_size, 2048);
});

test('the pickers offer only what the caller reaches', async () => {
  // The screen opens on a curriculum and an intake, and both lists come from
  // the server rather than from anything the browser knows: the curricula are
  // the grant's, and the intakes are the years this curriculum actually has
  // students in, so a committee member cannot be offered an empty year to
  // stare at.
  const cookie = await signInAs('U_COM');

  const programs = await request(api.app)
    .get('/api/program-results/programs')
    .set('Cookie', cookie);
  assert.equal(programs.status, 200, programs.body.message);
  assert.deepEqual(
    programs.body.programs.map((row) => row.program_id),
    [PROGRAM],
  );

  const intakes = await request(api.app)
    .get(`/api/program-results/intakes?program_id=${PROGRAM}`)
    .set('Cookie', cookie);
  assert.equal(intakes.status, 200, intakes.body.message);

  const years = intakes.body.intakes.map((row) => row.admission_year);
  assert.deepEqual(years, [...years].sort().reverse(), 'newest intake first');
  assert.ok(years.includes(CURRENT_COHORT.admission));
  const seeded = intakes.body.intakes.find(
    (row) => row.admission_year === CURRENT_COHORT.admission,
  );
  assert.equal(seeded.student_count, CURRENT_COHORT.students);
});

test('the intake list belongs to the curriculum, not to the register', async () => {
  // `U_COM2` holds the other curriculum, which has no students at all. The
  // years of this one are not theirs to see.
  const cookie = await signInAs('U_COM2');

  const refused = await request(api.app)
    .get(`/api/program-results/intakes?program_id=${PROGRAM}`)
    .set('Cookie', cookie);

  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.programNotFound);
});

test('each outcome arrives already banded, and the bands arrive with it', async () => {
  // BR-20 belongs to the server here for the reason it belongs to the server on
  // #38: a browser that banded the numbers itself would be a second place the
  // rule could be wrong, and no backend test could reach it. The fixture cohort
  // averages 3.50 on PLO-2, which is the floor of the third band exactly — an
  // edge, so a band computed the other way round would show.
  const cookie = await signInAs('U_COM');

  const response = await byIntake(
    cookie,
    `?program_id=${PROGRAM}&admission_year=${FIXTURE_INTAKE}`,
  );

  assert.deepEqual(response.body.band_floors, [0, 3.0, 3.5, 4.0, 4.5]);
  assert.equal(plo(response.body, 'PLO-2').band, 3);
  assert.equal(
    plo(response.body, 'PLO-1').band,
    null,
    'an outcome nobody was measured against is in no band',
  );
});

test('an outcome id too large for its column is a ไม่พบ, not a system error', async () => {
  // #107's class of defect, kept out of this route rather than added to it: an
  // all-digit id past int4 reaches PostgreSQL as a 22003 and comes back to the
  // caller as เกิดข้อผิดพลาดในระบบ, which tells them the system broke when what
  // happened is that they asked for something that cannot exist.
  const cookie = await signInAs('U_COM');

  const overflowing = await contributions(
    cookie,
    '99999999999999999999',
    `?program_id=${PROGRAM}&admission_year=${FIXTURE_INTAKE}`,
  );
  const notANumber = await contributions(
    cookie,
    'PLO-2',
    `?program_id=${PROGRAM}&admission_year=${FIXTURE_INTAKE}`,
  );

  assert.equal(overflowing.status, 404);
  assert.equal(overflowing.body.message, REFUSALS.ploNotFound);
  assert.equal(notANumber.status, 404);
  assert.equal(notANumber.body.message, REFUSALS.ploNotFound);
});

'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  PASSWORD,
  ACCOUNTS,
  CURRENT_YEAR,
  PRIOR_YEAR,
  SEMESTER,
  ACTIVITIES,
  unmarkedActivityName,
  byAlias,
} = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/34-activity-marks.md — the server half.
 *
 * #34 is a grid with two toggles over it, and every rule the ticket names is a
 * rule about what the grid may contain rather than about how it is drawn. So
 * this file is where the ticket mostly lives.
 *
 * ## The two toggles are one storage
 *
 * `activity_scores.clo_id` is NOT NULL — 0003 says why, at length — so there is
 * no such thing as a stored mark that is not against a CLO. The per-Activity
 * half of the first toggle is therefore not a second way of storing a mark; it
 * is a way of *typing* one, and the server divides it across the Activity's
 * attribution rows by their weights. That is the fact these tests are mostly
 * about: what a teacher typed once comes back as what they typed, and what the
 * database holds underneath is per-CLO either way.
 *
 * The group half is the same shape one table over. A group's mark is written
 * to every member, and nothing in the schema remembers that it arrived as one
 * number — which is correct, because the mark belongs to the student. #26 owns
 * who is in the group; this screen only reads it.
 *
 * ## Two Sections again, for the reason #26 had
 *
 * `teacher.one@` owns one Section in each year, and the seed groups only the
 * current one:
 *
 * - Section 1 (2569) has six groups, so it is where group entry is exercised.
 * - Section 3 (2568) has sixty students and no groups, and is where the
 *   per-student writes go, so that a row filling in a whole roll cannot
 *   disturb what a group row is reading.
 *
 * ## Marks are seeded, so nothing here starts from empty
 *
 * Every enrolled student already has a mark against every attribution row of
 * every Activity. That is deliberate on the seed's part and useful here: the
 * fourth criterion — re-saving corrects rather than accumulates — is the
 * normal case rather than a case that has to be set up, and every write below
 * is a correction that must leave the row count where it found it.
 */

const DEPT_COMPUTER = '05';

/** The seeded Activity every marking row uses: individual, 100 marks, three CLOs. */
const MIDTERM = 'สอบกลางภาค';

/** The seeded group Activity: 100 marks over two CLOs, and `activity_type` group. */
const PROJECT = ACTIVITIES.find((activity) => activity.type === 'group').name;

let api;
let teacherOne;
let teacherTwo;
let current;
let prior;
let theirs;

/** One hook, for the reason `work-groups.test.js` records: two do not run in order. */
before(async () => {
  api = await startApi('activity_scores', { withSeed: true });
  teacherOne = await teaching('U_TEACH');
  teacherTwo = await teaching('U_TEACH2');
  current = await seededSection('U_TEACH', CURRENT_YEAR);
  prior = await seededSection('U_TEACH', PRIOR_YEAR);
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
  assert.equal(rows.length, 1, 'expected exactly one seeded section for ' + alias + ' in ' + year);
  return rows[0].section_id;
}

/** One Activity of one Section, by the name the seed gave it. */
async function activityNamed(sectionId, name) {
  const { rows } = await api.pool.query(
    'SELECT id, score_number, activity_type FROM activities WHERE section_id = $1 AND activity_name = $2',
    [sectionId, name],
  );
  assert.equal(rows.length, 1, 'expected one Activity named ' + name + ' in section ' + sectionId);
  return rows[0];
}

const url = (sectionId, activityId) =>
  '/api/teaching/sections/' + sectionId + '/activities/' + activityId + '/scores';

const read = (cookie, sectionId, activityId) =>
  request(api.app).get(url(sectionId, activityId)).set('Cookie', cookie);

const save = (cookie, sectionId, activityId, body) =>
  request(api.app).put(url(sectionId, activityId)).set('Cookie', cookie).send(body);

const template = (cookie, sectionId, activityId, query = '') =>
  request(api.app)
    .get(url(sectionId, activityId) + '/import-template' + query)
    .set('Cookie', cookie);

const upload = (cookie, sectionId, activityId, text) =>
  request(api.app)
    .post(url(sectionId, activityId) + '/import')
    .set('Cookie', cookie)
    .set('Content-Type', 'text/csv')
    .send(text);

/** How many mark rows one Activity holds — the fourth criterion's whole test. */
async function markCount(activityId) {
  const { rows } = await api.pool.query(
    'SELECT count(*)::int AS total FROM activity_scores WHERE activity_id = $1',
    [activityId],
  );
  return rows[0].total;
}

/** One student's marks on one Activity, by CLO, as the database holds them. */
async function marksOf(activityId, studentId) {
  const { rows } = await api.pool.query(
    `SELECT clo_id, score::float AS score FROM activity_scores
      WHERE activity_id = $1 AND student_id = $2 ORDER BY clo_id`,
    [activityId, studentId],
  );
  return rows;
}

/** The enrolled students of a Section, lowest code first — the file's own order. */
async function roll(sectionId) {
  const { rows } = await api.pool.query(
    `SELECT sc.student_id, s.full_name_th FROM student_course sc
       JOIN student s ON s.student_id = sc.student_id
      WHERE sc.section_id = $1 ORDER BY sc.student_id ASC`,
    [sectionId],
  );
  return rows;
}

test('the screen reads the Activity, its CLO rows, the roll and the marks already recorded', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const response = await read(teacherOne, prior, activity.id);

  assert.equal(response.status, 200);
  assert.equal(response.body.activity.id, activity.id);
  assert.equal(Number(response.body.activity.score_number), 100);
  assert.equal(response.body.clo_rows.length, 3);
  // Each attribution row carries the ceiling a per-CLO mark is judged against,
  // which is the mapping's own `score` and not something the screen computes.
  for (const row of response.body.clo_rows) {
    assert.ok(row.clo_number, 'a CLO row must name its outcome');
    assert.ok(Number(row.score) > 0, 'a CLO row must carry its portion of the full mark');
  }
  const students = await roll(prior);
  assert.equal(response.body.students.length, students.length);
  assert.equal(response.body.marks.length, students.length * 3);
});

test('the screen reads the groups of the Section, so group entry has rows to type into', async () => {
  const activity = await activityNamed(current, PROJECT);
  const response = await read(teacherOne, current, activity.id);

  assert.equal(response.status, 200);
  assert.equal(response.body.groups.length, 6);
  for (const group of response.body.groups) {
    assert.ok(group.group_name, 'a group must carry the name a person reads it by');
    assert.ok(group.members.length > 0, 'a seeded group holds students');
  }
});

test('a ตอนเรียน that is not this account’s is refused, and says so', async () => {
  const activity = await activityNamed(theirs, MIDTERM);
  const response = await read(teacherOne, theirs, activity.id);

  assert.equal(response.status, 404);
  assert.equal(response.body.message, REFUSALS.sectionNotFound);
});

test('an Activity of another Section through this Section’s address is ไม่พบ', async () => {
  const elsewhere = await activityNamed(current, MIDTERM);
  const response = await read(teacherOne, prior, elsewhere.id);

  assert.equal(response.status, 404);
  assert.equal(response.body.message, REFUSALS.activityNotFound);
});

test('marks typed per CLO are saved and read back per CLO', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const before = await read(teacherOne, prior, activity.id);
  const [student] = before.body.students;
  const scores = {};
  for (const row of before.body.clo_rows) scores[row.clo_id] = 1.25;

  const saved = await save(teacherOne, prior, activity.id, {
    mode: 'clo',
    entry: 'student',
    marks: [{ student_id: student.student_id, scores }],
  });
  assert.equal(saved.status, 200, saved.body.message);

  const held = await marksOf(activity.id, student.student_id);
  assert.equal(held.length, 3);
  for (const row of held) assert.equal(row.score, 1.25);
});

test('a per-CLO mark above that CLO’s own portion is refused, and the sentence names the portion', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const before = await read(teacherOne, prior, activity.id);
  const [student] = before.body.students;
  const [first] = before.body.clo_rows;
  const held = await marksOf(activity.id, student.student_id);

  const refused = await save(teacherOne, prior, activity.id, {
    mode: 'clo',
    entry: 'student',
    marks: [{ student_id: student.student_id, scores: { [first.clo_id]: Number(first.score) + 1 } }],
  });

  assert.equal(refused.status, 400);
  assert.match(refused.body.message, new RegExp(String(first.clo_number)));
  assert.match(refused.body.message, new RegExp(String(Number(first.score))));
  assert.deepEqual(await marksOf(activity.id, student.student_id), held, 'nothing may be written');
});

test('one mark typed for the whole Activity is divided across its CLOs by their weights', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const before = await read(teacherOne, prior, activity.id);
  const student = before.body.students[1];

  const saved = await save(teacherOne, prior, activity.id, {
    mode: 'activity',
    entry: 'student',
    marks: [{ student_id: student.student_id, score: 61 }],
  });
  assert.equal(saved.status, 200, saved.body.message);

  const held = await marksOf(activity.id, student.student_id);
  const total = held.reduce((sum, row) => sum + row.score, 0);
  // Exactly the mark, not near it: a division that lost a hundredth to
  // rounding would read back as 60.99 and a teacher would have to wonder.
  assert.equal(Number(total.toFixed(2)), 61);
  assert.ok(held.every((row) => row.score > 0), 'every CLO takes a share of the mark');

  // A mark the weights do not divide evenly. 12.5 over 34/33/33 rounds to
  // 4.25 + 4.13 + 4.13, which is 12.51 — a hundredth nobody typed. Whole marks
  // over these weights always divide exactly, so this is the case that says
  // the remainder is carried rather than left where the rounding put it.
  const again = await save(teacherOne, prior, activity.id, {
    mode: 'activity',
    entry: 'student',
    marks: [{ student_id: student.student_id, score: 12.5 }],
  });
  assert.equal(again.status, 200, again.body.message);
  const drifted = await marksOf(activity.id, student.student_id);
  assert.equal(Number(drifted.reduce((sum, row) => sum + row.score, 0).toFixed(2)), 12.5);
});

test('a mark above the Activity’s full mark is refused, and the sentence names the full mark', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const before = await read(teacherOne, prior, activity.id);
  const student = before.body.students[2];
  const held = await marksOf(activity.id, student.student_id);

  const refused = await save(teacherOne, prior, activity.id, {
    mode: 'activity',
    entry: 'student',
    marks: [{ student_id: student.student_id, score: 100.01 }],
  });

  assert.equal(refused.status, 400);
  assert.match(refused.body.message, /100/);
  assert.deepEqual(await marksOf(activity.id, student.student_id), held, 'nothing may be written');
});

test('re-saving a mark corrects it rather than adding a second one', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const before = await read(teacherOne, prior, activity.id);
  const student = before.body.students[3];
  const rowsBefore = await markCount(activity.id);

  for (const score of [40, 55, 12.5]) {
    const saved = await save(teacherOne, prior, activity.id, {
      mode: 'activity',
      entry: 'student',
      marks: [{ student_id: student.student_id, score }],
    });
    assert.equal(saved.status, 200, saved.body.message);
  }

  assert.equal(await markCount(activity.id), rowsBefore, 'three saves, no new rows');
  const held = await marksOf(activity.id, student.student_id);
  assert.equal(Number(held.reduce((sum, row) => sum + row.score, 0).toFixed(2)), 12.5);
});

test('a group’s mark is written to every member of that group', async () => {
  const activity = await activityNamed(current, PROJECT);
  const before = await read(teacherOne, current, activity.id);
  const [group] = before.body.groups;

  const saved = await save(teacherOne, current, activity.id, {
    mode: 'activity',
    entry: 'group',
    marks: [{ group_id: group.group_id, score: 80 }],
  });
  assert.equal(saved.status, 200, saved.body.message);

  for (const studentId of group.members) {
    const held = await marksOf(activity.id, studentId);
    assert.equal(
      Number(held.reduce((sum, row) => sum + row.score, 0).toFixed(2)),
      80,
      studentId + ' should carry their group’s mark',
    );
  }
});

test('a group of another ตอนเรียน is refused through this one’s address', async () => {
  const activity = await activityNamed(current, PROJECT);
  const { rows } = await api.pool.query(
    'SELECT group_id FROM student_group WHERE section_id <> $1 LIMIT 1',
    [current],
  );
  assert.ok(rows[0], 'the seed must hold a group belonging to another Section');

  const refused = await save(teacherOne, current, activity.id, {
    mode: 'activity',
    entry: 'group',
    marks: [{ group_id: rows[0].group_id, score: 10 }],
  });

  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.groupNotFound);
});

test('a student who is not enrolled in this ตอนเรียน is refused', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const elsewhere = await roll(theirs);

  const refused = await save(teacherOne, prior, activity.id, {
    mode: 'activity',
    entry: 'student',
    marks: [{ student_id: elsewhere[0].student_id, score: 10 }],
  });

  assert.equal(refused.status, 400);
  assert.match(refused.body.message, new RegExp(elsewhere[0].student_id));
});

test('an Activity attributed to no CLO cannot hold a mark, and says why', async () => {
  const name = unmarkedActivityName(1, PRIOR_YEAR);
  const { rows } = await api.pool.query(
    'SELECT id FROM activities WHERE section_id = $1 AND activity_name = $2',
    [prior, name],
  );
  assert.ok(rows[0], 'the seed must hold the unattributed Activity');
  const students = await roll(prior);

  const refused = await save(teacherOne, prior, rows[0].id, {
    mode: 'activity',
    entry: 'student',
    marks: [{ student_id: students[0].student_id, score: 5 }],
  });

  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.activityHasNoClo);
  assert.equal(await markCount(rows[0].id), 0);
});

test('one bad mark in a list refuses the whole list, and the good ones are not written either', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const before = await read(teacherOne, prior, activity.id);
  const [good, bad] = before.body.students.slice(4, 6);
  const held = await marksOf(activity.id, good.student_id);

  const refused = await save(teacherOne, prior, activity.id, {
    mode: 'activity',
    entry: 'student',
    marks: [
      { student_id: good.student_id, score: 33 },
      { student_id: bad.student_id, score: 101 },
    ],
  });

  assert.equal(refused.status, 400);
  assert.deepEqual(await marksOf(activity.id, good.student_id), held, 'the good row is not written');
});

test('a teacher is refused on a ตอนเรียน they do not teach, at the server', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const students = await roll(prior);

  const refused = await save(teacherTwo, prior, activity.id, {
    mode: 'activity',
    entry: 'student',
    marks: [{ student_id: students[0].student_id, score: 1 }],
  });

  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.sectionNotFound);
});

test('the template carries one mark column per CLO when the per-CLO toggle is on', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const response = await template(teacherOne, prior, activity.id, '?mode=clo');

  assert.equal(response.status, 200);
  const [header] = response.text.trim().split('\n');
  const columns = header.trim().split(',');
  assert.equal(columns[0], 'student_id');
  assert.equal(columns[1], 'full_name_th');
  assert.equal(columns.length, 5, 'two identifying columns and one per CLO');
});

test('the template carries a single mark column when the per-CLO toggle is off', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const response = await template(teacherOne, prior, activity.id, '?mode=activity');

  assert.equal(response.status, 200);
  const [header] = response.text.trim().split('\n');
  assert.equal(header.trim(), 'student_id,full_name_th,score');
});

/** The file the four checks are made against: every enrolled student, in order. */
async function goodFile(sectionId, score) {
  const students = await roll(sectionId);
  return ['student_id,full_name_th,score']
    .concat(students.map((student) => `${student.student_id},${student.full_name_th},${score}`))
    .join('\n');
}

test('a file that agrees with the ตอนเรียน records every mark', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const students = await roll(prior);
  const rowsBefore = await markCount(activity.id);

  const response = await upload(teacherOne, prior, activity.id, await goodFile(prior, 72));

  assert.equal(response.status, 201, response.body.message);
  assert.equal(response.body.created, students.length);
  assert.equal(await markCount(activity.id), rowsBefore, 'an import corrects, it does not accumulate');
  for (const student of students.slice(0, 3)) {
    const held = await marksOf(activity.id, student.student_id);
    assert.equal(Number(held.reduce((sum, row) => sum + row.score, 0).toFixed(2)), 72);
  }
});

test('a file with fewer students than the ตอนเรียน is refused, and the message says so', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const students = await roll(prior);
  const short = ['student_id,full_name_th,score']
    .concat(students.slice(0, 5).map((one) => `${one.student_id},${one.full_name_th},10`))
    .join('\n');

  const response = await upload(teacherOne, prior, activity.id, short);

  assert.equal(response.status, 400);
  assert.match(response.body.message, /จำนวนนักศึกษา/);
  assert.match(response.body.message, new RegExp(String(students.length)));
});

test('a file naming a student the ตอนเรียน does not hold is refused, and names the code', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const students = await roll(prior);
  const wrong = ['student_id,full_name_th,score']
    .concat(students.slice(1).map((one) => `${one.student_id},${one.full_name_th},10`))
    .concat(['99019999,ไม่มีคนนี้,10'])
    .join('\n');

  const response = await upload(teacherOne, prior, activity.id, wrong);

  assert.equal(response.status, 400);
  assert.match(response.body.message, /99019999/);
});

test('a file whose name disagrees with the record is refused, and names the student', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const students = await roll(prior);
  const wrong = ['student_id,full_name_th,score']
    .concat(
      students.map(
        (one, index) => `${one.student_id},${index === 2 ? 'ชื่อผิด' : one.full_name_th},10`,
      ),
    )
    .join('\n');

  const response = await upload(teacherOne, prior, activity.id, wrong);

  assert.equal(response.status, 400);
  assert.match(response.body.message, new RegExp(students[2].student_id));
  assert.match(response.body.message, /ชื่อ/);
});

test('a file whose CLO columns are not this Activity’s is refused, and names the column', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const students = await roll(prior);
  const wrong = ['student_id,full_name_th,CLO-1,CLO-2,CLO-99']
    .concat(students.map((one) => `${one.student_id},${one.full_name_th},1,1,1`))
    .join('\n');

  const response = await upload(teacherOne, prior, activity.id, wrong);

  assert.equal(response.status, 400);
  // The sentence names the columns the file should have had, in order — a
  // refusal that only said "the columns are wrong" would leave the reader
  // comparing two lists by eye.
  const expected = (await read(teacherOne, prior, activity.id)).body.clo_rows
    .map((row) => row.clo_number)
    .join(', ');
  assert.ok(response.body.message.includes(expected), response.body.message);
});

test('a refused file applies nothing at all', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const students = await roll(prior);
  const held = await marksOf(activity.id, students[0].student_id);
  const wrong = ['student_id,full_name_th,score']
    .concat(students.slice(0, -1).map((one) => `${one.student_id},${one.full_name_th},3`))
    .join('\n');

  const response = await upload(teacherOne, prior, activity.id, wrong);

  assert.equal(response.status, 400);
  assert.deepEqual(await marksOf(activity.id, students[0].student_id), held);
});

test('the import template of another screen is refused as the wrong file', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const response = await upload(teacherOne, prior, activity.id, 'group_name,student_id\nก,66010001');

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importWrongTemplate);
});

test('a mark in the file above the full mark is refused, and the report names the line', async () => {
  const activity = await activityNamed(prior, MIDTERM);
  const students = await roll(prior);
  const wrong = ['student_id,full_name_th,score']
    .concat(students.map((one, index) => `${one.student_id},${one.full_name_th},${index === 1 ? 101 : 10}`))
    .join('\n');

  const response = await upload(teacherOne, prior, activity.id, wrong);

  assert.equal(response.status, 400);
  assert.ok(response.body.errors.length > 0, 'a bad mark is a per-row failure, not a whole-file one');
  assert.equal(response.body.errors[0].line, 3);
});

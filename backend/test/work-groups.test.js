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
  MAX_GROUP_SIZE,
  byAlias,
} = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/26-work-groups.md — the server half.
 *
 * #26 is two business rules and a log, and all three are only ever true on the
 * server. BR-06 counts a group's siblings and BR-07 reaches through two tables
 * to the Section; neither is a constraint a row can satisfy on its own, which
 * is why migration 0003 says in as many words that they "belong to the service
 * layer, and the ticket that builds it". This file is where that claim is
 * tested, and the ticket's ninth criterion asks for exactly this: both limits,
 * exercised by requests crafted against the server rather than through a
 * screen that would never offer them.
 *
 * ## Two Sections, used for two different things
 *
 * The seed groups the *current* year and leaves the prior year alone, so
 * `teacher.one@` owns one of each:
 *
 * - Section 1 (2569) is the fixture for reading — eight seeded groups, their
 *   members, and their CREATE_GROUP/ADD_STUDENT history. Nothing here writes
 *   to it except the rows about refusals, which by definition write nothing.
 * - Section 3 (2568) holds sixty enrolled students and no groups at all, so
 *   every row that creates, fills, moves and deletes has a whole class to work
 *   in and cannot run out of ungrouped students halfway through the file.
 *
 * That division is also what keeps the file order-independent in the one way
 * that matters: `node --test` gives it a schema of its own, so writes persist
 * between subtests, and a row that filled a group with the last spare students
 * of Section 1 would silently change what the row after it was testing.
 *
 * ## What is asserted about the log, and why it is asserted here
 *
 * The history is not decoration. The ticket's sixth criterion is a person
 * arguing that they were moved, and the answer to that argument is a row
 * saying who moved them and when. So every write below is followed by a read
 * of `student_group_change_log`, and the move is asserted to be *one* row of
 * `MOVE_STUDENT` rather than a REMOVE_STUDENT and an ADD_STUDENT that happen
 * to be adjacent — which is the fifth criterion word for word, and the one
 * thing a screen cannot tell you afterwards.
 */

const DEPT_COMPUTER = '05';

let api;
let teacherOne;
let multiRole;
let teacherTwo;
let current;
let prior;
let theirs;

/**
 * One hook, not two beside each other. `node --test` starts every top-level
 * `before` it is given without waiting for the one declared above it, so a
 * second hook reading `api` finds it undefined — which cost this file its
 * first run.
 */
before(async () => {
  api = await startApi('work_groups', { withSeed: true });
  teacherOne = await teaching('U_TEACH');
  multiRole = await teaching('U_MULTI');
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

/** The same account, now acting as a teacher rather than as its senior grant. */
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

const url = (sectionId) => '/api/teaching/sections/' + sectionId + '/groups';

const list = (cookie, sectionId) => request(api.app).get(url(sectionId)).set('Cookie', cookie);

const create = (cookie, sectionId, body) =>
  request(api.app).post(url(sectionId)).set('Cookie', cookie).send(body);

const rename = (cookie, sectionId, groupId, body) =>
  request(api.app)
    .put(url(sectionId) + '/' + groupId)
    .set('Cookie', cookie)
    .send(body);

const destroy = (cookie, sectionId, groupId) =>
  request(api.app)
    .delete(url(sectionId) + '/' + groupId)
    .set('Cookie', cookie);

const addStudent = (cookie, sectionId, groupId, body) =>
  request(api.app)
    .post(url(sectionId) + '/' + groupId + '/students')
    .set('Cookie', cookie)
    .send(body);

const moveStudent = (cookie, sectionId, groupId, studentId) =>
  request(api.app)
    .put(url(sectionId) + '/' + groupId + '/students/' + studentId)
    .set('Cookie', cookie)
    .send({});

const removeStudent = (cookie, sectionId, groupId, studentId) =>
  request(api.app)
    .delete(url(sectionId) + '/' + groupId + '/students/' + studentId)
    .set('Cookie', cookie);

const history = (cookie, sectionId, query = '') =>
  request(api.app)
    .get(url(sectionId) + '/history' + query)
    .set('Cookie', cookie);

const template = (cookie, sectionId) =>
  request(api.app)
    .get(url(sectionId) + '/import-template')
    .set('Cookie', cookie);

const upload = (cookie, sectionId, text) =>
  request(api.app)
    .post(url(sectionId) + '/import')
    .set('Cookie', cookie)
    .set('Content-Type', 'text/csv')
    .send(text);

/** A Section straight from the database, by whose it is and which term it is in. */
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

/**
 * Enrolled students of a Section that no group of it holds, lowest code first.
 *
 * Asked of the database rather than written down for `enrolment.test.js`'
 * reason: which codes those are is a consequence of how the seed divides a
 * roll, and a test naming them would fail the day that division changes for a
 * reason that has nothing to do with this screen.
 */
async function ungrouped(sectionId, howMany) {
  const { rows } = await api.pool.query(
    `SELECT sc.student_id FROM student_course sc
      WHERE sc.section_id = $1
        AND NOT EXISTS (SELECT 1 FROM student_group_member m
                          JOIN student_group g ON g.group_id = m.group_id
                         WHERE g.section_id = sc.section_id AND m.student_id = sc.student_id)
      ORDER BY sc.student_id
      LIMIT $2`,
    [sectionId, howMany],
  );
  assert.equal(rows.length, howMany, 'the seed no longer holds ' + howMany + ' ungrouped students');
  return rows.map((row) => row.student_id);
}

/** The log of one Section, newest first, straight from the table. */
async function logOf(sectionId, limit = 20) {
  const { rows } = await api.pool.query(
    `SELECT action_type, group_id, group_name, student_id, old_group_id, new_group_id, performed_by
       FROM student_group_change_log WHERE section_id = $1
      ORDER BY log_id DESC LIMIT $2`,
    [sectionId, limit],
  );
  return rows;
}

/** The member codes of one group, as the table holds them. */
async function membersOf(groupId) {
  const { rows } = await api.pool.query(
    'SELECT student_id FROM student_group_member WHERE group_id = $1 ORDER BY student_id',
    [groupId],
  );
  return rows.map((row) => row.student_id);
}

/** Everything one Section's groups own, gone — the teardown the writing rows share. */
async function clearGroups(sectionId) {
  await api.pool.query('DELETE FROM student_group_change_log WHERE section_id = $1', [sectionId]);
  await api.pool.query('DELETE FROM student_group WHERE section_id = $1', [sectionId]);
}

/** A group of the working Section, made through the route the ticket ships. */
async function madeGroup(name, sectionId = prior) {
  const response = await create(teacherOne, sectionId, { group_name: name });
  assert.equal(response.status, 201, response.body.message);
  return response.body.group;
}

test('the list is this Section’s groups, their members, and the roll they are drawn from', async () => {
  const response = await list(teacherOne, current);
  assert.equal(response.status, 200);

  const { groups, students, section } = response.body;
  assert.equal(section.section_id, current);
  assert.ok(groups.length > 1, 'the seed groups this Section');

  // Every member of every group is a student of this Section, and no student
  // is in two of them. BR-07 as a property of the answer rather than of one
  // request - the state the rules exist to keep is what a reader has to be
  // able to trust.
  const roll = new Set(students.map((student) => student.student_id));
  const seen = new Set();
  for (const group of groups) {
    assert.ok(group.members.length <= MAX_GROUP_SIZE);
    assert.equal(group.member_count, group.members.length);
    for (const member of group.members) {
      assert.ok(roll.has(member.student_id), member.student_id + ' is not on this roll');
      assert.ok(!seen.has(member.student_id), member.student_id + ' is in two groups');
      seen.add(member.student_id);
    }
  }

  // The roll carries where each student already is, because that is the one
  // thing a picker of fifty-seven names cannot show without asking.
  const placed = students.filter((student) => student.group_id !== null);
  assert.equal(placed.length, seen.size);
  for (const student of placed) {
    const group = groups.find((one) => one.group_id === student.group_id);
    assert.ok(group, 'the roll names a group the list does not hold');
    assert.equal(student.group_name, group.group_name);
  }
  assert.ok(
    students.some((student) => student.group_id === null),
    'the seed leaves some of the roll ungrouped, which is what the screen adds from',
  );

  // Names are full Thai names, so the screen never has to join anything.
  assert.ok(students.every((student) => typeof student.full_name_th === 'string'));
});

test('a group is created with a name, and the creation is in the log', async (t) => {
  t.after(() => clearGroups(prior));

  const response = await create(teacherOne, prior, { group_name: 'กลุ่มทดสอบ ก' });
  assert.equal(response.status, 201);
  assert.equal(response.body.group.group_name, 'กลุ่มทดสอบ ก');
  assert.deepEqual(response.body.group.members, []);

  const [entry] = await logOf(prior);
  assert.equal(entry.action_type, 'CREATE_GROUP');
  assert.equal(entry.group_id, response.body.group.group_id);
  assert.equal(entry.group_name, 'กลุ่มทดสอบ ก');
  assert.equal(entry.student_id, null);
  assert.equal(entry.performed_by, byAlias('U_TEACH'));
});

test('a group without a name, or with one too long, is refused', async (t) => {
  t.after(() => clearGroups(prior));

  for (const body of [{}, { group_name: '' }, { group_name: '   ' }, { group_name: 'ก'.repeat(101) }]) {
    const response = await create(teacherOne, prior, body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(response.body.message, REFUSALS.invalidGroup);
  }

  const after = await list(teacherOne, prior);
  assert.deepEqual(after.body.groups, []);
});

test('two groups of one Section cannot share a name, and two Sections can', async (t) => {
  t.after(() => clearGroups(prior));

  await madeGroup('กลุ่มทดสอบ ข');
  const again = await create(teacherOne, prior, { group_name: 'กลุ่มทดสอบ ข' });
  assert.equal(again.status, 409);
  assert.equal(again.body.message, REFUSALS.duplicateGroupName);

  // The seed names every Section's groups กลุ่มที่ N, so a name that is unique
  // per Section is a name two Sections already share.
  const mine = await list(teacherOne, current);
  const yours = await list(multiRole, theirs);
  const shared = mine.body.groups
    .map((group) => group.group_name)
    .filter((name) => yours.body.groups.some((group) => group.group_name === name));
  assert.ok(shared.length > 0, 'two Sections are expected to use the same group names');
});

test('a group is renamed, and the rename is not a log entry', async (t) => {
  t.after(() => clearGroups(prior));

  const group = await madeGroup('กลุ่มทดสอบ ค');
  const before = await logOf(prior);

  const renamed = await rename(teacherOne, prior, group.group_id, { group_name: 'กลุ่มทดสอบ ง' });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.group.group_name, 'กลุ่มทดสอบ ง');

  // The log's CHECK holds five actions and a rename is not one of them - and
  // that is the schema being right rather than short. Every entry carries the
  // name the group had at the time, so what a rename would have to record is
  // already recorded, once per line, by the copies.
  assert.deepEqual(await logOf(prior), before);
  assert.equal((await logOf(prior))[0].group_name, 'กลุ่มทดสอบ ค');

  const collision = await rename(teacherOne, prior, group.group_id, { group_name: 'กลุ่มทดสอบ ง' });
  assert.equal(collision.status, 200, 'a group may be renamed to the name it already has');

  const empty = await rename(teacherOne, prior, group.group_id, { group_name: '' });
  assert.equal(empty.status, 400);
  assert.equal(empty.body.message, REFUSALS.invalidGroup);
});

test('a student is added to a group, and the addition is in the log', async (t) => {
  t.after(() => clearGroups(prior));

  const group = await madeGroup('กลุ่มทดสอบ จ');
  const [code] = await ungrouped(prior, 1);

  const response = await addStudent(teacherOne, prior, group.group_id, { student_id: code });
  assert.equal(response.status, 201, response.body.message);
  assert.deepEqual(
    response.body.group.members.map((member) => member.student_id),
    [code],
  );
  assert.equal(response.body.group.members[0].full_name_th.length > 0, true);
  assert.deepEqual(await membersOf(group.group_id), [code]);

  const [entry] = await logOf(prior);
  assert.equal(entry.action_type, 'ADD_STUDENT');
  assert.equal(entry.student_id, code);
  assert.equal(entry.group_id, group.group_id);
  assert.equal(entry.new_group_id, group.group_id);
  assert.equal(entry.old_group_id, null);
});

test('an eleventh student is refused, and the refusal names the limit', async (t) => {
  t.after(() => clearGroups(prior));

  const group = await madeGroup('กลุ่มทดสอบ ฉ');
  const codes = await ungrouped(prior, MAX_GROUP_SIZE + 1);

  for (const code of codes.slice(0, MAX_GROUP_SIZE)) {
    const response = await addStudent(teacherOne, prior, group.group_id, { student_id: code });
    assert.equal(response.status, 201, code + ': ' + response.body.message);
  }

  const eleventh = await addStudent(teacherOne, prior, group.group_id, {
    student_id: codes[MAX_GROUP_SIZE],
  });
  assert.equal(eleventh.status, 409);
  assert.equal(eleventh.body.message, REFUSALS.groupFull('กลุ่มทดสอบ ฉ'));
  assert.match(eleventh.body.message, /10/, 'the refusal states the limit');

  assert.equal((await membersOf(group.group_id)).length, MAX_GROUP_SIZE);
  const written = (await logOf(prior, 50)).filter((entry) => entry.student_id === codes[MAX_GROUP_SIZE]);
  assert.deepEqual(written, [], 'a refused addition writes nothing, not even a log line');
});

test('a student already in another group is refused, and the refusal names it', async (t) => {
  t.after(() => clearGroups(prior));

  const first = await madeGroup('กลุ่มทดสอบ ช');
  const second = await madeGroup('กลุ่มทดสอบ ซ');
  const [code] = await ungrouped(prior, 1);
  assert.equal((await addStudent(teacherOne, prior, first.group_id, { student_id: code })).status, 201);

  const response = await addStudent(teacherOne, prior, second.group_id, { student_id: code });
  assert.equal(response.status, 409);
  assert.equal(response.body.message, REFUSALS.studentInAnotherGroup('กลุ่มทดสอบ ช'));
  assert.deepEqual(await membersOf(second.group_id), []);
  assert.deepEqual(await membersOf(first.group_id), [code]);
});

test('adding somebody twice to the same group says so, rather than naming it as another', async (t) => {
  t.after(() => clearGroups(prior));

  const group = await madeGroup('กลุ่มทดสอบ ฌ');
  const [code] = await ungrouped(prior, 1);
  assert.equal((await addStudent(teacherOne, prior, group.group_id, { student_id: code })).status, 201);

  const again = await addStudent(teacherOne, prior, group.group_id, { student_id: code });
  assert.equal(again.status, 409);
  assert.equal(again.body.message, REFUSALS.studentAlreadyHere);
  assert.deepEqual(await membersOf(group.group_id), [code]);
});

test('a student of another Section, or of no Section, cannot be grouped here', async (t) => {
  t.after(() => clearGroups(prior));

  const group = await madeGroup('กลุ่มทดสอบ ญ');
  const elsewhere = await ungrouped(current, 1);

  for (const code of [elsewhere[0], '99019999', 'ไม่ใช่รหัส']) {
    const response = await addStudent(teacherOne, prior, group.group_id, { student_id: code });
    assert.equal(response.status, 404, code);
    assert.equal(response.body.message, REFUSALS.studentNotEnrolled);
  }
  assert.deepEqual(await membersOf(group.group_id), []);
});

test('a student is moved, and the move is one entry rather than two', async (t) => {
  t.after(() => clearGroups(prior));

  const from = await madeGroup('กลุ่มทดสอบ ฎ');
  const to = await madeGroup('กลุ่มทดสอบ ฏ');
  const [code] = await ungrouped(prior, 1);
  assert.equal((await addStudent(teacherOne, prior, from.group_id, { student_id: code })).status, 201);

  const before = (await logOf(prior, 50)).length;
  const moved = await moveStudent(teacherOne, prior, to.group_id, code);
  assert.equal(moved.status, 200, moved.body.message);
  assert.deepEqual(
    moved.body.group.members.map((member) => member.student_id),
    [code],
  );

  assert.deepEqual(await membersOf(from.group_id), []);
  assert.deepEqual(await membersOf(to.group_id), [code]);

  const entries = await logOf(prior, 50);
  assert.equal(entries.length, before + 1, 'a move is one entry, not a removal and an addition');
  const [entry] = entries;
  assert.equal(entry.action_type, 'MOVE_STUDENT');
  assert.equal(entry.student_id, code);
  assert.equal(entry.old_group_id, from.group_id);
  assert.equal(entry.new_group_id, to.group_id);
  assert.equal(entry.group_id, to.group_id);
  assert.equal(entry.group_name, 'กลุ่มทดสอบ ฏ');
});

test('a move into a full group, into the same group, or of somebody ungrouped, is refused', async (t) => {
  t.after(() => clearGroups(prior));

  const full = await madeGroup('กลุ่มทดสอบ ฐ');
  const home = await madeGroup('กลุ่มทดสอบ ฑ');
  const codes = await ungrouped(prior, MAX_GROUP_SIZE + 2);
  for (const code of codes.slice(0, MAX_GROUP_SIZE)) {
    assert.equal((await addStudent(teacherOne, prior, full.group_id, { student_id: code })).status, 201);
  }
  const mover = codes[MAX_GROUP_SIZE];
  const loose = codes[MAX_GROUP_SIZE + 1];
  assert.equal((await addStudent(teacherOne, prior, home.group_id, { student_id: mover })).status, 201);

  const intoFull = await moveStudent(teacherOne, prior, full.group_id, mover);
  assert.equal(intoFull.status, 409);
  assert.equal(intoFull.body.message, REFUSALS.groupFull('กลุ่มทดสอบ ฐ'));
  assert.deepEqual(await membersOf(home.group_id), [mover]);

  const intoSame = await moveStudent(teacherOne, prior, home.group_id, mover);
  assert.equal(intoSame.status, 409);
  assert.equal(intoSame.body.message, REFUSALS.studentAlreadyHere);

  const ungroupedMove = await moveStudent(teacherOne, prior, home.group_id, loose);
  assert.equal(ungroupedMove.status, 409);
  assert.equal(ungroupedMove.body.message, REFUSALS.studentNotGrouped);
  assert.deepEqual(await membersOf(home.group_id), [mover]);
});

test('a student is removed from a group, and the removal is in the log', async (t) => {
  t.after(() => clearGroups(prior));

  const group = await madeGroup('กลุ่มทดสอบ ฒ');
  const [code] = await ungrouped(prior, 1);
  assert.equal((await addStudent(teacherOne, prior, group.group_id, { student_id: code })).status, 201);

  const removed = await removeStudent(teacherOne, prior, group.group_id, code);
  assert.equal(removed.status, 204);
  assert.deepEqual(await membersOf(group.group_id), []);

  const [entry] = await logOf(prior);
  assert.equal(entry.action_type, 'REMOVE_STUDENT');
  assert.equal(entry.student_id, code);
  assert.equal(entry.old_group_id, group.group_id);
  assert.equal(entry.new_group_id, null);

  const again = await removeStudent(teacherOne, prior, group.group_id, code);
  assert.equal(again.status, 404);
  assert.equal(again.body.message, REFUSALS.studentNotInGroup);

  // And the student is still in the class. Leaving a group is not leaving the
  // Section, which is the whole reason the two screens are two screens.
  const roll = await list(teacherOne, prior);
  assert.ok(roll.body.students.some((student) => student.student_id === code));
});

test('deleting a group takes its members out of it, in the log and in the table', async (t) => {
  t.after(() => clearGroups(prior));

  const group = await madeGroup('กลุ่มทดสอบ ณ');
  const codes = await ungrouped(prior, 3);
  for (const code of codes) {
    assert.equal((await addStudent(teacherOne, prior, group.group_id, { student_id: code })).status, 201);
  }

  const removed = await destroy(teacherOne, prior, group.group_id);
  assert.equal(removed.status, 204);

  const { rows } = await api.pool.query('SELECT 1 FROM student_group WHERE group_id = $1', [
    group.group_id,
  ]);
  assert.equal(rows.length, 0);
  assert.deepEqual(await membersOf(group.group_id), []);

  // The deletion is the newest entry and every member's exit is behind it. A
  // group that vanished leaving only DELETE_GROUP would answer "which group
  // was I in" with silence for the three people it held.
  const entries = await logOf(prior, 10);
  assert.equal(entries[0].action_type, 'DELETE_GROUP');
  assert.equal(entries[0].student_id, null);
  assert.equal(entries[0].group_name, 'กลุ่มทดสอบ ณ');
  const exits = entries.slice(1, 1 + codes.length);
  assert.deepEqual(
    exits.map((entry) => entry.action_type),
    codes.map(() => 'REMOVE_STUDENT'),
  );
  assert.deepEqual([...exits.map((entry) => entry.student_id)].sort(), [...codes].sort());

  // Everybody is still enrolled, and is now ungrouped rather than missing.
  const roll = await list(teacherOne, prior);
  for (const code of codes) {
    const student = roll.body.students.find((one) => one.student_id === code);
    assert.ok(student, code + ' left the class list with the group');
    assert.equal(student.group_id, null);
  }
});

test('the history reads back newest first, with who did it and when', async (t) => {
  t.after(() => clearGroups(prior));

  const group = await madeGroup('กลุ่มทดสอบ ด');
  const other = await madeGroup('กลุ่มทดสอบ ต');
  const [code] = await ungrouped(prior, 1);
  await addStudent(teacherOne, prior, group.group_id, { student_id: code });
  await moveStudent(teacherOne, prior, other.group_id, code);
  await removeStudent(teacherOne, prior, other.group_id, code);

  const response = await history(teacherOne, prior);
  assert.equal(response.status, 200);
  const { entries, total } = response.body;
  assert.equal(total, 5);
  assert.deepEqual(
    entries.slice(0, 5).map((entry) => entry.action_type),
    ['REMOVE_STUDENT', 'MOVE_STUDENT', 'ADD_STUDENT', 'CREATE_GROUP', 'CREATE_GROUP'],
  );

  const move = entries[1];
  assert.equal(move.student_id, code);
  assert.ok(move.student_name.length > 0, 'a person reading this needs a name, not a code alone');
  assert.equal(move.old_group_name, 'กลุ่มทดสอบ ด');
  assert.equal(move.new_group_name, 'กลุ่มทดสอบ ต');
  assert.equal(move.performed_by, byAlias('U_TEACH'));
  assert.ok(move.performed_by_name.length > 0);
  assert.ok(!Number.isNaN(Date.parse(move.created_at)));

  // Paging is `GET /users/:id/history`' shape, because the pager on the screen
  // is the same pager.
  const second = await history(teacherOne, prior, '?page=2&per_page=2');
  assert.equal(second.body.page, 2);
  assert.equal(second.body.per_page, 2);
  assert.equal(second.body.entries.length, 2);
  assert.deepEqual(
    second.body.entries.map((entry) => entry.action_type),
    ['ADD_STUDENT', 'CREATE_GROUP'],
  );
});

test('the template is this screen’s two columns and an example that is nobody', async () => {
  const response = await template(teacherOne, prior);
  assert.equal(response.status, 200);
  assert.match(response.headers['content-disposition'], /section-groups-template\.csv/);
  const [header, example] = response.text.trim().split(/\r?\n/);
  assert.equal(header.replace(/^﻿/, ''), 'group_name,student_id');
  assert.match(example, /66019999/);
});

test('an imported file makes the groups it names and fills them', async (t) => {
  t.after(() => clearGroups(prior));

  const codes = await ungrouped(prior, 3);
  const file = [
    'group_name,student_id',
    `กลุ่มนำเข้า 1,${codes[0]}`,
    `กลุ่มนำเข้า 1,${codes[1]}`,
    `กลุ่มนำเข้า 2,${codes[2]}`,
  ].join('\n');

  const response = await upload(teacherOne, prior, file);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.created, 3);

  const groups = (await list(teacherOne, prior)).body.groups;
  assert.deepEqual(
    groups.map((group) => group.group_name),
    ['กลุ่มนำเข้า 1', 'กลุ่มนำเข้า 2'],
  );
  assert.deepEqual(
    groups.map((group) => group.member_count),
    [2, 1],
  );

  // The log carries the created groups and every placement, so an import is
  // not a hole in the history.
  const entries = await logOf(prior, 10);
  assert.equal(entries.filter((entry) => entry.action_type === 'CREATE_GROUP').length, 2);
  assert.equal(entries.filter((entry) => entry.action_type === 'ADD_STUDENT').length, 3);
});

test('one bad row refuses the whole file, and names the line', async (t) => {
  t.after(() => clearGroups(prior));

  const codes = await ungrouped(prior, 2);
  const file = [
    'group_name,student_id',
    `กลุ่มนำเข้า 3,${codes[0]}`,
    'กลุ่มนำเข้า 3,99019999',
    `กลุ่มนำเข้า 3,${codes[1]}`,
  ].join('\n');

  const response = await upload(teacherOne, prior, file);
  assert.equal(response.status, 400);
  assert.deepEqual(
    response.body.errors.map((error) => error.line),
    [3],
  );
  assert.equal(response.body.errors[0].message, REFUSALS.studentNotEnrolled);

  // Nothing was applied - not the two good rows, and not the group they would
  // have made.
  assert.deepEqual((await list(teacherOne, prior)).body.groups, []);
  assert.deepEqual(await logOf(prior), []);
});

test('a file that repeats a student, or overfills a group, is refused per row', async (t) => {
  t.after(() => clearGroups(prior));

  const codes = await ungrouped(prior, MAX_GROUP_SIZE + 1);
  const repeated = ['group_name,student_id', `ก,${codes[0]}`, `ข,${codes[0]}`].join('\n');
  const response = await upload(teacherOne, prior, repeated);
  assert.equal(response.status, 400);
  assert.deepEqual(
    response.body.errors.map((error) => error.line),
    [3],
  );
  assert.match(response.body.errors[0].message, /ซ้ำกับบรรทัดที่ 2/);

  const overfull = [
    'group_name,student_id',
    ...codes.map((code) => `กลุ่มใหญ่,${code}`),
  ].join('\n');
  const eleven = await upload(teacherOne, prior, overfull);
  assert.equal(eleven.status, 400);
  assert.deepEqual(
    eleven.body.errors.map((error) => error.line),
    [MAX_GROUP_SIZE + 2],
  );
  assert.equal(eleven.body.errors[0].message, REFUSALS.groupFull('กลุ่มใหญ่'));

  assert.deepEqual((await list(teacherOne, prior)).body.groups, []);
});

test('a file whose header belongs to another screen is the wrong template', async (t) => {
  t.after(() => clearGroups(prior));

  const response = await upload(teacherOne, prior, 'student_id\n65010001\n');
  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importWrongTemplate);
  assert.deepEqual(response.body.errors, []);
});

test('every route of this screen refuses a Section that is not this account’s', async () => {
  const seeded = (await list(teacherOne, current)).body.groups[0];
  const [code] = await ungrouped(current, 1);

  const refusals = [
    list(teacherTwo, current),
    list(teacherOne, theirs),
    create(teacherTwo, current, { group_name: 'แอบสร้าง' }),
    rename(teacherTwo, current, seeded.group_id, { group_name: 'แอบเปลี่ยนชื่อ' }),
    destroy(teacherTwo, current, seeded.group_id),
    addStudent(teacherTwo, current, seeded.group_id, { student_id: code }),
    moveStudent(teacherTwo, current, seeded.group_id, seeded.members[0].student_id),
    removeStudent(teacherTwo, current, seeded.group_id, seeded.members[0].student_id),
    history(teacherTwo, current),
    template(teacherTwo, current),
    upload(teacherTwo, current, 'group_name,student_id\nแอบนำเข้า,' + code + '\n'),
  ];

  for (const response of await Promise.all(refusals)) {
    assert.equal(response.status, 404, response.request.url);
    assert.equal(response.body.message, REFUSALS.sectionNotFound);
  }

  // And nothing moved: the seeded group still holds what it held.
  const after = (await list(teacherOne, current)).body.groups[0];
  assert.equal(after.group_name, seeded.group_name);
  assert.equal(after.member_count, seeded.member_count);
});

test('a group of another Section is not reachable through this Section’s address', async (t) => {
  t.after(() => clearGroups(prior));

  const theirGroup = (await list(multiRole, theirs)).body.groups[0];
  const [code] = await ungrouped(prior, 1);

  // The id is real and the Section in the path is the caller's own, which is
  // the shape a foreign key cannot refuse: `student_group_member.group_id`
  // would accept it happily. What refuses it is the group being looked up by
  // (group_id, section_id) and never by id alone.
  for (const response of await Promise.all([
    rename(teacherOne, prior, theirGroup.group_id, { group_name: 'ยึดกลุ่ม' }),
    destroy(teacherOne, prior, theirGroup.group_id),
    addStudent(teacherOne, prior, theirGroup.group_id, { student_id: code }),
    moveStudent(teacherOne, prior, theirGroup.group_id, theirGroup.members[0].student_id),
    removeStudent(teacherOne, prior, theirGroup.group_id, theirGroup.members[0].student_id),
  ])) {
    assert.equal(response.status, 404, response.request.url);
    assert.equal(response.body.message, REFUSALS.groupNotFound);
  }

  const theirs2 = (await list(multiRole, theirs)).body.groups[0];
  assert.equal(theirs2.group_name, theirGroup.group_name);
  assert.equal(theirs2.member_count, theirGroup.member_count);
});

test('an id that is not one this schema could hold is ไม่พบ, not a database error', async () => {
  for (const bad of ['abc', '0', '-1', '99999999999999999999']) {
    const response = await list(teacherOne, bad);
    assert.equal(response.status, 404, bad);
    assert.equal(response.body.message, REFUSALS.sectionNotFound);
  }

  for (const bad of ['abc', '0', '99999999999999999999']) {
    const response = await destroy(teacherOne, prior, bad);
    assert.equal(response.status, 404, bad);
    assert.equal(response.body.message, REFUSALS.groupNotFound);
  }
});

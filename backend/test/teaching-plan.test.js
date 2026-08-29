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
  PLAN_REFERENCED_ACTIVITY,
  planWeeksFor,
  byAlias,
} = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/31-teaching-plan.md — the server half.
 *
 * The plan is Section-bound, and that grain is the spine of this file. #28–#30
 * hang their data off the Offering because ADR-0003 puts outcomes and the
 * weighting scheme at (Program, Subject, year); the plan is the opposite case,
 * the ticket says so in one line — "two Sections of one Offering may differ" —
 * and `course_syllabus.section_id` is the schema saying the same thing. So the
 * suite asserts *difference* where the CLO suites asserted sameness: the
 * sibling Section holds its own weeks, and an edit here never shows up there.
 *
 * Week numbers belong to the person, not the server. Migration 0002 left
 * (section_id, week_no) without a unique key on purpose — one week may hold
 * several topics — so there is no next-number counter and no renumbering on
 * delete, and two rows for week 2 are a state the suite proves legal rather
 * than a collision.
 *
 * The delete guard is the one place this file is stricter than the schema:
 * `activities.course_syllabus_id` is SET NULL, so an unguarded DELETE would
 * succeed and silently detach the Activity. The refusal names the week, the
 * way #30's names the category.
 */

const DEPT_COMPUTER = '05';

let api;
before(async () => {
  api = await startApi('teaching_plan', { withSeed: true });
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

const url = (sectionId) => '/api/teaching/sections/' + sectionId + '/plan';

const read = (cookie, sectionId) => request(api.app).get(url(sectionId)).set('Cookie', cookie);

const add = (cookie, sectionId, week) =>
  request(api.app).post(url(sectionId)).set('Cookie', cookie).send(week);

const edit = (cookie, sectionId, weekId, week) =>
  request(api.app)
    .put(url(sectionId) + '/' + weekId)
    .set('Cookie', cookie)
    .send(week);

const remove = (cookie, sectionId, weekId) =>
  request(api.app)
    .delete(url(sectionId) + '/' + weekId)
    .set('Cookie', cookie);

/** A Section straight from the database, with the number the seed texts carry. */
async function seededSection(alias, year) {
  const { rows } = await api.pool.query(
    `SELECT cs.section_id, cs.section_number FROM course_sections_teacher cst
       JOIN course_sections cs ON cs.section_id = cst.section_id
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cst.user_id = $1 AND sc.academic_year = $2 AND sc.semester = $3`,
    [byAlias(alias), year, SEMESTER],
  );
  assert.equal(rows.length, 1, 'expected exactly one seeded section for ' + alias + ' in ' + year);
  return { id: rows[0].section_id, number: rows[0].section_number };
}

/** The plan as the screen reads it, asserting the read itself succeeded. */
async function plan(cookie, sectionId) {
  const answered = await read(cookie, sectionId);
  assert.equal(answered.status, 200, answered.body.message);
  return answered.body.weeks;
}

const shapeOf = ({ week_no, title, description, remark }) => ({
  week_no,
  title,
  description,
  remark,
});

test('the seeded plan arrives in week order, and reads as this Section', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const answered = await read(cookie, section.id);
  assert.equal(answered.status, 200);
  assert.equal(answered.body.section.section_id, section.id);
  assert.equal(answered.body.section.academic_year, CURRENT_YEAR);

  // The whole seeded plan, word for word — including the null description and
  // remark of week 3, which the optional columns keep as NULL rather than ''.
  assert.deepEqual(answered.body.weeks.map(shapeOf), planWeeksFor(section.number, CURRENT_YEAR));
  assert.ok(answered.body.weeks.every((week) => Number.isInteger(week.id)));
});

test('two Sections of one Offering hold two different plans', async () => {
  // The fourth criterion, and the opposite of #28–#30's sameness tests: the
  // sibling Section's weeks are its own rows carrying its own words.
  const mine = await teaching('U_TEACH');
  const theirs = await teaching('U_MULTI');
  const here = await seededSection('U_TEACH', CURRENT_YEAR);
  const there = await seededSection('U_MULTI', CURRENT_YEAR);

  const myWeeks = await plan(mine, here.id);
  const theirWeeks = await plan(theirs, there.id);

  assert.deepEqual(theirWeeks.map(shapeOf), planWeeksFor(there.number, CURRENT_YEAR));
  assert.deepEqual(
    myWeeks.map((week) => week.id).filter((id) => theirWeeks.some((week) => week.id === id)),
    [],
  );
  assert.notDeepEqual(
    myWeeks.map((week) => week.title),
    theirWeeks.map((week) => week.title),
  );
});

test('the prior year\'s Section holds its own plan too', async () => {
  const cookie = await teaching('U_TEACH');
  const then = await seededSection('U_TEACH', PRIOR_YEAR);
  assert.deepEqual((await plan(cookie, then.id)).map(shapeOf), planWeeksFor(then.number, PRIOR_YEAR));
});

test('a week can be added, lands in order, and keeps what was typed', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const created = await add(cookie, section.id, {
    week_no: 4,
    title: 'พอลิมอร์ฟิซึม',
    description: 'หลักการพอลิมอร์ฟิซึมและการ override เมธอด',
    remark: 'มีแบบฝึกหัดท้ายสัปดาห์',
  });
  assert.equal(created.status, 201, created.body.message);
  const week = created.body.week;
  assert.equal(week.week_no, 4);
  assert.equal(week.title, 'พอลิมอร์ฟิซึม');

  const weeks = await plan(cookie, section.id);
  assert.deepEqual(
    weeks.map((row) => row.week_no),
    [1, 2, 3, 4],
  );

  const gone = await remove(cookie, section.id, week.id);
  assert.equal(gone.status, 204);
});

test('a week may hold a second topic — the number is not a key', async () => {
  // Migration 0002 refused the obvious unique on (section_id, week_no) for
  // exactly this: a week with two topics is two rows, and they sort together.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const created = await add(cookie, section.id, {
    week_no: 2,
    title: 'คลาสและอ็อบเจกต์ (หัวข้อที่สอง)',
  });
  assert.equal(created.status, 201, created.body.message);

  const weeks = await plan(cookie, section.id);
  assert.deepEqual(
    weeks.map((row) => row.week_no),
    [1, 2, 2, 3],
  );
  // Two rows of one week keep insertion order: the seeded topic first.
  const ofWeekTwo = weeks.filter((row) => row.week_no === 2);
  assert.match(ofWeekTwo[0].title, /^คลาสและอ็อบเจกต์ \(ตอนเรียนที่/);
  assert.equal(ofWeekTwo[1].title, 'คลาสและอ็อบเจกต์ (หัวข้อที่สอง)');

  const gone = await remove(cookie, section.id, created.body.week.id);
  assert.equal(gone.status, 204);
});

test('description and remark are optional, and blank means NULL', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const created = await add(cookie, section.id, { week_no: 9, title: 'ทดสอบช่องว่าง', description: '   ' });
  assert.equal(created.status, 201, created.body.message);
  assert.equal(created.body.week.description, null);
  assert.equal(created.body.week.remark, null);

  // Editing the description in and back out clears the column, not ''.
  const filled = await edit(cookie, section.id, created.body.week.id, {
    week_no: 9,
    title: 'ทดสอบช่องว่าง',
    description: 'มีคำอธิบายแล้ว',
    remark: 'มีหมายเหตุแล้ว',
  });
  assert.equal(filled.status, 200, filled.body.message);
  assert.equal(filled.body.week.description, 'มีคำอธิบายแล้ว');

  const blanked = await edit(cookie, section.id, created.body.week.id, {
    week_no: 9,
    title: 'ทดสอบช่องว่าง',
    description: '',
    remark: '',
  });
  assert.equal(blanked.status, 200, blanked.body.message);
  assert.equal(blanked.body.week.description, null);
  assert.equal(blanked.body.week.remark, null);

  const { rows } = await api.pool.query(
    'SELECT description, remark FROM course_syllabus WHERE id = $1',
    [created.body.week.id],
  );
  assert.deepEqual(rows[0], { description: null, remark: null });

  const gone = await remove(cookie, section.id, created.body.week.id);
  assert.equal(gone.status, 204);
});

test('a crafted week is refused whole, and nothing is written', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const before = (await plan(cookie, section.id)).length;

  // Week zero, a fraction, spelled out, missing, off the smallint's end, and
  // a missing title — one refusal for all of them, before the database.
  const crafted = [
    { week_no: 0, title: 'สัปดาห์ศูนย์' },
    { week_no: 4.5, title: 'ครึ่งสัปดาห์' },
    { week_no: 'สี่', title: 'ตัวหนังสือ' },
    { title: 'ไม่มีเลข' },
    { week_no: 40000, title: 'เกิน smallint' },
    { week_no: 5 },
    { week_no: 5, title: '   ' },
  ];
  for (const week of crafted) {
    const refused = await add(cookie, section.id, week);
    assert.equal(refused.status, 400, JSON.stringify(week));
    assert.equal(refused.body.message, REFUSALS.invalidWeek);
  }
  // The same door on the edit path.
  const weeks = await plan(cookie, section.id);
  const refused = await edit(cookie, section.id, weeks[1].id, { week_no: 0, title: 'ศูนย์' });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidWeek);

  assert.equal((await plan(cookie, section.id)).length, before);
});

test('editing rewrites the row in place — same id, including the week number', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const weeks = await plan(cookie, section.id);
  const second = weeks[1];

  const moved = await edit(cookie, section.id, second.id, {
    week_no: 6,
    title: 'ย้ายไปสัปดาห์ที่หก',
    description: second.description,
    remark: second.remark,
  });
  assert.equal(moved.status, 200, moved.body.message);
  assert.equal(moved.body.week.id, second.id);
  assert.equal(moved.body.week.week_no, 6);

  // The list re-sorts around the move; nothing else was renumbered.
  assert.deepEqual(
    (await plan(cookie, section.id)).map((row) => row.week_no),
    [1, 3, 6],
  );

  const restored = await edit(cookie, section.id, second.id, shapeOf(second));
  assert.equal(restored.status, 200, restored.body.message);
  assert.deepEqual(
    (await plan(cookie, section.id)).map(shapeOf),
    planWeeksFor(section.number, CURRENT_YEAR),
  );
});

test('a week id is paired with its Section, not global', async () => {
  // The pairing rule from #28, one grain down: the sibling Section's week id
  // through this Section's address is a 404, not a cross-Section edit.
  const mine = await teaching('U_TEACH');
  const theirs = await teaching('U_MULTI');
  const here = await seededSection('U_TEACH', CURRENT_YEAR);
  const there = await seededSection('U_MULTI', CURRENT_YEAR);
  const theirWeek = (await plan(theirs, there.id))[0];

  const edited = await edit(mine, here.id, theirWeek.id, { week_no: 1, title: 'ของคนอื่น' });
  assert.equal(edited.status, 404);
  assert.equal(edited.body.message, REFUSALS.weekNotFound);

  const removed = await remove(mine, here.id, theirWeek.id);
  assert.equal(removed.status, 404);
  assert.equal(removed.body.message, REFUSALS.weekNotFound);

  // Untouched where it lives.
  assert.equal((await plan(theirs, there.id))[0].title, theirWeek.title);
});

test('a deleted week takes only itself', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const created = await add(cookie, section.id, { week_no: 2, title: 'หัวข้อชั่วคราวกลางแผน' });
  assert.equal(created.status, 201, created.body.message);

  const gone = await remove(cookie, section.id, created.body.week.id);
  assert.equal(gone.status, 204);

  // The survivors keep their own numbers — no renumbering, the numbers are
  // the person's — and their own words.
  assert.deepEqual(
    (await plan(cookie, section.id)).map(shapeOf),
    planWeeksFor(section.number, CURRENT_YEAR),
  );
});

test('a week an Activity points at cannot be deleted, and the refusal names it', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const weeks = await plan(cookie, section.id);
  const referenced = weeks[0];

  // The seed attached the midterm to week 1 — check the premise, so this test
  // fails loudly if the seed stops doing that rather than passing emptily.
  const { rows } = await api.pool.query(
    'SELECT activity_name FROM activities WHERE course_syllabus_id = $1',
    [referenced.id],
  );
  assert.deepEqual(
    rows.map((row) => row.activity_name),
    [PLAN_REFERENCED_ACTIVITY],
  );

  const refused = await remove(cookie, section.id, referenced.id);
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.weekInUse(referenced.week_no));

  // Still there, still attached.
  assert.equal((await plan(cookie, section.id)).length, weeks.length);
  const after = await api.pool.query(
    'SELECT count(*)::int AS n FROM activities WHERE course_syllabus_id = $1',
    [referenced.id],
  );
  assert.equal(after.rows[0].n, 1);
});

test('the body cannot choose the Section', async () => {
  // ADR-0002: the Section comes from the address. A section_id in the body is
  // dead weight, not a steering wheel.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const there = await seededSection('U_MULTI', CURRENT_YEAR);

  const created = await add(cookie, section.id, {
    week_no: 11,
    title: 'ทดสอบ body',
    section_id: there.id,
  });
  assert.equal(created.status, 201, created.body.message);

  const { rows } = await api.pool.query('SELECT section_id FROM course_syllabus WHERE id = $1', [
    created.body.week.id,
  ]);
  assert.equal(rows[0].section_id, section.id);

  const gone = await remove(cookie, section.id, created.body.week.id);
  assert.equal(gone.status, 204);
});

test('somebody else\'s Section answers 404 with one sentence', async () => {
  const outsider = await teaching('U_TEACH2');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  for (const answered of [
    await read(outsider, section.id),
    await add(outsider, section.id, { week_no: 1, title: 'ของคนอื่น' }),
    await edit(outsider, section.id, 1, { week_no: 1, title: 'ของคนอื่น' }),
    await remove(outsider, section.id, 1),
  ]) {
    assert.equal(answered.status, 404);
    assert.equal(answered.body.message, REFUSALS.sectionNotFound);
  }

  // A Section that does not exist reads identically, so the address bar does
  // not leak which ids are real.
  const missing = await read(outsider, 999999);
  assert.equal(missing.status, 404);
  assert.equal(missing.body.message, REFUSALS.sectionNotFound);
});

test('the wrong role and the anonymous are refused at the door', async () => {
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const admin = await signInAs('U_DEPT');
  const refused = await read(admin, section.id);
  assert.equal(refused.status, 403);

  const anonymous = await request(api.app).get(url(section.id));
  assert.equal(anonymous.status, 401);
});

test('the writer is recorded, because the column exists', async () => {
  // ADR-0001 tier 3 gave course_syllabus a created_by; #31 has no "edited by"
  // line to draw, but a column the schema carries should not be seeded null.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const created = await add(cookie, section.id, { week_no: 12, title: 'ผู้เขียนถูกบันทึก' });
  assert.equal(created.status, 201, created.body.message);

  const { rows } = await api.pool.query('SELECT created_by FROM course_syllabus WHERE id = $1', [
    created.body.week.id,
  ]);
  assert.equal(rows[0].created_by, byAlias('U_TEACH'));

  const gone = await remove(cookie, section.id, created.body.week.id);
  assert.equal(gone.status, 204);
});

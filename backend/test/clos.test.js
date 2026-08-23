'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, PRIOR_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/27-course-learning-outcomes.md — the server half.
 *
 * The whole of this file is about one sentence in ADR-0003: a CLO belongs to a
 * (Program, Subject, academic year) and not to a Section. Everything the ticket
 * asks for follows from it, and every way of getting it wrong is a way of
 * letting the Section back in.
 *
 * The seed is the fixture, as in `teaching.test.js`, and for a sharper reason
 * here. Sections 1 and 2 of the current year are two classes of one Offering
 * taught by two different people; the section of the year before is the same
 * รายวิชา at a different point of the grain. No fixture this file could build
 * would say those three things more plainly than the shape already there, and
 * one that rebuilt them would be asserting against its own copy of ADR-0003.
 *
 * PLO-4, PLO-9, PLO-10, PLO-11 and PLO-13 exist in the หลักสูตร and are not in
 * this รายวิชา's coverage grid. They are what the second criterion is tested
 * with: a route that offered every PLO of the Program would look correct right
 * up until one of those five was picked.
 */

const DEPT_COMPUTER = '05';
const PROGRAM = '0501';
const SUBJECT_CODE = '01076105';

let api;
before(async () => {
  api = await startApi('clos', { withSeed: true });
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

/** Signed in and already wearing the teaching hat, which is all any of this needs. */
async function teaching(alias) {
  const cookie = await signInAs(alias);
  return alias === 'U_MULTI' ? actingAsTeacher(cookie) : cookie;
}

const url = (sectionId) => '/api/teaching/sections/' + sectionId + '/clos';

const list = (cookie, sectionId) => request(api.app).get(url(sectionId)).set('Cookie', cookie);

const add = (cookie, sectionId, body) =>
  request(api.app).post(url(sectionId)).set('Cookie', cookie).send(body);

const change = (cookie, sectionId, cloId, body) =>
  request(api.app)
    .put(url(sectionId) + '/' + cloId)
    .set('Cookie', cookie)
    .send(body);

const remove = (cookie, sectionId, cloId) =>
  request(api.app)
    .delete(url(sectionId) + '/' + cloId)
    .set('Cookie', cookie);

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

/** The PLOs the coverage grid does place on this รายวิชา, lowest id first. */
async function mappedPlos() {
  const { rows } = await api.pool.query(
    `SELECT outcome_id FROM subject_plo_mapping
      WHERE program_id = $1 AND subject_id = $2 ORDER BY outcome_id`,
    [PROGRAM, SUBJECT_CODE],
  );
  assert.ok(rows.length > 0, 'the seed is supposed to map some PLOs onto this subject');
  return rows.map((row) => row.outcome_id);
}

/** A PLO of the Program that this รายวิชา's coverage grid does not carry. */
async function unmappedPlo() {
  const { rows } = await api.pool.query(
    `SELECT outcome_id FROM learning_outcomes lo
      WHERE lo.program_id = $1 AND lo.level_depth = 1
        AND NOT EXISTS (SELECT 1 FROM subject_plo_mapping m
                         WHERE m.program_id = lo.program_id AND m.outcome_id = lo.outcome_id
                           AND m.subject_id = $2)
      ORDER BY lo.outcome_id LIMIT 1`,
    [PROGRAM, SUBJECT_CODE],
  );
  assert.ok(rows[0], 'the seed is supposed to leave some PLOs off this subject');
  return rows[0].outcome_id;
}

const DRAFT = {
  clo_number: 'CLO-90',
  clo_detail: 'อธิบายการจัดการข้อยกเว้นในโปรแกรมเชิงวัตถุได้',
  teaching_method: 'บรรยายและปฏิบัติในห้องปฏิบัติการ',
  assessment_method: 'สอบข้อเขียนและตรวจผลงาน',
};

test('the CLO set arrives with the Offering it belongs to, not the Section it was asked through', async () => {
  // The grain, read back. A screen given only a list would have nothing to put
  // the year on, and the year is what the fifth criterion turns on.
  const cookie = await teaching('U_TEACH');
  const answered = await list(cookie, await seededSection('U_TEACH', CURRENT_YEAR));

  assert.equal(answered.status, 200);
  assert.equal(answered.body.offering.program_id, PROGRAM);
  assert.equal(answered.body.offering.subject_id, SUBJECT_CODE);
  assert.equal(answered.body.offering.academic_year, CURRENT_YEAR);
  assert.equal(answered.body.clos.length, 9);

  const [first] = answered.body.clos;
  assert.equal(first.clo_number, 'CLO-1');
  assert.ok(first.clo_detail);
  assert.ok(first.teaching_method);
  assert.ok(first.assessment_method);
});

test('the set is identical from either Section of the same Offering', async () => {
  // The third criterion. Two classes, two teachers, one set — and the ids are
  // compared rather than the count, because two independent sets of nine would
  // pass a test that counted.
  const mine = await list(await teaching('U_TEACH'), await seededSection('U_TEACH', CURRENT_YEAR));
  const theirs = await list(await teaching('U_MULTI'), await seededSection('U_MULTI', CURRENT_YEAR));

  assert.equal(mine.status, 200);
  assert.equal(theirs.status, 200, theirs.body.message);
  assert.deepEqual(
    theirs.body.clos.map((clo) => clo.clo_id),
    mine.body.clos.map((clo) => clo.clo_id),
  );
});

test('a different year of the same subject has its own set', async () => {
  // The fifth criterion. Same รายวิชา, same teacher, the same section number
  // even — and not one clo_id in common.
  const cookie = await teaching('U_TEACH');
  const thisYear = await list(cookie, await seededSection('U_TEACH', CURRENT_YEAR));
  const lastYear = await list(cookie, await seededSection('U_TEACH', PRIOR_YEAR));

  assert.equal(lastYear.body.offering.academic_year, PRIOR_YEAR);
  const shared = thisYear.body.clos
    .map((clo) => clo.clo_id)
    .filter((id) => lastYear.body.clos.some((clo) => clo.clo_id === id));
  assert.deepEqual(shared, []);
  // The codes repeat across the years and the rows do not, which is the sixth
  // criterion's second half stated as data.
  assert.deepEqual(
    lastYear.body.clos.map((clo) => clo.clo_number),
    thisYear.body.clos.map((clo) => clo.clo_number),
  );
});

test('only the PLOs this subject is mapped to are offered', async () => {
  // The second criterion's list half. The coverage grid places eight of the
  // thirteen; a route reading `learning_outcomes` alone would answer all of
  // them, and one that forgot `level_depth` would answer the sub-outcomes too.
  const cookie = await teaching('U_TEACH');
  const answered = await list(cookie, await seededSection('U_TEACH', CURRENT_YEAR));

  const offered = answered.body.plos.map((plo) => plo.outcome_id);
  assert.deepEqual([...offered].sort((a, b) => a - b), await mappedPlos());
  assert.ok(answered.body.plos.every((plo) => plo.outcome_code && plo.outcome_title));
  assert.ok(!offered.includes(await unmappedPlo()));
});

test('a CLO can be added, and comes back linked to its PLO', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [plo] = await mappedPlos();

  const created = await add(cookie, section, { ...DRAFT, plo_id: plo });
  assert.equal(created.status, 201, created.body.message);
  assert.equal(created.body.clo.clo_number, DRAFT.clo_number);
  assert.equal(created.body.clo.clo_detail, DRAFT.clo_detail);
  assert.equal(created.body.clo.plo_id, plo);
  assert.ok(created.body.clo.plo_code, 'the screen shows a PLO code, not an id');

  const after = await list(cookie, section);
  assert.ok(after.body.clos.some((clo) => clo.clo_id === created.body.clo.clo_id));

  assert.equal((await remove(cookie, section, created.body.clo.clo_id)).status, 204);
});

test('a PLO outside this subject cannot be linked, whichever way it is sent', async () => {
  // The second criterion's refusal half, and it has to hold on both writes: a
  // guard on the POST alone is a guard a PUT walks straight past.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const stranger = await unmappedPlo();

  // The code is this test's own rather than DRAFT's. If a broken guard lets the
  // write through, the row it leaves behind must not be a row another test is
  // about to claim — otherwise that test fails too and the mutant looks as
  // though it proved something it never touched.
  const refused = await add(cookie, section, {
    ...DRAFT,
    clo_number: 'CLO-96',
    plo_id: stranger,
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.ploNotMapped);

  const existing = (await list(cookie, section)).body.clos[0];
  const alsoRefused = await change(cookie, section, existing.clo_id, {
    ...existing,
    plo_id: stranger,
  });
  assert.equal(alsoRefused.status, 400);
  assert.equal(alsoRefused.body.message, REFUSALS.ploNotMapped);
});

test('the code is unique within the year and free in another one', async () => {
  // The sixth criterion. CLO-1 is taken this year and taken last year, and the
  // two are different rows — so the refusal has to come from the year's own set
  // and not from the subject's.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const lastYear = await seededSection('U_TEACH', PRIOR_YEAR);

  const clash = await add(cookie, section, { ...DRAFT, clo_number: 'CLO-1' });
  assert.equal(clash.status, 409);
  assert.equal(clash.body.message, REFUSALS.duplicateCloNumber);

  const free = await add(cookie, lastYear, { ...DRAFT, clo_number: 'CLO-90' });
  assert.equal(free.status, 201, free.body.message);
  // And now it is taken there, and still free here.
  assert.equal((await add(cookie, lastYear, { ...DRAFT, clo_number: 'CLO-90' })).status, 409);
  const here = await add(cookie, section, { ...DRAFT, clo_number: 'CLO-90' });
  assert.equal(here.status, 201, here.body.message);

  assert.equal((await remove(cookie, lastYear, free.body.clo.clo_id)).status, 204);
  assert.equal((await remove(cookie, section, here.body.clo.clo_id)).status, 204);
});

test('an edit made from one Section is what the other Section reads', async () => {
  // The fourth criterion, and the one a shared read cannot fake: the write goes
  // in through ตอนเรียน 1 and comes out through ตอนเรียน 2.
  const mine = await teaching('U_TEACH');
  const theirs = await teaching('U_MULTI');
  const here = await seededSection('U_TEACH', CURRENT_YEAR);
  const there = await seededSection('U_MULTI', CURRENT_YEAR);

  const target = (await list(mine, here)).body.clos[0];
  const detail = 'แก้จากตอนเรียนที่หนึ่ง เพื่อให้ตอนเรียนที่สองอ่านเจอ';
  const saved = await change(mine, here, target.clo_id, { ...target, clo_detail: detail });
  assert.equal(saved.status, 200, saved.body.message);

  const read = (await list(theirs, there)).body.clos.find((clo) => clo.clo_id === target.clo_id);
  assert.equal(read.clo_detail, detail);

  await change(mine, here, target.clo_id, target);
});

test('each CLO carries who last changed it, and an edit moves it to the editor', async () => {
  // The seventh criterion. The seed writes every CLO as U_TEACH, so a route
  // that never wrote `updated_by` would pass a test that only read it — the
  // assertion that matters is the one after the edit, made by the other teacher
  // of the other Section.
  const theirs = await teaching('U_MULTI');
  const there = await seededSection('U_MULTI', CURRENT_YEAR);

  const before = (await list(theirs, there)).body.clos[0];
  assert.equal(before.updated_by, byAlias('U_TEACH'));
  assert.ok(before.updated_by_name, 'the screen shows a person, not a user id');
  assert.ok(before.updated_at);

  const saved = await change(theirs, there, before.clo_id, {
    ...before,
    clo_detail: before.clo_detail + ' (ปรับถ้อยคำ)',
  });
  assert.equal(saved.status, 200, saved.body.message);
  assert.equal(saved.body.clo.updated_by, byAlias('U_MULTI'));
  assert.notEqual(saved.body.clo.updated_at, before.updated_at);

  await change(theirs, there, before.clo_id, before);
});

test('a CLO with marks against it is refused in words rather than raised', async () => {
  // The eighth criterion. Every seeded CLO carries marks under it, so this is
  // the state the ticket names; the refusal is the route's own sentence, which
  // is the whole point — the foreign key would refuse too, and a 23503 reaching
  // the error handler would answer เกิดข้อผิดพลาดในระบบ for something the
  // person can act on.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const marked = (await list(cookie, section)).body.clos[0];

  const refused = await remove(cookie, section, marked.clo_id);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.cloHasScores);

  // And it is still there. A refusal that had already deleted the row would
  // report exactly the same status.
  assert.ok((await list(cookie, section)).body.clos.some((clo) => clo.clo_id === marked.clo_id));
});

test('a CLO mapped to an Activity but never marked is refused with the other sentence', async () => {
  // The state the database collapses into the one above: `activity_clo_mapping`
  // restricts whether or not a mark exists. The two have different ways out, so
  // they are two sentences.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const created = await add(cookie, section, { ...DRAFT, clo_number: 'CLO-91' });
  assert.equal(created.status, 201, created.body.message);
  const cloId = created.body.clo.clo_id;

  const host = await api.pool.query(
    `SELECT a.id, a.score_ratio_id,
            (SELECT max(sequence_order) FROM activity_clo_mapping m WHERE m.activity_id = a.id) AS last
       FROM activities a WHERE a.section_id = $1 ORDER BY a.id LIMIT 1`,
    [section],
  );
  await api.pool.query(
    `INSERT INTO activity_clo_mapping (activity_id, sequence_order, clo_id, weight, score_ratio_id)
     VALUES ($1, $2, $3, 0, $4)`,
    [host.rows[0].id, Number(host.rows[0].last) + 1, cloId, host.rows[0].score_ratio_id],
  );

  const refused = await remove(cookie, section, cloId);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.cloInUse);

  await api.pool.query(`DELETE FROM activity_clo_mapping WHERE clo_id = $1`, [cloId]);
  assert.equal((await remove(cookie, section, cloId)).status, 204);
});

test('a CLO named in the course-cycle plan is refused rather than cascaded away', async () => {
  // `clo_course_cycle_detail_cloplan.clo_id` is ON DELETE CASCADE, so this is
  // the one state where letting the database decide loses a record and tells
  // nobody. The route looks for it before the DELETE for that reason alone.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const created = await add(cookie, section, { ...DRAFT, clo_number: 'CLO-92' });
  assert.equal(created.status, 201, created.body.message);
  const cloId = created.body.clo.clo_id;

  const cycle = await api.pool.query(
    `INSERT INTO clo_course_cycle_cloplan (program_id, subject_id, academic_year)
     VALUES ($1, $2, $3)
     ON CONFLICT (subject_id, program_id, academic_year) DO UPDATE SET academic_year = EXCLUDED.academic_year
     RETURNING clo_course_cycle_id`,
    [PROGRAM, SUBJECT_CODE, CURRENT_YEAR],
  );
  await api.pool.query(
    `INSERT INTO clo_course_cycle_detail_cloplan (clo_course_cycle_id, clo_id, detail_type, detail_text)
     VALUES ($1, $2, 'REFLECTION', 'บันทึกทบทวนของรอบการสอน')`,
    [cycle.rows[0].clo_course_cycle_id, cloId],
  );

  const refused = await remove(cookie, section, cloId);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.cloInPlan);

  await api.pool.query(`DELETE FROM clo_course_cycle_detail_cloplan WHERE clo_id = $1`, [cloId]);
  assert.equal((await remove(cookie, section, cloId)).status, 204);
});

test('a CLO nothing points at is removed, and the removal is real', async () => {
  // The ninth criterion is the screen's job — there is nothing for a server to
  // confirm against, and a request that arrived is a request that was meant.
  // What the server owes is that the delete actually happened.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const created = await add(cookie, section, { ...DRAFT, clo_number: 'CLO-93' });

  assert.equal((await remove(cookie, section, created.body.clo.clo_id)).status, 204);
  assert.ok(
    !(await list(cookie, section)).body.clos.some((clo) => clo.clo_id === created.body.clo.clo_id),
  );
});

test('a request with no code and no detail is refused before anything is written', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  // The count is read before and after rather than compared to nine. What this
  // test claims is that the refusal wrote nothing, and a literal nine would
  // also fail whenever some other test in this file left a CLO behind — which
  // is a different fact, proved here by accident, and it makes every mutant
  // that changes the length of the list look as though it killed this row.
  const before = (await list(cookie, section)).body.clos.length;

  const refused = await add(cookie, section, { clo_detail: '   ' });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidClo);
  assert.equal((await list(cookie, section)).body.clos.length, before);
});

test('the Offering is resolved from the Section and never taken from the body', async () => {
  // ADR-0002 in one test. The body names another year, another subject and
  // another หลักสูตร; the route is supposed to look at none of the three, and
  // the CLO that comes back is supposed to be this Offering's.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const created = await add(cookie, section, {
    ...DRAFT,
    clo_number: 'CLO-94',
    academic_year: PRIOR_YEAR,
    subject_id: '01006012',
    program_id: '0502',
  });
  assert.equal(created.status, 201, created.body.message);

  const { rows } = await api.pool.query(
    `SELECT program_id, subject_id, academic_year FROM subject_clo WHERE clo_id = $1`,
    [created.body.clo.clo_id],
  );
  assert.deepEqual(rows[0], {
    program_id: PROGRAM,
    subject_id: SUBJECT_CODE,
    academic_year: CURRENT_YEAR,
  });

  assert.equal((await remove(cookie, section, created.body.clo.clo_id)).status, 204);
});

test('a Section the caller does not teach hides its CLO set behind the section refusal', async () => {
  // Not `cloNotFound`: the caller has not reached a CLO to be told about. The
  // register decides, per ADR-0002, and it answers the sentence #24 gave.
  const cookie = await teaching('U_TEACH2');
  const someoneElses = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await list(cookie, someoneElses);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.sectionNotFound);
  assert.equal((await add(cookie, someoneElses, DRAFT)).status, 404);
});

test('a CLO of another year cannot be edited through this year Section', async () => {
  // The id is real and the caller teaches a Section — just not this CLO's
  // Offering. The grain is what refuses, and it refuses as not found.
  const cookie = await teaching('U_TEACH');
  const now = await seededSection('U_TEACH', CURRENT_YEAR);
  const lastYears = (await list(cookie, await seededSection('U_TEACH', PRIOR_YEAR))).body.clos[0];

  const refused = await change(cookie, now, lastYears.clo_id, lastYears);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.cloNotFound);
  assert.equal((await remove(cookie, now, lastYears.clo_id)).status, 404);
});

test('a CLO id that is not a number is refused rather than raised', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await change(cookie, section, 'not-a-clo', DRAFT);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.cloNotFound);
});

test('a role that is not a teaching one does not reach these routes at all', async () => {
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  for (const alias of ['U_COM', 'U_ADMIN', 'U_DEPT', 'U_FAC']) {
    const cookie = await signInAs(alias);
    const refused = await list(cookie, section);
    assert.equal(refused.status, 403, alias + ' should not reach the CLO screen');
    assert.equal(refused.body.message, REFUSALS.forbidden);
  }
});

test('an anonymous caller is refused before any of this is considered', async () => {
  const refused = await request(api.app).get(url(1));
  assert.equal(refused.status, 401);
  assert.equal(refused.body.reason, 'anonymous');
});

'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, PRIOR_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/28-measurable-behaviors.md — the server half.
 *
 * A พฤติกรรมบ่งชี้ is what a student observably does that evidences a CLO. It
 * hangs off the CLO and nothing else — `subject_clo_measurable_behavior` has a
 * `clo_id` and no Section, no year and no Program of its own — so the whole of
 * ADR-0003 arrives here by inheritance: reached through any Section of the
 * Offering, shared by all of them, and a different year's CLO of the same code
 * carries a different set. The tests for that are the CLO suite's grain tests
 * one tier down, asserted on ids rather than counts for the same reason.
 *
 * The two enums are the ticket's third and fourth criteria. The database would
 * refuse a stray value too, but as a 22P02 reaching the error handler —
 * เกิดข้อผิดพลาดในระบบ for a value the person picked from a list the screen
 * drew. The route says which field is wrong instead.
 *
 * `behavior_no` is the server's, never the caller's. The inherited screen
 * numbered behaviours 1..N and renumbered on delete so the list never shows a
 * gap; the migration kept `(clo_id, behavior_no)` unique on that
 * understanding, and this suite pins both halves — the next number on add, the
 * closed gap on delete.
 */

const PROGRAM = '0501';
const SUBJECT_CODE = '01076105';
const DEPT_COMPUTER = '05';

let api;
before(async () => {
  api = await startApi('behaviors', { withSeed: true });
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

const url = (sectionId, cloId) =>
  '/api/teaching/sections/' + sectionId + '/clos/' + cloId + '/behaviors';

const list = (cookie, sectionId, cloId) =>
  request(api.app).get(url(sectionId, cloId)).set('Cookie', cookie);

const add = (cookie, sectionId, cloId, body) =>
  request(api.app).post(url(sectionId, cloId)).set('Cookie', cookie).send(body);

const change = (cookie, sectionId, cloId, behaviorId, body) =>
  request(api.app)
    .put(url(sectionId, cloId) + '/' + behaviorId)
    .set('Cookie', cookie)
    .send(body);

const remove = (cookie, sectionId, cloId, behaviorId) =>
  request(api.app)
    .delete(url(sectionId, cloId) + '/' + behaviorId)
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

/** The CLO set as #27 serves it, so behaviours are addressed the way the screen would. */
async function closOf(cookie, sectionId) {
  const answered = await request(api.app)
    .get('/api/teaching/sections/' + sectionId + '/clos')
    .set('Cookie', cookie);
  assert.equal(answered.status, 200, answered.body.message);
  return answered.body.clos;
}

const DRAFT = {
  behavior_detail: 'เขียนโปรแกรมเชิงวัตถุที่จัดการข้อยกเว้นได้ถูกต้อง',
  cognitive_level: 'apply',
  learning_activity: 'exercise',
};

test('the behaviours of a CLO arrive under it, numbered from one', async () => {
  // The seed writes two per CLO. The CLO and the Offering travel back with the
  // list because the screen heads itself with the code and the year — the year
  // being what the fifth criterion turns on.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);

  const answered = await list(cookie, section, clo.clo_id);
  assert.equal(answered.status, 200);
  assert.equal(answered.body.clo.clo_id, clo.clo_id);
  assert.equal(answered.body.clo.clo_number, 'CLO-1');
  assert.equal(answered.body.offering.academic_year, CURRENT_YEAR);

  assert.equal(answered.body.behaviors.length, 2);
  assert.deepEqual(
    answered.body.behaviors.map((behavior) => behavior.behavior_no),
    [1, 2],
  );
  for (const behavior of answered.body.behaviors) {
    assert.ok(behavior.behavior_detail);
    assert.ok(behavior.cognitive_level);
    assert.ok(behavior.learning_activity);
  }
});

test('the list is identical from either Section of the same Offering', async () => {
  // The fifth criterion's first half, on ids: two independent sets of two
  // would pass a test that counted.
  const mine = await teaching('U_TEACH');
  const theirs = await teaching('U_MULTI');
  const here = await seededSection('U_TEACH', CURRENT_YEAR);
  const there = await seededSection('U_MULTI', CURRENT_YEAR);
  const [clo] = await closOf(mine, here);

  const fromHere = await list(mine, here, clo.clo_id);
  const fromThere = await list(theirs, there, clo.clo_id);
  assert.equal(fromThere.status, 200, fromThere.body.message);
  assert.deepEqual(
    fromThere.body.behaviors.map((behavior) => behavior.id),
    fromHere.body.behaviors.map((behavior) => behavior.id),
  );
});

test('the same CLO code of another year carries its own behaviours', async () => {
  // The fifth criterion's second half. CLO-1 exists in both years as two rows,
  // and their behaviours are two sets with no id in common.
  const cookie = await teaching('U_TEACH');
  const now = await seededSection('U_TEACH', CURRENT_YEAR);
  const then = await seededSection('U_TEACH', PRIOR_YEAR);
  const [cloNow] = await closOf(cookie, now);
  const [cloThen] = await closOf(cookie, then);
  assert.equal(cloNow.clo_number, cloThen.clo_number);
  assert.notEqual(cloNow.clo_id, cloThen.clo_id);

  const thisYear = await list(cookie, now, cloNow.clo_id);
  const lastYear = await list(cookie, then, cloThen.clo_id);
  const shared = thisYear.body.behaviors
    .map((behavior) => behavior.id)
    .filter((id) => lastYear.body.behaviors.some((behavior) => behavior.id === id));
  assert.deepEqual(shared, []);
});

test('a behaviour can be added, and the server assigns the next number', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);

  const created = await add(cookie, section, clo.clo_id, DRAFT);
  assert.equal(created.status, 201, created.body.message);
  assert.equal(created.body.behavior.behavior_no, 3);
  assert.equal(created.body.behavior.behavior_detail, DRAFT.behavior_detail);
  assert.equal(created.body.behavior.cognitive_level, DRAFT.cognitive_level);
  assert.equal(created.body.behavior.learning_activity, DRAFT.learning_activity);

  const relisted = await list(cookie, section, clo.clo_id);
  assert.ok(relisted.body.behaviors.some((behavior) => behavior.id === created.body.behavior.id));

  assert.equal((await remove(cookie, section, clo.clo_id, created.body.behavior.id)).status, 204);
});

test('an edit changes the substance and never the number', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);

  const created = await add(cookie, section, clo.clo_id, DRAFT);
  assert.equal(created.status, 201, created.body.message);

  const edited = await change(cookie, section, clo.clo_id, created.body.behavior.id, {
    behavior_detail: 'นำเสนอการออกแบบคลาสต่อกลุ่มได้',
    cognitive_level: 'create',
    learning_activity: 'assigned_work',
    behavior_no: 99,
  });
  assert.equal(edited.status, 200, edited.body.message);
  assert.equal(edited.body.behavior.behavior_detail, 'นำเสนอการออกแบบคลาสต่อกลุ่มได้');
  assert.equal(edited.body.behavior.cognitive_level, 'create');
  assert.equal(edited.body.behavior.learning_activity, 'assigned_work');
  // The number is position, and position is the server's. A 99 in the body is
  // ignored rather than refused, for the reason #27 ignores a year in the body.
  assert.equal(edited.body.behavior.behavior_no, created.body.behavior.behavior_no);

  assert.equal((await remove(cookie, section, clo.clo_id, created.body.behavior.id)).status, 204);
});

test('a removal renumbers what is left, so the numbers stay one to N', async () => {
  // On a CLO of this test's own, so the seeded pairs stay untouched: the
  // renumbering rewrites rows, and every other test in this file reads them.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const host = await request(api.app)
    .post('/api/teaching/sections/' + section + '/clos')
    .set('Cookie', cookie)
    .send({ clo_number: 'CLO-95', clo_detail: 'เจ้าของพฤติกรรมชุดทดสอบการจัดหมายเลขใหม่' });
  assert.equal(host.status, 201, host.body.message);
  const cloId = host.body.clo.clo_id;

  const details = ['อธิบายแนวคิดได้', 'เขียนโค้ดได้', 'ประเมินงานเพื่อนได้'];
  for (const behavior_detail of details) {
    assert.equal(
      (await add(cookie, section, cloId, { ...DRAFT, behavior_detail })).status,
      201,
    );
  }

  const numbered = (await list(cookie, section, cloId)).body.behaviors;
  assert.deepEqual(numbered.map((behavior) => behavior.behavior_no), [1, 2, 3]);

  // Remove the middle one: the third must close the gap, and keep its identity.
  assert.equal((await remove(cookie, section, cloId, numbered[1].id)).status, 204);
  const closed = (await list(cookie, section, cloId)).body.behaviors;
  assert.deepEqual(closed.map((behavior) => behavior.behavior_no), [1, 2]);
  assert.deepEqual(
    closed.map((behavior) => behavior.behavior_detail),
    ['อธิบายแนวคิดได้', 'ประเมินงานเพื่อนได้'],
  );
  assert.equal(closed[1].id, numbered[2].id);

  assert.equal(
    (
      await request(api.app)
        .delete('/api/teaching/sections/' + section + '/clos/' + cloId)
        .set('Cookie', cookie)
    ).status,
    204,
  );
});

test('a cognitive level outside the six is refused before anything is written', async () => {
  // The third criterion's refusal half. The enum would refuse too, as a 22P02
  // raised into เกิดข้อผิดพลาดในระบบ; the route names the field instead.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);
  const countBefore = (await list(cookie, section, clo.clo_id)).body.behaviors.length;

  const refused = await add(cookie, section, clo.clo_id, {
    ...DRAFT,
    cognitive_level: 'memorise',
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidBehavior);
  assert.equal((await list(cookie, section, clo.clo_id)).body.behaviors.length, countBefore);
});

test('an activity type outside the four is refused the same way, on either verb', async () => {
  // The fourth criterion. Quiz is §8's word and deliberately not in the enum —
  // the migration's note on R063 — which makes it the exact stray value a
  // screen ported from the old app would send.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);
  const [existing] = (await list(cookie, section, clo.clo_id)).body.behaviors;

  const refused = await add(cookie, section, clo.clo_id, {
    ...DRAFT,
    learning_activity: 'quiz',
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidBehavior);

  const alsoRefused = await change(cookie, section, clo.clo_id, existing.id, {
    ...existing,
    learning_activity: 'quiz',
  });
  assert.equal(alsoRefused.status, 400);
  assert.equal(alsoRefused.body.message, REFUSALS.invalidBehavior);
});

test('a request with no detail is refused before anything is written', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);
  const countBefore = (await list(cookie, section, clo.clo_id)).body.behaviors.length;

  const refused = await add(cookie, section, clo.clo_id, { ...DRAFT, behavior_detail: '   ' });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidBehavior);
  assert.equal((await list(cookie, section, clo.clo_id)).body.behaviors.length, countBefore);
});

test('a Section the caller does not teach hides the behaviours behind the section refusal', async () => {
  // The seventh criterion. Not `cloNotFound`: the caller has not reached a CLO
  // to be told about. The register decides, per ADR-0002.
  const mine = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(mine, section);

  const cookie = await teaching('U_TEACH2');
  const refused = await list(cookie, section, clo.clo_id);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.sectionNotFound);
  assert.equal((await add(cookie, section, clo.clo_id, DRAFT)).status, 404);
});

test('a CLO of another year cannot be reached through this year Section', async () => {
  const cookie = await teaching('U_TEACH');
  const now = await seededSection('U_TEACH', CURRENT_YEAR);
  const [lastYears] = await closOf(cookie, await seededSection('U_TEACH', PRIOR_YEAR));

  const refused = await list(cookie, now, lastYears.clo_id);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.cloNotFound);
  assert.equal((await add(cookie, now, lastYears.clo_id, DRAFT)).status, 404);
});

test('a behaviour of another CLO is not reachable through this one', async () => {
  // The pairing, and it is tested between two CLOs the same account teaches,
  // where reach is doing none of the work — #22's lesson. Without
  // `clo_id = $2` on the row lookup, CLO-1's address could edit CLO-2's
  // behaviour and nothing would ever require the two to agree.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [cloOne, cloTwo] = await closOf(cookie, section);
  const [strayed] = (await list(cookie, section, cloTwo.clo_id)).body.behaviors;

  const refused = await change(cookie, section, cloOne.clo_id, strayed.id, DRAFT);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.behaviorNotFound);
  assert.equal((await remove(cookie, section, cloOne.clo_id, strayed.id)).status, 404);

  // And it is still there, untouched, under its own CLO.
  const kept = (await list(cookie, section, cloTwo.clo_id)).body.behaviors;
  assert.ok(kept.some((behavior) => behavior.id === strayed.id));
});

test('ids that are not numbers are refused rather than raised', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);

  const badClo = await list(cookie, section, 'not-a-clo');
  assert.equal(badClo.status, 404);
  assert.equal(badClo.body.message, REFUSALS.cloNotFound);

  const badBehavior = await change(cookie, section, clo.clo_id, 'not-a-behavior', DRAFT);
  assert.equal(badBehavior.status, 404);
  assert.equal(badBehavior.body.message, REFUSALS.behaviorNotFound);
});

test('the CLO written to is the one in the address, never one from the body', async () => {
  // ADR-0002 one tier down from #27's bodygrain: the body names another CLO,
  // and the row must land under the address's.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [cloOne, cloTwo] = await closOf(cookie, section);

  const created = await add(cookie, section, cloOne.clo_id, {
    ...DRAFT,
    clo_id: cloTwo.clo_id,
  });
  assert.equal(created.status, 201, created.body.message);

  const { rows } = await api.pool.query(
    `SELECT clo_id FROM subject_clo_measurable_behavior WHERE id = $1`,
    [created.body.behavior.id],
  );
  assert.equal(rows[0].clo_id, cloOne.clo_id);

  assert.equal((await remove(cookie, section, cloOne.clo_id, created.body.behavior.id)).status, 204);
});

test('a role that is not a teaching one does not reach these routes at all', async () => {
  const mine = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(mine, section);

  for (const alias of ['U_COM', 'U_ADMIN', 'U_DEPT', 'U_FAC']) {
    const cookie = await signInAs(alias);
    const refused = await list(cookie, section, clo.clo_id);
    assert.equal(refused.status, 403, alias + ' should not reach the behaviours screen');
    assert.equal(refused.body.message, REFUSALS.forbidden);
  }
});

test('an anonymous caller is refused before any of this is considered', async () => {
  const refused = await request(api.app).get(url(1, 1));
  assert.equal(refused.status, 401);
  assert.equal(refused.body.reason, 'anonymous');
});

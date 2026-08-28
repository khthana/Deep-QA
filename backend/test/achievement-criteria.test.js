'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, PRIOR_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/29-achievement-criteria.md — the server half.
 *
 * เกณฑ์การบรรลุผล is what performance looks like at each of the four bands, so
 * a raw mark translates into an attainment level rather than being judged ad
 * hoc. It hangs off the CLO exactly as a พฤติกรรมบ่งชี้ does —
 * `subject_clo_achievement_criteria` has a `clo_id` and no Section, year or
 * Program of its own — so the grain tests here are #28's, re-asserted one
 * table over, on ids rather than counts for the same reason.
 *
 * The band is the ticket's third criterion. Unlike #28's two enums it is a
 * CHECK on a varchar, but the argument is unchanged: a stray value would be
 * refused by the database as a 23514 reaching the error handler —
 * เกิดข้อผิดพลาดในระบบ for a value the person picked from a list the screen
 * drew. The route answers `invalidAchievement` instead, on either verb.
 *
 * `criteria_no` is the server's, never the caller's — the next number on add,
 * the closed gap on delete — and the bands are deliberately *not* unique per
 * CLO: the fourth criterion says a CLO *can* carry one per band, and the
 * renumber test below writes three of one band to prove nothing stops it.
 */

const DEPT_COMPUTER = '05';

let api;
before(async () => {
  api = await startApi('achievements', { withSeed: true });
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
  '/api/teaching/sections/' + sectionId + '/clos/' + cloId + '/criteria';

const list = (cookie, sectionId, cloId) =>
  request(api.app).get(url(sectionId, cloId)).set('Cookie', cookie);

const add = (cookie, sectionId, cloId, body) =>
  request(api.app).post(url(sectionId, cloId)).set('Cookie', cookie).send(body);

const change = (cookie, sectionId, cloId, criterionId, body) =>
  request(api.app)
    .put(url(sectionId, cloId) + '/' + criterionId)
    .set('Cookie', cookie)
    .send(body);

const remove = (cookie, sectionId, cloId, criterionId) =>
  request(api.app)
    .delete(url(sectionId, cloId) + '/' + criterionId)
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

/** The CLO set as #27 serves it, so criteria are addressed the way the screen would. */
async function closOf(cookie, sectionId) {
  const answered = await request(api.app)
    .get('/api/teaching/sections/' + sectionId + '/clos')
    .set('Cookie', cookie);
  assert.equal(answered.status, 200, answered.body.message);
  return answered.body.clos;
}

const DRAFT = {
  achievement_level: 'ดี',
  criteria_detail: 'อธิบายขั้นตอนการทำงานของโปรแกรมได้ถูกต้องเป็นส่วนใหญ่',
  criteria_description: 'พิจารณาจากงานที่ส่งและการตอบคำถามระหว่างนำเสนอ',
};

test('the criteria of a CLO arrive under it, numbered from one, one band each', async () => {
  // The seed writes one criterion per band, best first — the fourth
  // criterion's shape. The CLO and the Offering travel back because the
  // screen heads itself with the code and the year.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);

  const answered = await list(cookie, section, clo.clo_id);
  assert.equal(answered.status, 200);
  assert.equal(answered.body.clo.clo_id, clo.clo_id);
  assert.equal(answered.body.clo.clo_number, 'CLO-1');
  assert.equal(answered.body.offering.academic_year, CURRENT_YEAR);

  assert.deepEqual(
    answered.body.criteria.map((criterion) => criterion.criteria_no),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    answered.body.criteria.map((criterion) => criterion.achievement_level),
    ['ดีเยี่ยม', 'ดี', 'พอใช้', 'ต้องปรับปรุง'],
  );
  for (const criterion of answered.body.criteria) {
    assert.ok(criterion.criteria_detail);
  }
});

test('the list is identical from either Section of the same Offering', async () => {
  // The fifth criterion's first half, on ids: two independent sets of four
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
    fromThere.body.criteria.map((criterion) => criterion.id),
    fromHere.body.criteria.map((criterion) => criterion.id),
  );
});

test('the same CLO code of another year carries its own criteria', async () => {
  // The fifth criterion's second half. CLO-1 exists in both years as two rows,
  // and their criteria are two sets with no id in common.
  const cookie = await teaching('U_TEACH');
  const now = await seededSection('U_TEACH', CURRENT_YEAR);
  const then = await seededSection('U_TEACH', PRIOR_YEAR);
  const [cloNow] = await closOf(cookie, now);
  const [cloThen] = await closOf(cookie, then);
  assert.equal(cloNow.clo_number, cloThen.clo_number);
  assert.notEqual(cloNow.clo_id, cloThen.clo_id);

  const thisYear = await list(cookie, now, cloNow.clo_id);
  const lastYear = await list(cookie, then, cloThen.clo_id);
  const shared = thisYear.body.criteria
    .map((criterion) => criterion.id)
    .filter((id) => lastYear.body.criteria.some((criterion) => criterion.id === id));
  assert.deepEqual(shared, []);
});

test('a criterion can be added, and the server assigns the next number', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);

  const created = await add(cookie, section, clo.clo_id, DRAFT);
  assert.equal(created.status, 201, created.body.message);
  assert.equal(created.body.criterion.criteria_no, 5);
  assert.equal(created.body.criterion.achievement_level, DRAFT.achievement_level);
  assert.equal(created.body.criterion.criteria_detail, DRAFT.criteria_detail);
  assert.equal(created.body.criterion.criteria_description, DRAFT.criteria_description);

  const relisted = await list(cookie, section, clo.clo_id);
  assert.ok(relisted.body.criteria.some((criterion) => criterion.id === created.body.criterion.id));

  assert.equal((await remove(cookie, section, clo.clo_id, created.body.criterion.id)).status, 204);
});

test('the description is the one optional field, and absent means null', async () => {
  // The second criterion names it optional; the column is the one nullable
  // text on the table. Blank and absent both mean "no description", so an
  // edit that clears the box clears the column rather than storing ''.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);

  const { criteria_description, ...bare } = DRAFT;
  const created = await add(cookie, section, clo.clo_id, bare);
  assert.equal(created.status, 201, created.body.message);
  assert.equal(created.body.criterion.criteria_description, null);

  const blanked = await change(cookie, section, clo.clo_id, created.body.criterion.id, {
    ...DRAFT,
    criteria_description: '   ',
  });
  assert.equal(blanked.status, 200, blanked.body.message);
  assert.equal(blanked.body.criterion.criteria_description, null);

  assert.equal((await remove(cookie, section, clo.clo_id, created.body.criterion.id)).status, 204);
});

test('an edit changes the substance and never the number', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);

  const created = await add(cookie, section, clo.clo_id, DRAFT);
  assert.equal(created.status, 201, created.body.message);

  const edited = await change(cookie, section, clo.clo_id, created.body.criterion.id, {
    achievement_level: 'พอใช้',
    criteria_detail: 'ทำงานได้ตามเกณฑ์ขั้นต่ำโดยมีข้อผิดพลาดที่ต้องแก้',
    criteria_description: 'นับเฉพาะงานที่ส่งตรงเวลา',
    criteria_no: 99,
  });
  assert.equal(edited.status, 200, edited.body.message);
  assert.equal(edited.body.criterion.achievement_level, 'พอใช้');
  assert.equal(edited.body.criterion.criteria_detail, 'ทำงานได้ตามเกณฑ์ขั้นต่ำโดยมีข้อผิดพลาดที่ต้องแก้');
  assert.equal(edited.body.criterion.criteria_description, 'นับเฉพาะงานที่ส่งตรงเวลา');
  // The number is position, and position is the server's. A 99 in the body is
  // ignored rather than refused, for the reason #27 ignores a year in the body.
  assert.equal(edited.body.criterion.criteria_no, created.body.criterion.criteria_no);

  assert.equal((await remove(cookie, section, clo.clo_id, created.body.criterion.id)).status, 204);
});

test('a removal renumbers what is left, so the numbers stay one to N', async () => {
  // On a CLO of this test's own, so the seeded four-band sets stay untouched:
  // the renumbering rewrites rows, and every other test in this file reads
  // them. Three rows of one band, incidentally, which is the proof the band
  // is not unique per CLO — "one per band" is a capability, not a constraint.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const host = await request(api.app)
    .post('/api/teaching/sections/' + section + '/clos')
    .set('Cookie', cookie)
    .send({ clo_number: 'CLO-96', clo_detail: 'เจ้าของเกณฑ์ชุดทดสอบการจัดหมายเลขใหม่' });
  assert.equal(host.status, 201, host.body.message);
  const cloId = host.body.clo.clo_id;

  const details = ['ครบทุกข้อ', 'ขาดหนึ่งข้อ', 'ขาดสองข้อ'];
  for (const criteria_detail of details) {
    assert.equal(
      (await add(cookie, section, cloId, { ...DRAFT, criteria_detail })).status,
      201,
    );
  }

  const numbered = (await list(cookie, section, cloId)).body.criteria;
  assert.deepEqual(numbered.map((criterion) => criterion.criteria_no), [1, 2, 3]);

  // Remove the middle one: the third must close the gap, and keep its identity.
  assert.equal((await remove(cookie, section, cloId, numbered[1].id)).status, 204);
  const closed = (await list(cookie, section, cloId)).body.criteria;
  assert.deepEqual(closed.map((criterion) => criterion.criteria_no), [1, 2]);
  assert.deepEqual(
    closed.map((criterion) => criterion.criteria_detail),
    ['ครบทุกข้อ', 'ขาดสองข้อ'],
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

test('a band outside the four is refused before anything is written, on either verb', async () => {
  // The third criterion. The CHECK constraint would refuse too, as a 23514
  // raised into เกิดข้อผิดพลาดในระบบ; the route names the field instead.
  // ปานกลาง is the middle band the old five-band scale would have — the exact
  // stray value a screen ported from elsewhere would send.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);
  const countBefore = (await list(cookie, section, clo.clo_id)).body.criteria.length;

  const refused = await add(cookie, section, clo.clo_id, {
    ...DRAFT,
    achievement_level: 'ปานกลาง',
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidAchievement);
  assert.equal((await list(cookie, section, clo.clo_id)).body.criteria.length, countBefore);

  const [existing] = (await list(cookie, section, clo.clo_id)).body.criteria;
  const alsoRefused = await change(cookie, section, clo.clo_id, existing.id, {
    ...existing,
    achievement_level: 'ปานกลาง',
  });
  assert.equal(alsoRefused.status, 400);
  assert.equal(alsoRefused.body.message, REFUSALS.invalidAchievement);
});

test('a request with no detail is refused before anything is written', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);
  const countBefore = (await list(cookie, section, clo.clo_id)).body.criteria.length;

  const refused = await add(cookie, section, clo.clo_id, { ...DRAFT, criteria_detail: '   ' });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidAchievement);
  assert.equal((await list(cookie, section, clo.clo_id)).body.criteria.length, countBefore);
});

test('a Section the caller does not teach hides the criteria behind the section refusal', async () => {
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

test('a criterion of another CLO is not reachable through this one', async () => {
  // The pairing, and it is tested between two CLOs the same account teaches,
  // where reach is doing none of the work — #22's lesson. Without
  // `clo_id = $2` on the row lookup, CLO-1's address could edit CLO-2's
  // criterion and nothing would ever require the two to agree.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [cloOne, cloTwo] = await closOf(cookie, section);
  const [strayed] = (await list(cookie, section, cloTwo.clo_id)).body.criteria;

  const refused = await change(cookie, section, cloOne.clo_id, strayed.id, DRAFT);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.achievementNotFound);
  assert.equal((await remove(cookie, section, cloOne.clo_id, strayed.id)).status, 404);

  // And it is still there, untouched, under its own CLO.
  const kept = (await list(cookie, section, cloTwo.clo_id)).body.criteria;
  assert.ok(kept.some((criterion) => criterion.id === strayed.id));
});

test('ids that are not numbers are refused rather than raised', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(cookie, section);

  const badClo = await list(cookie, section, 'not-a-clo');
  assert.equal(badClo.status, 404);
  assert.equal(badClo.body.message, REFUSALS.cloNotFound);

  const badCriterion = await change(cookie, section, clo.clo_id, 'not-a-criterion', DRAFT);
  assert.equal(badCriterion.status, 404);
  assert.equal(badCriterion.body.message, REFUSALS.achievementNotFound);
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
    `SELECT clo_id FROM subject_clo_achievement_criteria WHERE id = $1`,
    [created.body.criterion.id],
  );
  assert.equal(rows[0].clo_id, cloOne.clo_id);

  assert.equal(
    (await remove(cookie, section, cloOne.clo_id, created.body.criterion.id)).status,
    204,
  );
});

test('a role that is not a teaching one does not reach these routes at all', async () => {
  const mine = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [clo] = await closOf(mine, section);

  for (const alias of ['U_COM', 'U_ADMIN', 'U_DEPT', 'U_FAC']) {
    const cookie = await signInAs(alias);
    const refused = await list(cookie, section, clo.clo_id);
    assert.equal(refused.status, 403, alias + ' should not reach the criteria screen');
    assert.equal(refused.body.message, REFUSALS.forbidden);
  }
});

test('an anonymous caller is refused before any of this is considered', async () => {
  const refused = await request(api.app).get(url(1, 1));
  assert.equal(refused.status, 401);
  assert.equal(refused.body.reason, 'anonymous');
});

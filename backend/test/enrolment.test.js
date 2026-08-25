'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, PRIOR_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { PAGE_SIZE } = require('../lib/paging');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/25-section-enrolment.md — the server half.
 *
 * The register and the class list are two different questions about one student
 * code, and this file is about keeping them apart. #17 built the register; #25
 * builds the list of who is in a class. A code that is not in the register can
 * never enter a class list, because that is the sentence in the ticket that
 * keeps marks from attaching to an unknown person — and the way that is
 * enforced is a foreign key, not a screen.
 *
 * The seed is the fixture, as in `teaching.test.js` and `clos.test.js`, and it
 * already says three things no fixture built here would say better:
 *
 * - 113 current-year students alternate across two Sections, so Section 1 holds
 *   57 of them. That is the paging criterion with nothing to arrange.
 * - Every current-year student is *already* enrolled, so "enrol a student by
 *   code" has no candidate among them. The prior-year cohort is the candidate:
 *   `65…` exists in the register and is enrolled only in the prior-year
 *   Section, which is what a repeating student looks like and is a legitimate
 *   enrolment rather than a contrivance.
 * - U_TEACH teaches Section 1 and U_MULTI teaches Section 2 of one Offering,
 *   which is the pair `teaching.test.js` uses for "not yours". Reusing it keeps
 *   the two files agreeing about who owns what.
 *
 * The removal criterion is walked with a student who has just been enrolled,
 * not with a seeded one. Every seeded student carries marks, and a removal that
 * stranded them would leave `activity_scores` pointing at somebody no longer in
 * the class — so the route refuses that, mirroring `cloHasScores` one grain
 * down, and the enrolment made a moment ago is the one that can be taken back.
 */

const DEPT_COMPUTER = '05';

let api;
before(async () => {
  api = await startApi('enrolment', { withSeed: true });
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

const url = (sectionId) => '/api/teaching/sections/' + sectionId + '/students';

const list = (cookie, sectionId, query = '') =>
  request(api.app)
    .get(url(sectionId) + query)
    .set('Cookie', cookie);

const enrol = (cookie, sectionId, body) =>
  request(api.app).post(url(sectionId)).set('Cookie', cookie).send(body);

const remove = (cookie, sectionId, studentId) =>
  request(api.app)
    .delete(url(sectionId) + '/' + studentId)
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
 * Student codes in the register that this Section does not hold, lowest first.
 *
 * Asked of the database rather than written down, because which codes those are
 * is the seed's business; what this file needs is only that there are some.
 */
async function notEnrolledIn(sectionId, howMany) {
  const { rows } = await api.pool.query(
    `SELECT student_id FROM student s
      WHERE NOT EXISTS (SELECT 1 FROM student_course sc
                         WHERE sc.student_id = s.student_id AND sc.section_id = $1)
      ORDER BY student_id LIMIT $2`,
    [sectionId, howMany],
  );
  assert.equal(rows.length, howMany, 'the seed is supposed to leave some students off this section');
  return rows.map((row) => row.student_id);
}

const enrolledCount = async (sectionId) => {
  const { rows } = await api.pool.query(
    'SELECT count(*)::int AS total FROM student_course WHERE section_id = $1',
    [sectionId],
  );
  return rows[0].total;
};

/** A code no register holds. Outside both seeded cohorts by its first two digits. */
const UNKNOWN = '99019999';

test('the class list is this Section’s students, ten to a page', async () => {
  // The first criterion. Section 1 of the current year holds 57 of the 113, so
  // the page is full and there are more pages behind it.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const first = await list(cookie, section);
  assert.equal(first.status, 200);
  assert.equal(first.body.students.length, PAGE_SIZE);
  assert.equal(first.body.page, 1);
  assert.equal(first.body.per_page, PAGE_SIZE);
  assert.equal(first.body.total, await enrolledCount(section));
  assert.ok(first.body.total > PAGE_SIZE, 'the seed is supposed to fill more than one page');

  // A student carries a name, not only a code: the screen has to read as a
  // class list rather than as a column of numbers.
  assert.ok(first.body.students[0].full_name_th);

  const second = await list(cookie, section, '?page=2');
  assert.equal(second.status, 200);
  assert.equal(second.body.page, 2);
  const overlap = second.body.students.filter((student) =>
    first.body.students.some((earlier) => earlier.student_id === student.student_id),
  );
  assert.deepEqual(overlap, [], 'page 2 is supposed to be a different set of people');
});

test('the list holds only this Section, not the Offering and not the year before', async () => {
  // The Section is the grain here, unlike #27's CLOs — ADR-0003 puts the
  // outcome set on the Offering and leaves enrolment where the schema has it.
  // A route that resolved the Offering the way `clos.js` does would return both
  // Sections' students, and every count on every screen above would be wrong.
  const cookie = await teaching('U_TEACH');
  const mine = await seededSection('U_TEACH', CURRENT_YEAR);
  const theirs = await seededSection('U_MULTI', CURRENT_YEAR);

  const listed = await list(cookie, mine, '?per_page=100');
  const { rows } = await api.pool.query(
    'SELECT student_id FROM student_course WHERE section_id = $1',
    [theirs],
  );
  const strangers = listed.body.students.filter((student) =>
    rows.some((row) => row.student_id === student.student_id),
  );
  assert.deepEqual(strangers, [], 'the sibling Section’s students leaked in');
});

test('a Teacher enrols a student by code, and they appear in the list', async () => {
  // The second criterion.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [code] = await notEnrolledIn(section, 1);
  const before = await enrolledCount(section);

  const added = await enrol(cookie, section, { student_id: code });
  assert.equal(added.status, 201, added.body.message);
  assert.equal(added.body.student.student_id, code);
  assert.ok(added.body.student.full_name_th);

  assert.equal(await enrolledCount(section), before + 1);
  const listed = await list(cookie, section, '?per_page=100');
  assert.ok(listed.body.students.some((student) => student.student_id === code));

  await remove(cookie, section, code);
});

test('a code the register has never heard of is refused, naming the register', async () => {
  // The third criterion, and the sentence the ticket is built around: nothing
  // half-formed is written, and the answer says where to go and put it.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const before = await enrolledCount(section);

  const refused = await enrol(cookie, section, { student_id: UNKNOWN });
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.studentNotInRegister);
  assert.equal(await enrolledCount(section), before);

  // And nothing was created in the register either, which is the failure mode
  // the ticket names in as many words.
  const { rows } = await api.pool.query('SELECT 1 FROM student WHERE student_id = $1', [UNKNOWN]);
  assert.deepEqual(rows, []);
});

test('a code that is not eight digits is refused before the register is asked', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  for (const code of ['', '   ', '1234', 'abcdefgh', '660100011']) {
    const refused = await enrol(cookie, section, { student_id: code });
    assert.equal(refused.status, 400, 'accepted ' + JSON.stringify(code));
    assert.equal(refused.body.message, REFUSALS.invalidEnrolment);
  }
});

test('enrolling the same student twice is rejected rather than duplicated', async () => {
  // The fourth criterion. ADR-0001 tier 2 made (student_id, section_id) the
  // key, so this is the database refusing and the route wording it.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [code] = await notEnrolledIn(section, 1);

  assert.equal((await enrol(cookie, section, { student_id: code })).status, 201);
  const after = await enrolledCount(section);

  const again = await enrol(cookie, section, { student_id: code });
  assert.equal(again.status, 409);
  assert.equal(again.body.message, REFUSALS.duplicateEnrolment);
  assert.equal(await enrolledCount(section), after);

  await remove(cookie, section, code);
});

test('a Teacher removes an enrolment, and the student leaves the list', async () => {
  // The fifth criterion's server half. The confirmation itself is the screen's,
  // and is walked there.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [code] = await notEnrolledIn(section, 1);
  const before = await enrolledCount(section);

  assert.equal((await enrol(cookie, section, { student_id: code })).status, 201);
  const removed = await remove(cookie, section, code);
  assert.equal(removed.status, 204);
  assert.equal(await enrolledCount(section), before);

  // The register keeps them. Leaving a class is not ceasing to exist, and #17
  // has no removal path at all.
  const { rows } = await api.pool.query('SELECT 1 FROM student WHERE student_id = $1', [code]);
  assert.equal(rows.length, 1);
});

test('removing an enrolment that carries marks is refused', async () => {
  // Not in #25's nine, and here for the reason `cloHasScores` is in #27:
  // nothing references `student_course`, so the DELETE would succeed and leave
  // `activity_scores` rows pointing at somebody no longer in the class. Every
  // seeded student has marks, which is what makes this the ordinary case rather
  // than the corner one.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const { rows } = await api.pool.query(
    `SELECT sc.student_id FROM student_course sc
      WHERE sc.section_id = $1
        AND EXISTS (SELECT 1 FROM activity_scores s
                     JOIN activities a ON a.id = s.activity_id
                    WHERE s.student_id = sc.student_id AND a.section_id = $1)
      ORDER BY sc.student_id LIMIT 1`,
    [section],
  );
  assert.ok(rows[0], 'the seed is supposed to have marked this section');
  const before = await enrolledCount(section);

  const refused = await remove(cookie, section, rows[0].student_id);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.enrolmentHasScores);
  assert.equal(await enrolledCount(section), before);
});

test('removing a student who is in a work group is refused, naming the group', async () => {
  // The other half of the same guard. BR-07 puts a student in one group per
  // subject; un-enrolling them would leave the group holding a person who is
  // not in the class.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const { rows } = await api.pool.query(
    `SELECT m.student_id FROM student_group_member m
       JOIN student_group g ON g.group_id = m.group_id
      WHERE g.section_id = $1
        AND NOT EXISTS (SELECT 1 FROM activity_scores s
                         JOIN activities a ON a.id = s.activity_id
                        WHERE s.student_id = m.student_id AND a.section_id = $1)
      ORDER BY m.student_id LIMIT 1`,
    [section],
  );
  // The seed marks everybody it groups, so this is normally unreachable through
  // the seed alone: the student is put in a group here so the guard is asked
  // about a student the marks guard would not already have refused.
  let code = rows[0]?.student_id;
  let planted = null;
  if (!code) {
    [code] = await notEnrolledIn(section, 1);
    assert.equal((await enrol(cookie, section, { student_id: code })).status, 201);
    const group = await api.pool.query(
      'INSERT INTO student_group (section_id, group_name) VALUES ($1, $2) RETURNING group_id',
      [section, 'กลุ่มทดสอบ'],
    );
    planted = group.rows[0].group_id;
    await api.pool.query(
      'INSERT INTO student_group_member (group_id, student_id) VALUES ($1, $2)',
      [planted, code],
    );
  }

  const refused = await remove(cookie, section, code);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.enrolmentInGroup);

  if (planted) {
    await api.pool.query('DELETE FROM student_group_member WHERE group_id = $1', [planted]);
    await api.pool.query('DELETE FROM student_group WHERE group_id = $1', [planted]);
    await remove(cookie, section, code);
  }
});

test('removing somebody who is not in this Section answers not found', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [code] = await notEnrolledIn(section, 1);

  const refused = await remove(cookie, section, code);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.studentNotFound);
});

test('the import template is a file, with the one column the import reads', async () => {
  // The sixth criterion's server half. That the button is on the screen is the
  // browser seam's, and is asserted there.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const file = await template(cookie, section);
  assert.equal(file.status, 200);
  assert.match(file.headers['content-type'], /text\/csv/);
  assert.match(file.headers['content-disposition'], /attachment; filename="section-students-template\.csv"/);
  assert.equal(file.text.split(/\r?\n/)[0].replace(/^﻿/, ''), 'student_id');
});

test('a valid spreadsheet enrols every student listed in it', async () => {
  // The seventh criterion.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const codes = await notEnrolledIn(section, 3);
  const before = await enrolledCount(section);

  const sent = await upload(cookie, section, ['student_id', ...codes].join('\n'));
  assert.equal(sent.status, 201, sent.body.message);
  assert.equal(sent.body.created, 3);
  assert.equal(await enrolledCount(section), before + 3);

  for (const code of codes) await remove(cookie, section, code);
});

test('a spreadsheet with an unknown code reports that row and applies nothing', async () => {
  // The eighth criterion, and the whole of it is the second sentence: the two
  // good rows either side of the bad one are not written.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const codes = await notEnrolledIn(section, 2);
  const before = await enrolledCount(section);

  const sent = await upload(
    cookie,
    section,
    ['student_id', codes[0], UNKNOWN, codes[1]].join('\n'),
  );
  assert.equal(sent.status, 400);
  assert.equal(sent.body.created, 0);
  assert.deepEqual(sent.body.errors, [{ line: 3, message: REFUSALS.studentNotInRegister }]);
  assert.equal(await enrolledCount(section), before);
});

test('a spreadsheet naming one student twice reports the line it repeats', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const [code] = await notEnrolledIn(section, 1);
  const before = await enrolledCount(section);

  const sent = await upload(cookie, section, ['student_id', code, code].join('\n'));
  assert.equal(sent.status, 400);
  assert.equal(sent.body.errors.length, 1);
  assert.equal(sent.body.errors[0].line, 3);
  assert.match(sent.body.errors[0].message, /ซ้ำ/);
  assert.equal(await enrolledCount(section), before);
});

test('a spreadsheet naming somebody already in the class reports them, and writes nothing', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const listed = await list(cookie, section);
  const already = listed.body.students[0].student_id;
  const [fresh] = await notEnrolledIn(section, 1);
  const before = await enrolledCount(section);

  const sent = await upload(cookie, section, ['student_id', fresh, already].join('\n'));
  assert.equal(sent.status, 400);
  assert.deepEqual(sent.body.errors, [{ line: 3, message: REFUSALS.duplicateEnrolment }]);
  assert.equal(await enrolledCount(section), before);
});

test('some other screen’s spreadsheet is refused as the wrong template', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const sent = await upload(cookie, section, 'email,role_id\nsomebody@kmitl.ac.th,TEACHER');
  assert.equal(sent.status, 400);
  assert.equal(sent.body.message, REFUSALS.importWrongTemplate);
  assert.deepEqual(sent.body.errors, []);
});

test('a Section this account does not teach is refused at the server, on every call', async () => {
  // The ninth criterion. The teaching register is the whole WHERE clause, so a
  // colleague's Section in the same department and a Section that does not
  // exist answer the same sentence — nobody walks the id space from here.
  const cookie = await teaching('U_TEACH');
  const theirs = await seededSection('U_MULTI', CURRENT_YEAR);
  const [code] = await notEnrolledIn(theirs, 1);
  const before = await enrolledCount(theirs);

  const calls = [
    list(cookie, theirs),
    enrol(cookie, theirs, { student_id: code }),
    remove(cookie, theirs, code),
    template(cookie, theirs),
    upload(cookie, theirs, ['student_id', code].join('\n')),
  ];
  for (const call of calls) {
    const refused = await call;
    assert.equal(refused.status, 404, refused.request.method + ' ' + refused.request.url);
    assert.equal(refused.body.message, REFUSALS.sectionNotFound);
  }
  assert.equal(await enrolledCount(theirs), before);
});

test('a Section nobody teaches, and an id that is not a number, answer the same', async () => {
  const cookie = await teaching('U_TEACH');

  for (const section of ['9999999', 'abc', '1;drop']) {
    const refused = await list(cookie, section);
    assert.equal(refused.status, 404, 'for ' + section);
    assert.equal(refused.body.message, REFUSALS.sectionNotFound);
  }
});

test('an account that teaches nothing reaches no class list at all', async () => {
  const cookie = await teaching('U_TEACH2');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await list(cookie, section);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.sectionNotFound);
});

test('the Teacher’s own Section of the year before is theirs too', async () => {
  // Enrolment is a fact about a Section, and a Section belongs to a term. The
  // teaching register does not expire, so last year's class list is readable —
  // which is what the year-over-year screens above this one will need.
  const cookie = await teaching('U_TEACH');
  const last = await seededSection('U_TEACH', PRIOR_YEAR);

  const listed = await list(cookie, last);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.total, await enrolledCount(last));
});

test('a role that is not TEACHER is refused before the Section is looked at', async () => {
  for (const alias of ['U_COM', 'U_ADMIN', 'U_DEPT', 'U_FAC']) {
    const cookie = await signInAs(alias);
    const refused = await request(api.app)
      .get(url(1))
      .set('Cookie', cookie);
    assert.equal(refused.status, 403, 'for ' + alias);
  }
});

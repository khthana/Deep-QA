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
  byAlias,
} = require('../../db/seed');
const { currentTerm } = require('../../db/term');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/24-teacher-dashboard.md - the server half.
 *
 * The seed is the fixture here rather than something this file builds, because
 * the shape the criteria are about is a shape the seed already has and could
 * not be rebuilt without copying it: U_TEACH teaches one Section in the current
 * term and one in the term a year before, which is the only way "exactly the
 * Sections for the current year and semester" can be told apart from "the
 * Sections"; and U_TEACH2 teaches nothing, which the seed says in as many words
 * where it defines the account.
 *
 * The seed's term is derived from the calendar now, so this file asks for it by
 * name rather than spelling a year out. `currentTerm()` is asserted against
 * separately, and that assertion is the one that matters: it says the route
 * reads the clock rather than a stored value, which a test taking both its
 * expectation and the route's answer from the same constant could not say.
 */

const DEPT_COMPUTER = '05';

/** The subject the seed opens, and the only one any of this teaches. */
const SUBJECT_CODE = '01076105';

let api;
before(async () => {
  api = await startApi('teaching', { withSeed: true });
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

const dashboard = (cookie) => request(api.app).get('/api/teaching/sections').set('Cookie', cookie);

const section = (cookie, id) =>
  request(api.app)
    .get('/api/teaching/sections/' + id)
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

test('the term the dashboard reports is the calendar term, not a stored one', async () => {
  const cookie = await signInAs('U_TEACH');
  const listed = await dashboard(cookie);

  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.term, currentTerm());
});

test('a teacher sees the sections they teach this term, and not last year and this', async () => {
  // The first criterion. U_TEACH teaches one section in each of two academic
  // years, so a route that ignored the term would answer two.
  const cookie = await signInAs('U_TEACH');
  const listed = await dashboard(cookie);

  assert.equal(listed.status, 200);
  assert.equal(listed.body.sections.length, 1);

  const [only] = listed.body.sections;
  assert.equal(only.section_id, await seededSection('U_TEACH', CURRENT_YEAR));
  assert.equal(only.academic_year, CURRENT_YEAR);
  assert.equal(only.semester, SEMESTER);
  // What the dashboard puts on the card, so that a screen listing sections does
  // not have to fetch the subject for each one.
  assert.equal(only.subject_id, SUBJECT_CODE);
  assert.ok(only.subject_name_th);
  // Of the section, not of the Offering. The seed enrols 113 students in the
  // current cohort and splits them across two sections, so 113 here would be a
  // count that had climbed a join it should not have - the number the Offering
  // carries, reported on one of its classes. That 113 belongs to
  // `offerings.test.js`, and the difference between the two is the point.
  assert.equal(only.student_count, 57);
});

test('the section of the year before is still reachable one at a time', async () => {
  // Deliberately not restricted to the current term: the register says the
  // person taught it, and the dashboard's listing rule is not an authorisation
  // rule. A link to last year's section opens.
  const cookie = await signInAs('U_TEACH');
  const last = await seededSection('U_TEACH', PRIOR_YEAR);

  const opened = await section(cookie, last);
  assert.equal(opened.status, 200);
  assert.equal(opened.body.section.academic_year, PRIOR_YEAR);
});

test('a teacher assigned to nothing is answered with an empty list and the term', async () => {
  // The second criterion's server half. Not an error and not a 404: the account
  // is a teacher, the question is a fair one, and the answer is none - which
  // the screen turns into a sentence naming the term it looked in.
  const cookie = await signInAs('U_TEACH2');
  const listed = await dashboard(cookie);

  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.sections, []);
  assert.deepEqual(listed.body.term, currentTerm());
});

test('a section the caller does not teach is refused, and refused as not found', async () => {
  // The sixth criterion, proved with the teacher who teaches nothing: every
  // section in the system is one they do not teach, so a route that checked the
  // department - which they are in - rather than the register would answer 200.
  const cookie = await signInAs('U_TEACH2');
  const someoneElses = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await section(cookie, someoneElses);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.sectionNotFound);
});

test('a colleague teaching the next section along of the same subject is still refused', async () => {
  // U_MULTI teaches section 2 of the offering U_TEACH teaches section 1 of.
  // Same subject, same term, same department, different section - and the
  // register is the only thing that separates them.
  const cookie = await signInAs('U_TEACH');
  const theirs = await seededSection('U_MULTI', CURRENT_YEAR);

  assert.equal((await section(cookie, theirs)).status, 404);
});

test('an id that is not a number is refused rather than raised', async () => {
  const cookie = await signInAs('U_TEACH');
  const refused = await section(cookie, 'not-a-section');

  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.sectionNotFound);
});

test('the account holding two roles has to be acting as the teacher', async () => {
  // The seventh criterion, and the reason the switch is worth anything. U_MULTI
  // holds PROG_MANAGER and TEACHER; the senior of the two is what the shell
  // starts in, and it is not this screen's role.
  const cookie = await signInAs('U_MULTI');
  const asCommittee = await dashboard(cookie);
  assert.equal(asCommittee.status, 403);
  assert.equal(asCommittee.body.message, REFUSALS.forbidden);

  const asTeacher = await actingAsTeacher(cookie);
  const listed = await dashboard(asTeacher);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.sections.length, 1);
  assert.equal(listed.body.sections[0].section_id, await seededSection('U_MULTI', CURRENT_YEAR));
});

test('a role that is not a teaching one does not reach these routes at all', async () => {
  // The committee opens the term and assigns the teaching; it does not stand in
  // a classroom. Neither does the system administrator, whose reach over
  // accounts stops well short of this.
  for (const alias of ['U_COM', 'U_ADMIN', 'U_DEPT', 'U_FAC']) {
    const cookie = await signInAs(alias);
    const refused = await dashboard(cookie);
    assert.equal(refused.status, 403, alias + ' should not reach the teacher dashboard');
    assert.equal(refused.body.message, REFUSALS.forbidden);
  }
});

test('an anonymous caller is refused before any of this is considered', async () => {
  const refused = await request(api.app).get('/api/teaching/sections');
  assert.equal(refused.status, 401);
  assert.equal(refused.body.reason, 'anonymous');
});

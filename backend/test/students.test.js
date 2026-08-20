'use strict';

/**
 * Ticket #17: the central student register.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real.
 *
 * This suite leans on the seed harder than the others do, because the seed
 * already *is* the thing the first criterion asks about — 173 students across
 * two cohorts, all of them in department `05` and หลักสูตร `0501`, which is
 * more than ten and so pages without anything being built to make it. What the
 * seed cannot supply is a second หลักสูตร with anybody in it, and that gap is
 * the whole point of the filter tests: with every seeded student in `0501`,
 * `?program_id=0501` returns all 173 whether or not the route reads the
 * parameter at all. So the tests that mean to prove a filter first put a
 * student in `0503` and then assert the `0501` page does *not* contain them.
 * The same trap caught #16 and the answer is the same one.
 *
 * Codes are eight digits because the derivation depends on it. The seed holds
 * `66…` and `65…`; everything made here is `61…`–`64…`, so nothing a test
 * creates can collide with a cohort or with another test.
 *
 * Two criteria are asserted somewhere other than in this file. *"The import
 * template downloads from the screen"* is half a claim about a button, and
 * docs/06 settles that frontend components are not unit-tested, so the click is
 * on the hand-worked checklist in docs/acceptance/17 and the file it downloads
 * is asserted here. *"A student added here is available for Section
 * enrolment"* has no endpoint to go through — enrolment is #25 and is blocked
 * by this ticket — so the proof sits at the foreign key, which is where the
 * claim actually lives.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, DEPARTMENTS, PROGRAMS, COHORTS } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * The template's columns, written out here rather than imported from the route.
 *
 * A test that compared the served header against the constant the route built
 * it from would pass whatever that constant said. Naming the four columns
 * independently is what makes the third criterion an assertion instead of a
 * tautology — and it is what records that there is no `department_id` column
 * and no `admission_year` one, both of which the server derives.
 */
const COLUMNS = ['student_id', 'first_name_th', 'last_name_th', 'program_id'];

const [DEPT_COMPUTER, DEPT_CIVIL] = DEPARTMENTS.map((department) => department.id);
const [PROG_MAIN, PROG_INTL] = PROGRAMS.map((program) => program.id);

/** How many students the seed leaves in the register before any test runs. */
const SEEDED = COHORTS.reduce((total, cohort) => total + cohort.students, 0);

let api;
before(async () => {
  api = await startApi('students', { withSeed: true });
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

const list = (cookie, query = '') =>
  request(api.app).get(`/api/students${query}`).set('Cookie', cookie);

const read = (cookie, id) => request(api.app).get(`/api/students/${id}`).set('Cookie', cookie);

const create = (cookie, body) =>
  request(api.app).post('/api/students').set('Cookie', cookie).send(body);

const template = (cookie) =>
  request(api.app).get('/api/students/import-template').set('Cookie', cookie);

const pickable = (cookie) =>
  request(api.app).get('/api/students/programs').set('Cookie', cookie);

const namable = (cookie) =>
  request(api.app).get('/api/students/departments').set('Cookie', cookie);

const importCsv = (cookie, csv) =>
  request(api.app)
    .post('/api/students/import')
    .set('Cookie', cookie)
    .set('Content-Type', 'text/csv')
    .send(csv);

/**
 * A CSV from rows given as objects, with the columns the caller names.
 *
 * The columns are a parameter and not fixed to `COLUMNS` because the seventh
 * criterion needs a file carrying a column the template does not have, in order
 * to prove it is ignored.
 */
const csvOf = (rows, columns = COLUMNS) =>
  [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => row[column] ?? '').join(',')),
  ].join('\r\n');

/** The fields every well-formed row needs, so a test only writes what it means. */
const draftOf = (id, extra = {}) => ({
  student_id: id,
  first_name_th: `นักศึกษา${id}`,
  last_name_th: 'ทดสอบ',
  program_id: PROG_MAIN,
  ...extra,
});

const idsOf = (body) => body.students.map((student) => student.student_id);

test('the register pages, and both filters narrow it inside the reach', async () => {
  // The first criterion and the eighth together. The seeded cohorts are what
  // makes the paging real - 173 rows is not a fixture anybody built to suit
  // this test - and the student put into 0503 first is what makes the two
  // filters mean anything, because every other student in the table would
  // answer the same to both.
  const cookie = await signInAs('U_DEPT');

  const only0503 = '63030001';
  assert.equal((await create(cookie, draftOf(only0503, { program_id: PROG_INTL }))).status, 201);

  const first = await list(cookie);
  assert.equal(first.status, 200);
  assert.equal(first.body.total, SEEDED + 1);
  assert.equal(first.body.page, 1);
  assert.equal(first.body.per_page, 10);
  assert.equal(first.body.students.length, 10);

  const second = await list(cookie, '?page=2');
  assert.equal(second.body.page, 2);
  assert.equal(second.body.students.length, 10);
  for (const id of idsOf(second.body)) assert.ok(!idsOf(first.body).includes(id));

  // The หลักสูตร filter: every seeded student is in 0501, so the discriminating
  // assertion is that the one student who is not stays out of it.
  const main = await list(cookie, `?program_id=${PROG_MAIN}&per_page=100`);
  assert.equal(main.body.total, SEEDED);
  assert.ok(!idsOf(main.body).includes(only0503));

  const intl = await list(cookie, `?program_id=${PROG_INTL}`);
  assert.equal(intl.body.total, 1);
  assert.deepEqual(idsOf(intl.body), [only0503]);

  // The department filter, and the reach around it. `05` is this
  // administrator's own and holds everything; `01` is a department that exists,
  // that they do not administer, and that the filter must not widen the answer
  // to - an empty page here is a filter refusing, not an empty table, because
  // the caller has just put a student of their own into the register.
  const own = await list(cookie, `?department_id=${DEPT_COMPUTER}`);
  assert.equal(own.body.total, SEEDED + 1);

  const other = await list(cookie, `?department_id=${DEPT_CIVIL}`);
  assert.equal(other.status, 200);
  assert.equal(other.body.total, 0);
  assert.deepEqual(other.body.students, []);
});

test('an administrator adds a student individually and it appears in the list', async () => {
  // The second criterion. The department is not in the body: the server takes
  // it off the หลักสูตร, which is what the first assertion after the 201 is.
  const cookie = await signInAs('U_DEPT');
  // This year's intake, so the list's newest-first order puts them on the first
  // page - which is the half of the criterion that says "and it appears in the
  // list" rather than "and it is somewhere in the table".
  const id = '68010001';

  const added = await create(cookie, draftOf(id));
  assert.equal(added.status, 201, added.body.message);
  assert.equal(added.body.student.student_id, id);
  assert.equal(added.body.student.department_id, DEPT_COMPUTER);
  assert.equal(added.body.student.program_id, PROG_MAIN);
  assert.equal(added.body.student.full_name_th, `นักศึกษา${id} ทดสอบ`);
  assert.equal(added.body.student.status, 'active');

  assert.equal((await read(cookie, id)).body.student.student_id, id);

  const page = await list(cookie);
  assert.equal(idsOf(page.body)[0], id);

  // Typing a code the register already holds is refused rather than silently
  // overwriting somebody: only the import treats a repeat as a correction.
  const again = await create(cookie, draftOf(id, { first_name_th: 'ทับ' }));
  assert.equal(again.status, 409);
  assert.equal(again.body.message, REFUSALS.duplicateStudentId);
  assert.equal((await read(cookie, id)).body.student.first_name_th, `นักศึกษา${id}`);
});

test('the admission year is derived from the code and cannot be sent', async () => {
  // The seventh criterion, which is only provable by sending the field and
  // watching it be ignored. Without this the criterion would pass against a
  // route that read `req.body.admission_year`, because every code a test writes
  // agrees with the year it would have derived.
  const cookie = await signInAs('U_DEPT');

  const typed = await create(cookie, draftOf('62010001', { admission_year: '2599' }));
  assert.equal(typed.status, 201, typed.body.message);
  assert.equal(typed.body.student.admission_year, '2562');

  const imported = await importCsv(
    cookie,
    csvOf([draftOf('61020001', { admission_year: '2599' })], [...COLUMNS, 'admission_year']),
  );
  assert.equal(imported.status, 201, imported.body.message);
  assert.equal(imported.body.students[0].admission_year, '2561');

  // And the seeded cohorts, which nobody in this suite wrote: the register was
  // filled by the same rule.
  assert.equal((await read(cookie, '66010001')).body.student.admission_year, '2566');
  assert.equal((await read(cookie, '65010001')).body.student.admission_year, '2565');
});

test('the template downloads and matches what the importer accepts', async () => {
  // The third criterion. The round trip is the second half of it: a template
  // whose header the importer would refuse is not a template.
  const cookie = await signInAs('U_DEPT');

  const response = await template(cookie);

  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/csv/);
  assert.match(
    response.headers['content-disposition'],
    /attachment; filename="students-template\.csv"/,
  );
  const [header] = response.text.replace(/^﻿/, '').split('\r\n');
  assert.deepEqual(header.split(','), COLUMNS);

  const before = (await list(cookie)).body.total;
  const accepted = await importCsv(cookie, response.text);
  assert.equal(accepted.status, 201, accepted.body.message);
  // The example row names a student the seed already holds, so accepting it
  // adds nobody - which is the sixth criterion arriving from an angle nobody
  // arranged.
  assert.equal((await list(cookie)).body.total, before);
});

test('a valid spreadsheet imports every student in it', async () => {
  // The fourth criterion.
  const cookie = await signInAs('U_DEPT');
  const ids = ['64020001', '64020002', '64020003'];

  const response = await importCsv(cookie, csvOf(ids.map((id) => draftOf(id))));

  assert.equal(response.status, 201, response.body.message);
  assert.equal(response.body.created, 3);
  assert.deepEqual(response.body.errors, []);

  for (const id of ids) {
    const stored = await read(cookie, id);
    assert.equal(stored.status, 200);
    assert.equal(stored.body.student.department_id, DEPT_COMPUTER);
    assert.equal(stored.body.student.admission_year, '2564');
  }
});

test('a spreadsheet with bad rows reports every one of them and applies nothing', async () => {
  // The fifth criterion. Four different ways of being wrong, on four known
  // lines, with two good rows around them - and the good rows are what proves
  // "applies nothing", because a partial apply would leave them behind.
  const cookie = await signInAs('U_DEPT');

  const response = await importCsv(
    cookie,
    csvOf([
      draftOf('64030001'),
      draftOf('64O30002'), // a letter O where a zero belongs
      draftOf('64030003', { last_name_th: '' }),
      draftOf('64030004', { program_id: '9999' }),
      draftOf('64030001'), // the same code as line 2
      draftOf('64030005'),
    ]),
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importRejected);
  assert.equal(response.body.created, 0);
  assert.deepEqual(
    response.body.errors,
    [
      { line: 3, message: REFUSALS.invalidStudent },
      { line: 4, message: REFUSALS.invalidStudent },
      { line: 5, message: REFUSALS.studentProgramNotYours },
      { line: 6, message: `${REFUSALS.repeatedStudentId} (ซ้ำกับบรรทัดที่ 2)` },
    ],
    JSON.stringify(response.body.errors),
  );

  for (const id of ['64030001', '64030005']) {
    assert.equal((await read(cookie, id)).status, 404);
  }
});

test('importing a code the register already holds updates it rather than duplicating', async () => {
  // The sixth criterion. The count either side is what tells an update from an
  // insert, and the changed name is what tells an update from doing nothing.
  const cookie = await signInAs('U_DEPT');
  const id = '63040001';

  assert.equal((await create(cookie, draftOf(id))).status, 201);
  const before = (await list(cookie)).body.total;

  const again = await importCsv(
    cookie,
    csvOf([draftOf(id, { last_name_th: 'แก้ไขแล้ว', program_id: PROG_INTL })]),
  );

  assert.equal(again.status, 201, again.body.message);
  assert.equal(again.body.created, 1);
  assert.equal((await list(cookie)).body.total, before);

  const stored = await read(cookie, id);
  assert.equal(stored.body.student.last_name_th, 'แก้ไขแล้ว');
  assert.equal(stored.body.student.program_id, PROG_INTL);
});

test('a student in another department is neither readable nor overwritable', async () => {
  // The eighth criterion, from the side the list cannot show. A code held
  // outside the reach must not be an opening: the หลักสูตร named by the request
  // is this caller's, so the programme check passes, and without a second check
  // on the row already there the upsert would move somebody else's student into
  // department 05.
  const cookie = await signInAs('U_DEPT');
  const id = '61050001';

  await api.pool.query(
    `INSERT INTO programs (program_id, program_name_th, program_name_en, department_id, year)
     VALUES ('0101', 'วิศวกรรมโยธา', 'Civil Engineering', $1, '2564')`,
    [DEPT_CIVIL],
  );
  await api.pool.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year)
     VALUES ($1, 'ของ', 'ภาควิชาอื่น', $2, '0101', '2561')`,
    [id, DEPT_CIVIL],
  );

  assert.equal((await read(cookie, id)).status, 404);
  assert.equal((await read(cookie, id)).body.message, REFUSALS.studentNotFound);

  const typed = await create(cookie, draftOf(id));
  assert.equal(typed.status, 403);
  assert.equal(typed.body.message, REFUSALS.studentNotYours);

  const imported = await importCsv(cookie, csvOf([draftOf(id)]));
  assert.equal(imported.status, 400);
  assert.deepEqual(imported.body.errors, [{ line: 2, message: REFUSALS.studentNotYours }]);

  const { rows } = await api.pool.query(
    'SELECT department_id, program_id, first_name_th FROM student WHERE student_id = $1',
    [id],
  );
  assert.deepEqual(rows[0], {
    department_id: DEPT_CIVIL,
    program_id: '0101',
    first_name_th: 'ของ',
  });
});

test('an administrator of another department sees and writes nothing here', async () => {
  // The eighth criterion from the other side: the same endpoints, a real
  // account, and every answer either empty or refused.
  const cookie = await signInAs('U_DEPT2');

  const theirs = await list(cookie);
  assert.equal(theirs.status, 200);
  assert.equal(theirs.body.total, 1); // the 01 student the previous test made
  assert.deepEqual(idsOf(theirs.body), ['61050001']);

  assert.equal((await read(cookie, '66010001')).status, 404);

  const typed = await create(cookie, draftOf('62060001'));
  assert.equal(typed.status, 403);
  assert.equal(typed.body.message, REFUSALS.studentProgramNotYours);

  const imported = await importCsv(cookie, csvOf([draftOf('62060002')]));
  assert.equal(imported.status, 400);
  assert.deepEqual(imported.body.errors, [
    { line: 2, message: REFUSALS.studentProgramNotYours },
  ]);

  // The picker is drawn from the reach too, or it would offer a หลักสูตร every
  // write behind it is going to refuse.
  const picker = await pickable(cookie);
  assert.equal(picker.status, 200);
  assert.deepEqual(
    picker.body.programs.map((program) => program.program_id),
    ['0101'],
  );

  const named = await namable(cookie);
  assert.equal(named.status, 200);
  assert.deepEqual(
    named.body.departments.map((department) => department.department_id),
    [DEPT_CIVIL],
  );

  const admin = await signInAs('U_DEPT');
  assert.equal((await read(admin, '62060001')).status, 404);
  assert.equal((await read(admin, '62060002')).status, 404);
});

/**
 * Every endpoint walked as one account, asserting the server refuses all seven,
 * and then read back from a maintainer's session to show that nothing the
 * refused account asked for happened.
 *
 * Three roles reach the register in docs/05 A07 as delivered and one reaches it
 * now, so three of these four walks are a change being recorded rather than a
 * rule being restated. `prefix` keeps the codes the attempts create apart.
 */
const refusedEverything = async (account, prefix) => {
  const cookie = await signInAs(account);
  const created = `${prefix}070001`;
  const imported = `${prefix}070002`;

  const answers = await Promise.all([
    list(cookie),
    read(cookie, '66010001'),
    create(cookie, draftOf(created)),
    template(cookie),
    pickable(cookie),
    namable(cookie),
    importCsv(cookie, csvOf([draftOf(imported)])),
  ]);

  for (const answer of answers) {
    assert.equal(answer.status, 403, `${answer.request.method} ${answer.request.url}`);
    assert.equal(answer.body.message, REFUSALS.forbidden);
  }

  const maintainer = await signInAs('U_DEPT');
  assert.equal((await read(maintainer, created)).status, 404);
  assert.equal((await read(maintainer, imported)).status, 404);
};

test('the faculty administrator is refused the register', async () => {
  // The advisor settled #17 the way #61 settled the catalogue: the register is
  // departmental master data. docs/05 A07 named this role and no longer does.
  await refusedEverything('U_FAC', '61');
});

test('the programme committee is refused the register', async () => {
  // A08 as delivered reached this screen, which is the larger half of the same
  // ruling: a committee owns what a หลักสูตร teaches, not who is admitted to it.
  await refusedEverything('U_COM', '62');
});

test('a teacher is refused the register', async () => {
  // A teacher enrols students into their own Section (#25) and reads the
  // central register never.
  await refusedEverything('U_TEACH', '63');
});

test('the Central Admin is refused the register', async () => {
  // ADR-0002: the global grant administers accounts and organisation, not
  // curriculum data. MAINTAINERS does not list `FULL_ADMIN`.
  await refusedEverything('U_ADMIN', '64');
});

test('a student added here is available for Section enrolment', async () => {
  // The ninth criterion. There is no enrolment endpoint to go through - #25 is
  // blocked by this ticket - so the claim is proved where it actually lives:
  // `student_course.student_id` is a foreign key onto `student`, and a code the
  // register has not heard of cannot be enrolled at all. The test therefore
  // creates the student through the API, reads them back through the API, and
  // only then enrols them, so the row under test is one this screen made.
  const cookie = await signInAs('U_DEPT');
  const id = '64080001';

  assert.equal((await create(cookie, draftOf(id))).status, 201);
  assert.equal((await read(cookie, id)).status, 200);

  const { rows: sections } = await api.pool.query(
    'SELECT section_id FROM course_sections ORDER BY section_id ASC LIMIT 1',
  );
  const { section_id: sectionId } = sections[0];

  await api.pool.query('INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)', [
    id,
    sectionId,
  ]);

  const { rows: enrolled } = await api.pool.query(
    `SELECT s.student_id, s.full_name_th
       FROM student_course sc JOIN student s USING (student_id)
      WHERE sc.section_id = $1 AND sc.student_id = $2`,
    [sectionId, id],
  );
  assert.equal(enrolled.length, 1);
  assert.equal(enrolled[0].full_name_th, `นักศึกษา${id} ทดสอบ`);

  // And the other half of the same guarantee: a code the register has never
  // heard of cannot be enrolled, which is why the register has to exist first.
  await assert.rejects(
    api.pool.query('INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)', [
      '64089999',
      sectionId,
    ]),
    (error) => error.code === '23503',
  );
});

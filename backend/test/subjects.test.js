'use strict';

/**
 * Ticket #16: the subject catalogue.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real.
 *
 * The eighth criterion names two of the tests below by hand - the duplicate
 * code and the cross-department refusal - and both are written against the seed
 * as it stands rather than against fixtures made to suit them: `01076105`
 * really is referenced by a Program Subject, and U_DEPT2 really does administer
 * a different department. Every test that needs a subject it may destroy makes
 * its own, with codes no other test names.
 *
 * The account nearly every test signs in as is U_DEPT, who administers `05` -
 * the department the seeded subject sits in. It was the faculty administrator
 * until #61 settled that a catalogue belongs to the department that teaches
 * what is in it; what that role reaches here now is one test, and it is a
 * refusal.
 *
 * Two criteria are asserted somewhere other than in this file and it is worth
 * saying where. *"Removal asks for confirmation first"* is a dialog, and
 * docs/06 settles that frontend components are not unit-tested, so it is on the
 * hand-worked checklist in docs/acceptance/16. *"Import works through the
 * shared module"* is a claim about four callers, and three of them are
 * accounts, departments and programmes - carried by their suites, which this
 * ticket did not change.
 *
 * Codes are eight characters wide because the column is: `T` and seven digits
 * for the subjects a test makes, so they sort clear of the seeded `010761xx`.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, DEPARTMENTS, SUBJECT } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * The template's columns, written out here rather than imported from the route.
 *
 * A test that compared the served header against the constant the route built
 * it from would pass whatever that constant said. Naming the seven columns
 * independently is what makes the sixth criterion's template an assertion
 * instead of a tautology.
 */
const COLUMNS = [
  'subject_id',
  'subject_name_th',
  'subject_name_en',
  'credits',
  'department_id',
  'description_th',
  'description_en',
];

const [DEPT_COMPUTER, DEPT_CIVIL] = DEPARTMENTS.map((department) => department.id);

let api;
before(async () => {
  api = await startApi('subjects', { withSeed: true });
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
  request(api.app).get(`/api/subjects${query}`).set('Cookie', cookie);

const read = (cookie, id) => request(api.app).get(`/api/subjects/${id}`).set('Cookie', cookie);

const create = (cookie, body) =>
  request(api.app).post('/api/subjects').set('Cookie', cookie).send(body);

const edit = (cookie, id, body) =>
  request(api.app).put(`/api/subjects/${id}`).set('Cookie', cookie).send(body);

const remove = (cookie, id) =>
  request(api.app).delete(`/api/subjects/${id}`).set('Cookie', cookie);

const template = (cookie) =>
  request(api.app).get('/api/subjects/import-template').set('Cookie', cookie);

const pickable = (cookie) =>
  request(api.app).get('/api/subjects/departments').set('Cookie', cookie);

const importCsv = (cookie, csv) =>
  request(api.app)
    .post('/api/subjects/import')
    .set('Cookie', cookie)
    .set('Content-Type', 'text/csv')
    .send(csv);

/** A CSV whose header is the template's, from rows given as objects. */
const csvOf = (rows) =>
  [
    COLUMNS.join(','),
    ...rows.map((row) => COLUMNS.map((column) => row[column] ?? '').join(',')),
  ].join('\r\n');

/** The fields every well-formed row needs, so a test only writes what it means. */
const draftOf = (id, extra = {}) => ({
  subject_id: id,
  subject_name_th: `รายวิชา ${id}`,
  subject_name_en: `Subject ${id}`,
  credits: '3',
  department_id: DEPT_COMPUTER,
  ...extra,
});

test('an administrator adds, edits and removes a subject', async () => {
  // The first criterion, end to end, on a subject this test owns and nothing
  // else references - so the removal really is a deletion. Every field the
  // ticket names is here: code, credits, both names and description.
  const cookie = await signInAs('U_DEPT');

  const added = await create(
    cookie,
    draftOf('T0000001', {
      subject_name_th: 'ปฏิบัติการวิศวกรรมซอฟต์แวร์',
      subject_name_en: 'SOFTWARE ENGINEERING LABORATORY',
      credits: '1',
      description_th: 'ปฏิบัติการตามหัวข้อในวิชาบรรยาย',
      description_en: 'Laboratory work following the lecture course',
    }),
  );
  assert.equal(added.status, 201, added.body.message);
  assert.equal(added.body.subject.subject_name_th, 'ปฏิบัติการวิศวกรรมซอฟต์แวร์');
  assert.equal(added.body.subject.subject_name_en, 'SOFTWARE ENGINEERING LABORATORY');
  assert.equal(added.body.subject.credits, 1);
  assert.equal(added.body.subject.description_th, 'ปฏิบัติการตามหัวข้อในวิชาบรรยาย');
  assert.equal(added.body.subject.department_id, DEPT_COMPUTER);
  assert.equal(added.body.subject.is_active, true);

  const edited = await edit(cookie, 'T0000001', {
    subject_name_th: 'ปฏิบัติการวิศวกรรมซอฟต์แวร์ 1',
    subject_name_en: 'SOFTWARE ENGINEERING LABORATORY I',
    credits: '2',
    description_th: 'ปฏิบัติการครึ่งแรกของรายวิชา',
  });
  assert.equal(edited.status, 200, edited.body.message);
  assert.equal(edited.body.subject.subject_name_th, 'ปฏิบัติการวิศวกรรมซอฟต์แวร์ 1');
  assert.equal(edited.body.subject.credits, 2);
  // Not sent, so cleared - a PUT replaces, and the form sends every box.
  assert.equal(edited.body.subject.description_en, null);
  // Except the department, which is where the record lives rather than a field.
  assert.equal(edited.body.subject.department_id, DEPT_COMPUTER);

  const removed = await remove(cookie, 'T0000001');
  assert.equal(removed.status, 204);
  assert.equal((await read(cookie, 'T0000001')).status, 404);
});

test('a duplicate code is refused rather than overwriting', async () => {
  // The second criterion and half of the eighth, on the seeded subject.
  const cookie = await signInAs('U_DEPT');

  const clash = await create(cookie, draftOf(SUBJECT.id, { subject_name_th: 'อะไรก็ตาม' }));

  assert.equal(clash.status, 409);
  assert.equal(clash.body.message, REFUSALS.duplicateSubjectId);
  assert.equal((await read(cookie, SUBJECT.id)).body.subject.subject_name_th, SUBJECT.th);
});

test('a faculty administrator is refused the catalogue entirely', async () => {
  // #61, and the answer to the question #16 left open. The catalogue is the
  // department's own: what a department teaches is its content, and content a
  // department owns is content that department maintains. So the faculty
  // administrator is not a maintainer of it - and is refused the screen at the
  // server rather than merely left out of its menu, in the shape #14 refuses a
  // department administrator the faculty's own structure.
  //
  // Reading is refused with the writing, which is the part the ruling turned
  // on. docs/06 story 31 says only "an administrator" where stories 25 and 27
  // name the Faculty Admin by hand, and the vagueness was settled the narrow
  // way: not this screen at all.
  const cookie = await signInAs('U_FAC');

  const answers = await Promise.all([
    list(cookie),
    read(cookie, SUBJECT.id),
    create(cookie, draftOf('F0500001')),
    edit(cookie, SUBJECT.id, { subject_name_th: 'ไม่ควรเกิด' }),
    remove(cookie, SUBJECT.id),
    template(cookie),
    pickable(cookie),
    importCsv(cookie, csvOf([draftOf('F0500002')])),
  ]);

  for (const answer of answers) {
    assert.equal(answer.status, 403, `${answer.request.method} ${answer.request.url}`);
    assert.equal(answer.body.message, REFUSALS.forbidden);
  }

  // And nothing they asked for happened.
  const admin = await signInAs('U_DEPT');
  assert.equal((await read(admin, 'F0500001')).status, 404);
  assert.equal((await read(admin, 'F0500002')).status, 404);
  const untouched = await read(admin, SUBJECT.id);
  assert.equal(untouched.body.subject.subject_name_th, SUBJECT.th);
  assert.equal(untouched.body.subject.is_active, true);
});

test('a department administrator is confined to their own department by the server', async () => {
  // The third criterion's second half and the rest of the eighth, stated as the
  // ticket writes it: enforced at the server, not by hiding a menu. U_DEPT2
  // administers `01` and holds a real administrator's session; `01076105` is
  // in `05`.
  const cookie = await signInAs('U_DEPT2');

  // Reading somebody else's subject answers as though it were not there, so the
  // route cannot be used to enumerate another department's catalogue.
  assert.equal((await read(cookie, SUBJECT.id)).status, 404);
  assert.equal((await edit(cookie, SUBJECT.id, { subject_name_th: 'ไม่ควรเกิด' })).status, 404);
  assert.equal((await remove(cookie, SUBJECT.id)).status, 404);

  // Creating one under a department they do not hold is refused in as many
  // words, because the department they named is not a secret to them.
  const elsewhere = await create(cookie, draftOf('T0500001'));
  assert.equal(elsewhere.status, 403);
  assert.equal(elsewhere.body.message, REFUSALS.subjectDepartmentNotYours);

  // Their own department is theirs, so the refusal above is about the scope and
  // not about the role.
  const own = await create(cookie, draftOf('T0100002', { department_id: DEPT_CIVIL }));
  assert.equal(own.status, 201, own.body.message);

  // And the list they see is their own department's, not the faculty's.
  const seen = await list(cookie, '?per_page=100');
  assert.deepEqual(
    seen.body.subjects.map((row) => row.subject_id),
    ['T0100002'],
  );

  // Nothing they were refused happened - looked at by the administrator of the
  // department they reached into, who since #61 is the only account that can.
  const neighbour = await signInAs('U_DEPT');
  assert.equal((await read(neighbour, 'T0500001')).status, 404);
  assert.equal((await read(neighbour, SUBJECT.id)).body.subject.subject_name_th, SUBJECT.th);
  // And their own is theirs to clear away.
  assert.equal((await remove(cookie, 'T0100002')).status, 204);
});

test('a department administrator cannot move a subject out of their reach', async () => {
  // The other end of the third criterion. Editing names a department too, and a
  // department administrator who could name any of them would have a way of
  // pushing a record out of their own reach - or of adopting one that is not
  // theirs.
  const cookie = await signInAs('U_DEPT2');
  assert.equal(
    (await create(cookie, draftOf('T0100003', { department_id: DEPT_CIVIL }))).status,
    201,
  );

  const moved = await edit(cookie, 'T0100003', {
    subject_name_th: 'รายวิชา T0100003',
    subject_name_en: 'Subject T0100003',
    credits: '3',
    department_id: DEPT_COMPUTER,
  });

  assert.equal(moved.status, 403);
  assert.equal(moved.body.message, REFUSALS.subjectDepartmentNotYours);
  assert.equal((await read(cookie, 'T0100003')).body.subject.department_id, DEPT_CIVIL);

  assert.equal((await remove(cookie, 'T0100003')).status, 204);
});

test('a referenced subject is deactivated instead of deleted', async () => {
  // The fourth criterion. `01076105` is the seeded subject and a Program
  // Subject points at it - and, through that pair, an Offering, its CLOs and a
  // year of marks. Every one of those references is ON DELETE RESTRICT, and the
  // answer is not a refusal: the row is switched off and the caller is told so.
  const cookie = await signInAs('U_DEPT');

  const removed = await remove(cookie, SUBJECT.id);

  assert.equal(removed.status, 200);
  assert.equal(removed.body.deactivated, true);
  assert.equal(removed.body.subject.is_active, false);

  // It is still there, still named, still readable - which is what makes the
  // marks that point at it readable too.
  const still = await read(cookie, SUBJECT.id);
  assert.equal(still.status, 200);
  assert.equal(still.body.subject.subject_name_th, SUBJECT.th);
  assert.equal(still.body.subject.is_active, false);

  // And it has dropped out of the list a screen would pick a subject from,
  // while staying on the management list it is switched back on from.
  const choosable = await list(cookie, '?active=1&per_page=100');
  assert.ok(!choosable.body.subjects.some((row) => row.subject_id === SUBJECT.id));
  const managed = await list(cookie, '?per_page=100');
  assert.ok(managed.body.subjects.some((row) => row.subject_id === SUBJECT.id));

  // Put it back: later tests read this subject and the seed says it is on.
  const on = await edit(cookie, SUBJECT.id, {
    subject_name_th: SUBJECT.th,
    subject_name_en: SUBJECT.en,
    credits: String(SUBJECT.credits),
    is_active: true,
  });
  assert.equal(on.body.subject.is_active, true);
  assert.equal(on.body.subject.credits, SUBJECT.credits);
});

test('a subject with no name, no credits, no department or too long a code is refused', async () => {
  const cookie = await signInAs('U_DEPT');

  const cases = {
    // Both names are required: the column says NOT NULL and the ticket asks for
    // a subject with "both names".
    T9000001: { subject_name_th: '' },
    T9000002: { subject_name_en: '' },
    // Credits are a whole number. A blank box would otherwise reach a NOT NULL
    // column and come back as `unexpected`, and `3.5` is not a credit count
    // this registrar writes.
    T9000003: { credits: '' },
    T9000004: { credits: '3.5' },
    T9000005: { credits: 'สาม' },
    T9000006: { department_id: '' },
  };

  for (const [id, broken] of Object.entries(cases)) {
    const refused = await create(cookie, draftOf(id, broken));
    assert.equal(refused.status, 400, `${id} was not refused`);
    assert.equal(refused.body.message, REFUSALS.invalidSubject);
    assert.equal((await read(cookie, id)).status, 404);
  }

  // Nine characters is one more than the column holds, and is refused here
  // rather than by PostgreSQL - a 22001 would reach the caller as `unexpected`.
  const tooLong = await create(cookie, draftOf('T90000070'));
  assert.equal(tooLong.status, 400);
  assert.equal(tooLong.body.message, REFUSALS.invalidSubject);
});

test('the list paginates beyond ten rows, and the filter narrows within the reach', async () => {
  // The seventh criterion, both halves, as they read after #61: eleven subjects
  // in the one department this account administers, so there is a second page
  // to reach, and a filter that still applies - to the department in reach it
  // takes nothing away, and the department out of reach is the test below.
  const cookie = await signInAs('U_DEPT');
  const computer = Array.from(
    { length: 11 },
    (unused, index) => `Q00000${String(index).padStart(2, '0')}`,
  );

  for (const id of computer) {
    assert.equal((await create(cookie, draftOf(id))).status, 201, `could not seed ${id}`);
  }

  const first = await list(cookie);
  assert.equal(first.status, 200);
  assert.equal(first.body.subjects.length, 10);
  assert.equal(first.body.page, 1);
  assert.equal(first.body.per_page, 10);
  // The eleven, and the one the seed put there.
  assert.equal(first.body.total, computer.length + 1);

  const second = await list(cookie, '?page=2');
  assert.equal(second.body.page, 2);
  assert.equal(second.body.subjects.length, first.body.total - 10);
  const seen = new Set(first.body.subjects.map((row) => row.subject_id));
  assert.ok(second.body.subjects.every((row) => !seen.has(row.subject_id)));

  const filtered = await list(cookie, `?department_id=${DEPT_COMPUTER}&per_page=100`);
  assert.equal(filtered.body.total, first.body.total);

  for (const id of computer) assert.equal((await remove(cookie, id)).status, 204);
});

test('the department filter narrows the reach and never widens it', async () => {
  // A department administrator who asks for somebody else's department is shown
  // nothing rather than that department's catalogue: the filter is applied
  // inside the reach, not instead of it.
  const cookie = await signInAs('U_DEPT2');

  const answer = await list(cookie, `?department_id=${DEPT_COMPUTER}&per_page=100`);

  assert.equal(answer.status, 200);
  assert.equal(answer.body.total, 0);
  assert.deepEqual(answer.body.subjects, []);

  // A query string may name the same parameter twice, in which case Express
  // hands the route an array rather than a string. It has to be as harmless as
  // any other unusable filter - an empty page - rather than a system error or a
  // way of asking for two departments at once.
  const twice = await list(
    cookie,
    `?department_id=${DEPT_CIVIL}&department_id=${DEPT_COMPUTER}&per_page=100`,
  );
  assert.equal(twice.status, 200);
  assert.deepEqual(twice.body.subjects, []);
});

test('the form is offered exactly the departments the caller may use', async () => {
  // The picker the first criterion's department comes from, and the same list
  // the filter is drawn from. What it offers has to be what the server will
  // accept, or the form has a way of producing a refusal by being used as
  // intended - so the two are the same reach, asserted from both ends.
  //
  // Since #61 that reach is one department, and each administrator is offered
  // their own rather than the same one: the endpoint answers from the grant, so
  // two accounts asking the identical question are given different lists.
  const computer = await signInAs('U_DEPT');
  const one = await pickable(computer);
  assert.equal(one.status, 200);
  assert.deepEqual(
    one.body.departments.map((row) => row.department_id),
    [DEPT_COMPUTER],
  );

  const department = await signInAs('U_DEPT2');
  const own = await pickable(department);
  assert.deepEqual(
    own.body.departments.map((row) => row.department_id),
    [DEPT_CIVIL],
  );

  const allowed = await create(
    department,
    draftOf('T0100004', { department_id: own.body.departments[0].department_id }),
  );
  assert.equal(allowed.status, 201, allowed.body.message);
  assert.equal((await remove(department, 'T0100004')).status, 204);
});

test('the template downloads and matches what the importer accepts', async () => {
  // The sixth criterion, in both halves: the header is what this file names,
  // and the file it hands back is one the importer will take.
  const cookie = await signInAs('U_DEPT');

  const response = await template(cookie);

  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/csv/);
  assert.match(
    response.headers['content-disposition'],
    /attachment; filename="subjects-template\.csv"/,
  );
  const [header] = response.text.replace(/^﻿/, '').split('\r\n');
  assert.deepEqual(header.split(','), COLUMNS);

  const accepted = await importCsv(cookie, response.text);
  assert.equal(accepted.status, 201, accepted.body.message);
  for (const row of accepted.body.subjects) {
    assert.equal((await remove(cookie, row.subject_id)).status, 204);
  }
});

test('a valid spreadsheet imports every row', async () => {
  // The sixth criterion's first half. Both rows name the department the caller
  // administers, because since #61 that is the only value they may write; the
  // column is still carried and still checked, and the row that names somebody
  // else's department is the test two below.
  const cookie = await signInAs('U_DEPT');

  const response = await importCsv(
    cookie,
    csvOf([
      {
        subject_id: 'I0000001',
        subject_name_th: 'วิศวกรรมซอฟต์แวร์',
        subject_name_en: 'SOFTWARE ENGINEERING',
        credits: '3',
        department_id: DEPT_COMPUTER,
        description_th: 'กระบวนการพัฒนาซอฟต์แวร์',
      },
      {
        subject_id: 'I0000002',
        subject_name_th: 'ระบบฐานข้อมูล',
        subject_name_en: 'DATABASE SYSTEMS',
        credits: '3',
        department_id: DEPT_COMPUTER,
      },
    ]),
  );

  assert.equal(response.status, 201, response.body.message);
  assert.equal(response.body.created, 2);
  assert.deepEqual(response.body.errors, []);
  assert.deepEqual(
    response.body.subjects.map((row) => row.department_id),
    [DEPT_COMPUTER, DEPT_COMPUTER],
  );
  // The descriptions are optional, as the columns are.
  const sparse = (await read(cookie, 'I0000002')).body.subject;
  assert.equal(sparse.description_th, null);
  assert.equal(sparse.description_en, null);

  for (const id of ['I0000001', 'I0000002']) assert.equal((await remove(cookie, id)).status, 204);
});

test('a spreadsheet with bad rows reports each failure and applies nothing', async () => {
  // The sixth criterion's second half, and the reason the import is one
  // transaction: the person fixes their file and uploads it again rather than
  // working out which half of it took. Five different failures, one good row
  // among them, and the good row must not survive.
  const cookie = await signInAs('U_DEPT');

  const response = await importCsv(
    cookie,
    csvOf([
      draftOf('B0000001'), // line 2, and the good row
      draftOf('B0000002', { credits: 'สาม' }), // line 3
      draftOf('B0000003', { subject_name_en: '' }), // line 4
      draftOf('B0000004', { department_id: 'ZZ' }), // line 5
      draftOf('B0000001', { subject_name_th: 'ซ้ำ' }), // line 6
      draftOf(SUBJECT.id, { subject_name_th: 'ชนของเดิม' }), // line 7
    ]),
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importRejected);
  assert.equal(response.body.created, 0);

  assert.deepEqual(
    response.body.errors.map((error) => error.line),
    [3, 4, 5, 6, 7],
  );
  assert.equal(response.body.errors[0].message, REFUSALS.invalidSubject);
  assert.equal(response.body.errors[1].message, REFUSALS.invalidSubject);
  // The department check reaches every imported row, not only the typed one.
  assert.equal(response.body.errors[2].message, REFUSALS.subjectDepartmentNotYours);
  // The duplicate within the file names the line it collides with, which is
  // what the database's own 23505 could not have said.
  assert.equal(
    response.body.errors[3].message,
    `${REFUSALS.duplicateSubjectId} (ซ้ำกับบรรทัดที่ 2)`,
  );
  // A row colliding with the table, found at write time - and found *as well
  // as* the four above rather than instead of them.
  assert.equal(response.body.errors[4].message, REFUSALS.duplicateSubjectId);

  assert.equal((await read(cookie, 'B0000001')).status, 404);
});

test('an imported row cannot name a department the caller does not hold', async () => {
  // The third criterion again, on the import - because a rule the form enforces
  // and the spreadsheet does not is a rule with a way around it.
  const cookie = await signInAs('U_DEPT2');

  const response = await importCsv(cookie, csvOf([draftOf('X0500001')]));

  assert.equal(response.status, 400);
  assert.equal(response.body.errors[0].message, REFUSALS.subjectDepartmentNotYours);

  const admin = await signInAs('U_DEPT');
  assert.equal((await read(admin, 'X0500001')).status, 404);
});

test('an empty file is refused as such', async () => {
  const cookie = await signInAs('U_DEPT');

  const response = await importCsv(cookie, csvOf([]));

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importEmpty);
});

test('the Central Admin is refused by the server on every endpoint', async () => {
  // CONTEXT.md gives the Central Admin accounts and grants "and nothing else",
  // and ADR-0002 records the mechanism that keeps it true: curriculum routes do
  // not list `FULL_ADMIN`. A subject is curriculum.
  const cookie = await signInAs('U_ADMIN');

  const answers = await Promise.all([
    list(cookie),
    read(cookie, SUBJECT.id),
    create(cookie, draftOf('C0500001')),
    edit(cookie, SUBJECT.id, { subject_name_th: 'ไม่ควรเกิด' }),
    remove(cookie, SUBJECT.id),
    template(cookie),
    pickable(cookie),
    importCsv(cookie, csvOf([draftOf('C0500002')])),
  ]);

  for (const answer of answers) {
    assert.equal(answer.status, 403, `${answer.request.method} ${answer.request.url}`);
    assert.equal(answer.body.message, REFUSALS.forbidden);
  }

  const admin = await signInAs('U_DEPT');
  assert.equal((await read(admin, 'C0500001')).status, 404);
  assert.equal((await read(admin, 'C0500002')).status, 404);
  const untouched = await read(admin, SUBJECT.id);
  assert.equal(untouched.body.subject.subject_name_th, SUBJECT.th);
  assert.equal(untouched.body.subject.is_active, true);
});

test('a caller who has not signed in reaches none of it', async () => {
  const answers = await Promise.all([
    request(api.app).get('/api/subjects'),
    request(api.app).post('/api/subjects').send(draftOf('X0500002')),
    request(api.app).get('/api/subjects/import-template'),
  ]);

  for (const answer of answers) assert.equal(answer.status, 401);
});

test('a creation cannot ask for a subject that is already switched off', async () => {
  // Retiring one is the fourth criterion and happens on an edit or a removal.
  // Nothing in the ticket asks for a subject to be born inactive, so the field
  // is not read on a creation.
  const cookie = await signInAs('U_DEPT');
  const added = await create(cookie, draftOf('T0000002', { is_active: false }));

  assert.equal(added.status, 201);
  assert.equal(added.body.subject.is_active, true);
  assert.equal((await remove(cookie, 'T0000002')).status, 204);
});

test('a retired department keeps its subjects, and nothing new may be filed under it', async () => {
  // The fourth criterion read for the department a subject sits in: a record
  // that is switched off "stops appearing in selection lists". The selection
  // list is the form, not this response - the screen has no other way to name
  // the department a subject lives in - so the department is reported with its
  // `is_active` and the form is what declines to offer it.
  const cookie = await signInAs('U_DEPT2');
  await api.pool.query('UPDATE departments SET is_active = false WHERE department_id = $1', [
    DEPT_CIVIL,
  ]);

  try {
    const offered = await pickable(cookie);
    const retired = offered.body.departments.find((row) => row.department_id === DEPT_CIVIL);
    assert.ok(retired, 'the retired department is still named');
    assert.equal(retired.is_active, false);

    const refused = await create(cookie, draftOf('T0100005', { department_id: DEPT_CIVIL }));
    assert.equal(refused.status, 403);
    assert.equal(refused.body.message, REFUSALS.subjectDepartmentNotYours);

    // But a subject already filed under it is still editable, or retiring a
    // department would freeze the catalogue underneath it.
    const id = 'T0100006';
    await api.pool.query(
      `INSERT INTO subjects (subject_id, subject_name_th, subject_name_en, credits, department_id)
       VALUES ($1, 'รายวิชาเดิมของภาควิชานี้', 'An existing subject', 3, $2)`,
      [id, DEPT_CIVIL],
    );
    const edited = await edit(cookie, id, {
      subject_name_th: 'ชื่อใหม่',
      subject_name_en: 'A new name',
      credits: '3',
      is_active: false,
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.subject.is_active, false);
    assert.equal((await remove(cookie, id)).status, 204);
  } finally {
    await api.pool.query('UPDATE departments SET is_active = true WHERE department_id = $1', [
      DEPT_CIVIL,
    ]);
  }
});

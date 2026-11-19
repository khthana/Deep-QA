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
 * it from would pass whatever that constant said. Naming the six columns
 * independently is what makes the sixth criterion's template an assertion
 * instead of a tautology. `department_id` was among them until #284 (19 พ.ย.
 * 2569): a subject is filed under the department of the grant that records it,
 * so there is no department for the file to name.
 */
const COLUMNS = [
  'subject_id',
  'subject_name_th',
  'subject_name_en',
  'credits',
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

/**
 * The fields every well-formed row needs, so a test only writes what it means.
 * No department since #284: it is the grant's.
 */
const draftOf = (id, extra = {}) => ({
  subject_id: id,
  subject_name_th: `รายวิชา ${id}`,
  subject_name_en: `Subject ${id}`,
  credits: '3',
  ...extra,
});

/**
 * Every endpoint of the catalogue walked as one account, asserting the server
 * refuses all eight, and then read back from a maintainer's session to show
 * that nothing the refused account asked for happened.
 *
 * Two roles are refused the whole screen, for two different reasons - the
 * faculty administrator by #61 and the Central Admin by ADR-0002 - and the
 * proof each one needs is the same walk, so the walk is written once and the
 * reasons stay in the tests that call it. `prefix` keeps the codes the two
 * attempts create from colliding.
 */
const refusedEverything = async (account, prefix) => {
  const cookie = await signInAs(account);
  const created = `${prefix}0500001`;
  const imported = `${prefix}0500002`;

  const answers = await Promise.all([
    list(cookie),
    read(cookie, SUBJECT.id),
    create(cookie, draftOf(created)),
    edit(cookie, SUBJECT.id, { subject_name_th: 'ไม่ควรเกิด' }),
    remove(cookie, SUBJECT.id),
    template(cookie),
    importCsv(cookie, csvOf([draftOf(imported)])),
  ]);

  for (const answer of answers) {
    assert.equal(answer.status, 403, `${answer.request.method} ${answer.request.url}`);
    assert.equal(answer.body.message, REFUSALS.forbidden);
  }

  const maintainer = await signInAs('U_DEPT');
  assert.equal((await read(maintainer, created)).status, 404);
  assert.equal((await read(maintainer, imported)).status, 404);
  const untouched = await read(maintainer, SUBJECT.id);
  assert.equal(untouched.body.subject.subject_name_th, SUBJECT.th);
  assert.equal(untouched.body.subject.is_active, true);
};

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
  assert.equal(added.body.subject.department_id, DEPT_COMPUTER, 'filed under the grant’s');
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
  // Except the department, which an edit does not write (#284).
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
  await refusedEverything('U_FAC', 'F');
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

  // Their own department is theirs, so the refusals above are about the scope
  // and not about the role. (A creation naming somebody else's department was
  // refused here until #284; the body's department is no longer read, which
  // the test *a department named in the body is not read* below holds.)
  const own = await create(cookie, draftOf('T0100002'));
  assert.equal(own.status, 201, own.body.message);
  assert.equal(own.body.subject.department_id, DEPT_CIVIL);

  // And the list they see is their own department's, not the faculty's.
  const seen = await list(cookie, '?per_page=100');
  assert.deepEqual(
    seen.body.subjects.map((row) => row.subject_id),
    ['T0100002'],
  );

  // Nothing they were refused happened - looked at by the administrator of the
  // department they reached into, who since #61 is the only account that can.
  const neighbour = await signInAs('U_DEPT');
  assert.equal((await read(neighbour, SUBJECT.id)).body.subject.subject_name_th, SUBJECT.th);
  // And their own is theirs to clear away.
  assert.equal((await remove(cookie, 'T0100002')).status, 204);
});

test('a department administrator cannot move a subject out of their reach', async () => {
  // The other end of the third criterion. Until #284 an edit could name a
  // department and was refused when it named somebody else's; since then the
  // edit writes no department, so the move does not happen and the save of the
  // other fields does - the body's department is not read, rather than refused.
  const cookie = await signInAs('U_DEPT2');
  assert.equal((await create(cookie, draftOf('T0100003'))).status, 201);

  try {
    const moved = await edit(cookie, 'T0100003', {
      subject_name_th: 'รายวิชา T0100003 ใหม่',
      subject_name_en: 'Subject T0100003',
      credits: '3',
      department_id: DEPT_COMPUTER,
    });

    assert.equal(moved.status, 200, moved.body.message);
    const after = (await read(cookie, 'T0100003')).body.subject;
    assert.equal(after.department_id, DEPT_CIVIL, 'still in the editor’s own department');
    assert.equal(after.subject_name_th, 'รายวิชา T0100003 ใหม่');
  } finally {
    // Below the seam: under a mutant that writes the body's department the row
    // is in `05`, out of this caller's reach, and a removal over HTTP would
    // leave it for the pagination test to count (#89, #181).
    await api.pool.query(`DELETE FROM subjects WHERE subject_id = 'T0100003'`);
  }
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

test('a subject with no name, no credits or too long a code is refused', async () => {
  // A subject with no department was refused here too until #284; the
  // department is now the grant's, so a body without one is the normal case.
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

test('the list paginates beyond ten rows', async () => {
  // The seventh criterion: eleven subjects in the one department this account
  // administers, so there is a second page to reach. Its other half, the
  // department filter, went with the column in #284 - the test below holds that
  // a `?department_id=` is now not read at all.
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

  for (const id of computer) assert.equal((await remove(cookie, id)).status, 204);
});

test('a `?department_id=` on the list is not read, and still never widens it — #284', async () => {
  // The owner's answer of 19 พ.ย. 2569 took the department filter away with
  // the column: it had one option for every account that reaches this screen.
  // So the parameter is not read - the department the caller holds is not
  // narrowed to nothing by naming the other one - and the reach still bounds
  // the list, so naming the other one shows none of that department's rows.
  const cookie = await signInAs('U_DEPT2');
  assert.equal((await create(cookie, draftOf('T0100006'))).status, 201);

  try {
    const answer = await list(cookie, `?department_id=${DEPT_COMPUTER}&per_page=100`);
    assert.equal(answer.status, 200);
    assert.deepEqual(
      answer.body.subjects.map((row) => row.subject_id),
      ['T0100006'],
      'the caller’s own department, not narrowed and not widened',
    );

    // A query string may name the same parameter twice, in which case Express
    // hands the route an array rather than a string; unread, it is as harmless.
    const twice = await list(
      cookie,
      `?department_id=${DEPT_CIVIL}&department_id=${DEPT_COMPUTER}&per_page=100`,
    );
    assert.equal(twice.status, 200);
    assert.equal(twice.body.total, 1);
  } finally {
    await api.pool.query(`DELETE FROM subjects WHERE subject_id = 'T0100006'`);
  }
});

test('a department named in the body is not read: the subject lands in the grant’s — #284', async () => {
  // The owner's answer of 19 พ.ย. 2569: no department on the form, and a
  // subject filed under the department of the grant that records it. A body
  // that still names one - an old client, or somebody typing a request - names
  // somebody else's here, and the row lands in `01` all the same. Until #284
  // that request was refused with `subjectDepartmentNotYours`; the picker it
  // was asked of (`GET /subjects/departments`) is gone, and that path now
  // reaches the one-subject route as a code nobody has.
  const cookie = await signInAs('U_DEPT2');
  const made = await create(cookie, draftOf('T0100004', { department_id: DEPT_COMPUTER }));
  try {
    assert.equal(made.status, 201, made.body.message);
    assert.equal(made.body.subject.department_id, DEPT_CIVIL);
    assert.equal((await read(await signInAs('U_DEPT'), 'T0100004')).status, 404, 'not in 05');

    const picker = await request(api.app).get('/api/subjects/departments').set('Cookie', cookie);
    assert.equal(picker.status, 404);
    assert.equal(picker.body.message, REFUSALS.subjectNotFound);
  } finally {
    // Below the seam: under a mutant that reads the body's department the row
    // lands in `05` and would be counted by that administrator's list (#89, #181).
    await api.pool.query(`DELETE FROM subjects WHERE subject_id = 'T0100004'`);
  }
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
  // The sixth criterion's first half. Every row lands in the grant's
  // department (#284); until then the file carried a department column, checked
  // against the reach, and an old template's column is the test two below.
  const cookie = await signInAs('U_DEPT');

  const response = await importCsv(
    cookie,
    csvOf([
      {
        subject_id: 'I0000001',
        subject_name_th: 'วิศวกรรมซอฟต์แวร์',
        subject_name_en: 'SOFTWARE ENGINEERING',
        credits: '3',
        description_th: 'กระบวนการพัฒนาซอฟต์แวร์',
      },
      {
        subject_id: 'I0000002',
        subject_name_th: 'ระบบฐานข้อมูล',
        subject_name_en: 'DATABASE SYSTEMS',
        credits: '3',
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
      // A department that does not exist was this line's failure until #284,
      // when the file stopped naming one; a fractional credit takes its place.
      draftOf('B0000004', { credits: '3.5' }), // line 5
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
  assert.equal(response.body.errors[2].message, REFUSALS.invalidSubject);
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

test('an old template’s department column is not read: the rows land in the grant’s — #284', async () => {
  // The third criterion again, on the import - because a rule the form enforces
  // and the spreadsheet does not is a rule with a way around it. Until #284 a
  // row naming somebody else's department was refused; the template no longer
  // carries the column, and a file made from the old one still imports, with
  // the column ignored rather than obeyed or refused (`csv.js` keeps unknown
  // headers and `readSubject` does not read this one).
  const cookie = await signInAs('U_DEPT2');

  const response = await importCsv(
    cookie,
    [
      'subject_id,subject_name_th,subject_name_en,credits,department_id,description_th,description_en',
      `X0500001,แม่แบบเก่า,Old template,3,${DEPT_COMPUTER},,`,
    ].join('\r\n'),
  );

  try {
    assert.equal(response.status, 201, response.body.message);
    assert.deepEqual(
      response.body.subjects.map((row) => [row.subject_id, row.department_id]),
      [['X0500001', DEPT_CIVIL]],
    );
    assert.equal((await read(await signInAs('U_DEPT'), 'X0500001')).status, 404, 'not in 05');
  } finally {
    await api.pool.query(`DELETE FROM subjects WHERE subject_id = 'X0500001'`);
  }
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
  await refusedEverything('U_ADMIN', 'C');
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

test('a retired department keeps its subjects, and the sentence says nothing new may be filed — #284', async () => {
  // The fourth criterion read for the department a subject sits in. Since #284
  // that department is the administrator's own, so the refusal is the owner's
  // sentence of 19 พ.ย. 2569 - #282's, with รายวิชา for หลักสูตร - and not
  // `subjectDepartmentNotYours`, which said the department was somebody
  // else's. Written out rather than read from REFUSALS for COLUMNS' reason.
  const RETIRED = 'ภาควิชาของคุณถูกปิดใช้งาน จึงเพิ่มรายวิชาใหม่ไม่ได้';
  const cookie = await signInAs('U_DEPT2');
  await api.pool.query('UPDATE departments SET is_active = false WHERE department_id = $1', [
    DEPT_CIVIL,
  ]);

  try {
    const refused = await create(cookie, draftOf('T0100005'));
    assert.equal(refused.status, 403);
    assert.equal(refused.body.message, RETIRED);

    // The same refusal reaches a spreadsheet, once for the file and not once
    // per row (#285) - the row at the end of this file reads one with more in it.
    const imported = await importCsv(cookie, csvOf([draftOf('T0100007')]));
    assert.equal(imported.status, 400);
    assert.equal(imported.body.message, RETIRED);
    assert.deepEqual(imported.body.errors, []);
    for (const id of ['T0100005', 'T0100007']) {
      assert.equal((await read(cookie, id)).status, 404);
    }

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
    // Below the seam: under a mutant that lets the create, the import or the
    // edit through, these are left behind for the rows after this one to
    // count (#89, #181). Nothing to delete when the row passes.
    await api.pool.query(
      `DELETE FROM subjects WHERE subject_id IN ('T0100005', 'T0100006', 'T0100007')`,
    );
  }
});

/**
 * The activity log, as the three tests below ask about it — ticket #58.
 *
 * Read by the acting account, which is where migration 0006 says the line
 * stays. `LOGIN` is excluded and nothing else is, so a line written without the
 * target it should carry arrives here instead of being filtered out.
 */
const logOf = async (userId) => {
  const { rows } = await api.pool.query(
    `SELECT activity, target_kind, target_id, time_stamp FROM user_log
      WHERE user_id = $1 AND activity <> 'LOGIN'
      ORDER BY id ASC`,
    [userId],
  );
  return rows;
};

const DEPT = ACCOUNTS.find((account) => account.alias === 'U_DEPT').id;

const said = (rows) => rows.map((row) => [row.activity, row.target_kind, row.target_id]);

test('adding, editing and removing a subject each write one line — #58', async () => {
  const cookie = await signInAs('U_DEPT');
  const before = (await logOf(DEPT)).length;

  assert.equal(
    (
      await create(cookie, {
        subject_id: 'T5800001',
        subject_name_th: 'รายวิชาบันทึก',
        subject_name_en: 'Logged Subject',
        credits: 3,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await edit(cookie, 'T5800001', {
        subject_name_th: 'รายวิชาบันทึกใหม่',
        subject_name_en: 'Logged Subject II',
        credits: 3,
      })
    ).status,
    200,
  );
  assert.equal((await remove(cookie, 'T5800001')).status, 204);

  assert.deepEqual(said((await logOf(DEPT)).slice(before)), [
    ['CREATE_SUBJECT', 'SUBJECT', 'T5800001'],
    ['UPDATE_SUBJECT', 'SUBJECT', 'T5800001'],
    ['DELETE_SUBJECT', 'SUBJECT', 'T5800001'],
  ]);
});

test('a removal the database turns into a deactivation says so — #58', async () => {
  // The same pair as a programme's, and for the same reason: the seeded subject
  // is named by a Program Subject, so the DELETE comes back as a deactivation
  // and a line saying *deleted* would contradict the answer the caller got.
  const cookie = await signInAs('U_DEPT');
  const before = (await logOf(DEPT)).length;

  const answer = await remove(cookie, SUBJECT.id);
  assert.equal(answer.status, 200);
  assert.equal(answer.body.deactivated, true);

  assert.deepEqual(said((await logOf(DEPT)).slice(before)), [
    ['DEACTIVATE_SUBJECT', 'SUBJECT', SUBJECT.id],
  ]);

  // Put the seeded subject back: this file's later reads, and any file after
  // it, were handed a catalogue with it switched on.
  assert.equal(
    (
      await edit(cookie, SUBJECT.id, {
        subject_name_th: SUBJECT.th,
        subject_name_en: SUBJECT.en,
        credits: SUBJECT.credits,
        is_active: true,
      })
    ).status,
    200,
  );
});

test('an import writes a line per row, sharing one timestamp — #58', async () => {
  const cookie = await signInAs('U_DEPT');
  const before = (await logOf(DEPT)).length;

  try {
    const imported = await importCsv(
      cookie,
      csvOf([
        {
          subject_id: 'T5800002',
          subject_name_th: 'รายวิชานำเข้าหนึ่ง',
          subject_name_en: 'Imported One',
          credits: 3,
        },
        {
          subject_id: 'T5800003',
          subject_name_th: 'รายวิชานำเข้าสอง',
          subject_name_en: 'Imported Two',
          credits: 3,
        },
      ]),
    );
    assert.equal(imported.status, 201);

    const written = (await logOf(DEPT)).slice(before);
    assert.deepEqual(said(written), [
      ['IMPORT_SUBJECTS', 'SUBJECT', 'T5800002'],
      ['IMPORT_SUBJECTS', 'SUBJECT', 'T5800003'],
    ]);
    assert.deepEqual(written[0].time_stamp, written[1].time_stamp);
  } finally {
    await remove(cookie, 'T5800002');
    await remove(cookie, 'T5800003');
  }
});

test('a search narrows the list to the subjects whose code, name or credits hold it - #272', async () => {
  // The owner's answer of 12 November 2569: code and both names, any case, the
  // count following. (The department filter applied beside it until #284.)
  const cookie = await signInAs('U_DEPT');
  const made = [
    draftOf('K0000001', { subject_name_th: 'วิชาค้นเจอ', subject_name_en: 'Findable Topics' }),
    draftOf('K0000002', {
      subject_name_th: 'วิชาอื่น',
      subject_name_en: 'Other Topics',
      credits: '9',
    }),
  ];
  for (const row of made) assert.equal((await create(cookie, row)).status, 201);
  const ids = (response) => response.body.subjects.map((row) => row.subject_id);
  try {
    const byEnglish = await list(cookie, '?q=FINDABLE');
    assert.equal(byEnglish.status, 200);
    assert.deepEqual(ids(byEnglish), ['K0000001'], 'the English name, whatever its case');
    assert.equal(byEnglish.body.total, 1, 'the count is the search count');

    assert.deepEqual(ids(await list(cookie, '?q=ค้นเจอ')), ['K0000001'], 'the Thai name');
    assert.deepEqual(ids(await list(cookie, '?q=k0000002')), ['K0000002'], 'the code');
    assert.deepEqual(
      ids(await list(cookie, '?q=K000000')).sort(),
      ['K0000001', 'K0000002'],
      'a prefix of the code',
    );
    assert.equal((await list(cookie, '?q=K000000_')).body.total, 0, 'an underscore matches itself');
    // The table draws the credits, and the delivered table searched them with
    // the rest of the record (`SubjectTable.js`, `Object.values`).
    assert.deepEqual(
      ids(await list(cookie, '?q=9')),
      ['K0000002'],
      'the credits',
    );
  } finally {
    for (const row of made) await remove(cookie, row.subject_id);
  }
});

test('a file under a retired department is refused once, before anything in it is read — #285', async () => {
  // #285's answer read for subjects, which #284 had copied the per-row shape
  // to: the owner chose both screens on 19 พ.ย. 2569. Three files, one claim
  // each - a file with a bad row in it, an empty one, and another screen's.
  const RETIRED = 'ภาควิชาของคุณถูกปิดใช้งาน จึงเพิ่มรายวิชาใหม่ไม่ได้';
  const cookie = await signInAs('U_DEPT2');
  const ids = ['T0100008', 'T0100009', 'T0100010'];
  await api.pool.query('UPDATE departments SET is_active = false WHERE department_id = $1', [
    DEPT_CIVIL,
  ]);

  try {
    // The third row has no credits - a row the per-row report would have
    // named for a reason of its own.
    const many = await importCsv(
      cookie,
      csvOf([draftOf(ids[0]), draftOf(ids[1]), draftOf(ids[2], { credits: '' })]),
    );
    assert.equal(many.status, 400, 'the file is refused');
    assert.equal(many.body.message, RETIRED, 'with the owner’s sentence');
    assert.deepEqual(many.body.errors, [], 'once, and no line is named');
    assert.equal(many.body.created, 0);

    // Another screen's file before the empty one, and not the other way round:
    // `importRows` judges an empty file before a wrong header, so a refusal
    // asked after both dies at whichever is read first and leaves the second
    // proved by nothing (#88). In this order a refusal asked after both dies
    // at the template, and one asked between the two at the empty file.
    const other = await importCsv(cookie, 'department_id,department_name_th\r\n05,วิศวกรรม\r\n');
    assert.equal(other.status, 400);
    assert.equal(other.body.message, RETIRED, 'another screen’s file hears it before the template');

    const empty = await importCsv(cookie, '');
    assert.equal(empty.status, 400);
    assert.equal(empty.body.message, RETIRED, 'an empty file hears it before it hears it is empty');
    // Read before the cleanup below, which would make it true either way.
    for (const id of ids) assert.equal((await read(cookie, id)).status, 404, `${id} was not written`);
  } finally {
    await api.pool.query('UPDATE departments SET is_active = true WHERE department_id = $1', [
      DEPT_CIVIL,
    ]);
    // Below the seam (#181): under a mutant that lets the file through, the
    // two good rows are written and the rows after this one would count them.
    await api.pool.query('DELETE FROM subjects WHERE subject_id = ANY($1)', [ids]);
  }
});

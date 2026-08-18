'use strict';

/**
 * Ticket #14: departments — the faculty's own structure, and the first screen
 * with a spreadsheet import.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real. Two of the nine criteria are
 * asserted somewhere other than in this file and it is worth saying where.
 *
 * *"Removal asks for confirmation first"* is a dialog. docs/06 settles that
 * frontend components are not unit-tested, and there is nothing for a server to
 * confirm against - a request that arrived is a request that was meant - so it
 * is on the hand-worked checklist in docs/acceptance/14 and not here.
 *
 * *"The import module is reusable and is consumed by this screen rather than
 * duplicated"* is a claim about two callers, and one of them is accounts. It is
 * carried by #11's suite, which was not changed when `routes/users.js` was
 * moved onto `lib/importer` in this ticket: the forty-two tests in
 * users.test.js pass against the shared module unedited, which is what
 * "reusable" means and what a test in this file could not say.
 *
 * The seeded departments are both referenced - `05` by two programmes and a
 * subject, `01` by U_DEPT2's account - so every test that needs a department it
 * may destroy makes its own, with identifiers no other test names.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, FACULTY, DEPARTMENTS } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { IMPORT_COLUMNS } = require('../routes/departments');
const { startApi } = require('./helpers');

const [DEPT_COMPUTER] = DEPARTMENTS.map((department) => department.id);

let api;
before(async () => {
  api = await startApi('departments', { withSeed: true });
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
  request(api.app).get(`/api/departments${query}`).set('Cookie', cookie);

const read = (cookie, id) =>
  request(api.app).get(`/api/departments/${id}`).set('Cookie', cookie);

const create = (cookie, body) =>
  request(api.app).post('/api/departments').set('Cookie', cookie).send(body);

const edit = (cookie, id, body) =>
  request(api.app).put(`/api/departments/${id}`).set('Cookie', cookie).send(body);

const remove = (cookie, id) =>
  request(api.app).delete(`/api/departments/${id}`).set('Cookie', cookie);

const template = (cookie) =>
  request(api.app).get('/api/departments/import-template').set('Cookie', cookie);

const importCsv = (cookie, csv) =>
  request(api.app)
    .post('/api/departments/import')
    .set('Cookie', cookie)
    .set('Content-Type', 'text/csv')
    .send(csv);

/** A CSV whose header is the template's, from rows given as objects. */
const csvOf = (rows) =>
  [
    IMPORT_COLUMNS.join(','),
    ...rows.map((row) => IMPORT_COLUMNS.map((column) => row[column] ?? '').join(',')),
  ].join('\r\n');

test('a faculty administrator adds, edits and removes a department', async () => {
  // The first criterion, end to end, on a department this test owns.
  const cookie = await signInAs('U_FAC');

  const added = await create(cookie, {
    department_id: 'T20',
    department_name_th: 'วิศวกรรมอาหาร',
    department_name_en: 'Food Engineering',
  });
  assert.equal(added.status, 201);
  assert.equal(added.body.department.department_name_th, 'วิศวกรรมอาหาร');
  // Derived from the acting grant and not sent: the point of the next test.
  assert.equal(added.body.department.faculty_id, FACULTY.id);
  assert.equal(added.body.department.is_active, true);

  const edited = await edit(cookie, 'T20', {
    department_name_th: 'วิศวกรรมอาหารและชีวภาพ',
    department_name_en: 'Food and Bioprocess Engineering',
    is_active: false,
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.department.department_name_th, 'วิศวกรรมอาหารและชีวภาพ');
  assert.equal(edited.body.department.is_active, false);

  assert.equal((await remove(cookie, 'T20')).status, 204);
  assert.equal((await read(cookie, 'T20')).status, 404);
});

test('the faculty is derived from the grant, not read from the body', async () => {
  // ADR-0002. A faculty administrator sending somebody else's faculty is
  // refused rather than obeyed, and sending their own adds nothing.
  const cookie = await signInAs('U_FAC');

  const elsewhere = await create(cookie, {
    department_id: 'T21',
    department_name_th: 'วิศวกรรมเรือ',
    faculty_id: 'SCI',
  });
  assert.equal(elsewhere.status, 403);
  assert.equal(elsewhere.body.message, REFUSALS.facultyNotYours);
  assert.equal((await read(cookie, 'T21')).status, 404);

  const own = await create(cookie, {
    department_id: 'T21',
    department_name_th: 'วิศวกรรมเรือ',
    faculty_id: FACULTY.id,
  });
  assert.equal(own.status, 201);
  assert.equal(own.body.department.faculty_id, FACULTY.id);
  await remove(cookie, 'T21');
});

test('a department a programme uses cannot be silently destroyed', async () => {
  // The third criterion. `05` carries both seeded programmes and the subject,
  // every reference is ON DELETE RESTRICT, and the refusal says what to do
  // instead rather than failing as an unexpected error.
  const cookie = await signInAs('U_FAC');

  const refused = await remove(cookie, DEPT_COMPUTER);

  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.departmentInUse);
  assert.equal((await read(cookie, DEPT_COMPUTER)).status, 200);
});

test('a department is retired by switching it off', async () => {
  // The way round the refusal above, and the reason it is a real answer: a
  // department that is off is still there for the programmes that point at it.
  const cookie = await signInAs('U_FAC');

  const off = await edit(cookie, DEPT_COMPUTER, {
    department_name_th: 'วิศวกรรมคอมพิวเตอร์',
    department_name_en: 'Computer Engineering',
    is_active: false,
  });
  assert.equal(off.status, 200);
  assert.equal(off.body.department.is_active, false);

  // Put it back: later tests read this department and the seed says it is on.
  const on = await edit(cookie, DEPT_COMPUTER, {
    department_name_th: 'วิศวกรรมคอมพิวเตอร์',
    department_name_en: 'Computer Engineering',
    is_active: true,
  });
  assert.equal(on.body.department.is_active, true);
});

test('a duplicate identifier is refused rather than overwriting', async () => {
  const cookie = await signInAs('U_FAC');

  const clash = await create(cookie, {
    department_id: DEPT_COMPUTER,
    department_name_th: 'อะไรก็ตาม',
  });

  assert.equal(clash.status, 409);
  assert.equal(clash.body.message, REFUSALS.duplicateDepartmentId);
  // The one that was there is untouched.
  const still = await read(cookie, DEPT_COMPUTER);
  assert.equal(still.body.department.department_name_th, 'วิศวกรรมคอมพิวเตอร์');
});

test('a row with no name is refused', async () => {
  const cookie = await signInAs('U_FAC');

  const nameless = await create(cookie, { department_id: 'T22' });

  assert.equal(nameless.status, 400);
  assert.equal(nameless.body.message, REFUSALS.invalidDepartment);
});

test('the list paginates beyond ten rows', async () => {
  // The fourth criterion. The seed has two departments, so the file makes
  // enough of its own to have a second page at all, then clears them up.
  const cookie = await signInAs('U_FAC');
  const made = Array.from({ length: 11 }, (unused, index) => `P${String(index).padStart(2, '0')}`);
  for (const id of made) {
    const added = await create(cookie, { department_id: id, department_name_th: `ภาควิชา ${id}` });
    assert.equal(added.status, 201, `could not seed ${id}: ${added.body.message}`);
  }

  const first = await list(cookie);
  assert.equal(first.status, 200);
  assert.equal(first.body.departments.length, 10);
  assert.equal(first.body.page, 1);
  assert.equal(first.body.per_page, 10);
  assert.equal(first.body.total, made.length + DEPARTMENTS.length);

  const second = await list(cookie, '?page=2');
  assert.equal(second.body.page, 2);
  assert.equal(second.body.departments.length, first.body.total - 10);
  // The two pages are different rows and the order is stable, so nothing is
  // shown twice and nothing is skipped between them.
  const seen = new Set(first.body.departments.map((row) => row.department_id));
  assert.ok(second.body.departments.every((row) => !seen.has(row.department_id)));

  for (const id of made) assert.equal((await remove(cookie, id)).status, 204);
});

test('the template downloads and matches what the importer accepts', async () => {
  // The fifth criterion. The header is not compared against a list written out
  // here - that would only prove this test agrees with itself - but against the
  // module's own `IMPORT_COLUMNS`, which is the list the import reads rows by.
  const cookie = await signInAs('U_FAC');

  const response = await template(cookie);

  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/csv/);
  assert.match(response.headers['content-disposition'], /attachment; filename="departments-template\.csv"/);
  const [header] = response.text.replace(/^﻿/, '').split('\r\n');
  assert.deepEqual(header.split(','), IMPORT_COLUMNS);

  // And the example row it carries is itself acceptable to the importer, which
  // is the half of "matches" a header comparison cannot reach.
  const accepted = await importCsv(cookie, response.text);
  assert.equal(accepted.status, 201, accepted.body.message);
  for (const row of accepted.body.departments) await remove(cookie, row.department_id);
});

test('a valid spreadsheet imports every row', async () => {
  // The sixth criterion.
  const cookie = await signInAs('U_FAC');

  const response = await importCsv(
    cookie,
    csvOf([
      { department_id: 'I01', department_name_th: 'วิศวกรรมไฟฟ้า', department_name_en: 'Electrical' },
      { department_id: 'I02', department_name_th: 'วิศวกรรมเครื่องกล' },
      { department_id: 'I03', department_name_th: 'วิศวกรรมอุตสาหการ' },
    ]),
  );

  assert.equal(response.status, 201, response.body.message);
  assert.equal(response.body.created, 3);
  assert.deepEqual(response.body.errors, []);
  // The faculty is derived for an imported row exactly as it is for a typed
  // one, and the template has no column for it.
  assert.ok(response.body.departments.every((row) => row.faculty_id === FACULTY.id));
  // The English name is optional, as the column is.
  assert.equal((await read(cookie, 'I02')).body.department.department_name_en, null);

  for (const id of ['I01', 'I02', 'I03']) assert.equal((await remove(cookie, id)).status, 204);
});

test('a spreadsheet with bad rows reports each failure and applies nothing', async () => {
  // The seventh criterion, and the reason the import is one transaction: the
  // person fixes their file and uploads it again rather than working out which
  // half of it took. Four different failures, one good row among them, and the
  // good row must not survive.
  const cookie = await signInAs('U_FAC');

  const response = await importCsv(
    cookie,
    csvOf([
      { department_id: 'B01', department_name_th: 'ดี' }, // line 2 - the good row
      { department_id: '', department_name_th: 'ไม่มีรหัส' }, // line 3
      { department_id: 'B02', department_name_th: '' }, // line 4
      { department_id: 'B01', department_name_th: 'ซ้ำ' }, // line 5
      { department_id: DEPT_COMPUTER, department_name_th: 'ชนของเดิม' }, // line 6
    ]),
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importRejected);
  assert.equal(response.body.created, 0);

  // Every failure, with the line of the spreadsheet it is on, in order.
  assert.deepEqual(
    response.body.errors.map((error) => error.line),
    [3, 4, 5, 6],
  );
  assert.equal(response.body.errors[0].message, REFUSALS.invalidDepartment);
  assert.equal(response.body.errors[1].message, REFUSALS.invalidDepartment);
  // The duplicate within the file names the line it collides with, which is
  // what the database's own 23505 could not have said.
  assert.equal(response.body.errors[2].message, `${REFUSALS.duplicateDepartmentId} (ซ้ำกับบรรทัดที่ 2)`);
  // A row colliding with the table, found at write time - and found *as well
  // as* the three above rather than instead of them, which is what the
  // per-row savepoint buys.
  assert.equal(response.body.errors[3].message, REFUSALS.duplicateDepartmentId);

  // Nothing was written: not even the row that was fine.
  assert.equal((await read(cookie, 'B01')).status, 404);
});

test('an empty file is refused as such', async () => {
  const cookie = await signInAs('U_FAC');

  const response = await importCsv(cookie, csvOf([]));

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importEmpty);
});

test('a department administrator is refused by the server on every endpoint', async () => {
  // The eighth criterion, stated as it is written: not merely denied the menu
  // entry. U_DEPT administers department 05 and so has an administrator's
  // session and an administrator's cookie; what they do not have is any
  // business editing the faculty's own structure.
  const cookie = await signInAs('U_DEPT');

  const answers = await Promise.all([
    list(cookie),
    read(cookie, DEPT_COMPUTER),
    create(cookie, { department_id: 'X01', department_name_th: 'ไม่ควรเกิด' }),
    edit(cookie, DEPT_COMPUTER, { department_name_th: 'ไม่ควรเกิด' }),
    remove(cookie, DEPT_COMPUTER),
    template(cookie),
    importCsv(cookie, csvOf([{ department_id: 'X02', department_name_th: 'ไม่ควรเกิด' }])),
  ]);

  for (const answer of answers) {
    assert.equal(answer.status, 403, `${answer.request.method} ${answer.request.url}`);
    assert.equal(answer.body.message, REFUSALS.forbidden);
  }

  // And nothing they asked for happened.
  const admin = await signInAs('U_FAC');
  assert.equal((await read(admin, 'X01')).status, 404);
  assert.equal((await read(admin, 'X02')).status, 404);
  assert.equal((await read(admin, DEPT_COMPUTER)).body.department.department_name_th, 'วิศวกรรมคอมพิวเตอร์');
});

test('a caller who has not signed in reaches none of it', async () => {
  const answers = await Promise.all([
    request(api.app).get('/api/departments'),
    request(api.app).post('/api/departments').send({ department_id: 'X03' }),
    request(api.app).get('/api/departments/import-template'),
  ]);

  for (const answer of answers) assert.equal(answer.status, 401);
});

test('the Central Admin names the faculty, because they belong to none', async () => {
  // The one caller for whom the faculty cannot be derived from a grant: acting
  // globally is not acting in a faculty. So it is a field for them, checked
  // against the table rather than taken on trust, and its absence is refused.
  const cookie = await signInAs('U_ADMIN');

  const unnamed = await create(cookie, { department_id: 'C01', department_name_th: 'ไร้คณะ' });
  assert.equal(unnamed.status, 400);
  assert.equal(unnamed.body.message, REFUSALS.facultyUnknown);

  const invented = await create(cookie, {
    department_id: 'C01',
    department_name_th: 'คณะที่ไม่มี',
    faculty_id: 'NOPE',
  });
  assert.equal(invented.status, 400);
  assert.equal(invented.body.message, REFUSALS.facultyUnknown);

  const named = await create(cookie, {
    department_id: 'C01',
    department_name_th: 'วิศวกรรมสิ่งแวดล้อม',
    faculty_id: FACULTY.id,
  });
  assert.equal(named.status, 201);
  assert.equal(named.body.department.faculty_id, FACULTY.id);

  assert.equal((await remove(cookie, 'C01')).status, 204);
});

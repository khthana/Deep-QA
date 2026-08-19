'use strict';

/**
 * Ticket #15: programmes — the first screen two administrators share.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real. Two criteria are asserted
 * somewhere other than in this file and it is worth saying where.
 *
 * *"Removal asks for confirmation first"* is a dialog. docs/06 settles that
 * frontend components are not unit-tested, and there is nothing for a server to
 * confirm against, so it is on the hand-worked checklist in docs/acceptance/15.
 *
 * *"Import works through the shared module"* is a claim about three callers,
 * and two of them are accounts and departments. It is carried by their suites,
 * which were not changed by this ticket.
 *
 * The ninth criterion names two of the tests below by hand - the
 * cross-Department refusal and the deactivate-instead-of-delete rule - and both
 * are written against the seed as it stands rather than against fixtures made
 * to suit them: `0501` really is referenced, by PLOs, Program Subjects,
 * students and Offerings, and U_DEPT2 really does administer a different
 * department. Every test that needs a programme it may destroy makes its own,
 * with identifiers no other test names.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, DEPARTMENTS, PROGRAMS } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * The template's columns, written out here rather than imported from the route.
 *
 * A test that compared the served header against the constant the route built
 * it from would pass whatever that constant said. Naming the five columns
 * independently is what makes the seventh criterion's template an assertion
 * instead of a tautology - and `department_id` is deliberately among them,
 * unlike #14's, because a programme's department is the caller's to name.
 */
const COLUMNS = [
  'program_id',
  'program_name_th',
  'program_name_en',
  'department_id',
  'year',
];

const [DEPT_COMPUTER, DEPT_CIVIL] = DEPARTMENTS.map((department) => department.id);
const [SEEDED] = PROGRAMS;

let api;
before(async () => {
  api = await startApi('programs', { withSeed: true });
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
  request(api.app).get(`/api/programs${query}`).set('Cookie', cookie);

const read = (cookie, id) => request(api.app).get(`/api/programs/${id}`).set('Cookie', cookie);

const create = (cookie, body) =>
  request(api.app).post('/api/programs').set('Cookie', cookie).send(body);

const edit = (cookie, id, body) =>
  request(api.app).put(`/api/programs/${id}`).set('Cookie', cookie).send(body);

const remove = (cookie, id) =>
  request(api.app).delete(`/api/programs/${id}`).set('Cookie', cookie);

const template = (cookie) =>
  request(api.app).get('/api/programs/import-template').set('Cookie', cookie);

const pickable = (cookie) =>
  request(api.app).get('/api/programs/departments').set('Cookie', cookie);

const importCsv = (cookie, csv) =>
  request(api.app)
    .post('/api/programs/import')
    .set('Cookie', cookie)
    .set('Content-Type', 'text/csv')
    .send(csv);

/** A CSV whose header is the template's, from rows given as objects. */
const csvOf = (rows) =>
  [
    COLUMNS.join(','),
    ...rows.map((row) => COLUMNS.map((column) => row[column] ?? '').join(',')),
  ].join('\r\n');

test('an administrator adds, edits and removes a programme under a department', async () => {
  // The first criterion, end to end, on a programme this test owns and nothing
  // else references - so the removal really is a deletion.
  const cookie = await signInAs('U_FAC');

  const added = await create(cookie, {
    program_id: 'T5001',
    program_name_th: 'วิศวกรรมหุ่นยนต์',
    program_name_en: 'Robotics Engineering',
    department_id: DEPT_COMPUTER,
    year: '2566',
  });
  assert.equal(added.status, 201, added.body.message);
  assert.equal(added.body.program.program_name_th, 'วิศวกรรมหุ่นยนต์');
  assert.equal(added.body.program.department_id, DEPT_COMPUTER);
  assert.equal(added.body.program.year, '2566');
  assert.equal(added.body.program.is_active, true);

  const edited = await edit(cookie, 'T5001', {
    program_name_th: 'วิศวกรรมหุ่นยนต์และระบบอัตโนมัติ',
    program_name_en: 'Robotics and Automation Engineering',
    year: '2567',
  });
  assert.equal(edited.status, 200, edited.body.message);
  assert.equal(edited.body.program.program_name_th, 'วิศวกรรมหุ่นยนต์และระบบอัตโนมัติ');
  assert.equal(edited.body.program.year, '2567');
  // Not sent, so left where it was rather than blanked.
  assert.equal(edited.body.program.department_id, DEPT_COMPUTER);

  const removed = await remove(cookie, 'T5001');
  assert.equal(removed.status, 204);
  assert.equal((await read(cookie, 'T5001')).status, 404);
});

test('a faculty administrator manages programmes in any department of the faculty', async () => {
  // The second criterion. Both seeded departments belong to ENG, and U_FAC's
  // grant is scoped to ENG - so the programme in the department they are not
  // otherwise associated with is theirs to make and theirs to read back.
  const cookie = await signInAs('U_FAC');

  const civil = await create(cookie, {
    program_id: 'T0101',
    program_name_th: 'วิศวกรรมโยธา',
    department_id: DEPT_CIVIL,
  });
  assert.equal(civil.status, 201, civil.body.message);
  assert.equal(civil.body.program.department_id, DEPT_CIVIL);

  // And the seeded programme in the other department is reachable in the same
  // session, which is what "any department" means.
  assert.equal((await read(cookie, SEEDED.id)).status, 200);

  assert.equal((await remove(cookie, 'T0101')).status, 204);
});

test('a department administrator is confined to their own department by the server', async () => {
  // The third criterion and half of the ninth, stated as the ticket writes it:
  // enforced at the server, not by hiding a menu. U_DEPT2 administers `01` and
  // holds a real administrator's session; `0501` is in `05`.
  const cookie = await signInAs('U_DEPT2');

  // Reading somebody else's programme answers as though it were not there, so
  // the route cannot be used to enumerate other departments' curricula.
  assert.equal((await read(cookie, SEEDED.id)).status, 404);
  assert.equal((await edit(cookie, SEEDED.id, { program_name_th: 'ไม่ควรเกิด' })).status, 404);
  assert.equal((await remove(cookie, SEEDED.id)).status, 404);

  // Creating one under a department they do not hold is refused in as many
  // words, because the department they named is not a secret to them.
  const elsewhere = await create(cookie, {
    program_id: 'X0501',
    program_name_th: 'ไม่ควรเกิด',
    department_id: DEPT_COMPUTER,
  });
  assert.equal(elsewhere.status, 403);
  assert.equal(elsewhere.body.message, REFUSALS.departmentNotYours);

  // Their own department is theirs, so the refusal above is about the scope and
  // not about the role.
  const own = await create(cookie, {
    program_id: 'T0102',
    program_name_th: 'วิศวกรรมโยธาและสิ่งแวดล้อม',
    department_id: DEPT_CIVIL,
  });
  assert.equal(own.status, 201, own.body.message);

  // And the list they see is their own department's, not the faculty's.
  const seen = await list(cookie, '?per_page=100');
  assert.deepEqual(
    seen.body.programs.map((row) => row.program_id),
    ['T0102'],
  );

  // Nothing they were refused happened.
  const admin = await signInAs('U_FAC');
  assert.equal((await read(admin, 'X0501')).status, 404);
  assert.equal((await read(admin, SEEDED.id)).body.program.program_name_th, SEEDED.th);
  assert.equal((await remove(admin, 'T0102')).status, 204);
});

test('a department administrator cannot move a programme out of their reach', async () => {
  // The other end of the third criterion. Editing names a department too, and a
  // department administrator who could name any of them would have a way of
  // pushing a record out of their own reach - or, run the other way, of
  // adopting one that is not theirs.
  const admin = await signInAs('U_FAC');
  assert.equal(
    (
      await create(admin, {
        program_id: 'T0103',
        program_name_th: 'วิศวกรรมสำรวจ',
        department_id: DEPT_CIVIL,
      })
    ).status,
    201,
  );

  const cookie = await signInAs('U_DEPT2');
  const moved = await edit(cookie, 'T0103', {
    program_name_th: 'วิศวกรรมสำรวจ',
    department_id: DEPT_COMPUTER,
  });

  assert.equal(moved.status, 403);
  assert.equal(moved.body.message, REFUSALS.departmentNotYours);
  assert.equal((await read(cookie, 'T0103')).body.program.department_id, DEPT_CIVIL);

  assert.equal((await remove(admin, 'T0103')).status, 204);
});

test('a referenced programme is deactivated instead of deleted', async () => {
  // The fourth criterion and the other half of the ninth. `0501` carries the
  // seeded PLOs, Program Subjects, students and Offerings, every one of those
  // references is ON DELETE RESTRICT, and the answer is not a refusal: the row
  // is switched off and the caller is told so.
  const cookie = await signInAs('U_FAC');

  const removed = await remove(cookie, SEEDED.id);

  assert.equal(removed.status, 200);
  assert.equal(removed.body.deactivated, true);
  assert.equal(removed.body.program.is_active, false);

  // The fifth criterion: it is still there, still named, still readable - which
  // is what makes the historical records that point at it readable too.
  const still = await read(cookie, SEEDED.id);
  assert.equal(still.status, 200);
  assert.equal(still.body.program.program_name_th, SEEDED.th);
  assert.equal(still.body.program.is_active, false);

  // And it has dropped out of the list a screen would pick a programme from,
  // while staying on the management list it is switched back on from.
  const choosable = await list(cookie, '?active=1&per_page=100');
  assert.ok(!choosable.body.programs.some((row) => row.program_id === SEEDED.id));
  const managed = await list(cookie, '?per_page=100');
  assert.ok(managed.body.programs.some((row) => row.program_id === SEEDED.id));

  // Put it back: later tests read this programme and the seed says it is on.
  // Every field, because a PUT replaces - see the year test below.
  const on = await edit(cookie, SEEDED.id, {
    program_name_th: SEEDED.th,
    program_name_en: SEEDED.en,
    year: SEEDED.year,
    is_active: true,
  });
  assert.equal(on.body.program.is_active, true);
  assert.equal(on.body.program.year, SEEDED.year);
});

test('the form is offered exactly the departments the caller may use', async () => {
  // The picker the first criterion's "chosen Department" comes from. What it
  // offers has to be what the server will accept, or the form has a way of
  // producing a refusal by being used as intended - so the two are the same
  // reach, asserted from both ends.
  const faculty = await signInAs('U_FAC');
  const both = await pickable(faculty);
  assert.equal(both.status, 200);
  assert.deepEqual(
    both.body.departments.map((row) => row.department_id).sort(),
    [DEPT_CIVIL, DEPT_COMPUTER].sort(),
  );

  const department = await signInAs('U_DEPT2');
  const own = await pickable(department);
  assert.deepEqual(
    own.body.departments.map((row) => row.department_id),
    [DEPT_CIVIL],
  );

  // Nothing on that list is refused, and what is not on it is.
  const allowed = await create(department, {
    program_id: 'T0104',
    program_name_th: 'วิศวกรรมทรัพยากรน้ำ',
    department_id: own.body.departments[0].department_id,
  });
  assert.equal(allowed.status, 201, allowed.body.message);
  assert.equal((await remove(department, 'T0104')).status, 204);
});

test('a duplicate identifier is refused rather than overwriting', async () => {
  const cookie = await signInAs('U_FAC');

  const clash = await create(cookie, {
    program_id: SEEDED.id,
    program_name_th: 'อะไรก็ตาม',
    department_id: DEPT_COMPUTER,
  });

  assert.equal(clash.status, 409);
  assert.equal(clash.body.message, REFUSALS.duplicateProgramId);
  assert.equal((await read(cookie, SEEDED.id)).body.program.program_name_th, SEEDED.th);
});

test('a programme with no name, no department or an unreadable year is refused', async () => {
  const cookie = await signInAs('U_FAC');

  const nameless = await create(cookie, { program_id: 'T9001', department_id: DEPT_COMPUTER });
  assert.equal(nameless.status, 400);
  assert.equal(nameless.body.message, REFUSALS.invalidProgram);

  const homeless = await create(cookie, { program_id: 'T9002', program_name_th: 'ไม่มีภาค' });
  assert.equal(homeless.status, 400);
  assert.equal(homeless.body.message, REFUSALS.invalidProgram);

  const undated = await create(cookie, {
    program_id: 'T9003',
    program_name_th: 'ปีพัง',
    department_id: DEPT_COMPUTER,
    year: '25',
  });
  assert.equal(undated.status, 400);
  assert.equal(undated.body.message, REFUSALS.invalidProgram);

  for (const id of ['T9001', 'T9002', 'T9003']) assert.equal((await read(cookie, id)).status, 404);
});

test('the list paginates beyond ten rows', async () => {
  // The eighth criterion. The seed has two programmes, so the file makes enough
  // of its own to have a second page at all, then clears them up.
  const cookie = await signInAs('U_FAC');
  const made = Array.from({ length: 11 }, (unused, index) => `Q${String(index).padStart(3, '0')}`);
  for (const id of made) {
    const added = await create(cookie, {
      program_id: id,
      program_name_th: `หลักสูตร ${id}`,
      department_id: DEPT_COMPUTER,
    });
    assert.equal(added.status, 201, `could not seed ${id}: ${added.body.message}`);
  }

  const first = await list(cookie);
  assert.equal(first.status, 200);
  assert.equal(first.body.programs.length, 10);
  assert.equal(first.body.page, 1);
  assert.equal(first.body.per_page, 10);
  assert.equal(first.body.total, made.length + PROGRAMS.length);

  const second = await list(cookie, '?page=2');
  assert.equal(second.body.page, 2);
  assert.equal(second.body.programs.length, first.body.total - 10);
  const seen = new Set(first.body.programs.map((row) => row.program_id));
  assert.ok(second.body.programs.every((row) => !seen.has(row.program_id)));

  for (const id of made) assert.equal((await remove(cookie, id)).status, 204);
});

test('the template downloads and matches what the importer accepts', async (t) => {
  t.after(async () => remove(await signInAs('U_FAC'), '0505'));
  // The seventh criterion, in both halves: the header is what this file names,
  // and the file it hands back is one the importer will take.
  const cookie = await signInAs('U_FAC');

  const response = await template(cookie);

  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/csv/);
  assert.match(
    response.headers['content-disposition'],
    /attachment; filename="programs-template\.csv"/,
  );
  const [header] = response.text.replace(/^﻿/, '').split('\r\n');
  assert.deepEqual(header.split(','), COLUMNS);

  const accepted = await importCsv(cookie, response.text);
  assert.equal(accepted.status, 201, accepted.body.message);
  for (const row of accepted.body.programs) await remove(cookie, row.program_id);
});

test('a valid spreadsheet imports every row', async () => {
  // The seventh criterion's first half, across two departments in one file -
  // which is the reason the template carries a department column at all.
  const cookie = await signInAs('U_FAC');

  const response = await importCsv(
    cookie,
    csvOf([
      {
        program_id: 'I0501',
        program_name_th: 'วิศวกรรมซอฟต์แวร์',
        program_name_en: 'Software Engineering',
        department_id: DEPT_COMPUTER,
        year: '2565',
      },
      { program_id: 'I0102', program_name_th: 'วิศวกรรมขนส่ง', department_id: DEPT_CIVIL },
    ]),
  );

  assert.equal(response.status, 201, response.body.message);
  assert.equal(response.body.created, 2);
  assert.deepEqual(response.body.errors, []);
  assert.deepEqual(
    response.body.programs.map((row) => row.department_id).sort(),
    [DEPT_CIVIL, DEPT_COMPUTER].sort(),
  );
  // The English name and the year are optional, as the columns are.
  const sparse = (await read(cookie, 'I0102')).body.program;
  assert.equal(sparse.program_name_en, null);
  assert.equal(sparse.year, null);

  for (const id of ['I0501', 'I0102']) assert.equal((await remove(cookie, id)).status, 204);
});

test('a spreadsheet with bad rows reports each failure and applies nothing', async () => {
  // The seventh criterion's second half, and the reason the import is one
  // transaction: the person fixes their file and uploads it again rather than
  // working out which half of it took. Five different failures, one good row
  // among them, and the good row must not survive.
  const cookie = await signInAs('U_FAC');

  const response = await importCsv(
    cookie,
    csvOf([
      { program_id: 'B001', program_name_th: 'ดี', department_id: DEPT_COMPUTER }, // line 2
      { program_id: '', program_name_th: 'ไม่มีรหัส', department_id: DEPT_COMPUTER }, // line 3
      { program_id: 'B002', program_name_th: '', department_id: DEPT_COMPUTER }, // line 4
      { program_id: 'B003', program_name_th: 'ภาคไม่มีจริง', department_id: 'ZZ' }, // line 5
      { program_id: 'B001', program_name_th: 'ซ้ำ', department_id: DEPT_COMPUTER }, // line 6
      { program_id: SEEDED.id, program_name_th: 'ชนของเดิม', department_id: DEPT_COMPUTER }, // line 7
    ]),
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importRejected);
  assert.equal(response.body.created, 0);

  assert.deepEqual(
    response.body.errors.map((error) => error.line),
    [3, 4, 5, 6, 7],
  );
  assert.equal(response.body.errors[0].message, REFUSALS.invalidProgram);
  assert.equal(response.body.errors[1].message, REFUSALS.invalidProgram);
  // The department check reaches every imported row, not only the typed one.
  assert.equal(response.body.errors[2].message, REFUSALS.departmentNotYours);
  // The duplicate within the file names the line it collides with, which is
  // what the database's own 23505 could not have said.
  assert.equal(response.body.errors[3].message, `${REFUSALS.duplicateProgramId} (ซ้ำกับบรรทัดที่ 2)`);
  // A row colliding with the table, found at write time - and found *as well
  // as* the four above rather than instead of them.
  assert.equal(response.body.errors[4].message, REFUSALS.duplicateProgramId);

  assert.equal((await read(cookie, 'B001')).status, 404);
});

test('an imported row cannot name a department the caller does not hold', async () => {
  // The third criterion again, on the import - because a rule the form enforces
  // and the spreadsheet does not is a rule with a way around it.
  const cookie = await signInAs('U_DEPT2');

  const response = await importCsv(
    cookie,
    csvOf([{ program_id: 'X0502', program_name_th: 'ไม่ควรเกิด', department_id: DEPT_COMPUTER }]),
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.errors[0].message, REFUSALS.departmentNotYours);

  const admin = await signInAs('U_FAC');
  assert.equal((await read(admin, 'X0502')).status, 404);
});

test('an empty file is refused as such', async () => {
  const cookie = await signInAs('U_FAC');

  const response = await importCsv(cookie, csvOf([]));

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importEmpty);
});

test('the Central Admin is refused by the server on every endpoint', async () => {
  // CONTEXT.md gives the Central Admin accounts and grants "and nothing else",
  // and ADR-0002 records the mechanism that keeps it true: curriculum routes do
  // not list `FULL_ADMIN`. A programme is curriculum. So the global grant,
  // which reaches every account in the university, reaches no programme.
  const cookie = await signInAs('U_ADMIN');

  const answers = await Promise.all([
    list(cookie),
    read(cookie, SEEDED.id),
    create(cookie, {
      program_id: 'C0501',
      program_name_th: 'ไม่ควรเกิด',
      department_id: DEPT_COMPUTER,
    }),
    edit(cookie, SEEDED.id, { program_name_th: 'ไม่ควรเกิด' }),
    remove(cookie, SEEDED.id),
    template(cookie),
    pickable(cookie),
    importCsv(
      cookie,
      csvOf([
        { program_id: 'C0502', program_name_th: 'ไม่ควรเกิด', department_id: DEPT_COMPUTER },
      ]),
    ),
  ]);

  for (const answer of answers) {
    assert.equal(answer.status, 403, `${answer.request.method} ${answer.request.url}`);
    assert.equal(answer.body.message, REFUSALS.forbidden);
  }

  const admin = await signInAs('U_FAC');
  assert.equal((await read(admin, 'C0501')).status, 404);
  assert.equal((await read(admin, 'C0502')).status, 404);
  const untouched = await read(admin, SEEDED.id);
  assert.equal(untouched.body.program.program_name_th, SEEDED.th);
  assert.equal(untouched.body.program.is_active, true);
});

test('a caller who has not signed in reaches none of it', async () => {
  const answers = await Promise.all([
    request(api.app).get('/api/programs'),
    request(api.app).post('/api/programs').send({ program_id: 'X0503' }),
    request(api.app).get('/api/programs/import-template'),
  ]);

  for (const answer of answers) assert.equal(answer.status, 401);
});

test('an edit that empties the year empties it', async () => {
  // The form sends every box on every save, so a year that arrives blank is a
  // year somebody cleared. Reading it as "leave the old one" would have told
  // the person their edit was saved while the table kept the old value.
  const cookie = await signInAs('U_FAC');
  const id = 'T5009';
  await create(cookie, {
    program_id: id,
    program_name_th: 'หลักสูตรทดสอบปี',
    department_id: DEPT_COMPUTER,
    year: '2565',
  });

  const cleared = await edit(cookie, id, { program_name_th: 'หลักสูตรทดสอบปี', year: '' });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.program.year, null);
  assert.equal((await read(cookie, id)).body.program.year, null);

  assert.equal((await remove(cookie, id)).status, 204);
});

test('a creation cannot ask for a programme that is already switched off', async () => {
  // Retiring one is the fourth criterion and happens on an edit or a removal.
  // Nothing in the ticket asks for a programme to be born inactive, so the
  // field is not read on a creation.
  const cookie = await signInAs('U_FAC');
  const id = 'T5010';
  const added = await create(cookie, {
    program_id: id,
    program_name_th: 'หลักสูตรที่ขอปิดตั้งแต่แรก',
    department_id: DEPT_COMPUTER,
    is_active: false,
  });

  assert.equal(added.status, 201);
  assert.equal(added.body.program.is_active, true);
  assert.equal((await remove(cookie, id)).status, 204);
});

test('a retired department is not offered, and nothing new may be filed under it', async () => {
  // The fourth criterion's second half, read for the department a programme is
  // chosen into: a record that is switched off "stops appearing in selection
  // lists". What the picker offers and what the writes accept stay the one
  // rule, so both ends are asserted again here.
  const cookie = await signInAs('U_FAC');
  await api.pool.query('UPDATE departments SET is_active = false WHERE department_id = $1', [
    DEPT_CIVIL,
  ]);

  try {
    const offered = await pickable(cookie);
    assert.ok(!offered.body.departments.some((row) => row.department_id === DEPT_CIVIL));

    const refused = await create(cookie, {
      program_id: 'T5011',
      program_name_th: 'หลักสูตรในภาควิชาที่ปิดแล้ว',
      department_id: DEPT_CIVIL,
    });
    assert.equal(refused.status, 403);
    assert.equal(refused.body.message, REFUSALS.departmentNotYours);

    // But a programme already filed under it is still editable, or retiring a
    // department would freeze the programmes underneath it.
    const id = 'T5012';
    await api.pool.query(
      `INSERT INTO programs (program_id, program_name_th, department_id)
       VALUES ($1, 'หลักสูตรเดิมของภาควิชานี้', $2)`,
      [id, DEPT_CIVIL],
    );
    const edited = await edit(cookie, id, { program_name_th: 'ชื่อใหม่', is_active: false });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.program.is_active, false);
    assert.equal((await remove(cookie, id)).status, 204);
  } finally {
    await api.pool.query('UPDATE departments SET is_active = true WHERE department_id = $1', [
      DEPT_CIVIL,
    ]);
  }
});

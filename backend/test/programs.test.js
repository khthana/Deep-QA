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
 * it from would pass whatever that constant said. Naming the four columns
 * independently is what makes the seventh criterion's template an assertion
 * instead of a tautology. `department_id` was among them until #282 (18 พ.ย.
 * 2569): a programme is filed under the department of the grant that records
 * it, so there is no department for the file to name.
 */
const COLUMNS = ['program_id', 'program_name_th', 'program_name_en', 'revision_year'];

const [DEPT_COMPUTER, DEPT_CIVIL] = DEPARTMENTS.map((department) => department.id);
const [SEEDED] = PROGRAMS;
/** The one seeded programme outside `05`, added by #102. Found by its
 * department rather than by index: PROGRAMS is appended to, and an index
 * would follow the next append somewhere else without saying so. */
const CIVIL = PROGRAMS.find((program) => program.department === DEPT_CIVIL);

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
  const cookie = await signInAs('U_DEPT');

  // No department in the body: since #282 it is the grant's.
  const added = await create(cookie, {
    program_id: 'T5001',
    program_name_th: 'วิศวกรรมหุ่นยนต์',
    program_name_en: 'Robotics Engineering',
    revision_year: '2566',
  });
  assert.equal(added.status, 201, added.body.message);
  assert.equal(added.body.program.program_name_th, 'วิศวกรรมหุ่นยนต์');
  assert.equal(
    added.body.program.department_id,
    DEPT_COMPUTER,
    'filed under the grant’s department',
  );
  assert.equal(added.body.program.revision_year, '2566');
  assert.equal(added.body.program.is_active, true);

  const edited = await edit(cookie, 'T5001', {
    program_name_th: 'วิศวกรรมหุ่นยนต์และระบบอัตโนมัติ',
    program_name_en: 'Robotics and Automation Engineering',
    revision_year: '2567',
  });
  assert.equal(edited.status, 200, edited.body.message);
  assert.equal(edited.body.program.program_name_th, 'วิศวกรรมหุ่นยนต์และระบบอัตโนมัติ');
  assert.equal(edited.body.program.revision_year, '2567');
  // An edit writes no department, so it is where it was.
  assert.equal(edited.body.program.department_id, DEPT_COMPUTER);

  const removed = await remove(cookie, 'T5001');
  assert.equal(removed.status, 204);
  assert.equal((await read(cookie, 'T5001')).status, 404);
});

test('the Faculty Admin is refused by the server on every endpoint — #282', async () => {
  // The owner's answer of 18 พ.ย. 2569, which replaced the second criterion
  // ("a Faculty Admin manages programmes in any department of the faculty"):
  // the faculty administrator keeps departments and accounts, and reaches no
  // programme. At the server, not only by a missing menu entry (#49).
  const cookie = await signInAs('U_FAC');

  try {
    const answers = await Promise.all([
      list(cookie),
      read(cookie, SEEDED.id),
      create(cookie, { program_id: 'F0501', program_name_th: 'ไม่ควรเกิด' }),
      edit(cookie, SEEDED.id, { program_name_th: 'ไม่ควรเกิด' }),
      remove(cookie, SEEDED.id),
      template(cookie),
      importCsv(cookie, csvOf([{ program_id: 'F0502', program_name_th: 'ไม่ควรเกิด' }])),
    ]);

    for (const answer of answers) {
      assert.equal(answer.status, 403, `${answer.request.method} ${answer.request.url}`);
      assert.equal(answer.body.message, REFUSALS.forbidden);
    }

    const admin = await signInAs('U_DEPT');
    assert.equal((await read(admin, 'F0501')).status, 404);
    assert.equal((await read(admin, 'F0502')).status, 404);
    const untouched = await read(admin, SEEDED.id);
    assert.equal(untouched.body.program.program_name_th, SEEDED.th);
    assert.equal(untouched.body.program.is_active, true);
  } finally {
    // Below the seam, because what this restores is what a mutant let through:
    // under `282:s282facultymaintains` the rename of `0501` stayed and failed
    // four later tests that read its name, which counted one kill five times
    // (measured 18 พ.ย. 2569; #89, #181).
    await api.pool.query(`DELETE FROM programs WHERE program_id IN ('F0501', 'F0502')`);
    await api.pool.query(
      'UPDATE programs SET program_name_th = $2, is_active = true WHERE program_id = $1',
      [SEEDED.id, SEEDED.th],
    );
  }
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

  // Their own department is theirs, so the refusals above are about the scope
  // and not about the role. (A creation naming somebody else's department was
  // refused here until #282; the body's department is no longer read, which
  // the test *a department named in the body is not read* below holds.)
  const own = await create(cookie, {
    program_id: 'T0102',
    program_name_th: 'วิศวกรรมโยธาและสิ่งแวดล้อม',
  });
  assert.equal(own.status, 201, own.body.message);
  assert.equal(own.body.program.department_id, DEPT_CIVIL);

  // And the list they see is their own department's, not the faculty's. Before
  // #102 the only row here was `T0102` - the one this caller had just made -
  // so the assertion could not tell *the curricula of my department* from
  // *every curriculum I have touched*. `0101` is seeded under `01` and belongs
  // to nobody's test, and `0501`/`0503` sit in `05` and are still absent, so
  // the list now has a boundary in it rather than an echo.
  const seen = await list(cookie, '?per_page=100');
  assert.deepEqual(
    seen.body.programs.map((row) => row.program_id),
    ['0101', 'T0102'],
  );

  // Nothing they were refused happened.
  const admin = await signInAs('U_DEPT');
  assert.equal((await read(admin, SEEDED.id)).body.program.program_name_th, SEEDED.th);
  assert.equal((await remove(cookie, 'T0102')).status, 204);
});

test('and the boundary runs the other way, on a curriculum no test made', async () => {
  // #102's third criterion, and the mirror of the test above. That one is `01`'s
  // administrator refused on a `05` curriculum; until #102 there was no other
  // direction to run it in, because every หลักสูตร in the seed lived in `05` and
  // the `05` administrator could only be refused on rows a test had just written
  // itself. `0101` is seeded, is in `01`, and belongs to nobody's test - which is
  // what makes this a boundary rather than a second copy of the same assertion.
  const cookie = await signInAs('U_DEPT');

  // Answered as though it were not there, for the same reason as the mirror: the
  // route is not a way of enumerating another department's curricula.
  assert.equal((await read(cookie, CIVIL.id)).status, 404);
  assert.equal((await edit(cookie, CIVIL.id, { program_name_th: 'ไม่ควรเกิด' })).status, 404);
  assert.equal((await remove(cookie, CIVIL.id)).status, 404);

  // And absent from the list rather than present and unopenable, which is the
  // half `reachablePrograms` decides.
  const seen = await list(cookie, '?per_page=100');
  assert.deepEqual(
    seen.body.programs.map((row) => row.program_id),
    PROGRAMS.filter((program) => program.department === DEPT_COMPUTER).map((program) => program.id),
  );

  // Nothing they were refused happened: the row is still there, under its own
  // name, for an account that may see it.
  const admin = await signInAs('U_DEPT2');
  assert.equal((await read(admin, CIVIL.id)).body.program.program_name_th, CIVIL.th);
});

test('a department administrator cannot move a programme out of their reach', async () => {
  // The other end of the third criterion. Until #282 an edit could name a
  // department and was refused when it named somebody else's; since then the
  // edit writes no department, so the move does not happen and the save of the
  // other fields does - the body's department is not read, rather than refused.
  const cookie = await signInAs('U_DEPT2');
  assert.equal(
    (
      await create(cookie, {
        program_id: 'T0103',
        program_name_th: 'วิศวกรรมสำรวจ',
      })
    ).status,
    201,
  );

  try {
    const moved = await edit(cookie, 'T0103', {
      program_name_th: 'วิศวกรรมสำรวจและแผนที่',
      department_id: DEPT_COMPUTER,
    });

    assert.equal(moved.status, 200, moved.body.message);
    const after = (await read(cookie, 'T0103')).body.program;
    assert.equal(after.department_id, DEPT_CIVIL, 'still in the editor’s own department');
    assert.equal(after.program_name_th, 'วิศวกรรมสำรวจและแผนที่');
  } finally {
    // Below the seam: under `282:s282putmoves` the row is in `05`, out of this
    // caller's reach, and a removal over HTTP left it for the pagination test
    // to count (measured 18 พ.ย. 2569; #89, #181).
    await api.pool.query(`DELETE FROM programs WHERE program_id = 'T0103'`);
  }
});

test('a referenced programme is deactivated instead of deleted', async () => {
  // The fourth criterion and the other half of the ninth. `0501` carries the
  // seeded PLOs, Program Subjects, students and Offerings, every one of those
  // references is ON DELETE RESTRICT, and the answer is not a refusal: the row
  // is switched off and the caller is told so.
  const cookie = await signInAs('U_DEPT');

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
    revision_year: SEEDED.revision_year,
    is_active: true,
  });
  assert.equal(on.body.program.is_active, true);
  assert.equal(on.body.program.revision_year, SEEDED.revision_year);
});

test('a department named in the body is not read: the programme lands in the grant’s — #282', async () => {
  // The owner's answer of 18 พ.ย. 2569: no department on the form, and a
  // programme filed under the department of the grant that records it. A body
  // that still names one - an old client, or somebody typing a request - names
  // somebody else's here, and the row lands in `01` all the same. Until #282
  // that request was refused with `departmentNotYours`; the picker it was
  // asked of (`GET /programs/departments`) is gone, and that path now reaches
  // the one-programme route as a code nobody has.
  const cookie = await signInAs('U_DEPT2');
  const made = await create(cookie, {
    program_id: 'T0104',
    program_name_th: 'วิศวกรรมทรัพยากรน้ำ',
    department_id: DEPT_COMPUTER,
  });
  try {
    assert.equal(made.status, 201, made.body.message);
    assert.equal(made.body.program.department_id, DEPT_CIVIL);
    assert.equal((await read(await signInAs('U_DEPT'), 'T0104')).status, 404, 'not in 05');

    const picker = await request(api.app).get('/api/programs/departments').set('Cookie', cookie);
    assert.equal(picker.status, 404);
    assert.equal(picker.body.message, REFUSALS.programNotFound);
  } finally {
    // Below the seam, for the same reason as the move above: under
    // `282:s282bodydepartment` the row lands in `05` (#89, #181).
    await api.pool.query(`DELETE FROM programs WHERE program_id = 'T0104'`);
  }
});

test('a duplicate identifier is refused rather than overwriting', async () => {
  const cookie = await signInAs('U_DEPT');

  const clash = await create(cookie, {
    program_id: SEEDED.id,
    program_name_th: 'อะไรก็ตาม',
    department_id: DEPT_COMPUTER,
  });

  assert.equal(clash.status, 409);
  assert.equal(clash.body.message, REFUSALS.duplicateProgramId);
  assert.equal((await read(cookie, SEEDED.id)).body.program.program_name_th, SEEDED.th);
});

test('a programme with no name or an unreadable year is refused', async () => {
  // A programme with no department was refused here too until #282; the
  // department is now the grant's, so a body without one is the normal case
  // (the first test in this file).
  const cookie = await signInAs('U_DEPT');

  const nameless = await create(cookie, { program_id: 'T9001' });
  assert.equal(nameless.status, 400);
  assert.equal(nameless.body.message, REFUSALS.invalidProgram);

  const undated = await create(cookie, {
    program_id: 'T9003',
    program_name_th: 'ปีพัง',
    department_id: DEPT_COMPUTER,
    revision_year: '25',
  });
  assert.equal(undated.status, 400);
  assert.equal(undated.body.message, REFUSALS.invalidProgram);

  for (const id of ['T9001', 'T9003']) assert.equal((await read(cookie, id)).status, 404);
});

test('the list paginates beyond ten rows', async () => {
  // The eighth criterion. The seed has two programmes, so the file makes enough
  // of its own to have a second page at all, then clears them up.
  const cookie = await signInAs('U_DEPT');
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
  // The 05 administrator's list: the seed's 05 programmes and these (#282).
  const seeded05 = PROGRAMS.filter((program) => program.department === DEPT_COMPUTER).length;
  assert.equal(first.body.total, made.length + seeded05);

  const second = await list(cookie, '?page=2');
  assert.equal(second.body.page, 2);
  assert.equal(second.body.programs.length, first.body.total - 10);
  const seen = new Set(first.body.programs.map((row) => row.program_id));
  assert.ok(second.body.programs.every((row) => !seen.has(row.program_id)));

  for (const id of made) assert.equal((await remove(cookie, id)).status, 204);
});

test('the template downloads and matches what the importer accepts', async (t) => {
  t.after(async () => remove(await signInAs('U_DEPT'), '0505'));
  // The seventh criterion, in both halves: the header is what this file names,
  // and the file it hands back is one the importer will take.
  const cookie = await signInAs('U_DEPT');

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
  // The seventh criterion's first half. Every row lands in the grant's
  // department (#282); until then the file carried a department column, so one
  // file could fill several.
  const cookie = await signInAs('U_DEPT');

  const response = await importCsv(
    cookie,
    csvOf([
      {
        program_id: 'I0501',
        program_name_th: 'วิศวกรรมซอฟต์แวร์',
        program_name_en: 'Software Engineering',
        revision_year: '2565',
      },
      { program_id: 'I0102', program_name_th: 'วิศวกรรมขนส่ง' },
    ]),
  );

  assert.equal(response.status, 201, response.body.message);
  assert.equal(response.body.created, 2);
  assert.deepEqual(response.body.errors, []);
  assert.deepEqual(
    response.body.programs.map((row) => row.department_id),
    [DEPT_COMPUTER, DEPT_COMPUTER],
  );
  // The English name and the year are optional, as the columns are.
  const sparse = (await read(cookie, 'I0102')).body.program;
  assert.equal(sparse.program_name_en, null);
  assert.equal(sparse.revision_year, null);

  for (const id of ['I0501', 'I0102']) assert.equal((await remove(cookie, id)).status, 204);
});

test('a spreadsheet with bad rows reports each failure and applies nothing', async () => {
  // The seventh criterion's second half, and the reason the import is one
  // transaction: the person fixes their file and uploads it again rather than
  // working out which half of it took. Five different failures, one good row
  // among them, and the good row must not survive.
  const cookie = await signInAs('U_DEPT');

  const response = await importCsv(
    cookie,
    csvOf([
      { program_id: 'B001', program_name_th: 'ดี' }, // line 2
      { program_id: '', program_name_th: 'ไม่มีรหัส' }, // line 3
      { program_id: 'B002', program_name_th: '' }, // line 4
      // A department that does not exist was this line's failure until #282,
      // when the file stopped naming one; an unreadable year takes its place.
      { program_id: 'B003', program_name_th: 'ปีพัง', revision_year: '25' }, // line 5
      { program_id: 'B001', program_name_th: 'ซ้ำ' }, // line 6
      { program_id: SEEDED.id, program_name_th: 'ชนของเดิม' }, // line 7
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
  assert.equal(response.body.errors[2].message, REFUSALS.invalidProgram);
  // The duplicate within the file names the line it collides with, which is
  // what the database's own 23505 could not have said.
  assert.equal(response.body.errors[3].message, `${REFUSALS.duplicateProgramId} (ซ้ำกับบรรทัดที่ 2)`);
  // A row colliding with the table, found at write time - and found *as well
  // as* the four above rather than instead of them.
  assert.equal(response.body.errors[4].message, REFUSALS.duplicateProgramId);

  assert.equal((await read(cookie, 'B001')).status, 404);
});

test('an old template’s department column is not read: the rows land in the grant’s — #282', async () => {
  // The third criterion again, on the import - because a rule the form enforces
  // and the spreadsheet does not is a rule with a way around it. Until #282 a
  // row naming somebody else's department was refused; the template no longer
  // carries the column, and a file made from the old one still imports, with
  // the column ignored rather than obeyed or refused (`csv.js` keeps unknown
  // headers and `readProgram` does not read this one).
  const cookie = await signInAs('U_DEPT2');

  const response = await importCsv(
    cookie,
    [
      'program_id,program_name_th,program_name_en,department_id,revision_year',
      `X0502,แม่แบบเก่า,,${DEPT_COMPUTER},`,
    ].join('\r\n'),
  );

  try {
    assert.equal(response.status, 201, response.body.message);
    assert.deepEqual(
      response.body.programs.map((row) => [row.program_id, row.department_id]),
      [['X0502', DEPT_CIVIL]],
    );
    assert.equal((await read(await signInAs('U_DEPT'), 'X0502')).status, 404, 'not in 05');
  } finally {
    await remove(cookie, 'X0502');
  }
});

test('an empty file is refused as such', async () => {
  const cookie = await signInAs('U_DEPT');

  const response = await importCsv(cookie, csvOf([]));

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importEmpty);
});


test('a departments file uploaded here is refused as the wrong template', async () => {
  // #56, the reverse direction. `department_id` is a column both templates
  // carry, so the file is not refused for having nothing in common with this
  // one - it is refused because `program_id` and `program_name_th`, which
  // `readProgram` requires of every row, are not in the header at all.
  const cookie = await signInAs('U_DEPT');

  const response = await importCsv(
    cookie,
    [
      'department_id,department_name_th,department_name_en',
      'T71,วิศวกรรมอาหาร,Food Engineering',
    ].join('\r\n'),
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.message, REFUSALS.importWrongTemplate);
  assert.deepEqual(response.body.errors, []);
  assert.equal(response.body.created, 0);
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

  const admin = await signInAs('U_DEPT');
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
  const cookie = await signInAs('U_DEPT');
  const id = 'T5009';
  await create(cookie, {
    program_id: id,
    program_name_th: 'หลักสูตรทดสอบปี',
    department_id: DEPT_COMPUTER,
    revision_year: '2565',
  });

  const cleared = await edit(cookie, id, {
    program_name_th: 'หลักสูตรทดสอบปี',
    revision_year: '',
  });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.program.revision_year, null);
  assert.equal((await read(cookie, id)).body.program.revision_year, null);

  assert.equal((await remove(cookie, id)).status, 204);
});

test('a creation cannot ask for a programme that is already switched off', async () => {
  // Retiring one is the fourth criterion and happens on an edit or a removal.
  // Nothing in the ticket asks for a programme to be born inactive, so the
  // field is not read on a creation.
  const cookie = await signInAs('U_DEPT');
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

test('nothing new may be filed under a retired department, and the sentence says it is retired — #282', async () => {
  // The fourth criterion's second half, read for the department a programme is
  // filed under. Since #282 that department is the administrator's own, so the
  // refusal is the owner's sentence of 18 พ.ย. 2569 - *ภาควิชาของคุณถูกปิดใช้งาน*
  // - and not `departmentNotYours`, which said the department was somebody
  // else's. Written out rather than read from REFUSALS for COLUMNS' reason.
  const RETIRED = 'ภาควิชาของคุณถูกปิดใช้งาน จึงเพิ่มหลักสูตรใหม่ไม่ได้';
  const cookie = await signInAs('U_DEPT2');
  await api.pool.query('UPDATE departments SET is_active = false WHERE department_id = $1', [
    DEPT_CIVIL,
  ]);

  try {
    const refused = await create(cookie, {
      program_id: 'T5011',
      program_name_th: 'หลักสูตรในภาควิชาที่ปิดแล้ว',
    });
    assert.equal(refused.status, 403);
    assert.equal(refused.body.message, RETIRED);

    // The same refusal reaches a spreadsheet, once for the file and not once
    // per row (#285) - the row at the end of this file reads one with more in it.
    const imported = await importCsv(
      cookie,
      csvOf([{ program_id: 'T5013', program_name_th: 'นำเข้าในภาควิชาที่ปิดแล้ว' }]),
    );
    assert.equal(imported.status, 400);
    assert.equal(imported.body.message, RETIRED);
    assert.deepEqual(imported.body.errors, []);
    for (const id of ['T5011', 'T5013']) assert.equal((await read(cookie, id)).status, 404);

    // But a programme already filed under it is still editable, or retiring a
    // department would freeze the programmes underneath it.
    const id = 'T5012';
    await api.pool.query(
      `INSERT INTO programs (program_id, program_name_th, department_id)
       VALUES ($1, 'หลักสูตรเดิมของภาควิชานี้', $2)`,
      [id, DEPT_CIVIL],
    );
    const edited = await edit(cookie, id, {
      program_name_th: 'ชื่อใหม่',
      is_active: false,
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.program.is_active, false);
    assert.equal((await remove(cookie, id)).status, 204);
  } finally {
    await api.pool.query('UPDATE departments SET is_active = true WHERE department_id = $1', [
      DEPT_CIVIL,
    ]);
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

test('adding, editing and removing a programme each write one line — #58', async () => {
  const cookie = await signInAs('U_DEPT');
  const before = (await logOf(DEPT)).length;

  assert.equal(
    (
      await create(cookie, {
        program_id: 'L101',
        program_name_th: 'หลักสูตรบันทึก',
        department_id: DEPT_COMPUTER,
      })
    ).status,
    201,
  );
  assert.equal((await edit(cookie, 'L101', { program_name_th: 'หลักสูตรบันทึกใหม่' })).status, 200);
  assert.equal((await remove(cookie, 'L101')).status, 204);

  assert.deepEqual(said((await logOf(DEPT)).slice(before)), [
    ['CREATE_PROGRAM', 'PROGRAM', 'L101'],
    ['UPDATE_PROGRAM', 'PROGRAM', 'L101'],
    ['DELETE_PROGRAM', 'PROGRAM', 'L101'],
  ]);
});

test('a removal the database turns into a deactivation says so — #58', async () => {
  // The fourth criterion's two outcomes are two different things to have
  // happened to the record, so they are two codes. `DELETE_PROGRAM` on a
  // programme that is still there and still referenced would be a line saying
  // the opposite of what the same request answered the caller.
  const cookie = await signInAs('U_DEPT');
  const before = (await logOf(DEPT)).length;

  const answer = await remove(cookie, SEEDED.id);
  assert.equal(answer.status, 200);
  assert.equal(answer.body.deactivated, true);

  assert.deepEqual(said((await logOf(DEPT)).slice(before)), [
    ['DEACTIVATE_PROGRAM', 'PROGRAM', SEEDED.id],
  ]);

  // Put the seeded programme back: a file that runs after this one reads the
  // register it was handed, and this one switched a row off.
  assert.equal((await edit(cookie, SEEDED.id, { program_name_th: SEEDED.th, program_name_en: SEEDED.en, department_id: SEEDED.department, revision_year: SEEDED.revision_year, is_active: true })).status, 200);
});

test('an import writes a line per row, sharing one timestamp — #58', async () => {
  const cookie = await signInAs('U_DEPT');
  const before = (await logOf(DEPT)).length;

  try {
    const imported = await importCsv(
      cookie,
      csvOf([
        {
          program_id: 'L102',
          program_name_th: 'หลักสูตรนำเข้าหนึ่ง',
          department_id: DEPT_COMPUTER,
        },
        {
          program_id: 'L103',
          program_name_th: 'หลักสูตรนำเข้าสอง',
          department_id: DEPT_COMPUTER,
        },
      ]),
    );
    assert.equal(imported.status, 201);

    const written = (await logOf(DEPT)).slice(before);
    assert.deepEqual(said(written), [
      ['IMPORT_PROGRAMS', 'PROGRAM', 'L102'],
      ['IMPORT_PROGRAMS', 'PROGRAM', 'L103'],
    ]);
    assert.deepEqual(written[0].time_stamp, written[1].time_stamp);
  } finally {
    await remove(cookie, 'L102');
    await remove(cookie, 'L103');
  }
});

test('a programme somebody manages is deactivated instead of deleted — #60', async (t) => {
  // The sixth reference, and the one the database cannot decide:
  // `user_roles.scope_id` is polymorphic and carries no foreign key on purpose
  // (ADR-0001, ADR-0002, and migration 0001 says so in its own words), so no
  // `23503` is raised and `lib/removal` deletes the row.
  //
  // The situation needs a programme with no PLO, no Program Subject, no student
  // and no rubric, because anything else on that list makes the DELETE fail for
  // a reason that is not this one. The seed's only such programme is `0101` and
  // it carries no grant, which is why no green suite has ever produced a
  // dangling grant: nothing in the seed can express the case.
  const admin = await signInAs('U_DEPT');
  const holder = ACCOUNTS.find((one) => one.alias === 'U_TEACH2');

  // Both of them, and whether or not the row passes. The `finally` below takes
  // the grant back so that the last assertion can be made at all; this takes
  // the programme back so that a failure before it does not leave `T0160` for
  // the files after this one to be handed (#132) or for the next sweep to count
  // as a kill (#89). Neither may be asserted here - they run after a red.
  t.after(async () => {
    await request(api.app)
      .delete(`/api/users/${holder.id}/roles/PROG_MANAGER/T0160`)
      .set('Cookie', admin);
    await remove(admin, 'T0160');
  });

  const made = await create(admin, {
    program_id: 'T0160',
    program_name_th: 'วิศวกรรมการจัดการสิทธิ์',
    program_name_en: 'Engineering Management',
    department_id: DEPT_COMPUTER,
    revision_year: '2569',
  });
  assert.equal(made.status, 201, made.body.message);

  const granted = await request(api.app)
    .post(`/api/users/${holder.id}/roles`)
    .set('Cookie', admin)
    .send({ role_id: 'PROG_MANAGER', scope_id: 'T0160' });
  assert.equal(granted.status, 201, granted.body.message);

  try {
    // A grant counts as a reference, so this programme is switched off rather
    // than destroyed, the same answer a PLO or a student already produces.
    const removed = await remove(admin, 'T0160');
    assert.equal(removed.status, 200, `expected a deactivation, got ${removed.status}`);
    assert.equal(removed.body.deactivated, true);
    assert.equal(removed.body.program.is_active, false);

    // Which is the criterion, read at the seam: the grant still names a
    // programme that exists. A 204 above would have left it naming nothing.
    const still = await read(admin, 'T0160');
    assert.equal(still.status, 200);
    const held = await request(api.app)
      .get(`/api/users/${holder.id}/roles`)
      .set('Cookie', admin);
    assert.ok(held.body.roles.some((row) => row.role_id === 'PROG_MANAGER' && row.scope_id === 'T0160'));
  } finally {
    await request(api.app)
      .delete(`/api/users/${holder.id}/roles/PROG_MANAGER/T0160`)
      .set('Cookie', admin);
  }

  // And with the grant gone it is deletable again, which is what says the grant
  // was the thing holding it rather than something this test left behind.
  assert.equal((await remove(admin, 'T0160')).status, 204);

  // The second criterion, and the only seam that can read it: the revoke above
  // left the row in place with `is_active` false - `routes/grants` keeps it so
  // that who granted it survives - so after the DELETE it would have been naming
  // a programme no table holds. No route serves an inactive grant, which is why
  // this is asked of the table and why dropping the row costs nobody anything.
  const { rows } = await api.pool.query(
    'SELECT is_active FROM user_roles WHERE scope_id = $1',
    ['T0160'],
  );
  assert.deepEqual(rows, []);
});

test('a revision year that is not a plausible Buddhist-era one is refused, and the era mistake is named — #177', async () => {
  // #177. The column holds the Buddhist-era year the registrar writes, and
  // until this ticket it was checked for shape alone: `2024` - the common-era
  // year for what somebody means as 2567 - was stored, and `9999` with it. The
  // owner's answer on 22 October 2569 was both links of the guard, with a
  // constant ceiling: no bound in this server's validation is derived from the
  // clock, so a ceiling of "a few years from now" would be the first that was,
  // and the day a test runs would decide what the test asserts (#52).
  //
  // The range and the two sentences are written out here rather than imported
  // from `lib/revisionYear.js`, for the reason COLUMNS is at the top of this
  // file: a test that asked the constant what the constant says would pass
  // whatever it said.
  const cookie = await signInAs('U_DEPT');

  // The mistake the ticket opens with: four digits, and a year this column
  // cannot mean. It is diagnosable, so the sentence does the arithmetic.
  const commonEra = await create(cookie, {
    program_id: 'T7701',
    program_name_th: 'ปีที่เป็น ค.ศ.',
    department_id: DEPT_COMPUTER,
    revision_year: '2024',
  });
  assert.equal(commonEra.status, 400);
  assert.equal(commonEra.body.message, REFUSALS.revisionYearEra(2024, 2567));

  // A typing mistake, whose Buddhist reading is no better: the useful thing to
  // say is the range, which is why this is a second sentence and not one.
  const typo = await create(cookie, {
    program_id: 'T7702',
    program_name_th: 'ปีพิมพ์ผิด',
    department_id: DEPT_COMPUTER,
    revision_year: '1234',
  });
  assert.equal(typo.status, 400);
  assert.equal(typo.body.message, REFUSALS.revisionYearOutOfRange(1234, 2500, 2600));

  const far = await create(cookie, {
    program_id: 'T7703',
    program_name_th: 'ปีไกล',
    department_id: DEPT_COMPUTER,
    revision_year: '9999',
  });
  assert.equal(far.status, 400);
  assert.equal(far.body.message, REFUSALS.revisionYearOutOfRange(9999, 2500, 2600));

  // The shape refusal keeps its own sentence, because the shape gate is still
  // asked first: `25` is not four digits and there is nothing to do arithmetic
  // with. The walked row that recorded that sentence (docs/acceptance/15 row
  // "ปีหลักสูตรต้องเป็นสี่หลัก") therefore still reads as it did (#60: the order
  // of two gates decides which sentence the caller gets).
  const short = await create(cookie, {
    program_id: 'T7704',
    program_name_th: 'ปีสั้น',
    department_id: DEPT_COMPUTER,
    revision_year: '25',
  });
  assert.equal(short.status, 400);
  assert.equal(short.body.message, REFUSALS.invalidProgram);

  for (const id of ['T7701', 'T7702', 'T7703', 'T7704']) {
    assert.equal((await read(cookie, id)).status, 404);
  }

  // And the other direction, which is what makes the refusals above measure
  // anything (#108): a guard that is "refuse only where X" is wrong in two
  // ways. Both edges of the range are inside it, and so is the year the seed
  // writes.
  for (const [id, year] of [['T7705', '2500'], ['T7706', '2600'], ['T7707', '2569']]) {
    const accepted = await create(cookie, {
      program_id: id,
      program_name_th: `ปี ${year}`,
      department_id: DEPT_COMPUTER,
      revision_year: year,
    });
    assert.equal(accepted.status, 201, `${year} was refused: ${accepted.body.message}`);
    assert.equal(accepted.body.program.revision_year, year);
    assert.equal((await remove(cookie, id)).status, 204);
  }
});

test('the same year refusal reaches an edit and a spreadsheet row — #177', async () => {
  // #177's second half: one reader, three callers. `readProgram` is what the
  // form, the edit and the import all read, so the sentence is the same one in
  // all three - the import's by way of `sentenceOf`, which is how a refusal
  // that names a value has reached a line number since #125.
  const cookie = await signInAs('U_DEPT');

  const made = await create(cookie, {
    program_id: 'T7708',
    program_name_th: 'ปีที่จะถูกแก้',
    department_id: DEPT_COMPUTER,
    revision_year: '2565',
  });
  assert.equal(made.status, 201);

  const edited = await edit(cookie, 'T7708', {
    program_name_th: 'ปีที่จะถูกแก้',
    department_id: DEPT_COMPUTER,
    revision_year: '2024',
  });
  assert.equal(edited.status, 400);
  assert.equal(edited.body.message, REFUSALS.revisionYearEra(2024, 2567));
  // The row keeps the year it had: a refused edit writes nothing.
  assert.equal((await read(cookie, 'T7708')).body.program.revision_year, '2565');
  assert.equal((await remove(cookie, 'T7708')).status, 204);

  const imported = await importCsv(
    cookie,
    csvOf([
      {
        program_id: 'T7709',
        program_name_th: 'แถวปีผิด',
        department_id: DEPT_COMPUTER,
        revision_year: '2024',
      },
    ]),
  );
  assert.equal(imported.status, 400);
  assert.deepEqual(imported.body.errors, [
    { line: 2, message: REFUSALS.revisionYearEra(2024, 2567) },
  ]);
  assert.equal((await read(cookie, 'T7709')).status, 404);
});

test('a search narrows the list to the programmes whose code, name or year holds it - #272', async () => {
  // The owner's answer of 12 November 2569, as on departments: code, both
  // names and the revision year the table shows, any case, the count following.
  const cookie = await signInAs('U_DEPT');
  const made = [
    {
      program_id: 'K001',
      program_name_th: 'หลักสูตรค้นเจอ',
      program_name_en: 'Findable Programme',
      department_id: DEPT_COMPUTER,
      revision_year: '2501',
    },
    {
      program_id: 'K002',
      program_name_th: 'หลักสูตรอื่น',
      program_name_en: 'Other Programme',
      department_id: DEPT_COMPUTER,
    },
  ];
  for (const row of made) assert.equal((await create(cookie, row)).status, 201);
  const ids = (response) => response.body.programs.map((row) => row.program_id);
  try {
    const byEnglish = await list(cookie, '?q=findable%20PROG');
    assert.equal(byEnglish.status, 200);
    assert.deepEqual(ids(byEnglish), ['K001'], 'the English name, whatever its case');
    assert.equal(byEnglish.body.total, 1, 'the count is the search count');

    assert.deepEqual(ids(await list(cookie, '?q=ค้นเจอ')), ['K001'], 'the Thai name');
    assert.deepEqual(ids(await list(cookie, '?q=k002')), ['K002'], 'the code');
    assert.deepEqual(ids(await list(cookie, '?q=2501')), ['K001'], 'the revision year');
    assert.equal((await list(cookie, '?q=K00_')).body.total, 0, 'an underscore matches itself');
  } finally {
    for (const row of made) await remove(cookie, row.program_id);
  }
});

test('a file under a retired department is refused once, before anything in it is read — #285', async () => {
  // The owner's answer of 19 พ.ย. 2569: the sentence once, not once per line,
  // and asked before the file is read - so a file that is also empty, or is
  // some other screen's, still hears that the department is retired, and a bad
  // row is not reported beside it. Three files, one claim each.
  const RETIRED = 'ภาควิชาของคุณถูกปิดใช้งาน จึงเพิ่มหลักสูตรใหม่ไม่ได้';
  const cookie = await signInAs('U_DEPT2');
  const ids = ['T5014', 'T5015', 'T5016'];
  await api.pool.query('UPDATE departments SET is_active = false WHERE department_id = $1', [
    DEPT_CIVIL,
  ]);

  try {
    // Three rows, one of them with no Thai name - a row the per-row report
    // would have named for a reason of its own.
    const many = await importCsv(
      cookie,
      csvOf([
        { program_id: ids[0], program_name_th: 'หลักสูตรแรก' },
        { program_id: ids[1], program_name_th: 'หลักสูตรที่สอง' },
        { program_id: ids[2] },
      ]),
    );
    assert.equal(many.status, 400, 'the file is refused');
    assert.equal(many.body.message, RETIRED, 'with the owner’s sentence');
    assert.deepEqual(many.body.errors, [], 'once, and no line is named');
    assert.equal(many.body.created, 0);

    const empty = await importCsv(cookie, '');
    assert.equal(empty.status, 400);
    assert.equal(empty.body.message, RETIRED, 'an empty file hears it before it hears it is empty');

    const other = await importCsv(cookie, 'department_id,department_name_th\r\n05,วิศวกรรม\r\n');
    assert.equal(other.status, 400);
    assert.equal(other.body.message, RETIRED, 'another screen’s file hears it before the template');
    // Read before the cleanup below, which would make it true either way.
    for (const id of ids) assert.equal((await read(cookie, id)).status, 404, `${id} was not written`);
  } finally {
    await api.pool.query('UPDATE departments SET is_active = true WHERE department_id = $1', [
      DEPT_CIVIL,
    ]);
    // Below the seam (#181): under a mutant that lets the file through, the
    // two good rows are written and the rows after this one would count them.
    await api.pool.query('DELETE FROM programs WHERE program_id = ANY($1)', [ids]);
  }
});

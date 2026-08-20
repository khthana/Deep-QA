'use strict';

/**
 * Ticket #18: the subjects a หลักสูตร is made of.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real.
 *
 * This is the first screen the Curriculum Committee owns, so the reach tests
 * are the point rather than a formality. U_COM administers 0501 and U_COM2
 * administers 0503, both under department 05 and both under the faculty - so
 * the eighth criterion is asserted between two grants that a coarser reach
 * would have let through, and the two administrators above them are asserted to
 * reach both.
 *
 * The catalogue the seed ships is one subject wide, which is not enough to
 * place, to page or to refuse on - so this file makes its own, with codes
 * beginning `P` so they sort clear of the seeded `01076105` and of #16's `T`.
 *
 * Two criteria are asserted somewhere other than in this file. *"Removal asks
 * for confirmation first"* is a dialog, and docs/06 settles that frontend
 * components are not unit-tested, so it is on the hand-worked checklist in
 * docs/acceptance/18. The visual half of *"the list paginates"* is there too;
 * the half that is a fact about the API - ten rows and a total - is here.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, PROGRAMS, SUBJECT } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * The template's three columns, written out here rather than imported from the
 * route, for #16's reason: a test comparing the served header against the
 * constant that built it would pass whatever that constant said.
 */
const COLUMNS = ['program_id', 'subject_id', 'subject_type'];

const [PROGRAM_COM, PROGRAM_INTL] = PROGRAMS.map((program) => program.id);

let api;
before(async () => {
  api = await startApi('program-subjects', { withSeed: true });
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
  request(api.app).get(`/api/program-subjects${query}`).set('Cookie', cookie);

const place = (cookie, body) =>
  request(api.app).post('/api/program-subjects').set('Cookie', cookie).send(body);

const edit = (cookie, program, subject, body) =>
  request(api.app)
    .put(`/api/program-subjects/${program}/${subject}`)
    .set('Cookie', cookie)
    .send(body);

const remove = (cookie, program, subject) =>
  request(api.app).delete(`/api/program-subjects/${program}/${subject}`).set('Cookie', cookie);

const template = (cookie) =>
  request(api.app).get('/api/program-subjects/import-template').set('Cookie', cookie);

const programs = (cookie) =>
  request(api.app).get('/api/program-subjects/programs').set('Cookie', cookie);

const catalogue = (cookie, query = '') =>
  request(api.app).get(`/api/program-subjects/catalogue${query}`).set('Cookie', cookie);

const importCsv = (cookie, csv) =>
  request(api.app)
    .post('/api/program-subjects/import')
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
 * A catalogue entry for this file to place. Made directly rather than through
 * `/api/subjects`, because what a subject *is* belongs to #16 and this suite
 * would otherwise fail whenever that screen changed.
 */
async function catalogueEntry(code, { department = '05', active = true } = {}) {
  await api.pool.query(
    `INSERT INTO subjects
       (subject_id, subject_name_th, subject_name_en, credits, department_id, is_active)
     VALUES ($1, $2, $3, 3, $4, $5)
     ON CONFLICT (subject_id) DO NOTHING`,
    [code, `รายวิชา ${code}`, `Subject ${code}`, department, active],
  );
  return code;
}

test('a curriculum committee member places a subject and changes its type', async () => {
  // Criteria one and two, end to end, on a pair this test owns.
  const cookie = await signInAs('U_COM');
  const code = await catalogueEntry('P0000001');

  const placed = await place(cookie, {
    program_id: PROGRAM_COM,
    subject_id: code,
    subject_type: 'required',
  });
  assert.equal(placed.status, 201, placed.body.message);
  assert.equal(placed.body.program_subject.program_id, PROGRAM_COM);
  assert.equal(placed.body.program_subject.subject_id, code);
  assert.equal(placed.body.program_subject.subject_type, 'required');
  assert.equal(placed.body.program_subject.is_active, true);
  // The screen shows a subject's name, not only its code, so the pair is
  // answered with the catalogue entry read alongside it.
  assert.equal(placed.body.program_subject.subject_name_th, `รายวิชา ${code}`);
  assert.equal(placed.body.program_subject.credits, 3);

  const changed = await edit(cookie, PROGRAM_COM, code, { subject_type: 'elective' });
  assert.equal(changed.status, 200, changed.body.message);
  assert.equal(changed.body.program_subject.subject_type, 'elective');

  const shown = await list(cookie, `?program_id=${PROGRAM_COM}&per_page=100`);
  assert.equal(shown.status, 200, shown.body.message);
  const row = shown.body.program_subjects.find((entry) => entry.subject_id === code);
  assert.equal(row.subject_type, 'elective');
});

test('a subject code not in the catalogue is refused, and says so', async () => {
  // The third criterion. `P9999999` is eight characters and well-formed; what
  // is wrong with it is that no such subject exists, and the refusal has to say
  // that rather than the flat "ข้อมูลไม่ถูกต้อง" a shape check would give.
  const cookie = await signInAs('U_COM');

  const refused = await place(cookie, {
    program_id: PROGRAM_COM,
    subject_id: 'P9999999',
    subject_type: 'required',
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.subjectNotInCatalogue);
});

test('a retired catalogue entry cannot be placed into a programme', async () => {
  // Not in the ticket in as many words, but the other half of the third
  // criterion: #16's removal switches a referenced subject off rather than
  // destroying it, and a subject the university has stopped teaching is not one
  // a curriculum may newly commit to.
  const cookie = await signInAs('U_COM');
  const code = await catalogueEntry('P0000002', { active: false });

  const refused = await place(cookie, {
    program_id: PROGRAM_COM,
    subject_id: code,
    subject_type: 'required',
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.subjectRetired);
});

test('the same subject cannot be placed into the same programme twice', async () => {
  // The fourth criterion. The pair is the primary key (ADR-0001 tier two), so
  // this is the database's answer rather than a check that could be forgotten.
  const cookie = await signInAs('U_COM');
  const code = await catalogueEntry('P0000003');

  const first = await place(cookie, {
    program_id: PROGRAM_COM,
    subject_id: code,
    subject_type: 'required',
  });
  assert.equal(first.status, 201, first.body.message);

  const second = await place(cookie, {
    program_id: PROGRAM_COM,
    subject_id: code,
    subject_type: 'elective',
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.message, REFUSALS.duplicateProgramSubject);

  // The same subject in a *different* programme is not a duplicate: that is
  // what a shared subject is.
  const elsewhere = await place(await signInAs('U_COM2'), {
    program_id: PROGRAM_INTL,
    subject_id: code,
    subject_type: 'required',
  });
  assert.equal(elsewhere.status, 201, elsewhere.body.message);
});

test('an unreferenced pair is removed, and a referenced one is switched off', async () => {
  // The fifth criterion, both branches. The seeded pair carries an Offering,
  // its CLOs and every mark under them, so it cannot be destroyed; the pair
  // this test makes carries nothing.
  const cookie = await signInAs('U_COM');
  const code = await catalogueEntry('P0000004');
  await place(cookie, { program_id: PROGRAM_COM, subject_id: code, subject_type: 'required' });

  const deleted = await remove(cookie, PROGRAM_COM, code);
  assert.equal(deleted.status, 204);
  const gone = await request(api.app)
    .get(`/api/program-subjects/${PROGRAM_COM}/${code}`)
    .set('Cookie', cookie);
  assert.equal(gone.status, 404);
  assert.equal(gone.body.message, REFUSALS.programSubjectNotFound);

  const kept = await remove(cookie, PROGRAM_COM, SUBJECT.id);
  assert.equal(kept.status, 200, kept.body.message);
  assert.equal(kept.body.deactivated, true);
  assert.equal(kept.body.program_subject.is_active, false);

  // And it is still listed, because this is the screen it is switched back on
  // from - a management list that hid it would make the removal a one-way door.
  const shown = await list(cookie, `?program_id=${PROGRAM_COM}&per_page=100`);
  const row = shown.body.program_subjects.find((entry) => entry.subject_id === SUBJECT.id);
  assert.equal(row.is_active, false);

  const back = await edit(cookie, PROGRAM_COM, SUBJECT.id, {
    subject_type: row.subject_type,
    is_active: true,
  });
  assert.equal(back.status, 200, back.body.message);
  assert.equal(back.body.program_subject.is_active, true);
});

test('a curriculum committee member is refused on another programme', async () => {
  // The eighth criterion, enforced at the server on every verb rather than by
  // the screen not drawing the other programme. U_COM2 holds 0503; 0501 is
  // U_COM's, sits in the same department and under the same faculty, and is
  // still none of their business.
  const cookie = await signInAs('U_COM2');
  const code = await catalogueEntry('P0000005');

  const placed = await place(cookie, {
    program_id: PROGRAM_COM,
    subject_id: code,
    subject_type: 'required',
  });
  assert.equal(placed.status, 403);
  assert.equal(placed.body.message, REFUSALS.programNotYours);

  // The pair really does exist - U_COM placed it in the first test - and is
  // answered "not found" rather than "not yours", so the endpoint cannot be
  // used to discover what another programme teaches.
  const changed = await edit(cookie, PROGRAM_COM, 'P0000001', { subject_type: 'required' });
  assert.equal(changed.status, 404);
  assert.equal(changed.body.message, REFUSALS.programSubjectNotFound);

  const removed = await remove(cookie, PROGRAM_COM, 'P0000001');
  assert.equal(removed.status, 404);

  // And the list filter narrows within the reach rather than widening it.
  const shown = await list(cookie, `?program_id=${PROGRAM_COM}&per_page=100`);
  assert.equal(shown.status, 200);
  assert.equal(shown.body.program_subjects.length, 0);
  assert.equal(shown.body.total, 0);
});

test('the administrators above a programme reach it', async () => {
  // The other direction of the same rule: a reach that refused U_COM2 by
  // refusing everyone would pass the test above and be wrong. The department
  // administrator of 05 and the faculty administrator both maintain 0501; the
  // administrator of department 01 does not.
  const code = await catalogueEntry('P0000006');

  const byDept = await place(await signInAs('U_DEPT'), {
    program_id: PROGRAM_COM,
    subject_id: code,
    subject_type: 'elective',
  });
  assert.equal(byDept.status, 201, byDept.body.message);

  const byFaculty = await edit(await signInAs('U_FAC'), PROGRAM_COM, code, {
    subject_type: 'required',
  });
  assert.equal(byFaculty.status, 200, byFaculty.body.message);

  const byStranger = await place(await signInAs('U_DEPT2'), {
    program_id: PROGRAM_COM,
    subject_id: code,
    subject_type: 'required',
  });
  assert.equal(byStranger.status, 403);
  assert.equal(byStranger.body.message, REFUSALS.programNotYours);
});

test('the screen is refused to a role that does not maintain curricula', async () => {
  // FULL_ADMIN is absent from the maintainers for ADR-0002's reason - the
  // central administrator keeps accounts, not curricula - and a teacher has no
  // business editing what their programme is made of.
  for (const alias of ['U_ADMIN', 'U_TEACH']) {
    const cookie = await signInAs(alias);
    const shown = await list(cookie);
    assert.equal(shown.status, 403, `${alias} was allowed the list`);
    assert.equal(shown.body.message, REFUSALS.forbidden);
  }
});

test('the pickers offer exactly what the writes will accept', async () => {
  // The two dropdowns the screen is built from. The programme picker is the
  // reach itself, so what it offers and what a write accepts cannot come apart;
  // the catalogue picker is deliberately wider than the reach, because a
  // computer engineering curriculum contains mathematics and general education
  // subjects owned by other departments.
  const mine = await programs(await signInAs('U_COM'));
  assert.equal(mine.status, 200, mine.body.message);
  assert.deepEqual(
    mine.body.programs.map((program) => program.program_id),
    [PROGRAM_COM],
  );

  const faculty = await programs(await signInAs('U_FAC'));
  assert.deepEqual(
    faculty.body.programs.map((program) => program.program_id).sort(),
    [PROGRAM_COM, PROGRAM_INTL],
  );

  const foreign = await catalogueEntry('P0000007', { department: '01' });
  const offered = await catalogue(await signInAs('U_COM'), '?q=P0000007');
  assert.equal(offered.status, 200, offered.body.message);
  assert.deepEqual(
    offered.body.subjects.map((subject) => subject.subject_id),
    [foreign],
  );

  // Retired entries are not offered, because placing one is refused.
  await catalogueEntry('P0000008', { active: false });
  const retired = await catalogue(await signInAs('U_COM'), '?q=P0000008');
  assert.deepEqual(retired.body.subjects, []);
});

test('the template carries the three columns and one example row', async () => {
  // The seventh criterion's first half.
  const answer = await template(await signInAs('U_COM'));
  assert.equal(answer.status, 200);
  assert.match(answer.headers['content-type'], /text\/csv/);
  assert.match(answer.headers['content-disposition'], /program-subjects-template\.csv/);

  const [header, example] = answer.text.replace(/^﻿/, '').trim().split('\r\n');
  assert.deepEqual(header.split(','), COLUMNS);
  assert.equal(example.split(',').length, COLUMNS.length);
});

test('an import applies every row or none of them', async () => {
  // The seventh criterion's second half: the shared module, and a report that
  // names the line. The first file is rejected on three separate grounds and
  // writes nothing - including the row that was perfectly good.
  const cookie = await signInAs('U_COM');
  const good = await catalogueEntry('P0000010');
  await catalogueEntry('P0000011');

  const rejected = await importCsv(
    cookie,
    csvOf([
      { program_id: PROGRAM_COM, subject_id: good, subject_type: 'required' },
      { program_id: PROGRAM_COM, subject_id: 'P9999998', subject_type: 'required' },
      { program_id: PROGRAM_COM, subject_id: good, subject_type: 'elective' },
      { program_id: PROGRAM_INTL, subject_id: 'P0000011', subject_type: 'required' },
      { program_id: PROGRAM_COM, subject_id: 'P0000011', subject_type: 'ทั้งสอง' },
    ]),
  );
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.created, 0);
  assert.deepEqual(
    rejected.body.errors.map((error) => error.line),
    [3, 4, 5, 6],
  );
  assert.equal(rejected.body.errors[0].message, REFUSALS.subjectNotInCatalogue);
  assert.match(rejected.body.errors[1].message, /บรรทัดที่ 2/);
  assert.equal(rejected.body.errors[2].message, REFUSALS.programNotYours);
  assert.equal(rejected.body.errors[3].message, REFUSALS.invalidProgramSubject);

  const nothing = await request(api.app)
    .get(`/api/program-subjects/${PROGRAM_COM}/${good}`)
    .set('Cookie', cookie);
  assert.equal(nothing.status, 404);

  const accepted = await importCsv(
    cookie,
    csvOf([
      { program_id: PROGRAM_COM, subject_id: good, subject_type: 'required' },
      { program_id: PROGRAM_COM, subject_id: 'P0000011', subject_type: 'elective' },
    ]),
  );
  assert.equal(accepted.status, 201, accepted.body.message);
  assert.equal(accepted.body.created, 2);
  assert.equal(accepted.body.errors.length, 0);

  const written = await request(api.app)
    .get(`/api/program-subjects/${PROGRAM_COM}/${good}`)
    .set('Cookie', cookie);
  assert.equal(written.status, 200);
  assert.equal(written.body.program_subject.subject_type, 'required');

  const empty = await importCsv(cookie, csvOf([]));
  assert.equal(empty.status, 400);
  assert.equal(empty.body.message, REFUSALS.importEmpty);
});

test('the list pages ten at a time', async () => {
  // The ninth criterion. 0503 is used rather than 0501 so the count is this
  // test's own and does not move when a test above places one more pair.
  const cookie = await signInAs('U_COM2');
  for (let index = 0; index < 12; index += 1) {
    const code = await catalogueEntry(`P2${String(index).padStart(6, '0')}`);
    await place(cookie, {
      program_id: PROGRAM_INTL,
      subject_id: code,
      subject_type: 'required',
    });
  }

  const first = await list(cookie, `?program_id=${PROGRAM_INTL}`);
  assert.equal(first.status, 200, first.body.message);
  assert.equal(first.body.program_subjects.length, 10);
  assert.equal(first.body.page, 1);
  assert.equal(first.body.per_page, 10);
  assert.ok(first.body.total >= 12);

  const second = await list(cookie, `?program_id=${PROGRAM_INTL}&page=2`);
  assert.equal(second.body.page, 2);
  assert.ok(second.body.program_subjects.length >= 2);
  // Disjoint pages, ordered by code, which is what makes paging navigation
  // rather than a lottery.
  const codes = first.body.program_subjects.map((row) => row.subject_id);
  assert.ok(second.body.program_subjects.every((row) => !codes.includes(row.subject_id)));
  assert.deepEqual(codes, [...codes].sort());
});

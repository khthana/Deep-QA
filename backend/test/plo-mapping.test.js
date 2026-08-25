'use strict';

/**
 * Ticket #20: how strongly each รายวิชา of a หลักสูตร serves each PLO of it.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real.
 *
 * Five things about this file are decisions rather than habit, and each is a
 * place where reading the ticket quickly would have produced the wrong test.
 *
 * *The third criterion cannot be a 409.* "Saving an already-set cell updates it
 * rather than creating a second mapping" reads like a duplicate refusal, and a
 * duplicate refusal is exactly what would make it unprovable: the primary key
 * of `subject_plo_mapping` is `(program_id, subject_id, outcome_id)`, so a
 * second row for one cell is not something the route has to prevent - the
 * database cannot hold it. What the criterion is actually about is which of the
 * two shapes the route takes, refuse or upsert, and it asks for upsert. So the
 * test saves twice and asserts the *count* is one and the *level* is the
 * second, which fails on a route that refuses the second save and on one that
 * writes a second row into a table that would let it.
 *
 * *The fourth criterion is about no rows, not about placeholder rows.* The
 * migration is explicit that "an unmapped subject is one with no rows" and that
 * the inherited `createEmptyMapping` is dead code. The delivered system wrote
 * placeholders from two paths - `docs/05` shows the programme's subject import
 * and the PLO creation both reaching for `subjectPloMappingModel` - and copying
 * that would have made the criterion untestable, because every cell would
 * always have a row. Placing a subject and creating an outcome are therefore
 * asserted to leave the table alone.
 *
 * *`E` is a value a person chooses, and it is not the same as an empty cell.*
 * The enum's five members are the ticket's five levels, `E` among them, and the
 * migration says what `E` means: this named PLO is *not* served by this subject.
 * That is a statement, and silence is not. Both draw pale on screen, so the
 * distinction lives here: choosing `E` writes a row, and a cell nobody has
 * touched has none.
 *
 * *`FACULTY_ADMIN` is on the refused side.* The ticket says nothing either way,
 * but #79 names A10 - this screen - as one of the four it binds: the faculty
 * keeps the list of หลักสูตร, and what is inside one is decided below it.
 *
 * *The grid is ข้อหลัก wide, not every-PLO wide.* #100 corrected the first
 * criterion after the export was looked at: fifty-two columns on one landscape
 * page is not something a person reads. So a ข้อย่อย is not a column, and the
 * coverage a subject is credited with is coverage of the ข้อหลัก somewhere
 * beneath it - the trade the delivered system had already made, and which the
 * rebuild had undone by reading "every PLO" literally.
 *
 * *The fifth criterion is not here at all.* "Exports to PDF with Thai
 * characters rendering correctly" is a fact about a file a browser builds, and
 * this seam never sees it. Its halves are in `e2e/tests/20a-plo-mapping.spec.js`
 * and on the hand-worked checklist in `docs/acceptance/20`.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, PROGRAM, PROGRAM_INTL, SUBJECT } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * `mapping_level`, exactly - written out rather than imported from the route,
 * for #16's reason: a test comparing the accepted set against the constant that
 * built it would pass whatever that constant said.
 */
const LEVELS = ['E', 'I', 'D', 'P', 'A'];

let api;
before(async () => {
  api = await startApi('plo_mapping', { withSeed: true });
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

const grid = (cookie, query = '') =>
  request(api.app).get(`/api/plo-mapping${query}`).set('Cookie', cookie);

const save = (cookie, body) =>
  request(api.app).put('/api/plo-mapping').set('Cookie', cookie).send(body);

/** How many rows one cell has, asked of the table rather than of the API. */
async function rowsFor(programId, subjectId, outcomeId) {
  const { rows } = await api.pool.query(
    `SELECT mapping_level FROM subject_plo_mapping
      WHERE program_id = $1 AND subject_id = $2 AND outcome_id = $3`,
    [programId, subjectId, outcomeId],
  );
  return rows;
}

/** A distinct subject per call, so tests neither collide nor rerun dirty. */
let counter = 0;
const nextSubject = () => `Z${String((counter += 1)).padStart(7, '0')}`;

/**
 * A subject in the catalogue and in a หลักสูตร, written straight into the
 * tables.
 *
 * Not through `/api/program-subjects`, deliberately: that route belongs to #18
 * and reaching for it here would make this file fail when that one changes, on
 * a rule it is not about. What #20 needs is the pair existing.
 */
async function place(programId, { active = true } = {}) {
  const subjectId = nextSubject();
  await api.pool.query(
    `INSERT INTO subjects (subject_id, subject_name_en, subject_name_th, credits, department_id)
     VALUES ($1, $2, $3, 3, '05')`,
    [subjectId, `Subject ${subjectId}`, `รายวิชาทดสอบ ${subjectId}`],
  );
  await api.pool.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type, is_active)
     VALUES ($1, $2, 'required', $3)`,
    [programId, subjectId, active],
  );
  return subjectId;
}

/** An outcome of a หลักสูตร, written straight in, for the same reason. */
async function outcome(programId, { active = true, code = null, parent = null } = {}) {
  const { rows } = await api.pool.query(
    `INSERT INTO learning_outcomes (
       program_id, outcome_code, outcome_title, outcome_type, sequence_order, level_depth,
       parent_outcome_id, is_active
     )
     VALUES ($1, $2, 'ผลการเรียนรู้สำหรับการทดสอบ', 'knowledge', 90, $4, $5, $3)
     RETURNING outcome_id`,
    [programId, code ?? nextSubject(), active, parent ? 2 : 1, parent],
  );
  return rows[0].outcome_id;
}

test('the grid answers with every subject of the curriculum against every ข้อหลัก of it', async () => {
  // The first criterion. Both axes are asserted against the seed rather than
  // against rows this test made, because the criterion is about what the screen
  // shows a person who has not touched anything.
  const cookie = await signInAs('U_COM');
  const response = await grid(cookie, `?program_id=${PROGRAM}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.program.program_id, PROGRAM);

  const subjects = response.body.subjects.map((row) => row.subject_id);
  assert.ok(subjects.includes(SUBJECT.id), 'the seeded pairing is a row of the grid');
  assert.ok(
    response.body.subjects.every((row) => row.subject_name_th),
    'a subject is named, not only numbered - the column a person reads',
  );

  // Every active ข้อหลัก of the curriculum and nothing below it (#100). The
  // seed's 0501 holds thirteen ข้อหลัก and thirty-nine ข้อย่อย; the grid is
  // thirteen columns wide, because fifty-two is a page nobody can read.
  const codes = response.body.outcomes.map((row) => row.outcome_code);
  assert.ok(codes.includes('PLO-1'), 'a ข้อหลัก is a column');
  assert.equal(codes.length, 13, 'thirteen ข้อหลัก, not fifty-two outcomes');
  assert.ok(!codes.includes('PLO-1-1'), 'a ข้อย่อย is not a column');
  assert.ok(
    response.body.outcomes.every((row) => row.level_depth === 1),
    'every column the grid draws is a ข้อหลัก',
  );
  assert.ok(
    response.body.outcomes.every((row) => row.parent_outcome_id === null),
    'and none of them hangs under another',
  );

  // In sequence order, the order a person reads them in on the หลักสูตร - sorting
  // on this side would move the decision somewhere no test watches.
  const ordered = [...response.body.outcomes].sort(
    (a, b) => a.sequence_order - b.sequence_order || (a.outcome_id < b.outcome_id ? -1 : 1),
  );
  assert.deepEqual(
    response.body.outcomes.map((row) => row.outcome_id),
    ordered.map((row) => row.outcome_id),
    'the columns come back in sequence order',
  );

  // And the cells the seed filled: 01076105 is mapped to eight of the thirteen.
  const mapped = response.body.mappings.filter((row) => row.subject_id === SUBJECT.id);
  assert.equal(mapped.length, 8);
  assert.ok(
    mapped.every((row) => LEVELS.includes(row.mapping_level)),
    'every level answered is one of the five',
  );
});

test('a cell takes each of the five levels in turn, and each one persists', async () => {
  // The second criterion, and the half of the seventh about the permitted set.
  // Each level is written and then read back through the grid rather than out
  // of the write's own answer, so a route that replies with what it was sent
  // and stores nothing fails here.
  const cookie = await signInAs('U_COM');
  const subjectId = await place(PROGRAM);
  const outcomeId = await outcome(PROGRAM);

  for (const level of LEVELS) {
    const written = await save(cookie, {
      program_id: PROGRAM,
      subject_id: subjectId,
      outcome_id: outcomeId,
      mapping_level: level,
    });
    assert.equal(written.status, 200, `${level} refused: ${written.body.message}`);
    assert.equal(written.body.mapping.mapping_level, level);

    const response = await grid(cookie, `?program_id=${PROGRAM}`);
    const cell = response.body.mappings.find(
      (row) => row.subject_id === subjectId && row.outcome_id === outcomeId,
    );
    assert.equal(cell.mapping_level, level, `${level} did not survive the round trip`);
  }
});

test('a level outside the five is refused, and nothing is written', async () => {
  // The other half of the seventh criterion. `X` is refused for being outside
  // the set; the empty string for being nothing at all. Neither may fall
  // through to the database, where the enum would raise a fault the route has
  // no sentence for.
  const cookie = await signInAs('U_COM');
  const subjectId = await place(PROGRAM);
  const outcomeId = await outcome(PROGRAM);

  for (const level of ['X', 'e', '', null, 'Introduced']) {
    const refused = await save(cookie, {
      program_id: PROGRAM,
      subject_id: subjectId,
      outcome_id: outcomeId,
      mapping_level: level,
    });
    assert.equal(refused.status, 400, `${JSON.stringify(level)} was not refused`);
    assert.equal(refused.body.message, REFUSALS.invalidMapping);
  }

  assert.equal((await rowsFor(PROGRAM, subjectId, outcomeId)).length, 0);
});

test('saving a cell twice updates the one row rather than adding a second', async () => {
  // The third criterion, asserted on the table and not on the API: the count is
  // the claim. A route that answered 409 to the second save would fail on the
  // level, and one that wrote a second row would fail on the count.
  const cookie = await signInAs('U_COM');
  const subjectId = await place(PROGRAM);
  const outcomeId = await outcome(PROGRAM);

  const body = { program_id: PROGRAM, subject_id: subjectId, outcome_id: outcomeId };
  const first = await save(cookie, { ...body, mapping_level: 'I' });
  assert.equal(first.status, 200);

  const second = await save(cookie, { ...body, mapping_level: 'A' });
  assert.equal(second.status, 200, `the second save was refused: ${second.body.message}`);
  assert.equal(second.body.mapping.mapping_level, 'A');

  const rows = await rowsFor(PROGRAM, subjectId, outcomeId);
  assert.equal(rows.length, 1, 'one cell, one row');
  assert.equal(rows[0].mapping_level, 'A');
});

test('a newly placed subject and a newly created outcome both start with no rows at all', async () => {
  // The fourth criterion. "Cells default to empty" is a claim about the
  // *absence* of rows, so it is asserted as an absence: placing a subject and
  // writing an outcome each leave `subject_plo_mapping` exactly as it was.
  const cookie = await signInAs('U_COM');
  const before = await api.pool.query(
    `SELECT count(*)::int AS total FROM subject_plo_mapping WHERE program_id = $1`,
    [PROGRAM],
  );

  const subjectId = await place(PROGRAM);
  const outcomeId = await outcome(PROGRAM);

  const after = await api.pool.query(
    `SELECT count(*)::int AS total FROM subject_plo_mapping WHERE program_id = $1`,
    [PROGRAM],
  );
  assert.equal(after.rows[0].total, before.rows[0].total, 'neither wrote a placeholder row');

  // And the grid says so by leaving the cell out, rather than by answering it
  // as `E` - which is a level a person chooses and means something narrower.
  const response = await grid(cookie, `?program_id=${PROGRAM}`);
  assert.ok(
    response.body.subjects.some((row) => row.subject_id === subjectId),
    'the new subject is a row of the grid',
  );
  assert.ok(
    response.body.outcomes.some((row) => row.outcome_id === outcomeId),
    'the new outcome is a column of the grid',
  );
  assert.equal(
    response.body.mappings.filter(
      (row) => row.subject_id === subjectId || row.outcome_id === outcomeId,
    ).length,
    0,
    'and neither has a cell',
  );
});

test('choosing E writes a row, which is not the same state as a cell nobody has touched', async () => {
  // `E` is one of the ticket's five levels and the migration says what it
  // means: this named outcome is *not* served by this subject. An untouched
  // cell says nothing. The two draw alike and are different rows, so the
  // difference is asserted here or nowhere.
  const cookie = await signInAs('U_COM');
  const subjectId = await place(PROGRAM);
  const outcomeId = await outcome(PROGRAM);

  assert.equal((await rowsFor(PROGRAM, subjectId, outcomeId)).length, 0);

  const written = await save(cookie, {
    program_id: PROGRAM,
    subject_id: subjectId,
    outcome_id: outcomeId,
    mapping_level: 'E',
  });
  assert.equal(written.status, 200);

  const rows = await rowsFor(PROGRAM, subjectId, outcomeId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].mapping_level, 'E');
});

test('a committee member of another curriculum is refused on both the reading and the writing', async () => {
  // The sixth criterion, walked in both directions: a reach that refuses
  // everybody passes half of it, so the same account is shown succeeding on its
  // own curriculum immediately afterwards.
  const other = await signInAs('U_COM2');
  const subjectId = await place(PROGRAM);
  const outcomeId = await outcome(PROGRAM);

  const read = await grid(other, `?program_id=${PROGRAM}`);
  assert.equal(read.status, 403);
  assert.equal(read.body.message, REFUSALS.mappingProgramNotYours);

  const write = await save(other, {
    program_id: PROGRAM,
    subject_id: subjectId,
    outcome_id: outcomeId,
    mapping_level: 'D',
  });
  assert.equal(write.status, 403);
  assert.equal(write.body.message, REFUSALS.mappingProgramNotYours);
  assert.equal((await rowsFor(PROGRAM, subjectId, outcomeId)).length, 0);

  // The other half: the same account reaches its own curriculum.
  const own = await grid(other, `?program_id=${PROGRAM_INTL}`);
  assert.equal(own.status, 200);
  assert.equal(own.body.program.program_id, PROGRAM_INTL);
});

test('the department administrator above both curricula reaches each of them', async () => {
  // The reach is the grant's, not the screen's, and a rule that only let the
  // committee in would leave the ผู้ดูแลภาควิชา unable to see the coverage of
  // the curricula they are answerable for.
  const cookie = await signInAs('U_DEPT');
  for (const programId of [PROGRAM, PROGRAM_INTL]) {
    const response = await grid(cookie, `?program_id=${programId}`);
    assert.equal(response.status, 200, `${programId} refused: ${response.body.message}`);
    assert.equal(response.body.program.program_id, programId);
  }
});

test('the faculty administrator, the central administrator and a teacher are all refused', async () => {
  // #79 puts `FACULTY_ADMIN` outside a curriculum: the faculty keeps the list
  // of หลักสูตร, and A10 is one of the four screens it names. `FULL_ADMIN` is
  // out by docs/06's separation of duties, and a teacher serving an outcome is
  // not the same as a committee deciding which subject serves it.
  for (const alias of ['U_FAC', 'U_ADMIN', 'U_TEACH']) {
    const cookie = await signInAs(alias);
    const read = await grid(cookie, `?program_id=${PROGRAM}`);
    assert.equal(read.status, 403, `${alias} was let in to read`);
    assert.equal(read.body.message, REFUSALS.forbidden);

    const write = await save(cookie, {
      program_id: PROGRAM,
      subject_id: SUBJECT.id,
      outcome_id: 1,
      mapping_level: 'I',
    });
    assert.equal(write.status, 403, `${alias} was let in to write`);
    assert.equal(write.body.message, REFUSALS.forbidden);
  }
});

test('a subject outside the curriculum and an outcome of another one are each refused their own sentence', async () => {
  // Two ways a well-formed body can name a cell that is not on this grid, and
  // they are different mistakes: one column, one row. The composite foreign
  // keys would refuse both anyway - what these checks add is a sentence saying
  // which of the two went wrong, rather than a 500 from a constraint.
  const cookie = await signInAs('U_COM');
  const elsewhere = await place(PROGRAM_INTL);
  const mine = await place(PROGRAM);
  const theirs = await outcome(PROGRAM_INTL);
  const ours = await outcome(PROGRAM);

  const wrongSubject = await save(cookie, {
    program_id: PROGRAM,
    subject_id: elsewhere,
    outcome_id: ours,
    mapping_level: 'I',
  });
  assert.equal(wrongSubject.status, 404);
  assert.equal(wrongSubject.body.message, REFUSALS.mappingSubjectNotInProgram);

  const wrongOutcome = await save(cookie, {
    program_id: PROGRAM,
    subject_id: mine,
    outcome_id: theirs,
    mapping_level: 'I',
  });
  assert.equal(wrongOutcome.status, 404);
  assert.equal(wrongOutcome.body.message, REFUSALS.mappingOutcomeNotInProgram);
});

test('a grid asked for without a curriculum is refused rather than answered with all of them', async () => {
  // The grid is one curriculum's coverage; there is no such thing as the grid
  // of every curriculum at once, because the columns of one are not the columns
  // of another. So a missing `program_id` is a malformed request and not a
  // request for everything.
  const cookie = await signInAs('U_COM');
  for (const query of ['', '?program_id=']) {
    const refused = await grid(cookie, query);
    assert.equal(refused.status, 400, `"${query}" was answered`);
    assert.equal(refused.body.message, REFUSALS.mappingProgramMissing);
  }
});

test('a switched-off pairing leaves the grid while the cells it had stay in the table', async () => {
  // A pairing that has been switched off is a subject the curriculum no longer
  // teaches, and the coverage grid is what the accreditation submission is
  // built from - so it is not a row. Its cells are not deleted either: #18
  // switches a pairing off precisely so that it can be switched back on, and a
  // grid that quietly threw the coverage away would make that a one-way door.
  const cookie = await signInAs('U_COM');
  const subjectId = await place(PROGRAM);
  const outcomeId = await outcome(PROGRAM);

  await save(cookie, {
    program_id: PROGRAM,
    subject_id: subjectId,
    outcome_id: outcomeId,
    mapping_level: 'P',
  });

  await api.pool.query(
    `UPDATE program_subjects SET is_active = false WHERE program_id = $1 AND subject_id = $2`,
    [PROGRAM, subjectId],
  );

  const response = await grid(cookie, `?program_id=${PROGRAM}`);
  assert.ok(
    !response.body.subjects.some((row) => row.subject_id === subjectId),
    'the switched-off pairing is not a row',
  );

  const rows = await rowsFor(PROGRAM, subjectId, outcomeId);
  assert.equal(rows.length, 1, 'its cell is still in the table');
  assert.equal(rows[0].mapping_level, 'P');
});

test('a switched-off outcome leaves the grid while the cells it had stay in the table', async () => {
  // The mirror of the row above, on the other axis, and the reason is #19's:
  // an outcome something points at is switched off rather than deleted. A
  // withdrawn outcome is not part of what a graduate is claimed to be able to
  // do, so it is not a column of the submission - and its coverage survives so
  // that switching it back on brings the coverage back with it.
  const cookie = await signInAs('U_COM');
  const subjectId = await place(PROGRAM);
  const outcomeId = await outcome(PROGRAM);

  await save(cookie, {
    program_id: PROGRAM,
    subject_id: subjectId,
    outcome_id: outcomeId,
    mapping_level: 'D',
  });

  await api.pool.query(`UPDATE learning_outcomes SET is_active = false WHERE outcome_id = $1`, [
    outcomeId,
  ]);

  const response = await grid(cookie, `?program_id=${PROGRAM}`);
  assert.ok(
    !response.body.outcomes.some((row) => row.outcome_id === outcomeId),
    'the switched-off outcome is not a column',
  );

  const rows = await rowsFor(PROGRAM, subjectId, outcomeId);
  assert.equal(rows.length, 1, 'its cell is still in the table');
  assert.equal(rows[0].mapping_level, 'D');
});

test('a cell written against a ข้อย่อย is left out of the grid rather than breaking it', async () => {
  // #100's fourth criterion. The write path is deliberately permissive - see
  // the note above the upsert - so an import or a restore of a grid built at
  // the old grain can put a row under a ข้อย่อย. There is no column for it any
  // more, so the read drops it: the alternative is a cell keyed on an outcome
  // the screen has never heard of.
  const cookie = await signInAs('U_COM');
  const subjectId = await place(PROGRAM);
  const parentId = await outcome(PROGRAM);
  const childId = await outcome(PROGRAM, { parent: parentId });

  await save(cookie, {
    program_id: PROGRAM,
    subject_id: subjectId,
    outcome_id: childId,
    mapping_level: 'D',
  });

  const response = await grid(cookie, `?program_id=${PROGRAM}`);
  assert.equal(response.status, 200, 'the grid still answers');
  assert.ok(
    !response.body.outcomes.some((row) => row.outcome_id === childId),
    'the ข้อย่อย is not a column',
  );
  assert.ok(
    !response.body.mappings.some((row) => row.outcome_id === childId),
    'and its cell is not sent to a screen with nowhere to draw it',
  );

  const rows = await rowsFor(PROGRAM, subjectId, childId);
  assert.equal(rows.length, 1, 'the row itself is still in the table');
});

test('the grid says who last set a cell, and the answer changes when somebody else sets it', async () => {
  // A coverage grid is maintained over a curriculum's life by whoever is on the
  // committee that year, and an identifier is not who - the same argument #19
  // makes for its own list. The name is asserted to *change*, because a column
  // that is always the seed's committee member would pass on a route that
  // joined the wrong user.
  const committee = await signInAs('U_COM');
  const department = await signInAs('U_DEPT');
  const subjectId = await place(PROGRAM);
  const outcomeId = await outcome(PROGRAM);
  const body = { program_id: PROGRAM, subject_id: subjectId, outcome_id: outcomeId };

  await save(committee, { ...body, mapping_level: 'I' });
  const first = await grid(committee, `?program_id=${PROGRAM}`);
  const mine = first.body.mappings.find((row) => row.subject_id === subjectId);
  assert.ok(mine.updated_by_name, 'somebody is named');

  await save(department, { ...body, mapping_level: 'A' });
  const second = await grid(committee, `?program_id=${PROGRAM}`);
  const theirs = second.body.mappings.find((row) => row.subject_id === subjectId);
  assert.notEqual(theirs.updated_by_name, mine.updated_by_name, 'the name followed the writer');
});

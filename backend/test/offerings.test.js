'use strict';

/**
 * Ticket #23: opening a รายวิชา for a term, and splitting it into ตอนเรียน.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real.
 *
 * Three things make this file different from #18's, which it otherwise copies.
 *
 * *The role list is one long.* Every screen before this one admits at least two
 * roles, and the ticket's ninth criterion says this is the only screen the
 * Curriculum Committee holds alone - Faculty Admin included, which is the one a
 * reader doubts, so it is asserted by name rather than left inside a loop.
 *
 * *The seed already ships two Offerings, and both are protected.* 2568 and 2567
 * each carry enrolled students and recorded marks, which is exactly what the
 * eighth criterion needs to refuse against - and it means every test that wants
 * to remove something has to make its own first. `freshOffering` is that, and
 * the year it uses is one no seed touches.
 *
 * *Neither table can be switched off.* #15 through #18 answer a referenced
 * removal with 200 and `deactivated: true`; there is no `is_active` on
 * `semester_courses` or `course_sections`, so the answer here is 409 and the
 * row stays as it was. Asserting the status code is asserting that decision.
 *
 * Two criteria are asserted somewhere other than in this file. *"Removal asks
 * for confirmation first"* is a dialog, and docs/06 settles that frontend
 * components are not unit-tested, so it is on the hand-worked checklist in
 * docs/acceptance/23. Copying a previous term - the seventh criterion - is
 * asserted here too, in the block at the end.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const {
  PASSWORD,
  ACCOUNTS,
  PROGRAMS,
  SUBJECT,
  PROGRAM,
  CURRENT_YEAR,
  byAlias,
} = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/** A year the seed does not use, so nothing in this file collides with it. */
const OPEN_YEAR = '2569';

const [PROGRAM_COM, PROGRAM_INTL] = PROGRAMS.map((program) => program.id);

let api;
before(async () => {
  api = await startApi('offerings', { withSeed: true });
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
  request(api.app).get(`/api/offerings${query}`).set('Cookie', cookie);

const open = (cookie, body) =>
  request(api.app).post('/api/offerings').set('Cookie', cookie).send(body);

const read = (cookie, id) => request(api.app).get(`/api/offerings/${id}`).set('Cookie', cookie);

const close = (cookie, id) => request(api.app).delete(`/api/offerings/${id}`).set('Cookie', cookie);

const addSection = (cookie, id, body) =>
  request(api.app).post(`/api/offerings/${id}/sections`).set('Cookie', cookie).send(body);

const renameSection = (cookie, id, sectionId, body) =>
  request(api.app)
    .put(`/api/offerings/${id}/sections/${sectionId}`)
    .set('Cookie', cookie)
    .send(body);

const dropSection = (cookie, id, sectionId) =>
  request(api.app).delete(`/api/offerings/${id}/sections/${sectionId}`).set('Cookie', cookie);

const assign = (cookie, id, sectionId, body) =>
  request(api.app)
    .put(`/api/offerings/${id}/sections/${sectionId}/teachers`)
    .set('Cookie', cookie)
    .send(body);

const programs = (cookie) =>
  request(api.app).get('/api/offerings/programs').set('Cookie', cookie);

const placed = (cookie, query = '') =>
  request(api.app).get(`/api/offerings/subjects${query}`).set('Cookie', cookie);

const teachers = (cookie, query = '') =>
  request(api.app).get(`/api/offerings/teachers${query}`).set('Cookie', cookie);

/**
 * A subject placed into a programme, ready to be opened.
 *
 * Made directly rather than through `/api/program-subjects`, for that suite's
 * reason in reverse: what a placement *is* belongs to #18, and this file would
 * otherwise fail whenever that screen changed. Codes begin `O` so they sort
 * clear of #16's `T` and #18's `P`.
 */
async function placedSubject(code, { program = PROGRAM_COM, active = true } = {}) {
  await api.pool.query(
    `INSERT INTO subjects
       (subject_id, subject_name_th, subject_name_en, credits, department_id, is_active)
     VALUES ($1, $2, $3, 3, '05', true)
     ON CONFLICT (subject_id) DO NOTHING`,
    [code, `รายวิชา ${code}`, `Subject ${code}`],
  );
  await api.pool.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type, is_active)
     VALUES ($1, $2, 'required', $3)
     ON CONFLICT (program_id, subject_id) DO UPDATE SET is_active = EXCLUDED.is_active`,
    [program, code, active],
  );
  return code;
}

/**
 * An Offering nothing depends on, for the tests that remove things.
 *
 * Each call takes its own subject code, so two of them never collide on the
 * `(program, subject, year, semester)` unique constraint however the file is
 * reordered.
 */
let made = 0;
async function freshOffering(cookie, { semester = 1, program = PROGRAM_COM } = {}) {
  made += 1;
  const subject = await placedSubject(`O${String(made).padStart(7, '0')}`, { program });
  const response = await open(cookie, {
    program_id: program,
    subject_id: subject,
    academic_year: OPEN_YEAR,
    semester,
  });
  assert.equal(response.status, 201, `could not open: ${response.body.message}`);
  return response.body.offering;
}

test('a committee member opens a subject for a chosen year and semester', async () => {
  // The first criterion.
  const cookie = await signInAs('U_COM');
  const subject = await placedSubject('O9000001');

  const opened = await open(cookie, {
    program_id: PROGRAM_COM,
    subject_id: subject,
    academic_year: OPEN_YEAR,
    semester: 2,
  });

  assert.equal(opened.status, 201);
  assert.equal(opened.body.offering.subject_id, subject);
  assert.equal(opened.body.offering.academic_year, OPEN_YEAR);
  assert.equal(opened.body.offering.semester, 2);
  // The subject's name travels with the Offering: the screen lists Offerings
  // and a list of codes alone would send it back for each one.
  assert.equal(opened.body.offering.subject_name_th, `รายวิชา ${subject}`);

  // And it is on the list, narrowed by the year and semester the screen chose.
  const listed = await list(
    cookie,
    `?program_id=${PROGRAM_COM}&academic_year=${OPEN_YEAR}&semester=2`,
  );
  assert.equal(listed.status, 200);
  assert.ok(listed.body.offerings.some((row) => row.subject_id === subject));
  assert.ok(listed.body.offerings.every((row) => row.academic_year === OPEN_YEAR));
  assert.ok(listed.body.offerings.every((row) => row.semester === 2));

  // The same subject, the same term, twice.
  const again = await open(cookie, {
    program_id: PROGRAM_COM,
    subject_id: subject,
    academic_year: OPEN_YEAR,
    semester: 2,
  });
  assert.equal(again.status, 409);
  assert.equal(again.body.message, REFUSALS.duplicateOffering);

  // A different semester of the same year is a different Offering, which is
  // the whole point of the term being part of the key.
  const other = await open(cookie, {
    program_id: PROGRAM_COM,
    subject_id: subject,
    academic_year: OPEN_YEAR,
    semester: 3,
  });
  assert.equal(other.status, 201);
});

test('an Offering carries several sections, each with its own number', async () => {
  // The second criterion.
  const cookie = await signInAs('U_COM');
  const offering = await freshOffering(cookie);

  for (const number of ['1', '2', 'พ1']) {
    const added = await addSection(cookie, offering.id, { section_number: number });
    assert.equal(added.status, 201, added.body.message);
    assert.equal(added.body.section.section_number, number);
  }

  const back = await read(cookie, offering.id);
  assert.equal(back.status, 200);
  assert.deepEqual(
    back.body.offering.sections.map((section) => section.section_number),
    ['1', '2', 'พ1'],
  );

  // A section number is a label, not a number: `พ1` above is why the column is
  // text, and renaming one is the way a mistyped label is fixed.
  const [first] = back.body.offering.sections;
  const renamed = await renameSection(cookie, offering.id, first.section_id, {
    section_number: '01',
  });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.section.section_number, '01');
});

test('a section number repeats across subjects and is refused within one Offering', async () => {
  // The third criterion, both halves. This is the one the ticket names as a
  // test, and the two halves are one assertion apart: the constraint is per
  // parent, and a constraint written one column shorter would pass the second
  // half and fail the first.
  const cookie = await signInAs('U_COM');
  const one = await freshOffering(cookie);
  const two = await freshOffering(cookie);

  assert.equal((await addSection(cookie, one.id, { section_number: '1' })).status, 201);
  assert.equal((await addSection(cookie, two.id, { section_number: '1' })).status, 201);

  const repeated = await addSection(cookie, one.id, { section_number: '1' });
  assert.equal(repeated.status, 409);
  assert.equal(repeated.body.message, REFUSALS.duplicateSectionNumber);

  // Renaming onto a number the same Offering already holds is the same
  // collision arriving by the other door.
  const second = await addSection(cookie, one.id, { section_number: '2' });
  const collided = await renameSection(cookie, one.id, second.body.section.section_id, {
    section_number: '1',
  });
  assert.equal(collided.status, 409);
  assert.equal(collided.body.message, REFUSALS.duplicateSectionNumber);
});

test('teachers are assigned to a section and reassigned afterwards', async () => {
  // The fourth criterion. "One or more", and the reassignment replaces the set
  // rather than adding to it - a screen that can only add cannot take a teacher
  // off a section they no longer teach.
  const cookie = await signInAs('U_COM');
  const offering = await freshOffering(cookie);
  const section = (await addSection(cookie, offering.id, { section_number: '1' })).body.section;

  const both = await assign(cookie, offering.id, section.section_id, {
    user_ids: [byAlias('U_TEACH'), byAlias('U_TEACH2')],
  });
  assert.equal(both.status, 200, both.body.message);
  assert.deepEqual(
    both.body.section.teachers.map((teacher) => teacher.user_id).sort(),
    [byAlias('U_TEACH'), byAlias('U_TEACH2')].sort(),
  );
  // The name comes back with the code, for the list's sake.
  assert.ok(both.body.section.teachers.every((teacher) => teacher.first_name_th));

  const swapped = await assign(cookie, offering.id, section.section_id, {
    user_ids: [byAlias('U_TEACH2')],
  });
  assert.equal(swapped.status, 200);
  assert.deepEqual(
    swapped.body.section.teachers.map((teacher) => teacher.user_id),
    [byAlias('U_TEACH2')],
  );

  // And down to none, which is a section not yet given to anybody rather than
  // an error: an Offering is often built before the teaching is settled.
  const emptied = await assign(cookie, offering.id, section.section_id, { user_ids: [] });
  assert.equal(emptied.status, 200);
  assert.deepEqual(emptied.body.section.teachers, []);
});

test('a teacher who is not a registered user cannot be assigned', async () => {
  // The fifth criterion, the second of the three the ticket names as tests.
  const cookie = await signInAs('U_COM');
  const offering = await freshOffering(cookie);
  const section = (await addSection(cookie, offering.id, { section_number: '1' })).body.section;

  const unknown = await assign(cookie, offering.id, section.section_id, {
    user_ids: ['nobody-at-all'],
  });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.message, REFUSALS.teacherNotRegistered);

  // One good code and one bad one writes neither: the assignment replaces the
  // set, so a half-applied one would silently drop a teacher who *was* there.
  const mixed = await assign(cookie, offering.id, section.section_id, {
    user_ids: [byAlias('U_TEACH'), 'nobody-at-all'],
  });
  assert.equal(mixed.status, 400);
  const after = await read(cookie, offering.id);
  assert.deepEqual(after.body.offering.sections[0].teachers, []);

  // A suspended account is a different answer, because the code is right.
  await api.pool.query(`UPDATE users SET status = 'inactive' WHERE user_id = $1`, [
    byAlias('U_TEACH2'),
  ]);
  const suspended = await assign(cookie, offering.id, section.section_id, {
    user_ids: [byAlias('U_TEACH2')],
  });
  assert.equal(suspended.status, 400);
  assert.equal(suspended.body.message, REFUSALS.teacherNotActive);
  await api.pool.query(`UPDATE users SET status = 'active' WHERE user_id = $1`, [
    byAlias('U_TEACH2'),
  ]);
});

test('a subject that is not in the programme cannot be opened', async () => {
  // The sixth criterion. Asked explicitly rather than caught from the foreign
  // key, because a subject that is not placed fails the insert with 23503 -
  // the same code a protected delete raises - and the two cannot be told apart
  // from the error.
  const cookie = await signInAs('U_COM');

  // In the catalogue, never placed.
  await api.pool.query(
    `INSERT INTO subjects (subject_id, subject_name_th, subject_name_en, credits, department_id)
     VALUES ('O8000001', 'ยังไม่อยู่ในหลักสูตร', 'Not placed', 3, '05')
     ON CONFLICT (subject_id) DO NOTHING`,
  );
  const notPlaced = await open(cookie, {
    program_id: PROGRAM_COM,
    subject_id: 'O8000001',
    academic_year: OPEN_YEAR,
    semester: 1,
  });
  assert.equal(notPlaced.status, 400);
  assert.equal(notPlaced.body.message, REFUSALS.subjectNotInProgram);

  // Not in the catalogue at all is the same refusal: from this screen the two
  // are one mistake, and naming the catalogue would say more about what the
  // university teaches than this caller asked.
  const nowhere = await open(cookie, {
    program_id: PROGRAM_COM,
    subject_id: 'O7000001',
    academic_year: OPEN_YEAR,
    semester: 1,
  });
  assert.equal(nowhere.status, 400);
  assert.equal(nowhere.body.message, REFUSALS.subjectNotInProgram);

  // Placed and then switched off - #18 deactivates a referenced pairing rather
  // than deleting it, so this is a state the screen really meets.
  const retired = await placedSubject('O8000002', { active: false });
  const switchedOff = await open(cookie, {
    program_id: PROGRAM_COM,
    subject_id: retired,
    academic_year: OPEN_YEAR,
    semester: 1,
  });
  assert.equal(switchedOff.status, 400);
  assert.equal(switchedOff.body.message, REFUSALS.subjectNotOffered);

  // The picker the screen offers holds only what may be opened, so the refusal
  // above is the server's answer to a request the screen would not have sent.
  const options = await placed(cookie, `?program_id=${PROGRAM_COM}`);
  assert.equal(options.status, 200);
  const codes = options.body.subjects.map((subject) => subject.subject_id);
  assert.ok(codes.includes(SUBJECT.id));
  assert.ok(!codes.includes('O8000001'));
  assert.ok(!codes.includes(retired));
});

test('every other role is refused at the server, Faculty Admin included', async () => {
  // The ninth criterion, and the third of the three the ticket names as tests.
  // This is the only screen the committee holds alone, so each role is asserted
  // by name: a loop that silently covered four would read the same if one of
  // them had been admitted.
  for (const alias of ['U_ADMIN', 'U_FAC', 'U_DEPT', 'U_TEACH', 'U_EXT']) {
    const cookie = await signInAs(alias);

    const listed = await list(cookie);
    assert.equal(listed.status, 403, `${alias} was allowed to list`);
    assert.equal(listed.body.message, REFUSALS.forbidden);

    const opened = await open(cookie, {
      program_id: PROGRAM_COM,
      subject_id: SUBJECT.id,
      academic_year: OPEN_YEAR,
      semester: 1,
    });
    assert.equal(opened.status, 403, `${alias} was allowed to open a subject`);
  }

  // Faculty Admin by name. Every screen from #14 to #17 admits them and #18
  // stopped at the department, so a reader checking this screen against its
  // neighbours will expect them here - the ticket says otherwise.
  const faculty = await signInAs('U_FAC');
  assert.equal((await programs(faculty)).status, 403);
  assert.equal((await teachers(faculty)).status, 403);
  assert.equal((await placed(faculty, `?program_id=${PROGRAM_COM}`)).status, 403);

  // The account holding two grants gets in, because the committee is the more
  // senior of the two and is what it acts as.
  const multi = await signInAs('U_MULTI');
  assert.equal((await list(multi)).status, 200);
});

test('an Offering in another committee member’s programme is out of reach', async () => {
  // U_COM administers 0501 and U_COM2 administers 0503, both under department
  // 05 - a reach one tier coarser would have let this through.
  const mine = await signInAs('U_COM');
  const theirs = await signInAs('U_COM2');
  const offering = await freshOffering(mine);

  assert.equal((await read(theirs, offering.id)).status, 404);
  assert.equal((await close(theirs, offering.id)).status, 404);
  assert.equal((await addSection(theirs, offering.id, { section_number: '1' })).status, 404);

  // And the list shows them nothing of it, so the 404 above is not the only
  // thing standing between the two committees.
  const listed = await list(theirs);
  assert.ok(listed.body.offerings.every((row) => row.program_id === PROGRAM_INTL));

  // Naming a programme they do not hold narrows within the reach rather than
  // instead of it: an empty page, not somebody else's curriculum.
  const narrowed = await list(theirs, `?program_id=${PROGRAM_COM}`);
  assert.equal(narrowed.status, 200);
  assert.equal(narrowed.body.total, 0);

  // The programme picker is the reach, which is what the list's filter is
  // drawn from.
  const picker = await programs(theirs);
  assert.deepEqual(
    picker.body.programs.map((program) => program.program_id),
    [PROGRAM_INTL],
  );
});

test('an Offering with enrolled students is protected, and an unused one is removed', async () => {
  // The eighth criterion's server half. The seed's 2568 Offering carries 113
  // enrolled students and their marks; the one this test makes carries
  // nothing.
  const cookie = await signInAs('U_COM');

  const seeded = await list(
    cookie,
    `?program_id=${PROGRAM}&academic_year=${CURRENT_YEAR}&semester=2`,
  );
  const [inUse] = seeded.body.offerings.filter((row) => row.subject_id === SUBJECT.id);
  assert.ok(inUse, 'the seeded Offering should be on the list');

  const refused = await close(cookie, inUse.id);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.offeringInUse);
  // Refused, not switched off: neither table has an `is_active`, so there is
  // nothing to have changed.
  assert.equal((await read(cookie, inUse.id)).status, 200);

  // Its sections are protected for the same reason, one tier down.
  const detail = await read(cookie, inUse.id);
  const [section] = detail.body.offering.sections;
  const sectionRefused = await dropSection(cookie, inUse.id, section.section_id);
  assert.equal(sectionRefused.status, 409);
  assert.equal(sectionRefused.body.message, REFUSALS.sectionInUse);

  // A section that only has teachers on it is not "in use" - the assignment is
  // this screen's own doing, and it goes when the section goes.
  const fresh = await freshOffering(cookie);
  const spare = (await addSection(cookie, fresh.id, { section_number: '1' })).body.section;
  await assign(cookie, fresh.id, spare.section_id, { user_ids: [byAlias('U_TEACH')] });
  assert.equal((await dropSection(cookie, fresh.id, spare.section_id)).status, 204);

  // And an Offering with sections but no enrolment goes whole, sections and
  // all, for the same reason.
  await addSection(cookie, fresh.id, { section_number: '2' });
  assert.equal((await close(cookie, fresh.id)).status, 204);
  assert.equal((await read(cookie, fresh.id)).status, 404);
});

test('the teacher picker lists registered users and narrows by ?q=', async () => {
  // The picker behind the fifth criterion. Not filtered to accounts holding
  // TEACHER: the ticket and docs/06 both say "already registered as a user",
  // and a section is sometimes taught by somebody whose grant is another role.
  const cookie = await signInAs('U_COM');

  const all = await teachers(cookie);
  assert.equal(all.status, 200);
  const codes = all.body.teachers.map((teacher) => teacher.user_id);
  assert.ok(codes.includes(byAlias('U_TEACH')));
  assert.ok(codes.includes(byAlias('U_TEACH2')));

  const narrowed = await teachers(cookie, `?q=${byAlias('U_TEACH2')}`);
  assert.deepEqual(
    narrowed.body.teachers.map((teacher) => teacher.user_id),
    [byAlias('U_TEACH2')],
  );

  // A suspended account is off the picker, which is the other half of the
  // refusal `teacherNotActive` gives.
  await api.pool.query(`UPDATE users SET status = 'inactive' WHERE user_id = $1`, [
    byAlias('U_TEACH2'),
  ]);
  const without = await teachers(cookie);
  assert.ok(!without.body.teachers.some((teacher) => teacher.user_id === byAlias('U_TEACH2')));
  await api.pool.query(`UPDATE users SET status = 'active' WHERE user_id = $1`, [
    byAlias('U_TEACH2'),
  ]);
});

test('an Offering is refused when the term is not a term', async () => {
  const cookie = await signInAs('U_COM');
  const subject = await placedSubject('O9000002');

  for (const term of [
    { academic_year: '69', semester: 1 },
    { academic_year: OPEN_YEAR, semester: 4 },
    { academic_year: OPEN_YEAR, semester: 0 },
    { academic_year: OPEN_YEAR, semester: 'ภาคต้น' },
    { academic_year: '', semester: 1 },
  ]) {
    const refused = await open(cookie, {
      program_id: PROGRAM_COM,
      subject_id: subject,
      ...term,
    });
    assert.equal(refused.status, 400, `${term.academic_year}/${term.semester} was accepted`);
    assert.equal(refused.body.message, REFUSALS.invalidOffering);
  }

  // The programme is checked before the term, and answers 403: a caller who
  // holds nothing here should not learn what a well-formed term looks like.
  const elsewhere = await open(cookie, {
    program_id: PROGRAM_INTL,
    subject_id: subject,
    academic_year: OPEN_YEAR,
    semester: 1,
  });
  assert.equal(elsewhere.status, 403);
  assert.equal(elsewhere.body.message, REFUSALS.offeringNotYours);
});

test('a section is addressed under its own Offering', async () => {
  // The path carries both, so a section id guessed against the wrong Offering
  // is a 404 rather than an edit of somebody else's section.
  const cookie = await signInAs('U_COM');
  const one = await freshOffering(cookie);
  const two = await freshOffering(cookie);
  const section = (await addSection(cookie, one.id, { section_number: '1' })).body.section;

  assert.equal((await renameSection(cookie, two.id, section.section_id, {
    section_number: '9',
  })).status, 404);
  assert.equal((await dropSection(cookie, two.id, section.section_id)).status, 404);
  assert.equal((await assign(cookie, two.id, section.section_id, { user_ids: [] })).status, 404);

  const missing = await addSection(cookie, 999999, { section_number: '1' });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.message, REFUSALS.offeringNotFound);
});

/**
 * The seventh criterion. Its own term, built by hand rather than borrowed from
 * the seed, because a copy is judged by what it reproduces and a source nobody
 * else writes to is the only way that stays true as this file grows.
 */
const SOURCE_YEAR = '2570';

const copy = (cookie, body) =>
  request(api.app).post('/api/offerings/copy').set('Cookie', cookie).send(body);

test('a whole term is copied from a previous one, and says what it created', async () => {
  const cookie = await signInAs('U_COM');
  const first = await placedSubject('OC000001');
  const second = await placedSubject('OC000002');

  for (const subject of [first, second]) {
    const offering = await open(cookie, {
      program_id: PROGRAM_COM,
      subject_id: subject,
      academic_year: SOURCE_YEAR,
      semester: 1,
    });
    const section = (
      await addSection(cookie, offering.body.offering.id, { section_number: '1' })
    ).body.section;
    await assign(cookie, offering.body.offering.id, section.section_id, {
      user_ids: [byAlias('U_TEACH')],
    });
  }

  const copied = await copy(cookie, {
    program_id: PROGRAM_COM,
    from_academic_year: SOURCE_YEAR,
    from_semester: 1,
    academic_year: SOURCE_YEAR,
    semester: 2,
  });

  assert.equal(copied.status, 200, copied.body.message);
  assert.deepEqual(
    copied.body.created.map((offering) => offering.subject_id),
    [first, second],
  );
  assert.equal(copied.body.sections, 2);
  assert.deepEqual(copied.body.skipped_existing, []);
  assert.deepEqual(copied.body.skipped_unplaced, []);

  // The sections came across with their numbers, and the teaching with them.
  const made = await read(cookie, copied.body.created[0].id);
  assert.deepEqual(
    made.body.offering.sections.map((section) => section.section_number),
    ['1'],
  );
  assert.deepEqual(
    made.body.offering.sections[0].teachers.map((teacher) => teacher.user_id),
    [byAlias('U_TEACH')],
  );
  // What did not come across is the enrolment: a term is copied before anybody
  // has registered for it, and copying students would put them in two terms.
  assert.equal(made.body.offering.sections[0].student_count, 0);
});

test('copying the same term twice creates nothing the second time', async () => {
  // Pressing it again has to be safe: somebody who is not sure whether the
  // first press went through has no other way to find out.
  const cookie = await signInAs('U_COM');

  const again = await copy(cookie, {
    program_id: PROGRAM_COM,
    from_academic_year: SOURCE_YEAR,
    from_semester: 1,
    academic_year: SOURCE_YEAR,
    semester: 2,
  });

  assert.equal(again.status, 200);
  assert.deepEqual(again.body.created, []);
  assert.deepEqual(again.body.skipped_existing, ['OC000001', 'OC000002']);
  assert.equal(again.body.sections, 0);
});

test('a subject taken out of the curriculum is named rather than copied', async () => {
  // The outcome that needs saying: the other subjects were opened, and this one
  // was not, and nothing but the report would tell anybody so.
  const cookie = await signInAs('U_COM');
  await placedSubject('OC000001', { active: false });

  const copied = await copy(cookie, {
    program_id: PROGRAM_COM,
    from_academic_year: SOURCE_YEAR,
    from_semester: 1,
    academic_year: SOURCE_YEAR,
    semester: 3,
  });

  assert.equal(copied.status, 200);
  assert.deepEqual(copied.body.skipped_unplaced, ['OC000001']);
  assert.deepEqual(
    copied.body.created.map((offering) => offering.subject_id),
    ['OC000002'],
  );

  await placedSubject('OC000001');
});

test('a teacher who has since been suspended is dropped and named', async () => {
  const cookie = await signInAs('U_COM');
  await api.pool.query(`UPDATE users SET status = 'inactive' WHERE user_id = $1`, [
    byAlias('U_TEACH'),
  ]);

  const copied = await copy(cookie, {
    program_id: PROGRAM_COM,
    from_academic_year: SOURCE_YEAR,
    from_semester: 1,
    academic_year: '2571',
    semester: 1,
  });

  assert.equal(copied.status, 200);
  // The copy still happened: one person leaving is not a reason the term
  // should not be opened.
  assert.equal(copied.body.created.length, 2);
  assert.deepEqual(
    copied.body.dropped_teachers.map((dropped) => dropped.user_id),
    [byAlias('U_TEACH'), byAlias('U_TEACH')],
  );
  assert.deepEqual(copied.body.dropped_teachers.map((dropped) => dropped.section_number), [
    '1',
    '1',
  ]);

  const made = await read(cookie, copied.body.created[0].id);
  assert.deepEqual(made.body.offering.sections[0].teachers, []);

  await api.pool.query(`UPDATE users SET status = 'active' WHERE user_id = $1`, [
    byAlias('U_TEACH'),
  ]);
});

test('a copy is refused when either end is not a term, or both are the same', async () => {
  const cookie = await signInAs('U_COM');

  const onto_itself = await copy(cookie, {
    program_id: PROGRAM_COM,
    from_academic_year: SOURCE_YEAR,
    from_semester: 1,
    academic_year: SOURCE_YEAR,
    semester: 1,
  });
  assert.equal(onto_itself.status, 400);
  assert.equal(onto_itself.body.message, REFUSALS.invalidOffering);

  const malformed = await copy(cookie, {
    program_id: PROGRAM_COM,
    from_academic_year: '70',
    from_semester: 1,
    academic_year: SOURCE_YEAR,
    semester: 2,
  });
  assert.equal(malformed.status, 400);

  // And the programme is checked before either end, as it is on the form.
  const elsewhere = await copy(cookie, {
    program_id: PROGRAM_INTL,
    from_academic_year: SOURCE_YEAR,
    from_semester: 1,
    academic_year: SOURCE_YEAR,
    semester: 2,
  });
  assert.equal(elsewhere.status, 403);
  assert.equal(elsewhere.body.message, REFUSALS.offeringNotYours);

  // A term with nothing in it copies nothing and says so, rather than failing.
  const empty = await copy(cookie, {
    program_id: PROGRAM_COM,
    from_academic_year: '2560',
    from_semester: 1,
    academic_year: '2561',
    semester: 1,
  });
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.created, []);
  assert.equal(empty.body.sections, 0);

  // Faculty Admin is refused here too - copying is the largest write on the
  // screen and the ninth criterion covers it like the rest.
  const faculty = await signInAs('U_FAC');
  assert.equal(
    (
      await copy(faculty, {
        program_id: PROGRAM_COM,
        from_academic_year: SOURCE_YEAR,
        from_semester: 1,
        academic_year: SOURCE_YEAR,
        semester: 2,
      })
    ).status,
    403,
  );
});

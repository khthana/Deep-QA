'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, PRIOR_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/33-activity-editor.md — the server half.
 *
 * #32 listed the Section's work and removed it; this ticket is where the work
 * is written, and where it is attributed to the outcomes it assesses. The
 * attribution is the point: an Activity with no CLO rows contributes to no
 * outcome at all, so every attainment figure #38 will compute is downstream of
 * what this route accepts.
 *
 * Three grains meet in one save and only one of them is the Activity's own:
 *
 * - the Activity, its name, type, mark and dates, is the **Section's**;
 * - the หมวดคะแนน it is filed under is the **Offering's** (ADR-0003, #30);
 * - the CLOs it is attributed to are the **Offering's** too (ADR-0003, #27),
 *   at (Program, Subject, academic year);
 * - and the week it belongs to is the **Section's** again (#31).
 *
 * So four of this suite's refusals are one refusal in four places: an id in
 * the body that belongs to somebody else's grain. Each is checked against the
 * set it must come from rather than against the foreign key, because three of
 * the four foreign keys would admit it — `activities.score_ratio_id` has no
 * composite key to constrain it at all (migration 0003 says so in as many
 * words), and `activity_clo_mapping.clo_id` admits every CLO of every year.
 *
 * The write itself is a transaction with a delete inside it: the mapping rows
 * are replaced whole, which is what makes a second save an update rather than
 * a second Activity. Two things follow, and both are tested here. Removing a
 * CLO row that a cohort has already been marked against would leave those
 * marks pointing at an attribution that no longer exists — `activity_scores`
 * references `subject_clo` directly, not the mapping rows, so nothing in the
 * database objects — so the route does. And a refused save must leave the
 * rows exactly as they were, which every refusal test asserts rather than
 * assumes.
 */

const DEPT_COMPUTER = '05';

let api;
before(async () => {
  api = await startApi('activity-editor', { withSeed: true });
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

async function teaching(alias) {
  const cookie = await signInAs(alias);
  return alias === 'U_MULTI' ? actingAsTeacher(cookie) : cookie;
}

const url = (sectionId) => '/api/teaching/sections/' + sectionId + '/activities';

const create = (cookie, sectionId, body) =>
  request(api.app).post(url(sectionId)).set('Cookie', cookie).send(body);

const update = (cookie, sectionId, activityId, body) =>
  request(api.app)
    .put(url(sectionId) + '/' + activityId)
    .set('Cookie', cookie)
    .send(body);

/** The Section this alias teaches in the given year. */
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

/** Everything the editor opens with: the options and the current list. */
async function screenOf(cookie, sectionId) {
  const answered = await request(api.app).get(url(sectionId)).set('Cookie', cookie);
  assert.equal(answered.status, 200, answered.body.message);
  return answered.body;
}

const activityIn = (screen, name) => screen.activities.find((one) => one.activity_name === name);

/** A well-formed body, with whatever this test wants to change about it. */
function draft(screen, overrides = {}) {
  return {
    activity_name: 'งานทดสอบของชุดทดสอบ',
    activity_type: 'individual',
    score_number: 20,
    announcement_date: null,
    deadline_date: null,
    course_syllabus_id: null,
    score_ratio_id: screen.categories[0].score_ratio_id,
    clo_rows: [{ clo_id: screen.clos[0].clo_id, weight: 100 }],
    ...overrides,
  };
}

const countOf = async (sql, params) => Number((await api.pool.query(sql, params)).rows[0].count);

const mappingCount = (activityId) =>
  countOf('SELECT count(*) AS count FROM activity_clo_mapping WHERE activity_id = $1', [activityId]);

/** Written and taken away again, so the suite's own rows never outlive a test. */
async function withActivity(cookie, sectionId, body, run) {
  const made = await create(cookie, sectionId, body);
  assert.equal(made.status, 201, made.body.message);
  try {
    return await run(made.body.activity);
  } finally {
    await api.pool.query('DELETE FROM activities WHERE id = $1', [made.body.activity.id]);
  }
}

test('the editor opens with the options its four pickers need', async () => {
  // The read half of every criterion that says "only ... are offered". The
  // categories and the CLOs are the Offering's, the weeks are this Section's,
  // and all four arrive in the one request the screen already makes.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const screen = await screenOf(cookie, section);

  assert.ok(screen.categories.length > 0, 'the scheme should carry categories');
  assert.ok(screen.clos.length > 0, 'the offering should carry CLOs');
  assert.ok(screen.weeks.length > 0, 'the section should carry a plan');

  // A CLO option is what a person picks from, so it carries its number and
  // its text and not only an id.
  for (const clo of screen.clos) {
    assert.ok(Number.isInteger(clo.clo_id));
    assert.equal(typeof clo.clo_number, 'string');
    assert.equal(typeof clo.clo_detail, 'string');
  }

  // Every CLO offered belongs to this Offering's (Program, Subject, year) -
  // the fourth criterion, asserted against the database rather than against
  // the answer's own claim.
  const foreign = await countOf(
    `SELECT count(*) AS count FROM subject_clo c
       JOIN semester_courses sc ON sc.program_id = c.program_id
                               AND sc.subject_id = c.subject_id
                               AND sc.academic_year = c.academic_year
       JOIN course_sections cs ON cs.semester_course_id = sc.id
      WHERE cs.section_id = $1 AND c.clo_id = ANY($2::int[])`,
    [section, screen.clos.map((one) => one.clo_id)],
  );
  assert.equal(foreign, screen.clos.length);

  // And every week offered is this Section's own (#31's grain).
  const weeks = await countOf(
    'SELECT count(*) AS count FROM course_syllabus WHERE section_id = $1 AND id = ANY($2::int[])',
    [section, screen.weeks.map((one) => one.id)],
  );
  assert.equal(weeks, screen.weeks.length);
});

test('an activity is created with its fields, its week and its CLO rows', async () => {
  // The first criterion end to end. The mark each CLO accounts for is derived
  // from the weight rather than typed: a CLO carrying 60% of a 20-mark piece
  // of work is worth 12, and #34 enters marks against that number.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);

  const body = draft(screen, {
    activity_name: 'ควิซครั้งที่ 1 (ชุดทดสอบ)',
    activity_type: 'group',
    score_number: 20,
    announcement_date: '2026-08-03',
    deadline_date: '2026-08-17',
    course_syllabus_id: screen.weeks[0].id,
    clo_rows: [
      { clo_id: screen.clos[0].clo_id, weight: 60 },
      { clo_id: screen.clos[1].clo_id, weight: 40 },
    ],
  });

  await withActivity(cookie, section, body, async (made) => {
    assert.equal(made.activity_name, 'ควิซครั้งที่ 1 (ชุดทดสอบ)');
    assert.equal(made.activity_type, 'group');
    assert.equal(Number(made.score_number), 20);
    assert.equal(made.course_syllabus_id, screen.weeks[0].id);
    assert.equal(made.score_ratio_id, screen.categories[0].score_ratio_id);
    assert.match(made.announcement_date, /^2026-08-03/);
    assert.match(made.deadline_date, /^2026-08-17/);

    // The rows come back in the order they were sent, each naming its CLO.
    assert.deepEqual(
      made.clo_rows.map((row) => [row.clo_id, row.weight, Number(row.score)]),
      [
        [screen.clos[0].clo_id, 60, 12],
        [screen.clos[1].clo_id, 40, 8],
      ],
    );
    assert.equal(made.clo_rows[0].clo_number, screen.clos[0].clo_number);

    // And the list a person comes back to carries the same rows, which is the
    // sixth criterion's read half: editing loads what is there.
    const again = activityIn(await screenOf(cookie, section), 'ควิซครั้งที่ 1 (ชุดทดสอบ)');
    assert.equal(again.id, made.id);
    assert.deepEqual(
      again.clo_rows.map((row) => row.clo_id),
      [screen.clos[0].clo_id, screen.clos[1].clo_id],
    );
  });
});

test('a type outside the two the schema allows is refused before the database is asked', async () => {
  // The second criterion. The CHECK would refuse it too, as a 23514 through
  // the error handler - เกิดข้อผิดพลาดในระบบ for a value a person picked.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);

  const before = await countOf('SELECT count(*) AS count FROM activities WHERE section_id = $1', [
    section,
  ]);

  const refused = await create(cookie, section, draft(screen, { activity_type: 'pair' }));
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidActivity);

  const blank = await create(cookie, section, draft(screen, { activity_name: '   ' }));
  assert.equal(blank.status, 400);

  const negative = await create(cookie, section, draft(screen, { score_number: -1 }));
  assert.equal(negative.status, 400);

  // numeric(5,2) holds 999.99 and no more; refused here rather than as 22003.
  const huge = await create(cookie, section, draft(screen, { score_number: 100000 }));
  assert.equal(huge.status, 400);

  assert.equal(
    await countOf('SELECT count(*) AS count FROM activities WHERE section_id = $1', [section]),
    before,
    'a refused save must write nothing',
  );
});

test('saving twice updates the activity rather than making a second one', async () => {
  // The seventh criterion, and the reason the mapping rows are replaced whole
  // rather than appended to: a second save of the same work is the same work.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);

  const before = screen.activities.length;

  await withActivity(cookie, section, draft(screen, { activity_name: 'งานเดี่ยวที่ 9 (ชุดทดสอบ)' }), async (made) => {
    const saved = await update(
      cookie,
      section,
      made.id,
      draft(screen, {
        activity_name: 'งานเดี่ยวที่ 9 แก้ไขแล้ว (ชุดทดสอบ)',
        score_number: 30,
        clo_rows: [
          { clo_id: screen.clos[2].clo_id, weight: 50 },
          { clo_id: screen.clos[3].clo_id, weight: 50 },
        ],
      }),
    );
    assert.equal(saved.status, 200, saved.body.message);
    assert.equal(saved.body.activity.id, made.id, 'the id must survive an edit');

    const after = await screenOf(cookie, section);
    assert.equal(after.activities.length, before + 1, 'two saves, one activity');

    const edited = activityIn(after, 'งานเดี่ยวที่ 9 แก้ไขแล้ว (ชุดทดสอบ)');
    assert.equal(edited.id, made.id);
    assert.equal(Number(edited.score_number), 30);
    assert.equal(activityIn(after, 'งานเดี่ยวที่ 9 (ชุดทดสอบ)'), undefined);

    // The rows were replaced, not added to: two in, two out, and the CLO the
    // first save named is gone.
    assert.equal(await mappingCount(made.id), 2);
    assert.deepEqual(
      edited.clo_rows.map((row) => [row.clo_id, row.weight, Number(row.score)]),
      [
        [screen.clos[2].clo_id, 50, 15],
        [screen.clos[3].clo_id, 50, 15],
      ],
    );
  });
});

test('an activity may be saved with no CLO rows at all, and later given some', async () => {
  // The ticket's own sentence: an Activity with no CLO rows contributes to no
  // outcome. That is a legal state and not an error - a person writes the work
  // first and attributes it afterwards - so the editor must accept it both
  // ways round.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);

  await withActivity(cookie, section, draft(screen, { clo_rows: [] }), async (made) => {
    assert.deepEqual(made.clo_rows, []);
    assert.equal(await mappingCount(made.id), 0);

    const saved = await update(
      cookie,
      section,
      made.id,
      draft(screen, { clo_rows: [{ clo_id: screen.clos[0].clo_id, weight: 100 }] }),
    );
    assert.equal(saved.status, 200, saved.body.message);
    assert.equal(await mappingCount(made.id), 1);

    // And back to none, which is how a person undoes an attribution.
    const emptied = await update(cookie, section, made.id, draft(screen, { clo_rows: [] }));
    assert.equal(emptied.status, 200, emptied.body.message);
    assert.equal(await mappingCount(made.id), 0);
  });
});

test('the same CLO twice in one activity is refused, naming it', async () => {
  // The fifth criterion. The schema does not have this constraint - the unique
  // key is on (activity_id, sequence_order), not on the CLO - so without the
  // check the save would succeed and the CLO would be counted twice in every
  // figure computed from it.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);

  await withActivity(cookie, section, draft(screen), async (made) => {
    const refused = await update(
      cookie,
      section,
      made.id,
      draft(screen, {
        clo_rows: [
          { clo_id: screen.clos[0].clo_id, weight: 50 },
          { clo_id: screen.clos[0].clo_id, weight: 50 },
        ],
      }),
    );

    assert.equal(refused.status, 400);
    assert.equal(refused.body.message, REFUSALS.duplicateActivityClo(screen.clos[0].clo_number));

    // And the rows the activity had are still exactly the rows it had.
    assert.equal(await mappingCount(made.id), 1);
  });
});

test("a CLO of another year, a category of another year and a week of another section are each refused", async () => {
  // Three ids in one body, each belonging to a grain the caller is not on.
  // None of the three foreign keys would have caught the first two, and the
  // third would have been caught as somebody else's row silently accepted.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const prior = await seededSection('U_TEACH', PRIOR_YEAR);
  const screen = await screenOf(cookie, section);
  const last = await screenOf(cookie, prior);

  const before = await countOf('SELECT count(*) AS count FROM activities WHERE section_id = $1', [
    section,
  ]);

  const foreignClo = await create(
    cookie,
    section,
    draft(screen, { clo_rows: [{ clo_id: last.clos[0].clo_id, weight: 100 }] }),
  );
  assert.equal(foreignClo.status, 400);
  assert.equal(foreignClo.body.message, REFUSALS.cloNotFound);

  const foreignCategory = await create(
    cookie,
    section,
    draft(screen, { score_ratio_id: last.categories[0].score_ratio_id }),
  );
  assert.equal(foreignCategory.status, 400);
  assert.equal(foreignCategory.body.message, REFUSALS.weightNotFound);

  const foreignWeek = await create(
    cookie,
    section,
    draft(screen, { course_syllabus_id: last.weeks[0].id }),
  );
  assert.equal(foreignWeek.status, 400);
  assert.equal(foreignWeek.body.message, REFUSALS.weekNotFound);

  assert.equal(
    await countOf('SELECT count(*) AS count FROM activities WHERE section_id = $1', [section]),
    before,
    'three refusals, nothing written',
  );
});

test('a category or a week that is not an id at all is ไม่พบ, not "none"', async () => {
  // The two nullable ids have three readings and only two of them are the
  // same: absent and the empty string a `<select>` sends for its blank option
  // both mean "none", and everything else is a claim about a record. `0` and
  // `abc` are claims about a record that does not exist, so they answer the way
  // a sibling Offering's id answers rather than filing the work under nothing
  // and reporting success.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);
  const before = await countOf('SELECT count(*) AS count FROM activities WHERE section_id = $1', [
    section,
  ]);

  for (const bad of [0, 'abc', -3]) {
    const category = await create(cookie, section, draft(screen, { score_ratio_id: bad }));
    assert.equal(category.status, 400, `score_ratio_id ${bad}`);
    assert.equal(category.body.message, REFUSALS.weightNotFound);

    const week = await create(cookie, section, draft(screen, { course_syllabus_id: bad }));
    assert.equal(week.status, 400, `course_syllabus_id ${bad}`);
    assert.equal(week.body.message, REFUSALS.weekNotFound);
  }

  assert.equal(
    await countOf('SELECT count(*) AS count FROM activities WHERE section_id = $1', [section]),
    before,
    'six refusals, nothing written',
  );

  // And the empty string still means none, which is what the form sends when
  // the person has not chosen a week.
  await withActivity(
    cookie,
    section,
    draft(screen, { course_syllabus_id: '', clo_rows: [] }),
    async (activity) => assert.equal(activity.course_syllabus_id, null),
  );
});

test('CLO weights that add up to more than the whole mark are refused, with the total', async () => {
  // A weight is a percentage of this Activity's mark, so a set adding to more
  // than a hundred is asking for more than there is. Exactly a hundred is not
  // required: a person may save a half-finished attribution and come back to
  // it, which is why the sentence names the total rather than demanding one.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);

  const refused = await create(
    cookie,
    section,
    draft(screen, {
      clo_rows: [
        { clo_id: screen.clos[0].clo_id, weight: 60 },
        { clo_id: screen.clos[1].clo_id, weight: 50 },
      ],
    }),
  );
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.activityCloWeights(110));

  // Half of the mark attributed and half not is a legal, saveable state.
  await withActivity(
    cookie,
    section,
    draft(screen, { clo_rows: [{ clo_id: screen.clos[0].clo_id, weight: 50 }] }),
    async (made) => assert.equal(made.clo_rows[0].weight, 50),
  );
});

test('CLO rows without a category are refused, because a mapping row cannot be written without one', async () => {
  // `activity_clo_mapping.score_ratio_id` is NOT NULL: the category is where
  // the attributed marks are counted. An Activity may be filed under no
  // category (the column is nullable, and #32's screen draws such a row), but
  // then there is nowhere to put an attribution.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);

  const refused = await create(cookie, section, draft(screen, { score_ratio_id: null }));
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.activityCloNeedsCategory);

  // With no rows to place, no category is asked for.
  await withActivity(
    cookie,
    section,
    draft(screen, { score_ratio_id: null, clo_rows: [] }),
    async (made) => assert.equal(made.score_ratio_id, null),
  );
});

test('a CLO a cohort has already been marked against cannot be taken off the activity', async () => {
  // The guard the schema does not have. `activity_scores` carries
  // (student_id, activity_id, clo_id) and references `subject_clo` directly,
  // so removing the mapping row leaves every one of those marks attributed to
  // an outcome this Activity no longer claims to assess - and nothing in the
  // database says a word.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);

  const midterm = activityIn(screen, 'สอบกลางภาค');
  const marked = midterm.clo_rows[0];
  assert.ok(marked, 'the seeded midterm should carry CLO rows');
  assert.ok(
    (await countOf(
      'SELECT count(*) AS count FROM activity_scores WHERE activity_id = $1 AND clo_id = $2',
      [midterm.id, marked.clo_id],
    )) > 0,
    'the seeded midterm should carry marks against its first CLO',
  );

  const kept = midterm.clo_rows
    .filter((row) => row.clo_id !== marked.clo_id)
    .map((row) => ({ clo_id: row.clo_id, weight: row.weight }));

  const refused = await update(cookie, section, midterm.id, {
    activity_name: midterm.activity_name,
    activity_type: midterm.activity_type,
    score_number: Number(midterm.score_number),
    announcement_date: null,
    deadline_date: null,
    course_syllabus_id: midterm.course_syllabus_id,
    score_ratio_id: midterm.score_ratio_id,
    clo_rows: kept,
  });

  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.activityCloHasMarks(marked.clo_number));

  // The mapping is untouched, which is the whole point of refusing.
  const after = activityIn(await screenOf(cookie, section), 'สอบกลางภาค');
  assert.deepEqual(
    after.clo_rows.map((row) => row.clo_id),
    midterm.clo_rows.map((row) => row.clo_id),
  );
});

test('an activity id is paired with its section, and a bad id is ไม่พบ', async () => {
  // #28's pairing rule, on the verb that writes: without the second half of
  // the WHERE, the sibling Section's Activity id sent to this address would be
  // somebody else's work edited from here.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const sibling = await seededSection('U_MULTI', CURRENT_YEAR);
  const screen = await screenOf(cookie, section);

  const theirs = await api.pool.query('SELECT id FROM activities WHERE section_id = $1 LIMIT 1', [
    sibling,
  ]);

  const crossed = await update(cookie, section, theirs.rows[0].id, draft(screen));
  assert.equal(crossed.status, 404);
  assert.equal(crossed.body.message, REFUSALS.activityNotFound);

  for (const bad of ['abc', '99999999999999999999']) {
    const answered = await update(cookie, section, bad, draft(screen));
    assert.equal(answered.status, 404, 'id ' + bad);
    assert.equal(answered.body.message, REFUSALS.activityNotFound);
  }
});

test("somebody else's section refuses both verbs with one sentence", async () => {
  // The eighth criterion, server-side: `sectionOf` decides, and the write
  // routes ask it before they read the body (ADR-0002).
  const owner = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const screen = await screenOf(owner, section);
  const stranger = await teaching('U_TEACH2');

  const made = await create(stranger, section, draft(screen));
  assert.equal(made.status, 404);
  assert.equal(made.body.message, REFUSALS.sectionNotFound);

  const edited = await update(stranger, section, screen.activities[0].id, draft(screen));
  assert.equal(edited.status, 404);
  assert.equal(edited.body.message, REFUSALS.sectionNotFound);
});

test('the wrong role and the anonymous are refused at the door', async () => {
  // Before any of the above is considered, as in every teaching route.
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const committee = await signInAs('U_COM');

  const wrongRole = await request(api.app).post(url(section)).set('Cookie', committee).send({});
  assert.equal(wrongRole.status, 403);

  const anonymous = await request(api.app).post(url(section)).send({});
  assert.equal(anonymous.status, 401);
});

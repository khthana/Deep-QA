'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  PASSWORD,
  ACCOUNTS,
  CURRENT_YEAR,
  PRIOR_YEAR,
  SEMESTER,
  SCORE_RATIOS,
  ACTIVITIES,
  UNMARKED_ACTIVITY,
  unmarkedActivityName,
  byAlias,
} = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/32-activity-list.md — the server half.
 *
 * The list is Section-bound and the grouping is not. Activities hang off
 * `activities.section_id` the way #31's weeks do — two Sections of one
 * Offering hold two different lists — while the หมวดคะแนน they are grouped
 * under belong to the Offering (ADR-0003, #30). So the read answers with
 * both grains at once, and this suite pins each in its own place: the
 * activities differ between siblings, the categories are identical, and the
 * ids prove which is which.
 *
 * The delete is where the schema is at its most dangerous, and it fails in
 * two opposite directions:
 *
 * - `activity_scores.activity_id` is **CASCADE**. An unguarded delete answers
 *   204 and takes a cohort's marks with it. Nothing in the database objects,
 *   which is exactly why the route has to.
 * - `activity_evidence.activity_id` is **RESTRICT**, and the row is
 *   soft-deleted rather than removed. The database does object, as 23503 —
 *   a 500 and a dirty log for something a person can fix — and it objects
 *   even to evidence somebody already "deleted" on the screen.
 *
 * Both guards therefore live inside the DELETE as `NOT EXISTS`, the shape
 * #31's review arrived at: asking first and deleting second leaves a gap, and
 * for the CASCADE the gap costs marks.
 *
 * The evidence rows are written here rather than seeded: `db/seed.js` says in
 * as many words that it does not seed `activity_evidence`, because real
 * evidence is a real PDF and that is #35's business. The guard, though, is
 * about the row and not the file, so a row is what this suite makes.
 */

const DEPT_COMPUTER = '05';

let api;
before(async () => {
  api = await startApi('activities', { withSeed: true });
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

const read = (cookie, sectionId) => request(api.app).get(url(sectionId)).set('Cookie', cookie);

const remove = (cookie, sectionId, activityId) =>
  request(api.app)
    .delete(url(sectionId) + '/' + activityId)
    .set('Cookie', cookie);

/** A Section straight from the database, with the number the seed texts carry. */
async function seededSection(alias, year) {
  const { rows } = await api.pool.query(
    `SELECT cs.section_id, cs.section_number FROM course_sections_teacher cst
       JOIN course_sections cs ON cs.section_id = cst.section_id
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cst.user_id = $1 AND sc.academic_year = $2 AND sc.semester = $3`,
    [byAlias(alias), year, SEMESTER],
  );
  assert.equal(rows.length, 1, 'expected exactly one seeded section for ' + alias + ' in ' + year);
  return { id: rows[0].section_id, number: rows[0].section_number };
}

/** The list as the screen reads it, asserting the read itself succeeded. */
async function listOf(cookie, sectionId) {
  const answered = await read(cookie, sectionId);
  assert.equal(answered.status, 200, answered.body.message);
  return answered.body;
}

/** The deletable one: the seed's unmapped, unmarked Activity of this Section. */
async function deletable(section, year) {
  const { rows } = await api.pool.query(
    `SELECT id FROM activities WHERE section_id = $1 AND activity_name = $2`,
    [section.id, unmarkedActivityName(section.number, year)],
  );
  assert.equal(rows.length, 1, 'the seed no longer holds a deletable Activity');
  return rows[0].id;
}

/**
 * Puts the deletable one back, for the tests that come after the ones that
 * delete it. The seed writes exactly one per Section and two rows here would
 * make `deletable` ambiguous, so this is found-or-created like the seed's own
 * writes, and the id is allowed to change - nothing addresses it by id twice.
 */
async function restoreDeletable(section, year) {
  await api.pool.query(
    `INSERT INTO activities (section_id, score_ratio_id, activity_type, activity_name, score_number)
     SELECT $1, r.score_ratio_id, $2::varchar, $3::varchar, $4::numeric
       FROM subject_score_ratio r
       JOIN semester_courses sc ON sc.program_id = r.program_id
                               AND sc.subject_id = r.subject_id
                               AND sc.academic_year = r.academic_year
       JOIN course_sections cs ON cs.semester_course_id = sc.id
      WHERE cs.section_id = $1 AND r.score_category = $5
        AND NOT EXISTS (SELECT 1 FROM activities a
                         WHERE a.section_id = $1 AND a.activity_name = $3)`,
    [
      section.id,
      UNMARKED_ACTIVITY.type,
      unmarkedActivityName(section.number, year),
      UNMARKED_ACTIVITY.score,
      UNMARKED_ACTIVITY.category,
    ],
  );
}

const countOf = async (sql, params) => Number((await api.pool.query(sql, params)).rows[0].count);

test('the seeded activities arrive with what an entry has to show', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const { section: answered, activities } = await listOf(cookie, section.id);
  assert.equal(answered.section_id, section.id);
  assert.equal(answered.academic_year, CURRENT_YEAR);

  // The seed's five, plus the deletable one this ticket added.
  assert.equal(activities.length, ACTIVITIES.length + 1);

  // The second criterion, field by field: a name, a type, a full mark, and
  // the two dates - which are null in the seed and must arrive as null
  // rather than as the epoch or as the string "null".
  for (const activity of activities) {
    assert.ok(Number.isInteger(activity.id));
    assert.equal(typeof activity.activity_name, 'string');
    assert.ok(['group', 'individual'].includes(activity.activity_type));
    assert.equal(typeof activity.score_number, 'string'); // numeric(5,2) over the wire
    assert.ok('announcement_date' in activity);
    assert.ok('deadline_date' in activity);
  }

  const midterm = activities.find((one) => one.activity_name === 'สอบกลางภาค');
  assert.equal(midterm.activity_type, 'individual');
  assert.equal(Number(midterm.score_number), 100);
  assert.equal(midterm.announcement_date, null);
  assert.equal(midterm.deadline_date, null);
});

test('every activity names the category it is grouped under, and the scheme comes with it', async () => {
  // The first criterion needs two things in one answer: the หมวดคะแนน of the
  // Offering (ADR-0003, in the scheme's own order) and each Activity's
  // pointer into it. Grouping is the screen's job; naming the groups is not.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const { categories, activities } = await listOf(cookie, section.id);

  assert.deepEqual(
    categories.map((one) => one.score_category),
    SCORE_RATIOS.map((one) => one.category),
  );
  assert.deepEqual(
    categories.map((one) => one.sequence_order),
    SCORE_RATIOS.map((one) => one.order),
  );

  const known = new Set(categories.map((one) => one.score_ratio_id));
  for (const activity of activities) {
    assert.ok(known.has(activity.score_ratio_id), activity.activity_name + ' is in no category');
  }

  // And the seed's own filing, so the grouping is provably by category
  // rather than by anything that happens to correlate with it.
  const byName = new Map(activities.map((one) => [one.activity_name, one]));
  const categoryOf = new Map(categories.map((one) => [one.score_ratio_id, one.score_category]));
  for (const spec of ACTIVITIES) {
    assert.equal(categoryOf.get(byName.get(spec.name).score_ratio_id), spec.category);
  }
});

test('activities arrive in the scheme order, then in the order they were made', async () => {
  // The third thing "grouped" implies and the screen cannot invent: within a
  // category the rows keep insertion order, so a list does not reshuffle
  // itself between two loads.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const { categories, activities } = await listOf(cookie, section.id);
  const rank = new Map(categories.map((one, at) => [one.score_ratio_id, at]));

  for (let at = 1; at < activities.length; at += 1) {
    const before = activities[at - 1];
    const after = activities[at];
    const step = rank.get(before.score_ratio_id) - rank.get(after.score_ratio_id);
    assert.ok(step <= 0, 'category order broken at ' + after.activity_name);
    if (step === 0) assert.ok(before.id < after.id, 'insertion order broken at ' + after.activity_name);
  }
});

test('two Sections of one Offering hold two different lists under one scheme', async () => {
  // The eighth criterion, and #31's shape one table over: the Activities are
  // this Section's own rows, while the categories they are filed under are
  // the Offering's and are literally the same rows for both.
  const mine = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const here = await listOf(mine, section.id);

  const theirs = await teaching('U_MULTI');
  const sibling = await seededSection('U_MULTI', CURRENT_YEAR);
  assert.notEqual(sibling.id, section.id);
  const there = await listOf(theirs, sibling.id);

  const ids = new Set(here.activities.map((one) => one.id));
  assert.ok(there.activities.every((one) => !ids.has(one.id)), 'the two lists share a row');

  // Same shape, different rows, and the names say whose they are.
  assert.equal(there.activities.length, here.activities.length);
  assert.equal(
    here.activities.find((one) => one.activity_name.startsWith('แบบฝึกหัดท้ายบท')).activity_name,
    unmarkedActivityName(section.number, CURRENT_YEAR),
  );
  assert.equal(
    there.activities.find((one) => one.activity_name.startsWith('แบบฝึกหัดท้ายบท')).activity_name,
    unmarkedActivityName(sibling.number, CURRENT_YEAR),
  );

  // The scheme, by contrast, is one scheme: the same ids, not merely equal
  // names - which is what ADR-0003 means and what #30 proves from its side.
  assert.deepEqual(
    there.categories.map((one) => one.score_ratio_id),
    here.categories.map((one) => one.score_ratio_id),
  );
});

test("the prior year's Section holds its own list and its own scheme", async () => {
  const cookie = await teaching('U_TEACH');
  const now = await seededSection('U_TEACH', CURRENT_YEAR);
  const before = await seededSection('U_TEACH', PRIOR_YEAR);

  const current = await listOf(cookie, now.id);
  const prior = await listOf(cookie, before.id);

  assert.equal(prior.section.academic_year, PRIOR_YEAR);
  const ids = new Set(current.activities.map((one) => one.id));
  assert.ok(prior.activities.every((one) => !ids.has(one.id)));

  // The years' schemes are different rows too - #30's grain includes the year.
  const currentCategories = new Set(current.categories.map((one) => one.score_ratio_id));
  assert.ok(prior.categories.every((one) => !currentCategories.has(one.score_ratio_id)));
});

test('an activity nothing points at can be deleted, and only it goes', async () => {
  // The third criterion. The seed's one deletable row - see UNMARKED_ACTIVITY
  // - and the row count either side, because a delete that took a neighbour
  // with it would still answer 204.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const target = await deletable(section, CURRENT_YEAR);

  const before = await listOf(cookie, section.id);
  const answered = await remove(cookie, section.id, target);
  assert.equal(answered.status, 204);

  const after = await listOf(cookie, section.id);
  assert.equal(after.activities.length, before.activities.length - 1);
  assert.deepEqual(
    after.activities.map((one) => one.id),
    before.activities.filter((one) => one.id !== target).map((one) => one.id),
  );

  // Deleted, not merely hidden.
  assert.equal(await countOf('SELECT count(*) FROM activities WHERE id = $1', [target]), 0);

  // And put back, because the tests below need a row nothing points at and
  // node:test runs this file in order.
  await restoreDeletable(section, CURRENT_YEAR);
});

test('an activity with marks is refused, and the marks are still there', async () => {
  // The fourth and sixth criteria, which are one criterion said twice: the
  // foreign key CASCADEs, so "refused" has to mean "before the statement",
  // and the proof is that the marks outlive the attempt.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const { activities } = await listOf(cookie, section.id);
  const marked = activities.find((one) => one.activity_name === 'สอบกลางภาค');
  const marks = await countOf('SELECT count(*) FROM activity_scores WHERE activity_id = $1', [
    marked.id,
  ]);
  assert.ok(marks > 0, 'the seed no longer marks สอบกลางภาค');

  const answered = await remove(cookie, section.id, marked.id);
  assert.equal(answered.status, 400);
  assert.equal(answered.body.message, REFUSALS.activityHasMarks(marks));

  assert.equal(
    await countOf('SELECT count(*) FROM activity_scores WHERE activity_id = $1', [marked.id]),
    marks,
  );
  assert.equal(await countOf('SELECT count(*) FROM activities WHERE id = $1', [marked.id]), 1);
});

test('an activity with evidence is refused by the file, not by the constraint', async () => {
  // The fifth criterion. Written here because the seed does not seed
  // evidence; what the guard is about is the row, and the row is enough to
  // make the database's RESTRICT fire if the route ever stops looking.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const mine = await deletable(section, CURRENT_YEAR);
  const { rows } = await api.pool.query(
    `INSERT INTO activity_evidence (section_id, activity_id, evidence_type, file_name, file_path)
     VALUES ($1, $2, 'brief', 'โจทย์โครงงาน.pdf', '/evidence/brief.pdf') RETURNING evidence_id`,
    [section.id, mine],
  );

  const answered = await remove(cookie, section.id, mine);
  assert.equal(answered.status, 400);
  assert.equal(answered.body.message, REFUSALS.activityHasEvidence('โจทย์โครงงาน.pdf', 1));
  assert.equal(await countOf('SELECT count(*) FROM activities WHERE id = $1', [mine]), 1);

  // Soft-deleted evidence still pins the row, because the foreign key does
  // not read `is_deleted` - so the guard must not either, or the delete
  // reaches the constraint and the person gets เกิดข้อผิดพลาดในระบบ.
  await api.pool.query(`UPDATE activity_evidence SET is_deleted = true WHERE evidence_id = $1`, [
    rows[0].evidence_id,
  ]);
  const again = await remove(cookie, section.id, mine);
  assert.equal(again.status, 400);
  assert.equal(again.body.message, REFUSALS.activityHasEvidence('โจทย์โครงงาน.pdf', 1));

  await api.pool.query('DELETE FROM activity_evidence WHERE evidence_id = $1', [
    rows[0].evidence_id,
  ]);
});

test('an activity id is paired with its Section, not global', async () => {
  // #28's pairing rule, at this tier: the sibling's Activity through my
  // address is not mine to delete, and the answer says ไม่พบ rather than
  // admitting it exists somewhere.
  const mine = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const theirs = await teaching('U_MULTI');
  const sibling = await seededSection('U_MULTI', CURRENT_YEAR);
  const hers = await deletable(sibling, CURRENT_YEAR);

  const answered = await remove(mine, section.id, hers);
  assert.equal(answered.status, 404);
  assert.equal(answered.body.message, REFUSALS.activityNotFound);
  assert.equal(await countOf('SELECT count(*) FROM activities WHERE id = $1', [hers]), 1);

  // And the sibling can still delete her own, which is the other half of
  // saying the refusal was about the pairing and not about the row.
  assert.equal((await remove(theirs, sibling.id, hers)).status, 204);
  await restoreDeletable(sibling, CURRENT_YEAR);
});

test('an id that is not a number is ไม่พบ, not a 500', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  for (const id of ['abc', '1;drop', '9999999999999999999999']) {
    const answered = await remove(cookie, section.id, id);
    assert.equal(answered.status, 404, 'id ' + id + ' answered ' + answered.status);
    assert.equal(answered.body.message, REFUSALS.activityNotFound);
  }
});

test("somebody else's Section answers 404 with one sentence", async () => {
  // The ninth criterion, enforced where ADR-0002 says: the teaching register,
  // server-side. U_TEACH2 teaches nothing at all.
  const stranger = await teaching('U_TEACH2');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const answered = await read(stranger, section.id);
  assert.equal(answered.status, 404);
  assert.equal(answered.body.message, REFUSALS.sectionNotFound);

  const deleted = await remove(stranger, section.id, 1);
  assert.equal(deleted.status, 404);
  assert.equal(deleted.body.message, REFUSALS.sectionNotFound);

  // A Section that never existed is refused in the same words, so the answer
  // does not tell a stranger which ids are real.
  assert.equal((await read(stranger, 999999)).status, 404);
  assert.equal((await read(stranger, 999999)).body.message, REFUSALS.sectionNotFound);
});

test('the wrong role and the anonymous are refused at the door', async () => {
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const dept = await signInAs('U_DEPT');
  assert.equal((await read(dept, section.id)).status, 403);
  assert.equal((await remove(dept, section.id, 1)).status, 403);

  assert.equal((await request(api.app).get(url(section.id))).status, 401);
  assert.equal((await request(api.app).delete(url(section.id) + '/1')).status, 401);
});

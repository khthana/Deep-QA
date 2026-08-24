'use strict';

/**
 * Ticket #22: the criteria a Rubric scores on.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real.
 *
 * Five things about this file are decisions rather than habit, and the first
 * two are the ones a reader should not take on trust.
 *
 * *A criterion has no curriculum of its own.* `rubric_details` holds no
 * `program_id`; the only thing that says who may write one is the rubric above
 * it, which the address names. So every verb here checks the rubric first, and
 * the tests assert the two halves of that separately: a rubric out of reach,
 * and a criterion that exists but belongs to a different rubric than the one in
 * the address. The second is the half that a route can pass while doing
 * `WHERE id = $1` alone, and it is the ticket's sixth criterion exactly.
 *
 * *All four bands are required, though all four columns are nullable.*
 * `level_1_description` through `level_4_description` are `text` with no `NOT
 * NULL`, and the ticket's third criterion says a criterion carries a
 * description for all four. The route is therefore stricter than its schema on
 * purpose, as #21 is about `rubrics.program_id`. The test withholds each of the
 * four in turn rather than one of them: a validator that only looked at
 * `level_4_description` would pass a suite that only withheld that one.
 *
 * *A weight is a number, and the tests say which number.* `weight` is
 * `numeric(5,2)`, and node-postgres reads a `numeric` column back as a
 * *string* — `'1.00'`, not `1`. A suite that asserted `'1.00'` would be
 * writing the driver's habit into the contract, and a screen that showed it
 * raw would say `12.50` where a person wrote `12.5`. The route casts to a
 * double on the way out, so the JSON carries a number, and these tests assert
 * that it does.
 *
 * *Names made here begin ZC.* The seed gives RUB-01 three criteria and RUB-02
 * two, named after their rubric, and #21's list column counts them. A test that
 * added a criterion to a seeded rubric and left it there would change a number
 * another suite asserts.
 *
 * *Orders made here begin at 900.* The seed's criteria are ordered 1..3, and a
 * row left behind at order 2 would interleave with them.
 *
 * One criterion of the ticket is asserted somewhere other than here. *"Removal
 * asks for confirmation first"* is about a screen, and docs/06 settles that
 * frontend components are not unit-tested, so it is on the hand-worked
 * checklist in docs/acceptance/22 and in the browser seam.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, PROGRAM, RUBRICS } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

let api;
before(async () => {
  api = await startApi('rubric-criteria', { withSeed: true });
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

const list = (cookie, rubricId) =>
  request(api.app).get(`/api/rubrics/${rubricId}/criteria`).set('Cookie', cookie);

const one = (cookie, rubricId, id) =>
  request(api.app).get(`/api/rubrics/${rubricId}/criteria/${id}`).set('Cookie', cookie);

const add = (cookie, rubricId, body) =>
  request(api.app).post(`/api/rubrics/${rubricId}/criteria`).set('Cookie', cookie).send(body);

const edit = (cookie, rubricId, id, body) =>
  request(api.app).put(`/api/rubrics/${rubricId}/criteria/${id}`).set('Cookie', cookie).send(body);

const remove = (cookie, rubricId, id) =>
  request(api.app).delete(`/api/rubrics/${rubricId}/criteria/${id}`).set('Cookie', cookie);

const rubricOf = (cookie, id) => request(api.app).get(`/api/rubrics/${id}`).set('Cookie', cookie);

/** A distinct name per call, so tests neither collide with each other nor rerun dirty. */
let counter = 0;
const nextName = () => `ZC${(counter += 1)}`;

/** An order well past the seed's, so rows left behind never interleave with it. */
let order = 900;
const nextOrder = () => (order += 1);

/** The four bands, filled in — what a criterion has to carry to be written down. */
const BANDS = {
  level_4_description: 'ทำได้ครบถ้วนและอธิบายเหตุผลได้',
  level_3_description: 'ทำได้ครบถ้วน',
  level_2_description: 'ทำได้บางส่วน',
  level_1_description: 'ยังทำไม่ได้',
};

const BAND_KEYS = Object.keys(BANDS);

/** One criterion's worth of body, distinct from every other this file makes. */
const draft = (overrides = {}) => {
  const name = nextName();
  return {
    criteria_name_th: `${name} เกณฑ์ทดสอบ`,
    criteria_name_en: `${name} criterion under test`,
    weight: 10,
    display_order: nextOrder(),
    ...BANDS,
    ...overrides,
  };
};

/** A rubric of PROGRAM this file owns, so nothing it does touches a seeded count. */
async function ownRubric(cookie, code) {
  const response = await request(api.app)
    .post('/api/rubrics')
    .set('Cookie', cookie)
    .send({
      program_id: PROGRAM,
      rubric_code: code,
      rubric_name_th: 'Rubric สำหรับทดสอบเกณฑ์',
      rubric_name_en: 'Rubric for criteria tests',
      display_order: nextOrder(),
    });
  assert.equal(response.status, 201, `rubric create failed: ${response.body.message}`);
  return response.body.rubric;
}

/** One criterion, made through the API by an account that may. */
async function criterion(cookie, rubricId, overrides = {}) {
  const response = await add(cookie, rubricId, draft(overrides));
  assert.equal(response.status, 201, `create failed: ${response.body.message}`);
  return response.body.criterion;
}

test('a committee member adds, reads back, edits and removes a criterion', async () => {
  // The first criterion of the ticket, all three verbs of it, and the second
  // and third as the values that come back.
  const cookie = await signInAs('U_COM');
  const rubric = await ownRubric(cookie, 'ZRC-01');

  const body = draft();
  const created = await add(cookie, rubric.id, body);
  assert.equal(created.status, 201);
  assert.equal(created.body.criterion.criteria_name_th, body.criteria_name_th);
  assert.equal(created.body.criterion.criteria_name_en, body.criteria_name_en);
  assert.equal(created.body.criterion.level_2_description, BANDS.level_2_description);

  const read = await one(cookie, rubric.id, created.body.criterion.id);
  assert.equal(read.status, 200);
  assert.equal(read.body.criterion.criteria_name_th, body.criteria_name_th);

  const edited = await edit(cookie, rubric.id, created.body.criterion.id, {
    ...body,
    criteria_name_th: 'แก้ชื่อแล้ว',
    weight: 25.5,
    level_1_description: 'ยังทำไม่ได้เลย',
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.criterion.criteria_name_th, 'แก้ชื่อแล้ว');
  assert.equal(edited.body.criterion.weight, 25.5);
  assert.equal(edited.body.criterion.level_1_description, 'ยังทำไม่ได้เลย');

  const gone = await remove(cookie, rubric.id, created.body.criterion.id);
  assert.equal(gone.status, 200);
  assert.equal(gone.body.deleted, true);
  assert.equal(gone.body.criteria_name_th, 'แก้ชื่อแล้ว');
  assert.equal((await one(cookie, rubric.id, created.body.criterion.id)).status, 404);
});

test('a weight comes back as a number, not as the string the driver reads', async () => {
  // `numeric` is a string out of node-postgres, and a screen that showed it raw
  // would say 12.50 where a person wrote 12.5, while anything that added two
  // weights together would concatenate them. The cast is in the route, and this
  // is the assertion that would notice it being taken out.
  const cookie = await signInAs('U_COM');
  const rubric = await ownRubric(cookie, 'ZRC-02');
  const made = await criterion(cookie, rubric.id, { weight: 12.5 });

  assert.equal(typeof made.weight, 'number');
  assert.equal(made.weight, 12.5);

  const listed = (await list(cookie, rubric.id)).body.criteria[0];
  assert.equal(typeof listed.weight, 'number');
  assert.equal(listed.weight, 12.5);
});

test('all four bands are required, each of them on its own', async () => {
  // The ticket's third criterion and the reason this test is a loop. The four
  // columns are nullable, so nothing below the route refuses a criterion that
  // describes only excellence; and a validator that checked one band would pass
  // a test that withheld only that one.
  const cookie = await signInAs('U_COM');
  const rubric = await ownRubric(cookie, 'ZRC-03');

  for (const key of BAND_KEYS) {
    const refused = await add(cookie, rubric.id, draft({ [key]: undefined }));
    assert.equal(refused.status, 400, `${key} was accepted as missing`);
    assert.equal(refused.body.message, REFUSALS.invalidCriterion);

    // Spaces pass a `text` column and fail the criterion, which is what a form
    // sends when somebody tabs through the box.
    const blank = await add(cookie, rubric.id, draft({ [key]: '   ' }));
    assert.equal(blank.status, 400, `${key} was accepted as blank`);
  }

  // And an edit is held to the same completeness as a creation: a criterion
  // that was written whole must not be emptied afterwards.
  const made = await criterion(cookie, rubric.id);
  const emptied = await edit(cookie, rubric.id, made.id, {
    ...draft(),
    level_3_description: '',
  });
  assert.equal(emptied.status, 400);
  assert.equal((await one(cookie, rubric.id, made.id)).body.criterion.level_3_description,
    BANDS.level_3_description);
});

test('both names are required, and so are the weight and the order', async () => {
  // The ticket's second criterion in the half that is a refusal.
  const cookie = await signInAs('U_COM');
  const rubric = await ownRubric(cookie, 'ZRC-04');

  for (const missing of ['criteria_name_th', 'criteria_name_en', 'weight', 'display_order']) {
    const refused = await add(cookie, rubric.id, draft({ [missing]: undefined }));
    assert.equal(refused.status, 400, `${missing} was accepted as missing`);
    assert.equal(refused.body.message, REFUSALS.invalidCriterion);
  }

  // An order of zero is a real order and the column's own default, so the check
  // that refuses a missing one must not be `!value` - `Number(null)` is 0 and
  // would sail through it.
  const zeroth = await add(cookie, rubric.id, draft({ display_order: 0 }));
  assert.equal(zeroth.status, 201);
});

test('a weight is a positive number the column can hold', async () => {
  // `numeric(5,2)` holds up to 999.99 at two decimal places. Past that the
  // INSERT raises 22003 and the route has no key for it; more decimals than
  // that and PostgreSQL rounds silently, so the row that comes back is not the
  // row that was sent. A weight of zero is refused as a separate decision: a
  // criterion that counts for nothing is a mistake and not a setting, and
  // nothing on this system reads a zero weight as "ignore this one".
  const cookie = await signInAs('U_COM');
  const rubric = await ownRubric(cookie, 'ZRC-05');

  for (const weight of [0, -1, 1000, 999.999, 'หนัก', Number.NaN, Infinity]) {
    const refused = await add(cookie, rubric.id, draft({ weight }));
    assert.equal(refused.status, 400, `weight ${String(weight)} was accepted`);
    assert.equal(refused.body.message, REFUSALS.invalidCriterion);
  }

  const edge = await add(cookie, rubric.id, draft({ weight: 999.99 }));
  assert.equal(edge.status, 201);
  assert.equal(edge.body.criterion.weight, 999.99);

  // The weights that a two-decimal check written as `w * 100 === round(w * 100)`
  // refuses: a tenth is not exact in binary, so 1.1 * 100 is 110.00000000000001
  // and every weight ending in a lone tenth looks like three decimal places.
  // These are all weights a person would plausibly type.
  for (const weight of [1.1, 8.2, 0.07, 33.33]) {
    const ordinary = await add(cookie, rubric.id, draft({ weight }));
    assert.equal(ordinary.status, 201, `weight ${weight} was refused`);
    assert.equal(ordinary.body.criterion.weight, weight);
  }

  // A form sends numbers as text, and a weight typed into a box is a weight.
  const typed = await add(cookie, rubric.id, draft({ weight: '7.25' }));
  assert.equal(typed.status, 201);
  assert.equal(typed.body.criterion.weight, 7.25);
});

test('the criteria are in the order the committee set, and ties are settled', async () => {
  // The ticket's fourth criterion. `display_order` is NOT NULL DEFAULT 0 here
  // as it is on rubrics, so two criteria claiming one place is the ordinary
  // case rather than the edge. A criterion has no code to settle it with - and
  // its names are not unique either - so `id` is the tiebreak, which is total
  // because it is the primary key.
  const cookie = await signInAs('U_COM');
  const rubric = await ownRubric(cookie, 'ZRC-06');

  const third = await criterion(cookie, rubric.id, { display_order: 30 });
  const first = await criterion(cookie, rubric.id, { display_order: 10 });
  const tiedEarlier = await criterion(cookie, rubric.id, { display_order: 20 });
  const tiedLater = await criterion(cookie, rubric.id, { display_order: 20 });

  const rows = (await list(cookie, rubric.id)).body.criteria;
  assert.deepEqual(
    rows.map((row) => row.id),
    [first.id, tiedEarlier.id, tiedLater.id, third.id],
  );

  // The order the committee set, and not the order they were written in: the
  // first row made is last, so a list that came back by id alone would fail
  // here rather than pass by luck.
  assert.equal(rows[3].id, third.id);
});

test('the list says which rubric it is of, and the seed is read as it stands', async () => {
  // The screen is opened at a rubric's address and has to name it; asking for
  // the rubric separately would be a second round trip for something the server
  // has already had to read in order to answer at all.
  const cookie = await signInAs('U_COM');
  const seededWithCriteria = RUBRICS.find((entry) => entry.criteria > 0);
  const all = await request(api.app)
    .get('/api/rubrics?per_page=100')
    .set('Cookie', cookie);
  const target = all.body.rubrics.find((row) => row.rubric_code === seededWithCriteria.code);

  const answer = await list(cookie, target.id);
  assert.equal(answer.status, 200);
  assert.equal(answer.body.rubric.rubric_code, seededWithCriteria.code);
  assert.equal(answer.body.criteria.length, seededWithCriteria.criteria);
  assert.equal(answer.body.total, seededWithCriteria.criteria);
});

test('a criterion of another rubric is not reachable through this one', async () => {
  // The half of the sixth criterion that a route can fail while looking
  // correct: the rubric in the address is checked, the criterion is fetched by
  // its own id alone, and the two are never required to agree. Both rubrics
  // here belong to the same account, so nothing about reach is doing the work -
  // what refuses is the pairing.
  const cookie = await signInAs('U_COM');
  const mine = await ownRubric(cookie, 'ZRC-07');
  const other = await ownRubric(cookie, 'ZRC-08');
  const elsewhere = await criterion(cookie, other.id);

  assert.equal((await one(cookie, mine.id, elsewhere.id)).status, 404);
  assert.equal((await edit(cookie, mine.id, elsewhere.id, draft())).status, 404);
  assert.equal((await remove(cookie, mine.id, elsewhere.id)).status, 404);

  // Untouched by any of it, read through the address it does belong to.
  const after = await one(cookie, other.id, elsewhere.id);
  assert.equal(after.status, 200);
  assert.equal(after.body.criterion.criteria_name_th, elsewhere.criteria_name_th);
});

test('a rubric of another curriculum is refused in every verb', async () => {
  // The ticket's sixth criterion proper, enforced at the server. Out of reach
  // answers 404 and not 403 for `rubricNotFound`'s reason: telling the two
  // apart would turn the address bar into a way of learning which rubrics
  // another curriculum keeps, and which of them have been filled in.
  const owner = await signInAs('U_COM');
  const mine = await ownRubric(owner, 'ZRC-09');
  const made = await criterion(owner, mine.id);

  const outsider = await signInAs('U_COM2');
  assert.equal((await list(outsider, mine.id)).status, 404);
  assert.equal((await one(outsider, mine.id, made.id)).status, 404);
  assert.equal((await add(outsider, mine.id, draft())).status, 404);
  assert.equal((await edit(outsider, mine.id, made.id, draft())).status, 404);
  assert.equal((await remove(outsider, mine.id, made.id)).status, 404);

  const refused = await list(outsider, mine.id);
  assert.equal(refused.body.message, REFUSALS.rubricNotFound);

  const after = await one(owner, mine.id, made.id);
  assert.equal(after.status, 200);
  assert.equal(after.body.criterion.criteria_name_th, made.criteria_name_th);
});

test('an edit cannot move a criterion to another rubric, however the body asks', async () => {
  // The rubric is the address and not a field. A form that sends `rubric_id`
  // anyway must not be able to move a criterion under a rubric of a curriculum
  // this account does not hold - which is the same hole as #21's program_id on
  // an edit, one tier down.
  const cookie = await signInAs('U_COM');
  const mine = await ownRubric(cookie, 'ZRC-10');
  const other = await ownRubric(cookie, 'ZRC-11');
  const made = await criterion(cookie, mine.id);

  const moved = await edit(cookie, mine.id, made.id, { ...draft(), rubric_id: other.id });
  assert.equal(moved.status, 200);
  assert.equal(moved.body.criterion.rubric_id, mine.id);
  assert.equal((await list(cookie, other.id)).body.criteria.length, 0);
});

test('removing one criterion leaves the others, and the rubric counts what is left', async () => {
  // The count #21's list shows is a subquery over this table, so a criterion
  // removed here is a number changed there. The two tickets meet at exactly one
  // place and this is it.
  const cookie = await signInAs('U_COM');
  const rubric = await ownRubric(cookie, 'ZRC-12');
  const kept = await criterion(cookie, rubric.id);
  const going = await criterion(cookie, rubric.id);

  assert.equal((await rubricOf(cookie, rubric.id)).body.rubric.criteria_count, 2);

  assert.equal((await remove(cookie, rubric.id, going.id)).status, 200);

  const left = (await list(cookie, rubric.id)).body.criteria;
  assert.deepEqual(left.map((row) => row.id), [kept.id]);
  assert.equal((await rubricOf(cookie, rubric.id)).body.rubric.criteria_count, 1);
});

test('the faculty administrator and the teacher are refused the screen entirely', async () => {
  // #79 one tier down. The faculty holds the list of หลักสูตร; what a
  // curriculum marks against, and how finely, is decided below it. A teacher
  // marks against a rubric, which is not writing one.
  const owner = await signInAs('U_COM');
  const rubric = await ownRubric(owner, 'ZRC-13');
  const made = await criterion(owner, rubric.id);

  for (const alias of ['U_FAC', 'U_TEACH', 'U_ADMIN']) {
    const cookie = await signInAs(alias);
    assert.equal((await list(cookie, rubric.id)).status, 403, `${alias} listed criteria`);
    assert.equal((await add(cookie, rubric.id, draft())).status, 403, `${alias} added one`);
    assert.equal((await edit(cookie, rubric.id, made.id, draft())).status, 403);
    assert.equal((await remove(cookie, rubric.id, made.id)).status, 403);
  }

  const after = await one(owner, rubric.id, made.id);
  assert.equal(after.status, 200);
});

test('a criterion that was never made, and one addressed by nonsense, answer the same way', async () => {
  // Both ids are read from the address, and both are integer columns. A
  // non-numeric one is refused before it reaches the database rather than
  // raising a 22P02 the route has no key for - #23's lesson, and the reason
  // `reachable` tests the shape of the id first.
  const cookie = await signInAs('U_COM');
  const rubric = await ownRubric(cookie, 'ZRC-14');

  assert.equal((await one(cookie, rubric.id, 99999999)).status, 404);
  assert.equal((await one(cookie, rubric.id, 'ห้าสิบ')).status, 404);
  assert.equal((await list(cookie, 'ห้าสิบ')).status, 404);
  assert.equal((await remove(cookie, rubric.id, 'NaN')).status, 404);

  const refused = await one(cookie, rubric.id, 99999999);
  assert.equal(refused.body.message, REFUSALS.criterionNotFound);
});

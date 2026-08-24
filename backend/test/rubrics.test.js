'use strict';

/**
 * Ticket #21: the scales a หลักสูตร marks against.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real.
 *
 * Four things about this file are decisions rather than habit.
 *
 * *The duplicate is asserted in the direction that surprises people.* A rubric
 * code is `UNIQUE` across the institution, which is the opposite of the PLO
 * code one ticket earlier, so the test that matters is not "the same code twice
 * in one curriculum is refused" - every screen on this system refuses that -
 * but "the same code in *another* curriculum is refused too", from an account
 * that cannot see, list or read the row it has just collided with. A suite that
 * only asserted the first direction would pass unchanged against a per-
 * curriculum key, which is exactly the mistake #19's shape invites.
 *
 * *Codes made here begin `ZR`.* The seed holds RUB-01..RUB-11 for 0501 and
 * RUB-51..RUB-52 for 0503, and a test creating `RUB-01` would be asserting
 * against the seed's row rather than against its own.
 *
 * *Orders made here begin at 900.* The ordering and paging assertions below
 * read the seed's rows, whose orders run 1..10; a row this file made and left
 * behind at order 3 would interleave with them and the assertions would be
 * about a list the screen never shows.
 *
 * *`FACULTY_ADMIN` is on the refused side.* The ticket's seventh criterion says
 * faculty administrators manage rubrics within their scope. #79 reversed that
 * after the ticket was written - the faculty keeps the list of หลักสูตร, and
 * what is inside one is decided below it - and names A04, this screen, as one
 * of the four it binds. The criterion is stale; #79 is the decision.
 *
 * Two criteria are asserted somewhere other than in this file. *"each rubric
 * offers a way to open its criteria"* and *"removal asks for confirmation
 * first"* are both about a screen, and docs/06 settles that frontend components
 * are not unit-tested, so they are on the hand-worked checklist in
 * docs/acceptance/21 and in the browser seam. What is a fact about the API -
 * that the rows come back in the order the curriculum set, ten to a page, with
 * ties settled - is here.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const {
  PASSWORD,
  ACCOUNTS,
  PROGRAM,
  PROGRAM_INTL,
  RUBRICS,
  RUBRICS_INTL,
} = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

let api;
before(async () => {
  api = await startApi('rubrics', { withSeed: true });
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
  request(api.app).get(`/api/rubrics${query}`).set('Cookie', cookie);

const one = (cookie, id) => request(api.app).get(`/api/rubrics/${id}`).set('Cookie', cookie);

const add = (cookie, body) => request(api.app).post('/api/rubrics').set('Cookie', cookie).send(body);

const edit = (cookie, id, body) =>
  request(api.app).put(`/api/rubrics/${id}`).set('Cookie', cookie).send(body);

const remove = (cookie, id) => request(api.app).delete(`/api/rubrics/${id}`).set('Cookie', cookie);

const programs = (cookie) => request(api.app).get('/api/rubrics/programs').set('Cookie', cookie);

/** A distinct code per call, so tests neither collide with each other nor rerun dirty. */
let counter = 0;
const nextCode = () => `ZR${(counter += 1)}`;

/** An order well past the seed's, so rows left behind never interleave with it. */
let order = 900;
const nextOrder = () => (order += 1);

/** One rubric of PROGRAM, made through the API by the account that owns it. */
async function rubric(cookie, overrides = {}) {
  const response = await add(cookie, {
    program_id: PROGRAM,
    rubric_code: nextCode(),
    rubric_name_th: 'เกณฑ์การให้คะแนนสำหรับการทดสอบ',
    rubric_name_en: 'Rubric under test',
    display_order: nextOrder(),
    ...overrides,
  });
  assert.equal(response.status, 201, `create failed: ${response.body.message}`);
  return response.body.rubric;
}

/** The seed's own rows, in the order the API returned them. */
const seeded = (rows) => rows.filter((row) => /^RUB-\d+$/.test(row.rubric_code));

test('a committee member adds, reads back, edits and removes a rubric of their own curriculum', async () => {
  // The first criterion, end to end, on a row this test owns.
  const cookie = await signInAs('U_COM');
  const code = nextCode();

  const created = await add(cookie, {
    program_id: PROGRAM,
    rubric_code: code,
    rubric_name_th: 'การนำเสนอโครงงาน',
    rubric_name_en: 'Project presentation',
    display_order: nextOrder(),
  });
  assert.equal(created.status, 201, created.body.message);
  assert.equal(created.body.rubric.rubric_code, code);
  assert.equal(created.body.rubric.program_id, PROGRAM);
  assert.equal(created.body.rubric.criteria_count, 0);

  const id = created.body.rubric.id;

  const read = await one(cookie, id);
  assert.equal(read.status, 200);
  assert.equal(read.body.rubric.rubric_name_th, 'การนำเสนอโครงงาน');
  assert.equal(read.body.rubric.rubric_name_en, 'Project presentation');

  const changed = await edit(cookie, id, {
    rubric_code: code,
    rubric_name_th: 'การนำเสนอโครงงานปริญญานิพนธ์',
    rubric_name_en: 'Thesis presentation',
    display_order: read.body.rubric.display_order,
  });
  assert.equal(changed.status, 200, changed.body.message);
  assert.equal(changed.body.rubric.rubric_name_th, 'การนำเสนอโครงงานปริญญานิพนธ์');
  assert.equal(changed.body.rubric.rubric_name_en, 'Thesis presentation');

  const gone = await remove(cookie, id);
  assert.equal(gone.status, 200, gone.body.message);
  assert.equal(gone.body.deleted, true);
  assert.equal((await one(cookie, id)).status, 404);
});

test('a rubric code taken by another curriculum is refused, and the sentence says so', async () => {
  // The heart of the ticket's second criterion, and the half a suite copied
  // from #19 would never reach. `rubric_code` is UNIQUE on its own: 0503's
  // committee member cannot list, read or edit 0501's RUB-01, and still cannot
  // have that code. The refusal is the only thing on this system that tells a
  // person about a row they are not allowed to see, so it has to say why -
  // ทั้งระบบ - or they search their own list, find the code free, and conclude
  // the screen is lying.
  const elsewhere = await signInAs('U_COM2');
  const taken = RUBRICS[0].code;

  const refused = await add(elsewhere, {
    program_id: PROGRAM_INTL,
    rubric_code: taken,
    rubric_name_th: 'ชื่ออื่น',
    rubric_name_en: 'Another name',
    display_order: nextOrder(),
  });
  assert.equal(refused.status, 409, refused.body.message);
  assert.equal(refused.body.message, REFUSALS.duplicateRubricCode);
  assert.match(
    REFUSALS.duplicateRubricCode,
    /ทั้งระบบ/,
    'the duplicate refusal has to name the wider scope, or it reads as #19’s per-curriculum one',
  );

  // And the row it collided with is genuinely out of reach, which is what makes
  // the sentence the only way of learning that the code is gone.
  const seen = await list(elsewhere, '?per_page=100');
  assert.equal(
    seen.body.rubrics.some((row) => row.rubric_code === taken),
    false,
  );
});

test('the same code twice in one curriculum is refused too, and an edit into a taken code as well', async () => {
  const cookie = await signInAs('U_COM');
  const mine = await rubric(cookie);

  const again = await add(cookie, {
    program_id: PROGRAM,
    rubric_code: mine.rubric_code,
    rubric_name_th: 'ซ้ำ',
    rubric_name_en: 'Duplicate',
    display_order: nextOrder(),
  });
  assert.equal(again.status, 409);
  assert.equal(again.body.message, REFUSALS.duplicateRubricCode);

  // The code is editable, and an edit into one the institution already holds
  // meets the same refusal as a new rubric would.
  const other = await rubric(cookie);
  const renamed = await edit(cookie, other.id, {
    rubric_code: mine.rubric_code,
    rubric_name_th: other.rubric_name_th,
    rubric_name_en: other.rubric_name_en,
    display_order: other.display_order,
  });
  assert.equal(renamed.status, 409);
  assert.equal(renamed.body.message, REFUSALS.duplicateRubricCode);
});

test('both names are required, and so are the code and the order', async () => {
  // The third criterion is the pair of names, and it is a criterion because the
  // English one is what an accreditation reviewer reads: a rubric with only a
  // Thai name is a rubric that cannot be submitted.
  const cookie = await signInAs('U_COM');
  const base = {
    program_id: PROGRAM,
    rubric_code: nextCode(),
    rubric_name_th: 'ครบถ้วน',
    rubric_name_en: 'Complete',
    display_order: nextOrder(),
  };

  for (const field of ['rubric_code', 'rubric_name_th', 'rubric_name_en', 'display_order']) {
    const refused = await add(cookie, { ...base, [field]: '' });
    assert.equal(refused.status, 400, field);
    assert.equal(refused.body.message, REFUSALS.invalidRubric, field);
  }

  // A name of spaces passes the NOT NULL the column carries and fails the
  // criterion, which is the whole reason the route trims before it checks.
  const spaces = await add(cookie, { ...base, rubric_name_en: '   ' });
  assert.equal(spaces.status, 400);
  assert.equal(spaces.body.message, REFUSALS.invalidRubric);

  // An order that is not a number is the same refusal, not a row ordered by
  // NaN; and one past the column's end is refused here rather than reaching the
  // INSERT as a 22003 this route has no sentence for.
  for (const bad of ['หนึ่ง', 2147483648, -1]) {
    const refused = await add(cookie, { ...base, rubric_code: nextCode(), display_order: bad });
    assert.equal(refused.status, 400, String(bad));
    assert.equal(refused.body.message, REFUSALS.invalidRubric, String(bad));
  }
});

test('a rubric must name a curriculum, though the column permits none', async () => {
  // `rubrics.program_id` is nullable, and a row with none is not merely
  // unowned: the reach filter is `program_id = ANY($1)`, which is NULL and not
  // false for a NULL column, so such a rubric would be invisible to every
  // account on the system including the one that made it. The route is
  // deliberately stricter than its schema.
  const cookie = await signInAs('U_COM');
  const refused = await add(cookie, {
    rubric_code: nextCode(),
    rubric_name_th: 'ไม่มีหลักสูตร',
    rubric_name_en: 'No curriculum',
    display_order: nextOrder(),
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidRubric);
});

test('the list is ordered by the order the curriculum set, not by the code', async () => {
  // The fourth criterion's *respected*. The seed sorts RUB-02 above RUB-01 and
  // RUB-05 above RUB-04 for this assertion specifically: 0501's outcomes in #19
  // had their order equal to their own number, so ordering by the field and
  // ordering by the code produced identical output and an assertion on either
  // passed whichever the route actually used (#96).
  const cookie = await signInAs('U_COM');
  const rows = seeded((await list(cookie, '?per_page=100')).body.rubrics);
  const codes = rows.map((row) => row.rubric_code);

  assert.deepEqual(
    codes,
    [...RUBRICS]
      .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code))
      .map((entry) => entry.code),
  );
  assert.ok(codes.indexOf('RUB-02') < codes.indexOf('RUB-01'), 'the order was ignored');
  assert.ok(codes.indexOf('RUB-05') < codes.indexOf('RUB-04'), 'the order was ignored');
});

test('two rubrics claiming the same place are still in a settled order', async () => {
  // `display_order` is NOT NULL DEFAULT 0, so a tie is what every rubric starts
  // out in rather than an edge case, and this list pages. An ORDER BY with
  // nothing after the order lets the plan return tied rows either way round on
  // either page, which shows one row twice and loses another entirely. RUB-06
  // and RUB-07 share an order in the seed so that the tiebreak has something to
  // break.
  const cookie = await signInAs('U_COM');
  const tied = RUBRICS.filter((entry) => entry.order === RUBRICS[5].order).map((e) => e.code);
  assert.equal(tied.length, 2, 'the seed no longer holds a tie for this test to read');

  const codes = seeded((await list(cookie, '?per_page=100')).body.rubrics).map(
    (row) => row.rubric_code,
  );
  assert.ok(codes.indexOf(tied[0]) < codes.indexOf(tied[1]));
  assert.equal(codes.indexOf(tied[1]) - codes.indexOf(tied[0]), 1, 'the tied rows drifted apart');

  // Asked twice, answered the same way. A tiebreak that is not in the SQL can
  // still look settled in one reading.
  const again = seeded((await list(cookie, '?per_page=100')).body.rubrics).map(
    (row) => row.rubric_code,
  );
  assert.deepEqual(again, codes);
});

test('the list pages at ten, and no rubric is on two pages or on none', async () => {
  // The eighth criterion. The seed holds eleven rubrics for this curriculum
  // because ten would let a broken pager draw itself, say "หน้า 1 จาก 1" and
  // pass every assertion about it.
  const cookie = await signInAs('U_COM');
  const first = await list(cookie, `?program_id=${PROGRAM}`);
  assert.equal(first.status, 200);
  assert.equal(first.body.page, 1);
  assert.equal(first.body.per_page, 10);
  assert.equal(first.body.rubrics.length, 10);
  assert.ok(first.body.total > 10, 'the seed no longer holds more than one page');

  const second = await list(cookie, `?program_id=${PROGRAM}&page=2`);
  assert.equal(second.body.page, 2);
  assert.ok(second.body.rubrics.length > 0);

  const whole = (await list(cookie, `?program_id=${PROGRAM}&per_page=100`)).body.rubrics.map(
    (row) => row.rubric_code,
  );
  const paged = [...first.body.rubrics, ...second.body.rubrics].map((row) => row.rubric_code);
  assert.deepEqual(paged, whole.slice(0, paged.length), 'the pages disagree with the whole list');
  assert.equal(new Set(paged).size, paged.length, 'a rubric appeared on two pages');
});

test('the filter narrows inside the reach and never outside it', async () => {
  // A departmental administrator holds both curricula, so the filter is a
  // narrowing for them; the same query string from the committee member who
  // holds neither of the other's rubrics is an empty page rather than a way of
  // reading them.
  const admin = await signInAs('U_DEPT');
  const both = (await list(admin, '?per_page=100')).body.rubrics;
  assert.ok(both.some((row) => row.program_id === PROGRAM));
  assert.ok(both.some((row) => row.program_id === PROGRAM_INTL));

  const narrowed = (await list(admin, `?program_id=${PROGRAM_INTL}&per_page=100`)).body.rubrics;
  assert.deepEqual(
    narrowed.map((row) => row.rubric_code).sort(),
    RUBRICS_INTL.map((entry) => entry.code).sort(),
  );

  const committee = await signInAs('U_COM2');
  const reachedFor = await list(committee, `?program_id=${PROGRAM}&per_page=100`);
  assert.equal(reachedFor.status, 200);
  assert.deepEqual(reachedFor.body.rubrics, []);
  assert.equal(reachedFor.body.total, 0);
});

test('a committee member reaches only their own curriculum, in every verb', async () => {
  // The seventh criterion, enforced at the server rather than in a menu. Out of
  // reach answers 404 rather than 403 for the reads, for `ploNotFound`'s
  // reason: telling the two apart would turn the address bar into a way of
  // learning which rubrics another curriculum keeps.
  const owner = await signInAs('U_COM');
  const mine = await rubric(owner);
  const outsider = await signInAs('U_COM2');

  assert.equal((await one(outsider, mine.id)).status, 404);
  assert.equal(
    (
      await edit(outsider, mine.id, {
        rubric_code: mine.rubric_code,
        rubric_name_th: 'แก้โดยคนอื่น',
        rubric_name_en: 'Edited by an outsider',
        display_order: mine.display_order,
      })
    ).status,
    404,
  );
  assert.equal((await remove(outsider, mine.id)).status, 404);

  // Writing *into* the other curriculum is 403 and not 404: the curriculum was
  // named by the body, and what it says about is which curricula this account
  // holds, not which rubrics exist.
  const refused = await add(outsider, {
    program_id: PROGRAM,
    rubric_code: nextCode(),
    rubric_name_th: 'ไม่ควรถูกสร้าง',
    rubric_name_en: 'Should not exist',
    display_order: nextOrder(),
  });
  assert.equal(refused.status, 403);
  assert.equal(refused.body.message, REFUSALS.rubricProgramNotYours);

  // And the row is untouched by any of it.
  const after = await one(owner, mine.id);
  assert.equal(after.status, 200);
  assert.equal(after.body.rubric.rubric_name_th, mine.rubric_name_th);
});

test('an edit cannot move a rubric to another curriculum, however the body asks', async () => {
  // The curriculum is not read from the body on an edit. A form that sends it
  // anyway - and the screen's does, because one component serves both verbs -
  // must not be able to move a rubric out from under the accounts that
  // maintain it, taking criteria that carry no curriculum of their own with it.
  const cookie = await signInAs('U_DEPT');
  const mine = await rubric(cookie);

  const moved = await edit(cookie, mine.id, {
    program_id: PROGRAM_INTL,
    rubric_code: mine.rubric_code,
    rubric_name_th: mine.rubric_name_th,
    rubric_name_en: mine.rubric_name_en,
    display_order: mine.display_order,
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.body.rubric.program_id, PROGRAM);
});

test('the curricula offered are the ones the account holds', async () => {
  const admin = await signInAs('U_DEPT');
  const answered = await programs(admin);
  assert.equal(answered.status, 200);
  const held = answered.body.programs.map((program) => program.program_id);
  assert.ok(held.includes(PROGRAM));
  assert.ok(held.includes(PROGRAM_INTL));

  const committee = await programs(await signInAs('U_COM2'));
  assert.deepEqual(
    committee.body.programs.map((program) => program.program_id),
    [PROGRAM_INTL],
  );
});

test('the faculty administrator and the teacher are refused the screen entirely', async () => {
  // #79 for the first, ADR-0002 for both: what is inside a curriculum is
  // decided below the faculty, and marking against a rubric is not writing one.
  for (const alias of ['U_FAC', 'U_TEACH']) {
    const cookie = await signInAs(alias);
    assert.equal((await list(cookie, `?program_id=${PROGRAM}`)).status, 403, alias);
    assert.equal((await programs(cookie)).status, 403, alias);
    assert.equal(
      (
        await add(cookie, {
          program_id: PROGRAM,
          rubric_code: nextCode(),
          rubric_name_th: 'ไม่ควรถูกสร้าง',
          rubric_name_en: 'Should not exist',
          display_order: nextOrder(),
        })
      ).status,
      403,
      alias,
    );
  }
});

test('removing a rubric removes its criteria, and says how many went', async () => {
  // The one thing on this screen that cannot be undone. Nothing points at a
  // rubric except its own criteria and those CASCADE, so there is no
  // "switched off instead" to fall back on - the row goes and they go with it.
  // The count is what lets the screen say so rather than reporting a bare ลบแล้ว
  // over four criteria that have just been destroyed.
  const cookie = await signInAs('U_COM');
  const mine = await rubric(cookie);

  for (const n of [1, 2, 3]) {
    await api.pool.query(
      `INSERT INTO rubric_details (rubric_id, criteria_name_th, criteria_name_en, display_order)
       VALUES ($1, $2, $3, $4)`,
      [mine.id, `เกณฑ์ที่ ${n}`, `Criterion ${n}`, n],
    );
  }

  const counted = await one(cookie, mine.id);
  assert.equal(counted.body.rubric.criteria_count, 3, 'the list cannot warn about what it cannot count');

  const gone = await remove(cookie, mine.id);
  assert.equal(gone.status, 200);
  assert.equal(gone.body.criteria_removed, 3);
  assert.equal(gone.body.rubric_code, mine.rubric_code);

  const { rows } = await api.pool.query('SELECT 1 FROM rubric_details WHERE rubric_id = $1', [
    mine.id,
  ]);
  assert.equal(rows.length, 0, 'the criteria outlived the rubric they belong to');

  // And a rubric nobody has filled in yet reports nothing removed, rather than
  // a number the screen would put in a sentence about criteria that never were.
  const empty = await rubric(cookie);
  const emptied = await remove(cookie, empty.id);
  assert.equal(emptied.body.criteria_removed, 0);
});

test('a rubric that was never made, and one addressed by nonsense, both answer the same way', async () => {
  const cookie = await signInAs('U_COM');
  for (const address of ['999999', 'RUB-01', '1e3']) {
    const answered = await one(cookie, address);
    assert.equal(answered.status, 404, address);
    assert.equal(answered.body.message, REFUSALS.rubricNotFound, address);
  }
});

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
  byAlias,
} = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/30-weighting-scheme.md — the server half.
 *
 * The weighting scheme is how the Subject's marks are divided — สัดส่วนคะแนน,
 * BR-05 — and two decisions shape every test here.
 *
 * *The scheme is saved whole.* Per-row verbs cannot keep the hundred-total
 * true through their intermediate states — adding a category to a full scheme
 * would have to pass through 110 — so the one write is a PUT of the whole
 * list, refused if it does not total 100, with the current total in the
 * sentence (the second criterion, word for word). The rule holds against a
 * crafted request because the ninth criterion says exactly that.
 *
 * *Rows keep their identity.* `activities.score_ratio_id` points at these
 * rows, so a save that deleted and re-inserted a renamed category would strand
 * every Activity filed under it. The PUT reconciles instead: rows claimed by
 * id or by name are updated in place, and the tests assert ids across saves —
 * a diff that counted rows would pass a delete-and-recreate that broke every
 * Activity in the system.
 *
 * The grain is ADR-0003's, one table over from the CLO suite: the scheme
 * belongs to (Program, Subject, year), reached through any Section of the
 * Offering and independent per year. The import walks through `lib/importer`
 * — the shared module, criterion seven — with the whole-file rule and the
 * replace semantics as this ticket's two extensions to it.
 */

const DEPT_COMPUTER = '05';

/** The seed's scheme, by name and weight — โครงงาน 40 / กลางภาค 30 / ปลายภาค 30. */
const SEEDED = SCORE_RATIOS.map((ratio) => ({
  score_category: ratio.category,
  weight: ratio.weight,
}));

let api;
before(async () => {
  api = await startApi('weights', { withSeed: true });
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

const url = (sectionId) => '/api/teaching/sections/' + sectionId + '/weights';

const read = (cookie, sectionId) => request(api.app).get(url(sectionId)).set('Cookie', cookie);

const save = (cookie, sectionId, weights) =>
  request(api.app).put(url(sectionId)).set('Cookie', cookie).send({ weights });

const importFile = (cookie, sectionId, csv) =>
  request(api.app)
    .post(url(sectionId) + '/import')
    .set('Cookie', cookie)
    .set('Content-Type', 'text/csv')
    .send(csv);

/** A Section straight from the database, by whose it is and which term it is in. */
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

/** The scheme as the screen reads it, asserting the read itself succeeded. */
async function scheme(cookie, sectionId) {
  const answered = await read(cookie, sectionId);
  assert.equal(answered.status, 200, answered.body.message);
  return answered.body.weights;
}

/** Puts the seeded three back, claiming their ids, so tests leave what they found. */
async function restoreSeeded(cookie, sectionId) {
  const current = await scheme(cookie, sectionId);
  const byName = new Map(current.map((row) => [row.score_category, row.score_ratio_id]));
  const restored = await save(
    cookie,
    sectionId,
    SEEDED.map((row) => ({ ...row, score_ratio_id: byName.get(row.score_category) })),
  );
  assert.equal(restored.status, 200, restored.body.message);
  assert.deepEqual(
    restored.body.weights.map(({ score_category, weight }) => ({ score_category, weight })),
    SEEDED,
  );
}

test('the scheme arrives under the offering, ordered, and totals one hundred', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const answered = await read(cookie, section);
  assert.equal(answered.status, 200);
  assert.equal(answered.body.offering.academic_year, CURRENT_YEAR);

  assert.deepEqual(
    answered.body.weights.map(({ score_category, weight }) => ({ score_category, weight })),
    SEEDED,
  );
  assert.deepEqual(
    answered.body.weights.map((row) => row.sequence_order),
    [1, 2, 3],
  );
  assert.equal(
    answered.body.weights.reduce((sum, row) => sum + row.weight, 0),
    100,
  );
});

test('the scheme is identical from either Section of the same Offering', async () => {
  // The fourth criterion, on ids: two independent copies of three rows would
  // pass a test that compared names and weights.
  const mine = await teaching('U_TEACH');
  const theirs = await teaching('U_MULTI');
  const here = await seededSection('U_TEACH', CURRENT_YEAR);
  const there = await seededSection('U_MULTI', CURRENT_YEAR);

  assert.deepEqual(
    (await scheme(theirs, there)).map((row) => row.score_ratio_id),
    (await scheme(mine, here)).map((row) => row.score_ratio_id),
  );
});

test('another year of the same Subject holds its own scheme', async () => {
  const cookie = await teaching('U_TEACH');
  const now = await seededSection('U_TEACH', CURRENT_YEAR);
  const then = await seededSection('U_TEACH', PRIOR_YEAR);

  const thisYear = (await scheme(cookie, now)).map((row) => row.score_ratio_id);
  const lastYear = (await scheme(cookie, then)).map((row) => row.score_ratio_id);
  assert.deepEqual(
    thisYear.filter((id) => lastYear.includes(id)),
    [],
  );
});

test('editing the weights keeps every row its identity', async () => {
  // The rows are what activities point at, so an edit that deleted and
  // re-inserted would strand them. Ids across the save are the assertion.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const current = await scheme(cookie, section);

  const shifted = await save(
    cookie,
    section,
    current.map((row, index) => ({
      score_ratio_id: row.score_ratio_id,
      score_category: row.score_category,
      weight: [50, 30, 20][index],
    })),
  );
  assert.equal(shifted.status, 200, shifted.body.message);
  assert.deepEqual(
    shifted.body.weights.map((row) => row.score_ratio_id),
    current.map((row) => row.score_ratio_id),
  );
  assert.deepEqual(
    shifted.body.weights.map((row) => row.weight),
    [50, 30, 20],
  );

  // And the other year did not move — the fifth criterion on a *successful*
  // save, where the isolation is doing real work, not only on a refused one.
  const then = await seededSection('U_TEACH', PRIOR_YEAR);
  assert.deepEqual(
    (await scheme(cookie, then)).map((row) => row.weight),
    SEEDED.map((row) => row.weight),
  );

  await restoreSeeded(cookie, section);
});

test('a new category joins with the weights rebalanced, and leaves the same way', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const current = await scheme(cookie, section);

  const grown = await save(cookie, section, [
    ...current.map((row, index) => ({
      score_ratio_id: row.score_ratio_id,
      score_category: row.score_category,
      weight: [40, 30, 20][index],
    })),
    { score_category: 'สอบย่อย', weight: 10 },
  ]);
  assert.equal(grown.status, 200, grown.body.message);
  assert.equal(grown.body.weights.length, 4);
  const added = grown.body.weights.find((row) => row.score_category === 'สอบย่อย');
  assert.ok(added.score_ratio_id, 'the new row is a real row with an id');
  assert.equal(added.sequence_order, 4);

  // Dropping it again is legal precisely because nothing points at it yet —
  // the sixth criterion's guard is about rows with Activities, not this one.
  await restoreSeeded(cookie, section);
  const settled = await scheme(cookie, section);
  assert.ok(!settled.some((row) => row.score_category === 'สอบย่อย'));
});

test('a scheme that does not total one hundred is refused, and the sentence says the total', async () => {
  // The second criterion word for word, and the ninth: this request never
  // came from the form, and the server is the one that refuses it.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const current = await scheme(cookie, section);

  const refused = await save(
    cookie,
    section,
    current.map((row, index) => ({
      score_ratio_id: row.score_ratio_id,
      score_category: row.score_category,
      weight: [40, 30, 20][index],
    })),
  );
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.weightsNotHundred(90));
  assert.ok(refused.body.message.includes('90'), 'the sentence carries the total');

  // And nothing moved.
  assert.deepEqual(
    (await scheme(cookie, section)).map((row) => row.weight),
    SEEDED.map((row) => row.weight),
  );
});

test('an empty scheme is a total of zero, not a way around the rule', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await save(cookie, section, []);
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.weightsNotHundred(0));
  assert.equal((await scheme(cookie, section)).length, 3);
});

test('a weight outside nought to one hundred, or not an integer, is refused before the sum', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  for (const weight of [101, -1, 40.5, 'สี่สิบ', null]) {
    const refused = await save(cookie, section, [
      { score_category: 'ทั้งหมด', weight },
      { score_category: 'ที่เหลือ', weight: 60 },
    ]);
    assert.equal(refused.status, 400, 'weight ' + weight + ' should be refused');
    assert.equal(refused.body.message, REFUSALS.invalidWeight);
  }
  assert.equal((await scheme(cookie, section)).length, 3);
});

test('two rows of one name are refused before the database is asked', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await save(cookie, section, [
    { score_category: 'สอบ', weight: 50 },
    { score_category: ' สอบ ', weight: 50 },
  ]);
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.duplicateWeightCategory);
});

test('a blank category is refused with nothing written', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await save(cookie, section, [
    { score_category: '   ', weight: 100 },
  ]);
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidWeight);
  assert.equal((await scheme(cookie, section)).length, 3);
});

test('a category with Activities against it cannot be dropped, and the refusal names it', async () => {
  // The sixth criterion. Every seeded category carries Activities, so
  // dropping โครงงาน and rebalancing is exactly the request the guard is for.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const current = await scheme(cookie, section);

  const refused = await save(
    cookie,
    section,
    current
      .filter((row) => row.score_category !== 'โครงงาน')
      .map((row) => ({
        score_ratio_id: row.score_ratio_id,
        score_category: row.score_category,
        weight: 50,
      })),
  );
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.weightInUse('โครงงาน'));

  assert.equal((await scheme(cookie, section)).length, 3);
});

test('a row of another Offering cannot be claimed through this one', async () => {
  // #22's pairing at this grain: the id in the body must belong to the
  // offering in the address, or the save could rewrite another year's scheme.
  const cookie = await teaching('U_TEACH');
  const now = await seededSection('U_TEACH', CURRENT_YEAR);
  const then = await seededSection('U_TEACH', PRIOR_YEAR);
  const [strayed] = await scheme(cookie, then);

  const refused = await save(cookie, now, [
    {
      score_ratio_id: strayed.score_ratio_id,
      score_category: 'ของปีอื่น',
      weight: 100,
    },
  ]);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.weightNotFound);

  // And last year's row is untouched under its own year.
  const kept = await scheme(cookie, then);
  assert.ok(kept.some((row) => row.score_ratio_id === strayed.score_ratio_id));
});

test('renaming categories, even in a swap, lands where the ids say', async () => {
  // Two rows trading names collide with the unique key at every intermediate
  // order, which is what the temporary-name pass exists for. The ids prove
  // the swap moved names and not rows.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const current = await scheme(cookie, section);
  const midterm = current.find((row) => row.score_category === 'สอบกลางภาค');
  const final = current.find((row) => row.score_category === 'สอบปลายภาค');

  const swapped = await save(
    cookie,
    section,
    current.map((row) => ({
      score_ratio_id: row.score_ratio_id,
      score_category:
        row.score_ratio_id === midterm.score_ratio_id
          ? 'สอบปลายภาค'
          : row.score_ratio_id === final.score_ratio_id
            ? 'สอบกลางภาค'
            : row.score_category,
      weight: row.weight,
    })),
  );
  assert.equal(swapped.status, 200, swapped.body.message);
  const renamed = new Map(
    swapped.body.weights.map((row) => [row.score_ratio_id, row.score_category]),
  );
  assert.equal(renamed.get(midterm.score_ratio_id), 'สอบปลายภาค');
  assert.equal(renamed.get(final.score_ratio_id), 'สอบกลางภาค');

  await restoreSeeded(cookie, section);
});

test('a rename by id frees the old name for a newcomer, and the total stays whole', async () => {
  // The double-claim regression the review caught: rename โครงงาน by id
  // while a new row takes the name โครงงาน. Resolved one claim per existing
  // row — without that, both sent rows landed on the same UPDATE, nothing
  // was inserted, and the committed scheme totalled 80 after passing the
  // hundred check.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const current = await scheme(cookie, section);
  const project = current.find((row) => row.score_category === 'โครงงาน');
  const others = current.filter((row) => row !== project);

  const saved = await save(cookie, section, [
    { score_ratio_id: project.score_ratio_id, score_category: 'โครงงานกลุ่ม', weight: 20 },
    ...others.map((row) => ({
      score_ratio_id: row.score_ratio_id,
      score_category: row.score_category,
      weight: row.weight,
    })),
    { score_category: 'โครงงาน', weight: 20 },
  ]);
  assert.equal(saved.status, 200, saved.body.message);
  assert.equal(saved.body.weights.length, 4);
  assert.equal(
    saved.body.weights.reduce((sum, row) => sum + row.weight, 0),
    100,
  );
  const renamed = saved.body.weights.find((row) => row.score_category === 'โครงงานกลุ่ม');
  const newcomer = saved.body.weights.find((row) => row.score_category === 'โครงงาน');
  assert.equal(renamed.score_ratio_id, project.score_ratio_id, 'the rename kept its row');
  assert.notEqual(newcomer.score_ratio_id, project.score_ratio_id, 'the newcomer is its own row');

  // Two body rows claiming one id is a request no screen sends, refused
  // rather than resolved to whichever came last.
  const twice = await save(cookie, section, [
    { score_ratio_id: project.score_ratio_id, score_category: 'ก', weight: 50 },
    { score_ratio_id: project.score_ratio_id, score_category: 'ข', weight: 50 },
  ]);
  assert.equal(twice.status, 400);
  assert.equal(twice.body.message, REFUSALS.invalidWeight);

  // Restore: the newcomer goes (nothing points at it) and the renamed row —
  // the one the Activities follow — takes its old name back.
  const restored = await save(cookie, section, [
    { score_ratio_id: project.score_ratio_id, score_category: 'โครงงาน', weight: 40 },
    ...others.map((row) => ({
      score_ratio_id: row.score_ratio_id,
      score_category: row.score_category,
      weight: row.weight,
    })),
  ]);
  assert.equal(restored.status, 200, restored.body.message);
  assert.deepEqual(
    restored.body.weights.map(({ score_category, weight }) => ({ score_category, weight })),
    SEEDED,
  );
});

test('the template downloads with the two columns', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const answered = await request(api.app)
    .get(url(section) + '/import-template')
    .set('Cookie', cookie);
  assert.equal(answered.status, 200);
  assert.match(answered.headers['content-type'], /text\/csv/);
  assert.ok(answered.text.includes('score_category'));
  assert.ok(answered.text.includes('weight'));
});

test('an import replaces the scheme as one, keeping the rows Activities point at', async () => {
  // The seventh criterion's happy half. The three seeded categories reappear
  // in the file, so they are updated in place — same ids after as before —
  // and the fourth is inserted.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const before = await scheme(cookie, section);

  const applied = await importFile(
    cookie,
    section,
    'score_category,weight\nโครงงาน,40\nสอบกลางภาค,30\nสอบปลายภาค,20\nสอบย่อย,10\n',
  );
  assert.equal(applied.status, 201, JSON.stringify(applied.body));
  assert.equal(applied.body.created, 4);

  const after = await scheme(cookie, section);
  assert.equal(after.length, 4);
  for (const was of before) {
    const is = after.find((row) => row.score_category === was.score_category);
    assert.equal(is.score_ratio_id, was.score_ratio_id, was.score_category + ' kept its id');
  }
  assert.equal(after.find((row) => row.score_category === 'สอบปลายภาค').weight, 20);

  await restoreSeeded(cookie, section);
});

test('an import with a bad row reports the line and applies nothing', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await importFile(
    cookie,
    section,
    'score_category,weight\nโครงงาน,40\nสอบกลางภาค,ยี่สิบ\nสอบปลายภาค,40\n',
  );
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.importRejected);
  assert.deepEqual(refused.body.errors, [{ line: 3, message: REFUSALS.invalidWeight }]);

  assert.equal((await scheme(cookie, section)).length, 3);
});

test('two file rows of one category name the earlier line', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await importFile(
    cookie,
    section,
    'score_category,weight\nโครงงาน,50\nโครงงาน,50\n',
  );
  assert.equal(refused.status, 400);
  assert.equal(refused.body.errors.length, 1);
  assert.equal(refused.body.errors[0].line, 3);
  assert.ok(refused.body.errors[0].message.includes('ซ้ำกับบรรทัดที่ 2'));
});

test('an import that does not total one hundred is refused with the total', async () => {
  // The hundred rule is the file's, not any row's, so it arrives as the
  // refusal sentence rather than as a per-row report.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await importFile(
    cookie,
    section,
    'score_category,weight\nโครงงาน,40\nสอบกลางภาค,30\nสอบปลายภาค,20\n',
  );
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.weightsNotHundred(90));
  assert.deepEqual(refused.body.errors, []);

  assert.deepEqual(
    (await scheme(cookie, section)).map((row) => row.weight),
    SEEDED.map((row) => row.weight),
  );
});

test('an import that drops a category in use is refused naming it', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await importFile(cookie, section, 'score_category,weight\nโครงงาน,100\n');
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.weightInUse('สอบกลางภาค'));

  assert.equal((await scheme(cookie, section)).length, 3);
});

test('an empty file and a stranger file are refused in their own words', async () => {
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const empty = await importFile(cookie, section, '');
  assert.equal(empty.status, 400);
  assert.equal(empty.body.message, REFUSALS.importEmpty);

  const stranger = await importFile(cookie, section, 'student_id\n66019999\n');
  assert.equal(stranger.status, 400);
  assert.equal(stranger.body.message, REFUSALS.importWrongTemplate);
});

test('a Section the caller does not teach hides the scheme behind the section refusal', async () => {
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const cookie = await teaching('U_TEACH2');
  const refused = await read(cookie, section);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.sectionNotFound);
  assert.equal((await save(cookie, section, SEEDED)).status, 404);
  assert.equal((await importFile(cookie, section, 'score_category,weight\nก,100\n')).status, 404);
});

test('a role that is not a teaching one does not reach these routes at all', async () => {
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  for (const alias of ['U_COM', 'U_ADMIN', 'U_DEPT', 'U_FAC']) {
    const cookie = await signInAs(alias);
    const refused = await read(cookie, section);
    assert.equal(refused.status, 403, alias + ' should not reach the weighting screen');
    assert.equal(refused.body.message, REFUSALS.forbidden);
  }
});

test('an anonymous caller is refused before any of this is considered', async () => {
  const refused = await request(api.app).get(url(1));
  assert.equal(refused.status, 401);
  assert.equal(refused.body.reason, 'anonymous');
});

'use strict';

/**
 * Ticket #19: what a graduate of a หลักสูตร can do.
 *
 * The same one seam as every other suite here: the HTTP surface in-process
 * against a real PostgreSQL, signing in for real.
 *
 * Three things about this file are decisions rather than habit.
 *
 * *The two curricula are the point, not the setting.* U_COM administers 0501
 * and U_COM2 administers 0503, and the ticket's fifth and eighth criteria are
 * both statements about the pair: the same รหัส may exist in each, and neither
 * committee member may touch the other's. The seed now gives 0503 its own tree
 * (`PLOS_INTL`) so the fifth is asserted on data the screen also shows, not
 * only on rows this file made for itself.
 *
 * *Codes made here begin `Z`.* The seed's 0501 already holds PLO-1..PLO-13
 * with their sub-outcomes, and a test creating `PLO-1` there would be
 * asserting against the seed's row rather than against its own.
 *
 * *`FACULTY_ADMIN` is on the refused side.* The ticket's eighth criterion says
 * faculty administrators manage PLOs within their scope. #79 reversed that
 * after the ticket was written - the faculty keeps the list of หลักสูตร, and
 * what is inside one is decided below it - and names A09, this screen, as one
 * of the three tickets it binds. The criterion is stale; #79 is the decision.
 *
 * Two criteria are asserted somewhere other than in this file. *"the tree
 * renders with its nesting visible"* and *"removal asks for confirmation
 * first"* are both about a screen, and docs/06 settles that frontend
 * components are not unit-tested, so they are on the hand-worked checklist in
 * docs/acceptance/19. What is a fact about the API - that the rows come back
 * in tree order carrying the depth the screen indents by - is here.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const {
  PASSWORD,
  ACCOUNTS,
  PROGRAM,
  PROGRAM_INTL,
  PLOS,
  PLOS_INTL,
  SUBJECT,
  CURRENT_YEAR,
} = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * `outcome_type`, exactly - written out rather than imported from the route,
 * for #16's reason: a test comparing the accepted set against the constant
 * that built it would pass whatever that constant said.
 */
const TYPES = ['knowledge', 'skills', 'ethics', 'character'];

let api;
before(async () => {
  api = await startApi('plos', { withSeed: true });
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

const list = (cookie, query = '') => request(api.app).get(`/api/plos${query}`).set('Cookie', cookie);

const one = (cookie, id) => request(api.app).get(`/api/plos/${id}`).set('Cookie', cookie);

const add = (cookie, body) => request(api.app).post('/api/plos').set('Cookie', cookie).send(body);

const edit = (cookie, id, body) =>
  request(api.app).put(`/api/plos/${id}`).set('Cookie', cookie).send(body);

const remove = (cookie, id) => request(api.app).delete(`/api/plos/${id}`).set('Cookie', cookie);

const programs = (cookie) => request(api.app).get('/api/plos/programs').set('Cookie', cookie);

/** A distinct code per call, so tests neither collide with each other nor rerun dirty. */
let counter = 0;
const nextCode = () => `Z${(counter += 1)}`;

/** One outcome of PROGRAM, made through the API by the account that owns it. */
async function outcome(cookie, overrides = {}) {
  const response = await add(cookie, {
    program_id: PROGRAM,
    outcome_code: nextCode(),
    outcome_title: 'ผลการเรียนรู้สำหรับการทดสอบ',
    outcome_type: 'knowledge',
    sequence_order: 90,
    ...overrides,
  });
  assert.equal(response.status, 201, `create failed: ${response.body.message}`);
  return response.body.plo;
}

test('a committee member adds, reads back, edits and removes an outcome of their own curriculum', async () => {
  // The first criterion, end to end, on a row this test owns.
  const cookie = await signInAs('U_COM');
  const code = nextCode();

  const created = await add(cookie, {
    program_id: PROGRAM,
    outcome_code: code,
    outcome_title: 'อธิบายหลักการของระบบปฏิบัติการได้',
    outcome_description: 'ครอบคลุมการจัดการหน่วยความจำและกระบวนการ',
    outcome_type: 'knowledge',
    sequence_order: 91,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.plo.outcome_code, code);
  assert.equal(created.body.plo.program_id, PROGRAM);
  assert.equal(created.body.plo.is_active, true);
  // Depth is the server's answer, not the caller's - see the route's note.
  assert.equal(created.body.plo.level_depth, 1);
  assert.equal(created.body.plo.parent_outcome_id, null);

  const read = await one(cookie, created.body.plo.outcome_id);
  assert.equal(read.status, 200);
  assert.equal(read.body.plo.outcome_title, 'อธิบายหลักการของระบบปฏิบัติการได้');

  const changed = await edit(cookie, created.body.plo.outcome_id, {
    outcome_code: code,
    outcome_title: 'อธิบายหลักการของระบบปฏิบัติการและเครือข่ายได้',
    outcome_type: 'skills',
    sequence_order: 92,
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.plo.outcome_title, 'อธิบายหลักการของระบบปฏิบัติการและเครือข่ายได้');
  assert.equal(changed.body.plo.outcome_type, 'skills');
  assert.equal(changed.body.plo.sequence_order, 92);

  const gone = await remove(cookie, created.body.plo.outcome_id);
  assert.equal(gone.status, 204);
  assert.equal((await one(cookie, created.body.plo.outcome_id)).status, 404);
});

test('an outcome is created under another, and the list comes back in tree order with its depth', async () => {
  // The second criterion, in the half that is a fact about the API. Whether the
  // nesting is *visible* is a screen, and is walked by hand.
  const cookie = await signInAs('U_COM');

  const main = await outcome(cookie, { sequence_order: 93 });
  const second = await outcome(cookie, { sequence_order: 94 });
  const childB = await outcome(cookie, { parent_outcome_id: main.outcome_id, sequence_order: 2 });
  const childA = await outcome(cookie, { parent_outcome_id: main.outcome_id, sequence_order: 1 });

  assert.equal(childA.level_depth, 2);
  assert.equal(childA.parent_outcome_id, main.outcome_id);

  const answered = await list(cookie, `?program_id=${PROGRAM}`);
  assert.equal(answered.status, 200);
  const order = answered.body.plos.map((plo) => plo.outcome_id);

  // The children sit directly under their parent, in their own order, and the
  // next main outcome comes after both of them - which is what tree order means
  // and what a flat ORDER BY sequence_order would not have given.
  const at = (id) => order.indexOf(id);
  assert.equal(at(childA.outcome_id), at(main.outcome_id) + 1);
  assert.equal(at(childB.outcome_id), at(main.outcome_id) + 2);
  assert.ok(at(second.outcome_id) > at(childB.outcome_id));
});

test('each of the four types is accepted, and a fifth is refused', async () => {
  // The third criterion. The refusal matters as much as the acceptance: the
  // column is an enum, so an unlisted value reaches the database as an error
  // rather than as a bad row, and the criterion asks for a sentence.
  const cookie = await signInAs('U_COM');

  for (const type of TYPES) {
    const created = await outcome(cookie, { outcome_type: type, sequence_order: 95 });
    assert.equal(created.outcome_type, type);
  }

  const refused = await add(cookie, {
    program_id: PROGRAM,
    outcome_code: nextCode(),
    outcome_title: 'ประเภทที่ไม่มีอยู่',
    outcome_type: 'attitude',
    sequence_order: 96,
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.message, REFUSALS.invalidPlo);
});

test('display order is settable, and changing it changes where the outcome appears', async () => {
  // The fourth criterion. Asserted as a *move*: two outcomes made in one order
  // and read back in the other, so the assertion cannot pass on a route that
  // ordered by the code or by the identifier instead.
  const cookie = await signInAs('U_COM');

  const first = await outcome(cookie, { sequence_order: 81 });
  const second = await outcome(cookie, { sequence_order: 82 });

  const before = (await list(cookie, `?program_id=${PROGRAM}`)).body.plos.map((p) => p.outcome_id);
  assert.ok(before.indexOf(first.outcome_id) < before.indexOf(second.outcome_id));

  const moved = await edit(cookie, first.outcome_id, {
    outcome_code: first.outcome_code,
    outcome_title: first.outcome_title,
    outcome_type: first.outcome_type,
    sequence_order: 83,
  });
  assert.equal(moved.status, 200);

  const after = (await list(cookie, `?program_id=${PROGRAM}`)).body.plos.map((p) => p.outcome_id);
  assert.ok(after.indexOf(first.outcome_id) > after.indexOf(second.outcome_id));
});

test('the seeded curricula each hold their own PLO-1, and 0503 sorts by order rather than by code', async () => {
  // The fifth criterion on the data the screen shows, and the fourth again on
  // the only seeded rows where ordering by the field and ordering by the code
  // give different answers.
  const dept = await signInAs('U_DEPT');

  const mine = (await list(dept, `?program_id=${PROGRAM}`)).body.plos;
  const theirs = (await list(dept, `?program_id=${PROGRAM_INTL}`)).body.plos;

  const here = mine.find((plo) => plo.outcome_code === 'PLO-1');
  const there = theirs.find((plo) => plo.outcome_code === 'PLO-1');
  assert.ok(here && there);
  assert.notEqual(here.outcome_id, there.outcome_id);
  assert.equal(here.outcome_title, PLOS[0].title);
  assert.equal(there.outcome_title, PLOS_INTL[0].title);

  const codes = theirs.filter((plo) => plo.level_depth === 1).map((plo) => plo.outcome_code);
  assert.deepEqual(codes, ['PLO-2', 'PLO-1']);
});

test('two curricula may each define the same code, and one curriculum may not define it twice', async () => {
  // The fifth criterion and the ninth, on rows these tests make: the same code
  // is accepted in the other curriculum by the account that holds it, and
  // refused in the one that already has it.
  const mine = await signInAs('U_COM');
  const theirs = await signInAs('U_COM2');
  const code = nextCode();

  const here = await add(mine, {
    program_id: PROGRAM,
    outcome_code: code,
    outcome_title: 'ผลการเรียนรู้ของหลักสูตรแรก',
    outcome_type: 'knowledge',
    sequence_order: 71,
  });
  assert.equal(here.status, 201);

  const there = await add(theirs, {
    program_id: PROGRAM_INTL,
    outcome_code: code,
    outcome_title: 'ผลการเรียนรู้ของหลักสูตรที่สอง',
    outcome_type: 'skills',
    sequence_order: 71,
  });
  assert.equal(
    there.status,
    201,
    `the same code in another curriculum was refused: ${there.body.message}`,
  );
  assert.notEqual(here.body.plo.outcome_id, there.body.plo.outcome_id);

  const again = await add(mine, {
    program_id: PROGRAM,
    outcome_code: code,
    outcome_title: 'รหัสซ้ำในหลักสูตรเดียวกัน',
    outcome_type: 'ethics',
    sequence_order: 72,
  });
  assert.equal(again.status, 409);
  assert.equal(again.body.message, REFUSALS.duplicatePloCode);
});

test('an outcome a subject mapping points at is switched off instead of removed', async () => {
  // The sixth criterion, first of its two references.
  const cookie = await signInAs('U_COM');
  const plo = await outcome(cookie, { sequence_order: 61 });

  await api.pool.query(
    `INSERT INTO subject_plo_mapping (program_id, subject_id, outcome_id, mapping_level)
     VALUES ($1, $2, $3, 'I')`,
    [PROGRAM, SUBJECT.id, plo.outcome_id],
  );

  const answered = await remove(cookie, plo.outcome_id);
  assert.equal(answered.status, 200);
  assert.equal(answered.body.deactivated, true);
  assert.equal(answered.body.plo.is_active, false);

  // Still there and still readable - this is the screen it is switched back on from.
  assert.equal((await one(cookie, plo.outcome_id)).status, 200);
});

test('an outcome a CLO points at is switched off instead of removed', async () => {
  // The sixth criterion, second reference. Made directly rather than through
  // /api/clos, because what a CLO is belongs to #27 and this suite would
  // otherwise fail whenever that screen changed.
  const cookie = await signInAs('U_COM');
  const plo = await outcome(cookie, { sequence_order: 62 });

  await api.pool.query(
    `INSERT INTO subject_clo
       (program_id, subject_id, academic_year, clo_number, clo_detail, plo_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      PROGRAM,
      SUBJECT.id,
      CURRENT_YEAR,
      'CLO-Z1',
      'ผลการเรียนรู้ของรายวิชาสำหรับการทดสอบ',
      plo.outcome_id,
    ],
  );

  const answered = await remove(cookie, plo.outcome_id);
  assert.equal(answered.status, 200);
  assert.equal(answered.body.deactivated, true);
  assert.equal(answered.body.plo.is_active, false);
});

test('removing a main outcome that still has sub-outcomes is refused rather than switched off', async () => {
  // Not in the ticket, and a decision: see the note on `ploHasChildren`. Every
  // other reference turns a removal into a deactivation, and for a ข้อย่อย that
  // would leave the children listed under a parent the person believed gone.
  const cookie = await signInAs('U_COM');
  const main = await outcome(cookie, { sequence_order: 63 });
  const child = await outcome(cookie, { parent_outcome_id: main.outcome_id, sequence_order: 1 });

  const refused = await remove(cookie, main.outcome_id);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.ploHasChildren);
  assert.equal((await one(cookie, main.outcome_id)).body.plo.is_active, true);

  // And it goes once the children do.
  assert.equal((await remove(cookie, child.outcome_id)).status, 204);
  assert.equal((await remove(cookie, main.outcome_id)).status, 204);
});

test('a parent in another curriculum is refused, and so is a parent that is not there', async () => {
  const cookie = await signInAs('U_COM');
  const theirs = await signInAs('U_COM2');

  const foreign = await add(theirs, {
    program_id: PROGRAM_INTL,
    outcome_code: nextCode(),
    outcome_title: 'ข้อหลักของอีกหลักสูตรหนึ่ง',
    outcome_type: 'knowledge',
    sequence_order: 51,
  });
  assert.equal(foreign.status, 201);

  const crossed = await add(cookie, {
    program_id: PROGRAM,
    outcome_code: nextCode(),
    outcome_title: 'ข้อย่อยที่อ้างข้อหลักข้ามหลักสูตร',
    outcome_type: 'knowledge',
    parent_outcome_id: foreign.body.plo.outcome_id,
    sequence_order: 52,
  });
  assert.equal(crossed.status, 400);
  assert.equal(crossed.body.message, REFUSALS.ploParentNotFound);

  const missing = await add(cookie, {
    program_id: PROGRAM,
    outcome_code: nextCode(),
    outcome_title: 'ข้อย่อยที่อ้างข้อหลักที่ไม่มีอยู่',
    outcome_type: 'knowledge',
    parent_outcome_id: 99999999,
    sequence_order: 53,
  });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.message, REFUSALS.ploParentNotFound);
});

test('an outcome cannot be moved under its own descendant, or under itself', async () => {
  // The one check here that no foreign key can make.
  const cookie = await signInAs('U_COM');
  const main = await outcome(cookie, { sequence_order: 41 });
  const child = await outcome(cookie, { parent_outcome_id: main.outcome_id, sequence_order: 1 });
  const grandchild = await outcome(cookie, {
    parent_outcome_id: child.outcome_id,
    sequence_order: 1,
  });
  assert.equal(grandchild.level_depth, 3);

  const fields = {
    outcome_code: main.outcome_code,
    outcome_title: main.outcome_title,
    outcome_type: main.outcome_type,
    sequence_order: main.sequence_order,
  };

  const cycled = await edit(cookie, main.outcome_id, {
    ...fields,
    parent_outcome_id: grandchild.outcome_id,
  });
  assert.equal(cycled.status, 400);
  assert.equal(cycled.body.message, REFUSALS.ploParentCycle);

  const itself = await edit(cookie, main.outcome_id, {
    ...fields,
    parent_outcome_id: main.outcome_id,
  });
  assert.equal(itself.status, 400);
  assert.equal(itself.body.message, REFUSALS.ploParentCycle);
});

test('a committee member reaches only their own curriculum, at every verb', async () => {
  // The eighth criterion, enforced at the server rather than in a menu, and the
  // ninth's cross-curriculum half. Every verb, because a screen that hides the
  // row is not the same thing as a server that refuses it.
  const theirs = await signInAs('U_COM2');
  const mine = await signInAs('U_COM');
  const plo = await outcome(mine, { sequence_order: 31 });

  const created = await add(theirs, {
    program_id: PROGRAM,
    outcome_code: nextCode(),
    outcome_title: 'ผลการเรียนรู้ในหลักสูตรของคนอื่น',
    outcome_type: 'knowledge',
    sequence_order: 32,
  });
  assert.equal(created.status, 403);
  assert.equal(created.body.message, REFUSALS.ploProgramNotYours);

  // Read, edit and remove all answer 404 rather than 403: out of reach and
  // never-made are the same answer, so the address bar cannot be used to learn
  // which outcomes another curriculum holds.
  assert.equal((await one(theirs, plo.outcome_id)).status, 404);
  assert.equal(
    (
      await edit(theirs, plo.outcome_id, {
        outcome_code: plo.outcome_code,
        outcome_title: 'แก้ของคนอื่น',
        outcome_type: 'knowledge',
        sequence_order: 33,
      })
    ).status,
    404,
  );
  assert.equal((await remove(theirs, plo.outcome_id)).status, 404);

  // And the list shows nothing of it, even when it is asked for by name.
  const narrowed = await list(theirs, `?program_id=${PROGRAM}`);
  assert.equal(narrowed.status, 200);
  assert.equal(narrowed.body.plos.length, 0);
});

test('a department administrator reaches both curricula under their department', async () => {
  const cookie = await signInAs('U_DEPT');

  const reachable = (await programs(cookie)).body.programs.map((program) => program.program_id);
  assert.ok(reachable.includes(PROGRAM));
  assert.ok(reachable.includes(PROGRAM_INTL));

  const created = await add(cookie, {
    program_id: PROGRAM_INTL,
    outcome_code: nextCode(),
    outcome_title: 'ผลการเรียนรู้ที่ภาควิชาเพิ่มให้',
    outcome_type: 'ethics',
    sequence_order: 34,
  });
  assert.equal(created.status, 201);
  assert.equal((await remove(cookie, created.body.plo.outcome_id)).status, 204);
});

test('a committee member sees only their own curriculum in the picker', async () => {
  const theirs = await signInAs('U_COM2');
  const answered = await programs(theirs);
  assert.equal(answered.status, 200);
  assert.deepEqual(
    answered.body.programs.map((program) => program.program_id),
    [PROGRAM_INTL],
  );
});

test('the faculty administrator and the teacher are refused the screen entirely', async () => {
  // #79 for the first, ADR-0002 for both: what is inside a curriculum is
  // decided below the faculty, and teaching a subject is not writing the
  // outcomes it serves.
  for (const alias of ['U_FAC', 'U_TEACH']) {
    const cookie = await signInAs(alias);
    assert.equal((await list(cookie, `?program_id=${PROGRAM}`)).status, 403, alias);
    assert.equal((await programs(cookie)).status, 403, alias);
    assert.equal(
      (
        await add(cookie, {
          program_id: PROGRAM,
          outcome_code: nextCode(),
          outcome_title: 'ไม่ควรถูกสร้าง',
          outcome_type: 'knowledge',
          sequence_order: 35,
        })
      ).status,
      403,
      alias,
    );
  }
});

test('an outcome missing its code, its title or its order is refused', async () => {
  const cookie = await signInAs('U_COM');
  const base = {
    program_id: PROGRAM,
    outcome_code: nextCode(),
    outcome_title: 'ครบถ้วน',
    outcome_type: 'knowledge',
    sequence_order: 21,
  };

  for (const field of ['outcome_code', 'outcome_title', 'sequence_order']) {
    const refused = await add(cookie, { ...base, [field]: '' });
    assert.equal(refused.status, 400, field);
    assert.equal(refused.body.message, REFUSALS.invalidPlo, field);
  }

  // An order that is not a number is the same refusal, not a row ordered by NaN.
  const notANumber = await add(cookie, { ...base, sequence_order: 'สอง' });
  assert.equal(notANumber.status, 400);
  assert.equal(notANumber.body.message, REFUSALS.invalidPlo);
});

test('a switched-off outcome is listed, and can be switched back on', async () => {
  // The way back from the sixth criterion. Without it the deactivation is a
  // one-way door: the code is held by the row that is already there, so the
  // outcome could never be made again.
  const cookie = await signInAs('U_COM');
  const plo = await outcome(cookie, { sequence_order: 11 });

  await api.pool.query(
    `INSERT INTO subject_plo_mapping (program_id, subject_id, outcome_id, mapping_level)
     VALUES ($1, $2, $3, 'D')`,
    [PROGRAM, SUBJECT.id, plo.outcome_id],
  );
  assert.equal((await remove(cookie, plo.outcome_id)).status, 200);

  const listed = (await list(cookie, `?program_id=${PROGRAM}`)).body.plos;
  const found = listed.find((row) => row.outcome_id === plo.outcome_id);
  assert.ok(found, 'a switched-off outcome vanished from the list it is switched back on from');
  assert.equal(found.is_active, false);

  const back = await edit(cookie, plo.outcome_id, {
    outcome_code: plo.outcome_code,
    outcome_title: plo.outcome_title,
    outcome_type: plo.outcome_type,
    sequence_order: plo.sequence_order,
    is_active: true,
  });
  assert.equal(back.status, 200);
  assert.equal(back.body.plo.is_active, true);
});

test('an edit that names no parent makes a root of a sub-outcome, and its own children follow', async () => {
  // The contract `readParent` states - absent and null both mean a root - on
  // the one shape that makes it visible. A three-deep branch is re-rooted at
  // its middle, and the depth the screen indents by has to move for the child
  // underneath it too, not only for the row that was edited.
  const cookie = await signInAs('U_COM');
  const top = await outcome(cookie, { sequence_order: 20 });
  const middle = await outcome(cookie, { parent_outcome_id: top.outcome_id, sequence_order: 1 });
  const bottom = await outcome(cookie, { parent_outcome_id: middle.outcome_id, sequence_order: 1 });

  assert.equal(middle.level_depth, 2);
  assert.equal(bottom.level_depth, 3);

  const moved = await edit(cookie, middle.outcome_id, {
    outcome_code: middle.outcome_code,
    outcome_title: middle.outcome_title,
    outcome_type: middle.outcome_type,
    sequence_order: 21,
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.body.plo.parent_outcome_id, null);
  assert.equal(moved.body.plo.level_depth, 1);

  const listed = (await list(cookie, `?program_id=${PROGRAM}`)).body.plos;
  const child = listed.find((row) => row.outcome_id === bottom.outcome_id);
  assert.equal(child.parent_outcome_id, middle.outcome_id);
  assert.equal(child.level_depth, 2, 'the subtree kept the depth it had before its parent moved');
});

test('a parent that is not a number, and an order past the column, are refused rather than crashed', async () => {
  // Both are the same mistake in two places: a value whose shape was checked
  // and whose range was not reaches the database, which answers with a fault
  // of its own that this route has no sentence for. A 500 here is the screen
  // saying nothing useful about a form it could have refused.
  const cookie = await signInAs('U_COM');
  const plo = await outcome(cookie, { sequence_order: 30 });

  const named = await edit(cookie, plo.outcome_id, {
    outcome_code: plo.outcome_code,
    outcome_title: plo.outcome_title,
    outcome_type: plo.outcome_type,
    sequence_order: plo.sequence_order,
    parent_outcome_id: 'ไม่ใช่ตัวเลข',
  });
  assert.equal(named.status, 400);
  assert.equal(named.body.message, REFUSALS.ploParentNotFound);

  const far = await add(cookie, {
    program_id: PROGRAM,
    outcome_code: nextCode(),
    outcome_title: 'ลำดับที่เกินขอบเขตของคอลัมน์',
    outcome_type: 'knowledge',
    sequence_order: 2147483648,
  });
  assert.equal(far.status, 400);
  assert.equal(far.body.message, REFUSALS.invalidPlo);
});

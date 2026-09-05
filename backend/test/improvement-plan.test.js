'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, CURRENT_YEAR, PRIOR_YEAR, SEMESTER, byAlias } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

/**
 * docs/acceptance/41-continuous-improvement-plan.md — the server half.
 *
 * Two sentences carry most of this file. The record belongs to a (Program,
 * Subject, academic year) and not to a ตอนเรียน, which is ADR-0003 and is what
 * the fifth criterion asks to see; and last year's entries hang off last year's
 * CLO rows, which are different rows with the same numbers, which is what the
 * fourth criterion asks to see. The second follows from the first and is the
 * one that can be got wrong without anything looking wrong: a reference panel
 * joined on `clo_id` is empty on every รายวิชา, for ever, and an empty panel
 * is indistinguishable from a year nobody wrote in.
 *
 * The seed is the fixture, as in clos.test.js. It deliberately seeds no cycle —
 * db/seed.js says so at the top, and this is the ticket that was waiting — so
 * every state here is one this file built through the routes it is testing,
 * which is also how the third criterion gets proved: the cycle rows that exist
 * at the end of a test are the ones a save made.
 */

const DEPT_COMPUTER = '05';
const PROGRAM = '0501';
const SUBJECT_CODE = '01076105';

/** The four sections of the form, in the order the screen reads them in. */
const TYPES = ['SUMMARY', 'REFLECTION', 'IMPROVEMENT', 'NEXT_PLAN'];

let api;
before(async () => {
  api = await startApi('improvement-plan', { withSeed: true });
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

const url = (sectionId) => '/api/teaching/sections/' + sectionId + '/improvement-plan';

const read = (cookie, sectionId) => request(api.app).get(url(sectionId)).set('Cookie', cookie);

const write = (cookie, sectionId, body) =>
  request(api.app)
    .post(url(sectionId) + '/entries')
    .set('Cookie', cookie)
    .send(body);

const drop = (cookie, sectionId, entryId) =>
  request(api.app)
    .delete(url(sectionId) + '/entries/' + entryId)
    .set('Cookie', cookie);

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

/**
 * Every cycle row and every entry, gone.
 *
 * The seed makes none, so this puts the schema back to the state the file
 * started in rather than to a state of its own. Tests that count rows call it
 * first, because `node --test` runs a file's tests in order and a count is only
 * a claim about what this test did if nothing earlier is still lying around.
 */
async function noCycles() {
  await api.pool.query('DELETE FROM clo_course_cycle_detail_cloplan');
  await api.pool.query('DELETE FROM clo_course_cycle_cloplan');
}

const cycleCount = async () => {
  const { rows } = await api.pool.query('SELECT count(*)::int AS n FROM clo_course_cycle_cloplan');
  return rows[0].n;
};

/** One CLO of a year, by its number — the handle the two years share. */
async function cloNumbered(year, number) {
  const { rows } = await api.pool.query(
    `SELECT clo_id, clo_number FROM subject_clo
      WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3 AND clo_number = $4`,
    [PROGRAM, SUBJECT_CODE, year, number],
  );
  assert.equal(rows.length, 1, 'expected one ' + number + ' in ' + year);
  return rows[0];
}

const SUMMARY_TEXT =
  'ผลการประเมินปีนี้พบว่านักศึกษาบรรลุ CLO-1 ร้อยละ 82 ซึ่งสูงกว่าเกณฑ์ที่ตั้งไว้';
const REFLECTION_TEXT = 'คะแนนส่วนที่หายไปกระจุกอยู่ที่ข้อสอบปลายภาคข้อที่ต้องเขียนอธิบายเหตุผล';

test('an Offering nobody has written in reads as empty, and the read makes nothing', async () => {
  // The third criterion, stated as its converse. A screen that opened a cycle
  // on being looked at would put a year into the record that nobody worked in,
  // and an accreditation panel reads that as an abandoned cycle rather than as
  // an unvisited screen.
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const answered = await read(cookie, await seededSection('U_TEACH', CURRENT_YEAR));

  assert.equal(answered.status, 200);
  assert.equal(answered.body.offering.academic_year, CURRENT_YEAR);
  assert.deepEqual(answered.body.entries, []);
  assert.equal(answered.body.previous, null);
  assert.equal(await cycleCount(), 0);
});

test('the screen is handed this Offering CLO set to hang the entries on', async () => {
  // The CLO list is this year's, in this year's order, because the year in the
  // address is the year being written about. The four types are deliberately
  // not in the answer — the screen has to hold a heading and a purpose for
  // each of them anyway, and a list on the wire would be a second copy nothing
  // compares with the first.
  const cookie = await teaching('U_TEACH');
  const answered = await read(cookie, await seededSection('U_TEACH', CURRENT_YEAR));

  assert.equal(answered.body.types, undefined);
  assert.equal(answered.body.clos.length, 9);
  assert.equal(answered.body.clos[0].clo_number, 'CLO-1');
  assert.ok(answered.body.clos[0].clo_detail);
});

test('an entry saves under each of the four types, and the first save opens the cycle', async () => {
  // The first and third criteria together. One cycle row after four saves, not
  // four: the year is created on demand and then found, and the count is the
  // only way to tell those two apart from outside.
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const clo = await cloNumbered(CURRENT_YEAR, 'CLO-1');

  for (const detailType of TYPES) {
    const saved = await write(cookie, section, {
      clo_id: clo.clo_id,
      detail_type: detailType,
      detail_text: detailType + ' ของ CLO-1',
    });
    assert.equal(saved.status, 200, saved.body.message);
    assert.equal(saved.body.entry.detail_type, detailType);
    assert.equal(saved.body.entry.clo_number, 'CLO-1');
  }

  assert.equal(await cycleCount(), 1);
  const answered = await read(cookie, section);
  assert.deepEqual(
    answered.body.entries.map((entry) => entry.detail_type),
    TYPES,
  );
});

test('writing the same section of the form again is an edit and not a second row', async () => {
  // The second criterion's first half. (cycle, CLO, type) is the key, so the
  // form has one box per cell and pressing save twice writes the same cell.
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const clo = await cloNumbered(CURRENT_YEAR, 'CLO-2');

  const first = await write(cookie, section, {
    clo_id: clo.clo_id,
    detail_type: 'SUMMARY',
    detail_text: SUMMARY_TEXT,
  });
  const second = await write(cookie, section, {
    clo_id: clo.clo_id,
    detail_type: 'SUMMARY',
    detail_text: SUMMARY_TEXT + ' (แก้ไขแล้ว)',
  });

  assert.equal(second.status, 200);
  assert.equal(second.body.entry.entry_id, first.body.entry.entry_id);

  const answered = await read(cookie, section);
  assert.equal(answered.body.entries.length, 1);
  assert.equal(answered.body.entries[0].detail_text, SUMMARY_TEXT + ' (แก้ไขแล้ว)');
});

test('an entry is removed, and the year it was written in stays open', async () => {
  // The second criterion's other half. The cycle outliving its last entry is
  // what keeps a year somebody opened and then emptied distinguishable from a
  // year nobody touched; the screen has nothing to draw either way, and the
  // record is not only for the screen.
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const clo = await cloNumbered(CURRENT_YEAR, 'CLO-3');

  const saved = await write(cookie, section, {
    clo_id: clo.clo_id,
    detail_type: 'REFLECTION',
    detail_text: REFLECTION_TEXT,
  });
  const entryId = saved.body.entry.entry_id;

  assert.equal((await drop(cookie, section, entryId)).status, 204);
  assert.deepEqual((await read(cookie, section)).body.entries, []);
  assert.equal(await cycleCount(), 1);

  // The same id a second time is a row that is not there, and says so in the
  // one sentence that also covers another year's row.
  const gone = await drop(cookie, section, entryId);
  assert.equal(gone.status, 404);
  assert.equal(gone.body.message, REFUSALS.improvementEntryNotFound);
});

test('both Sections of one Offering read and write one set of entries', async () => {
  // The fifth criterion, and it is the grain rather than anything this file
  // does: two classes, two ผู้สอน, one narrative about one รายวิชา in one year.
  await noCycles();
  const mine = await teaching('U_TEACH');
  const theirs = await teaching('U_MULTI');
  const mySection = await seededSection('U_TEACH', CURRENT_YEAR);
  const theirSection = await seededSection('U_MULTI', CURRENT_YEAR);
  assert.notEqual(mySection, theirSection);

  const clo = await cloNumbered(CURRENT_YEAR, 'CLO-4');
  const saved = await write(mine, mySection, {
    clo_id: clo.clo_id,
    detail_type: 'NEXT_PLAN',
    detail_text: 'ปีหน้าจะเพิ่มแบบฝึกหัดที่ให้เขียนอธิบายเหตุผลทุกสัปดาห์',
  });

  const seen = await read(theirs, theirSection);
  assert.equal(seen.status, 200, seen.body.message);
  assert.deepEqual(
    seen.body.entries.map((entry) => entry.entry_id),
    [saved.body.entry.entry_id],
  );

  // And the colleague can edit it, which is what "shared" has to mean for a
  // record two people are jointly accountable for.
  const edited = await write(theirs, theirSection, {
    clo_id: clo.clo_id,
    detail_type: 'NEXT_PLAN',
    detail_text: 'ปีหน้าจะเพิ่มแบบฝึกหัดที่ให้เขียนอธิบายเหตุผลสัปดาห์เว้นสัปดาห์',
  });
  assert.equal(edited.body.entry.entry_id, saved.body.entry.entry_id);
});

test('another year of the same subject keeps its own entries', async () => {
  // The other half of the grain, and the thing the reference panel is built
  // on: two years of one รายวิชา are two records, not one.
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const thisYear = await seededSection('U_TEACH', CURRENT_YEAR);
  const lastYear = await seededSection('U_TEACH', PRIOR_YEAR);

  await write(cookie, thisYear, {
    clo_id: (await cloNumbered(CURRENT_YEAR, 'CLO-5')).clo_id,
    detail_type: 'SUMMARY',
    detail_text: 'ของปีนี้',
  });

  const answered = await read(cookie, lastYear);
  assert.equal(answered.body.offering.academic_year, PRIOR_YEAR);
  assert.deepEqual(answered.body.entries, []);
  assert.equal(await cycleCount(), 1);
});

test("last year's entries arrive for reference, matched across the years by CLO number", async () => {
  // The fourth criterion, and the one assertion in this file that would still
  // pass with the join written on `clo_id` if it were phrased any more weakly.
  // The two CLO rows are compared explicitly: same number, different id, and
  // the entry that comes back on `previous` is the one written against the
  // other row.
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const thisYear = await seededSection('U_TEACH', CURRENT_YEAR);
  const lastYear = await seededSection('U_TEACH', PRIOR_YEAR);

  const then = await cloNumbered(PRIOR_YEAR, 'CLO-6');
  const now = await cloNumbered(CURRENT_YEAR, 'CLO-6');
  assert.notEqual(then.clo_id, now.clo_id);

  await write(cookie, lastYear, {
    clo_id: then.clo_id,
    detail_type: 'REFLECTION',
    detail_text: 'ปีที่แล้วนักศึกษาอ่อนเรื่องการออกแบบคลาส',
  });

  const answered = await read(cookie, thisYear);
  assert.equal(answered.body.previous.academic_year, PRIOR_YEAR);
  assert.equal(answered.body.previous.entries.length, 1);
  assert.equal(answered.body.previous.entries[0].clo_number, 'CLO-6');
  assert.equal(answered.body.previous.entries[0].clo_id, then.clo_id);
  assert.deepEqual(answered.body.entries, []);
});

test('the year offered for reference is the last one written in, not the year before', async () => {
  // A รายวิชา is not taught every year, and a cycle can be opened and left
  // empty. Either would leave the panel blank if `previous` meant this year
  // minus one, and a blank panel reads as a year nobody wrote in rather than as
  // a screen looking in the wrong place.
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const thisYear = await seededSection('U_TEACH', CURRENT_YEAR);
  const lastYear = await seededSection('U_TEACH', PRIOR_YEAR);
  const twoYearsBack = String(Number(PRIOR_YEAR) - 1);

  // Two years back has entries; last year has a cycle and nothing in it. The
  // older year is built with SQL because no Section of it is seeded — its
  // entries hang off last year's CLO rows, which is what an Offering that
  // reused its outcomes would look like.
  const { rows } = await api.pool.query(
    `INSERT INTO clo_course_cycle_cloplan (program_id, subject_id, academic_year)
     VALUES ($1, $2, $3) RETURNING clo_course_cycle_id`,
    [PROGRAM, SUBJECT_CODE, twoYearsBack],
  );
  const older = await cloNumbered(PRIOR_YEAR, 'CLO-7');
  await api.pool.query(
    `INSERT INTO clo_course_cycle_detail_cloplan
       (clo_course_cycle_id, clo_id, detail_type, detail_text)
     VALUES ($1, $2, 'SUMMARY', $3)`,
    [rows[0].clo_course_cycle_id, older.clo_id, 'ของสองปีก่อน'],
  );
  await api.pool.query(
    `INSERT INTO clo_course_cycle_cloplan (program_id, subject_id, academic_year)
     VALUES ($1, $2, $3)`,
    [PROGRAM, SUBJECT_CODE, PRIOR_YEAR],
  );

  const answered = await read(cookie, thisYear);
  assert.equal(answered.body.previous.academic_year, twoYearsBack);
  assert.equal(answered.body.previous.entries[0].detail_text, 'ของสองปีก่อน');

  // And the year that was opened and left empty reads as empty from its own
  // screen while still offering the year before it — which is the rule stated
  // once more from a different address: the panel is chosen relative to the
  // year being written in, and an empty cycle is skipped from either side.
  const fromLastYear = await read(cookie, lastYear);
  assert.deepEqual(fromLastYear.body.entries, []);
  assert.equal(fromLastYear.body.previous.academic_year, twoYearsBack);
});

test('an improvement records the year it followed from, and only an improvement does', async () => {
  // docs/02 has IMPROVEMENT as การปรับปรุงจากรอบก่อนหน้า, so it is the one of
  // the four that points at another year. The server writes it from what it
  // already knows; the body below claims a different year and is ignored, which
  // is ADR-0002 at the smallest scale it appears in the system.
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const thisYear = await seededSection('U_TEACH', CURRENT_YEAR);
  const lastYear = await seededSection('U_TEACH', PRIOR_YEAR);

  await write(cookie, lastYear, {
    clo_id: (await cloNumbered(PRIOR_YEAR, 'CLO-8')).clo_id,
    detail_type: 'REFLECTION',
    detail_text: 'ของปีที่แล้ว',
  });

  const clo = await cloNumbered(CURRENT_YEAR, 'CLO-8');
  const improvement = await write(cookie, thisYear, {
    clo_id: clo.clo_id,
    detail_type: 'IMPROVEMENT',
    detail_text: 'เพิ่มการบ้านออกแบบคลาสสองชิ้นตามที่สะท้อนไว้',
    reference_academic_year: '2400',
  });
  assert.equal(improvement.body.entry.reference_academic_year, PRIOR_YEAR);

  const summary = await write(cookie, thisYear, {
    clo_id: clo.clo_id,
    detail_type: 'SUMMARY',
    detail_text: SUMMARY_TEXT,
    reference_academic_year: '2400',
  });
  assert.equal(summary.body.entry.reference_academic_year, null);
});

test('an improvement written where there is nothing earlier records no year', async () => {
  // The column is nullable and this is what the null is for: the first cycle a
  // รายวิชา ever has can still describe a change that was made, and inventing
  // a year for it would put a citation in the record that points at nothing.
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);

  const saved = await write(cookie, section, {
    clo_id: (await cloNumbered(CURRENT_YEAR, 'CLO-9')).clo_id,
    detail_type: 'IMPROVEMENT',
    detail_text: 'ปรับลำดับหัวข้อในภาคการศึกษานี้เอง',
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.entry.reference_academic_year, null);
});

test('a CLO of another year cannot be written about through this year Section', async () => {
  // The id is real and the caller teaches a Section — just not this CLO's
  // Offering. The grain refuses, and it refuses as not found, for clos.js'
  // reason: a caller must not be able to walk the id space and learn which ids
  // are real.
  const cookie = await teaching('U_TEACH');
  const thisYear = await seededSection('U_TEACH', CURRENT_YEAR);
  const theirs = await cloNumbered(PRIOR_YEAR, 'CLO-1');

  const refused = await write(cookie, thisYear, {
    clo_id: theirs.clo_id,
    detail_type: 'SUMMARY',
    detail_text: SUMMARY_TEXT,
  });
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.cloNotFound);
});

test('an entry of another year cannot be removed through this year Section', async () => {
  await noCycles();
  const cookie = await teaching('U_TEACH');
  const thisYear = await seededSection('U_TEACH', CURRENT_YEAR);
  const lastYear = await seededSection('U_TEACH', PRIOR_YEAR);

  const saved = await write(cookie, lastYear, {
    clo_id: (await cloNumbered(PRIOR_YEAR, 'CLO-2')).clo_id,
    detail_type: 'SUMMARY',
    detail_text: 'ของปีที่แล้ว',
  });

  const refused = await drop(cookie, thisYear, saved.body.entry.entry_id);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.improvementEntryNotFound);
  assert.equal((await read(cookie, lastYear)).body.entries.length, 1);
});

test('an entry id that is not a number is refused rather than raised', async () => {
  const cookie = await teaching('U_TEACH');
  const refused = await drop(cookie, await seededSection('U_TEACH', CURRENT_YEAR), 'not-an-entry');
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.improvementEntryNotFound);
});

test('the three things a draft can be missing are one sentence', async () => {
  // A type outside the four, a blank text, and no CLO chosen. The CHECK and the
  // NOT NULL would refuse two of the three, but as a 23514 and a 23502 raised
  // into เกิดข้อผิดพลาดในระบบ, which is the wrong sentence for a section of a
  // form somebody did not fill in.
  const cookie = await teaching('U_TEACH');
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  const clo = await cloNumbered(CURRENT_YEAR, 'CLO-1');

  const drafts = [
    { clo_id: clo.clo_id, detail_type: 'SOMETHING_ELSE', detail_text: SUMMARY_TEXT },
    { clo_id: clo.clo_id, detail_text: SUMMARY_TEXT },
    { clo_id: clo.clo_id, detail_type: 'SUMMARY', detail_text: '   ' },
    { clo_id: clo.clo_id, detail_type: 'SUMMARY' },
    { detail_type: 'SUMMARY', detail_text: SUMMARY_TEXT },
    { clo_id: 'not-a-clo', detail_type: 'SUMMARY', detail_text: SUMMARY_TEXT },
  ];

  for (const draft of drafts) {
    const refused = await write(cookie, section, draft);
    assert.equal(refused.status, 400, JSON.stringify(draft));
    assert.equal(refused.body.message, REFUSALS.invalidImprovementEntry);
  }
});

test('a Section the caller does not teach hides the plan behind the section refusal', async () => {
  // The sixth criterion. Not `cloNotFound` and not 403: the register decides,
  // per ADR-0002, and it answers the sentence #24 gave. All three verbs, because
  // one guard missing from one of them is the whole of the criterion missing.
  const stranger = await teaching('U_TEACH2');
  const someoneElses = await seededSection('U_TEACH', CURRENT_YEAR);

  const refused = await read(stranger, someoneElses);
  assert.equal(refused.status, 404);
  assert.equal(refused.body.message, REFUSALS.sectionNotFound);

  const written = await write(stranger, someoneElses, {
    clo_id: (await cloNumbered(CURRENT_YEAR, 'CLO-1')).clo_id,
    detail_type: 'SUMMARY',
    detail_text: SUMMARY_TEXT,
  });
  assert.equal(written.status, 404);
  assert.equal(written.body.message, REFUSALS.sectionNotFound);
  assert.equal((await drop(stranger, someoneElses, 1)).status, 404);
});

test('a role that is not a teaching one does not reach these routes at all', async () => {
  const section = await seededSection('U_TEACH', CURRENT_YEAR);
  for (const alias of ['U_COM', 'U_ADMIN', 'U_DEPT', 'U_FAC']) {
    const cookie = await signInAs(alias);
    const refused = await read(cookie, section);
    assert.equal(refused.status, 403, alias + ' should not reach the improvement plan');
    assert.equal(refused.body.message, REFUSALS.forbidden);
  }
});

test('an anonymous caller is refused before any of this is considered', async () => {
  const refused = await request(api.app).get(url(1));
  assert.equal(refused.status, 401);
  assert.equal(refused.body.reason, 'anonymous');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0002, at the same seam as 0001's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The assertions are behavioural - insert what the schema should refuse and
 * check the SQLSTATE, delete a parent and look at what survived. The one
 * exception is the foreign-key type check, which lives in the newest
 * migration's test file and says why there.
 */

const SCHEMA = testSchema('outcomes');
let pool;

test.before(async () => {
  await migrate({ schema: SCHEMA });
  pool = createPool({ schema: SCHEMA });
});

test.after(async () => {
  if (pool) await pool.end();
  await dropSchema(SCHEMA);
});

const errorCode = (sql, params) => errorCodeOf(pool, sql, params);

/**
 * 0001's six rows, plus the programme-subject pairing, one offering and one
 * section - the chain almost everything in 0002 hangs off. Adds `year`,
 * `offering` and `section` to the identifiers.
 */
async function offering(tag) {
  const ids = await baseFixtures(pool, tag);
  ids.year = '2568';

  await pool.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type) VALUES ($1, $2, 'required')`,
    [ids.program, ids.subject],
  );
  const course = await pool.query(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, $3, 1) RETURNING id`,
    [ids.program, ids.subject, ids.year],
  );
  ids.offering = course.rows[0].id;

  const section = await pool.query(
    `INSERT INTO course_sections (semester_course_id, section_number) VALUES ($1, '1')
     RETURNING section_id`,
    [ids.offering],
  );
  ids.section = section.rows[0].section_id;

  return ids;
}

/** One PLO in a programme, returning its outcome_id. */
async function plo(ids, code, extra = {}) {
  const { rows } = await pool.query(
    `INSERT INTO learning_outcomes
       (program_id, outcome_code, outcome_title, outcome_type, sequence_order, parent_outcome_id, level_depth)
     VALUES ($1, $2, $3, 'knowledge', $4, $5, $6) RETURNING outcome_id`,
    [ids.program, code, `ผลลัพธ์ ${code}`, extra.order ?? 1, extra.parent ?? null, extra.depth ?? 1],
  );
  return rows[0].outcome_id;
}

/** One CLO at the programme-subject-year grain, returning its clo_id. */
async function clo(ids, number, year = ids.year) {
  const { rows } = await pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail, created_by)
     VALUES ($1, $2, $3, $4, 'อธิบายได้', $5) RETURNING clo_id`,
    [ids.program, ids.subject, year, number, ids.user],
  );
  return rows[0].clo_id;
}

test('reset and migrate build the schema from nothing', async (t) => {
  const schema = testSchema('outcomes_from_empty');
  t.after(() => dropSchema(schema));

  await reset({ schema });

  const { applied } = await migrate({ schema });

  // Only that this file's own migration ran, and ran second. The full list
  // grows with every ticket and is asserted once, in the newest test file.
  assert.equal(applied[1], '0002_offerings_and_learning_outcomes.sql');
});

// The foreign-key type and width check that used to live here has moved to the
// newest migration's test file, alongside the applied-migration list. It reads
// every foreign key in the schema, so one copy covers this migration's too, and
// two copies would only ever drift.

test('an offering may only open a subject its programme teaches', async () => {
  const ids = await baseFixtures(pool, 'noprogsub');

  // The programme and the subject both exist; the pairing does not. Two
  // separate foreign keys would accept this.
  const code = await errorCode(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, '2568', 1)`,
    [ids.program, ids.subject],
  );

  assert.equal(code, '23503');
});

test('an offering is opened once per programme, subject, year and semester', async () => {
  const ids = await offering('onceterm');

  const duplicate = await errorCode(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, $3, 1)`,
    [ids.program, ids.subject, ids.year],
  );
  assert.equal(duplicate, '23505');

  // The next semester and the next year are different offerings.
  await pool.query(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, $3, 2)`,
    [ids.program, ids.subject, ids.year],
  );
  await pool.query(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, '2569', 1)`,
    [ids.program, ids.subject],
  );

  const outOfRange = await errorCode(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, '2570', 4)`,
    [ids.program, ids.subject],
  );
  assert.equal(outOfRange, '23514');
});

test('each offering has its own Section 1', async () => {
  const ids = await offering('sectno');

  // The defect this fixes: docs/02 makes section_number unique on its own, so
  // the second "1" anywhere in the institution is rejected. Here the second
  // offering gets one and only the repeat within one offering is refused.
  const second = await pool.query(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, $3, 2) RETURNING id`,
    [ids.program, ids.subject, ids.year],
  );
  await pool.query(`INSERT INTO course_sections (semester_course_id, section_number) VALUES ($1, '1')`, [
    second.rows[0].id,
  ]);

  const code = await errorCode(
    `INSERT INTO course_sections (semester_course_id, section_number) VALUES ($1, '1')`,
    [ids.offering],
  );

  assert.equal(code, '23505');
});

test('a section is taught by several teachers, each named once', async () => {
  const ids = await offering('teachers');
  const other = await baseFixtures(pool, 'coteacher');

  await pool.query(`INSERT INTO course_sections_teacher (section_id, user_id) VALUES ($1, $2)`, [
    ids.section,
    ids.user,
  ]);
  await pool.query(`INSERT INTO course_sections_teacher (section_id, user_id) VALUES ($1, $2)`, [
    ids.section,
    other.user,
  ]);

  const code = await errorCode(
    `INSERT INTO course_sections_teacher (section_id, user_id) VALUES ($1, $2)`,
    [ids.section, ids.user],
  );
  assert.equal(code, '23505');

  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM course_sections_teacher WHERE section_id = $1`,
    [ids.section],
  );
  assert.equal(rows[0].n, 2);
});

test('a section carries a week-by-week plan and takes it with it when deleted', async () => {
  const ids = await offering('syllabus');

  // Two rows for one week: upsertCourseSyllabus decides on the surrogate id
  // and never on the week, so the screen can put two topics in week 3.
  for (const [week, title] of [
    [1, 'บทนำ'],
    [3, 'โครงสร้างข้อมูล'],
    [3, 'ปฏิบัติการ'],
  ]) {
    await pool.query(
      `INSERT INTO course_syllabus (section_id, week_no, title, created_by) VALUES ($1, $2, $3, $4)`,
      [ids.section, week, title, ids.user],
    );
  }

  assert.equal(await errorCode(
    `INSERT INTO course_syllabus (section_id, week_no, title) VALUES ($1, 0, 'สัปดาห์ศูนย์')`,
    [ids.section],
  ), '23514');

  await pool.query(`DELETE FROM course_sections WHERE section_id = $1`, [ids.section]);

  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM course_syllabus WHERE section_id = $1`,
    [ids.section],
  );
  assert.equal(rows[0].n, 0);
});

test('each programme numbers its own outcomes from PLO1', async () => {
  const ids = await offering('plocode');
  const other = await baseFixtures(pool, 'ploother');

  await plo(ids, 'PLO1');
  await plo(other, 'PLO1');

  const code = await errorCode(
    `INSERT INTO learning_outcomes (program_id, outcome_code, outcome_title, outcome_type, sequence_order)
     VALUES ($1, 'PLO1', 'ซ้ำ', 'skills', 2)`,
    [ids.program],
  );

  assert.equal(code, '23505');
});

test('outcomes form a tree, and a parent cannot be deleted out from under its children', async () => {
  const ids = await offering('plotree');

  const parent = await plo(ids, 'PLO2');
  await plo(ids, 'PLO2-1', { parent, depth: 2, order: 1 });
  await plo(ids, 'PLO2-2', { parent, depth: 2, order: 2 });

  const { rows } = await pool.query(
    `SELECT outcome_code, level_depth, sequence_order FROM learning_outcomes
      WHERE parent_outcome_id = $1 ORDER BY sequence_order`,
    [parent],
  );
  assert.deepEqual(
    rows.map((r) => r.outcome_code),
    ['PLO2-1', 'PLO2-2'],
  );
  assert.equal(rows[0].level_depth, 2);

  assert.equal(
    await errorCode(`DELETE FROM learning_outcomes WHERE outcome_id = $1`, [parent]),
    '23503',
  );

  // An outcome takes depth 1, stays collapsed and stays active without being told.
  const defaults = await pool.query(
    `SELECT level_depth, is_expanded, is_active FROM learning_outcomes WHERE outcome_id = $1`,
    [parent],
  );
  assert.equal(defaults.rows[0].level_depth, 1);
  assert.equal(defaults.rows[0].is_expanded, false);
  assert.equal(defaults.rows[0].is_active, true);

  // The tree stays inside one programme: a PLO cannot be given another
  // programme's PLO as its parent.
  const other = await offering('plotree2');
  assert.equal(
    await errorCode(
      `INSERT INTO learning_outcomes
         (program_id, outcome_code, outcome_title, outcome_type, sequence_order, parent_outcome_id, level_depth)
       VALUES ($1, 'PLO9', 'ข้ามหลักสูตร', 'knowledge', 9, $2, 2)`,
      [other.program, parent],
    ),
    '23503',
  );
});

test('a subject serves a PLO at one level, empty until it is decided', async () => {
  const ids = await offering('plomap');
  const outcome = await plo(ids, 'PLO1');

  await pool.query(
    `INSERT INTO subject_plo_mapping (program_id, subject_id, outcome_id, created_by)
     VALUES ($1, $2, $3, $4)`,
    [ids.program, ids.subject, outcome, ids.user],
  );

  const { rows } = await pool.query(
    `SELECT mapping_level FROM subject_plo_mapping WHERE program_id = $1 AND subject_id = $2`,
    [ids.program, ids.subject],
  );
  assert.equal(rows[0].mapping_level, 'E');

  assert.equal(
    await errorCode(
      `INSERT INTO subject_plo_mapping (program_id, subject_id, outcome_id) VALUES ($1, $2, $3)`,
      [ids.program, ids.subject, outcome],
    ),
    '23505',
  );
  assert.equal(
    await errorCode(
      `UPDATE subject_plo_mapping SET mapping_level = 'X' WHERE outcome_id = $1`,
      [outcome],
    ),
    '22P02',
  );

  // ADR-0003's reason for keeping program_id: the PLO must belong to the same
  // programme as the subject being mapped.
  const other = await offering('plomap2');
  const elsewhere = await plo(other, 'PLO1');
  assert.equal(
    await errorCode(
      `INSERT INTO subject_plo_mapping (program_id, subject_id, outcome_id) VALUES ($1, $2, $3)`,
      [ids.program, ids.subject, elsewhere],
    ),
    '23503',
  );
});

test('a CLO belongs to a programme, subject and year, never to a section', async () => {
  const ids = await offering('clograin');

  await clo(ids, 'CLO1');

  // Same subject, same programme, next year - a different set of outcomes, so
  // CLO1 is free again.
  await clo(ids, 'CLO1', '2569');

  assert.equal(
    await errorCode(
      `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number)
       VALUES ($1, $2, $3, 'CLO1')`,
      [ids.program, ids.subject, ids.year],
    ),
    '23505',
  );

  // ADR-0003: the column is gone from the CLO and from both of its child
  // tables. 42703 is "no such column", which is the point.
  assert.equal(
    await errorCode(
      `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, section_id)
       VALUES ($1, $2, $3, 'CLO9', $4)`,
      [ids.program, ids.subject, ids.year, ids.section],
    ),
    '42703',
  );
});

test('a CLO may only name a subject its programme teaches', async () => {
  const ids = await baseFixtures(pool, 'clonopair');

  const code = await errorCode(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number)
     VALUES ($1, $2, '2568', 'CLO1')`,
    [ids.program, ids.subject],
  );

  assert.equal(code, '23503');
});

test('a CLO names a PLO of its own programme, or none at all', async () => {
  const ids = await offering('cloplo');
  const mine = await plo(ids, 'PLO1');
  const other = await offering('cloplo2');
  const theirs = await plo(other, 'PLO1');

  // No PLO yet is the ordinary state of a CLO being written.
  await pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, plo_id)
     VALUES ($1, $2, $3, 'CLO1', NULL)`,
    [ids.program, ids.subject, ids.year],
  );
  await pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, plo_id)
     VALUES ($1, $2, $3, 'CLO2', $4)`,
    [ids.program, ids.subject, ids.year, mine],
  );

  assert.equal(
    await errorCode(
      `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, plo_id)
       VALUES ($1, $2, $3, 'CLO3', $4)`,
      [ids.program, ids.subject, ids.year, theirs],
    ),
    '23503',
  );
});

test('the behaviour and criteria vocabularies are closed', async () => {
  const ids = await offering('vocab');
  const target = await clo(ids, 'CLO1');

  await pool.query(
    `INSERT INTO subject_clo_measurable_behavior
       (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
     VALUES ($1, 1, 'อธิบายหลักการได้', 'exam', 'understand')`,
    [target],
  );
  await pool.query(
    `INSERT INTO subject_clo_achievement_criteria
       (clo_id, criteria_no, achievement_level, criteria_detail)
     VALUES ($1, 1, 'ดีเยี่ยม', 'ตอบถูกทุกข้อ')`,
    [target],
  );

  assert.equal(
    await errorCode(
      `INSERT INTO subject_clo_measurable_behavior
         (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
       VALUES ($1, 2, 'x', 'Quiz', 'understand')`,
      [target],
    ),
    '22P02',
  );
  assert.equal(
    await errorCode(
      `INSERT INTO subject_clo_measurable_behavior
         (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
       VALUES ($1, 2, 'x', 'exam', 'memorise')`,
      [target],
    ),
    '22P02',
  );
  assert.equal(
    await errorCode(
      `INSERT INTO subject_clo_achievement_criteria
         (clo_id, criteria_no, achievement_level, criteria_detail)
       VALUES ($1, 2, 'ผ่าน', 'x')`,
      [target],
    ),
    '23514',
  );

  // The six Bloom levels CONTEXT.md names, all of them accepted.
  const levels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  for (const [index, level] of levels.entries()) {
    await pool.query(
      `INSERT INTO subject_clo_measurable_behavior
         (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
       VALUES ($1, $2, 'x', 'assigned_work', $3)`,
      [target, index + 2, level],
    );
  }

  // R063's four activity types, all of them accepted. 'assignment' is not one
  // of them: CONTEXT.md reserves that word for the Activity entity.
  const activities = ['exam', 'exercise', 'homework', 'assigned_work'];
  for (const [index, activity] of activities.entries()) {
    await pool.query(
      `INSERT INTO subject_clo_measurable_behavior
         (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
       VALUES ($1, $2, 'x', $3, 'apply')`,
      [target, index + 20, activity],
    );
  }
  assert.equal(
    await errorCode(
      `INSERT INTO subject_clo_measurable_behavior
         (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
       VALUES ($1, 30, 'x', 'assignment', 'apply')`,
      [target],
    ),
    '22P02',
  );
});

test('a behaviour and a criterion are each numbered once within their CLO', async () => {
  const ids = await offering('childnos');
  const target = await clo(ids, 'CLO1');

  await pool.query(
    `INSERT INTO subject_clo_measurable_behavior
       (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
     VALUES ($1, 1, 'x', 'exam', 'apply')`,
    [target],
  );
  assert.equal(
    await errorCode(
      `INSERT INTO subject_clo_measurable_behavior
         (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
       VALUES ($1, 1, 'y', 'exam', 'apply')`,
      [target],
    ),
    '23505',
  );

  await pool.query(
    `INSERT INTO subject_clo_achievement_criteria
       (clo_id, criteria_no, achievement_level, criteria_detail)
     VALUES ($1, 1, 'ดี', 'x')`,
    [target],
  );
  assert.equal(
    await errorCode(
      `INSERT INTO subject_clo_achievement_criteria
         (clo_id, criteria_no, achievement_level, criteria_detail)
       VALUES ($1, 1, 'พอใช้', 'y')`,
      [target],
    ),
    '23505',
  );

  // The same number under a second CLO is a different behaviour, and allowed.
  const second = await clo(ids, 'CLO2');
  await pool.query(
    `INSERT INTO subject_clo_measurable_behavior
       (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
     VALUES ($1, 1, 'x', 'exam', 'apply')`,
    [second],
  );
});

test('the improvement cycle upserts on the tuples the inherited models name', async () => {
  const ids = await offering('cycle');
  const target = await clo(ids, 'CLO1');

  // Run createCycle and upsertDetail's own ON CONFLICT clauses. A missing or
  // differently-columned unique constraint raises 42P10 rather than a duplicate
  // -key error, so this checks the constraint's column list, not just that
  // duplicates are refused somewhere.
  const cycle = `INSERT INTO clo_course_cycle_cloplan (subject_id, program_id, academic_year)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (subject_id, program_id, academic_year)
                 DO UPDATE SET created_at = now()
                 RETURNING clo_course_cycle_id`;
  const first = await pool.query(cycle, [ids.subject, ids.program, ids.year]);
  const again = await pool.query(cycle, [ids.subject, ids.program, ids.year]);
  assert.equal(again.rows[0].clo_course_cycle_id, first.rows[0].clo_course_cycle_id);

  const detail = `INSERT INTO clo_course_cycle_detail_cloplan
                    (clo_course_cycle_id, clo_id, detail_type, detail_text, reference_academic_year)
                  VALUES ($1, $2, $3, $4, 2567)
                  ON CONFLICT (clo_course_cycle_id, clo_id, detail_type)
                  DO UPDATE SET detail_text = EXCLUDED.detail_text`;
  const cycleId = first.rows[0].clo_course_cycle_id;
  await pool.query(detail, [cycleId, target, 'SUMMARY', 'ผลรอบแรก']);
  await pool.query(detail, [cycleId, target, 'SUMMARY', 'แก้ไขแล้ว']);
  await pool.query(detail, [cycleId, target, 'NEXT_PLAN', 'แผนถัดไป']);

  const { rows } = await pool.query(
    `SELECT detail_type, detail_text FROM clo_course_cycle_detail_cloplan
      WHERE clo_course_cycle_id = $1 ORDER BY detail_type`,
    [cycleId],
  );
  assert.deepEqual(rows, [
    { detail_type: 'NEXT_PLAN', detail_text: 'แผนถัดไป' },
    { detail_type: 'SUMMARY', detail_text: 'แก้ไขแล้ว' },
  ]);

  assert.equal(
    await errorCode(
      `INSERT INTO clo_course_cycle_detail_cloplan (clo_course_cycle_id, clo_id, detail_type, detail_text)
       VALUES ($1, $2, 'RETROSPECTIVE', 'x')`,
      [cycleId, target],
    ),
    '23514',
  );
});

test('deleting a CLO takes what describes it and leaves the person who wrote it', async () => {
  const ids = await offering('clodelete');
  const target = await clo(ids, 'CLO1');

  await pool.query(
    `INSERT INTO subject_clo_measurable_behavior
       (clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level)
     VALUES ($1, 1, 'x', 'homework', 'apply')`,
    [target],
  );
  await pool.query(
    `INSERT INTO subject_clo_achievement_criteria (clo_id, criteria_no, achievement_level, criteria_detail)
     VALUES ($1, 1, 'ดี', 'x')`,
    [target],
  );
  const cycle = await pool.query(
    `INSERT INTO clo_course_cycle_cloplan (subject_id, program_id, academic_year)
     VALUES ($1, $2, $3) RETURNING clo_course_cycle_id`,
    [ids.subject, ids.program, ids.year],
  );
  await pool.query(
    `INSERT INTO clo_course_cycle_detail_cloplan (clo_course_cycle_id, clo_id, detail_type, detail_text)
     VALUES ($1, $2, 'REFLECTION', 'x')`,
    [cycle.rows[0].clo_course_cycle_id, target],
  );

  await pool.query(`DELETE FROM subject_clo WHERE clo_id = $1`, [target]);

  for (const table of [
    'subject_clo_measurable_behavior',
    'subject_clo_achievement_criteria',
    'clo_course_cycle_detail_cloplan',
  ]) {
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE clo_id = $1`, [
      target,
    ]);
    assert.equal(rows[0].n, 0, table);
  }

  // The cycle itself is not a part of the CLO and survives it.
  const survivors = await pool.query(
    `SELECT count(*)::int AS n FROM clo_course_cycle_cloplan WHERE program_id = $1`,
    [ids.program],
  );
  assert.equal(survivors.rows[0].n, 1);
});

test('deleting a teacher who wrote a CLO leaves the CLO behind', async () => {
  const ids = await offering('cloauthor');

  const target = await clo(ids, 'CLO1');
  await pool.query(`DELETE FROM users WHERE user_id = $1`, [ids.user]);

  const { rows } = await pool.query(
    `SELECT created_by, clo_number FROM subject_clo WHERE clo_id = $1`,
    [target],
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].created_by, null);
});

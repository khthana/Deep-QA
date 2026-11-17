'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures } = require('./helpers');

/**
 * Migration 0010, at the same seam as 0001-0009's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The applied-migration list and the foreign-key type check move here from
 * 0009's file, as they have moved with every ticket.
 *
 * What the migration does is narrow `semester_courses.semester` to ภาคต้น and
 * ภาคปลาย - the owner struck ภาคฤดูร้อน on 17 พ.ย. 2569 (#279), system-wide. The
 * rows below are the two halves of a narrowed check: 3 is refused, and 1 and 2
 * still go in, because a check rewritten as `IN (1)` would pass the first half.
 */

const SCHEMA = testSchema('nosummer');
let pool;

test.before(async () => {
  await migrate({ schema: SCHEMA });
  pool = createPool({ schema: SCHEMA });
});

test.after(async () => {
  if (pool) await pool.end();
  await dropSchema(SCHEMA);
});

test('reset and migrate build the schema from nothing', async (t) => {
  const schema = testSchema('nosummer_from_empty');
  t.after(() => dropSchema(schema));

  await reset({ schema });

  const { applied } = await migrate({ schema });

  assert.deepEqual(applied, [
    '0001_identity_and_organisation.sql',
    '0002_offerings_and_learning_outcomes.sql',
    '0003_assessment_scores_and_rubrics.sql',
    '0004_user_profile_image.sql',
    '0005_external_assessor_validity.sql',
    '0006_user_log_target.sql',
    '0007_work_group_name_unique.sql',
    '0008_users_acting_epoch.sql',
    '0009_program_revision_year.sql',
    '0010_no_summer_term.sql',
  ]);
});

test('every foreign key has the type and width of the column it points at', async () => {
  // The one place introspection earns its keep. A mismatched width is not
  // something either side's DDL states - it is the disagreement between two
  // lines in two files - and PostgreSQL creates varchar(8) -> varchar(20)
  // without a word, then fails much later on a value that fits one and not the
  // other. 0010 adds no foreign key of its own; the check is kept running
  // because it is about the whole schema and this is the newest file.
  const { rows } = await pool.query(`
    SELECT ch.relname  AS child_table,
           ac.attname  AS child_column,
           format_type(ac.atttypid, ac.atttypmod) AS child_type,
           pa.relname  AS parent_table,
           ap.attname  AS parent_column,
           format_type(ap.atttypid, ap.atttypmod) AS parent_type
      FROM pg_constraint c
      JOIN pg_class ch ON ch.oid = c.conrelid
      JOIN pg_class pa ON pa.oid = c.confrelid
      JOIN unnest(c.conkey, c.confkey) AS k(child_attnum, parent_attnum) ON true
      JOIN pg_attribute ac ON ac.attrelid = c.conrelid AND ac.attnum = k.child_attnum
      JOIN pg_attribute ap ON ap.attrelid = c.confrelid AND ap.attnum = k.parent_attnum
     WHERE c.contype = 'f'
       AND ch.relnamespace = current_schema()::regnamespace
  `);

  const mismatched = rows
    .filter((r) => r.child_type !== r.parent_type)
    .map((r) => `${r.child_table}.${r.child_column} ${r.child_type} -> ${r.parent_table}.${r.parent_column} ${r.parent_type}`);

  assert.deepEqual(mismatched, []);
  // Guards against the query silently matching nothing and passing.
  assert.ok(rows.length > 40, `expected the schema's foreign keys, found ${rows.length}`);
});

test('an offering in ภาคฤดูร้อน is refused, and ภาคต้น and ภาคปลาย are not', async () => {
  const ids = await baseFixtures(pool, 'nosummer');
  await pool.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type) VALUES ($1, $2, 'required')`,
    [ids.program, ids.subject],
  );
  const insert = (semester) =>
    pool.query(
      `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
       VALUES ($1, $2, '2570', $3)`,
      [ids.program, ids.subject, semester],
    );

  await assert.rejects(insert(3), (error) => error.code === '23514');
  await insert(1);
  await insert(2);

  const { rows } = await pool.query(
    `SELECT semester FROM semester_courses WHERE program_id = $1 ORDER BY semester`,
    [ids.program],
  );
  assert.deepEqual(rows.map((row) => row.semester), [1, 2]);
});

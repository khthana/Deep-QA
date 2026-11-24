'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures } = require('./helpers');

/**
 * Migration 0010, at the same seam as 0001-0009's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The applied-migration list and the foreign-key type check were here from
 * 0010 until 0011, and have moved on to 0011's file: they are about the schema
 * as a whole, so they belong to whichever migration is newest.
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

test('migration 0010 ran, and ran in its place', async () => {
  // The whole-schema assertions - the full applied list, and the foreign-key
  // type check - have moved on to 0011's file, as they move to whichever
  // migration is newest. What is left here is this file's own migration.
  const { rows } = await pool.query(`SELECT filename FROM schema_migrations ORDER BY filename`);
  const applied = rows.map((row) => row.filename);
  assert.equal(applied[9], '0010_no_summer_term.sql');
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

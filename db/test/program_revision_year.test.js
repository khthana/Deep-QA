'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures } = require('./helpers');

/**
 * Migration 0009, at the same seam as 0001-0008's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The applied-migration list and the foreign-key type check move here from
 * 0008's file, as they have moved with every ticket: they are about the schema
 * as a whole, so they belong to whichever migration is newest.
 *
 * What the migration does is rename one column, so the rows below are about the
 * two things a rename can get wrong. The old name must be gone - a rename that
 * left a `year` behind would be a schema where both spellings work and half the
 * code picks the wrong one - and the column's shape must be untouched, because
 * a rename that quietly changed the width or the nullability would be key
 * surgery dressed as a rename. ADR-0001 is not engaged either way: `year`
 * appeared in no primary key, unique constraint or foreign key on `programs`,
 * and the fourth row is what says so rather than the ticket saying it.
 */

const SCHEMA = testSchema('revisionyear');
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
  const schema = testSchema('revisionyear_from_empty');
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
  ]);
});

test('every foreign key has the type and width of the column it points at', async () => {
  // The one place introspection earns its keep. A mismatched width is not
  // something either side's DDL states - it is the disagreement between two
  // lines in two files - and PostgreSQL creates varchar(8) -> varchar(20)
  // without a word, then fails much later on a value that fits one and not the
  // other. 0009 adds no foreign key of its own; the check is kept running
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

/** Every column of `programs`, with the shape the schema gives it. */
async function columnsOfPrograms() {
  const { rows } = await pool.query(
    `SELECT column_name, data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'programs'`,
  );
  return new Map(rows.map((row) => [row.column_name, row]));
}

test('a programme says which year it means', async () => {
  const columns = await columnsOfPrograms();

  assert.ok(columns.has('revision_year'), 'expected programs.revision_year');
  // Both halves, because a rename that adds the new name without removing the
  // old one is a schema where both spellings work and nothing says which the
  // code should use.
  assert.equal(columns.has('year'), false, 'expected the bare `year` to be gone');
});

test('the rename left the column the shape it had', async () => {
  // A rename that also widened the column, or made it required, would be a
  // change to what a programme *is* smuggled in under a change to what it is
  // called. `varchar(4)` and nullable are what 0001 wrote.
  const column = (await columnsOfPrograms()).get('revision_year');

  assert.equal(column.data_type, 'character varying');
  assert.equal(column.character_maximum_length, 4);
  assert.equal(column.is_nullable, 'YES');
});

test('nothing keys on the year a curriculum was revised', async () => {
  // Why the rename is not key surgery, asserted rather than asserted about.
  // ADR-0001 would be engaged if this column were part of a key; it is not,
  // and the day somebody puts it in one this row is what says the rename was
  // cheap for a reason that has stopped being true.
  const { rows } = await pool.query(
    `SELECT c.conname, c.contype
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN unnest(c.conkey) AS k(attnum) ON true
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      WHERE t.relname = 'programs'
        AND t.relnamespace = current_schema()::regnamespace
        AND a.attname = 'revision_year'`,
  );

  assert.deepEqual(rows, []);
});

test('a programme is written and read under the new name', async () => {
  // Not a claim that data survived the rename - this schema is built from
  // nothing, so there was no data to survive - but that the column is writable
  // and readable by the new name and gives back what was put in it. The `year`
  // half of it is what a rename implemented as add-and-copy would have failed:
  // there the writes would land in one column and `programs` would carry two.
  const ids = await baseFixtures(pool, 'ryvalue');

  const { rows } = await pool.query(`SELECT revision_year FROM programs WHERE program_id = $1`, [
    ids.program,
  ]);

  // `baseFixtures` writes 2565, by the new name since #54; asserted here rather
  // than assumed, because a helper that stopped naming the column would make
  // this row read null and say nothing.
  assert.equal(rows[0].revision_year, '2565');
});

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
 * The applied-migration list and the foreign-key type check were here from
 * 0009 until 0010, and have moved on to 0010's file: they are about the schema
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

test('migration 0009 ran, and ran in its place', async () => {
  // The whole-schema assertions - the full applied list, and the foreign-key
  // type check - have moved on to 0010's file, as they move to whichever
  // migration is newest. What is left here is this file's own migration.
  const { rows } = await pool.query(`SELECT filename FROM schema_migrations ORDER BY filename`);
  const applied = rows.map((row) => row.filename);
  assert.equal(applied[8], '0009_program_revision_year.sql');
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

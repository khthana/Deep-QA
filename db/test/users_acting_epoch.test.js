'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0008, at the same seam as 0001-0007's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The applied-migration list and the foreign-key type check are not here: they
 * are about the schema as a whole and have moved on, to 0009's file.
 *
 * What the migration adds is one counter on `users`, and the only thing about
 * it the schema decides rather than the application is its starting value.
 * Every account that existed before this file ran has never switched a grant,
 * and every account created after it will not have either, so both must read
 * zero without anybody writing one - a null there would be a renewal the
 * server cannot decide about on the day it is deployed.
 */

const SCHEMA = testSchema('actingepoch');
let pool;

test.before(async () => {
  await migrate({ schema: SCHEMA });
  pool = createPool({ schema: SCHEMA });
});

test.after(async () => {
  if (pool) await pool.end();
  await dropSchema(SCHEMA);
});

test('migration 0008 ran, and ran in its place', async () => {
  // The whole-schema assertions - the full applied list, and the foreign-key
  // type check - have moved on to 0009's file, as they move to whichever
  // migration is newest. What is left here is this file's own migration.
  const { rows } = await pool.query(`SELECT filename FROM schema_migrations ORDER BY filename`);
  const applied = rows.map((row) => row.filename);
  assert.equal(applied[7], '0008_users_acting_epoch.sql');
});

test('an account has switched nothing until it switches something', async () => {
  // Written against an account inserted without naming the column, which is
  // both what the seed does and what every row already in the table did on the
  // day the migration ran.
  const ids = await baseFixtures(pool, 'epochzero');

  const { rows } = await pool.query(`SELECT acting_epoch FROM users WHERE user_id = $1`, [
    ids.user,
  ]);

  assert.equal(rows[0].acting_epoch, 0);
});

test('the counter is never absent', async () => {
  // The server reads it on every renewal and compares it with a number out of
  // a token. A null would make that comparison false for a caller who has done
  // nothing wrong, which is a session that quietly stops renewing.
  const ids = await baseFixtures(pool, 'epochnull');

  const code = await errorCodeOf(
    pool,
    `UPDATE users SET acting_epoch = NULL WHERE user_id = $1`,
    [ids.user],
  );

  assert.equal(code, '23502');
});

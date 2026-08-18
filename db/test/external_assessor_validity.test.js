'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0005, at the same seam as 0001-0004's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The applied-migration list and the foreign-key type check have moved on to
 * 0006's file, as they move with every ticket: they are about the schema as a
 * whole, so they belong to whichever migration is newest.
 *
 * What this migration adds is two nullable dates and one CHECK, so most of what
 * there is to assert is what it does *not* do - an account with no window is
 * every account in the university, and none of them may be affected.
 */

const SCHEMA = testSchema('validity');
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

test('migration 0005 ran, and ran in its place', async () => {
  // The whole-schema assertions - the full applied list, and the foreign-key
  // type check - have moved on to 0006's file, as they move to whichever
  // migration is newest. What is left here is this file's own migration.
  const { rows } = await pool.query(
    `SELECT filename FROM schema_migrations ORDER BY filename`,
  );
  const applied = rows.map((row) => row.filename);
  assert.equal(applied[4], '0005_external_assessor_validity.sql');
});

test('an account with no window stated is left alone', async () => {
  // The case that is nearly every account. Both columns nullable and no
  // default is the whole of what makes an ordinary staff account unaffected,
  // and a default would have put a date on all of them.
  const ids = await baseFixtures(pool, 'nowindow');

  const { rows } = await pool.query(
    `SELECT valid_from, valid_until FROM users WHERE user_id = $1`,
    [ids.user],
  );

  assert.equal(rows[0].valid_from, null);
  assert.equal(rows[0].valid_until, null);
});

test('a window may be open at either end', async () => {
  // "good from today, until somebody says otherwise" and "good until the end
  // of the round, from whenever it was made" are both real ways to state one.
  const ids = await baseFixtures(pool, 'halfopen');

  await pool.query(`UPDATE users SET valid_until = DATE '2026-03-31' WHERE user_id = $1`, [
    ids.user,
  ]);
  await pool.query(`UPDATE users SET valid_from = DATE '2026-03-01', valid_until = NULL
                    WHERE user_id = $1`, [ids.user]);

  const { rows } = await pool.query(
    `SELECT valid_from, valid_until FROM users WHERE user_id = $1`,
    [ids.user],
  );
  assert.equal(rows[0].valid_until, null);
  assert.ok(rows[0].valid_from instanceof Date);
});

test('a one-day window is allowed', async () => {
  // An assessment visit that lasts an afternoon. The CHECK is `<=`, not `<`,
  // and this is the case that says why.
  const ids = await baseFixtures(pool, 'oneday');

  await pool.query(
    `UPDATE users SET valid_from = DATE '2026-03-10', valid_until = DATE '2026-03-10'
     WHERE user_id = $1`,
    [ids.user],
  );

  const { rows } = await pool.query(`SELECT valid_from FROM users WHERE user_id = $1`, [ids.user]);
  assert.ok(rows[0].valid_from instanceof Date);
});

test('a window that ends before it starts is refused', async () => {
  // The one thing a form can send that the columns cannot represent honestly:
  // an account refused on every day of its life, which reads as a working
  // account until somebody tries to sign in.
  const ids = await baseFixtures(pool, 'backwards');

  const code = await errorCode(
    `UPDATE users SET valid_from = DATE '2026-03-31', valid_until = DATE '2026-03-01'
     WHERE user_id = $1`,
    [ids.user],
  );

  assert.equal(code, '23514');
});

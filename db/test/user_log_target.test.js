'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0006, at the same seam as 0001-0005's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The applied-migration list and the foreign-key type check are not here: they
 * are about the schema as a whole and have moved with every ticket since, to
 * 0008's file.
 *
 * What the migration adds is two nullable columns saying which record a log
 * line was written about. The two things worth asserting are the two decisions
 * the file makes rather than the columns themselves: that the pair is written
 * whole or not at all, and that the target is *not* a foreign key, so an audit
 * line outlives the record it names.
 */

const SCHEMA = testSchema('logtarget');
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

test('a line about nothing but the actor names no record', async () => {
  // Signing in, signing out, switching role, changing one's own password: the
  // row already names the account, so both columns stay null and the CHECK has
  // to permit that, or the sign-in path breaks on its first write.
  const ids = await baseFixtures(pool, 'plainlog');

  await pool.query(`INSERT INTO user_log (user_id, activity) VALUES ($1, 'LOGIN')`, [ids.user]);

  const { rows } = await pool.query(
    `SELECT target_kind, target_id FROM user_log WHERE user_id = $1`,
    [ids.user],
  );
  assert.equal(rows[0].target_kind, null);
  assert.equal(rows[0].target_id, null);
});

test('a half-written target is refused', async () => {
  // A kind with no id names nothing; an id with no kind cannot be looked up in
  // any table. Either half alone is a line that reads as an answer and is not
  // one, which for an audit record is worse than a null.
  const ids = await baseFixtures(pool, 'halflog');

  const kindOnly = await errorCode(
    `INSERT INTO user_log (user_id, activity, target_kind) VALUES ($1, 'UPDATE_USER', 'USER')`,
    [ids.user],
  );
  const idOnly = await errorCode(
    `INSERT INTO user_log (user_id, activity, target_id) VALUES ($1, 'UPDATE_USER', 'someone')`,
    [ids.user],
  );

  assert.equal(kindOnly, '23514');
  assert.equal(idOnly, '23514');
});

test('the line outlives the record it names', async () => {
  // Why `target_id` is text and not a reference. Deleting the account that was
  // edited must not take the record of the edit with it - CASCADE would erase
  // the evidence and SET NULL would blank the one field the column exists for.
  const actor = await baseFixtures(pool, 'keeper');
  const subject = await baseFixtures(pool, 'deleted');

  await pool.query(
    `INSERT INTO user_log (user_id, activity, target_kind, target_id)
     VALUES ($1, 'UPDATE_USER', 'USER', $2)`,
    [actor.user, subject.user],
  );
  await pool.query(`DELETE FROM subjects WHERE created_by = $1`, [subject.user]);
  await pool.query(`DELETE FROM users WHERE user_id = $1`, [subject.user]);

  const { rows } = await pool.query(
    `SELECT target_id FROM user_log WHERE user_id = $1 AND activity = 'UPDATE_USER'`,
    [actor.user],
  );
  assert.equal(rows[0].target_id, subject.user);
});

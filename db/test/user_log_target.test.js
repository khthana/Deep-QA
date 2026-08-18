'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0006, at the same seam as 0001-0005's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The applied-migration list and the foreign-key type check move here from
 * 0005's file, as they have moved with every ticket: they are about the schema
 * as a whole, so they belong to whichever migration is newest.
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

test('reset and migrate build the schema from nothing', async (t) => {
  const schema = testSchema('logtarget_from_empty');
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
  ]);
});

test('every foreign key has the type and width of the column it points at', async () => {
  // The one place introspection earns its keep. A mismatched width is not
  // something either side's DDL states - it is the disagreement between two
  // lines in two files - and PostgreSQL creates varchar(8) -> varchar(20)
  // without a word, then fails much later on a value that fits one and not the
  // other. 0006 adds no foreign key of its own, deliberately; the check is kept
  // running because it is about the whole schema and this is the newest file.
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

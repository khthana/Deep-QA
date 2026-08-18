'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0005, at the same seam as 0001-0004's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The applied-migration list and the foreign-key type check move here from
 * 0004's file, as they have moved with every ticket: they are about the schema
 * as a whole, so they belong to whichever migration is newest.
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

test('reset and migrate build the schema from nothing', async (t) => {
  const schema = testSchema('validity_from_empty');
  t.after(() => dropSchema(schema));

  await reset({ schema });

  const { applied } = await migrate({ schema });

  assert.deepEqual(applied, [
    '0001_identity_and_organisation.sql',
    '0002_offerings_and_learning_outcomes.sql',
    '0003_assessment_scores_and_rubrics.sql',
    '0004_user_profile_image.sql',
    '0005_external_assessor_validity.sql',
  ]);
});

test('every foreign key has the type and width of the column it points at', async () => {
  // The one place introspection earns its keep. A mismatched width is not
  // something either side's DDL states - it is the disagreement between two
  // lines in two files - and PostgreSQL creates varchar(8) -> varchar(20)
  // without a word, then fails much later on a value that fits one and not the
  // other. 0005 adds no foreign key of its own; the check is kept running
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

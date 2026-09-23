'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0008, at the same seam as 0001-0007's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The applied-migration list and the foreign-key type check move here from
 * 0006's file, as they have moved with every ticket: they are about the schema
 * as a whole, so they belong to whichever migration is newest.
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

test('reset and migrate build the schema from nothing', async (t) => {
  const schema = testSchema('actingepoch_from_empty');
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
  ]);
});

test('every foreign key has the type and width of the column it points at', async () => {
  // The one place introspection earns its keep. A mismatched width is not
  // something either side's DDL states - it is the disagreement between two
  // lines in two files - and PostgreSQL creates varchar(8) -> varchar(20)
  // without a word, then fails much later on a value that fits one and not the
  // other. 0008 adds no foreign key of its own, deliberately; the check is kept
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

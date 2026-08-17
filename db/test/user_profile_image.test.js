'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0004, at the same seam as 0001-0003's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The assertions are behavioural. The foreign-key type check that earns its
 * introspection lives in this file now, having moved on from 0003's, together
 * with the applied-migration list.
 *
 * The statements below come from services/userService.js and
 * models/userModel.js. The table has no columns in the thesis, so that SQL is
 * the whole specification, and keeping the shape that matters is what tells us
 * the schema serves it - a paraphrase of the upsert would not have caught
 * 42P10. UPSERT is verbatim; PROFILE keeps the LEFT JOIN and drops the columns
 * of the read that belong to other tables.
 */

const SCHEMA = testSchema('userimage');
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

/** userService.upsertUserImage, verbatim but for the schema qualification. */
const UPSERT = `
  INSERT INTO user_image (user_id, image_path)
  VALUES ($1, $2)
  ON CONFLICT (user_id)
  DO UPDATE SET
    image_path = EXCLUDED.image_path
`;

/** The photo half of userModel.getUserProfileByUserId. */
const PROFILE = `
  SELECT u.user_id, ui.image_path
    FROM users u
    LEFT JOIN user_image ui ON ui.user_id = u.user_id
   WHERE u.user_id = $1
`;

test('reset and migrate build the schema from nothing', async (t) => {
  const schema = testSchema('userimg_from_empty');
  t.after(() => dropSchema(schema));

  await reset({ schema });

  const { applied } = await migrate({ schema });

  assert.deepEqual(applied, [
    '0001_identity_and_organisation.sql',
    '0002_offerings_and_learning_outcomes.sql',
    '0003_assessment_scores_and_rubrics.sql',
    '0004_user_profile_image.sql',
  ]);
});

test('every foreign key has the type and width of the column it points at', async () => {
  // The one place introspection earns its keep. A mismatched width is not
  // something either side's DDL states - it is the disagreement between two
  // lines in two files - and PostgreSQL creates varchar(8) -> varchar(20)
  // without a word, then fails much later on a value that fits one and not the
  // other. docs/02 gets it wrong seven times within 0002's scope and nine more
  // within 0003's, always by giving a person the subject's width, so it is
  // exactly the error most likely to be copied in. 0004 adds no count of its
  // own - the thesis has no entry for its table to state a width wrongly in -
  // but its one foreign key is read here like every other.
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
  // And that the column this migration adds is one of the rows it read.
  assert.ok(
    rows.some((r) => r.child_table === 'user_image' && r.child_column === 'user_id'),
    'user_image.user_id should be among the foreign keys checked',
  );
});

test('a second upload replaces the path instead of adding a row', async () => {
  // The acceptance criterion is about 42P10, not 23505. ON CONFLICT (user_id)
  // needs a unique constraint on exactly that column; against a table keyed any
  // other way PostgreSQL refuses to plan the statement and nothing is written,
  // which a plain duplicate-insert test would never notice.
  const ids = await baseFixtures(pool, 'reupload');

  await pool.query(UPSERT, [ids.user, '/user_image/first.png']);
  await pool.query(UPSERT, [ids.user, '/user_image/second.png']);

  const { rows } = await pool.query(
    `SELECT * FROM user_image WHERE user_id = $1`,
    [ids.user],
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].image_path, '/user_image/second.png');
});

test('the profile read returns the user with no path when nothing was uploaded', async () => {
  // The LEFT JOIN is the reason a missing photo may not be a missing user. An
  // inner join here would drop every account that has never uploaded one.
  const ids = await baseFixtures(pool, 'nophoto');

  const { rows } = await pool.query(PROFILE, [ids.user]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, ids.user);
  assert.equal(rows[0].image_path, null);
});

test('a photo may only be filed against a user who exists', async () => {
  const code = await errorCode(UPSERT, ['UNKNOWN', '/user_image/x.png']);
  assert.equal(code, '23503');
});

test('deleting a user takes the profile photo with it', async () => {
  // 0001's exception to RESTRICT, and the behaviour userModel.deleteUser is
  // written for: it cleans up course_sections_teacher by hand and never touches
  // user_image, leaving that to the database - its 23503 branch says to check
  // CASCADE. Under RESTRICT every user who ever uploaded a photo would become
  // undeletable through that path.
  const ids = await baseFixtures(pool, 'delphoto');
  await pool.query(UPSERT, [ids.user, '/user_image/gone.png']);

  await pool.query(`DELETE FROM users WHERE user_id = $1`, [ids.user]);

  const { rows } = await pool.query(
    `SELECT * FROM user_image WHERE user_id = $1`,
    [ids.user],
  );
  assert.deepEqual(rows, []);
});

test('a photo without a path is refused', async () => {
  const ids = await baseFixtures(pool, 'nopath');
  const code = await errorCode(
    `INSERT INTO user_image (user_id) VALUES ($1)`,
    [ids.user],
  );
  assert.equal(code, '23502');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0004, at the same seam as 0001-0003's tests: migrate() and the pool
 * against real PostgreSQL, in a schema this file owns and drops.
 *
 * The assertions are behavioural. The foreign-key type check and the
 * applied-migration list have moved on to 0005's file, as they move to
 * whichever migration is newest.
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

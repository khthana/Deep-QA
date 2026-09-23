'use strict';

/**
 * #159: what a process about to bind a port does with the migration ledger.
 *
 * The defect the ticket is about is silent: a migration nobody applied leaves
 * the server running happily and one screen broken, and neither test seam can
 * see it because both migrate the schema they are about to use. The answer is a
 * check at boot - and the whole difficulty is that there are three answers to
 * it, not two. The verdict is a pure function of the report so all three can be
 * asserted here without a database; that the report itself tells them apart is
 * `db/test/migrate.test.js`'s claim.
 *
 * These rows sit beside the HTTP-surface suite without being part of it, and
 * that is deliberate rather than careless. `test/helpers.js` describes this
 * directory's harness as the backend's one seam and docs/06 says a test states
 * a rule "through the interface a real client uses" - but a server that refuses
 * to start has no HTTP surface, by definition, and the interface its client
 * really uses is an exit code and a line on stderr. The last row asserts exactly
 * that, on a real process; the rest are the same policy asked without paying for
 * a spawn and a database state per answer. They live here rather than under
 * `db/` because the policy is the backend's: `db/` is not allowed to know this
 * package exists.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const path = require('node:path');
const { execFile: execFileCallback } = require('node:child_process');
const { promisify } = require('node:util');

const execFile = promisify(execFileCallback);

const { migrate } = require('../../db/migrate');
const { createPool } = require('../../db/pool');
const { dropSchema } = require('../../db/reset');
const { testSchema } = require('../../db/test/helpers');

const { migrationVerdict, checkMigrations } = require('../startup');

test('a schema level with the migrations directory starts, and says nothing about it', () => {
  const verdict = migrationVerdict({ asked: true, pending: [] });

  assert.equal(verdict.start, true);
  assert.equal(verdict.message, null);
});

test('a schema behind the migrations directory refuses to start, naming the files and the command', () => {
  const verdict = migrationVerdict({
    asked: true,
    pending: ['0007_work_group_name_unique.sql', '0008_users_acting_epoch.sql'],
  });

  assert.equal(verdict.start, false);
  // Both files, not a count: the person reading this has to know which
  // migration is missing to know what is broken.
  assert.match(verdict.message, /0007_work_group_name_unique\.sql/);
  assert.match(verdict.message, /0008_users_acting_epoch\.sql/);
  assert.match(verdict.message, /cd db && npm run migrate/);
});

test('a ledger that could not be read starts, and says it could not be read', () => {
  const verdict = migrationVerdict({
    asked: false,
    reason: 'connect ECONNREFUSED 127.0.0.1:5432',
  });

  assert.equal(verdict.start, true);
  assert.match(verdict.message, /ECONNREFUSED 127\.0\.0\.1:5432/);
  // The refusal's instruction must not leak into this one. Somebody whose
  // container is stopped has not got a migration to run, and telling them to
  // run one sends them at the wrong problem - which is the mistake this whole
  // shape exists to avoid.
  assert.doesNotMatch(verdict.message, /npm run migrate/);
});

test('the check can be turned off, and then asks nothing', async (t) => {
  const port = process.env.DB_PORT;
  const switched = process.env.MIGRATION_CHECK;
  t.after(() => {
    process.env.DB_PORT = port;
    if (switched === undefined) delete process.env.MIGRATION_CHECK;
    else process.env.MIGRATION_CHECK = switched;
  });

  // A dead port is what proves the switch skips the query rather than merely
  // ignoring its answer: an unswitched check here would report that it could
  // not ask, and that is a different message.
  process.env.DB_PORT = '1';
  process.env.MIGRATION_CHECK = 'off';

  const verdict = await checkMigrations();

  assert.equal(verdict.start, true);
  assert.match(verdict.message, /MIGRATION_CHECK/);
  assert.doesNotMatch(verdict.message, /ECONNREFUSED/);
});

/**
 * The wiring, measured on a real process.
 *
 * Everything above is a pure function, and a pure function that nothing calls
 * would pass all of it. `server.js` is the one file in the tree that binds a
 * port, which is why no other test touches it - but a refusal never gets as far
 * as binding anything, so the one case that matters here can be run without a
 * port and without a collision with whatever else is listening.
 */
test('a server pointed at a schema behind the migrations refuses to bind a port', async (t) => {
  const schema = testSchema('startup_behind');
  t.after(() => dropSchema(schema));

  await migrate({ schema });

  // Drift as it actually happens: the files are all there and one of them was
  // never applied here. Removing the newest ledger row is the same state as
  // pulling a branch that added a migration and not running it.
  const pool = createPool({ schema });
  let missing;
  try {
    const { rows } = await pool.query(
      `DELETE FROM schema_migrations
        WHERE filename = (SELECT max(filename) FROM schema_migrations)
        RETURNING filename`,
    );
    missing = rows[0].filename;
  } finally {
    await pool.end();
  }

  let refusal;
  try {
    await execFile(process.execPath, ['server.js'], {
      cwd: path.join(__dirname, '..'),
      // PORT 0 rather than a number: if this ever starts instead of refusing,
      // it takes an ephemeral port and dies on the timeout rather than
      // colliding with whatever a person has running.
      // MIGRATION_CHECK pinned empty rather than inherited: this row is about
      // what a server does with the check on, and it should not depend on
      // what the row above it put back.
      env: { ...process.env, DB_SCHEMA: schema, PORT: '0', MIGRATION_CHECK: '' },
      timeout: 30_000,
    });
  } catch (error) {
    refusal = error;
  }

  assert.ok(refusal, 'the server bound a port instead of refusing to start');
  assert.equal(refusal.code, 1);
  assert.ok(
    refusal.stderr.includes(missing),
    `the refusal did not name ${missing}:\n${refusal.stderr}`,
  );
  assert.match(refusal.stderr, /cd db && npm run migrate/);
});

/**
 * The check reaching for something that is not there.
 *
 * `pendingMigrations` catches what the database says; it cannot catch what
 * stops the question being asked at all - an unset `DB_SCHEMA`, a migrations
 * directory that is not on disk. Those throw before its own `try`, and an
 * uncaught one here would kill a server over the check rather than over
 * anything the check found. It is one more way of being unable to ask, and it
 * is answered as one.
 */
test('a check that could not be attempted is a verdict, not a crash', async (t) => {
  const schema = process.env.DB_SCHEMA;
  t.after(() => {
    process.env.DB_SCHEMA = schema;
  });

  process.env.DB_SCHEMA = 'not a schema name';

  const verdict = await checkMigrations();

  assert.equal(verdict.start, true);
  assert.match(verdict.message, /DB_SCHEMA/);
});

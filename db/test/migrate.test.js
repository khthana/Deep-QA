'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate, pendingMigrations } = require('../migrate');
const { createPool } = require('../pool');
const {
  migrationsDirWith,
  cleanupMigrationsDirs,
  testSchema,
  dropSchema,
} = require('./helpers');

test.after(cleanupMigrationsDirs);

test('a migration that fails part way leaves nothing behind and can be retried', async (t) => {
  const schema = testSchema('migrate_failure');
  t.after(() => dropSchema(schema));

  const migrationsDir = migrationsDirWith({
    '0001_first.sql': 'CREATE TABLE survivor (note text);',
    // Creates one table, then dies. Neither the table nor the ledger row may
    // outlive the failure, or the fixed file can never be applied.
    '0002_broken.sql': 'CREATE TABLE casualty (note text);\nSELECT 1 / 0;',
  });

  await assert.rejects(migrate({ schema, migrationsDir }), /division by zero/);

  const fixed = migrationsDirWith({
    '0001_first.sql': 'CREATE TABLE survivor (note text);',
    '0002_broken.sql': 'CREATE TABLE casualty (note text);',
  });

  const retry = await migrate({ schema, migrationsDir: fixed });

  assert.deepEqual(retry.applied, ['0002_broken.sql']);
});

test('running twice applies nothing the second time', async (t) => {
  const schema = testSchema('migrate_twice');
  t.after(() => dropSchema(schema));

  // No IF NOT EXISTS: re-applying this file would raise 42P07, so a second run
  // that reports nothing applied has genuinely skipped it.
  const migrationsDir = migrationsDirWith({
    '0001_create_table.sql': 'CREATE TABLE idempotency_probe (note text);',
  });

  const first = await migrate({ schema, migrationsDir });
  const second = await migrate({ schema, migrationsDir });

  assert.deepEqual(first.applied, ['0001_create_table.sql']);
  assert.deepEqual(second.applied, []);
});

test('applies migrations in filename order, not directory order', async (t) => {
  const schema = testSchema('migrate_order');
  t.after(() => dropSchema(schema));

  // Written youngest-first so a runner that trusts readdir order has a chance
  // to get it wrong. 0002 cannot succeed unless 0001 ran before it.
  const migrationsDir = migrationsDirWith({
    '0002_add_row.sql': "INSERT INTO ordering_probe (note) VALUES ('second');",
    '0001_create_table.sql': 'CREATE TABLE ordering_probe (note text);',
  });

  const result = await migrate({ schema, migrationsDir });

  assert.deepEqual(result.applied, ['0001_create_table.sql', '0002_add_row.sql']);

  const pool = createPool({ schema });
  try {
    const { rows } = await pool.query('SELECT note FROM ordering_probe');
    assert.deepEqual(rows, [{ note: 'second' }]);
  } finally {
    await pool.end();
  }
});

/**
 * Whether a schema exists at all, asked from outside it.
 *
 * `pendingMigrations` is read-only, and the only way to say so is to ask a
 * question it would have answered differently: `migrate` creates the schema
 * before it reads the ledger, and a check that borrowed that code would too.
 */
async function schemaExists(schema) {
  const pool = createPool({ schema: 'public' });
  try {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
      [schema],
    );
    return rowCount === 1;
  } finally {
    await pool.end();
  }
}

test('a schema behind the migrations directory names what it has not applied', async (t) => {
  const schema = testSchema('pending_behind');
  t.after(() => dropSchema(schema));

  const applied = migrationsDirWith({
    '0001_first.sql': 'CREATE TABLE behind_probe (note text);',
  });
  // The same first file and one nobody has run. A check that counted rows
  // rather than comparing filenames would get the number right here and the
  // names wrong, so the assertion is on the names.
  const ahead = migrationsDirWith({
    '0001_first.sql': 'CREATE TABLE behind_probe (note text);',
    '0002_second.sql': 'ALTER TABLE behind_probe ADD COLUMN extra text;',
  });

  await migrate({ schema, migrationsDir: applied });
  const report = await pendingMigrations({ schema, migrationsDir: ahead });

  assert.equal(report.asked, true);
  assert.deepEqual(report.pending, ['0002_second.sql']);
});

test('a schema level with the migrations directory names nothing', async (t) => {
  const schema = testSchema('pending_level');
  t.after(() => dropSchema(schema));

  const migrationsDir = migrationsDirWith({
    '0001_first.sql': 'CREATE TABLE level_probe (note text);',
    '0002_second.sql': 'ALTER TABLE level_probe ADD COLUMN extra text;',
  });

  await migrate({ schema, migrationsDir });
  const report = await pendingMigrations({ schema, migrationsDir });

  assert.equal(report.asked, true);
  assert.deepEqual(report.pending, []);
});

test('a schema nobody has migrated names every file, and asking does not create it', async (t) => {
  const schema = testSchema('pending_fresh');
  t.after(() => dropSchema(schema));

  const migrationsDir = migrationsDirWith({
    '0001_first.sql': 'CREATE TABLE fresh_probe (note text);',
    '0002_second.sql': 'ALTER TABLE fresh_probe ADD COLUMN extra text;',
  });

  const report = await pendingMigrations({ schema, migrationsDir });

  assert.equal(report.asked, true);
  assert.deepEqual(report.pending, ['0001_first.sql', '0002_second.sql']);
  assert.equal(await schemaExists(schema), false);
});

test('a database that cannot be reached is unanswered, not every migration pending', async (t) => {
  const port = process.env.DB_PORT;
  // Put back in `after` rather than after the assertions: a row that restores
  // the environment only when it passes hands the next row a dead port.
  t.after(() => {
    process.env.DB_PORT = port;
  });

  // Nothing listens on port 1. This is the state the naive check cannot see:
  // it reads the failure as an empty ledger, reports the whole directory
  // pending, and refuses to start a server whose database is merely down -
  // with a message naming the wrong problem.
  process.env.DB_PORT = '1';

  const migrationsDir = migrationsDirWith({
    '0001_first.sql': 'CREATE TABLE unreachable_probe (note text);',
  });

  const report = await pendingMigrations({ schema: testSchema('pending_unreachable'), migrationsDir });

  assert.equal(report.asked, false);
  assert.equal(report.pending, undefined);
  assert.match(report.reason, /ECONNREFUSED/);
});

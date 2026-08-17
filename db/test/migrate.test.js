'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
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

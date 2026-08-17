'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const {
  migrationsDirWith,
  cleanupMigrationsDirs,
  testSchema,
  dropSchema,
} = require('./helpers');

test.after(cleanupMigrationsDirs);

test('reset takes the schema back to empty, so every migration applies again', async (t) => {
  const schema = testSchema('reset_from_scratch');
  t.after(() => dropSchema(schema));

  const migrationsDir = migrationsDirWith({
    '0001_create_table.sql': 'CREATE TABLE reset_probe (note text);',
  });

  await migrate({ schema, migrationsDir });
  await reset({ schema });

  // Nothing is left to skip and nothing is left to collide with: the same
  // migration applies a second time against a schema that is empty again.
  const afterReset = await migrate({ schema, migrationsDir });

  assert.deepEqual(afterReset.applied, ['0001_create_table.sql']);
});

test('reset works on a schema that was never created', async (t) => {
  const schema = testSchema('reset_never_existed');
  t.after(() => dropSchema(schema));

  await assert.doesNotReject(reset({ schema }));
});

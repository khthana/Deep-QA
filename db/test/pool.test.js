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

test('a bare table name resolves in the configured schema, on every connection', async (t) => {
  const schema = testSchema('pool_search_path');
  // The decoy below has to live in `public`, which is shared by every test
  // process. Naming the probe after the schema - which carries the pid - is
  // what keeps two concurrent runs from dropping each other's decoy.
  const probe = `${schema}_probe`.slice(0, 63);

  const migrationsDir = migrationsDirWith({
    '0001_probe.sql': `
      CREATE TABLE ${probe} (note text);
      INSERT INTO ${probe} (note) VALUES ('from the configured schema');
    `,
  });
  await migrate({ schema, migrationsDir });

  // A decoy of the same name in public. Without a search path the bare query
  // below would find this one, so it is what makes the test discriminating.
  const publicPool = createPool({ schema: 'public' });
  await publicPool.query(`DROP TABLE IF EXISTS public.${probe}`);
  await publicPool.query(`CREATE TABLE ${probe} (note text)`);
  await publicPool.query(`INSERT INTO ${probe} (note) VALUES ('from public')`);

  t.after(async () => {
    await publicPool.query(`DROP TABLE IF EXISTS public.${probe}`);
    await publicPool.end();
    await dropSchema(schema);
    cleanupMigrationsDirs();
  });

  const pool = createPool({ schema });
  try {
    // Concurrent, so the pool opens several connections: the search path has
    // to belong to the connection, not to whichever client ran a SET first.
    const results = await Promise.all(
      Array.from({ length: 5 }, () => pool.query(`SELECT note FROM ${probe}`)),
    );

    for (const { rows } of results) {
      assert.deepEqual(rows, [{ note: 'from the configured schema' }]);
    }
  } finally {
    await pool.end();
  }
});

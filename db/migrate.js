'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { createPool, schemaName } = require('./pool');

const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function migrationFilenames(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

const LEDGER = 'schema_migrations';

/**
 * One migration file and the row recording it commit or roll back together, so
 * a file that dies half way leaves neither half a schema nor a ledger entry
 * claiming it ran. PostgreSQL would already wrap the file's own statements in
 * an implicit transaction; this extends that to the ledger write and stops the
 * guarantee resting on a detail of the wire protocol.
 *
 * The cost: a migration cannot contain a statement that refuses to run inside a
 * transaction block, `CREATE INDEX CONCURRENTLY` being the one that comes up.
 * If a later ticket needs one, it needs an opt-out marker here.
 */
async function applyInTransaction(pool, filename, sql) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(`INSERT INTO ${LEDGER} (filename) VALUES ($1)`, [filename]);
    await client.query('COMMIT');
    client.release();
  } catch (error) {
    // A migration can fail by killing the connection, in which case the
    // rollback fails too. Swallow that one: the transaction is already gone,
    // and the failure worth reporting is the migration's, not the cleanup's.
    try {
      await client.query('ROLLBACK');
    } catch {
      // fall through
    }
    // Released with the error, so pg discards the client rather than handing
    // the next caller a connection sitting in an aborted transaction.
    client.release(error);
    error.message = `${filename}: ${error.message}`;
    throw error;
  }
}

async function migrate({ schema, migrationsDir = DEFAULT_MIGRATIONS_DIR } = {}) {
  const target = schemaName(schema ?? process.env.DB_SCHEMA);
  const pool = createPool({ schema: target });
  const applied = [];

  try {
    // The schema may not exist yet. A search_path naming a missing schema is
    // not an error in PostgreSQL, so this can run on the same pool: the entry
    // creates the schema, and every bare name after it resolves inside it.
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${target}"`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${LEDGER} (
        filename    text        PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await pool.query(`SELECT filename FROM ${LEDGER}`);
    const alreadyApplied = new Set(rows.map((row) => row.filename));

    for (const filename of migrationFilenames(migrationsDir)) {
      if (alreadyApplied.has(filename)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
      await applyInTransaction(pool, filename, sql);
      applied.push(filename);
    }
  } finally {
    await pool.end();
  }

  return { applied };
}

module.exports = { migrate };

if (require.main === module) {
  migrate()
    .then(({ applied }) => {
      if (applied.length === 0) {
        console.log('Nothing to apply — the schema is up to date.');
        return;
      }
      console.log(`Applied ${applied.length} migration(s):`);
      for (const filename of applied) console.log(`  ${filename}`);
    })
    .catch((error) => {
      console.error(`Migration failed: ${error.message}`);
      process.exitCode = 1;
    });
}

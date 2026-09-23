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

/**
 * PostgreSQL's code for a relation that is not there. A schema nobody has
 * migrated has no ledger, and reading it fails with this and nothing else.
 */
const UNDEFINED_TABLE = '42P01';

/**
 * What went wrong, in words somebody can act on.
 *
 * `pg` reports a refused connection as an `AggregateError` whose own message is
 * the empty string: everything it knows - including the host and port it tried
 * - is in `errors`. Reading `error.message` alone therefore produces a report
 * that says the database could not be asked and does not say why, which is half
 * an answer at exactly the moment somebody needs the whole one.
 */
function reasonOf(error) {
  const inner = Array.isArray(error.errors) ? error.errors.map((one) => one.message) : [];
  const said = [error.message, ...inner].filter(Boolean).join('; ');

  return said || error.code || String(error);
}

/**
 * Which migration files a schema has not applied - asked, not fixed.
 *
 * Nothing here writes: no `CREATE SCHEMA`, no `CREATE TABLE IF NOT EXISTS`, no
 * migration applied. `migrate` creates both before it reads the ledger, which
 * is right for a command somebody ran on purpose and wrong for a check that
 * runs at every boot, where creating an empty schema as a side effect of asking
 * a question would hide the very drift the question is about.
 *
 * The answer has two shapes because there are two things that can be true, and
 * the whole point of this function is that they are not the same:
 *
 *   { asked: true,  pending: [...] }   the ledger was read
 *   { asked: false, reason }           the ledger could not be read at all
 *
 * A schema with no ledger is the first shape, not the second: every file is
 * genuinely pending on a database nobody has ever migrated. A database that is
 * down, or refusing the password, or missing, is the second - and a check that
 * collapsed it into "everything is pending" would tell somebody whose container
 * is stopped to run the migrations, which is not their problem and would not
 * fix it.
 *
 * The ledger is read the way `migrate` writes it - a bare name on the
 * connection's search path - so a `public` that holds a ledger of its own
 * shadows a schema that does not. That is deliberate: this answers what the
 * runner would do, rather than offering a second opinion about where the
 * ledger lives.
 *
 * The wait is whatever `pg` and the operating system make of an unanswered
 * connection; there is no timeout of our own. A refused port comes back in
 * milliseconds, which is the case this exists for. A host that silently drops
 * packets takes the OS connect timeout, and the caller starts after it.
 */
async function pendingMigrations({ schema, migrationsDir = DEFAULT_MIGRATIONS_DIR } = {}) {
  const target = schemaName(schema ?? process.env.DB_SCHEMA);
  const filenames = migrationFilenames(migrationsDir);
  const pool = createPool({ schema: target });

  try {
    const { rows } = await pool.query(`SELECT filename FROM ${LEDGER}`);
    const alreadyApplied = new Set(rows.map((row) => row.filename));

    return { asked: true, pending: filenames.filter((name) => !alreadyApplied.has(name)) };
  } catch (error) {
    if (error.code === UNDEFINED_TABLE) return { asked: true, pending: filenames };

    return { asked: false, reason: reasonOf(error) };
  } finally {
    await pool.end();
  }
}

module.exports = { migrate, pendingMigrations };

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

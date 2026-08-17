'use strict';

const { createPool, schemaName } = require('./pool');

/**
 * Drops a schema and everything in it. Also the tests' cleanup step, which is
 * why it lives here rather than being written out twice.
 *
 * The pool is pinned to `public`, not to the target: the target is about to
 * stop existing.
 */
async function dropSchema(schema) {
  const target = schemaName(schema);
  const pool = createPool({ schema: 'public' });
  try {
    await pool.query(`DROP SCHEMA IF EXISTS "${target}" CASCADE`);
  } finally {
    await pool.end();
  }
  return { schema: target };
}

/**
 * Drops the schema and everything in it, then recreates it empty. The ledger
 * goes with it, so the next `npm run migrate` replays the whole history.
 *
 * This is the local-development escape hatch, not a deployment step: it exists
 * so a migration can be edited in place while the tree it builds is still
 * being written, instead of accumulating corrective migrations for a schema
 * nobody has yet.
 */
async function reset({ schema } = {}) {
  const target = schemaName(schema ?? process.env.DB_SCHEMA);

  const pool = createPool({ schema: 'public' });
  try {
    await pool.query(`DROP SCHEMA IF EXISTS "${target}" CASCADE`);
    await pool.query(`CREATE SCHEMA "${target}"`);
  } finally {
    await pool.end();
  }

  return { schema: target };
}

module.exports = { reset, dropSchema };

if (require.main === module) {
  reset()
    .then(({ schema }) => {
      console.log(`Schema "${schema}" dropped and recreated. Run npm run migrate next.`);
    })
    .catch((error) => {
      console.error(`Reset failed: ${error.message}`);
      process.exitCode = 1;
    });
}

'use strict';

/**
 * The test harness for the backend's one seam: the HTTP surface, exercised
 * in-process against a real PostgreSQL. docs/06's Testing Decisions settle the
 * shape - no stubbed database, no stubbed sign-in, and no second seam beneath
 * this one.
 *
 * db/ is required across the directory boundary by relative path rather than
 * copied. The migration runner, the pool and its search_path construction are
 * the database package's job, and a second copy of any of them here would be a
 * copy that can drift from the schema it is supposed to describe. The
 * dependency runs one way only: backend reads db, never the reverse.
 */

const { migrate } = require('../../db/migrate');
const { createPool } = require('../../db/pool');
const { dropSchema } = require('../../db/reset');
const { testSchema } = require('../../db/test/helpers');

const { createApp } = require('../app');

/**
 * A migrated schema of this test file's own, a pool pointed at it, and the
 * application built on that pool.
 *
 * This is how the ticket's "dedicated schema, leaving development data
 * untouched" and "reset and re-seed between test files" are both answered, and
 * there is no reset step anywhere because none is needed: `node --test` gives
 * each test file its own process, `testSchema` suffixes the name with the pid,
 * and so every file starts against a schema that has just been created and
 * migrated and that no other file can see. Development data is untouched
 * because DB_SCHEMA is never opened.
 *
 * The label says which file the schema belongs to, so one left behind by a run
 * that died mid-test can be identified rather than guessed at.
 */
async function startApi(label) {
  const schema = testSchema(`api_${label}`);
  await migrate({ schema });

  const pool = createPool({ schema });
  const app = createApp({ pool });

  return {
    app,
    pool,
    schema,
    /** Call from `t.after`, which runs whether the test passed or failed. */
    async close() {
      await pool.end();
      await dropSchema(schema);
    },
  };
}

module.exports = { startApi };

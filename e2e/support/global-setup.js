'use strict';

const { dropSchema } = require('../../db/reset');
const { migrate } = require('../../db/migrate');
const { seed } = require('../../db/seed');
const { watch } = require('./leftovers');
const { clearUploads } = require('./uploads');
const { E2E_SCHEMA } = require('./env');

/**
 * The database this run starts from: dropped, migrated, seeded.
 *
 * At the start rather than at the end, so a failed run leaves its schema
 * behind to be looked at. The next run is what cleans it up.
 *
 * This is safe to run while the backend is already listening - Playwright does
 * not promise an order between this and `webServer`, and does not need to:
 * `server.js` issues no query at boot, and `/api/health` is a `SELECT 1` that
 * resolves no relation, so it answers whether or not the schema exists yet.
 *
 * The uploads go with it - #138. `35a` attaches PDFs that the backend writes
 * to a directory, and the rows naming them are dropped here with the schema, so
 * clearing one and not the other left files nobody could reach and nothing
 * would remove. Same moment, same reason: the files and the rows are one world,
 * and a failed run leaves both behind to be looked at. `uploads.js` holds the
 * guard that says which directory this is allowed to be.
 *
 * The snapshot taken at the end is #132's. Every spec shares this schema and
 * they run in order, so what one file writes is part of the world the next one
 * is handed; the returned function is what Playwright calls when the run is
 * over, and it prints what moved between then and now. It reports rather than
 * refuses - `leftovers.js` says why, and says what it cannot tell you.
 */
module.exports = async () => {
  await clearUploads();
  await dropSchema(E2E_SCHEMA);
  await migrate({ schema: E2E_SCHEMA });
  await seed({ schema: E2E_SCHEMA });

  return watch(E2E_SCHEMA);
};

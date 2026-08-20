'use strict';

const { dropSchema } = require('../../db/reset');
const { migrate } = require('../../db/migrate');
const { seed } = require('../../db/seed');
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
 */
module.exports = async () => {
  await dropSchema(E2E_SCHEMA);
  await migrate({ schema: E2E_SCHEMA });
  await seed({ schema: E2E_SCHEMA });
};

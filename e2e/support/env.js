'use strict';

/**
 * Where this suite's servers live, and which schema they sit on.
 *
 * Deliberately not 3000/5000 and not `deep_core`. The import tests write real
 * students, and a suite that could land on the ports and schema a person is
 * developing against would eventually write them into that person's database.
 */
const E2E_SCHEMA = 'deep_core_e2e';
const BACKEND_PORT = 3100;
const FRONTEND_PORT = 5100;

module.exports = {
  E2E_SCHEMA,
  BACKEND_PORT,
  FRONTEND_PORT,
  BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
  FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
};

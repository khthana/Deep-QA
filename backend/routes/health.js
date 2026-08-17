'use strict';

const express = require('express');

/**
 * Whether the process can serve a request and reach its database. Deliberately
 * says nothing else - not the schema, not the version, not the connection
 * string - because it is the one route that answers before a caller has proved
 * who they are, and #9 makes every other route refuse an unauthenticated
 * caller.
 *
 * 503 rather than 500 when the query fails: the process is fine and the
 * dependency is not, which is the distinction a load balancer acts on.
 */
function healthRoutes(pool) {
  const router = express.Router();

  router.get('/health', async (request, response) => {
    try {
      await pool.query('SELECT 1');
      response.json({ status: 'ok', database: 'up' });
    } catch {
      response.status(503).json({ status: 'error', database: 'down' });
    }
  });

  return router;
}

module.exports = { healthRoutes };

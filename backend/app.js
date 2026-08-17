'use strict';

/**
 * The application, built and returned rather than started.
 *
 * The inherited index.js built the app and called listen() in the same file,
 * which is why nothing in it could ever be tested: importing it bound a port.
 * Splitting the two is the only structural change docs/06 asks for, and it is
 * what lets the whole test suite run in-process, with no port and no fixed
 * order between test files.
 *
 * The pool is a parameter, not something this module creates. That is what
 * makes pointing the application at a test schema a matter of handing it a
 * different pool - no environment variable mutated at test time, and no code
 * path that only tests take.
 *
 * Deliberately absent for now: sessions, passport, CORS and the static
 * evidence directory. Each belongs to the ticket that first needs it - #8 for
 * sign-in and the session cookie, #10 for the browser that will need an origin
 * allowed, #35 and #47 for evidence served from disk - and carrying them here
 * would mean shipping SESSION_SECRET handling that nothing yet exercises.
 */

const express = require('express');

const { healthRoutes } = require('./routes/health');

function createApp({ pool }) {
  if (!pool) throw new Error('createApp needs a pool');

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', healthRoutes(pool));

  // Express' own fallback answers with HTML, which a client that asked for
  // JSON cannot read: it gets a parse error where it expected a status.
  app.use((request, response) => {
    response.status(404).json({ error: 'Not found' });
  });

  return app;
}

module.exports = { createApp };

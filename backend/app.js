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
 * Deliberately absent for now: CORS and the static evidence directory. Each
 * belongs to the ticket that first needs it - #10 for the browser that will
 * need an origin allowed, #35 and #47 for evidence served from disk.
 *
 * There is no express-session either, and there will not be one: #8's session
 * is a signed JWT in an HttpOnly cookie, which needs a cookie parser and no
 * store. Passport is mounted by the auth router rather than here, because the
 * Google strategy is the only thing that uses it and it is registered only
 * when the OAuth credentials are configured.
 */

const express = require('express');
const cookieParser = require('cookie-parser');

const { attachRoles } = require('./auth/authorise');
const { requireSession } = require('./auth/session');
const { authRoutes } = require('./routes/auth');
const { healthRoutes } = require('./routes/health');

function createApp({ pool }) {
  if (!pool) throw new Error('createApp needs a pool');

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Everything mounted above this line answers an anonymous caller; everything
  // below it does not. Health is the one endpoint that has to answer before
  // anyone has signed in - a load balancer holds no cookie - and sign-in
  // cannot require having signed in. That is the whole of the public surface,
  // and #9's sixth criterion is true of every route added after this line by
  // construction rather than by anyone remembering to guard it.
  app.use('/api', healthRoutes(pool));
  app.use('/api', authRoutes(pool));

  app.use('/api', requireSession, attachRoles(pool));

  // Express' own fallback answers with HTML, which a client that asked for
  // JSON cannot read: it gets a parse error where it expected a status.
  app.use((request, response) => {
    response.status(404).json({ error: 'Not found' });
  });

  return app;
}

module.exports = { createApp };

'use strict';

const path = require('path');
const { createRequire } = require('module');

const { COOKIE_NAME } = require('../../backend/auth/session');
const { BACKEND_URL } = require('./env');

/**
 * A session that has ended, without waiting half an hour for one.
 *
 * #10's sixth criterion is about a tab someone left open, and no suite can sit
 * still for thirty minutes to produce one. What it can produce is the state
 * that tab is in: a browser still holding the cookie, with a token inside it
 * that has died. That state is only reachable at all because the cookie now
 * outlives the token (#69) - see `COOKIE_LIFETIME_SECONDS` - and the row is
 * proved in two halves for that reason: this file forges the dead token, and
 * a separate assertion reads the real cookie the server set to show the window
 * in which a real one would be found.
 *
 * `jsonwebtoken` and `dotenv` are resolved through the packages that own them
 * rather than added to this suite's own dependencies: a second copy of the
 * signing library, or a second reading of the environment, is a way for this
 * seam to disagree with the server it is driving.
 */
const backendRequire = createRequire(require.resolve('../../backend/package.json'));
const dbRequire = createRequire(require.resolve('../../db/package.json'));

const jwt = backendRequire('jsonwebtoken');
dbRequire('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

/** The session cookie as the browser holds it, or undefined. */
async function sessionCookie(page) {
  const cookies = await page.context().cookies();
  return cookies.find(cookie => cookie.name === COOKIE_NAME);
}

/** The claims of a token, read without verifying it - no secret involved. */
function payloadOf(token) {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

/**
 * Replaces this browser's session with the same one, dead.
 *
 * The claims are carried over from the live cookie so the token names the
 * account that is actually signed in, and the cookie is cleared first: two
 * cookies of the same name would leave which one the server reads up to the
 * parser.
 */
async function expireSession(page) {
  const cookie = await sessionCookie(page);
  if (!cookie) throw new Error('no session cookie to expire; sign in first');

  const { user_id, acting } = payloadOf(cookie.value);
  const claims = { user_id, ...(acting ? { acting } : {}) };
  const dead = jwt.sign(claims, process.env.SECRET_KEY, { expiresIn: -60 });

  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: dead,
      url: BACKEND_URL,
      expires: Math.floor(Date.now() / 1000) + 3600,
    },
  ]);
}

module.exports = { sessionCookie, payloadOf, expireSession };

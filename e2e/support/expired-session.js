'use strict';

const path = require('path');
const { createRequire } = require('module');

const { COOKIE_NAME } = require('../../backend/auth/session');
const { BACKEND_URL } = require('./env');

/**
 * A session of a chosen age, without waiting half an hour for one: one that
 * has ended, and one inside the last ten minutes of its life.
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
 * Replaces this browser's session with the same one, aged.
 *
 * The claims are carried over from the live cookie so the token names the
 * account that is actually signed in, wearing the hat it is actually wearing
 * and carrying the switch counter it was issued with (#51) - a token missing
 * any of the three is a different session, and the last of them is the
 * difference between one that renews and one that cannot. The cookie is
 * cleared first: two cookies of the same name would leave which one the server
 * reads up to the parser.
 */
async function reissue(page, seconds) {
  const cookie = await sessionCookie(page);
  if (!cookie) throw new Error('no session cookie to re-sign; sign in first');

  const { user_id, acting, acting_epoch } = payloadOf(cookie.value);
  const claims = { user_id, acting_epoch, ...(acting ? { acting } : {}) };
  const token = jwt.sign(claims, process.env.SECRET_KEY, { expiresIn: seconds });

  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      url: BACKEND_URL,
      expires: Math.floor(Date.now() / 1000) + 3600,
    },
  ]);
}

/** The same session, dead. */
const expireSession = (page) => reissue(page, -60);

/**
 * The same session, with `seconds` of life left.
 *
 * What it is for is the renewal threshold: `LIFETIME_SECONDS` offers no seam to
 * shorten, and nothing else puts a browser inside the last ten minutes of a
 * token without waiting twenty real ones.
 */
const shortenSession = (page, seconds) => reissue(page, seconds);

module.exports = { sessionCookie, payloadOf, expireSession, shortenSession };

'use strict';

/**
 * The session: a JWT in an HttpOnly cookie, and the middleware that reads it
 * back.
 *
 * The token carries `user_id` and nothing else. The inherited generateToken
 * signed the whole profile into it - title, both name pairs, the profile
 * picture - and a cookie that carries a copy of the profile is a cookie that
 * starts lying the moment the profile is edited, for as long as it lives.
 * Display fields belong in the sign-in response body, which is read once.
 *
 * Roles are deliberately not in here either, for the same reason and a
 * stronger one: ADR-0002 derives authorisation from the database on every
 * request, so a role in the token would be a second source of truth that a
 * revoked grant could not reach.
 *
 * #10 adds one more claim, `acting`, and it is worth being exact about what
 * it is not. It is the caller's *selection* - which of their own grants they
 * are currently working as - and it confers nothing: `attachRoles` re-reads
 * the grants from the database on every request and matches the selection
 * against them, falling back to the most senior when it matches none. A
 * cookie naming a grant the account does not hold is worth exactly as much as
 * a cookie naming none. So the paragraph above still holds: nothing in here
 * is a source of authority.
 */

const jwt = require('jsonwebtoken');

const { REFUSALS } = require('./refusals');

const COOKIE_NAME = 'token';
const LIFETIME_SECONDS = 30 * 60;

/**
 * Renewal threshold. Under ten minutes left and a request re-issues the
 * token, so someone working continuously is not signed out mid-edit at the
 * thirty-minute mark; someone who walks away still expires thirty minutes
 * after their last request. Carried from the inherited verifyToken, which is
 * the behaviour the users of the delivered system already have.
 */
const RENEW_BELOW_SECONDS = 10 * 60;

/**
 * How long the browser keeps the cookie, which is deliberately longer than
 * the token inside it lives.
 *
 * With the two equal there is no instant at which a browser holds a cookie
 * whose token has died, so `requireSession` never sees TokenExpiredError from
 * anyone sitting at a screen: the cookie is simply gone, the shell's first
 * call is `anonymous`, and the person is returned to the sign-in page without
 * a word - which is the one thing #10's sixth criterion forbids. Keeping the
 * cookie past the token grants no authority, because the token is what is
 * checked and it is dead; what it buys is the window in which someone who
 * walks away and comes back is still told their session ended rather than
 * treated as a stranger who never signed in. Twice the lifetime makes that
 * window as long as the session itself. Ticket #69.
 */
const COOKIE_LIFETIME_SECONDS = LIFETIME_SECONDS * 2;

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Fails on the way in rather than at the first sign-in attempt, and names the
 * variable, in the same spirit as createApp's own missing-pool guard. An
 * unset SECRET_KEY is the state a fresh `cp .env.example .env` leaves behind.
 */
function secret() {
  const value = process.env.SECRET_KEY;
  if (!value) throw new Error('SECRET_KEY is not set; the session cannot be signed');
  return value;
}

/**
 * HttpOnly so script cannot read it, `secure` only in production because
 * local development is served over http, and `lax` so the OAuth redirect back
 * from Google still arrives with the cookie attached.
 *
 * No `domain`: the inherited helper pinned it to 'localhost' in development
 * and '.deep-core.net' in production. Host-only is what a cookie without the
 * attribute already is, it is the narrower of the two, and the deployed
 * hostname is a deployment concern rather than something to compile in.
 */
const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'lax',
  path: '/',
  maxAge: COOKIE_LIFETIME_SECONDS * 1000,
});

/**
 * Signs a session for this user and sets it on the response. `acting` is the
 * caller's selected grant as `{ role_id, scope_id }`, or undefined when they
 * have not chosen one and the most senior applies.
 */
function issueSession(res, userId, acting) {
  const claims = { user_id: userId };
  // Both halves or neither: a role without its scope is ambiguous the moment
  // one account holds one role at two scopes.
  if (acting?.role_id && acting?.scope_id) {
    claims.acting = { role_id: acting.role_id, scope_id: acting.scope_id };
  }
  const token = jwt.sign(claims, secret(), { expiresIn: LIFETIME_SECONDS });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
}

/**
 * Clears the cookie. maxAge is dropped and the rest kept: a browser only
 * discards a cookie when the clearing attributes match the ones it was set
 * with.
 */
function clearSession(res) {
  const { maxAge, ...rest } = cookieOptions();
  res.clearCookie(COOKIE_NAME, rest);
}

/**
 * Puts `req.session = { userId, acting }` on a request carrying a live token,
 * and refuses one that does not.
 *
 * Every refusal here carries a `reason` beside the words. The shell has to
 * tell "you never signed in" from "you were signed in and the session ended",
 * because the first is the sign-in page's ordinary state and the second is
 * #10's sixth criterion - an explanation rather than an unexplained failure.
 * The words alone cannot carry that: they are Thai prose, and a machine that
 * has to match on prose breaks the day someone rewords it.
 *
 * This is identity only. Ticket #9 layers the authorisation lookup on top -
 * which grants the account holds, and whether one of them covers the scope
 * being asked for - and that lookup reads the database rather than anything
 * here.
 */
function requireSession(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: REFUSALS.noSession, reason: 'anonymous' });
  }

  let claims;
  try {
    claims = jwt.verify(token, secret());
  } catch (error) {
    // The cookie is deliberately not cleared here. #9 mounts this on every
    // protected route, and a middleware that clears on any verification
    // failure turns one unlucky request - a clock skew, a request in flight
    // across a renewal - into a signed-out browser. Clearing is what
    // /auth/logout is for.
    const expired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      message: expired ? REFUSALS.expired : REFUSALS.invalidSession,
      reason: expired ? 'expired' : 'invalid',
    });
  }

  const remaining = claims.exp - Math.floor(Date.now() / 1000);
  // The renewal carries the selection forward, or working continuously past
  // the twenty-minute mark would silently put the caller back in their most
  // senior role.
  if (remaining < RENEW_BELOW_SECONDS) issueSession(res, claims.user_id, claims.acting);

  req.session = { userId: claims.user_id, acting: claims.acting };
  return next();
}

module.exports = {
  COOKIE_NAME,
  LIFETIME_SECONDS,
  COOKIE_LIFETIME_SECONDS,
  RENEW_BELOW_SECONDS,
  issueSession,
  clearSession,
  requireSession,
};

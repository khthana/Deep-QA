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
 */

const jwt = require('jsonwebtoken');

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
  maxAge: LIFETIME_SECONDS * 1000,
});

/** Signs a session for this user and sets it on the response. */
function issueSession(res, userId) {
  const token = jwt.sign({ user_id: userId }, secret(), { expiresIn: LIFETIME_SECONDS });
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
 * Puts `req.session = { userId }` on a request carrying a live token, and
 * refuses one that does not.
 *
 * This is identity only. Ticket #9 layers the authorisation lookup on top -
 * which grants the account holds, and whether one of them covers the scope
 * being asked for - and that lookup reads the database rather than anything
 * here.
 */
function requireSession(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: 'ไม่พบการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่' });
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
      message: expired ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : 'การเข้าสู่ระบบไม่ถูกต้อง',
    });
  }

  const remaining = claims.exp - Math.floor(Date.now() / 1000);
  if (remaining < RENEW_BELOW_SECONDS) issueSession(res, claims.user_id);

  req.session = { userId: claims.user_id };
  return next();
}

module.exports = {
  COOKIE_NAME,
  LIFETIME_SECONDS,
  RENEW_BELOW_SECONDS,
  issueSession,
  clearSession,
  requireSession,
};

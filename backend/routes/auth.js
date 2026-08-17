'use strict';

/**
 * Sign in, sign out, and the Google round trip — ticket #8.
 *
 * Two ways in, one way out. Which rules apply to which way in is settled in
 * auth/accounts; what is left here is HTTP: read the request, ask, set or
 * clear the cookie, write the activity log, answer.
 *
 * Not carried forward from the inherited routes: `blockDirectAccess`, the
 * middleware that refused any request whose Origin header was not the
 * frontend's. docs/06 drops it - a header the caller writes is not a control,
 * and ADR-0002 puts the control in the database instead.
 */

const express = require('express');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const {
  recordActivity,
  resolveGoogleAccount,
  resolvePasswordAccount,
  profileOf,
} = require('../auth/accounts');
const { issueSession, clearSession, requireSession } = require('../auth/session');

/**
 * The OAuth credentials are optional. `cp .env.example .env` leaves them blank
 * - the file says so, "not needed for local development" - and the Strategy
 * constructor throws without a clientID, which would take every test in the
 * backend down with it rather than only the Google ones. So the strategy is
 * registered when it is configured, and the two Google routes answer plainly
 * when it is not.
 */
const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** Signed in, the cookie set and the log written. Both ways in end here. */
async function admitted(res, pool, admission, activity) {
  issueSession(res, admission.user.user_id);
  await recordActivity(pool, admission.user.user_id, activity);
  return {
    user: profileOf(admission.user),
    role: admission.role,
    roles: admission.roles,
  };
}

function authRoutes(pool) {
  const router = express.Router();

  if (googleConfigured()) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        // Google has proved the address; every question after that is ours,
        // and is the same function the tests drive directly. Nothing about
        // the profile is logged: the inherited strategy printed the whole of
        // it to the console, which puts a name and an address in the server
        // log on every sign-in.
        async (accessToken, refreshToken, profile, done) => {
          try {
            const admission = await resolveGoogleAccount(pool, profile.emails?.[0]?.value);
            done(null, admission.ok ? admission : false, admission.ok ? undefined : admission);
          } catch (error) {
            done(error);
          }
        },
      ),
    );
  }

  const googleUnavailable = (res) =>
    res.status(503).json({ message: 'ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google บนเซิร์ฟเวอร์นี้' });

  router.get('/auth/google-login', (req, res, next) => {
    if (!googleConfigured()) return googleUnavailable(res);
    // session: false - the cookie above is the whole session, so there is no
    // express-session store for passport to write a login into.
    return passport.authenticate('google', { scope: ['profile', 'email'], session: false })(
      req,
      res,
      next,
    );
  });

  router.get('/auth/google/callback', (req, res, next) => {
    if (!googleConfigured()) return googleUnavailable(res);

    return passport.authenticate('google', { session: false }, async (error, admission, refusal) => {
      if (error) return next(error);

      const frontend = process.env.FRONTEND_URL ?? '';
      if (!admission) {
        // The refusal travels in the redirect rather than as a status code:
        // the caller here is a browser following Google back, and what it
        // needs is the sign-in page again with something to show.
        const reason = refusal?.reason ?? 'unknown';
        return res.redirect(`${frontend}/login?error=${encodeURIComponent(reason)}`);
      }

      const body = await admitted(res, pool, admission, 'GOOGLE_LOGIN');
      return res.redirect(`${frontend}/select-app?role=${encodeURIComponent(body.role.role_id)}`);
    })(req, res, next);
  });

  router.post('/auth/login', async (req, res, next) => {
    try {
      const { email, password } = req.body ?? {};
      const admission = await resolvePasswordAccount(pool, email, password);
      if (!admission.ok) {
        return res.status(admission.status).json({ message: admission.message });
      }
      return res.status(200).json(await admitted(res, pool, admission, 'LOGIN'));
    } catch (error) {
      return next(error);
    }
  });

  // Behind the session, so signing out can say who signed out. A request
  // without a live cookie has nothing to log and nothing to clear.
  router.post('/auth/logout', requireSession, async (req, res, next) => {
    try {
      await recordActivity(pool, req.session.userId, 'LOGOUT');
      clearSession(res);
      return res.status(200).json({ message: 'ออกจากระบบแล้ว' });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { authRoutes };

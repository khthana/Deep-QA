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
const {
  issueSession,
  clearSession,
  accountInDeadCookie,
} = require('../auth/session');
const { frontendUrl } = require('../config');

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

  /**
   * A refusal the browser can read — #50.
   *
   * Both Google routes are entered by a top-level navigation: the sign-in
   * screen sets `window.location` rather than fetching, and Google sends the
   * person back the same way. So a status code is not something anybody sees.
   * `googleUnavailable` used to answer `503` with a JSON body, which left the
   * browser parked on the API's own origin reading `{"message":"..."}` — off
   * the application, with no way back but the back button and no sign-in
   * screen to return to.
   *
   * That is not an edge: `cp .env.example .env` leaves the OAuth credentials
   * blank, on purpose and with a note saying so, and they are exactly what
   * `googleConfigured` reads. Every developer and the browser suite meet this
   * refusal, and until now every one of them met it as a JSON page.
   *
   * The callback's own refusal already answered the right way, and the reason
   * written there is this reason: what a browser needs is the sign-in page
   * again with something to show. This is that answer, given a name so both
   * routes give it.
   *
   * One consequence to know before this is deployed: a monitoring probe on
   * `/api/auth/google-login` now sees a 302 where it used to see a 5xx, so
   * missing OAuth credentials no longer announce themselves as a server error.
   * They announce themselves to the person instead, which is the trade this
   * makes on purpose — but a check that watched for the 5xx has to watch for
   * `?error=googleUnavailable` now.
   */
  const refuseToBrowser = (res, reason) =>
    res.redirect(`${frontendUrl()}/login?error=${encodeURIComponent(reason)}`);

  router.get('/auth/google-login', (req, res, next) => {
    if (!googleConfigured()) return refuseToBrowser(res, 'googleUnavailable');
    // session: false - the cookie above is the whole session, so there is no
    // express-session store for passport to write a login into.
    return passport.authenticate('google', { scope: ['profile', 'email'], session: false })(
      req,
      res,
      next,
    );
  });

  router.get('/auth/google/callback', (req, res, next) => {
    if (!googleConfigured()) return refuseToBrowser(res, 'googleUnavailable');

    return passport.authenticate('google', { session: false }, async (error, admission, refusal) => {
      if (error) return next(error);

      if (!admission) return refuseToBrowser(res, refusal?.reason ?? 'unknown');

      // `/main` — #66. This used to send people to `/select-app?role=<id>`,
      // and both halves of that were wrong. The chooser is gone, there being
      // one application now; and the `role` was read by nothing at the other
      // end, which it could not usefully be — the acting grant is decided
      // server-side from the database (ADR-0002) and travels in the cookie,
      // not in a query string the browser could edit on the way.
      //
      // `/main` rather than a particular screen, because which screen a person
      // lands on is their menu's first entry and the shell is what knows that.
      // Both ways in now hand over at the same place.
      await admitted(res, pool, admission, 'GOOGLE_LOGIN');
      return res.redirect(`${frontendUrl()}/main`);
    })(req, res, next);
  });

  router.post('/auth/login', async (req, res, next) => {
    try {
      const { email, password } = req.body ?? {};
      const admission = await resolvePasswordAccount(pool, email, password);
      if (!admission.ok) {
        // `reason` as well as `message` — #97. `refuse()` has always carried
        // one and this route dropped it, which made this the only 401 in the
        // application that arrived at a browser unnamed. The client cannot
        // tell an unnamed 401 from a session that ended, so it treated a wrong
        // password as one and drew the expiry dialog over the sentence that
        // said what was actually wrong.
        //
        // Sending it costs nothing and tells nobody anything they could not
        // already read: the sentence is the same for a wrong password and an
        // unregistered address, and so is the reason.
        return res
          .status(admission.status)
          .json({ message: admission.message, reason: admission.reason });
      }
      return res.status(200).json(await admitted(res, pool, admission, 'LOGIN'));
    } catch (error) {
      return next(error);
    }
  });

  // Not behind the session, and #92 is why. The cookie outlives the token it
  // carries by a full lifetime, so the browser with the most reason to sign
  // out - a tab left open past the expiry - is precisely the one `requireSession`
  // would turn away, leaving it holding a cookie that only this route erases
  // and looping through the expiry dialog forever.
  //
  // The fix is not to let `requireSession` clear on a failed verification: the
  // comment in auth/session.js says why not, and that reason still holds. It is
  // that clearing and recording are different things. Clearing is unconditional
  // and idempotent - signing out of a session that is already gone is still
  // signing out, and answering 401 to that is answering a question nobody
  // asked. Recording needs a name, so it happens only when the cookie carries
  // one this server signed.
  //
  // Dropping the guard is not a hole to force from another site: the cookie is
  // `sameSite: 'lax'`, so a cross-site POST never carries it, and a request
  // that carries nothing clears nothing and logs nobody.
  router.post('/auth/logout', async (req, res, next) => {
    try {
      const userId = accountInDeadCookie(req);
      if (userId) await recordActivity(pool, userId, 'LOGOUT');
      clearSession(res);
      return res.status(200).json({ message: 'ออกจากระบบแล้ว' });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { authRoutes };

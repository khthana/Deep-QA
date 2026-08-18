'use strict';

/**
 * The caller's own account — ticket #10.
 *
 * Three things the shell needs and nobody else can answer: who am I and what
 * may I be, which of those am I being, and let me change my password. Every
 * route here is about the caller and only the caller: there is no user
 * identifier in any path or body, because the one that matters is in the
 * cookie. Managing *other* people's accounts is #11 and lives elsewhere.
 *
 * Mounted below the guard in app.js, so `req.session` and `req.auth` are both
 * present by the time anything here runs.
 */

const express = require('express');
const bcrypt = require('bcrypt');

const { ABSENT_PASSWORD, profileOf, recordActivity } = require('../auth/accounts');
const { REFUSALS } = require('../auth/refusals');
const { issueSession } = require('../auth/session');

/** What #8 hashes sign-in passwords with; the same cost, so the two agree. */
const HASH_ROUNDS = 10;

/**
 * Eight characters, which is what the inherited change-password modal
 * enforced in the browser. It is enforced here as well because a rule that
 * only the browser knows is not a rule.
 */
const MINIMUM_PASSWORD = 8;

/** The whole of what the shell is told about the caller. */
const shellState = (user, auth) => ({
  user: profileOf(user),
  roles: auth.roles,
  acting: { role_id: auth.acting.role_id, scope_id: auth.acting.scope_id },
});

function meRoutes(pool) {
  const router = express.Router();

  const currentUser = async (req) => {
    const { rows } = await pool.query(
      `SELECT user_id, email, password, status, is_verified,
              title_th, first_name_th, last_name_th,
              title_en, first_name_en, last_name_en,
              department_id, program_id
       FROM users WHERE user_id = $1`,
      [req.auth.userId],
    );
    return rows[0];
  };

  // What the shell loads on every page load: the profile for the navbar, the
  // grants for the role picker, and which one is in effect so the picker and
  // the sidebar show the hat the server is actually honouring. `profileOf`
  // decides what a profile is; the password column never leaves this file.
  router.get('/me', async (req, res, next) => {
    try {
      return res.status(200).json(shellState(await currentUser(req), req.auth));
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Put on one of the caller's own hats.
   *
   * The selection is checked against the grants `attachRoles` just read from
   * the database - not against anything the client sent alongside it - so a
   * body naming a grant the account does not hold is refused rather than
   * honoured. That is ADR-0002 applied to the one endpoint that does take a
   * role in a body: what arrives is a *choice among what the server already
   * knows the caller holds*, which is a different thing from the client
   * asserting a privilege.
   *
   * Both halves are required. One account can hold one role at two scopes -
   * a committee member of two programmes - and a selection naming only the
   * role could not say which.
   *
   * Note for a later ticket: password sign-in is gated on the account's most
   * senior role being an administrator or an external assessor, and switching
   * happens after that gate. An account holding FULL_ADMIN together with a
   * curriculum grant could therefore sign in with a password and then act as
   * the curriculum grant. No such account exists and none should; #11 is
   * where granting is written, and that is where the pairing has to be
   * refused.
   */
  router.put('/me/acting-role', async (req, res, next) => {
    try {
      const { role_id, scope_id } = req.body ?? {};
      const held = req.auth.roles.find(
        (grant) => grant.role_id === role_id && grant.scope_id === scope_id,
      );
      if (!held) return res.status(403).json({ message: REFUSALS.roleNotHeld });

      // The log is written before the cookie is issued. If it fails, the
      // handler throws and the caller keeps the hat they had; the other order
      // answers 500 with the new hat already in the browser, so the picker
      // would show one role while the server enforced another - the exact
      // divergence #10's fourth criterion exists to prevent.
      await recordActivity(pool, req.auth.userId, 'SWITCH_ROLE');
      issueSession(res, req.auth.userId, held);
      return res.status(200).json({
        ...shellState(await currentUser(req), { ...req.auth, acting: held }),
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Change your own password.
   *
   * The current one is required and verified, so a browser left unattended is
   * not a browser whose password can be changed. An account that has only
   * ever signed in with Google has no password to verify against; it is
   * compared against the stand-in hash so it is refused rather than throwing,
   * and it costs what a real comparison costs. The refusal for a wrong
   * current password is a 403 and not a 401: a 401 is what an expired session
   * answers, and the shell shows different things for the two - sign in
   * again, versus that was not your password.
   *
   * The session is left alone. The inherited modal signed the user out two
   * seconds after succeeding; there is nothing to sign out of, since the
   * cookie proves a sign-in that already happened and the account is the same
   * account afterwards.
   */
  router.put('/me/password', async (req, res, next) => {
    try {
      const { current_password: current, new_password: replacement } = req.body ?? {};
      if (typeof replacement !== 'string' || replacement.length < MINIMUM_PASSWORD) {
        return res.status(400).json({ message: REFUSALS.weakPassword });
      }

      const user = await currentUser(req);
      const matches =
        typeof current === 'string' &&
        (await bcrypt.compare(current, user.password || ABSENT_PASSWORD));
      if (!matches) return res.status(403).json({ message: REFUSALS.wrongPassword });

      await pool.query(`UPDATE users SET password = $2 WHERE user_id = $1`, [
        user.user_id,
        await bcrypt.hash(replacement, HASH_ROUNDS),
      ]);
      await recordActivity(pool, user.user_id, 'CHANGE_PASSWORD');
      return res.status(200).json({ message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { meRoutes };

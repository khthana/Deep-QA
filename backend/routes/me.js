'use strict';

/**
 * The caller's own account — ticket #10.
 *
 * Five things the shell needs and nobody else can answer: who am I and what
 * may I be, which of those am I being, let me change my password, this is my
 * face (#47), and I am still here (#99). Every
 * route here is about the caller and only the caller: there is no user
 * identifier in any path or body, because the one that matters is in the
 * cookie. Managing *other* people's accounts is #11 and lives elsewhere.
 *
 * Mounted below the guard in app.js, so `req.session` and `req.auth` are both
 * present by the time anything here runs.
 */

const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');

const {
  ABSENT_PASSWORD,
  bumpActingEpoch,
  profileOf,
  recordActivity,
} = require('../auth/accounts');
const { REFUSALS } = require('../auth/refusals');
const { issueSession } = require('../auth/session');
const {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MEGABYTES,
  imageKind,
  readPhoto,
  removePhoto,
  storePhoto,
} = require('../lib/userPhoto');

/** What #8 hashes sign-in passwords with; the same cost, so the two agree. */
const HASH_ROUNDS = 10;

/**
 * Eight characters, which is what the inherited change-password modal
 * enforced in the browser. It is enforced here as well because a rule that
 * only the browser knows is not a rule.
 */
const MINIMUM_PASSWORD = 8;

/**
 * The photo, held in memory and never on disk until it has been judged — #47.
 *
 * `memoryStorage` and multer's own limit, both for `evidence.js`' reasons: a
 * file written to disk before the type check is a file the check has to clean up
 * after, and the size limit is the one check that must happen while the bytes
 * are still arriving rather than after they have all been held.
 *
 * The field is `image`, which is what the delivered route called it
 * (`uploads.single('image')`). Evidence calls its field `file`; keeping each
 * endpoint's own name costs nothing and means a client written against either
 * one still works.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES },
});

/**
 * multer's refusals turned into this application's, as `evidence.js` does it.
 *
 * Without this the size limit arrives at the error handler as an unhandled throw
 * and is answered เกิดข้อผิดพลาดในระบบ — a system fault, for something the
 * person fixes by choosing a smaller photo. The ticket asks for a clear message
 * and this is where it becomes one.
 */
const acceptPhoto = (req, res, next) =>
  upload.single('image')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: REFUSALS.photoTooLarge(MAX_PHOTO_MEGABYTES) });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: REFUSALS.photoUploadUnreadable });
    }
    return next(error);
  });

/** The whole of what the shell is told about the caller. */
const shellState = (user, auth) => ({
  user: profileOf(user),
  roles: auth.roles,
  acting: { role_id: auth.acting.role_id, scope_id: auth.acting.scope_id },
  // The limit travels with the shell so the dialog can say it before somebody
  // chooses a file — `EvidenceForm.js`' rule about a picker and a validator that
  // must not be able to disagree, applied to a number instead of to a list. The
  // browser gets to be helpful; the refusal that counts is still multer's.
  photo: { max_bytes: MAX_PHOTO_BYTES },
});

function meRoutes(pool) {
  const router = express.Router();

  const currentUser = async (req) => {
    const { rows } = await pool.query(
      // `EXISTS` rather than a LEFT JOIN on `image_path` — #47. The inherited
      // profile read joined for the path and put it in the answer; what the
      // shell is told here is only that there is one, because the bytes come
      // from a route that asks who is calling and not from a URL.
      `SELECT user_id, email, password, status, is_verified,
              title_th, first_name_th, last_name_th,
              title_en, first_name_en, last_name_en,
              department_id, program_id,
              EXISTS (SELECT 1 FROM user_image WHERE user_id = users.user_id) AS has_photo
       FROM users WHERE user_id = $1`,
      [req.auth.userId],
    );
    return rows[0];
  };

  /** The row that says where this caller's photo is, or nothing. */
  const photoRow = async (userId) => {
    const { rows } = await pool.query(`SELECT image_path FROM user_image WHERE user_id = $1`, [
      userId,
    ]);
    return rows[0] ?? null;
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
      // And the counter is bumped before that cookie for the same reason read
      // the other way round (#51): from the moment it moves, every token signed
      // before this one stops being renewable, so a request that was in flight
      // while this handler ran cannot put the old hat back a second later. The
      // bump is what makes this cookie the newest one; issuing the cookie first
      // would leave a gap in which an older token still counted as current.
      const epoch = await bumpActingEpoch(pool, req.auth.userId);
      issueSession(res, req.auth.userId, epoch, held);
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

  /**
   * The photo itself, to a caller who has been asked who they are — #47.
   *
   * There is no identifier in the path, and that is the fix rather than a
   * convenience: the delivered system served
   * `/static/user_image/<user_id>_<timestamp>.png` through
   * `express.static('/data/evidence')` with no guard at all, so every
   * photograph in the system was retrievable by anyone who could guess a name
   * built out of two things they knew. This route is mounted below the session
   * guard, reads the row for the account in the cookie, and can therefore only
   * ever answer with that account's own photo. A caller with no session is
   * refused by the guard, which is criterion 7 and is structural — there is no
   * branch here that could get it wrong.
   *
   * Three answers rather than two, `evidence.js`' distinction: no row is
   * ยังไม่มีรูปโปรไฟล์, a row whose bytes are gone is its own sentence and a
   * 410, because one of them is uploaded and the other is reported.
   */
  router.get('/me/photo', async (req, res, next) => {
    try {
      const row = await photoRow(req.auth.userId);
      if (!row) return res.status(404).json({ message: REFUSALS.photoNotFound });

      const bytes = await readPhoto(row.image_path);
      if (!bytes) return res.status(410).json({ message: REFUSALS.photoFileMissing });

      // The kind is read off the bytes again rather than stored beside the path:
      // `user_image` has two columns and 0004 argues against adding a third for
      // something derivable, and the alternative — believing an extension — is
      // the habit this ticket exists to break. A row whose file has been
      // replaced on disk by something else is served as what it now is.
      const kind = imageKind(bytes);
      if (!kind) return res.status(410).json({ message: REFUSALS.photoFileMissing });

      res.setHeader('Content-Type', kind.mime);
      res.setHeader('Content-Length', bytes.length);
      // `nosniff` for `evidence.js`' reason: a file that is a valid PNG *and*
      // something else is served as what the header says and not as what the
      // browser guesses.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // `no-store` because the URL never changes. Migration 0004 deliberately
      // has no `updated_at` to hang a version on, so a cached photo would be the
      // old face at the same address after a replacement, for as long as the
      // browser felt like it.
      res.setHeader('Cache-Control', 'no-store');
      res.send(bytes);
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Set or replace the caller's own photo — #47.
   *
   * The whole of the delivered handler was: no type check, a name built from
   * the user id and the clock, and an unlink of the previous file that was the
   * one thing it got right. That unlink is kept and put under test rather than
   * rebuilt; everything else here is the two defects.
   *
   * The order is the order it has to be in. The bytes are judged before
   * anything is written, the new file is written before the row is pointed at
   * it, and the old file is deleted last — after the row no longer names it. The
   * other orders each lose something a person cannot get back: a row pointing at
   * a file that was never written draws a broken image for ever, and a file
   * deleted before the row is updated is a face that vanishes if the UPDATE
   * fails.
   */
  router.post('/me/photo', acceptPhoto, async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: REFUSALS.photoNoFile });

      const kind = imageKind(req.file.buffer);
      if (!kind) return res.status(400).json({ message: REFUSALS.photoNotImage });

      const previous = await photoRow(req.auth.userId);
      const stored = await storePhoto(req.file.buffer, kind);
      try {
        await pool.query(
          `INSERT INTO user_image (user_id, image_path) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET image_path = EXCLUDED.image_path`,
          [req.auth.userId, stored],
        );
      } catch (error) {
        // The one order that does lose something: bytes on disk that no row
        // will ever name, invisible to every route here and to the delete this
        // ticket cannot write. The file goes back before the fault is reported,
        // and the previous photo is left exactly where the unchanged row says
        // it is.
        await removePhoto(stored);
        throw error;
      }
      // The conflict clause is migration 0004's own: the table is keyed on
      // `user_id` precisely so that a second upload replaces the photo rather
      // than adding one, and this is the statement it was keyed for.
      if (previous && previous.image_path !== stored) await removePhoto(previous.image_path);

      return res.status(200).json({ message: 'บันทึกรูปโปรไฟล์เรียบร้อยแล้ว' });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The shell's heartbeat - #99. Sent while somebody is typing or clicking,
   * at most once every five minutes (`AuthContext.js`), because typing is
   * work the server otherwise never hears about until the save.
   *
   * It does nothing, and that is the whole design: `requireSession` in front
   * of it renews a token with under ten minutes left, exactly as it does for
   * every other request, and a heartbeat is not given a stronger renewal than
   * a save. See ADR-0005 for why not, and for why five and ten.
   */
  router.post('/me/activity', (req, res) => res.status(204).end());

  return router;
}

module.exports = { meRoutes };

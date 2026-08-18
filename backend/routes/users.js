'use strict';

/**
 * User accounts — the first slice of #11, pulled forward into #10.
 *
 * #10's eighth criterion asks for proof that hiding a menu entry is not the
 * only thing stopping a role reaching it, and the entry it is about is the
 * Central Admin's user-management one. Proving that needs the route to exist,
 * so the list behind the menu entry is built here and the rest of #11 - the
 * creating, editing and granting - is left to #11.
 *
 * `requireRole('FULL_ADMIN')` and nothing else. Managing accounts is the
 * Central Admin's whole remit and no other role has any part of it, so the
 * question of which records they reach does not arise and `requireScope` is
 * not what is missing here.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');

function userRoutes(pool) {
  const router = express.Router();

  // The columns are listed rather than taken with `*`, so a column added to
  // the table later - a password reset token, a note - is not published by
  // accident. `password` is the one that matters and it is not here.
  router.get('/users', requireRole('FULL_ADMIN'), async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT u.user_id, u.email, u.status, u.is_verified,
                u.title_th, u.first_name_th, u.last_name_th,
                u.title_en, u.first_name_en, u.last_name_en,
                u.department_id, u.program_id
         FROM users u
         ORDER BY u.email ASC`,
      );
      return res.status(200).json({ users: rows });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { userRoutes };

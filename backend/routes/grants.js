'use strict';

/**
 * Role grants — ticket #12.
 *
 * #11 made the *first* grant, with the account, because an account holding no
 * grant is refused at sign-in by name. This is every grant after it: an
 * administrator opens a person and manages the list of roles they hold, each
 * one confined to a Faculty, a Department or a Programme.
 *
 * The rule the ticket puts first is that a grant may never exceed the
 * granter's own scope, and that this is checked on the server rather than by
 * filtering the dropdown. Both halves matter, and they are answered by two
 * different things here. `assignable` - shared with #11's create and import
 * paths rather than written again, because ADR-0002 as amended by #11 says a
 * route that adds a grant without those checks is the hole the decision exists
 * to close, reopened from the side - is the check. `GET /users/grantable` is
 * the dropdown, and it exists so the interface can be *honest*, not so it can
 * be the guard: every refusal below answers a request that never went near it.
 *
 * A revoke is `is_active = false` rather than a delete, for two reasons. The
 * row carries who granted it and when, which the seventh criterion asks for
 * and which a delete would take with it; and the triple is the primary key, so
 * a grant given back is the same row revived rather than a second one.
 *
 * Mounted before the user routes in app.js, because `/users/grantable` would
 * otherwise be read as a user identifier by `/users/:userId`.
 */

const express = require('express');

const { onUser, recordActivity } = require('../auth/accounts');
const { ADMIN_ROLES, administration } = require('../auth/administration');
const { GLOBAL_SCOPE, requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');

/** What a grant is, as this file reads it out. */
const HELD = `SELECT ur.role_id, r.role_name, ur.scope_id,
                     ur.assigned_by, ur.assigned_at
                FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id
               WHERE ur.user_id = $1 AND ur.is_active AND r.is_active
               ORDER BY r.priority, ur.scope_id`;

function grantRoutes(pool) {
  const router = express.Router();
  const { reachOf, reachable, assignable } = administration(pool);

  const heldBy = async (userId) => (await pool.query(HELD, [userId])).rows;

  /**
   * What this administrator may offer, so the interface can show the truth
   * rather than a superset it will be refused for using.
   *
   * The scopes are exactly `coveredScopes` - the set the guard itself uses -
   * with a name attached for display, and the roles are those no more senior
   * than the acting grant. The Central Admin's reach is null, which is "all of
   * it", and is the one caller offered the global grant.
   */
  router.get('/users/grantable', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const { scopes, priority } = await reachOf(req);

      const roles = await pool.query(
        `SELECT role_id, role_name, priority FROM roles
          WHERE is_active AND priority >= $1 ORDER BY priority`,
        [priority],
      );

      const { rows: offered } = await pool.query(
        `SELECT faculty_id AS scope_id, faculty_name_th AS label, 'faculty' AS kind, 1 AS rank
           FROM faculty WHERE is_active AND ($1::text[] IS NULL OR faculty_id = ANY($1))
          UNION ALL
         SELECT department_id, department_name_th, 'department', 2
           FROM departments WHERE is_active AND ($1::text[] IS NULL OR department_id = ANY($1))
          UNION ALL
         SELECT program_id, program_name_th, 'program', 3
           FROM programs WHERE is_active AND ($1::text[] IS NULL OR program_id = ANY($1))
          ORDER BY rank, scope_id`,
        [scopes],
      );

      const global = { scope_id: GLOBAL_SCOPE, label: 'ทั้งมหาวิทยาลัย', kind: 'global' };
      const scopeList = offered.map(({ scope_id, label, kind }) => ({ scope_id, label, kind }));

      return res.status(200).json({
        roles: roles.rows,
        scopes: scopes === null ? [global, ...scopeList] : scopeList,
      });
    } catch (error) {
      return next(error);
    }
  });

  /** The grants an account holds, for an administrator who reaches it. */
  router.get('/users/:userId/roles', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const target = await reachable(req, req.params.userId);
      if (!target) return res.status(404).json({ message: REFUSALS.userNotFound });
      return res.status(200).json({ roles: await heldBy(target.user_id) });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Grant a role, at a scope.
   *
   * Three questions in order, and the order is what keeps the answers from
   * leaking. Is the body a grant at all; does this administrator reach the
   * account - answered 404 whether it is out of scope or does not exist, so
   * the route cannot be used to enumerate staff; and may they hand this grant
   * out. Only then is anything written.
   */
  router.post('/users/:userId/roles', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const roleId = req.body?.role_id;
      const scopeId = req.body?.scope_id;
      if (!roleId || !scopeId) return res.status(400).json({ message: REFUSALS.invalidUser });

      const target = await reachable(req, req.params.userId);
      if (!target) return res.status(404).json({ message: REFUSALS.userNotFound });

      const refusal = await assignable(req, roleId, scopeId);
      if (refusal) return res.status(403).json({ message: REFUSALS[refusal] });

      // The triple is the primary key and a revoke leaves the row in place, so
      // granting again is a revival: the same row, switched back on and
      // re-stamped with who did it this time. A plain insert would collide
      // with the revoked row and nobody could ever be given a role back.
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id, scope_id, assigned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, role_id, scope_id) DO UPDATE
            SET is_active = true, assigned_by = EXCLUDED.assigned_by, assigned_at = now()`,
        [target.user_id, roleId, scopeId, req.auth.userId],
      );
      await recordActivity(pool, req.auth.userId, 'GRANT_ROLE', onUser(target.user_id));

      return res.status(201).json({ roles: await heldBy(target.user_id) });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Revoke a grant.
   *
   * Switched off rather than deleted, so the record of who granted it survives
   * the revoke; `allRoles` filters on `is_active` and `attachRoles` re-reads it
   * on every request, so the person loses the access on their next one without
   * anything having to reach into their session.
   *
   * Nobody revokes their own grant. It is the rule #11 applies to deactivating
   * yourself and it is here for the same reason: an administrator who revoked
   * their last grant would be locked out by their next request, and whoever
   * could put it back is by construction somebody senior to them.
   */
  router.delete(
    '/users/:userId/roles/:roleId/:scopeId',
    requireRole(...ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const { userId, roleId, scopeId } = req.params;
        if (userId === req.auth.userId) {
          return res.status(403).json({ message: REFUSALS.forbidden });
        }

        const target = await reachable(req, userId);
        if (!target) return res.status(404).json({ message: REFUSALS.userNotFound });

        // The same scope rule the grant is made under. Reaching the person is
        // not the same as reaching the grant: an account in this
        // administrator's department can hold a role over another one, and
        // undoing that is the other department's business, not theirs.
        const { scopes } = await reachOf(req);
        if (scopes !== null && !scopes.includes(scopeId)) {
          return res.status(403).json({ message: REFUSALS.scopeNotYours });
        }

        const { rowCount } = await pool.query(
          `UPDATE user_roles SET is_active = false
            WHERE user_id = $1 AND role_id = $2 AND scope_id = $3 AND is_active`,
          [target.user_id, roleId, scopeId],
        );
        if (rowCount === 0) return res.status(404).json({ message: REFUSALS.roleNotHeld });

        await recordActivity(pool, req.auth.userId, 'REVOKE_ROLE', onUser(target.user_id));
        return res.status(200).json({ roles: await heldBy(target.user_id) });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { grantRoutes };

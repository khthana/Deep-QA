'use strict';

/**
 * What an acting administrator reaches, and what they may hand out.
 *
 * These four questions were written inside #11's user routes, where they were
 * the only caller. #12 adds a second - granting and revoking roles after the
 * account exists - and the rule that a grant may never exceed the granter's own
 * scope is the same rule in both places. Copied, it would be two rules that
 * happen to agree today; ADR-0002 is about there being one door, and a second
 * route that re-derives the check by hand is the hole reopened from the side.
 *
 * Everything here is a function of the database and `req.auth`, which
 * `attachRoles` re-reads on every request. Nothing consults a request body.
 *
 * The SQL fragments live here too, because `reachable` selects with them and
 * the routes RETURNING-clause the same list: they are the shape of a user row
 * as this system publishes it, not a detail of one route file.
 */

const { GLOBAL_SCOPE, coveredScopes } = require('./authorise');

/**
 * Who may manage accounts at all - #11's eighth criterion reads "an
 * administrator", plural, and the three administrator roles are what that
 * means. Everything below narrows it further by scope and by seniority.
 */
const ADMIN_ROLES = ['FULL_ADMIN', 'FACULTY_ADMIN', 'DEPT_ADMIN'];

/**
 * The columns of `users` this system publishes.
 *
 * `valid_from` and `valid_until` are cast to text because node-postgres reads
 * a `date` as local midnight and JSON.stringify then writes it as a UTC
 * instant - so in Bangkok every window this system published came back a day
 * early, and an assessor whose access ran to the 31st was told the 30th. A
 * calendar day has no timezone and should not acquire one crossing the wire.
 * Listed rather than taken with `*`,
 * so a column added to the table later - a reset token, a note - is not
 * published by accident. `password` is the one that matters and it is not here.
 */
const COLUMNS = `u.user_id, u.email, u.status, u.is_verified,
                 u.title_th, u.first_name_th, u.last_name_th,
                 u.title_en, u.first_name_en, u.last_name_en,
                 u.department_id, u.program_id,
                 u.valid_from::text AS valid_from, u.valid_until::text AS valid_until`;

/**
 * The same list without the alias, for a RETURNING clause, which names the row
 * it is writing and so has no table to qualify against.
 *
 * Derived rather than typed out a second time: the point of `COLUMNS` is that
 * a column added to `users` later is not published until somebody says so, and
 * a hand-copied duplicate is how the write path quietly starts publishing what
 * the read path does not.
 */
const RETURNED = COLUMNS.replace(/\bu\./g, '');

/**
 * The account's own place in the organisation: its programme if it sits in one,
 * its department otherwise.
 *
 * An account with neither - the Central Admin, who belongs to the university
 * rather than to a part of it - has no scope, and is therefore covered by no
 * scoped administrator and reachable only by the global grant. That is the
 * intended answer and not an oversight: a department administrator has no
 * business editing them.
 */
const OWN_SCOPE = `COALESCE(u.program_id, u.department_id)`;

/** The most senior grant the account holds, or nothing if it holds none. */
const SENIORITY = `(SELECT min(r.priority)
                      FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id
                     WHERE ur.user_id = u.user_id AND ur.is_active AND r.is_active)`;

/** The grants themselves, so the list can show what each account is. */
const GRANTS = `(SELECT COALESCE(json_agg(json_build_object(
                          'role_id', ur.role_id, 'scope_id', ur.scope_id)
                          ORDER BY r.priority, ur.scope_id), '[]'::json)
                   FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id
                  WHERE ur.user_id = u.user_id AND ur.is_active AND r.is_active)`;

/**
 * Where the answer to `reachOf` is parked for the rest of the request.
 *
 * A symbol rather than a plain property so nothing else on `req` can collide
 * with it, and it dies when the request object does. #11 asked the question
 * once per route and once per imported row - a walk of the organisation per
 * row of a spreadsheet; #12 asks it two or three times in a single grant. The
 * acting grant is fixed for the life of a request by `attachRoles`, so the
 * answer cannot go stale within one.
 */
const REACH = Symbol('reach');

function administration(pool) {
  /**
   * What the acting administrator reaches, read on every request from the
   * database and never from anything the caller sent.
   *
   * `scopes` of null is the global grant and means no filtering; an empty array
   * is a grant whose scope no part of the organisation claims, and reaches
   * nothing - the same answer `covers` gives an empty chain, for the same
   * reason.
   */
  const reachOf = async (req) => {
    if (!req[REACH]) {
      req[REACH] = (async () => ({
        scopes: await coveredScopes(pool, req.auth.acting.scope_id),
        priority: req.auth.acting.priority,
      }))();
    }
    return req[REACH];
  };

  /**
   * The account, if this administrator may touch it.
   *
   * Scope and seniority in one query, so "not yours" and "does not exist" come
   * back the same way. They are answered the same way too - 404, `userNotFound`
   * - because an administrator who could tell the two apart could enumerate the
   * university's staff by asking for identifiers and reading which answer came
   * back.
   */
  const reachable = async (req, userId) => {
    const { scopes, priority } = await reachOf(req);
    const { rows } = await pool.query(
      `SELECT ${COLUMNS}, ${SENIORITY} AS seniority
         FROM users u
        WHERE u.user_id = $1
          AND ($2::text[] IS NULL OR ${OWN_SCOPE} = ANY($2))
          AND COALESCE(${SENIORITY}, 99) >= $3`,
      [userId, scopes, priority],
    );
    return rows[0] ?? null;
  };

  /** Whether a scope identifier names something that exists and is live. */
  const known = async (scopeId) => {
    if (scopeId === GLOBAL_SCOPE) return true;
    const { rows } = await pool.query(
      `SELECT 1 FROM faculty WHERE faculty_id = $1 AND is_active
        UNION ALL
       SELECT 1 FROM departments WHERE department_id = $1 AND is_active
        UNION ALL
       SELECT 1 FROM programs WHERE program_id = $1 AND is_active`,
      [scopeId],
    );
    return rows.length > 0;
  };

  /**
   * Whether this administrator may hand out this grant.
   *
   * Two questions, and both have to be asked. A grant is assignable when its
   * role is no more senior than the administrator's own - otherwise a
   * department administrator promotes somebody to faculty administrator and
   * then, being junior to them, can no longer see what they did - and when its
   * scope is one the administrator reaches, so nobody grants a role over a
   * department that is not theirs.
   */
  const assignable = async (req, roleId, scopeId) => {
    const { scopes, priority } = await reachOf(req);
    const { rows } = await pool.query(
      `SELECT priority FROM roles WHERE role_id = $1 AND is_active`,
      [roleId],
    );
    if (!rows[0]) return 'roleNotAssignable';
    if (rows[0].priority < priority) return 'roleNotAssignable';
    if (!scopeId) return 'scopeUnknown';
    // A global grant is the Central Admin's own, and is handed out by them
    // alone: `coveredScopes` answers null for it, which no scoped administrator
    // ever gets back. Their reach is unbounded, but it is not unchecked -
    // `scope_id` is deliberately not a foreign key (CONTEXT.md), so a mistyped
    // one would otherwise write a live grant that `scopeChain` resolves to
    // nothing and that refuses the grantee everywhere. The account would hold a
    // role and gain no access, which is #12's second criterion failing while
    // answering 201.
    if (scopes === null) return (await known(scopeId)) ? null : 'scopeUnknown';
    if (!scopes.includes(scopeId)) return 'scopeNotYours';
    return null;
  };

  /**
   * Whether the account's own place in the organisation is one this
   * administrator reaches. Asked on create and on edit, because otherwise an
   * administrator could file a new account against another department and lose
   * sight of it the moment it was written.
   */
  const placeAllowed = async (req, departmentId, programId) => {
    const { scopes } = await reachOf(req);
    if (scopes === null) return true;
    const own = programId ?? departmentId;
    return Boolean(own) && scopes.includes(own);
  };

  return { reachOf, reachable, assignable, placeAllowed };
}

module.exports = {
  ADMIN_ROLES,
  COLUMNS,
  RETURNED,
  OWN_SCOPE,
  SENIORITY,
  GRANTS,
  administration,
};

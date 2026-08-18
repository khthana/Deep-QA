'use strict';

/**
 * What the caller is allowed to do — ticket #9, and the shape ADR-0002 asks
 * for: a middleware that loads the caller's active grants from the database on
 * every request, and two guards declared per route.
 *
 * The three pieces are separate on purpose. `attachRoles` answers "what does
 * this account hold", which is a fact about the account. `requireRole` answers
 * "is this account one of the kinds of account this endpoint is for", which is
 * a fact about the endpoint. `requireScope` answers "does what it holds reach
 * the record being asked for", which is a fact about the record. A route that
 * needs all three says so in its own declaration and nothing is implied.
 *
 * #10 adds a fourth idea on top of the three: the *acting* grant. An account
 * may hold several, and the guards consult exactly one of them - the one the
 * caller is currently working as. Holding a grant and acting as it are
 * different things, and the shell's role picker is only meaningful if they
 * are: switching role has to change what the server permits and not merely
 * what the sidebar draws. `req.auth.roles` is still every grant, because that
 * is what the picker renders; `req.auth.acting` is the one in effect.
 *
 * Nothing here reads a role or a scope from a request body or a query string.
 * `requireScope` is handed a function that produces the *record's* identifier -
 * a programme in the path, a subject the handler is about to load - and the
 * scope that record sits in is then resolved against the database. The
 * inherited controllers took `role_id` and `scope_id` from `req.body`, which is
 * the hole ADR-0002 exists to close.
 */

const { allRoles } = require('./accounts');
const { REFUSALS } = require('./refusals');

/**
 * `user_roles.scope_id` is NOT NULL, so a grant that is not limited to any one
 * part of the organisation has to say so with a value. FULL_ADMIN's scope is
 * the literal 'FULL_ADMIN' - the migration says as much - and this is the one
 * name for it on the read side.
 */
const GLOBAL_SCOPE = 'FULL_ADMIN';

const forbid = (res) => res.status(403).json({ message: REFUSALS.forbidden });

/**
 * The grant in effect: the selected one if it is still held, and otherwise the
 * most senior. `allRoles` orders by priority ascending, so `roles[0]` is the
 * most senior and is what a caller who has never chosen acts as.
 */
const actingFrom = (roles, selected) =>
  roles.find(
    (grant) => grant.role_id === selected?.role_id && grant.scope_id === selected?.scope_id,
  ) ?? roles[0];

/**
 * The caller's active grants, on `req.auth`, read fresh on every request.
 *
 * Fresh is the whole point, and the fifth acceptance criterion: revoking a
 * grant has to take effect on the very next request without the person signing
 * in again, which it can only do if nothing about the grant is carried in the
 * cookie. The query is `allRoles`, the same one sign-in admits on, so "an
 * active grant" has one definition and the two cannot come to disagree about
 * who holds what.
 *
 * An account whose last grant was revoked mid-session is refused here rather
 * than left to fail at whichever guard it happens to meet: it is the same
 * state sign-in refuses as `noRole`, is told so in the same words, and should
 * not depend on the route it happened to ask for.
 *
 * The acting grant is resolved here too, and resolved the same way: the
 * cookie's selection is matched against the rows just read, and a selection
 * matching none of them - never made, or made against a grant since revoked -
 * falls back to the most senior held. So the selection is a pointer and never
 * an authority, and the fifth criterion survives the addition intact: revoke
 * the grant being acted as, and the next request stops acting as it.
 */
function attachRoles(pool) {
  return async function attach(req, res, next) {
    const userId = req.session?.userId;
    if (!userId) {
      // A wiring mistake, not a caller's: attachRoles is mounted after
      // requireSession or not at all.
      return next(new Error('attachRoles requires requireSession ahead of it'));
    }

    try {
      const roles = await allRoles(pool, userId);
      // Told as `noRole` rather than as the flat refusal below, because it is
      // the one 403 the person can act on: there is nothing to ask for a
      // narrower permission about, the account holds nothing at all, and the
      // message says who to go to. It is the same thing sign-in says to the
      // same state.
      if (roles.length === 0) return res.status(403).json({ message: REFUSALS.noRole });

      req.auth = { userId, roles, acting: actingFrom(roles, req.session.acting) };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Refuses a caller holding none of the listed roles.
 *
 * This is what keeps the central administrator out of the curriculum. docs/06
 * makes their scope deliberately narrow - user accounts and permission grants
 * only, a separation of duties rather than an oversight - and the way that is
 * enforced is by curriculum routes not listing FULL_ADMIN, never by the scope
 * check below, which a global grant passes by design.
 */
function requireRole(...roleIds) {
  const allowed = new Set(roleIds);
  return function checkRole(req, res, next) {
    if (!req.auth) return next(new Error('requireRole requires attachRoles ahead of it'));
    // The acting grant, not the whole list. An account holding both a
    // committee grant and a teaching one is one or the other at any moment,
    // and an endpoint for teachers is not open to it while it is acting as
    // the committee.
    return allowed.has(req.auth.acting.role_id) ? next() : forbid(res);
  };
}

/**
 * The chain a scope sits in, from the scope itself outwards: a programme
 * resolves to itself, its department and its faculty; a department to itself
 * and its faculty; a faculty to itself.
 *
 * Resolved programme first, then department, then faculty, stopping at the
 * first table that knows the identifier - the same order the inherited
 * findScopeHierarchy uses, and the reason the seed gives the faculty the code
 * 'ENG' rather than a number: `scope_id` has no foreign key, it is polymorphic,
 * and two organisational units sharing a code would be indistinguishable here.
 * The order is asserted by a test, not only by this paragraph.
 *
 * An identifier no table knows resolves to an empty chain, which no grant
 * covers, so an unknown target is refused rather than waved through.
 */
async function scopeChain(pool, scopeId) {
  if (!scopeId) return [];

  const program = await pool.query(
    `SELECT p.program_id, p.department_id, d.faculty_id
     FROM programs p LEFT JOIN departments d ON d.department_id = p.department_id
     WHERE p.program_id = $1`,
    [scopeId],
  );
  if (program.rows[0]) {
    const { program_id, department_id, faculty_id } = program.rows[0];
    return [program_id, department_id, faculty_id].filter(Boolean);
  }

  const department = await pool.query(
    `SELECT department_id, faculty_id FROM departments WHERE department_id = $1`,
    [scopeId],
  );
  if (department.rows[0]) {
    const { department_id, faculty_id } = department.rows[0];
    return [department_id, faculty_id].filter(Boolean);
  }

  const faculty = await pool.query(`SELECT faculty_id FROM faculty WHERE faculty_id = $1`, [
    scopeId,
  ]);
  if (faculty.rows[0]) return [faculty.rows[0].faculty_id];

  return [];
}

/**
 * Whether the grant reaches this chain.
 *
 * The grant asked about is the acting one, for the same reason `requireRole`
 * consults it: what the caller may reach is what the hat they are wearing
 * reaches, not the union of every hat they own.
 *
 * A grant covers a record when its scope is the record's own scope or one the
 * record sits inside: the faculty administrator reaches every department and
 * every programme under the faculty, the department administrator reaches the
 * programmes under the department, and neither reaches sideways. A global grant
 * covers everything it is allowed to ask about at all - which endpoints those
 * are is `requireRole`'s question, above.
 *
 * An empty chain is covered by nobody, the global grant included, and is
 * checked before the grants rather than left to fall out of them. A chain comes
 * back empty when no part of the organisation claims the identifier - a target
 * that does not exist, or a route with a mistyped parameter handing over
 * `undefined` - and the routes that list FULL_ADMIN are exactly the ones where
 * a global grant would otherwise turn that mistake into a pass.
 */
const covers = (grant, chain) =>
  chain.length > 0 && (grant.scope_id === GLOBAL_SCOPE || chain.includes(grant.scope_id));

/**
 * Refuses a caller whose grants do not reach the record being asked for.
 *
 * `target` is a function of the request returning the record's scope
 * identifier - `(req) => req.params.programId` for a route that names a
 * programme - and may be async, for a route that has to load the record before
 * it knows which programme it belongs to. A target that comes back empty is
 * refused: a route that cannot say what it is about does not get a pass.
 *
 * The pool is a parameter, as it is for every router in the house: the routers
 * are handed one by createApp and pass it on, and nothing reaches for a
 * connection out of the ambient app.
 */
function requireScope(pool, target) {
  return async function checkScope(req, res, next) {
    if (!req.auth) return next(new Error('requireScope requires attachRoles ahead of it'));

    try {
      const scopeId = await target(req);
      const chain = await scopeChain(pool, scopeId);
      return covers(req.auth.acting, chain) ? next() : forbid(res);
    } catch (error) {
      return next(error);
    }
  };
}

// `scopeChain` and `covers` are deliberately not exported. They are how
// `requireScope` reaches its answer, and the rules they carry are asserted
// through it rather than at them: docs/06 allows the tests one seam.
module.exports = { GLOBAL_SCOPE, attachRoles, requireRole, requireScope };

'use strict';

/**
 * The departments and programmes an acting grant reaches — extracted at the
 * second copy, #16 for departments and #17 for programmes.
 *
 * #15 wrote two small queries about departments that are not about programmes
 * at all: the list a picker is drawn from, and the yes-or-no a write is checked
 * against. #16 needs both, word for word, and #17 onwards will need them again
 * - every screen a Faculty Admin and a Department Admin share asks the same two
 * questions of the same table.
 *
 * They are here rather than in `auth/authorise` because they are queries, not
 * guards: `coveredScopes` answers "what does this grant reach", and these two
 * turn that answer into departments. ADR-0002 is upheld in the same way it was
 * before - the reach comes from `req.auth.acting.scope_id`, which the session
 * put there from the database, and never from a request body.
 *
 * What is deliberately *not* here is the refusal key. `departmentNotYours`
 * names หลักสูตร and #16's names รายวิชา, and a helper that owned the message
 * would have to grow a parameter for every screen's spelling - `lib/importer`
 * declined the same thing for the same reason. These answer in facts and the
 * route says what the fact means.
 */

const { coveredScopes } = require('../auth/authorise');

/**
 * Every department in reach, retired ones included, each with its `is_active`.
 *
 * Retired ones come too because this is the screen's only way of turning a
 * department identifier into a name, and a record already filed under a retired
 * department still has to be nameable. Which of them may be *chosen* is the
 * form's decision, and whether one may be written into is
 * `departmentInReach`'s.
 *
 * Not paged: it is a dropdown, and a faculty has departments in the dozens.
 */
async function reachableDepartments(pool, scopeId) {
  const reach = await coveredScopes(pool, scopeId);
  const { rows } = await pool.query(
    `SELECT department_id, department_name_th, department_name_en, is_active
       FROM departments
      WHERE ($1::text[] IS NULL OR department_id = ANY($1))
      ORDER BY department_id ASC`,
    [reach],
  );
  return rows;
}

/**
 * Whether this grant may file a record under this department.
 *
 * A department that does not exist and a department in somebody else's faculty
 * answer the same `false`, because telling them apart would answer a question
 * the caller has no business asking.
 *
 * `mustBeActive` is what a *move into* a retired department is refused by. A
 * record already sitting in one stays editable, or retiring a department would
 * freeze everything beneath it - so the caller passes `false` when the
 * department is not changing.
 */
async function departmentInReach(pool, scopeId, departmentId, { mustBeActive = true } = {}) {
  if (!departmentId) return false;
  const reach = await coveredScopes(pool, scopeId);
  const { rows } = await pool.query(
    `SELECT department_id FROM departments
      WHERE department_id = $1
        AND ($2::text[] IS NULL OR department_id = ANY($2))
        AND ($3::boolean IS NOT TRUE OR is_active)`,
    [departmentId, reach, mustBeActive],
  );
  return Boolean(rows[0]);
}

/**
 * Every programme in reach, retired ones included, each with its `is_active`.
 *
 * `reachableDepartments`' twin, extracted at its second copy for the same
 * reason: #18 drew this list for the committee member's filter and #17 draws it
 * again for the register's, and the two queries were the same query. The
 * `department_id` comes back with the row because #17 files a student under the
 * department its หลักสูตร already belongs to rather than asking anybody to
 * retype it.
 *
 * Retired ones come too, and not paged, for `reachableDepartments`' reasons.
 */
async function reachablePrograms(pool, scopeId) {
  const reach = await coveredScopes(pool, scopeId);
  const { rows } = await pool.query(
    `SELECT program_id, program_name_th, program_name_en, department_id, is_active
       FROM programs
      WHERE ($1::text[] IS NULL OR program_id = ANY($1))
      ORDER BY program_id ASC`,
    [reach],
  );
  return rows;
}

/**
 * The programme row this grant may file a record under, or null.
 *
 * `departmentInReach`'s twin, and it answers with the row rather than a boolean
 * because every caller so far has wanted the `department_id` off it - the
 * yes-or-no is `Boolean()` away and the second query is not.
 *
 * A programme that does not exist, one in another department and one that has
 * been retired all answer the same null: telling them apart would turn this
 * into a way of listing other departments' หลักสูตร.
 */
async function programInReach(pool, scopeId, programId) {
  if (!programId) return null;
  const reach = await coveredScopes(pool, scopeId);
  const { rows } = await pool.query(
    `SELECT program_id, department_id FROM programs
      WHERE program_id = $1 AND is_active
        AND ($2::text[] IS NULL OR program_id = ANY($2))`,
    [programId, reach],
  );
  return rows[0] || null;
}

module.exports = {
  reachableDepartments,
  departmentInReach,
  reachablePrograms,
  programInReach,
};

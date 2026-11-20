'use strict';

/**
 * What a grant's `scope_id` is called, and which tier it is - #231, #294.
 *
 * #231 wrote this resolver into `allRoles` for the role picker. #294 needed the
 * same answer in two more reads - the grants an administrator opens
 * (`GET /users/:userId/roles`) and the grants on the accounts list - because
 * the owner answered on 20 November 2569 that those screens name a scope rather
 * than draw its code, including a scope outside the reader's own reach, which
 * until then they could only draw as a bare code (#215). Three reads asking one
 * question get one answer, here, rather than three copies of a `CASE` that can
 * drift apart (#97).
 *
 * **The precedence is `scopeChain`'s**, programme then department then faculty,
 * stopping at the first that answers. `scope_id` carries no foreign key
 * (`CONTEXT.md`) and one value can be a department's id and a programme's at
 * once; a resolver walking the other way would name a tier the guard disagrees
 * with. **Both columns are read off the row the walk stopped at**, which is why
 * the name is a `CASE` and not a `COALESCE`: the name columns are nullable, and
 * a `COALESCE` would fall through a nameless programme to the department
 * sharing its id. A tier with no name answers `null` and the screen keeps the
 * code, which is all that is true about it. `accounts.js` §`allRoles` tells the
 * whole of it; `shell.test.js` builds the collision.
 *
 * The three aliases `p`, `d` and `f` are part of the contract: a caller puts
 * `SCOPE_JOINS(<its scope column>)` in its `FROM` and reads the two
 * expressions in its select list.
 */
const SCOPE_NAME = `CASE WHEN p.program_id IS NOT NULL THEN p.program_name_th
                 WHEN d.department_id IS NOT NULL THEN d.department_name_th
                 WHEN f.faculty_id IS NOT NULL THEN f.faculty_name_th
                 END`;

const SCOPE_KIND = `CASE WHEN p.program_id IS NOT NULL THEN 'program'
                 WHEN d.department_id IS NOT NULL THEN 'department'
                 WHEN f.faculty_id IS NOT NULL THEN 'faculty'
                 END`;

const SCOPE_JOINS = (column) =>
  `LEFT JOIN programs p ON p.program_id = ${column}
     LEFT JOIN departments d ON d.department_id = ${column}
     LEFT JOIN faculty f ON f.faculty_id = ${column}`;

module.exports = { SCOPE_NAME, SCOPE_KIND, SCOPE_JOINS };

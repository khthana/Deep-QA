'use strict';

/**
 * Departments — ticket #14.
 *
 * ภาควิชา: the layer between a faculty and the programmes and subjects it
 * owns. Small as a table - an id, two names, its faculty, whether it is in use
 * - and load-bearing as a structure, because a department identifier is what a
 * grant is scoped to, what an account is placed in, and what a programme hangs
 * from. Which is why the destructive route below is the careful one.
 *
 * Three things run through the file.
 *
 * *Whose faculty.* A faculty administrator maintains the departments of their
 * own faculty and no other. The faculty is never read from the request body:
 * it is derived from the acting grant, and a body naming a different one is
 * refused rather than honoured (ADR-0002). The Central Admin acts globally and
 * has no faculty of their own, so for them - and only them - the faculty is a
 * field on the form, checked against the table.
 *
 * *Removal is not deletion when something depends on the record.* Four tables
 * reference `departments` ON DELETE RESTRICT, and the third criterion says a
 * department a programme uses cannot be silently destroyed. It is not silently
 * anything: the DELETE is attempted, PostgreSQL refuses it with 23503, and the
 * caller is told in words what depends on it and what to do instead. Attempting
 * and catching rather than counting first is deliberate - a hand-written list
 * of the four referencing tables is a list that goes stale the next time
 * somebody adds a fifth, and the answer would silently become a 500.
 *
 * *A department is retired by switching it off.* `is_active` is what a faculty
 * has for a department that no longer takes students but whose programmes,
 * subjects and graded work must stay readable. Nothing in the authorisation
 * path reads it - `coveredScopes` and `scopeChain` join on the identifier
 * alone - so switching a department off is a change to the data and not a
 * silent revocation of every grant scoped to it.
 *
 * The import here is the first use of `lib/importer`, which #14 asks be
 * extracted rather than invented again on each of the ten screens that follow.
 * `routes/users.js` was moved onto the same module in the same change, so the
 * claim that it is shared is carried by #11's suite and not only by this one.
 */

const express = require('express');

const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, isDuplicate, isReferenced } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');

/**
 * The one role that maintains departments.
 *
 * CONTEXT.md names it exactly: the Faculty Admin "owns master data and outcomes
 * within one Faculty" and is "the only role that may manage Departments".
 *
 * The two absences are both deliberate and both are enforced here rather than
 * in a menu. `DEPT_ADMIN` is the eighth criterion - a department administrator
 * is confined to one department "excluding Department records themselves", so
 * every route refuses them. `FULL_ADMIN` is absent because the Central Admin
 * "manages user accounts and permission grants system-wide, and nothing else",
 * and ADR-0002 says how that is kept true: curriculum routes do not list
 * `FULL_ADMIN` in `requireRole`. This is a curriculum route.
 */
const MAINTAINERS = ['FACULTY_ADMIN'];

/** What a department is, as this file reads it out. */
const RETURNED = 'department_id, department_name_th, department_name_en, faculty_id, is_active';

/** The template's columns, and the fields the import reads from a row. */
const IMPORT_COLUMNS = ['department_id', 'department_name_th', 'department_name_en'];

/**
 * One department's worth of fields, from a form or from a spreadsheet row.
 *
 * Read by the same function for both, for the reason #11 gives: a rule the form
 * enforces and the import does not is a rule with a way around it, and the
 * import is how a faculty puts twenty departments in at once.
 *
 * The identifier is required and is a natural key - `'05'` is what the
 * university calls Computer Engineering, not a number this system invented
 * (ADR-0001, tier one) - so it is neither generated nor editable afterwards.
 * The Thai name is required because it is what every screen displays; the
 * English one is optional, as the column is.
 */
function readDepartment(source, { editing = false } = {}) {
  const values = {
    department_id: blankToNull(source.department_id),
    department_name_th: blankToNull(source.department_name_th),
    department_name_en: blankToNull(source.department_name_en),
  };

  if (!editing && !values.department_id) return { ok: false, reason: 'invalidDepartment' };
  if (values.department_id && values.department_id.length > 10) {
    return { ok: false, reason: 'invalidDepartment' };
  }
  if (!values.department_name_th) return { ok: false, reason: 'invalidDepartment' };
  if (values.department_name_th.length > 200) return { ok: false, reason: 'invalidDepartment' };
  if (values.department_name_en && values.department_name_en.length > 200) {
    return { ok: false, reason: 'invalidDepartment' };
  }

  return { ok: true, values };
}

function departmentRoutes(pool) {
  const router = express.Router();

  /**
   * The faculty this request may work in, derived rather than trusted.
   *
   * A faculty administrator's acting grant is scoped to their faculty, and that
   * identifier *is* the answer - so a `faculty_id` in the body is either the
   * same one, in which case it added nothing, or a different one, in which case
   * honouring it would let a faculty administrator create departments in
   * somebody else's faculty by editing a form field. It is refused (ADR-0002).
   *
   * Because the only role that reaches this file is scoped to a faculty, there
   * is no request here whose faculty has to come from the body - which is why
   * neither the form nor the import template has a column for it.
   */
  async function facultyFor(req, given) {
    const wanted = blankToNull(given);
    const { rows } = await pool.query('SELECT faculty_id FROM faculty WHERE faculty_id = $1', [
      req.auth.acting.scope_id,
    ]);
    // A FACULTY_ADMIN grant scoped to something that is not a faculty is a
    // misconfigured grant rather than a request to refuse in particular; it
    // reaches no faculty, so it maintains no departments.
    if (!rows[0]) return { ok: false, reason: 'facultyNotYours' };
    if (wanted && wanted !== rows[0].faculty_id) return { ok: false, reason: 'facultyNotYours' };
    return { ok: true, facultyId: rows[0].faculty_id };
  }

  /**
   * The department, if this grant reaches it.
   *
   * `coveredScopes` is the same reach the list filters on, so a department the
   * list did not show cannot be edited by asking for it directly - and the
   * answer for out-of-scope is the same 404 as for nonexistent, so the route
   * cannot be used to find out which departments other faculties have.
   */
  async function reachable(req, departmentId) {
    const reach = await coveredScopes(pool, req.auth.acting.scope_id);
    const { rows } = await pool.query(
      `SELECT ${RETURNED} FROM departments
        WHERE department_id = $1 AND ($2::text[] IS NULL OR department_id = ANY($2))`,
      [departmentId, reach],
    );
    return rows[0] ?? null;
  }

  /**
   * The list — the fourth criterion. Paged on the server, ten to a page, with
   * the total, because a client counting the rows it received cannot work out
   * how many there are.
   */
  router.get('/departments', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { page, perPage, offset } = pageOf(req);

      const counted = await pool.query(
        `SELECT count(*)::int AS total FROM departments
          WHERE ($1::text[] IS NULL OR department_id = ANY($1))`,
        [reach],
      );
      const { rows } = await pool.query(
        `SELECT ${RETURNED} FROM departments
          WHERE ($1::text[] IS NULL OR department_id = ANY($1))
          ORDER BY department_id ASC
          LIMIT $2 OFFSET $3`,
        [reach, perPage, offset],
      );

      return res.status(200).json({
        departments: rows,
        total: counted.rows[0].total,
        page,
        per_page: perPage,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The template — the fifth criterion. Declared before `/departments/:id`
   * because Express matches in order and the parameter would otherwise swallow
   * the word.
   *
   * Its columns are exactly what the import reads, which is what "matches what
   * the importer accepts" means: `IMPORT_COLUMNS` is the one list and both ends
   * are built from it. The faculty is not among them, because the server
   * derives it.
   */
  router.get('/departments/import-template', requireRole(...MAINTAINERS), (req, res) =>
    sendTemplate(res, 'departments-template.csv', IMPORT_COLUMNS, {
      department_id: '07',
      department_name_th: 'วิศวกรรมเคมี',
      department_name_en: 'Chemical Engineering',
    }),
  );

  /**
   * The sixth and seventh criteria: every row, or none of them.
   *
   * The mechanism is `lib/importer` and is shared with accounts. What is here
   * is what is about departments: how a row is read, that the identifier must
   * not repeat within the file, and what writing one means.
   */
  router.post('/departments/import', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const faculty = await facultyFor(req, null);
      if (!faculty.ok) return res.status(403).json({ message: REFUSALS[faculty.reason] });

      const result = await importRows(pool, req.body, {
        readRow: (record) => {
          const draft = readDepartment(record);
          return draft.ok ? { ok: true, draft: draft.values } : draft;
        },
        keys: [{ of: (v) => v.department_id, message: REFUSALS.duplicateDepartmentId }],
        insert: async (client, values) => {
          try {
            const { rows } = await client.query(
              `INSERT INTO departments
                 (department_id, department_name_th, department_name_en, faculty_id)
               VALUES ($1, $2, $3, $4) RETURNING ${RETURNED}`,
              [
                values.department_id,
                values.department_name_th,
                values.department_name_en,
                faculty.facultyId,
              ],
            );
            return { ok: true, row: rows[0] };
          } catch (error) {
            if (isDuplicate(error)) return { ok: false, reason: 'duplicateDepartmentId' };
            throw error;
          }
        },
      });

      return sendImport(res, result, 'departments');
    } catch (error) {
      return next(error);
    }
  });

  /** One department, for the edit form. */
  router.get('/departments/:departmentId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const department = await reachable(req, req.params.departmentId);
      if (!department) return res.status(404).json({ message: REFUSALS.departmentNotFound });
      return res.status(200).json({ department });
    } catch (error) {
      return next(error);
    }
  });

  /** Adding one — the first criterion. */
  router.post('/departments', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readDepartment(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const faculty = await facultyFor(req, req.body?.faculty_id);
      if (!faculty.ok) return res.status(403).json({ message: REFUSALS[faculty.reason] });

      const { rows } = await pool.query(
        `INSERT INTO departments
           (department_id, department_name_th, department_name_en, faculty_id, is_active)
         VALUES ($1, $2, $3, $4, coalesce($5, true)) RETURNING ${RETURNED}`,
        [
          draft.values.department_id,
          draft.values.department_name_th,
          draft.values.department_name_en,
          faculty.facultyId,
          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,
        ],
      );

      return res.status(201).json({ department: rows[0] });
    } catch (error) {
      if (isDuplicate(error)) {
        return res.status(409).json({ message: REFUSALS.duplicateDepartmentId });
      }
      return next(error);
    }
  });

  /**
   * Editing one — the first criterion's middle verb.
   *
   * The identifier is not among the fields that can change. It is a natural key
   * that four tables reference, and "renaming" it would mean rewriting every
   * account, programme, subject and student that points at it - which is a
   * migration, not an edit on a form.
   */
  router.put('/departments/:departmentId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.departmentId);
      if (!existing) return res.status(404).json({ message: REFUSALS.departmentNotFound });

      const draft = readDepartment(req.body ?? {}, { editing: true });
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const { rows } = await pool.query(
        `UPDATE departments
            SET department_name_th = $2,
                department_name_en = $3,
                is_active = coalesce($4, is_active)
          WHERE department_id = $1
          RETURNING ${RETURNED}`,
        [
          existing.department_id,
          draft.values.department_name_th,
          draft.values.department_name_en,
          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,
        ],
      );

      return res.status(200).json({ department: rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Removing one — the third criterion.
   *
   * A department nothing depends on is deleted. A department a programme, an
   * account, a subject or a student points at is refused, in words, with the
   * way round it: switch it off instead. What makes that complete is that the
   * database decides it. Every one of those references is ON DELETE RESTRICT,
   * so the refusal arrives as 23503 whether or not this file knows how many
   * tables there are - and the fifth one somebody adds is covered on the day it
   * is added rather than on the day this list is remembered.
   *
   * Asking the person to confirm first is the same criterion's other half and
   * is the screen's job: there is nothing for a server to confirm against, and
   * a request that arrived is a request that was meant.
   */
  router.delete(
    '/departments/:departmentId',
    requireRole(...MAINTAINERS),
    async (req, res, next) => {
      try {
        const existing = await reachable(req, req.params.departmentId);
        if (!existing) return res.status(404).json({ message: REFUSALS.departmentNotFound });

        await pool.query('DELETE FROM departments WHERE department_id = $1', [
          existing.department_id,
        ]);
        return res.status(204).send();
      } catch (error) {
        if (isReferenced(error)) {
          return res.status(409).json({ message: REFUSALS.departmentInUse });
        }
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { departmentRoutes };

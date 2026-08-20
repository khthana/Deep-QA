'use strict';

/**
 * Programmes — ticket #15.
 *
 * หลักสูตร: a degree curriculum owned by a department, identified by a code
 * such as `0501`. It is the thing PLOs hang off, the thing a Program Subject
 * names, the thing a student is enrolled in and the thing an Offering is
 * taught under - which is why five tables reference it, and why removing one
 * is the delicate route in this file.
 *
 * Three things run through it, and two of them differ from #14 in ways that
 * are easy to copy wrong.
 *
 * *Two roles, one reach.* The ticket names both: a Faculty Admin manages
 * programmes in any department of the faculty, a Department Admin only in
 * their own. What separates them is not the role list - both are on it - but
 * `coveredScopes`, which turns an acting grant into the set of identifiers it
 * reaches. A faculty grant reaches its departments and their programmes; a
 * department grant reaches its own. The second criterion and the third are
 * therefore the same line of SQL read twice. `FULL_ADMIN` is absent for
 * ADR-0002's stated reason: curriculum routes do not list it, and a programme
 * is curriculum.
 *
 * *The department is named by the body, and that is not a body deciding
 * authority.* A programme has to be filed under some department and only the
 * caller knows which, so `department_id` arrives on the request - and is then
 * checked against the reach loaded from the database before anything is
 * written. The distinction ADR-0002 draws is between authority derived from
 * the body, which never happens, and a target named by it, which is verified.
 * Editing checks both ends: the programme as it stands must be reachable, and
 * so must the department it is being moved to, or a move would be a way of
 * pushing a record out of one's own reach - or of adopting somebody else's.
 *
 * *Removal deactivates when something depends on the record.* #14 refused the
 * delete and said so; the fourth criterion here says the opposite - a
 * programme that is referenced "becomes inactive instead of being deleted". So
 * the DELETE is attempted, and when PostgreSQL answers 23503 the row is
 * switched off and the caller is told which of the two happened. Attempting
 * and catching rather than counting the five referencing tables first is
 * #14's reasoning unchanged: a hand-written list goes stale on the sixth.
 *
 * Nothing cascades and nothing is rewritten, which is the fifth criterion: an
 * inactive programme's PLOs, Program Subjects, students and Offerings are all
 * still there and still readable, and the authorisation path joins on the
 * identifier alone, so switching a programme off is a change to the data and
 * not a silent revocation of the grants scoped to it.
 */

const express = require('express');

const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, isDuplicate } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');
const { departmentInReach, reachableDepartments } = require('../lib/reach');
const { deleteOrDeactivate } = require('../lib/removal');

/**
 * The roles that maintain programmes.
 *
 * Both of the ticket's administrators are here, and the confinement of the
 * second is not. CONTEXT.md gives the Faculty Admin "master data and outcomes
 * within one Faculty" and the Department Admin the same "confined to one
 * Department" - and a role list can only say who, not where. Where is
 * `coveredScopes`, below, on every route.
 *
 * `PROG_MANAGER` is absent: the Curriculum Committee "owns one Program" - its
 * PLOs, its Program Subjects, its Offerings - which is work inside a programme
 * and not the creating and retiring of programmes themselves.
 */
const MAINTAINERS = ['FACULTY_ADMIN', 'DEPT_ADMIN'];

/** What a programme is, as this file reads it out. */
const RETURNED = 'program_id, program_name_th, program_name_en, department_id, year, is_active';

/** The template's columns, and the fields the import reads from a row. */
const IMPORT_COLUMNS = [
  'program_id',
  'program_name_th',
  'program_name_en',
  'department_id',
  'year',
];

/**
 * One programme's worth of fields, from a form or from a spreadsheet row.
 *
 * The same function for both, for #11's reason: a rule the form enforces and
 * the import does not is a rule with a way around it.
 *
 * The identifier is a natural key - `0501` is what the university calls the
 * Computer Engineering programme (ADR-0001, tier one) - so it is neither
 * generated nor editable afterwards. The Thai name is required because it is
 * what every screen displays; the English one is optional, as the column is.
 * `year` is the Buddhist-era year of the curriculum revision, four digits,
 * kept as the text the registrar writes rather than converted to anything.
 */
function readProgram(source, { editing = false } = {}) {
  const values = {
    program_id: blankToNull(source.program_id),
    program_name_th: blankToNull(source.program_name_th),
    program_name_en: blankToNull(source.program_name_en),
    department_id: blankToNull(source.department_id),
    year: blankToNull(source.year),
  };

  if (!editing && !values.program_id) return { ok: false, reason: 'invalidProgram' };
  if (values.program_id && values.program_id.length > 10) {
    return { ok: false, reason: 'invalidProgram' };
  }
  if (!values.program_name_th) return { ok: false, reason: 'invalidProgram' };
  if (values.program_name_th.length > 200) return { ok: false, reason: 'invalidProgram' };
  if (values.program_name_en && values.program_name_en.length > 200) {
    return { ok: false, reason: 'invalidProgram' };
  }
  // A department is what a programme is owned by, so it is required when one is
  // created; on an edit an absent column means "leave it where it is".
  if (!editing && !values.department_id) return { ok: false, reason: 'invalidProgram' };
  if (values.year && !/^\d{4}$/.test(values.year)) return { ok: false, reason: 'invalidProgram' };

  return { ok: true, values };
}

function programRoutes(pool) {
  const router = express.Router();

  /**
   * The department this request may file a programme under.
   *
   * Named by the body and checked here against the reach derived from the
   * acting grant, which is the shape ADR-0002 permits. A department that does
   * not exist and a department in somebody else's faculty answer the same,
   * because telling them apart would answer a question the caller has no
   * business asking.
   *
   * Returns a REFUSALS key or null, which is also `importRows`'s `verify`
   * contract - so the same check covers the typed row and the imported one.
   * The question itself is `lib/reach`, shared with #16; what a `false` means
   * is this file's, because the sentence names หลักสูตร.
   */
  async function departmentRefusal(req, departmentId, { mustBeActive = true } = {}) {
    if (!departmentId) return 'invalidProgram';
    const held = await departmentInReach(pool, req.auth.acting.scope_id, departmentId, {
      mustBeActive,
    });
    return held ? null : 'departmentNotYours';
  }

  /**
   * The programme, if this grant reaches it.
   *
   * The same reach the list filters on, so a programme the list did not show
   * cannot be edited by asking for it directly - and out-of-scope answers the
   * same 404 as nonexistent, which is the third criterion enforced at the
   * server rather than in a menu.
   */
  async function reachable(req, programId) {
    const reach = await coveredScopes(pool, req.auth.acting.scope_id);
    const { rows } = await pool.query(
      `SELECT ${RETURNED} FROM programs
        WHERE program_id = $1 AND ($2::text[] IS NULL OR department_id = ANY($2))`,
      [programId, reach],
    );
    return rows[0] ?? null;
  }

  /**
   * The list — the eighth criterion, paged ten to a page with the total.
   *
   * It shows inactive programmes as well as active ones, deliberately: this is
   * the screen a programme is switched back on from, and a management list that
   * hid them would make the fourth criterion a one-way door. `?active=1` is
   * what that criterion's other half - "stops appearing in selection lists" -
   * is served by, for the screens that ask a person to *pick* a programme.
   * Those screens are #17 onwards and do not exist yet, which is recorded in
   * docs/acceptance/15.
   */
  router.get('/programs', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { page, perPage, offset } = pageOf(req);
      const activeOnly = ['1', 'true'].includes(String(req.query.active));

      const where = `WHERE ($1::text[] IS NULL OR department_id = ANY($1))
                       AND ($2::boolean IS NOT TRUE OR is_active)`;

      const counted = await pool.query(`SELECT count(*)::int AS total FROM programs ${where}`, [
        reach,
        activeOnly,
      ]);
      const { rows } = await pool.query(
        `SELECT ${RETURNED} FROM programs ${where}
          ORDER BY program_id ASC
          LIMIT $3 OFFSET $4`,
        [reach, activeOnly, perPage, offset],
      );

      return res.status(200).json({
        programs: rows,
        total: counted.rows[0].total,
        page,
        per_page: perPage,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The departments this caller reaches — what the form's picker is drawn from,
   * and the first criterion's "a chosen Department" made choosable. It is the
   * screen's only way of turning a department identifier into a name, so it
   * reports every department in reach and lets the form decide which of them
   * may be chosen.
   *
   * It lives here rather than being read from `/departments` because that
   * screen belongs to the faculty administrator alone (#14, CONTEXT.md), and a
   * department administrator who legitimately reaches this screen would be
   * refused by it. Same reach as everything else in this file, so what the
   * picker offers is exactly what `departmentRefusal` will accept - a form
   * cannot be made to name a department the server would then turn down.
   *
   * Retired departments are reported rather than hidden, each with its
   * `is_active`. The fourth criterion's "stops appearing in selection lists" is
   * about the selection list, and the selection list is the form: hiding a
   * retired department here would also empty the picker of the programmes
   * already filed under it and blank the department column on the list, so the
   * screen would be unable to name where a programme lives. The form offers a
   * retired department only as the one a programme is already under, and
   * `departmentRefusal` still turns down a create or a move into it.
   *
   * Not paged: it is a dropdown, and a faculty has departments in the dozens.
   */
  router.get('/programs/departments', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const departments = await reachableDepartments(pool, req.auth.acting.scope_id);
      return res.status(200).json({ departments });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The template — the seventh criterion. Declared before `/programs/:id`
   * because Express matches in order and the parameter would otherwise swallow
   * the word.
   *
   * `department_id` *is* among its columns, unlike #14's, and for the reason
   * given at the top of the file: a faculty administrator importing twenty
   * programmes is importing them into several departments, and only the
   * spreadsheet knows which.
   */
  router.get('/programs/import-template', requireRole(...MAINTAINERS), (req, res) =>
    sendTemplate(res, 'programs-template.csv', IMPORT_COLUMNS, {
      program_id: '0505',
      program_name_th: 'วิศวกรรมสารสนเทศ',
      program_name_en: 'Information Engineering',
      department_id: '05',
      year: '2565',
    }),
  );

  /**
   * The import — the seventh criterion: every row, or none of them.
   *
   * The mechanism is `lib/importer`, shared with accounts and departments. What
   * is here is what is about programmes: how a row is read, that the identifier
   * must not repeat within the file, that each row's department has to be one
   * this caller reaches, and what writing one means. The department check is
   * `verify` rather than something inside `insert` because a row naming a
   * department outside the caller's reach is a refusal about authority, and
   * belongs where the authority checks are.
   */
  router.post('/programs/import', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const result = await importRows(pool, req.body, {
        readRow: (record) => {
          const draft = readProgram(record);
          return draft.ok ? { ok: true, draft: draft.values } : draft;
        },
        keys: [{ of: (v) => v.program_id, message: REFUSALS.duplicateProgramId }],
        verify: (values) => departmentRefusal(req, values.department_id),
        insert: async (client, values) => {
          try {
            const { rows } = await client.query(
              `INSERT INTO programs
                 (program_id, program_name_th, program_name_en, department_id, year)
               VALUES ($1, $2, $3, $4, $5) RETURNING ${RETURNED}`,
              [
                values.program_id,
                values.program_name_th,
                values.program_name_en,
                values.department_id,
                values.year,
              ],
            );
            return { ok: true, row: rows[0] };
          } catch (error) {
            if (isDuplicate(error)) return { ok: false, reason: 'duplicateProgramId' };
            throw error;
          }
        },
      });

      return sendImport(res, result, 'programs');
    } catch (error) {
      return next(error);
    }
  });

  /** One programme, for the edit form. */
  router.get('/programs/:programId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const program = await reachable(req, req.params.programId);
      if (!program) return res.status(404).json({ message: REFUSALS.programNotFound });
      return res.status(200).json({ program });
    } catch (error) {
      return next(error);
    }
  });

  /** Adding one — the first criterion, under a department the caller reaches. */
  router.post('/programs', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readProgram(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const refusal = await departmentRefusal(req, draft.values.department_id);
      if (refusal) return res.status(403).json({ message: REFUSALS[refusal] });

      // `is_active` is deliberately not read here. A programme is created
      // because it is being offered; retiring one is what the fourth criterion
      // describes, and it happens on an edit or on a removal, not at birth.
      const { rows } = await pool.query(
        `INSERT INTO programs
           (program_id, program_name_th, program_name_en, department_id, year)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${RETURNED}`,
        [
          draft.values.program_id,
          draft.values.program_name_th,
          draft.values.program_name_en,
          draft.values.department_id,
          draft.values.year,
        ],
      );

      return res.status(201).json({ program: rows[0] });
    } catch (error) {
      if (isDuplicate(error)) {
        return res.status(409).json({ message: REFUSALS.duplicateProgramId });
      }
      return next(error);
    }
  });

  /**
   * Editing one — the first criterion's middle verb, and both ends of the
   * third.
   *
   * The identifier is not among the fields that can change: five tables
   * reference it, so "renaming" it is a migration and not an edit on a form.
   * The department can change, and that is why it is checked twice - the
   * programme as it stands has to be reachable, and so does the department it
   * is going to. Without the second check a department administrator could file
   * somebody else's programme under their own department, or push their own out
   * of their reach and lose it.
   *
   * The one field left alone when the request does not carry it is the
   * department: a programme has to be filed somewhere, and blanking that is not
   * something anybody meant by leaving a column out. Everything else replaces,
   * as a PUT's fields do - including the year, which the form has to be able to
   * clear. Reading an absent year as "leave it" would have made an emptied box
   * answer "บันทึกเรียบร้อย" and change nothing.
   */
  router.put('/programs/:programId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.programId);
      if (!existing) return res.status(404).json({ message: REFUSALS.programNotFound });

      const draft = readProgram(req.body ?? {}, { editing: true });
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      // A department that has since been retired may keep the programmes
      // already filed under it - otherwise retiring a department would freeze
      // its programmes, and switching one of them off would be impossible. It
      // is only a *move* into a retired department that is refused.
      const department = draft.values.department_id ?? existing.department_id;
      const refusal = await departmentRefusal(req, department, {
        mustBeActive: department !== existing.department_id,
      });
      if (refusal) return res.status(403).json({ message: REFUSALS[refusal] });

      const { rows } = await pool.query(
        `UPDATE programs
            SET program_name_th = $2,
                program_name_en = $3,
                department_id = $4,
                year = $5,
                is_active = coalesce($6, is_active),
                updated_at = now()
          WHERE program_id = $1
          RETURNING ${RETURNED}`,
        [
          existing.program_id,
          draft.values.program_name_th,
          draft.values.program_name_en,
          department,
          draft.values.year,
          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,
        ],
      );

      return res.status(200).json({ program: rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Removing one — the fourth criterion, which is not quite a removal.
   *
   * A programme nothing depends on is deleted and answers 204. A programme that
   * a Program Subject, a PLO, a student, a rubric or an account points at is
   * switched off instead and answers 200 with the row, so the screen can say
   * which of the two happened rather than guessing at it. The database is what
   * decides, through ON DELETE RESTRICT on all five - so the sixth reference
   * somebody adds is covered on the day it is added.
   *
   * Asking the person to confirm first is the sixth criterion and is the
   * screen's job: there is nothing for a server to confirm against, and a
   * request that arrived is a request that was meant.
   */
  router.delete('/programs/:programId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.programId);
      if (!existing) return res.status(404).json({ message: REFUSALS.programNotFound });

      // Delete it, or switch it off if something depends on it - `lib/removal`,
      // shared with #16 and #18, which is also where the reasoning for the
      // savepoint lives.
      const outcome = await deleteOrDeactivate(pool, {
        remove: (client) =>
          client.query('DELETE FROM programs WHERE program_id = $1', [existing.program_id]),
        deactivate: (client) =>
          client.query('UPDATE programs SET is_active = false, updated_at = now() WHERE program_id = $1', [
            existing.program_id,
          ]),
        load: async (client) => {
          const { rows } = await client.query(
            `SELECT ${RETURNED} FROM programs WHERE program_id = $1`,
            [existing.program_id],
          );
          return rows[0];
        },
      });

      if (outcome.deleted) return res.status(204).send();
      if (outcome.missing) return res.status(404).json({ message: REFUSALS.programNotFound });
      return res.status(200).json({ program: outcome.row, deactivated: true });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { programRoutes };

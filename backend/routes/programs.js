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
 * *One role, one department.* The ticket named two administrators; since #282
 * (the owner's answer of 18 พ.ย. 2569, "ผู้ดูแลระดับคณะ ... ให้ทำข้อมูลภาควิชา
 * อย่างเดียว") only the Department Admin maintains programmes, and holds one
 * department. `coveredScopes` still turns the acting grant into what it
 * reaches, so a programme in another department answers as though it were not
 * there. `FULL_ADMIN` is absent for ADR-0002's stated reason: curriculum routes
 * do not list it, and a programme is curriculum.
 *
 * *The department is the grant's, not the body's.* Until #282 a programme's
 * department arrived on the request and was checked against the reach; with one
 * department in reach there is nothing to name, so a programme is filed under
 * the department of the grant that records it (`req.auth.acting.scope_id`) and
 * a `department_id` in a body or a spreadsheet is not read at all - which is
 * ADR-0002's rule with the one exception it used to permit taken away. An edit
 * cannot move a programme either: `reachable` pins it to the grant's
 * department before the edit is read, and the edit writes no department.
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

const { onProgram, recordActivity } = require('../auth/accounts');
const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS, sentenceOf } = require('../auth/refusals');
const { blankToNull, isDuplicate } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');
const { holding, searchOf } = require('../lib/search');
const { departmentInReach } = require('../lib/reach');
const { deleteOrDeactivate } = require('../lib/removal');
const { revisionYearRefusal } = require('../lib/revisionYear');
const { forgetRevokedGrants, isGranted } = require('../lib/scopeGrants');

/**
 * The roles that maintain programmes.
 *
 * The Department Admin alone, since #282 (18 พ.ย. 2569): the owner took
 * programmes off the Faculty Admin, who keeps departments and accounts, and
 * CONTEXT.md says so. A role list can only say who, not where. Where is
 * `coveredScopes`, below, on every route.
 *
 * `PROG_MANAGER` is absent: the Curriculum Committee "owns one Program" - its
 * PLOs, its Program Subjects, its Offerings - which is work inside a programme
 * and not the creating and retiring of programmes themselves.
 */
const MAINTAINERS = ['DEPT_ADMIN'];

/** What a programme is, as this file reads it out. */
const RETURNED = 'program_id, program_name_th, program_name_en, department_id, revision_year, is_active';

/**
 * The template's columns, and the fields the import reads from a row. No
 * `department_id` since #282: the row lands in the grant's department, and an
 * old template that still carries the column imports with it ignored, because
 * `csv.js` keeps unknown headers and `readProgram` does not read it.
 */
const IMPORT_COLUMNS = ['program_id', 'program_name_th', 'program_name_en', 'revision_year'];

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
 * `revision_year` is the Buddhist-era year the curriculum was revised, four digits,
 * kept as the text the registrar writes rather than converted to anything - and
 * since #177 inside a plausible Buddhist-era range as well, which refuses a
 * value without converting one, so the sentence above still holds.
 */
function readProgram(source, { editing = false } = {}) {
  const values = {
    program_id: blankToNull(source.program_id),
    program_name_th: blankToNull(source.program_name_th),
    program_name_en: blankToNull(source.program_name_en),
    revision_year: blankToNull(source.revision_year),
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
  if (values.revision_year && !/^\d{4}$/.test(values.revision_year)) return { ok: false, reason: 'invalidProgram' };
  // #177, and asked second on purpose: `25` has no year in it to do arithmetic
  // with, so the shape gate keeps the generic sentence it has always answered
  // with and this one is reached by exactly the values that used to be stored
  // (#60). `reason` stays what it always was, so anything reading the key still
  // reads it; the `message` is carried alongside for the refusal that names the
  // year, which is how `sentenceOf` reaches a form, an edit and a CSV line.
  if (values.revision_year) {
    const refusal = revisionYearRefusal(Number(values.revision_year));
    if (refusal) return { ok: false, reason: 'invalidProgram', message: refusal };
  }

  return { ok: true, values };
}

function programRoutes(pool) {
  const router = express.Router();

  /**
   * Whether a new programme may be filed under the grant's department - #282.
   *
   * The department is the acting grant's scope, so the only thing left to ask
   * is whether it is still switched on: a retired department keeps the
   * programmes already under it (an edit below does not ask this) and takes no
   * new ones. Until #282 the same `false` answered *a department you named that
   * is not yours*, which is untrue once nobody names one, so the sentence is the
   * owner's of 18 พ.ย. 2569 and says the department is retired.
   *
   * Returns a REFUSALS key or null, which is also `importRows`'s `refuseFile`
   * contract - so the same check covers the typed row and the imported file,
   * asked once for the file since #285 rather than once per row.
   */
  async function retiredRefusal(req) {
    const own = req.auth.acting.scope_id;
    const open = await departmentInReach(pool, own, own, { mustBeActive: true });
    return open ? null : 'departmentRetired';
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
      const search = searchOf(req);

      // #272: the search box, over what the table shows of a programme.
      const where = `WHERE ($1::text[] IS NULL OR department_id = ANY($1))
                       AND ($2::boolean IS NOT TRUE OR is_active)
                       AND ${holding(3, ['program_id', 'program_name_th', 'program_name_en', 'revision_year'])}`;

      const counted = await pool.query(`SELECT count(*)::int AS total FROM programs ${where}`, [
        reach,
        activeOnly,
        search,
      ]);
      const { rows } = await pool.query(
        `SELECT ${RETURNED} FROM programs ${where}
          ORDER BY program_id ASC
          LIMIT $4 OFFSET $5`,
        [reach, activeOnly, search, perPage, offset],
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

  // `GET /programs/departments`, the form's department picker and the list's
  // department column, was taken out by #282 (18 พ.ย. 2569): the screen draws
  // neither, so nothing asks it. `/programs/departments` now reaches the route
  // below as a programme code and answers as one that does not exist.

  /**
   * The template — the seventh criterion. Declared before `/programs/:id`
   * because Express matches in order and the parameter would otherwise swallow
   * the word.
   *
   * No `department_id` since #282: see `IMPORT_COLUMNS`.
   */
  router.get('/programs/import-template', requireRole(...MAINTAINERS), (req, res) =>
    sendTemplate(res, 'programs-template.csv', IMPORT_COLUMNS, {
      program_id: '0505',
      program_name_th: 'วิศวกรรมสารสนเทศ',
      program_name_en: 'Information Engineering',
      revision_year: '2565',
    }),
  );

  /**
   * The import — the seventh criterion: every row, or none of them.
   *
   * The mechanism is `lib/importer`, shared with accounts and departments. What
   * is here is what is about programmes: how a row is read, that the identifier
   * must not repeat within the file, that the grant's department still takes
   * new programmes, and what writing one means. Every row lands in that
   * department (#282), whatever a `department_id` column in the file says.
   */
  router.post('/programs/import', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const department = req.auth.acting.scope_id;
      const result = await importRows(pool, req.body, {
        // The two names are what tell this file from a departments one.
        required: ['program_id', 'program_name_th'],
        readRow: (record) => {
          const draft = readProgram(record);
          return draft.ok ? { ok: true, draft: draft.values } : draft;
        },
        keys: [{ of: (v) => v.program_id, message: REFUSALS.duplicateProgramId }],
        refuseFile: () => retiredRefusal(req),
        insert: async (client, values) => {
          try {
            const { rows } = await client.query(
              `INSERT INTO programs
                 (program_id, program_name_th, program_name_en, department_id, revision_year)
               VALUES ($1, $2, $3, $4, $5) RETURNING ${RETURNED}`,
              [
                values.program_id,
                values.program_name_th,
                values.program_name_en,
                department,
                values.revision_year,
              ],
            );
            // Inside the row's savepoint - #58, as in every import here.
            await recordActivity(
              client,
              req.auth.userId,
              'IMPORT_PROGRAMS',
              onProgram(rows[0].program_id),
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

  /** Adding one — the first criterion, under the grant's department (#282). */
  router.post('/programs', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readProgram(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: sentenceOf(draft) });

      const refusal = await retiredRefusal(req);
      if (refusal) return res.status(403).json({ message: REFUSALS[refusal] });

      // `is_active` is deliberately not read here. A programme is created
      // because it is being offered; retiring one is what the fourth criterion
      // describes, and it happens on an edit or on a removal, not at birth.
      const { rows } = await pool.query(
        `INSERT INTO programs
           (program_id, program_name_th, program_name_en, department_id, revision_year)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${RETURNED}`,
        [
          draft.values.program_id,
          draft.values.program_name_th,
          draft.values.program_name_en,
          req.auth.acting.scope_id,
          draft.values.revision_year,
        ],
      );

      await recordActivity(pool, req.auth.userId, 'CREATE_PROGRAM', onProgram(rows[0].program_id));
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
   * Neither, since #282, is the department: the programme has to be reachable,
   * which pins it to the grant's one department, and the edit does not write
   * that column - so there is no move to check, and a `department_id` in the
   * body is not read. A programme under a department that has since been
   * retired stays editable, or retiring a department would freeze its
   * programmes and switching one of them off would be impossible.
   *
   * Every field replaces, as a PUT's fields do - including the year, which the
   * form has to be able to clear. Reading an absent year as "leave it" would
   * have made an emptied box answer "บันทึกเรียบร้อย" and change nothing.
   */
  router.put('/programs/:programId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.programId);
      if (!existing) return res.status(404).json({ message: REFUSALS.programNotFound });

      const draft = readProgram(req.body ?? {}, { editing: true });
      if (!draft.ok) return res.status(400).json({ message: sentenceOf(draft) });

      const { rows } = await pool.query(
        `UPDATE programs
            SET program_name_th = $2,
                program_name_en = $3,
                revision_year = $4,
                is_active = coalesce($5, is_active),
                updated_at = now()
          WHERE program_id = $1
          RETURNING ${RETURNED}`,
        [
          existing.program_id,
          draft.values.program_name_th,
          draft.values.program_name_en,
          draft.values.revision_year,
          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,
        ],
      );

      await recordActivity(
        pool,
        req.auth.userId,
        'UPDATE_PROGRAM',
        onProgram(existing.program_id),
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
   * Except for the one it cannot decide. A role somebody holds over this
   * programme is a sixth reference that no foreign key can express, and #60
   * found it dangling: see `blocked` below and `lib/scopeGrants`.
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
        // The sixth reference, and the one the sentence above is wrong about -
        // #60. A grant over this programme is a reference too, and it is the
        // only one the database cannot decide: `user_roles.scope_id` names a
        // faculty, a department or a programme and therefore carries no foreign
        // key, so no 23503 arrives and the programme used to be destroyed under
        // somebody's role. It is asked by hand, here, and `lib/scopeGrants`
        // says why that is not licence to ask about anything else by hand.
        blocked: (client) => isGranted(client, existing.program_id),
        remove: async (client) => {
          await forgetRevokedGrants(client, existing.program_id);
          await client.query('DELETE FROM programs WHERE program_id = $1', [existing.program_id]);
        },
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

      // The two outcomes are two lines, because they are two different things
      // to have happened to the record - #58. A DELETE that the database turned
      // into a deactivation logged as `DELETE_PROGRAM` would say the programme
      // is gone when it is still there and still referenced. `outcome.missing`
      // writes nothing: it is the row disappearing between the read and the
      // attempt, and nobody did that on this request.
      if (outcome.deleted) {
        await recordActivity(
          pool,
          req.auth.userId,
          'DELETE_PROGRAM',
          onProgram(existing.program_id),
        );
        return res.status(204).send();
      }
      if (outcome.missing) return res.status(404).json({ message: REFUSALS.programNotFound });
      await recordActivity(
        pool,
        req.auth.userId,
        'DEACTIVATE_PROGRAM',
        onProgram(existing.program_id),
      );
      return res.status(200).json({ program: outcome.row, deactivated: true });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { programRoutes };

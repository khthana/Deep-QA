'use strict';

/**
 * Subjects — ticket #16.
 *
 * รายวิชา: a catalogue entry, owned by a department and identified by the code
 * the registrar knows it by, such as `01076105`. CONTEXT.md is emphatic about
 * what it is not: it "exists independently of any programme or year", so
 * nothing here mentions either. Putting a subject into a หลักสูตร is
 * `program_subjects` and belongs to #18; teaching it in a term is an Offering
 * and belongs to #23. This file is the catalogue alone.
 *
 * It is #15 read again for a different table, and the three things that run
 * through that file run through this one - one reach for the roles that
 * maintain it (two until #61 took the Faculty Admin off), a department checked
 * against the database (named by the body until #284, the grant's own since),
 * and a removal that deactivates when something depends on the record. What is genuinely
 * different is worth naming, because each of the four is a place copying #15
 * would have been wrong.
 *
 * *The code is eight characters.* `subject_id` is `varchar(8)`, not
 * `varchar(10)`: a KMITL subject code is eight digits and the column was
 * written to that width. #15's limit copied across would let a ninth character
 * through to a `22001` from PostgreSQL, which the caller would read as
 * `unexpected`.
 *
 * *Both names are required.* A programme may have no English name and the
 * column allows it; `subject_name_en` is `NOT NULL`, and the ticket asks for a
 * subject with "both names". The two descriptions are the optional pair
 * instead, and they are `text` - no length to check, because a subject
 * description is a paragraph.
 *
 * *Credits are a number.* The first required numeric field in this family, and
 * the one thing here a blank box cannot be forgiven for: `blankToNull` would
 * hand a `null` to a `NOT NULL` column and the caller would get `unexpected`
 * where they meant to be told what they left out. So it is read as digits and
 * refused as `invalidSubject` when it is not.
 *
 * *The department is the grant's, not the body's* (#284, the owner's answer of
 * 19 พ.ย. 2569, the same as #282's for programmes). The Department Admin holds
 * one department (CONTEXT.md), so a department named by a body or a
 * spreadsheet had one value it could correctly be. A subject is filed under the
 * department of the grant that records it (`req.auth.acting.scope_id`), a
 * `department_id` in a body or a file is not read, and an edit writes no
 * department: `reachable` pins the subject to the reach before the edit is read.
 * The `?department_id=` filter on the list and `GET /subjects/departments`
 * went with it. Until then this paragraph said the filter stayed "because a
 * later grant covering two departments would need it back"; the owner's answer
 * is that nobody holds such a grant, and the one place that built one was
 * `144a`'s fixture.
 */

const express = require('express');

const { onSubject, recordActivity } = require('../auth/accounts');
const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, isDuplicate } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');
const { holding, searchOf } = require('../lib/search');
const { deleteOrDeactivate } = require('../lib/removal');
const { departmentInReach } = require('../lib/reach');

/**
 * The role that maintains the catalogue — one of them, settled by #61.
 *
 * A subject is what a department teaches, and the department that teaches it is
 * the one that knows its code, its credits and its description. Content a
 * department owns is content that department maintains, so the catalogue is the
 * Department Admin's and the Faculty Admin does not reach this screen — not to
 * write and not to read, the way #14's own screen is refused the other way
 * round.
 *
 * This is a ruling about Subjects and not a rule about screens. Departments
 * (#14) and Programmes (#15) stay with the Faculty Admin because docs/06
 * stories 25 and 27 name that role by hand; story 31 says only "an
 * administrator", and that gap is the whole of what #61 decided.
 *
 * `PROG_MANAGER` is absent as before: the Curriculum Committee chooses which
 * subjects its programme uses, which is #18, and does not decide what the
 * university teaches — and a Faculty Admin still reaches #18, because placing
 * a subject into a curriculum is not maintaining the catalogue. `FULL_ADMIN` is
 * absent because a subject is curriculum (ADR-0002).
 */
const MAINTAINERS = ['DEPT_ADMIN'];

/** What a subject is, as this file reads it out. */
const RETURNED = `subject_id, subject_name_th, subject_name_en, credits,
                  description_th, description_en, department_id, is_active`;

/** The template's columns, and the fields the import reads from a row. */
const IMPORT_COLUMNS = [
  'subject_id',
  'subject_name_th',
  'subject_name_en',
  'credits',
  'description_th',
  'description_en',
];

/** As wide as the column, and as wide as a real subject code. */
const CODE_WIDTH = 8;

/**
 * One subject's worth of fields, from a form or from a spreadsheet row.
 *
 * The same function for both, for #11's reason: a rule the form enforces and
 * the import does not is a rule with a way around it.
 *
 * The code is a natural key (ADR-0001, tier one) - it is what the registrar,
 * the transcript and every other system call this subject - so it is neither
 * generated nor editable afterwards.
 */
function readSubject(source, { editing = false } = {}) {
  const values = {
    subject_id: blankToNull(source.subject_id),
    subject_name_th: blankToNull(source.subject_name_th),
    subject_name_en: blankToNull(source.subject_name_en),
    credits: blankToNull(source.credits),
    description_th: blankToNull(source.description_th),
    description_en: blankToNull(source.description_en),
  };

  if (!editing && !values.subject_id) return { ok: false, reason: 'invalidSubject' };
  if (values.subject_id && values.subject_id.length > CODE_WIDTH) {
    return { ok: false, reason: 'invalidSubject' };
  }
  for (const name of [values.subject_name_th, values.subject_name_en]) {
    if (!name || name.length > 200) return { ok: false, reason: 'invalidSubject' };
  }

  // A whole number of credits, written as digits. `0` is allowed - a
  // non-credit-bearing seminar is a subject the catalogue has to be able to
  // hold - and two digits is the ceiling because no subject is worth a hundred.
  const credits = String(values.credits ?? '');
  if (!/^\d{1,2}$/.test(credits)) return { ok: false, reason: 'invalidSubject' };
  values.credits = Number(credits);

  // No department is read: it is the grant's (#284). Until then a create
  // without one was refused here as `invalidSubject`.

  return { ok: true, values };
}

/**
 * Writing one subject, for whichever of the two callers is asking.
 *
 * The typed form writes through the pool and the import writes through the
 * client its transaction is on, and both take the same seven columns in the
 * same order - so the statement is written once and handed the executor, rather
 * than copied into the route and into the importer's `insert` where the two
 * could drift a column apart. The department is handed in apart from the
 * values because it is never one of them: it is the grant's (#284).
 */
async function insertSubject(executor, values, department) {
  const { rows } = await executor.query(
    `INSERT INTO subjects
       (subject_id, subject_name_th, subject_name_en, credits,
        description_th, description_en, department_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${RETURNED}`,
    [
      values.subject_id,
      values.subject_name_th,
      values.subject_name_en,
      values.credits,
      values.description_th,
      values.description_en,
      department,
    ],
  );
  return rows[0];
}

function subjectRoutes(pool) {
  const router = express.Router();

  /**
   * Whether the grant's own department still takes new subjects.
   *
   * The department is the grant's (#284), so the one thing left to ask about it
   * is whether it is still switched on: a retired department keeps the subjects
   * already under it (an edit below does not ask this) and takes no new ones.
   * Until #284 the department was named by the body and checked against the
   * reach here, and a `false` answered *a department that is not yours* -
   * `subjectDepartmentNotYours`, which is untrue once nobody names one. The
   * sentence is the owner's of 19 พ.ย. 2569, #282's with รายวิชา for หลักสูตร.
   *
   * Returns a REFUSALS key or null, which is also `importRows`'s `refuseFile`
   * contract - so the same check covers the typed row and the imported file,
   * asked once for the file since #285 rather than once per row.
   *
   * A copy of `programs.js`'s, not a shared helper, for #83's reason: the two
   * routes answer with different keys, and a mutant of one should leave the
   * other's rows standing.
   */
  async function retiredRefusal(req) {
    const own = req.auth.acting.scope_id;
    const open = await departmentInReach(pool, own, own, { mustBeActive: true });
    return open ? null : 'subjectDepartmentRetired';
  }

  /**
   * The subject, if this grant reaches it.
   *
   * The same reach the list filters on, so a subject the list did not show
   * cannot be edited by asking for it directly - and out of scope answers the
   * same 404 as nonexistent, which is the third criterion enforced at the
   * server rather than in a menu.
   */
  async function reachable(req, subjectId) {
    const reach = await coveredScopes(pool, req.auth.acting.scope_id);
    const { rows } = await pool.query(
      `SELECT ${RETURNED} FROM subjects
        WHERE subject_id = $1 AND ($2::text[] IS NULL OR department_id = ANY($2))`,
      [subjectId, reach],
    );
    return rows[0] ?? null;
  }

  /**
   * The list — the seventh criterion, both halves.
   *
   * Ten to a page with the total, inside the reach. `?department_id=` narrowed
   * it within the reach until #284 (19 พ.ย. 2569), when the owner took the
   * screen's department filter away with the column: it had one option for
   * every account that reaches this screen.
   *
   * Inactive subjects are shown as well as active ones, deliberately: this is
   * the screen one is switched back on from, and a management list that hid
   * them would make the fourth criterion a one-way door. `?active=1` is for the
   * screens that ask a person to *pick* a subject - #18 onwards.
   */
  router.get('/subjects', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { page, perPage, offset } = pageOf(req);
      const activeOnly = ['1', 'true'].includes(String(req.query.active));
      const search = searchOf(req);

      // #272: the search box, over what the table shows of a subject.
      const where = `WHERE ($1::text[] IS NULL OR department_id = ANY($1))
                       AND ($2::boolean IS NOT TRUE OR is_active)
                       AND ${holding(3, ['subject_id', 'subject_name_th', 'subject_name_en', 'credits'])}`;

      const counted = await pool.query(`SELECT count(*)::int AS total FROM subjects ${where}`, [
        reach,
        activeOnly,
        search,
      ]);
      const { rows } = await pool.query(
        `SELECT ${RETURNED} FROM subjects ${where}
          ORDER BY subject_id ASC
          LIMIT $4 OFFSET $5`,
        [reach, activeOnly, search, perPage, offset],
      );

      return res.status(200).json({
        subjects: rows,
        total: counted.rows[0].total,
        page,
        per_page: perPage,
      });
    } catch (error) {
      return next(error);
    }
  });

  // `GET /subjects/departments` stood here until #284 (19 พ.ย. 2569): the
  // departments in reach, which drew the form's picker, the list's filter and
  // the department column. None of the three is drawn now.

  /**
   * The template — the sixth criterion. Declared before `/subjects/:id` because
   * Express matches in order and the parameter would otherwise swallow the
   * word.
   */
  router.get('/subjects/import-template', requireRole(...MAINTAINERS), (req, res) =>
    sendTemplate(res, 'subjects-template.csv', IMPORT_COLUMNS, {
      subject_id: '01076106',
      subject_name_th: 'โครงสร้างข้อมูลและอัลกอริทึม',
      subject_name_en: 'DATA STRUCTURES AND ALGORITHMS',
      credits: '3',
      description_th: 'โครงสร้างข้อมูลพื้นฐานและการวิเคราะห์อัลกอริทึม',
      description_en: 'Fundamental data structures and algorithm analysis',
    }),
  );

  /**
   * The import — the sixth criterion: every row, or none of them.
   *
   * The mechanism is `lib/importer`, shared with accounts, departments and
   * programmes. What is here is what is about subjects: how a row is read, that
   * the code must not repeat within the file, that the grant's department still
   * takes new subjects, and what writing one means. Every row lands in that
   * department (#284), whatever a `department_id` column in the file says.
   */
  router.post('/subjects/import', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const department = req.auth.acting.scope_id;
      const result = await importRows(pool, req.body, {
        // Both names and the credits, which `readSubject` refuses a row without.
        // The two descriptions are optional and so are not here.
        required: ['subject_id', 'subject_name_th', 'subject_name_en', 'credits'],
        readRow: (record) => {
          const draft = readSubject(record);
          return draft.ok ? { ok: true, draft: draft.values } : draft;
        },
        keys: [{ of: (v) => v.subject_id, message: REFUSALS.duplicateSubjectId }],
        refuseFile: () => retiredRefusal(req),
        insert: async (client, values) => {
          try {
            const row = await insertSubject(client, values, department);
            // Inside the row's savepoint - #58, as in every import here.
            await recordActivity(client, req.auth.userId, 'IMPORT_SUBJECTS', onSubject(row.subject_id));
            return { ok: true, row };
          } catch (error) {
            if (isDuplicate(error)) return { ok: false, reason: 'duplicateSubjectId' };
            throw error;
          }
        },
      });

      return sendImport(res, result, 'subjects');
    } catch (error) {
      return next(error);
    }
  });

  /** One subject, for the edit form. */
  router.get('/subjects/:subjectId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const subject = await reachable(req, req.params.subjectId);
      if (!subject) return res.status(404).json({ message: REFUSALS.subjectNotFound });
      return res.status(200).json({ subject });
    } catch (error) {
      return next(error);
    }
  });

  /** Adding one — the first criterion, under the grant's department (#284). */
  router.post('/subjects', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readSubject(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const refusal = await retiredRefusal(req);
      if (refusal) return res.status(403).json({ message: REFUSALS[refusal] });

      // `is_active` is deliberately not read here. A subject is added to the
      // catalogue because it is being taught; retiring one is the fourth
      // criterion and happens on an edit or on a removal, not at birth.
      const subject = await insertSubject(pool, draft.values, req.auth.acting.scope_id);
      await recordActivity(pool, req.auth.userId, 'CREATE_SUBJECT', onSubject(subject.subject_id));
      return res.status(201).json({ subject });
    } catch (error) {
      if (isDuplicate(error)) {
        return res.status(409).json({ message: REFUSALS.duplicateSubjectId });
      }
      return next(error);
    }
  });

  /**
   * Editing one — the first criterion's middle verb, and both ends of the
   * third.
   *
   * The code is not among the fields that can change: `program_subjects` and
   * the Offerings beneath it reference it, and a transcript names it, so
   * "renaming" a subject is a migration and not an edit on a form. Nor is the
   * department, since #284: the subject has to be reachable, which pins it to
   * the grant's department, and the edit writes none. Until then a body could
   * move a subject to another department in reach, checked against the reach
   * and refused into a retired one; with one department in reach there was
   * nowhere to move it.
   *
   * Everything else replaces, as a PUT's fields do, including the two
   * descriptions - which the form has to be able to clear. Reading an absent
   * description as "leave it" would have made an emptied box answer
   * "บันทึกเรียบร้อย" and change nothing.
   */
  router.put('/subjects/:subjectId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.subjectId);
      if (!existing) return res.status(404).json({ message: REFUSALS.subjectNotFound });

      const draft = readSubject(req.body ?? {}, { editing: true });
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      // A department that has since been retired keeps the subjects already
      // filed under it - otherwise retiring a department would freeze its
      // catalogue - so nothing about the department is asked here.
      const { rows } = await pool.query(
        `UPDATE subjects
            SET subject_name_th = $2,
                subject_name_en = $3,
                credits = $4,
                description_th = $5,
                description_en = $6,
                is_active = coalesce($7, is_active),
                updated_at = now()
          WHERE subject_id = $1
          RETURNING ${RETURNED}`,
        [
          existing.subject_id,
          draft.values.subject_name_th,
          draft.values.subject_name_en,
          draft.values.credits,
          draft.values.description_th,
          draft.values.description_en,
          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,
        ],
      );

      await recordActivity(pool, req.auth.userId, 'UPDATE_SUBJECT', onSubject(existing.subject_id));
      return res.status(200).json({ subject: rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Removing one — the fourth criterion, which is not quite a removal.
   *
   * A subject nothing depends on is deleted and answers 204. A subject a
   * Program Subject points at - and, through that pair, an Offering, its CLOs
   * and every mark ever recorded under it - is switched off instead and answers
   * 200 with the row, so the screen can say which of the two happened rather
   * than guessing. The database decides, through ON DELETE RESTRICT, so a
   * reference added later is covered on the day it is added.
   *
   * Asking the person to confirm first is the fifth criterion and is the
   * screen's job: there is nothing for a server to confirm against, and a
   * request that arrived is a request that was meant.
   */
  router.delete('/subjects/:subjectId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.subjectId);
      if (!existing) return res.status(404).json({ message: REFUSALS.subjectNotFound });

      const outcome = await deleteOrDeactivate(pool, {
        remove: (client) =>
          client.query('DELETE FROM subjects WHERE subject_id = $1', [existing.subject_id]),
        deactivate: (client) =>
          client.query(
            `UPDATE subjects SET is_active = false, updated_at = now() WHERE subject_id = $1`,
            [existing.subject_id],
          ),
        load: async (client) => {
          const { rows } = await client.query(
            `SELECT ${RETURNED} FROM subjects WHERE subject_id = $1`,
            [existing.subject_id],
          );
          return rows[0];
        },
      });

      // Two outcomes, two lines - the reasoning is `routes/programs.js`, which
      // has the same removal and wrote it down.
      if (outcome.deleted) {
        await recordActivity(pool, req.auth.userId, 'DELETE_SUBJECT', onSubject(existing.subject_id));
        return res.status(204).send();
      }
      if (outcome.missing) return res.status(404).json({ message: REFUSALS.subjectNotFound });
      await recordActivity(
        pool,
        req.auth.userId,
        'DEACTIVATE_SUBJECT',
        onSubject(existing.subject_id),
      );
      return res.status(200).json({ subject: outcome.row, deactivated: true });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { subjectRoutes };

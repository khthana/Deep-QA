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
 * through that file run through this one - two roles sharing one reach, a
 * department named by the body and checked against the database, and a removal
 * that deactivates when something depends on the record. What is genuinely
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
 * *The list is filterable by department.* The seventh criterion asks for it
 * here, where a faculty administrator looking after several departments reads a
 * catalogue of hundreds rather than a dozen programmes. The filter narrows
 * within the reach and never widens it: a department outside the reach simply
 * matches nothing, because the reach clause is still there.
 */

const express = require('express');

const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, isDuplicate, isReferenced } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');
const { departmentInReach, reachableDepartments } = require('../lib/reach');

/**
 * The roles that maintain the catalogue — #15's two, for #15's reasons.
 *
 * `PROG_MANAGER` is absent again: the Curriculum Committee chooses which
 * subjects its programme uses, which is #18, and does not decide what the
 * university teaches. `FULL_ADMIN` is absent because a subject is curriculum
 * (ADR-0002).
 */
const MAINTAINERS = ['FACULTY_ADMIN', 'DEPT_ADMIN'];

/** What a subject is, as this file reads it out. */
const RETURNED = `subject_id, subject_name_th, subject_name_en, credits,
                  description_th, description_en, department_id, is_active`;

/** The template's columns, and the fields the import reads from a row. */
const IMPORT_COLUMNS = [
  'subject_id',
  'subject_name_th',
  'subject_name_en',
  'credits',
  'department_id',
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
    department_id: blankToNull(source.department_id),
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

  // A department is what a subject is owned by, so it is required when one is
  // created; on an edit an absent column means "leave it where it is".
  if (!editing && !values.department_id) return { ok: false, reason: 'invalidSubject' };

  return { ok: true, values };
}

/**
 * Writing one subject, for whichever of the two callers is asking.
 *
 * The typed form writes through the pool and the import writes through the
 * client its transaction is on, and both take the same seven columns in the
 * same order - so the statement is written once and handed the executor, rather
 * than copied into the route and into the importer's `insert` where the two
 * could drift a column apart.
 */
async function insertSubject(executor, values) {
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
      values.department_id,
    ],
  );
  return rows[0];
}

function subjectRoutes(pool) {
  const router = express.Router();

  /**
   * The department this request may file a subject under.
   *
   * Named by the body and checked against the reach derived from the acting
   * grant, which is the shape ADR-0002 permits: authority is never read from a
   * body, a target named by one is verified. Returns a REFUSALS key or null,
   * which is also `importRows`'s `verify` contract - so the same check covers
   * the typed row and the imported one. The question itself is `lib/reach`,
   * shared with #15; what a refusal *says* is this file's, because the sentence
   * names รายวิชา.
   */
  async function departmentRefusal(req, departmentId, { mustBeActive = true } = {}) {
    if (!departmentId) return 'invalidSubject';
    const held = await departmentInReach(pool, req.auth.acting.scope_id, departmentId, {
      mustBeActive,
    });
    return held ? null : 'subjectDepartmentNotYours';
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
   * Ten to a page with the total, and `?department_id=` to narrow it. The
   * filter is applied *inside* the reach rather than instead of it: a caller
   * who names a department they do not hold gets an empty page, not somebody
   * else's catalogue.
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
      const department = blankToNull(req.query.department_id) ?? null;

      const where = `WHERE ($1::text[] IS NULL OR department_id = ANY($1))
                       AND ($2::boolean IS NOT TRUE OR is_active)
                       AND ($3::text IS NULL OR department_id = $3)`;

      const counted = await pool.query(`SELECT count(*)::int AS total FROM subjects ${where}`, [
        reach,
        activeOnly,
        department,
      ]);
      const { rows } = await pool.query(
        `SELECT ${RETURNED} FROM subjects ${where}
          ORDER BY subject_id ASC
          LIMIT $4 OFFSET $5`,
        [reach, activeOnly, department, perPage, offset],
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

  /**
   * The departments this caller reaches — what the form's picker and the list's
   * filter are both drawn from.
   *
   * Read from here rather than from `/api/departments`, which belongs to the
   * faculty administrator alone (#14): a department administrator legitimately
   * reaches this screen and would be refused by that one. The query is
   * `lib/reach`, shared with #15, so what the picker offers is exactly what
   * `departmentRefusal` will accept.
   */
  router.get('/subjects/departments', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const departments = await reachableDepartments(pool, req.auth.acting.scope_id);
      return res.status(200).json({ departments });
    } catch (error) {
      return next(error);
    }
  });

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
      department_id: '05',
      description_th: 'โครงสร้างข้อมูลพื้นฐานและการวิเคราะห์อัลกอริทึม',
      description_en: 'Fundamental data structures and algorithm analysis',
    }),
  );

  /**
   * The import — the sixth criterion: every row, or none of them.
   *
   * The mechanism is `lib/importer`, shared with accounts, departments and
   * programmes. What is here is what is about subjects: how a row is read, that
   * the code must not repeat within the file, that each row's department has to
   * be one this caller reaches, and what writing one means.
   */
  router.post('/subjects/import', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const result = await importRows(pool, req.body, {
        readRow: (record) => {
          const draft = readSubject(record);
          return draft.ok ? { ok: true, draft: draft.values } : draft;
        },
        keys: [{ of: (v) => v.subject_id, message: REFUSALS.duplicateSubjectId }],
        verify: (values) => departmentRefusal(req, values.department_id),
        insert: async (client, values) => {
          try {
            return { ok: true, row: await insertSubject(client, values) };
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

  /** Adding one — the first criterion, under a department the caller reaches. */
  router.post('/subjects', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readSubject(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const refusal = await departmentRefusal(req, draft.values.department_id);
      if (refusal) return res.status(403).json({ message: REFUSALS[refusal] });

      // `is_active` is deliberately not read here. A subject is added to the
      // catalogue because it is being taught; retiring one is the fourth
      // criterion and happens on an edit or on a removal, not at birth.
      return res.status(201).json({ subject: await insertSubject(pool, draft.values) });
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
   * "renaming" a subject is a migration and not an edit on a form. The
   * department can change, and is therefore checked twice - the subject as it
   * stands has to be reachable, and so does the department it is moving to, or
   * a move would be a way of pushing a record out of one's own reach or of
   * adopting somebody else's.
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

      // A department that has since been retired may keep the subjects already
      // filed under it - otherwise retiring a department would freeze its
      // catalogue. It is only a *move* into a retired department that is
      // refused.
      const department = draft.values.department_id ?? existing.department_id;
      const refusal = await departmentRefusal(req, department, {
        mustBeActive: department !== existing.department_id,
      });
      if (refusal) return res.status(403).json({ message: REFUSALS[refusal] });

      const { rows } = await pool.query(
        `UPDATE subjects
            SET subject_name_th = $2,
                subject_name_en = $3,
                credits = $4,
                description_th = $5,
                description_en = $6,
                department_id = $7,
                is_active = coalesce($8, is_active),
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
          department,
          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,
        ],
      );

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

      // One transaction with a savepoint, rather than two calls on the pool: a
      // failed DELETE has to be rolled back before anything else can be said on
      // that connection, and the row has to still be there for the UPDATE that
      // follows.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SAVEPOINT attempt');
        try {
          await client.query('DELETE FROM subjects WHERE subject_id = $1', [existing.subject_id]);
          await client.query('COMMIT');
          return res.status(204).send();
        } catch (error) {
          if (!isReferenced(error)) throw error;
          await client.query('ROLLBACK TO SAVEPOINT attempt');
        }

        const { rows } = await client.query(
          `UPDATE subjects SET is_active = false, updated_at = now()
            WHERE subject_id = $1 RETURNING ${RETURNED}`,
          [existing.subject_id],
        );
        await client.query('COMMIT');
        if (!rows[0]) return res.status(404).json({ message: REFUSALS.subjectNotFound });
        return res.status(200).json({ subject: rows[0], deactivated: true });
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { subjectRoutes };

'use strict';

/**
 * Program Subjects — ticket #18.
 *
 * รายวิชาในหลักสูตร: which subjects a หลักสูตร is made of, and whether each is
 * บังคับ or เลือก. CONTEXT.md keeps the two sides apart and this file is the
 * join between them - the catalogue entry belongs to a department and exists
 * independently of any programme (#16), and everything at the (Program,
 * Subject) grain and below - the Offering, its CLOs, the weighting scheme,
 * every mark - hangs off the pair this screen makes.
 *
 * Four things are different enough from #15 and #16 to be worth naming, because
 * each is a place where copying them would have been wrong.
 *
 * *The key is a pair.* ADR-0001's second tier: `program_subjects` has no
 * identifier of its own, the primary key is `(program_id, subject_id)`, and so
 * a row is named by two path segments and "the same subject twice" is the
 * database's answer rather than a check that could be forgotten.
 *
 * *`PROG_MANAGER` is a maintainer here, and this is the first screen where they
 * are.* #15 and #16 exclude them deliberately - what the university teaches and
 * how it is organised is not the committee's decision - and choosing which of
 * those subjects this curriculum uses is exactly what is. The two
 * administrators above them keep the reach they have everywhere else.
 *
 * *The reach is a programme, and one clause covers all three roles.* A
 * `PROG_MANAGER`'s `scope_id` *is* a `program_id`, so `coveredScopes` answers
 * `['0501']` for the committee, every programme under the department for a
 * department administrator and every programme under the faculty for a faculty
 * one - and `program_id = ANY(reach)` is the whole of the eighth criterion for
 * each of them.
 *
 * *The catalogue picker is wider than the reach, on purpose.* A subject may be
 * placed into a programme whatever department owns it: a computer engineering
 * curriculum contains mathematics, physics and general education subjects, and
 * a picker narrowed to the programme's own department could not express a real
 * one. The ticket's third criterion asks only that the code be "present in the
 * catalogue", the delivered implementation scoped it no further, and reading
 * the catalogue is not writing to it. What *is* scoped is every write: the
 * programme has to be one the caller holds.
 */

const express = require('express');

const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, isDuplicate } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');
const { reachablePrograms, programInReach } = require('../lib/reach');
const { deleteOrDeactivate } = require('../lib/removal');

/**
 * The roles that decide what a curriculum is made of.
 *
 * `FULL_ADMIN` is absent because a curriculum is not the central
 * administrator's (ADR-0002), and `TEACHER` because teaching a subject is not
 * choosing it. `FACULTY_ADMIN` is absent since #79: the faculty keeps the list
 * of departments and of curricula, and what a curriculum is made of is decided
 * below it. That reverses the note #61 left here.
 */
const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];

/** `subject_type_enum`, exactly. บังคับ and เลือก are the screen's words for these. */
const TYPES = ['required', 'elective'];

/**
 * What a Program Subject is, as this file reads it out: the pair and its two
 * fields, with the catalogue entry read alongside it - the screen lists subject
 * names and credits, and a list of codes alone would send it back for each one.
 */
const RETURNED = `ps.program_id, ps.subject_id, ps.subject_type, ps.is_active,
                  s.subject_name_th, s.subject_name_en, s.credits, s.department_id`;

const FROM = `FROM program_subjects ps JOIN subjects s ON s.subject_id = ps.subject_id`;

/** The template's columns, and the fields the import reads from a row. */
const IMPORT_COLUMNS = ['program_id', 'subject_id', 'subject_type'];

/**
 * One pairing's worth of fields, from a form or from a spreadsheet row.
 *
 * The same function for both, for #11's reason: a rule the form enforces and
 * the import does not is a rule with a way around it.
 *
 * Both halves of the key are required and neither is editable afterwards -
 * moving a subject from one programme to another is deleting one pair and
 * making another, and everything beneath the pair moves with it or does not.
 * So `editing` narrows this to the one field that can change and the switch
 * that can be flipped.
 */
function readPairing(source, { editing = false } = {}) {
  const values = {
    program_id: blankToNull(source.program_id),
    subject_id: blankToNull(source.subject_id),
    subject_type: blankToNull(source.subject_type),
  };

  if (!editing && (!values.program_id || !values.subject_id)) {
    return { ok: false, reason: 'invalidProgramSubject' };
  }
  // Neither is length-checked here: a code no table knows is refused by the
  // reach check and by the catalogue check below, which is a better answer than
  // "too long" and covers a code of legal width that names nothing.
  if (!TYPES.includes(values.subject_type)) {
    return { ok: false, reason: 'invalidProgramSubject' };
  }

  return { ok: true, values };
}

function programSubjectRoutes(pool) {
  const router = express.Router();

  /**
   * The programme this request may write into.
   *
   * Named by the body or by the path and checked against the reach derived from
   * the acting grant, which is the shape ADR-0002 permits: authority is never
   * read from a request, a target named by one is verified. Returns a REFUSALS
   * key or null, which is also `importRows`'s `verify` contract - so the same
   * check covers the typed row and the imported one.
   *
   * A programme that does not exist, one in another department and one that has
   * been retired all answer the same key, for `departmentInReach`'s reason: a
   * different answer for the second would turn this into a way of listing other
   * departments' programmes.
   */
  async function programRefusal(req, programId) {
    if (!programId) return 'invalidProgramSubject';
    const program = await programInReach(pool, req.auth.acting.scope_id, programId);
    return program ? null : 'programNotYours';
  }

  /**
   * Whether the catalogue holds this subject and still offers it — the third
   * criterion, and the trap this route has to step around.
   *
   * A subject that is not in `subjects` would fail the insert with a foreign
   * key violation, which is `isReferenced`'s 23503 - the same code the *delete*
   * gets when children exist and reads as "switch it off instead". The two
   * cannot be told apart from the error, and the criterion asks for a message
   * that says what is wrong, so the question is asked explicitly here rather
   * than caught afterwards.
   */
  async function catalogueRefusal(subjectId) {
    if (!subjectId) return 'invalidProgramSubject';
    const { rows } = await pool.query(
      `SELECT is_active FROM subjects WHERE subject_id = $1`,
      [subjectId],
    );
    if (!rows[0]) return 'subjectNotInCatalogue';
    return rows[0].is_active ? null : 'subjectRetired';
  }

  /**
   * The pair, if this grant reaches its programme.
   *
   * The same reach the list filters on, so a pair the list did not show cannot
   * be edited by asking for it directly - and out of scope answers the same 404
   * as never-made, which is the eighth criterion enforced at the server rather
   * than in a menu.
   */
  async function reachable(req, programId, subjectId) {
    const reach = await coveredScopes(pool, req.auth.acting.scope_id);
    const { rows } = await pool.query(
      `SELECT ${RETURNED} ${FROM}
        WHERE ps.program_id = $1 AND ps.subject_id = $2
          AND ($3::text[] IS NULL OR ps.program_id = ANY($3))`,
      [programId, subjectId, reach],
    );
    return rows[0] ?? null;
  }

  /** The pair as the screen wants it, read back after a write. */
  async function loadPair(executor, programId, subjectId) {
    const { rows } = await executor.query(
      `SELECT ${RETURNED} ${FROM} WHERE ps.program_id = $1 AND ps.subject_id = $2`,
      [programId, subjectId],
    );
    return rows[0];
  }

  /**
   * Writing one pairing, for whichever of the two callers is asking — the typed
   * form through the pool, the import through the client its transaction is on.
   */
  async function insertPairing(executor, values) {
    await executor.query(
      `INSERT INTO program_subjects (program_id, subject_id, subject_type)
       VALUES ($1, $2, $3)`,
      [values.program_id, values.subject_id, values.subject_type],
    );
    return loadPair(executor, values.program_id, values.subject_id);
  }

  /**
   * The list — the ninth criterion.
   *
   * Ten to a page with the total, and `?program_id=` to narrow it, which is
   * what the screen's programme picker sends. The filter applies *inside* the
   * reach rather than instead of it: a caller naming a programme they do not
   * hold gets an empty page, not somebody else's curriculum.
   *
   * Inactive pairings are listed alongside active ones, deliberately: a
   * referenced pairing is switched off rather than removed, and this is the
   * screen it is switched back on from.
   */
  router.get('/program-subjects', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { page, perPage, offset } = pageOf(req);
      const program = blankToNull(req.query.program_id) ?? null;

      const where = `WHERE ($1::text[] IS NULL OR ps.program_id = ANY($1))
                       AND ($2::text IS NULL OR ps.program_id = $2)`;

      const counted = await pool.query(
        `SELECT count(*)::int AS total ${FROM} ${where}`,
        [reach, program],
      );
      const { rows } = await pool.query(
        `SELECT ${RETURNED} ${FROM} ${where}
          ORDER BY ps.program_id ASC, ps.subject_id ASC
          LIMIT $3 OFFSET $4`,
        [reach, program, perPage, offset],
      );

      return res.status(200).json({
        program_subjects: rows,
        total: counted.rows[0].total,
        page,
        per_page: perPage,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The programmes this caller reaches — the list's filter and the form's
   * picker, both drawn from here rather than from `/api/programs`, which
   * belongs to the two administrators (#15) and would refuse the committee
   * member this screen is mainly for.
   */
  router.get('/program-subjects/programs', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const programs = await reachablePrograms(pool, req.auth.acting.scope_id);
      return res.status(200).json({ programs });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The catalogue to choose from — every subject the university still teaches,
   * whatever department owns it, narrowed by `?q=` on the code or either name.
   *
   * Not paged and not filtered by reach; see the note at the top of the file
   * for why the second of those is deliberate. `?q=` is what keeps it usable: a
   * catalogue runs to hundreds of entries and the screen types into it rather
   * than scrolling.
   */
  router.get('/program-subjects/catalogue', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const q = blankToNull(req.query.q) ?? null;
      const { rows } = await pool.query(
        `SELECT subject_id, subject_name_th, subject_name_en, credits, department_id
           FROM subjects
          WHERE is_active
            AND ($1::text IS NULL
                 OR subject_id ILIKE '%' || $1 || '%'
                 OR subject_name_th ILIKE '%' || $1 || '%'
                 OR subject_name_en ILIKE '%' || $1 || '%')
          ORDER BY subject_id ASC
          LIMIT 200`,
        [q],
      );
      return res.status(200).json({ subjects: rows });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The template — the seventh criterion. Declared before the two-parameter
   * routes because Express matches in order, and `/program-subjects/:programId/
   * :subjectId` would otherwise be a candidate for anything with two segments.
   */
  router.get('/program-subjects/import-template', requireRole(...MAINTAINERS), (req, res) =>
    sendTemplate(res, 'program-subjects-template.csv', IMPORT_COLUMNS, {
      program_id: '0501',
      subject_id: '01076105',
      subject_type: 'required',
    }),
  );

  /**
   * The import — the seventh criterion: every row, or none of them.
   *
   * The mechanism is `lib/importer`, shared with accounts, departments,
   * programmes and subjects. What is here is what is about pairings: how a row
   * is read, that the *pair* must not repeat within the file, that each row's
   * programme has to be one this caller holds and its subject has to be in the
   * catalogue, and what writing one means.
   */
  router.post('/program-subjects/import', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const result = await importRows(pool, req.body, {
        readRow: (record) => {
          const draft = readPairing(record);
          return draft.ok ? { ok: true, draft: draft.values } : draft;
        },
        // The key is the pair, so the two are joined into one value rather than
        // declared as two keys - a file may name one programme many times and
        // one subject many times, and only the same pair twice is a mistake.
        keys: [
          {
            of: (v) => `${v.program_id} ${v.subject_id}`,
            message: REFUSALS.duplicateProgramSubject,
          },
        ],
        verify: async (values) =>
          (await programRefusal(req, values.program_id)) ??
          (await catalogueRefusal(values.subject_id)),
        insert: async (client, values) => {
          try {
            return { ok: true, row: await insertPairing(client, values) };
          } catch (error) {
            if (isDuplicate(error)) return { ok: false, reason: 'duplicateProgramSubject' };
            throw error;
          }
        },
      });

      return sendImport(res, result, 'program_subjects');
    } catch (error) {
      return next(error);
    }
  });

  /** One pairing, for the edit form. */
  router.get(
    '/program-subjects/:programId/:subjectId',
    requireRole(...MAINTAINERS),
    async (req, res, next) => {
      try {
        const pair = await reachable(req, req.params.programId, req.params.subjectId);
        if (!pair) return res.status(404).json({ message: REFUSALS.programSubjectNotFound });
        return res.status(200).json({ program_subject: pair });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * Placing a subject into a programme — the first criterion, and the third and
   * eighth as its two refusals.
   */
  router.post('/program-subjects', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readPairing(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      // The programme first, and 403. Answering the catalogue question ahead of
      // it would tell a caller who holds nothing here whether a subject code
      // exists, which is not theirs to ask.
      const notYours = await programRefusal(req, draft.values.program_id);
      if (notYours) return res.status(403).json({ message: REFUSALS[notYours] });

      const notInCatalogue = await catalogueRefusal(draft.values.subject_id);
      if (notInCatalogue) return res.status(400).json({ message: REFUSALS[notInCatalogue] });

      // `is_active` is deliberately not read here. A subject is put into a
      // curriculum because it is being taught; switching one off is the fifth
      // criterion and happens on a removal, not at birth.
      const pair = await insertPairing(pool, draft.values);
      return res.status(201).json({ program_subject: pair });
    } catch (error) {
      if (isDuplicate(error)) {
        return res.status(409).json({ message: REFUSALS.duplicateProgramSubject });
      }
      return next(error);
    }
  });

  /**
   * Changing one — the second criterion, and the way back from the fifth.
   *
   * The type changes, and `is_active` may be flipped: a pairing that was
   * switched off because something referenced it has to be switchable back on,
   * or the removal would be a one-way door and the subject could never be
   * placed again - the pair is the primary key, so placing it afresh collides
   * with the row that is already there.
   *
   * Neither half of the key is editable. A subject moving between programmes is
   * a removal and a placement, not an edit, because the Offerings, CLOs and
   * marks beneath the pair do not move with a renamed key.
   */
  router.put(
    '/program-subjects/:programId/:subjectId',
    requireRole(...MAINTAINERS),
    async (req, res, next) => {
      try {
        const existing = await reachable(req, req.params.programId, req.params.subjectId);
        if (!existing) return res.status(404).json({ message: REFUSALS.programSubjectNotFound });

        const draft = readPairing(req.body ?? {}, { editing: true });
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        await pool.query(
          `UPDATE program_subjects
              SET subject_type = $3,
                  is_active = coalesce($4, is_active),
                  updated_at = now()
            WHERE program_id = $1 AND subject_id = $2`,
          [
            existing.program_id,
            existing.subject_id,
            draft.values.subject_type,
            typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,
          ],
        );

        return res
          .status(200)
          .json({ program_subject: await loadPair(pool, existing.program_id, existing.subject_id) });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * Taking one out — the fifth criterion, which is not quite a removal.
   *
   * A pairing nothing depends on is deleted and answers 204. One an Offering
   * points at - and, through it, the CLOs, the weighting scheme and every mark
   * ever recorded under them - is switched off instead and answers 200 with the
   * row, so the screen can say which of the two happened rather than guessing.
   * The database decides, through ON DELETE RESTRICT on the five tables that
   * reference the pair, so a sixth added later is covered on the day it is
   * added.
   *
   * Asking the person to confirm first is the sixth criterion and is the
   * screen's job: there is nothing for a server to confirm against, and a
   * request that arrived is a request that was meant.
   */
  router.delete(
    '/program-subjects/:programId/:subjectId',
    requireRole(...MAINTAINERS),
    async (req, res, next) => {
      try {
        const existing = await reachable(req, req.params.programId, req.params.subjectId);
        if (!existing) return res.status(404).json({ message: REFUSALS.programSubjectNotFound });

        const outcome = await deleteOrDeactivate(pool, {
          remove: (client) =>
            client.query('DELETE FROM program_subjects WHERE program_id = $1 AND subject_id = $2', [
              existing.program_id,
              existing.subject_id,
            ]),
          deactivate: (client) =>
            client.query(
              `UPDATE program_subjects SET is_active = false, updated_at = now()
                WHERE program_id = $1 AND subject_id = $2`,
              [existing.program_id, existing.subject_id],
            ),
          load: (client) => loadPair(client, existing.program_id, existing.subject_id),
        });

        if (outcome.deleted) return res.status(204).send();
        if (outcome.missing) {
          return res.status(404).json({ message: REFUSALS.programSubjectNotFound });
        }
        return res.status(200).json({ program_subject: outcome.row, deactivated: true });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { programSubjectRoutes };

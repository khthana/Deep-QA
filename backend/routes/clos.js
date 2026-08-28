'use strict';

/**
 * Course Learning Outcomes — ticket #27.
 *
 * ผลการเรียนรู้รายวิชา: what a รายวิชา teaches towards in one ปีการศึกษา, each
 * one tied to a PLO of the หลักสูตร. ADR-0003 is the whole design of this file
 * in one sentence — the set belongs to a (Program, Subject, academic year) and
 * not to a ตอนเรียน — and five things follow from it that are decisions rather
 * than shape.
 *
 * *The caller arrives holding a Section and the record is not at that grain.*
 * ADR-0004 says Section context is `section_id` in the address and nowhere
 * else, so a Section id is what the screen can send. `offeringOf` turns it into
 * the triple, through the teaching register, on every request. The triple is
 * therefore never read from the body — a body carrying `academic_year` is
 * ignored rather than refused, because refusing it would be telling a caller
 * that the field means something here. That is ADR-0002 as it applies to a
 * screen whose authorisation and whose identity are the same lookup, and it is
 * the single easiest thing in this ticket to get wrong: the triple is right
 * there in the request and it is convenient.
 *
 * *Two teachers of two Sections co-edit one set.* That is what the grain buys
 * and what makes `updated_by` load-bearing rather than an audit column: the
 * seventh criterion asks the screen to say who last touched each row, because
 * with two people editing one list the answer is not obvious. Last write wins,
 * which ADR-0003 chose deliberately over locking.
 *
 * *Only PLOs the coverage grid places on this รายวิชา may be linked.* The
 * second criterion, and the reason it is enforced here rather than left to the
 * foreign key: `subject_clo.plo_id` references `learning_outcomes` through
 * `(program_id, plo_id)`, so the database admits every PLO of the หลักสูตร,
 * including the ones this subject was never mapped to and including the
 * sub-outcomes. `subject_plo_mapping` is the grid, and it is what is asked.
 * `is_active` is in the clause too, ahead of #19 giving anyone a way to switch
 * a PLO off, so that #19 is a change to its own routes and not to this one.
 *
 * *Removal answers three states in three sentences.* The ticket names one — a
 * CLO with marks against it — and the database has opinions about two others
 * that do not match it. `activity_scores.clo_id` restricts, which is the
 * ticket's state; `activity_clo_mapping.clo_id` restricts as soon as an
 * Activity points at the CLO, whether a mark was ever entered or not; and
 * `clo_course_cycle_detail_cloplan.clo_id` *cascades*, so a CLO carrying a
 * course-cycle reflection would be deleted along with it and nobody told. All
 * three are checked before the DELETE. Two of them the database would have
 * caught, and catching them here is still not redundant: a 23503 reaching the
 * handler in app.js answers เกิดข้อผิดพลาดในระบบ, which is the wrong sentence
 * for a thing the person could go and fix. The third the database would not
 * have caught at all. #23's `nonumericguard` is the same lesson one tier up.
 *
 * *A CLO of another year is `cloNotFound` and not 403.* The house answer for a
 * record addressed by id and reached through a scope, all the way back to
 * `departmentNotFound`: one sentence for the row that does not exist and the
 * row that is not reachable from here, so that a caller cannot walk the id
 * space and learn which ids are real.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');

/** The one role these routes open for, spread at the call site as in teaching.js. */
const TEACHING = ['TEACHER'];

/**
 * What a CLO looks like on the screen.
 *
 * The PLO's code and title travel with it because the list shows the ladder
 * rather than a column of integers, and the person's name because the seventh
 * criterion asks for who, not for a `user_id`. Both are joins rather than a
 * second request: a screen fetching a name per row would be nine round trips
 * for a list of nine.
 */
const RETURNED = `c.clo_id, c.clo_number, c.clo_detail,
                  c.teaching_method, c.assessment_method, c.plo_id,
                  p.outcome_code AS plo_code, p.outcome_title AS plo_title,
                  c.updated_by, c.updated_at,
                  trim(both ' ' from concat_ws(' ', u.title_th, u.first_name_th, u.last_name_th))
                    AS updated_by_name`;

const FROM = `FROM subject_clo c
              LEFT JOIN learning_outcomes p
                ON p.program_id = c.program_id AND p.outcome_id = c.plo_id
              LEFT JOIN users u ON u.user_id = c.updated_by`;

/** Blank, whitespace and absent all mean the column stays null. */
function text(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The fields of a CLO that the caller owns, and nothing else.
 *
 * `plo_id` is optional: a CLO may be written before anyone has decided which
 * PLO it serves, and forcing the link at creation would make the screen refuse
 * a half-finished thought. What it may not be is a PLO outside the grid, and
 * that is checked separately because it needs the database.
 */
function readClo(body) {
  const values = {
    clo_number: text(body?.clo_number),
    clo_detail: text(body?.clo_detail),
    teaching_method: text(body?.teaching_method),
    assessment_method: text(body?.assessment_method),
    plo_id: body?.plo_id === undefined || body?.plo_id === null || body?.plo_id === '' ? null : body.plo_id,
  };

  if (!values.clo_number || !values.clo_detail) return { ok: false, reason: 'invalidClo' };
  if (values.plo_id !== null && !/^\d+$/.test(String(values.plo_id))) {
    return { ok: false, reason: 'ploNotMapped' };
  }
  return { ok: true, values };
}

const isDuplicate = (error) => error && error.code === '23505';

/**
 * The Offering behind a Section id, or nothing.
 *
 * The register is the whole of the WHERE clause, exactly as in #24: a
 * colleague's Section is in the same department and is not theirs. Nothing
 * here is restricted to the current term, for #24's reason — a Teacher
 * following a link to last year's Section is asking for a Section they
 * taught, and the dashboard's listing rule is not an authorisation rule.
 *
 * Module-level and exported, as `rubrics.js` exports `reachableRubric` and for
 * the same reason: #28's behaviours are authorised by exactly this question,
 * and two answers to one question drift.
 */
async function offeringOf(pool, req, sectionId) {
  if (!/^\d+$/.test(String(sectionId))) return null;
  const { rows } = await pool.query(
    `SELECT sc.id AS semester_course_id, sc.program_id, sc.subject_id,
            sc.academic_year, sc.semester
       FROM course_sections_teacher cst
       JOIN course_sections cs ON cs.section_id = cst.section_id
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1 AND cst.user_id = $2`,
    [sectionId, req.session.userId],
  );
  return rows[0] ?? null;
}

/** One CLO of this Offering, by id, or nothing — see the note on the grain. */
async function cloOf(pool, offering, cloId) {
  if (!/^\d+$/.test(String(cloId))) return null;
  const { rows } = await pool.query(
    `SELECT ${RETURNED} ${FROM}
      WHERE c.clo_id = $1 AND c.program_id = $2 AND c.subject_id = $3
        AND c.academic_year = $4`,
    [cloId, offering.program_id, offering.subject_id, offering.academic_year],
  );
  return rows[0] ?? null;
}

function cloRoutes(pool) {
  const router = express.Router();

  /** The PLOs of the หลักสูตร that this รายวิชา's coverage grid carries. */
  async function offeredPlos(offering) {
    const { rows } = await pool.query(
      `SELECT lo.outcome_id, lo.outcome_code, lo.outcome_title, lo.outcome_type,
              m.mapping_level
         FROM subject_plo_mapping m
         JOIN learning_outcomes lo
           ON lo.program_id = m.program_id AND lo.outcome_id = m.outcome_id
        WHERE m.program_id = $1 AND m.subject_id = $2 AND lo.is_active
        ORDER BY lo.sequence_order ASC, lo.outcome_id ASC`,
      [offering.program_id, offering.subject_id],
    );
    return rows;
  }

  const load = (cloId) =>
    pool
      .query(`SELECT ${RETURNED} ${FROM} WHERE c.clo_id = $1`, [cloId])
      .then(({ rows }) => rows[0]);

  /** The second criterion, asked of the grid rather than of the foreign key. */
  async function ploRefusal(offering, ploId) {
    if (ploId === null) return null;
    const { rows } = await pool.query(
      `SELECT 1 FROM subject_plo_mapping m
         JOIN learning_outcomes lo
           ON lo.program_id = m.program_id AND lo.outcome_id = m.outcome_id
        WHERE m.program_id = $1 AND m.subject_id = $2 AND m.outcome_id = $3 AND lo.is_active`,
      [offering.program_id, offering.subject_id, ploId],
    );
    return rows[0] ? null : 'ploNotMapped';
  }

  /**
   * Which of the three removal states this CLO is in, worst first.
   *
   * Worst first because a CLO with marks under it is also mapped to the
   * Activity those marks were entered against, and being told to go and unmap
   * an Activity would send the person to a screen that will refuse them.
   */
  async function removalRefusal(cloId) {
    const { rows } = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM activity_scores WHERE clo_id = $1) AS marked,
              EXISTS (SELECT 1 FROM activity_clo_mapping WHERE clo_id = $1) AS mapped,
              EXISTS (SELECT 1 FROM clo_course_cycle_detail_cloplan WHERE clo_id = $1) AS planned`,
      [cloId],
    );
    const { marked, mapped, planned } = rows[0];
    if (marked) return 'cloHasScores';
    if (mapped) return 'cloInUse';
    if (planned) return 'cloInPlan';
    return null;
  }

  /** Everything the screen needs in one request — the first four criteria's read half. */
  router.get(
    '/teaching/sections/:sectionId/clos',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await offeringOf(pool, req, req.params.sectionId);
        if (!offering) return res.status(404).json({ message: REFUSALS.sectionNotFound });

        const { rows } = await pool.query(
          `SELECT ${RETURNED} ${FROM}
            WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3
            ORDER BY c.clo_number ASC, c.clo_id ASC`,
          [offering.program_id, offering.subject_id, offering.academic_year],
        );

        return res
          .status(200)
          .json({ offering, plos: await offeredPlos(offering), clos: rows });
      } catch (error) {
        return next(error);
      }
    },
  );

  /** Adding one — the first criterion. */
  router.post(
    '/teaching/sections/:sectionId/clos',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await offeringOf(pool, req, req.params.sectionId);
        if (!offering) return res.status(404).json({ message: REFUSALS.sectionNotFound });

        const draft = readClo(req.body);
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        const notOffered = await ploRefusal(offering, draft.values.plo_id);
        if (notOffered) return res.status(400).json({ message: REFUSALS[notOffered] });

        const { rows } = await pool.query(
          `INSERT INTO subject_clo (
             program_id, subject_id, academic_year, clo_number, clo_detail,
             teaching_method, assessment_method, plo_id, created_by, updated_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING clo_id`,
          [
            offering.program_id,
            offering.subject_id,
            offering.academic_year,
            draft.values.clo_number,
            draft.values.clo_detail,
            draft.values.teaching_method,
            draft.values.assessment_method,
            draft.values.plo_id,
            req.session.userId,
          ],
        );

        return res.status(201).json({ clo: await load(rows[0].clo_id) });
      } catch (error) {
        // The sixth criterion, answered by the database. The constraint is
        // `(program_id, subject_id, academic_year, clo_number)`, so CLO-1
        // exists once in this year's set and freely in every other year's.
        if (isDuplicate(error)) {
          return res.status(409).json({ message: REFUSALS.duplicateCloNumber });
        }
        return next(error);
      }
    },
  );

  /** Editing one — the first criterion, and the seventh's write half. */
  router.put(
    '/teaching/sections/:sectionId/clos/:cloId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await offeringOf(pool, req, req.params.sectionId);
        if (!offering) return res.status(404).json({ message: REFUSALS.sectionNotFound });

        const existing = await cloOf(pool, offering, req.params.cloId);
        if (!existing) return res.status(404).json({ message: REFUSALS.cloNotFound });

        const draft = readClo(req.body);
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        const notOffered = await ploRefusal(offering, draft.values.plo_id);
        if (notOffered) return res.status(400).json({ message: REFUSALS[notOffered] });

        // `updated_by` and `updated_at` are written together and by the server.
        // The column has a DEFAULT but no trigger, so an UPDATE that left
        // `updated_at` alone would leave the screen showing the hour the row
        // was seeded next to the name of the person who changed it this minute.
        await pool.query(
          `UPDATE subject_clo
              SET clo_number = $2, clo_detail = $3, teaching_method = $4,
                  assessment_method = $5, plo_id = $6,
                  updated_by = $7, updated_at = now()
            WHERE clo_id = $1`,
          [
            existing.clo_id,
            draft.values.clo_number,
            draft.values.clo_detail,
            draft.values.teaching_method,
            draft.values.assessment_method,
            draft.values.plo_id,
            req.session.userId,
          ],
        );

        return res.status(200).json({ clo: await load(existing.clo_id) });
      } catch (error) {
        if (isDuplicate(error)) {
          return res.status(409).json({ message: REFUSALS.duplicateCloNumber });
        }
        return next(error);
      }
    },
  );

  /**
   * Removing one — the eighth criterion, and the ninth's server half.
   *
   * Asking the person to confirm first is the screen's job, as it is for #23's
   * Offering: there is nothing for a server to confirm against, and a request
   * that arrived is a request that was meant.
   */
  router.delete(
    '/teaching/sections/:sectionId/clos/:cloId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await offeringOf(pool, req, req.params.sectionId);
        if (!offering) return res.status(404).json({ message: REFUSALS.sectionNotFound });

        const existing = await cloOf(pool, offering, req.params.cloId);
        if (!existing) return res.status(404).json({ message: REFUSALS.cloNotFound });

        const inUse = await removalRefusal(existing.clo_id);
        if (inUse) return res.status(409).json({ message: REFUSALS[inUse] });

        // The two children are this screen's own records and mean nothing
        // without the CLO, so they go with it. Both are ON DELETE CASCADE
        // already; deleting them explicitly is what makes the statement below
        // fail loudly rather than quietly if a third child is added later
        // without a note here.
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`DELETE FROM subject_clo_measurable_behavior WHERE clo_id = $1`, [
            existing.clo_id,
          ]);
          await client.query(`DELETE FROM subject_clo_achievement_criteria WHERE clo_id = $1`, [
            existing.clo_id,
          ]);
          await client.query(`DELETE FROM subject_clo WHERE clo_id = $1`, [existing.clo_id]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        return res.status(204).send();
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { cloRoutes, offeringOf, cloOf };

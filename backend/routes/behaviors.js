'use strict';

/**
 * Measurable Behaviors — ticket #28.
 *
 * พฤติกรรมบ่งชี้: what a student observably does that evidences a CLO, tagged
 * with a ระดับพุทธิพิสัย and the kind of learning activity it is assessed in.
 * #27 keeps the CLOs; this file keeps what is inside one.
 *
 * *A behaviour is authorised by its CLO and by nothing else.*
 * `subject_clo_measurable_behavior` carries a `clo_id` and no Section, year or
 * Program of its own, so the whole of ADR-0003 arrives by inheritance: the
 * caller stands in a ตอนเรียน, `offeringOf` resolves it to the Offering
 * through the teaching register (ADR-0002), and `cloOf` pins the CLO to that
 * Offering. Both are #27's own functions, imported rather than asked again
 * here — `rubricCriteria.js` does the same with `reachableRubric`, and for the
 * same reason: two answers to one question drift, and the day they drift is
 * the day a behaviour is writable through a Section that is not the caller's.
 *
 * *The behaviour must belong to the CLO in the address.* Every row lookup is
 * `WHERE id = $1 AND clo_id = $2`, never `WHERE id = $1` alone — #22's lesson
 * one grain over. Without the second half, CLO-1's address could edit CLO-2's
 * behaviour: the CLO check would pass, the row would be found by its own id,
 * and nothing would ever require the two to agree.
 *
 * *The number is position, and position is the server's.* The inherited screen
 * numbered behaviours 1..N and renumbered the remainder on delete so the list
 * never shows a gap; migration 0002 kept `(clo_id, behavior_no)` unique on
 * that understanding, and this file keeps the behaviour. A number in the body
 * is ignored rather than refused, for the reason #27 ignores a year in the
 * body: refusing it would be telling a caller the field means something here.
 * The add locks the CLO row first, so two teachers adding together get 3 and 4
 * rather than both computing 3 and one of them a 23505. The renumbering loop
 * walks ORDER BY behavior_no ASC and deletion only ever frees a lower number,
 * so each row moves into a number that is already vacant — the migration's
 * note, relied on here.
 *
 * *The two enums are checked in code, ahead of the database.* A stray value
 * would be refused by the type anyway, but as a 22P02 reaching the handler in
 * app.js — เกิดข้อผิดพลาดในระบบ for a value the person picked from a list the
 * screen drew. The route answers `invalidBehavior` instead, on either verb.
 * The lists mirror the enums of migration 0002: R064's six cognitive levels,
 * and R063's four learning activities (quiz is §8's word and deliberately not
 * a value — the exact stray a screen ported from the old app would send).
 *
 * *Removal has no guard, and that is the schema's answer.* Nothing references
 * `subject_clo_measurable_behavior`; a behaviour is a description, not a thing
 * marks attach to. The confirmation the sixth criterion asks for is the
 * screen's, as it is everywhere else in this system.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { offeringOf, cloOf } = require('./clos');

/** The one role these routes open for, spread at the call site as in clos.js. */
const TEACHING = ['TEACHER'];

/** R064's six, in Bloom's order — the enum of migration 0002, mirrored. */
const COGNITIVE_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

/** R063's four — the enum of migration 0002, mirrored. */
const LEARNING_ACTIVITIES = ['exam', 'exercise', 'homework', 'assigned_work'];

const RETURNED = `id, clo_id, behavior_no, behavior_detail,
                  learning_activity, cognitive_level, updated_at`;

/** Blank, whitespace and absent all mean the field was not given. */
function text(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The fields of a behaviour that the caller owns, and nothing else.
 *
 * `behavior_no` and `clo_id` are deliberately not read — the number is the
 * server's and the CLO is the address's. The same function serves both verbs,
 * as every `read*` in this system does.
 */
function readBehavior(source) {
  const values = {
    behavior_detail: text(source?.behavior_detail),
    cognitive_level: text(source?.cognitive_level),
    learning_activity: text(source?.learning_activity),
  };

  if (!values.behavior_detail) return { ok: false, reason: 'invalidBehavior' };
  if (!COGNITIVE_LEVELS.includes(values.cognitive_level)) {
    return { ok: false, reason: 'invalidBehavior' };
  }
  if (!LEARNING_ACTIVITIES.includes(values.learning_activity)) {
    return { ok: false, reason: 'invalidBehavior' };
  }
  return { ok: true, values };
}

function behaviorRoutes(pool) {
  const router = express.Router();

  /**
   * The CLO behind the two ids in the address, or a refusal already sent.
   *
   * Both routes' opening moves are the same two lookups with the same two
   * sentences, so they live once. Returns null after answering, which is the
   * signal to stop.
   */
  async function reached(req, res) {
    const offering = await offeringOf(pool, req, req.params.sectionId);
    if (!offering) {
      res.status(404).json({ message: REFUSALS.sectionNotFound });
      return null;
    }
    const clo = await cloOf(pool, offering, req.params.cloId);
    if (!clo) {
      res.status(404).json({ message: REFUSALS.cloNotFound });
      return null;
    }
    return { offering, clo };
  }

  /** One behaviour of this CLO, by id — the pairing, never the id alone. */
  async function behaviorOf(cloId, behaviorId) {
    if (!/^\d+$/.test(String(behaviorId))) return null;
    const { rows } = await pool.query(
      `SELECT ${RETURNED} FROM subject_clo_measurable_behavior
        WHERE id = $1 AND clo_id = $2`,
      [behaviorId, cloId],
    );
    return rows[0] ?? null;
  }

  const listOf = (cloId) =>
    pool
      .query(
        `SELECT ${RETURNED} FROM subject_clo_measurable_behavior
          WHERE clo_id = $1 ORDER BY behavior_no ASC`,
        [cloId],
      )
      .then(({ rows }) => rows);

  /** The read half of the first criterion, and the screen's whole context. */
  router.get(
    '/teaching/sections/:sectionId/clos/:cloId/behaviors',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const found = await reached(req, res);
        if (!found) return undefined;

        return res.status(200).json({
          offering: found.offering,
          clo: found.clo,
          behaviors: await listOf(found.clo.clo_id),
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /** Adding one — the server assigns the next number, under a lock on the CLO. */
  router.post(
    '/teaching/sections/:sectionId/clos/:cloId/behaviors',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const found = await reached(req, res);
        if (!found) return undefined;

        const draft = readBehavior(req.body);
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        const client = await pool.connect();
        let created;
        try {
          await client.query('BEGIN');
          // The lock serialises adds per CLO, so two teachers adding together
          // are numbered 3 then 4 instead of racing to one 3.
          await client.query(`SELECT clo_id FROM subject_clo WHERE clo_id = $1 FOR UPDATE`, [
            found.clo.clo_id,
          ]);
          const { rows } = await client.query(
            `INSERT INTO subject_clo_measurable_behavior (
               clo_id, behavior_no, behavior_detail, learning_activity, cognitive_level
             )
             SELECT $1, COALESCE(MAX(behavior_no), 0) + 1, $2, $3, $4
               FROM subject_clo_measurable_behavior WHERE clo_id = $1
             RETURNING ${RETURNED}`,
            [
              found.clo.clo_id,
              draft.values.behavior_detail,
              draft.values.learning_activity,
              draft.values.cognitive_level,
            ],
          );
          await client.query('COMMIT');
          [created] = rows;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        return res.status(201).json({ behavior: created });
      } catch (error) {
        return next(error);
      }
    },
  );

  /** Editing one — the substance changes, the number never does. */
  router.put(
    '/teaching/sections/:sectionId/clos/:cloId/behaviors/:behaviorId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const found = await reached(req, res);
        if (!found) return undefined;

        const existing = await behaviorOf(found.clo.clo_id, req.params.behaviorId);
        if (!existing) return res.status(404).json({ message: REFUSALS.behaviorNotFound });

        const draft = readBehavior(req.body);
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        const { rows } = await pool.query(
          `UPDATE subject_clo_measurable_behavior
              SET behavior_detail = $3, learning_activity = $4, cognitive_level = $5,
                  updated_at = now()
            WHERE id = $1 AND clo_id = $2
            RETURNING ${RETURNED}`,
          [
            existing.id,
            found.clo.clo_id,
            draft.values.behavior_detail,
            draft.values.learning_activity,
            draft.values.cognitive_level,
          ],
        );

        // The row can vanish between `behaviorOf` and the UPDATE — a colleague
        // removing it from the other Section — and an UPDATE that matched
        // nothing must not be dressed up as a 200 with nothing inside.
        if (!rows[0]) return res.status(404).json({ message: REFUSALS.behaviorNotFound });
        return res.status(200).json({ behavior: rows[0] });
      } catch (error) {
        return next(error);
      }
    },
  );

  /** Removing one, and closing the gap it leaves. */
  router.delete(
    '/teaching/sections/:sectionId/clos/:cloId/behaviors/:behaviorId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const found = await reached(req, res);
        if (!found) return undefined;

        const existing = await behaviorOf(found.clo.clo_id, req.params.behaviorId);
        if (!existing) return res.status(404).json({ message: REFUSALS.behaviorNotFound });

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`SELECT clo_id FROM subject_clo WHERE clo_id = $1 FOR UPDATE`, [
            found.clo.clo_id,
          ]);
          await client.query(
            `DELETE FROM subject_clo_measurable_behavior WHERE id = $1 AND clo_id = $2`,
            [existing.id, found.clo.clo_id],
          );
          // Ascending, so each row moves into a number the delete or the
          // previous step has already vacated — the unique constraint holds at
          // every point in between.
          const { rows } = await client.query(
            `SELECT id, behavior_no FROM subject_clo_measurable_behavior
              WHERE clo_id = $1 ORDER BY behavior_no ASC`,
            [found.clo.clo_id],
          );
          for (const [index, row] of rows.entries()) {
            if (row.behavior_no !== index + 1) {
              await client.query(
                `UPDATE subject_clo_measurable_behavior SET behavior_no = $2 WHERE id = $1`,
                [row.id, index + 1],
              );
            }
          }
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

module.exports = { behaviorRoutes };

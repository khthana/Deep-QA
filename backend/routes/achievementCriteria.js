'use strict';

/**
 * Achievement Criteria — ticket #29.
 *
 * เกณฑ์การบรรลุผล: what performance looks like at each of the four bands, so a
 * raw mark can be translated into an attainment level rather than judged ad
 * hoc. #27 keeps the CLOs, #28 keeps what a student observably does inside
 * one; this file keeps what counts as having done it well.
 *
 * The file is behaviors.js one table over, and deliberately so — the two are
 * the child tables of one CLO and every argument there holds here unchanged:
 * a criterion is authorised by its CLO and by nothing else (`offeringOf` and
 * `cloOf` imported from #27, never asked again); every row lookup is
 * `WHERE id = $1 AND clo_id = $2` (#22's lesson one grain over); and the
 * number is position, the server's to assign under a lock on the CLO and the
 * server's to close up on delete. What differs is worth listing, because it
 * is all that is new:
 *
 * *The band is a CHECK, not an enum, and the four values are Thai.* Migration
 * 0002 keeps `achievement_level` a varchar CHECK because the same four words
 * appear on rubrics and on evidence in later tickets, and a CHECK can be
 * widened in one table. The route still refuses a stray value in code, ahead
 * of the database, for the reason #28 does: a 23514 reaching the handler in
 * app.js is เกิดข้อผิดพลาดในระบบ for a value the person picked from a list
 * the screen drew. The four are *not* unique per CLO — the ticket says a CLO
 * *can* carry one per band, and the seed writes exactly that, but a
 * constraint saying *must* would be invented here, not found anywhere.
 *
 * *The description is optional.* `criteria_description` is the one nullable
 * text on the table; blank, whitespace and absent all store NULL rather than
 * '', so an edit that clears the box clears the column.
 *
 * *Removal has no guard, and that is the schema's answer.* Nothing references
 * `subject_clo_achievement_criteria`; the confirmation the sixth criterion
 * asks for is the screen's, as it is everywhere else in this system.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { offeringOf, cloOf } = require('./clos');

/** The one role these routes open for, spread at the call site as in clos.js. */
const TEACHING = ['TEACHER'];

/** The four bands of migration 0002's CHECK, best first — the rubric's own vocabulary. */
const ACHIEVEMENT_LEVELS = ['ดีเยี่ยม', 'ดี', 'พอใช้', 'ต้องปรับปรุง'];

const RETURNED = `id, clo_id, criteria_no, achievement_level,
                  criteria_detail, criteria_description, updated_at`;

/** Blank, whitespace and absent all mean the field was not given. */
function text(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The fields of a criterion that the caller owns, and nothing else.
 *
 * `criteria_no` and `clo_id` are deliberately not read — the number is the
 * server's and the CLO is the address's. The description is the one field
 * allowed to come back null.
 */
function readCriterion(source) {
  const values = {
    achievement_level: text(source?.achievement_level),
    criteria_detail: text(source?.criteria_detail),
    criteria_description: text(source?.criteria_description),
  };

  if (!values.criteria_detail) return { ok: false, reason: 'invalidAchievement' };
  if (!ACHIEVEMENT_LEVELS.includes(values.achievement_level)) {
    return { ok: false, reason: 'invalidAchievement' };
  }
  return { ok: true, values };
}

function achievementRoutes(pool) {
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

  /** One criterion of this CLO, by id — the pairing, never the id alone. */
  async function criterionOf(cloId, criterionId) {
    if (!/^\d+$/.test(String(criterionId))) return null;
    const { rows } = await pool.query(
      `SELECT ${RETURNED} FROM subject_clo_achievement_criteria
        WHERE id = $1 AND clo_id = $2`,
      [criterionId, cloId],
    );
    return rows[0] ?? null;
  }

  const listOf = (cloId) =>
    pool
      .query(
        `SELECT ${RETURNED} FROM subject_clo_achievement_criteria
          WHERE clo_id = $1 ORDER BY criteria_no ASC`,
        [cloId],
      )
      .then(({ rows }) => rows);

  /** The read half of the first criterion, and the screen's whole context. */
  router.get(
    '/teaching/sections/:sectionId/clos/:cloId/criteria',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const found = await reached(req, res);
        if (!found) return undefined;

        return res.status(200).json({
          offering: found.offering,
          clo: found.clo,
          criteria: await listOf(found.clo.clo_id),
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /** Adding one — the server assigns the next number, under a lock on the CLO. */
  router.post(
    '/teaching/sections/:sectionId/clos/:cloId/criteria',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const found = await reached(req, res);
        if (!found) return undefined;

        const draft = readCriterion(req.body);
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        const client = await pool.connect();
        let created;
        try {
          await client.query('BEGIN');
          // The lock serialises adds per CLO, so two teachers adding together
          // are numbered 5 then 6 instead of racing to one 5.
          await client.query(`SELECT clo_id FROM subject_clo WHERE clo_id = $1 FOR UPDATE`, [
            found.clo.clo_id,
          ]);
          const { rows } = await client.query(
            `INSERT INTO subject_clo_achievement_criteria (
               clo_id, criteria_no, achievement_level, criteria_detail, criteria_description
             )
             SELECT $1, COALESCE(MAX(criteria_no), 0) + 1, $2, $3, $4
               FROM subject_clo_achievement_criteria WHERE clo_id = $1
             RETURNING ${RETURNED}`,
            [
              found.clo.clo_id,
              draft.values.achievement_level,
              draft.values.criteria_detail,
              draft.values.criteria_description,
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

        return res.status(201).json({ criterion: created });
      } catch (error) {
        return next(error);
      }
    },
  );

  /** Editing one — the substance changes, the number never does. */
  router.put(
    '/teaching/sections/:sectionId/clos/:cloId/criteria/:criterionId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const found = await reached(req, res);
        if (!found) return undefined;

        const existing = await criterionOf(found.clo.clo_id, req.params.criterionId);
        if (!existing) return res.status(404).json({ message: REFUSALS.achievementNotFound });

        const draft = readCriterion(req.body);
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        const { rows } = await pool.query(
          `UPDATE subject_clo_achievement_criteria
              SET achievement_level = $3, criteria_detail = $4, criteria_description = $5,
                  updated_at = now()
            WHERE id = $1 AND clo_id = $2
            RETURNING ${RETURNED}`,
          [
            existing.id,
            found.clo.clo_id,
            draft.values.achievement_level,
            draft.values.criteria_detail,
            draft.values.criteria_description,
          ],
        );

        // The row can vanish between `criterionOf` and the UPDATE — a
        // colleague removing it from the other Section — and an UPDATE that
        // matched nothing must not be dressed up as a 200 with nothing inside.
        if (!rows[0]) return res.status(404).json({ message: REFUSALS.achievementNotFound });
        return res.status(200).json({ criterion: rows[0] });
      } catch (error) {
        return next(error);
      }
    },
  );

  /** Removing one, and closing the gap it leaves. */
  router.delete(
    '/teaching/sections/:sectionId/clos/:cloId/criteria/:criterionId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const found = await reached(req, res);
        if (!found) return undefined;

        const existing = await criterionOf(found.clo.clo_id, req.params.criterionId);
        if (!existing) return res.status(404).json({ message: REFUSALS.achievementNotFound });

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`SELECT clo_id FROM subject_clo WHERE clo_id = $1 FOR UPDATE`, [
            found.clo.clo_id,
          ]);
          await client.query(
            `DELETE FROM subject_clo_achievement_criteria WHERE id = $1 AND clo_id = $2`,
            [existing.id, found.clo.clo_id],
          );
          // Ascending, so each row moves into a number the delete or the
          // previous step has already vacated — the unique constraint holds at
          // every point in between.
          const { rows } = await client.query(
            `SELECT id, criteria_no FROM subject_clo_achievement_criteria
              WHERE clo_id = $1 ORDER BY criteria_no ASC`,
            [found.clo.clo_id],
          );
          for (const [index, row] of rows.entries()) {
            if (row.criteria_no !== index + 1) {
              await client.query(
                `UPDATE subject_clo_achievement_criteria SET criteria_no = $2 WHERE id = $1`,
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

module.exports = { achievementRoutes };

'use strict';

/**
 * Weighting scheme — ticket #30.
 *
 * สัดส่วนคะแนน: how the Subject's marks are divided — โครงงาน 40, กลางภาค 30,
 * ปลายภาค 30 — so Activities can be filed under a category and marks roll up
 * on one basis. ADR-0003 puts the scheme at (Program, Subject, year):
 * `subject_score_ratio` carries that grain and a real foreign key into
 * program_subjects, the Section in the address is only how the caller proves
 * they may be here (`offeringOf`, imported from #27 as everything at this
 * grain imports it), and every Section of the Offering reads one scheme.
 *
 * *The scheme is saved whole, because the rule is about the whole.* BR-05 —
 * the weights total 100 — cannot survive per-row verbs: adding a category to
 * a complete scheme passes through 110, and the inherited app's separate
 * delete endpoint let the total drift silently below. So the one write is a
 * PUT of the entire list; a list that does not total 100 is refused with the
 * current total in the sentence (the ticket's second criterion), and the
 * empty list is a total of 0, not a way around the rule.
 *
 * *Rows keep their identity across saves.* `activities.score_ratio_id` and
 * `activity_clo_mapping.score_ratio_id` point at these rows, so the PUT
 * reconciles rather than replaces: a row claimed by id — or by name, which is
 * how the import claims — is UPDATEd in place, a row no longer claimed is
 * deleted behind the in-use guard, and only what is genuinely new is
 * inserted. Claims by id are paired with the grain (#22's lesson at this
 * tier): an id of another Offering's row answers `weightNotFound`, never a
 * write into someone else's year.
 *
 * *Renames pass through temporary names.* (grain, score_category) is unique
 * and not deferrable, so two rows trading names collide at every order of
 * plain UPDATEs. Rows whose category changes are first parked on a name no
 * request can carry — a leading space, which `text()` trims off everything a
 * caller sends — then everything is written as sent: two extra statements on
 * the rare save that renames, none on the common one.
 *
 * *Deletion is guarded here, not left to the constraint.* Both referencing
 * tables RESTRICT, but a 23503 reaching app.js is เกิดข้อผิดพลาดในระบบ for a
 * thing the person can fix; the route asks first and the sentence names the
 * category, because the save that was refused named several.
 *
 * *The import is the shared module with this ticket's two extensions.*
 * `lib/importer` already owned per-row reporting, duplicate lines and
 * nothing-partially-applied; what #30 adds is `whole` (the file-level total,
 * refused with the total in the sentence) and an `onCommit` that may refuse
 * (the replace semantics: what the file no longer names is deleted, behind
 * the same in-use guard). Rows are matched to existing categories by name and
 * upserted, so a re-imported file updates the rows Activities point at rather
 * than stranding them.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { boundedInteger } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { offeringOf } = require('./clos');

/** The one role these routes open for, spread at the call site as in clos.js. */
const TEACHING = ['TEACHER'];

const IMPORT_COLUMNS = ['score_category', 'weight'];

const RETURNED = `score_ratio_id, sequence_order, score_category, weight, updated_at`;

/** Blank, whitespace and absent all mean the field was not given. */
function text(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * A weight as the schema means it: an integer from 0 to 100.
 *
 * A JSON number and a spreadsheet cell both arrive here, so both shapes are
 * read; 40.5 and สี่สิบ are refused rather than rounded, because a weight the
 * server silently changed is a total the person cannot reconcile.
 */
const readWeight = (value) => boundedInteger(value, { min: 0, max: 100 });

/** One row of the scheme as the caller owns it: a name and a weight. */
function readCategory(source) {
  const values = {
    score_category: text(source?.score_category),
    weight: readWeight(source?.weight),
  };
  if (!values.score_category || values.weight === null) {
    return { ok: false, reason: 'invalidWeight' };
  }
  return { ok: true, values };
}

const total = (rows) => rows.reduce((sum, row) => sum + row.weight, 0);

/**
 * A category name no request can carry, for a row mid-rename: `text()` trims
 * everything a caller sends, so a leading space can never arrive from
 * outside. The rename pass and `text()` are bound by this convention —
 * whoever stops trimming must find these rows a new hiding place.
 */
const parkedName = (scoreRatioId) => ' ' + scoreRatioId;

function weightRoutes(pool) {
  const router = express.Router();

  /** The Offering behind the address, or the refusal already sent. */
  async function reached(req, res) {
    const offering = await offeringOf(pool, req, req.params.sectionId);
    if (!offering) {
      res.status(404).json({ message: REFUSALS.sectionNotFound });
      return null;
    }
    return offering;
  }

  const listOf = (offering, runner = pool) =>
    runner
      .query(
        `SELECT ${RETURNED} FROM subject_score_ratio
          WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3
          ORDER BY sequence_order ASC, score_ratio_id ASC`,
        [offering.program_id, offering.subject_id, offering.academic_year],
      )
      .then(({ rows }) => rows);

  /**
   * Whether anything is filed under this row — Activities, or the mapping
   * rows that divide an Activity's marks between CLOs. Both RESTRICT; the
   * question is asked here so the answer can be a sentence naming the หมวด.
   */
  async function inUse(runner, scoreRatioId) {
    const { rows } = await runner.query(
      `SELECT 1 FROM activities WHERE score_ratio_id = $1
       UNION ALL
       SELECT 1 FROM activity_clo_mapping WHERE score_ratio_id = $1
       LIMIT 1`,
      [scoreRatioId],
    );
    return rows.length > 0;
  }

  /** The scheme, with the Offering for the heading. */
  router.get(
    '/teaching/sections/:sectionId/weights',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await reached(req, res);
        if (!offering) return undefined;
        return res.status(200).json({ offering, weights: await listOf(offering) });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * The one write: the whole scheme, reconciled against what is there.
   *
   * Order inside the transaction: park renames on temporary names, delete
   * what is no longer claimed (guarded), update what is, insert what is new.
   * Deletes come before the final updates and inserts so a name a deleted row
   * held is free for whoever takes it.
   */
  router.put(
    '/teaching/sections/:sectionId/weights',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await reached(req, res);
        if (!offering) return undefined;

        const sent = Array.isArray(req.body?.weights) ? req.body.weights : null;
        if (!sent) return res.status(400).json({ message: REFUSALS.invalidWeight });

        const rows = [];
        for (const source of sent) {
          const draft = readCategory(source);
          if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });
          const id = /^\d+$/.test(String(source?.score_ratio_id ?? ''))
            ? Number(source.score_ratio_id)
            : null;
          rows.push({ ...draft.values, score_ratio_id: id });
        }

        const names = rows.map((row) => row.score_category);
        if (new Set(names).size !== names.length) {
          return res.status(400).json({ message: REFUSALS.duplicateWeightCategory });
        }

        // BR-05, and the ticket's second criterion: the sentence carries the
        // total the request actually summed to.
        if (total(rows) !== 100) {
          return res.status(400).json({ message: REFUSALS.weightsNotHundred(total(rows)) });
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { rows: existing } = await client.query(
            `SELECT score_ratio_id, score_category FROM subject_score_ratio
              WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3
              ORDER BY sequence_order ASC FOR UPDATE`,
            [offering.program_id, offering.subject_id, offering.academic_year],
          );
          const byId = new Map(existing.map((row) => [row.score_ratio_id, row]));
          const byName = new Map(existing.map((row) => [row.score_category, row]));

          // Resolve every sent row to the existing row it claims — ids first,
          // then names against what the ids left unclaimed, and each existing
          // row claimable once. Without that, a save that renamed row X by id
          // while a new row reused X's old name would resolve both onto X:
          // two UPDATEs, no INSERT, and a committed scheme that no longer
          // totals 100 after passing its own check. An id this Offering does
          // not hold is the pairing refusal — it may be perfectly real under
          // another year.
          const resolved = new Array(rows.length).fill(null);
          const claimed = new Map();
          for (const [index, row] of rows.entries()) {
            if (row.score_ratio_id === null) continue;
            const held = byId.get(row.score_ratio_id) ?? null;
            if (!held) {
              await client.query('ROLLBACK');
              return res.status(404).json({ message: REFUSALS.weightNotFound });
            }
            if (claimed.has(held.score_ratio_id)) {
              await client.query('ROLLBACK');
              return res.status(400).json({ message: REFUSALS.invalidWeight });
            }
            claimed.set(held.score_ratio_id, row);
            resolved[index] = held;
          }
          for (const [index, row] of rows.entries()) {
            if (row.score_ratio_id !== null) continue;
            const held = byName.get(row.score_category) ?? null;
            if (held && !claimed.has(held.score_ratio_id)) {
              claimed.set(held.score_ratio_id, row);
              resolved[index] = held;
            }
          }

          // What no row claims is being removed — the guard, then the delete.
          for (const row of existing) {
            if (claimed.has(row.score_ratio_id)) continue;
            if (await inUse(client, row.score_ratio_id)) {
              await client.query('ROLLBACK');
              return res.status(400).json({ message: REFUSALS.weightInUse(row.score_category) });
            }
          }

          // Renames park on a name nobody can type, so two rows trading
          // names never collide with the unique key mid-save.
          for (const row of existing) {
            const claim = claimed.get(row.score_ratio_id);
            if (claim && claim.score_category !== row.score_category) {
              await client.query(
                `UPDATE subject_score_ratio SET score_category = $2 WHERE score_ratio_id = $1`,
                [row.score_ratio_id, parkedName(row.score_ratio_id)],
              );
            }
          }

          for (const row of existing) {
            if (!claimed.has(row.score_ratio_id)) {
              await client.query(`DELETE FROM subject_score_ratio WHERE score_ratio_id = $1`, [
                row.score_ratio_id,
              ]);
            }
          }

          for (const [index, row] of rows.entries()) {
            const held = resolved[index];
            if (held) {
              await client.query(
                `UPDATE subject_score_ratio
                    SET sequence_order = $2, score_category = $3, weight = $4, updated_at = now()
                  WHERE score_ratio_id = $1`,
                [held.score_ratio_id, index + 1, row.score_category, row.weight],
              );
            } else {
              await client.query(
                `INSERT INTO subject_score_ratio (
                   program_id, subject_id, academic_year, sequence_order, score_category, weight
                 ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  offering.program_id,
                  offering.subject_id,
                  offering.academic_year,
                  index + 1,
                  row.score_category,
                  row.weight,
                ],
              );
            }
          }

          const weights = await listOf(offering, client);
          await client.query('COMMIT');
          return res.status(200).json({ weights });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * The blank file — declared before the import route as enrolment's is, and
   * with an example scheme of one category, which the in-use guard answers if
   * anyone uploads it unedited over a scheme Activities are filed under.
   */
  router.get(
    '/teaching/sections/:sectionId/weights/import-template',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        if (!(await reached(req, res))) return undefined;
        return sendTemplate(res, 'weighting-scheme-template.csv', IMPORT_COLUMNS, {
          score_category: 'คะแนนเก็บ',
          weight: 100,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * A spreadsheet of the whole scheme — the seventh criterion.
   *
   * Rows are upserted by category name, so a file that re-states the scheme
   * updates the rows Activities point at; `whole` is the hundred rule with
   * the file's own total; and `onCommit` removes what the file no longer
   * names, refusing — nothing applied — when that row is in use.
   */
  router.post(
    '/teaching/sections/:sectionId/weights/import',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await reached(req, res);
        if (!offering) return undefined;

        let sequence = 0;
        const kept = [];
        const result = await importRows(pool, req.body, {
          required: IMPORT_COLUMNS,
          readRow: (record) => {
            const draft = readCategory(record);
            return draft.ok ? { ok: true, draft: draft.values } : draft;
          },
          keys: [
            { of: (values) => values.score_category, message: REFUSALS.duplicateWeightCategory },
          ],
          whole: (drafts) =>
            total(drafts) === 100 ? null : REFUSALS.weightsNotHundred(total(drafts)),
          insert: async (client, values) => {
            sequence += 1;
            kept.push(values.score_category);
            const { rows } = await client.query(
              `INSERT INTO subject_score_ratio (
                 program_id, subject_id, academic_year, sequence_order, score_category, weight
               ) VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (program_id, subject_id, academic_year, score_category)
               DO UPDATE SET sequence_order = EXCLUDED.sequence_order,
                             weight = EXCLUDED.weight, updated_at = now()
               RETURNING ${RETURNED}`,
              [
                offering.program_id,
                offering.subject_id,
                offering.academic_year,
                sequence,
                values.score_category,
                values.weight,
              ],
            );
            return { ok: true, row: rows[0] };
          },
          onCommit: async (client) => {
            const { rows } = await client.query(
              `SELECT score_ratio_id, score_category FROM subject_score_ratio
                WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3
                  AND NOT (score_category = ANY($4))
                ORDER BY sequence_order ASC`,
              [offering.program_id, offering.subject_id, offering.academic_year, kept],
            );
            for (const row of rows) {
              if (await inUse(client, row.score_ratio_id)) {
                return { ok: false, message: REFUSALS.weightInUse(row.score_category) };
              }
            }
            for (const row of rows) {
              await client.query(`DELETE FROM subject_score_ratio WHERE score_ratio_id = $1`, [
                row.score_ratio_id,
              ]);
            }
            return undefined;
          },
        });
        return sendImport(res, result, 'weights');
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { weightRoutes };

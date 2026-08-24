'use strict';

/**
 * Rubric criteria — ticket #22.
 *
 * เกณฑ์การให้คะแนนของ Rubric: what a rubric actually scores on. A criterion is
 * a Thai name, an English name, a weight, a place in a list, and four
 * descriptions — one for each achievement band — so that a marker can tell
 * excellent work from adequate work without having to invent the difference.
 * #21 keeps the rubrics; this file keeps what is inside one.
 *
 * Four things here are decisions rather than habit.
 *
 * *A criterion is authorised by its rubric and by nothing else.*
 * `rubric_details` holds no `program_id`, so there is no reach to derive and no
 * curriculum to name in a body. What decides whether this request may write is
 * the rubric in the address, which is exactly the question #21's
 * `reachableRubric` answers — imported rather than asked again here, because
 * two answers to one question drift, and the day they drift is the day a
 * criterion is writable through a rubric that is not.
 *
 * *The criterion must belong to the rubric in the address.* Every read and
 * every write is `WHERE id = $1 AND rubric_id = $2`, never `WHERE id = $1`
 * alone. Without the second half, an account that reaches rubric A could edit
 * B's criterion by addressing it as `/rubrics/A/criteria/<B's id>`: the parent
 * check would pass, the row would be found by its own id, and nothing would
 * ever require the two to agree. That is the ticket's sixth criterion failing
 * while the route looks correct, and it is the reason the suite tests the
 * pairing with two rubrics of the *same* account, where reach is doing none of
 * the work.
 *
 * *All four bands are required, though all four columns are nullable.*
 * `level_1_description` through `level_4_description` are `text` with no `NOT
 * NULL`, and the ticket's third criterion says a criterion carries a
 * description for all four. So the route is stricter than its schema on
 * purpose, exactly as #21 is about `rubrics.program_id`. A rubric whose bands
 * are half-written is worse than one with no rubric at all: it looks like
 * guidance and gives none, and the marker who reads it fills the gap with their
 * own judgement, which is the thing a rubric exists to remove.
 *
 * *A weight is read out as a number.* `weight` is `numeric(5,2)`, and
 * node-postgres reads `numeric` back as a *string* — `'1.00'`, not `1` —
 * because the type is wider than a JavaScript double and the driver will not
 * quietly narrow it. Here it cannot overflow one: five digits with two after
 * the point is exact in binary floating point, so the column is cast on the way
 * out and the JSON carries a number. A screen given the raw string would say
 * 12.50 where a person wrote 12.5, and anything that added two weights together
 * would concatenate them.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull } = require('../lib/fields');
const { reachableRubric, MAINTAINERS } = require('./rubrics');

/**
 * What a criterion is, as this file reads it out.
 *
 * `rubric_id` is returned though the caller already knows it from the address:
 * it is what the edit test asserts against when a body tries to send a
 * different one, and a row that cannot say which rubric it is under cannot be
 * checked.
 *
 * `weight::float8` is the cast the note at the top of the file is about.
 */
const RETURNED = `d.id, d.rubric_id, d.criteria_name_th, d.criteria_name_en,
                  d.weight::float8 AS weight,
                  d.level_4_description, d.level_3_description,
                  d.level_2_description, d.level_1_description,
                  d.display_order, d.updated_at,
                  trim(both ' ' from concat_ws(' ', u.title_th, u.first_name_th, u.last_name_th))
                    AS updated_by_name`;

const FROM = `FROM rubric_details d LEFT JOIN users u ON u.user_id = d.updated_by`;

/** The four bands, highest first, which is the order the screen draws them in. */
const BANDS = [
  'level_4_description',
  'level_3_description',
  'level_2_description',
  'level_1_description',
];

/**
 * One criterion's worth of fields, from the form.
 *
 * The same function serves both verbs, as every `read*` on this system does:
 * an edit that was allowed to omit a band would be a way of emptying one that
 * creation refuses to leave empty.
 *
 * `rubric_id` is deliberately not read. The rubric is the address, and a form
 * that sends it anyway - the screen's does, because it knows which rubric it is
 * on - must not be able to move a criterion under another rubric. That is #21's
 * hole about `program_id` on an edit, one tier down, and it matters more here:
 * a criterion carries no curriculum of its own, so it would follow a rubric
 * anywhere without anything noticing.
 */
function readCriterion(source) {
  const values = {
    criteria_name_th: blankToNull(source.criteria_name_th),
    criteria_name_en: blankToNull(source.criteria_name_en),
    weight: blankToNull(source.weight),
    display_order: blankToNull(source.display_order),
  };

  if (!values.criteria_name_th || !values.criteria_name_en) {
    return { ok: false, reason: 'invalidCriterion' };
  }

  for (const band of BANDS) {
    // `blankToNull` before the test, not `!source[band]`: a description typed
    // as spaces passes a `text` column and describes nothing, and that is what
    // a form sends when somebody tabs through the box.
    const description = blankToNull(source[band]);
    if (!description) return { ok: false, reason: 'invalidCriterion' };
    values[band] = description;
  }

  // The null check is not redundant with the range check below it: `Number(null)`
  // is 0, and zero is refused for a reason of its own further down, so a form
  // submitted with the weight box empty would be refused for the wrong reason
  // and the person would be told to fix a number they never typed.
  if (values.weight === null) return { ok: false, reason: 'invalidCriterion' };
  const weight = Number(values.weight);
  // `Number.isFinite` and not `!Number.isNaN`: Infinity is not NaN and is not a
  // weight either, and it reaches the column as 22003.
  if (!Number.isFinite(weight)) return { ok: false, reason: 'invalidCriterion' };
  // Zero is refused as a decision rather than as arithmetic. A criterion
  // weighted nothing is scored, shown, and counts for nothing, which is a
  // mistake that looks exactly like a setting; nothing on this system reads a
  // zero weight as "leave this one out", and the way to leave a criterion out
  // is to remove it. 999.99 is where `numeric(5,2)` ends - past it the INSERT
  // raises 22003, which this route has no key for.
  if (weight <= 0 || weight > 999.99) return { ok: false, reason: 'invalidCriterion' };
  // Two decimal places is the column's scale. A third is not refused by
  // PostgreSQL: it is rounded, silently, so the row that comes back is not the
  // row that was sent and the person is never told.
  //
  // The comparison is against a tolerance and not `Math.round(w * 100) !== w *
  // 100`, which is the form this was first written in and which refuses 1.1,
  // 8.2 and 0.07 - a tenth is not exact in binary floating point, so 1.1 * 100
  // is 110.00000000000001 and every weight ending in a lone tenth would be
  // rejected as though it had three decimal places. The tolerance is far below
  // anything `numeric(5,2)` can hold and far above the error of one
  // multiplication, so 1.005 is still refused and 1.1 is not.
  if (Math.abs(weight * 100 - Math.round(weight * 100)) > 1e-9) {
    return { ok: false, reason: 'invalidCriterion' };
  }
  values.weight = weight;

  if (values.display_order === null) return { ok: false, reason: 'invalidCriterion' };
  const order = Number(values.display_order);
  if (!Number.isInteger(order)) return { ok: false, reason: 'invalidCriterion' };
  if (order < 0 || order > 2147483647) return { ok: false, reason: 'invalidCriterion' };
  values.display_order = order;

  return { ok: true, values };
}

function rubricCriteriaRoutes(pool) {
  const router = express.Router();

  /**
   * The rubric this request is about, or the 404 that stands for every way of
   * not having one.
   */
  async function rubric(req) {
    return reachableRubric(pool, req, req.params.rubricId);
  }

  /**
   * One criterion, if it is under that rubric.
   *
   * The id's shape is tested before the database sees it: `id` is an integer
   * column and a non-numeric address would raise 22P02, which this route has no
   * key for and would answer as a fault of its own - #23's lesson.
   */
  async function criterionOf(rubricId, criterionId) {
    if (!/^\d+$/.test(String(criterionId))) return null;
    const { rows } = await pool.query(
      `SELECT ${RETURNED} ${FROM} WHERE d.id = $1 AND d.rubric_id = $2`,
      [criterionId, rubricId],
    );
    return rows[0] ?? null;
  }

  /** The row as the screen wants it, read back after a write. */
  async function load(criterionId) {
    const { rows } = await pool.query(`SELECT ${RETURNED} ${FROM} WHERE d.id = $1`, [criterionId]);
    return rows[0];
  }

  /**
   * The list — the whole of the screen, in one request.
   *
   * The rubric comes back with it because the screen is opened at a rubric's
   * address and has to name the rubric it is showing; the server has had to
   * read that row in order to answer at all, so asking for it separately would
   * be a second round trip for something already in hand.
   *
   * It does not page, and that is a decision. A rubric is a page of guidance a
   * marker reads while marking - the seed's have two and three criteria, the
   * inherited screen's largest has five - and a scoring guide split across
   * pages is worse than a long one. `total` is still returned, because the
   * screen states how many criteria a rubric has and a length is not a count
   * once anything ever narrows the list.
   *
   * `display_order` leads the sort and `id` settles it. The ordering column is
   * `NOT NULL DEFAULT 0` here as it is on rubrics, so a tie is the ordinary
   * case; and a criterion has no code, while its names are not unique either,
   * so the primary key is the only tiebreak that is total.
   */
  router.get('/rubrics/:rubricId/criteria', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const parent = await rubric(req);
      if (!parent) return res.status(404).json({ message: REFUSALS.rubricNotFound });

      const { rows } = await pool.query(
        `SELECT ${RETURNED} ${FROM}
          WHERE d.rubric_id = $1
          ORDER BY d.display_order ASC, d.id ASC`,
        [parent.id],
      );

      return res.status(200).json({ rubric: parent, criteria: rows, total: rows.length });
    } catch (error) {
      return next(error);
    }
  });

  /** One criterion, for the edit form. */
  router.get(
    '/rubrics/:rubricId/criteria/:criterionId',
    requireRole(...MAINTAINERS),
    async (req, res, next) => {
      try {
        const parent = await rubric(req);
        if (!parent) return res.status(404).json({ message: REFUSALS.rubricNotFound });

        const found = await criterionOf(parent.id, req.params.criterionId);
        if (!found) return res.status(404).json({ message: REFUSALS.criterionNotFound });
        return res.status(200).json({ criterion: found });
      } catch (error) {
        return next(error);
      }
    },
  );

  /** Writing one down — the ticket's first criterion, with the second and third. */
  router.post('/rubrics/:rubricId/criteria', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const parent = await rubric(req);
      if (!parent) return res.status(404).json({ message: REFUSALS.rubricNotFound });

      const draft = readCriterion(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const { rows } = await pool.query(
        `INSERT INTO rubric_details (
           rubric_id, criteria_name_th, criteria_name_en, weight,
           level_4_description, level_3_description,
           level_2_description, level_1_description,
           display_order, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         RETURNING id`,
        [
          parent.id,
          draft.values.criteria_name_th,
          draft.values.criteria_name_en,
          draft.values.weight,
          draft.values.level_4_description,
          draft.values.level_3_description,
          draft.values.level_2_description,
          draft.values.level_1_description,
          draft.values.display_order,
          req.session.userId,
        ],
      );

      return res.status(201).json({ criterion: await load(rows[0].id) });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Changing one. The rubric is not editable and is not read from the body -
   * see `readCriterion` - so the `WHERE` names both ids and the statement can
   * only ever write inside the rubric the address opened.
   */
  router.put(
    '/rubrics/:rubricId/criteria/:criterionId',
    requireRole(...MAINTAINERS),
    async (req, res, next) => {
      try {
        const parent = await rubric(req);
        if (!parent) return res.status(404).json({ message: REFUSALS.rubricNotFound });

        const existing = await criterionOf(parent.id, req.params.criterionId);
        if (!existing) return res.status(404).json({ message: REFUSALS.criterionNotFound });

        const draft = readCriterion(req.body ?? {});
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        await pool.query(
          `UPDATE rubric_details
              SET criteria_name_th = $3,
                  criteria_name_en = $4,
                  weight = $5,
                  level_4_description = $6,
                  level_3_description = $7,
                  level_2_description = $8,
                  level_1_description = $9,
                  display_order = $10,
                  updated_by = $11,
                  updated_at = now()
            WHERE id = $1 AND rubric_id = $2`,
          [
            existing.id,
            parent.id,
            draft.values.criteria_name_th,
            draft.values.criteria_name_en,
            draft.values.weight,
            draft.values.level_4_description,
            draft.values.level_3_description,
            draft.values.level_2_description,
            draft.values.level_1_description,
            draft.values.display_order,
            req.session.userId,
          ],
        );

        return res.status(200).json({ criterion: await load(existing.id) });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * Taking one away — the ticket's first criterion's third verb.
   *
   * Nothing references a criterion, so there is no third answer here any more
   * than there is on a rubric: the row goes. Asking the person first is the
   * fifth criterion and is the screen's job, for #21's reason - there is
   * nothing for a server to confirm against, and a request that arrived is a
   * request that was meant.
   *
   * The name goes back with the answer so the banner can say which criterion
   * went. The screen has it in hand, but a row deleted while a second window
   * held a stale list would have the screen naming a criterion the server
   * removed something else instead of; the name in the answer is the name of
   * the row that actually went.
   */
  router.delete(
    '/rubrics/:rubricId/criteria/:criterionId',
    requireRole(...MAINTAINERS),
    async (req, res, next) => {
      try {
        const parent = await rubric(req);
        if (!parent) return res.status(404).json({ message: REFUSALS.rubricNotFound });

        const existing = await criterionOf(parent.id, req.params.criterionId);
        if (!existing) return res.status(404).json({ message: REFUSALS.criterionNotFound });

        const removed = await pool.query(
          'DELETE FROM rubric_details WHERE id = $1 AND rubric_id = $2',
          [existing.id, parent.id],
        );

        // Nothing to delete means somebody else got there between the read and
        // the write. 404 is what they would have got had they been a moment
        // later, and is what the screen already knows how to say.
        if (removed.rowCount === 0) {
          return res.status(404).json({ message: REFUSALS.criterionNotFound });
        }

        return res.status(200).json({
          deleted: true,
          criteria_name_th: existing.criteria_name_th,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { rubricCriteriaRoutes };

'use strict';

/**
 * Rubrics — ticket #21.
 *
 * ข้อมูล Rubric กลาง: the หลักสูตร's reusable scoring guides, so that two
 * Teachers marking the same kind of work mark it on the same scale rather than
 * each inventing one. A rubric here is a code, a Thai name, an English name and
 * a place in a list; the weighted criteria described at four levels are
 * `rubric_details` and belong to #22, which this screen only opens the door to.
 *
 * Five things are decisions rather than habit, and the first two are places
 * where copying #19 - the ticket immediately before this one, and the closest
 * thing on the system in shape - would have been wrong.
 *
 * *A code belongs to the institution, not to its หลักสูตร.* `rubric_code` is
 * `UNIQUE` on its own, which is the exact opposite of the `UNIQUE (program_id,
 * outcome_code)` that #19 exists to establish. 0003 gives the reason and it is
 * not an oversight: the inherited `findRubricByCode(rubric_code)` is handed a
 * code with no curriculum beside it, so a code meaning one thing in one
 * curriculum and another elsewhere resolves to whichever row was found first.
 * `program_id` says which curriculum *owns* a rubric, not which namespace it is
 * numbered in. The refusal therefore has to say ทั้งระบบ, and the tests assert
 * the direction that surprises people - the same code in *another* curriculum
 * is refused too, from an account that cannot see the row it collides with.
 *
 * *A removal is a removal.* Every other master-data screen answers a deletion
 * three ways, because something points at the row and `deleteOrDeactivate`
 * turns the foreign key violation into "switched off instead". Neither half of
 * that applies here. `rubrics` has no `is_active` column, so there is nothing to
 * switch off *to*; and the only table that references a rubric is
 * `rubric_details`, `ON DELETE CASCADE`. So the row goes, and its criteria go
 * with it, silently as far as the database is concerned. The route counts them
 * first and says how many went, because a screen that says ลบแล้ว over a rubric
 * whose four criteria have just been destroyed is telling half the truth. If a
 * later table ever references a rubric under RESTRICT, this route will answer a
 * fault rather than a sentence, and that is the day to add the third answer -
 * `grep "REFERENCES rubrics" db/migrations` is the check, and today it returns
 * one line.
 *
 * *The order is settled even when two rubrics claim the same place.*
 * `display_order` is `NOT NULL DEFAULT 0`, so a tie is what every rubric starts
 * out in rather than an edge case, and this list pages. An `ORDER BY
 * display_order` with nothing after it lets the plan return two tied rows in
 * either order on either page, which shows one row twice and loses another
 * entirely. `rubric_code` follows it and is unique, so the sort is total.
 *
 * *A rubric must name a curriculum, though the column permits none.*
 * `rubrics.program_id` is nullable. A row with none is not merely unowned: the
 * reach filter below is `program_id = ANY($1)`, which is NULL rather than false
 * for a NULL column, so such a rubric is invisible to every account on the
 * system including the one that made it. The route requires it on creation, and
 * that is the route being stricter than its schema on purpose.
 *
 * *`FACULTY_ADMIN` is absent, against this ticket's own seventh criterion.* The
 * criterion says faculty administrators manage rubrics within their scope. #79
 * reversed that after the ticket was written and names A04 - this screen -
 * among the four it binds: the faculty holds the list of ภาควิชา and of
 * หลักสูตร, and what is *inside* a curriculum is decided below it. The ticket
 * text is the older of the two, so #79 wins; docs/acceptance/21 records the
 * divergence rather than letting the checklist quietly disagree with the code.
 */

const express = require('express');

const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, isDuplicate } = require('../lib/fields');
const { pageOf } = require('../lib/paging');
const { reachablePrograms, programInReach } = require('../lib/reach');

/**
 * The roles that decide how a curriculum marks.
 *
 * `PROG_MANAGER` first, because this screen is theirs: the ticket opens with a
 * Curriculum Committee member and a rubric is the committee's statement of what
 * good work looks like. `DEPT_ADMIN` above them, with the reach they have
 * everywhere. `FULL_ADMIN` and `FACULTY_ADMIN` are both absent - see the note
 * at the top of the file for the second, which is a reversal and not an
 * omission - and `TEACHER` because marking against a rubric is not writing one.
 */
const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];

/**
 * What a rubric is, as this file reads it out.
 *
 * `criteria_count` is not decoration and not #22's work leaking in here. It is
 * how many rows a deletion is about to take with it, and the confirmation that
 * does not know the number cannot state it. The screen reads it twice - once in
 * the column that says whether a rubric has been filled in at all, and once in
 * the sentence it asks the person to agree to.
 *
 * `updated_by_name` is joined in for #19's reason: a set several people
 * maintain over a curriculum's life needs to say who last touched a row, and an
 * identifier is not who.
 */
const RETURNED = `r.id, r.rubric_code, r.rubric_name_th, r.rubric_name_en, r.program_id,
                  r.display_order, r.updated_at,
                  (SELECT count(*)::int FROM rubric_details d WHERE d.rubric_id = r.id)
                    AS criteria_count,
                  trim(both ' ' from concat_ws(' ', u.title_th, u.first_name_th, u.last_name_th))
                    AS updated_by_name`;

const FROM = `FROM rubrics r LEFT JOIN users u ON u.user_id = r.updated_by`;

/**
 * One rubric's worth of fields, from the form.
 *
 * `program_id` is required on creation and absent from an edit: moving a rubric
 * between curricula is not an edit, for the reason #19 gives about outcomes and
 * one of its own - the criteria underneath carry no curriculum at all, so they
 * would follow it anywhere without anything noticing.
 *
 * Both names are required, which is the ticket's third criterion in one line.
 * The columns are `NOT NULL`, so the database would refuse a missing one too,
 * but as a 23502 the route has no key for and would answer as a fault of its
 * own; and a name submitted as spaces passes the column and fails the
 * criterion, which is what `blankToNull` is doing before this reads it.
 *
 * `display_order` is read as a whole number and refused otherwise rather than
 * left to `Number()` and stored as NaN: a rubric ordered by nothing sorts
 * wherever the plan feels like, which is the fourth criterion failing silently.
 */
function readRubric(source, { editing = false } = {}) {
  const values = {
    program_id: blankToNull(source.program_id),
    rubric_code: blankToNull(source.rubric_code),
    rubric_name_th: blankToNull(source.rubric_name_th),
    rubric_name_en: blankToNull(source.rubric_name_en),
    display_order: blankToNull(source.display_order),
  };

  if (!editing && !values.program_id) return { ok: false, reason: 'invalidRubric' };
  if (!values.rubric_code) return { ok: false, reason: 'invalidRubric' };
  if (!values.rubric_name_th || !values.rubric_name_en) {
    return { ok: false, reason: 'invalidRubric' };
  }

  // The null check is not redundant with the one below it: `Number(null)` is
  // `0`, which is a perfectly good integer and is also this column's default,
  // so a form submitted with the order box empty would otherwise be accepted
  // and sorted to the top of the list rather than refused.
  if (values.display_order === null) return { ok: false, reason: 'invalidRubric' };
  const order = Number(values.display_order);
  if (!Number.isInteger(order)) return { ok: false, reason: 'invalidRubric' };
  // A whole number is not yet a number the column can hold: `display_order` is
  // an `integer`, and one past its end raises 22003 at the INSERT, which the
  // route has no key for. The shape and the range fail in two different places
  // and are therefore two checks.
  if (order < 0 || order > 2147483647) return { ok: false, reason: 'invalidRubric' };
  values.display_order = order;

  return { ok: true, values };
}

/**
 * One rubric, if this grant reaches its curriculum — shared with #22.
 *
 * The same reach the list filters on, so a rubric the list did not show cannot
 * be edited by asking for it by number, and out of reach answers the same 404
 * as never-made, which is the seventh criterion enforced at the server rather
 * than in a menu.
 *
 * It is at module scope and exported because a rubric's criteria are
 * authorised by exactly this question and by nothing else - `rubric_details`
 * carries no curriculum of its own, so `routes/rubricCriteria.js` asking the
 * database its own version of this would be two answers to one question, and
 * the day they drift is the day a criterion is writable through a rubric that
 * is not.
 */
async function reachableRubric(pool, req, rubricId) {
  if (!/^\d+$/.test(String(rubricId))) return null;
  const reach = await coveredScopes(pool, req.auth.acting.scope_id);
  const { rows } = await pool.query(
    `SELECT ${RETURNED} ${FROM}
      WHERE r.id = $1 AND ($2::text[] IS NULL OR r.program_id = ANY($2))`,
    [rubricId, reach],
  );
  return rows[0] ?? null;
}

function rubricRoutes(pool) {
  const router = express.Router();

  /**
   * The curriculum this request may write into.
   *
   * Named by the body and checked against the reach derived from the acting
   * grant, which is the shape ADR-0002 permits: authority is never read from a
   * request, a target named by one is verified. A curriculum that does not
   * exist, one in another department and one that has been retired all answer
   * the same key, for `departmentInReach`'s reason.
   */
  async function programRefusal(req, programId) {
    if (!programId) return 'invalidRubric';
    const program = await programInReach(pool, req.auth.acting.scope_id, programId);
    return program ? null : 'rubricProgramNotYours';
  }

  /**
   * One rubric, if this grant reaches its curriculum.
   *
   * The same reach the list filters on, so a rubric the list did not show
   * cannot be edited by asking for it by number - and out of reach answers the
   * same 404 as never-made, which is the seventh criterion enforced at the
   * server rather than in a menu.
   */
  const reachable = (req, rubricId) => reachableRubric(pool, req, rubricId);

  /** The row as the screen wants it, read back after a write. */
  async function load(executor, rubricId) {
    const { rows } = await executor.query(`SELECT ${RETURNED} ${FROM} WHERE r.id = $1`, [rubricId]);
    return rows[0];
  }

  /**
   * The list — the fourth and eighth criteria, in the halves that are facts
   * about the API.
   *
   * Ten to a page with the total, and `?program_id=` to narrow it. The filter
   * is applied *inside* the reach rather than instead of it: a caller who names
   * a curriculum they do not hold gets an empty page, not somebody else's
   * scales.
   *
   * `display_order` leads the sort and `rubric_code` settles it. See the note
   * at the top of the file: with `NOT NULL DEFAULT 0` on the ordering column, a
   * tie is the ordinary case and an unsettled tie in a paged list is a row
   * shown twice and a row never shown at all.
   */
  router.get('/rubrics', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { page, perPage, offset } = pageOf(req);
      const program = blankToNull(req.query.program_id) ?? null;

      const where = `WHERE ($1::text[] IS NULL OR r.program_id = ANY($1))
                       AND ($2::text IS NULL OR r.program_id = $2)`;

      const counted = await pool.query(
        `SELECT count(*)::int AS total FROM rubrics r ${where}`,
        [reach, program],
      );
      const { rows } = await pool.query(
        `SELECT ${RETURNED} ${FROM} ${where}
          ORDER BY r.display_order ASC, r.rubric_code ASC
          LIMIT $3 OFFSET $4`,
        [reach, program, perPage, offset],
      );

      return res.status(200).json({
        rubrics: rows,
        total: counted.rows[0].total,
        page,
        per_page: perPage,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The curricula this caller reaches — the screen's picker, drawn from here
   * rather than from `/api/programs`, which belongs to the two administrators
   * (#15) and would refuse the committee member this screen is mainly for.
   */
  router.get('/rubrics/programs', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const programs = await reachablePrograms(pool, req.auth.acting.scope_id);
      return res.status(200).json({ programs });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * One rubric, for the edit form. Declared after `/rubrics/programs` because
   * Express matches in order and `:rubricId` would otherwise swallow it.
   */
  router.get('/rubrics/:rubricId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const rubric = await reachable(req, req.params.rubricId);
      if (!rubric) return res.status(404).json({ message: REFUSALS.rubricNotFound });
      return res.status(200).json({ rubric });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Writing one down — the first criterion, with the second, third and seventh
   * as its refusals.
   */
  router.post('/rubrics', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readRubric(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      // The curriculum first, and 403. Answering anything about codes ahead of
      // it would tell a caller who holds nothing here which codes another
      // curriculum uses, which is not theirs to ask - and the duplicate refusal
      // below already says more about other curricula than any other refusal on
      // this system, because the key it reports is institution-wide.
      const notYours = await programRefusal(req, draft.values.program_id);
      if (notYours) return res.status(403).json({ message: REFUSALS[notYours] });

      const { rows } = await pool.query(
        `INSERT INTO rubrics (
           rubric_code, rubric_name_th, rubric_name_en, program_id, display_order,
           created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $6)
         RETURNING id`,
        [
          draft.values.rubric_code,
          draft.values.rubric_name_th,
          draft.values.rubric_name_en,
          draft.values.program_id,
          draft.values.display_order,
          req.session.userId,
        ],
      );

      return res.status(201).json({ rubric: await load(pool, rows[0].id) });
    } catch (error) {
      if (isDuplicate(error)) {
        return res.status(409).json({ message: REFUSALS.duplicateRubricCode });
      }
      return next(error);
    }
  });

  /**
   * Changing one — the first criterion's middle verb, and the fourth's
   * *settable*.
   *
   * The curriculum is not editable and is not read from the body, so a form
   * that sends it anyway cannot move a rubric out from under the accounts that
   * maintain it. The code is editable, and a code changed into one the
   * institution already holds meets the same 409 as a new rubric would.
   */
  router.put('/rubrics/:rubricId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.rubricId);
      if (!existing) return res.status(404).json({ message: REFUSALS.rubricNotFound });

      const draft = readRubric(req.body ?? {}, { editing: true });
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      await pool.query(
        `UPDATE rubrics
            SET rubric_code = $2,
                rubric_name_th = $3,
                rubric_name_en = $4,
                display_order = $5,
                updated_by = $6,
                updated_at = now()
          WHERE id = $1`,
        [
          existing.id,
          draft.values.rubric_code,
          draft.values.rubric_name_th,
          draft.values.rubric_name_en,
          draft.values.display_order,
          req.session.userId,
        ],
      );

      return res.status(200).json({ rubric: await load(pool, existing.id) });
    } catch (error) {
      if (isDuplicate(error)) {
        return res.status(409).json({ message: REFUSALS.duplicateRubricCode });
      }
      return next(error);
    }
  });

  /**
   * Taking one out — the sixth criterion's other half, and the one thing about
   * this screen that cannot be undone.
   *
   * There is no third answer here. See the note at the top of the file: nothing
   * on this system points at a rubric except its own criteria, and those
   * CASCADE, so the row is deleted and the criteria are deleted and neither
   * comes back. What the route can do is say how many went, and the count is
   * only true if nothing can be added to the rubric while it is being counted.
   * One transaction is not enough for that on its own: at READ COMMITTED a
   * criterion committed between the count and the DELETE would be cascaded away
   * uncounted, and deleting the criteria explicitly first only moves the same
   * gap. So the rubric is locked FOR UPDATE before the count - the lock the row
   * takes conflicts with the FOR KEY SHARE an insert into `rubric_details`
   * needs, so from that point no criterion can arrive that the number misses.
   *
   * Asking the person to confirm first is the sixth criterion proper and is the
   * screen's job: there is nothing for a server to confirm against, and a
   * request that arrived is a request that was meant.
   */
  router.delete('/rubrics/:rubricId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.rubricId);
      if (!existing) return res.status(404).json({ message: REFUSALS.rubricNotFound });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT 1 FROM rubrics WHERE id = $1 FOR UPDATE', [existing.id]);
        const counted = await client.query(
          `SELECT count(*)::int AS total FROM rubric_details WHERE rubric_id = $1`,
          [existing.id],
        );
        const removed = await client.query('DELETE FROM rubrics WHERE id = $1', [existing.id]);
        await client.query('COMMIT');

        // Nothing to delete means somebody else got there between the read and
        // the write. 404 is what they would have got had they been a moment
        // later, and is what the screen already knows how to say.
        if (removed.rowCount === 0) {
          return res.status(404).json({ message: REFUSALS.rubricNotFound });
        }

        return res.status(200).json({
          deleted: true,
          rubric_code: existing.rubric_code,
          criteria_removed: counted.rows[0].total,
        });
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

module.exports = { rubricRoutes, reachableRubric, MAINTAINERS };

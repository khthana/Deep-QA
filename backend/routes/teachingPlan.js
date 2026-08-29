'use strict';

/**
 * Ticket #31: the week-by-week teaching plan of one ตอนเรียน.
 *
 * *The grain is the Section, and the import says so.* #28–#30 resolve their
 * Section id up to the Offering because ADR-0003 puts outcomes and the
 * weighting scheme at (Program, Subject, ปีการศึกษา). The plan is the other
 * kind of thing: the ticket's own line is "two Sections of one Offering may
 * differ", and `course_syllabus.section_id` is the schema agreeing. So this
 * file imports `sectionOf` from `enrolment.js` — the question "is this
 * Section mine", answered once, stopping at the Section — rather than
 * `offeringOf`, which would quietly make every Section of the Offering read
 * one shared plan. It imports rather than re-asks for #104's reason: the
 * teaching-register join was already written three times, and a fourth copy
 * is how the three drift.
 *
 * *Week numbers belong to the person, not the server.* The CLO children
 * (#28/#29) number their rows server-side — MAX+1 under a lock, renumbered on
 * delete — because their numbers are positions. A plan's numbers are weeks of
 * a semester: week 5 is week 5 because the calendar says so, a deleted week 2
 * does not make week 3 into week 2, and one week may hold two topics — which
 * is why migration 0002 deliberately left (section_id, week_no) without a
 * unique key, and why this file has no counter and no renumber loop. What the
 * server still owns is the shape: a positive integer that fits the smallint,
 * checked in code because 22003 through the error handler would read as
 * เกิดข้อผิดพลาดในระบบ for a typo.
 *
 * *The delete guard is stricter than the schema, and that is the point.*
 * `activities.course_syllabus_id` is SET NULL — 0003's comment: rewriting the
 * plan should not take the Activity with it — so an unguarded DELETE would
 * answer 204 and silently detach the Activity from its week. The ticket says
 * "cannot be deleted outright", so the DELETE carries its own `NOT EXISTS`
 * and the refusal names the week the way #30's guard names the หมวด. #30 asks
 * in a statement of its own and can afford to, having RESTRICT underneath;
 * here there is nothing underneath, so the question and the deed are one
 * statement. The way out is the same shape as #30's: move or delete the
 * Activity, then the week.
 *
 * *Nobody is recorded as having edited anything* — `created_by` exists and is
 * written on insert (tier 3 gave this table real columns), but there is no
 * `updated_by`, so "who moved week 5" has no answer here and the screen draws
 * no such line.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull } = require('../lib/fields');
const { sectionOf } = require('./enrolment');

/** The plan is the Teacher's own, as in `enrolment.js` — the same door. */
const TEACHING = ['TEACHER'];

const RETURNED = 'id, week_no, title, description, remark';

/**
 * A week number as the calendar means it: a positive integer that fits the
 * column. A JSON number and a typed string both arrive here; 4.5 and สี่ are
 * refused rather than rounded, and 40000 is refused here rather than as the
 * smallint's 22003.
 */
function readWeekNo(value) {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : NaN;
  if (!Number.isInteger(number) || number < 1 || number > 32767) return null;
  return number;
}

/**
 * One week as the caller owns it. The number and the title are the row —
 * a week with no topic is not a plan entry — and the other two are prose
 * that may be absent: blank or missing stores NULL, never '', so the screen
 * can draw the paragraph only when there is one.
 */
function readWeek(source) {
  const values = {
    week_no: readWeekNo(source?.week_no),
    title: blankToNull(source?.title),
    description: blankToNull(source?.description),
    remark: blankToNull(source?.remark),
  };
  if (values.week_no === null || !values.title) return { ok: false, reason: 'invalidWeek' };
  return { ok: true, values };
}

function teachingPlanRoutes(pool) {
  const router = express.Router();

  const notThisSection = (res) => res.status(404).json({ message: REFUSALS.sectionNotFound });
  const notThisWeek = (res) => res.status(404).json({ message: REFUSALS.weekNotFound });

  /**
   * The plan, in the order the semester runs. Two rows of one week keep
   * insertion order — id ascending — so a second topic reads under the first.
   */
  async function listOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT ${RETURNED} FROM course_syllabus
        WHERE section_id = $1
        ORDER BY week_no ASC, id ASC`,
      [sectionId],
    );
    return rows;
  }

  /**
   * This week of this Section, or nothing. `id AND section_id` always — the
   * pairing rule of #28 one grain down. Without the second half, the sibling
   * Section's week id through this address would be somebody else's row
   * edited from here.
   */
  async function weekOf(sectionId, weekId) {
    if (!/^\d+$/.test(String(weekId))) return null;
    const { rows } = await pool.query(
      `SELECT ${RETURNED} FROM course_syllabus WHERE id = $1 AND section_id = $2`,
      [weekId, sectionId],
    );
    return rows[0] ?? null;
  }

  router.get('/teaching/sections/:sectionId/plan', requireRole(...TEACHING), async (req, res, next) => {
    try {
      const section = await sectionOf(pool, req, req.params.sectionId);
      if (!section) return notThisSection(res);
      res.json({ section, weeks: await listOf(section.section_id) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/teaching/sections/:sectionId/plan', requireRole(...TEACHING), async (req, res, next) => {
    try {
      const section = await sectionOf(pool, req, req.params.sectionId);
      if (!section) return notThisSection(res);

      const read = readWeek(req.body ?? {});
      if (!read.ok) return res.status(400).json({ message: REFUSALS[read.reason] });

      const { week_no, title, description, remark } = read.values;
      const { rows } = await pool.query(
        `INSERT INTO course_syllabus (section_id, week_no, title, description, remark, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${RETURNED}`,
        [section.section_id, week_no, title, description, remark, req.session.userId],
      );
      res.status(201).json({ week: rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.put(
    '/teaching/sections/:sectionId/plan/:weekId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const read = readWeek(req.body ?? {});
        if (!read.ok) return res.status(400).json({ message: REFUSALS[read.reason] });

        // The digit guard ahead of the query, for `sectionOf`'s reason; then
        // the pairing in the UPDATE's own WHERE, so the write and the
        // ownership check cannot disagree — an id that is not this Section's,
        // or vanished under a colleague's hand, is the empty RETURNING.
        if (!/^\d+$/.test(String(req.params.weekId))) return notThisWeek(res);
        const { week_no, title, description, remark } = read.values;
        const { rows } = await pool.query(
          `UPDATE course_syllabus
              SET week_no = $3, title = $4, description = $5, remark = $6, updated_at = now()
            WHERE id = $1 AND section_id = $2
            RETURNING ${RETURNED}`,
          [req.params.weekId, section.section_id, week_no, title, description, remark],
        );
        if (!rows[0]) return notThisWeek(res);
        res.json({ week: rows[0] });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/teaching/sections/:sectionId/plan/:weekId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const week = await weekOf(section.section_id, req.params.weekId);
        if (!week) return notThisWeek(res);

        // The guard the schema does not have: the FK is SET NULL, so without
        // this the delete would succeed and quietly orphan the Activity from
        // its week. Refused by name, like #30's หมวด.
        //
        // The guard is *inside* the DELETE rather than a SELECT before it,
        // because two statements would leave a gap: #30's guard has RESTRICT
        // underneath it and can afford to ask first, and this one has SET NULL,
        // which means an Activity filed in the gap would be detached silently -
        // exactly the loss the guard exists to prevent. `NOT EXISTS` makes the
        // question and the deed one statement.
        const { rowCount } = await pool.query(
          `DELETE FROM course_syllabus
            WHERE id = $1 AND section_id = $2
              AND NOT EXISTS (SELECT 1 FROM activities WHERE course_syllabus_id = $1)`,
          [week.id, section.section_id],
        );
        if (rowCount) return res.status(204).end();

        // Nothing was deleted, and the row was there a moment ago: either an
        // Activity holds it - the refusal, by name - or a colleague deleted it
        // between the two statements, which is the same ไม่พบ a second press
        // of the button would get.
        const { rows } = await pool.query(
          'SELECT 1 FROM activities WHERE course_syllabus_id = $1 LIMIT 1',
          [week.id],
        );
        if (rows[0]) return res.status(400).json({ message: REFUSALS.weekInUse(week.week_no) });
        return notThisWeek(res);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

module.exports = { teachingPlanRoutes };

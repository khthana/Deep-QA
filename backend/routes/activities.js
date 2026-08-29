'use strict';

/**
 * Ticket #32: กิจกรรมการเรียนรู้ — the assessed work of one ตอนเรียน.
 *
 * *Two grains in one answer, and neither borrows the other's.* An Activity is
 * the Section's (`activities.section_id`, the same shape as #31's plan — two
 * ตอนเรียน of one Offering assess differently and are meant to), while the
 * หมวดคะแนน it is filed under is the Offering's (ADR-0003, #30 — every
 * Section of the Offering divides marks on one basis). So the read answers
 * `{ section, categories, activities }`: the categories are the scheme, in
 * the scheme's own order, and each Activity carries its `score_ratio_id` into
 * it. Grouping is the screen's; naming the groups is the server's, because a
 * screen that derived the groups from the Activities alone would silently
 * lose a category nobody has filed work under yet — which is exactly the
 * category a Teacher most needs to see.
 *
 * *The scheme is reached through the Section, not through a second register
 * join.* `sectionOf` has already answered "is this Section mine" (ADR-0002),
 * and a Section belongs to exactly one Offering, so the scheme query walks
 * `course_sections → semester_courses → subject_score_ratio` from the id that
 * was just authorised. Importing `offeringOf` as well would ask the teaching
 * register twice per request to learn something the first answer implies —
 * and would be a fourth caller for [#104](https://github.com/khthana/Deep-QA/issues/104)
 * to unpick.
 *
 * *Deleting is where this schema is at its most dangerous, in two opposite
 * directions.* `activity_scores.activity_id` is **CASCADE**: an unguarded
 * DELETE answers 204 and takes a cohort's marks with it, and nothing in the
 * database objects. `activity_evidence.activity_id` is **RESTRICT** and its
 * rows are soft-deleted rather than removed: the database does object, as a
 * 23503 that reaches the error handler as เกิดข้อผิดพลาดในระบบ — a system
 * fault, for something a person can fix — and it objects even to evidence
 * that has been "deleted" on the screen, because a foreign key does not read
 * `is_deleted`.
 *
 * Both guards therefore live *inside* the DELETE as `NOT EXISTS`, which is
 * where #31's review put its one guard and for a sharper version of the same
 * reason: between a SELECT that asks and a DELETE that acts there is a gap,
 * and here the gap is measured in a cohort's marks. It narrows that gap to a
 * statement rather than closing it — under READ COMMITTED the DELETE reads
 * the snapshot it starts with, so a score committed after that instant is
 * still cascaded away. Closing it outright wants a lock on the Activity, and
 * that is #34's business, where marks are entered and the two screens can be
 * made to agree about who holds what.
 *
 * When nothing is deleted the route asks why, and answers in the words of
 * whichever thing is holding the row — or ไม่พบ, if it simply went.
 *
 * *Creating and editing are not here.* #33 owns the editor, including the
 * per-CLO attribution that makes an Activity count towards anything. This
 * file lists and deletes, which is what #32 asks for and all it asks for.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { integerId } = require('../lib/fields');
const { sectionOf } = require('./enrolment');

/** The one role these routes open for, as in enrolment.js and teachingPlan.js. */
const TEACHING = ['TEACHER'];

// Qualified with the alias: the list LEFT JOINs the scheme, and both tables
// carry a `score_ratio_id`.
const RETURNED = `a.id, a.score_ratio_id, a.activity_name, a.activity_type, a.score_number,
                  a.announcement_date, a.deadline_date`;

function activityRoutes(pool) {
  const router = express.Router();

  const notThisSection = (res) => res.status(404).json({ message: REFUSALS.sectionNotFound });
  const notThisActivity = (res) => res.status(404).json({ message: REFUSALS.activityNotFound });

  /**
   * The Offering's หมวดคะแนน, reached from the Section that was authorised.
   * Ordered as #30 orders them, so the screen's groups read down the page in
   * the order the scheme was written rather than in id order.
   */
  async function schemeOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT r.score_ratio_id, r.score_category, r.sequence_order, r.weight
         FROM subject_score_ratio r
         JOIN semester_courses sc ON sc.program_id = r.program_id
                                 AND sc.subject_id = r.subject_id
                                 AND sc.academic_year = r.academic_year
         JOIN course_sections cs ON cs.semester_course_id = sc.id
        WHERE cs.section_id = $1
        ORDER BY r.sequence_order ASC, r.score_ratio_id ASC`,
      [sectionId],
    );
    return rows;
  }

  /**
   * This Section's Activities, grouped-ready: the scheme's order first, then
   * the order they were made. Activities filed under no category sort last —
   * `score_ratio_id` is nullable, and a row with no category is still the
   * Teacher's work and may not be dropped from the list.
   */
  async function listOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT ${RETURNED} FROM activities a
         LEFT JOIN subject_score_ratio r ON r.score_ratio_id = a.score_ratio_id
        WHERE a.section_id = $1
        ORDER BY r.sequence_order ASC NULLS LAST, a.id ASC`,
      [sectionId],
    );
    return rows;
  }

  /**
   * This Activity of this Section, or nothing. `id AND section_id` always —
   * #28's pairing rule: without the second half, the sibling Section's
   * Activity id through this address would be somebody else's work deleted
   * from here.
   */
  async function activityOf(sectionId, activityId) {
    const id = integerId(activityId);
    if (id === null) return null;
    const { rows } = await pool.query(
      `SELECT id, activity_name FROM activities WHERE id = $1 AND section_id = $2`,
      [id, sectionId],
    );
    return rows[0] ?? null;
  }

  router.get(
    '/teaching/sections/:sectionId/activities',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const [categories, activities] = await Promise.all([
          schemeOf(section.section_id),
          listOf(section.section_id),
        ]);
        res.json({ section, categories, activities });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/teaching/sections/:sectionId/activities/:activityId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const activity = await activityOf(section.section_id, req.params.activityId);
        if (!activity) return notThisActivity(res);

        // Both guards in the statement that acts on them. `NOT EXISTS` over
        // `activity_evidence` is deliberately blind to `is_deleted`: the
        // foreign key is, so a guard that were not would hand the person a
        // 23503 dressed as a system fault.
        const { rowCount } = await pool.query(
          `DELETE FROM activities
            WHERE id = $1 AND section_id = $2
              AND NOT EXISTS (SELECT 1 FROM activity_scores s WHERE s.activity_id = $1)
              AND NOT EXISTS (SELECT 1 FROM activity_evidence e WHERE e.activity_id = $1)`,
          [activity.id, section.section_id],
        );
        if (rowCount) return res.status(204).end();

        const refusal = await whyNot(activity.id);
        return res.status(refusal.status).json({ message: refusal.message });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Why nothing was deleted, asked only once it is known that nothing was.
   *
   * Marks first: they are the loss the CASCADE would have made silent, and an
   * Activity that has both is refused for the more serious of the two. The
   * evidence sentence names a file because the ticket asks for the evidence
   * to be named, and counts the rest because soft-deleted evidence still
   * pins the Activity while showing up nowhere on a screen.
   *
   * The status travels with the sentence because the last case is not a
   * refusal at all: a row that vanished under our hands is ไม่พบ, and 404 is
   * what a second press of the same button would have got.
   */
  async function whyNot(activityId) {
    const { rows: marked } = await pool.query(
      'SELECT count(*)::int AS marks FROM activity_scores WHERE activity_id = $1',
      [activityId],
    );
    if (marked[0].marks > 0) {
      return { status: 400, message: REFUSALS.activityHasMarks(marked[0].marks) };
    }

    // The file named is the one uploaded first, not the alphabetically first:
    // the sentence is helping somebody find the evidence they attached, and
    // "the first one" is a thing they remember doing.
    const { rows: evidence } = await pool.query(
      `SELECT count(*)::int AS files,
              (SELECT file_name FROM activity_evidence
                WHERE activity_id = $1
                ORDER BY uploaded_at ASC, evidence_id ASC LIMIT 1) AS first_file
         FROM activity_evidence WHERE activity_id = $1`,
      [activityId],
    );
    if (evidence[0].files > 0) {
      return {
        status: 400,
        message: REFUSALS.activityHasEvidence(evidence[0].first_file, evidence[0].files),
      };
    }

    return { status: 404, message: REFUSALS.activityNotFound };
  }

  return router;
}

module.exports = { activityRoutes };

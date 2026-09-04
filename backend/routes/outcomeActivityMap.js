'use strict';

/**
 * ความเชื่อมโยงผลการเรียนรู้และกิจกรรม — #39.
 *
 * The attribution table, read as a shape instead of as rows. #33 writes one
 * `activity_clo_mapping` row every time a ผู้สอน says *this piece of work
 * carries this much of that outcome*; nobody ever sees the whole of what they
 * have said. This route is that whole: every outcome, every Activity, and
 * every attribution between them, in one answer.
 *
 * ## Marks, not per cent
 *
 * The table carries both numbers and they mean different things. `weight` is a
 * percentage **of its own Activity** — BR-11 makes an Activity's weights sum to
 * a hundred — and `score` is what that percentage comes to in marks, computed
 * in the database at save time so the two cannot drift apart.
 *
 * Only one of them can be compared across Activities. A ten-mark exercise
 * giving all of itself to one outcome and a hundred-mark project doing the
 * same both read `weight = 100`, and a diagram drawn on that would say the two
 * load the outcome equally. So every quantity here — a band's width, a node's
 * size — is marks, and the per cent travels beside it because it is what the
 * ผู้สอน typed and will recognise on the screen.
 *
 * ## Nothing is dropped for having nothing attached to it
 *
 * An outcome no Activity assesses is the ticket's fifth criterion in as many
 * words, and it is the reason the outcomes are selected from the Offering
 * rather than through the attribution table — the same reason #38 gives at
 * length for its columns. An Activity attributed to no outcome is the same
 * fact from the other end and is left in for the same reason: a node that
 * disappears when it has no links is a diagram hiding the one case it exists
 * to show.
 *
 * ## The mean is #38's mean
 *
 * The third criterion asks for the mean score per outcome, which is a figure
 * this screen shares with the heatmap. It is folded here by `lib/attainment.js`
 * from the same marks under the same rules — a blank left out of both halves of
 * the fraction, a scale of five — and the fold is the shared one rather than a
 * second copy of the arithmetic.
 *
 * The *query* is this route's own, which is what `lib/attainment.js` says to
 * do and is not free: it is the third query in the codebase over these marks,
 * after #38's and #36's. It folds from the marks outward, so it carries #36's
 * `student_course` guard — a mark belonging to somebody no longer on the roll
 * must not count here and not there — and `backend/test/outcome-activity-map.test.js`
 * holds the two endpoints' means against each other so that the day they part
 * company is the day a test fails rather than the day somebody puts two
 * screens side by side.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { meanOf, outcomeScore } = require('../lib/attainment');
const { round2 } = require('../lib/fields');
const { offeringOf } = require('./clos');
const { sectionOf, notThisSection } = require('./enrolment');

/** A ผู้สอน's own ตอนเรียน, as in `enrolment.js`, `activities.js` and `learningDetails.js`. */
const TEACHING = ['TEACHER'];

/** The marks attached to one node, to the hundredth its parts were rounded to. */
const sumOfMarks = (links) => round2(links.reduce((sum, link) => sum + link.marks, 0));

function outcomeActivityMapRoutes(pool) {
  const router = express.Router();

  /**
   * Every outcome of the Offering, in the order a person reads them —
   * ADR-0003's grain.
   *
   * This is the **third** verbatim copy of #38's query, after `sectionResults.js`,
   * and `lib/fields.js`' rule is to extract at the third. It is not extracted
   * here for `enrolment.js`' reason: the other two live in files that sit in
   * other tickets' mutation sets, and a refactor inside a sweep's reach is how
   * a mutant quietly starts missing. It belongs with the other folds-in on
   * [#104](https://github.com/khthana/Deep-QA/issues/104).
   *
   * The justification at the head of this file covers `earnedOf` and does not
   * cover this: what `lib/attainment.js` says may stay in a route is the
   * question of *which marks are in scope*, and a list of outcomes is not a
   * marks query at all.
   */
  async function outcomesOf(offering) {
    const { rows } = await pool.query(
      `SELECT c.clo_id, c.clo_number, c.clo_detail
         FROM subject_clo c
        WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3
        ORDER BY c.clo_number ASC, c.clo_id ASC`,
      [offering.program_id, offering.subject_id, offering.academic_year],
    );
    return rows;
  }

  /**
   * Every Activity of the ตอนเรียน, in the order #32's list draws them.
   *
   * By หมวดคะแนน first, because that is the order the ผู้สอน built them in and
   * the order they are looked for in. The category is LEFT-joined: #32's screen
   * draws an Activity that has none, so a node here may have none either, and
   * an inner join would make an unfiled piece of work vanish from a diagram
   * whose whole subject is what is attached to what.
   */
  async function activitiesOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT a.id AS activity_id, a.activity_name, a.activity_type,
              a.score_number::float AS score_number, r.score_category
         FROM activities a
         LEFT JOIN subject_score_ratio r ON r.score_ratio_id = a.score_ratio_id
        WHERE a.section_id = $1
        ORDER BY r.sequence_order ASC NULLS LAST, a.id ASC`,
      [sectionId],
    );
    return rows;
  }

  /**
   * The attribution rows themselves — the bands of the diagram.
   *
   * Two things are dropped, and both are bands with one end.
   *
   * `clo_id` is nullable in the schema, so a row may point at no outcome at
   * all. #33 cannot write one — its editor requires the outcome — so that is a
   * guard against history rather than against the editor.
   *
   * The join to `subject_clo` is the second, and it is the one the review
   * found. An attribution row may point at an outcome of *another* Offering:
   * the schema cannot forbid it (the mapping carries `clo_id` and nothing
   * else), and only `activities.js`' save path checks it. Counted but not
   * drawn, such a row would make the ความเชื่อมโยง card read fourteen over a
   * diagram of thirteen bands — the screen disagreeing with itself, which is
   * the one failure the counts are taken from the lists to prevent. The
   * Activity it belongs to is still a node in its own right either way.
   */
  async function linksOf(sectionId, offering) {
    const { rows } = await pool.query(
      `SELECT m.activity_id, m.clo_id, m.weight, m.score::float AS marks
         FROM activity_clo_mapping m
         JOIN activities a ON a.id = m.activity_id
         JOIN subject_clo c ON c.clo_id = m.clo_id
        WHERE a.section_id = $1
          AND c.program_id = $2 AND c.subject_id = $3 AND c.academic_year = $4
        ORDER BY m.activity_id ASC, m.sequence_order ASC`,
      [sectionId, offering.program_id, offering.subject_id, offering.academic_year],
    );
    return rows;
  }

  /**
   * What each student earned and what was available to them, per outcome.
   *
   * The fold is by (student, outcome) and not by mark, because BR-17 and the
   * mean beside it are about students: a student marked on six Activities and
   * one marked on one are one student each, and folding at the mark would
   * weight the first six times.
   *
   * `WHERE s.score IS NOT NULL` is #34's blank rule — a row that is not there
   * is added to neither half of the fraction — and the `student_course` join is
   * #36's guard, for the reason given at the head of this file.
   */
  async function earnedOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT s.student_id, s.clo_id,
              SUM(s.score)::float AS earned,
              SUM(m.score)::float AS available
         FROM activity_scores s
         JOIN activities a ON a.id = s.activity_id
         JOIN student_course e
           ON e.section_id = a.section_id AND e.student_id = s.student_id
         JOIN activity_clo_mapping m
           ON m.activity_id = s.activity_id AND m.clo_id = s.clo_id
        WHERE a.section_id = $1 AND s.score IS NOT NULL
        GROUP BY s.student_id, s.clo_id`,
      [sectionId],
    );
    return rows;
  }

  router.get(
    '/teaching/sections/:sectionId/outcome-activity-map',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        // Two readings of one permission, as in `learningDetails.js`: the
        // ตอนเรียน is what the heading says and what the Activities belong to,
        // the Offering is what the outcomes belong to. Either coming back empty
        // is the same refusal.
        const [section, offering] = await Promise.all([
          sectionOf(pool, req, req.params.sectionId),
          offeringOf(pool, req, req.params.sectionId),
        ]);
        if (!section || !offering) return notThisSection(res);

        const [clos, activities, links, earned] = await Promise.all([
          outcomesOf(offering),
          activitiesOf(section.section_id),
          linksOf(section.section_id, offering),
          earnedOf(section.section_id),
        ]);

        const scoresByClo = new Map(clos.map((clo) => [clo.clo_id, []]));
        for (const row of earned) {
          const scores = scoresByClo.get(row.clo_id);
          if (!scores) continue;
          const score = outcomeScore(row.earned, row.available);
          if (score !== null) scores.push(score);
        }

        return res.json({
          section,
          clos: clos.map((clo) => {
            const attached = links.filter((link) => link.clo_id === clo.clo_id);
            const scores = scoresByClo.get(clo.clo_id);
            return {
              ...clo,
              link_count: attached.length,
              marks: sumOfMarks(attached),
              // Not `0` where nobody has been measured: an outcome with no
              // marks against it has no mean, and drawing nought would put it
              // at the bottom of a scale it was never on.
              mean: meanOf(scores),
              student_count: scores.length,
            };
          }),
          activities: activities.map((activity) => {
            const attached = links.filter((link) => link.activity_id === activity.activity_id);
            return { ...activity, link_count: attached.length, marks: sumOfMarks(attached) };
          }),
          links,
          // The lists' own lengths rather than three `count(*)`s, so the cards
          // cannot say one thing while the diagram beneath them draws another.
          counts: { clos: clos.length, activities: activities.length, links: links.length },
          // A ตอนเรียน with no Activities, which is every ตอนเรียน in the week
          // before term. Not *no links*: an Activity attributed to nothing is
          // work that exists and is worth seeing unattached.
          empty: activities.length === 0,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { outcomeActivityMapRoutes };

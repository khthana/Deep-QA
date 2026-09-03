'use strict';

/**
 * รายละเอียดผลการเรียนรู้ — #38.
 *
 * The first screen in the rebuild that computes rather than records. Nothing
 * here is stored: every number is an opinion about the marks #34 wrote, and
 * this file is what turns one into the other for a Section.
 *
 * The four rules themselves moved to `lib/attainment.js` when #42 needed every
 * one of them to say the same about an intake. They are still described below,
 * because the query in this file is written to them and a reader here should
 * not have to open another file to know what the numbers mean — but the
 * constants and the arithmetic have one home now, and it is not this one.
 *
 * ## The fraction, and what a blank leaves out of it
 *
 * A student's score for one outcome is what they earned over what was
 * available to them, on a scale of five (BR-18). *Available to them* is the
 * load-bearing phrase. `activity_clo_mapping.score` says what each Activity
 * contributes to an outcome, but an Activity a student has no mark for is not
 * a nought they scored — it is work nobody has marked, which is #34's rule and
 * the reason its column is nullable at all.
 *
 * So a blank is left out of **both halves**: not added to what they earned, and
 * not added to what was available. A student marked on one of three Activities
 * is judged on the one, and a student marked on none of them has no score at
 * all — absent from the outcome's mean and its pass rate rather than sitting at
 * the bottom of both. The alternative reads every unmarked piece of work as a
 * zero a term before anybody looks at it, which would put a whole cohort in the
 * flagged band in week one.
 *
 * ## Three thresholds, two of them written down
 *
 * BR-20 bands the score: under 3.0, 3.0–3.4, 3.5–3.9, 4.0–4.4, 4.5 and over,
 * with the first flagged. BR-17 passes an *outcome* when more than sixty per
 * cent of its students passed it — strictly more, so sixty exactly does not,
 * which is what `docs/04` TC-EVAL-004 asks for and what the outcomes needing
 * attention are counted by.
 *
 * The third is not written down anywhere: when does one *student* pass one
 * outcome. The criteria table holds four sentences per outcome rather than a
 * number, and BR-17 only ever talks about the proportion. It is 3.0 of five
 * here, agreed with the user before this was built, and two rules that are
 * written down already point at it — sixty per cent of five is three exactly,
 * and three is where BR-20 stops flagging. The screen's colours and its
 * arithmetic therefore draw the same line, which is the only way a teacher can
 * read a red cell as *this one did not pass*.
 *
 * ## The band is computed from the number the screen shows
 *
 * Not from the number before rounding. They differ in the last hundredth about
 * as often as a fraction lands there, and a cell that reads 3.50 in one colour
 * and 3.5 in another is a screen arguing with itself.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const {
  PASS,
  BAND_FLOORS,
  bandOf,
  outcomeScore,
  meanOf,
  passRateOf,
  outcomePassed,
} = require('../lib/attainment');
const { offeringOf } = require('./clos');
const { sectionOf, notThisSection } = require('./enrolment');

/** A ผู้สอน's own ตอนเรียน, as in `enrolment.js`, `activities.js` and `activityScores.js`. */
const TEACHING = ['TEACHER'];

function learningDetailRoutes(pool) {
  const router = express.Router();

  /**
   * Every outcome of the Offering, in the order a person reads them.
   *
   * Not only the ones some Activity happens to reach. An outcome nothing in
   * this Section assesses is a column of blanks, and a column of blanks is the
   * thing worth seeing: it says the teaching plan has an outcome with no work
   * behind it. Selecting through `activity_clo_mapping` would have hidden
   * exactly that case, by drawing no column at all.
   *
   * The grain is the Offering's and not the Section's — ADR-0003 — which is
   * the question `offeringOf` exists to answer once for everybody.
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

  /** The roll, lowest code first, which is the order the heatmap's rows are in. */
  async function rollOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT sc.student_id, s.full_name_th
         FROM student_course sc
         JOIN student s ON s.student_id = sc.student_id
        WHERE sc.section_id = $1
        ORDER BY sc.student_id ASC`,
      [sectionId],
    );
    return rows;
  }

  /**
   * What each student earned and what was available to them, per outcome.
   *
   * The join is on the attribution row rather than on the Activity, because a
   * mark is against (student, activity, clo) and what it was out of lives on
   * the same three. `WHERE s.score IS NOT NULL` is the whole of the blank rule:
   * a row that is not there contributes to neither sum, so a student is judged
   * on the work that has been marked and on nothing else.
   */
  async function earnedOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT s.student_id, s.clo_id,
              SUM(s.score)::float AS earned,
              SUM(m.score)::float AS available
         FROM activity_scores s
         JOIN activities a ON a.id = s.activity_id
         JOIN activity_clo_mapping m
           ON m.activity_id = s.activity_id AND m.clo_id = s.clo_id
        WHERE a.section_id = $1 AND s.score IS NOT NULL
        GROUP BY s.student_id, s.clo_id`,
      [sectionId],
    );
    return rows;
  }

  router.get(
    '/teaching/sections/:sectionId/learning-details',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        // Two readings of the same permission, for two different needs: the
        // Section is what the heading says, the Offering is what the outcomes
        // belong to. Either coming back empty is the same refusal.
        const [section, offering] = await Promise.all([
          sectionOf(pool, req, req.params.sectionId),
          offeringOf(pool, req, req.params.sectionId),
        ]);
        if (!section || !offering) return notThisSection(res);

        const [clos, roll, earned] = await Promise.all([
          outcomesOf(offering),
          rollOf(section.section_id),
          earnedOf(section.section_id),
        ]);

        const earnedBy = new Map();
        for (const row of earned) {
          earnedBy.set(`${row.student_id}:${row.clo_id}`, row);
        }

        // One pass builds the grid and collects the columns at the same time,
        // so a cell and the mean it is counted in can never come from two
        // different readings of the marks.
        const perClo = new Map(clos.map((clo) => [clo.clo_id, []]));
        const students = roll.map((student) => {
          const scores = {};
          for (const clo of clos) {
            const row = earnedBy.get(`${student.student_id}:${clo.clo_id}`);
            const score = row ? outcomeScore(row.earned, row.available) : null;
            if (score !== null) perClo.get(clo.clo_id).push(score);
            scores[clo.clo_id] = {
              score,
              band: bandOf(score),
              flagged: score === null ? false : score < PASS,
            };
          }
          return { ...student, scores };
        });

        const columns = clos.map((clo) => {
          const scores = perClo.get(clo.clo_id);
          const passRate = passRateOf(scores);
          return {
            ...clo,
            student_count: scores.length,
            mean: meanOf(scores),
            pass_rate: passRate,
            passed: outcomePassed(passRate),
          };
        });

        const scored = [...perClo.values()].flat();
        return res.json({
          section,
          // BR-20's edges themselves, so the legend under the heatmap reads
          // its ranges off the rule rather than keeping a second copy of them
          // in the browser — a copy that would go on saying 3.0 – 3.4 after
          // the floors moved.
          band_floors: BAND_FLOORS,
          clos: columns,
          students,
          // Every (student, outcome) that has a score, pooled. There is no
          // per-student roll-up here because no rule says when a student passes
          // a *Section* — BR-17 is about one outcome across a cohort, BR-20
          // about one student on one outcome, and inventing the third would be
          // a threshold nobody agreed to. The screen labels the grain it shows.
          summary: {
            student_count: roll.length,
            mean: meanOf(scored),
            pass_rate: passRateOf(scored),
            // The denominator, so the screen can show the fraction rather than
            // hope a label carries the grain. A percentage beside the words
            // *57 students* is read as a share of students however it is
            // titled; `473 of 506` cannot be.
            scored_count: scored.length,
            passed_count: scored.filter((score) => score >= PASS).length,
          },
          // Named rather than left to be read off the colours, which is the
          // ticket's fourth criterion in its own words.
          attention: columns
            .filter((clo) => clo.passed === false)
            .map((clo) => ({
              clo_id: clo.clo_id,
              clo_number: clo.clo_number,
              clo_detail: clo.clo_detail,
              mean: clo.mean,
              pass_rate: clo.pass_rate,
            })),
          empty: scored.length === 0,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { learningDetailRoutes };

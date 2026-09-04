'use strict';

/**
 * การประเมินผลการเรียนรู้ — #40.
 *
 * The formal assessment table. One row per outcome: the criterion it was
 * judged by, how many of the students measured on it met that criterion, and
 * whether the outcome passed. R074 asks for it on screen and R075 asks for it
 * as a PDF, and the PDF is the point — this is the page that goes in the
 * course file and is read by people who will never open the application.
 *
 * ## The criterion is the rule, and the rubric is reference
 *
 * This is the one decision in the ticket, and it is not the obvious one.
 *
 * #29 fills `subject_clo_achievement_criteria` with four **sentences** per
 * outcome — ดีเยี่ยม / ดี / พอใช้ / ต้องปรับปรุง — and there is not a number
 * among them. Nothing in that table can decide whether a student met an
 * outcome, and `lib/attainment.js` says so in as many words: the line is
 * `PASS = 3` of five, agreed before #38 was built precisely *because* the
 * criteria table holds sentences and BR-17 only ever talks about a proportion.
 *
 * So `criteria` travels with each outcome as reference material, and the
 * criterion the report states as its own is the rule that actually judged:
 * three of five, and more than sixty per cent of the measured students. Print
 * a rubric sentence in that column instead and every reader takes the figure
 * beside it to be what the sentence produced — the same failure as #39's bands,
 * which would have been drawn from marks under a heading that said per cent.
 *
 * ## Two thresholds, and the report needs both stated
 *
 * `PASS` decides one student against one outcome. BR-17's sixty per cent
 * decides the outcome against its cohort, and it reads **more than**, so an
 * outcome exactly sixty per cent of whose students passed has not passed.
 * `outcomePassed` has always been strict; what is new here is that a document
 * says which line it used, so `rule` carries all three numbers out of
 * `lib/attainment.js` rather than letting a page component type them.
 *
 * ## The figures are #38's figures
 *
 * The fold is `columnOf`, from the same marks under the same rules, and
 * `backend/test/clo-assessment.test.js` holds this endpoint's means, pass
 * rates and verdicts against `/learning-details`. Two screens that disagree
 * about whether an outcome passed is the worst outcome available here: one of
 * them is a printed document that outlives the argument.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const {
  PASS,
  SCALE,
  OUTCOME_PASS_PERCENT,
  outcomeScore,
  columnOf,
} = require('../lib/attainment');
const { offeringOf } = require('./clos');
const { sectionOf, notThisSection } = require('./enrolment');

/** A ผู้สอน's own ตอนเรียน, as in `enrolment.js`, `activities.js` and `outcomeActivityMap.js`. */
const TEACHING = ['TEACHER'];

function cloAssessmentRoutes(pool) {
  const router = express.Router();

  /**
   * Every outcome of the Offering, in the order a person reads them —
   * ADR-0003's grain.
   *
   * The **fourth** verbatim copy of #38's query, after `sectionResults.js` and
   * `outcomeActivityMap.js`. `lib/fields.js`' rule is to extract at the third
   * and #39 already declined once, for `enrolment.js`' reason: the others live
   * in files inside other tickets' mutation sets, and a refactor within a
   * sweep's reach is how a mutant quietly stops proving anything. The count is
   * recorded rather than the debt paid, on
   * [#104](https://github.com/khthana/Deep-QA/issues/104), which now has a
   * fourth caller and no longer needs arguing for.
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
   * The four achievement bands of every outcome of this Offering, in one query.
   *
   * Ordered by `criteria_no`, which #29 assigns in the order the bands were
   * written and the seed writes best first, so a report reads down from
   * ดีเยี่ยม the way a rubric is read.
   *
   * An outcome may have none: #29 creates them one at a time and a CLO written
   * this morning has an empty list. That is a real state on this screen rather
   * than an error — the report says the criterion has not been set yet — so
   * this is grouped in JavaScript rather than joined, which would silently drop
   * the outcome that most needs pointing at.
   */
  async function criteriaOf(offering) {
    const { rows } = await pool.query(
      `SELECT a.clo_id, a.criteria_no, a.achievement_level, a.criteria_detail
         FROM subject_clo_achievement_criteria a
         JOIN subject_clo c ON c.clo_id = a.clo_id
        WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3
        ORDER BY a.clo_id ASC, a.criteria_no ASC`,
      [offering.program_id, offering.subject_id, offering.academic_year],
    );
    return rows;
  }

  /**
   * What each student earned and what was available to them, per outcome.
   *
   * Verbatim from #39, which took it from #38, and the reasons are unchanged:
   * the fold is by (student, outcome) because BR-17 counts students rather
   * than marks; `WHERE s.score IS NOT NULL` is #34's blank rule, a row that is
   * not there being added to neither half of the fraction; and the
   * `student_course` join is #36's guard, so a mark belonging to somebody no
   * longer on the roll counts here exactly as it counts there.
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

  /**
   * The รายวิชา's Thai name, which the document is headed with.
   *
   * `sectionOf` already carries `subject_name_en`, because #26's heading wanted
   * it, and it is not widened here: it is the register join four other files
   * authorise through, and #104 is the ticket for touching it. This is a lookup
   * by a `subject_id` the guard has already returned, so it decides nothing —
   * a course file submitted in Thai that names its subject in English is the
   * document failing at its first line.
   */
  async function subjectOf(subjectId) {
    const { rows } = await pool.query(
      `SELECT subject_id, subject_name_th, subject_name_en, credits
         FROM subjects WHERE subject_id = $1`,
      [subjectId],
    );
    return rows[0] ?? null;
  }

  router.get(
    '/teaching/sections/:sectionId/clo-assessment',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        // Two readings of one permission, as in `outcomeActivityMap.js`: the
        // ตอนเรียน is what the heading says and what the marks belong to, the
        // Offering is what the outcomes and their criteria belong to. Either
        // coming back empty is the same refusal.
        //
        // In sequence rather than in parallel, which is the one place this
        // route's shape differs from #39's, and it is not about speed. Only
        // `sectionOf` carries `integerId`; `offeringOf` still guards by hand
        // with `/^\d+$/`, so an all-digit id too large for an `integer`
        // reaches its query and comes back 22003 — a five hundred for a URL
        // somebody mistyped. That is
        // [#107](https://github.com/khthana/Deep-QA/issues/107), which names
        // `offeringOf` among eleven call sites and is not half-fixed from
        // inside this ticket. Asking the deciding guard first is the better
        // shape anyway: nothing should ask what Offering a ตอนเรียน belongs to
        // before establishing that this account teaches it.
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);
        const offering = await offeringOf(pool, req, req.params.sectionId);
        if (!offering) return notThisSection(res);

        const [clos, criteria, earned, subject] = await Promise.all([
          outcomesOf(offering),
          criteriaOf(offering),
          earnedOf(section.section_id),
          subjectOf(section.subject_id),
        ]);

        const scoresByClo = new Map(clos.map((clo) => [clo.clo_id, []]));
        const criteriaByClo = new Map(clos.map((clo) => [clo.clo_id, []]));
        for (const row of criteria) {
          const list = criteriaByClo.get(row.clo_id);
          if (list) list.push(row);
        }
        for (const row of earned) {
          const scores = scoresByClo.get(row.clo_id);
          if (!scores) continue;
          const score = outcomeScore(row.earned, row.available);
          if (score !== null) scores.push(score);
        }

        const lines = clos.map((clo) => ({
          ...clo,
          ...columnOf(scoresByClo.get(clo.clo_id)),
          criteria: criteriaByClo.get(clo.clo_id).map(({ clo_id: _ignored, ...rest }) => rest),
        }));

        return res.json({
          section,
          subject,
          // The rule this report judged by, in numbers, so the sentence on the
          // document is written from `lib/attainment.js` rather than from a
          // copy of it that stops being true in silence.
          rule: { scale: SCALE, pass_score: PASS, pass_percent: OUTCOME_PASS_PERCENT },
          clos: lines,
          // Nobody has been measured on anything yet, which is every ตอนเรียน
          // before its first marking. The outcomes still travel — they are what
          // the report is *about*, and what the screen does with them is the
          // screen's business rather than this route's. It happens to replace
          // the table with a sentence, as #39's does.
          //
          // `lines.length > 0` is not defensive noise. `[].every()` is `true`,
          // so an Offering whose CLOs nobody has written yet would report
          // itself as having no marks — a screen saying *ยังไม่มีคะแนน* about a
          // รายวิชา whose real problem is that it has no outcomes to mark
          // against. That is the next field along.
          empty: lines.length > 0 && lines.every((line) => line.student_count === 0),
          // No outcomes at all, which is a รายวิชา before #29 has been opened.
          // Distinct from `empty` because the thing to do about it is
          // different, and a report cannot be written either way.
          no_outcomes: lines.length === 0,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { cloAssessmentRoutes };

'use strict';

/**
 * ผลลัพธ์การเรียนรู้รายวิชา — #36.
 *
 * The same marks #38 draws one row per student from, drawn one point per
 * outcome instead, plus the thing #38 has no way to show: whether this year is
 * better than the last ones.
 *
 * The arithmetic is not here and is not new. BR-18's scale of five, BR-17's
 * sixty per cent, BR-20's bands and the blank that is not a nought all live in
 * `lib/attainment.js`, which is where #38 left them. What is here is the two
 * queries — one Section, and one whole prior year — and the two decisions that
 * say which prior years may be asked for at all.
 *
 * ## A prior year is every ตอนเรียน of the Subject, pooled
 *
 * Not the ones this ผู้สอน taught. R079 asks whether *the รายวิชา* is improving,
 * and a รายวิชา taught by three people in one year has one answer to that
 * rather than three; a comparison against only one's own past classes would
 * also disappear the moment somebody new took the subject over, which is
 * exactly when the question is worth asking.
 *
 * That is wider than the guard on the base ตอนเรียน, so it is bounded on
 * purpose and the bound is the shape of the answer rather than a check that
 * could be forgotten: **the pooled year is the only grain that exists here.**
 * There is no parameter that names a ตอนเรียน of another year, nothing in the
 * response carries a `section_id`, and a student of a past year is never a row.
 * A reader learns how the Subject did and nothing about anybody who taught or
 * sat it. ADR-0002 carries the decision, for #35's reason: an authorisation
 * that is wider than its ticket asked for belongs where the next person looks,
 * not in a comment above the query that does it.
 *
 * ## And it is only a prior year whose outcomes are the same outcomes
 *
 * A radar overlays years on one set of axes and the axes are CLOs — but a CLO
 * belongs to a (Program, Subject, academic year) per ADR-0003, so 2568's CLO-3
 * and 2569's CLO-3 are two different rows that need not say the same thing.
 * Matching them by number is the only join there is, and it is honest only when
 * the two years agree about what the numbers are. So a year is offered when its
 * set of CLO numbers is *exactly* the base year's, and refused otherwise.
 *
 * The delivered service reached for the same idea from the other end: it
 * required the set of PLOs the CLOs mapped to to match a hundred per cent. That
 * was the same instinct against a schema where CLOs hung off a Section, and it
 * is worth recording that the constraint is not an invention of this rebuild.
 *
 * Two smaller consequences of the same reasoning, both of them about not
 * offering a control that produces nothing:
 *
 * - A year with **no marks** is not offered. It would draw a polygon of blanks.
 * - There is **no cap on how far back** a year may be. The delivered code
 *   stopped at two years, which nothing in `docs/01`–`05` asks for, and a
 *   Subject's five-year trend is the accreditation question TABEE actually
 *   puts. Every year that can be drawn is offered; the screen decides how many
 *   to draw at once.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { BAND_FLOORS, outcomeScore, columnOf, summaryOf } = require('../lib/attainment');
const { offeringOf } = require('./clos');
const { sectionOf, notThisSection } = require('./enrolment');

/** A ผู้สอน's own ตอนเรียน, as in `learningDetails.js` and everywhere else Section-grained. */
const TEACHING = ['TEACHER'];

/**
 * The `years` parameter, as a list of four-digit years with no repeats.
 *
 * Anything that is not four digits is dropped here rather than refused: the
 * refusal below is about a year that cannot be compared, and `?years=abc` is
 * not a year at all. An empty or absent parameter is no comparison, which is
 * what the screen sends before anybody has ticked a box.
 */
function yearsAsked(req) {
  const raw = String(req.query.years ?? '').trim();
  if (raw === '') return [];
  return [...new Set(raw.split(',').map((year) => year.trim()).filter((year) => /^\d{4}$/.test(year)))];
}

function sectionResultRoutes(pool) {
  const router = express.Router();

  /**
   * Every outcome of the Offering, in the order a person reads them.
   *
   * Not only the ones some Activity reaches — an outcome nothing assesses is a
   * blank axis, and a blank axis is worth seeing, for the reason #38 gives at
   * length. The grain is the Offering's and not the ตอนเรียน's: ADR-0003.
   */
  async function outcomesOf(programId, subjectId, academicYear) {
    const { rows } = await pool.query(
      `SELECT c.clo_id, c.clo_number, c.clo_detail
         FROM subject_clo c
        WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3
        ORDER BY c.clo_number ASC, c.clo_id ASC`,
      [programId, subjectId, academicYear],
    );
    return rows;
  }

  /**
   * What each student earned and what was available to them, per outcome,
   * across every ตอนเรียน given.
   *
   * The array of Section ids is the whole difference between the base year and
   * a comparison year: one id for the ตอนเรียน on screen, every id of the
   * Subject for a year being compared. `WHERE s.score IS NOT NULL` is the blank
   * rule — a row that is not there contributes to neither half of the fraction.
   *
   * Grouped by (student, clo) and not by clo, because a mean of students is not
   * a mean of marks: a student marked on six activities and one marked on one
   * are one student each in BR-17's fraction, and folding at the mark would
   * quietly weight the first six times.
   *
   * Two of the joins are guards rather than navigation, and the review put both
   * of them in rather than the first draft:
   *
   * - **`student_course`** - a mark counts only for somebody still on the roll.
   *   #38 gets that for free by walking its roll and looking marks up against
   *   it; this route folds from the marks outward, so without the join a
   *   student marked and later unenrolled would go on raising the mean here and
   *   not there, and one ตอนเรียน would carry two different
   *   *คะแนนเฉลี่ยรายคนรายข้อ* on two screens. That is the drift
   *   `lib/attainment.js` warns about, one level below where it warns.
   * - **the CLO's own (program, subject, year)** - the outcome a mark is
   *   attributed to has to belong to the year being folded. It does by
   *   construction everywhere #33 wrote the attribution; but this fold keys on
   *   `clo_number`, and a number is not unique across years, so one stray
   *   attribution would be counted into a year it does not belong to and would
   *   look like a perfectly ordinary point.
   */
  async function earnedOf(sectionIds, program, subject, academicYear) {
    if (sectionIds.length === 0) return [];
    const { rows } = await pool.query(
      `SELECT s.student_id, c.clo_number,
              SUM(s.score)::float AS earned,
              SUM(m.score)::float AS available
         FROM activity_scores s
         JOIN activities a ON a.id = s.activity_id
         JOIN student_course e
           ON e.section_id = a.section_id AND e.student_id = s.student_id
         JOIN activity_clo_mapping m
           ON m.activity_id = s.activity_id AND m.clo_id = s.clo_id
         JOIN subject_clo c ON c.clo_id = s.clo_id
        WHERE a.section_id = ANY($1) AND s.score IS NOT NULL
          AND c.program_id = $2 AND c.subject_id = $3 AND c.academic_year = $4
        GROUP BY s.student_id, c.clo_number`,
      [sectionIds, program, subject, academicYear],
    );
    return rows;
  }

  /**
   * The outcome lines and the headline figures, from a roll and its marks.
   *
   * Keyed on `clo_number` throughout, including for the base year, so that the
   * base and a comparison are folded by the same function against the same key
   * — the alternative is two folds that agree until the day one of them does
   * not.
   */
  function foldBy(cloNumbers, earned, studentCount) {
    const perClo = new Map(cloNumbers.map((number) => [number, []]));
    for (const row of earned) {
      const score = outcomeScore(row.earned, row.available);
      if (score !== null && perClo.has(row.clo_number)) perClo.get(row.clo_number).push(score);
    }
    const scored = [...perClo.values()].flat();
    return { perClo, scored, summary: summaryOf(scored, studentCount) };
  }

  /**
   * Every ตอนเรียน of one Subject in each of the years given, and how many
   * students sat it - all of them in one query.
   *
   * One query and not one per year, because there is deliberately no cap on how
   * far back a year may reach: a Subject with ten comparable years would
   * otherwise fire ten queries to paint a picker nobody has ticked yet.
   *
   * `count(DISTINCT e.student_id)` and not a sum of rolls. A student enrolled in
   * two ตอนเรียน of one year is one student in that year, and `foldBy` already
   * pools them as one - so summing the rolls would put a denominator on screen
   * that the mean beside it was not computed against. The `LEFT JOIN` keeps a
   * ตอนเรียน with nobody on it inside the section count, where it belongs.
   */
  async function yearsOf(offering, academicYears) {
    if (academicYears.length === 0) return [];
    const { rows } = await pool.query(
      `SELECT sc.academic_year,
              array_agg(DISTINCT cs.section_id) AS section_ids,
              count(DISTINCT cs.section_id)::int AS section_count,
              count(DISTINCT e.student_id)::int AS student_count
         FROM semester_courses sc
         JOIN course_sections cs ON cs.semester_course_id = sc.id
         LEFT JOIN student_course e ON e.section_id = cs.section_id
        WHERE sc.program_id = $1 AND sc.subject_id = $2 AND sc.academic_year = ANY($3)
        GROUP BY sc.academic_year
        ORDER BY sc.academic_year DESC`,
      [offering.program_id, offering.subject_id, academicYears],
    );
    return rows;
  }

  /**
   * The prior years this ตอนเรียน's chart can honestly carry, newest first.
   *
   * One query answers all three conditions at once — earlier than this year,
   * the same set of CLO numbers, and at least one mark — because asking them
   * separately means three round trips and a fourth chance to disagree about
   * which years exist.
   *
   * `array_agg(DISTINCT c.clo_number)` compares as an array only because both
   * sides are ordered; without the `ORDER BY` inside the aggregate the two sets
   * would come back in whatever order the planner chose and equal sets would
   * compare unequal about as often as not.
   */
  async function comparableYears(offering) {
    const { rows } = await pool.query(
      `WITH base AS (
         SELECT array_agg(DISTINCT c.clo_number ORDER BY c.clo_number) AS numbers
           FROM subject_clo c
          WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3
       ),
       years AS (
         SELECT sc.academic_year,
                array_agg(DISTINCT c.clo_number ORDER BY c.clo_number) AS numbers
           FROM semester_courses sc
           JOIN subject_clo c
             ON c.program_id = sc.program_id
            AND c.subject_id = sc.subject_id
            AND c.academic_year = sc.academic_year
          WHERE sc.program_id = $1 AND sc.subject_id = $2 AND sc.academic_year < $3
          GROUP BY sc.academic_year
       ),
       marked AS (
         SELECT DISTINCT sc.academic_year
           FROM semester_courses sc
           JOIN course_sections cs ON cs.semester_course_id = sc.id
           JOIN activities a ON a.section_id = cs.section_id
           JOIN activity_scores s ON s.activity_id = a.id
          WHERE sc.program_id = $1 AND sc.subject_id = $2 AND s.score IS NOT NULL
       )
       SELECT y.academic_year
         FROM years y, base b
        WHERE y.numbers = b.numbers
          AND y.academic_year IN (SELECT academic_year FROM marked)
        ORDER BY y.academic_year DESC`,
      [offering.program_id, offering.subject_id, offering.academic_year],
    );
    return rows.map((row) => row.academic_year);
  }

  router.get(
    '/teaching/sections/:sectionId/results',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        // Two readings of the same permission, as #38 does it: the ตอนเรียน is
        // what the heading says and the Offering is what the outcomes belong
        // to. Either coming back empty is the same refusal, and neither is
        // read from anything the caller sent but the id in the path.
        const [section, offering] = await Promise.all([
          sectionOf(pool, req, req.params.sectionId),
          offeringOf(pool, req, req.params.sectionId),
        ]);
        if (!section || !offering) return notThisSection(res);

        const asked = yearsAsked(req);
        const [clos, available] = await Promise.all([
          outcomesOf(offering.program_id, offering.subject_id, offering.academic_year),
          comparableYears(offering),
        ]);

        // Refused rather than dropped. A chart quietly missing the line
        // somebody asked for is a screen that answered a different question
        // than the one it was asked.
        const refused = asked.find((year) => !available.includes(year));
        if (refused !== undefined) {
          return res.status(400).json({ message: REFUSALS.yearNotComparable });
        }

        const numbers = clos.map((clo) => clo.clo_number);
        const roll = await pool.query(
          'SELECT count(*)::int AS total FROM student_course WHERE section_id = $1',
          [section.section_id],
        );
        const base = foldBy(
          numbers,
          await earnedOf(
            [section.section_id],
            offering.program_id,
            offering.subject_id,
            offering.academic_year,
          ),
          roll.rows[0].total,
        );

        const years = await yearsOf(offering, available);
        const comparison = await Promise.all(
          years
            .filter((year) => asked.includes(year.academic_year))
            .map(async (year) => {
              const folded = foldBy(
                numbers,
                await earnedOf(
                  year.section_ids,
                  offering.program_id,
                  offering.subject_id,
                  year.academic_year,
                ),
                year.student_count,
              );
              return {
                academic_year: year.academic_year,
                section_count: year.section_count,
                // `clo_number` and no `clo_id`, because the id would be this
                // year's row wearing another year's number — the one mistake
                // the whole matching rule exists to prevent.
                clos: numbers.map((number) => ({
                  clo_number: number,
                  ...columnOf(folded.perClo.get(number)),
                })),
                summary: folded.summary,
              };
            }),
        );

        return res.json({
          section,
          offering,
          band_floors: BAND_FLOORS,
          clos: clos.map((clo) => ({ ...clo, ...columnOf(base.perClo.get(clo.clo_number)) })),
          summary: base.summary,
          empty: base.scored.length === 0,
          // What the picker offers, with the size of each year on it: a person
          // choosing between two years should be able to see that one of them
          // is a cohort of nine before they read anything into its shape.
          available_years: years.map((year) => ({
            academic_year: year.academic_year,
            section_count: year.section_count,
            student_count: year.student_count,
          })),
          comparison,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { sectionResultRoutes };

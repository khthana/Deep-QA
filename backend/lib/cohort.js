'use strict';

/**
 * What an intake earned, and the first step of turning it into outcomes.
 *
 * `lib/attainment.js` owns the rules that turn a mark into a five-point score
 * and a score into a band. This owns the step above them: reading one intake's
 * marks out of the database, and rolling them up to **one score per student
 * per outcome**.
 *
 * It exists because two screens now need exactly that and no more. #42 takes
 * these per-student scores and reduces them to one figure per outcome; #43
 * hands them over as a grid. Both are the same two steps of arithmetic up to
 * the point where they part, and a second copy of those steps is the kind of
 * debt #42's own header warned about — two screens drawing plausible numbers
 * that disagree, with nobody holding both printouts at once.
 *
 * It was not written until the second caller arrived, which is the rule this
 * repository keeps for extractions: a module shaped for a caller that does not
 * exist yet is shaped by a guess.
 *
 * ## Why the query is here and not left in the routes
 *
 * `attainment.js` says its own queries stay in the routes, because what counts
 * as *the marks in scope* is exactly what differs between #38 and #42 — one
 * asks about a Section, the other about an intake. That reasoning holds and is
 * why the CLO-level scoping is still written out in `learningDetails.js`. It
 * simply does not apply to these two callers: #42 and #43 are the same scope,
 * one intake of one curriculum, asked at two levels of detail. Splitting the
 * query from the roll-up here would put one half in a lib and leave the other
 * duplicated in two routes, which is the arrangement that goes wrong quietly.
 */

const { outcomeScore, meanOf } = require('./attainment');

/**
 * What each student of the intake earned and what was available to them, per
 * CLO, with the outcome that CLO names carried alongside.
 *
 * The grain is (student, CLO) and not (student, outcome), because the roll-up
 * has two steps and they are not interchangeable: averaging the CLOs first
 * gives each outcome one vote per CLO that serves it, where pooling the marks
 * would give it one vote per mark. The join to `student_course` is what keeps
 * the marks to the Sections the student is actually enrolled in, so a mark
 * left behind by an unenrolment stops counting the moment the roll does.
 *
 * `s.score IS NOT NULL` is #34's blank rule, and it is why the sum is taken
 * over the attribution row rather than over the Activity: an Activity nobody
 * has marked for this student contributes to neither half of the fraction.
 */
async function cohortMarks(pool, programId, admissionYear) {
  const { rows } = await pool.query(
    `SELECT s.student_id, s.clo_id, c.plo_id,
            SUM(s.score)::float AS earned,
            SUM(m.score)::float AS available
       FROM activity_scores s
       JOIN activities a ON a.id = s.activity_id
       JOIN activity_clo_mapping m
         ON m.activity_id = s.activity_id AND m.clo_id = s.clo_id
       JOIN subject_clo c ON c.clo_id = s.clo_id
       JOIN student st ON st.student_id = s.student_id
       JOIN student_course sc
         ON sc.student_id = s.student_id AND sc.section_id = a.section_id
      WHERE st.program_id = $1
        AND st.admission_year = $2
        AND c.program_id = $1
        AND s.score IS NOT NULL
      GROUP BY s.student_id, s.clo_id, c.plo_id`,
    [programId, admissionYear],
  );
  return rows;
}

/**
 * One score per student per outcome — both steps of the roll-up, and no more.
 *
 * Step one turns each (student, CLO) row into a five-point score. Step two
 * averages, for each student, the CLO scores that name one outcome, each CLO
 * counting once. What comes back is `Map<student_id, Map<outcome_id, score>>`,
 * which is as far as the two screens agree: #42 goes on to reduce each
 * outcome's column to a mean and a pass rate, #43 draws the map as it is.
 *
 * A CLO naming no outcome is dropped rather than gathered under a null key: it
 * belongs to no column of either screen, and a null key in a Map is a bug
 * waiting for the day something iterates the keys.
 */
function scoresByStudent(marks) {
  const perStudent = new Map();
  for (const row of marks) {
    const score = outcomeScore(row.earned, row.available);
    if (score === null || row.plo_id === null) continue;
    if (!perStudent.has(row.student_id)) perStudent.set(row.student_id, new Map());
    const outcomes = perStudent.get(row.student_id);
    if (!outcomes.has(row.plo_id)) outcomes.set(row.plo_id, []);
    outcomes.get(row.plo_id).push(score);
  }

  const rolled = new Map();
  for (const [studentId, outcomes] of perStudent) {
    rolled.set(
      studentId,
      new Map([...outcomes].map(([outcomeId, scores]) => [outcomeId, meanOf(scores)])),
    );
  }
  return rolled;
}

module.exports = { cohortMarks, scoresByStudent };

'use strict';

/**
 * What an intake earned, and the first step of turning it into outcomes.
 *
 * `lib/attainment.js` owns the rules that turn a mark into a five-point score
 * and a score into a band. This owns the step above them: reading one intake's
 * marks out of the database, and rolling them up to **one score per student
 * per outcome**.
 *
 * It exists because four screens now need exactly that and no more. #42 takes
 * these per-student scores and reduces them to one figure per outcome; #43
 * hands them over as a grid; #44 asks #42's question once per year of a range,
 * which is why the reduction itself moved here when that ticket landed; and #45
 * asks #43's question about one row of its grid. All four are the same two
 * steps of arithmetic up to the point where they part,
 * and a second copy of those steps is the kind of debt #42's own header warned
 * about — screens drawing plausible numbers that disagree, with nobody holding
 * both printouts at once.
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
 * simply does not apply to these callers, because every one of them asks about
 * **one intake of one curriculum**: #42 and #43 ask it once at two levels of
 * detail, #44 asks it once per year and lays the answers side by side, and #45
 * narrows #43's scope to one of the students inside it — all of which are
 * different questions made of the same scope, not different scopes.
 * Splitting the query from the roll-up here would put one half in a lib and
 * leave the other duplicated in four routes, which is the arrangement that
 * goes wrong quietly.
 */

const {
  bandOf,
  outcomeScore,
  meanOf,
  passRateOf,
  outcomePassed,
} = require('./attainment');

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
 *
 * `studentId` narrows the answer to one row of it, for #45. It is a filter on
 * the same query rather than a query of its own, and that is the point: the
 * grain, the joins and the blank rule are what decide what a student's score
 * *is*, so a second query would be a second answer to that question, free to
 * drift from the heatmap the screen promises to agree with. Filtering after
 * the GROUP BY would do as well arithmetically and read a whole intake to
 * throw it away.
 */
async function cohortMarks(pool, programId, admissionYear, studentId = null) {
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
        AND ($3::varchar IS NULL OR s.student_id = $3)
      GROUP BY s.student_id, s.clo_id, c.plo_id`,
    [programId, admissionYear, studentId],
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

/**
 * One intake's figures for each outcome — the whole of #42's report, and one
 * column of #44's.
 *
 * Written inside `routes/programResults.js` while #42 was the only caller and
 * moved here when #44 arrived, which is this repository's rule for extractions
 * and, here, is also the fourth acceptance criterion of that ticket. #44 claims
 * that a year read on the trend says what the same year says on the report
 * beside it; the assertion that checks it is in `program-results.test.js`, but
 * what makes the claim *true* is that there is one function and both routes
 * call it. Two copies would go on drawing plausible trends, and only somebody
 * holding two printouts at once would ever see the step in the line that no
 * teaching produced.
 *
 * The banding is done here rather than in the browser, and from the rounded
 * mean the screen shows rather than from the number behind it, for #38's two
 * reasons: BR-20 is a business rule, and a figure that reads 3.50 in one colour
 * and 3.5 in another is a screen arguing with itself.
 */
function rollUpOutcomes(plos, marks) {
  // outcome -> the students who have a score for it, one number each.
  const perOutcome = new Map(plos.map((plo) => [plo.outcome_id, []]));
  for (const outcomes of scoresByStudent(marks).values()) {
    for (const [outcomeId, score] of outcomes) {
      if (perOutcome.has(outcomeId)) perOutcome.get(outcomeId).push(score);
    }
  }

  return plos.map((plo) => {
    // One number per student, not one per CLO — which is what makes the pass
    // rate a share of students.
    const scores = perOutcome.get(plo.outcome_id);
    const passRate = passRateOf(scores);
    const mean = meanOf(scores);
    return {
      ...plo,
      student_count: scores.length,
      mean,
      band: bandOf(mean),
      pass_rate: passRate,
      passed: outcomePassed(passRate),
    };
  });
}

module.exports = { cohortMarks, scoresByStudent, rollUpOutcomes };

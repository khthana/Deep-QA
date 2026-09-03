'use strict';

/**
 * ผลการเรียนรู้ระดับหลักสูตรตามปีรับเข้า — #42.
 *
 * The first screen that reports on a cohort rather than on a room. #38 asks
 * how one Section did on one CLO; this asks how an intake did on one PLO,
 * across every Subject that intake has sat.
 *
 * ## Where the roll-up lives, and why not in a lib yet
 *
 * The five-point rules are in `lib/attainment.js`, because #38 and this screen
 * both apply them and a second copy of a *rule* goes wrong quietly. The two
 * steps of the cohort roll-up — `marksOf` and `rollUp` — are still here, with
 * one caller, for the reason `attainment.js` was extracted at its second use
 * and not its first: what #43 to #45 will need is not knowable from one use,
 * and a module shaped for a caller that does not exist yet is shaped by a
 * guess. #43 is where the second use arrives and where this moves.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { integerId } = require('../lib/fields');
const { programInReach, reachablePrograms } = require('../lib/reach');
const {
  BAND_FLOORS,
  bandOf,
  outcomeScore,
  meanOf,
  passRateOf,
  outcomePassed,
} = require('../lib/attainment');

/**
 * Who reads this screen.
 *
 * PROG_MANAGER owns the Program and its results (CONTEXT.md). EXT_ASSESSOR is
 * here because the shell already sends it here and says why in
 * `frontend/src/components/SidebarItem/ExtAssessor.js`: no requirement names a
 * screen for that role, so rather than invent a set it gets read-only reach at
 * the one thing an accreditation review is for. #49 owns the real answer, and
 * when it lands this list is where it changes.
 */
const READERS = ['PROG_MANAGER', 'EXT_ASSESSOR'];

function programResultRoutes(pool) {
  const router = express.Router();

  /**
   * Every main outcome of the Program, in the order the curriculum lists them.
   *
   * Main outcomes only — `level_depth = 1` — because that is the grain
   * `subject_clo.plo_id` points at, and #100 settled the same grain for the
   * coverage grid after fifty-two columns proved unreadable. And *every* one of
   * them rather than only those some CLO names, for #38's reason: an outcome
   * with no CLO behind it is the row worth seeing, and selecting through the
   * CLOs would have drawn no row at all.
   */
  async function outcomesOf(programId) {
    const { rows } = await pool.query(
      `SELECT o.outcome_id, o.outcome_code, o.outcome_title, o.outcome_type
         FROM learning_outcomes o
        WHERE o.program_id = $1 AND o.parent_outcome_id IS NULL
        ORDER BY o.sequence_order ASC, o.outcome_id ASC`,
      [programId],
    );
    return rows;
  }

  /**
   * What each student of the intake earned and what was available to them, per
   * CLO, with the outcome that CLO names carried alongside.
   *
   * The grain is (student, CLO) and not (student, PLO), because the roll-up
   * has two steps and they are not interchangeable: averaging the CLOs first
   * gives each outcome of the curriculum one vote per CLO that serves it,
   * where pooling the marks would give it one vote per mark. The join to
   * `student_course` is what keeps the marks to the Sections the student is
   * actually enrolled in, so a mark left behind by an unenrolment stops
   * counting the moment the roll does.
   *
   * `s.score IS NOT NULL` is #34's blank rule, and it is why the sum is taken
   * over the attribution row rather than over the Activity: an Activity nobody
   * has marked for this student contributes to neither half of the fraction.
   */
  async function marksOf(programId, admissionYear) {
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
   * The cohort's score for each outcome, in two steps.
   *
   * First every (student, CLO) mark becomes one five-point score. Then each
   * student gets one score per outcome — the mean of their CLO scores for the
   * CLOs that name it — and the outcome's figures are taken across those, one
   * number per student rather than one per CLO. A student sitting three CLOs of
   * an outcome therefore counts once, which is what makes the pass rate a share
   * of *students* and not a share of marks.
   */
  function rollUp(plos, marks) {
    // outcome -> student -> the CLO scores that student has for it.
    const perOutcome = new Map(plos.map((plo) => [plo.outcome_id, new Map()]));
    for (const row of marks) {
      const score = outcomeScore(row.earned, row.available);
      if (score === null || !perOutcome.has(row.plo_id)) continue;
      const students = perOutcome.get(row.plo_id);
      if (!students.has(row.student_id)) students.set(row.student_id, []);
      students.get(row.student_id).push(score);
    }

    return plos.map((plo) => {
      // One number per student, not one per CLO — which is what makes the pass
      // rate a share of students.
      const scores = [...perOutcome.get(plo.outcome_id).values()].map(meanOf);
      const passRate = passRateOf(scores);
      const mean = meanOf(scores);
      return {
        ...plo,
        student_count: scores.length,
        mean,
        // Banded here rather than in the browser, and banded from the rounded
        // mean the screen shows rather than from the number behind it, for
        // #38's two reasons: BR-20 is a business rule, and a figure that reads
        // 3.50 in one colour and 3.5 in another is a screen arguing with itself.
        band: bandOf(mean),
        pass_rate: passRate,
        passed: outcomePassed(passRate),
      };
    });
  }

  /**
   * How many students the intake has on the roll of this Program.
   *
   * Counted from the register rather than from the marks, which is the whole
   * of the difference between *nobody is here* and *nobody has been marked
   * yet*. The screen says something different for each.
   */
  async function cohortOf(programId, admissionYear) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS student_count FROM student
        WHERE program_id = $1 AND admission_year = $2`,
      [programId, admissionYear],
    );
    return rows[0];
  }

  /**
   * The curricula this caller reaches — the screen's first picker.
   *
   * Drawn from here rather than from `/api/programs`, which belongs to the two
   * administrators (#15) and would refuse both the committee member this
   * screen is mainly for and the assessor reviewing it. `plos.js` and
   * `programSubjects.js` each answer the same question at their own path for
   * the same reason.
   */
  router.get('/program-results/programs', requireRole(...READERS), async (req, res, next) => {
    try {
      const programs = await reachablePrograms(pool, req.auth.acting.scope_id);
      return res.status(200).json({ programs });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The intakes this curriculum has students in — the screen's second picker.
   *
   * Read off the register rather than offered as a range of years, so the list
   * has no year in it that would open on an empty report. Newest first: a
   * committee looks at the cohort partway through before it looks at the ones
   * that graduated. Declared before `/by-intake` only for readability; the two
   * paths cannot collide.
   */
  router.get('/program-results/intakes', requireRole(...READERS), async (req, res, next) => {
    try {
      const program = await programInReach(pool, req.auth.acting.scope_id, req.query.program_id);
      if (!program) return res.status(404).json({ message: REFUSALS.programNotFound });

      const { rows } = await pool.query(
        `SELECT admission_year, count(*)::int AS student_count
           FROM student
          WHERE program_id = $1 AND admission_year IS NOT NULL
          GROUP BY admission_year
          ORDER BY admission_year DESC`,
        [program.program_id],
      );
      return res.status(200).json({ intakes: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/program-results/by-intake', requireRole(...READERS), async (req, res, next) => {
    try {
      // The intake is taken as it arrives. It is not an identifier that opens
      // anything - `student.admission_year` is a four-character column and a
      // year nobody was admitted in simply matches no students - so a missing
      // or nonsensical one answers an empty cohort rather than a refusal.
      // That is the honest answer to *how did the 2999 intake do*: nobody, so
      // far. The curriculum beside it is a different matter and is checked,
      // because reading one is a thing a caller may or may not be allowed.
      const admissionYear = req.query.admission_year;

      // ADR-0002: the curriculum the caller may read comes from the grant the
      // session put on the request, never from the query string agreeing with
      // itself. A curriculum in somebody else's department, a retired one and
      // one that was never there answer alike.
      const program = await programInReach(pool, req.auth.acting.scope_id, req.query.program_id);
      if (!program) return res.status(404).json({ message: REFUSALS.programNotFound });
      const programId = program.program_id;

      const [outcomes, marks, cohort] = await Promise.all([
        outcomesOf(programId),
        marksOf(programId, admissionYear),
        cohortOf(programId, admissionYear),
      ]);

      const plos = rollUp(outcomes, marks);
      return res.status(200).json({
        admission_year: admissionYear,
        cohort,
        // BR-20's edges travel with the data, so the legend reads its ranges
        // off the rule rather than keeping a second copy of them in the
        // browser — a copy that would go on saying 3.0 – 3.4 after the floors
        // moved. #38 does the same and was walked proving it.
        band_floors: BAND_FLOORS,
        plos,
        // About the marks, not about the outcomes: a cohort measured against
        // three outcomes of thirteen has a report worth reading, and one
        // measured against none has a sentence instead of a table. Zeroes
        // would say the intake scored nothing, which is a different claim and
        // not one anybody has made.
        empty: marks.length === 0,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * One main outcome of this Program, or null.
   *
   * The Program is checked before the outcome and the outcome is looked up
   * *within* it, so an outcome id belonging to another curriculum is not found
   * rather than found and then refused — the same shape `programInReach` uses
   * one table up.
   */
  async function outcomeOf(programId, outcomeId) {
    const { rows } = await pool.query(
      `SELECT o.outcome_id, o.outcome_code, o.outcome_title, o.outcome_type
         FROM learning_outcomes o
        WHERE o.program_id = $1 AND o.outcome_id = $2 AND o.parent_outcome_id IS NULL`,
      [programId, outcomeId],
    );
    return rows[0] || null;
  }

  /**
   * The Subjects, CLOs and Activities the intake's marks for one outcome came
   * from — the drill-down that lets a figure be verified rather than trusted.
   *
   * One row per (Subject, CLO, Activity) that this intake actually has a mark
   * against. *Actually has a mark against* is the load-bearing phrase: an
   * Activity attributed to the outcome that nobody in this cohort was marked on
   * contributed nothing to the figure, and listing it would offer a person
   * evidence for a number it is not evidence for.
   */
  async function contributionsOf(programId, admissionYear, outcomeId) {
    const { rows } = await pool.query(
      `SELECT DISTINCT
              sub.subject_id, sub.subject_name_th, sub.subject_name_en,
              c.clo_id, c.clo_number, c.clo_detail,
              a.id AS activity_id, a.activity_name, a.activity_type,
              a.score_number, a.section_id
         FROM activity_scores s
         JOIN activities a ON a.id = s.activity_id
         JOIN activity_clo_mapping m
           ON m.activity_id = s.activity_id AND m.clo_id = s.clo_id
         JOIN subject_clo c ON c.clo_id = s.clo_id
         JOIN subjects sub ON sub.subject_id = c.subject_id
         JOIN student st ON st.student_id = s.student_id
         JOIN student_course sc
           ON sc.student_id = s.student_id AND sc.section_id = a.section_id
        WHERE st.program_id = $1
          AND st.admission_year = $2
          AND c.program_id = $1
          AND c.plo_id = $3
          AND s.score IS NOT NULL
        ORDER BY sub.subject_id ASC, c.clo_number ASC, a.id ASC`,
      [programId, admissionYear, outcomeId],
    );
    return rows;
  }

  /**
   * The evidence attached to the Activities a figure rests on.
   *
   * Listed, not served. #35 owns both the upload and the authenticated
   * retrieval — the delivered system served the evidence directory statically
   * with no authentication at all, which is one of the two defects that ticket
   * exists to fix — so a download here would be that ticket's acceptance
   * criterion written twice, once without the guard. What this gives the
   * drill-down is the fact that a file exists and what it is; opening it waits
   * for #35, and #42's fifth criterion is half-met until then.
   *
   * `is_deleted` is read here, unlike in `activities.js` where the delete guard
   * deliberately ignores it: a soft-deleted file still blocks a delete because
   * the foreign key does, but it is not evidence anybody should be offered.
   */
  async function evidenceFor(activityIds) {
    if (activityIds.length === 0) return [];
    const { rows } = await pool.query(
      `SELECT e.evidence_id, e.activity_id, e.evidence_type, e.description,
              e.file_name, e.mime_type, e.file_size, e.uploaded_at
         FROM activity_evidence e
        WHERE e.activity_id = ANY($1) AND NOT e.is_deleted
        ORDER BY e.activity_id ASC, e.uploaded_at ASC, e.evidence_id ASC`,
      [activityIds],
    );
    return rows;
  }

  /** The flat rows above, folded into the shape the drill-down is read in. */
  function bySubject(rows, evidence) {
    const filesFor = new Map();
    for (const file of evidence) {
      if (!filesFor.has(file.activity_id)) filesFor.set(file.activity_id, []);
      filesFor.get(file.activity_id).push(file);
    }

    const subjects = new Map();
    for (const row of rows) {
      if (!subjects.has(row.subject_id)) {
        subjects.set(row.subject_id, {
          subject_id: row.subject_id,
          subject_name_th: row.subject_name_th,
          subject_name_en: row.subject_name_en,
          clos: new Map(),
          activities: new Map(),
        });
      }
      const subject = subjects.get(row.subject_id);

      if (!subject.clos.has(row.clo_id)) {
        subject.clos.set(row.clo_id, {
          clo_id: row.clo_id,
          clo_number: row.clo_number,
          clo_detail: row.clo_detail,
        });
      }

      if (!subject.activities.has(row.activity_id)) {
        subject.activities.set(row.activity_id, {
          id: row.activity_id,
          activity_name: row.activity_name,
          activity_type: row.activity_type,
          score_number: row.score_number,
          section_id: row.section_id,
          clos: [],
          evidence: filesFor.get(row.activity_id) || [],
        });
      }
      subject.activities.get(row.activity_id).clos.push({
        clo_id: row.clo_id,
        clo_number: row.clo_number,
      });
    }

    return [...subjects.values()].map((subject) => ({
      ...subject,
      clos: [...subject.clos.values()],
      activities: [...subject.activities.values()],
    }));
  }

  router.get(
    '/program-results/by-intake/outcomes/:outcomeId',
    requireRole(...READERS),
    async (req, res, next) => {
      try {
        const program = await programInReach(pool, req.auth.acting.scope_id, req.query.program_id);
        if (!program) return res.status(404).json({ message: REFUSALS.programNotFound });

        // Checked for shape *and* range before it reaches the query. An
        // all-digit id past int4 is a 22003 the caller reads as
        // เกิดข้อผิดพลาดในระบบ, which is [#107](https://github.com/khthana/Deep-QA/issues/107)
        // — four routes still guard this by hand, and this is not becoming
        // the fifth.
        const requested = integerId(req.params.outcomeId);
        const outcome = requested && (await outcomeOf(program.program_id, requested));
        if (!outcome) return res.status(404).json({ message: REFUSALS.ploNotFound });

        const rows = await contributionsOf(
          program.program_id,
          req.query.admission_year,
          outcome.outcome_id,
        );
        const evidence = await evidenceFor([...new Set(rows.map((row) => row.activity_id))]);

        return res.status(200).json({
          outcome,
          admission_year: req.query.admission_year,
          subjects: bySubject(rows, evidence),
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { programResultRoutes };

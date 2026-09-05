'use strict';

/**
 * ผลการเรียนรู้ระดับหลักสูตร — #42, #43, #44 and #45.
 *
 * The reports that are about a cohort rather than about a room. #38 asks how
 * one Section did on one CLO; these ask how an intake did on one PLO across
 * every Subject that intake has sat — one intake at a time (#42), student by
 * student (#43), year after year (#44), and one named student on their own
 * (#45).
 *
 * ## Where the roll-up lives
 *
 * The five-point rules are in `lib/attainment.js`; the intake's marks, the
 * per-student roll-up and the reduction of an outcome's column to a mean, a
 * pass rate and a verdict are in `lib/cohort.js`. All of them were extracted at
 * their second use rather than their first. The last of them moved out when
 * #44 arrived, and moving it *is* that ticket's fourth criterion: a year read
 * on the trend has to say what the same year says on #42's report, and what
 * makes that true is that there is one `rollUpOutcomes` and both routes call
 * it. What is left in this file is what each report does with the answer.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { integerId, studentCode } = require('../lib/fields');
const { programInReach, reachablePrograms } = require('../lib/reach');
const { cohortMarks, scoresByStudent, rollUpOutcomes } = require('../lib/cohort');
const { PASS, BAND_FLOORS, bandOf } = require('../lib/attainment');

/**
 * How many intakes #44 will compare in one answer.
 *
 * Ten, for two reasons that happen to agree. A curriculum is revised on a
 * five-year cycle, so ten years is two of them and a committee asking about
 * the effect of a revision is asking about a range this wide at most. And a
 * table wider than that stops being a thing a person reads across — the
 * lesson #100 learned at fifty-two columns, arrived at from the other side.
 *
 * Exported to be *read* — by the sentence that refuses a wider range, and by
 * the test that checks the boundary. Nothing outside this file applies it.
 */
const MAX_INTAKE_SPAN = 10;

/** What `student.admission_year` holds: four digits, and nothing else. */
const YEAR = /^\d{4}$/;

/**
 * The years a range covers — **every** year between its ends, not every year
 * the register happens to have somebody in.
 *
 * This is #44's one real decision. An intake that was never taken is a fact
 * about the curriculum, and a chart that closes the gap draws 2566 next to
 * 2564 where every reader will take them for consecutive years — which is
 * exactly the misreading a trend is read to avoid. So a year nobody was
 * admitted in gets a column, and the column says so.
 *
 * Both ends are taken as they arrive rather than checked against anything.
 * They are not identifiers that open something: `admission_year` is a
 * four-character column, and a year nobody was admitted in simply matches no
 * students. A missing or nonsensical end, and a range that finishes before it
 * starts, therefore answer *no years* rather than a refusal — #42's rule for a
 * single intake, applied to a pair of them.
 *
 * Width is the exception, and the reason it is one is that this is the only
 * query string on these reports that names the *size* of the answer instead of
 * which answer. `{ tooWide }` rather than a clamped range, because silently
 * returning eleven years of a hundred asked for is a report that does not say
 * what it is.
 *
 * The screen can reach this: both ends come from the register, so a curriculum
 * whose register is longer than the cap has two the reader may pick. What the
 * screen cannot do is *open* on it — the cap travels with the intake list, and
 * the range the screen starts from is cut back to fit.
 */
function intakeRange(from, to) {
  if (!YEAR.test(String(from ?? '')) || !YEAR.test(String(to ?? ''))) return { years: [] };

  const start = Number(from);
  const end = Number(to);
  if (end < start) return { years: [] };
  if (end - start + 1 > MAX_INTAKE_SPAN) return { tooWide: true, years: [] };

  const years = [];
  for (let year = start; year <= end; year += 1) years.push(String(year));
  return { years };
}

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
   * How many students each of these intakes has on the roll of this Program.
   *
   * Counted from the register rather than from the marks, which is the whole
   * of the difference between *nobody is here* and *nobody has been marked
   * yet*. Every screen here says something different for each, and #44 has a
   * third thing to say about a year the register does not mention at all —
   * which is why a year with nobody in it is simply absent from these rows and
   * is nought at the caller.
   */
  async function cohortsIn(programId, years) {
    if (years.length === 0) return new Map();
    const { rows } = await pool.query(
      `SELECT admission_year, count(*)::int AS student_count
         FROM student
        WHERE program_id = $1 AND admission_year = ANY($2)
        GROUP BY admission_year`,
      [programId, years],
    );
    return new Map(rows.map((row) => [row.admission_year, row.student_count]));
  }

  /** The same count for one intake, in the shape #42's report reads it in. */
  async function cohortOf(programId, admissionYear) {
    const counts = await cohortsIn(programId, [admissionYear]);
    return { student_count: counts.get(admissionYear) || 0 };
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
      // #44's cap travels with the list its two ends are chosen from, for
      // `band_floors`' reason one screen over: a browser holding its own copy
      // of the number would go on offering an eleven-year range after the
      // route moved to twelve, and would open every such curriculum on a
      // refusal. The screen that picks a single year ignores it.
      return res.status(200).json({ intakes: rows, max_span: MAX_INTAKE_SPAN });
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
        cohortMarks(pool, programId, admissionYear),
        cohortOf(programId, admissionYear),
      ]);

      const plos = rollUpOutcomes(outcomes, marks);
      return res.status(200).json({
        admission_year: admissionYear,
        cohort,
        // BR-20's edges travel with the data, so the legend reads its ranges
        // off the rule rather than keeping a second copy of them in the
        // browser — a copy that would go on saying 3.0 – 3.4 after the floors
        // moved. #38 does the same and was walked proving it.
        band_floors: BAND_FLOORS,
        plos,
        // About what came out of the roll-up, not about what went into it. A
        // cohort measured against three outcomes of thirteen has a report
        // worth reading, and one measured against none has a sentence instead
        // of a table — zeroes would say the intake scored nothing, which is a
        // different claim and not one anybody has made.
        //
        // Counted from the columns rather than from `marks.length`, because
        // marks can exist and reach no column: `subject_clo.plo_id` is
        // nullable, so a CLO naming no outcome carries marks that belong to no
        // row of this report, and an Activity worth nothing has a score but no
        // fraction. Either would have answered *not empty* and then drawn
        // thirteen rows of dashes, which is the case this flag exists to stop.
        empty: plos.every((plo) => plo.student_count === 0),
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Everybody on the intake's roll, in code order.
   *
   * From the register rather than from the marks, which is the whole of #43's
   * first criterion: a heatmap built by asking *who has a score* draws no row
   * for the student nobody has assessed, and that student is the one a
   * committee most needs to find. The order is the code because a heatmap the
   * reader can sort needs something stable to sort *from*.
   */
  async function rollOf(programId, admissionYear) {
    const { rows } = await pool.query(
      `SELECT student_id, full_name_th
         FROM student
        WHERE program_id = $1 AND admission_year = $2
        ORDER BY student_id ASC`,
      [programId, admissionYear],
    );
    return rows;
  }

  /**
   * One student's cells, and the two counts that summarise them.
   *
   * A cell per main outcome, whether or not this student has been measured
   * against it — #38's rule at the grain of one person, and the reason #45 can
   * be read as an appeal: the outcome nobody has assessed them on is a row a
   * committee has to be able to see is blank.
   *
   * This is where #43 and #45 are made to agree. The heatmap builds a row with
   * it and #45's report builds its whole answer with it, so the two cannot
   * disagree about a band, a flag or a count — there is one reading, not two
   * that match today. The alternative was an assertion comparing the outputs,
   * which proves they agreed about the fixture at the moment it ran.
   *
   * The shape is keyed by `outcome_id` because the heatmap draws its columns
   * from the outcome list and looks each cell up by id; #45 reads the same
   * object back into the outcome list to make its rows.
   */
  function cellsFor(plos, outcomes) {
    const scores = {};
    let measured = 0;
    let below = 0;

    for (const plo of plos) {
      const score = outcomes.has(plo.outcome_id) ? outcomes.get(plo.outcome_id) : null;
      // #38's word for the same thing, and the same reason: the flag has to
      // survive being printed, and two shades of a ramp do not. Read once, so
      // the count a reader is ordered by and the mark they see on the cell
      // cannot come from two readings of the line.
      const flagged = score !== null && score < PASS;
      if (score !== null) measured += 1;
      if (flagged) below += 1;
      scores[plo.outcome_id] = { score, band: bandOf(score), flagged };
    }

    return { scores, measured_count: measured, below_count: below };
  }

  /**
   * The grid, one row per student on the roll and one cell per main outcome.
   *
   * `below_count` and `measured_count` are what the screen sorts on, and they
   * are counts rather than an average on purpose. No rule says what a student's
   * score across a whole curriculum is — BR-17 is about one outcome across a
   * cohort, BR-18 and BR-20 about one student on one outcome — so an average
   * over a student's outcomes would be a figure this ticket invented and then
   * ordered people by. *Below the line on 2 of the 7 they were measured on* is
   * made of nothing but rules that already exist, and a reader can check it
   * against the row it sits beside.
   */
  function grid(plos, roll, marks) {
    const byStudent = scoresByStudent(marks);
    return roll.map((student) => ({
      ...student,
      ...cellsFor(plos, byStudent.get(student.student_id) || new Map()),
    }));
  }

  router.get(
    '/program-results/by-intake/students',
    requireRole(...READERS),
    async (req, res, next) => {
      try {
        const admissionYear = req.query.admission_year;

        // ADR-0002 again, and the same refusal as the report beside it.
        const program = await programInReach(pool, req.auth.acting.scope_id, req.query.program_id);
        if (!program) return res.status(404).json({ message: REFUSALS.programNotFound });
        const programId = program.program_id;

        const [outcomes, roll, marks] = await Promise.all([
          outcomesOf(programId),
          rollOf(programId, admissionYear),
          cohortMarks(pool, programId, admissionYear),
        ]);

        const students = grid(outcomes, roll, marks);

        return res.status(200).json({
          admission_year: admissionYear,
          band_floors: BAND_FLOORS,
          plos: outcomes,
          students,
          // About what reached a cell, not about the roll and not about the
          // rows the marks query returned. A cohort with students and no marks
          // gets a sentence; a grid of dashes would invite a reader to look
          // for a pattern in the fact that no marking has happened — and marks
          // can exist and reach no cell, since a CLO naming no outcome belongs
          // to no column here.
          empty: students.every((student) => student.measured_count === 0),
        });
      } catch (error) {
        return next(error);
      }
    },
  );

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
   *
   * `studentId` narrows the same phrase to one person, for #45, and narrowing
   * rather than re-asking is what makes a student's evidence provably a subset
   * of their cohort's. The Activity the cohort sat and this student did not is
   * not evidence about this student, and on a screen an appeal is read from
   * that is not a cosmetic difference.
   */
  async function contributionsOf(programId, admissionYear, outcomeId, studentId = null) {
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
          AND ($4::varchar IS NULL OR s.student_id = $4)
        ORDER BY sub.subject_id ASC, c.clo_number ASC, a.id ASC`,
      [programId, admissionYear, outcomeId, studentId],
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

  /**
   * The same report as `/by-intake`, once per year of a range — #44.
   *
   * A committee changes a curriculum and then wants to know whether it worked.
   * One intake cannot answer that: a cohort is a hundred-odd people who also
   * had a particular set of teachers in a particular year, and a single figure
   * carries all of it at once. A line of them carries rather less.
   *
   * **Every figure here comes back through `rollUpOutcomes`, the function
   * `/by-intake` reduces its own column with.** That is the ticket's fourth
   * criterion and it is met structurally rather than by agreement: the two
   * routes cannot drift because there is nothing to drift. What is added here
   * is the shape — the columns transposed so a row is an outcome and a cell is
   * one year of it, which is the way the question is asked.
   *
   * The transpose is keyed by `outcome_id` and not by position. `rollUpOutcomes`
   * maps over the outcomes it is handed and so preserves their order, but a
   * report where PLO-3's 2566 figure could land on PLO-4's row if that ever
   * stopped being true is not a report worth the saving.
   *
   * There is no drill-down. #42 has one and a person opens it on the year they
   * are asking about; a drill-down here would have to name a year as well as an
   * outcome, which is #42's question with two extra clicks in front of it.
   */
  router.get('/program-results/across-intakes', requireRole(...READERS), async (req, res, next) => {
    try {
      // ADR-0002, and the same refusal every report in this file gives: the
      // curriculum comes from the grant the session put on the request, and a
      // curriculum in somebody else's department, a retired one and one that
      // was never there answer alike.
      const program = await programInReach(pool, req.auth.acting.scope_id, req.query.program_id);
      if (!program) return res.status(404).json({ message: REFUSALS.programNotFound });

      const { years, tooWide } = intakeRange(req.query.from_year, req.query.to_year);
      if (tooWide) {
        return res
          .status(400)
          .json({ message: REFUSALS.intakeRangeTooWide(MAX_INTAKE_SPAN) });
      }

      const programId = program.program_id;
      const outcomes = await outcomesOf(programId);
      const [cohorts, columns] = await Promise.all([
        cohortsIn(programId, years),
        // One column per year, each of them the whole of #42's arithmetic. The
        // marks are read a year at a time rather than in one query grouped by
        // intake, because `cohortMarks` is the query #42 asks and asking a
        // different one here would be the first half of the drift the shared
        // roll-up exists to prevent.
        Promise.all(
          years.map(async (year) =>
            rollUpOutcomes(outcomes, await cohortMarks(pool, programId, year)),
          ),
        ),
      ]);

      const byOutcome = columns.map((column) => new Map(column.map((row) => [row.outcome_id, row])));

      const plos = outcomes.map((outcome) => ({
        ...outcome,
        years: years.map((year, at) => {
          const cell = byOutcome[at].get(outcome.outcome_id);
          return {
            admission_year: year,
            student_count: cell.student_count,
            mean: cell.mean,
            band: cell.band,
            pass_rate: cell.pass_rate,
            passed: cell.passed,
          };
        }),
      }));

      return res.status(200).json({
        // The range is not echoed back. #42 echoes its `admission_year`
        // because the line above its table reads it; here every column names
        // its own year, so a second statement of the range would be a field
        // nothing renders.
        band_floors: BAND_FLOORS,
        years: years.map((year, at) => ({
          admission_year: year,
          // From the register.
          student_count: cohorts.get(year) || 0,
          // From the marks. The two disagreeing is the whole of what a column
          // header has to say: a hundred and thirteen students and nothing
          // measured is a different sentence from nobody admitted.
          measured_count: columns[at].filter((row) => row.student_count > 0).length,
        })),
        plos,
        // Read off the columns that came out of the roll-up, never off the
        // number of mark rows — #43's review found that mistake on the screen
        // beside this one. Marks can exist and reach no cell, because a CLO
        // naming no outcome belongs to no row of this report.
        empty: years.every((year, at) => columns[at].every((row) => row.student_count === 0)),
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The intake's roll, for the picker #45 opens on.
   *
   * The register's list rather than the marks', which is #43's first criterion
   * borrowed whole: the student nobody has assessed has to be *choosable*, or
   * the screen a committee opens to look into an appeal cannot be opened on
   * the case most likely to be appealed. `measured_count` rides along so the
   * picker can say which of them that is before a person clicks.
   *
   * Separate from `/by-intake/students` rather than read off it, because the
   * heatmap sends every student's thirteen cells and the picker draws a name.
   *
   * The count comes out of `cellsFor`, the same function the report and the
   * heatmap build their cells with, rather than off the size of the student's
   * score map. Those two are not the same number: `subject_clo.plo_id` is only
   * required to name *an* outcome of the curriculum, so a CLO may name a
   * sub-outcome, and the map would then count something no report has a column
   * for. A student marked only under a sub-outcome would go untagged in this
   * list and land on *ยังไม่มีคะแนนของนักศึกษาคนนี้* — two readings of one
   * count, disagreeing, which is the exact failure extracting `cellsFor` was
   * meant to make impossible. **Found by review.**
   */
  router.get('/program-results/by-intake/roll', requireRole(...READERS), async (req, res, next) => {
    try {
      const program = await programInReach(pool, req.auth.acting.scope_id, req.query.program_id);
      if (!program) return res.status(404).json({ message: REFUSALS.programNotFound });

      const programId = program.program_id;
      const [outcomes, roll, marks] = await Promise.all([
        outcomesOf(programId),
        rollOf(programId, req.query.admission_year),
        cohortMarks(pool, programId, req.query.admission_year),
      ]);
      const byStudent = scoresByStudent(marks);

      return res.status(200).json({
        admission_year: req.query.admission_year,
        students: roll.map((student) => ({
          ...student,
          measured_count: cellsFor(outcomes, byStudent.get(student.student_id) || new Map())
            .measured_count,
        })),
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * One student of this Program, or null — the guard every #45 route opens on.
   *
   * The Program is checked first and the student looked up *within* it, the
   * shape `outcomeOf` uses one report up, so a student of another curriculum
   * is not found rather than found and then refused. That is ADR-0002 and it
   * matters more here than anywhere else in the file: everything the other
   * reports return is an aggregate, and this one is a named person's record.
   *
   * `program_id = $1` is doing work that `programInReach` cannot do for it, and
   * the case that needs it is the one a review had to point out: a committee
   * member of 0503 asking about a 0501 student **through 0503**. The
   * curriculum is theirs, so the reach check passes; the student is not in it,
   * and only this clause says so. Both of the refusals written first were
   * caught one line earlier, and the guard could have been deleted with every
   * test still green.
   *
   * `studentCode` is why a code longer than the column can hold is a ไม่พบ
   * rather than a 22001 read to a person as เกิดข้อผิดพลาดในระบบ — #107's class
   * of defect, kept out of a route rather than added to the list of four.
   */
  async function studentOf(programId, studentId) {
    const code = studentCode(studentId);
    if (!code) return null;
    const { rows } = await pool.query(
      `SELECT student_id, full_name_th, admission_year, status
         FROM student
        WHERE program_id = $1 AND student_id = $2`,
      [programId, code],
    );
    return rows[0] || null;
  }

  /**
   * One student, against every outcome their curriculum promises — #45.
   *
   * #43 draws a cohort as a grid and this pulls one row out of it, which is
   * the whole ticket and also the whole of what can go wrong. Both build their
   * cells with `cellsFor` over marks read by `cohortMarks`, so the row a person
   * clicks on the heatmap and the report they land on are one reading of the
   * marks rendered twice, not two readings that happen to agree.
   *
   * **The intake is not a query string.** A student belongs to exactly one and
   * it is on their record; taking it from the caller would let a real student
   * be asked about under a year they did not sit, and be answered — correctly,
   * and uselessly — that they have no marks at all.
   */
  router.get(
    '/program-results/students/:studentId',
    requireRole(...READERS),
    async (req, res, next) => {
      try {
        const program = await programInReach(pool, req.auth.acting.scope_id, req.query.program_id);
        if (!program) return res.status(404).json({ message: REFUSALS.programNotFound });
        const programId = program.program_id;

        const student = await studentOf(programId, req.params.studentId);
        if (!student) return res.status(404).json({ message: REFUSALS.studentNotFound });

        const [outcomes, marks] = await Promise.all([
          outcomesOf(programId),
          cohortMarks(pool, programId, student.admission_year, student.student_id),
        ]);

        const { scores, measured_count, below_count } = cellsFor(
          outcomes,
          scoresByStudent(marks).get(student.student_id) || new Map(),
        );

        return res.status(200).json({
          student,
          band_floors: BAND_FLOORS,
          // The outcome list with each student's cell folded into its row,
          // rather than the heatmap's list-plus-lookup. One student is one
          // column of that grid stood on its end, and a row of this report is
          // read as a whole — the outcome, what they scored on it, and whether
          // that is below the line.
          plos: outcomes.map((outcome) => ({ ...outcome, ...scores[outcome.outcome_id] })),
          measured_count,
          below_count,
          // Said, not drawn. A person nobody has marked gets a sentence,
          // because thirteen rows of dashes reads as a report that they failed
          // everything — an accusation the marks do not support, made about a
          // named student rather than about a cohort.
          empty: measured_count === 0,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * What this student was marked on under one outcome — #45's drill-down.
   *
   * The cohort's drill-down narrowed to one person, through the same query, so
   * what a student is offered as evidence for their own figure is provably a
   * subset of what the cohort was offered for theirs. The evidence is listed
   * and not served, for the reason `evidenceFor` gives: #35 owns retrieval,
   * and this screen's button goes there.
   */
  router.get(
    '/program-results/students/:studentId/outcomes/:outcomeId',
    requireRole(...READERS),
    async (req, res, next) => {
      try {
        const program = await programInReach(pool, req.auth.acting.scope_id, req.query.program_id);
        if (!program) return res.status(404).json({ message: REFUSALS.programNotFound });
        const programId = program.program_id;

        const student = await studentOf(programId, req.params.studentId);
        if (!student) return res.status(404).json({ message: REFUSALS.studentNotFound });

        const requested = integerId(req.params.outcomeId);
        const outcome = requested && (await outcomeOf(programId, requested));
        if (!outcome) return res.status(404).json({ message: REFUSALS.ploNotFound });

        const rows = await contributionsOf(
          programId,
          student.admission_year,
          outcome.outcome_id,
          student.student_id,
        );
        const evidence = await evidenceFor([...new Set(rows.map((row) => row.activity_id))]);

        return res.status(200).json({
          student,
          outcome,
          subjects: bySubject(rows, evidence),
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { programResultRoutes, MAX_INTAKE_SPAN };

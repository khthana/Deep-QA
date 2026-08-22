'use strict';

/**
 * Ticket #17: the central student register.
 *
 * The register is where a student first exists. Nothing beneath it — a Section
 * enrolment, an activity mark, a CLO result — can name a student the register
 * has not heard of, because `student_course.student_id` is a foreign key onto
 * this table, so the whole Teacher half of the application is unreachable until
 * this screen can put rows here. That is the ticket, and it is why the two
 * write paths matter more than the list.
 *
 * Three decisions are worth stating, because each one is a place the inherited
 * implementation did something else.
 *
 * *The department is derived from the หลักสูตร, never asked for.* A student's
 * row carries both, and a form that asked for both would be asking somebody to
 * retype what `programs.department_id` already says and then refusing them when
 * the two disagreed. So the body and the spreadsheet name a `program_id` and
 * the department comes off the programme's own row. The column stays, and the
 * list still filters on it, because #17's first criterion asks for both filters
 * and because a department is the coarser of the two questions.
 *
 * This is a deliberate divergence from the inherited screen, whose import file
 * carried ชื่อภาควิชา and ชื่อสาขาวิชา as free text and matched them by name.
 *
 * *The admission year is derived from the code and is never read.* #17's
 * seventh criterion. `66010001` is a student admitted in 2566: the first two
 * digits are the Buddhist-era year less 2500, which is how the seed's two
 * cohorts were built and what the inherited controller computed. A body may
 * carry `admission_year` and it is discarded, which is the only thing "not
 * editable" can mean on a server.
 *
 * *An import meets an existing code by updating it.* The sixth criterion. A
 * registry office sends the same spreadsheet again with a correction in it, and
 * the useful answer is the correction rather than a page of duplicate-key
 * refusals. Two rows of *one* file claiming one code are still refused — that
 * is a mistake in the file, not a correction to the register — and so is a
 * typed `POST` naming a code that is already there, because an administrator
 * filling a form in has not asked to overwrite anybody.
 *
 * What is deliberately absent is editing and removal. docs/06 has no story for
 * either — 35, 36 and 37 are browse, add and page — and #17's nine criteria ask
 * for neither. A student who leaves is a `status`, and the ticket that needs it
 * can add it.
 *
 * Authorisation is DEPT_ADMIN alone, which the advisor settled the same way
 * #61 settled the subject catalogue: the register is departmental master data,
 * and neither the faculty administrator above it nor the programme committee
 * beside it maintains it. docs/05 A07 named three roles and now names one.
 */

const express = require('express');

const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, isDuplicate } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');
const { reachableDepartments, reachablePrograms, programInReach } = require('../lib/reach');

const MAINTAINERS = ['DEPT_ADMIN'];

/** `full_name_th` is generated, and comes back so a list need not concatenate. */
const RETURNED = `student_id, first_name_th, last_name_th, full_name_th,
                  department_id, program_id, admission_year, status`;

/**
 * The template's columns — no department, and no admission year.
 *
 * Both are answers the server already holds, and a column for either would be a
 * column somebody fills in and is then refused for, or worse, is believed.
 */
const IMPORT_COLUMNS = ['student_id', 'first_name_th', 'last_name_th', 'program_id'];

/**
 * A student code is eight digits, which is what makes the year derivable.
 *
 * The column is `varchar(20)`, but a code of any other shape has no first two
 * digits to read a cohort out of, and `Number('ab')` would put a NaN into a
 * `varchar(4)`. Refusing the shape here is what stops that, and it agrees with
 * both the seeded cohorts and the inherited controller.
 */
const CODE = /^\d{8}$/;

/** `66010001` was admitted in 2566. */
const admissionYearOf = (studentId) => String(2500 + Number(studentId.slice(0, 2)));

const NAME_WIDTH = 100;

/**
 * One row, from a typed form or from a spreadsheet, judged on its own.
 *
 * What it cannot judge is the หลักสูตร, which needs the database and the
 * caller's authority — that is `programRefusal` below, and it is the same
 * function for both paths for the same reason this one is.
 */
function readStudent(source) {
  const values = {
    student_id: blankToNull(source.student_id),
    first_name_th: blankToNull(source.first_name_th),
    last_name_th: blankToNull(source.last_name_th),
    program_id: blankToNull(source.program_id),
  };

  if (!values.student_id || !CODE.test(values.student_id)) {
    return { ok: false, reason: 'invalidStudent' };
  }
  if (!values.first_name_th || values.first_name_th.length > NAME_WIDTH) {
    return { ok: false, reason: 'invalidStudent' };
  }
  if (!values.last_name_th || values.last_name_th.length > NAME_WIDTH) {
    return { ok: false, reason: 'invalidStudent' };
  }
  if (!values.program_id) {
    return { ok: false, reason: 'invalidStudent' };
  }

  // Derived, not read. `source.admission_year` is ignored wherever it came
  // from, which is the seventh criterion.
  values.admission_year = admissionYearOf(values.student_id);

  return { ok: true, values };
}

/**
 * What an existing code does to a write, and it is the only thing the two
 * paths disagree about.
 *
 * `status` is not in the SET list: a student who was marked graduated stays
 * graduated when the registry office re-sends the file that first named them.
 * `updated_at` is set by hand because the table carries no trigger.
 */
const OVERWRITE = `ON CONFLICT (student_id) DO UPDATE
                          SET first_name_th = EXCLUDED.first_name_th,
                              last_name_th = EXCLUDED.last_name_th,
                              department_id = EXCLUDED.department_id,
                              program_id = EXCLUDED.program_id,
                              admission_year = EXCLUDED.admission_year,
                              updated_at = now()`;

/**
 * Writing one student, for whichever of the two callers is asking.
 *
 * The typed form writes through the pool and the import writes through the
 * client its transaction is on, and both take the same six columns in the same
 * order - so the statement is written once and handed the executor, as
 * `insertSubject` is, rather than copied into the route and into the importer's
 * `insert` where the two could drift a column apart. What differs is one
 * clause: the import overwrites a code it meets and the form does not, which is
 * the sixth criterion and the paragraph above it.
 */
async function writeStudent(executor, values, { overwrite = false } = {}) {
  const { rows } = await executor.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th,
                          department_id, program_id, admission_year)
          VALUES ($1, $2, $3, $4, $5, $6)
     ${overwrite ? OVERWRITE : ''}
       RETURNING ${RETURNED}`,
    [
      values.student_id,
      values.first_name_th,
      values.last_name_th,
      values.department_id,
      values.program_id,
      values.admission_year,
    ],
  );
  return rows[0];
}

function studentRoutes(pool) {
  const router = express.Router();

  /**
   * The two authority questions a write has to pass, asked together.
   *
   * The first is the หลักสูตร named by the request: it has to exist, still be
   * offered, and be inside the reach derived from the acting grant — which is
   * the shape ADR-0002 permits, a target named by a request being verified
   * against authority that came from the database.
   *
   * The second is the student already in the register. Without it, an import
   * would be a way of overwriting somebody else's student by knowing their
   * code: the incoming programme would be in *this* administrator's reach, the
   * upsert would move the row into it, and a department would quietly lose a
   * student. A code held outside the reach answers `studentNotYours` rather
   * than the 409 a code held inside it would get: which department holds them
   * is not this caller's to learn.
   *
   * Answers a REFUSALS key or null, which is `importRows`' `verify` contract,
   * and fills in `values.department_id` from the programme it just resolved —
   * the draft object `verify` is handed is the same one `insert` is given, and
   * looking the programme up twice to avoid saying so would be worse.
   */
  async function refuseWrite(req, values) {
    const scopeId = req.auth.acting.scope_id;

    const program = await programInReach(pool, scopeId, values.program_id);
    if (!program) return 'studentProgramNotYours';
    values.department_id = program.department_id;

    const reach = await coveredScopes(pool, scopeId);
    const { rows } = await pool.query(
      `SELECT ($2::text[] IS NULL OR department_id = ANY($2)) AS mine
         FROM student WHERE student_id = $1`,
      [values.student_id, reach],
    );
    if (rows[0] && !rows[0].mine) return 'studentNotYours';

    return null;
  }

  /**
   * The register, paged, narrowed by department and by หลักสูตร — the first
   * criterion, and the eighth.
   *
   * The reach is the outer clause and the two filters sit inside it, so a
   * `?department_id=` naming somebody else's department returns an empty page
   * rather than that department's students. Both filters are applied to the
   * count as well as to the page, or the pager would offer pages that are not
   * there.
   */
  router.get('/students', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { page, perPage, offset } = pageOf(req);
      const department = blankToNull(req.query.department_id) ?? null;
      const program = blankToNull(req.query.program_id) ?? null;

      const where = `WHERE ($1::text[] IS NULL OR department_id = ANY($1))
                       AND ($2::text IS NULL OR department_id = $2)
                       AND ($3::text IS NULL OR program_id = $3)`;

      const counted = await pool.query(`SELECT count(*)::int AS total FROM student ${where}`, [
        reach,
        department,
        program,
      ]);
      const { rows } = await pool.query(
        // Newest first, and newest means most recently *added*, not highest
        // code. A register only grows, and every other list here sorts
        // ascending because a code is a name - but ascending would bury this
        // year's intake behind every year before it, and the student somebody
        // has just added would land on the last page. Sorting on the code alone
        // would only move that problem: a late-admitted `63…` transferring in
        // would land on the last page too, and the second criterion is that a
        // student who has just been added *appears in the list*. So `created_at`
        // decides, and the code breaks its ties - which for a seeded or
        // imported batch, all written in one statement, is the whole ordering.
        `SELECT ${RETURNED} FROM student ${where}
          ORDER BY created_at DESC, student_id DESC
          LIMIT $4 OFFSET $5`,
        [reach, department, program, perPage, offset],
      );

      return res.status(200).json({
        students: rows,
        total: counted.rows[0].total,
        page,
        per_page: perPage,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The หลักสูตร this caller reaches — the list's filter and the form's
   * picker, and the screen's only way of turning a `program_id` on a row into a
   * name a person recognises. Each carries its `department_id`, which is what
   * lets the screen show the department the server is about to derive rather
   * than leaving it blank until the row comes back.
   */
  router.get('/students/programs', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const programs = await reachablePrograms(pool, req.auth.acting.scope_id);
      return res.status(200).json({ programs });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The departments this caller reaches — what turns the `department_id` on a
   * row into a name, and what the list's coarser filter is drawn from. One
   * department is the ordinary answer since the register is DEPT_ADMIN's, and
   * the screen states it rather than offering a dropdown of one.
   */
  router.get('/students/departments', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const departments = await reachableDepartments(pool, req.auth.acting.scope_id);
      return res.status(200).json({ departments });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The blank file — declared above `/students/:studentId`, or Express would
   * read the word `import-template` as a student code.
   */
  router.get('/students/import-template', requireRole(...MAINTAINERS), (req, res) =>
    sendTemplate(res, 'students-template.csv', IMPORT_COLUMNS, {
      student_id: '66010001',
      first_name_th: 'สมชาย',
      last_name_th: 'ใจดี',
      program_id: '0501',
    }),
  );

  /**
   * A spreadsheet of students — the fourth, fifth and sixth criteria.
   *
   * `keys` is what refuses two rows of one file claiming one code; the database
   * cannot, because the upsert below would take the second as a correction to
   * the first and report nothing at all.
   */
  router.post('/students/import', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const result = await importRows(pool, req.body, {
        // Every column the template has, which is the one screen where the two
        // lists coincide: `IMPORT_COLUMNS` above already leaves out the
        // department and the admission year because the server holds both, so
        // what is left is exactly what `readStudent` refuses a row without.
        // Written out rather than spelled `IMPORT_COLUMNS` so that adding an
        // optional column to the template later does not silently start
        // refusing files that omit it.
        required: ['student_id', 'first_name_th', 'last_name_th', 'program_id'],
        readRow: (record) => {
          const draft = readStudent(record);
          return draft.ok ? { ok: true, draft: draft.values } : draft;
        },
        keys: [{ of: (values) => values.student_id, message: REFUSALS.repeatedStudentId }],
        verify: (values) => refuseWrite(req, values),
        insert: async (client, values) => ({
          ok: true,
          row: await writeStudent(client, values, { overwrite: true }),
        }),
      });
      return sendImport(res, result, 'students');
    } catch (error) {
      return next(error);
    }
  });

  /**
   * One student, if this caller may see them.
   *
   * A code nobody holds and a code held in another department answer the same
   * 404, for the reason `refuseWrite` gives.
   */
  router.get('/students/:studentId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { rows } = await pool.query(
        `SELECT ${RETURNED} FROM student
          WHERE student_id = $1
            AND ($2::text[] IS NULL OR department_id = ANY($2))`,
        [req.params.studentId, reach],
      );
      if (!rows[0]) return res.status(404).json({ message: REFUSALS.studentNotFound });
      return res.status(200).json({ student: rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * One student, typed in — the second criterion.
   *
   * A code already in the register is refused rather than updated, which is
   * where this path parts company with the import above: a person filling in a
   * form has not asked to overwrite anybody, and the 409 is how they find out
   * the student is already there. The refusal comes from the unique violation
   * rather than from a look-up first, so two administrators typing the same
   * code at the same moment cannot both be told it is free.
   */
  router.post('/students', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readStudent(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const refusal = await refuseWrite(req, draft.values);
      if (refusal) return res.status(403).json({ message: REFUSALS[refusal] });

      try {
        const student = await writeStudent(pool, draft.values);
        return res.status(201).json({ student });
      } catch (error) {
        if (isDuplicate(error)) {
          return res.status(409).json({ message: REFUSALS.duplicateStudentId });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { studentRoutes };

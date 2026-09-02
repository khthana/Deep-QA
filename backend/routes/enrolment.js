'use strict';

/**
 * Ticket #25: the class list of one ตอนเรียน.
 *
 * #17 built the central register — where a student first exists. This is the
 * other half of that sentence: who, of the people the register holds, is in
 * this class. The two are deliberately not one screen and not one refusal, and
 * the reason is the line in the ticket: a code the register has never heard of
 * is answered with "add them to the register first" rather than by creating a
 * half-formed student here, because that is what keeps a mark from ever
 * attaching to an unknown person.
 *
 * The database says the same thing one layer down and is the real enforcement:
 * `student_course.student_id` is a foreign key onto `student`. What this file
 * adds is that the person is told *which* register, and told before the write
 * rather than by a 23503 reaching the error handler as เกิดข้อผิดพลาดในระบบ.
 *
 * *The grain is the Section, and this is the file where that is not a
 * simplification.* #27's CLOs hang off the Offering because ADR-0003 puts them
 * at (Program, Subject, ปีการศึกษา), and `clos.js` resolves a Section id into
 * that triple on every request. Enrolment does not: two ตอนเรียน of one
 * Offering are two different class lists, which is the whole reason a Section
 * exists. So `sectionOf` below stops at the Section and never reaches the
 * Offering, and a route here that borrowed `offeringOf` would quietly return
 * the sibling Section's students along with its own.
 *
 * *The teaching register is the whole authorisation.* ADR-0002: the Section
 * comes from the address and whose it is comes from `course_sections_teacher`,
 * never from anything the caller sent. A Section that is somebody else's and a
 * Section that does not exist answer 404 with one sentence, as they do in
 * `teaching.js` and `clos.js`, so the address bar is not a way of learning
 * which ids exist. Being a Teacher in the same department is not being the
 * teacher of that class.
 *
 * *Nobody is recorded as having enrolled anybody.* `student_course` carries
 * `created_at` and no `created_by`, and a Section can have two teachers, so the
 * question "who added this student" has no answer here. That is the schema's
 * decision, not an oversight in this file — ADR-0001 tier 2 made the junction a
 * pair of foreign keys and nothing more — and #25 does not ask it. #27's
 * `updated_by` exists because that ticket did.
 *
 * *Removal is guarded, which #25 does not ask for and #27 does.* Nothing in the
 * schema references `student_course`, so a DELETE always succeeds — and would
 * leave `activity_scores` and `student_group_member` rows naming somebody no
 * longer in the class. `cloHasScores` and `cloInUse` are the same guard one
 * grain up, and the ticket's own sentence about marks and unknown people is
 * this failure with the arrow reversed. The two states are refused separately
 * because each has a different way out.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, integerId, isDuplicate } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');

/** Enrolment is the Teacher's own class list, as in `teaching.js` and `clos.js`. */
const TEACHING = ['TEACHER'];

/** `full_name_th` is generated, so a list need not concatenate. */
const RETURNED = `s.student_id, s.first_name_th, s.last_name_th, s.full_name_th,
                  s.program_id, s.admission_year, s.status`;

/** One column, because one is all an enrolment is: the register holds the rest. */
const IMPORT_COLUMNS = ['student_id'];

/** Eight digits, the same shape #17's register refuses anything else in. */
const CODE = /^\d{8}$/;

/**
 * This Section, if this account teaches it — and null for every other case.
 *
 * The `integerId` guard is ahead of the query for `teaching.js`' reason: the
 * column is an integer and a non-numeric id would be a 22P02 from the
 * database rather than the 404 the caller is owed. It bounds as well as
 * shapes — an all-digit id too large for `integer` is a 22003 with the same
 * consequence, which #32's tests caught here.
 *
 * Module-level and exported, as `clos.js` exports `offeringOf` and for the
 * same reason: #31's teaching plan is Section-bound and is authorised by
 * exactly this question, and a fourth copy of the register join is what
 * [#104](https://github.com/khthana/Deep-QA/issues/104) exists to prevent.
 * The two names stay two shapes on purpose — this one stops at the Section
 * (see the grain note at the top of this file), `offeringOf` resolves through
 * to the Offering.
 */
async function sectionOf(pool, req, sectionId) {
  const id = integerId(sectionId);
  if (id === null) return null;
  const { rows } = await pool.query(
    // The รายวิชา comes back with the Section because the heading says it, as
    // #27's does. It is display, not authorisation: what decides the answer
    // is the join through `course_sections_teacher` and nothing else.
    `SELECT cs.section_id, cs.section_number, sc.academic_year, sc.semester,
            sc.subject_id, s.subject_name_en
       FROM course_sections_teacher cst
       JOIN course_sections cs ON cs.section_id = cst.section_id
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
       JOIN subjects s ON s.subject_id = sc.subject_id
      WHERE cs.section_id = $1 AND cst.user_id = $2`,
    [id, req.session.userId],
  );
  return rows[0] ?? null;
}

/**
 * The one sentence a Section that is not this account's gets — and the one a
 * Section that does not exist gets, deliberately the same.
 *
 * Module-level and exported beside `sectionOf`, because the two are one act:
 * resolve the ตอนเรียน, or refuse it. #26 was about to be the fourth verbatim
 * copy, and `lib/fields.js` documents the rule it would have broken - extract
 * at the third. The two copies still in `teachingPlan.js` and `activities.js`
 * are [#104](https://github.com/khthana/Deep-QA/issues/104)'s to fold in; they
 * are not touched here because those files sit in other tickets' mutation
 * sets, and a refactor inside a sweep's reach is how a mutant quietly starts
 * missing.
 */
const notThisSection = (res) => res.status(404).json({ message: REFUSALS.sectionNotFound });

function enrolmentRoutes(pool) {
  const router = express.Router();

  /**
   * One student code, judged on its own — the shape, and nothing else.
   *
   * What it cannot judge is whether the register holds the code, which needs
   * the database: that is `refuseEnrolment` below, and it is the same function
   * for the typed form and for the spreadsheet so the two cannot drift.
   */
  function readCode(source) {
    const student_id = blankToNull(source.student_id);
    if (!student_id || !CODE.test(student_id)) return { ok: false, reason: 'invalidEnrolment' };
    return { ok: true, values: { student_id } };
  }

  /** In the register or not. Answers a REFUSALS key or null — `verify`'s contract. */
  async function refuseEnrolment(values) {
    const { rows } = await pool.query('SELECT 1 FROM student WHERE student_id = $1', [
      values.student_id,
    ]);
    return rows[0] ? null : 'studentNotInRegister';
  }

  /** The row as the list returns it, so one enrolment and a page agree on shape. */
  async function enrolledStudent(client, sectionId, studentId) {
    const { rows } = await client.query(
      `INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)
       RETURNING (SELECT row_to_json(r) FROM
                   (SELECT ${RETURNED} FROM student s WHERE s.student_id = $1) r) AS student`,
      [studentId, sectionId],
    );
    return rows[0].student;
  }

  /**
   * The class list, paged — the first criterion.
   *
   * Ordered by code, which is how every list of named things here is ordered
   * and is what a class list on paper looks like. #17's register sorts newest
   * first instead, because a register only grows and the student just added
   * would otherwise land on the last page; a class list is read to find
   * somebody, so the code decides.
   */
  router.get(
    '/teaching/sections/:sectionId/students',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const { page, perPage, offset } = pageOf(req);
        const counted = await pool.query(
          'SELECT count(*)::int AS total FROM student_course WHERE section_id = $1',
          [section.section_id],
        );
        const { rows } = await pool.query(
          `SELECT ${RETURNED} FROM student_course sc
             JOIN student s ON s.student_id = sc.student_id
            WHERE sc.section_id = $1
            ORDER BY s.student_id
            LIMIT $2 OFFSET $3`,
          [section.section_id, perPage, offset],
        );

        return res.status(200).json({
          students: rows,
          total: counted.rows[0].total,
          page,
          per_page: perPage,
          section,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * The blank file — declared above the routes that name a student code, so
   * Express does not read `import-template` as one.
   *
   * The example row is `66019999`, outside both seeded cohorts on purpose.
   * #67 is about a template shipping a real student's code as its sample; a
   * person who uploads this one unedited is answered by the register, which is
   * the right lesson and no one's personal data.
   */
  router.get(
    '/teaching/sections/:sectionId/students/import-template',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        if (!(await sectionOf(pool, req, req.params.sectionId))) return notThisSection(res);
        return sendTemplate(res, 'section-students-template.csv', IMPORT_COLUMNS, {
          student_id: '66019999',
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * A spreadsheet of codes — the seventh and eighth criteria.
   *
   * `keys` refuses two rows of one file claiming one code before the database
   * is asked, because the database would refuse the second as a duplicate
   * enrolment and the person would be told the student is already in the class
   * when what is wrong is that they typed them twice.
   *
   * That nothing is applied when one row is wrong is `importRows`' own
   * behaviour, not something arranged here: it stages every row, and rolls the
   * whole transaction back if any error was collected.
   */
  router.post(
    '/teaching/sections/:sectionId/students/import',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const result = await importRows(pool, req.body, {
          required: IMPORT_COLUMNS,
          readRow: (record) => {
            const draft = readCode(record);
            return draft.ok ? { ok: true, draft: draft.values } : draft;
          },
          keys: [{ of: (values) => values.student_id, message: REFUSALS.repeatedStudentId }],
          verify: (values) => refuseEnrolment(values),
          insert: async (client, values) => {
            try {
              return { ok: true, row: await enrolledStudent(client, section.section_id, values.student_id) };
            } catch (error) {
              if (isDuplicate(error)) return { ok: false, reason: 'duplicateEnrolment' };
              throw error;
            }
          },
        });
        return sendImport(res, result, 'students');
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * One student, by code — the second, third and fourth criteria.
   *
   * The duplicate is the database's answer rather than a SELECT taken first:
   * ADR-0001 tier 2 made (student_id, section_id) the key precisely so that two
   * requests arriving together cannot both find nothing and both write.
   */
  router.post(
    '/teaching/sections/:sectionId/students',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const draft = readCode(req.body ?? {});
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        const refusal = await refuseEnrolment(draft.values);
        if (refusal) return res.status(404).json({ message: REFUSALS[refusal] });

        try {
          const student = await enrolledStudent(pool, section.section_id, draft.values.student_id);
          return res.status(201).json({ student });
        } catch (error) {
          if (isDuplicate(error)) {
            return res.status(409).json({ message: REFUSALS.duplicateEnrolment });
          }
          throw error;
        }
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * Taking somebody back out — the fifth criterion, and the two guards.
   *
   * The confirmation the criterion asks for is the screen's: a server cannot
   * tell a considered DELETE from an accidental one, and a route that asked for
   * a `confirm: true` in the body would be taking an authorisation input from
   * the caller for a question the caller has already answered by calling.
   *
   * Both guards are asked before the DELETE rather than left to a constraint,
   * because there is no constraint — nothing references this table. Marks are
   * looked for in *this* Section's Activities only: the same student may be
   * marked in the Section they are staying in, and that is not a reason to keep
   * them here.
   */
  router.delete(
    '/teaching/sections/:sectionId/students/:studentId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const studentId = req.params.studentId;
        const { rows } = await pool.query(
          `SELECT EXISTS (SELECT 1 FROM activity_scores s
                            JOIN activities a ON a.id = s.activity_id
                           WHERE s.student_id = $1 AND a.section_id = $2) AS marked,
                  EXISTS (SELECT 1 FROM student_group_member m
                            JOIN student_group g ON g.group_id = m.group_id
                           WHERE m.student_id = $1 AND g.section_id = $2) AS grouped,
                  EXISTS (SELECT 1 FROM student_course
                           WHERE student_id = $1 AND section_id = $2) AS enrolled`,
          [studentId, section.section_id],
        );
        const { marked, grouped, enrolled } = rows[0];

        if (!enrolled) return res.status(404).json({ message: REFUSALS.studentNotFound });
        if (marked) return res.status(409).json({ message: REFUSALS.enrolmentHasScores });
        if (grouped) return res.status(409).json({ message: REFUSALS.enrolmentInGroup });

        await pool.query('DELETE FROM student_course WHERE student_id = $1 AND section_id = $2', [
          studentId,
          section.section_id,
        ]);
        return res.status(204).send();
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { enrolmentRoutes, sectionOf, notThisSection };

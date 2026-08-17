'use strict';

/**
 * Builders for the core chain: Program, Subject, Offering, Section, enrolment,
 * CLO, Activity, marks. A scenario is meant to be a few lines, so each builder
 * takes what it genuinely needs and defaults the rest to something legal and
 * uninteresting; a test that cares about a value passes it.
 *
 * The organisational rows underneath - faculty, department, program, role,
 * user, subject - come from db/test/helpers' `baseFixtures` rather than a copy
 * of it. Two copies would be two places to edit when a migration changes a
 * column, and the subject-code counter would be duplicated with them: it is
 * per-process, and one process running both copies could then issue the same
 * code twice into the same schema.
 *
 * Everything is suffixed by a caller-supplied tag so one schema can hold
 * several independent scenarios. Keep the tag to nine characters: a code is
 * varchar(10) and carries a one-letter prefix.
 */

const { baseFixtures } = require('../../db/test/helpers');

const ACADEMIC_YEAR = '2568';

/**
 * The Subject as taught by the Program. Everything at the (Program, Subject)
 * grain and below points at this pair rather than at the two tables
 * separately, so a builder that skipped it would fail on a foreign key rather
 * than build a shape a test could reason about.
 *
 * Idempotent, so the builders that need the pair can each ask for it without
 * having to know which of them ran first.
 */
async function programSubject(pool, { program, subject, subjectType = 'required' }) {
  await pool.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type)
     VALUES ($1, $2, $3) ON CONFLICT (program_id, subject_id) DO NOTHING`,
    [program, subject, subjectType],
  );
}

/** A (Program, Subject, academic year, semester) offering — ADR-0003's grain. */
async function offering(pool, { program, subject, academicYear = ACADEMIC_YEAR, semester = 1 }) {
  await programSubject(pool, { program, subject });

  const { rows } = await pool.query(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [program, subject, academicYear, semester],
  );
  return rows[0].id;
}

/** A Section of an offering, taught by one teacher. */
async function section(pool, { offeringId, teacher, sectionNumber = '1' }) {
  const { rows } = await pool.query(
    `INSERT INTO course_sections (semester_course_id, section_number)
     VALUES ($1, $2) RETURNING section_id`,
    [offeringId, sectionNumber],
  );
  const sectionId = rows[0].section_id;

  await pool.query(
    `INSERT INTO course_sections_teacher (section_id, user_id) VALUES ($1, $2)`,
    [sectionId, teacher],
  );
  return sectionId;
}

/** A student on the register, enrolled in a Section. */
async function enrolment(pool, { sectionId, department, program, tag }) {
  const studentId = `S${tag}`;

  await pool.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year)
     VALUES ($1, 'นักศึกษา', 'ทดสอบ', $2, $3, $4)`,
    [studentId, department, program, ACADEMIC_YEAR],
  );
  await pool.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
    studentId,
    sectionId,
  ]);
  return studentId;
}

/**
 * A CLO at the (Program, Subject, academic year) grain, and one band of the
 * weighting scheme for the same three. The two are built together because an
 * Activity cannot be mapped to a CLO without a band to weigh it in:
 * activity_clo_mapping.score_ratio_id is NOT NULL.
 */
async function outcomes(pool, { program, subject, academicYear = ACADEMIC_YEAR, cloNumber = 'CLO1' }) {
  await programSubject(pool, { program, subject });

  const { rows: cloRows } = await pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
     VALUES ($1, $2, $3, $4, 'อธิบายหลักการได้') RETURNING clo_id`,
    [program, subject, academicYear, cloNumber],
  );
  const { rows: ratioRows } = await pool.query(
    `INSERT INTO subject_score_ratio (program_id, subject_id, academic_year, sequence_order, score_category, weight)
     VALUES ($1, $2, $3, 1, 'งานที่มอบหมาย', 100) RETURNING score_ratio_id`,
    [program, subject, academicYear],
  );

  return { cloId: cloRows[0].clo_id, scoreRatioId: ratioRows[0].score_ratio_id };
}

/** An Activity in a Section, carrying the whole of one CLO's weight. */
async function activity(pool, { sectionId, cloId, scoreRatioId, name = 'งานที่ 1', score = 100 }) {
  const { rows } = await pool.query(
    `INSERT INTO activities (section_id, score_ratio_id, activity_type, activity_name, score_number)
     VALUES ($1, $2, 'individual', $3, $4) RETURNING id`,
    [sectionId, scoreRatioId, name, score],
  );
  const activityId = rows[0].id;

  await pool.query(
    `INSERT INTO activity_clo_mapping (activity_id, sequence_order, clo_id, weight, score_ratio_id, score)
     VALUES ($1, 1, $2, 100, $3, $4)`,
    [activityId, cloId, scoreRatioId, score],
  );
  return activityId;
}

/** One student's mark on one Activity, against one CLO. */
async function mark(pool, { studentId, activityId, cloId, score }) {
  const { rows } = await pool.query(
    `INSERT INTO activity_scores (student_id, activity_id, clo_id, score)
     VALUES ($1, $2, $3, $4) RETURNING score_id`,
    [studentId, activityId, cloId, score],
  );
  return rows[0].score_id;
}

/**
 * The whole chain in one call, for the many tests that need a marked Activity
 * to exist but do not care about its shape. Returns every identifier along the
 * way, so a test can hang its own extra rows off any link.
 */
async function coreChain(pool, tag, { score = 80 } = {}) {
  const base = await baseFixtures(pool, tag);

  const offeringId = await offering(pool, { program: base.program, subject: base.subject });
  const sectionId = await section(pool, { offeringId, teacher: base.user });
  const studentId = await enrolment(pool, {
    sectionId,
    department: base.department,
    program: base.program,
    tag,
  });
  const { cloId, scoreRatioId } = await outcomes(pool, {
    program: base.program,
    subject: base.subject,
  });
  const activityId = await activity(pool, { sectionId, cloId, scoreRatioId });
  const scoreId = await mark(pool, { studentId, activityId, cloId, score });

  return {
    ...base,
    academicYear: ACADEMIC_YEAR,
    offeringId,
    sectionId,
    studentId,
    cloId,
    scoreRatioId,
    activityId,
    scoreId,
  };
}

module.exports = {
  ACADEMIC_YEAR,
  programSubject,
  offering,
  section,
  enrolment,
  outcomes,
  activity,
  mark,
  coreChain,
};

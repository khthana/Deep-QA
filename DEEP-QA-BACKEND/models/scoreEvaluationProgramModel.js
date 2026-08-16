// models/scoreEvaluationProgramModel.js
const db = require('../config/db')

/**
 * ดึงข้อมูลผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO) ทั้งหมดของหลักสูตรที่ระบุ
 */
exports.getProgramPLOs = async (programId) => {
  const sql = `
    SELECT
      outcome_id     AS plo_id,
      outcome_code   AS plo_code,
      outcome_title  AS plo_name,
      sequence_order AS plo_sequence
    FROM "${process.env.DB_SCHEMA}".learning_outcomes
    WHERE program_id = $1
      AND parent_outcome_id IS NULL
      AND is_active = true
    ORDER BY sequence_order ASC
  `
  const { rows } = await db.query(sql, [programId])
  return rows
}

/**
 * ดึงคะแนนดิบราย CLO ของทั้งหลักสูตรแยกตามปีการศึกษา เพื่อใช้ในการคำนวณภาพรวมของหลักสูตร
 */
exports.getProgramCloRawScores = async (programId, academicYear) => {
  const sql = `
    SELECT
      plo.outcome_id        AS plo_id,
      plo.outcome_code      AS plo_code,
      plo.outcome_title     AS plo_name,
      plo.sequence_order    AS plo_sequence,

      ps.subject_type,

      sub.subject_id,
      sub.subject_name_en,

      cs.section_id,

      sc.clo_id,
      sc.clo_number,
      sc.clo_detail,

      acm.score             AS full_score,
      s.score               AS student_score

    FROM "${process.env.DB_SCHEMA}".subject_clo sc

    JOIN "${process.env.DB_SCHEMA}".learning_outcomes plo
      ON plo.outcome_id = sc.plo_id

    JOIN "${process.env.DB_SCHEMA}".course_sections cs
      ON cs.section_id = sc.section_id

    JOIN "${process.env.DB_SCHEMA}".semester_courses sem
      ON sem.id = cs.semester_course_id
     AND sem.program_id = $1
     AND sem.academic_year = $2

    JOIN "${process.env.DB_SCHEMA}".subjects sub
      ON sub.subject_id = sem.subject_id

    JOIN "${process.env.DB_SCHEMA}".program_subjects ps
      ON ps.subject_id = sub.subject_id
     AND ps.program_id = $1

    JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm
      ON acm.clo_id = sc.clo_id

    JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = acm.activity_id
     AND a.section_id = cs.section_id

    LEFT JOIN "${process.env.DB_SCHEMA}".activity_scores s
      ON s.activity_id = acm.activity_id
     AND s.clo_id::integer = sc.clo_id

    ORDER BY
      plo.sequence_order,
      sub.subject_id,
      sc.clo_number
  `

  const { rows } = await db.query(sql, [programId, academicYear])
  return rows
}

/**
 * ดึงคะแนนดิบราย CLO ของทั้งหลักสูตรแบบช่วงปีการศึกษา เพื่อวิเคราะห์แนวโน้มผลการเรียนรู้
 */
exports.getProgramCloRawScoresByYearRange = async (
  programId,
  startYear,
  endYear,
) => {
  const sql = `
    SELECT
      sem.academic_year,

      plo.outcome_id        AS plo_id,
      plo.outcome_code      AS plo_code,
      plo.outcome_title     AS plo_name,
      plo.sequence_order    AS plo_sequence,

      sc.clo_id,
      sc.clo_number,

      acm.score             AS full_score,
      s.score               AS student_score

    FROM "${process.env.DB_SCHEMA}".subject_clo sc
    JOIN "${process.env.DB_SCHEMA}".learning_outcomes plo
      ON plo.outcome_id = sc.plo_id

    JOIN "${process.env.DB_SCHEMA}".course_sections cs
      ON cs.section_id = sc.section_id

    JOIN "${process.env.DB_SCHEMA}".semester_courses sem
      ON sem.id = cs.semester_course_id
     AND sem.program_id = $1
     AND sem.academic_year BETWEEN $2 AND $3

    JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm
      ON acm.clo_id = sc.clo_id

    JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = acm.activity_id
     AND a.section_id = cs.section_id

    LEFT JOIN "${process.env.DB_SCHEMA}".activity_scores s
      ON s.activity_id = acm.activity_id
     AND s.clo_id::integer = sc.clo_id

    ORDER BY
      plo.sequence_order,
      sem.academic_year,
      sc.clo_number
  `

  const { rows } = await db.query(sql, [programId, startYear, endYear])
  return rows
}

/**
 * ดึงคะแนนดิบราย CLO ของนักศึกษาเฉพาะรายบุคคลภายในหลักสูตรและปีการศึกษาที่ระบุ
 */
exports.getProgramStudentCloRawScores = async (
  programId,
  academicYear,
  studentId,
) => {
  const sql = `
    SELECT
      plo.outcome_id        AS plo_id,
      plo.outcome_code      AS plo_code,
      plo.outcome_title     AS plo_name,
      plo.sequence_order    AS plo_sequence,

      ps.subject_type,

      sub.subject_id,
      sub.subject_name_en,

      cs.section_id,

      sc.clo_id,
      sc.clo_number,
      sc.clo_detail,

      acm.score             AS full_score,
      s.score               AS student_score

    FROM "${process.env.DB_SCHEMA}".student_course stc
    JOIN "${process.env.DB_SCHEMA}".course_sections cs
      ON cs.section_id = stc.section_id

    JOIN "${process.env.DB_SCHEMA}".semester_courses sem
      ON sem.id = cs.semester_course_id
    AND sem.program_id = $1
    AND sem.academic_year = $2

    JOIN "${process.env.DB_SCHEMA}".subjects sub
      ON sub.subject_id = sem.subject_id

    JOIN "${process.env.DB_SCHEMA}".subject_clo sc
      ON sc.section_id = cs.section_id
    AND sc.plo_id IS NOT NULL

    JOIN "${process.env.DB_SCHEMA}".learning_outcomes plo
      ON plo.outcome_id = sc.plo_id

    JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm
      ON acm.clo_id = sc.clo_id

    JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = acm.activity_id
    AND a.section_id = cs.section_id

    JOIN "${process.env.DB_SCHEMA}".program_subjects ps
      ON ps.subject_id = sub.subject_id
      AND ps.program_id = $1

    LEFT JOIN "${process.env.DB_SCHEMA}".activity_scores s
      ON s.activity_id = acm.activity_id
    AND s.clo_id::integer = sc.clo_id
    AND s.student_id = $3

    WHERE stc.student_id = $3
    ORDER BY plo.sequence_order, sub.subject_id, sc.clo_number;

  `

  const { rows } = await db.query(sql, [programId, academicYear, studentId])

  return rows
}

/**
 * คำนวณคะแนนเฉลี่ย PLO ของนักศึกษาทุกคนในหลักสูตร โดยมีการ Normalize คะแนนให้เป็นระบบ 5 คะแนน
 */
exports.getProgramStudentsPloAvgScores = async (programId, academicYear) => {
  const sql = `
    WITH normalized AS (
      SELECT
        st.student_id,
        u.title_th,
        st.first_name_th AS first_name,
        st.last_name_th  AS last_name,

        plo.outcome_id     AS plo_id,
        plo.outcome_code   AS plo_code,
        plo.outcome_title  AS plo_name,
        plo.sequence_order AS plo_sequence,

        sc.clo_id,

        (s.score / acm.score) * 5 AS normalized_score

      FROM "${process.env.DB_SCHEMA}".student_course stc
      JOIN "${process.env.DB_SCHEMA}".student st
        ON st.student_id = stc.student_id

      JOIN "${process.env.DB_SCHEMA}".course_sections cs
        ON cs.section_id = stc.section_id

      JOIN "${process.env.DB_SCHEMA}".semester_courses sem
        ON sem.id = cs.semester_course_id
        AND sem.program_id = $1
        AND sem.academic_year = $2

      JOIN "${process.env.DB_SCHEMA}".subject_clo sc
        ON sc.section_id = cs.section_id
        AND sc.plo_id IS NOT NULL

      JOIN "${process.env.DB_SCHEMA}".learning_outcomes plo
        ON plo.outcome_id = sc.plo_id

      JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm
        ON acm.clo_id = sc.clo_id

      JOIN "${process.env.DB_SCHEMA}".activities a
        ON a.id = acm.activity_id
        AND a.section_id = cs.section_id

      JOIN "${process.env.DB_SCHEMA}".activity_scores s
        ON s.activity_id = acm.activity_id
        AND s.clo_id::integer = sc.clo_id
        AND s.student_id = st.student_id

      JOIN "${process.env.DB_SCHEMA}".users u
        ON st.student_id = u.user_id

      WHERE s.score IS NOT NULL
    ),
    clo_avg AS (
      SELECT
        student_id,
        title_th,
        first_name,
        last_name,
        plo_id,
        plo_code,
        plo_name,
        plo_sequence,
        clo_id,
        AVG(normalized_score) AS clo_avg_score
      FROM normalized
      GROUP BY
        student_id,
        title_th,
        first_name,
        last_name,
        plo_id,
        plo_code,
        plo_name,
        plo_sequence,
        clo_id
    )
    SELECT
      student_id,
      title_th,
      first_name,
      last_name,
      plo_id,
      plo_code,
      plo_name,
      ROUND(AVG(clo_avg_score)::numeric, 2) AS plo_avg_score,
      5 AS full_score
    FROM clo_avg
    GROUP BY
      student_id,
      title_th,
      first_name,
      last_name,
      plo_id,
      plo_code,
      plo_name,
      plo_sequence
    ORDER BY
      student_id,
      plo_sequence;
  `

  const { rows } = await db.query(sql, [programId, academicYear])

  return rows
}

/**
 * ดึงรายชื่อนักศึกษาที่มีสถานะปกติ (active) ทั้งหมดในหลักสูตรที่ระบุ
 */
exports.getStudentsByProgram = async (programId) => {
  const sql = `
    SELECT
      st.student_id,
      u.title_th,
      st.first_name_th AS first_name,
      st.last_name_th  AS last_name
    FROM "${process.env.DB_SCHEMA}".student st
    JOIN "${process.env.DB_SCHEMA}".users u
      ON u.user_id = st.student_id
    WHERE st.program_id = $1
      AND st.status = 'active'
    ORDER BY st.student_id;
  `
  const { rows } = await db.query(sql, [programId])
  return rows
}

exports.getPLOByPLO_id = async (plo_id) => {
  const sql = `
    SELECT 
      outcome_id,
      program_id,
      outcome_code,
      outcome_title,
      outcome_description,
      outcome_type,
      parent_outcome_id,
      sequence_order,
      level_depth,
      is_active,
      section_id
    FROM "${process.env.DB_SCHEMA}".learning_outcomes
    WHERE outcome_id = $1
  `

  const { rows } = await db.query(sql, [plo_id])
  return rows[0] // คืนค่า object เดียวเพราะดึงด้วย Primary Key
}

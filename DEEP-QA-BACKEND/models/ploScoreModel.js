const db = require('../config/db')

/**
 * ดึงข้อมูลพื้นฐานของนักศึกษา (คำนำหน้าชื่อ, ชื่อ, นามสกุล) โดยอ้างอิงจากรหัสประจำตัวนักศึกษา
 */
exports.getStudentInfo = async (studentId) => {
  const sql = `
    SELECT s.student_id,
           u.title_th,
           u.first_name_th,
           u.last_name_th,
           s.full_name_th
    FROM "${process.env.DB_SCHEMA}".student s
    JOIN "${process.env.DB_SCHEMA}".users u ON s.student_id = u.user_id
    WHERE student_id = $1
  `
  const { rows } = await db.query(sql, [studentId])
  return rows[0]
}

/**
 * ดึงรายชื่อนักศึกษาตามหลักสูตรและปีที่เข้าเรียน (Admission Year)
 */
exports.getStudentsByAdmissionYear = async (programId, academicYear) => {
  const sql = `
    SELECT s.student_id,
           u.title_th,
           u.first_name_th,
           u.last_name_th,
           s.full_name_th
    FROM "${process.env.DB_SCHEMA}".student s
    JOIN "${process.env.DB_SCHEMA}".users u ON s.student_id = u.user_id
    WHERE s.program_id = $1
      AND s.admission_year = $2
  `
  const { rows } = await db.query(sql, [programId, academicYear])
  return rows
}

/**
 * ดึงรายการผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO) ของหลักสูตรที่ระบุ
 */
// exports.getPloByProgram = async (programId) => {
//   const sql = `
//     SELECT outcome_id AS plo_id,
//            outcome_code AS plo_code,
//            outcome_title AS plo_name
//     FROM "${process.env.DB_SCHEMA}".learning_outcomes
//     WHERE program_id = $1
//       AND is_active = true
//       AND parent_outcome_id IS NULL
//     ORDER BY outcome_id
//   `

//   const { rows } = await db.query(sql, [programId])
//   return rows
// }

exports.getPloByProgram = async (programId) => {
  const sql = `
    SELECT outcome_id AS plo_id,
           outcome_code AS plo_code,
           outcome_title AS plo_name,
           sequence_order -- ดึงค่านี้มาด้วยเผื่อใช้ sort ใน JS
    FROM "${process.env.DB_SCHEMA}".learning_outcomes
    WHERE program_id = $1
      AND is_active = true
      AND parent_outcome_id IS NULL
    ORDER BY sequence_order ASC, outcome_code ASC; -- เรียงลำดับจาก DB เลย
  `;
  const { rows } = await db.query(sql, [programId]);
  return rows;
};

/**
 * คำนวณคะแนน PLO แบบผลรวมตรง (Direct Sum) โดยนำคะแนนกิจกรรมหารด้วยคะแนนเต็มแล้วปรับมาตราส่วนเป็น 5 คะแนน
 */
exports.getStudentPloScore = async (studentId) => {
  const sql = `
    SELECT 
      lo.outcome_id AS plo_id,
      ROUND(
        (SUM(ascore.score) / NULLIF(SUM(act.score_number),0)) * 5
      ,4)::float AS plo_score
    FROM "${process.env.DB_SCHEMA}".activity_scores ascore
    JOIN "${process.env.DB_SCHEMA}".activities act
         ON act.id = ascore.activity_id
    JOIN "${process.env.DB_SCHEMA}".subject_clo sc
         ON sc.clo_id::text = ascore.clo_id
    JOIN "${process.env.DB_SCHEMA}".learning_outcomes lo
         ON lo.outcome_id = sc.plo_id
    WHERE ascore.student_id = $1
    GROUP BY lo.outcome_id
    ORDER BY lo.outcome_id
  `
  const { rows } = await db.query(sql, [studentId])
  return rows
}

/**
 * ดึงข้อมูลโครงสร้างคะแนน PLO ในระดับลึก (รวมข้อมูลรายวิชา, กลุ่มเรียน และ CLO) ของนักศึกษาเฉพาะราย
 */
exports.getStudentPloStructure = async (studentId, programId) => {
  const sql = `
    SELECT
      plo.outcome_id      AS plo_id,
      plo.outcome_code    AS plo_code,
      plo.sequence_order  AS plo_sequence,
      sub.subject_id,
      sub.subject_name_en,
      ps.subject_type,
      cs.section_id,
      sc.clo_id,
      sc.clo_number,
      sc.clo_detail,
      acm.score           AS full_score,
      s.score             AS student_score,
      acm.weight          AS weight
    FROM "${process.env.DB_SCHEMA}".student_course stc
    JOIN "${process.env.DB_SCHEMA}".course_sections cs
      ON cs.section_id = stc.section_id
    JOIN "${process.env.DB_SCHEMA}".semester_courses sem
      ON sem.id = cs.semester_course_id
     AND sem.program_id = $2
    JOIN "${process.env.DB_SCHEMA}".subjects sub
      ON sub.subject_id = sem.subject_id
    JOIN "${process.env.DB_SCHEMA}".program_subjects ps
      ON ps.subject_id = sub.subject_id
     AND ps.program_id = $2
    JOIN "${process.env.DB_SCHEMA}".subject_clo sc
      ON sc.section_id = cs.section_id
     AND sc.plo_id IS NOT NULL
    JOIN "${process.env.DB_SCHEMA}".learning_outcomes plo
      ON plo.outcome_id = sc.plo_id
     AND plo.program_id = $2
     AND plo.is_active = true
    JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm
      ON acm.clo_id = sc.clo_id
    JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = acm.activity_id
     AND a.section_id = cs.section_id
    LEFT JOIN "${process.env.DB_SCHEMA}".activity_scores s
      ON s.activity_id = acm.activity_id
     AND s.clo_id::integer = sc.clo_id
     AND s.student_id = $1
    WHERE stc.student_id = $1
    ORDER BY
      plo.sequence_order,
      sub.subject_id,
      sc.clo_number
  `
  const { rows } = await db.query(sql, [studentId, programId])
  return rows
}
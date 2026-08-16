// models/scoreEvaluationBaseModel.js
const db = require('../config/db')

/**
 * ดึงข้อมูลเบื้องต้น (Metadata) ของกลุ่มเรียน เช่น รหัสวิชา ชื่อวิชา ภาคการศึกษา และปีการศึกษา
 */
exports.getSectionMeta = async (sectionId) => {
  const sql = `
    SELECT
      cs.section_id,
      sc.subject_id,
      sub.subject_name_en AS subject_name,
      sc.semester,
      sc.academic_year
    FROM "${process.env.DB_SCHEMA}".course_sections cs
    JOIN "${process.env.DB_SCHEMA}".semester_courses sc
      ON sc.id = cs.semester_course_id
    JOIN "${process.env.DB_SCHEMA}".subjects sub
      ON sub.subject_id = sc.subject_id
    WHERE cs.section_id = $1
  `
  const { rows } = await db.query(sql, [sectionId])
  return rows[0]
}

/**
 * นับจำนวนนักศึกษาทั้งหมดที่ลงทะเบียนในกลุ่มเรียนที่ระบุ
 */
exports.getTotalStudentInSection = async (sectionId) => {
  const {
    rows,
  } = await db.query(
    `SELECT COUNT(*) AS total FROM "${process.env.DB_SCHEMA}".student_course WHERE section_id = $1`,
    [sectionId],
  )
  return Number(rows[0].total)
}

/**
 * ดึงข้อมูลพื้นฐานของนักศึกษา (คำนำหน้าชื่อ, ชื่อ, นามสกุล) จากรหัสประจำตัวนักศึกษา
 */
exports.getStudentInfo = async (studentId) => {
  const sql = `
    SELECT 
      st.student_id,
      u.title_th,
      u.first_name_th,
      u.last_name_th
    FROM "${process.env.DB_SCHEMA}".student st
    JOIN "${process.env.DB_SCHEMA}".users u
      ON st.student_id = u.user_id
    WHERE st.student_id = $1
  `
  const { rows } = await db.query(sql, [studentId])
  return rows[0]
}

/**
 * ค้นหากลุ่มเรียนของวิชาเดียวกันและหลักสูตรเดียวกัน แต่เปิดสอนในปีการศึกษาอื่น เพื่อใช้เปรียบเทียบข้อมูล
 */
// exports.getSameSubjectProgramDifferentYears = async (sectionId) => {
//   const sql = `
//     WITH base_section AS (
//       SELECT sc.subject_id, sc.program_id, sc.academic_year
//       FROM "${process.env.DB_SCHEMA}".course_sections cs
//       JOIN "${process.env.DB_SCHEMA}".semester_courses sc ON sc.id = cs.semester_course_id
//       WHERE cs.section_id = $1
//     )
//     SELECT cs.section_id, sc.academic_year
//     FROM "${process.env.DB_SCHEMA}".course_sections cs
//     JOIN "${process.env.DB_SCHEMA}".semester_courses sc ON sc.id = cs.semester_course_id
//     JOIN base_section b
//       ON sc.subject_id = b.subject_id
//      AND sc.program_id = b.program_id
//      AND sc.academic_year <> b.academic_year
//     ORDER BY sc.academic_year DESC
//   `
//   const { rows } = await db.query(sql, [sectionId])
//   return rows
// }

exports.getSameSubjectProgramDifferentYears = async (sectionId) => {
  const sql = `
    WITH base_section AS (
      -- 1. หาข้อมูลพื้นฐานของ Section ต้นทาง
      SELECT sc.subject_id, sc.program_id, CAST(sc.academic_year AS INTEGER) as base_year
      FROM "${process.env.DB_SCHEMA}".course_sections cs
      JOIN "${process.env.DB_SCHEMA}".semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1
    ),
    base_plos AS (
      -- 2. ดึงรายการ plo_id ของ Base Section มาทำเป็น Array
      SELECT array_agg(DISTINCT plo_id ORDER BY plo_id) as plo_list
      FROM "${process.env.DB_SCHEMA}".subject_clo
      WHERE section_id = $1
    ),
    target_sections AS (
      -- 3. หา Section อื่นๆ ที่เป็นวิชาเดียวกัน เฉพาะ 2 ปีย้อนหลัง
      SELECT cs.section_id, sc.academic_year, CAST(sc.academic_year AS INTEGER) as target_year
      FROM "${process.env.DB_SCHEMA}".course_sections cs
      JOIN "${process.env.DB_SCHEMA}".semester_courses sc ON sc.id = cs.semester_course_id
      JOIN base_section b ON sc.subject_id = b.subject_id 
        AND sc.program_id = b.program_id
      WHERE CAST(sc.academic_year AS INTEGER) < b.base_year           -- ต้องเป็นปีที่เก่ากว่า
        AND CAST(sc.academic_year AS INTEGER) >= (b.base_year - 2)    -- ย้อนหลังไม่เกิน 2 ปี
    ),
    target_plos AS (
      -- 4. ดึงรายการ plo_id ของ Section เป้าหมายมาทำเป็น Array
      SELECT section_id, array_agg(DISTINCT plo_id ORDER BY plo_id) as plo_list
      FROM "${process.env.DB_SCHEMA}".subject_clo
      WHERE section_id IN (SELECT section_id FROM target_sections)
      GROUP BY section_id
    )
    -- 5. กรองเฉพาะที่ PLO เหมือนกัน 100%
    SELECT t.section_id, t.academic_year
    FROM target_sections t
    JOIN target_plos tp ON t.section_id = tp.section_id
    WHERE tp.plo_list = (SELECT plo_list FROM base_plos)
    ORDER BY t.academic_year DESC
  `
  const { rows } = await db.query(sql, [sectionId])
  return rows
}

/**
 * ดึงรายการผลลัพธ์การเรียนรู้ระดับรายวิชา (CLO) ทั้งหมดที่ถูกกำหนดไว้ในกลุ่มเรียนที่ระบุ
 */
exports.getSectionCLOs = async (sectionId) => {
  const { rows } = await db.query(
    `SELECT clo_id, clo_number, clo_detail, plo_id 
     FROM "${process.env.DB_SCHEMA}".subject_clo
     WHERE section_id = $1 ORDER BY clo_number`,
    [sectionId],
  )
  return rows
}

/**
 * ดึงรายชื่อนักศึกษาทุกคนที่ลงทะเบียนในกลุ่มเรียน พร้อมข้อมูลชื่อ-นามสกุล
 */
exports.getStudentsInSection = async (sectionId) => {
  const { rows } = await db.query(
    `
    SELECT 
      s.student_id, 
      u.title_th,
      s.first_name_th AS first_name, 
      s.last_name_th AS last_name
    FROM "${process.env.DB_SCHEMA}".student_course sc
    JOIN "${process.env.DB_SCHEMA}".student s 
      ON s.student_id = sc.student_id
    JOIN "${process.env.DB_SCHEMA}".users u
      ON s.student_id = u.user_id
    WHERE sc.section_id = $1
    ORDER BY s.student_id
    `,
    [sectionId],
  )
  return rows
}

/**
 * ดึงข้อมูลคะแนนดิบราย CLO ของนักศึกษาทุกคนในกลุ่มเรียน พร้อมค่าน้ำหนัก (Weight) และคะแนนเต็ม (Full Score)
 */
exports.getRawStudentScores = async (sectionId) => {
  const { rows } = await db.query(
    `
    SELECT
      scs.student_id,
      clo.clo_id, 
      clo.clo_number,
      acm.score AS full_score,
      acm.weight,
      scs.score AS student_score
    FROM "${process.env.DB_SCHEMA}".subject_clo clo
    JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm ON acm.clo_id = clo.clo_id
    JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = acm.activity_id AND a.section_id = clo.section_id
    LEFT JOIN "${process.env.DB_SCHEMA}".activity_scores scs
      ON scs.activity_id = acm.activity_id
     AND scs.clo_id::integer = clo.clo_id
    WHERE clo.section_id = $1
    `,
    [sectionId],
  )
  return rows
}

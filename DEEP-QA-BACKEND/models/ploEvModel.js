const db = require('../config/db');

/**
 * ดึงข้อมูลผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO) หลักของหลักสูตรที่ระบุ 
 * โดยเลือกเฉพาะรายการที่เป็นหัวข้อหลัก (ไม่มี parent) และมีสถานะใช้งานอยู่
 */
exports.getPLOByProgram = async (program_id) => {
  const sql = `
    SELECT
      outcome_id    AS plo_id,
      outcome_code  AS plo_code,
      outcome_title AS plo_title,
      sequence_order
    FROM "${process.env.DB_SCHEMA}".learning_outcomes
    WHERE program_id = $1
      AND parent_outcome_id IS NULL
      AND is_active = true
    ORDER BY sequence_order;
  `;
  const { rows } = await db.query(sql, [program_id]);
  return rows;
};

/**
 * ดึงกลุ่มเรียน (Sections) ทั้งหมดที่นักศึกษาในรุ่น (Cohort) ตามปีที่ระบุได้ลงทะเบียนเรียน 
 * เพื่อใช้ในการวิเคราะห์ข้อมูลภาพรวมของรุ่น
 */
exports.getSectionsByProgramYear = async (program_id, year) => {
  const sql = `
    SELECT DISTINCT
      cs.section_id,
      sc.subject_id,
      s.subject_name_en AS subject_name
    FROM "${process.env.DB_SCHEMA}".student st
    JOIN "${process.env.DB_SCHEMA}".programs p
      ON p.program_id = st.program_id
    JOIN "${process.env.DB_SCHEMA}".student_course stc
      ON stc.student_id = st.student_id
    JOIN "${process.env.DB_SCHEMA}".course_sections cs
      ON cs.section_id = stc.section_id
    JOIN "${process.env.DB_SCHEMA}".semester_courses sc
      ON sc.id = cs.semester_course_id
    JOIN "${process.env.DB_SCHEMA}".subjects s
      ON s.subject_id = sc.subject_id
    WHERE st.program_id = $1
      AND p.year = $2::varchar;
  `;
  const { rows } = await db.query(sql, [program_id, year]);
  return rows;
};

/**
 * ดึงข้อมูลผลลัพธ์การเรียนรู้ระดับรายวิชา (CLO) ของกลุ่มเรียนที่ระบุ 
 * โดยเชื่อมโยงกับ PLO หลัก (รวมถึงกรณีที่ CLO แมปกับ PLO ย่อย ให้ดึงกลับไปยัง PLO หลักด้วย)
 */
exports.getCLOBySectionAndPLO = async (section_id, parent_plo_id) => {
  const sql = `
    SELECT
      clo.clo_id,
      clo.clo_number,
      clo.clo_detail

    FROM "${process.env.DB_SCHEMA}".subject_clo clo
    JOIN "${process.env.DB_SCHEMA}".learning_outcomes plo
      ON plo.outcome_id = clo.plo_id

    WHERE clo.section_id = $1
      AND COALESCE(plo.parent_outcome_id, plo.outcome_id) = $2

    ORDER BY clo.clo_number;
  `;

  const { rows } = await db.query(sql, [section_id, parent_plo_id]);
  return rows;
};
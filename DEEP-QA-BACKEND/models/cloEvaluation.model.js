const db = require('../config/db');

/**
 * ดึงรายการผลลัพธ์การเรียนรู้ระดับรายวิชา (CLO) ทั้งหมดในกลุ่มเรียน (Section)
 * พร้อมข้อมูลรหัสผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO) ที่เกี่ยวข้อง
 */
exports.getCLOBySection = async (section_id) => {
  const sql = `
    SELECT
      sc.clo_id,
      sc.clo_number,
      sc.clo_detail,
      sc.plo_id,
      lo.outcome_code
    FROM "${process.env.DB_SCHEMA}".subject_clo sc
    LEFT JOIN "${process.env.DB_SCHEMA}".learning_outcomes lo
      ON lo.outcome_id = sc.plo_id
    WHERE sc.section_id = $1
    ORDER BY sc.clo_number
  `;
  const { rows } = await db.query(sql, [section_id]);
  return rows;
};

/**
 * ดึงข้อมูลการจับคู่ระหว่างกิจกรรมและ CLO (Activity-CLO Mapping)
 * เพื่อตรวจสอบคะแนนเต็มและค่าน้ำหนักของแต่ละกิจกรรมในกลุ่มเรียนที่ระบุ
 */
exports.getActivityCLOMappingBySection = async (section_id) => {
  const sql = `
    SELECT
      acm.clo_id,
      scmap.plo_id,
      lo.outcome_code,
      a.id           AS activity_id,
      a.activity_name,
      acm.score      AS max_score,
      acm.weight
    FROM "${process.env.DB_SCHEMA}".activity_clo_mapping acm
    JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = acm.activity_id
    JOIN "${process.env.DB_SCHEMA}".subject_clo scmap
      ON scmap.clo_id = acm.clo_id
     AND scmap.section_id = a.section_id
    LEFT JOIN "${process.env.DB_SCHEMA}".learning_outcomes lo
      ON lo.outcome_id = scmap.plo_id
    WHERE a.section_id = $1
    ORDER BY acm.clo_id, a.id
  `;
  const { rows } = await db.query(sql, [section_id]);
  return rows;
};

/**
 * ดึงข้อมูลคะแนนดิบรายกิจกรรมของนักศึกษาทุกคนภายในกลุ่มเรียนที่ระบุ
 */
exports.getActivityScoresBySection = async (section_id) => {
  const sql = `
    SELECT
      ascore.activity_id,
      ascore.student_id,
      ascore.score,
      ascore.clo_id::integer AS clo_id
    FROM "${process.env.DB_SCHEMA}".activity_scores ascore
    JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = ascore.activity_id
    WHERE a.section_id = $1
  `;
  const { rows } = await db.query(sql, [section_id]);
  return rows;
};

/**
 * คำนวณจำนวนนักศึกษาทั้งหมดที่ลงทะเบียนในกลุ่มเรียนที่ระบุ
 */
exports.getTotalStudentsBySection = async (section_id) => {
  const sql = `
    SELECT COUNT(*)::integer AS total
    FROM "${process.env.DB_SCHEMA}".student_course
    WHERE section_id = $1
  `;
  const { rows } = await db.query(sql, [section_id]);
  return rows[0]?.total || 0;
};

/**
 * ดึงข้อมูลสรุปเบื้องต้นของกลุ่มเรียน (รหัสวิชา, ชื่อวิชา, เทอม และปีการศึกษา)
 */
exports.getSectionSummary = async (section_id) => {
  const sql = `
    SELECT
      cs.section_id,
      s.subject_id,
      s.subject_name_th AS subject_name,
      sc.semester,
      sc.academic_year AS year
    FROM "${process.env.DB_SCHEMA}".course_sections cs
    JOIN "${process.env.DB_SCHEMA}".semester_courses sc
      ON sc.id = cs.semester_course_id
    JOIN "${process.env.DB_SCHEMA}".subjects s
      ON s.subject_id = sc.subject_id
    WHERE cs.section_id = $1
  `;

  const { rows } = await db.query(sql, [section_id]);
  return rows[0] || null;
};
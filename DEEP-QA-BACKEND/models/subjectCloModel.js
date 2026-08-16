const db = require('../config/db')

/**
 * สร้างข้อมูลผลลัพธ์การเรียนรู้ของรายวิชา (CLO) ใหม่
 */
exports.createClo = async ({
  section_id,
  clo_number,
  clo_detail,
  teaching_method,
  assessment_method,
  plo_id,
  created_by
}) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".subject_clo
      (
        section_id,
        clo_number,
        clo_detail,
        teaching_method,
        assessment_method,
        plo_id,
        created_by
      )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `

  const values = [
    section_id,
    clo_number,
    clo_detail,
    teaching_method,
    assessment_method,
    plo_id || null,
    created_by || null
  ]

  const result = await db.query(query, values)
  return result.rows[0]
}

/**
 * อัปเดตข้อมูลรายละเอียด วิธีการสอน และการประเมินผลของ CLO
 */
exports.updateClo = async ({
  clo_id,
  clo_detail,
  teaching_method,
  assessment_method,
  plo_id
}) => {
  const query = `
    UPDATE "${process.env.DB_SCHEMA}".subject_clo
    SET
      clo_detail = $1,
      teaching_method = $2,
      assessment_method = $3,
      plo_id = $4,
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok'
    WHERE clo_id = $5
    RETURNING
      clo_id,
      clo_number,
      clo_detail,
      teaching_method,
      assessment_method,
      plo_id,
      section_id;
  `

  const values = [
    clo_detail,
    teaching_method,
    assessment_method,
    plo_id || null,
    clo_id
  ]

  const result = await db.query(query, values)
  return result.rows[0]
}

/**
 * ดึงข้อมูล CLO ทั้งหมดในกลุ่มเรียนที่ระบุ พร้อมข้อมูลรหัส PLO ที่เกี่ยวข้อง
 */
exports.getSubjectCloBySection = async (section_id) => {
  const query = `
    SELECT
      sc.clo_id,
      sc.clo_number,
      sc.clo_detail,
      sc.teaching_method,
      sc.assessment_method,
      sc.plo_id,
      lo.outcome_code AS plo_code,
      sc.section_id,
      sc.created_at,
      sc.updated_at
    FROM "${process.env.DB_SCHEMA}".subject_clo sc
    LEFT JOIN "${process.env.DB_SCHEMA}".learning_outcomes lo
      ON sc.plo_id = lo.outcome_id
    WHERE sc.section_id = $1
    ORDER BY sc.clo_number::int;
  `

  const result = await db.query(query, [section_id])
  return result.rows
}

/**
 * ค้นหาข้อมูล CLO และรหัส PLO ที่เชื่อมโยงอยู่ โดยระบุจากกลุ่มเรียนและรหัส CLO
 */
exports.getCloWithPLO = async (section_id, clo_id) => {
  const query = `
    SELECT
      clo_id,
      clo_number,
      clo_detail,
      plo_id
    FROM "${process.env.DB_SCHEMA}".subject_clo
    WHERE section_id = $1
      AND clo_id = $2
    LIMIT 1;
  `

  const result = await db.query(query, [section_id, clo_id])
  return result.rows[0]
}

/**
 * ดึงรายละเอียดของผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLO) ตาม ID
 */
exports.getPLOById = async (plo_id) => {
  const query = `
    SELECT
      outcome_id,
      outcome_code,
      outcome_title,
      outcome_description,
      outcome_type,
      program_id
    FROM "${process.env.DB_SCHEMA}".learning_outcomes
    WHERE outcome_id = $1
    LIMIT 1;
  `

  const result = await db.query(query, [plo_id])
  return result.rows[0]
}

/**
 * ตรวจสอบว่า CLO นี้ถูกนำไปใช้งานในส่วนการแมปกิจกรรมหรือบันทึกคะแนนแล้วหรือไม่
 */
exports.isCLOUsed = async (clo_id) => {
  const query = `
    SELECT
      EXISTS (
        SELECT 1
        FROM "${process.env.DB_SCHEMA}".activity_clo_mapping
        WHERE clo_id = $1::smallint
      )
      OR
      EXISTS (
        SELECT 1
        FROM "${process.env.DB_SCHEMA}".activity_scores
        WHERE clo_id = $1::varchar
      ) AS is_used
  `;

  const { rows } = await db.query(query, [clo_id]);
  return rows[0].is_used;
};

/**
 * ลบข้อมูล CLO ออกจากฐานข้อมูล
 */
exports.deleteCLO = async (clo_id) => {
  const query = `
    DELETE FROM "${process.env.DB_SCHEMA}".subject_clo
    WHERE clo_id = $1::integer
    RETURNING clo_id
  `;

  const { rowCount } = await db.query(query, [clo_id]);
  return rowCount > 0;
};
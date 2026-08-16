const db = require("../config/db");

/**
 * สร้างข้อมูลผลลัพธ์การเรียนรู้ (Learning Outcome/PLO) ใหม่ลงในฐานข้อมูล
 */
exports.createLearningOutcome = async ({
  program_id,
  outcome_code,
  outcome_title,
  outcome_description,
  outcome_type,
  parent_outcome_id,
  sequence_order,
  level_depth,
  created_by,
  updated_by
}) => {
  const res = await db.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".learning_outcomes
       (program_id, outcome_code, outcome_title, outcome_description, 
        outcome_type, parent_outcome_id, sequence_order, level_depth, 
        is_active, created_by, updated_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,$10,
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')
     RETURNING *`,
    [
      program_id,
      outcome_code,
      outcome_title,
      outcome_description,
      outcome_type,
      parent_outcome_id,
      sequence_order,
      level_depth,
      created_by,
      updated_by
    ]
  );
  return res.rows[0];
};

/**
 * ค้นหาข้อมูลผลลัพธ์การเรียนรู้โดยอ้างอิงจากรหัสหลักสูตรและรหัสผลลัพธ์ (Outcome Code)
 */
exports.getPloByCode = async (program_id, outcome_code) => {
  const query = `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".learning_outcomes
    WHERE program_id = $1 AND outcome_code = $2
    LIMIT 1;
  `;
  const { rows } = await db.query(query, [program_id, outcome_code]);
  return rows[0] || null;
};

/**
 * ค้นหาลำดับสูงสุด (Max Sequence Order) ภายใต้หลักสูตรและระดับ Parent ที่ระบุ
 */
exports.getMaxSequenceOrder = async (program_id, parent_outcome_id) => {
  const query = `
    SELECT MAX(sequence_order) AS max_seq
    FROM "${process.env.DB_SCHEMA}".learning_outcomes
    WHERE program_id = $1
      AND (${parent_outcome_id ? "parent_outcome_id = $2" : "parent_outcome_id IS NULL"})
  `;
  const values = parent_outcome_id ? [program_id, parent_outcome_id] : [program_id];

  const { rows } = await db.query(query, values);
  return rows[0].max_seq || 0;
};

/**
 * ดึงรายการผลลัพธ์การเรียนรู้ทั้งหมดของหลักสูตรที่ระบุ เรียงลำดับตามความสำคัญและระดับความลึก
 */
exports.getPloByProgramId = async (program_id) => {
  const query = `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".learning_outcomes
    WHERE program_id = $1
      AND is_active = TRUE
    ORDER BY sequence_order ASC, level_depth ASC
  `;
  const { rows } = await db.query(query, [program_id]);
  return rows;
};

/**
 * อัปเดตข้อมูลรายละเอียดของผลลัพธ์การเรียนรู้แบบ Dynamic
 */
exports.updateLearningOutcome = async ({ program_id, outcome_code, outcome_title, outcome_description, updated_by }) => {
  const setFields = [];
  const values = [];

  if (outcome_title) {
    setFields.push(`outcome_title = $${setFields.length + 1}`);
    values.push(outcome_title);
  }
  if (outcome_description) {
    setFields.push(`outcome_description = $${setFields.length + 1}`);
    values.push(outcome_description);
  }

  setFields.push(`updated_by = $${setFields.length + 1}`);
  values.push(updated_by);

  values.push(program_id);
  values.push(outcome_code);

  const query = `
    UPDATE "${process.env.DB_SCHEMA}".learning_outcomes
    SET ${setFields.join(", ")}, updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok'
    WHERE program_id = $${values.length - 1} AND outcome_code = $${values.length}
    RETURNING *;
  `;

  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * ตรวจสอบว่าผลลัพธ์การเรียนรู้นี้ถูกนำไปใช้งานในการแมปกับรายวิชา (Subject PLO Mapping) หรือไม่
 */
exports.isPLOUsed = async (program_id, outcome_id) => {
  const query = `
    SELECT COUNT(*) AS count
    FROM "${process.env.DB_SCHEMA}".subject_plo_mapping
    WHERE program_id = $1 AND outcome_id = $2
  `;
  const { rows } = await db.query(query, [program_id, outcome_id]);
  return parseInt(rows[0].count) > 0;
};

/**
 * ยกเลิกการใช้งานผลลัพธ์การเรียนรู้ (Soft Delete) โดยการเปลี่ยนสถานะ is_active เป็น false
 */
exports.deactivatePLO = async (program_id, outcome_code) => {
  const query = `
    UPDATE "${process.env.DB_SCHEMA}".learning_outcomes
    SET is_active = false, updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok'
    WHERE program_id = $1 AND outcome_code = $2
    RETURNING *
  `;
  const { rows } = await db.query(query, [program_id, outcome_code]);
  return rows[0];
};

/**
 * ลบข้อมูลผลลัพธ์การเรียนรู้ออกจากฐานข้อมูลถาวร
 */
exports.deletePLO = async (program_id, outcome_code) => {
  const query = `
    DELETE FROM "${process.env.DB_SCHEMA}".learning_outcomes
    WHERE program_id = $1 AND outcome_code = $2
    RETURNING *
  `;
  const { rows } = await db.query(query, [program_id, outcome_code]);
  return rows[0];
};

/**
 * กลับมาเปิดใช้งานผลลัพธ์การเรียนรู้อีกครั้ง พร้อมอัปเดตข้อมูลรายละเอียดล่าสุด
 */
exports.reactivatePlo = async ({
  program_id,
  outcome_code,
  outcome_title,
  outcome_description,
  outcome_type,
  parent_outcome_id,
  level_depth,
  updated_by
}) => {
  const res = await db.query(
    `UPDATE "${process.env.DB_SCHEMA}".learning_outcomes
     SET outcome_title = $1,
         outcome_description = $2,
         outcome_type = $3,
         parent_outcome_id = $4,
         level_depth = $5,
         is_active = TRUE,
         updated_by = $6,
         updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok'
     WHERE program_id = $7 AND outcome_code = $8
     RETURNING *`,
    [
      outcome_title,
      outcome_description,
      outcome_type,
      parent_outcome_id,
      level_depth,
      updated_by,
      program_id,
      outcome_code,
    ]
  );
  return res.rows[0];
};
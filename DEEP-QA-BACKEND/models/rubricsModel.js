const db = require('../config/db');

/**
 * สร้างข้อมูลเกณฑ์การประเมิน (Rubric) ใหม่ลงในฐานข้อมูล
 */
exports.createRubric = async ({ rubric_code, rubric_name_en, rubric_name_th, display_order, created_by, updated_by ,program_id}) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".rubrics
      (rubric_code, rubric_name_en, rubric_name_th, display_order, created_by, updated_by, program_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [rubric_code, rubric_name_en, rubric_name_th, display_order, created_by, updated_by, program_id];

  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * อัปเดตข้อมูลรายละเอียดของ Rubric ตามรหัส ID ที่ระบุ
 */
exports.updateRubric = async (id, { rubric_code, rubric_name_en, rubric_name_th, display_order, updated_by }) => {
  const query = `
    UPDATE "${process.env.DB_SCHEMA}".rubrics
    SET
      rubric_code      = $1,
      rubric_name_en   = $2,
      rubric_name_th   = $3,
      display_order    = $4,
      updated_by       = $5
    WHERE id = $6
    RETURNING *;
  `;

  const values = [
    rubric_code,
    rubric_name_en,
    rubric_name_th,
    parseInt(display_order),
    updated_by,
    parseInt(id)
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * ค้นหาข้อมูล Rubric พื้นฐานโดยอ้างอิงจากรหัส Rubric Code
 */
exports.findRubricByCode = async (rubric_code) => {
  const query = `
    SELECT id, rubric_code, rubric_name_en, rubric_name_th
    FROM "${process.env.DB_SCHEMA}".rubrics
    WHERE rubric_code = $1
    LIMIT 1;
  `;
  const values = [rubric_code];

  const { rows } = await db.query(query, values);
  return rows[0] || null;
};

/**
 * ดึงรายการ Rubrics ทั้งหมดภายใต้รหัสหลักสูตรที่ระบุ เรียงตามลำดับการแสดงผล
 */
exports.getRubricsByProgramId = async (program_id) => {
  const query = `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".rubrics
    WHERE program_id = $1
    ORDER BY display_order ASC;
  `;
  const values = [program_id];

  const { rows } = await db.query(query, values);
  return rows;
};

/**
 * ดึงข้อมูล Rubric ทั้งหมดโดยอ้างอิงจากรหัส Rubric Code
 */
exports.getRubricByCode = async (rubric_code) => {
  if (!rubric_code) return null;

  const query = `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".rubrics
    WHERE rubric_code = $1
    LIMIT 1;
  `;
  const values = [rubric_code];

  const { rows } = await db.query(query, values);
  return rows[0] || null;
};

/**
 * ยกเลิกการใช้งาน Rubric (Soft Delete) โดยการปรับสถานะ is_active เป็น FALSE
 */
exports.deactivateRubricById = async (rubric_id) => {
  const query = `
    UPDATE "${process.env.DB_SCHEMA}".rubrics
    SET is_active = FALSE
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await db.query(query, [rubric_id]);
  return rows[0] || null;
};

/**
 * ตรวจสอบว่า Rubric นี้มีการเชื่อมโยงข้อมูลรายละเอียดในตาราง rubric_details หรือไม่
 */
exports.hasRubricDetails = async (rubric_id) => {
  const query = `
    SELECT COUNT(*) AS count
    FROM "${process.env.DB_SCHEMA}".rubric_details
    WHERE rubric_id = $1
  `;
  const { rows } = await db.query(query, [rubric_id]);
  return parseInt(rows[0].count) > 0;
};

/**
 * ลบข้อมูลรายละเอียด (Rubric Details) ทั้งหมดที่เชื่อมโยงกับรหัส Rubric ที่ระบุ
 */
exports.deleteRubricDetailsByRubricId = async (rubric_id) => {
  await db.query(
    `DELETE FROM "${process.env.DB_SCHEMA}".rubric_details WHERE rubric_id = $1`,
    [rubric_id]
  );
};

/**
 * ลบข้อมูล Rubric ออกจากฐานข้อมูลโดยอ้างอิงรหัส ID
 */
exports.deleteRubricById = async (rubric_id) => {
  await db.query(
    `DELETE FROM "${process.env.DB_SCHEMA}".rubrics WHERE id = $1`,
    [rubric_id]
  );
};

/**
 * จัดลำดับการแสดงผล (display_order) ใหม่ โดยปรับลดลำดับลงเมื่อมีการลบข้อมูลบางรายการออก
 */
exports.shiftDisplayOrderUp = async (program_id, deletedDisplayOrder) => {
  const query = `
    UPDATE "${process.env.DB_SCHEMA}".rubrics
    SET display_order = display_order - 1
    WHERE program_id = $1
      AND display_order > $2
  `;
  await db.query(query, [program_id, deletedDisplayOrder]);
};
const db = require('../config/db');

/**
 * บันทึกข้อมูลรายละเอียดเกณฑ์การประเมิน (Rubric Details) แบบกลุ่ม (Batch)
 * พร้อมระบบตรวจสอบลำดับการแสดงผล (display_order) และป้องกันชื่อเกณฑ์ซ้ำ
 */
exports.createRubricDetailsBatch = async (rubric_id, detailsArray, user_id) => {
  const insertedRows = [];

  for (const detail of detailsArray) {
    let displayOrder = detail.display_order || 0;
    let duplicateOrder = true;
    while (duplicateOrder) {
      const { rows: checkRows } = await db.query(
        `SELECT COUNT(*) AS count
         FROM "${process.env.DB_SCHEMA}".rubric_details
         WHERE rubric_id = $1 AND display_order = $2`,
        [rubric_id, displayOrder]
      );
      if (parseInt(checkRows[0].count) > 0) {
        displayOrder++;
      } else {
        duplicateOrder = false;
      }
    }

    const { rows: criteriaRows } = await db.query(
      `SELECT COUNT(*) AS count
       FROM "${process.env.DB_SCHEMA}".rubric_details
       WHERE rubric_id = $1
         AND criteria_name_en = $2
         AND criteria_name_th = $3`,
      [rubric_id, detail.criteria_name_en, detail.criteria_name_th]
    );

    if (parseInt(criteriaRows[0].count) > 0) {
      continue;
    }

    const query = `
      INSERT INTO "${process.env.DB_SCHEMA}".rubric_details
      (rubric_id, criteria_name_en, criteria_name_th, level_4_description,
       level_3_description, level_2_description, level_1_description,
       weight, display_order, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;
    `;

    const values = [
      rubric_id,
      detail.criteria_name_en,
      detail.criteria_name_th,
      detail.level_4_description || null,
      detail.level_3_description || null,
      detail.level_2_description || null,
      detail.level_1_description || null,
      detail.weight || 1.0,
      displayOrder,
      user_id,
      user_id
    ];

    const { rows } = await db.query(query, values);
    insertedRows.push(rows[0]);
  }

  return insertedRows;
};

/**
 * ดึงรายการรายละเอียดเกณฑ์การประเมินทั้งหมดตามรหัส Rubric ID เรียงลำดับตามที่กำหนด
 */
exports.getRubricDetailsByRubricId = async (rubric_id) => {
  const query = `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".rubric_details
    WHERE rubric_id = $1
    ORDER BY display_order ASC;
  `;
  const { rows } = await db.query(query, [rubric_id]);
  return rows;
};

/**
 * อัปเดตข้อมูลรายละเอียดเกณฑ์การประเมินแบบกลุ่มตามรายการที่ส่งมา
 */
exports.updateRubricDetailsByRubricId = async (detailsArray, rubric_id, user_id) => {
  const updatedRows = [];

  for (const detail of detailsArray) {
    const query = `
      UPDATE "${process.env.DB_SCHEMA}".rubric_details
      SET
        criteria_name_en = $1,
        criteria_name_th = $2,
        level_4_description = $3,
        level_3_description = $4,
        level_2_description = $5,
        level_1_description = $6,
        weight = $7,
        display_order = $8,
        updated_by = $9
      WHERE id = $10 AND rubric_id = $11
      RETURNING *;
    `;
    const values = [
      detail.criteria_name_en,
      detail.criteria_name_th,
      detail.level_4_description || null,
      detail.level_3_description || null,
      detail.level_2_description || null,
      detail.level_1_description || null,
      detail.weight || 1.0,
      detail.display_order || 0,
      user_id,
      detail.id,
      rubric_id
    ];

    const { rows } = await db.query(query, values);
    if (rows.length > 0) updatedRows.push(rows[0]);
  }

  return updatedRows;
};

/**
 * ลบข้อมูลรายละเอียดเกณฑ์การประเมินรายรายการตามรหัส ID
 */
exports.deleteRubricDetail = async (id) => {
  const query = `
    DELETE FROM "${process.env.DB_SCHEMA}".rubric_details
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await db.query(query, [id]);
  return rows[0];
};
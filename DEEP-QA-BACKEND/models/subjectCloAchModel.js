const db = require('../config/db');

/**
 * สร้างบันทึกเกณฑ์การบรรลุผลลัพธ์การเรียนรู้ (Subject CLO Achievement Criteria) ใหม่
 */
exports.create = async (data) => {
  const {
    section_id,
    clo_id,
    criteria_no,
    achievement_level,
    criteria_detail,
    criteria_description
  } = data;

  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".subject_clo_achievement_criteria
      (section_id, clo_id, criteria_no, achievement_level, criteria_detail, criteria_description)
    VALUES ($1, $2, $3, $4, $5, $6 )
    RETURNING *;
  `;

  const values = [
    section_id,
    clo_id,
    criteria_no,
    achievement_level,
    criteria_detail,
    criteria_description,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * ดึงข้อมูลเกณฑ์การบรรลุผลตามรหัสกลุ่มเรียน (Section ID) และรหัส CLO โดยเรียงลำดับตามเลขเกณฑ์
 */
exports.getSubjectClo = async ({ section_id, clo_id }) => {
  let query = `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".subject_clo_achievement_criteria
    WHERE section_id = $1
      AND clo_id = $2
    ORDER BY criteria_no ASC;
  `;

  const values = [section_id, clo_id];

  const result = await db.query(query, values);
  return result.rows;
};

/**
 * อัปเดตข้อมูลรายละเอียดเกณฑ์การบรรลุผลและระดับความสำเร็จตาม ID
 */
exports.updateSubjectClo = async (data) => {
  const {
    id,
    achievement_level,
    criteria_detail,
    criteria_description
  } = data;

  const query = `
    UPDATE "${process.env.DB_SCHEMA}".subject_clo_achievement_criteria
    SET achievement_level = $1,
        criteria_detail = $2,
        criteria_description = $3,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
  `;

  const values = [
    achievement_level,
    criteria_detail,
    criteria_description,
    id
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * ลบเกณฑ์การบรรลุผล และดำเนินการจัดลำดับหมายเลขเกณฑ์ (criteria_no) ใหม่สำหรับรายการที่เหลืออยู่
 */
exports.deleteSubjectClo = async ({ id }) => {
  const findQuery = `
    SELECT id, section_id, clo_id, criteria_no
    FROM "${process.env.DB_SCHEMA}".subject_clo_achievement_criteria
    WHERE id = $1
  `;
  const findResult = await db.query(findQuery, [id]);
  const recordToDelete = findResult.rows[0];

  if (!recordToDelete) return null;

  const deleteQuery = `
    DELETE FROM "${process.env.DB_SCHEMA}".subject_clo_achievement_criteria
    WHERE id = $1
    RETURNING *;
  `;
  const deletedResult = await db.query(deleteQuery, [id]);
  const deletedRecord = deletedResult.rows[0];

  const selectQuery = `
    SELECT id, criteria_no
    FROM "${process.env.DB_SCHEMA}".subject_clo_achievement_criteria
    WHERE section_id = $1
      AND clo_id = $2
    ORDER BY criteria_no ASC;
  `;
  const criteriaList = await db.query(selectQuery, [
    recordToDelete.section_id,
    recordToDelete.clo_id
  ]);

  for (let i = 0; i < criteriaList.rows.length; i++) {
    const record = criteriaList.rows[i];
    const newOrder = i + 1;

    if (record.criteria_no !== newOrder) {
      await db.query(
        `
        UPDATE "${process.env.DB_SCHEMA}".subject_clo_achievement_criteria
        SET criteria_no = $1
        WHERE id = $2
        `,
        [newOrder, record.id]
      );
    }
  }

  return deletedRecord;
};
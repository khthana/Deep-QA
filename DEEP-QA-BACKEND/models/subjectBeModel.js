const db = require("../config/db");

/**
 * บันทึกข้อมูลพฤติกรรมที่วัดได้ของ CLO (Measurable Behavior) ใหม่ลงในฐานข้อมูล
 */
exports.createSubjectBe = async (data) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".subject_clo_measurable_behavior
      (
        section_id,
        clo_id,
        behavior_no,
        learning_activity,
        behavior_detail,
        cognitive_level
      )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *;
  `;

  const values = [
    data.section_id,
    data.clo_id,
    data.behavior_no,
    data.learning_activity,
    data.behavior_detail,
    data.cognitive_level
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * ดึงข้อมูลพฤติกรรมตามเงื่อนไขกลุ่มเรียน (Section) และสามารถระบุ CLO เฉพาะเจาะจงได้
 */
exports.getSubjectBeByFilter = async ({ section_id, clo_id }) => {
  let query = `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".subject_clo_measurable_behavior
    WHERE section_id = $1
  `;

  const values = [section_id];

  if (clo_id) {
    query += ` AND clo_id = $${values.length + 1}`;
    values.push(clo_id);
  }

  query += ` ORDER BY clo_id, behavior_no;`;

  const result = await db.query(query, values);
  return result.rows;
};

/**
 * อัปเดตข้อมูลรายละเอียดพฤติกรรม กิจกรรมการเรียนรู้ และระดับพุทธิพิสัย ตามรหัส ID
 */
exports.updateSubjectBe = async (data) => {
  let query = `
    UPDATE "${process.env.DB_SCHEMA}".subject_clo_measurable_behavior
    SET learning_activity = $1,
        behavior_detail = $2,
        cognitive_level = $3,
        updated_at = CURRENT_TIMESTAMP
  `;
  
  const values = [data.learning_activity, data.behavior_detail, data.cognitive_level];

  if (data.section !== undefined) {
    query += `, section_number = $4`;
    values.push(data.section);
  }

  query += ` WHERE id = $${values.length + 1} RETURNING *;`;
  values.push(data.id);

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * ลบข้อมูลพฤติกรรมออกจากฐานข้อมูลตามรหัส ID
 */
exports.deleteById = async (id) => {
  const query = `
    DELETE FROM "${process.env.DB_SCHEMA}".subject_clo_measurable_behavior
    WHERE id = $1
    RETURNING *;
  `;
  const result = await db.query(query, [id]);
  return result.rows[0];
};

/**
 * ดึงรายการพฤติกรรมทั้งหมดภายในกลุ่มเรียนที่ระบุ โดยเรียงลำดับตามหมายเลขพฤติกรรม
 */
exports.getBehaviorListBySection = async (section_id) => {
  const query = `
    SELECT id, behavior_no
    FROM "${process.env.DB_SCHEMA}".subject_clo_measurable_behavior
    WHERE section_id = $1
    ORDER BY behavior_no;
  `;
  const result = await db.query(query, [section_id]);
  return result.rows;
};

/**
 * อัปเดตลำดับหมายเลขพฤติกรรม (behavior_no) ใหม่ให้กับรายการที่ระบุ
 */
exports.updateBehaviorOrder = async (id, behavior_no) => {
  const query = `
    UPDATE "${process.env.DB_SCHEMA}".subject_clo_measurable_behavior
    SET behavior_no = $2
    WHERE id = $1;
  `;
  await db.query(query, [id, behavior_no]);
};
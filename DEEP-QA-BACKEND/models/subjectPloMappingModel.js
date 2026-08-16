// models/subjectPloMappingModel.js
const db = require("../config/db");

/**
 * สร้างข้อมูลการแมปรายวิชากับผลลัพธ์การเรียนรู้ (PLO Mapping)
 */
exports.createPloMapping = async ({
  program_id,
  outcome_id,
  subject_id,
  mapping_level ,
  created_by,
  updated_by
}) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".subject_plo_mapping
      (program_id, outcome_id, subject_id, mapping_level, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [program_id, outcome_id, subject_id, mapping_level, created_by, updated_by];

  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * อัปเดตข้อมูลการแมปรายวิชากับ PLO แบบ Dynamic
 */
exports.updateSubjectPloMapping = async ({ mapping_id, outcome_id, mapping_level, updated_by }) => {
  const setFields = [];
  const values = [];

  if (outcome_id !== undefined) {
    setFields.push(`outcome_id = $${setFields.length + 1}`);
    values.push(outcome_id);
  }

  if (mapping_level !== undefined) {
    setFields.push(`mapping_level = $${setFields.length + 1}`);
    values.push(mapping_level);
  }

  setFields.push(`updated_by = $${setFields.length + 1}`);
  values.push(updated_by);

  if (setFields.length === 0) {
    throw new Error("Nothing to update");
  }

  values.push(mapping_id);
  const query = `
    UPDATE "${process.env.DB_SCHEMA}".subject_plo_mapping
    SET ${setFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE mapping_id = $${values.length}
    RETURNING *;
  `;

  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * ลบข้อมูลการแมปรายวิชากับ PLO ตามรหัส Mapping ID
 */
exports.deleteSubjectPloMapping = async (mapping_id) => {
  const query = `
    DELETE FROM "${process.env.DB_SCHEMA}".subject_plo_mapping
    WHERE mapping_id = $1
    RETURNING *;
  `;
  const { rows } = await db.query(query, [mapping_id]);
  return rows[0];
};

/**
 * ดึงข้อมูลการแมปทั้งหมดของหลักสูตรที่ระบุ พร้อมรายละเอียดรายวิชาและ PLO
 */
exports.getSubjectPloMappingByProgramId = async (program_id) => {
  const query = `
    SELECT 
      s.subject_id,
      s.subject_name_th,
      s.subject_name_en,
      l.outcome_code,
      l.outcome_description,
      m.mapping_id,
      m.mapping_level
    FROM "${process.env.DB_SCHEMA}".subject_plo_mapping m
    JOIN "${process.env.DB_SCHEMA}".subjects s
      ON s.subject_id = m.subject_id
    LEFT JOIN "${process.env.DB_SCHEMA}".learning_outcomes l
      ON l.outcome_id = m.outcome_id   
    WHERE m.program_id = $1
    ORDER BY s.subject_id, l.outcome_code
  `;
  const { rows } = await db.query(query, [program_id]);
  return rows;
};

/**
 * ดึงรายการรหัสวิชาทั้งหมดที่อยู่ในหลักสูตรที่ระบุ
 */
exports.getSubjectsByProgram = async (program_id) => {
  const query = `
    SELECT subject_id 
    FROM "${process.env.DB_SCHEMA}".program_subjects
    WHERE program_id = $1 AND is_active = true;
  `;
  const { rows } = await db.query(query, [program_id]);
  return rows;
};

/**
 * สร้างข้อมูลการแมปเริ่มต้นแบบยังไม่ระบุผลลัพธ์ (Empty Mapping)
 */
exports.createEmptyMapping = async ({ program_id, subject_id, created_by, updated_by }) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".subject_plo_mapping
      (program_id, subject_id, created_by, updated_by)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [program_id, subject_id, created_by, updated_by];
  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * ตรวจสอบว่ามีการแมประหว่างหลักสูตรและรายวิชานี้อยู่แล้วหรือไม่
 */
exports.checkMappingExists = async (program_id, subject_id) => {
  const query = `
    SELECT 1 FROM "${process.env.DB_SCHEMA}".subject_plo_mapping
    WHERE program_id = $1 AND subject_id = $2
    LIMIT 1;
  `;
  const { rows } = await db.query(query, [program_id, subject_id]);
  return rows.length > 0;
};

/**
 * ดึงข้อมูลการแมปของรายวิชาและหลักสูตรที่ระบุ เรียงตามลำดับความสำคัญ
 */
exports.getSubjectPloMapping = async (subject_id, program_id) => {
  const query = `
    SELECT spm.mapping_id,
           spm.subject_id,
           spm.program_id,
           spm.outcome_id,
           lo.outcome_code,
           lo.outcome_title,
           lo.outcome_type,
           spm.mapping_level
    FROM "${process.env.DB_SCHEMA}".subject_plo_mapping spm
    LEFT JOIN "${process.env.DB_SCHEMA}".learning_outcomes lo
      ON spm.outcome_id = lo.outcome_id
    WHERE spm.subject_id = $1
      AND spm.program_id = $2
    ORDER BY lo.sequence_order;
  `;
  const values = [subject_id, program_id];
  const result = await db.query(query, values);
  return result.rows;
};

/**
 * ดึงข้อมูลการแมปของรายวิชาพร้อมข้อมูลผลลัพธ์การเรียนรู้ย่อย (Children Outcomes)
 */
exports.getSubjectPloMappingWithChildren = async (subject_id, program_id) => {
  const query = `
    SELECT
      spm.mapping_id,
      spm.subject_id,
      spm.program_id,
      spm.mapping_level,

      lo.outcome_id AS parent_outcome_id,
      lo.outcome_code AS parent_outcome_code,
      lo.outcome_title AS parent_outcome_title,
      lo.outcome_type AS parent_outcome_type,

      child.outcome_id AS child_outcome_id,
      child.outcome_code AS child_outcome_code,
      child.outcome_title AS child_outcome_title,
      child.outcome_type AS child_outcome_type

    FROM "${process.env.DB_SCHEMA}".subject_plo_mapping spm
    JOIN "${process.env.DB_SCHEMA}".learning_outcomes lo
      ON spm.outcome_id = lo.outcome_id

    LEFT JOIN "${process.env.DB_SCHEMA}".learning_outcomes child
      ON child.parent_outcome_id = lo.outcome_id
     AND child.is_active = true

    WHERE spm.subject_id = $1
      AND spm.program_id = $2

    ORDER BY lo.sequence_order, child.sequence_order
  `;

  const result = await db.query(query, [subject_id, program_id]);
  return result.rows;
};


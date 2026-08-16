const db = require('../config/db');

/**
 * บันทึกข้อมูลหลักฐาน (Evidence) เช่น ไฟล์งานหรือเอกสารประกอบกิจกรรม ลงในฐานข้อมูล
 */
exports.insertEvidence = async (data) => {
  const sql = `
    INSERT INTO "${process.env.DB_SCHEMA}".activity_evidence
      (section_id, activity_id, evidence_type, description,
       file_name, file_path, mime_type, file_size,
       uploaded_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `;
  const { rows } = await db.query(sql, [
    data.section_id,
    data.activity_id,
    data.evidence_type,
    data.description,
    data.file_name,
    data.file_path,
    data.mime_type,
    data.file_size,
    data.uploaded_by
  ]);
  return rows[0];
};

/**
 * ดึงรายการหลักฐานทั้งหมดในกลุ่มเรียน (Section) ที่ระบุ โดยเลือกเฉพาะรายการที่ยังไม่ได้ลบ
 */
exports.getEvidenceBySection = async (sectionId) => {
  const { rows } = await db.query(
    `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".activity_evidence
    WHERE section_id = $1
      AND is_deleted = false
    ORDER BY uploaded_at DESC
    `,
    [sectionId]
  );
  return rows;
};

/**
 * ดึงข้อมูลหลักฐานรายรายการด้วยรหัส ID
 */
exports.getEvidenceById = async (evidenceId) => {
  const { rows } = await db.query(
    `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".activity_evidence
    WHERE evidence_id = $1
      AND is_deleted = false
    `,
    [evidenceId]
  );
  return rows[0];
};

/**
 * ลบข้อมูลหลักฐานแบบ Soft Delete โดยการปรับสถานะ is_deleted เป็น true
 */
exports.softDeleteEvidence = async (evidenceId, userId) => {
  await db.query(
    `
    UPDATE "${process.env.DB_SCHEMA}".activity_evidence
    SET is_deleted = true,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE evidence_id = $1
    `,
    [evidenceId, userId]
  );
};

/**
 * ดึงรายการหลักฐานที่สัมพันธ์กับกลุ่มเรียนและกิจกรรมที่ระบุ
 */
exports.getEvidenceBySectionAndActivity = async (
  sectionId,
  activityId
) => {
  const { rows } = await db.query(
    `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".activity_evidence
    WHERE section_id = $1
      AND activity_id = $2
      AND is_deleted = false
    ORDER BY uploaded_at DESC
    `,
    [sectionId, activityId]
  );
  return rows;
};

/**
 * อัปเดตข้อมูลรายละเอียดหรือประเภทของหลักฐาน
 */
exports.updateEvidence = async (id, data) => {
  const { description, evidence_type, updated_by } = data;

  try {
    const sql = `
      UPDATE "${process.env.DB_SCHEMA}".activity_evidence
      SET 
        description = $1, 
        evidence_type = $2, 
        updated_by = $3, 
        updated_at = CURRENT_TIMESTAMP
      WHERE evidence_id = $4 
        AND is_deleted = false
      RETURNING *
    `;

    const { rows } = await db.query(sql, [
      description,
      evidence_type,
      updated_by,
      id
    ]);

    return rows[0];
    
  } catch (error) {
    console.error("Error in updateEvidence model:", error);
    throw error;
  }
};
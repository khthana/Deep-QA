// models/program_subjectsModel.js
const db = require('../config/db');
const subjectPloMappingModel = require("./subjectPloMappingModel");

/**
 * บันทึกความเชื่อมโยงระหว่างหลักสูตรและรายวิชา (Program Subject)
 */
exports.createProgramSubject = async (programSubject) => {
  const {
    program_id,
    subject_id,
    subject_type,
    created_by,
    updated_by,
  } = programSubject;

  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".program_subjects (
      program_id,
      subject_id,
      subject_type,
      created_by,
      updated_by
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [program_id, subject_id, subject_type, created_by, updated_by];

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * อัปเดตข้อมูลรายละเอียดหรือสถานะการใช้งานของรายวิชาภายในหลักสูตรแบบ Dynamic
 */
exports.updateProgramSubject = async ({ program_id, subject_id, subject_type, is_active, updated_by }) => {
  const setFields = [];
  const values = [];
  let idx = 1;

  if (subject_type !== null && subject_type !== undefined) {
    setFields.push(`subject_type = $${idx++}`);
    values.push(subject_type);
  }

  if (is_active !== null && is_active !== undefined) {
    setFields.push(`is_active = $${idx++}`);
    values.push(is_active);
  }

  setFields.push(`updated_by = $${idx++}`);
  values.push(updated_by);

  setFields.push(`updated_at = CURRENT_TIMESTAMP`);

  const query = `
    UPDATE "${process.env.DB_SCHEMA}".program_subjects
    SET ${setFields.join(', ')}
    WHERE program_id = $${idx++} AND subject_id = $${idx}
    RETURNING *;
  `;

  values.push(program_id, subject_id);

  const result = await db.query(query, values);

  if (result.rows.length === 0) {
    throw new Error(`ไม่พบ program_id: ${program_id} กับ subject_id: ${subject_id}`);
  }

  return result.rows[0];
};

/**
 * ดึงข้อมูลรายวิชาในหลักสูตรทั้งหมดพร้อมรายละเอียดชื่อวิชาภาษาไทยและภาษาอังกฤษ
 */
exports.getAllProgramSubjects = async () => {
  const query = `
    SELECT ps.program_id, ps.subject_id, ps.subject_type, ps.is_active,
           ps.created_at, ps.updated_at, ps.created_by, ps.updated_by,
           s.subject_name_en, s.subject_name_th
    FROM "${process.env.DB_SCHEMA}".program_subjects ps
    LEFT JOIN "${process.env.DB_SCHEMA}".subjects s
    ON ps.subject_id = s.subject_id
    ORDER BY ps.program_id, ps.subject_id;
  `;

  const result = await db.query(query);
  return result.rows;
};

/**
 * ค้นหาข้อมูลรายวิชาในหลักสูตรโดยอ้างอิงจากรหัสหลักสูตรและรหัสวิชา
 */
exports.getProgramSubjectById = async (program_id, subject_id) => {
  const query = `
    SELECT ps.program_id, ps.subject_id, ps.subject_type, ps.is_active,
           ps.created_at, ps.updated_at, ps.created_by, ps.updated_by,
           s.subject_name_en, s.subject_name_th
    FROM "${process.env.DB_SCHEMA}".program_subjects ps
    LEFT JOIN "${process.env.DB_SCHEMA}".subjects s
    ON ps.subject_id = s.subject_id
    WHERE ps.program_id = $1 AND ps.subject_id = $2
    LIMIT 1;
  `;
  const result = await db.query(query, [program_id, subject_id]);
  return result.rows[0];
};

/**
 * ดึงรายการรายวิชาทั้งหมดที่เปิดใช้งานภายใต้รหัสหลักสูตรที่ระบุ
 */
exports.getProgramSubjectsByProgramId = async (program_id) => {
  const query = `
    SELECT 
      ps.program_id, 
      ps.subject_id, 
      ps.subject_type,
      s.subject_name_en, 
      s.subject_name_th
    FROM "${process.env.DB_SCHEMA}".program_subjects ps
    LEFT JOIN "${process.env.DB_SCHEMA}".subjects s
      ON ps.subject_id = s.subject_id
    WHERE ps.program_id = $1 
      AND ps.is_active = true
    ORDER BY ps.subject_id;
  `;
  const result = await db.query(query, [program_id]);
  return result.rows;
};

/**
 * ลบรายวิชาออกจากหลักสูตร โดยจะทำการลบข้อมูล PLO Mapping ที่เกี่ยวข้องก่อน 
 * หากไม่สามารถลบข้อมูลจริงได้เนื่องจากมีข้อมูลเชื่อมโยง จะทำการปิดการใช้งาน (Soft Delete) แทน
 */
exports.deleteProgramSubject = async (program_id, subject_id) => {
  try {
    await db.query(
      `DELETE FROM "${process.env.DB_SCHEMA}".subject_plo_mapping
       WHERE program_id = $1 AND subject_id = $2`,
      [program_id, subject_id]
    );

    const result = await db.query(
      `DELETE FROM "${process.env.DB_SCHEMA}".program_subjects 
       WHERE program_id = $1 AND subject_id = $2 
       RETURNING *`,
      [program_id, subject_id]
    );

    if (result.rowCount > 0) {
      return { action: "deleted", data: result.rows[0] };
    }

    return { action: "not_found" };
  } catch (error) {
    if (error.code === "23503") {
      const updateResult = await db.query(
        `UPDATE "${process.env.DB_SCHEMA}".program_subjects
         SET is_active = false
         WHERE program_id = $1 AND subject_id = $2
         RETURNING *`,
        [program_id, subject_id]
      );

      await db.query(
        `DELETE FROM "${process.env.DB_SCHEMA}".subject_plo_mapping
         WHERE program_id = $1 AND subject_id = $2`,
        [program_id, subject_id]
      );

      if (updateResult.rowCount > 0) {
        return { action: "deactivated", data: updateResult.rows[0] };
      }
    }

    throw error;
  }
};


exports.existsInProgram = async (program_id, subject_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".program_subjects 
     WHERE program_id = $1 AND subject_id = $2 LIMIT 1`,
    [program_id, subject_id]
  );
  return result.rows[0] || null;
};

/**
 * กู้คืนสถานะการใช้งาน (Reactivate)
 */
exports.reactivateProgramSubject = async (program_id, subject_id, user_id) => {
  await db.query(
    `UPDATE "${process.env.DB_SCHEMA}".program_subjects
     SET is_active = true, updated_by = $3, updated_at = CURRENT_TIMESTAMP
     WHERE program_id = $1 AND subject_id = $2`,
    [program_id, subject_id, user_id]
  );
};
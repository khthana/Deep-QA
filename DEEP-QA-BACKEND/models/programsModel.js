const db = require('../config/db');

/**
 * สร้างข้อมูลหลักสูตรใหม่ลงในฐานข้อมูล หากรหัสหลักสูตรซ้ำจะไม่ดำเนินการใดๆ (ON CONFLICT DO NOTHING)
 */
exports.createProgram = async (program) => {
  const result = await db.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".programs
     (program_id, program_name_en, program_name_th, department_id, year, is_active)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE))
     ON CONFLICT (program_id) DO NOTHING
     RETURNING *`,
    [
      program.program_id,
      program.program_name_en,
      program.program_name_th,
      program.department_id,
      program.year,
      program.is_active,
    ]
  );
  return result.rows[0] || null;
};

/**
 * ค้นหาข้อมูลหลักสูตรโดยใช้ชื่อและปี (ตรวจสอบความซ้ำซ้อนในปีเดียวกัน)
 */
exports.findByNameAndYear = async (name_en, name_th, year) => {
  const res = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".programs 
     WHERE (program_name_en = $1 OR program_name_th = $2) 
     AND year = $3`,
    [name_en, name_th, year]
  );
  return res.rows[0] || null;
};

/**
 * ตรวจสอบว่ามีรหัสหลักสูตรนี้อยู่ในระบบหรือไม่ (รวมถึงรายการที่ปิดการใช้งานอยู่)
 */
exports.existsProgramById = async (program_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".programs 
     WHERE program_id = $1
     LIMIT 1`,
    [program_id]
  );
  return result.rows[0] || null;
};

/**
 * เปลี่ยนสถานะหลักสูตรให้กลับมาใช้งานได้อีกครั้ง (Reactivate)
 */
exports.reactivateProgram = async (program_id) => {
  await db.query(
    `UPDATE "${process.env.DB_SCHEMA}".programs
     SET is_active = true
     WHERE program_id = $1`,
    [program_id]
  );
};

/**
 * ดึงข้อมูลหลักสูตรโดยระบุรหัสหลักสูตร (เฉพาะหลักสูตรที่มีสถานะใช้งานอยู่เท่านั้น)
 */
exports.getProgramById = async (program_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".programs 
     WHERE program_id = $1 AND is_active = true
     LIMIT 1`,
    [program_id]
  );
  return result.rows[0];
};

/**
 * ดึงรายชื่อหลักสูตรทั้งหมดภายใต้รหัสภาควิชาที่ระบุ (เฉพาะที่มีสถานะใช้งาน)
 */
exports.getProgramsByDepartmentId = async (department_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".programs 
     WHERE department_id = $1 AND is_active = true`,
    [department_id]
  );
  return result.rows;
};

/**
 * ดึงรายชื่อหลักสูตรที่มีสถานะใช้งานอยู่ทั้งหมดในระบบ
 */
exports.getAllPrograms = async () => {
  const result = await db.query(`SELECT * FROM "${process.env.DB_SCHEMA}".programs WHERE is_active = true`);
  return result.rows;
};

/**
 * อัปเดตข้อมูลรายละเอียดของหลักสูตรตามรหัสหลักสูตรที่ระบุ
 */
exports.updateProgram = async (program_id, updateData) => {
  const result = await db.query(
    `UPDATE "${process.env.DB_SCHEMA}".programs
     SET program_name_th = $1, program_name_en = $2, department_id = $3, year = $4, is_active = $5
     WHERE program_id = $6
     RETURNING *`,
    [
      updateData.program_name_th,
      updateData.program_name_en,
      updateData.department_id,
      updateData.year,
      updateData.is_active,
      program_id
    ]
  );
  return result.rows[0];
};

/**
 * ลบข้อมูลหลักสูตร โดยหากพบข้อมูลที่เกี่ยวข้องเชื่อมโยงอยู่ (เช่น นักศึกษา หรือ PLO) 
 */
exports.deleteProgram = async (program_id) => {
  const pid = program_id.toString().trim();
  const schema = process.env.DB_SCHEMA || 'public';

  try {
    const findTablesQuery = `
      SELECT 
        kcu.table_name, 
        kcu.column_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'programs'
        AND ccu.column_name = 'program_id'
        AND kcu.table_schema = $1;
    `;

    const relatedTables = await db.query(findTablesQuery, [schema]);
    let totalUsage = 0;

    for (const row of relatedTables.rows) {
      const countRes = await db.query(
        `SELECT COUNT(*) AS cnt FROM "${schema}"."${row.table_name}" WHERE "${row.column_name}" = $1`,
        [pid]
      );
      totalUsage += parseInt(countRes.rows[0].cnt, 10);
    }

    if (totalUsage > 0) {
      return { status: 'forbidden', usageCount: totalUsage };
    }

    const deleteRes = await db.query(
      `DELETE FROM "${schema}".programs WHERE program_id = $1`,
      [pid]
    );

    return deleteRes.rowCount === 0 ? { status: 'not_found' } : { status: 'deleted' };

  } catch (error) {
    console.error('Database Error:', error);
    throw error;
  }
};
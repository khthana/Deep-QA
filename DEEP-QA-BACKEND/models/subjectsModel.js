// models/subjectModel.js
const db = require('../config/db');

/**
 * สร้างข้อมูลรายวิชาใหม่ลงในฐานข้อมูล
 */
exports.createSubject = async (subject) => {
  const {
    subject_id,
    subject_name_en,
    subject_name_th,
    credits,
    description_th,
    description_en,
    created_by,
    updated_by,
    department_id,
  } = subject;

  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".subjects(
      subject_id,
      subject_name_en,
      subject_name_th,
      credits,
      description_th,
      description_en,
      created_by,
      updated_by,
      department_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    subject_id,
    subject_name_en,
    subject_name_th,
    credits,
    description_th,
    description_en,
    created_by,
    updated_by,
    department_id,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * ดึงข้อมูลรายวิชาโดยอ้างอิงจากรหัสวิชา (subject_id)
 */
exports.getSubjectById = async (subject_id) => {
  const res = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".subjects WHERE subject_id = $1`,
    [subject_id]
  );
  return res.rows[0];
};

/**
 * ค้นหารหัสวิชาโดยอ้างอิงจากชื่อวิชาภาษาอังกฤษ
 */
exports.findByName = async (subject_name) => {
  const query = `
    SELECT subject_id
    FROM "${process.env.DB_SCHEMA}".subjects
    WHERE subject_name_en = $1
    LIMIT 1;
  `;
  const values = [subject_name];
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * ดึงข้อมูลรายวิชาทั้งหมดที่สถานะยังใช้งานอยู่ (is_active = true)
 */
exports.getAllSubjects = async () => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".subjects WHERE is_active = true`
  );
  return result.rows;
};

/**
 * ดึงข้อมูลรายวิชาทั้งหมดภายใต้ภาควิชาที่ระบุ
 */
exports.getSubjectsByDepartmentId = async (department_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".subjects
     WHERE department_id = $1 AND is_active = true`,
    [department_id]
  );
  return result.rows;
};

/**
 * ลบข้อมูลรายวิชา โดยหากตรวจพบการใช้งานในตารางอื่นจะทำการปิดการใช้งาน (Soft Delete) แทนการลบจริง
 */
exports.deleteSubject = async (subject_id) => {
  const subId = subject_id.toString().trim();

  const usageTables = [
    { table: 'semester_courses', column: 'subject_id' },
    { table: 'program_subjects', column: 'subject_id' },
  ];

  let totalUsage = 0;

  for (const { table, column } of usageTables) {
    try {
      const res = await db.query(
        `SELECT COUNT(*) AS cnt 
         FROM "${process.env.DB_SCHEMA}"."${table}" 
         WHERE "${column}" = $1`,
        [subId]
      );
      totalUsage += parseInt(res.rows[0].cnt, 10);
    } catch (err) {
      if (err.code === '42P01') {
        console.warn(`Table ${table} ไม่พบ, ข้ามการเช็ค`);
      } else if (err.code === '42703') {
        console.warn(`Column ${column} ใน ${table} ไม่พบ, ข้ามการเช็ค`);
      } else {
        throw err;
      }
    }
  }

  if (totalUsage > 0) {
    await db.query(
      `UPDATE "${process.env.DB_SCHEMA}".subjects 
       SET is_active = false 
       WHERE subject_id = $1`,
      [subId]
    );
    return { status: 'deactivated', usageCount: totalUsage };
  } else {
    await db.query(
      `DELETE FROM "${process.env.DB_SCHEMA}".subjects 
       WHERE subject_id = $1`,
      [subId]
    );
    return { status: 'deleted' };
  }
};

/**
 * อัปเดตข้อมูลรายละเอียดรายวิชาตามฟิลด์ที่กำหนด
 */
exports.updateSubject = async ({
  subject_id,
  subject_name_en,
  subject_name_th,
  credits,
  description_th,
  description_en,
  updated_by,
  department_id,
}) => {
  const query = `
    UPDATE "${process.env.DB_SCHEMA}".subjects
    SET 
      subject_name_en = $1,
      subject_name_th = $2,
      credits = $3,
      description_th = $4,
      description_en = $5,
      updated_by = $6,
      department_id = $7,
      updated_at = NOW()
    WHERE subject_id = $8
    RETURNING *;
  `;

  const values = [
    subject_name_en,
    subject_name_th,
    credits,
    description_th,
    description_en,
    updated_by,
    department_id,
    subject_id,
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * บันทึกข้อมูลรายวิชาแบบ Upsert (ถ้ามีรหัสวิชาเดิมอยู่แล้วจะทำการ Update ข้อมูลใหม่แทน)
 */
exports.upsertSubject = async (data) => {
  const {
    subject_id,
    subject_name_en,
    subject_name_th,
    credits,
    description_th,
    description_en,
    created_by,
    updated_by,
    department_id,
  } = data;

  // ใช้ ON CONFLICT เพื่อทำ Upsert ใน Query เดียว
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".subjects (
      subject_id, 
      subject_name_en, 
      subject_name_th, 
      credits, 
      description_th, 
      description_en, 
      created_by, 
      updated_by, 
      department_id,
      is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
    ON CONFLICT (subject_id) 
    DO UPDATE SET
      subject_name_en = EXCLUDED.subject_name_en,
      subject_name_th = EXCLUDED.subject_name_th,
      credits = EXCLUDED.credits,
      description_th = EXCLUDED.description_th,
      description_en = EXCLUDED.description_en,
      updated_by = EXCLUDED.updated_by,
      department_id = EXCLUDED.department_id,
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok',
      is_active = true
    RETURNING (xmax = 0) AS is_insert;
  `;

  const values = [
    subject_id,
    subject_name_en,
    subject_name_th,
    credits,
    description_th,
    description_en,
    created_by,
    updated_by,
    department_id,
  ];

  const result = await db.query(query, values);
  
  // คืนค่าสถานะว่าเป็นการ Insert ใหม่ (true) หรือ Update ของเดิม (false)
  return {
    action: result.rows[0].is_insert ? 'insert' : 'update',
    data: result.rows[0]
  };
};
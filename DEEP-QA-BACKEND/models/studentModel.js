const db = require('../config/db');

/**
 * ดึงข้อมูลนักศึกษาตามปีที่เข้าเรียน (Admission Year)
 */
exports.getStudentFromAdmissionYear = async (year) => {
  const query = `
    SELECT 
      s.student_id,
      u.title_th, -- ดึง title_th จากตาราง user
      s.first_name_th,
      s.last_name_th,
      s.full_name_th,
      s.department_id,
      s.program_id,
      s.status,
      s.admission_year,
      s.created_at,
      s.updated_at
    FROM "${process.env.DB_SCHEMA}".student s
    LEFT JOIN "${process.env.DB_SCHEMA}".users u ON s.student_id = u.user_id 
    WHERE s.admission_year = $1
    ORDER BY s.student_id ASC
  `

  const values = [year]

  const result = await db.query(query, values)
  return result.rows
}

/**
 * สร้างข้อมูลนักศึกษาใหม่ลงในฐานข้อมูล
 */
exports.createStudent = async ({
  student_id,
  first_name_th,
  last_name_th,
  department_id,
  program_id,
  admission_year,
  status = 'active',
}) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".student(
      student_id, first_name_th, last_name_th,
      department_id, program_id, admission_year, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [student_id, first_name_th, last_name_th, department_id, program_id, admission_year, status];
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * บันทึกข้อมูลนักศึกษาแบบ Upsert (หากมีรหัสซ้ำให้ทำการอัปเดตข้อมูลเดิม)
 */
exports.insertStudent = async (student) => {
  const { student_id, first_name_th, last_name_th, department_id, program_id, admission_year } = student;

  await db.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".student
      (student_id, first_name_th, last_name_th, department_id, program_id, admission_year)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (student_id) DO UPDATE SET
       first_name_th = EXCLUDED.first_name_th,
       last_name_th = EXCLUDED.last_name_th,
       department_id = EXCLUDED.department_id,
       program_id = EXCLUDED.program_id,
       admission_year = EXCLUDED.admission_year,
       updated_at = CURRENT_TIMESTAMP`,
    [student_id, first_name_th, last_name_th, department_id, program_id, admission_year]
  );
};

/**
 * ตรวจสอบว่ามีรหัสนักศึกษานี้อยู่ในระบบแล้วหรือไม่
 */
exports.existsStudentById = async (student_id) => {
  const res = await db.query(`SELECT 1 FROM "${process.env.DB_SCHEMA}".student WHERE student_id = $1`, [student_id]);
  return res.rowCount > 0;
};

/**
 * ดึงรายชื่อนักศึกษาทั้งหมดภายใต้ภาควิชาที่ระบุ
 */
exports.getStudentsByDepartmentId = async (department_id) => {
  const query = `
    SELECT 
      s.student_id, 
      u.title_th, 
      s.first_name_th, 
      s.last_name_th,
      s.department_id, 
      s.program_id, 
      s.admission_year, 
      s.status,
      s.created_at, 
      s.updated_at
    FROM "${process.env.DB_SCHEMA}".student s
    LEFT JOIN "${process.env.DB_SCHEMA}".users u ON s.student_id = u.user_id
    WHERE s.department_id = $1
    ORDER BY s.student_id;
  `;
  const result = await db.query(query, [department_id]);
  return result.rows;
};

/**
 * ดึงรายชื่อนักศึกษาทั้งหมดภายใต้หลักสูตรที่ระบุ
 */
exports.getStudentsByProgramId = async (program_id) => {
  const query = `
    SELECT 
      s.student_id, 
      u.title_th, 
      s.first_name_th, 
      s.last_name_th,
      s.department_id, 
      s.program_id, 
      s.admission_year, 
      s.status
    FROM "${process.env.DB_SCHEMA}".student s
    LEFT JOIN "${process.env.DB_SCHEMA}".users u ON s.student_id = u.user_id
    WHERE s.program_id = $1
    ORDER BY s.student_id;
  `;
  const result = await db.query(query, [program_id]);
  return result.rows;
};
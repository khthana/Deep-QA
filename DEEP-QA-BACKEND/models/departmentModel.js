// models/departmentModel.js
const db = require('../config/db');

/**
 * สร้างข้อมูลภาควิชาใหม่ลงในฐานข้อมูล หากรหัสภาควิชาซ้ำจะไม่ดำเนินการใดๆ
 */
exports.createDepartment = async (department) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".departments
    (department_id, department_name_en, department_name_th, is_active, faculty_id)
    VALUES ($1, $2, $3, COALESCE($4, TRUE), $5)
    ON CONFLICT (department_id) DO NOTHING
    RETURNING *;
  `

  const values = [
    department.department_id,
    department.department_name_en,
    department.department_name_th,
    department.is_active,
    department.faculty_id,
  ]

  const result = await db.query(query, values)
  return result.rows[0] || null
}

/**
 * ค้นหาภาควิชาโดยใช้ชื่อภาษาไทยหรือภาษาอังกฤษ
 */
exports.findByName = async (department_name) => {
  const res = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".departments 
     WHERE (department_name_en = $1 OR department_name_th = $1)`,
    [department_name],
  )
  return res.rows[0] || null
}

/**
 * ดึงข้อมูลภาควิชาจาก ID เฉพาะรายการที่สถานะใช้งานอยู่
 */
exports.getDepartmentById = async (department_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".departments 
     WHERE department_id = $1 AND is_active = true
     LIMIT 1`,
    [department_id],
  )
  return result.rows[0] || null
}

/**
 * เปลี่ยนสถานะภาควิชาให้กลับมาใช้งานได้อีกครั้ง
 */
exports.reactivateDepartment = async (department_id) => {
  await db.query(
    `UPDATE "${process.env.DB_SCHEMA}".departments
     SET is_active = true
     WHERE department_id = $1`,
    [department_id],
  )
}

/**
 * ตรวจสอบว่ามีรหัสภาควิชานี้อยู่ในฐานข้อมูลหรือไม่ (รวมถึงรายการที่ปิดการใช้งาน)
 */
exports.existsDepartmentById = async (department_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".departments 
     WHERE department_id = $1 
     LIMIT 1`,
    [department_id],
  )
  return result.rows[0] || null
}

/**
 * ดึงรายชื่อภาควิชาทั้งหมดที่สังกัดภายใต้รหัสคณะที่ระบุ
 */
exports.getDepartmentByFacultyId = async (faculty_id) => {
  try {
    const result = await db.query(
      `SELECT * FROM "${process.env.DB_SCHEMA}".departments 
       WHERE faculty_id = $1 AND is_active = true`,
      [faculty_id],
    )
    return result.rows
  } catch (error) {
    console.error('Error fetching departments by faculty_id:', error)
    throw error
  }
}

/**
 * ดึงรายชื่อภาควิชาทั้งหมดที่มีสถานะใช้งานอยู่
 */
exports.getAllDepartments = async () => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".departments WHERE is_active = true`,
  )
  return result.rows
}

/**
 * ดึงรายชื่อภาควิชาทั้งหมดที่ถูกปิดการใช้งาน
 */
exports.getAllDepartmentsIs_activeFalse = async () => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".departments WHERE is_active = false`,
  )
  return result.rows
}

/**
 * ลบข้อมูลภาควิชา โดยหากตรวจพบว่ามีการใช้งานอยู่ในตารางอื่น (เช่น หลักสูตร หรือ ผู้ใช้งาน) 
 * จะใช้วิธีปิดการใช้งาน (Soft Delete) แทนการลบทิ้งถาวร
 */
exports.deleteDepartment = async (department_id) => {
  const deptId = department_id.toString().trim();
  const schema = process.env.DB_SCHEMA || 'public';

  try {
    // 1. ค้นหาทุกตารางที่ทำ Foreign Key ชี้มาที่ departments(department_id) โดยอัตโนมัติ
    const findTablesQuery = `
      SELECT 
        kcu.table_name, 
        kcu.column_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'departments'
        AND ccu.column_name = 'department_id'
        AND kcu.table_schema = $1;
    `;

    const relatedTables = await db.query(findTablesQuery, [schema]);
    let totalUsage = 0;

    // 2. วนลูปนับจำนวนจากตารางที่ตรวจเจอ (เช่น programs, user และอื่นๆ)
    for (const row of relatedTables.rows) {
      const countRes = await db.query(
        `SELECT COUNT(*) AS cnt FROM "${schema}"."${row.table_name}" WHERE "${row.column_name}" = $1`,
        [deptId]
      );
      totalUsage += parseInt(countRes.rows[0].cnt, 10);
    }

    // 3. ถ้ามีการใช้งานในตารางใดก็ตาม ให้ส่งสถานะ forbidden พร้อมจำนวน
    if (totalUsage > 0) {
      return { status: 'forbidden', usageCount: totalUsage };
    }

    // 4. ถ้าไม่มีการใช้งานเลย ให้ลบข้อมูลออกจากตาราง departments
    const deleteRes = await db.query(
      `DELETE FROM "${schema}".departments WHERE department_id = $1`,
      [deptId]
    );

    if (deleteRes.rowCount === 0) {
      return { status: 'not_found' };
    }

    return { status: 'deleted' };

  } catch (error) {
    console.error('Database Error in deleteDepartment:', error);
    throw error;
  }
};

/**
 * อัปเดตรายละเอียดข้อมูลภาควิชาตามรหัสภาควิชาที่ระบุ
 */
exports.updateDepartment = async (department_id, updateData) => {
  const result = await db.query(
    `UPDATE "${process.env.DB_SCHEMA}".departments 
     SET department_name_th = $1, department_name_en = $2, is_active = $3, faculty_id = $4 
     WHERE department_id = $5 
     RETURNING *`,
    [
      updateData.department_name_th,
      updateData.department_name_en,
      updateData.is_active,
      updateData.faculty_id,
      department_id,
    ],
  )
  return result.rows[0]
}

/**
 * ตรวจสอบสถานะการใช้งานของภาควิชา (เฉพาะรายการที่ Active เท่านั้น)
 */
exports.checkDepartmentById = async (department_id) => {
  const result = await db.query(
    `SELECT 1 FROM "${process.env.DB_SCHEMA}".departments 
     WHERE department_id = $1 AND is_active = true
     LIMIT 1`,
    [department_id],
  )
  return result.rowCount > 0
}
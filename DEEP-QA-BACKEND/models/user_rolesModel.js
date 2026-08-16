// models/user_rolesModel.js
const db = require('../config/db');

/**
 * บันทึกการกำหนดบทบาทและขอบเขตสิทธิ์ (Role & Scope) ให้กับผู้ใช้งาน
 */
exports.createUserRole = async ({ user_id, role_id, scope_id, assigned_by }) => {
  const result = await db.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".user_roles (
      user_id, role_id, scope_id, assigned_by
    ) VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [user_id, role_id, scope_id, assigned_by]
  );
  return result.rows[0];
};

/**
 * ดึงข้อมูลบทบาทล่าสุดที่ผู้ใช้งานได้รับมอบหมาย
 */
exports.getLatestUserRole = async (user_id) => {
  const result = await db.query(`
    SELECT role_id, scope_id
    FROM "${process.env.DB_SCHEMA}".user_roles
    WHERE user_id = $1
    ORDER BY assigned_at DESC
    LIMIT 1
  `, [user_id]);
  return result.rows[0];
};

/**
 * ดึงรายการบทบาททั้งหมดของผู้ใช้งาน โดยเรียงลำดับตามความสำคัญ (Priority)
 */
exports.getAllRolesByUserId = async (user_id) => {
  const result = await db.query(
    `SELECT ur.role_id, ur.scope_id
     FROM "${process.env.DB_SCHEMA}".user_roles ur
     JOIN "${process.env.DB_SCHEMA}".roles r ON ur.role_id = r.role_id
     WHERE ur.user_id = $1
     ORDER BY r.priority ASC`,
    [user_id]
  );
  return result.rows;
};

/**
 * ดึงข้อมูลความสัมพันธ์ระหว่างผู้ใช้งานและบทบาททั้งหมดที่มีในระบบ
 */
exports.getUserRoles = async (user_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".user_roles WHERE user_id = $1`,
    [user_id]
  );
  return result.rows;
};

/**
 * ลบบทบาทของผู้ใช้งานออกจากขอบเขตที่ระบุ
 */
exports.deleteUserRoleByUserIdAndScope = async (user_id, scope_id, role_id) => {
  try {
    const result = await db.query(
      `DELETE FROM "${process.env.DB_SCHEMA}".user_roles
       WHERE user_id = $1 AND scope_id = $2 AND role_id = $3
       RETURNING *`,
      [user_id, scope_id, role_id]
    );

    if (result.rows.length === 0) {
      return null; 
    }

    return result.rows[0]; 
  } catch (error) {
    throw error; 
  }
};

/**
 * ดึงข้อมูลบทบาทของผู้ใช้งานแบบระบุเจาะจงทั้งบทบาทและขอบเขต
 */
exports.getUserRole = async (user_id, role_id, scope_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".user_roles 
     WHERE user_id = $1 AND role_id = $2 AND scope_id = $3`,
    [user_id, role_id, scope_id]
  );
  return result.rows[0]; 
};


/**
 * ค้นหาข้อมูลอาจารย์ (Teacher) ภายใต้รหัสภาควิชาที่ระบุพร้อมข้อมูลสังกัด
 */
exports.findTeacher = async (scope_id) => {
  const query = `
    SELECT u.user_id,
           u.title_th,
           u.first_name_th,
           u.last_name_th,
           u.title_en,
           u.first_name_en,
           u.last_name_en,
           u.email,
           ur.scope_id AS department_id, -- ใช้ scope_id จาก user_roles แทน
           d.department_name_th,
           d.department_name_en,
           ur.role_id
    FROM "${process.env.DB_SCHEMA}".user_roles ur
    INNER JOIN "${process.env.DB_SCHEMA}".users u ON ur.user_id = u.user_id
    LEFT JOIN "${process.env.DB_SCHEMA}".departments d ON ur.scope_id = d.department_id
    WHERE ur.scope_id = $1
      AND ur.role_id = 'TEACHER'
      AND ur.is_active = true -- เช็คความ active จาก user_roles ด้วย
      AND u.status = 'active'
  `;
  const values = [scope_id];
  const { rows } = await db.query(query, values);
  return rows;
};

/**
 * ค้นหาลำดับชั้นของขอบเขตสิทธิ์ (Hierarchy) จากระดับล่างขึ้นบน (Program -> Department -> Faculty)
 */
exports.findScopeHierarchy = async (scope_id) => {
  const programRes = await db.query(
    `SELECT 
        p.program_id, 
        p.program_name_th,
        d.department_id, 
        d.department_name_th,
        f.faculty_id, 
        f.faculty_name_th
     FROM "${process.env.DB_SCHEMA}".programs p
     JOIN "${process.env.DB_SCHEMA}".departments d ON p.department_id = d.department_id
     JOIN "${process.env.DB_SCHEMA}".faculty f ON d.faculty_id = f.faculty_id
     WHERE p.program_id = $1`,
    [scope_id]
  );

  if (programRes.rows.length > 0) {
    return programRes.rows[0];
  }

  const deptRes = await db.query(
    `SELECT 
        NULL AS program_id, 
        NULL AS program_name_th,
        d.department_id, 
        d.department_name_th,
        f.faculty_id, 
        f.faculty_name_th
     FROM "${process.env.DB_SCHEMA}".departments d
     JOIN "${process.env.DB_SCHEMA}".faculty f ON d.faculty_id = f.faculty_id
     WHERE d.department_id = $1`,
    [scope_id]
  );

  if (deptRes.rows.length > 0) {
    return deptRes.rows[0];
  }

  const facRes = await db.query(
    `SELECT 
        NULL AS program_id, 
        NULL AS program_name_th,
        NULL AS department_id, 
        NULL AS department_name_th,
        f.faculty_id, 
        f.faculty_name_th
     FROM "${process.env.DB_SCHEMA}".faculty f
     WHERE f.faculty_id = $1`,
    [scope_id]
  );

  if (facRes.rows.length > 0) {
    return facRes.rows[0];
  }

  return null; 
};
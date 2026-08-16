const db = require('../config/db');

/**
 * สร้างบทบาท (Role) ใหม่ลงในฐานข้อมูลพร้อมกำหนดลำดับความสำคัญ (Priority)
 */
exports.createRole = async (roleId, roleName, priority) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".roles (role_id, role_name, priority)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [roleId, roleName, priority];
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * ดึงข้อมูลบทบาทโดยอ้างอิงจากรหัสบทบาท (role_id)
 */
exports.getRoleById = async (role_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".roles WHERE role_id = $1`,
    [role_id]
  );
  return result.rows[0];
};

/**
 * ดึงรายการบทบาททั้งหมดในระบบ โดยเรียงลำดับตามความสำคัญ (Priority) จากน้อยไปมาก
 */
exports.getAllRoles = async () => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".roles ORDER BY priority ASC`
  );
  return result.rows;
};

/**
 * ค้นหาข้อมูลบทบาทโดยอ้างอิงจากชื่อบทบาท (role_name)
 */
exports.getRoleByName = async (role_name) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".roles WHERE role_name = $1 LIMIT 1`,
    [role_name]
  );
  return result.rows[0];
};

/**
 * ดึงค่าลำดับความสำคัญ (Priority) ของบทบาทที่ระบุ เพื่อใช้ในการตรวจสอบสิทธิ์การจัดการข้อมูล
 */
exports.getRolePriority = async (roleId) => {
  const query = `
    SELECT priority
    FROM "${process.env.DB_SCHEMA}".roles
    WHERE role_id = $1;
  `;
  const values = [roleId];
  const result = await db.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].priority;
};
// models/facultyModel.js
const db = require('../config/db');

/**
 * ดึงข้อมูลคณะ (Faculty) โดยอ้างอิงจากอีเมลของผู้ใช้งานที่สังกัดอยู่
 */
exports.getFacultyByEmail = async (email) => {
  try {
    const result = await db.query(
      `SELECT f.* FROM "${process.env.DB_SCHEMA}".users u
       JOIN "${process.env.DB_SCHEMA}".faculty f ON u.faculty_id = f.faculty_id
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching faculty by email:', error);
    throw error;
  }
};

/**
 * ดึงข้อมูลคณะโดยอ้างอิงจากรหัสคณะ (faculty_id)
 */
exports.getFacultyById = async (faculty_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".faculty WHERE faculty_id = $1`,
    [faculty_id]
  );
  return result.rows[0];
};

/**
 * ดึงข้อมูลรายชื่อคณะทั้งหมดที่มีในระบบ โดยเรียงลำดับตามรหัสคณะ
 */
exports.getAllFaculties = async () => {
  try {
    const result = await db.query(
      `SELECT * FROM "${process.env.DB_SCHEMA}".faculty ORDER BY faculty_id`
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching all faculties:', error);
    throw error;
  }
};
// models/courseSectionModel.js
const db = require('../config/db');

/**
 * สร้างข้อมูลกลุ่มเรียน (Course Section) ใหม่ภายใต้รายวิชาในภาคการศึกษาที่ระบุ
 */
exports.createCourseSection = async ({ semester_course_id, section_number }) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".course_sections (semester_course_id, section_number)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const { rows } = await db.query(query, [semester_course_id, section_number]);
  return rows[0];
};

/**
 * กำหนดอาจารย์ผู้สอนให้กับกลุ่มเรียนที่ระบุ (Course Section Teacher)
 */
exports.createCourseSectionTeacher = async ({ semester_course_id, section_id, user_id }) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".course_sections_teacher (semester_course_id, section_id, user_id)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const { rows } = await db.query(query, [semester_course_id, section_id, user_id]);
  return rows[0];
};

/**
 * ดึงรหัสรายวิชาในภาคการศึกษา (semester_course_id) โดยอ้างอิงจากรหัสกลุ่มเรียน
 */
exports.getSemesterCourseIdBySectionId = async (section_id) => {
  const { rows } = await db.query(
    `SELECT semester_course_id FROM "${process.env.DB_SCHEMA}".course_sections WHERE section_id = $1`,
    [section_id]
  );
  if (!rows[0]) throw new Error(`Section with id ${section_id} not found`);
  return rows[0].semester_course_id;
};

/**
 * ค้นหาข้อมูลกลุ่มเรียนโดยอ้างอิงจากรหัสรายวิชาในภาคการศึกษาและหมายเลขกลุ่มเรียน
 */
exports.getSectionBySemesterAndNumber = async (semester_course_id, section_number) => {
  const { rows } = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".course_sections WHERE semester_course_id = $1 AND section_number = $2`,
    [semester_course_id, section_number]
  );
  return rows[0];
};

/**
 * ดึงรายการกลุ่มเรียนทั้งหมดภายใต้รายวิชาในภาคการศึกษาที่ระบุ เรียงตามหมายเลขกลุ่มเรียน
 */
exports.getSectionsBySemesterCourseId = async (semester_course_id) => {
  const query = `
    SELECT section_id, section_number
    FROM "${process.env.DB_SCHEMA}".course_sections
    WHERE semester_course_id = $1
    ORDER BY section_number ASC
  `;
  const { rows } = await db.query(query, [semester_course_id]);
  return rows;
};

/**
 * ดึงรหัสผู้ใช้งานของอาจารย์ทุกคนที่รับผิดชอบกลุ่มเรียนที่ระบุ
 */
exports.getTeachersBySectionId = async (section_id) => {
  const query = `
    SELECT user_id
    FROM "${process.env.DB_SCHEMA}".course_sections_teacher
    WHERE section_id = $1
  `;
  const { rows } = await db.query(query, [section_id]);
  return rows.map(r => r.user_id);
};

/**
 * ดึงข้อมูลกลุ่มเรียนพร้อมรายละเอียดข้อมูลติดต่อของอาจารย์ผู้สอนทุกคนในกลุ่มเรียนนั้นๆ
 */
exports.getSectionsWithTeachers = async (semester_course_id) => {
  const query = `
    SELECT 
      sec.section_id,
      sec.section_number,
      u.user_id,
      u.title_th,
      u.first_name_th,
      u.last_name_th,
      u.title_en,
      u.first_name_en,
      u.last_name_en,
      u.email
    FROM "${process.env.DB_SCHEMA}".course_sections sec
    LEFT JOIN "${process.env.DB_SCHEMA}".course_sections_teacher cst ON sec.section_id = cst.section_id
    LEFT JOIN "${process.env.DB_SCHEMA}".users u ON cst.user_id = u.user_id
    WHERE sec.semester_course_id = $1
    ORDER BY sec.section_number, u.user_id
  `;
  const { rows } = await db.query(query, [semester_course_id]);
  return rows;
};

/**
 * ลบข้อมูลกลุ่มเรียนออกจากระบบตามรหัสกลุ่มเรียนที่ระบุ
 */
exports.deleteSection = async (section_id) => {
  const query = `
    DELETE FROM "${process.env.DB_SCHEMA}".course_sections
    WHERE section_id = $1
    RETURNING *;
  `;
  const { rows } = await db.query(query, [section_id]);
  return rows[0];
};

/**
 * อัปเดตหมายเลขกลุ่มเรียน (Section Number) ใหม่ให้กับกลุ่มเรียนที่ระบุ
 */
exports.updateSectionNumber = async (section_id, new_section_number) => {
  const query = `
    UPDATE "${process.env.DB_SCHEMA}".course_sections
    SET section_number = $1, updated_at = CURRENT_TIMESTAMP
    WHERE section_id = $2
    RETURNING *;
  `;
  const { rows } = await db.query(query, [new_section_number, section_id]);
  return rows[0];
};

/**
 * ลบข้อมูลอาจารย์ผู้สอนทั้งหมดที่เชื่อมโยงกับกลุ่มเรียนที่ระบุ
 */
exports.deleteTeachersBySectionId = async (section_id) => {
  const query = `
    DELETE FROM "${process.env.DB_SCHEMA}".course_sections_teacher
    WHERE section_id = $1
  `;
  await db.query(query, [section_id]);
};

/**
 * เพิ่มอาจารย์ผู้สอนเข้าสู่กลุ่มเรียนที่ระบุ
 */
exports.addTeacherToSection = async ({ semester_course_id, section_id, user_id }) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".course_sections_teacher (semester_course_id, section_id, user_id)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const { rows } = await db.query(query, [semester_course_id, section_id, user_id]);
  return rows[0];
};
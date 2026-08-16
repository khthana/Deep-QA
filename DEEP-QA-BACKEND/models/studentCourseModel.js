const db = require('../config/db');

/**
 * เพิ่มนักศึกษาเข้าสู่กลุ่มเรียน (Section) โดยมีการตรวจสอบการมีอยู่ของนักศึกษา
 * และตรวจสอบการลงทะเบียนซ้ำซ้อนในกลุ่มเรียนเดียวกัน
 */
exports.addStudentToSection = async ({ student_id, section_id }) => {
  const studentRes = await db.query(
    `SELECT student_id FROM "${process.env.DB_SCHEMA}".student WHERE student_id = $1`,
    [student_id]
  );
  if (studentRes.rowCount === 0) throw new Error(`Student ${student_id} not found`);

  const existsRes = await db.query(
    `SELECT 1 FROM "${process.env.DB_SCHEMA}".student_course WHERE student_id = $1 AND section_id = $2`,
    [student_id, section_id]
  );
  if (existsRes.rowCount > 0) throw new Error(`Student ${student_id} already in section ${section_id}`);

  const insertRes = await db.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".student_course (student_id, section_id)
     VALUES ($1, $2)
     RETURNING *`,
    [student_id, section_id]
  );
  return insertRes.rows[0];
};

/**
 * ตรวจสอบสถานะว่านักศึกษาคนดังกล่าวได้ลงทะเบียนในกลุ่มเรียนที่ระบุแล้วหรือไม่
 */
exports.checkStudentInSection = async (student_id, section_id) => {
  const res = await db.query(
    `SELECT 1 FROM "${process.env.DB_SCHEMA}".student_course WHERE student_id = $1 AND section_id = $2`,
    [student_id, section_id]
  );
  return res.rowCount > 0;
};

/**
 * ตรวจสอบข้อมูลนักศึกษาในฐานข้อมูลโดยอ้างอิงจากรหัส ชื่อ และนามสกุล
 */
exports.checkStudentInDB = async (student_id, first_name, last_name) => {
  const res = await db.query(
    `SELECT 1 FROM "${process.env.DB_SCHEMA}".student 
     WHERE student_id = $1 AND first_name_th = $2 AND last_name_th = $3`,
    [student_id, first_name, last_name]
  );
  return res.rowCount > 0;
};

/**
 * ดึงรายชื่อนักศึกษาทั้งหมดที่ลงทะเบียนในกลุ่มเรียนที่ระบุ (ฉบับย่อ)
 */
exports.getStudentsInSection = async (section_id) => {
  const res = await db.query(
    `SELECT sc.student_id, s.first_name_th AS first_name, s.last_name_th AS last_name
     FROM "${process.env.DB_SCHEMA}".student_course sc
     LEFT JOIN "${process.env.DB_SCHEMA}".student s ON sc.student_id = s.student_id
     WHERE sc.section_id = $1
     ORDER BY sc.student_id`,
    [section_id]
  );
  return res.rows;
};

/**
 * ดึงรายละเอียดข้อมูลนักศึกษาในกลุ่มเรียน พร้อมข้อมูลหลักสูตรและคำนำหน้าชื่อ (ฉบับเต็ม)
 */
exports.getStudentsInSections = async (section_id) => {
  const query = `
    SELECT
      s.student_id,
      u.title_th,
      s.first_name_th,
      s.last_name_th,
      s.full_name_th,
      p.program_id,
      p.program_name_th AS program_name
    FROM "${process.env.DB_SCHEMA}".student_course sc
    JOIN "${process.env.DB_SCHEMA}".student s
      ON sc.student_id = s.student_id
    JOIN "${process.env.DB_SCHEMA}".users u
      ON s.student_id = u.user_id
    JOIN "${process.env.DB_SCHEMA}".course_sections cs
      ON sc.section_id = cs.section_id
    JOIN "${process.env.DB_SCHEMA}".semester_courses sm
      ON cs.semester_course_id = sm.id
    JOIN "${process.env.DB_SCHEMA}".programs p
      ON sm.program_id = p.program_id
    WHERE sc.section_id = $1
    ORDER BY s.student_id;
  `;

  const { rows } = await db.query(query, [section_id]);
  return rows;
};

/**
 * ดึงข้อมูลชื่อหลักสูตรที่สัมพันธ์กับกลุ่มเรียนที่ระบุ
 */
exports.getProgramNameBySection = async (section_id) => {
  const query = `
    SELECT 
      p.program_id,
      p.program_name_th,
      p.program_name_en
    FROM "${process.env.DB_SCHEMA}".course_sections cs
    JOIN "${process.env.DB_SCHEMA}".semester_courses sc
      ON cs.semester_course_id = sc.id
    JOIN "${process.env.DB_SCHEMA}".programs p
      ON sc.program_id = p.program_id
    WHERE cs.section_id = $1
    LIMIT 1;
  `;

  const { rows } = await db.query(query, [section_id]);
  return rows[0];
};

/**
 * ดึงข้อมูลกลุ่มกิจกรรมนักศึกษา (Student Groups) ที่นักศึกษาสังกัดอยู่ในกลุ่มเรียนที่ระบุ
 */
exports.getStudentGroups = async (student_id, section_id) => {
  const res = await db.query(
    `SELECT sg.group_id, sg.group_name
     FROM "${process.env.DB_SCHEMA}".student_group_member sgm
     JOIN "${process.env.DB_SCHEMA}".student_group sg
       ON sgm.group_id = sg.group_id
     WHERE sgm.student_id = $1
       AND sg.section_id = $2`,
    [student_id, section_id]
  );
  return res.rows;
};

/**
 * ลบข้อมูลการลงทะเบียนของนักศึกษาออกจากกลุ่มเรียนที่ระบุ
 */
exports.deleteStudentFromSection = async (student_id, section_id) => {
  const res = await db.query(
    `DELETE FROM "${process.env.DB_SCHEMA}".student_course
     WHERE student_id = $1 AND section_id = $2
     RETURNING *`,
    [student_id, section_id]
  );
  if (res.rowCount === 0) throw new Error(`Student ${student_id} not found in section ${section_id}`);
  return res.rows[0];
};
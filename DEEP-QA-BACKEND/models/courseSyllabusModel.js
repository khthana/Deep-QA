// models/courseSyllabusModel.js
const db = require('../config/db');

/**
 * ดำเนินการเพิ่มข้อมูลใหม่ (Insert) หรืออัปเดตข้อมูลเดิม (Update) ของกำหนดการเรียนการสอน (Course Syllabus) 
 * โดยตัดสินจากความมีอยู่ของ course_syllabus_id
 */
exports.upsertCourseSyllabus = async (data) => {
  const {
    course_syllabus_id,
    section_id,
    week_no,
    title,
    description,
    remark,
    created_by
  } = data;

  if (course_syllabus_id) {
    const query = `
      UPDATE "${process.env.DB_SCHEMA}".course_syllabus
      SET
        section_id = $1,
        week_no = $2,
        title = $3,
        description = $4,
        remark = $5
      WHERE id = $6
      RETURNING *;
    `;

    const values = [
      section_id,
      week_no,
      title,
      description,
      remark,
      course_syllabus_id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  const insertQuery = `
    INSERT INTO "${process.env.DB_SCHEMA}".course_syllabus
    (
      section_id,
      week_no,
      title,
      description,
      remark,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *;
  `;

  const values = [
    section_id,
    week_no,
    title,
    description,
    remark,
    created_by
  ];

  const result = await db.query(insertQuery, values);
  return result.rows[0];
};

/**
 * ดึงข้อมูลกำหนดการเรียนการสอนทั้งหมดรายสัปดาห์ตามรหัสกลุ่มเรียน (Section ID) 
 * พร้อมข้อมูลเชื่อมโยงจากภาคการศึกษาและรายวิชา
 */
exports.getCourseSyllabusBySectionId = async (section_id) => {
  const query = `
    SELECT
      cs.id AS course_syllabus_id,
      sm.academic_year AS year,
      sm.semester,
      sm.subject_id,
      cs.section_id,
      sec.section_number,
      cs.week_no,
      cs.title,
      cs.description,
      cs.remark,
      cs.created_by,
      cs.created_at,
      cs.updated_at
    FROM "${process.env.DB_SCHEMA}".course_syllabus cs
    JOIN "${process.env.DB_SCHEMA}".course_sections sec
      ON cs.section_id = sec.section_id
    JOIN "${process.env.DB_SCHEMA}".semester_courses sm
      ON sec.semester_course_id = sm.id
    WHERE cs.section_id = $1
    ORDER BY cs.week_no ASC;
  `;

  const result = await db.query(query, [section_id]);
  return result.rows;
};

/**
 * ลบข้อมูลกำหนดการเรียนการสอนรายสัปดาห์ออกจากระบบตามรหัส ID ที่ระบุ
 */
exports.deleteCourseSyllabusById = async (course_syllabus_id) => {
  const query = `
    DELETE FROM "${process.env.DB_SCHEMA}".course_syllabus
    WHERE id = $1
    RETURNING *;
  `;

  const result = await db.query(query, [course_syllabus_id]);
  return result.rows[0];
};
// models/semesterCoursesModel.js
const db = require('../config/db');

/**
 * สร้างบันทึกรายวิชาที่เปิดสอนในภาคการศึกษา (Semester Course) ใหม่
 */
exports.createSemesterCourse = async ({
  academic_year,
  semester,
  subject_id,
  program_id
}) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".semester_courses
      (academic_year, semester, subject_id, program_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const values = [academic_year, semester, subject_id, program_id];
  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * ดึงข้อมูลรายวิชาที่เปิดสอนในภาคการศึกษาจากรหัส ID
 */
exports.getSemesterCourseById = async (semester_course_id) => {
  const query = `
    SELECT *
    FROM "${process.env.DB_SCHEMA}".semester_courses
    WHERE id = $1
    LIMIT 1;
  `;
  const { rows } = await db.query(query, [semester_course_id]);
  return rows[0] || null;
};

/**
 * ดึงข้อมูลรายวิชาทั้งหมดตามปีการศึกษา ภาคการศึกษา และหลักสูตร พร้อมรายละเอียดชื่อวิชา
 */
exports.getCourseByYearTerm = async ({ academic_year, semester, program_id }) => {
  const query = `
    SELECT 
      sc.id AS semester_course_id,
      sc.academic_year,
      sc.semester,
      s.subject_id,
      s.subject_name_en,
      s.subject_name_th
    FROM "${process.env.DB_SCHEMA}".semester_courses sc
    JOIN "${process.env.DB_SCHEMA}".subjects s ON sc.subject_id = s.subject_id
    WHERE sc.academic_year = $1
      AND sc.semester = $2
      AND sc.program_id = $3
    ORDER BY s.subject_name_en
  `;

  const { rows } = await db.query(query, [academic_year, semester, program_id]);
  return rows;
};

/**
 * ลบข้อมูลรายวิชาที่เปิดสอนในภาคการศึกษาตามรหัส ID
 */
exports.deleteSemesterCourse = async (semester_course_id) => {
  const { rows } = await db.query(
    `DELETE FROM "${process.env.DB_SCHEMA}".semester_courses
     WHERE id = $1
     RETURNING *`,
    [semester_course_id]
  );

  return rows[0];
};

/**
 * ดึงรายการรายวิชาที่เปิดสอนทั้งหมดตามเงื่อนไขปีการศึกษา ภาคการศึกษา และหลักสูตร
 */
exports.getListSubjectInTermandYear = async (academic_year, semester, program_id) => {
  const { rows } = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".semester_courses 
     WHERE academic_year = $1 AND semester = $2 AND program_id = $3`,
    [academic_year, semester, program_id]
  );
  return rows;
};

/**
 * คัดลอกข้อมูลรายวิชาที่เปิดสอน กลุ่มเรียน และอาจารย์ผู้สอนจากปีการศึกษาเก่าไปยังปีการศึกษาใหม่
 */
exports.copySemesterCourses = async ({ academic_year_now, academic_year_old, semester }) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const oldCourses = await this.getOldCourses(client, academic_year_old, semester);
    if (oldCourses.length === 0) throw new Error("No courses found to copy");

    const existingSet = await this.getExistingCourses(client, academic_year_now);

    let copiedCourses = 0;
    let copiedSections = 0;
    let copiedTeachers = 0;

    for (const oldCourse of oldCourses) {
      const newSemester = semester !== null ? semester : oldCourse.semester;
      const key = `${oldCourse.subject_id}_${newSemester}`;

      if (existingSet.has(key)) continue;

      const newCourse = await this.insertSemesterCourse(client, academic_year_now, newSemester, oldCourse);
      copiedCourses++;

      const oldSections = await this.getSectionsByCourse(client, oldCourse.id);
      for (const oldSec of oldSections) {
        const newSec = await this.insertSection(client, newCourse.id, oldSec);
        copiedSections++;

        const oldTeachers = await this.getTeachersBySection(client, oldSec.section_id);
        for (const oldT of oldTeachers) {
          await this.insertTeacher(client, newCourse.id, newSec.section_id, oldT);
          copiedTeachers++;
        }
      }
    }

    await client.query("COMMIT");
    return { copiedCourses, copiedSections, copiedTeachers };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * ดึงข้อมูลรายวิชาจากปีการศึกษาเก่าเพื่อเตรียมการคัดลอก
 */
exports.getOldCourses = async (client, academic_year_old, semester) => {
  let query = `SELECT * FROM "${process.env.DB_SCHEMA}".semester_courses WHERE academic_year = $1`;
  const params = [academic_year_old];
  if (semester !== null) {
    query += " AND semester = $2";
    params.push(semester);
  }
  const { rows } = await client.query(query, params);
  return rows;
};

/**
 * ตรวจสอบรายวิชาที่มีอยู่แล้วในปีการศึกษาใหม่เพื่อป้องกันการคัดลอกซ้ำ
 */
exports.getExistingCourses = async (client, academic_year_now) => {
  const { rows } = await client.query(
    `SELECT subject_id, semester FROM "${process.env.DB_SCHEMA}".semester_courses WHERE academic_year = $1`,
    [academic_year_now]
  );
  return new Set(rows.map(r => `${r.subject_id}_${r.semester}`));
};

/**
 * บันทึกข้อมูลรายวิชาใหม่เข้าสู่ตาราง semester_courses ในระหว่างการคัดลอก
 */
exports.insertSemesterCourse = async (client, academic_year_now, semester, oldCourse) => {
  const { rows } = await client.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".semester_courses (academic_year, semester, subject_id, program_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [academic_year_now, semester, oldCourse.subject_id, oldCourse.program_id]
  );
  return rows[0];
};

/**
 * ดึงข้อมูลกลุ่มเรียน (Sections) ที่สัมพันธ์กับรายวิชาในเทอมนั้นๆ
 */
exports.getSectionsByCourse = async (client, semester_course_id) => {
  const { rows } = await client.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".course_sections WHERE semester_course_id = $1`,
    [semester_course_id]
  );
  return rows;
};

/**
 * บันทึกข้อมูลกลุ่มเรียนใหม่ในระหว่างการคัดลอกข้อมูล
 */
exports.insertSection = async (client, newCourseId, oldSection) => {
  const { rows } = await client.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".course_sections (semester_course_id, section_number)
     VALUES ($1, $2) RETURNING *`,
    [newCourseId, oldSection.section_number]
  );
  return rows[0];
};

/**
 * ดึงข้อมูลอาจารย์ผู้สอนที่รับผิดชอบในกลุ่มเรียนที่ระบุ
 */
exports.getTeachersBySection = async (client, section_id) => {
  const { rows } = await client.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".course_sections_teacher WHERE section_id = $1`,
    [section_id]
  );
  return rows;
};

/**
 * บันทึกข้อมูลอาจารย์ผู้สอนเข้าสู่กลุ่มเรียนใหม่ในระหว่างการคัดลอกข้อมูล
 */
exports.insertTeacher = async (client, newCourseId, newSectionId, oldTeacher) => {
  const { rows } = await client.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".course_sections_teacher (semester_course_id, section_id, user_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [newCourseId, newSectionId, oldTeacher.user_id]
  );
  return rows[0];
};
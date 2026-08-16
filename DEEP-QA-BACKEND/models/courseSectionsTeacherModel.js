const db = require('../config/db')

/**
 * ดึงข้อมูลรายวิชาและกลุ่มเรียน (Sections) ที่อาจารย์รับผิดชอบ 
 * โดยรวบรวมข้อมูลกลุ่มเรียนให้อยู่ในรูปแบบ JSON Array (JSON_AGG) ตามปีการศึกษาและภาคการศึกษาที่ระบุ
 */
exports.getTeacherCourse = async (user_id, academic_year, semester) => {
  const query = `
    SELECT 
      sc.academic_year,
      sc.semester,
      sub.subject_id,
      sub.subject_name_th,
      sub.subject_name_en,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'section_number', sec.section_number,
          'section_id', sec.section_id
        )
        ORDER BY sec.section_number
      ) AS sections
    FROM "${process.env.DB_SCHEMA}".course_sections_teacher cst
    JOIN "${process.env.DB_SCHEMA}".course_sections sec 
      ON cst.section_id = sec.section_id
    JOIN "${process.env.DB_SCHEMA}".semester_courses sc 
      ON sec.semester_course_id = sc.id
    JOIN "${process.env.DB_SCHEMA}".subjects sub 
      ON sc.subject_id = sub.subject_id
    WHERE cst.user_id = $1
      AND sc.academic_year = $2
      AND ($3 = 'all' OR sc.semester = $3::int)
    GROUP BY sc.academic_year, sc.semester, sub.subject_id, sub.subject_name_th, sub.subject_name_en
    ORDER BY sc.academic_year DESC, sc.semester DESC, sub.subject_id;
  `

  const { rows } = await db.query(query, [user_id, academic_year, semester])
  return rows
}
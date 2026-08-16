const db = require('../config/db');

/**
 * ดึงข้อมูลความสัมพันธ์ระหว่างกลุ่มเรียน, รายวิชา, ผลลัพธ์การเรียนรู้ (CLO) 
 * และกิจกรรมการประเมิน (Activities) พร้อมค่าน้ำหนักการวัดผลตามรหัสกลุ่มเรียนที่ระบุ
 */
exports.getRelationBySection = async (section_id) => {
  const sql = `
    SELECT
      cs.section_id,
      sc.subject_id,
      s.subject_name_en AS subject_name,
      sc.semester,
      sc.academic_year AS year,

      clo.clo_id,
      clo.clo_number,
      clo.clo_detail,

      a.id AS activity_id,
      a.activity_name,
      acm.weight

    FROM "${process.env.DB_SCHEMA}".course_sections cs
    JOIN "${process.env.DB_SCHEMA}".semester_courses sc
      ON sc.id = cs.semester_course_id
    JOIN "${process.env.DB_SCHEMA}".subjects s
      ON s.subject_id = sc.subject_id

    JOIN "${process.env.DB_SCHEMA}".subject_clo clo
      ON clo.section_id = cs.section_id

    LEFT JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm
      ON acm.clo_id = clo.clo_id

    LEFT JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = acm.activity_id
     AND a.section_id = cs.section_id

    WHERE cs.section_id = $1
    ORDER BY clo.clo_number, a.id;
  `;

  const { rows } = await db.query(sql, [section_id]);
  return rows;
};
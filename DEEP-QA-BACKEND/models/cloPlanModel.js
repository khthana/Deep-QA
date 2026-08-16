// models/cloPlanModel.js
const db = require("../config/db");

/**
 * สร้างรอบประเมิน CLO (Course Cycle) โดยอ้างอิงข้อมูลพื้นฐานจากรหัสรายวิชาในภาคการศึกษา
 * หากมีข้อมูลอยู่แล้วจะทำการอัปเดตเวลาที่สร้างแทน (Upsert)
 */
exports.createCycle = async (semesterCourseId) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".clo_course_cycle_cloplan (subject_id, program_id, academic_year)
    SELECT subject_id, program_id, academic_year
    FROM "${process.env.DB_SCHEMA}".semester_courses
    WHERE id = $1
    ON CONFLICT (subject_id, program_id, academic_year) 
    DO UPDATE SET created_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  
  const { rows } = await db.query(query, [semesterCourseId]);
  return rows[0];
};

/**
 * บันทึกหรืออัปเดตข้อมูลรายละเอียดแผนการพัฒนา CLO (Detail) เช่น ปัญหาที่พบ หรือแผนการปรับปรุง
 * โดยใช้ Conflict Clause เพื่อจัดการกรณีที่มีข้อมูลซ้ำในระดับ CLO และประเภทของรายละเอียด
 */
exports.upsertDetail = async ({
  planId,
  cloId,
  detailType,
  detailText,
  referenceAcademicYear = null
}) => {
  const query = `
    INSERT INTO "${process.env.DB_SCHEMA}".clo_course_cycle_detail_cloplan
      (clo_course_cycle_id, clo_id, detail_type, detail_text, reference_academic_year)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (clo_course_cycle_id, clo_id, detail_type)
    DO UPDATE SET
      detail_text = EXCLUDED.detail_text,
      reference_academic_year = EXCLUDED.reference_academic_year,
      created_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  const values = [planId, cloId, detailType, detailText, referenceAcademicYear];

  const { rows } = await db.query(query, values);
  return rows[0];
};

/**
 * ดึงข้อมูล Metadata พื้นฐาน (Subject, Program, Year) โดยย้อนกลับจากรหัสกลุ่มเรียน (Section ID)
 */
exports.getMetadataBySectionId = async (section_id) => {
  const query = `
    SELECT sc.subject_id, sc.program_id, sc.academic_year, cs.semester_course_id
    FROM "${process.env.DB_SCHEMA}".course_sections cs
    JOIN "${process.env.DB_SCHEMA}".semester_courses sc ON cs.semester_course_id = sc.id
    WHERE cs.section_id = $1 LIMIT 1;
  `;
  const { rows } = await db.query(query, [section_id]);
  return rows[0];
};

/**
 * ดึงข้อมูล CLO Plan ในระดับ Global (ทั้งวิชาและหลักสูตร) 
 * พร้อมดึงข้อมูลแผนการปรับปรุง (NEXT_PLAN) จากปีการศึกษาก่อนหน้ามาเพื่อเป็นแนวทาง
 */
exports.getGlobalByMetadata = async (subject_id, program_id, academic_year) => {
  const prevYear = (parseInt(academic_year) - 1).toString();
  
  const query = `
    SELECT 
      ccc.clo_course_cycle_id, 
      ccc.subject_id, 
      ccc.academic_year, 
      ccc.program_id,
      s_clo.clo_id, 
      s_clo.clo_number,
      d.clo_course_cycle_detail_id, 
      d.detail_type, 
      d.detail_text, 
      d.reference_academic_year,
      prev_d.detail_text AS prev_next_plan_detail
    FROM "${process.env.DB_SCHEMA}".clo_course_cycle_cloplan ccc
    LEFT JOIN "${process.env.DB_SCHEMA}".semester_courses sc 
      ON sc.subject_id = ccc.subject_id AND sc.program_id = ccc.program_id
    LEFT JOIN "${process.env.DB_SCHEMA}".subject_clo s_clo 
      ON s_clo.section_id IN (
        SELECT section_id FROM "${process.env.DB_SCHEMA}".course_sections WHERE semester_course_id = sc.id
      )
    LEFT JOIN "${process.env.DB_SCHEMA}".clo_course_cycle_detail_cloplan d 
      ON d.clo_course_cycle_id = ccc.clo_course_cycle_id AND d.clo_id = s_clo.clo_id
    
    LEFT JOIN "${process.env.DB_SCHEMA}".clo_course_cycle_cloplan prev_ccc
      ON prev_ccc.subject_id = ccc.subject_id 
      AND prev_ccc.program_id = ccc.program_id 
      AND prev_ccc.academic_year = $4
    LEFT JOIN "${process.env.DB_SCHEMA}".clo_course_cycle_detail_cloplan prev_d
      ON prev_d.clo_course_cycle_id = prev_ccc.clo_course_cycle_id 
      AND prev_d.clo_id = s_clo.clo_id
      AND prev_d.detail_type = 'NEXT_PLAN'

    WHERE ccc.subject_id = $1 AND ccc.program_id = $2 AND ccc.academic_year = $3
    ORDER BY s_clo.clo_number ASC;
  `;
  
  const { rows } = await db.query(query, [subject_id, program_id, academic_year, prevYear]);
  return rows;
};

/**
 * ดึงข้อมูล CLO Plan โดยระบุเฉพาะกลุ่มเรียน (Section Specific) 
 * เพื่อแสดงข้อมูลรายละเอียดที่เกี่ยวข้องกับกลุ่มเรียนนั้นๆ โดยตรง
 */
exports.getBySectionSpecific = async (subject_id, program_id, academic_year, section_id) => {
  const prevYear = (parseInt(academic_year) - 1).toString();

  const query = `
    SELECT 
      ccc.clo_course_cycle_id, ccc.subject_id, ccc.academic_year, ccc.program_id,
      s_clo.clo_id, s_clo.clo_number,
      d.clo_course_cycle_detail_id, d.detail_type, d.detail_text, d.reference_academic_year,
      prev_d.detail_text AS prev_next_plan_detail
    FROM "${process.env.DB_SCHEMA}".clo_course_cycle_cloplan ccc
    INNER JOIN "${process.env.DB_SCHEMA}".subject_clo s_clo ON s_clo.section_id = $4
    LEFT JOIN "${process.env.DB_SCHEMA}".clo_course_cycle_detail_cloplan d 
      ON d.clo_course_cycle_id = ccc.clo_course_cycle_id AND d.clo_id = s_clo.clo_id
    
    LEFT JOIN "${process.env.DB_SCHEMA}".clo_course_cycle_cloplan prev_ccc
      ON prev_ccc.subject_id = ccc.subject_id 
      AND prev_ccc.program_id = ccc.program_id 
      AND prev_ccc.academic_year = $5
    LEFT JOIN "${process.env.DB_SCHEMA}".clo_course_cycle_detail_cloplan prev_d
      ON prev_d.clo_course_cycle_id = prev_ccc.clo_course_cycle_id 
      AND prev_d.clo_id = s_clo.clo_id
      AND prev_d.detail_type = 'NEXT_PLAN'

    WHERE ccc.subject_id = $1 AND ccc.program_id = $2 AND ccc.academic_year = $3
    ORDER BY s_clo.clo_number ASC;
  `;
  
  const { rows } = await db.query(query, [subject_id, program_id, academic_year, section_id, prevYear]);
  return rows;
};

/**
 * ลบข้อมูลรายละเอียดแผนงาน (Detail) รายรายการตามรหัส ID
 */
exports.deleteDetail = async (planDetailId) => {
  const query = `
    DELETE FROM "${process.env.DB_SCHEMA}".clo_course_cycle_detail_cloplan
    WHERE clo_course_cycle_detail_id = $1
    RETURNING *;
  `;
  const { rows } = await db.query(query, [planDetailId]);
  return rows[0];
};
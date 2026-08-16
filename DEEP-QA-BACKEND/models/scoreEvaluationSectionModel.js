// models/scoreEvaluationSectionModel.js
const db = require('../config/db');

/**
 * ดึงข้อมูลคะแนนดิบราย CLO ของนักศึกษาแต่ละคน โดยเชื่อมโยงข้อมูลจากโครงสร้าง CLO, 
 * การแมปกิจกรรม (Mapping) และคะแนนที่นักศึกษาได้รับจริง
 */
// exports.getStudentCloRaw = async (sectionId, studentId) => {
//   const { rows } = await db.query(
//     `
//     SELECT
//       sc.clo_id,
//       sc.clo_number,
//       sc.clo_detail,       
//       acm.score AS full_score,
//       acm.weight,
//       s.score AS student_score
//     FROM "${process.env.DB_SCHEMA}".subject_clo sc
//     JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm
//       ON acm.clo_id = sc.clo_id
//     JOIN "${process.env.DB_SCHEMA}".activities a
//       ON a.id = acm.activity_id
//      AND a.section_id = sc.section_id
//     LEFT JOIN "${process.env.DB_SCHEMA}".activity_scores s
//       ON s.activity_id = acm.activity_id
//      AND s.student_id = $2
//      AND s.clo_id::integer = sc.clo_id
//     WHERE sc.section_id = $1
//     ORDER BY sc.clo_number
//     `,
//     [sectionId, studentId]
//   );
//   return rows;
// };
exports.getStudentCloRaw = async (sectionId, studentId) => {
  const { rows } = await db.query(
    `
    SELECT
      sc.clo_id,
      sc.clo_number,
      sc.clo_detail,       
      COALESCE(acm.score, 0) AS full_score,
      COALESCE(acm.weight, 0) AS weight,
      s.score AS student_score
    FROM "${process.env.DB_SCHEMA}".subject_clo sc
    -- ใช้ LEFT JOIN ไปยังกิจกรรมที่แมปไว้ เพื่อให้ได้ CLO ครบทุกตัวแม้ไม่มีกิจกรรม
    LEFT JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm
      ON acm.clo_id = sc.clo_id
    LEFT JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = acm.activity_id
      AND a.section_id = sc.section_id
    -- เชื่อมคะแนนนักศึกษา
    LEFT JOIN "${process.env.DB_SCHEMA}".activity_scores s
      ON s.activity_id = acm.activity_id
      AND s.student_id = $2
      AND s.clo_id::integer = sc.clo_id
    WHERE sc.section_id = $1
    ORDER BY sc.clo_number::integer, sc.clo_id
    `,
    [sectionId, studentId]
  );
  return rows;
};

/**
 * ดึงค่าเฉลี่ยคะแนนดิบราย CLO ของทั้งกลุ่มเรียน (Section) เพื่อใช้ในการประเมินภาพรวมของกลุ่ม
 */
exports.getSectionAverageRaw = async (sectionId) => {
  const { rows } = await db.query(
    `
    SELECT
      sc.clo_id,
      sc.clo_number,
      sc.clo_detail,
      acm.score AS full_score,
      AVG(s.score) AS avg_student_score
    FROM "${process.env.DB_SCHEMA}".subject_clo sc
    JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm ON acm.clo_id = sc.clo_id
    JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.id = acm.activity_id AND a.section_id = sc.section_id
    LEFT JOIN "${process.env.DB_SCHEMA}".activity_scores s
      ON s.activity_id = acm.activity_id
     AND s.clo_id::integer = sc.clo_id
    WHERE sc.section_id = $1
    GROUP BY sc.clo_id, sc.clo_number, acm.score
    ORDER BY sc.clo_number
    `,
    [sectionId]
  );
  return rows;
};
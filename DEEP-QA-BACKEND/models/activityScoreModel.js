const db = require('../config/db');

/**
 * ตรวจสอบว่านักศึกษามีรายชื่ออยู่ในกลุ่มเรียน (Section) ที่ระบุหรือไม่
 */
exports.checkStudentInSection = async (student_id, section_id) => {
  const q = `
    SELECT 1 FROM "${process.env.DB_SCHEMA}".student_course
    WHERE student_id = $1 AND section_id = $2
  `;
  const { rowCount } = await db.query(q, [student_id, section_id]);
  return rowCount > 0;
};

/**
 * ดึงรหัสนักศึกษาทั้งหมดในกลุ่มเรียน (Section) ที่ระบุ
 */
exports.getAllStudentInSection = async (section_id) => {
  const q = `
    SELECT student_id FROM "${process.env.DB_SCHEMA}".student_course
    WHERE section_id = $1
  `;
  const { rows } = await db.query(q, [section_id]);
  return rows.map(r => r.student_id);
};



/**
 * ดึงข้อมูลชื่อและนามสกุลของนักศึกษา
 */
exports.getStudentInfo = async (student_id) => {
  const q = `
    SELECT
    u.title_th, 
    s.first_name_th AS first_name, 
    s.last_name_th AS last_name
    FROM "${process.env.DB_SCHEMA}".student s
    JOIN "${process.env.DB_SCHEMA}".users u ON s.student_id = u.user_id
    WHERE student_id = $1
  `;
  const { rows } = await db.query(q, [student_id]);
  return rows[0];
};

/**
 * ดึงรหัสกลุ่มทั้งหมดภายในกลุ่มเรียน (Section)
 */
exports.getAllGroupsInSection = async (section_id) => {
  const q = `
    SELECT group_id FROM "${process.env.DB_SCHEMA}".student_group
    WHERE section_id = $1
  `;
  const { rows } = await db.query(q, [section_id]);
  return rows.map(r => r.group_id);
};

/**
 * ดึงข้อมูลชื่อกลุ่มนักศึกษา
 */
exports.getGroupInfo = async (group_id) => {
  const q = `
    SELECT group_name FROM "${process.env.DB_SCHEMA}".student_group
    WHERE group_id = $1
  `;
  const { rows } = await db.query(q, [group_id]);
  return rows[0];
};

/**
 * ดึงรหัสนักศึกษาที่เป็นสมาชิกภายในกลุ่มที่ระบุ
 */
exports.getStudentIngroup = async (group_id) => {
  const q = `
    SELECT student_id FROM "${process.env.DB_SCHEMA}".student_group_member
    WHERE group_id = $1
  `;
  const { rows } = await db.query(q, [group_id]);
  return rows.map(r => r.student_id);
};

/**
 * ดึงค่าน้ำหนักคะแนน CLO สำหรับกิจกรรมที่ระบุ
 */
exports.getWeightScoreCLO = async (activity_id) => {
  const q = `
    SELECT acm.clo_id, sc.clo_number, acm.weight
    FROM "${process.env.DB_SCHEMA}".activity_clo_mapping acm
    JOIN "${process.env.DB_SCHEMA}".subject_clo sc
      ON acm.clo_id = sc.clo_id
    WHERE acm.activity_id = $1
    ORDER BY acm.sequence_order
  `;
  const { rows } = await db.query(q, [activity_id]);
  return rows;
};

/**
 * บันทึกหรืออัปเดตคะแนนกิจกรรมรายบุคคลตาม CLO (Upsert)
 */
exports.upsertActivityScore = async (student_id, activity_id, clo_id, score) => {
  const q = `
    INSERT INTO "${process.env.DB_SCHEMA}".activity_scores
      (student_id, activity_id, clo_id, score)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (student_id, activity_id, clo_id)
    DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_TIMESTAMP
  `;
  await db.query(q, [student_id, activity_id, clo_id, score]);
};

/**
 * ดึงคะแนนกิจกรรมทั้งหมดของนักศึกษาแยกตามกิจกรรม
 */
exports.getActivityScoreByActivity = async (activity_id) => {
  const q = `
    SELECT student_id, clo_id, score
    FROM "${process.env.DB_SCHEMA}".activity_scores
    WHERE activity_id = $1
  `;
  const { rows } = await db.query(q, [activity_id]);
  return rows;
};

/**
 * ดึงคะแนนเต็ม (Max Score) ของกิจกรรม
 */
exports.getActivityMaxScore = async (activity_id) => {
  const q = `
    SELECT score_number
    FROM "${process.env.DB_SCHEMA}".activities
    WHERE id = $1
  `;
  const { rows } = await db.query(q, [activity_id]);
  return rows[0]?.score_number ?? 0;
};

/**
 * ดึงแผนผังคะแนนเต็มของ CLO ต่อกิจกรรม (Score Mapping)
 */
exports.getActivityCLOScoreMap = async (activity_id) => {
  const q = `
    SELECT
      acm.clo_id,
      acm.score
    FROM "${process.env.DB_SCHEMA}".activity_clo_mapping acm
    WHERE acm.activity_id = $1
  `;
  const { rows } = await db.query(q, [activity_id]);
  const map = {};
  rows.forEach(r => {
    map[String(r.clo_id)] = Number(r.score ?? 0);
  });
  return map;
};

/**
 * ค้นหา clo_id จากหมายเลข CLO และกลุ่มเรียน
 */
exports.getCloIdByCloNumberAndSection = async (clo_number, section_id) => {
  const q = `
    SELECT clo_id
    FROM "${process.env.DB_SCHEMA}".subject_clo
    WHERE clo_number = $1
      AND section_id = $2
  `;
  const { rows } = await db.query(q, [clo_number, section_id]);
  return rows[0]?.clo_id ?? null;
};

/**
 * ค้นหา group_id จากชื่อกลุ่มและกลุ่มเรียน
 */
exports.getGroupIdByNameAndSection = async (group_name, section_id) => {
  const q = `
    SELECT group_id
    FROM "${process.env.DB_SCHEMA}".student_group
    WHERE group_name = $1
      AND section_id = $2
  `;
  const { rows } = await db.query(q, [group_name, section_id]);
  return rows[0]?.group_id ?? null;
};

/**
 * ดึงคะแนนเฉลี่ยรายกลุ่ม แยกตามหมายเลข CLO ของกิจกรรมที่ระบุ
 */
exports.getGroupCloAverageScore = async (activity_id, section_id) => {
  const q = `
    SELECT
      sg.group_id,
      sg.group_name,
      sc.clo_number,
      AVG(acs.score) AS avg_score
    FROM "${process.env.DB_SCHEMA}".student_group sg
    JOIN "${process.env.DB_SCHEMA}".student_group_member sgm
      ON sg.group_id = sgm.group_id
    JOIN "${process.env.DB_SCHEMA}".activity_scores acs
      ON acs.student_id = sgm.student_id
     AND acs.activity_id = $1
    JOIN "${process.env.DB_SCHEMA}".subject_clo sc
      ON sc.clo_id = acs.clo_id
    WHERE sg.section_id = $2
    GROUP BY sg.group_id, sg.group_name, sc.clo_number
    ORDER BY sg.group_id, sc.clo_number
  `;
  const { rows } = await db.query(q, [activity_id, section_id]);
  return rows;
};

/**
 * ดึงคะแนนรายบุคคลแยกตามหมายเลข CLO ของกิจกรรมและกลุ่มเรียนที่ระบุ
 */
exports.getStudentCloScore = async (activity_id, section_id) => {
  const q = `
    SELECT
      s.student_id,
      s.first_name_th AS first_name,
      s.last_name_th AS last_name,
      sc.clo_number,
      COALESCE(acs.score, 0) AS score
    FROM "${process.env.DB_SCHEMA}".student_course scs
    JOIN "${process.env.DB_SCHEMA}".student s
      ON s.student_id = scs.student_id
    JOIN "${process.env.DB_SCHEMA}".activity_clo_mapping acm
      ON acm.activity_id = $1
    JOIN "${process.env.DB_SCHEMA}".subject_clo sc
      ON sc.clo_id = acm.clo_id
    LEFT JOIN "${process.env.DB_SCHEMA}".activity_scores acs
      ON acs.student_id = s.student_id
     AND acs.activity_id = $1
     AND acs.clo_id = sc.clo_id
    WHERE scs.section_id = $2
    ORDER BY s.student_id, sc.clo_number
  `;
  const { rows } = await db.query(q, [activity_id, section_id]);
  return rows;
};
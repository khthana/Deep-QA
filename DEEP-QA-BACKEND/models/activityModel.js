const db = require('../config/db');

/**
 * สร้างกิจกรรมใหม่ในกลุ่มเรียน (Section) ที่ระบุ
 */
exports.createActivityBySection = async (a) => {
  const result = await db.query(
    `
    INSERT INTO "${process.env.DB_SCHEMA}".activities
    (
      section_id,
      score_ratio_id,
      activity_type,
      activity_name,
      description,
      score_number
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
    `,
    [
      a.section_id,
      a.score_ratio_id,
      a.activity_type,
      a.activity_name,
      a.description,
      a.score
    ]
  );

  return result.rows[0];
};

/**
 * อัปเดตข้อมูลกิจกรรมพื้นฐานตามรหัสกิจกรรมที่ระบุ
 */
exports.updateActivity = async (a) => {
  const result = await db.query(
    `
    UPDATE "${process.env.DB_SCHEMA}".activities
    SET
      activity_type = $1,
      activity_name = $2,
      description = $3,
      score_number = $4,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
    `,
    [
      a.activity_type,
      a.activity_name,
      a.description,
      a.score,
      a.activity_id
    ]
  );

  return result.rows[0];
};

/**
 * ดึงข้อมูลกิจกรรมรายรายการด้วย ID
 */
exports.getActivityById = async (activity_id) => {
  const result = await db.query(
    `SELECT * FROM "${process.env.DB_SCHEMA}".activities WHERE id = $1`,
    [activity_id]
  );
  return result.rows[0];
};

/**
 * ดึงรายการกิจกรรมทั้งหมดในกลุ่มเรียน พร้อมข้อมูลค่าน้ำหนักจากเกณฑ์การให้คะแนน (Score Ratio)
 */
exports.getActivitiesBySectionId = async (section_id) => {
  const result = await db.query(
    `
    SELECT
      a.*,
      ssr.score_category,
      ssr.weight
    FROM "${process.env.DB_SCHEMA}".activities a
    LEFT JOIN "${process.env.DB_SCHEMA}".subject_score_ratio ssr
      ON a.score_ratio_id = ssr.score_ratio_id
    WHERE a.section_id = $1
    ORDER BY a.created_at
    `,
    [section_id]
  );
  return result.rows;
};

/**
 * ดึงข้อมูลเกณฑ์การให้คะแนนพร้อมรายการกิจกรรมที่สังกัดอยู่ในกลุ่มเรียนนั้นๆ
 */
exports.getScoreRatioWithActivitiesBySectionId = async (section_id) => {
  const result = await db.query(
    `
    SELECT
      ssr.score_ratio_id,
      ssr.score_category,
      ssr.weight AS score_ratio_weight,

      a.id AS activity_id,
      a.activity_type,
      a.activity_name,
      a.description,
      a.score_number,
      a.created_at,
      a.updated_at,
      a.detail

    FROM "${process.env.DB_SCHEMA}".subject_score_ratio ssr
    LEFT JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.score_ratio_id = ssr.score_ratio_id
     AND a.section_id = ssr.section_id

    WHERE ssr.section_id = $1
    ORDER BY ssr.sequence_order, a.created_at
    `,
    [section_id]
  );

  return result.rows;
};

/**
 * ลบข้อมูลกิจกรรมออกจากฐานข้อมูล
 */
exports.deleteActivity = async (activity_id) => {
  await db.query(
    `DELETE FROM "${process.env.DB_SCHEMA}".activities WHERE id = $1`,
    [activity_id]
  );
  return { activity_id };
};

/**
 * จัดการข้อมูลการแมปกิจกรรมกับ CLO (Upsert) โดยรองรับการลบข้อมูลเดิมที่ไม่อยู่ในรายการใหม่ 
 * และการสร้างหรืออัปเดตข้อมูลที่มีอยู่ ภายใต้ Database Transaction
 */
exports.upsertActivityCloMapping = async (
  activity_id,
  score_ratio_id,
  cloArray
) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const dbRows = await client.query(
      `SELECT id FROM "${process.env.DB_SCHEMA}".activity_clo_mapping WHERE activity_id=$1`,
      [activity_id]
    );

    const dbIds = dbRows.rows.map(r => r.id);
    const incomingIds = cloArray
      .filter(c => c.activity_clo_map_id)
      .map(c => c.activity_clo_map_id);

    const deleteIds = dbIds.filter(id => !incomingIds.includes(id));
    if (deleteIds.length > 0) {
      await client.query(
        `DELETE FROM "${process.env.DB_SCHEMA}".activity_clo_mapping WHERE id = ANY($1::int[])`,
        [deleteIds]
      );
    }

    const processed = [];

    for (const c of cloArray) {
      if (c.activity_clo_map_id) {
        const r = await client.query(
          `
          UPDATE "${process.env.DB_SCHEMA}".activity_clo_mapping
          SET
            sequence_order = $1,
            clo_id = $2,
            weight = $3,
            score = $4,
            detail = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
          RETURNING *
          `,
          [
            c.sequence_order,
            c.clo_id,
            c.weight,
            c.score ?? 0,
            c.detail ?? null,
            c.activity_clo_map_id
          ]
        );
        processed.push(r.rows[0]);
      } else {
        const r = await client.query(
          `
            INSERT INTO "${process.env.DB_SCHEMA}".activity_clo_mapping
            (
              activity_id,
              sequence_order,
              clo_id,
              weight,
              score,
              detail,
              score_ratio_id,
              created_at,
              updated_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
            RETURNING *
          `,
            [
              activity_id,
              c.sequence_order,
              c.clo_id,
              c.weight,
              c.score ?? 0,
              c.detail ?? null,
              score_ratio_id
            ]
        );
        processed.push(r.rows[0]);
      }
    }

    await client.query('COMMIT');
    return processed;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * ดึงข้อมูลการแมปกิจกรรมกับ CLO พร้อมรายละเอียดข้อมูลรายวิชาและ PLO ที่เกี่ยวข้อง
 */
exports.getActivityCloMappingsWithDetail = async (activity_id) => {
  const sql = `
    SELECT
      acm.id AS activity_clo_map_id,
      acm.activity_id,
      acm.sequence_order,
      acm.weight,
      acm.score,
      acm.detail,
      acm.score_ratio_id,

      sc.clo_id,
      sc.clo_number,
      sc.clo_detail,
      sc.teaching_method,
      sc.assessment_method,

      CASE
        WHEN lo.outcome_id IS NOT NULL THEN
          jsonb_build_array(
            jsonb_build_object(
              'plo_id', lo.outcome_id,
              'outcome_code', lo.outcome_code,
              'outcome_title', lo.outcome_title
            )
          )
        ELSE '[]'::jsonb
      END AS plo_list

    FROM "${process.env.DB_SCHEMA}".activity_clo_mapping acm
    LEFT JOIN "${process.env.DB_SCHEMA}".subject_clo sc
      ON acm.clo_id = sc.clo_id
    LEFT JOIN "${process.env.DB_SCHEMA}".learning_outcomes lo
      ON sc.plo_id = lo.outcome_id
    WHERE acm.activity_id = $1
    ORDER BY acm.sequence_order
  `;

  const { rows } = await db.query(sql, [activity_id]);
  return rows;
};

/**
 * ดึงข้อมูลรายละเอียดของ CLO ตามรายการ ID ที่กำหนด
 */
exports.getClosByIds = async (cloIds) => {
  const sql = `
    SELECT 
      clo_id,
      clo_number,
      clo_detail,
      plo_list,
      teaching_method,
      assessment_method
    FROM "${process.env.DB_SCHEMA}".subject_clo
    WHERE clo_id = ANY($1::int[])
    ORDER BY clo_id
  `;
  const { rows } = await db.query(sql, [cloIds]);
  return rows;
};

/**
 * คำนวณคะแนนรวมของกิจกรรมใหม่โดยพิจารณาจากผลรวมคะแนนในส่วนของ CLO Mapping
 */
exports.recalculateActivityScore = async (activity_id, client = db) => {
  // 1. ปรับตรง SUM ให้ขยับเป็นเลขจำนวนเต็ม หรือใช้ ROUND
  const r = await client.query(
    `
    SELECT COALESCE(SUM(score), 0)::numeric AS total_score
    FROM "${process.env.DB_SCHEMA}".activity_clo_mapping
    WHERE activity_id = $1
    `,
    [activity_id]
  );

  // 2. ใช้ Math.round หรือ parseInt ใน JS เพื่อความชัวร์ก่อนส่งกลับไป Update
  const totalScore = Number(parseFloat(r.rows[0].total_score).toFixed(2));

  await client.query(
    `
    UPDATE "${process.env.DB_SCHEMA}".activities
    SET
      score_number = $1, 
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    `,
    [totalScore, activity_id] // totalScore ตอนนี้เป็น Integer แล้ว
  );

  return totalScore;
};

/**
 * ดึงข้อมูลกิจกรรมทั้งหมดที่สัมพันธ์กับรหัสรายวิชาและหลักสูตรที่ระบุ
 */
exports.getActivityFromSubjectAndProgram = async (subject_id, program_id) => {
  const query = `
    SELECT 
      a.id AS activity_id,
      a.activity_type,
      a.activity_name,
      a.description,
      a.section_id,
      cs.section_number,
      sc.academic_year,
      sc.subject_id,
      sc.program_id
    FROM "${process.env.DB_SCHEMA}".semester_courses sc
    JOIN "${process.env.DB_SCHEMA}".course_sections cs
      ON cs.semester_course_id = sc.id
    JOIN "${process.env.DB_SCHEMA}".activities a
      ON a.section_id = cs.section_id
    WHERE sc.subject_id = $1
      AND sc.program_id = $2
    ORDER BY sc.academic_year DESC, cs.section_number, a.id;
  `;

  const { rows } = await db.query(query, [subject_id, program_id]);
  return rows;
};
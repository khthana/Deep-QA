const db = require('../config/db');

/**
 * ซิงค์ข้อมูลสัดส่วนคะแนนของรายวิชา (Subject Score Ratio) 
 * รองรับการสร้างใหม่ (Insert), อัปเดต (Update) และลบรายการที่ไม่มีในข้อมูลล่าสุด (Delete) ภายใต้ Transaction เดียวกัน
 */
exports.syncSubjectScoreRatio = async ({ section_id, subject_score }) => {

  const categories = subject_score.map(i => i.score_category);
  if (categories.length !== new Set(categories).size) {
    throw new Error('มี score_category ซ้ำกัน');
  }

  const totalWeight = subject_score.reduce((s, i) => s + i.weight, 0);
  if (totalWeight !== 100) {
    throw new Error(`Weight รวมต้องเท่ากับ 100 (ปัจจุบัน = ${totalWeight})`);
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const sectionCheck = await client.query(
      `
      SELECT 1
      FROM "${process.env.DB_SCHEMA}".course_sections
      WHERE section_id = $1
      `,
      [section_id]
    );

    if (sectionCheck.rowCount === 0) {
      throw new Error('ไม่พบ section_id');
    }

    const existingRes = await client.query(
      `
      SELECT score_ratio_id
      FROM "${process.env.DB_SCHEMA}".subject_score_ratio
      WHERE section_id = $1
      `,
      [section_id]
    );

    const existingIds = existingRes.rows.map(r => r.score_ratio_id);
    const incomingIds = subject_score
      .filter(i => i.score_ratio_id)
      .map(i => i.score_ratio_id);

    const deleteIds = existingIds.filter(id => !incomingIds.includes(id));

    if (deleteIds.length > 0) {
      await client.query(
        `
        DELETE FROM "${process.env.DB_SCHEMA}".subject_score_ratio
        WHERE score_ratio_id = ANY($1)
        `,
        [deleteIds]
      );
    }

    const results = [];

    for (const item of subject_score) {
      let result;

      if (item.score_ratio_id) {
        result = await client.query(
          `
          UPDATE "${process.env.DB_SCHEMA}".subject_score_ratio
          SET
            sequence_order = $1,
            score_category = $2,
            weight = $3
          WHERE score_ratio_id = $4
          RETURNING *
          `,
          [
            item.sequence_order,
            item.score_category,
            item.weight,
            item.score_ratio_id
          ]
        );
      } else {
        result = await client.query(
          `
          INSERT INTO "${process.env.DB_SCHEMA}".subject_score_ratio
            (section_id, sequence_order, score_category, weight)
          VALUES ($1,$2,$3,$4)
          RETURNING *
          `,
          [
            section_id,
            item.sequence_order,
            item.score_category,
            item.weight
          ]
        );
      }

      results.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return results;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * ดึงข้อมูลสัดส่วนคะแนนทั้งหมดตามรหัสกลุ่มเรียน (Section ID) โดยเรียงตามลำดับที่กำหนด
 */
exports.getSubjectScoreBySectionId = async (section_id) => {
  const query = `
    SELECT
      score_ratio_id,
      sequence_order,
      score_category,
      weight
    FROM "${process.env.DB_SCHEMA}".subject_score_ratio
    WHERE section_id = $1
    ORDER BY sequence_order ASC
  `;

  const { rows } = await db.query(query, [section_id]);

  return {
    section_id,
    subject_score: rows
  };
};

/**
 * ดึงเฉพาะข้อมูลหมวดหมู่คะแนนและค่าน้ำหนักตามรหัสกลุ่มเรียน
 */
exports.getCategoryBySectionId = async (section_id) => {
  const query = `
    SELECT
      score_ratio_id,
      score_category,
      weight
    FROM "${process.env.DB_SCHEMA}".subject_score_ratio
    WHERE section_id = $1
    ORDER BY sequence_order
  `;

  const result = await db.query(query, [section_id]);
  return result.rows;
};

/**
 * ลบข้อมูลสัดส่วนคะแนนตาม ID โดยมีการตรวจสอบก่อนว่าหมวดหมู่ดังกล่าวถูกนำไปสร้างเป็นกิจกรรม (Activities) แล้วหรือไม่
 */
exports.deleteScoreRatioById = async (score_ratio_id) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const check = await client.query(
      `
      SELECT score_category
      FROM "${process.env.DB_SCHEMA}".subject_score_ratio
      WHERE score_ratio_id = $1
      `,
      [score_ratio_id]
    );

    if (check.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const scoreCategory = check.rows[0].score_category;

    const used = await client.query(
      `
      SELECT 1
      FROM "${process.env.DB_SCHEMA}".activities
      WHERE score_ratio_id = $1
      LIMIT 1
      `,
      [score_ratio_id]
    );

    if (used.rows.length > 0) {
      throw new Error(
        `ไม่สามารถลบ Score Category "${scoreCategory}" ได้ เนื่องจากถูกใช้งานอยู่`
      );
    }

    await client.query(
      `
      DELETE FROM "${process.env.DB_SCHEMA}".subject_score_ratio
      WHERE score_ratio_id = $1
      `,
      [score_ratio_id]
    );

    await client.query('COMMIT');

    return {
      message: `ลบ Score Category "${scoreCategory}" สำเร็จ`
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
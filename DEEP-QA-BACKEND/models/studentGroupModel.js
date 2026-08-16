const db = require('../config/db')
const logService = require('../services/logService');

/**
 * อัปเดตข้อมูลกลุ่มนักศึกษา หรือสร้างกลุ่มใหม่หากไม่มี group_id 
 * พร้อมทั้งจัดการเพิ่ม/ลบสมาชิกในกลุ่ม และบันทึกประวัติการเปลี่ยนแปลง (Log)
 */
exports.updateStudentGroup = async ({
  group_id,
  section_id,
  group_name,
  students,
  performed_by,
}) => {

  let group;

  if (group_id) {
    const res = await db.query(
      `SELECT * FROM "${process.env.DB_SCHEMA}".student_group 
       WHERE group_id=$1`,
      [group_id],
    );

    if (res.rowCount === 0)
      throw new Error(`Group ${group_id} not found`);

    group = res.rows[0];

    if (group.group_name !== group_name) {
      await db.query(
        `UPDATE "${process.env.DB_SCHEMA}".student_group
         SET group_name=$1, updated_at=NOW()
         WHERE group_id=$2`,
        [group_name, group_id],
      );

      group.group_name = group_name;
    }

  } else {
    const res = await db.query(
      `INSERT INTO "${process.env.DB_SCHEMA}".student_group
       (section_id, group_name)
       VALUES ($1,$2)
       RETURNING *`,
      [section_id, group_name],
    );

    group = res.rows[0];

    await logService.createLog({
      section_id: group.section_id,
      group_id: group.group_id,
      group_name: group.group_name,
      action_type: 'CREATE_GROUP',
      performed_by,
    });
  }

  const groupId = group.group_id;

  const existingRes = await db.query(
    `SELECT student_id 
     FROM "${process.env.DB_SCHEMA}".student_group_member 
     WHERE group_id=$1`,
    [groupId],
  );

  const existingStudents = existingRes.rows.map(r => r.student_id);
  const incomingStudents = students.map(st => st.student_id);

  const toRemove = existingStudents.filter(
    s => !incomingStudents.includes(s),
  );

  const removeResults = [];

  for (const student_id of toRemove) {
    await db.query(
      `DELETE FROM "${process.env.DB_SCHEMA}".student_group_member
       WHERE group_id=$1 AND student_id=$2`,
      [groupId, student_id],
    );

    await logService.createLog({
      section_id: group.section_id,
      group_id: groupId,
      group_name: group.group_name,
      student_id,
      action_type: 'REMOVE_STUDENT',
      old_group_id: groupId,
      performed_by,
    });

    removeResults.push({
      student_id,
      status: 'removed',
    });
  }

  const addResults = [];

  for (const student of students) {
    const student_id = student.student_id;

    if (existingStudents.includes(student_id))
      continue;

    const enrolled = await db.query(
      `SELECT 1 
       FROM "${process.env.DB_SCHEMA}".student_course
       WHERE student_id=$1 AND section_id=$2`,
      [student_id, section_id],
    );

    if (enrolled.rowCount === 0) {
      addResults.push({
        student_id,
        status: 'failed',
        error: 'นักเรียนไม่ได้ลงทะเบียนใน section นี้',
      });
      continue;
    }

    const inOtherGroup = await db.query(
      `SELECT 1
       FROM "${process.env.DB_SCHEMA}".student_group_member sgm
       JOIN "${process.env.DB_SCHEMA}".student_group sg
       ON sgm.group_id = sg.group_id
       WHERE sgm.student_id=$1 AND sg.section_id=$2`,
      [student_id, section_id],
    );

    if (inOtherGroup.rowCount > 0) {
      addResults.push({
        student_id,
        status: 'failed',
        error: 'อยู่ใน group อื่นแล้ว',
      });
      continue;
    }

    await db.query(
      `INSERT INTO "${process.env.DB_SCHEMA}".student_group_member
       (group_id, student_id)
       VALUES ($1,$2)`,
      [groupId, student_id],
    );

    await logService.createLog({
      section_id: group.section_id,
      group_id: groupId,
      group_name: group.group_name,
      student_id,
      action_type: 'ADD_STUDENT',
      new_group_id: groupId,
      performed_by,
    });

    addResults.push({
      student_id,
      status: 'success',
    });
  }

  return {
    group_id: groupId,
    addResults,
    removeResults,
  };
};

/**
 * ดึงข้อมูลกลุ่มทั้งหมดในกลุ่มเรียน (Section) พร้อมรายชื่อนักศึกษาในแต่ละกลุ่ม
 */
exports.getAllGroupInSection = async (section_id) => {
  const res = await db.query(
    `
    SELECT g.group_id, g.group_name, sgm.student_id
    FROM "${process.env.DB_SCHEMA}".student_group g
    LEFT JOIN "${process.env.DB_SCHEMA}".student_group_member sgm ON g.group_id = sgm.group_id
    WHERE g.section_id=$1 ORDER BY g.group_id, sgm.student_id
  `,
    [section_id],
  )

  const groups = {}

  for (const row of res.rows) {
    if (!groups[row.group_id]) {
      groups[row.group_id] = {
        group_id: row.group_id,
        group_name: row.group_name,
        students: [],
      }
    }

    groups[row.group_id].students.push({
      student_id: row.student_id || '',
    })
  }

  return Object.values(groups)
}

/**
 * ดึงรายชื่อและข้อมูลพื้นฐานของนักศึกษาที่อยู่ในกลุ่มที่ระบุ
 */
exports.getStudentInGroup = async (group_id) => {
  const res = await db.query(
    `
    SELECT sgm.student_id,
    u.title_th,  
    st.first_name_th, 
    st.last_name_th

    FROM "${process.env.DB_SCHEMA}".student_group_member sgm
    JOIN "${process.env.DB_SCHEMA}".student st 
      ON sgm.student_id = st.student_id
    JOIN "${process.env.DB_SCHEMA}".users u
      ON st.student_id = u.user_id
    WHERE sgm.group_id=$1 ORDER BY sgm.student_id
  `,
    [group_id],
  )
  return res.rows
}

/**
 * ลบกลุ่มนักศึกษาออกจากระบบ
 */
exports.deleteGroup = async ({ group_id, performed_by }) => {
  const res = await db.query(
    `SELECT group_name, section_id 
     FROM "${process.env.DB_SCHEMA}".student_group 
     WHERE group_id = $1`,
    [group_id]
  );

  if (res.rowCount === 0) return null;

  const { group_name, section_id } = res.rows[0];

  try {

    await db.query('BEGIN');
    await db.query(
      `INSERT INTO "${process.env.DB_SCHEMA}".student_group_change_log 
        (group_id, group_name, action_type, performed_by, section_id)
       VALUES ($1, $2, 'DELETE_GROUP', $3, $4)`,
      [group_id, group_name, performed_by, section_id]
    );

    await db.query(
      `DELETE FROM "${process.env.DB_SCHEMA}".student_group WHERE group_id = $1`,
      [group_id]
    );

    await db.query('COMMIT');

    return { group_id, group_name, success: true };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};

/**
 * ดึงรายชื่อรหัสนักศึกษาทั้งหมดที่ลงทะเบียนในกลุ่มเรียน (Section)
 */
exports.getStudentsInSection = async (section_id) => {
  const res = await db.query(
    `SELECT student_id 
     FROM "${process.env.DB_SCHEMA}".student_course 
     WHERE section_id=$1`,
    [section_id]
  );
  return res.rows.map(r => r.student_id);
};

/**
 * ดึงรายชื่อรหัสนักศึกษาที่ถูกจัดเข้ากลุ่มเรียบร้อยแล้วในกลุ่มเรียน (Section) นั้นๆ
 */
exports.getStudentsAlreadyInGroup = async (section_id) => {
  const res = await db.query(
    `
    SELECT sgm.student_id
    FROM "${process.env.DB_SCHEMA}".student_group_member sgm
    JOIN "${process.env.DB_SCHEMA}".student_group sg
      ON sgm.group_id = sg.group_id
    WHERE sg.section_id=$1
    `,
    [section_id]
  );
  return res.rows.map(r => r.student_id);
};

/**
 * ดึงประวัติการเปลี่ยนแปลงสมาชิกในกลุ่ม (Log) ของกลุ่มเรียนที่ระบุ
 */
exports.getLogsBySection = async (section_id) => {
  const result = await db.query(
    `
    SELECT 
        l.log_id,
        l.section_id,
        l.group_id,
        l.group_name,
        l.student_id,

        -- ข้อมูลของนักเรียน (u1)
        u1.title_th AS student_title,
        u1.first_name_th AS student_first_name,
        u1.last_name_th AS student_last_name,

        l.action_type,
        l.old_group_id,
        l.new_group_id,
        
        -- ข้อมูลของคนทำรายการ (u2)
        l.performed_by,
        u2.title_th AS performer_title,
        u2.first_name_th AS performer_first_name,
        u2.last_name_th AS performer_last_name,

        l.created_at

    FROM "${process.env.DB_SCHEMA}".student_group_change_log l

    LEFT JOIN "${process.env.DB_SCHEMA}".users u1
        ON l.student_id = u1.user_id

    LEFT JOIN "${process.env.DB_SCHEMA}".users u2
        ON l.performed_by = u2.user_id    

    WHERE l.section_id = $1

    ORDER BY l.created_at DESC
    `,
    [section_id],
  );

  return result.rows;
};
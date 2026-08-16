const db = require('../config/db');

exports.createLog = async ({
  section_id,
  group_id,
  group_name,
  student_id = null,
  action_type,
  old_group_id = null,
  new_group_id = null,
  performed_by,
}) => {

  await db.query(
    `INSERT INTO "${process.env.DB_SCHEMA}".student_group_change_log
     (section_id, group_id, group_name, student_id,
      action_type, old_group_id, new_group_id, performed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      section_id,
      group_id,
      group_name,
      student_id,
      action_type.toUpperCase(),
      old_group_id,
      new_group_id,
      performed_by,
    ],
  );
};

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const { createPool } = require('../pool');
const { testSchema, dropSchema } = require('./helpers');

/**
 * These run against the real db/migrations directory, not a scratch one: the
 * subject under test is the schema those files build.
 *
 * The assertions are behavioural - insert something the schema should refuse
 * and check the SQLSTATE, delete a parent and look at what survived. Reading
 * the declared types back out of information_schema would only restate the DDL
 * and would pass however wrong the DDL was.
 */

const SCHEMA = testSchema('identity');
let pool;

test.before(async () => {
  await migrate({ schema: SCHEMA });
  pool = createPool({ schema: SCHEMA });
});

test.after(async () => {
  if (pool) await pool.end();
  await dropSchema(SCHEMA);
});

/** The SQLSTATE of a query that is expected to fail. */
async function errorCode(sql, params = []) {
  try {
    await pool.query(sql, params);
  } catch (error) {
    return error.code;
  }
  assert.fail(`expected ${sql} to be rejected`);
}

/**
 * One faculty, department, programme, subject, role and user, all suffixed so
 * each test's fixtures are its own. Returns the suffix-built identifiers.
 *
 * Keep the tag to nine characters: a code is varchar(10) and carries a
 * one-letter prefix.
 *
 * The subject is the exception and is not built from the tag at all. A subject
 * code is a fixed eight-digit format with no room for a prefix, so each call
 * takes the next code in a counted series, shaped like the real thing.
 */
let nextSubject = 0;

async function fixtures(tag) {
  const ids = {
    faculty: `F${tag}`,
    department: `D${tag}`,
    program: `P${tag}`,
    subject: `0107${String(++nextSubject).padStart(4, '0')}`,
    role: `R${tag}`,
    user: `U${tag}`,
  };

  await pool.query(
    `INSERT INTO faculty (faculty_id, faculty_name_en, faculty_name_th)
     VALUES ($1, 'Engineering', 'วิศวกรรมศาสตร์')`,
    [ids.faculty],
  );
  await pool.query(
    `INSERT INTO departments (department_id, department_name_th, faculty_id) VALUES ($1, 'ภาควิชา', $2)`,
    [ids.department, ids.faculty],
  );
  await pool.query(
    `INSERT INTO programs (program_id, program_name_th, department_id, year)
     VALUES ($1, 'หลักสูตร', $2, '2565')`,
    [ids.program, ids.department],
  );
  await pool.query(`INSERT INTO roles (role_id, role_name, priority) VALUES ($1, 'Teacher', 30)`, [
    ids.role,
  ]);
  await pool.query(`INSERT INTO users (user_id, email) VALUES ($1, $2)`, [
    ids.user,
    `${ids.user}@kmitl.ac.th`,
  ]);
  await pool.query(
    `INSERT INTO subjects (subject_id, subject_name_en, subject_name_th, credits, department_id, created_by)
     VALUES ($1, 'Software Engineering', 'วิศวกรรมซอฟต์แวร์', 3, $2, $3)`,
    [ids.subject, ids.department, ids.user],
  );

  return ids;
}

test('reset and migrate build the schema from nothing', async (t) => {
  const schema = testSchema('identity_from_empty');
  t.after(() => dropSchema(schema));

  await reset({ schema });

  const { applied } = await migrate({ schema });

  assert.deepEqual(applied, ['0001_identity_and_organisation.sql']);
});

test('a stored timestamp means the same instant whatever zone reads it', async () => {
  const ids = await fixtures('zones');

  // The point of timestamptz over timestamp, and the reason the inherited
  // code's mix of NOW() and CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok' had
  // to be resolved. Reading created_at back as a Date proves nothing - pg
  // builds one from a bare timestamp too - so read it in two zones and check
  // the wall clock moves by exactly the offset between them.
  const client = await pool.connect();
  const wallClockIn = async (zone) => {
    await client.query(`SET TIME ZONE '${zone}'`);
    const { rows } = await client.query(
      `SELECT to_char(date_trunc('second', created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS wall
         FROM users WHERE user_id = $1`,
      [ids.user],
    );
    return Date.parse(rows[0].wall);
  };

  try {
    const bangkok = await wallClockIn('Asia/Bangkok');
    const utc = await wallClockIn('UTC');

    // Bangkok is UTC+7 all year, so one instant renders seven hours apart. A
    // plain timestamp column would render identically in both and give 0.
    assert.equal((bangkok - utc) / 3_600_000, 7);
  } finally {
    client.release();
  }
});

test('a department cannot name a faculty that does not exist', async () => {
  const code = await errorCode(
    `INSERT INTO departments (department_id, faculty_id) VALUES ('DX', 'nosuch')`,
  );

  assert.equal(code, '23503');
});

test('a faculty still holding departments cannot be deleted', async () => {
  const ids = await fixtures('restrict');

  const code = await errorCode(`DELETE FROM faculty WHERE faculty_id = $1`, [ids.faculty]);

  assert.equal(code, '23503');
});

test('a subject may be attached to a programme only once', async () => {
  const ids = await fixtures('pair');

  await pool.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type) VALUES ($1, $2, 'required')`,
    [ids.program, ids.subject],
  );
  const code = await errorCode(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type) VALUES ($1, $2, 'elective')`,
    [ids.program, ids.subject],
  );

  assert.equal(code, '23505');
});

test('a user holds one grant per role and scope', async () => {
  const ids = await fixtures('grant');

  await pool.query(`INSERT INTO user_roles (user_id, role_id, scope_id) VALUES ($1, $2, $3)`, [
    ids.user,
    ids.role,
    ids.department,
  ]);
  const duplicate = await errorCode(
    `INSERT INTO user_roles (user_id, role_id, scope_id) VALUES ($1, $2, $3)`,
    [ids.user, ids.role, ids.department],
  );
  assert.equal(duplicate, '23505');

  // The same role at a different scope is a different grant, and 'FULL_ADMIN'
  // is a scope like any other as far as the database is concerned - it is a
  // sentinel, not a foreign key.
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id, scope_id) VALUES ($1, $2, 'FULL_ADMIN')`,
    [ids.user, ids.role],
  );

  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM user_roles WHERE user_id = $1`, [
    ids.user,
  ]);
  assert.equal(rows[0].n, 2);
});

test('a grant needs a scope', async () => {
  const ids = await fixtures('noscope');

  const code = await errorCode(
    `INSERT INTO user_roles (user_id, role_id, scope_id) VALUES ($1, $2, NULL)`,
    [ids.user, ids.role],
  );

  assert.equal(code, '23502');
});

test('deleting a user takes their grants and log lines but leaves what they authored', async () => {
  const ids = await fixtures('delete');
  const other = await fixtures('granted');

  await pool.query(`INSERT INTO user_roles (user_id, role_id, scope_id) VALUES ($1, $2, $3)`, [
    ids.user,
    ids.role,
    ids.department,
  ]);
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id, scope_id, assigned_by) VALUES ($1, $2, $3, $4)`,
    [other.user, ids.role, other.department, ids.user],
  );
  await pool.query(`INSERT INTO user_log (user_id, activity) VALUES ($1, 'LOGIN')`, [ids.user]);

  await pool.query(`DELETE FROM users WHERE user_id = $1`, [ids.user]);

  // The granter is a second user, so their grant survives the granted user's
  // deletion with assigned_by emptied - deleting whoever handed a role out must
  // not take the role away.
  const granted = await pool.query(
    `SELECT assigned_by FROM user_roles WHERE user_id = $1 AND role_id = $2`,
    [other.user, ids.role],
  );
  assert.equal(granted.rowCount, 1);
  assert.equal(granted.rows[0].assigned_by, null);

  const grants = await pool.query(`SELECT 1 FROM user_roles WHERE user_id = $1`, [ids.user]);
  const log = await pool.query(`SELECT 1 FROM user_log WHERE user_id = $1`, [ids.user]);
  const subject = await pool.query(`SELECT created_by FROM subjects WHERE subject_id = $1`, [
    ids.subject,
  ]);

  assert.equal(grants.rowCount, 0);
  assert.equal(log.rowCount, 0);
  assert.equal(subject.rowCount, 1);
  assert.equal(subject.rows[0].created_by, null);
});

test('a student can be imported without a user account', async () => {
  const ids = await fixtures('student');

  // The inherited import writes no users row, and admission_year is supplied
  // rather than derived. Both are checked here because docs/02 says otherwise.
  await pool.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, admission_year)
     VALUES ('65010999', 'สมชาย', 'ใจดี', $1, $2, '2565')`,
    [ids.department, ids.program],
  );

  const { rows } = await pool.query(
    `SELECT s.full_name_th, s.admission_year, s.status, u.user_id
       FROM student s
       LEFT JOIN users u ON u.user_id = s.student_id
      WHERE s.student_id = '65010999'`,
  );

  assert.equal(rows[0].user_id, null);
  assert.equal(rows[0].full_name_th, 'สมชาย ใจดี');
  assert.equal(rows[0].admission_year, '2565');
  assert.equal(rows[0].status, 'active');
});

test('a student whose two names are both the maximum length still has a full name', async () => {
  const ids = await fixtures('longname');

  // The names are varchar(100) each, so the generated full name reaches 201.
  // docs/02 gives full_name_th as varchar(200), which rejects this row.
  const first = 'ก'.repeat(100);
  const last = 'ข'.repeat(100);
  await pool.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id)
     VALUES ('65010997', $1, $2, $3, $4)`,
    [first, last, ids.department, ids.program],
  );

  const { rows } = await pool.query(
    `SELECT full_name_th FROM student WHERE student_id = '65010997'`,
  );

  assert.equal(rows[0].full_name_th, `${first} ${last}`);
});

test('a subject code holds the university format and nothing longer', async () => {
  const ids = await fixtures('subjwid');

  // Eight digits is the format the whole university issues, and the column is
  // cut to it exactly rather than left with headroom. Ticket #4's tables must
  // match: a varchar-to-varchar foreign key is created across differing widths
  // without complaint, so a wider column there would be caught by no one.
  const insert = `INSERT INTO subjects (subject_id, subject_name_en, subject_name_th, credits, department_id)
                  VALUES ($1, 'Data Structures', 'โครงสร้างข้อมูล', 3, $2)`;

  await pool.query(insert, ['01076105', ids.department]);
  assert.equal(await errorCode(insert, ['010761059', ids.department]), '22001');
});

test('the enumerated columns refuse a value outside their set', async () => {
  const ids = await fixtures('enums');

  assert.equal(
    await errorCode(
      `INSERT INTO program_subjects (program_id, subject_id, subject_type) VALUES ($1, $2, 'optional')`,
      [ids.program, ids.subject],
    ),
    '22P02',
  );
  assert.equal(
    await errorCode(`UPDATE users SET status = 'archived' WHERE user_id = $1`, [ids.user]),
    '22P02',
  );
  assert.equal(
    await errorCode(
      `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id, status)
       VALUES ('65010998', 'ก', 'ข', $1, $2, 'expelled')`,
      [ids.department, ids.program],
    ),
    '22P02',
  );
});

test('the columns the inherited inserts omit are supplied by the database', async () => {
  const ids = await fixtures('defaults');

  await pool.query(`INSERT INTO user_roles (user_id, role_id, scope_id) VALUES ($1, $2, $3)`, [
    ids.user,
    ids.role,
    ids.department,
  ]);
  await pool.query(`INSERT INTO user_log (user_id, activity) VALUES ($1, 'CHANGE_PASSWORD')`, [
    ids.user,
  ]);

  const user = await pool.query(
    `SELECT status, is_verified, created_at FROM users WHERE user_id = $1`,
    [ids.user],
  );
  const grant = await pool.query(
    `SELECT assigned_at, is_active FROM user_roles WHERE user_id = $1`,
    [ids.user],
  );
  const log = await pool.query(`SELECT id, time_stamp FROM user_log WHERE user_id = $1`, [ids.user]);
  const subject = await pool.query(`SELECT is_active FROM subjects WHERE subject_id = $1`, [
    ids.subject,
  ]);

  assert.equal(user.rows[0].status, 'active');
  assert.equal(user.rows[0].is_verified, false);
  assert.ok(user.rows[0].created_at instanceof Date);
  assert.ok(grant.rows[0].assigned_at instanceof Date);
  assert.equal(grant.rows[0].is_active, true);
  assert.ok(log.rows[0].id > 0);
  assert.ok(log.rows[0].time_stamp instanceof Date);
  assert.equal(subject.rows[0].is_active, true);
});

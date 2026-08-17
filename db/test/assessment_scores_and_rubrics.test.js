'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { migrate } = require('../migrate');
const { reset } = require('../reset');
const { createPool } = require('../pool');
const { testSchema, dropSchema, baseFixtures, errorCodeOf } = require('./helpers');

/**
 * Migration 0003, at the same seam as 0001's and 0002's tests: migrate() and
 * the pool against real PostgreSQL, in a schema this file owns and drops.
 *
 * The assertions are behavioural. The foreign-key type check that earns its
 * introspection lives in this file now, having moved on from 0002's, together
 * with the applied-migration list.
 */

const SCHEMA = testSchema('assessment');
let pool;

test.before(async () => {
  await migrate({ schema: SCHEMA });
  pool = createPool({ schema: SCHEMA });
});

test.after(async () => {
  if (pool) await pool.end();
  await dropSchema(SCHEMA);
});

const errorCode = (sql, params) => errorCodeOf(pool, sql, params);

/**
 * Runs `body` against one client, inside a transaction.
 *
 * The ROLLBACK is not tidiness. A client released while its transaction is
 * still open goes back to the pool in that state, and the next test to borrow
 * it fails with 25P02 - an error belonging to a test that has already passed.
 */
async function inTransaction(body) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await body(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Everything 0003 hangs off: 0001's six rows, the programme-subject pairing, an
 * offering, a section, a CLO at the offering's grain, one enrolled student and
 * one weighting category. Adds `year`, `offering`, `section`, `clo`, `student`
 * and `ratio` to the identifiers.
 */
let nextStudent = 0;

async function section(tag) {
  const ids = await baseFixtures(pool, tag);
  ids.year = '2568';

  await pool.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type) VALUES ($1, $2, 'required')`,
    [ids.program, ids.subject],
  );
  const course = await pool.query(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, $3, 1) RETURNING id`,
    [ids.program, ids.subject, ids.year],
  );
  ids.offering = course.rows[0].id;

  const created = await pool.query(
    `INSERT INTO course_sections (semester_course_id, section_number) VALUES ($1, '1')
     RETURNING section_id`,
    [ids.offering],
  );
  ids.section = created.rows[0].section_id;

  const clo = await pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
     VALUES ($1, $2, $3, 'CLO1', 'อธิบายได้') RETURNING clo_id`,
    [ids.program, ids.subject, ids.year],
  );
  ids.clo = clo.rows[0].clo_id;

  ids.student = await student(ids);
  ids.ratio = await ratio(ids, 'Midterm', 40);

  return ids;
}

/** One student in the fixture's department and programme, returning its id. */
async function student(ids) {
  const studentId = `64010${String(++nextStudent).padStart(3, '0')}`;
  await pool.query(
    `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id)
     VALUES ($1, 'สมชาย', 'ใจดี', $2, $3)`,
    [studentId, ids.department, ids.program],
  );
  return studentId;
}

/** One weighting category at the offering's grain, returning its score_ratio_id. */
async function ratio(ids, category, weight, order = 1) {
  const { rows } = await pool.query(
    `INSERT INTO subject_score_ratio
       (program_id, subject_id, academic_year, sequence_order, score_category, weight)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING score_ratio_id`,
    [ids.program, ids.subject, ids.year, order, category, weight],
  );
  return rows[0].score_ratio_id;
}

/** One Activity in the fixture's section, returning its id. */
async function activity(ids, name = 'สอบกลางภาค', extra = {}) {
  const { rows } = await pool.query(
    `INSERT INTO activities (section_id, score_ratio_id, activity_type, activity_name, score_number)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [ids.section, extra.ratio ?? ids.ratio, extra.type ?? 'individual', name, extra.score ?? 20],
  );
  return rows[0].id;
}

test('reset and migrate build the schema from nothing', async (t) => {
  const schema = testSchema('assessment_from_empty');
  t.after(() => dropSchema(schema));

  await reset({ schema });

  const { applied } = await migrate({ schema });

  assert.deepEqual(applied, [
    '0001_identity_and_organisation.sql',
    '0002_offerings_and_learning_outcomes.sql',
    '0003_assessment_scores_and_rubrics.sql',
  ]);
});

test('every foreign key has the type and width of the column it points at', async () => {
  // The one place introspection earns its keep. A mismatched width is not
  // something either side's DDL states - it is the disagreement between two
  // lines in two files - and PostgreSQL creates varchar(8) -> varchar(20)
  // without a word, then fails much later on a value that fits one and not the
  // other. docs/02 gets it wrong seven times within 0002's scope and nine more
  // within 0003's, always by giving a person the subject's width, so it is
  // exactly the error most likely to be copied in.
  const { rows } = await pool.query(`
    SELECT ch.relname  AS child_table,
           ac.attname  AS child_column,
           format_type(ac.atttypid, ac.atttypmod) AS child_type,
           pa.relname  AS parent_table,
           ap.attname  AS parent_column,
           format_type(ap.atttypid, ap.atttypmod) AS parent_type
      FROM pg_constraint c
      JOIN pg_class ch ON ch.oid = c.conrelid
      JOIN pg_class pa ON pa.oid = c.confrelid
      JOIN unnest(c.conkey, c.confkey) AS k(child_attnum, parent_attnum) ON true
      JOIN pg_attribute ac ON ac.attrelid = c.conrelid AND ac.attnum = k.child_attnum
      JOIN pg_attribute ap ON ap.attrelid = c.confrelid AND ap.attnum = k.parent_attnum
     WHERE c.contype = 'f'
       AND ch.relnamespace = current_schema()::regnamespace
  `);

  const mismatched = rows
    .filter((r) => r.child_type !== r.parent_type)
    .map((r) => `${r.child_table}.${r.child_column} ${r.child_type} -> ${r.parent_table}.${r.parent_column} ${r.parent_type}`);

  assert.deepEqual(mismatched, []);
  // Guards against the query silently matching nothing and passing.
  assert.ok(rows.length > 40, `expected the schema's foreign keys, found ${rows.length}`);
});

test('the change log keeps its group columns comparable without a foreign key', async () => {
  // The three group columns are deliberately not foreign keys, so the check
  // above cannot see them, and a Smallint copied out of docs/02 would go
  // unnoticed until a group_id passed 32767. Comparing a live group against the
  // log is what the columns exist for, so the comparison is the assertion.
  const ids = await section('logtype');
  const { rows } = await pool.query(
    `INSERT INTO student_group (section_id, group_name) VALUES ($1, 'กลุ่ม 1') RETURNING group_id`,
    [ids.section],
  );
  const groupId = rows[0].group_id;

  await pool.query(
    `INSERT INTO student_group_change_log
       (section_id, group_id, group_name, action_type, old_group_id, new_group_id, performed_by)
     VALUES ($1, $2, 'กลุ่ม 1', 'CREATE_GROUP', NULL, $2, $3)`,
    [ids.section, groupId, ids.user],
  );

  const joined = await pool.query(
    `SELECT g.group_name FROM student_group_change_log l
       JOIN student_group g ON g.group_id = l.new_group_id
      WHERE l.section_id = $1`,
    [ids.section],
  );
  assert.deepEqual(joined.rows, [{ group_name: 'กลุ่ม 1' }]);
});

test('a student is enrolled in a section once, and the pair is the key', async () => {
  const ids = await section('enrol');

  await pool.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
    ids.student,
    ids.section,
  ]);

  // The duplicate the inherited code guarded with a SELECT in application code.
  assert.equal(
    await errorCode(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
      ids.student,
      ids.section,
    ]),
    '23505',
  );

  // ADR-0001 tier 2: no surrogate id survives for anything to address it by.
  assert.equal(
    await errorCode(`SELECT id FROM student_course WHERE student_id = $1`, [ids.student]),
    '42703',
  );

  // The same student in a second section of the same offering is a second
  // enrolment, not a duplicate.
  const second = await pool.query(
    `INSERT INTO course_sections (semester_course_id, section_number) VALUES ($1, '2')
     RETURNING section_id`,
    [ids.offering],
  );
  await pool.query(`INSERT INTO student_course (student_id, section_id) VALUES ($1, $2)`, [
    ids.student,
    second.rows[0].section_id,
  ]);
});

test('group membership is keyed on the pair and goes with the group', async () => {
  const ids = await section('members');
  const { rows } = await pool.query(
    `INSERT INTO student_group (section_id, group_name) VALUES ($1, 'กลุ่ม ก') RETURNING group_id`,
    [ids.section],
  );
  const groupId = rows[0].group_id;
  const other = await student(ids);

  await pool.query(`INSERT INTO student_group_member (group_id, student_id) VALUES ($1, $2)`, [
    groupId,
    ids.student,
  ]);
  await pool.query(`INSERT INTO student_group_member (group_id, student_id) VALUES ($1, $2)`, [
    groupId,
    other,
  ]);

  assert.equal(
    await errorCode(`INSERT INTO student_group_member (group_id, student_id) VALUES ($1, $2)`, [
      groupId,
      ids.student,
    ]),
    '23505',
  );

  // Membership is part of the group and does not outlive it.
  await pool.query(`DELETE FROM student_group WHERE group_id = $1`, [groupId]);
  const survivors = await pool.query(
    `SELECT count(*)::int AS n FROM student_group_member WHERE group_id = $1`,
    [groupId],
  );
  assert.equal(survivors.rows[0].n, 0);
});

test('a group is named without one, and takes a name it is given', async () => {
  const ids = await section('groupname');

  const unnamed = await pool.query(
    `INSERT INTO student_group (section_id) VALUES ($1) RETURNING group_id, group_name`,
    [ids.section],
  );
  assert.equal(unnamed.rows[0].group_name, '');

  // Two unnamed groups in one section, which a unique constraint on the name
  // would refuse and which is the ordinary state of a section being divided up.
  await pool.query(`INSERT INTO student_group (section_id) VALUES ($1)`, [ids.section]);

  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM student_group WHERE section_id = $1`,
    [ids.section],
  );
  assert.equal(rows[0].n, 2);
});

test('the log survives the group whose deletion it records', async () => {
  const ids = await section('logdelete');
  const { rows } = await pool.query(
    `INSERT INTO student_group (section_id, group_name) VALUES ($1, 'กลุ่มที่ถูกลบ') RETURNING group_id`,
    [ids.section],
  );
  const groupId = rows[0].group_id;

  // deleteGroup's own order: write the log row, then delete the group, in one
  // transaction. A foreign key on old_group_id would make this impossible.
  await inTransaction(async (client) => {
    await client.query(
      `INSERT INTO student_group_change_log
         (section_id, group_id, group_name, action_type, old_group_id, performed_by)
       VALUES ($1, $2, 'กลุ่มที่ถูกลบ', 'DELETE_GROUP', $2, $3)`,
      [ids.section, groupId, ids.user],
    );
    await client.query(`DELETE FROM student_group WHERE group_id = $1`, [groupId]);
  });

  const { rows: logged } = await pool.query(
    `SELECT group_name, old_group_id, action_type FROM student_group_change_log WHERE group_id = $1`,
    [groupId],
  );
  assert.deepEqual(logged, [
    { group_name: 'กลุ่มที่ถูกลบ', old_group_id: groupId, action_type: 'DELETE_GROUP' },
  ]);

  assert.equal(
    await errorCode(
      `INSERT INTO student_group_change_log (section_id, group_id, group_name, action_type, performed_by)
       VALUES ($1, $2, 'x', 'ARCHIVE_GROUP', $3)`,
      [ids.section, groupId, ids.user],
    ),
    '23514',
  );
});

test('a moved student is logged with both the group left and the group joined', async () => {
  const ids = await section('logmove');
  const from = await pool.query(
    `INSERT INTO student_group (section_id, group_name) VALUES ($1, 'ก') RETURNING group_id`,
    [ids.section],
  );
  const to = await pool.query(
    `INSERT INTO student_group (section_id, group_name) VALUES ($1, 'ข') RETURNING group_id`,
    [ids.section],
  );

  await pool.query(
    `INSERT INTO student_group_change_log
       (section_id, group_id, group_name, student_id, action_type, old_group_id, new_group_id, performed_by)
     VALUES ($1, $2, 'ข', $3, 'MOVE_STUDENT', $4, $2, $5)`,
    [ids.section, to.rows[0].group_id, ids.student, from.rows[0].group_id, ids.user],
  );

  const { rows } = await pool.query(
    `SELECT student_id, old_group_id, new_group_id FROM student_group_change_log
      WHERE action_type = 'MOVE_STUDENT' AND section_id = $1`,
    [ids.section],
  );
  assert.deepEqual(rows, [
    {
      student_id: ids.student,
      old_group_id: from.rows[0].group_id,
      new_group_id: to.rows[0].group_id,
    },
  ]);
});

test('the weighting scheme belongs to a programme, subject and year, never to a section', async () => {
  const ids = await section('ratgrain');

  // ADR-0003: the column is gone. 42703 is "no such column", which is the point.
  assert.equal(
    await errorCode(
      `INSERT INTO subject_score_ratio
         (program_id, subject_id, academic_year, sequence_order, score_category, weight, section_id)
       VALUES ($1, $2, $3, 2, 'Final', 60, $4)`,
      [ids.program, ids.subject, ids.year, ids.section],
    ),
    '42703',
  );

  // One category per offering, and the same category is free again next year.
  assert.equal(
    await errorCode(
      `INSERT INTO subject_score_ratio
         (program_id, subject_id, academic_year, sequence_order, score_category, weight)
       VALUES ($1, $2, $3, 2, 'Midterm', 30)`,
      [ids.program, ids.subject, ids.year],
    ),
    '23505',
  );
  await pool.query(
    `INSERT INTO subject_score_ratio
       (program_id, subject_id, academic_year, sequence_order, score_category, weight)
     VALUES ($1, $2, '2569', 1, 'Midterm', 40)`,
    [ids.program, ids.subject],
  );

  assert.equal(
    await errorCode(
      `INSERT INTO subject_score_ratio
         (program_id, subject_id, academic_year, sequence_order, score_category, weight)
       VALUES ($1, $2, $3, 3, 'Final', 140)`,
      [ids.program, ids.subject, ids.year],
    ),
    '23514',
  );
});

test('a weighting scheme may only name a subject its programme teaches', async () => {
  const ids = await baseFixtures(pool, 'ratnopair');

  // The programme and the subject both exist; the pairing does not. Two
  // separate foreign keys would accept this, and the offering-wide grain would
  // then be a grain over something no one teaches.
  assert.equal(
    await errorCode(
      `INSERT INTO subject_score_ratio
         (program_id, subject_id, academic_year, sequence_order, score_category, weight)
       VALUES ($1, $2, '2568', 1, 'Midterm', 40)`,
      [ids.program, ids.subject],
    ),
    '23503',
  );
});

test('an Activity is set to one section and takes its defaults', async () => {
  const ids = await section('activity');

  const id = await activity(ids);
  const { rows } = await pool.query(
    `SELECT activity_type, score_number, is_average_score, is_self_assessment, detail, expected_level
       FROM activities WHERE id = $1`,
    [id],
  );
  assert.equal(rows[0].is_average_score, false);
  assert.equal(rows[0].is_self_assessment, false);
  assert.equal(rows[0].detail, null);
  assert.equal(rows[0].expected_level, null);
  assert.equal(rows[0].score_number, '20.00');

  assert.equal(
    await errorCode(
      `INSERT INTO activities (section_id, activity_type, activity_name) VALUES ($1, 'pair', 'x')`,
      [ids.section],
    ),
    '23514',
  );

  // R067's two, both accepted.
  for (const type of ['group', 'individual']) {
    await activity(ids, `งาน ${type}`, { type });
  }
});

test('an Activity keeps its place in the plan when the week is rewritten', async () => {
  const ids = await section('actweek');
  const week = await pool.query(
    `INSERT INTO course_syllabus (section_id, week_no, title) VALUES ($1, 3, 'โครงสร้างข้อมูล')
     RETURNING id`,
    [ids.section],
  );

  const id = await activity(ids);
  await pool.query(`UPDATE activities SET course_syllabus_id = $1 WHERE id = $2`, [
    week.rows[0].id,
    id,
  ]);

  await pool.query(`DELETE FROM course_syllabus WHERE id = $1`, [week.rows[0].id]);

  const { rows } = await pool.query(
    `SELECT activity_name, course_syllabus_id FROM activities WHERE id = $1`,
    [id],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].course_syllabus_id, null);
});

test('nothing stops an Activity naming another subject’s weighting category', async () => {
  const ids = await section('grainhole');
  const elsewhere = await section('grainhol2');

  // The consequence of the file's two grains, asserted rather than assumed. An
  // Activity has a section and nothing else, so there are no columns to put in
  // a composite foreign key and this insert succeeds. The service layer derives
  // the offering from the section instead; a reader who assumes the database
  // closed it will be wrong.
  const id = await activity(ids, 'ข้ามวิชา', { ratio: elsewhere.ratio });

  const { rows } = await pool.query(
    `SELECT r.program_id, r.subject_id FROM activities a
       JOIN subject_score_ratio r ON r.score_ratio_id = a.score_ratio_id
      WHERE a.id = $1`,
    [id],
  );
  assert.equal(rows[0].subject_id, elsewhere.subject);
  assert.notEqual(rows[0].subject_id, ids.subject);
});

test('an Activity’s CLO weightings can be reordered inside one transaction', async () => {
  const ids = await section('reorder');
  const id = await activity(ids);
  const second = await pool.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
     VALUES ($1, $2, $3, 'CLO2', 'วิเคราะห์ได้') RETURNING clo_id`,
    [ids.program, ids.subject, ids.year],
  );

  for (const [order, clo] of [
    [1, ids.clo],
    [2, second.rows[0].clo_id],
  ]) {
    await pool.query(
      `INSERT INTO activity_clo_mapping (activity_id, sequence_order, clo_id, weight, score_ratio_id)
       VALUES ($1, $2, $3, 50, $4)`,
      [id, order, clo, ids.ratio],
    );
  }

  // upsertActivityCloMapping updates the surviving rows one at a time, so a swap
  // passes through a state where both hold sequence_order 1. Deferred, that is
  // the middle of a legal move; checked per statement it is a duplicate key and
  // reordering would be impossible.
  await inTransaction(async (client) => {
    await client.query(
      `UPDATE activity_clo_mapping SET sequence_order = 1 WHERE activity_id = $1 AND clo_id = $2`,
      [id, second.rows[0].clo_id],
    );
    await client.query(
      `UPDATE activity_clo_mapping SET sequence_order = 2 WHERE activity_id = $1 AND clo_id = $2`,
      [id, ids.clo],
    );
  });

  const { rows } = await pool.query(
    `SELECT clo_id FROM activity_clo_mapping WHERE activity_id = $1 ORDER BY sequence_order`,
    [id],
  );
  assert.deepEqual(rows.map((r) => r.clo_id), [second.rows[0].clo_id, ids.clo]);

  // A single duplicate is still refused; the check is deferred, not dropped.
  assert.equal(
    await errorCode(
      `INSERT INTO activity_clo_mapping (activity_id, sequence_order, clo_id, weight, score_ratio_id)
       VALUES ($1, 2, NULL, 0, $2)`,
      [id, ids.ratio],
    ),
    '23505',
  );

  // The weighting is part of the Activity and does not outlive it.
  await pool.query(`DELETE FROM activities WHERE id = $1`, [id]);
  const survivors = await pool.query(
    `SELECT count(*)::int AS n FROM activity_clo_mapping WHERE activity_id = $1`,
    [id],
  );
  assert.equal(survivors.rows[0].n, 0);
});

test('re-marking a student updates the mark rather than adding one', async () => {
  const ids = await section('marks');
  const id = await activity(ids);

  // activityScoreModel's own ON CONFLICT clause, run verbatim. A missing or
  // differently-columned unique constraint raises 42P10 rather than a duplicate
  // -key error, so this checks the constraint's column list and not merely that
  // duplicates are refused somewhere.
  const upsert = `INSERT INTO activity_scores (student_id, activity_id, clo_id, score)
                  VALUES ($1, $2, $3, $4)
                  ON CONFLICT (student_id, activity_id, clo_id)
                  DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_TIMESTAMP
                  RETURNING score_id`;
  const first = await pool.query(upsert, [ids.student, id, ids.clo, 12.5]);
  const again = await pool.query(upsert, [ids.student, id, ids.clo, 18]);
  assert.equal(again.rows[0].score_id, first.rows[0].score_id);

  const { rows } = await pool.query(
    `SELECT score FROM activity_scores WHERE student_id = $1 AND activity_id = $2`,
    [ids.student, id],
  );
  assert.deepEqual(rows, [{ score: '18.00' }]);
});

test('a mark carries the CLO it was given against', async () => {
  const ids = await section('marksclo');
  const id = await activity(ids);

  // R072, and the reason the upsert above works. A nullable clo_id would let
  // two marks with no CLO both insert, and the upsert would quietly stop being
  // one.
  assert.equal(
    await errorCode(
      `INSERT INTO activity_scores (student_id, activity_id, clo_id, score) VALUES ($1, $2, NULL, 5)`,
      [ids.student, id],
    ),
    '23502',
  );

  await pool.query(
    `INSERT INTO activity_scores (student_id, activity_id, clo_id, score) VALUES ($1, $2, $3, 5)`,
    [ids.student, id, ids.clo],
  );

  // Marks are part of the Activity and go with it.
  await pool.query(`DELETE FROM activities WHERE id = $1`, [id]);
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM activity_scores WHERE activity_id = $1`,
    [id],
  );
  assert.equal(rows[0].n, 0);
});

test('evidence is soft-deleted, keeps its file metadata and survives its uploader', async () => {
  const ids = await section('evidence');
  const id = await activity(ids);

  const created = await pool.query(
    `INSERT INTO activity_evidence
       (section_id, activity_id, evidence_type, description, file_name, file_path, mime_type, file_size, uploaded_by)
     VALUES ($1, $2, 'exam_paper', 'ข้อสอบกลางภาค', 'midterm.pdf', '/uploads/midterm.pdf',
             'application/pdf', 204800, $3)
     RETURNING evidence_id, is_deleted`,
    [ids.section, id, ids.user],
  );
  assert.equal(created.rows[0].is_deleted, false);
  const evidenceId = created.rows[0].evidence_id;

  await pool.query(`UPDATE activity_evidence SET is_deleted = true WHERE evidence_id = $1`, [
    evidenceId,
  ]);

  // Soft-deleted, so the row and the file it points at are both still there for
  // an accreditation review to be shown.
  const { rows } = await pool.query(
    `SELECT file_name, file_path, mime_type, file_size, is_deleted FROM activity_evidence
      WHERE evidence_id = $1`,
    [evidenceId],
  );
  assert.deepEqual(rows, [
    {
      file_name: 'midterm.pdf',
      file_path: '/uploads/midterm.pdf',
      mime_type: 'application/pdf',
      file_size: 204800,
      is_deleted: true,
    },
  ]);

  await pool.query(`DELETE FROM users WHERE user_id = $1`, [ids.user]);
  const orphaned = await pool.query(
    `SELECT uploaded_by, file_name FROM activity_evidence WHERE evidence_id = $1`,
    [evidenceId],
  );
  assert.equal(orphaned.rows[0].uploaded_by, null);
  assert.equal(orphaned.rows[0].file_name, 'midterm.pdf');
});

test('deleting an Activity takes everything hanging off it, in one statement', async () => {
  const ids = await section('actdel');
  const id = await activity(ids);

  await pool.query(
    `INSERT INTO activity_clo_mapping (activity_id, sequence_order, clo_id, weight, score_ratio_id)
     VALUES ($1, 1, $2, 100, $3)`,
    [id, ids.clo, ids.ratio],
  );
  await pool.query(
    `INSERT INTO activity_scores (student_id, activity_id, clo_id, score) VALUES ($1, $2, $3, 7)`,
    [ids.student, id, ids.clo],
  );
  await pool.query(
    `INSERT INTO activity_evidence (section_id, activity_id, file_name, file_path)
     VALUES ($1, $2, 'report.pdf', '/uploads/report.pdf')`,
    [ids.section, id],
  );

  // deleteActivity issues exactly this, with no cleanup before it, so all three
  // children have to go together. A RESTRICT on any one of them - evidence was
  // the one that had it - turns the endpoint into a 500 the moment an Activity
  // has been marked or has a file against it.
  await pool.query(`DELETE FROM activities WHERE id = $1`, [id]);

  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM activity_clo_mapping WHERE activity_id = $1)::int AS mappings,
            (SELECT count(*) FROM activity_scores     WHERE activity_id = $1)::int AS scores,
            (SELECT count(*) FROM activity_evidence   WHERE activity_id = $1)::int AS evidence`,
    [id],
  );
  assert.deepEqual(rows, [{ mappings: 0, scores: 0, evidence: 0 }]);
});

test('the log holds on to the student it is about', async () => {
  const ids = await section('logstud');

  const group = await pool.query(
    `INSERT INTO student_group (section_id, group_name) VALUES ($1, 'กลุ่ม 1') RETURNING group_id`,
    [ids.section],
  );
  await pool.query(
    `INSERT INTO student_group_change_log
       (section_id, group_id, group_name, student_id, action_type, new_group_id, performed_by)
     VALUES ($1, $2, 'กลุ่ม 1', $3, 'ADD_STUDENT', $2, $4)`,
    [ids.section, group.rows[0].group_id, ids.student, ids.user],
  );

  // Which student an entry is about is the fact being recorded, so unlike the
  // group columns it is a real foreign key, and unlike performed_by it does not
  // give the student up. Students are soft-deleted, so this never blocks a
  // deletion the application performs.
  assert.equal(
    await errorCode(`DELETE FROM student WHERE student_id = $1`, [ids.student]),
    '23503',
  );

  // performed_by is authorship, and follows 0001's rule for it.
  await pool.query(`DELETE FROM users WHERE user_id = $1`, [ids.user]);
  const { rows } = await pool.query(
    `SELECT student_id, performed_by FROM student_group_change_log WHERE section_id = $1`,
    [ids.section],
  );
  assert.deepEqual(rows, [{ student_id: ids.student, performed_by: null }]);
});

test('a rubric code names one rubric across the institution', async () => {
  const ids = await section('rubcode');
  const other = await baseFixtures(pool, 'rubother');

  await pool.query(
    `INSERT INTO rubrics (rubric_code, rubric_name_en, rubric_name_th, program_id, created_by)
     VALUES ('RB-PRES', 'Presentation', 'การนำเสนอ', $1, $2)`,
    [ids.program, ids.user],
  );

  // Unlike a section number or a CLO code, this is not scoped to its programme:
  // findRubricByCode looks a rubric up by the code alone, with no programme in
  // hand, so a second programme reusing the code would resolve to whichever row
  // was found first.
  assert.equal(
    await errorCode(
      `INSERT INTO rubrics (rubric_code, rubric_name_en, rubric_name_th, program_id)
       VALUES ('RB-PRES', 'Presentation', 'การนำเสนอ', $1)`,
      [other.program],
    ),
    '23505',
  );
});

test('a rubric criterion carries a weight and all four levels, and goes with its rubric', async () => {
  const ids = await section('rubdetail');
  const rubric = await pool.query(
    `INSERT INTO rubrics (rubric_code, rubric_name_en, rubric_name_th, program_id, created_by)
     VALUES ('RB-REP', 'Report', 'รายงาน', $1, $2) RETURNING id`,
    [ids.program, ids.user],
  );
  const rubricId = rubric.rows[0].id;

  const created = await pool.query(
    `INSERT INTO rubric_details
       (rubric_id, criteria_name_en, criteria_name_th,
        level_4_description, level_3_description, level_2_description, level_1_description,
        display_order, created_by)
     VALUES ($1, 'Clarity', 'ความชัดเจน', 'ดีเยี่ยม', 'ดี', 'พอใช้', 'ต้องปรับปรุง', 1, $2)
     RETURNING weight, display_order`,
    [rubricId, ids.user],
  );
  assert.equal(created.rows[0].weight, '1.00');

  const { rows } = await pool.query(
    `SELECT level_4_description, level_3_description, level_2_description, level_1_description
       FROM rubric_details WHERE rubric_id = $1`,
    [rubricId],
  );
  assert.deepEqual(rows, [
    {
      level_4_description: 'ดีเยี่ยม',
      level_3_description: 'ดี',
      level_2_description: 'พอใช้',
      level_1_description: 'ต้องปรับปรุง',
    },
  ]);

  // The criteria are parts of the rubric and do not outlive it.
  await pool.query(`DELETE FROM rubrics WHERE id = $1`, [rubricId]);
  const survivors = await pool.query(
    `SELECT count(*)::int AS n FROM rubric_details WHERE rubric_id = $1`,
    [rubricId],
  );
  assert.equal(survivors.rows[0].n, 0);
});

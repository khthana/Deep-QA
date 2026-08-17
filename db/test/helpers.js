'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { dropSchema } = require('../reset');

/**
 * A scratch directory holding the .sql files a single test wants applied.
 * `files` is an object of { filename: sql }.
 *
 * Removed by `cleanupMigrationsDirs()`, which the test files call from a final
 * `t.after` - not from a process exit hook, so a crashed run leaves the files
 * where they can be read.
 */
const scratchDirs = [];

function migrationsDirWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deep-core-migrations-'));
  scratchDirs.push(dir);
  for (const [name, sql] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), sql, 'utf8');
  }
  return dir;
}

function cleanupMigrationsDirs() {
  while (scratchDirs.length > 0) {
    fs.rmSync(scratchDirs.pop(), { recursive: true, force: true });
  }
}

/**
 * A schema name unique to one test in one run.
 *
 * The pid is what makes it per-run rather than per-test-name: `node --test`
 * gives each test file its own process, so two runs - or two files using the
 * same label - never share a schema. Ticket #7's harness needs the same
 * property for the whole suite, and this is the shape it should copy.
 *
 * The name still says where it came from, so a schema left behind by a run
 * that died mid-test is identifiable rather than mysterious. Tests drop their
 * own schema in `t.after`, which runs whether the test passed or failed.
 */
function testSchema(label) {
  return `test_${label}_${process.pid}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 63);
}

/**
 * One faculty, department, programme, subject, role and user, all suffixed so
 * each test's fixtures are its own. Returns the suffix-built identifiers.
 *
 * Every migration from 0002 onwards hangs off these six rows, so the builder
 * lives here rather than in one test file.
 *
 * Keep the tag to nine characters: a code is varchar(10) and carries a
 * one-letter prefix.
 *
 * The subject is the exception and is not built from the tag at all. A subject
 * code is a fixed eight-digit format with no room for a prefix, so each call
 * takes the next code in a counted series, shaped like the real thing. The
 * counter is per-process, and `node --test` gives each file its own process.
 */
let nextSubject = 0;

async function baseFixtures(pool, tag) {
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

/** The SQLSTATE of a query that is expected to fail. */
async function errorCodeOf(pool, sql, params = []) {
  try {
    await pool.query(sql, params);
  } catch (error) {
    return error.code;
  }
  throw new Error(`expected ${sql} to be rejected`);
}

module.exports = {
  migrationsDirWith,
  cleanupMigrationsDirs,
  testSchema,
  dropSchema,
  baseFixtures,
  errorCodeOf,
};

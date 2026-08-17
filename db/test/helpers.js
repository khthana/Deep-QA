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

module.exports = { migrationsDirWith, cleanupMigrationsDirs, testSchema, dropSchema };

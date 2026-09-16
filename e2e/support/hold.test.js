'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createPool } = require('../../db/pool');
const { dropSchema } = require('../../db/reset');
const { hold } = require('./hold');

/**
 * What puts a spec's world back — #134.
 *
 * Against a real database, in a schema of its own, and not against a fake:
 * everything `hold` has to get right is something the database decides — the
 * order foreign keys allow, an identity column that refuses a value, a
 * generated column that refuses any, a cascade that takes rows nobody named.
 * `leftovers.test.js` is the file that learned what a fake written from the
 * code cannot express (#132).
 *
 * The schema is small and shaped after the cases in `deep_core_e2e` that make
 * the job hard, not after its tables: a parent and a RESTRICT child, a second
 * reference from that child that is set to null rather than followed, a
 * self-referencing tree that cascades, a composite key beside a generated
 * column, and a log that points at a parent and is told to be left alone.
 */

const SCHEMA = `test_hold_${process.pid}`;

const DDL = `
  CREATE TABLE parent (code text PRIMARY KEY, opened date, weight numeric(5,2));
  CREATE TABLE child (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_code text NOT NULL REFERENCES parent (code) ON DELETE RESTRICT,
    sponsor_code text REFERENCES parent (code) ON DELETE SET NULL,
    note text,
    at timestamptz,
    settings jsonb,
    ok boolean
  );
  CREATE TABLE tree (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id integer REFERENCES tree (id) ON DELETE CASCADE,
    label text NOT NULL
  );
  CREATE TABLE person (
    first text, last text,
    full_name text GENERATED ALWAYS AS (first || ' ' || last) STORED,
    PRIMARY KEY (first, last)
  );
  CREATE TABLE journal (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_code text NOT NULL REFERENCES parent (code) ON DELETE CASCADE,
    what text
  );

  INSERT INTO parent VALUES ('A', '2024-02-29', 1.50), ('B', NULL, NULL);
  INSERT INTO child (parent_code, sponsor_code, note, at, settings, ok) VALUES
    ('A', 'B', 'first', '2024-01-01 23:30:00.123456+07', '{"a": [1, 2]}', true),
    ('B', NULL, NULL, NULL, NULL, NULL);
  INSERT INTO tree (parent_id, label) VALUES (NULL, 'root');
  INSERT INTO tree (parent_id, label) VALUES (1, 'branch');
  INSERT INTO tree (parent_id, label) VALUES (2, 'leaf');
  INSERT INTO person (first, last) VALUES ('สมหญิง', 'เรียนดี');
  INSERT INTO journal (parent_code, what) VALUES ('A', 'seeded');
`;

/** Every row of every table, as text, in a stable order. */
async function contents(db) {
  const out = {};
  for (const table of ['parent', 'child', 'tree', 'person', 'journal']) {
    const { rows } = await db.query(`SELECT t::text AS row FROM ${table} t ORDER BY 1`);
    out[table] = rows.map(row => row.row);
  }
  return out;
}

async function world(t) {
  await dropSchema(SCHEMA);
  const admin = createPool({ schema: 'public' });
  await admin.query(`CREATE SCHEMA "${SCHEMA}"`);
  await admin.end();
  const db = createPool({ schema: SCHEMA });
  await db.query(DDL);
  t.after(async () => {
    await db.end();
    await dropSchema(SCHEMA);
  });
  return db;
}

const holding = () => hold({ schema: SCHEMA, except: ['journal'] });

test('rows that appeared are taken out, a twig before its branch', async t => {
  const db = await world(t);
  const before = await contents(db);
  const release = await holding();

  await db.query(`INSERT INTO parent VALUES ('C', '2025-01-01', 3)`);
  await db.query(`INSERT INTO child (parent_code, note) VALUES ('C', 'new')`);
  // A new branch (4) and a twig on it (5), under RESTRICT: tried in key order,
  // the branch comes first and the database refuses it until the twig is gone.
  await db.query(`INSERT INTO tree (parent_id, label) VALUES (1, 'new branch')`);
  await db.query(`INSERT INTO tree (parent_id, label) VALUES (4, 'twig')`);
  await db.query(`ALTER TABLE tree DROP CONSTRAINT tree_parent_id_fkey`);
  await db.query(`ALTER TABLE tree ADD FOREIGN KEY (parent_id) REFERENCES tree (id) ON DELETE RESTRICT`);
  await release();

  assert.deepEqual(await contents(db), before);
});

test('rows that went are put back as they were, ids and all, a parent before its child', async t => {
  const db = await world(t);
  const before = await contents(db);
  const release = await holding();

  // The root cascades to its branch and leaf: three rows go and one was named.
  await db.query(`DELETE FROM tree WHERE label = 'root'`);
  await db.query(`DELETE FROM child`);
  await db.query(`DELETE FROM parent WHERE code = 'B'`);
  await release();

  assert.deepEqual(await contents(db), before);
});

test('a row that went out with a removed row, by cascade, is put back as it was', async t => {
  const db = await world(t);
  const before = await contents(db);
  const release = await holding();

  // The seeded leaf moves under a branch this file adds. Taking the branch out
  // cascades into the leaf, which was there before the file and has to be there
  // after it - with the parent it had then, not the one it was moved to.
  await db.query(`INSERT INTO tree (parent_id, label) VALUES (1, 'new branch')`);
  await db.query(`UPDATE tree SET parent_id = 4 WHERE label = 'leaf'`);
  await release();

  assert.deepEqual(await contents(db), before);
});

test('a generated column is left for the database to generate', async t => {
  const db = await world(t);
  const before = await contents(db);
  const release = await holding();

  await db.query(`DELETE FROM person`);
  await release();

  assert.deepEqual(await contents(db), before);
});

test('both directions at once, in one table and across two', async t => {
  const db = await world(t);
  const before = await contents(db);
  const release = await holding();

  await db.query(`DELETE FROM child WHERE parent_code = 'B'`);
  await db.query(`DELETE FROM parent WHERE code = 'B'`);
  await db.query(`INSERT INTO parent VALUES ('D', NULL, NULL)`);
  await db.query(`INSERT INTO child (parent_code) VALUES ('D')`);
  await release();

  assert.deepEqual(await contents(db), before);
});

test('a table it is told to leave alone is left alone', async t => {
  const db = await world(t);
  const release = await holding();

  await db.query(`INSERT INTO journal (parent_code, what) VALUES ('A', 'during')`);
  await release();

  const { rows } = await db.query(`SELECT what FROM journal ORDER BY id`);
  assert.deepEqual(rows.map(row => row.what), ['seeded', 'during']);
});

test('a row it cannot take out fails the release with the database’s own reason', async t => {
  const db = await world(t);
  const release = await holding();

  // A new parent that the left-alone journal now points at: taking the parent
  // out would cascade into a table `hold` was told not to touch.
  await db.query(`INSERT INTO parent VALUES ('E', NULL, NULL)`);
  await db.query(`INSERT INTO child (parent_code) VALUES ('E')`);
  await db.query(`ALTER TABLE journal DROP CONSTRAINT journal_parent_code_fkey`);
  await db.query(
    `ALTER TABLE journal ADD FOREIGN KEY (parent_code) REFERENCES parent (code) ON DELETE RESTRICT`,
  );
  await db.query(`INSERT INTO journal (parent_code, what) VALUES ('E', 'pins it')`);

  await assert.rejects(release(), /parent/);
  // And nothing half-done: the child it could have taken out is still there.
  const { rows } = await db.query(`SELECT count(*)::int AS n FROM child WHERE parent_code = 'E'`);
  assert.equal(rows[0].n, 1);
});

test('a table with no primary key is refused before anything is remembered', async t => {
  const db = await world(t);
  await db.query(`CREATE TABLE loose (x integer)`);

  await assert.rejects(hold({ schema: SCHEMA, except: ['journal'] }), /loose/);
});

test('nothing changed, nothing changes', async t => {
  const db = await world(t);
  const before = await contents(db);
  const release = await holding();

  await release();

  assert.deepEqual(await contents(db), before);
});

test('a row that stayed under its key and changed underneath it is put back', async t => {
  const db = await world(t);
  const before = await contents(db);
  const release = await holding();

  // Every kind of value the schema holds, rewritten in place: a number, a date,
  // a string, a timestamp, a document and a boolean. None of these rows moved
  // key, so until #137 nothing measured them and nothing put them back.
  await db.query(`UPDATE parent SET weight = 9.99, opened = '2025-12-31' WHERE code = 'A'`);
  await db.query(`UPDATE child SET note = 'rewritten', at = now(),
                     settings = '{"a": []}', ok = false WHERE note = 'first'`);
  await db.query(`UPDATE tree SET label = 'renamed' WHERE label = 'branch'`);
  await release();

  assert.deepEqual(await contents(db), before);
});

test('a row a cascade rewrote rather than removed is put back', async t => {
  const db = await world(t);
  const before = await contents(db);
  const release = await holding();

  // The seeded child is sponsored by 'B'. The file points it at a parent of its
  // own, and taking that parent out sets the column to null rather than taking
  // the child with it - the half of a cascade #134 left, because nothing
  // measured a row that stayed.
  await db.query(`INSERT INTO parent VALUES ('C', NULL, NULL)`);
  await db.query(`UPDATE child SET sponsor_code = 'C' WHERE sponsor_code = 'B'`);
  await release();

  assert.deepEqual(await contents(db), before);
});

test('a row the file changed and changed back is left alone', async t => {
  const db = await world(t);
  const before = await contents(db);
  const release = await holding();

  await db.query(`UPDATE parent SET weight = 9.99 WHERE code = 'A'`);
  await db.query(`UPDATE parent SET weight = 1.50 WHERE code = 'A'`);
  await release();

  assert.deepEqual(await contents(db), before);
});

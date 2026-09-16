'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createPool } = require('../../db/pool');
const { dropSchema } = require('../../db/reset');
const { snapshot, differences, report } = require('./leftovers');

/**
 * The instrument that measures what a run leaves behind — #132.
 *
 * `mutation/harness_test.py` is the precedent: a tool that measures is a claim
 * like any other, and a tool nobody broke on purpose is a tool nobody has seen
 * fail. These run against a fake database rather than a real one, because what
 * is at risk here is the comparison, not the SQL: a snapshot that silently
 * returned nothing would make every run report *the schema is as the seed made
 * it*, which is the most expensive wrong answer this file can give.
 *
 * A fake written from the code can only express what the code expects, which
 * is how the one real defect this file has had got past eight green rows: the
 * catalogue hands back `{student_id,section_id}` as a **string** unless the
 * query casts, and the fake had been handing over arrays because that is what
 * `snapshot` wanted. Two of the rows below are that defect, made expressible.
 *
 * That is also why the last row reads a real schema. What a snapshot is made of
 * is now two things the driver hands back rather than one — the key as a list
 * and the row as an object (#137) — and what shape those arrive in is the
 * driver's answer, which no fake here can be asked.
 */

/** The schema name these rows read; a real one, because `snapshot` checks it. */
const SCHEMA = 'pretend_schema';

/**
 * A database that answers the two queries `snapshot` asks, and nothing else.
 *
 * The row query asks for two things the table does not have — the key as a list
 * and the row as an object — so that neither can collide with a column's own
 * name, and this builds both the way the SQL does.
 */
const fake = tables => ({
  async query(text, values) {
    if (text.includes('information_schema.tables')) {
      assert.equal(values[0], SCHEMA);
      return {
        rows: Object.entries(tables).map(([table, spec]) => ({
          table_name: table,
          key: spec.key,
        })),
      };
    }
    const table = new RegExp(`FROM "${SCHEMA}"\\."([^"]+)"`).exec(text)[1];
    const { key, rows } = tables[table];
    return {
      rows: rows.map(row => ({ key: key.map(name => String(row[name])), row })),
    };
  },
});

const ONE_TABLE = {
  student: { key: ['student_id'], rows: [{ student_id: '1' }, { student_id: '2' }] },
};

/** The key as `snapshot` writes it, so the rows below state one, not build one. */
const key = (...values) => JSON.stringify(values);

test('a row that was not there is reported as added', async () => {
  const before = await snapshot(fake(ONE_TABLE), SCHEMA);
  const after = await snapshot(
    fake({
      student: {
        key: ['student_id'],
        rows: [{ student_id: '1' }, { student_id: '2' }, { student_id: '3' }],
      },
    }),
    SCHEMA,
  );

  assert.deepEqual(differences(before, after), [
    { table: 'student', added: [key('3')], removed: [], changed: [] },
  ]);
});

test('a seeded row a spec deleted is reported as removed', async () => {
  // The half the ticket did not ask about and the measurement found: a spec
  // that removes a seeded row changes the next file's world exactly as much as
  // one that adds. `rubric_details` came back three rows short.
  const before = await snapshot(fake(ONE_TABLE), SCHEMA);
  const after = await snapshot(
    fake({ student: { key: ['student_id'], rows: [{ student_id: '1' }] } }),
    SCHEMA,
  );

  assert.deepEqual(differences(before, after), [
    { table: 'student', added: [], removed: [key('2')], changed: [] },
  ]);
});

test('a table nothing touched is not reported at all', async () => {
  const before = await snapshot(fake(ONE_TABLE), SCHEMA);
  const after = await snapshot(fake(ONE_TABLE), SCHEMA);
  assert.deepEqual(differences(before, after), []);
});

test('a composite key is compared whole, not column by column', async () => {
  // `student_course` is keyed on (student_id, section_id). Moving one student
  // from one section to another leaves both columns' values still present in
  // the table, so a comparison that looked at either column alone would report
  // nothing moved.
  const enrolled = sections => ({
    student_course: {
      key: ['student_id', 'section_id'],
      rows: sections.map(([student_id, section_id]) => ({ student_id, section_id })),
    },
  });
  const before = await snapshot(fake(enrolled([['1', 'a'], ['2', 'b']])), SCHEMA);
  const after = await snapshot(fake(enrolled([['1', 'b'], ['2', 'a']])), SCHEMA);

  assert.deepEqual(differences(before, after), [
    {
      table: 'student_course',
      added: [key('1', 'b'), key('2', 'a')],
      removed: [key('1', 'a'), key('2', 'b')],
      changed: [],
    },
  ]);
});

test('a table with no primary key is said to be unread, not skipped', async () => {
  // #123: a tool that cannot say what it did not look at is the same species
  // as the hand-kept numbers it checks.
  const shape = { audit: { key: null, rows: [] } };
  const before = await snapshot(fake(shape), SCHEMA);
  const after = await snapshot(fake(shape), SCHEMA);

  assert.deepEqual(differences(before, after), [
    { table: 'audit', unreadable: 'no primary key' },
  ]);
});

test('a table a migration added mid-run is reported rather than ignored', async () => {
  const before = await snapshot(fake(ONE_TABLE), SCHEMA);
  const after = await snapshot(
    fake({ ...ONE_TABLE, arrivals: { key: ['id'], rows: [] } }),
    SCHEMA,
  );

  assert.deepEqual(differences(before, after), [
    { table: 'arrivals', unreadable: 'appeared' },
  ]);
});

test('the report says how many tables it looked at, not only what moved', async () => {
  const before = await snapshot(fake(ONE_TABLE), SCHEMA);
  const after = await snapshot(fake(ONE_TABLE), SCHEMA);
  const lines = report(before, after, differences(before, after)).join('\n');

  assert.match(lines, /1 tables checked, 0 moved/);
  assert.match(lines, /the run left the schema as the seed made it/);
});

test('a schema that held no tables is not reported as a tidy run', async () => {
  // The difference between *nothing moved* and *nothing was read*. A schema
  // named wrongly, or read before it was migrated, compares nothing against
  // nothing and would otherwise print the reassuring sentence above.
  const before = await snapshot(fake({}), SCHEMA);
  const after = await snapshot(fake({}), SCHEMA);
  const lines = report(before, after, differences(before, after)).join('\n');

  assert.match(lines, /0 tables checked, 0 moved/);
  assert.match(lines, /nothing here is a measurement/);
  assert.doesNotMatch(lines, /the run left the schema as the seed made it/);
});

test('a long list of keys says how many it did not print', async () => {
  const many = count => ({
    user_log: {
      key: ['id'],
      rows: Array.from({ length: count }, (unused, index) => ({ id: String(index) })),
    },
  });
  const before = await snapshot(fake(many(0)), SCHEMA);
  const after = await snapshot(fake(many(30)), SCHEMA);
  const lines = report(before, after, differences(before, after)).join('\n');

  assert.match(lines, /user_log: \+30 -0 ~0 \(net \+30\)/);
  assert.match(lines, /… and 22 more/);
});

test('a key the catalogue describes as a string stops the instrument', async () => {
  // The defect that got past the first eight rows. Without the `::text` cast,
  // node-postgres has no parser for an array of `name` and hands back the
  // literal `{student_id,section_id}`; read as a list of columns that is a
  // list of characters, and every key in the schema becomes nonsense quietly.
  const raw = {
    student_course: { key: '{student_id,section_id}', rows: [] },
  };

  await assert.rejects(() => snapshot(fake(raw), SCHEMA), {
    message: /student_course's key as string/,
  });
});

test('a schema name that is not one is refused before it reaches the SQL', async () => {
  // Nothing user-facing reaches this call site, and the validator is shared
  // with every other place that splices a schema into a string for the reason
  // `db/pool.js` gives: cheaper than auditing each one later.
  await assert.rejects(() => snapshot(fake(ONE_TABLE), 'not a schema"; drop'), {
    message: /E2E_SCHEMA is not a usable schema name/,
  });
});

test('a table nobody could read does not raise the count of tables that moved', async () => {
  // "N moved" is the number a reader uses to decide whether a run was tidy. A
  // table with no primary key has not moved; it has not been read, which is a
  // different sentence and must not be able to raise that one.
  const shape = { ...ONE_TABLE, audit: { key: null, rows: [] } };
  const before = await snapshot(fake(shape), SCHEMA);
  const after = await snapshot(fake(shape), SCHEMA);
  const lines = report(before, after, differences(before, after)).join('\n');

  assert.match(lines, /2 tables checked, 0 moved, 1 not compared/);
  assert.match(lines, /audit: not compared \(no primary key\)/);
});

test('a row that stayed but whose values changed is reported as changed', async () => {
  // #137. Until this row existed both instruments compared keys alone, so a
  // spec that rewrote a seeded row — a weight, a name, a status — left a
  // schema the report called untouched and `hold` put back as it found it.
  const scored = points => ({
    activity: { key: ['id'], rows: [{ id: '1', name: 'งานเดี่ยว', points }] },
  });
  const before = await snapshot(fake(scored('10')), SCHEMA);
  const after = await snapshot(fake(scored('20')), SCHEMA);

  assert.deepEqual(differences(before, after), [
    { table: 'activity', added: [], removed: [], changed: [{ key: key('1'), columns: ['points'] }] },
  ]);
});

test('a changed row says which columns moved, not only that one did', async () => {
  // Which column is what decides the fix: a `name` a spec rewrote is a
  // leftover, an `updated_at` that moves whenever anything is written is a
  // column to exclude with a reason (#137's third and fourth criteria).
  const before = await snapshot(
    fake({ activity: { key: ['id'], rows: [{ id: '1', name: 'ก', at: 'noon' }] } }),
    SCHEMA,
  );
  const after = await snapshot(
    fake({ activity: { key: ['id'], rows: [{ id: '1', name: 'ข', at: 'night' }] } }),
    SCHEMA,
  );
  const lines = report(before, after, differences(before, after)).join('\n');

  assert.match(lines, /activity: \+0 -0 ~1 \(net 0\)/);
  assert.match(lines, /changed 1 \(name, at\)/);
});

test('a table where only values moved is a table that moved', async () => {
  // The count in the first line is what a reader uses to decide whether a run
  // was tidy, so a table whose rows only changed has to raise it.
  const before = await snapshot(
    fake({ activity: { key: ['id'], rows: [{ id: '1', points: '10' }] } }),
    SCHEMA,
  );
  const after = await snapshot(
    fake({ activity: { key: ['id'], rows: [{ id: '1', points: '20' }] } }),
    SCHEMA,
  );
  const lines = report(before, after, differences(before, after)).join('\n');

  assert.match(lines, /1 tables checked, 1 moved/);
  assert.doesNotMatch(lines, /the run left the schema as the seed made it/);
});

test('a row that was replaced key and all is not also counted as changed', async () => {
  // Added and removed are about keys, changed is about the rows a key names in
  // both snapshots; a row whose key moved is one of the first two and never
  // both, or the same write would be reported twice.
  const before = await snapshot(
    fake({ activity: { key: ['id'], rows: [{ id: '1', points: '10' }] } }),
    SCHEMA,
  );
  const after = await snapshot(
    fake({ activity: { key: ['id'], rows: [{ id: '2', points: '20' }] } }),
    SCHEMA,
  );

  assert.deepEqual(differences(before, after), [
    { table: 'activity', added: [key('2')], removed: [key('1')], changed: [] },
  ]);
});

test('a table of changed rows says which columns moved, over all of them', async () => {
  // The keys are printed eight at a time, so on a table where two hundred rows
  // moved they cannot answer the question the census is for: whether what moved
  // is a column with meaning or a stamp that follows every write (#137).
  const grid = (marks, when) => ({
    activity_scores: {
      key: ['id'],
      rows: Array.from({ length: 12 }, (unused, index) => ({
        id: String(index),
        score: index < marks ? '9' : '5',
        updated_at: when,
      })),
    },
  });
  const before = await snapshot(fake(grid(0, 'noon')), SCHEMA);
  const after = await snapshot(fake(grid(3, 'night')), SCHEMA);
  const lines = report(before, after, differences(before, after)).join('\n');

  assert.match(lines, /activity_scores: \+0 -0 ~12 \(net 0\)/);
  assert.match(lines, /columns updated_at \(12\), score \(3\)/);
});

/** A schema of its own, for the one row that asks the database rather than a fake. */
const REAL = `test_leftovers_${process.pid}`;

test('the driver hands back a key to read and a row to compare, against a real schema', async t => {
  await dropSchema(REAL);
  const admin = createPool({ schema: 'public' });
  await admin.query(`CREATE SCHEMA "${REAL}"`);
  await admin.end();
  const db = createPool({ schema: REAL });
  t.after(async () => {
    await db.end();
    await dropSchema(REAL);
  });

  // A composite key, because that is the shape the driver got wrong before, and
  // columns whose text is not their value: a timestamp, a numeric and a jsonb.
  await db.query(`
    CREATE TABLE weight (
      program_code text, subject_code text,
      share numeric(5,2), settings jsonb, at timestamptz,
      PRIMARY KEY (program_code, subject_code)
    );
    INSERT INTO weight VALUES
      ('0501', '01019801', 12.50, '{"a": [1, 2]}', '2024-01-01 23:30:00.123456+07'),
      ('0501', '01019802', 87.50, NULL, NULL);
  `);

  const before = await snapshot(db, REAL);
  assert.deepEqual([...before.rows.get('weight').keys()].sort(), [
    key('0501', '01019801'),
    key('0501', '01019802'),
  ]);

  await db.query(`UPDATE weight SET share = 20 WHERE subject_code = '01019801'`);

  const after = await snapshot(db, REAL);
  assert.deepEqual(differences(before, after), [
    {
      table: 'weight',
      added: [],
      removed: [],
      changed: [{ key: key('0501', '01019801'), columns: ['share'] }],
    },
  ]);
});

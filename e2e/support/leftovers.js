'use strict';

const { createPool, schemaName } = require('../../db/pool');

/**
 * What a run leaves behind — #132.
 *
 * Every spec in this suite shares one schema and they run in order
 * (`workers: 1`, `fullyParallel: false`), so the rows one file writes are part
 * of the world the next file is handed. A spec written today by running it on
 * its own meets a different database in the full suite, and #129's two new
 * rows met exactly that: the first draft asserted the picker opened on 2563,
 * and in the full suite it was 2561.
 *
 * The schema is dropped and reseeded at the start of every run, so nothing
 * here is about a database going stale between runs. It is about the drift
 * **inside** one run, which nothing measured until this existed.
 *
 * This module measures it. It takes a snapshot of every row right after the
 * seed, another when the run ends, and prints what moved three ways —
 * insertions, deletions **and** rewrites, because a spec that removes a seeded
 * row, or edits one where it stands, changes the next file's world exactly as
 * much as one that adds. The third of those arrived with #137: until then both
 * this and `hold.js` compared keys alone, so a row that kept its key and
 * changed its values was a leftover nothing could see. A rewritten row names
 * the columns that moved, and a table of them is counted by column as well,
 * because what decides the fix is whether it is a value somebody typed or an
 * `updated_at` following a write.
 *
 * Three things it will not do, said here rather than left to be discovered:
 *
 * - **It reports; it does not fail the run.** The instrument it is modelled on
 *   is `mutation/anchors.py`, which also only counts and is read by a person.
 *   A guard that failed would need a list of what is allowed to move, and a
 *   hand-kept list in a suite that grows every ticket is already wrong (#123).
 * - **It says what moved, not which file moved it.** Playwright's reporter
 *   hooks are not awaited, so a snapshot cannot be taken at a file boundary
 *   without every spec importing a shared fixture. The keys it prints are
 *   where a grep starts and not where it ends — `07` under `departments` is
 *   written in `14b`, and `Z0` beside it is `57a` making rows in bulk to have
 *   something to page. To attribute a table properly, run that spec **on its
 *   own**: `globalSetup` drops and reseeds on every invocation, so a
 *   single-file run reports that file's leftovers and nobody else's.
 * - **It asks the catalogue for its tables and their keys**, never a list kept
 *   here, so a table added by a migration is measured the day it exists rather
 *   than the day somebody remembers this file. It prints how many tables it
 *   looked at for the same reason (#123) — and it refuses to say *nothing
 *   moved* when what it read was nothing at all.
 */

/** The primary key columns of every base table in a schema, from the catalogue. */
async function primaryKeys(db, schema) {
  const { rows } = await db.query(
    `SELECT t.table_name,
            -- Cast to text rather than leaving attname's own "name" type:
            -- node-postgres has no parser for an array of it, and hands back
            -- the literal string {student_id,section_id} instead of an array.
            (SELECT array_agg(a.attname::text ORDER BY k.ord)
               FROM pg_constraint c
               JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(att, ord) ON true
               JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.att
              WHERE c.contype = 'p'
                AND c.conrelid = format('%I.%I', t.table_schema, t.table_name)::regclass
            ) AS key
       FROM information_schema.tables t
      WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name`,
    [schema],
  );
  return rows.map(row => {
    // The cast above is a claim about what the driver hands back, and a claim
    // about a driver is worth one line to check: a string here would be read
    // character by character and every key in the schema would be nonsense,
    // quietly. The first version of this file did exactly that.
    if (row.key !== null && !Array.isArray(row.key)) {
      throw new Error(
        `the catalogue described ${row.table_name}'s key as ${typeof row.key} ` +
          `(${JSON.stringify(row.key)}) rather than a list of columns`,
      );
    }
    return { table: row.table_name, key: row.key };
  });
}

/**
 * Every row, by primary key, per table.
 *
 * A key is the JSON of its column values, so a composite key is compared whole
 * and cannot collide with a different pair — there is no separator byte to
 * choose, and no claim to make about what a column can hold.
 *
 * The row beside it is the whole row as `jsonb`, which is what lets a row that
 * stayed be compared with itself (#137). Both are asked for under names of this
 * file's choosing rather than the table's columns, so neither can be shadowed
 * by a column that happens to be called the same thing.
 *
 * A table with no primary key cannot be compared row by row and is carried as
 * `null` rather than skipped, so the report can say it was seen and not read.
 */
async function snapshot(db, schema) {
  const named = schemaName(schema, 'E2E_SCHEMA');
  const tables = await primaryKeys(db, named);
  const rows = new Map();
  for (const { table, key } of tables) {
    if (!key) {
      rows.set(table, null);
      continue;
    }
    const keyColumns = key.map(name => `t."${name}"::text`).join(', ');
    const { rows: found } = await db.query(
      `SELECT to_json(ARRAY[${keyColumns}]) AS key, to_jsonb(t) AS row
         FROM "${named}"."${table}" t`,
    );
    rows.set(table, new Map(found.map(row => [JSON.stringify(row.key), row.row])));
  }
  return { schema: named, rows };
}

/** The columns two readings of one row disagree about, in the row's own order. */
function rewrittenColumns(was, is) {
  const columns = new Set([...Object.keys(was), ...Object.keys(is)]);
  return [...columns].filter(
    column => JSON.stringify(was[column]) !== JSON.stringify(is[column]),
  );
}

/**
 * What is in `after` and not `before`, the other way round, and what stayed
 * under its key and changed underneath it, per table.
 */
function differences(before, after) {
  const names = new Set([...before.rows.keys(), ...after.rows.keys()]);
  const out = [];
  for (const table of [...names].sort()) {
    const was = before.rows.get(table);
    const is = after.rows.get(table);
    if (was === undefined || is === undefined) {
      out.push({ table, unreadable: was === undefined ? 'appeared' : 'disappeared' });
      continue;
    }
    if (was === null || is === null) {
      out.push({ table, unreadable: 'no primary key' });
      continue;
    }
    const added = [...is.keys()].filter(key => !was.has(key));
    const removed = [...was.keys()].filter(key => !is.has(key));
    // Only the keys both snapshots hold: a row whose key moved is already one
    // of the two above, and counting it here as well would report one write
    // twice.
    const changed = [];
    for (const [key, row] of was) {
      if (!is.has(key)) continue;
      const columns = rewrittenColumns(row, is.get(key));
      if (columns.length) changed.push({ key, columns });
    }
    if (added.length || removed.length || changed.length) {
      out.push({ table, added, removed, changed });
    }
  }
  return out;
}

/** How many keys of each direction the report prints before it counts the rest. */
const SHOWN = 8;

/** `["0501","01019801"]` reads as `0501/01019801`. */
const readable = key => JSON.parse(key).join('/');

const listed = (marked, list, say) => {
  const shown = list.slice(0, SHOWN).map(say);
  const rest = list.length - shown.length;
  return `      ${marked} ${shown.join(', ')}${rest > 0 ? ` … and ${rest} more` : ''}`;
};

const keys = (marked, list) => listed(marked, list, readable);

/** A changed row reads as its key and the columns that moved under it. */
const rewritten = list =>
  listed('changed', list, entry => `${readable(entry.key)} (${entry.columns.join(', ')})`);

/**
 * The columns of a table's changed rows, each with how many rows it moved in.
 *
 * Only eight keys are printed, so on a table where two hundred rows moved the
 * keys cannot answer the question the census is for — whether what moved is a
 * column somebody wrote or a stamp that follows every write. This counts over
 * all of them, commonest first.
 */
const columnTally = list => {
  const counted = new Map();
  for (const entry of list) {
    for (const column of entry.columns) counted.set(column, (counted.get(column) || 0) + 1);
  }
  const sorted = [...counted].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return `      columns ${sorted.map(([column, rows]) => `${column} (${rows})`).join(', ')}`;
};

/** The report, as lines. Says what it looked at, not only what it found. */
function report(before, after, moved) {
  const seen = before.rows.size;
  // A table that could not be compared is counted apart from the ones that
  // moved, because it is not an answer: it is the absence of one. Folding the
  // two together would let a table nobody could read raise the number a reader
  // uses to decide whether the run was tidy.
  const unread = moved.filter(entry => entry.unreadable);
  const changed = moved.length - unread.length;
  const lines = [
    '',
    `leftovers (#132): ${seen} tables checked, ${changed} moved` +
      (unread.length ? `, ${unread.length} not compared` : ''),
  ];
  if (seen === 0) {
    // Not the same sentence as "nothing moved", and deliberately so. A schema
    // that was named wrongly, or read before it was migrated, has nothing to
    // compare and would otherwise be reported as the tidiest run there has
    // ever been — the most expensive wrong answer this file can give.
    lines.push('  no tables were read, so nothing here is a measurement', '');
    return lines;
  }
  if (moved.length === 0) {
    lines.push('  the run left the schema as the seed made it');
  }
  for (const entry of moved) {
    if (entry.unreadable) {
      lines.push(`  ${entry.table}: not compared (${entry.unreadable})`);
      continue;
    }
    const delta = entry.added.length - entry.removed.length;
    lines.push(
      `  ${entry.table}: +${entry.added.length} -${entry.removed.length}` +
        ` ~${entry.changed.length} (net ${delta > 0 ? '+' : ''}${delta})`,
    );
    if (entry.added.length) lines.push(keys('added  ', entry.added));
    if (entry.removed.length) lines.push(keys('removed', entry.removed));
    if (entry.changed.length) {
      lines.push(rewritten(entry.changed), columnTally(entry.changed));
    }
  }
  if (moved.length) {
    lines.push(
      '  a key above is where a grep starts; run that spec alone to see what it leaves.',
      '  this reports; it does not fail the run — e2e/support/leftovers.js says why.',
    );
  }
  lines.push('');
  return lines;
}

/** Opens a pool, reads the schema with it, and closes it again. */
async function read(schema) {
  const db = createPool({ schema: 'public' });
  try {
    return await snapshot(db, schema);
  } finally {
    await db.end();
  }
}

/**
 * Snapshot now, and hand back the function that reports against it.
 *
 * Used by `global-setup.js`: the snapshot is taken with the seed still the only
 * thing in the schema, and the returned function is what Playwright calls when
 * the run is over. Each snapshot opens and closes its own pool rather than one
 * being held across the run — a connection kept open for the length of a suite
 * to save a millisecond is a connection to explain when a run hangs.
 */
async function watch(schema) {
  const before = await read(schema);

  return async function tell(print = console.log) {
    const after = await read(schema);
    for (const line of report(before, after, differences(before, after))) print(line);
  };
}

module.exports = { snapshot, differences, report, watch };

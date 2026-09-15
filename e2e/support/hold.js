'use strict';

const { createPool, schemaName } = require('../../db/pool');
const { E2E_SCHEMA } = require('./env');

/**
 * Remembers the schema, and hands back what puts it back — #134.
 *
 * Every spec shares one schema and they run in order, so what a file leaves is
 * the world the next file is handed (#132). `leftovers.js` measures that at the
 * end of a run; this is the other half, used by the files that measurement
 * named:
 *
 * ```js
 * let release;
 * test.beforeAll(async () => { release = await hold(); });
 * test.afterAll(() => release());
 * ```
 *
 * Declared before any other `beforeAll` that writes: what it remembers is the
 * schema at the moment it runs.
 *
 * **It asks the catalogue for the tables, and remembers all of them.** A spec
 * that named the tables it touches would be a hand-kept list in a file whose
 * importer can change under it — #132's `holdRegister`, which this replaced in
 * `17b` and `17c`, gave that reason for remembering the register rather than a
 * list of codes, and the same reason reaches one level up: a list of tables is
 * right until the route behind the screen writes to one more.
 *
 * What it puts back, and what it does not:
 *
 * - **Rows that appeared are taken out, and rows that went are put back** —
 *   by primary key, the same comparison `leftovers.js` prints, so a file this
 *   holds reports nothing there. A row put back carries every value it had,
 *   read and written as text so nothing is reinterpreted on the way, and its
 *   own identity value (`OVERRIDING SYSTEM VALUE`); a generated column is left
 *   for the database to generate, because it refuses to be given one.
 * - **A row that stayed but changed is not put back.** The report cannot see
 *   one either, and a restore nothing measures is a restore that breaks
 *   silently (#134's second criterion).
 * - **The order is the database's.** Foreign keys decide which row can go
 *   before which, including a table that points at itself, and rather than
 *   reading them into a plan this tries each row, and a row refused by a
 *   foreign key waits for the next pass. A pass that moves nothing ends it,
 *   with the database's own sentence for the row that could not go. All of it
 *   is one transaction, so a release that fails has changed nothing.
 * - **`except` is left alone; a table named there carries its reason.** The default is
 *   `user_log`: it is the product recording what the spec did, and #134 set it
 *   apart as a decision rather than a leftover. This never deletes from it,
 *   but a row taken out can still cascade into it — `user_log` follows a
 *   deleted account — and that is the schema's rule, not this file's.
 * - **A cascade is followed where it removes, not where it rewrites.** A
 *   remembered row a removal takes with it is put back, because what went is
 *   read after the removals. A `SET NULL` rewrites a row instead, and a
 *   rewritten row is a changed row, above.
 *
 * A table with no primary key cannot be compared row by row, so it is refused
 * when the snapshot is taken rather than skipped: skipping it would be the
 * silent half of a promise to put the schema back.
 */

/** Tables, their key columns, their writable columns, and whether any is `GENERATED ALWAYS AS IDENTITY`. */
async function tablesOf(db, schema) {
  const { rows } = await db.query(
    `SELECT c.relname AS table_name,
            (SELECT array_agg(a.attname::text ORDER BY k.ord)
               FROM pg_constraint p
               JOIN LATERAL unnest(p.conkey) WITH ORDINALITY AS k(att, ord) ON true
               JOIN pg_attribute a ON a.attrelid = p.conrelid AND a.attnum = k.att
              WHERE p.contype = 'p' AND p.conrelid = c.oid) AS key,
            (SELECT array_agg(a.attname::text ORDER BY a.attnum)
               FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
                AND a.attgenerated = '') AS columns,
            EXISTS (SELECT 1 FROM pg_attribute a
                     WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
                       AND a.attidentity = 'a') AS always_identity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1 AND c.relkind IN ('r', 'p')
      ORDER BY c.relname`,
    [schema],
  );
  return rows;
}

const quote = name => `"${name.replace(/"/g, '""')}"`;

/**
 * Every row of one table, each value as text, keyed by the JSON of its key.
 *
 * In key order, so the order rows are tried in is the same on every run.
 */
async function rowsOf(db, schema, { table_name: table, key, columns }) {
  const { rows } = await db.query(
    `SELECT ${columns.map(c => `${quote(c)}::text AS ${quote(c)}`).join(', ')}
       FROM ${quote(schema)}.${quote(table)}
      ORDER BY ${key.map(quote).join(', ')}`,
  );
  return new Map(rows.map(row => [JSON.stringify(key.map(c => row[c])), row]));
}

/**
 * Runs each statement until none is left, retrying those a foreign key refused.
 *
 * Each try sits in its own savepoint, so a refused one leaves the transaction
 * usable. Only a foreign key refusal (23503) is a reason to wait; anything else
 * is a real error and ends the release at once.
 */
async function untilSettled(client, statements) {
  let pending = statements;
  while (pending.length) {
    const refused = [];
    let lastRefusal;
    for (const statement of pending) {
      await client.query('SAVEPOINT hold_row');
      try {
        await client.query(statement.text, statement.values);
        await client.query('RELEASE SAVEPOINT hold_row');
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT hold_row');
        if (error.code !== '23503') throw error;
        refused.push(statement);
        lastRefusal = error;
      }
    }
    if (refused.length === pending.length) {
      throw new Error(
        `hold could not put the schema back: ${refused.length} row(s) refused every time, ` +
          `the last because ${lastRefusal.message}`,
      );
    }
    pending = refused;
  }
}

async function hold({ schema = E2E_SCHEMA, except = ['user_log'] } = {}) {
  const named = schemaName(schema, 'E2E_SCHEMA');
  const db = createPool({ schema: named });

  let tables;
  const before = new Map();
  try {
    tables = (await tablesOf(db, named)).filter(t => !except.includes(t.table_name));
    const keyless = tables.filter(t => !t.key).map(t => t.table_name);
    if (keyless.length) {
      throw new Error(
        `hold cannot compare ${keyless.join(', ')} row by row: no primary key. ` +
          `Name it in except, with the reason, or give it a key.`,
      );
    }
    for (const table of tables) before.set(table.table_name, await rowsOf(db, named, table));
  } finally {
    await db.end();
  }

  return async function release() {
    const pool = createPool({ schema: named });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const removals = [];
      for (const table of tables) {
        const was = before.get(table.table_name);
        const where = table.key.map((c, i) => `${quote(c)}::text = $${i + 1}`).join(' AND ');
        for (const [key, row] of await rowsOf(client, named, table)) {
          if (was.has(key)) continue;
          removals.push({
            text: `DELETE FROM ${quote(named)}.${quote(table.table_name)} WHERE ${where}`,
            values: table.key.map(c => row[c]),
          });
        }
      }
      // Out before in: a row put back may share a unique value with a row that
      // replaced it, and the replacement has to be gone first.
      await untilSettled(client, removals);

      // And what went is read after the removals, not before them: a row the
      // file moved under one it added is taken out with it by a cascade, and it
      // was there before the file as much as any row a spec deleted.
      const restores = [];
      for (const table of tables) {
        const is = await rowsOf(client, named, table);
        for (const [key, row] of before.get(table.table_name)) {
          if (is.has(key)) continue;
          restores.push({
            text:
              `INSERT INTO ${quote(named)}.${quote(table.table_name)} ` +
              `(${table.columns.map(quote).join(', ')}) ` +
              (table.always_identity ? 'OVERRIDING SYSTEM VALUE ' : '') +
              `VALUES (${table.columns.map((_, i) => `$${i + 1}`).join(', ')})`,
            values: table.columns.map(c => row[c]),
          });
        }
      }
      await untilSettled(client, restores);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  };
}

module.exports = { hold };

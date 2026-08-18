'use strict';

/**
 * The spreadsheet import, once — ticket #14.
 *
 * #11 built an import for accounts and #14 needs the same thing for
 * departments, and the ten screens after it need it again. What those imports
 * differ in is small and local: which columns a row has, what makes a row
 * valid, and what inserting one means. What they share is the whole of the
 * awkward part, and it is awkward in ways that are easy to get subtly wrong the
 * second time - so it is written here once and called, rather than copied.
 *
 * The shared part is four decisions.
 *
 * *Nothing partially applied.* One transaction. Every row is judged, every
 * failure is collected with the line it is on, and a single failure anywhere
 * rolls the whole thing back. The person fixes their file and uploads it again
 * rather than working out which half of it took.
 *
 * *A row at a time inside a savepoint.* A row colliding with something already
 * in the table poisons the transaction, and without the savepoint the very next
 * statement fails with 25P02 - so the report would name the first collision and
 * stop, and a file with three of them would take three uploads to fix.
 *
 * *Duplicates within the file.* Two rows claiming the same key are each
 * individually fine and together are not, and the database would catch that as
 * a 23505 naming a constraint rather than a line. They are found here, where
 * the line numbers are, and the message says which earlier line it collides
 * with.
 *
 * *The report is sorted by line.* Failures are found in three passes - reading,
 * checking, writing - so they arrive out of order, and a report that jumps
 * about is a report the reader has to sort themselves.
 *
 * What this deliberately does *not* do is answer the request. It returns data
 * and the route shapes the body, because the bodies differ - `users` returns
 * the accounts it created under a key of that name - and a helper that owned
 * the response would have to grow a parameter for every screen's spelling.
 */

const { formatCsv, parseTable } = require('./csv');
const { REFUSALS } = require('../auth/refusals');

/**
 * Read a spreadsheet and apply it, or refuse the whole of it.
 *
 * - `readRow(record)` judges one row on its own. Returns `{ ok: true, draft }`
 *   or `{ ok: false, reason }`, where `reason` is a key of REFUSALS. `draft` is
 *   opaque - whatever the caller wants to hand its own `insert` - because an
 *   account's draft is values *and* the grant to make with them, and a
 *   department's is just values.
 * - `keys` are the fields that must not repeat within the file:
 *   `{ of: draft => …, message: REFUSALS.… }`. A null or undefined `of` is
 *   skipped, so an optional column does not collide with every other blank.
 * - `verify(draft)` is the check that needs the database or the caller's
 *   authority - is this scope yours, is this grant yours to make. Returns a
 *   REFUSALS key to refuse the row, or null to keep it. Optional.
 * - `insert(client, draft)` writes one row inside the transaction. Returns
 *   `{ ok: true, row }` or `{ ok: false, reason }`.
 * - `onCommit(client)` runs once, inside the transaction, after every row has
 *   been written and before COMMIT. Where an audit line belongs. Optional.
 *
 * Answers `{ ok: true, created: [row] }`, or `{ ok: false, empty: true }` for a
 * file with no rows in it, or `{ ok: false, errors: [{ line, message }] }`.
 */
async function importRows(pool, text, { readRow, keys = [], verify, insert, onCommit }) {
  const { records } = parseTable(typeof text === 'string' ? text : '');
  if (records.length === 0) return { ok: false, empty: true };

  const errors = [];
  const drafts = [];
  const seen = keys.map(() => new Map());

  for (const record of records) {
    const read = await readRow(record);
    if (!read.ok) {
      errors.push({ line: record.line, message: REFUSALS[read.reason] });
      continue;
    }
    const { draft } = read;

    let repeated = false;
    for (const [index, key] of keys.entries()) {
      const value = key.of(draft);
      if (value === null || value === undefined) continue;
      const first = seen[index].get(value);
      if (first) {
        errors.push({ line: record.line, message: `${key.message} (ซ้ำกับบรรทัดที่ ${first})` });
        repeated = true;
        break;
      }
    }
    if (repeated) continue;
    // Recorded only once the row is past every key, so a row refused on its
    // second key is not remembered as the first holder of its first one.
    for (const [index, key] of keys.entries()) {
      const value = key.of(draft);
      if (value !== null && value !== undefined) seen[index].set(value, record.line);
    }

    const refusal = verify ? await verify(draft) : null;
    if (refusal) {
      errors.push({ line: record.line, message: REFUSALS[refusal] });
      continue;
    }

    drafts.push({ line: record.line, draft });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const { line, draft } of drafts) {
      await client.query('SAVEPOINT row');
      const result = await insert(client, draft);
      if (result.ok) {
        await client.query('RELEASE SAVEPOINT row');
        created.push(result.row);
      } else {
        await client.query('ROLLBACK TO SAVEPOINT row');
        errors.push({ line, message: REFUSALS[result.reason] });
      }
    }

    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return { ok: false, errors: errors.sort((a, b) => a.line - b.line) };
    }

    if (onCommit) await onCommit(client);
    await client.query('COMMIT');
    return { ok: true, created };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * The other half of the pattern: the blank file the screen offers to download.
 *
 * Headers and one example row, because a template of headers alone leaves the
 * person guessing at the formats - and `Content-Disposition`, because the point
 * is a file on their disk with a name they recognise rather than a page of
 * commas in a tab.
 */
function sendTemplate(res, filename, columns, example) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(formatCsv(columns, example ? [example] : []));
}

module.exports = { importRows, sendTemplate };

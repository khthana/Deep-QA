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
 * `importRows` still stops short of answering the request: it returns data and
 * the caller decides what to do with it. What answering the request looks like
 * is `sendImport` below, which #59 added once four routes had written the same
 * eleven lines out. The guess made here at #14 - that a helper owning the
 * response "would have to grow a parameter for every screen's spelling" - was
 * wrong by three parameters: the bodies differ in one key and nothing else.
 */

const { formatCsv, parseTable } = require('./csv');
const { REFUSALS } = require('../auth/refusals');

/**
 * What a refusing hook said, whichever way it said it.
 *
 * A `reason` is looked up; a `message` is already the sentence. Nothing else
 * is accepted, so a hook that returns `{ reason: 'typo' }` reports `undefined`
 * rather than silently reporting nothing at all — which is what a bare
 * `REFUSALS[reason]` did, and is a mistake worth keeping visible.
 */
const sentenceOf = (refusal) =>
  typeof refusal === 'string' ? REFUSALS[refusal] : (refusal.message ?? REFUSALS[refusal.reason]);

/**
 * Read a spreadsheet and apply it, or refuse the whole of it.
 *
 * Three of the hooks refuse a row, and each may do it in either of two ways: a
 * `reason` naming a key of REFUSALS, or a `message` that is the sentence
 * itself. The second exists for #26 and for the reason `whole` already returned
 * a sentence rather than a key — a refusal that has to name the group somebody
 * is already in, or the group that is full, is one sentence with a hole in it
 * and cannot be a constant. `sentenceOf` below is where the two meet, so no
 * hook has to know which kind it is handing back.
 *
 * - `readRow(record)` judges one row on its own. Returns `{ ok: true, draft }`
 *   or `{ ok: false, reason }`, where `reason` is a key of REFUSALS. `draft` is
 *   opaque - whatever the caller wants to hand its own `insert` - because an
 *   account's draft is values *and* the grant to make with them, and a
 *   department's is just values.
 * - `required` are the header cells `readRow` cannot do without - the columns
 *   every row of a correct file has to carry. Not the template's whole list:
 *   `csv.js` keeps unknown headers on purpose, and an optional column that a
 *   person deleted from their file imported before #56 and still does. What
 *   this catches is the file that is not this template at all.
 * - `keys` are the fields that must not repeat within the file:
 *   `{ of: draft => …, message: REFUSALS.… }`. A null or undefined `of` is
 *   skipped, so an optional column does not collide with every other blank.
 * - `verify(draft)` is the check that needs the database or the caller's
 *   authority - is this scope yours, is this grant yours to make. Returns a
 *   REFUSALS key, or `{ message }` for a sentence that names a value, to refuse
 *   the row - or null to keep it. Optional.
 * - `whole(drafts)` is the check that is about the file rather than any row of
 *   it - #30's weights totalling one hundred is the first, and BR-11 will be
 *   the second. Runs only when every row read clean, because a per-row report
 *   outranks a sum the bad rows would falsify. Returns the refusal *sentence*
 *   rather than a REFUSALS key - the sentence carries a computed value, which
 *   is the reason the rule cannot be a row's - or null to proceed. Optional.
 * - `insert(client, draft)` writes one row inside the transaction. Returns
 *   `{ ok: true, row }`, or `{ ok: false, reason }`, or `{ ok: false, message }`
 *   where the sentence names a value the key could not carry.
 * - `onCommit(client)` runs once, inside the transaction, after every row has
 *   been written and before COMMIT. Where an audit line belongs - and, since
 *   #30, where a replace-style import removes what the file no longer names:
 *   returning `{ ok: false, message }` rolls the whole import back and refuses
 *   with that sentence. Any other return value commits as before. Optional.
 *
 * Answers `{ ok: true, created: [row] }`, or `{ ok: false, empty: true }` for a
 * file with no rows in it, or `{ ok: false, wrongTemplate: true }` for a file
 * whose header is some other screen's, or `{ ok: false, errors: [{ line,
 * message }] }`, or `{ ok: false, message }` from `whole` or a refusing
 * `onCommit`.
 */
async function importRows(
  pool,
  text,
  { readRow, required = [], keys = [], verify, whole, insert, onCommit },
) {
  const { headers, records } = parseTable(typeof text === 'string' ? text : '');
  if (records.length === 0) return { ok: false, empty: true };

  // #56. Asked before any row is read, and after the empty check: a body with
  // nothing in it has no header either, and answering that with "wrong
  // template" would tell somebody who uploaded a blank file to go and download
  // a different one. A header missing a column every row needs is not a file
  // with bad rows in it - it is the wrong file, and the per-row report that
  // used to come back named every line of a file whose data was fine.
  if (required.some((column) => !headers.includes(column))) {
    return { ok: false, wrongTemplate: true };
  }

  const errors = [];
  const drafts = [];
  const seen = keys.map(() => new Map());

  for (const record of records) {
    const read = await readRow(record);
    if (!read.ok) {
      errors.push({ line: record.line, message: sentenceOf(read) });
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
      errors.push({ line: record.line, message: sentenceOf(refusal) });
      continue;
    }

    drafts.push({ line: record.line, draft });
  }

  if (errors.length === 0 && whole) {
    const message = await whole(drafts.map(({ draft }) => draft));
    if (message) return { ok: false, message };
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
        errors.push({ line, message: sentenceOf(result) });
      }
    }

    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return { ok: false, errors: errors.sort((a, b) => a.line - b.line) };
    }

    if (onCommit) {
      const outcome = await onCommit(client);
      if (outcome && outcome.ok === false) {
        await client.query('ROLLBACK');
        return { ok: false, message: outcome.message };
      }
    }
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
 * The answer to an import, once - ticket #59.
 *
 * Four routes had written this out identically: the two refusals with their
 * `created: 0`, the success with its count and its empty `errors`. The bodies
 * differ in the name of one key - `users`, `departments`, `programs`,
 * `subjects` - which is why it is a parameter and why the rest is not.
 *
 * The order of the two refusals matters. `importRows` reports an empty file as
 * `{ ok: false, empty: true }`, so an empty file is also a failure, and asking
 * `!result.ok` first would answer every empty upload with the wrong message and
 * an undefined `errors`. `empty` is asked first for that reason, and #56's `wrongTemplate` is asked
 * second for the same one: both are failures, and both carry no `errors`.
 * `ImportPanel` reads that - a refusal with no rows on it is handed to the
 * screen's own banner rather than drawn as a report with an empty table.
 */
function sendImport(res, result, key) {
  if (result.empty) {
    return res.status(400).json({ message: REFUSALS.importEmpty, errors: [], created: 0 });
  }
  if (result.wrongTemplate) {
    return res
      .status(400)
      .json({ message: REFUSALS.importWrongTemplate, errors: [], created: 0 });
  }
  // A whole-file refusal - `whole`, or a refusing `onCommit` - carries its own
  // sentence and no rows, and it is asked before the per-row branch for the
  // reason `empty` is: `errors` is undefined on it, not a report.
  if (!result.ok && result.message) {
    return res.status(400).json({ message: result.message, errors: [], created: 0 });
  }
  if (!result.ok) {
    return res
      .status(400)
      .json({ message: REFUSALS.importRejected, errors: result.errors, created: 0 });
  }
  return res
    .status(201)
    .json({ created: result.created.length, [key]: result.created, errors: [] });
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

module.exports = { importRows, sendImport, sendTemplate };

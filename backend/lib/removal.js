'use strict';

const { isReferenced } = require('./fields');

/**
 * "Delete it, or switch it off if something depends on it" — extracted at the
 * second copy, #18.
 *
 * Every screen that maintains master data has the same removal criterion, in
 * the same words: a record nothing points at is destroyed, and a record
 * something points at is deactivated instead, so the marks and the history
 * beneath it survive. #16 wrote it for `subjects` and #18 needs it, unchanged,
 * for `program_subjects` - and #19 onwards will need it again for every table
 * that is referenced by the one below it.
 *
 * What is shared is the whole of the awkward part, and it is awkward in a way
 * that is easy to get subtly wrong the second time. The DELETE has to be
 * attempted rather than predicted - `ON DELETE RESTRICT` is what decides, so a
 * reference added by a later migration is covered on the day it is added, where
 * a hand-written "is anything pointing at this" check would silently stop being
 * true. A failed DELETE poisons the connection, so the attempt sits inside a
 * savepoint and the UPDATE that follows runs after a rollback to it, on the
 * same transaction, with the row still there.
 *
 * What differs between callers is three statements and nothing else, so those
 * are the parameters. Each is handed the client the transaction is on; none of
 * them may commit or roll back, because that is this function's job.
 *
 * - `remove(client)` deletes the row.
 * - `deactivate(client)` switches it off.
 * - `load(client)` reads it back as the route wants to answer it.
 *
 * Answers `{ deleted: true }`, or `{ row }` for the one that was switched off,
 * or `{ missing: true }` if it was not there to read back afterwards - which is
 * a row another request removed between the route's own check and this call.
 */
async function deleteOrDeactivate(pool, { remove, deactivate, load }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SAVEPOINT attempt');
    try {
      await remove(client);
      await client.query('COMMIT');
      return { deleted: true };
    } catch (error) {
      if (!isReferenced(error)) throw error;
      await client.query('ROLLBACK TO SAVEPOINT attempt');
    }

    await deactivate(client);
    const row = await load(client);
    await client.query('COMMIT');
    return row ? { row } : { missing: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { deleteOrDeactivate };

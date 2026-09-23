'use strict';

/**
 * What the listener checks before it binds a port - #159.
 *
 * A migration that nobody applied to the database a server is pointed at does
 * not announce itself. The schema is a version behind, every route that does
 * not touch the new column works, and the one that does fails in a way that
 * reads as a bug in that screen. Neither test seam can see it: the backend
 * suite migrates the schema it creates, and the browser seam migrates its own
 * in `global-setup`, so both are always level with the directory by
 * construction. The only place the question can be asked is a process starting
 * against a database somebody else looks after.
 *
 * The verdict is separated from the asking because it is the part with three
 * answers and no database. `pendingMigrations` reports whether the ledger could
 * be read at all, and the difference between "behind" and "could not ask" is
 * the whole design: one is fixed by running the migrations and the other is not
 * fixed by anything this process can suggest.
 */

const { pendingMigrations } = require('../db/migrate');

/** Named once, so the refusal and this file's prose cannot drift apart. */
const APPLY_THEM = 'cd db && npm run migrate';

/** The value that turns the check off - see `checkMigrations`. */
const OFF = 'off';

/**
 * What a report means for a process that is about to listen: whether to carry
 * on, and what to say first.
 *
 * `{ start, message }`, where a `message` of `null` means there is nothing
 * worth saying - a schema level with the directory is the ordinary case and
 * does not deserve a line of log. The three answers are not tagged with a
 * fourth field naming them, because `server.js` would then have two ways of
 * asking the same question and only one of them could be shown to be the one
 * it obeys.
 */
function migrationVerdict(report) {
  if (!report.asked) {
    return {
      start: true,
      message:
        `Could not read the migration ledger: ${report.reason}\n` +
        'Starting anyway, but nothing here knows whether this database is up to ' +
        'date. This says the check failed; it does not say the schema is fine.',
    };
  }

  if (report.pending.length === 0) return { start: true, message: null };

  const names = report.pending.map((filename) => `  ${filename}`).join('\n');

  return {
    start: false,
    message:
      `The database is behind by ${report.pending.length} migration(s):\n${names}\n` +
      `Apply them with:  ${APPLY_THEM}`,
  };
}

/**
 * The verdict for the database this process is configured for.
 *
 * `MIGRATION_CHECK=off` skips it, and the browser seam is why it exists. The
 * Playwright config starts this server as a `webServer`, and Playwright runs
 * `webServer` before `globalSetup` - which is where that suite drops, migrates
 * and seeds its schema. The schema a boot check would read there is last run's,
 * replaced moments later by the one the tests actually use, so the check cannot
 * answer a question about the right database and would refuse to start the
 * whole suite on the day a migration is added. A harness that owns its schema
 * outright says so here rather than being second-guessed at boot.
 */
async function checkMigrations() {
  if (process.env.MIGRATION_CHECK === OFF) {
    return { start: true, message: `Migration check skipped: MIGRATION_CHECK=${OFF}.` };
  }

  try {
    return migrationVerdict(await pendingMigrations({}));
  } catch (error) {
    // Reaching for something that is not there - an unset DB_SCHEMA, a
    // missing migrations directory - is one more way of being unable to ask,
    // and a check must not be more fatal than the thing it was checking. A
    // server that genuinely cannot run for the same reason still dies a line
    // later, with the error that says so.
    return migrationVerdict({ asked: false, reason: error.message });
  }
}

module.exports = { migrationVerdict, checkMigrations };

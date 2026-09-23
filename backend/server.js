'use strict';

/**
 * The listener: the half of the inherited index.js that binds a port, and the
 * only file in the tree that does. It creates the pool the application runs
 * on, hands it over, and starts serving - the same port and the same
 * environment banner the inherited entry point printed.
 *
 * Nothing requires this file. That is the point: `require('./app')` from a test
 * cannot start a server.
 *
 * Since #159 one thing happens before the port is bound: the migration ledger
 * of the database this process is configured for is compared with
 * `db/migrations`. A schema that is behind stops the boot, because the failure
 * it causes otherwise is silent and lands on whoever next uses the screen. The
 * policy - including what happens when the ledger cannot be read at all - is
 * `startup.js`; this file only obeys it.
 */

const { createPool } = require('../db/pool');

const { createApp } = require('./app');
const { checkMigrations } = require('./startup');

async function main() {
  const verdict = await checkMigrations();

  if (!verdict.start) {
    console.error(verdict.message);
    process.exit(1);
  }

  if (verdict.message) console.warn(verdict.message);

  const pool = createPool({});
  const app = createApp({ pool });

  const port = process.env.PORT || 3000;

  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });

  // The pool holds open connections, so without this a stopped container or a
  // Ctrl-C leaves the process alive until the socket timeout.
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => {
        pool.end().then(() => process.exit(0));
      });
    });
  }
}

// Everything the check can fail at is a verdict by the time it gets here, so
// what is left is a failure to build a server at all - a variable that is not
// set, a port taken before listen was reached. Those get a stack, and the
// explicit exit rather than an unhandled rejection, which is the one way this
// file could still end without saying anything.
main().catch((error) => {
  console.error(error);
  process.exit(1);
});

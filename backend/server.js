'use strict';

/**
 * The listener: the half of the inherited index.js that binds a port, and the
 * only file in the tree that does. It creates the pool the application runs
 * on, hands it over, and starts serving - the same port and the same
 * environment banner the inherited entry point printed.
 *
 * Nothing requires this file. That is the point: `require('./app')` from a test
 * cannot start a server.
 */

const { createPool } = require('../db/pool');

const { createApp } = require('./app');

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

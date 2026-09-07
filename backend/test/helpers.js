'use strict';

/**
 * The test harness for the backend's one seam: the HTTP surface, exercised
 * in-process against a real PostgreSQL. docs/06's Testing Decisions settle the
 * shape - no stubbed database, no stubbed sign-in, and no second seam beneath
 * this one.
 *
 * db/ is required across the directory boundary by relative path rather than
 * copied. The migration runner, the pool and its search_path construction are
 * the database package's job, and a second copy of any of them here would be a
 * copy that can drift from the schema it is supposed to describe. The
 * dependency runs one way only: backend reads db, never the reverse.
 */

const express = require('express');
const cookieParser = require('cookie-parser');

const { migrate } = require('../../db/migrate');
const { seed } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { dropSchema } = require('../../db/reset');
const { testSchema } = require('../../db/test/helpers');

const { createApp } = require('../app');

/**
 * A migrated schema of this test file's own, a pool pointed at it, and the
 * application built on that pool.
 *
 * This is how the ticket's "dedicated schema, leaving development data
 * untouched" and "reset and re-seed between test files" are both answered, and
 * there is no reset step anywhere because none is needed: `node --test` gives
 * each test file its own process, `testSchema` suffixes the name with the pid,
 * and so every file starts against a schema that has just been created and
 * migrated and that no other file can see. Development data is untouched
 * because DB_SCHEMA is never opened.
 *
 * The label says which file the schema belongs to, so one left behind by a run
 * that died mid-test can be identified rather than guessed at.
 *
 * `withSeed` fills the fresh schema with the acceptance dataset before the app
 * is built. It is opt-in rather than the default because most scenarios are
 * better built from test/fixtures - a few rows a test can name - and because
 * seeding costs a couple of seconds of bcrypt per file. Sign-in is the case
 * that needs it: docs/06 forbids stubbing authentication, so a test signs in
 * as one of the eleven named accounts, which have to be there.
 */
async function startApi(label, { withSeed = false } = {}) {
  const schema = testSchema(`api_${label}`);
  await migrate({ schema });
  if (withSeed) await seed({ schema });

  const pool = createPool({ schema });
  const app = createApp({ pool });

  return {
    app,
    pool,
    schema,
    /** Call from `t.after`, which runs whether the test passed or failed. */
    async close() {
      await pool.end();
      await dropSchema(schema);
    },
  };
}

/**
 * A minimal application carrying nothing but the middleware under test.
 *
 * The guards #9 delivers have no routes to sit in front of yet - the endpoints
 * they will protect belong to the tickets that build them - so the way to
 * exercise one over real HTTP is to give it a route of its own. Two paths, the
 * second naming a target, because a scope guard needs a record to be asked
 * about; the handler echoes back what the middleware put on the request, so a
 * test can assert both that the call was allowed and what it was allowed as.
 *
 * The stand-in is the only thing here that a shipped route would not do. It
 * stubs no authentication: a test still signs in against the real application
 * and sends the cookie it was given.
 */
function guardedApp(...middleware) {
  const app = express();
  app.use(cookieParser());

  const answer = (req, res) =>
    res.json({
      userId: req.session?.userId ?? null,
      roles: req.auth?.roles?.map((grant) => grant.role_id) ?? null,
      scopes: req.auth?.roles?.map((grant) => grant.scope_id) ?? null,
    });

  app.get('/guarded', ...middleware, answer);
  app.get('/guarded/:target', ...middleware, answer);

  return app;
}

/**
 * The order #96 says a list of ผลการเรียนรู้ reads in, stated here in
 * JavaScript so that a test asserting it is not asking the route to confirm
 * itself.
 *
 * Four tests used to build their expected order with a copy of the route's own
 * `ORDER BY c.clo_number`, which compares a rule against itself and passes
 * whatever that rule becomes. They now sort with this instead. Note what it
 * still cannot do: on the seeded `CLO-1..CLO-9` — nine single-digit codes —
 * ordering as text and ordering as a number give the same nine rows, so these
 * four rows would pass under either rule today. What they buy is the day the
 * data is not nine single digits. The rows that actually **discriminate** are
 * the one in `clos.test.js` that brings CLO-10 with it, the browser row, and
 * the mutant on `lib/cloOrder.js`, which is the single place the rule now
 * lives.
 *
 * The sweep of 7 ก.ย. 2569 says exactly that, so the paragraph above is a
 * measurement now rather than a prediction: `ordersastext` — the defect itself
 * — kills **one** subtest of 703, the one in `clos.test.js`, and these four sit
 * among the 702 that pass. `descending` kills **nine**, and these four are in
 * it. So what they buy is not nothing and it is not the ordering rule either:
 * **they hold the direction, and the day the data stops being nine single
 * digits they will hold the rest.**
 */
const inCloOrder = (codes) =>
  [...codes].sort((left, right) => {
    const digits = (code) => (String(code).match(/\d+/g) ?? []).join('');
    const byText = () => (left < right ? -1 : left > right ? 1 : 0);
    const [rawLeft, rawRight] = [digits(left), digits(right)];

    // No digits at all is the `NULLIF` case, and the fragment says NULLS LAST.
    if (rawLeft === '' || rawRight === '') {
      if (rawLeft === rawRight) return byText();
      return rawLeft === '' ? 1 : -1;
    }

    // Leading zeros are not part of a numeric value, and this line is why:
    // without it `CLO-01` and `CLO-1` compare by digit-count and this helper
    // puts `CLO-01` last, while `::numeric` reads them as equal and lets the
    // text tiebreak put it first. Two rules that agree on the seeded data and
    // disagree on a code nobody has typed yet is the worst shape a helper like
    // this can have — it would fail a route that is right. Comparing the
    // stripped digits by length and then lexicographically is exact at any
    // width, which `Number` stops being past 2^53 and `clo_number` is
    // `varchar(50)`.
    const [a, b] = [rawLeft.replace(/^0+/, ''), rawRight.replace(/^0+/, '')];
    if (a.length !== b.length) return a.length - b.length;
    if (a !== b) return a < b ? -1 : 1;
    return byText();
  });

module.exports = { startApi, guardedApp, inCloOrder };

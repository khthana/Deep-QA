'use strict';

/**
 * Ticket #7's smoke test: the seam itself, end to end.
 *
 * It proves what the rest of the rebuild's backend tests are going to assume -
 * that a request can be issued to the application in this process, that the
 * application reaches PostgreSQL while serving it, and that the schema it
 * reaches is the test's own. Every later ticket asserts behaviour on top of
 * this; nothing below it is tested separately.
 *
 * supertest binds an ephemeral port of its own around an application that
 * never called listen(), which is the whole point of the app/listener split:
 * the tests need no port, and two test files running at once cannot collide on
 * one.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { createApp } = require('../app');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

// Without the guard the omission surfaces as a TypeError inside whichever
// request first touched the pool, which reads as a bug in that route rather
// than in how the application was built.
test('an application built without a pool is refused at once', () => {
  assert.throws(() => createApp({}), /needs a pool/);
});

test('the seam', async (t) => {
  const api = await startApi('smoke');
  t.after(() => api.close());

  await t.test('the application answers a request without binding a port', async () => {
    const response = await request(api.app).get('/api/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
  });

  await t.test('serving that request reached the database', async () => {
    const response = await request(api.app).get('/api/health');

    assert.equal(response.body.database, 'up');
  });

  // The schema is the test's own and not the development one, which is what
  // makes running the suite safe against a working database. That it is also
  // fully migrated is proved by fixtures.test.js building the core chain
  // through it - the list of applied files is asserted in db/'s own suite, once,
  // and is deliberately not repeated here.
  await t.test('the schema it reached is this file’s own', async () => {
    const { rows } = await api.pool.query('SELECT current_schema() AS schema');

    assert.equal(rows[0].schema, api.schema);
    assert.notEqual(api.schema, process.env.DB_SCHEMA);
  });

  // A JSON API that answers an unknown path with Express' HTML default hands a
  // client expecting JSON a parse error instead of a status it can act on.
  //
  // The path is outside /api on purpose. Since #9 an unknown path under /api
  // meets the session guard first and an anonymous caller is told 401 rather
  // than which paths exist; that a signed-in caller still gets this same 404 is
  // asserted in authorise.test.js, where there is an account to sign in as.
  //
  // The field is `message` and is asserted here rather than left to whoever
  // reads the body, because #95 is what a field name nobody checked costs: the
  // client reads `message` alone, so a 404 carrying anything else fell through
  // to its fallback sentence and the screen blamed the connection for an hour.
  await t.test('an unknown path is refused as JSON', async () => {
    const response = await request(api.app).get('/no-such-thing');

    assert.equal(response.status, 404);
    assert.match(response.headers['content-type'], /application\/json/);
    // Read first, because `undefined === undefined` is how this assertion
    // passes on a server that sends no message at all and a table that has no
    // such key - which is exactly the state #95 describes.
    assert.equal(typeof REFUSALS.routeNotFound, 'string');
    assert.equal(response.body.message, REFUSALS.routeNotFound);
  });
});

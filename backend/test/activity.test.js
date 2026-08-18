'use strict';

/**
 * Ticket #13: user activity history — what one account has done, and who may
 * read it.
 *
 * The same seam as #11 and #12. It earns its place twice over here. The fifth
 * criterion - "sign-in and sign-out events recorded by the sign-in ticket
 * appear here" - is a sentence about two tickets meeting, and the only honest
 * way to assert it is to sign somebody in over HTTP and then read the history
 * back over HTTP. A test that inserted a LOGIN row itself would prove the
 * screen, not the meeting.
 *
 * The sixth - "tests cover the scope restriction" - is the other. The history
 * of an account is the record of what a person did, and the ticket confines it
 * to administrators who reach that person. The refusal is the same 404 the
 * rest of the user routes answer for an account out of reach, and for the same
 * reason: a distinguishable 403 would turn the route into a way of asking
 * whether a colleague exists.
 *
 * The pagination fixture is written straight to `user_log` through the pool
 * rather than provoked through the API. Twelve real activities would be twelve
 * sign-ins and a couple of seconds of bcrypt apiece, and what the third
 * criterion asks about is the paging, not how the rows got there.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

let api;
before(async () => {
  api = await startApi('activity', { withSeed: true });
});
after(() => api.close());

const account = (alias) => ACCOUNTS.find((one) => one.alias === alias);

async function signInAs(alias) {
  const response = await request(api.app)
    .post('/api/auth/login')
    .send({ email: account(alias).email, password: PASSWORD });
  assert.equal(response.status, 200, `sign-in failed for ${alias}: ${response.body.message}`);
  return response.headers['set-cookie'];
}

const signOut = (cookie) => request(api.app).post('/api/auth/logout').set('Cookie', cookie);

const historyOf = (cookie, alias, query = '') =>
  request(api.app)
    .get(`/api/users/${account(alias).id}/activity${query}`)
    .set('Cookie', cookie);

// --- the first, second and fifth criteria ------------------------------------

test('the history of an account is what that account did, newest first', async (t) => {
  const admin = await signInAs('U_ADMIN');

  await t.test('a sign-in and a sign-out both appear', async () => {
    const teacher = await signInAs('U_TEACH');
    await signOut(teacher);

    const response = await historyOf(admin, 'U_TEACH');
    assert.equal(response.status, 200, response.body.message);

    const [newest, next] = response.body.entries;
    assert.equal(newest.activity, 'LOGOUT');
    assert.equal(next.activity, 'LOGIN');
  });

  await t.test('every entry carries the moment it happened', async () => {
    const response = await historyOf(admin, 'U_TEACH');
    for (const entry of response.body.entries) {
      // An instant, not a wall-clock reading: `time_stamp` is a timestamptz,
      // so what crosses the wire is unambiguous and the screen is what turns
      // it into Bangkok time. A value a Date cannot parse would be a value
      // rendered as "Invalid Date" in front of the administrator.
      assert.ok(!Number.isNaN(new Date(entry.time_stamp).getTime()), entry.time_stamp);
    }
  });

  await t.test('and the list stays in newest-first order throughout', async () => {
    const response = await historyOf(admin, 'U_TEACH');
    const times = response.body.entries.map((entry) => new Date(entry.time_stamp).getTime());
    assert.deepEqual(times, [...times].sort((a, b) => b - a));
  });

  await t.test("one account's history holds nobody else's activity", async () => {
    // The first criterion says "activity for a selected user", and the
    // selection is the filter the third criterion asks for: an administrator
    // opens a person and reads that person.
    const response = await historyOf(admin, 'U_TEACH');
    assert.ok(response.body.entries.length > 0);
    const teacher = account('U_TEACH').id;
    for (const entry of response.body.entries) assert.equal(entry.user_id, teacher);
  });
});

// --- the third criterion -----------------------------------------------------

test('a history longer than a page is paged', async (t) => {
  const admin = await signInAs('U_ADMIN');
  const subject = account('U_TEACH2').id;

  await t.test('twelve entries come back ten at a time', async () => {
    // Inserted in one statement, so several rows share a timestamp to the
    // microsecond - which is the case the ordering has to survive.
    await api.pool.query(
      `INSERT INTO user_log (user_id, activity)
       SELECT $1, 'UPDATE_USER' FROM generate_series(1, 12)`,
      [subject],
    );

    const first = await historyOf(admin, 'U_TEACH2');
    assert.equal(first.status, 200, first.body.message);
    assert.equal(first.body.total, 12);
    assert.equal(first.body.page, 1);
    assert.equal(first.body.per_page, 10);
    assert.equal(first.body.entries.length, 10);

    const second = await historyOf(admin, 'U_TEACH2', '?page=2');
    assert.equal(second.body.page, 2);
    assert.equal(second.body.entries.length, 2);

    // The count a pager needs is the count before the page was taken, which a
    // client counting the rows it received cannot work out.
    assert.equal(second.body.total, 12);
  });

  await t.test('and no entry is on both pages, nor missing from both', async () => {
    // `time_stamp` is not unique and the rows above prove it. Ordering by it
    // alone would let two rows of the same microsecond swap places between the
    // two requests, and then one of them is read twice and the other never.
    const first = await historyOf(admin, 'U_TEACH2');
    const second = await historyOf(admin, 'U_TEACH2', '?page=2');
    const ids = [...first.body.entries, ...second.body.entries].map((entry) => entry.id);
    assert.equal(new Set(ids).size, 12);
  });

  await t.test('a page size may be asked for, within a limit', async () => {
    const asked = await historyOf(admin, 'U_TEACH2', '?per_page=5');
    assert.equal(asked.body.per_page, 5);
    assert.equal(asked.body.entries.length, 5);

    const absurd = await historyOf(admin, 'U_TEACH2', '?per_page=5000');
    assert.equal(absurd.body.per_page, 100);
  });

  await t.test('and a page past the end is empty rather than an error', async () => {
    const response = await historyOf(admin, 'U_TEACH2', '?page=9');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.entries, []);
    assert.equal(response.body.total, 12);
  });
});

// --- the fourth and sixth criteria -------------------------------------------

test('an administrator reads history only within their own scope', async (t) => {
  await t.test('a Department Admin reads an account in their department', async () => {
    const dept = await signInAs('U_DEPT');
    const response = await historyOf(dept, 'U_TEACH');
    assert.equal(response.status, 200, response.body.message);
  });

  await t.test('and is refused an account in another department', async () => {
    const dept = await signInAs('U_DEPT');
    const response = await historyOf(dept, 'U_DEPT2');
    // The same 404 the rest of the user routes answer, deliberately: out of
    // scope and does not exist are one answer, so the route cannot be used to
    // find out which colleagues exist.
    assert.equal(response.status, 404);
    assert.equal(response.body.message, REFUSALS.userNotFound);
  });

  await t.test('an account that does not exist is refused the same way', async () => {
    const admin = await signInAs('U_ADMIN');
    const response = await request(api.app)
      .get('/api/users/U_NOBODY/activity')
      .set('Cookie', admin);
    assert.equal(response.status, 404);
    assert.equal(response.body.message, REFUSALS.userNotFound);
  });

  await t.test('a teacher may not read anyone, including themselves', async () => {
    const teacher = await signInAs('U_TEACH');
    const own = await historyOf(teacher, 'U_TEACH');
    assert.equal(own.status, 403);
  });

  await t.test('and an anonymous caller may not read at all', async () => {
    const response = await request(api.app).get(`/api/users/${account('U_TEACH').id}/activity`);
    assert.equal(response.status, 401);
  });
});

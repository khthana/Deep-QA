'use strict';

/**
 * Ticket #10: the shell the signed-in caller works inside — who am I, which
 * hat am I wearing, let me change it, let me change my password.
 *
 * The shell itself is markup and docs/06's Testing Decisions do not test
 * markup. What is testable, and what the ticket's fourth and eighth criteria
 * actually turn on, is server-side: switching role has to change what the
 * server permits, and a menu entry the sidebar hides has to be refused at the
 * route as well. Both are assertions at the HTTP seam, and both are here.
 *
 * As in test/authorise.test.js, every session below is obtained by signing in
 * for real. The single exception is the idle-expiry test, which signs a token
 * with a past `exp` — see the note there.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const jwt = require('jsonwebtoken');
const request = require('supertest');

const { PASSWORD, ACCOUNTS, byAlias, DEPARTMENTS, PROGRAMS } = require('../../db/seed');
const { attachRoles, requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { COOKIE_NAME, requireSession } = require('../auth/session');
const { startApi, guardedApp } = require('./helpers');

const [DEPT_COMPUTER] = DEPARTMENTS.map((department) => department.id);
const [PROGRAM_THAI] = PROGRAMS.map((program) => program.id);

let api;
before(async () => {
  api = await startApi('shell', { withSeed: true });
});
after(() => api.close());

const emailOf = (alias) => ACCOUNTS.find((account) => account.alias === alias).email;

async function signIn(alias, password = PASSWORD) {
  return request(api.app).post('/api/auth/login').send({ email: emailOf(alias), password });
}

async function signInAs(alias) {
  const response = await signIn(alias);
  assert.equal(response.status, 200, `sign-in failed for ${alias}: ${response.body.message}`);
  return response.headers['set-cookie'];
}

const me = (cookie) => request(api.app).get('/api/me').set('Cookie', cookie);

const switchTo = (cookie, selection) =>
  request(api.app).put('/api/me/acting-role').set('Cookie', cookie).send(selection);

/** The cookie a response set, if it set one, and the one sent otherwise. */
const carried = (response, fallback) => response.headers['set-cookie'] ?? fallback;

const roleGuarded = (...roleIds) =>
  guardedApp(requireSession, attachRoles(api.pool), requireRole(...roleIds));

const asUser = (cookie, app) => request(app).get('/guarded').set('Cookie', cookie);

test('the signed-in caller asking who they are', async (t) => {
  await t.test('is answered with their profile, their grants and the acting one', async () => {
    const cookie = await signInAs('U_MULTI');

    const response = await me(cookie);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.user_id, byAlias('U_MULTI'));
    assert.equal(response.body.user.email, emailOf('U_MULTI'));
    assert.equal(response.body.user.password, undefined);
    assert.deepEqual(
      response.body.roles.map((grant) => grant.role_id),
      ['PROG_MANAGER', 'TEACHER'],
    );
  });

  // The third criterion. Priority is ascending seniority in `roles`, so the
  // first row of the list the switcher renders is also the one in effect
  // before anybody chooses.
  await t.test('acts as the most senior grant until it chooses another', async () => {
    const cookie = await signInAs('U_MULTI');

    const { body } = await me(cookie);

    assert.deepEqual(body.acting, { role_id: 'PROG_MANAGER', scope_id: PROGRAM_THAI });
    assert.equal(body.acting.role_id, body.roles[0].role_id);
  });

  await t.test('is refused without a session', async () => {
    const response = await request(api.app).get('/api/me');

    assert.equal(response.status, 401);
    assert.equal(response.body.message, REFUSALS.noSession);
    // Never having signed in and having been signed out by the clock are both
    // 401 with Thai prose in the body, and the shell shows a dialog for the
    // second and nothing for the first. `reason` is what it tells them apart
    // by; matching on the wording would break the day someone rewords it.
    assert.equal(response.body.reason, 'anonymous');
  });
});

test('switching role', async (t) => {
  // The fourth criterion, and the whole reason the acting grant is held
  // server-side. Before the switch U_MULTI is a committee member and the
  // teacher-only route refuses them; after it the same account on the same
  // browser is admitted there and refused at the committee route. The sidebar
  // is not involved in either assertion.
  await t.test('changes what the server permits, not only what is shown', async () => {
    const before = await signInAs('U_MULTI');
    assert.equal((await asUser(before, roleGuarded('TEACHER'))).status, 403);
    assert.equal((await asUser(before, roleGuarded('PROG_MANAGER'))).status, 200);

    const switched = await switchTo(before, { role_id: 'TEACHER', scope_id: DEPT_COMPUTER });
    assert.equal(switched.status, 200);
    const after = carried(switched, before);

    assert.equal((await asUser(after, roleGuarded('TEACHER'))).status, 200);
    assert.equal((await asUser(after, roleGuarded('PROG_MANAGER'))).status, 403);
  });

  await t.test('is reported back by the shell on the next load', async () => {
    const cookie = await signInAs('U_MULTI');

    const switched = await switchTo(cookie, { role_id: 'TEACHER', scope_id: DEPT_COMPUTER });
    const { body } = await me(carried(switched, cookie));

    assert.deepEqual(body.acting, { role_id: 'TEACHER', scope_id: DEPT_COMPUTER });
  });

  // The selection is a pointer at a grant, checked against the database like
  // everything else in ADR-0002. A role the account does not hold is not a
  // role it can put on by asking.
  await t.test('is refused for a grant the account does not hold', async () => {
    const cookie = await signInAs('U_MULTI');

    const response = await switchTo(cookie, { role_id: 'FULL_ADMIN', scope_id: 'FULL_ADMIN' });

    assert.equal(response.status, 403);
    assert.deepEqual(Object.keys(response.body), ['message']);
    assert.deepEqual((await me(cookie)).body.acting, {
      role_id: 'PROG_MANAGER',
      scope_id: PROGRAM_THAI,
    });
  });

  // Same role, wrong scope: U_COM2 holds PROG_MANAGER over the international
  // programme, so the selection has to name both or one account holding one
  // role at two scopes could pick either.
  await t.test('is refused for a scope the account does not hold that role at', async () => {
    const cookie = await signInAs('U_MULTI');

    const response = await switchTo(cookie, { role_id: 'TEACHER', scope_id: PROGRAM_THAI });

    assert.equal(response.status, 403);
  });

  // The selection travels in the cookie, but it confers nothing: `attachRoles`
  // re-reads the grants every request and a selection that no longer matches
  // one falls back to the most senior remaining. Revoke the grant being acted
  // as and the very next request stops acting as it, on the cookie already in
  // the browser.
  await t.test('falls back when the grant being acted as is revoked', async (sub) => {
    const cookie = await signInAs('U_MULTI');
    const switched = await switchTo(cookie, { role_id: 'TEACHER', scope_id: DEPT_COMPUTER });
    const acting = carried(switched, cookie);

    await api.pool.query(
      `UPDATE user_roles SET is_active = false WHERE user_id = $1 AND role_id = 'TEACHER'`,
      [byAlias('U_MULTI')],
    );
    sub.after(() =>
      api.pool.query(`UPDATE user_roles SET is_active = true WHERE user_id = $1`, [
        byAlias('U_MULTI'),
      ]),
    );

    const { body } = await me(acting);

    assert.deepEqual(body.acting, { role_id: 'PROG_MANAGER', scope_id: PROGRAM_THAI });
    assert.equal((await asUser(acting, roleGuarded('TEACHER'))).status, 403);
  });
});

/**
 * The eighth criterion. What is asserted here is the half that can be
 * asserted at this seam: the route refuses the teacher on its own. The other
 * half — that the teacher's sidebar carries no user-management entry — is a
 * client-side menu configuration with no endpoint behind it, and is a line on
 * the ticket's hand-worked checklist rather than an assertion here.
 */
test('a menu entry a role never sees', async (t) => {
  await t.test('is refused at the route as well as hidden from the sidebar', async () => {
    const teacher = await signInAs('U_TEACH');

    const response = await request(api.app).get('/api/users').set('Cookie', teacher);

    assert.equal(response.status, 403);
    assert.deepEqual(Object.keys(response.body), ['message']);
  });

  // The same route, from the role whose sidebar does carry it. Without this
  // the test above would pass against a route that refuses everybody.
  await t.test('is reached by the role whose sidebar carries it', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await request(api.app).get('/api/users').set('Cookie', admin);

    assert.equal(response.status, 200);
    // `total` rather than the row count: #11 made the list paginate, so the
    // rows are one page of it and the count of the whole is what says the
    // Central Admin reaches every account.
    assert.ok(response.body.total >= ACCOUNTS.length);
    // Every row, not the first: a route that listed the column on all but
    // one of them would pass a check of one.
    assert.ok(response.body.users.every((row) => row.password === undefined));
  });
});

test('changing your own password', async (t) => {
  const NEW_PASSWORD = 'deep-core-changed';

  const change = (cookie, body) =>
    request(api.app).put('/api/me/password').set('Cookie', cookie).send(body);

  // U_NONKMITL is the account no other test in this file signs in as, so the
  // change below cannot reach one of them; the hash is restored regardless,
  // because every test in this file shares one schema.
  await t.test('takes effect at the next sign-in, and the old one stops working', async (sub) => {
    const cookie = await signInAs('U_NONKMITL');
    const { rows } = await api.pool.query(`SELECT password FROM users WHERE user_id = $1`, [
      byAlias('U_NONKMITL'),
    ]);
    sub.after(() =>
      api.pool.query(`UPDATE users SET password = $2 WHERE user_id = $1`, [
        byAlias('U_NONKMITL'),
        rows[0].password,
      ]),
    );

    const response = await change(cookie, {
      current_password: PASSWORD,
      new_password: NEW_PASSWORD,
    });

    assert.equal(response.status, 200);
    assert.equal((await signIn('U_NONKMITL', NEW_PASSWORD)).status, 200);
    assert.equal((await signIn('U_NONKMITL', PASSWORD)).status, 401);
  });

  await t.test('is refused when the current password is wrong', async () => {
    const cookie = await signInAs('U_EXT');

    const response = await change(cookie, {
      current_password: 'not-the-password',
      new_password: 'a-perfectly-fine-one',
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.wrongPassword);
    assert.equal((await signIn('U_EXT')).status, 200);
  });

  // An account that has only ever signed in with Google has no password to
  // verify the current one against. The comparison has to refuse it rather
  // than throw: bcrypt.compare rejects on a null hash, and an unhandled throw
  // is a 500 where the honest answer is "that was not your password".
  await t.test('is refused for an account that has no password to change', async (sub) => {
    const cookie = await signInAs('U_EXT');
    const { rows } = await api.pool.query(`SELECT password FROM users WHERE user_id = $1`, [
      byAlias('U_EXT'),
    ]);
    sub.after(() =>
      api.pool.query(`UPDATE users SET password = $2 WHERE user_id = $1`, [
        byAlias('U_EXT'),
        rows[0].password,
      ]),
    );
    await api.pool.query(`UPDATE users SET password = NULL WHERE user_id = $1`, [
      byAlias('U_EXT'),
    ]);

    const response = await change(cookie, {
      current_password: PASSWORD,
      new_password: 'a-perfectly-fine-one',
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.wrongPassword);
  });

  await t.test('is refused when the new one is too short', async () => {
    const cookie = await signInAs('U_EXT');

    const response = await change(cookie, { current_password: PASSWORD, new_password: 'short' });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, REFUSALS.weakPassword);
    assert.equal((await signIn('U_EXT')).status, 200);
  });
});

/**
 * The sixth criterion: an idle session ends with an explanation rather than an
 * unexplained failure.
 *
 * The token here is signed with the real secret and a past `exp`. That is a
 * precondition, not a stubbed authentication: the code path under test is the
 * real `requireSession` verifying a real token, and what is arranged is only
 * the passage of thirty idle minutes, which `LIFETIME_SECONDS` offers no seam
 * to shorten. docs/06 forbids stubbing authentication, and nothing here does.
 */
test('an idle session', async (t) => {
  await t.test('ends with words the shell can show, not a bare failure', async () => {
    const expired = jwt.sign({ user_id: byAlias('U_TEACH') }, process.env.SECRET_KEY, {
      expiresIn: -60,
    });

    const response = await me([`${COOKIE_NAME}=${expired}`]);

    assert.equal(response.status, 401);
    assert.equal(response.body.message, REFUSALS.expired);
    assert.equal(response.body.reason, 'expired');
  });

  // 401 and 403 are different states and the shell shows different things for
  // them: sign in again, versus you are signed in and may not do this. The
  // inherited utils/session.js treated them as one, which is why an idle
  // expiry and a refusal looked identical to the person at the screen.
  await t.test('is a different answer from being refused a permission', async () => {
    const cookie = await signInAs('U_TEACH');

    const response = await request(api.app).get('/api/users').set('Cookie', cookie);

    assert.equal(response.status, 403);
    assert.notEqual(response.body.message, REFUSALS.expired);
  });
});

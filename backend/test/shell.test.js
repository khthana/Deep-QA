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
const { actingEpoch } = require('../auth/accounts');
const { attachRoles, GRANTS_HEADER, requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const {
  COOKIE_NAME,
  LIFETIME_SECONDS,
  requireSession,
} = require('../auth/session');
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

/**
 * #77's header says it carries what `shellState` would have sent, and this is
 * the one place the two can be compared: `authorise.test.js` mounts a synthetic
 * guarded app and has no `/api/me` to read a body from. Two places holding one
 * opinion is a claim neither of them can be shown to hold (#97) - so the claim
 * is made here, once, over both halves of the payload.
 */
test('the grants header carries what the shell was told', async () => {
  const cookie = await signInAs('U_TEACH');
  const response = await me(cookie);

  assert.equal(response.status, 200);
  const raw = response.headers[GRANTS_HEADER.toLowerCase()];
  assert.ok(raw, `no ${GRANTS_HEADER} header on the shell's own answer`);
  const carried = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));

  assert.deepEqual(carried.roles, response.body.roles);
  assert.deepEqual(carried.acting, response.body.acting);
});

const switchTo = (cookie, selection) =>
  request(api.app).put('/api/me/acting-role').set('Cookie', cookie).send(selection);

/** The cookie a response set, if it set one, and the one sent otherwise. */
const carried = (response, fallback) => response.headers['set-cookie'] ?? fallback;

/** The token inside a cookie array, as a string. */
const tokenIn = (cookie) => {
  const entry = [cookie].flat().find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return decodeURIComponent(entry.split(';')[0].slice(`${COOKIE_NAME}=`.length));
};

/** What a cookie says, verified - these are cookies this server just signed. */
const claimsOf = (cookie) => jwt.verify(tokenIn(cookie), process.env.SECRET_KEY);

/**
 * The same session, re-signed with `seconds` of life left.
 *
 * Every claim is carried over, not only the user id: a token without the
 * selection is a different session, and one without the switch counter cannot
 * be renewed at all since #51 - a row built on either would be measuring that
 * rather than the threshold it is about.
 */
const aged = (cookie, seconds) => {
  const { user_id, acting, acting_epoch } = claimsOf(cookie);
  return `${COOKIE_NAME}=${jwt.sign({ user_id, acting, acting_epoch }, process.env.SECRET_KEY, {
    expiresIn: seconds,
  })}`;
};

/**
 * A cookie from before migration 0008: the account, and no switch counter.
 *
 * The deliberate opposite of `aged` above, which carries every claim over
 * precisely so that no row lands in this branch by accident. This is the one
 * state no sign-in can produce any more - every token either seam can mint is
 * signed by this server as it stands, and this server stamps the counter - so
 * it is signed by hand rather than obtained. #154.
 */
const beforeTheCounter = (alias, seconds) =>
  `${COOKIE_NAME}=${jwt.sign({ user_id: byAlias(alias) }, process.env.SECRET_KEY, {
    expiresIn: seconds,
  })}`;

const roleGuarded = (...roleIds) =>
  guardedApp(requireSession(api.pool), attachRoles(api.pool), requireRole(...roleIds));

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

/**
 * #49's fourth criterion: the screens the external assessor's set leaves out.
 *
 * The eighth criterion one role along, and the reason it needs saying twice is
 * that this role's menu was one invented entry until 16 October 2569 while the
 * server was already open at all nine `/program-results/*` routes to it. The
 * one-entry menu was therefore **hiding** three screens rather than refusing
 * them, and a requirement that says *and nothing else* (`docs/01` §9 `OWN-01`)
 * is a claim about the routes and not about the sidebar.
 *
 * One route per screen family rather than every route: what is shared inside a
 * family is the guard — the role constant at the top of the file — so a second
 * route of the same family could not fail while the first passed. The families
 * were read off every route in the tree on 16 October 2569: 161 routes, of
 * which 9 name this role (all of `programResults.js`) and 29 carry no role
 * guard at all. Of those 29, `auth/*`, `health`, the six `me.js` routes and the
 * evidence file are session-only by design — the last of them lets this role
 * in deliberately, through an in-handler check, because it is a drill-down of
 * two screens that *are* in the set.
 *
 * What that census cannot see: a route whose guard names the role indirectly,
 * a handler that widens its own answer below `requireRole`, and any route added
 * after that date. The first two are what the pairs below are for; the third is
 * what the table itself is for, since a new family with no row here is a family
 * nobody asked about.
 */
test("the screens the external assessor's set leaves out", async (t) => {
  // Each row: the route, and the alias whose own menu carries that screen. The
  // control matters as much as the refusal — without it every row would pass
  // against a route that refuses everybody, which is the shape the test above
  // guards against with one route and this one has to guard against with nine.
  const EXCLUDED = [
    ['/api/users', 'U_ADMIN'],
    ['/api/departments', 'U_FAC'],
    ['/api/programs', 'U_FAC'],
    ['/api/subjects', 'U_DEPT'],
    ['/api/students', 'U_DEPT'],
    ['/api/program-subjects', 'U_COM'],
    ['/api/plos', 'U_COM'],
    ['/api/plo-mapping', 'U_COM'],
    ['/api/rubrics', 'U_COM'],
    ['/api/offerings', 'U_COM'],
    ['/api/teaching/sections', 'U_TEACH'],
  ];

  const assessor = await signInAs('U_EXT');

  for (const [path, owner] of EXCLUDED) {
    await t.test(`${path} is refused`, async () => {
      const refused = await request(api.app).get(path).set('Cookie', assessor);

      assert.equal(refused.status, 403);
      // The message as well as the code: these routes answer 404 for a
      // curriculum out of reach and 400 for a query they cannot read, so a
      // bare 403 would be a claim about this guard only while no other way to
      // reach that number exists (#125).
      assert.equal(refused.body.message, REFUSALS.forbidden);

      const cookie = await signInAs(owner);
      const theirs = await request(api.app).get(path).set('Cookie', cookie);

      assert.notEqual(
        theirs.status,
        403,
        `${path} refuses ${owner} too, so the row above says nothing`,
      );
    });
  }

  // `OWN-01`'s first clause is *read-only*, which is two claims: the screens
  // outside the set are refused, and the writes behind them are refused too.
  // Every row above is a GET, so none of them can say the second - and no
  // mutant on a GET can put it at risk either (`assessorwritesthecurriculum`
  // is the one that can).
  //
  // The body is empty on purpose: the curriculum maintainer's own control has
  // to prove the guard admits them without writing a PLO into a schema every
  // other test in this file shares (#132). A guard refuses before a body is
  // read, so the assessor's 403 and the maintainer's 400 are both about the
  // guard and neither of them leaves a row behind.
  await t.test('writing the curriculum is refused, not only reading it', async () => {
    const refused = await request(api.app)
      .post('/api/plos')
      .set('Cookie', assessor)
      .send({});

    assert.equal(refused.status, 403);
    assert.equal(refused.body.message, REFUSALS.forbidden);

    const cookie = await signInAs('U_COM');
    const theirs = await request(api.app)
      .post('/api/plos')
      .set('Cookie', cookie)
      .send({});

    assert.notEqual(
      theirs.status,
      403,
      'POST /api/plos refuses the curriculum maintainer too, so the row above says nothing',
    );
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

  // #94. Saying it once is the whole point: the cookie outlives the token by a
  // full lifetime (#69), and for that half hour every reload asks this same
  // question and gets this same answer, which is a dialog nobody can dismiss
  // by reloading. The news has been delivered; the dead cookie has no further
  // work to do.
  await t.test('is forgotten by the browser too, so the news is told once', async () => {
    const expired = jwt.sign({ user_id: byAlias('U_TEACH') }, process.env.SECRET_KEY, {
      expiresIn: -60,
    });

    const response = await me([`${COOKIE_NAME}=${expired}`]);

    assert.equal(response.body.reason, 'expired');
    assert.match(String(response.headers['set-cookie']), /token=;/);
  });

  // And only there. Every other protected route is a screen doing work, where
  // a single verification failure is as likely to be a request that crossed a
  // renewal as a session that ended, and clearing on one of those signs out a
  // browser that was never idle. The comment in auth/session.js says so and
  // still means it; #94 narrows the exception to the one call that is asking
  // who is signed in rather than asking for something.
  await t.test('is left alone when a screen asks, not the shell', async () => {
    const expired = jwt.sign({ user_id: byAlias('U_TEACH') }, process.env.SECRET_KEY, {
      expiresIn: -60,
    });

    const response = await request(api.app)
      .get('/api/programs')
      .set('Cookie', [`${COOKIE_NAME}=${expired}`]);

    assert.equal(response.status, 401);
    assert.equal(response.body.reason, 'expired');
    assert.equal(response.headers['set-cookie'], undefined);
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

/**
 * #99 - a person typing is working, but the server hears nothing until they
 * save.
 *
 * `requireSession` renews a token that has under ten minutes left, on a
 * request. Typing is not a request, so the half hour was counted from the
 * last token issued rather than from the last thing the person did: a
 * request at minute nineteen left eleven minutes, and a long form written in
 * that time was saved into an expired session. The shell now sends a
 * heartbeat while somebody presses keys or clicks (`AuthContext.js`), and this
 * is the route it reaches.
 *
 * The route itself does nothing. What it is for is the middleware in front of
 * it, so the rows below read that middleware's answer through it.
 */
test('a heartbeat (#99)', async (t) => {
  const live = await signInAs('U_TEACH');
  const beat = (cookie) => request(api.app).post('/api/me/activity').set('Cookie', [cookie]);

  // Nine minutes, written out rather than read off `RENEW_BELOW_SECONDS`: the
  // browser beats at most five minutes apart, so a heartbeat can arrive with
  // anything down to five minutes left, and this row is the half of ADR-0005
  // that says such a one renews. Lowered below nine minutes, the threshold would
  // leave this token alone and the row would say so; read off the constant, it
  // would follow it down.
  await t.test('renews a session inside its last ten minutes', async () => {
    const response = await beat(aged(live, 9 * 60));

    assert.equal(response.status, 204);
    const cookie = response.headers['set-cookie'];
    assert.ok(cookie, 'the heartbeat should have renewed the session');
    const claims = claimsOf(cookie);
    assert.equal(claims.exp - claims.iat, LIFETIME_SECONDS);
    assert.equal(claims.user_id, byAlias('U_TEACH'));
  });

  // The threshold is the same one every request meets, and that is a choice:
  // a heartbeat that renewed every time would put a fresh cookie on the wire
  // every five minutes of typing, and each one is a chance for #51's stale
  // acting grant to come back. So a heartbeat is a request like any other.
  await t.test('leaves a session with more than that alone', async () => {
    const response = await beat(aged(live, LIFETIME_SECONDS));

    assert.equal(response.status, 204);
    assert.equal(response.headers['set-cookie'], undefined);
  });

  // A heartbeat that arrives after the half hour is the person coming back to
  // a session that ended - told so, like any screen, and the cookie is left
  // where it is because this is not the shell asking who is signed in.
  await t.test('is told that an ended session has ended', async () => {
    const response = await beat(aged(live, -60));

    assert.equal(response.status, 401);
    assert.equal(response.body.reason, 'expired');
    assert.equal(response.headers['set-cookie'], undefined);
  });
});

/**
 * #51 - a renewal that crosses a switch used to put the old hat back on.
 *
 * `requireSession` re-issues a token that has under ten minutes left and
 * carries the selection in it forward. The selection it carries is the one that
 * was in that request's token, which is the selection as it stood when the
 * request left the browser - so a request that was already in flight when the
 * person switched role wrote its cookie after the switch's cookie, last write
 * won, and the browser was acting as a grant the picker no longer showed.
 *
 * Two requests interleaved is not something a test can arrange by timing, and
 * it does not have to be: what makes the stale request stale is the token it is
 * holding, not the moment it arrives. So these rows keep a token from before the
 * switch and send it after, which is the same request the browser would have
 * had in flight. Every token below is a real one this server signed, re-signed
 * to an age `LIFETIME_SECONDS` offers no seam to reach - the same precondition
 * the idle-session rows above arrange, and for the same reason.
 *
 * The counter is `users.acting_epoch`, migration 0008, and ADR-0006 is where
 * what it can and cannot see is written down.
 */
test('a renewal that crosses a switch (#51)', async (t) => {
  const PROG = { role_id: 'PROG_MANAGER', scope_id: PROGRAM_THAI };
  const TEACH = { role_id: 'TEACHER', scope_id: DEPT_COMPUTER };

  // Nine minutes: inside the renewal threshold, so this request renews if it is
  // allowed to renew at all. Without the counter the assertion below is the
  // defect - a cookie carrying PROG_MANAGER, written after the switch to
  // TEACHER, and the browser back on the committee.
  await t.test('leaves the cookie alone when the grant in it has been superseded', async () => {
    const before = await signInAs('U_MULTI');
    const inFlight = aged(before, 9 * 60);
    assert.equal((await switchTo(before, TEACH)).status, 200);

    const response = await me(inFlight);

    assert.equal(response.status, 200);
    assert.equal(response.headers['set-cookie'], undefined);
  });

  // And is answered, not refused. The counter decides what may be written back
  // to the browser and nothing else: this request was sent under the committee
  // hat and is served under it, which is what every request that was in flight
  // across a switch has always got.
  await t.test('answers that request as the grant it was sent under', async () => {
    const before = await signInAs('U_MULTI');
    const inFlight = aged(before, 9 * 60);
    assert.equal((await switchTo(before, TEACH)).status, 200);

    const response = await me(inFlight);

    assert.deepEqual(response.body.acting, PROG);
  });

  // The other half, and the one that says the fix is a condition rather than an
  // end to renewal: the cookie the switch itself issued is the newest the
  // account has, so a request holding it renews as it always did - and renews
  // carrying the hat that was chosen, which is the thing the renewal exists to
  // carry.
  await t.test('renews from the cookie the switch issued, carrying the new grant', async () => {
    const before = await signInAs('U_MULTI');
    const switched = await switchTo(before, TEACH);

    const response = await me(aged(carried(switched, before), 9 * 60));

    assert.equal(response.status, 200);
    const claims = claimsOf(response.headers['set-cookie']);
    assert.deepEqual(claims.acting, TEACH);
    // The number the switch stamped, whatever it was: U_MULTI has switched
    // several times by the time this file reaches here, and what the renewal
    // promises is to carry the token's own counter rather than to reach any
    // particular value.
    assert.equal(claims.acting_epoch, claimsOf(carried(switched, before)).acting_epoch);
    assert.equal(claims.exp - claims.iat, LIFETIME_SECONDS);
  });

  // A switch made inside the renewal window writes two cookies on one response:
  // the middleware's renewal and then the route's. The browser keeps the last,
  // so the order they are written in is what decides which hat it is wearing,
  // and nothing else in the file would notice if they swapped.
  await t.test('is the switch that wins when both happen on one response', async () => {
    const before = await signInAs('U_MULTI');

    const switched = await switchTo(aged(before, 9 * 60), TEACH);

    assert.equal(switched.status, 200);
    const written = switched.headers['set-cookie'];
    assert.equal(written.length, 2, 'both the renewal and the switch should have written');
    const last = claimsOf([written[written.length - 1]]);
    assert.deepEqual(last.acting, TEACH);
    assert.equal(last.acting_epoch, claimsOf(before).acting_epoch + 1);
  });

  // The counter belongs to the account that switched. One person putting on
  // another hat must not stop anybody else's session renewing, which is the
  // failure a counter kept anywhere but on the row would have.
  await t.test('is not moved for anybody but the account that switched', async () => {
    const teacher = aged(await signInAs('U_TEACH'), 9 * 60);
    const multi = await signInAs('U_MULTI');
    assert.equal((await switchTo(multi, TEACH)).status, 200);

    const response = await me(teacher);

    assert.equal(response.status, 200);
    assert.ok(response.headers['set-cookie'], 'the other account should still renew');
  });

  // #154. The branch of the guard a person reaches without doing anything
  // unusual: everybody holding a session when 0008 deploys is carrying a token
  // from before the column existed, and `undefined` is equal to no number the
  // account can be at. ADR-0006 chose that over reading a missing claim as
  // zero, which would be true only on the day it deploys. What it promises the
  // people in that window is two things, and this pair is them.
  await t.test('answers a token signed before the counter existed', async () => {
    const response = await me(beforeTheCounter('U_TEACH', 9 * 60));

    assert.equal(response.status, 200);
    assert.equal(response.body.user.user_id, byAlias('U_TEACH'));
  });

  // And writes nothing back, with a minute left rather than nine, because the
  // claim is about the missing counter and not about the threshold.
  //
  // U_TEACH is the account this file never switches, so its counter is still
  // zero - which is what lets this row tell a missing claim apart from one read
  // as zero, and the only reason a mutant can reach it. Asserted rather than
  // assumed: a row added above that switched this account would leave this one
  // passing for a reason nobody wrote down.
  //
  // It asks `actingEpoch()` rather than the column on purpose: what has to be
  // zero is the left-hand side of the comparison under test, which is whatever
  // that function returns. Reading the column would be independent of it, and
  // would be asserting a slightly different thing.
  await t.test('and does not renew it, with a minute of life left', async () => {
    assert.equal(
      await actingEpoch(api.pool, byAlias('U_TEACH')),
      0,
      'this row needs an account that has not switched; see the note above it',
    );

    const response = await me(beforeTheCounter('U_TEACH', 60));

    assert.equal(response.status, 200);
    assert.equal(response.headers['set-cookie'], undefined);
  });
});

/**
 * #153: the price ADR-0006 accepted, measured.
 *
 * The counter is on the account, so it cannot tell the account's own browsers
 * apart. Somebody signed in on two machines who switches grant on the first
 * leaves the second holding a token whose number is behind: it is answered
 * exactly as before, because the counter decides nothing about authorisation,
 * and it never renews again, so that machine is signed out when its half hour
 * runs out. ADR-0006 wrote that down as the accepted price of #51 and said the
 * paragraph was the one to reopen; the owner read it on 21 October 2569 and
 * chose to leave the behaviour as it stands. These rows are that decision's
 * price turned into claims the suite holds - so it is measured rather than
 * reasoned about, and so anybody who changes it later has to change a row.
 *
 * Two sessions of one account at once needed no new instrument: it is
 * `signInAs` twice. This sheet used to say both seams run a single browser
 * context and neither could build it, which is true of the browser seam and
 * says nothing about this one - there is no browser here, only cookies, and
 * nothing stops a row holding two.
 *
 * Measured against the code before #51 (`51:noguard`) the three rows that say
 * no cookie is written go red - *stops the second device renewing once the
 * first switches*, *and not for a heartbeat once the first has switched* and
 * *and leaves the first device as the one that cannot renew* - which is what
 * says they are about the guard rather than about something else. The other
 * four are the two controls, the row about what the stale request is still
 * answered as, and the recovery; `docs/acceptance/10-application-shell.md`
 * says which mutant kills each of them.
 */
test('two devices of one account (#153)', async (t) => {
  const PROG = { role_id: 'PROG_MANAGER', scope_id: PROGRAM_THAI };
  const TEACH = { role_id: 'TEACHER', scope_id: DEPT_COMPUTER };

  const heartbeat = (cookie) =>
    request(api.app).post('/api/me/activity').set('Cookie', cookie);

  /**
   * Two sign-ins of one account: two cookie jars holding two tokens, and one
   * counter behind both. Sign-in reads the counter rather than moving it, so
   * the two start level - asserted here because every row below is about what
   * happens when they stop being level, and a second sign-in that bumped
   * anything would make them all pass for the wrong reason.
   */
  async function twoDevices() {
    const first = await signInAs('U_MULTI');
    const second = await signInAs('U_MULTI');
    assert.equal(
      claimsOf(first).acting_epoch,
      claimsOf(second).acting_epoch,
      'two sign-ins of one account should start on the same counter',
    );
    return { first, second };
  }

  // The control, and what makes the rows below about the switch: nine minutes
  // left and nobody switching renews the second jar exactly like the first.
  await t.test('renews the second device while nobody has switched', async () => {
    const { second } = await twoDevices();

    const response = await me(aged(second, 9 * 60));

    assert.equal(response.status, 200);
    assert.ok(response.headers['set-cookie'], 'the second device should renew');
  });

  // The price itself. Nothing was done on the second machine; the switch
  // happened somewhere else entirely, and this token can no longer be put back
  // on the browser holding it.
  await t.test('stops the second device renewing once the first switches', async () => {
    const { first, second } = await twoDevices();
    const working = aged(second, 9 * 60);

    assert.equal((await switchTo(first, TEACH)).status, 200);
    const response = await me(working);

    assert.equal(response.status, 200);
    assert.equal(response.headers['set-cookie'], undefined);
  });

  // And the other half of the price, which is what keeps it a cost rather than
  // a lock-out: the machine goes on working, under the hat it chose, for
  // whatever is left of its half hour.
  await t.test('and answers it under the grant that device chose', async () => {
    const { first, second } = await twoDevices();
    const working = aged(second, 9 * 60);

    assert.equal((await switchTo(first, TEACH)).status, 200);
    const response = await me(working);

    assert.deepEqual(response.body.acting, PROG);
  });

  // The control for the row below. #99's heartbeat is the request a person's
  // typing produces, and it renews like any other request - asserted here
  // because a heartbeat that never renewed anything would make that row pass
  // without the counter having refused a thing.
  await t.test('renews it for a heartbeat while nobody has switched', async () => {
    const { second } = await twoDevices();

    const response = await heartbeat(aged(second, 9 * 60));

    assert.equal(response.status, 204);
    assert.ok(response.headers['set-cookie'], 'the heartbeat should renew');
  });

  // Which is what makes the price read "however hard the person is working on
  // it": the request their typing produces reaches the same comparison and is
  // refused the same way, so working in the second machine cannot keep it
  // alive. ADR-0005 is why that matters - the half hour counts from the last
  // token issued, and no token is being issued here any more.
  await t.test('and not for a heartbeat once the first has switched', async () => {
    const { first, second } = await twoDevices();
    const working = aged(second, 9 * 60);

    assert.equal((await switchTo(first, TEACH)).status, 200);
    const response = await heartbeat(working);

    assert.equal(response.status, 204);
    assert.equal(response.headers['set-cookie'], undefined);
  });

  // What ADR-0006 did not say, and the shape the price really has: the second
  // machine is not stuck. Switching grant there writes a cookie whatever the
  // counter said, because the switch bumps the counter and stamps the value it
  // has just written - so the person has a way back.
  await t.test('lets the second device recover by switching itself', async () => {
    const { first, second } = await twoDevices();
    const working = aged(second, 9 * 60);
    assert.equal((await switchTo(first, TEACH)).status, 200);

    const recovered = await switchTo(working, PROG);

    assert.equal(recovered.status, 200);
    const written = [recovered.headers['set-cookie']].flat().filter(Boolean);
    assert.equal(
      written.length,
      1,
      'the switch should write exactly one cookie whatever the counter said',
    );
    assert.deepEqual(claimsOf([written[written.length - 1]]).acting, PROG);
  });

  // And the reason that way back is not a fix: it moves the problem. Whoever
  // switched last is the only device that can renew, so two machines take it in
  // turns. This row is the one to read before pricing a fix for #153 - the cost
  // is not "a second device dies" but "every device except the one that
  // switched last dies".
  await t.test('and leaves the first device as the one that cannot renew', async () => {
    const { first, second } = await twoDevices();
    const switched = await switchTo(first, TEACH);
    assert.equal(switched.status, 200);
    // The cookie the switch issued, not the one sign-in issued: that one
    // carries the counter from before the bump and so cannot renew whatever
    // the second device does, which would make this row pass for free.
    const firstStillWorking = aged(carried(switched, first), 9 * 60);

    const before = await me(firstStillWorking);
    assert.ok(
      before.headers['set-cookie'],
      'the device that switched last should be the one that renews',
    );

    assert.equal((await switchTo(aged(second, 9 * 60), PROG)).status, 200);
    const response = await me(firstStillWorking);

    assert.equal(response.status, 200);
    assert.equal(response.headers['set-cookie'], undefined);
  });
});

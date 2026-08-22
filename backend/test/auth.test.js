'use strict';

/**
 * Ticket #8: signing in, and signing out.
 *
 * Every path here runs against the seeded accounts over real HTTP and a real
 * PostgreSQL, because docs/06's Testing Decisions forbid stubbing this one in
 * particular: the inherited system's central defect was authorisation that
 * existed in appearance, and a suite that fakes its way past sign-in would
 * reproduce exactly that.
 *
 * The Google paths are asserted through `resolveGoogleAccount` rather than
 * through a request. Google's consent screen is not something a suite can
 * drive, so the callback is written to decide nothing on its own - the domain
 * rule, the account, its status and its grants are all that function - and it
 * is that function the acceptance criteria are checked against.
 *
 * Not asserted here: an external assessor outside their validity window,
 * ticket #8's sixth criterion. `user_roles` has no window to be outside of.
 * The columns, the admin field that sets them and the check are ticket #48.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const jwt = require('jsonwebtoken');
const request = require('supertest');

const { PASSWORD, byAlias } = require('../../db/seed');
const { resolveGoogleAccount } = require('../auth/accounts');
const {
  COOKIE_NAME,
  LIFETIME_SECONDS,
  COOKIE_LIFETIME_SECONDS,
  requireSession,
} = require('../auth/session');
const { startApi, guardedApp } = require('./helpers');

/**
 * One seeded schema for the whole file. Seeding costs a bcrypt hash and a few
 * hundred inserts, and node --test gives this file a process of its own, so
 * one schema per file is the grain that keeps the suite quick. The tests that
 * suspend or unverify an account come last, after everything that signs in.
 */
let api;
before(async () => {
  api = await startApi('auth', { withSeed: true });
});
after(() => api.close());

const EMAILS = {
  admin: 'admin@kmitl.ac.th',
  faculty: 'faculty.admin@kmitl.ac.th',
  dept: 'dept.admin.05@kmitl.ac.th',
  committee: 'prog.manager@kmitl.ac.th',
  teacher: 'teacher.one@kmitl.ac.th',
  assessor: 'external.assessor@kmitl.ac.th',
  outsider: 'assessor@tabee-review.org',
  multi: 'multi.role@kmitl.ac.th',
};

const signIn = (app, email, password = PASSWORD) =>
  request(app).post('/api/auth/login').send({ email, password });

/** The Set-Cookie the response carries for the session, if it set one. */
const sessionCookie = (response) =>
  (response.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith('token='));

/** What is inside such a cookie. Decoded rather than verified: what the tests
 * below ask about is what the server put in it. */
const claimsOf = (cookie) => {
  const token = decodeURIComponent(cookie.split(';')[0].slice(`${COOKIE_NAME}=`.length));
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
};

/**
 * The smallest application `requireSession` can be mounted on. Renewal cannot
 * be read off any of this ticket's own routes - since #92 none of them is
 * behind the middleware at all, `/auth/logout` least of all, because the
 * browser that most needs to sign out is the one whose session has already
 * died. This is the real middleware over real HTTP; only the handler behind it
 * is a stand-in, and the same stand-in serves #9's guards in authorise.test.js.
 */
const guarded = () => guardedApp(requireSession);

const sessionOf = (userId, seconds) =>
  `${COOKIE_NAME}=${jwt.sign({ user_id: userId }, process.env.SECRET_KEY, { expiresIn: seconds })}`;

const logCount = async (pool, userId, activity) => {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM user_log WHERE user_id = $1 AND activity = $2`,
    [userId, activity],
  );
  return rows[0].n;
};

test('sign in', async (t) => {
  await t.test('password sign-in succeeds for the central administrator', async () => {
    const response = await signIn(api.app, EMAILS.admin);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.user_id, byAlias('U_ADMIN'));
    assert.equal(response.body.role.role_id, 'FULL_ADMIN');
  });

  // R010: the one role that legitimately signs in from outside the university
  // domain. If the domain rule were shared with the password path this would
  // be refused, and the seeded account would be unusable.
  await t.test('password sign-in succeeds for an external assessor from outside KMITL', async () => {
    const response = await signIn(api.app, EMAILS.outsider);

    assert.equal(response.status, 200);
    assert.equal(response.body.role.role_id, 'EXT_ASSESSOR');
  });

  await t.test('in development, password sign-in is open to every role', async () => {
    for (const email of Object.values(EMAILS)) {
      const response = await signIn(api.app, email);
      assert.equal(response.status, 200, `${email} was refused: ${response.body.message}`);
    }
  });

  // The environment is read per request rather than at startup, so the same
  // application answers both ways and the test needs no second app.
  await t.test('outside development, password sign-in is for the two admin roles only', async (sub) => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    sub.after(() => {
      process.env.NODE_ENV = previous;
    });

    for (const email of [EMAILS.admin, EMAILS.assessor, EMAILS.outsider]) {
      const allowed = await signIn(api.app, email);
      assert.equal(allowed.status, 200, `${email} was refused: ${allowed.body.message}`);
    }

    for (const email of [EMAILS.faculty, EMAILS.dept, EMAILS.committee, EMAILS.teacher]) {
      const refused = await signIn(api.app, email);
      assert.equal(refused.status, 403, `${email} was admitted`);
      assert.match(refused.body.message, /Google/);
    }

    // The account that holds an assessor grant alongside a more powerful one
    // lands on the more powerful one, which is a role this rule directs to
    // Google. Holding the assessor grant is not what decides.
    await api.pool.query(
      `INSERT INTO users (user_id, email, first_name_th, last_name_th, password, is_verified)
       SELECT 'bothrole', 'both.roles@kmitl.ac.th', 'สอง', 'สิทธิ์', password, true
       FROM users WHERE user_id = $1`,
      [byAlias('U_ADMIN')],
    );
    await api.pool.query(
      `INSERT INTO user_roles (user_id, role_id, scope_id)
       VALUES ('bothrole', 'PROG_MANAGER', '0501'), ('bothrole', 'EXT_ASSESSOR', '0501')`,
    );

    const refused = await signIn(api.app, 'both.roles@kmitl.ac.th');
    assert.equal(refused.status, 403);
    assert.match(refused.body.message, /Google/);
  });

  // R003 / BR-03: the account holding two grants lands on the more powerful
  // one - priority 4 (กรรมการหลักสูตร) rather than 5 (อาจารย์ผู้สอน) - and is
  // still told about both, which is what the role picker offers.
  await t.test('an account with two roles lands in the higher-priority one', async () => {
    const response = await signIn(api.app, EMAILS.multi);

    assert.equal(response.body.role.role_id, 'PROG_MANAGER');
    assert.equal(response.body.role.scope_id, '0501');
    assert.deepEqual(
      response.body.roles.map((role) => role.role_id),
      ['PROG_MANAGER', 'TEACHER'],
    );
  });

  // Same answer for an address that is not registered and for the right
  // address with the wrong password: the form is not a way of asking which
  // addresses exist.
  await t.test('a wrong password and an unknown address are refused alike', async () => {
    const wrong = await signIn(api.app, EMAILS.admin, 'not-the-password');
    const unknown = await signIn(api.app, 'nobody@kmitl.ac.th');

    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
    assert.equal(sessionCookie(wrong), undefined);
  });

  await t.test('a request with neither field is refused rather than crashing', async () => {
    const response = await request(api.app).post('/api/auth/login').send({});

    assert.equal(response.status, 401);
  });

  await t.test('passwords are stored hashed', async () => {
    const { rows } = await api.pool.query('SELECT password FROM users WHERE password IS NOT NULL');

    assert.ok(rows.length >= 11);
    for (const row of rows) {
      assert.match(row.password, /^\$2[aby]\$/);
      assert.notEqual(row.password, PASSWORD);
    }
  });
});

test('the session cookie', async (t) => {
  await t.test('is HttpOnly, and is not readable by script', async () => {
    const cookie = sessionCookie(await signIn(api.app, EMAILS.teacher));

    assert.ok(cookie, 'no session cookie was set');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    // Local development is served over http; a Secure cookie would never be
    // sent back and nobody could stay signed in.
    assert.doesNotMatch(cookie, /Secure/i);
  });

  // #69. With the two equal the browser drops the cookie in the same second
  // the token dies, so nobody sitting at a screen ever presents an expired
  // token and `reason: 'expired'` is unreachable from a browser - a tab left
  // open past the half hour is returned to the sign-in page without a word.
  await t.test('outlives the token it carries', async () => {
    const cookie = sessionCookie(await signIn(api.app, EMAILS.teacher));

    const maxAge = Number(cookie.match(/Max-Age=(\d+)/i)[1]);
    assert.equal(maxAge, COOKIE_LIFETIME_SECONDS);
    assert.ok(
      maxAge > LIFETIME_SECONDS,
      `the cookie must outlive the token: Max-Age=${maxAge}, token=${LIFETIME_SECONDS}`,
    );
  });

  await t.test('carries no more than the user id', async () => {
    const claims = claimsOf(sessionCookie(await signIn(api.app, EMAILS.teacher)));

    assert.deepEqual(Object.keys(claims).sort(), ['exp', 'iat', 'user_id']);
    assert.equal(claims.user_id, byAlias('U_TEACH'));
    assert.equal(claims.exp - claims.iat, LIFETIME_SECONDS);
  });

  // The behaviour the delivered system's users already have: someone working
  // continuously is not signed out mid-edit at the thirty-minute mark, while
  // someone who walks away still expires thirty minutes after their last
  // request.
  await t.test('is renewed by a request made in its last ten minutes', async () => {
    const teacher = byAlias('U_TEACH');

    const response = await request(guarded())
      .get('/guarded')
      .set('Cookie', sessionOf(teacher, 5 * 60));

    assert.equal(response.status, 200);
    assert.equal(response.body.userId, teacher);
    const renewed = claimsOf(sessionCookie(response));
    assert.equal(renewed.exp - renewed.iat, LIFETIME_SECONDS);
  });

  await t.test('is left alone by a request made well before that', async () => {
    const response = await request(guarded())
      .get('/guarded')
      .set('Cookie', sessionOf(byAlias('U_TEACH'), LIFETIME_SECONDS));

    assert.equal(response.status, 200);
    assert.equal(sessionCookie(response), undefined);
  });

  // Refusing is one thing and signing the browser out is another. #9 mounts
  // this middleware on every protected route, and one clearing it on any
  // failed verification would turn a single unlucky request into a lost
  // session.
  await t.test('is not cleared by a refused request', async () => {
    const response = await request(guarded())
      .get('/guarded')
      .set('Cookie', sessionOf(byAlias('U_TEACH'), -1));

    assert.equal(response.status, 401);
    assert.match(response.body.message, /หมดอายุ/);
    assert.equal(sessionCookie(response), undefined);
  });

  await t.test('is cleared on sign-out', async () => {
    const cookie = sessionCookie(await signIn(api.app, EMAILS.teacher));
    const response = await request(api.app).post('/api/auth/logout').set('Cookie', cookie);

    assert.equal(response.status, 200);
    assert.match(sessionCookie(response), /token=;/);
  });

  // The three below are #92, and they are a deliberate change of contract:
  // signing out used to be refused unless a live session backed it, and is now
  // idempotent. The cookie outlives the token by a full lifetime, so the
  // browser this matters to - a tab left open past the expiry - is holding a
  // cookie it cannot get rid of, on the only route that erases one. What a
  // dead session takes away is the *record*, not the erasure.
  await t.test('is cleared on sign-out from a session that has expired', async () => {
    const teacher = byAlias('U_TEACH');
    const before = await logCount(api.pool, teacher, 'LOGOUT');

    const response = await request(api.app)
      .post('/api/auth/logout')
      .set('Cookie', sessionOf(teacher, -60));

    assert.equal(response.status, 200);
    assert.match(sessionCookie(response), /token=;/);
    // An expired token is still one this server signed, so the line is
    // attributable and gets written. That is the whole distinction the route
    // draws: expired is a person, unreadable is nobody.
    assert.equal(await logCount(api.pool, teacher, 'LOGOUT'), before + 1);
  });

  await t.test('signing out without one succeeds, having nothing to clear', async () => {
    const response = await request(api.app).post('/api/auth/logout');

    assert.equal(response.status, 200);
    assert.match(sessionCookie(response), /token=;/);
  });

  await t.test('a token this server did not sign is cleared, and logged to nobody', async () => {
    const lines = () =>
      api.pool.query('SELECT count(*)::int AS n FROM user_log').then(({ rows }) => rows[0].n);
    const before = await lines();

    const response = await request(api.app)
      .post('/api/auth/logout')
      .set('Cookie', 'token=not.a.token');

    assert.equal(response.status, 200);
    assert.match(sessionCookie(response), /token=;/);
    // Not `logCount` for one account: a forged token names nobody, so the
    // assertion has to be that *no* line was written anywhere.
    assert.equal(await lines(), before);
  });
});

test('the activity log', async (t) => {
  await t.test('records the sign-in and the sign-out', async () => {
    const teacher = byAlias('U_TEACH');
    const before = {
      in: await logCount(api.pool, teacher, 'LOGIN'),
      out: await logCount(api.pool, teacher, 'LOGOUT'),
    };

    const cookie = sessionCookie(await signIn(api.app, EMAILS.teacher));
    await request(api.app).post('/api/auth/logout').set('Cookie', cookie);

    assert.equal(await logCount(api.pool, teacher, 'LOGIN'), before.in + 1);
    assert.equal(await logCount(api.pool, teacher, 'LOGOUT'), before.out + 1);
  });

  await t.test('records nothing for a refused attempt', async () => {
    const admin = byAlias('U_ADMIN');
    const before = await logCount(api.pool, admin, 'LOGIN');

    await signIn(api.app, EMAILS.admin, 'not-the-password');

    assert.equal(await logCount(api.pool, admin, 'LOGIN'), before);
  });
});

test('Google sign-in', async (t) => {
  await t.test('admits a KMITL account and hands back its highest role', async () => {
    const admission = await resolveGoogleAccount(api.pool, EMAILS.multi);

    assert.equal(admission.ok, true);
    assert.equal(admission.user.user_id, byAlias('U_MULTI'));
    assert.equal(admission.role.role_id, 'PROG_MANAGER');
  });

  await t.test('refuses an address outside the KMITL domain', async () => {
    const admission = await resolveGoogleAccount(api.pool, EMAILS.outsider);

    assert.equal(admission.ok, false);
    assert.equal(admission.reason, 'domain');
    assert.match(admission.message, /@kmitl\.ac\.th/);
  });

  // Distinct from the domain refusal, and distinct again from the one below:
  // the three need different things done about them, and the person reading
  // the message is the one who has to go and ask for it.
  await t.test('refuses a KMITL address with no account, naming that', async () => {
    const admission = await resolveGoogleAccount(api.pool, 'someone.else@kmitl.ac.th');

    assert.equal(admission.ok, false);
    assert.equal(admission.reason, 'unknown');
  });

  await t.test('refuses a KMITL account that holds no role, distinctly', async () => {
    // Not a seeded account: every one of the eleven holds at least one grant,
    // and this refusal needs an account that holds none.
    await api.pool.query(
      `INSERT INTO users (user_id, email, first_name_th, last_name_th, is_verified)
       VALUES ('norole01', 'no.role@kmitl.ac.th', 'ยังไม่มี', 'บทบาท', true)`,
    );

    const admission = await resolveGoogleAccount(api.pool, 'no.role@kmitl.ac.th');

    assert.equal(admission.ok, false);
    assert.equal(admission.reason, 'noRole');
    assert.notEqual(admission.message, (await resolveGoogleAccount(api.pool, 'x@kmitl.ac.th')).message);
  });

  await t.test('refuses a suspended account, and an unverified one', async () => {
    await api.pool.query(
      `UPDATE users SET status = 'inactive' WHERE user_id = $1`,
      [byAlias('U_TEACH2')],
    );
    await api.pool.query(`UPDATE users SET is_verified = false WHERE user_id = $1`, [
      byAlias('U_COM2'),
    ]);

    assert.equal((await resolveGoogleAccount(api.pool, 'teacher.two@kmitl.ac.th')).reason, 'inactive');
    assert.equal(
      (await resolveGoogleAccount(api.pool, 'prog.manager.0503@kmitl.ac.th')).reason,
      'unverified',
    );

    // The password path shares these two checks, so they are asserted once
    // here and their sharing is asserted rather than repeated.
    const refused = await signIn(api.app, 'teacher.two@kmitl.ac.th');
    assert.equal(refused.status, 403);
  });
});

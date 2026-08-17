'use strict';

/**
 * Ticket #9: what the caller is allowed to do.
 *
 * Every test below signs in for real - the password form, the seeded accounts,
 * the cookie the server sets - and sends that cookie at the guards. docs/06's
 * Testing Decisions forbid a stubbed session, and the eighth acceptance
 * criterion says so again in its own words: each seeded role reaches what it
 * should and is refused what it should not, "using real sign-in rather than a
 * stubbed session". Nothing here forges a token.
 *
 * The guards have no endpoints of their own yet. They are mounted on the
 * stand-in application in test/helpers, which is the real middleware over real
 * HTTP with a handler that only echoes; the endpoints they will protect arrive
 * with the tickets that build them.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, byAlias, FACULTY, DEPARTMENTS, PROGRAMS } = require('../../db/seed');
const { GLOBAL_SCOPE, attachRoles, requireRole, requireScope } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { requireSession } = require('../auth/session');
const { startApi, guardedApp } = require('./helpers');

const [DEPT_COMPUTER, DEPT_CIVIL] = DEPARTMENTS.map((department) => department.id);
const [PROGRAM_THAI, PROGRAM_INTERNATIONAL] = PROGRAMS.map((program) => program.id);

let api;
before(async () => {
  api = await startApi('authorise', { withSeed: true });
});
after(() => api.close());

const emailOf = (alias) => ACCOUNTS.find((account) => account.alias === alias).email;

/**
 * Signs in as a seeded account and hands back the cookie. This is the only way
 * a test in this file obtains a session.
 */
async function signInAs(alias) {
  const response = await request(api.app)
    .post('/api/auth/login')
    .send({ email: emailOf(alias), password: PASSWORD });

  assert.equal(response.status, 200, `sign-in failed for ${alias}: ${response.body.message}`);
  return response.headers['set-cookie'];
}

/** A request at a guarded stand-in, carrying a real session. */
const asUser = (cookie, app, path = '/guarded') =>
  request(app).get(path).set('Cookie', cookie);

const attached = () => guardedApp(requireSession, attachRoles(api.pool));

const roleGuarded = (...roleIds) =>
  guardedApp(requireSession, attachRoles(api.pool), requireRole(...roleIds));

const scopeGuarded = () =>
  guardedApp(
    requireSession,
    attachRoles(api.pool),
    // The record's identifier, taken from the path. Never a role and never a
    // scope out of the request: the fourth criterion is that no endpoint reads
    // either from a body or a query string, and what the caller may do is
    // decided from the grants read out of the database below.
    requireScope(api.pool, (req) => req.params.target),
  );

test('the grants attached to a request', async (t) => {
  await t.test('are read from the database on every request', async () => {
    const cookie = await signInAs('U_TEACH');

    const response = await asUser(cookie, attached());

    assert.equal(response.status, 200);
    assert.equal(response.body.userId, byAlias('U_TEACH'));
    assert.deepEqual(response.body.roles, ['TEACHER']);
    assert.deepEqual(response.body.scopes, [DEPT_COMPUTER]);
  });

  // U_MULTI is a programme committee member and a teacher. Both grants are
  // attached, most senior first, because a route may accept either and R003's
  // role picker offers the whole list.
  await t.test('carry every grant the account holds, most senior first', async () => {
    const cookie = await signInAs('U_MULTI');

    const response = await asUser(cookie, attached());

    assert.deepEqual(response.body.roles, ['PROG_MANAGER', 'TEACHER']);
    assert.deepEqual(response.body.scopes, [PROGRAM_THAI, DEPT_COMPUTER]);
  });

  await t.test('are not carried in the session cookie', async () => {
    const cookie = await signInAs('U_MULTI');
    const token = cookie
      .find((entry) => entry.startsWith('token='))
      .split(';')[0]
      .slice('token='.length);
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

    assert.deepEqual(Object.keys(claims).sort(), ['exp', 'iat', 'user_id']);
  });
});

test('an unauthenticated request', async (t) => {
  await t.test('is refused with a 401 by the guards', async () => {
    const response = await request(attached()).get('/guarded');

    assert.equal(response.status, 401);
    assert.match(response.body.message, /เข้าสู่ระบบ/);
  });

  // The sixth criterion, on the application itself rather than a stand-in:
  // everything mounted under /api after the guard is behind it, so a route that
  // does not exist yet is already refused, while health and sign-in answer.
  await t.test('reaches health and sign-in and nothing else', async () => {
    const health = await request(api.app).get('/api/health');
    const login = await request(api.app).post('/api/auth/login').send({});
    const other = await request(api.app).get('/api/anything-else');

    assert.equal(health.status, 200);
    assert.equal(other.status, 401);
    assert.equal(other.body.message, REFUSALS.noSession);

    // Both refusals are a 401, so the status alone would say the same thing
    // whether sign-in were in front of the guard or behind it. The message is
    // what distinguishes them: sign-in answered on its own terms.
    assert.equal(login.status, 401);
    assert.equal(login.body.message, REFUSALS.credentials);
  });

  await t.test('is still answered as JSON once signed in, if the path is unknown', async () => {
    const cookie = await signInAs('U_TEACH');

    const response = await asUser(cookie, api.app, '/api/no-such-thing');

    assert.equal(response.status, 404);
    assert.equal(response.body.error, 'Not found');
  });
});

test('the role guard', async (t) => {
  await t.test('admits a caller holding the role', async () => {
    const cookie = await signInAs('U_DEPT');

    const response = await asUser(cookie, roleGuarded('DEPT_ADMIN'));

    assert.equal(response.status, 200);
  });

  await t.test('admits a caller holding any one of the roles listed', async () => {
    const cookie = await signInAs('U_MULTI');

    const response = await asUser(cookie, roleGuarded('FACULTY_ADMIN', 'TEACHER'));

    assert.equal(response.status, 200);
  });

  // The two roles the seed carries for the outside of the organisation. The
  // external assessor is a role like any other here - a grant read from the
  // database - whether the person holds a KMITL address or not, and
  // U_NONKMITL is the account that proves the domain rule belongs to sign-in
  // and not to what a signed-in caller may reach.
  await t.test('admits the faculty administrator and both external assessors', async () => {
    const faculty = await signInAs('U_FAC');
    const inside = await signInAs('U_EXT');
    const outside = await signInAs('U_NONKMITL');

    assert.equal((await asUser(faculty, roleGuarded('FACULTY_ADMIN'))).status, 200);
    assert.equal((await asUser(inside, roleGuarded('EXT_ASSESSOR'))).status, 200);
    assert.equal((await asUser(outside, roleGuarded('EXT_ASSESSOR'))).status, 200);
  });

  await t.test('refuses a caller holding none of them with a 403', async () => {
    const cookie = await signInAs('U_TEACH');

    const response = await asUser(cookie, roleGuarded('FACULTY_ADMIN', 'DEPT_ADMIN'));

    assert.equal(response.status, 403);
  });

  // The second criterion. The refusal says what the person can do about it and
  // nothing about how the server is built: no role name, no table, no
  // identifier, and nobody else's account.
  await t.test('names neither internal details nor other users', async () => {
    const cookie = await signInAs('U_EXT');

    const { body } = await asUser(cookie, roleGuarded('FULL_ADMIN'));

    assert.deepEqual(Object.keys(body), ['message']);
    assert.doesNotMatch(body.message, /FULL_ADMIN|EXT_ASSESSOR|user_roles|scope|@/);
  });

  // docs/06: the central administrator's scope is deliberately narrow - user
  // accounts and permission grants only, with no access to curriculum data.
  // That separation is enforced by curriculum routes not listing the role, and
  // a global grant is no way around it.
  await t.test('keeps the central administrator out of what it does not list', async () => {
    const cookie = await signInAs('U_ADMIN');

    const curriculum = await asUser(cookie, roleGuarded('PROG_MANAGER', 'TEACHER'));
    const accounts = await asUser(cookie, roleGuarded('FULL_ADMIN'));

    assert.equal(curriculum.status, 403);
    assert.equal(accounts.status, 200);
  });
});

test('the scope guard', async (t) => {
  await t.test('admits a caller whose grant is the record’s own scope', async () => {
    const cookie = await signInAs('U_COM');

    const response = await asUser(cookie, scopeGuarded(), `/guarded/${PROGRAM_THAI}`);

    assert.equal(response.status, 200);
  });

  await t.test('admits a caller whose grant contains the record', async () => {
    const faculty = await signInAs('U_FAC');
    const department = await signInAs('U_DEPT');

    const reach = await asUser(faculty, scopeGuarded(), `/guarded/${PROGRAM_THAI}`);
    const nearer = await asUser(department, scopeGuarded(), `/guarded/${PROGRAM_THAI}`);

    assert.equal(reach.status, 200, 'the faculty contains the programme');
    assert.equal(nearer.status, 200, 'so does the department');
  });

  // The pair the seed carries a second department and a second programme for.
  await t.test('refuses a caller whose grant is beside the record, not above it', async () => {
    const otherDepartment = await signInAs('U_DEPT2');
    const otherProgramme = await signInAs('U_COM2');

    const across = await asUser(otherDepartment, scopeGuarded(), `/guarded/${PROGRAM_THAI}`);
    const sideways = await asUser(otherProgramme, scopeGuarded(), `/guarded/${PROGRAM_THAI}`);

    assert.equal(across.status, 403);
    assert.equal(sideways.status, 403);
  });

  // The external assessor is scoped to the programme they were invited to
  // review and reaches that and nothing beside it, exactly as the programme
  // committee does.
  await t.test('holds the external assessor to the programme they assess', async () => {
    const cookie = await signInAs('U_EXT');

    const own = await asUser(cookie, scopeGuarded(), `/guarded/${PROGRAM_THAI}`);
    const other = await asUser(cookie, scopeGuarded(), `/guarded/${PROGRAM_INTERNATIONAL}`);

    assert.equal(own.status, 200);
    assert.equal(other.status, 403);
  });

  await t.test('refuses a caller reaching upwards from inside their own scope', async () => {
    const cookie = await signInAs('U_COM');

    const response = await asUser(cookie, scopeGuarded(), `/guarded/${DEPT_COMPUTER}`);

    assert.equal(response.status, 403, 'a programme grant does not reach its department');
  });

  // Including for the global grant, which is the case that matters: the routes
  // listing FULL_ADMIN are the ones that hand out permissions, and a mistyped
  // target must not be waved through on the way to one.
  await t.test('refuses a record no part of the organisation claims', async () => {
    const faculty = await signInAs('U_FAC');
    const admin = await signInAs('U_ADMIN');

    assert.equal((await asUser(faculty, scopeGuarded(), '/guarded/9999')).status, 403);
    assert.equal((await asUser(admin, scopeGuarded(), '/guarded/9999')).status, 403);
  });

  await t.test('refuses the same way the role guard does', async () => {
    const cookie = await signInAs('U_DEPT2');

    const { body } = await asUser(cookie, scopeGuarded(), `/guarded/${PROGRAM_THAI}`);

    assert.deepEqual(Object.keys(body), ['message']);
    assert.doesNotMatch(body.message, new RegExp(`${PROGRAM_THAI}|DEPT_ADMIN|@`));
  });

  // A global grant is not limited to any one part of the organisation, so it
  // passes this guard wherever it is asked. What it may ask about at all is the
  // role guard's question, asserted above.
  await t.test('is passed by a global grant', async () => {
    const cookie = await signInAs('U_ADMIN');

    const response = await asUser(cookie, scopeGuarded(), `/guarded/${PROGRAM_INTERNATIONAL}`);

    assert.equal(response.status, 200);
  });
});

/**
 * How far a record's scope reaches, asked the way a client asks it.
 *
 * These are about the chain `requireScope` resolves - programme, then
 * department, then faculty - but none of them calls it. docs/06's Testing
 * Decisions allow one seam and say a test "never reaches into a module to
 * check how a result was reached", and asserting the chain's contents
 * directly is exactly that: it pins how the answer was arrived at rather than
 * the rule the answer serves. Every rule below is visible from outside, as a
 * caller admitted or refused.
 */
test('what a scope contains', async (t) => {
  await t.test('a faculty contains its departments', async () => {
    const faculty = await signInAs('U_FAC');
    const department = await signInAs('U_DEPT');

    assert.equal((await asUser(faculty, scopeGuarded(), `/guarded/${DEPT_CIVIL}`)).status, 200);
    assert.equal((await asUser(department, scopeGuarded(), `/guarded/${DEPT_CIVIL}`)).status, 403);
  });

  await t.test('a faculty contains itself, and a department does not contain it', async () => {
    const faculty = await signInAs('U_FAC');
    const department = await signInAs('U_DEPT');

    assert.equal((await asUser(faculty, scopeGuarded(), `/guarded/${FACULTY.id}`)).status, 200);
    assert.equal((await asUser(department, scopeGuarded(), `/guarded/${FACULTY.id}`)).status, 403);
  });

  // `scope_id` has no foreign key, so the same string could name two things,
  // and which one is meant is decided by resolving programme first, then
  // department, then faculty, stopping at the first table that knows it. The
  // seed gives the faculty the code 'ENG' precisely so it cannot collide with
  // a numbered department; this puts a faculty on a programme's code on
  // purpose and asserts that the programme still wins. Were the order the
  // other way round, the department administrator below would lose its reach
  // and answer 403.
  await t.test('an identifier two tables know is the innermost of the two', async (sub) => {
    await api.pool.query(
      `INSERT INTO faculty (faculty_id, faculty_name_en, faculty_name_th)
       VALUES ($1, 'Collision', 'ชนกัน')`,
      [PROGRAM_THAI],
    );
    // In `after` rather than after the assertion: a failing assertion returns
    // here and would otherwise leave the colliding row for every test below it
    // in this file. The schema is per file, not per test.
    sub.after(() => api.pool.query(`DELETE FROM faculty WHERE faculty_id = $1`, [PROGRAM_THAI]));

    const department = await signInAs('U_DEPT');

    const response = await asUser(department, scopeGuarded(), `/guarded/${PROGRAM_THAI}`);

    assert.equal(response.status, 200);
  });

  // The sentinel a global grant is stored under is not an organisational unit,
  // so nothing sits inside it and asking about it as though it were a record
  // reaches nobody - the central administrator included.
  await t.test('the global sentinel contains nothing, not even for its holder', async () => {
    const cookie = await signInAs('U_ADMIN');

    const response = await asUser(cookie, scopeGuarded(), `/guarded/${GLOBAL_SCOPE}`);

    assert.equal(response.status, 403);
  });
});

/**
 * The fifth criterion, and the reason none of this is in the cookie: a grant
 * taken away has to bite on the very next request, with the session the caller
 * is already holding.
 */
test('a grant revoked mid-session', async (t) => {
  /**
   * Signs in, proves the guard admits the account, applies the revocation and
   * asks again on the same cookie. The undo is registered before the
   * assertions and runs whether they passed or failed - every test in this
   * file shares one schema, so a revocation left in place would be inherited
   * by whatever runs next rather than reported where it happened.
   */
  const revoked = async (sub, alias, apply, undo) => {
    const cookie = await signInAs(alias);
    const before = await asUser(cookie, roleGuarded('TEACHER'));
    assert.equal(before.status, 200);

    await apply();
    sub.after(undo);
    return asUser(cookie, roleGuarded('TEACHER'));
  };

  const setGrants = (alias, active) => () =>
    api.pool.query(`UPDATE user_roles SET is_active = $2 WHERE user_id = $1`, [
      byAlias(alias),
      active,
    ]);

  const setRole = (roleId, active) => () =>
    api.pool.query(`UPDATE roles SET is_active = $2 WHERE role_id = $1`, [roleId, active]);

  await t.test('takes effect on the next request, without signing in again', async (sub) => {
    const response = await revoked(
      sub,
      'U_TEACH',
      setGrants('U_TEACH', false),
      setGrants('U_TEACH', true),
    );

    // 403 and not 401: the session is still perfectly valid, and it is the
    // grant that is gone. Telling the caller to sign in again would send them
    // round a loop that cannot end.
    assert.equal(response.status, 403);
  });

  // Switching a role off centrally has to do the same, or `attachRoles` and
  // sign-in would disagree about who holds what: both ask `allRoles`, which
  // filters on `is_active` in both tables.
  await t.test('and so does a role switched off centrally', async (sub) => {
    const response = await revoked(
      sub,
      'U_TEACH2',
      setRole('TEACHER', false),
      setRole('TEACHER', true),
    );

    assert.equal(response.status, 403);
  });

  // An account left holding nothing is in the same state sign-in refuses, is
  // refused at the door rather than at whichever guard it happens to meet, and
  // is told the one thing it can act on: that it has no permissions at all.
  await t.test('leaves an account with no grants refused everywhere', async (sub) => {
    const cookie = await signInAs('U_EXT');
    await setGrants('U_EXT', false)();
    sub.after(setGrants('U_EXT', true));

    const response = await asUser(cookie, attached());

    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.noRole);
  });
});

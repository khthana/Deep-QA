'use strict';

/**
 * Ticket #12: role grants — what a person may do, and who decided it.
 *
 * The same seam as #11 and for the same reason: the HTTP surface in-process
 * against a real PostgreSQL, authentication never stubbed. It matters more
 * here than anywhere so far, because two of the eight criteria are sentences
 * about *the grantee's next request* - "the grantee gains that access on their
 * next request", "loses that access on their next request" - and the only
 * honest way to assert that is to hold a grantee's own session open across the
 * administrator's change and ask the server again. A test that read the
 * `user_roles` row back would prove the row, not the access.
 *
 * The eighth criterion is the other reason: "tests prove the escalation
 * attempt is refused at the server, not merely absent from the interface".
 * Every refusal below is a request crafted directly at the API with a real
 * cookie, never an assertion about what a dropdown offered.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, DEPARTMENTS, PROGRAMS } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

const [DEPT_COMPUTER, DEPT_CIVIL] = DEPARTMENTS.map((department) => department.id);
const [PROGRAM_THAI, PROGRAM_INTER] = PROGRAMS.map((program) => program.id);

let api;
before(async () => {
  api = await startApi('grants', { withSeed: true });
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

const me = (cookie) => request(api.app).get('/api/me').set('Cookie', cookie);

const grantsOf = (cookie, alias) =>
  request(api.app).get(`/api/users/${account(alias).id}/roles`).set('Cookie', cookie);

const grant = (cookie, alias, body) =>
  request(api.app).post(`/api/users/${account(alias).id}/roles`).set('Cookie', cookie).send(body);

const revoke = (cookie, alias, roleId, scopeId) =>
  request(api.app)
    .delete(`/api/users/${account(alias).id}/roles/${roleId}/${scopeId}`)
    .set('Cookie', cookie);

const grantable = (cookie) => request(api.app).get('/api/users/grantable').set('Cookie', cookie);

/** The grants a response carries, as `ROLE@scope` strings, for comparing sets. */
const held = (body) => (body.roles ?? []).map((one) => `${one.role_id}@${one.scope_id}`).sort();

// --- the second and third criteria -------------------------------------------

test('a grant reaches the grantee on their next request', async (t) => {
  const admin = await signInAs('U_DEPT');
  // The grantee's session is opened *before* the grant and held across it, so
  // what the assertions below measure is the server re-reading the grants and
  // not a fresh sign-in picking them up.
  const teacher = await signInAs('U_TEACH');

  await t.test('and the grantee held only their own grant before it', async () => {
    const before = await me(teacher);
    assert.deepEqual(held(before.body), ['TEACHER@05']);
  });

  await t.test('the administrator grants a second role', async () => {
    const response = await grant(admin, 'U_TEACH', {
      role_id: 'PROG_MANAGER',
      scope_id: PROGRAM_THAI,
    });
    assert.equal(response.status, 201, response.body.message);
    assert.deepEqual(held(response.body), ['PROG_MANAGER@0501', 'TEACHER@05']);
  });

  await t.test('and the grantee has it on their very next request', async () => {
    const after = await me(teacher);
    assert.equal(after.status, 200);
    assert.deepEqual(held(after.body), ['PROG_MANAGER@0501', 'TEACHER@05']);
  });

  await t.test('the administrator revokes it again', async () => {
    const response = await revoke(admin, 'U_TEACH', 'PROG_MANAGER', PROGRAM_THAI);
    assert.equal(response.status, 200, response.body.message);
    assert.deepEqual(held(response.body), ['TEACHER@05']);
  });

  await t.test('and the grantee has lost it on their very next request', async () => {
    const after = await me(teacher);
    assert.equal(after.status, 200);
    assert.deepEqual(held(after.body), ['TEACHER@05']);
  });

  await t.test('a revoked grant can be given back', async () => {
    // The triple is the primary key, so the revoked row is still there and a
    // plain insert would collide with it. Granting again has to revive it.
    const response = await grant(admin, 'U_TEACH', {
      role_id: 'PROG_MANAGER',
      scope_id: PROGRAM_THAI,
    });
    assert.equal(response.status, 201, response.body.message);
    assert.deepEqual(held(response.body), ['PROG_MANAGER@0501', 'TEACHER@05']);

    await revoke(admin, 'U_TEACH', 'PROG_MANAGER', PROGRAM_THAI);
  });
});

// --- the seventh criterion ---------------------------------------------------

test('a grant records who made it and when', async (t) => {
  const admin = await signInAs('U_DEPT');
  const before = new Date();

  await grant(admin, 'U_TEACH2', { role_id: 'PROG_MANAGER', scope_id: PROGRAM_THAI });

  await t.test('naming the administrator who made it', async () => {
    const response = await grantsOf(admin, 'U_TEACH2');
    assert.equal(response.status, 200);
    const made = response.body.roles.find((one) => one.role_id === 'PROG_MANAGER');
    assert.equal(made.assigned_by, account('U_DEPT').id);
    assert.ok(new Date(made.assigned_at) >= new Date(before.getTime() - 1000));
  });

  await t.test('and re-granting it after a revoke records the new granter', async () => {
    await revoke(admin, 'U_TEACH2', 'PROG_MANAGER', PROGRAM_THAI);
    const faculty = await signInAs('U_FAC');
    await grant(faculty, 'U_TEACH2', { role_id: 'PROG_MANAGER', scope_id: PROGRAM_THAI });

    const response = await grantsOf(admin, 'U_TEACH2');
    const made = response.body.roles.find((one) => one.role_id === 'PROG_MANAGER');
    assert.equal(made.assigned_by, account('U_FAC').id);

    await revoke(admin, 'U_TEACH2', 'PROG_MANAGER', PROGRAM_THAI);
  });
});

// --- the fourth criterion ----------------------------------------------------

test('a user holding several roles can act as each of them', async (t) => {
  const cookie = await signInAs('U_MULTI');

  await t.test('holds both grants at once', async () => {
    const response = await me(cookie);
    assert.deepEqual(held(response.body), ['PROG_MANAGER@0501', 'TEACHER@05']);
  });

  await t.test('and can put on either hat', async () => {
    for (const hat of [
      { role_id: 'TEACHER', scope_id: DEPT_COMPUTER },
      { role_id: 'PROG_MANAGER', scope_id: PROGRAM_THAI },
    ]) {
      const response = await request(api.app)
        .put('/api/me/acting-role')
        .set('Cookie', cookie)
        .send(hat);
      assert.equal(response.status, 200, response.body.message);
      assert.deepEqual(response.body.acting, hat);
    }
  });
});

// --- the fifth criterion -----------------------------------------------------

test('the scopes offered are limited to what the granter reaches', async (t) => {
  await t.test('a department administrator is offered their department and its programmes', async () => {
    const cookie = await signInAs('U_DEPT');
    const response = await grantable(cookie);
    assert.equal(response.status, 200);

    assert.deepEqual(
      response.body.scopes.map((scope) => scope.scope_id).sort(),
      [DEPT_COMPUTER, PROGRAM_THAI, PROGRAM_INTER].sort(),
    );
    // No role more senior than their own, and the global grant is not a scope
    // anybody but the Central Admin is offered.
    assert.deepEqual(
      response.body.roles.map((role) => role.role_id),
      ['DEPT_ADMIN', 'PROG_MANAGER', 'TEACHER', 'EXT_ASSESSOR'],
    );
    assert.ok(response.body.scopes.every((scope) => scope.label));
  });

  await t.test('the Central Admin is offered the whole university and the global grant', async () => {
    const cookie = await signInAs('U_ADMIN');
    const response = await grantable(cookie);
    assert.equal(response.status, 200);

    const offered = response.body.scopes.map((scope) => scope.scope_id);
    assert.ok(offered.includes('FULL_ADMIN'), 'only the Central Admin gives the global scope');
    assert.ok(offered.includes(DEPT_CIVIL), 'and every department, not only their own');
    assert.deepEqual(response.body.roles[0].role_id, 'FULL_ADMIN');
  });
});

// --- the sixth and eighth criteria -------------------------------------------

test('an escalation attempt is refused by the server', async (t) => {
  const cookie = await signInAs('U_DEPT');

  await t.test('a role more senior than the granter holds', async () => {
    const response = await grant(cookie, 'U_TEACH', {
      role_id: 'FACULTY_ADMIN',
      scope_id: DEPT_COMPUTER,
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.roleNotAssignable);
  });

  await t.test('the global grant itself', async () => {
    const response = await grant(cookie, 'U_TEACH', {
      role_id: 'FULL_ADMIN',
      scope_id: 'FULL_ADMIN',
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.roleNotAssignable);
  });

  await t.test('a scope the granter does not reach', async () => {
    const response = await grant(cookie, 'U_TEACH', {
      role_id: 'TEACHER',
      scope_id: DEPT_CIVIL,
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.scopeNotYours);
  });

  await t.test('an account the granter does not reach', async () => {
    const response = await grant(cookie, 'U_DEPT2', {
      role_id: 'TEACHER',
      scope_id: DEPT_COMPUTER,
    });
    assert.equal(response.status, 404);
    assert.equal(response.body.message, REFUSALS.userNotFound);
  });

  await t.test('and none of it left a grant behind', async () => {
    const response = await grantsOf(cookie, 'U_TEACH');
    assert.deepEqual(held(response.body), ['TEACHER@05']);
  });

  await t.test('a teacher cannot grant anything at all', async () => {
    const teacher = await signInAs('U_TEACH2');
    const response = await grant(teacher, 'U_TEACH', {
      role_id: 'TEACHER',
      scope_id: PROGRAM_THAI,
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.forbidden);
  });

  await t.test('and cannot revoke one either', async () => {
    const teacher = await signInAs('U_TEACH2');
    const response = await revoke(teacher, 'U_TEACH', 'TEACHER', PROGRAM_THAI);
    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.forbidden);
  });

  await t.test('nor can an administrator revoke their own grant', async () => {
    // The same rule #11 applies to deactivating yourself, for the same reason:
    // an administrator who revoked their last grant would be locked out by the
    // next request, with nobody in scope able to put it back.
    const response = await revoke(cookie, 'U_DEPT', 'DEPT_ADMIN', DEPT_COMPUTER);
    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.forbidden);
  });
});

// --- refusals that are not escalations ---------------------------------------

test('a grant that is not an escalation but is still wrong', async (t) => {
  const cookie = await signInAs('U_FAC');

  await t.test('a role that does not exist', async () => {
    const response = await grant(cookie, 'U_TEACH', {
      role_id: 'PROVOST',
      scope_id: DEPT_COMPUTER,
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.roleNotAssignable);
  });

  await t.test('a scope identifier that names nothing, from the Central Admin', async () => {
    // The one caller whose reach is unbounded is the one whose typing nothing
    // else catches: `scope_id` is not a foreign key, so without this the grant
    // is written, answers 201, and resolves to no access at all.
    const admin = await signInAs('U_ADMIN');
    const response = await grant(admin, 'U_TEACH', {
      role_id: 'TEACHER',
      scope_id: '05O1',
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.scopeUnknown);
  });

  await t.test('and the Central Admin still reaches a real one', async () => {
    const admin = await signInAs('U_ADMIN');
    const response = await grant(admin, 'U_TEACH', {
      role_id: 'TEACHER',
      scope_id: PROGRAM_THAI,
    });
    assert.equal(response.status, 201);
  });

  await t.test('a body with no role at all', async () => {
    const response = await grant(cookie, 'U_TEACH', { scope_id: DEPT_COMPUTER });
    assert.equal(response.status, 400);
    assert.equal(response.body.message, REFUSALS.invalidUser);
  });

  await t.test('revoking a grant the account does not hold', async () => {
    const response = await revoke(cookie, 'U_TEACH', 'EXT_ASSESSOR', PROGRAM_THAI);
    assert.equal(response.status, 404);
    assert.equal(response.body.message, REFUSALS.roleNotHeld);
  });

  await t.test('and reading the grants of an account outside the scope', async () => {
    const dept = await signInAs('U_DEPT');
    const response = await grantsOf(dept, 'U_DEPT2');
    assert.equal(response.status, 404);
    assert.equal(response.body.message, REFUSALS.userNotFound);
  });
});

// --- the first criterion -----------------------------------------------------

test('an administrator can edit personal details', async (t) => {
  const cookie = await signInAs('U_DEPT');

  await t.test('without disturbing the grants they hold', async () => {
    const response = await request(api.app)
      .put(`/api/users/${account('U_MULTI').id}`)
      .set('Cookie', cookie)
      .send({
        email: account('U_MULTI').email,
        title_th: 'รศ.',
        first_name_th: 'กิตติ',
        last_name_th: 'สองบทบาทแก้ไข',
        title_en: 'Assoc. Prof.',
        first_name_en: 'Kitti',
        last_name_en: 'Songbotbat',
        department_id: DEPT_COMPUTER,
        program_id: PROGRAM_THAI,
      });
    assert.equal(response.status, 200, response.body.message);
    assert.equal(response.body.user.last_name_th, 'สองบทบาทแก้ไข');

    const after = await grantsOf(cookie, 'U_MULTI');
    assert.deepEqual(held(after.body), ['PROG_MANAGER@0501', 'TEACHER@05']);
  });
});

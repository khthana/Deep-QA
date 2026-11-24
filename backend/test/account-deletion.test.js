'use strict';

/**
 * Ticket #306: deleting an account nothing refers to.
 *
 * `docs/users-screen.md` §การลบบัญชี, the owner's answers of 22 November 2569,
 * and the wording of 24 November 2569. An account may be deleted when it
 * teaches no Section, is named by no other row of any table, and its own
 * activity log holds only lines about itself. Every other case is refused with
 * `userInUse`, whose way out is the status switch in the same row.
 *
 * The accounts deleted here are made by the test, through the route an
 * administrator uses, so each starts with exactly the references `POST /users`
 * gives it - its own grant and the creator's `CREATE_USER` line, which is the
 * creator's and not the account's.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, PROGRAMS } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { startApi } = require('./helpers');

const [PROGRAM_THAI] = PROGRAMS.map((program) => program.id);

let api;
before(async () => {
  api = await startApi('account_deletion', { withSeed: true });
});
after(() => api.close());

const account = (alias) => ACCOUNTS.find((a) => a.alias === alias);

async function signInAs(alias) {
  const response = await request(api.app)
    .post('/api/auth/login')
    .send({ email: account(alias).email, password: PASSWORD });
  assert.equal(response.status, 200, `sign-in failed for ${alias}: ${response.body.message}`);
  return response.headers['set-cookie'];
}

const remove = (cookie, userId) =>
  request(api.app).delete(`/api/users/${userId}`).set('Cookie', cookie);

const exists = async (userId) =>
  (await api.pool.query('SELECT 1 FROM users WHERE user_id = $1', [userId])).rowCount === 1;

/**
 * An external assessor made by the Central Admin, with a password so that it
 * can sign in for real and write the lines an account writes about itself.
 */
async function freshAccount(admin, userId) {
  const created = await request(api.app)
    .post('/api/users')
    .set('Cookie', admin)
    .send({
      user_id: userId,
      email: `${userId.toLowerCase()}@review.example.org`,
      first_name_en: 'Fresh',
      last_name_en: userId,
      program_id: PROGRAM_THAI,
      password: 'deep-core-fresh',
      role: { role_id: 'EXT_ASSESSOR', scope_id: PROGRAM_THAI },
    });
  assert.equal(created.status, 201, created.body.message);
  return `${userId.toLowerCase()}@review.example.org`;
}

test('an account that only signed in and out is deleted, with its grants and its own lines', async () => {
  const admin = await signInAs('U_ADMIN');
  const email = await freshAccount(admin, 'DEL_FRESH');

  const signedIn = await request(api.app)
    .post('/api/auth/login')
    .send({ email, password: 'deep-core-fresh' });
  assert.equal(signedIn.status, 200, signedIn.body.message);
  await request(api.app).post('/api/auth/logout').set('Cookie', signedIn.headers['set-cookie']);
  // And by the other door, which #306's ticket did not list: the code the
  // Google sign-in writes is the same act (`SELF_ACTIVITIES`).
  await api.pool.query(`INSERT INTO user_log (user_id, activity) VALUES ($1, 'GOOGLE_LOGIN')`, [
    'DEL_FRESH',
  ]);
  const own = await api.pool.query(
    'SELECT activity FROM user_log WHERE user_id = $1 ORDER BY id',
    ['DEL_FRESH'],
  );
  assert.deepEqual(
    own.rows.map((r) => r.activity),
    ['LOGIN', 'LOGOUT', 'GOOGLE_LOGIN'],
  );

  const deleted = await remove(admin, 'DEL_FRESH');
  assert.equal(deleted.status, 204, deleted.body.message);

  assert.equal(await exists('DEL_FRESH'), false);
  const grants = await api.pool.query('SELECT 1 FROM user_roles WHERE user_id = $1', ['DEL_FRESH']);
  assert.equal(grants.rowCount, 0);

  // The administrator's lines about the account stay, naming it by text, and
  // the deletion is one of them.
  const about = await api.pool.query(
    `SELECT activity FROM user_log
      WHERE user_id = $1 AND target_kind = 'USER' AND target_id = $2 ORDER BY id`,
    [account('U_ADMIN').id, 'DEL_FRESH'],
  );
  assert.deepEqual(
    about.rows.map((r) => r.activity),
    ['CREATE_USER', 'DELETE_USER'],
  );
});

test('a suspended account nothing refers to is deleted too', async () => {
  const admin = await signInAs('U_ADMIN');
  await freshAccount(admin, 'DEL_SUSPENDED');
  const suspended = await request(api.app)
    .put('/api/users/DEL_SUSPENDED/status')
    .set('Cookie', admin)
    .send({ status: 'inactive' });
  assert.equal(suspended.status, 200);

  const deleted = await remove(admin, 'DEL_SUSPENDED');
  assert.equal(deleted.status, 204, deleted.body.message);
  assert.equal(await exists('DEL_SUSPENDED'), false);
});

test('nobody deletes their own account', async () => {
  const admin = await signInAs('U_ADMIN');
  const refused = await remove(admin, account('U_ADMIN').id);
  assert.equal(refused.status, 403);
  assert.equal(refused.body.message, REFUSALS.selfDelete);
  assert.equal(await exists(account('U_ADMIN').id), true);
});

test('an account outside the administrator’s reach is not found, and stays', async () => {
  const admin = await signInAs('U_ADMIN');
  await freshAccount(admin, 'DEL_ABOVE');
  // Seniority: a department administrator does not reach the Central Admin.
  const dept = await signInAs('U_DEPT');
  const above = await remove(dept, account('U_ADMIN').id);
  assert.equal(above.status, 404);
  assert.equal(above.body.message, REFUSALS.userNotFound);
  assert.equal(await exists(account('U_ADMIN').id), true);

  // And a teacher is not an administrator at all.
  const teacher = await signInAs('U_TEACH');
  const notAdmin = await remove(teacher, 'DEL_ABOVE');
  assert.equal(notAdmin.status, 403);
  assert.equal(await exists('DEL_ABOVE'), true);
});

test('an account that teaches a section is refused with the way round it', async () => {
  const admin = await signInAs('U_ADMIN');
  const refused = await remove(admin, account('U_TEACH').id);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.userInUse);
  assert.equal(await exists(account('U_TEACH').id), true);
});

test('an account named as a record’s author is refused, and the record keeps its author', async () => {
  const admin = await signInAs('U_ADMIN');
  await freshAccount(admin, 'DEL_AUTHOR');
  // `subjects.created_by` is `ON DELETE SET NULL`: the database would let the
  // deletion through and take the name off the subject.
  const { rows } = await api.pool.query(
    `UPDATE subjects SET created_by = $1
      WHERE subject_id = (SELECT min(subject_id) FROM subjects) RETURNING subject_id`,
    ['DEL_AUTHOR'],
  );

  const refused = await remove(admin, 'DEL_AUTHOR');
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.userInUse);
  assert.equal(await exists('DEL_AUTHOR'), true);
  const kept = await api.pool.query('SELECT created_by FROM subjects WHERE subject_id = $1', [
    rows[0].subject_id,
  ]);
  assert.equal(kept.rows[0].created_by, 'DEL_AUTHOR');
});

test('an account that granted a role is refused', async () => {
  const admin = await signInAs('U_ADMIN');
  await freshAccount(admin, 'DEL_GRANTER');
  await api.pool.query(`UPDATE user_roles SET assigned_by = $1 WHERE user_id = $2`, [
    'DEL_GRANTER',
    account('U_TEACH2').id,
  ]);

  const refused = await remove(admin, 'DEL_GRANTER');
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.userInUse);
  assert.equal(await exists('DEL_GRANTER'), true);
});

test('one activity log line about somebody else’s data refuses the deletion', async () => {
  const admin = await signInAs('U_ADMIN');
  await freshAccount(admin, 'DEL_ACTOR');
  await api.pool.query(
    `INSERT INTO user_log (user_id, activity, target_kind, target_id)
     VALUES ($1, 'DELETE_SUBJECT', 'SUBJECT', '01006001')`,
    ['DEL_ACTOR'],
  );

  const refused = await remove(admin, 'DEL_ACTOR');
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.userInUse);
  // The line is still there, which is the whole reason for refusing.
  const line = await api.pool.query(
    `SELECT 1 FROM user_log WHERE user_id = $1 AND activity = 'DELETE_SUBJECT'`,
    ['DEL_ACTOR'],
  );
  assert.equal(line.rowCount, 1);
});

test('an activity nobody has listed yet refuses rather than being deleted', async () => {
  const admin = await signInAs('U_ADMIN');
  await freshAccount(admin, 'DEL_NEWCODE');
  await api.pool.query(`INSERT INTO user_log (user_id, activity) VALUES ($1, 'SOME_NEW_ACT')`, [
    'DEL_NEWCODE',
  ]);

  const refused = await remove(admin, 'DEL_NEWCODE');
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.userInUse);
});

test('a reference a later migration adds is asked about without being listed', async () => {
  const admin = await signInAs('U_ADMIN');
  await freshAccount(admin, 'DEL_LATER');
  // A table no list in the route has heard of, referencing users the way the
  // nineteen author columns do.
  await api.pool.query(
    `CREATE TABLE later_notes (
       id int PRIMARY KEY,
       written_by varchar(20) REFERENCES users (user_id) ON DELETE SET NULL)`,
  );
  try {
    await api.pool.query(`INSERT INTO later_notes VALUES (1, 'DEL_LATER')`);
    const refused = await remove(admin, 'DEL_LATER');
    assert.equal(refused.status, 409);
    assert.equal(refused.body.message, REFUSALS.userInUse);
    assert.equal(await exists('DEL_LATER'), true);
  } finally {
    await api.pool.query('DROP TABLE later_notes');
  }
});

test('the deleter’s own DELETE_USER line makes the deleter undeletable in turn', async () => {
  const admin = await signInAs('U_ADMIN');
  await freshAccount(admin, 'DEL_DELETER');
  await freshAccount(admin, 'DEL_VICTIM');
  // DEL_DELETER's one grant becomes an administrator's, below the seam and
  // with no `assigned_by`, because what is being asked is what its own
  // deletion line does to it afterwards and nothing else may refer to it.
  await api.pool.query(
    `UPDATE user_roles SET role_id = 'FULL_ADMIN', scope_id = 'FULL_ADMIN', assigned_by = NULL
      WHERE user_id = $1`,
    ['DEL_DELETER'],
  );
  await api.pool.query(`UPDATE users SET program_id = NULL WHERE user_id = $1`, ['DEL_DELETER']);
  const deleter = await request(api.app)
    .post('/api/auth/login')
    .send({ email: 'del_deleter@review.example.org', password: 'deep-core-fresh' });
  assert.equal(deleter.status, 200, deleter.body.message);
  const cookie = deleter.headers['set-cookie'];

  // Before it deletes anything, it is deletable: signing in is about itself.
  const before = await api.pool.query(
    'SELECT activity FROM user_log WHERE user_id = $1',
    ['DEL_DELETER'],
  );
  assert.deepEqual(
    before.rows.map((r) => r.activity),
    ['LOGIN'],
  );

  const deleted = await remove(cookie, 'DEL_VICTIM');
  assert.equal(deleted.status, 204, deleted.body.message);

  const refused = await remove(admin, 'DEL_DELETER');
  assert.equal(refused.status, 409);
  assert.equal(refused.body.message, REFUSALS.userInUse);
});

test('a reference written while the deletion waits refuses it, rather than being emptied', async () => {
  const admin = await signInAs('U_ADMIN');
  await freshAccount(admin, 'DEL_RACE');

  // Another administrator's write, still open, that names DEL_RACE as a
  // subject's author. The deletion is sent while it is open.
  const writer = await api.pool.connect();
  let subjectId;
  try {
    await writer.query('BEGIN');
    const { rows } = await writer.query(
      `UPDATE subjects SET created_by = $1
        WHERE subject_id = (SELECT max(subject_id) FROM subjects) RETURNING subject_id`,
      ['DEL_RACE'],
    );
    subjectId = rows[0].subject_id;

    const sent = remove(admin, 'DEL_RACE').then((r) => r);
    // The deletion is waiting on a lock the open write holds - asked of the
    // database rather than of a clock (#52).
    for (;;) {
      const waiting = await api.pool.query(
        `SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE wait_event_type = 'Lock' AND datname = current_database()`,
      );
      if (waiting.rows[0].n > 0) break;
      await new Promise((resolve) => setImmediate(resolve));
    }
    await writer.query('COMMIT');

    const answer = await sent;
    assert.equal(answer.status, 409, answer.body.message);
    assert.equal(answer.body.message, REFUSALS.userInUse);
  } finally {
    writer.release();
  }
  const kept = await api.pool.query('SELECT created_by FROM subjects WHERE subject_id = $1', [
    subjectId,
  ]);
  assert.equal(kept.rows[0].created_by, 'DEL_RACE');
});

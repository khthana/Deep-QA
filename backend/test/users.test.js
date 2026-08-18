'use strict';

/**
 * Ticket #11: user accounts — who exists, what they may be, and for how long.
 *
 * One seam, as docs/06 settles it: the HTTP surface in-process against a real
 * PostgreSQL, with authentication never stubbed. Every session below is
 * obtained by signing in for real, which is also what makes the second, third
 * and fourth criteria assertable at all - "can immediately sign in", "cannot
 * sign in" and "is refused outside it" are all statements about the sign-in
 * route, and a test that stubbed it would be asserting its own stub.
 *
 * The file owns its schema and seeds it, so the eleven named accounts of
 * docs/04 §1.2 are there to be listed, scoped and refused. Tests that create
 * accounts give them identifiers of their own that no other test names.
 */

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { PASSWORD, ACCOUNTS, byAlias, DEPARTMENTS, PROGRAMS } = require('../../db/seed');
const { REFUSALS } = require('../auth/refusals');
const { IMPORT_COLUMNS } = require('../routes/users');
const { startApi } = require('./helpers');

const [DEPT_COMPUTER, DEPT_CIVIL] = DEPARTMENTS.map((department) => department.id);
const [PROGRAM_THAI] = PROGRAMS.map((program) => program.id);

let api;
before(async () => {
  api = await startApi('users', { withSeed: true });
});
after(() => api.close());

const emailOf = (alias) => ACCOUNTS.find((account) => account.alias === alias).email;

async function signInAs(alias, password = PASSWORD) {
  const response = await request(api.app)
    .post('/api/auth/login')
    .send({ email: emailOf(alias), password });
  assert.equal(response.status, 200, `sign-in failed for ${alias}: ${response.body.message}`);
  return response.headers['set-cookie'];
}

const list = (cookie, query = '') =>
  request(api.app).get(`/api/users${query}`).set('Cookie', cookie);

const create = (cookie, body) =>
  request(api.app).post('/api/users').set('Cookie', cookie).send(body);

const setStatus = (cookie, userId, status) =>
  request(api.app).put(`/api/users/${userId}/status`).set('Cookie', cookie).send({ status });

const importCsv = (cookie, csv) =>
  request(api.app)
    .post('/api/users/import')
    .set('Cookie', cookie)
    .set('Content-Type', 'text/csv')
    .send(csv);

/** A CSV whose header is the template's, from rows given as objects. */
const csvOf = (rows) =>
  [
    IMPORT_COLUMNS.join(','),
    ...rows.map((row) => IMPORT_COLUMNS.map((column) => row[column] ?? '').join(',')),
  ].join('\r\n');

/** Signing in as a freshly made account, which is `admit()`'s whole verdict. */
const signInWith = (email, password) =>
  request(api.app).post('/api/auth/login').send({ email, password });

/** A day offset from today, as the ISO date the routes accept. */
const day = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

// --- the first criterion -----------------------------------------------------

test('the user list', async (t) => {
  await t.test('paginates rather than returning every account at once', async () => {
    const admin = await signInAs('U_ADMIN');

    const first = await list(admin);

    assert.equal(first.status, 200);
    // Ten is the number the criterion names, and the seed has more accounts
    // than that - so a route returning everything would pass a test that only
    // checked the rows came back.
    assert.equal(first.body.users.length, 10);
    assert.ok(first.body.total > 10, `expected more than one page, got ${first.body.total}`);
    assert.equal(first.body.page, 1);
  });

  await t.test('has a second page holding the accounts the first left out', async () => {
    const admin = await signInAs('U_ADMIN');

    const first = await list(admin, '?page=1');
    const second = await list(admin, '?page=2');

    assert.equal(second.status, 200);
    assert.ok(second.body.users.length > 0);
    // The two pages must not overlap. A LIMIT without an OFFSET, or an ORDER BY
    // the database is free to vary, both return rows and both are wrong.
    const firstIds = first.body.users.map((user) => user.user_id);
    const secondIds = second.body.users.map((user) => user.user_id);
    assert.deepEqual(
      secondIds.filter((id) => firstIds.includes(id)),
      [],
    );
  });

  await t.test('filters by a fragment of the address', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await list(admin, '?q=teach');

    assert.equal(response.status, 200);
    assert.ok(response.body.total >= 2);
    assert.ok(response.body.users.every((user) => user.email.includes('teach')));
  });

  await t.test('filters by role, and by status', async () => {
    const admin = await signInAs('U_ADMIN');

    const assessors = await list(admin, '?role=EXT_ASSESSOR');
    const active = await list(admin, '?status=active');

    assert.ok(assessors.body.total >= 2);
    assert.ok(
      assessors.body.users.every((user) =>
        user.roles.some((grant) => grant.role_id === 'EXT_ASSESSOR'),
      ),
    );
    assert.ok(active.body.users.every((user) => user.status === 'active'));
  });

  await t.test('never carries the password column, on any row of any page', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await list(admin, '?per_page=100');

    assert.ok(response.body.users.length >= ACCOUNTS.length);
    assert.ok(response.body.users.every((user) => user.password === undefined));
  });
});

// --- the second criterion ----------------------------------------------------

test('adding an account', async (t) => {
  await t.test('lets it sign in straight away', async () => {
    const admin = await signInAs('U_ADMIN');
    const email = 'newteacher@kmitl.ac.th';

    const created = await create(admin, {
      user_id: 'NEW_TEACH',
      email,
      title_th: 'นาย',
      first_name_th: 'ใหม่',
      last_name_th: 'มาใหม่',
      department_id: DEPT_COMPUTER,
      password: 'deep-core-new',
      role: { role_id: 'TEACHER', scope_id: DEPT_COMPUTER },
    });

    assert.equal(created.status, 201, created.body.message);
    assert.equal(created.body.user.email, email);
    assert.equal(created.body.user.password, undefined);

    // The criterion, and the only way to assert it: not that the row looks
    // right, but that the account is admitted. `is_verified` defaults to false
    // in the schema and an unverified account is refused by name, so a create
    // that wrote the obvious columns and nothing else would fail here.
    const signedIn = await signInWith(email, 'deep-core-new');
    assert.equal(signedIn.status, 200, signedIn.body.message);
  });

  await t.test('refuses an address that is already in use', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await create(admin, {
      user_id: 'DUPLICATE',
      email: emailOf('U_TEACH'),
      first_name_th: 'ซ้ำ',
      department_id: DEPT_COMPUTER,
      role: { role_id: 'TEACHER', scope_id: DEPT_COMPUTER },
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.message, REFUSALS.duplicateEmail);
    // And left nothing behind: the account and its grant are one transaction.
    const { rows } = await api.pool.query(`SELECT 1 FROM users WHERE user_id = 'DUPLICATE'`);
    assert.deepEqual(rows, []);
  });

  await t.test('refuses an account with no grant, which could not sign in', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await create(admin, {
      user_id: 'NO_GRANT',
      email: 'nogrant@kmitl.ac.th',
      first_name_th: 'ไร้',
      department_id: DEPT_COMPUTER,
    });

    assert.equal(response.status, 400);
  });
});

// --- the third criterion -----------------------------------------------------

test('deactivating an account', async (t) => {
  await t.test('stops it signing in, and reactivating lets it back', async () => {
    const admin = await signInAs('U_ADMIN');
    const email = 'suspendme@kmitl.ac.th';

    await create(admin, {
      user_id: 'SUSPEND_ME',
      email,
      first_name_th: 'ระงับ',
      department_id: DEPT_COMPUTER,
      password: 'deep-core-suspend',
      role: { role_id: 'TEACHER', scope_id: DEPT_COMPUTER },
    });
    assert.equal((await signInWith(email, 'deep-core-suspend')).status, 200);

    const off = await setStatus(admin, 'SUSPEND_ME', 'inactive');
    assert.equal(off.status, 200);
    assert.equal(off.body.user.status, 'inactive');

    const refused = await signInWith(email, 'deep-core-suspend');
    assert.equal(refused.status, 403);
    assert.equal(refused.body.message, REFUSALS.inactive);

    const on = await setStatus(admin, 'SUSPEND_ME', 'active');
    assert.equal(on.status, 200);
    assert.equal((await signInWith(email, 'deep-core-suspend')).status, 200);

    // The row survives. "Deactivating without deleting" is the whole point of
    // the criterion: an account that graded something is what an accreditation
    // review is later shown, and deleting it takes the record with it.
    const { rows } = await api.pool.query(`SELECT status FROM users WHERE user_id = 'SUSPEND_ME'`);
    assert.equal(rows.length, 1);
  });

  await t.test('takes effect on the next request of a session already open', async () => {
    // Not in the criteria, and the reason it is here anyway: a cookie lasts
    // half an hour, so an account suspended at ten past goes on working until
    // twenty to. #9's fifth criterion made a revoked grant bite at once by
    // re-reading it every request; a suspended account is the same event and
    // deserves the same answer.
    const admin = await signInAs('U_ADMIN');
    const email = 'midsession@kmitl.ac.th';

    await create(admin, {
      user_id: 'MID_SESSION',
      email,
      first_name_th: 'กลางคัน',
      department_id: DEPT_COMPUTER,
      password: 'deep-core-mid',
      role: { role_id: 'TEACHER', scope_id: DEPT_COMPUTER },
    });
    const cookie = (await signInWith(email, 'deep-core-mid')).headers['set-cookie'];
    assert.equal((await request(api.app).get('/api/me').set('Cookie', cookie)).status, 200);

    await setStatus(admin, 'MID_SESSION', 'inactive');

    const after = await request(api.app).get('/api/me').set('Cookie', cookie);
    assert.equal(after.status, 403);
    assert.equal(after.body.message, REFUSALS.inactive);
  });

  await t.test('is refused to an administrator on their own account', async () => {
    // Locking the Central Admin out is unrecoverable without a database
    // console, and no reading of the criterion makes it a feature.
    const admin = await signInAs('U_ADMIN');

    const response = await setStatus(admin, byAlias('U_ADMIN'), 'inactive');

    assert.equal(response.status, 403);
    const { rows } = await api.pool.query(`SELECT status FROM users WHERE user_id = $1`, [
      byAlias('U_ADMIN'),
    ]);
    assert.equal(rows[0].status, 'active');
  });
});

// --- the fourth criterion ----------------------------------------------------

test('an external assessor with a validity period', async (t) => {
  await t.test('signs in inside the window and is refused outside it', async () => {
    const admin = await signInAs('U_ADMIN');
    const email = 'roundassessor@tabee-review.org';

    const created = await create(admin, {
      user_id: 'ROUND_EXT',
      email,
      first_name_en: 'Round',
      last_name_en: 'Assessor',
      program_id: PROGRAM_THAI,
      password: 'deep-core-round',
      valid_from: day(-1),
      valid_until: day(7),
      role: { role_id: 'EXT_ASSESSOR', scope_id: PROGRAM_THAI },
    });

    assert.equal(created.status, 201, created.body.message);
    // The window came back as it was given: a date, not a timestamp that has
    // acquired a timezone on the way through.
    assert.equal(created.body.user.valid_until, day(7));

    const inside = await signInWith(email, 'deep-core-round');
    assert.equal(inside.status, 200, inside.body.message);

    // The window moved into the past rather than the clock moved forward: the
    // dates are the account's, and a test that waited for a day to pass is not
    // a test. Everything else about the account is untouched.
    await api.pool.query(
      `UPDATE users SET valid_from = $2::date, valid_until = $3::date WHERE user_id = $1`,
      ['ROUND_EXT', day(-30), day(-10)],
    );

    const outside = await signInWith(email, 'deep-core-round');
    assert.equal(outside.status, 403);
    assert.equal(outside.body.message, REFUSALS.outsideValidity);
    // And is told apart from a suspended account, because the two need
    // different things done about them - one needs its dates extended.
    assert.notEqual(outside.body.message, REFUSALS.inactive);
  });

  await t.test('is refused before the window opens, not only after it closes', async () => {
    const admin = await signInAs('U_ADMIN');
    const email = 'futureassessor@tabee-review.org';

    await create(admin, {
      user_id: 'FUTURE_EXT',
      email,
      first_name_en: 'Future',
      program_id: PROGRAM_THAI,
      password: 'deep-core-future',
      valid_from: day(10),
      valid_until: day(20),
      role: { role_id: 'EXT_ASSESSOR', scope_id: PROGRAM_THAI },
    });

    const response = await signInWith(email, 'deep-core-future');

    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.outsideValidity);
  });

  await t.test('refuses a window that ends before it starts', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await create(admin, {
      user_id: 'BACKWARDS_EXT',
      email: 'backwards@tabee-review.org',
      first_name_en: 'Backwards',
      program_id: PROGRAM_THAI,
      valid_from: day(20),
      valid_until: day(10),
      role: { role_id: 'EXT_ASSESSOR', scope_id: PROGRAM_THAI },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, REFUSALS.invalidValidity);
  });

  await t.test('leaves an account with no window stated able to sign in', async () => {
    // Every ordinary staff account is this case, and the migration's two
    // nullable columns are what make it true. A default would have put a date
    // on all of them.
    const response = await signInWith(emailOf('U_TEACH'), PASSWORD);
    assert.equal(response.status, 200);
  });
});

// --- the fifth criterion -----------------------------------------------------

test('the import template', async (t) => {
  await t.test('downloads from the screen as a spreadsheet file', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await request(api.app)
      .get('/api/users/import-template')
      .set('Cookie', admin);

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /text\/csv/);
    assert.match(response.headers['content-disposition'], /attachment/);
    for (const column of IMPORT_COLUMNS) assert.ok(response.text.includes(column), column);
  });

  await t.test('is a file this system can then import', async () => {
    // The template and the reader are the two halves of the fifth and sixth
    // criteria, and the failure worth catching is that they drift apart: a
    // column renamed on one side leaves a template that downloads, uploads,
    // and reports every row as missing a name.
    const admin = await signInAs('U_ADMIN');
    const template = await request(api.app).get('/api/users/import-template').set('Cookie', admin);

    const { parseTable } = require('../lib/csv');
    const { headers, records } = parseTable(template.text);

    assert.deepEqual(headers, IMPORT_COLUMNS);
    assert.equal(records.length, 1);
    assert.equal(records[0].line, 2);
  });
});

// --- the sixth criterion -----------------------------------------------------

test('importing a valid spreadsheet', async (t) => {
  await t.test('creates every row, and each can sign in', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await importCsv(
      admin,
      csvOf([
        {
          user_id: 'IMP_ONE',
          email: 'impone@kmitl.ac.th',
          first_name_th: 'หนึ่ง',
          last_name_th: 'นำเข้า',
          department_id: DEPT_COMPUTER,
          role_id: 'TEACHER',
          scope_id: DEPT_COMPUTER,
        },
        {
          user_id: 'IMP_TWO',
          email: 'imptwo@kmitl.ac.th',
          first_name_th: 'สอง',
          last_name_th: 'นำเข้า',
          department_id: DEPT_COMPUTER,
          role_id: 'TEACHER',
          scope_id: DEPT_COMPUTER,
        },
        {
          user_id: 'IMP_THREE',
          email: 'impthree@kmitl.ac.th',
          first_name_th: 'สาม',
          last_name_th: 'นำเข้า',
          program_id: PROGRAM_THAI,
          department_id: DEPT_COMPUTER,
          role_id: 'PROG_MANAGER',
          scope_id: PROGRAM_THAI,
        },
      ]),
    );

    assert.equal(response.status, 201, JSON.stringify(response.body.errors));
    assert.equal(response.body.created, 3);
    assert.deepEqual(response.body.errors, []);

    const { rows } = await api.pool.query(
      `SELECT u.user_id, ur.role_id FROM users u
         JOIN user_roles ur ON ur.user_id = u.user_id
        WHERE u.user_id IN ('IMP_ONE', 'IMP_TWO', 'IMP_THREE') ORDER BY u.user_id`,
    );
    // Three accounts and three grants: an import that wrote the people and not
    // their roles would leave three accounts that cannot sign in.
    assert.deepEqual(
      rows.map((row) => [row.user_id, row.role_id]),
      [
        ['IMP_ONE', 'TEACHER'],
        ['IMP_THREE', 'PROG_MANAGER'],
        ['IMP_TWO', 'TEACHER'],
      ],
    );
  });

  await t.test('reads a quoted field containing a comma', async () => {
    const admin = await signInAs('U_ADMIN');

    const csv = [
      IMPORT_COLUMNS.join(','),
      `IMP_QUOTED,impquoted@kmitl.ac.th,,"สมชาย, จูเนียร์",ใจดี,,,,${DEPT_COMPUTER},,TEACHER,${DEPT_COMPUTER},,`,
    ].join('\r\n');

    const response = await importCsv(admin, csv);

    assert.equal(response.status, 201, JSON.stringify(response.body.errors));
    const { rows } = await api.pool.query(
      `SELECT first_name_th FROM users WHERE user_id = 'IMP_QUOTED'`,
    );
    assert.equal(rows[0].first_name_th, 'สมชาย, จูเนียร์');
  });
});

// --- the seventh criterion ---------------------------------------------------

test('importing a spreadsheet with bad rows', async (t) => {
  await t.test('names each failure with its line and reason, and applies nothing', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await importCsv(
      admin,
      csvOf([
        // Line 2: good, and must not survive.
        {
          user_id: 'BAD_GOOD',
          email: 'badgood@kmitl.ac.th',
          first_name_th: 'ดี',
          department_id: DEPT_COMPUTER,
          role_id: 'TEACHER',
          scope_id: DEPT_COMPUTER,
        },
        // Line 3: no address at all.
        {
          user_id: 'BAD_NOEMAIL',
          first_name_th: 'ไร้เมล',
          department_id: DEPT_COMPUTER,
          role_id: 'TEACHER',
          scope_id: DEPT_COMPUTER,
        },
        // Line 4: an address that is already somebody else's.
        {
          user_id: 'BAD_TAKEN',
          email: emailOf('U_TEACH'),
          first_name_th: 'ซ้ำ',
          department_id: DEPT_COMPUTER,
          role_id: 'TEACHER',
          scope_id: DEPT_COMPUTER,
        },
        // Line 5: a date nobody can read.
        {
          user_id: 'BAD_DATE',
          email: 'baddate@kmitl.ac.th',
          first_name_th: 'วันที่',
          department_id: DEPT_COMPUTER,
          role_id: 'TEACHER',
          scope_id: DEPT_COMPUTER,
          valid_until: '31/03/2026',
        },
      ]),
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.message, REFUSALS.importRejected);
    assert.equal(response.body.created, 0);

    // Every bad line, by the number the person sees in their spreadsheet -
    // the header is line 1 - and the good line is not among them.
    assert.deepEqual(
      response.body.errors.map((error) => error.line),
      [3, 4, 5],
    );
    assert.ok(response.body.errors.every((error) => typeof error.message === 'string'));
    assert.equal(
      response.body.errors.find((error) => error.line === 4).message,
      REFUSALS.duplicateEmail,
    );

    // Nothing partially applied, and this is the assertion the criterion turns
    // on: the good row on line 2 was writable and must be gone.
    const { rows } = await api.pool.query(
      `SELECT user_id FROM users WHERE user_id LIKE 'BAD_%'`,
    );
    assert.deepEqual(rows, []);
  });

  await t.test('reports two rows claiming the same address, by both lines', async () => {
    // Each row is fine on its own and the pair is not. Left to the database it
    // would come back as a constraint name rather than a line number, which is
    // not something the person can act on.
    const admin = await signInAs('U_ADMIN');

    const response = await importCsv(
      admin,
      csvOf([
        {
          user_id: 'DUP_A',
          email: 'sameaddress@kmitl.ac.th',
          first_name_th: 'ก',
          department_id: DEPT_COMPUTER,
          role_id: 'TEACHER',
          scope_id: DEPT_COMPUTER,
        },
        {
          user_id: 'DUP_B',
          email: 'sameaddress@kmitl.ac.th',
          first_name_th: 'ข',
          department_id: DEPT_COMPUTER,
          role_id: 'TEACHER',
          scope_id: DEPT_COMPUTER,
        },
      ]),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(
      response.body.errors.map((error) => error.line),
      [3],
    );
    assert.match(response.body.errors[0].message, /บรรทัดที่ 2/);
    const { rows } = await api.pool.query(`SELECT user_id FROM users WHERE user_id LIKE 'DUP_%'`);
    assert.deepEqual(rows, []);
  });

  await t.test('refuses an empty file rather than reporting a successful import of nothing', async () => {
    const admin = await signInAs('U_ADMIN');

    const response = await importCsv(admin, `${IMPORT_COLUMNS.join(',')}\r\n`);

    assert.equal(response.status, 400);
    assert.equal(response.body.message, REFUSALS.importEmpty);
  });
});

// --- the eighth criterion ----------------------------------------------------

test('an administrator below the Central Admin', async (t) => {
  await t.test('sees only the accounts within their own scope', async () => {
    const dept = await signInAs('U_DEPT');

    const response = await list(dept, '?per_page=100');

    assert.equal(response.status, 200);
    const emails = response.body.users.map((user) => user.email);
    // Their own department and the programmes under it, and nothing from the
    // department next door.
    assert.ok(emails.includes(emailOf('U_TEACH')));
    assert.ok(emails.includes(emailOf('U_COM')));
    assert.ok(!emails.includes(emailOf('U_DEPT2')), 'saw the other department');
    // And not the Central Admin, who is senior to them and belongs to no
    // department at all.
    assert.ok(!emails.includes(emailOf('U_ADMIN')), 'saw the Central Admin');
  });

  await t.test('sees more when they are a faculty administrator than a department one', async () => {
    // Without this the scope filter could be refusing everything below the top
    // and the test above would still pass.
    const faculty = await signInAs('U_FAC');

    const response = await list(faculty, '?per_page=100');

    const emails = response.body.users.map((user) => user.email);
    assert.ok(emails.includes(emailOf('U_TEACH')), 'the faculty misses its own department');
    assert.ok(emails.includes(emailOf('U_DEPT2')), 'the faculty misses the other department');
    assert.ok(!emails.includes(emailOf('U_ADMIN')), 'the faculty saw the Central Admin');
  });

  await t.test('is refused an account outside their scope, and told nothing about it', async () => {
    const dept = await signInAs('U_DEPT');

    const response = await request(api.app)
      .get(`/api/users/${byAlias('U_DEPT2')}`)
      .set('Cookie', dept);

    assert.equal(response.status, 404);
    assert.equal(response.body.message, REFUSALS.userNotFound);
    // 404 and not 403, so an administrator cannot map the university by asking
    // for identifiers and reading which refusal came back.
    assert.deepEqual(Object.keys(response.body), ['message']);
  });

  await t.test('cannot deactivate an account outside their scope', async () => {
    // The list is a convenience; this is the rule. An administrator who has
    // the identifier from somewhere else must be refused at the write too.
    const dept = await signInAs('U_DEPT');

    const response = await setStatus(dept, byAlias('U_TEACH2'), 'inactive');
    assert.equal(response.status, 200, 'their own department should be theirs to manage');

    const across = await setStatus(dept, byAlias('U_DEPT2'), 'inactive');
    assert.equal(across.status, 404);

    const { rows } = await api.pool.query(`SELECT status FROM users WHERE user_id = $1`, [
      byAlias('U_DEPT2'),
    ]);
    assert.equal(rows[0].status, 'active');

    await api.pool.query(`UPDATE users SET status = 'active' WHERE user_id = $1`, [
      byAlias('U_TEACH2'),
    ]);
  });

  await t.test('cannot deactivate an administrator more senior than themselves', async () => {
    // The escalation the seniority rule exists to stop, through a door marked
    // "user management" rather than "permissions". U_FAC is in the department
    // administrator's faculty and would pass a scope check alone.
    const dept = await signInAs('U_DEPT');

    const response = await setStatus(dept, byAlias('U_FAC'), 'inactive');

    assert.equal(response.status, 404);
    const { rows } = await api.pool.query(`SELECT status FROM users WHERE user_id = $1`, [
      byAlias('U_FAC'),
    ]);
    assert.equal(rows[0].status, 'active');
  });

  await t.test('cannot create an account outside their scope', async () => {
    const dept = await signInAs('U_DEPT');

    const response = await create(dept, {
      user_id: 'ACROSS_DEPT',
      email: 'acrossdept@kmitl.ac.th',
      first_name_th: 'ข้ามภาค',
      department_id: DEPT_CIVIL,
      role: { role_id: 'TEACHER', scope_id: DEPT_CIVIL },
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.scopeNotYours);
  });

  await t.test('cannot grant a role more senior than their own', async () => {
    const dept = await signInAs('U_DEPT');

    const response = await create(dept, {
      user_id: 'PROMOTED',
      email: 'promoted@kmitl.ac.th',
      first_name_th: 'เลื่อนขั้น',
      department_id: DEPT_COMPUTER,
      role: { role_id: 'FACULTY_ADMIN', scope_id: DEPT_COMPUTER },
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.message, REFUSALS.roleNotAssignable);
  });

  await t.test('has the same limits when importing as when adding one at a time', async () => {
    // A rule the form enforces and the import does not is a rule with a way
    // around it, and the import is how a hundred accounts arrive at once.
    const dept = await signInAs('U_DEPT');

    const response = await importCsv(
      dept,
      csvOf([
        {
          user_id: 'IMP_MINE',
          email: 'impmine@kmitl.ac.th',
          first_name_th: 'ของฉัน',
          department_id: DEPT_COMPUTER,
          role_id: 'TEACHER',
          scope_id: DEPT_COMPUTER,
        },
        {
          user_id: 'IMP_ACROSS',
          email: 'impacross@kmitl.ac.th',
          first_name_th: 'ข้ามภาค',
          department_id: DEPT_CIVIL,
          role_id: 'TEACHER',
          scope_id: DEPT_CIVIL,
        },
      ]),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(
      response.body.errors.map((error) => error.line),
      [3],
    );
    assert.equal(response.body.errors[0].message, REFUSALS.scopeNotYours);
    const { rows } = await api.pool.query(`SELECT user_id FROM users WHERE user_id LIKE 'IMP_MI%'`);
    assert.deepEqual(rows, [], 'the row within scope was written despite the report');
  });

  await t.test('is refused the screen entirely by a role that is not an administrator', async () => {
    const teacher = await signInAs('U_TEACH');

    const response = await list(teacher);

    assert.equal(response.status, 403);
    assert.deepEqual(Object.keys(response.body), ['message']);
  });
});

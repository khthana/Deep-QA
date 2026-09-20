'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { hold } = require('../support/hold');
const { openUsers, userRow } = require('../support/users-screen');
const {
  ROLE_NAMES,
  openEditor,
  grantRow,
  grantCell,
  addGrant,
  revoke,
} = require('../support/grants-panel');

/**
 * docs/acceptance/12-role-grants.md - granting, revoking, and the two things
 * that make either of them mean anything: that the grantee's access changes on
 * their very next request, and that the panel records who changed it.
 *
 * The interesting half of this ticket is not the table. It is that a grant is
 * re-read from the database on every request rather than trusted from the
 * cookie, which is what `attachRoles` does and what row 3 asks for in the one
 * direction that has a security consequence. That row needs two browsers at
 * once - the administrator revoking and the person losing the access - so the
 * grantee below gets a context of their own and keeps it across the change.
 *
 * `/main/course-in-program` is the screen used to ask "does this person still
 * have it": it is the only built screen a `PROG_MANAGER` reaches and a
 * `TEACHER` does not (`MAINTAINERS` in `backend/routes/programSubjects.js`),
 * so the same address answers 200 while the hat is held and 403 once it is
 * not.
 *
 * `mode: 'serial'` because every row here writes grants to one seeded account.
 * Each test still makes the state it needs rather than inheriting it, so a
 * single row can be run on its own, and the file leaves `teacher.one@` holding
 * what the seed gave it.
 */
test.describe.configure({ mode: 'serial' });

const COMMITTEE = ROLE_NAMES.PROG_MANAGER;
const PROGRAM = '0501';
const PROGRAM_SUBJECTS = '/api/program-subjects';

/**
 * Whatever the run did, `teacher.one@` is not on the committee when it ends.
 *
 * Every row that grants it revokes it again through the panel, and that revoke
 * is part of what those rows assert - so it only happens on the path where
 * they pass. Rows 2 and 3 grant before their first browser-side assertion and
 * revoke after their last, and #52's sweep is what showed the cost: a mutant
 * that failed them in between left the account a committee member for the
 * rest of the run, `actingFrom` put the new grant first, and **every teacher
 * row in every later file** was refused as a committee member - 171 failures
 * for a mutant that fails 13 with this net in place. The same shape #89 found
 * in a backend fixture: a row that restores what it moved only when it passes
 * inflates the next mutant's count.
 *
 * The net was an `UPDATE` that switched the grant off, which left the switched
 * off row behind for every later file. Since #134 it is `support/hold.js`: the
 * grant is a row that appeared while this file ran, so it is taken out, and the
 * account ends the file holding what the seed gave it and nothing else. Still
 * in `afterAll`, and for the same reason.
 */
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** The date the panel would print for something granted just now. */
const todayAsDrawn = page =>
  page.evaluate(() =>
    new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  );

/** What the programme-subjects screen answers to whoever is asking for it. */
async function reachProgramSubjects(page) {
  const answer = page.waitForResponse(
    response => new URL(response.url()).pathname === PROGRAM_SUBJECTS,
  );
  await page.goto('/main/course-in-program');
  return (await answer).status();
}

test('row 1: editing personal details leaves the grants alone', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  const surname = 'สอนดีเปลี่ยนแล้ว';
  await page.getByLabel('นามสกุล (ไทย)').fill(surname);
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();

  // The banner is not the row: a screen that announced a save it never sent
  // would show exactly this and leave the table as it was. The list is the one
  // the save re-read, still filtered to this person by the search the editor
  // was opened through.
  await expect(userRow(page, ACCOUNTS.teacherOne)).toContainText(surname);

  // The second half of the criterion, and the one worth a spec: the details
  // and the grants are two writes to two tables, and an update that replaced
  // the account wholesale would take the grants with it.
  await openEditor(page, ACCOUNTS.teacherOne);
  await expect(grantRow(page, ROLE_NAMES.TEACHER, '05')).toHaveCount(1);

  // Put the seeded surname back, so this file leaves the account as it found
  // it and can be run twice.
  await page.getByLabel('นามสกุล (ไทย)').fill('สอนดี');
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await expect(page.getByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeVisible();
});

test('rows 2 and 7: a second grant is recorded with who made it and when', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  const response = await addGrant(page, { role: 'PROG_MANAGER', scope: PROGRAM });
  expect(response.status()).toBe(201);
  await expect(page.getByText('เพิ่มบทบาทเรียบร้อยแล้ว')).toBeVisible();
  await expect(grantRow(page, COMMITTEE, PROGRAM)).toHaveCount(1);

  // Criterion 7. `assigned_by` is the account that pressed the button, taken
  // from the session and never from the request, so a panel that posted its
  // own idea of who was acting could not put this value here.
  await expect(grantCell(page, COMMITTEE, PROGRAM, 'ผู้กำหนด')).toHaveText('deptadm05');
  await expect(grantCell(page, COMMITTEE, PROGRAM, 'เมื่อ')).toHaveText(await todayAsDrawn(page));

  // And what it was already holding is still there beside it, which is what
  // criterion 2 means by a *second* role.
  await expect(grantRow(page, ROLE_NAMES.TEACHER, '05')).toHaveCount(1);

  // Handed back, so the row below starts from a teacher who is not yet on a
  // committee - which is the state its first assertion is about.
  expect((await revoke(page, COMMITTEE, PROGRAM)).status()).toBe(200);
});

test('rows 2 and 3: the grantee gains and loses the access on their next request', async ({
  page,
  browser,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  // The grantee's own browser, on its own cookie, signed in *before* the grant
  // is made - which is what makes the two assertions below about a running
  // session rather than about what a fresh sign-in would have read. Nothing is
  // copied between the two contexts: all they share is the database.
  const theirs = await browser.newContext();
  const grantee = await theirs.newPage();
  await signIn(grantee, ACCOUNTS.teacherOne, PASSWORD);

  // The baseline the 200 below needs. Without it, a screen that let everybody
  // in would satisfy the next assertion without a grant having done anything.
  expect(await reachProgramSubjects(grantee)).toBe(403);

  await addGrant(page, { role: 'PROG_MANAGER', scope: PROGRAM });

  // Criterion 2's second row. A reload rather than a fresh sign-in: the cookie
  // is the one issued before the grant existed, and it still works. What the
  // reload is needed for is the shell, which reads `/api/me` when it mounts -
  // so the picker learns of a new grant on the next load and not on the next
  // click inside the shell. That is weaker than the row's "press any menu
  // item" and the checklist says so.
  //
  // The picker comes back showing the committee rather than the teacher
  // because the session never recorded a choice - `actingFrom` falls back to
  // the most senior grant held, and the new one outranks the old.
  await grantee.reload();
  await expect(
    grantee.getByRole('button', { name: `${COMMITTEE} ${PROGRAM}` }),
  ).toBeVisible();
  expect(await reachProgramSubjects(grantee)).toBe(200);

  // Criterion 3, revoked in the other browser while the grantee's session is
  // still acting as the committee.
  const removed = await revoke(page, COMMITTEE, PROGRAM);
  expect(removed.status()).toBe(200);
  await expect(page.getByText('ยกเลิกบทบาทเรียบร้อยแล้ว')).toBeVisible();
  await expect(grantRow(page, COMMITTEE, PROGRAM)).toHaveCount(0);

  // The next request, on the cookie they already had. Refused - not honoured
  // until the session runs out, which is what a cookie carrying its own roles
  // would have done.
  expect(await reachProgramSubjects(grantee)).toBe(403);
  await expect(grantee.getByText(REFUSALS.forbidden)).toBeVisible();

  await theirs.close();
});

test('row 6: the button on your own grant is dead, and says why', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.departmentAdmin05);

  const own = grantRow(page, ROLE_NAMES.DEPT_ADMIN, '05');
  await expect(own).toHaveCount(1);

  // Until #130 this row pressed the button and read the refusal back, and its
  // own comment said the rule could not be "there is no button". It is now:
  // the button was one that always failed, which is #84's shape one screen
  // over, and the three rows that pressed it for its banner were given a
  // refusal of their own instead (`U_CROSS` in `db/seed.js`).
  //
  // Drawn and not hidden, so the column keeps its shape and the reason is on
  // the control itself. The title is a copy of the server's sentence that
  // `create-react-app` will not let the screen import, so this assertion is
  // where the two part company.
  const button = own.getByRole('button', { name: 'ยกเลิกบทบาท' });
  await expect(button).toBeVisible();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute('title', REFUSALS.selfRevoke);
});

test('row 6: another account keeps the buttons it always had', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.crossScope);

  // The control against a mutant that kills the column rather than the panel:
  // this account is not the reader, so nothing about it changed. The grant
  // itself is out of this administrator's scope and the server refuses it -
  // which is `111a` and `121a`'s subject and not this row's: what is asserted
  // here is that the control is offered.
  const button = grantRow(page, ROLE_NAMES.TEACHER, '01').getByRole('button', {
    name: 'ยกเลิกบทบาท',
  });
  await expect(button).toBeEnabled();
  await expect(button).not.toHaveAttribute('title', REFUSALS.selfRevoke);
});

test('row 6: the server refuses it anyway, which is what makes the button a convenience', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  // Past the dead button, on the cookie this browser is holding - the request
  // the screen will no longer send. ADR-0002: hiding is not guarding, and #84
  // wrote the same row for the same reason one screen over.
  //
  // No mutant of #130's own proves this one: all of them are about the button.
  // What proves it is `83:revokeisjustforbidden`, which makes the route answer
  // `REFUSALS.forbidden` and fails the sentence below.
  const refused = await page.request.delete(
    `${BACKEND_URL}/api/users/${IDS.departmentAdmin05}/roles/DEPT_ADMIN/05`,
  );
  expect(refused.status()).toBe(403);
  expect((await refused.json()).message).toBe(REFUSALS.selfRevoke);

  // And the grant is still held, which is the half a status code cannot say:
  // a route that switched the row off and then complained would lock this
  // account out on its next request.
  await openEditor(page, ACCOUNTS.departmentAdmin05);
  await expect(grantRow(page, ROLE_NAMES.DEPT_ADMIN, '05')).toHaveCount(1);
});

test('row 7: re-granting after a revoke records the new granter', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  // A revival of the row `deptadm05` left behind above rather than a new one -
  // the triple is the primary key. So this is the row that says the revival
  // re-stamps who did it instead of keeping the first granter's name.
  const response = await addGrant(page, { role: 'PROG_MANAGER', scope: PROGRAM });
  expect(response.status()).toBe(201);
  await expect(grantCell(page, COMMITTEE, PROGRAM, 'ผู้กำหนด')).toHaveText('facadm01');

  // Handed back as the seed had it, so nothing after this file inherits a
  // teacher who is also on a curriculum committee.
  expect((await revoke(page, COMMITTEE, PROGRAM)).status()).toBe(200);
  await expect(grantRow(page, COMMITTEE, PROGRAM)).toHaveCount(0);
});

test('control: the grant the seed made is the one the panel shows', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  // The control every `toHaveCount(0)` above needs. A panel that drew nothing
  // at all - a selector gone stale, a read that failed quietly - would satisfy
  // each of those assertions without a single rule being enforced.
  await expect(grantRow(page, ROLE_NAMES.TEACHER, '05')).toHaveCount(1);
  await expect(grantCell(page, ROLE_NAMES.TEACHER, '05', 'ผู้กำหนด')).toHaveText('admin01');
});

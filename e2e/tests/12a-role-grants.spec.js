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
const { actingButton, roleOption, menuLink } = require('../support/shell');
const { DASHBOARD, openDashboard, chooseSection } = require('../support/teaching-screen');

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
/** The section `teacher.one@` teaches, for the rows that open the teacher shell. */
const SUBJECT = '01076105';

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
  // is the one issued before the grant existed, and it still works.
  //
  // The reload is **deliberately kept** now that #77 is fixed and a press would
  // do. Criterion 2 is two rows on the checklist - the access the server
  // enforces, and the picker catching up - and what this row proves is the
  // first. Reaching it by the oldest route there is leaves it standing whatever
  // happens to the second, which rows 8 and 9 at the end of this file own: a
  // regression in the grants header is their red and not this row's too.
  //
  // What this comment used to say - that the picker learns of a grant on the
  // next load and not on the next press, and that criterion 2's picker half is
  // a square naming #77 - was true the day it was written and is not now.
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

/**
 * The subject of these last two rows is #77, and what they are about is the
 * **absence of a reload**.
 *
 * Rows 2 and 3 above grant and revoke, and read the picker after
 * `grantee.reload()`. That reload is why criterion 2 was two rows on the
 * checklist with one of them a square: the row's own words are "press any menu
 * item", a left-menu press is a client-side route change, and `AuthContext`
 * read `/api/me` once, at mount - so the picker caught up on the next load and
 * not on the next press. Of the three options #77 priced, the owner chose the
 * third: every answer under the API's session guard carries the caller's grants,
 * so the request the new screen was making anyway brings the list with it.
 *
 * Which makes the sentinel below the assertion that matters as much as the
 * picker is. `window.__pressedNotReloaded` is set on the document before the
 * press and read after it: a reload would take it with it, and a row that only
 * read the picker would pass against a shell that had reloaded itself. The
 * other two options would both have unmounted the whole shell for the length of
 * a request - `load` holds `loading` up and both route guards answer a loading
 * shell with `<LoadingScreen/>` - so this is also the assertion that says which
 * option is in the tree.
 *
 * Two rows rather than one. The ticket reports two directions - a grant given
 * that cannot be worn, and a grant revoked that is still offered - and a row
 * that names two ways in is two rows (#66). Each builds its own situation (#129)
 * and takes it out again through the panel, inside the file's `hold()` net.
 */
test('row 8 (#77): a grant given reaches the picker on a menu press, with no reload', async ({
  browser,
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  const theirs = await browser.newContext();
  const grantee = await theirs.newPage();
  await signIn(grantee, ACCOUNTS.teacherOne, PASSWORD);
  await openDashboard(grantee);
  await chooseSection(grantee, SUBJECT);

  // The precondition, read where it is used rather than assumed from the seed
  // (#129): one grant on offer, and the picker showing it.
  await actingButton(grantee).click();
  await expect(roleOption(grantee, ROLE_NAMES.TEACHER)).toBeVisible();
  await expect(roleOption(grantee, `${COMMITTEE} ${PROGRAM}`)).toHaveCount(0);

  await addGrant(page, { role: 'PROG_MANAGER', scope: PROGRAM });

  // Set on the document that is about to make the press. A reload replaces the
  // document and takes this with it, which is the whole of what tells a fix
  // that carries the grants on an answer apart from one that reloads the shell.
  await grantee.evaluate(() => {
    window.__pressedNotReloaded = true;
  });

  // The press. A client-side route change, and the one request it makes is the
  // new screen's own - the grants ride on that answer.
  await menuLink(grantee, 'รายชื่อนักศึกษาของรายวิชา').click();
  await grantee.waitForURL(new RegExp(`${DASHBOARD}/[^/]+/subjectStudents$`));

  await expect(actingButton(grantee)).toBeVisible();
  await actingButton(grantee).click();
  await expect(roleOption(grantee, `${COMMITTEE} ${PROGRAM}`)).toBeVisible();

  // And the hat they are wearing is not changed under them. The header's own
  // `acting` says the committee here - it is the most senior grant held and the
  // session has never recorded a choice - but somebody else's save does not move
  // a person into a role mid-screen. `acting` is taken from the header in one
  // case only, the grant being worn having gone, which is row 9's.
  await expect(actingButton(grantee)).toHaveText(
    new RegExp(`^${ROLE_NAMES.TEACHER}`),
  );

  // After the read, not before it: a round trip is a turn for the renderer, and
  // a probe in front of the thing it is measuring changes the answer (#170).
  expect(await grantee.evaluate(() => window.__pressedNotReloaded === true)).toBe(true);

  // And the grant is real, not only drawn: the picker offering a hat the server
  // would refuse is the other half of what #77 reports.
  expect(await reachProgramSubjects(grantee)).toBe(200);

  const removed = await revoke(page, COMMITTEE, PROGRAM);
  expect(removed.status()).toBe(200);
  await theirs.close();
});

test('row 9 (#77): a grant revoked leaves the picker, and the hat worn falls back', async ({
  browser,
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.teacherOne);

  const theirs = await browser.newContext();
  const grantee = await theirs.newPage();
  await signIn(grantee, ACCOUNTS.teacherOne, PASSWORD);

  // The teaching shell first, and the grant afterwards. The other order cannot
  // build this situation at all: `actingFrom` hands out the most senior grant
  // held, so a person granted the committee before they sign in arrives wearing
  // it, and the teaching dashboard `chooseSection` needs is not the shell they
  // are in. The first run of this row died in `chooseSection` for exactly that,
  // with the acting button reading the committee in the saved snapshot.
  await openDashboard(grantee);
  await chooseSection(grantee, SUBJECT);
  await addGrant(page, { role: 'PROG_MANAGER', scope: PROGRAM });

  // A reload to take the new grant into the picker, deliberately: this row
  // builds its own situation (#129) rather than resting on the mechanism row 8
  // is about, and what it is about is the *other* direction - the grant being
  // taken away. The reload is the precondition, so the sentinel below is set
  // after it, not before.
  await grantee.reload();

  // And the reload is all it takes to be *wearing* it, which is the case the
  // picker cannot recover from on its own. Nothing switched on purpose here:
  // there is no acting cookie until somebody does, so the load handed out the
  // most senior grant held, which the new one is. Asserted where it is used
  // rather than arranged - the first attempt at this row arranged a `switchTo`
  // and hung, because the switch it asked for had already happened.
  await expect(actingButton(grantee)).toHaveText(
    new RegExp(`^${COMMITTEE} ${PROGRAM}`),
  );

  const removed = await revoke(page, COMMITTEE, PROGRAM);
  expect(removed.status()).toBe(200);

  await grantee.evaluate(() => {
    window.__pressedNotReloaded = true;
  });

  // A press inside the committee's own shell, on an entry that *navigates*:
  // `หลักสูตร` next to it is a group header - it carries `sub` and no `path` in
  // `SidebarItem/ProgManager.js`, so pressing it opens the group and asks the
  // server nothing, which is not the press this row is about.
  //
  // The answer may well be a refusal by the time it arrives, the grant having
  // gone, and that is the point rather than a problem: a 403 from a route under
  // the session guard carries the header like any other answer, which is why
  // `client.js` reads it above its own `!response.ok` branch.
  await menuLink(grantee, 'ข้อมูล Rubric กลาง').click();

  // The hat is gone, so the picker says what the server is honouring instead -
  // the teaching grant, which is all that is left. This is `actingFrom`'s
  // fallback becoming visible without a reload.
  await expect(actingButton(grantee)).toHaveText(
    new RegExp(`^${ROLE_NAMES.TEACHER}`),
  );
  await actingButton(grantee).click();
  await expect(roleOption(grantee, `${COMMITTEE} ${PROGRAM}`)).toHaveCount(0);

  expect(await grantee.evaluate(() => window.__pressedNotReloaded === true)).toBe(true);

  // And the server agrees, which is what makes the picker's answer true rather
  // than merely tidy.
  expect(await reachProgramSubjects(grantee)).toBe(403);
  await theirs.close();
});

'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { openChangePassword, submitPasswordChange } = require('../support/shell');
const { openUsers, search, userRow } = require('../support/users-screen');

/**
 * docs/acceptance/11-user-accounts.md, row 3 - a suspension reaching the
 * session the suspended person is already holding.
 *
 * This row is here rather than hand-walked for one reason, and it is a reason
 * about the browser rather than about the rule: the row needs two sessions at
 * once, and two tabs of one Chrome profile share one cookie jar, so signing in
 * as the administrator in the second tab overwrites the very session the row
 * is about. `browser.newContext()` is the thing a person at one keyboard does
 * not have - two jars that know nothing of each other, which is what the row
 * means by "tab A" and "tab B".
 *
 * What is being told apart is a session that is checked once at sign-in from
 * one that is checked on every request. Both look identical until somebody is
 * suspended mid-session: under the first, the cookie goes on working until it
 * runs out, which is up to half an hour of a suspended account still reading
 * the register. `sessionAdmission` in backend/auth/accounts.js is what closes
 * that, and it is a second, separate copy of the check `admit` makes at
 * sign-in - so the sign-in row passing says nothing at all about this one.
 *
 * The suspension is made through the screen's own control rather than by a
 * PUT from the driver: the row is about an administrator suspending somebody,
 * and a suspension the test performed itself would leave the screen's button
 * unproven.
 */

const statusPath = userId => `/api/users/${userId}/status`;

/**
 * The screen's own suspend / reactivate control, in one row of the table.
 *
 * The row is found once by the caller and not again here: the screen reloads
 * the list on the same search term after a status change, so the row is still
 * on screen with the other verb on its button - and typing the term a second
 * time would set the box to what it already holds, fire no change event and
 * wait for a request that is never sent.
 */
async function setStatus(page, email, userId, label) {
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        new URL(response.url()).pathname === statusPath(userId) &&
        response.request().method() === 'PUT',
    ),
    userRow(page, email).getByRole('button', { name: label }).click(),
  ]);
  return answer;
}

/** A request on the cookie this browser is already holding. */
const onHeldSession = (page, path) => page.request.get(`${BACKEND_URL}${path}`);

/**
 * Whatever the run did, `teacher.two@` is active again when it ends.
 *
 * Specs share one schema and run in file order, and 13a signs in as this
 * account. A failure part-way through the test below would otherwise leave a
 * suspended account behind and fail a later file for a reason that has nothing
 * to do with it.
 */
test.afterAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, ACCOUNTS.systemAdmin);
  const handedBack = await page.request.put(
    `${BACKEND_URL}${statusPath(IDS.teacherTwo)}`,
    { data: { status: 'active' } },
  );
  // Asserted, because a net that fails quietly is not a net: `13a-` signs in
  // as this account and would fail for a reason of its own making.
  expect(handedBack).toBeOK();
  await context.close();
});

test('row 3: a suspension refuses the session the account was already holding', async ({
  page,
  browser,
}) => {
  // The tab someone left open: their own browser, their own cookie, signed in
  // before anybody decided anything about them. Nothing is copied between the
  // two contexts below - all they share is the database.
  const theirs = await browser.newContext();
  const held = await theirs.newPage();
  await signIn(held, ACCOUNTS.teacherTwo);

  // The baseline the refusals need. Without it, a server that refused
  // everybody would satisfy every assertion after the suspension.
  expect((await onHeldSession(held, '/api/me')).status()).toBe(200);

  // The administrator, in the other jar, using the screen's own button.
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.teacherTwo);
  expect(
    (await setStatus(page, ACCOUNTS.teacherTwo, IDS.teacherTwo, 'ระงับ')).status(),
  ).toBe(200);

  // Three routes rather than one, on the cookie that was issued before any of
  // this happened: the guard is at every request, not at the door. A check
  // that lived in one route's own handler would pass a row that asked once.
  for (const path of ['/api/me', '/api/subjects', '/api/users']) {
    const answer = await onHeldSession(held, path);
    expect(answer.status(), path).toBe(403);
    expect((await answer.json()).message, path).toBe(REFUSALS.inactive);
  }

  // And the screen's half of it: a click inside the shell that was already
  // drawn, with no reload to re-read `/api/me`. This is the row's "press any
  // menu item" as this account can perform it - the teacher's own menu items
  // point at screens #23 and later have not built, and the user menu is the
  // one thing every signed-in person can reach that asks the server for
  // something.
  // This probe is a mutating endpoint, which is safe only because the refusal
  // arrives before anything is written and because the schema is reseeded at
  // the start of every run. If the guard ever breaks, the password of
  // `teacher.two@` becomes this literal for the rest of the run and `13a-`
  // fails for a reason that is not its own.
  await openChangePassword(held);
  const changed = await submitPasswordChange(held, PASSWORD, 'walked-suspended');
  expect(changed.status()).toBe(403);

  // Handed back active, so the files after this one start where they expect
  // to. The reactivation is the same control, which is the other half of the
  // screen's answer to this criterion.
  expect(
    (await setStatus(page, ACCOUNTS.teacherTwo, IDS.teacherTwo, 'เปิดใช้งาน')).status(),
  ).toBe(200);
  expect((await onHeldSession(held, '/api/me')).status()).toBe(200);

  await theirs.close();
});

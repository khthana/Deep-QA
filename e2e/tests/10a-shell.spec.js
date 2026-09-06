'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  sessionCookie,
  payloadOf,
  expireSession,
} = require('../support/expired-session');
const { USERS, waitForList } = require('../support/users-screen');
const {
  PROGRAMS,
  PROGRAM_SUBJECTS,
  PROGRAM_SUBJECTS_API,
  USERS_MENU,
  actingButton,
  switchTo,
  expiryDialog,
  openChangePassword,
  submitPasswordChange,
  signOut,
  menuLink,
} = require('../support/shell');

/**
 * docs/acceptance/10-application-shell.md - the rows of the shell that are
 * about behaviour rather than about appearance.
 *
 * The split is #65's: what a menu *contains*, what the breadcrumb *reads* and
 * which items a sidebar draws stay hand-walked rows, because a driver
 * asserting them would be asserting the screen against itself. What is here is
 * the half a browser can settle and a person cannot easily: that the grant the
 * shell starts in is the senior one and not merely the first one drawn, that
 * putting on another hat changes what the server *permits* and not only what
 * is offered, that a session ending says so instead of dropping someone at the
 * sign-in page, and that a changed password is the password from then on.
 *
 * One row of that document is deliberately absent and it is not an oversight:
 * criterion 8's browser half is already asserted, in
 * `11a-users-refusals.spec.js`, and is not repeated here.
 *
 * The reload half of criterion 6 used to be absent too, because the shell
 * could not show it - the cookie's `maxAge` was the token's own lifetime, so
 * a browser never presented an expired token. #69 made the cookie outlive the
 * token and the row is now here, proved in two composed halves, because no
 * suite can sit still for thirty minutes: one assertion reads the real cookie
 * the server set and shows the window in which a dead token is still
 * presented, and the other puts a dead token in that window and asserts the
 * dialog. Together they are the tab someone left open; neither alone is.
 *
 * #94 added the row after those, and it is about the reload *after* the
 * dialog: the window #69 opened had no way of closing, so every reload inside
 * it drew the same box over the sign-in page the box was pointing at. The box
 * on the first reload and its absence on the second are asserted in the same
 * test on purpose - either one alone can be had by breaking the other.
 */

const PROGRAM_MANAGER_0501 = 'กรรมการหลักสูตร 0501';
const TEACHER = 'อาจารย์ผู้สอน';

/**
 * Opens a screen and waits until nothing of the shell's own start-up is still
 * in flight.
 *
 * `goto` resolves on the document's load event, which is well before React has
 * mounted and asked `GET /api/me`. That used to be harmless - a bootstrap read
 * landing after a test had forged a dead cookie changed nothing anyone
 * asserted. Since #94 it changes the one thing these tests are about: that
 * read is where the server forgets an expired session, so a stray one arriving
 * after `expireSession` spends the expiry on a document the test is about to
 * throw away, and the reload it cares about finds nothing left to have ended.
 *
 * `networkidle` rather than a particular response because the point is the
 * absence of requests, not the presence of one, and StrictMode issues the
 * bootstrap read twice.
 */
const openAndSettle = async (page, path) => {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
};

const waitForProgramSubjects = page =>
  page.waitForResponse(
    response => new URL(response.url()).pathname === PROGRAM_SUBJECTS_API,
  );

test.describe('the shell, in a browser', () => {
  test('row 3: two grants, and the shell starts in the senior one', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.multiRole);

    // Priority 4 beats priority 5. The account holds both; nothing in the
    // sign-in asked which, so the server chose - and it chose the senior.
    await expect(actingButton(page)).toHaveText(
      new RegExp(PROGRAM_MANAGER_0501),
    );

    // And the switch is a request rather than a redraw: the inherited picker
    // wrote the choice into localStorage and reloaded, which is a menu change
    // the server never heard about.
    const answer = await switchTo(page, TEACHER);
    expect(answer.status()).toBe(200);
    expect((await answer.json()).acting).toMatchObject({
      role_id: 'TEACHER',
      scope_id: '05',
    });
    await expect(actingButton(page)).toHaveText(new RegExp(TEACHER));
  });

  test('row 4: the switch changes what the server permits, not just the menu', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.multiRole);

    // The same account, the same address, twice - so the only thing that can
    // account for the two answers is the hat.
    const [asManager] = await Promise.all([
      waitForProgramSubjects(page),
      page.goto(PROGRAM_SUBJECTS),
    ]);
    expect(asManager.status()).toBe(200);

    await switchTo(page, TEACHER);

    const [asTeacher] = await Promise.all([
      waitForProgramSubjects(page),
      page.reload(),
    ]);
    expect(asTeacher.status()).toBe(403);
    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
  });

  test('row 6: a session that has ended says so', async ({ page }) => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await page.goto(PROGRAMS);
    await expect(menuLink(page, USERS_MENU)).toBeVisible();

    // What a person does through DevTools. From here on the browser is a
    // browser with no session, which is the state the criterion is about.
    await page.context().clearCookies();

    await menuLink(page, USERS_MENU).click();

    // The point of the row: an explanation, not an unannounced return to the
    // sign-in screen.
    await expect(expiryDialog(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบใหม่' })).toBeVisible();
    expect(new URL(page.url()).pathname).not.toBe('/');
  });

  test('row 6: the cookie outlives the token, so an ended session can be seen', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);

    // The two used to be the same number, and a browser that drops the cookie
    // in the second the token dies never presents an expired token at all.
    // The margin is what the next test needs to exist: the stretch of time in
    // which a reload still carries something the server can recognise as a
    // session that ended.
    const cookie = await sessionCookie(page);
    const { exp } = payloadOf(cookie.value);
    expect(cookie.expires - exp).toBeGreaterThan(5 * 60);
  });

  test('row 6: a reload inside that window says so, rather than dropping the tab', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    await openAndSettle(page, PROGRAM_SUBJECTS);

    // The state a tab left open past the half hour is in: the cookie is still
    // held, and the token inside it is dead.
    await expireSession(page);
    await page.reload();

    // Nobody is signed in at this point - the page has just reloaded, so the
    // context holds nothing yet - which means the `signedIn` half of the rule
    // is false and this is the answer's `reason` doing the work and nothing
    // else. Before #97 the same sentence was true for a different reason: the
    // call carried an `anonymous` flag that no longer exists.
    await expect(expiryDialog(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบใหม่' })).toBeVisible();
  });

  test('row 6: the button in that box gets the person back in', async ({ page }) => {
    // The dialog is raised by a *screen's* request rather than by a reload,
    // and #94 is why it has to be. The shell's bootstrap read is now where an
    // expired session is forgotten, so a dialog reached by reloading arrives
    // with the cookie already gone and everything below would be true before
    // the button was pressed. A menu click is the other way in: the 401 comes
    // from `GET /api/users`, which clears nothing, so the state under test is
    // the one #92 was about - a browser still holding a cookie only the
    // sign-out route erases.
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openAndSettle(page, PROGRAMS);
    await expireSession(page);
    const dead = await sessionCookie(page);
    await menuLink(page, USERS_MENU).click();
    await expect(expiryDialog(page)).toBeVisible();

    // The same dead cookie, not merely some cookie: `toBeDefined` would also
    // pass on one this browser had been handed since, and what the lines below
    // are about is that the button - and only the button - is what erases the
    // one the person walked in with.
    expect((await sessionCookie(page))?.value).toBe(dead.value);

    // #92: signing out used to be refused unless a live session backed it,
    // which is precisely what this browser does not have. The status is
    // asserted rather than only its consequences because since #94 the
    // consequences no longer need the button: `logout` navigates to '/'
    // either way, and the bootstrap read on that page clears the cookie for
    // it. What the route being unguarded still buys is that the press works
    // in one step and that the sign-out is recorded, and this is the half of
    // that a browser can see.
    const [signedOut] = await Promise.all([
      page.waitForResponse(response =>
        new URL(response.url()).pathname.endsWith('/auth/logout'),
      ),
      page.getByRole('button', { name: 'เข้าสู่ระบบใหม่' }).click(),
    ]);
    expect(signedOut.status()).toBe(200);

    await expect(expiryDialog(page)).toHaveCount(0);
    expect(await sessionCookie(page)).toBeUndefined();

    // And gone in the way that matters: the screen behind it is one somebody
    // can actually sign in on. A cleared cookie with a dead-end page would
    // satisfy everything above.
    await signIn(page, ACCOUNTS.departmentAdmin05);
  });

  test('row 6: a second reload gets the person back in, without the button', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    await openAndSettle(page, PROGRAM_SUBJECTS);
    await expireSession(page);

    // The first reload is the news being delivered, and that half must not
    // change: criterion 6 is that an ended session says so.
    await page.reload();
    await expect(expiryDialog(page)).toBeVisible();

    // #94 is the second one. The cookie outlives its dead token by a full
    // lifetime (#69) and nothing on this path erased it, so every reload for
    // the next half hour asked the same question, got the same answer, and
    // drew the same dialog over a sign-in page it could not be typed into.
    // #92 fixed the button; this is the path of everyone who pressed F5
    // instead, which is nearly everyone. The dialog being gone here is the
    // assertion, and it is this row's own: the four tests above pass with the
    // cookie left exactly where it was.
    //
    // The wait is not decoration. A negative assertion returns on its first
    // passing poll, so without it "no dialog" could be read off a page that
    // has not yet heard back from the server, and the row would prove nothing
    // it claims.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(expiryDialog(page)).toHaveCount(0);
    expect(await sessionCookie(page)).toBeUndefined();

    // Gone in the way that matters, as above: a cleared cookie in front of a
    // dead-end page would satisfy everything before this line.
    await signIn(page, ACCOUNTS.teacherOne);
  });

  test('row 6: the window that did not hear the news lands on the sign-in page', async ({
    page,
    context,
  }) => {
    // The price #94 pays, asserted rather than described.
    //
    // Two windows of one browser share one cookie jar, so only one of them can
    // be the window that hears the news: whichever reloads first gets the
    // dialog and erases the dead cookie, and the other one reloads into
    // `anonymous` and is returned to the sign-in page without a word. That is
    // worse than being told, and better than what it replaced - before #94
    // both windows sat in the same box for half an hour with no way out of
    // either. The acceptance document records it as a deliberate cost, and a
    // cost nobody has asserted is a cost that quietly becomes something else.
    //
    // This is a second page in the same context and not a second browser: a
    // second browser has a cookie jar of its own and could not be dropped by
    // anything the first one did, which makes it the one arrangement that
    // cannot show this at all.
    await signIn(page, ACCOUNTS.teacherOne);
    await openAndSettle(page, PROGRAM_SUBJECTS);

    const other = await context.newPage();
    await openAndSettle(other, PROGRAM_SUBJECTS);
    await expect(expiryDialog(other)).toHaveCount(0);

    await expireSession(page);

    // The first window, and only the first, is told. That the cookie is gone
    // afterwards is the row above's assertion and is deliberately not repeated
    // here: a copy of it would be the line a mutant killed first, and this row
    // would then be proved by someone else's evidence rather than its own.
    await page.reload();
    await expect(expiryDialog(page)).toBeVisible();

    // The second reloads after the cookie is already gone. `networkidle` for
    // the same reason as the row above: a negative assertion read before the
    // server has answered proves nothing.
    await other.reload();
    await other.waitForLoadState('networkidle');
    await expect(expiryDialog(other)).toHaveCount(0);

    // Dropped at a sign-in page that can be typed into, which is the whole of
    // what makes this cost payable.
    await expect(other.locator('input[type="password"]')).toBeVisible();
    await other.close();
  });

  test('row 6: a 403 is not an expiry', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);

    const [response] = await Promise.all([waitForList(page), page.goto(USERS)]);
    expect(response.status()).toBe(403);

    // Both halves matter. The inherited client read every refusal as the same
    // thing and signed the person out on a 403, which told them their session
    // had ended when it had not.
    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
    await expect(expiryDialog(page)).toHaveCount(0);
  });

  test('row 7: the wrong current password is said in the dialog', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherTwo);
    await openChangePassword(page);

    const answer = await submitPasswordChange(
      page,
      'not-the-password',
      'deep-core-changed',
    );
    expect(answer.status()).toBe(403);

    await expect(page.getByText(REFUSALS.wrongPassword)).toBeVisible();
    // Still in the dialog, still signed in: a refusal here is a correction to
    // make, not an ejection.
    await expect(page.getByRole('heading', { name: 'เปลี่ยนรหัสผ่าน' })).toBeVisible();
    await expect(expiryDialog(page)).toHaveCount(0);
  });

  test('row 7: the new password is the password from then on', async ({
    page,
  }) => {
    const NEW_PASSWORD = 'deep-core-changed';

    await signIn(page, ACCOUNTS.teacherTwo);
    await openChangePassword(page);
    expect((await submitPasswordChange(page, PASSWORD, NEW_PASSWORD)).status()).toBe(200);

    // From here the stored credential is not the seeded one, and every spec in
    // this suite shares one seeded schema: a failure below must still hand the
    // account back, or a later spec signing in as it fails for a reason that
    // has nothing to do with it.
    try {
      await signOut(page);

      // The old one is refused - the change was to the stored credential and not
      // to this browser's session.
      await page.locator('input[type="text"]').fill(ACCOUNTS.teacherTwo);
      await page.locator('input[type="password"]').fill(PASSWORD);
      const [refused] = await Promise.all([
        page.waitForResponse(
          response => new URL(response.url()).pathname === '/api/auth/login',
        ),
        page.getByRole('button', { name: 'Login to your account' }).click(),
      ]);
      expect(refused.status()).toBe(401);
      await expect(page.getByText(REFUSALS.credentials)).toBeVisible();
      expect(new URL(page.url()).pathname).toBe('/');

      // And the new one is accepted. `signIn` asserts the 200 for us.
      await signIn(page, ACCOUNTS.teacherTwo, NEW_PASSWORD);
    } finally {
      // A fresh session with whichever password is now current, so the restore
      // does not depend on where the failure above left the browser.
      await page.context().clearCookies();
      await signIn(page, ACCOUNTS.teacherTwo, NEW_PASSWORD);
      await openChangePassword(page);
      expect((await submitPasswordChange(page, NEW_PASSWORD, PASSWORD)).status()).toBe(200);
    }
  });
});

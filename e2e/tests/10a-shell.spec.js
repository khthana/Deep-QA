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
 */

const PROGRAM_MANAGER_0501 = 'กรรมการหลักสูตร 0501';
const TEACHER = 'อาจารย์ผู้สอน';

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
    await expect(page.getByRole('link', { name: USERS_MENU })).toBeVisible();

    // What a person does through DevTools. From here on the browser is a
    // browser with no session, which is the state the criterion is about.
    await page.context().clearCookies();

    await page.getByRole('link', { name: USERS_MENU }).click();

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
    await page.goto(PROGRAM_SUBJECTS);

    // The state a tab left open past the half hour is in: the cookie is still
    // held, and the token inside it is dead.
    await expireSession(page);
    await page.reload();

    // The shell's own first call is flagged anonymous - it has to be, or the
    // sign-in page would accuse everyone of an expiry - so this is the answer's
    // `reason` doing the work and nothing else.
    await expect(expiryDialog(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบใหม่' })).toBeVisible();
  });

  test('row 6: the button in that box gets the person back in', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    await page.goto(PROGRAM_SUBJECTS);
    await expireSession(page);
    await page.reload();
    await expect(expiryDialog(page)).toBeVisible();

    await page.getByRole('button', { name: 'เข้าสู่ระบบใหม่' }).click();

    // #92: the button used to reload, and a reload lands back in this same
    // state - the cookie outlives its dead token by a full lifetime, so the
    // shell's next call is expired again and draws the box again, over a
    // sign-in page that is underneath a `fixed inset-0` overlay and cannot be
    // typed into. The box being gone is the assertion the old button failed.
    await expect(expiryDialog(page)).toHaveCount(0);
    expect(await sessionCookie(page)).toBeUndefined();

    // And gone in the way that matters: the screen behind it is one somebody
    // can actually sign in on. A cleared cookie with a dead-end page would
    // satisfy everything above.
    await signIn(page, ACCOUNTS.teacherOne);
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

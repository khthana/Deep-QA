'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { GOOGLE_REFUSAL_REASONS } = require('../../backend/auth/accounts');
const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  FALLBACK_REFUSAL,
  EMPTY_FORM,
  SIGN_IN_HEADING,
  emailField,
  passwordField,
  googleButton,
  openSignIn,
  refusalBanner,
  attemptSignIn,
} = require('../support/sign-in-screen');

/**
 * docs/acceptance/50-sign-in-screens.md — the rows a browser can settle.
 *
 * #8 closed against its server half. Its screens were built inside #10, which
 * is why nothing held their criteria until now, and it is worth naming what
 * that meant in practice: the one screen every person in this system passes
 * through was the only screen with no checklist behind it.
 *
 * The split is #65's, and it lands unusually here. Most of what a sign-in
 * screen does is *say* something, which is normally the hand-walked half — but
 * a refusal is not appearance in the sense that a colour is. The words are the
 * server's, they travel in a query string with no body, and whether they
 * arrive at all is a fact about two lists in two packages agreeing. A browser
 * can settle that, and until #50 nothing did: `outsideValidity` was missing
 * from the screen's map, so the only person who can ever meet it — an external
 * assessor whose review round has closed — was told *เข้าสู่ระบบด้วย Google
 * ไม่สำเร็จ* instead of that their window had ended.
 *
 * What stays hand-walked: whether the banner is legible, whether three seconds
 * is long enough to read it (that is #85), and what the chooser looks like.
 */

test('every reason the Google path can refuse with reaches the person as the server’s own words', async ({
  page,
}) => {
  // The list is the backend's, checked there against the `refuse` calls that
  // produce it. Reading it here rather than restating it is the point: a
  // reason added to the rules and not to the screen fails this row, which is
  // exactly how the missing one would have been caught.
  for (const reason of GOOGLE_REFUSAL_REASONS) {
    await openSignIn(page, `login?error=${reason}`);

    await expect(refusalBanner(page)).toHaveText(REFUSALS[reason]);
    // Not the fallback — read once, here, while the assertion above has just
    // established the banner is on screen. Written as a retrying
    // `toHaveCount(0)` it would have been worthless for the reason the third
    // row of this file is now a paragraph about: the banner dismisses itself
    // after three seconds, and a retrying negative outlives it.
    expect(await page.getByText(FALLBACK_REFUSAL).count()).toBe(0);
  }
});

test('a reason nobody has written words for still says something rather than nothing', async ({
  page,
}) => {
  await openSignIn(page, 'login?error=aReasonFromAFutureTicket');

  await expect(refusalBanner(page)).toHaveText(FALLBACK_REFUSAL);
  // And the form is still there to try again with, which a screen that
  // rendered an error state instead of a page would not be.
  await expect(emailField(page)).toBeVisible();
});

/**
 * The negative, and the one row here that had to be rewritten to mean
 * anything.
 *
 * It was `await expect(refusalBanner(page)).toHaveCount(0)`, which is a
 * web-first assertion and so **retries for ten seconds** — and the banner
 * dismisses itself after three (#85). So it passed on a screen showing a
 * refusal it had no business showing: the mutant `refusalalwayssomething` drew
 * one on every arrival and killed nothing, while a probe confirmed the banner
 * was there, count 1, at the moment the row believed it was asserting.
 *
 * A retrying negative against an element that removes itself is an assertion
 * that cannot fail. The count is now read **once**, at a settle point, and
 * compared as a plain value: `networkidle` is when the shell has finished
 * asking who is signed in, which is the last thing that could put anything on
 * this screen. Absent then is absent.
 */
test('arriving with no reason at all shows no refusal', async ({ page }) => {
  await openSignIn(page);
  await page.waitForLoadState('networkidle');

  expect(await refusalBanner(page).count()).toBe(0);
});

test('pressing Login With Google on a server with no credentials comes back to the sign-in screen', async ({
  page,
}) => {
  await openSignIn(page);

  // A full navigation, not a fetch — the OAuth round trip belongs to the
  // browser. Which is why this used to end on a page of JSON on the API's own
  // origin: a 503 with a body is a status code nobody reads and a document
  // everybody sees, with no way back but the back button.
  await googleButton(page).click();
  await page.waitForURL((url) => url.searchParams.has('error'));

  expect(new URL(page.url()).searchParams.get('error')).toBe('googleUnavailable');
  await expect(refusalBanner(page)).toHaveText(REFUSALS.googleUnavailable);
  await expect(page.getByRole('heading', { name: SIGN_IN_HEADING })).toBeVisible();
});

test('the wrong password is refused in the server’s words, on the screen it was typed into', async ({
  page,
}) => {
  await openSignIn(page);

  const answer = await attemptSignIn(page, {
    email: ACCOUNTS.teacherOne,
    password: 'not-the-password',
  });

  expect(answer.status()).toBe(401);
  await expect(refusalBanner(page)).toHaveText(REFUSALS.credentials);
  // Still here, and still usable. #8 gives this path one message on purpose —
  // a form that told a wrong password from an unknown address would be a way
  // of asking whether an address is registered — so what matters is that the
  // one message arrives where the person is.
  expect(new URL(page.url()).pathname).toBe('/');
  await expect(emailField(page)).toBeVisible();
});

test('an empty form is refused by the screen, without asking the server', async ({ page }) => {
  await openSignIn(page);

  const answer = await attemptSignIn(page);

  expect(answer).toBe(null);
  await expect(refusalBanner(page)).toHaveText(EMPTY_FORM);
});

test('the two fields are named by their labels, and signing in through them works', async ({
  page,
}) => {
  await openSignIn(page);

  // `getByLabel` is the assertion. Until #50 both labels pointed at ids that
  // were not on the page, so a screen reader read this form out as an unnamed
  // textbox and an unnamed password field.
  await expect(emailField(page)).toHaveAttribute('type', 'text');
  await expect(passwordField(page)).toHaveAttribute('type', 'password');

  const answer = await attemptSignIn(page, {
    email: ACCOUNTS.teacherOne,
    password: PASSWORD,
  });

  expect(answer.status()).toBe(200);
});

test('the page nothing navigated to is gone, and its address is a 404 like any other', async ({
  page,
}) => {
  await page.goto('/user-not-found?reason=' + encodeURIComponent(REFUSALS.inactive));

  // The deleted page read that `?reason` by comparing it against a whole Thai
  // sentence and drew a suspension notice. What answers now is the catch-all,
  // which is what any address nobody declared should get.
  await expect(page.getByRole('heading', { name: 'ไม่พบหน้าที่คุณต้องการ' })).toBeVisible();
  await expect(page.getByText('บัญชีของคุณถูกระงับการใช้งาน')).toHaveCount(0);
});

test('the chooser is behind the session, and draws the person who is signed in', async ({
  page,
}) => {
  // Typed by a stranger: not a chooser, and not a 404 either — the sign-in
  // screen, because `/select-app` is declared and protected rather than
  // missing.
  await page.goto('/select-app');
  await expect(page.getByRole('heading', { name: SIGN_IN_HEADING })).toBeVisible();

  await signIn(page, ACCOUNTS.teacherOne);

  // Reached by address rather than by signing in, and that is not an oversight
  // in this row: sign-in lands on `/main` today because `GuestRoute` redirects
  // before `Login.js` can navigate. Which screen it *should* land on is #66,
  // and a row here that asserted either answer would have to be rewritten the
  // day #66 is decided. What this row settles is the part #66 does not touch:
  // the chooser is behind the session and knows who is behind it.
  await page.goto('/select-app');
  await expect(page.getByRole('heading', { name: 'ยินดีต้อนรับ' })).toBeVisible();
  // Named, not merely welcomed. A chooser that greets everyone identically is
  // the same screen a session that had gone stale would draw, and the greeting
  // is the only thing on it that reads the profile at all.
  await expect(page.getByText('ดร.อนันต์ สอนดี')).toBeVisible();
  await expect(page.getByText('ระบบบริหารจัดการหลักสูตร (Curriculum Management)')).toBeVisible();
});

'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { GOOGLE_REFUSAL_REASONS } = require('../../backend/auth/accounts');
const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { expiryDialog } = require('../support/shell');
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

/**
 * #97 — the row this sheet carried as a ☐ because the criterion was not true.
 *
 * `client.js` raised the shell's expiry dialog on *every* 401 that had not
 * been flagged anonymous by its caller, and `POST /api/auth/login` is a 401
 * when the password is wrong. So the sentence above arrived, and a full-screen
 * `fixed inset-0 z-[9999]` dialog was drawn over it saying the session had
 * ended — to somebody who had never had one. Its only button returned to this
 * same screen, so pressing it looped.
 *
 * Why this is a second row rather than an assertion added to the one above:
 * that row's assertions cannot see this. The banner is still in the DOM
 * *underneath* the dialog, and `emailField` is still `toBeVisible` with a
 * fixed overlay on top of it, because visibility is about the element and not
 * about what is painted over it. Both rows passed throughout. A ⚙ on the row
 * above would have claimed this ground and never held it.
 */
test('the refusal is the only thing on the screen — no dialog is drawn over it', async ({
  page,
}) => {
  await openSignIn(page);

  const answer = await attemptSignIn(page, {
    email: ACCOUNTS.teacherOne,
    password: 'not-the-password',
  });
  expect(answer.status()).toBe(401);

  // Read once, at a settle point, rather than as a retrying negative: a
  // `toHaveCount(0)` that starts before the dialog is drawn passes on its
  // first attempt and never looks again. #50 learned this from the banner
  // that dismisses itself; the shape is the same wherever the thing being
  // denied appears *late*.
  await expect(refusalBanner(page)).toHaveText(REFUSALS.credentials);
  expect(await expiryDialog(page).count()).toBe(0);
});

test('an address nobody registered is refused the same way, and as quietly', async ({
  page,
}) => {
  await openSignIn(page);

  // The other half of #97's first two criteria. It is a separate row because
  // it takes a different path through `resolvePasswordAccount` — no user row
  // at all, rather than a row whose hash did not match — and arrives at the
  // same refusal. If one day only one of them carried `reason`, one of these
  // two rows would fail and the other would not.
  const answer = await attemptSignIn(page, {
    email: 'nobody@kmitl.ac.th',
    password: PASSWORD,
  });
  expect(answer.status()).toBe(401);

  await expect(refusalBanner(page)).toHaveText(REFUSALS.credentials);
  expect(await expiryDialog(page).count()).toBe(0);
});

/**
 * #85 — the refusal used to be on screen for three seconds.
 *
 * Found on 21 August 2569 while walking #11's suspended-account row: the
 * sentence could not be photographed, because a screenshot through CDP takes
 * two to three seconds and the banner was gone by the second one. A person
 * looking at the keyboard while they type is in exactly that position, and
 * what they see when they look up is a form that did nothing.
 *
 * The five seconds is the ticket's own number and it is worth the wall-clock:
 * three would prove the old timer is gone and nothing more, and a row that
 * only just clears the bar it was written against is a row that starts
 * failing when a timer is nudged rather than when the behaviour changes.
 */
test('the refusal is still there five seconds later, because nothing dismissed it', async ({
  page,
}) => {
  await openSignIn(page);

  await attemptSignIn(page, {
    email: ACCOUNTS.teacherOne,
    password: 'not-the-password',
  });
  await expect(refusalBanner(page)).toHaveText(REFUSALS.credentials);

  await page.waitForTimeout(5000);

  // Read once, as a value. A retrying assertion here would pass on its first
  // attempt whatever happened afterwards, which is the shape #50 was caught by
  // on this very banner.
  expect(await refusalBanner(page).count()).toBe(1);
  await expect(refusalBanner(page)).toHaveText(REFUSALS.credentials);
});

test('typing in the form is what clears the refusal', async ({ page }) => {
  await openSignIn(page);

  await attemptSignIn(page, {
    email: ACCOUNTS.teacherOne,
    password: 'not-the-password',
  });
  await expect(refusalBanner(page)).toHaveText(REFUSALS.credentials);

  // The other half of *stays until the person acts*: a sentence that can never
  // be got rid of is its own defect, and the act that gets rid of it is the
  // one that makes it out of date. Correcting the password is that act.
  await passwordField(page).fill('x');

  await expect(refusalBanner(page)).toHaveCount(0);
});

/**
 * #85 asks for the refusal to be *tied to the form*, not only announced once.
 *
 * `role="alert"` is heard when the sentence appears and then it is over. A
 * person who tabs back into the password field ten seconds later hears the
 * field's name and nothing about why the last attempt failed - which is the
 * position #85's own *why it hurts* describes, somebody looking at the
 * keyboard rather than at the screen. `aria-describedby` is what closes that:
 * the sentence becomes the description of the fields it is about, readable on
 * demand rather than only in the instant it arrives.
 *
 * Asserted through the element the description points *at*, not by reading the
 * attribute back. An `aria-describedby` naming an id that is not in the
 * document describes nothing, and reading the raw attribute cannot tell that
 * apart from a working one.
 */
test('the refusal describes the fields it is about, not only the screen', async ({
  page,
}) => {
  await openSignIn(page);

  // Before there is anything to describe, neither field claims a description.
  expect(await emailField(page).getAttribute('aria-describedby')).toBeNull();
  expect(await passwordField(page).getAttribute('aria-describedby')).toBeNull();

  await attemptSignIn(page, {
    email: ACCOUNTS.teacherOne,
    password: 'not-the-password',
  });
  await expect(refusalBanner(page)).toHaveText(REFUSALS.credentials);

  for (const field of [emailField(page), passwordField(page)]) {
    const describedBy = await field.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator('#' + describedBy)).toHaveText(
      REFUSALS.credentials,
    );
  }
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

/**
 * A declared-but-protected address is not a missing one.
 *
 * This row used to be about the two-application chooser, which #66 deleted —
 * there is one application now. What it was actually proving survives the
 * chooser and belongs to the sign-in screens either way: an address a stranger
 * is not allowed to see sends them *here*, to a screen they can do something
 * about, rather than to the 404 that an address nobody declared gets. Telling
 * those two apart is the whole of `ProtectedRoute`'s job, and #50's own
 * `/user-not-found` row is the other side of the same coin.
 */
test('a protected address typed by a stranger returns the sign-in screen, not a 404', async ({
  page,
}) => {
  await page.goto('/main/rubrics');

  await expect(page.getByRole('heading', { name: SIGN_IN_HEADING })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ไม่พบหน้าที่คุณต้องการ' })).toHaveCount(0);

  // And it is the same address once there is a session behind it, which is
  // what makes the line above a guard rather than a broken route.
  await signIn(page, ACCOUNTS.committee0501);
  await page.goto('/main/rubrics');
  expect(new URL(page.url()).pathname).toBe('/main/rubrics');
});

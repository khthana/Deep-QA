'use strict';

const { expect } = require('@playwright/test');

/**
 * The sign-in screens — #50.
 *
 * `support/auth.js` is the helper every other spec uses to *get past* this
 * screen; this one is for the spec that is about the screen itself, and the
 * two want opposite things. `signIn` asserts a 200 and moves on. What is here
 * reaches the states nobody is supposed to get past: a refusal that arrived in
 * a query string, an empty form, a page that was deleted.
 *
 * The fields are located by their labels, which they only recently acquired.
 * Until #50 both `htmlFor` attributes pointed at ids the inputs did not carry
 * — the password's at `website-admin`, an id from the snippet the markup was
 * lifted from and not on this page at all — so `getByLabel` found nothing and
 * every locator in this suite had to reach for `input[type=...]` instead.
 * Locating them the way a person names them is the assertion, not a
 * convenience: it fails if the labels stop naming the fields again.
 */

const FALLBACK_REFUSAL = 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ';
const EMPTY_FORM = 'กรุณากรอกอีเมล และ รหัสผ่าน';
const SIGN_IN_HEADING = 'ลงชื่อเข้าใช้งาน';
const GOOGLE_BUTTON = 'Login With Google';
const SUBMIT_BUTTON = 'Login to your account';

const emailField = (page) => page.getByLabel('Email');
const passwordField = (page) => page.getByLabel('Password');
const submitButton = (page) => page.getByRole('button', { name: SUBMIT_BUTTON });
const googleButton = (page) => page.getByRole('button', { name: GOOGLE_BUTTON });

/**
 * The sign-in screen, drawn and settled.
 *
 * `goto` resolves on the load event, which is before the shell has asked
 * `GET /api/me` — and until that answer arrives `GuestRoute` draws the loading
 * screen rather than this one. Waiting for the heading is waiting for the
 * answer, without naming a request the page may or may not still be making.
 */
async function openSignIn(page, query = '') {
  await page.goto(`/${query}`);
  await expect(page.getByRole('heading', { name: SIGN_IN_HEADING })).toBeVisible();
}

/**
 * The red banner, whatever it currently says.
 *
 * Located by its styling, which is not where a locator belongs and is the best
 * that is available: the banner carries no role, no label and no test id, so
 * there is nothing else on it that is *the banner* rather than *this
 * sentence*. Asserting the sentence through a locator found by that sentence
 * would be circular, which is exactly what these rows are about.
 *
 * The honest fix is a role — a refusal nothing announces is drawn for people
 * who can see it and for nobody else — and that is [#111], which is open and
 * covers every refusal in the application rather than this one. When it lands,
 * this becomes `getByRole('alert')` and the class comes out.
 */
const refusalBanner = (page) => page.locator('div.bg-red-50\\/50');

/**
 * Fills the form the way a person does and presses the button.
 *
 * Returns the sign-in endpoint's answer, or null where the screen refused the
 * form itself and sent nothing — which is a difference the rows here are
 * about, so it is returned rather than asserted away.
 */
async function attemptSignIn(page, { email = '', password = '' } = {}) {
  if (email) await emailField(page).fill(email);
  if (password) await passwordField(page).fill(password);

  // Armed before the click, because the answer to a filled form arrives well
  // inside the timeout. The timeout is what the empty-form row reads: nothing
  // was sent, so nothing answers, and `null` is the finding rather than a
  // failure.
  const answer = page
    .waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/login', {
      timeout: 3000,
    })
    .catch(() => null);

  await submitButton(page).click();
  return answer;
}

module.exports = {
  FALLBACK_REFUSAL,
  EMPTY_FORM,
  SIGN_IN_HEADING,
  emailField,
  passwordField,
  googleButton,
  openSignIn,
  refusalBanner,
  attemptSignIn,
};

'use strict';

const { expect } = require('@playwright/test');
const { PASSWORD } = require('./accounts');

/**
 * Signs in the way a person does: the real sign-in screen, the real endpoint,
 * the real cookie.
 *
 * No cookie is planted and no session is stubbed, for the reason docs/06 gives
 * for the backend suite - the inherited system's central defect was
 * authorisation that existed only in appearance, and a driver that granted
 * itself a session would reproduce that blind spot at the one seam built to
 * catch it.
 *
 * The two fields are located by input type rather than by label: the inherited
 * markup's `htmlFor` attributes point at ids the inputs do not carry, and
 * fixing that is a change to a UI this project is instructed not to redesign.
 *
 * What is asserted is the sign-in's own answer, not the page that follows it.
 * Where the browser lands afterwards is not this helper's business, and is in
 * fact not what Login.js believes: `GuestRoute` sends an account that now has
 * a profile to `/main` before `navigate('/select-app')` can run, so the
 * chooser is never shown on the password path. That is a screen defect - #66 -
 * and not this helper's to work around; pinning it here would make every spec in this suite fail the day
 * it is fixed.
 */
async function signIn(page, email, password = PASSWORD) {
  await page.goto('/');
  await page.locator('input[type="text"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  const [response] = await Promise.all([
    page.waitForResponse(
      answer => new URL(answer.url()).pathname === '/api/auth/login',
    ),
    page.getByRole('button', { name: 'Login to your account' }).click(),
  ]);

  // A refusal fails here, naming the account, rather than later as a screen
  // that mysteriously showed nothing.
  expect(
    response.status(),
    `sign-in was refused for ${email}: ${JSON.stringify(await response.json().catch(() => ({})))}`,
  ).toBe(200);

  // Signed in means off the sign-in screen; which screen it is depends on what
  // the account's grants put first in the menu.
  await page.waitForURL(url => url.pathname !== '/');
}

module.exports = { signIn };

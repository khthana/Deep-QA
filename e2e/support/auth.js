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
 * The two fields are located by their labels. They were located by input type
 * until #50, because the inherited markup's `htmlFor` attributes pointed at
 * ids the inputs did not carry — the password's at `website-admin`, which is
 * not on this page at all — and the note here read that fixing it would be a
 * redesign this project defers. It is not: two `id` attributes move nothing
 * and restyle nothing, and until they were added the one screen everybody
 * passes through read out as two unnamed fields. `e2e/tests/50a-sign-in.spec.js`
 * is where that is asserted rather than merely relied on.
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
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

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

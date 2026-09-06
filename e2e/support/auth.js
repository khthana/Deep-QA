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
 * What is asserted is the sign-in's own answer *and* that the landing has
 * settled — #66's fourth criterion, and the note that used to stand here
 * refusing to assert the second half is gone with the defect it described.
 *
 * Settling is the part that matters to every other spec in this suite, not
 * only to #66's own. Signing in hands over to `GuestRoute`, which sends an
 * authenticated caller to `/main`; `/main` is a real route whose index element
 * is an empty `<div />`, and `SidebarItem` then replaces it with the first
 * entry of that person's menu. A helper that returned as soon as the address
 * stopped being `/` would return on that empty intermediate, and the `replace`
 * still to come would land *after* whatever the calling spec did next — a
 * navigation quietly undone, in every spec, at a moment nothing controls.
 *
 * So the wait ends off `/` and off `/main` both. Which screen that is depends
 * on the account's grants and is deliberately not named here; `66a` is where
 * the rule itself is asserted.
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

  // Signed in means off the sign-in screen and off the shell's empty index;
  // which screen it is depends on what the account's grants put first in the
  // menu.
  try {
    await page.waitForURL(url => url.pathname !== '/' && url.pathname !== '/main');
  } catch (error) {
    // Every spec in the suite signs in through here, so a bare timeout names
    // this line and not the account that got stuck on it.
    throw new Error(
      `signed in as ${email} but never left ${new URL(page.url()).pathname}: ` +
        `${error.message}`,
    );
  }
}

module.exports = { signIn };

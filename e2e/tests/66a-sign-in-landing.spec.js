'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUserMenu } = require('../support/shell');

/**
 * #66 — where signing in lands, and the screen that used to sit in the way.
 *
 * The ticket asked a question before it asked for a fix: whether the
 * two-application chooser was meant to exist at all. It was answered by the
 * owner on 6 September 2569 — **there is one application now**, so the chooser
 * and the door it offered to Deep Portfolio are both gone, rather than the
 * chooser being repaired into the flow.
 *
 * What was wrong is worth keeping, because it is the shape of the fix. Three
 * components each had an opinion about where a freshly signed-in caller
 * belongs:
 *
 *   - `Login.js` navigated to `/select-app` after `reload()`
 *   - `GuestRoute` redirected an authenticated caller to `/main`
 *   - `SidebarItem` moved anyone standing on `/main` to their first menu entry
 *
 * **#66's own account of what that produced is out of date, and the measured
 * sequence is worse than the one it describes.** The ticket says the chooser
 * is never reached on the password path, the `navigate` being issued from a
 * component the router has already unmounted. Recording every navigation on
 * the way in says otherwise:
 *
 *     /  →  /select-app  →  /main  →  /main/rubrics
 *
 * The chooser *is* reached. It draws, and is then taken away again — first by
 * `GuestRoute`, which redirects away from the route `Login.js` just chose, and
 * then by `SidebarItem`. A screen nobody reaches is dead code; a screen that
 * appears and is yanked away is a screen that cannot be used, and it is the
 * ticket's second criterion stated as a fact: one component navigated to a
 * route another had already redirected away from.
 *
 * Now there is one authority. `Login.js` navigates nowhere, `GuestRoute` says
 * `/main`, and `SidebarItem` moves off `/main` to the first entry of that
 * person's own menu.
 *
 * Not asserted here: that the Google path lands in the same place. Its success
 * branch cannot be driven — `docs/06` §Out of Scope puts OAuth behind a real
 * Google project and a staging environment — so the redirect target is proved
 * by reading `backend/routes/auth.js`, and the acceptance row says so rather
 * than claiming a seam it does not have. It is a ☐ with a ticket (#119), not a
 * ⚙ that covers half of what it claims.
 *
 * **Criterion 2 is met in what a person sees, and not in the letter.** It
 * reads *no component navigates to a route another component has already
 * redirected away from*, and two components still hold that shape: `GuestRoute`
 * navigates to `/main`, `SidebarItem` redirects off it. Rather than argue about
 * whether that counts, it was measured — one sample per composited frame,
 * through the real sign-in journey:
 *
 *     navigations:             / → /main → /main/rubrics
 *     frames painted on /main: 1 of 45, with the body's text not yet laid out
 *
 * One frame, and no state in which a person sees a drawn shell with an empty
 * content area — because nothing in the hop waits on the network. That is an
 * accident of today's data flow rather than a guarantee, so it is #120 and not
 * a silence. The rows below assert the landing as a **rule** read off the
 * sidebar, so they hold either way; what #120 changes is how many components
 * have an opinion, not where anybody ends up.
 */

/**
 * The first entry of the menu this account was given, read off the sidebar.
 *
 * Scoped to the side menu by its accessible name, the way `support/shell.js`
 * locates it. A first draft took the first `nav a[href]` on the page and got
 * the navigation bar's logo, which points at `/` — so the row compared the
 * landing address against the sign-in page and failed while the code was
 * right. The two `<nav>`s are told apart by their names, which is what those
 * names are for.
 */
async function firstMenuHref(page) {
  const first = page
    .getByRole('navigation', { name: 'เมนูหลัก' })
    .getByRole('link')
    .first();
  await expect(first).toBeVisible();
  return new URL(await first.getAttribute('href'), page.url()).pathname;
}

test('signing in lands on the first entry of the caller’s own menu, not on the shell’s empty index', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);

  const landed = new URL(page.url()).pathname;
  // Not the sign-in page, and not `/main` — which is a declared route whose
  // index element is an empty `<div />`, so being left there is a blank screen
  // with a menu beside it.
  expect(landed).not.toBe('/');
  expect(landed).not.toBe('/main');
  // And it is the rule rather than a path copied into this file: whatever the
  // sidebar draws first is where sign-in goes. A menu reordered by #49 or #79
  // moves both together.
  expect(landed).toBe(await firstMenuHref(page));
});

test('a teacher lands by the same rule, in a different tree', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);

  const landed = new URL(page.url()).pathname;
  expect(landed).not.toBe('/');
  expect(landed).not.toBe('/main');
  // The teacher's menu hangs off `/teacher/...`, so a rule written as "goes to
  // /main/something" would be wrong for the role that has most of the screens.
  expect(landed).toBe(await firstMenuHref(page));
});

test('nothing on the way there visits a route another component has already left', async ({
  page,
}) => {
  const visited = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
  });

  await signIn(page, ACCOUNTS.committee0501);

  // The observable form of the ticket's second criterion. `/select-app` is
  // gone, so a `Login.js` still navigating to it would show up here even
  // though the redirect that overrules it would hide the consequence.
  expect(visited).not.toContain('/select-app');
});

test('the chooser is gone, and its address is a 404 like any other', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await page.goto('/select-app');

  // Not the chooser, and not a silent bounce to the landing screen either: an
  // address nobody declares should say so.
  await expect(page.getByRole('heading', { name: 'ไม่พบหน้าที่คุณต้องการ' })).toBeVisible();
  await expect(page.getByText('เลือกระบบที่ต้องการเพื่อเริ่มต้นการทำงาน')).toHaveCount(0);
});

test('the user menu offers no door to another application', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);

  await openUserMenu(page);

  // The portfolio entry sat here permanently, which is what made the chooser's
  // second door redundant even before the decision to drop it. One application
  // now, so there is nowhere else to be sent.
  await expect(page.getByText('ไปที่ Deep Portfolio')).toHaveCount(0);
  // The menu itself still opened — otherwise this row passes on a button that
  // does nothing, which is the failure #40's walk found.
  await expect(page.getByText('ลงชื่อเข้าใช้โดย')).toBeVisible();
});

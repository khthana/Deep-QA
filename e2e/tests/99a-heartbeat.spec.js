'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { CARD_SCREENS, pencils, boxOf } = require('../support/card-screens');
const { gate, isWrite } = require('../support/gate');
const { actingButton, roleOption } = require('../support/shell');

/**
 * #99 — somebody typing is working, and the server now hears about it.
 *
 * `requireSession` renews a token with under ten minutes left, but only on a
 * request, and typing makes none: a long form written after a request at minute
 * nineteen was saved into an expired session. The shell now sends
 * `POST /api/me/activity` when somebody presses a key or clicks, at most once
 * every five minutes (`AuthContext.js`, ADR-0005).
 *
 * ## What these rows can and cannot say
 *
 * They are about the browser's half: *what* makes a heartbeat, and *how often*.
 * The server's half — a heartbeat inside the last ten minutes renews, one
 * outside them does not — is `backend/test/shell.test.js` *a heartbeat (#99)*.
 * The claim the ticket makes, that somebody working is never signed out, is the
 * two halves together: a heartbeat at least every five minutes of work always
 * lands inside a ten-minute window. Neither seam can run thirty real minutes, so
 * each pins its own number and the sheet says so.
 *
 * Time is moved with Playwright's clock, installed before the page loads, so
 * the page's `Date.now` is the one being moved; the server's clock is not, and
 * the token stays fresh, which is why every heartbeat here is answered 204 with
 * no renewal. The counts are read once, after `SETTLE_MS` (#50).
 *
 * The clock the five minutes are counted from starts with the session, not with
 * a heartbeat: the sign-in and the read that followed it were requests already.
 * So the first heartbeat in each row is the one five minutes into the session.
 *
 * ## The click that is also a sign-out
 *
 * A heartbeat's answer can carry a renewed cookie, and the click that sends it
 * can be the click on sign-out or on another grant. Landing after either, that
 * cookie would sign the browser back in, or put the old grant back on (#51). So
 * can the answer to a heartbeat sent beside a save that ends an account's access
 * (#52). The last three rows hold the heartbeat at the route and ask that nothing
 * else is sent until it is let go. They measure that order; that a renewed cookie
 * landing second would have undone the sign-out is argued, not measured - the held
 * heartbeat is answered here, with no cookie.
 *
 * `gate`'s `success` is for rows about what a screen does with a success. These
 * rows use it only so that nothing held is answered with an error some listener
 * would read; what they assert is what leaves, not what is drawn.
 *
 * ## What this file writes
 *
 * Only `user_log`, like every file that signs in: each sign-in writes a `LOGIN`,
 * and the switch of grant a `SWITCH_ROLE`. Nothing cleans that table, and the
 * leftovers report names it after every run (#132). Nothing else: the forms are
 * typed into and never saved, the refused save is refused at the route, and both
 * sign-outs are held and answered there, so no `LOGOUT` is written.
 */

const FIVE_MINUTES = '05:00';
const SETTLE_MS = 250;

const isBeat = (request) =>
  request.method() === 'POST' && new URL(request.url()).pathname === '/api/me/activity';

const HEARTBEAT = /^\/api\/me\/activity$/;
const LOGOUT = /^\/api\/auth\/logout$/;
const ACTING_ROLE = '/api/me/acting-role';
const TEACHER = 'อาจารย์ผู้สอน';

/** Signs in on a moveable clock, opens a card's form, and counts heartbeats. */
async function atAnOpenForm(page) {
  const beats = [];
  page.on('request', (request) => {
    if (isBeat(request)) beats.push(request);
  });
  await page.clock.install();
  await signIn(page, ACCOUNTS.teacherOne);
  const [screen] = CARD_SCREENS;
  await screen.open(page);
  await pencils(page).nth(0).click();
  await expect(boxOf(page, screen.field)).toBeVisible();
  return { beats, box: boxOf(page, screen.field) };
}

async function settledCount(page, beats) {
  await page.waitForTimeout(SETTLE_MS);
  return beats.length;
}

test('typing five minutes into the session sends a heartbeat', async ({ page }) => {
  const { beats, box } = await atAnOpenForm(page);
  await page.clock.fastForward(FIVE_MINUTES);

  await box.press('a');

  expect(await settledCount(page, beats), 'heartbeats after a key').toBe(1);
  expect((await beats[0].response()).status(), 'the heartbeat, answered').toBe(204);
});

test('a click five minutes into the session sends a heartbeat', async ({ page }) => {
  const { beats } = await atAnOpenForm(page);
  await page.clock.fastForward(FIVE_MINUTES);

  await page.getByRole('heading').first().click();

  expect(await settledCount(page, beats), 'heartbeats after a click').toBe(1);
  expect((await beats[0].response()).status(), 'the heartbeat, answered').toBe(204);
});

// The other half of the ticket: somebody who walks away still expires. The
// server's threshold is unchanged, so what this row asks is that the browser
// says nothing for somebody who presses nothing — a heartbeat on a timer would
// keep an empty chair signed in for ever.
test('ten minutes with nothing pressed sends none', async ({ page }) => {
  const { beats } = await atAnOpenForm(page);
  const before = beats.length;

  await page.clock.fastForward('10:00');

  expect(await settledCount(page, beats), 'heartbeats sent to an empty chair').toBe(before);
});

test('typing again within five minutes does not send a second', async ({ page }) => {
  const { beats, box } = await atAnOpenForm(page);
  await page.clock.fastForward(FIVE_MINUTES);
  await box.press('a');
  expect(await settledCount(page, beats), 'the first heartbeat').toBe(1);

  await page.clock.fastForward('01:00');
  await box.press('b');
  await box.press('c');

  expect(await settledCount(page, beats), 'heartbeats within five minutes').toBe(1);
});

// The click on sign-out is the click that sends the heartbeat, when five
// minutes have gone. Its answer is held; the sign-out must not leave until it
// has landed, or a renewed cookie arriving after it signs the browser back in.
test('signing out waits for a heartbeat that is still out', async ({ page }) => {
  await atAnOpenForm(page);
  const beat = await gate(page, HEARTBEAT, isWrite, { success: {} });
  const logout = await gate(page, LOGOUT, isWrite, { success: {} });
  let loggedOut = false;
  logout.sent.then(() => { loggedOut = true; });
  await page.clock.fastForward(FIVE_MINUTES);

  await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
  await beat.sent;
  await page.waitForTimeout(SETTLE_MS);
  expect(loggedOut, 'a sign-out sent while the heartbeat was out').toBe(false);

  beat.open();
  await logout.sent;
  logout.open();
  await page.waitForURL((url) => url.pathname === '/');
});

// The same for putting on another grant: the switch re-issues the cookie, and a
// renewal landing after it would carry the old grant back - #51.
test('switching grant waits for a heartbeat that is still out', async ({ page }) => {
  const switches = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === ACTING_ROLE) switches.push(request);
  });
  await page.clock.install();
  await signIn(page, ACCOUNTS.multiRole);
  await expect(actingButton(page)).toBeVisible();
  const beat = await gate(page, HEARTBEAT, isWrite, { success: {} });
  await page.clock.fastForward(FIVE_MINUTES);

  await actingButton(page).click();
  await beat.sent;
  await roleOption(page, TEACHER).click();
  await page.waitForTimeout(SETTLE_MS);
  expect(switches.length, 'switches sent while the heartbeat was out').toBe(0);

  beat.open();
  await expect(actingButton(page)).toHaveText(new RegExp(TEACHER));
  expect(switches.length, 'switches sent once it had landed').toBe(1);
});

// The third way the shell signs out: an answer saying the account has ended.
// The click that sends the save the server refuses can also send a heartbeat,
// and the heartbeat's answer - refused as well, but only after `requireSession`
// has renewed the cookie - would put a cookie back after the sign-out cleared
// it. The save is refused here at the route, so nothing is written.
test('the sign-out an ended account makes waits for a heartbeat that is still out', async ({ page }) => {
  const [screen] = CARD_SCREENS;
  const { box } = await atAnOpenForm(page);
  const beat = await gate(page, HEARTBEAT, isWrite, { success: {} });
  const logout = await gate(page, LOGOUT, isWrite, { success: {} });
  await page.route((url) => screen.api.test(url.pathname), (route, request) =>
    isWrite(request)
      ? route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ message: REFUSALS.inactive, reason: 'inactive', accessEnded: true }),
        })
      : route.fallback());
  let loggedOut = false;
  logout.sent.then(() => { loggedOut = true; });
  // `fill` sends no keydown, so the heartbeat is the one the save's click sends.
  await box.fill('x');
  await page.clock.fastForward(FIVE_MINUTES);

  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await beat.sent;
  await page.waitForTimeout(SETTLE_MS);
  expect(loggedOut, 'an ended account signed out while the heartbeat was out').toBe(false);

  beat.open();
  await logout.sent;
  logout.open();
});

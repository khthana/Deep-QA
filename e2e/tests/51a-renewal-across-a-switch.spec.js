'use strict';

const { test, expect } = require('@playwright/test');

const { COOKIE_NAME, RENEW_BELOW_SECONDS } = require('../../backend/auth/session');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isGet } = require('../support/gate');
const { payloadOf, sessionCookie, shortenSession } = require('../support/expired-session');
const { settled } = require('../support/pager');
const { table: rubricsTable } = require('../support/rubrics-screen');
const {
  PROGRAM_SUBJECTS,
  PROGRAM_SUBJECTS_API,
  actingButton,
  menuLink,
  switchTo,
} = require('../support/shell');

/**
 * #51 — a renewal that crosses a switch used to put the old hat back on.
 *
 * `requireSession` re-issues a token with under ten minutes left and carries
 * the selection in it forward. The selection it carries is the one that was in
 * that request's token, so a request already in flight when somebody switched
 * role wrote its cookie after the switch's cookie, last write won, and the
 * browser was wearing a grant the picker no longer showed. Since #51 the token
 * also carries `acting_epoch`, the account's switch counter, and a renewal that
 * does not match it writes no cookie at all (`backend/auth/session.js`,
 * ADR-0006).
 *
 * ## What these rows are about
 *
 * The browser's cookie jar, which is where "last write wins" happens and is the
 * one part of this the HTTP seam can only argue. The first row builds the stale
 * request itself: a request held at the route carries the headers it was sent
 * with — the pre-switch token among them — and `gate` replays exactly those when
 * the row lets it go. So the interleave is the one a person can make: a read
 * still out, a switch, the read landing afterwards.
 *
 * What it takes is care about *when* the session is aged. Every request renews a
 * token inside the window, so the held read is only stale if nothing else went
 * out between the ageing and it: the row waits for the screen it signs in on to
 * finish drawing, ages, and the next thing that leaves is the read it holds. The
 * row asserts that precondition rather than trusting it — a read that left with
 * a fresh token would pass everything below while proving nothing.
 *
 * The second row is the other half of the fix, that a session in its last ten
 * minutes still renews after a switch, and renews carrying the new hat rather
 * than falling back to the senior one.
 *
 * The session is aged by re-signing the real cookie (`shortenSession`), which
 * is the same precondition `10a`'s expiry row arranges and for the same reason:
 * `LIFETIME_SECONDS` offers no seam to shorten and nothing else reaches the
 * renewal threshold without twenty real minutes.
 *
 * ## What this file writes
 *
 * Only `user_log`, like every file that signs in: a `LOGIN` each time and a
 * `SWITCH_ROLE` for each switch. Nothing cleans that table and the leftovers
 * report names it after every run (#132). `users.acting_epoch` moves with each
 * switch and is not put back — it is a counter that only goes up, and no row
 * anywhere reads an absolute value from it.
 */

const TEACHER = 'อาจารย์ผู้สอน';
const TEACHER_GRANT = { role_id: 'TEACHER', scope_id: '05' };
const PROGRAM_SUBJECTS_MENU = 'รายวิชาในหลักสูตร';
const PROGRAM_SUBJECTS_READ = new RegExp(`^${PROGRAM_SUBJECTS_API}$`);

/** A minute inside the renewal window, read from the threshold itself. */
const NEARLY_OVER = RENEW_BELOW_SECONDS - 60;

/** What the browser's cookie says right now. */
const sessionClaims = async (page) => payloadOf((await sessionCookie(page)).value);

/** What the token in a request's own headers said — the one it was sent with. */
async function tokenSentWith(request) {
  const { cookie = '' } = await request.allHeaders();
  const [, token] = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`)) ?? [];
  if (!token) throw new Error('the held request carried no session cookie');
  return payloadOf(decodeURIComponent(token));
}

const secondsLeft = (claims) => claims.exp - Math.floor(Date.now() / 1000);

test('a read still out when the grant changes cannot renew the session it left under', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);
  await settled(rubricsTable(page));

  // From here the read below has to be the next request out: anything between
  // this line and it would renew the session, and the read would carry the new
  // token, which is not stale and proves nothing.
  await shortenSession(page, NEARLY_OVER);
  const before = await sessionClaims(page);

  const read = await gate(page, PROGRAM_SUBJECTS_READ, isGet);
  await menuLink(page, PROGRAM_SUBJECTS_MENU).click();
  await read.sent;

  const held = await tokenSentWith(read.request);
  expect(secondsLeft(held), 'the life left in the token the held read was sent with').toBeLessThan(
    RENEW_BELOW_SECONDS,
  );
  expect(held.acting_epoch, 'the switch counter the held read is carrying').toBe(
    before.acting_epoch,
  );

  await switchTo(page, TEACHER);
  read.open();
  await read.answered;

  // It is answered as the grant it names — the screen it asked for is drawn.
  // What it has lost is the right to extend the session it arrived with.
  expect((await read.request.response()).status(), 'the released read, answered').toBe(200);

  const after = await sessionClaims(page);
  expect(after.acting, 'the hat in the browser after the read landed').toEqual(TEACHER_GRANT);
  expect(after.acting_epoch, 'the switch counter the browser is carrying').toBe(
    before.acting_epoch + 1,
  );
  await expect(actingButton(page)).toHaveText(new RegExp(TEACHER));
});

test('a session inside its last ten minutes renews after a switch, keeping the new hat', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);
  await switchTo(page, TEACHER);

  // Inside the threshold, so the next request renews if it is allowed to renew
  // at all. Without this row the fix could be "nothing renews any more", which
  // is a session that ends under somebody who is working.
  await shortenSession(page, NEARLY_OVER);
  const aged = await sessionClaims(page);

  await Promise.all([
    page.waitForResponse((answer) => new URL(answer.url()).pathname === PROGRAM_SUBJECTS_API),
    page.goto(PROGRAM_SUBJECTS),
  ]);

  const renewed = await sessionClaims(page);
  expect(renewed.exp, 'the token the browser holds after the request').toBeGreaterThan(aged.exp);
  expect(renewed.acting, 'the hat the renewal carried forward').toEqual(TEACHER_GRANT);
  expect(renewed.acting_epoch, 'the counter the renewal carried forward').toBe(aged.acting_epoch);
});

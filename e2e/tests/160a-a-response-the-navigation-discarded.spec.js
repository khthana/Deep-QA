'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, gateNavigation, isGet } = require('../support/gate');
const { BACKEND_URL } = require('../support/env');
const teaching = require('../support/teaching-screen');

/**
 * #160 — a helper hands back a response whose body the navigation discarded.
 *
 * Every `open…` helper in `e2e/support/` is written the same way:
 *
 * ```js
 * const [response] = await Promise.all([waitForList(page), page.goto(PATH)]);
 * ```
 *
 * and hands that response to the row to read. Chromium keeps a response body
 * only until the page navigates away from the document that asked for it, so if
 * the waiter matches a call belonging to the document being *left*, the row dies
 * on `.json()` with a protocol error naming neither the helper nor the
 * navigation:
 *
 * > Response body is not available for a response that was navigated away from.
 *
 * The window is open because the predicate matches the path and the method and
 * nothing else, and `signIn` returns as soon as the address leaves `/main` —
 * which is while the landing screen's own list call is still out. That is how
 * `149a` lost a row three times out of three on 23 September, in a setup step
 * that had nothing to do with its subject.
 *
 * ## Why this is choreographed rather than waited for
 *
 * A race reproduced by running the suite until it loses is not a row. Both
 * halves are therefore held at the route and released in the order the defect
 * needs:
 *
 * 1. A question is asked from the document we are about to leave, and held.
 * 2. The navigation itself is held, so it has not committed yet.
 * 3. The stale answer is released **first** — it lands while its own document
 *    is still the one on screen, which is what lets the waiter match it.
 * 4. The navigation is released, and committing it is what discards that body.
 *
 * The navigation is held by `gateNavigation` and not by `gate`, because a
 * document handed to the page by `route.fulfill` arrives with no address space
 * of its own and everything it then asks of `localhost` is refused as a
 * local-network request — the screen sees no `/api/me` and returns to the
 * sign-in form. `gate.js` says so where it would be reached for.
 *
 * Nothing here is decided by how long anything takes (#52). What each row then
 * asks is the only thing the helper promises: that the response it handed back
 * can be read.
 *
 * ## Why there are two rows
 *
 * They are about the two halves of the same window, and only the second one can
 * tell the fence `navigation.js` draws from the one that looks like it.
 *
 * The first asks the question the ticket was opened on: a call that was already
 * out when the helper started. The second asks for one the outgoing document
 * makes **after** it started — while the navigation is held, so the old screen
 * is still there to make it. A fence at the navigation *request* admits that
 * one, matches it, and dies exactly as the ticket describes; a fence at the
 * **commit** does not, because nothing on the far side of a commit belongs to
 * the document that is gone. Without this row the fence is a clause no row
 * reaches, and this file's proof would be one narrowing measured against
 * another.
 *
 * Neither is proved by a mutant. Harness code is not what `mutation/` mutates,
 * so what stands in for one is a control run by hand: put
 * `Promise.all([waitForSections(page), page.goto(DASHBOARD)])` back into
 * `openDashboard` and row one dies with the protocol error above; make the fence
 * the navigation request rather than the commit and row two does.
 */

const SECTIONS = /^\/api\/teaching\/sections$/;
const DOCUMENT = /^\/teacher\/teacherDashboard$/;

test('a screen opened while the last one still has an answer coming reads its own', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);

  // `gate` holds the first request its predicate accepts and lets the rest
  // through, so this one is the outgoing document's and the new document's own
  // call is not touched.
  const stale = await gate(page, SECTIONS, isGet);
  await page.evaluate(api => {
    fetch(`${api}/api/teaching/sections`, { credentials: 'include' });
  }, BACKEND_URL);
  await stale.sent;

  const navigation = await gateNavigation(page, DOCUMENT);
  const opening = teaching.openDashboard(page);
  await navigation.sent;

  // The stale answer lands in the document that asked for it...
  stale.open();
  await stale.answered;

  // ...and only then may the document it belongs to be replaced.
  navigation.open();

  const response = await opening;

  expect(response.status()).toBe(200);
  const { sections } = await response.json();
  expect(Array.isArray(sections)).toBe(true);
});

test('a question the screen being left asks after the helper has started is not read either', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);

  // The screen we are about to leave is given a question that renews itself:
  // as soon as one is answered the next goes out. Nothing here waits for a
  // duration - what it buys is that there is always another request on the
  // way, so the one the gate below holds is certainly one made *after* the
  // helper started watching. `page.evaluate` cannot be used once the
  // navigation is pending (it waits for a frame that is going away, measured:
  // `net::ERR_ABORTED; maybe frame was detached?`), so it is set going here
  // and the ordering is done with the gates.
  await page.evaluate(api => {
    const again = () =>
      fetch(`${api}/api/teaching/sections`, { credentials: 'include' }).finally(again);
    again();
  }, BACKEND_URL);

  const navigation = await gateNavigation(page, DOCUMENT);
  const opening = teaching.openDashboard(page);
  await navigation.sent;

  // Installed only now: `openAt` is already watching, and the outgoing document
  // is still the one on screen, so what this holds is a request made inside the
  // window a fence at the navigation request would have left open.
  const stale = await gate(page, SECTIONS, isGet);
  await stale.sent;

  stale.open();
  await stale.answered;

  navigation.open();

  const response = await opening;

  expect(response.status()).toBe(200);
  const { sections } = await response.json();
  expect(Array.isArray(sections)).toBe(true);
});

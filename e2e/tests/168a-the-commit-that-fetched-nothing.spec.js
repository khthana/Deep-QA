'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, gateNavigation, isGet } = require('../support/gate');
const { BACKEND_URL } = require('../support/env');
const teaching = require('../support/teaching-screen');

/**
 * #168 — the fence of #160 opened on a navigation that fetched nothing.
 *
 * `160a` is about which document a response belongs to. This file is about which
 * event is the commit of a document at all: Playwright reports
 * `history.replaceState` through `framenavigated` like a real commit, so the
 * fence opened before the `goto`'s document existed and collected the outgoing
 * document's calls — the one thing `navigation.js` exists to refuse. `105a` died
 * of it in the full run of 27 September, and a census of the whole suite says the
 * false commit came first in 389 of 621 windows.
 *
 * ## The two rows are not two proofs
 *
 * Harness code is not what `mutation/` mutates, so what stands in for a mutant is
 * a control run by hand, as in `160a`. The first row **is** proved that way: put
 * `page.on('framenavigated')` back as the fence and it dies with `openAt`'s own
 * sentence, while both rows of `160a` stand — one row killed and the rest
 * standing is what says the row is about this and not about #160.
 *
 * The second row is **a net and not a proof**, and the ticket asked for the
 * opposite, so the numbers are here. It builds the situation the ticket's own fix
 * was for: a document commits, asks, and is replaced in turn before its answer
 * arrives. Removing that fix — `asked.clear()` in the commit handler — leaves this
 * row passing, because a request released into a page that has moved on produces
 * no response for the waiter to match at all. That, the census's 0 windows with
 * two document commits, and the fact that an intermediate document's answer can
 * only reach the waiter while that document is still on screen (which is
 * `keepBody` racing a commit, not a question of which document asked) are why the
 * clause is not in `navigation.js`. The row stays because it is the thing that
 * would go red if Chromium ever delivered those late answers.
 */

const SECTIONS = /^\/api\/teaching\/sections$/;
const DOCUMENT = /^\/teacher\/teacherDashboard$/;
const SUBJECT = '01076105';

test('a navigation the screen makes within its own document does not open the fence', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);

  // The screen we are about to leave is given a question that renews itself and
  // a same-document navigation beside it, for the reason `160a`'s second row
  // gives: `page.evaluate` cannot be used once the navigation is pending, so
  // this is set going here and the ordering is done with the gates. Nothing
  // waits for a duration (#52) — what the renewal buys is that there is always
  // another `replaceState` and another question on the way, so the request the
  // gate below holds is certainly one made after the helper started watching
  // and after a same-document navigation.
  await page.evaluate(api => {
    let n = 0;
    const again = () => {
      window.history.replaceState({}, '', `${window.location.pathname}?within=${++n}`);
      fetch(`${api}/api/teaching/sections`, { credentials: 'include' }).finally(again);
    };
    again();
  }, BACKEND_URL);

  const navigation = await gateNavigation(page, DOCUMENT);
  const opening = teaching.openDashboard(page);
  await navigation.sent;

  const stale = await gate(page, SECTIONS, isGet);
  await stale.sent;

  // It lands inside its own document, which is still the one on screen.
  stale.open();
  await stale.answered;

  navigation.open();

  const response = await opening;

  expect(response.status()).toBe(200);
  const { sections } = await response.json();
  expect(Array.isArray(sections)).toBe(true);
});

test('a document that commits and is replaced in turn leaves nothing behind it', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);

  // The landing screen is waited for by what it drew, so its own list answer has
  // already landed and everything the route below holds belongs to the document
  // this helper is about to open. With that pair the other way round the row
  // measures nothing: the held call is answered before the `goto` has committed,
  // and the second navigation aborts it (`net::ERR_ABORTED`).
  await expect(teaching.sectionCard(page, SUBJECT)).toHaveCount(1);

  // `gate` holds one request and this document asks twice (measured), so the
  // second would be answered inside its own document and the row would be about
  // `keepBody` racing a navigation rather than about the fence. Everything is
  // held until the row says otherwise.
  let holding = true;
  const held = [];
  await page.route(
    url => SECTIONS.test(url.pathname),
    route => {
      if (!holding) return route.fallback();
      held.push(route);
    },
  );

  const opening = teaching.openDashboard(page);
  await expect.poll(() => held.length).toBeGreaterThan(0);

  // A second document commits while those answers are still at the route, which
  // is what discards their bodies: the requests collected for the document now
  // gone have to go with it. The wait is for the first document's own load and
  // not for a duration — navigating before it aborts the helper's `goto`.
  await page.waitForLoadState('load');
  await page.goto(`${teaching.DASHBOARD}?again`);

  // Let the replaced document's answers arrive, late, into a page that has moved
  // on - then the new document's own call, which nothing holds any more.
  holding = false;
  await Promise.all(held.map(route => route.continue().catch(() => {})));

  const response = await opening;

  expect(response.status()).toBe(200);
  const { sections } = await response.json();
  expect(Array.isArray(sections)).toBe(true);
});

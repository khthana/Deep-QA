'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const {
  API: BEHAVIORS_API,
  waitForBehaviors,
  untilBehaviorsDrawn,
  myClos,
} = require('../support/behaviors-screen');
const { path: closPath, waitForClos } = require('../support/clos-screen');

/**
 * #141 — the way in that was said not to exist.
 *
 * #133 gave twenty-two sites a flag that ties an answer to the request that
 * caused it — twenty-four when #141 recounted them — and six got rows, because
 * a control on the screen itself can supersede a request. The sixteen of its own
 * table, nineteen claims once the recount was in, read `useParams` alone, and
 * the ticket wrote the same sentence sixteen times: superseding one of those
 * means travelling from one CLO to another **on the same route** without the
 * component being unmounted, and every link on those screens goes *up*, to a
 * list that unmounts it. #141's 30 September comment measured that three ways —
 * every `load` depends on `useParams` alone, the tree holds five `navigate()`
 * calls and none moves to the same route shape, and Back and Forward were
 * checked too, because they are controls every reader already has: *two URLs of
 * the same route shape are never adjacent in history, because reaching the
 * second always goes through the list.*
 *
 * **Adjacent is the word that does the work, and the browser does not need
 * them adjacent.** Back and Forward are not one-step-only controls: pressing
 * and holding either one opens the history list, and clicking an entry in it
 * travels however many entries away it is in a single move. A person who reads
 * CLO-1's behaviours, goes up to the list, and opens CLO-2's has written
 * `[behaviours 1, list, behaviours 2]` into their own history; the entry two
 * back is then one click away, and the move never passes through the list.
 * React Router matches the same route element either side of it, so the
 * component is not unmounted — measured here, not reasoned: the marker this
 * file writes on `window` survives the jump, and the screen re-reads for the
 * CLO it landed on.
 *
 * So *a ticket that names a race has named a window, not the population of ways
 * in* (#179), one level up: what #141 enumerated was the controls that move one
 * entry, and the population is the controls that move the address without
 * replacing the document. The sixteen sites are reachable today, by a control
 * that shipped with the browser.
 *
 * ## What this file holds, and what it does not
 *
 * One row, for `pages/MeasurableBehaviors.js` — sheet `28`. It is the site whose
 * situation is cheapest to build honestly: two CLOs of one Section, each with
 * its own behaviours, and both reachable by the links the screens already draw.
 * The remaining fifteen sites of #133's family, and the twenty-one handler sites
 * of #140 on the same screens, are the same mechanism with a different address,
 * and #141 stays open for them under its own criterion 4 — a deferral that is
 * in the tracker rather than in prose (#119).
 *
 * The race is built the way `133a` builds its own: the superseded answer is held
 * back with `page.route` and the one that supersedes it is not, so which arrives
 * second is a fact about this file rather than about the machine. The screen is
 * read once, after the held answer has landed.
 *
 * The assertion is the heading against the address, because the heading is drawn
 * from the **answer** (`data.clo.clo_number`) and the address is what was
 * **asked for**. A superseded answer makes those two disagree, which is the
 * defect in one sentence. `mutation/141-superseded-across-a-history-jump.py`
 * carries the mutant.
 */

/** Long enough for the CLO the jump lands on to be back and drawn first. */
const HELD_MS = 2_000;

/**
 * The render the held answer would cause. `untilBehaviorsDrawn` cannot be used
 * here — waiting for the right CLO to be drawn is the thing under test — so this
 * is a wait with no settle point behind it, which is the one place in this file
 * where a number decides something. It is held to that by the mutant: with the
 * guard removed the stale draw landed inside it on the sweep.
 */
const SETTLE_MS = 250;

const sleep = ms => new Promise(done => setTimeout(done, ms));

const forClo = (url, sectionId, cloId) =>
  new URL(url).pathname === `/api/teaching/sections/${sectionId}/clos/${cloId}/behaviors`;

test('behaviours the back button has left behind do not land on top of the CLO it went to', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [sectionId] = await mySectionIds(page);
  const clos = (await myClos(page, sectionId)).filter(clo => clo.clo_number);

  // Two CLOs of one Section, asserted rather than assumed: a row handed a world
  // with one CLO in it would hold nothing and still pass (#129).
  expect(clos.length).toBeGreaterThan(1);
  const [landed, held] = clos;

  const intoBehaviours = clo =>
    page.getByRole('link', { name: `พฤติกรรมบ่งชี้ของ ${clo.clo_number}`, exact: true });

  // The only document load. Every move after it is the router's own, which is
  // what makes the jump a traversal inside one document rather than a reload.
  const opening = waitForClos(page);
  await page.goto(closPath(sectionId));
  await opening;
  await page.evaluate(() => {
    window.__document = 'the one the router has been moving inside';
  });

  const anyBehaviours = url => BEHAVIORS_API.test(url.pathname);

  try {
    await page.route(anyBehaviours, async (route, request) => {
      if (forClo(request.url(), sectionId, held.clo_id)) await sleep(HELD_MS);
      await route.continue();
    });

    // The first CLO's behaviours, clicked off its own card: history entry one.
    const first = waitForBehaviors(page);
    await intoBehaviours(landed).click();
    await untilBehaviorsDrawn(page, await first);

    // Up to the list by the link this screen offers: history entry two. This is
    // the step #141 read as the end of the matter — it does unmount the screen,
    // and it is also what puts two behaviour addresses two entries apart.
    const back = waitForClos(page);
    await page.getByRole('link', { name: 'ผลการเรียนรู้รายวิชา', exact: true }).first().click();
    await back;

    // The other CLO's behaviours: history entry three, and the read that is held.
    const heldRequested = page.waitForRequest(request =>
      forClo(request.url(), sectionId, held.clo_id),
    );
    const heldArrived = page.waitForResponse(answer =>
      forClo(answer.url(), sectionId, held.clo_id),
    );
    const landedAgain = page.waitForResponse(answer =>
      forClo(answer.url(), sectionId, landed.clo_id),
    );
    await intoBehaviours(held).click();

    // The request has to be **out** before the jump, or there is nothing to
    // supersede and the row passes without ever racing anything. Waited for by
    // identity rather than by a clock: the first measurement of this row jumped
    // while the click was still being turned into a request, and the answer it
    // then waited for was never asked for.
    await heldRequested;

    // The jump: two entries in one move, which is what the history list behind
    // the back button does. `goBack()` would be two moves through the list, and
    // the list unmounts the screen — the whole reason the sixteen were said to
    // be unreachable.
    await page.evaluate(() => window.history.go(-2));

    // Both answers are in, the held one second, and the screen has had a turn
    // to draw it.
    await landedAgain;
    await heldArrived;
    await page.waitForTimeout(SETTLE_MS);

    // Three clauses in one assertion, so none of them is the one left unreached
    // on the run that proves another: the document was never replaced, the
    // address is the CLO the jump landed on, and the heading — which is drawn
    // from the answer — names that CLO rather than the one left behind.
    expect({
      document: await page.evaluate(() => window.__document),
      address: new URL(page.url()).pathname.match(/courseOutcomes\/(\d+)\/behaviors/)[1],
      heading: (
        await page.getByRole('heading', { name: /^พฤติกรรมบ่งชี้ของ / }).innerText()
      ).trim(),
    }).toEqual({
      document: 'the one the router has been moving inside',
      address: String(landed.clo_id),
      heading: `พฤติกรรมบ่งชี้ของ ${landed.clo_number}`,
    });
  } finally {
    await page.unroute(anyBehaviours);
  }
});

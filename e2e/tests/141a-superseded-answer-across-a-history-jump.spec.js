'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const {
  API: BEHAVIORS_API,
  untilBehaviorsDrawn,
  myClos,
} = require('../support/behaviors-screen');
const {
  API: CRITERIA_API,
  untilCriteriaDrawn,
} = require('../support/achievements-screen');
const { openClos, waitForClos } = require('../support/clos-screen');
const {
  openActivities,
  untilActivitiesDrawn,
  waitForActivities,
} = require('../support/activities-screen');
const { evidenceLink } = require('../support/evidence-screen');
const {
  criteriaLink,
  openRubrics,
  waitForList: waitForRubrics,
} = require('../support/rubrics-screen');
const {
  untilListDrawn: untilRubricCriteriaDrawn,
} = require('../support/rubric-criteria-screen');

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
 * Four rows, one per site whose situation a browser can build **today**, and the
 * word is doing work: the jump needs two addresses of one route shape, so it
 * needs a parent list that offers a link to each of two siblings. Measured on
 * 3 October 2569, three of #133's remaining fifteen sites have one and twelve do
 * not — `AchievementCriteria` under a CLO (sheet `29`), `ActivityEvidence` under
 * an Activity (sheet `35`), `RubricCriteria` under a central Rubric (sheet `22`)
 * — and `MeasurableBehaviors` (sheet `28`), which is where this file started.
 *
 * The twelve that are left take `sectionId` from the address, and the only thing
 * in the application that produces a different one is the dashboard's own list
 * (`pages/TeacherDashboard.js`), which `/api/teaching/sections` filters to the
 * **current term**: `teacher.one` holds two Sections and one of them is
 * 2568/1, so the list draws one row and there is no second address to jump
 * between. That is the reason, re-measured, and it is not the reason #141 and
 * `57-pager` had written down — they said the account held one Section. The
 * register carries the corrected sentence and the date; the ticket stays open
 * under its own criterion 4 for the twelve, which is a deferral in the tracker
 * rather than in prose (#119).
 *
 * The mechanism is written once, in `heldAnswerLosesTheJump`, because what
 * differs between the four is only an address. No claim lives in it: every row
 * reads its own screen and asserts its own three clauses after it returns, and
 * each mutant breaks one page file, so no mutant can be killed by another row
 * (#171's rule for an instrument that is not an assertion).
 *
 * The race is built the way `133a` builds its own: the superseded answer is held
 * back with `page.route` and the one that supersedes it is not, so which arrives
 * second is a fact about this file rather than about the machine. The screen is
 * read once, after the held answer has landed.
 *
 * Each row's assertion is the heading against the address, because the heading
 * is drawn from the **answer** — the CLO's number, the Activity's name, the
 * Rubric's code — and the address is what was **asked for**. A superseded answer
 * makes those two disagree, which is the defect in one sentence.
 * `mutation/141-superseded-across-a-history-jump.py` carries the four mutants,
 * one per page file, and each kills one row.
 */

/** Long enough for the sibling the jump lands on to be back and drawn first. */
const HELD_MS = 2_000;

/**
 * The render the held answer would cause. The screens' own `until…Drawn`
 * helpers cannot be used here — waiting for the right sibling to be drawn is the
 * thing under test — so this is a wait with no settle point behind it, which is
 * the one place in this file where a number decides something. It is held to
 * that by the mutants: with a guard removed the stale draw landed inside it on
 * every sweep.
 */
const SETTLE_MS = 250;

const sleep = ms => new Promise(done => setTimeout(done, ms));

/**
 * The jump, built once for the four rows that differ only in their address.
 *
 * This is an instrument and not an assertion — it ends with the screen in the
 * state a row is about and reads nothing, so every claim is still written in the
 * row that called it. What it does:
 *
 * - marks the document, so a row can say the router never replaced it;
 * - holds the **sibling's** answer back with `page.route` and leaves the other
 *   alone, so which arrives second is a fact about this file rather than about
 *   the machine, the way `133a` builds its own race;
 * - opens the first sibling, goes up to the list by the link the screen draws,
 *   and opens the second — which is what puts two addresses of one shape two
 *   entries apart;
 * - waits for the second read to be **out** before jumping, by identity and
 *   never by a clock: the first measurement of row one jumped while the click
 *   was still being turned into a request, and the answer it then waited for was
 *   never asked for;
 * - jumps two entries in one move, which is what the history list behind the
 *   back button does. `goBack()` would be two moves through the list, and the
 *   list unmounts the screen — the whole reason the sites were said to be
 *   unreachable;
 * - returns once both answers are in, the held one second, and the screen has
 *   had a turn to draw it.
 */
async function heldAnswerLosesTheJump(
  page,
  { anyChild, isFor, intoChild, untilDrawn, upToParent, landed, held },
) {
  await page.evaluate(mark => {
    window.__document = mark;
  }, DOCUMENT);

  await page.route(anyChild, async (route, request) => {
    if (isFor(request.url(), held)) await sleep(HELD_MS);
    await route.continue();
  });

  const first = page.waitForResponse(answer => isFor(answer.url(), landed));
  await intoChild(landed);
  await untilDrawn(await first);

  await upToParent();

  const heldRequested = page.waitForRequest(request => isFor(request.url(), held));
  const heldArrived = page.waitForResponse(answer => isFor(answer.url(), held));
  const landedAgain = page.waitForResponse(answer => isFor(answer.url(), landed));
  await intoChild(held);
  await heldRequested;

  await page.evaluate(() => window.history.go(-2));

  await landedAgain;
  await heldArrived;
  await page.waitForTimeout(SETTLE_MS);
}

/** The link back up, which each of these screens draws in its own words. */
const upLink = (page, name) => page.getByRole('link', { name, exact: true }).first();

const UP_TO_CLOS = 'ผลการเรียนรู้รายวิชา';
const UP_TO_ACTIVITIES = 'กิจกรรมการเรียนรู้ในรายวิชา';
const UP_TO_RUBRICS = 'กลับไปหน้าข้อมูล Rubric กลาง';

const BEHAVIORS_HEADING = 'พฤติกรรมบ่งชี้ของ';
const CRITERIA_HEADING = 'เกณฑ์การบรรลุผลของ';
const EVIDENCE_HEADING = 'หลักฐานการประเมินของ';
const RUBRIC_CRITERIA_HEADING = 'เกณฑ์การให้คะแนนของ Rubric';

const DOCUMENT = 'the one the router has been moving inside';

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

  // The only document load. Every move after it is the router's own, which is
  // what makes the jump a traversal inside one document rather than a reload.
  await openClos(page, sectionId);

  const anyChild = url => BEHAVIORS_API.test(url.pathname);
  const isFor = (url, clo) =>
    new URL(url).pathname ===
    `/api/teaching/sections/${sectionId}/clos/${clo.clo_id}/behaviors`;

  try {
    await heldAnswerLosesTheJump(page, {
      anyChild,
      isFor,
      intoChild: clo =>
        page
          .getByRole('link', { name: `${BEHAVIORS_HEADING} ${clo.clo_number}`, exact: true })
          .click(),
      untilDrawn: response => untilBehaviorsDrawn(page, response),
      upToParent: async () => {
        const back = waitForClos(page);
        await upLink(page, UP_TO_CLOS).click();
        await back;
      },
      landed,
      held,
    });

    // Three clauses in one assertion, so none of them is the one left unreached
    // on the run that proves another: the document was never replaced, the
    // address is the CLO the jump landed on, and the heading — which is drawn
    // from the answer — names that CLO rather than the one left behind.
    expect({
      document: await page.evaluate(() => window.__document),
      address: new URL(page.url()).pathname.match(/courseOutcomes\/(\d+)\/behaviors/)[1],
      heading: (
        await page.getByRole('heading', { name: new RegExp(`^${BEHAVIORS_HEADING} `) }).innerText()
      ).trim(),
    }).toEqual({
      document: DOCUMENT,
      address: String(landed.clo_id),
      heading: `${BEHAVIORS_HEADING} ${landed.clo_number}`,
    });
  } finally {
    await page.unroute(anyChild);
  }
});

test('achievement criteria the back button has left behind do not land on top of the CLO it went to', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [sectionId] = await mySectionIds(page);
  const clos = (await myClos(page, sectionId)).filter(clo => clo.clo_number);

  expect(clos.length).toBeGreaterThan(1);
  const [landed, held] = clos;

  await openClos(page, sectionId);

  const anyChild = url => CRITERIA_API.test(url.pathname);
  const isFor = (url, clo) =>
    new URL(url).pathname ===
    `/api/teaching/sections/${sectionId}/clos/${clo.clo_id}/criteria`;

  try {
    await heldAnswerLosesTheJump(page, {
      anyChild,
      isFor,
      // The CLO card draws the two ways in side by side, and each carries the
      // CLO in its label — which is the only thing that tells the criteria link
      // of one CLO from another's.
      intoChild: clo =>
        page
          .getByRole('link', { name: `${CRITERIA_HEADING} ${clo.clo_number}`, exact: true })
          .click(),
      untilDrawn: response => untilCriteriaDrawn(page, response),
      upToParent: async () => {
        const back = waitForClos(page);
        await upLink(page, UP_TO_CLOS).click();
        await back;
      },
      landed,
      held,
    });

    expect({
      document: await page.evaluate(() => window.__document),
      address: new URL(page.url()).pathname.match(/courseOutcomes\/(\d+)\/criteria/)[1],
      heading: (
        await page.getByRole('heading', { name: new RegExp(`^${CRITERIA_HEADING} `) }).innerText()
      ).trim(),
    }).toEqual({
      document: DOCUMENT,
      address: String(landed.clo_id),
      heading: `${CRITERIA_HEADING} ${landed.clo_number}`,
    });
  } finally {
    await page.unroute(anyChild);
  }
});

test('evidence the back button has left behind does not land on top of the Activity it went to', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [sectionId] = await mySectionIds(page);

  await openActivities(page, sectionId);

  // The two Activities are read off the list's own links rather than from the
  // seed: the id is in the address each link carries and the name is in its
  // label, which is what the screen will draw its heading from.
  const links = page.locator('a[href$="/evidence"]');
  const howMany = await links.count();
  expect(howMany).toBeGreaterThan(1);
  const activities = [];
  for (let index = 0; index < howMany; index += 1) {
    const href = await links.nth(index).getAttribute('href');
    const label = await links.nth(index).getAttribute('aria-label');
    activities.push({
      id: href.match(/learningActivities\/(\d+)\/evidence/)[1],
      name: label.slice(EVIDENCE_HEADING.length).trim(),
    });
  }
  const [landed, held] = activities;

  // The heading is the Activity's **name**, so two Activities sharing one would
  // make the assertion pass whichever answer had been drawn.
  expect(landed.name).not.toBe(held.name);

  const anyChild = url =>
    /^\/api\/teaching\/sections\/\d+\/activities\/\d+\/evidence$/.test(url.pathname);
  const isFor = (url, activity) =>
    new URL(url).pathname ===
    `/api/teaching/sections/${sectionId}/activities/${activity.id}/evidence`;

  try {
    await heldAnswerLosesTheJump(page, {
      anyChild,
      isFor,
      intoChild: activity => evidenceLink(page, activity.name).click(),
      // This screen has no `until…Drawn` helper, because no other row of #35
      // needs one: nothing it asserts is read off a list this screen draws. The
      // settle point is the heading carrying what the answer carried, which is
      // the same clause the other three wait for one level down.
      untilDrawn: async () => {
        await expect(
          page.getByRole('heading', { name: `${EVIDENCE_HEADING} ${landed.name}` }),
        ).toBeVisible();
      },
      upToParent: async () => {
        const back = waitForActivities(page);
        await upLink(page, UP_TO_ACTIVITIES).click();
        await untilActivitiesDrawn(page, await back);
      },
      landed,
      held,
    });

    expect({
      document: await page.evaluate(() => window.__document),
      address: new URL(page.url()).pathname.match(/learningActivities\/(\d+)\/evidence/)[1],
      heading: (
        await page.getByRole('heading', { name: new RegExp(`^${EVIDENCE_HEADING} `) }).innerText()
      ).trim(),
    }).toEqual({
      document: DOCUMENT,
      address: String(landed.id),
      heading: `${EVIDENCE_HEADING} ${landed.name}`,
    });
  } finally {
    await page.unroute(anyChild);
  }
});

test('rubric criteria the back button has left behind do not land on top of the Rubric it went to', async ({
  page,
}) => {
  // The central Rubrics are a committee screen, and `22a` signs this account in
  // for every one of its rows.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);

  // Two Rubrics, read off the table's own rows: the code is the first cell and
  // the id is in the address the criteria link carries.
  const codes = await page.locator('table tbody tr td:first-child').allTextContents();
  expect(codes.length).toBeGreaterThan(1);
  const rubrics = [];
  for (const code of codes.slice(0, 2).map(cell => cell.trim())) {
    const href = await criteriaLink(page, code).getAttribute('href');
    rubrics.push({ code, id: href.match(/rubrics\/(\d+)\/criteria/)[1] });
  }
  const [landed, held] = rubrics;

  const anyChild = url => /^\/api\/rubrics\/\d+\/criteria$/.test(url.pathname);
  const isFor = (url, rubric) => new URL(url).pathname === `/api/rubrics/${rubric.id}/criteria`;

  try {
    await heldAnswerLosesTheJump(page, {
      anyChild,
      isFor,
      intoChild: rubric => criteriaLink(page, rubric.code).click(),
      untilDrawn: response => untilRubricCriteriaDrawn(page, response),
      upToParent: async () => {
        const back = waitForRubrics(page);
        await upLink(page, UP_TO_RUBRICS).click();
        await back;
      },
      landed,
      held,
    });

    expect({
      document: await page.evaluate(() => window.__document),
      address: new URL(page.url()).pathname.match(/rubrics\/(\d+)\/criteria/)[1],
      heading: (
        await page
          .getByRole('heading', { name: new RegExp(`^${RUBRIC_CRITERIA_HEADING} `) })
          .innerText()
      ).trim(),
    }).toEqual({
      document: DOCUMENT,
      address: String(landed.id),
      heading: `${RUBRIC_CRITERIA_HEADING} ${landed.code}`,
    });
  } finally {
    await page.unroute(anyChild);
  }
});

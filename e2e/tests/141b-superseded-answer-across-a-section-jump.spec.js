'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { mySectionIds } = require('../support/enrolment-screen');
const { menu } = require('../support/shell');
const { openAt } = require('../support/navigation');
const {
  DASHBOARD,
  waitForSection,
  waitForSections,
  sectionCard,
} = require('../support/teaching-screen');

/**
 * #141 — the eleven sites whose second address is not in the list.
 *
 * `141a` holds the four sites of this family a browser could already reach, and
 * its own docstring says why the rest could not: the jump needs two addresses
 * of one route shape, the remaining sites take `sectionId` from the address,
 * and `GET /api/teaching/sections` filters the dashboard to the current term —
 * so `teacher.one`'s two Sections (`section_id` 1, 2569/1, and `section_id` 3,
 * 2568/1) draw **one** card, and there is no second address to travel between.
 *
 * **That reason assumed both addresses are produced in the application, and
 * only one of them has to be.** The first can be produced by the address bar:
 * a bookmark, a typed URL, a link in a mail, a reload of a screen left open
 * since last term. `GET /api/teaching/sections/:id` is deliberately *not*
 * term-restricted — it answers for any Section the account teaches, which is
 * what lets a teacher read last year's work at all — so the document load is
 * free to land on 2568 while the dashboard's list still holds only 2569. The
 * sequence is therefore **asymmetric**, and that is the whole of what was
 * missing:
 *
 * ```
 *   entry 0   last year's Section, by its address          ← the only document load
 *   entry 1   up to the dashboard, by the side menu
 *   entry 2   this year's Section, by the card the list draws
 *   entry 3   the same screen for this year's Section       ← its answer held back
 *             history.go(-3)                                ← one move, no commit
 * ```
 *
 * Measured on 5 October 2569 before any row was written: the marker this file
 * writes on `window` survives `history.go(-3)`, so the router never replaced
 * the document and the screen is the same instance that asked for 2569 — which
 * is the precondition every row here needs and the one the family was said not
 * to have. It is the same correction one layer on from `141a`'s: *a ticket that
 * names a race has named a window, not the population of ways in* (#179), and
 * **a conclusion that is right for the wrong reason expires on the wrong day**
 * (#141's own lesson) — the register predicted this would expire when the seed
 * gained a second current-term Section, and it had already expired on a seed
 * nobody touched.
 *
 * ## What each row asserts, and why it is a year
 *
 * Every one of the eleven screens draws the academic year of the Section it is
 * reading, in the one paragraph under its own `<h1>`, out of its own answer —
 * `data.section.academic_year` on eight of them and `data.offering.academic_year`
 * on `CourseOutcomes`, `GradingWeights` and `ContinuousImprovement`, whose grain
 * is the offering (ADR-0003). The address says which Section was **asked for**
 * and that paragraph says which Section was **answered**; a superseded answer
 * makes the two disagree, which is the defect in one sentence, and it is the
 * same assertion `141a` makes with a CLO number.
 *
 * The read is the **year** and not the sentence around it for one reason: the
 * sentence is Thai, and a Thai string retyped into a spec is a string that can
 * be wrong in a way nothing here would notice (the repo has shipped exactly
 * that). Nothing in this file carries a Thai literal — the screens are reached
 * by `href`, which is an identifier, and the paragraph is reached through the
 * only `<h1>` each screen draws. The wording of those sentences is proved by
 * each screen's own rows, which is where that claim belongs.
 *
 * The two years are read from the server and **asserted to differ** before each
 * row builds anything: a row handed a seed where both Sections are of one year
 * would hold nothing and still pass (#129), and *a mutant that substitutes a
 * default is invisible everywhere the real value differs from it* has its twin
 * here — a fixture where the two values agree is invisible to the defect
 * (#154). `section_id` 3 is named as a constant because **nothing in the
 * application lists it**; that is the point of the file, so it cannot be
 * discovered from a screen. What can be measured is measured: that the account
 * can open it, that its year differs, and that the dashboard draws exactly one
 * card.
 *
 * ## What this file does not say
 *
 * - It walks with `history.go`, which is what the history list behind the back
 *   button does, **not the pressing of that list** — that stays a hand-walked
 *   row, as `141a` says of its own four.
 * - The window it builds is a `page.route` held two seconds, not a real
 *   network, so *anything written for timing must not be able to decide
 *   anything* (#52): each row reads the screen once, at a settle point, and
 *   compares three clauses in one `toEqual`.
 * - Eleven sites are eleven copies of one guard, not one guard: each mutant in
 *   `mutation/141-superseded-across-a-section-jump.py` breaks a single page
 *   file, so no row can be killed by another row's mutant, and what each row
 *   adds is that **its own** way in arrives there (#191).
 */

/** Long enough for the Section the jump lands on to be back and drawn first. */
const HELD_MS = 2_000;

/**
 * The render the held answer would cause. There is no settle point behind it —
 * waiting for the right Section to be drawn is the thing under test — so this
 * is the one number in the file that decides anything, and it is held to that
 * by the mutants: with a guard removed the stale draw lands inside it.
 */
const SETTLE_MS = 250;

/** The Section nothing lists, because its term has passed. */
const LAST_YEAR = 3;

/** The subject both Sections teach, which is what makes them one route shape. */
const SUBJECT = '01076105';

const DOCUMENT = 'the one the router has been moving inside';

const sleep = ms => new Promise(done => setTimeout(done, ms));

/**
 * The eleven sites, by the screen each one is, the address it answers at and
 * the read it makes. `api` is the suffix under `/api/teaching/sections/:id`,
 * and it is matched whole: *ask which document asked, by identity and never by
 * a clock* (#160).
 */
const SCREENS = [
  { sheet: '24', page: 'TeacherSection', route: '', api: '' },
  { sheet: '26', page: 'StudentGroups', route: '/studentGroups', api: '/groups' },
  { sheet: '27', page: 'CourseOutcomes', route: '/courseOutcomes', api: '/clos' },
  { sheet: '30', page: 'GradingWeights', route: '/gradingWeights', api: '/weights' },
  { sheet: '31', page: 'TeachingPlan', route: '/teachingPlan', api: '/plan' },
  { sheet: '32', page: 'LearningActivities', route: '/learningActivities', api: '/activities' },
  { sheet: '34', page: 'ActivityScores', route: '/activityScores', api: '/activities' },
  { sheet: '38', page: 'LearningDetails', route: '/learningDetails', api: '/learning-details' },
  {
    sheet: '39',
    page: 'OutcomeActivityMapping',
    route: '/outcomeActivityMapping',
    api: '/outcome-activity-map',
  },
  { sheet: '40', page: 'CloAssessment', route: '/AssessmentCLO', api: '/clo-assessment' },
  { sheet: '41', page: 'ContinuousImprovement', route: '/ContinuousImprove', api: '/improvement-plan' },
];

/**
 * The paragraphs under the screen's own heading.
 *
 * Every one of the eleven draws exactly one `<h1>` and nothing in the shell
 * draws any, measured on 5 October 2569 — so this is the screen's own header
 * and not a locator that is unique by accident of what is on the page today
 * (#93). The year is read out of it rather than matched inside it, so the row
 * can say *which* year was drawn when it disagrees.
 */
const header = page => page.locator('h1').locator('xpath=following-sibling::p');

/** Every Buddhist-era year the screen's header is showing, in the order drawn. */
async function yearsDrawn(page) {
  const paragraphs = await header(page).allInnerTexts();
  return [...paragraphs.join(' ').matchAll(/\b(25\d\d)\b/g)].map(found => found[1]);
}

/** The year the server says a Section is of, asked of the server and not of a screen. */
async function yearOf(page, sectionId) {
  const answer = await page.request.get(`${BACKEND_URL}/api/teaching/sections/${sectionId}`);
  expect(answer.status()).toBe(200);
  return (await answer.json()).section.academic_year;
}

/**
 * The link the side menu draws for an address, which is the control a person
 * presses. It is found by `href` because the breadcrumb draws links of the same
 * name and the same address, and because an `href` is an identifier where a
 * label is a sentence — `shell.js` says the first half of that and #118 the
 * second.
 */
const menuPathLink = (page, path) => menu(page).locator(`a[href="${path}"]`);

/**
 * Up to the dashboard and into the Section its list draws, by the controls the
 * shell gives a person. It stops at the click, so a caller whose held answer
 * *is* the Section's own can wait for its request instead of for its arrival.
 */
async function intoTheListedSection(page) {
  const listed = waitForSections(page);
  await menuPathLink(page, DASHBOARD).click();
  await listed;

  // The card is the claim that this Section is the one the list offers: the
  // term filter is what makes the sequence asymmetric, so a seed that listed
  // both Sections would be a different fixture and should say so here.
  await expect(sectionCard(page, SUBJECT)).toHaveCount(1);
  await sectionCard(page, SUBJECT).click();
}

/**
 * The jump, written once for the eleven rows that differ only in an address.
 *
 * This is an instrument and not an assertion — it ends with the screen in the
 * state a row is about and reads nothing, so every claim stays in the row that
 * called it (#171). What it does, in order: marks the document so a row can say
 * the router never replaced it; holds **this year's** answer back and leaves
 * last year's alone, so which arrives second is a fact about this file rather
 * than about the machine; walks to the second address with the controls a
 * person has; waits for the second read to be **out** before jumping, by
 * identity and never by a clock; jumps the whole distance in one move, which is
 * what the history list does and what `goBack()` could not do without passing
 * through a screen that unmounts this one; and returns once both answers are
 * in, the held one second, with a turn for the renderer.
 */
async function heldSectionAnswerLosesTheJump(page, { screen, landed, held }) {
  const api = sectionId => `/api/teaching/sections/${sectionId}${screen.api}`;
  const isFor = (url, sectionId) => new URL(url).pathname === api(sectionId);
  const isRead = answer => answer.request().method() === 'GET';
  const eitherSection = url => url.pathname === api(landed) || url.pathname === api(held);

  await page.evaluate(mark => {
    window.__document = mark;
  }, DOCUMENT);

  await page.route(eitherSection, async (route, request) => {
    if (isFor(request.url(), held)) await sleep(HELD_MS);
    await route.continue();
  });

  const heldRequested = page.waitForRequest(
    request => isFor(request.url(), held) && request.method() === 'GET',
  );
  const heldArrived = page.waitForResponse(answer => isFor(answer.url(), held) && isRead(answer));
  const landedAgain = page.waitForResponse(answer => isFor(answer.url(), landed) && isRead(answer));

  // The Section screen's own row is the one case where the held answer is the
  // card's own, so the walk cannot wait for it to arrive; every other screen is
  // one menu press further on, from a Section screen that has to be drawn first.
  if (screen.route === '') {
    await intoTheListedSection(page);
  } else {
    const section = waitForSection(page);
    await intoTheListedSection(page);
    await section;
    await menuPathLink(page, `${DASHBOARD}/${held}${screen.route}`).click();
  }
  await heldRequested;

  await page.evaluate(distance => window.history.go(distance), screen.route === '' ? -2 : -3);

  await landedAgain;
  await heldArrived;
  await page.waitForTimeout(SETTLE_MS);

  return eitherSection;
}

for (const screen of SCREENS) {
  test(`${screen.page}: last year's answer is not redrawn by the Section the jump left behind`, async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);

    const [listed] = await mySectionIds(page);

    const landedYear = await yearOf(page, LAST_YEAR);
    const heldYear = await yearOf(page, listed);

    // The precondition, asserted where it is used: the two Sections are of
    // different years, or the row's read cannot tell one answer from the other.
    expect(landedYear).not.toEqual(heldYear);

    const address = `${DASHBOARD}/${LAST_YEAR}${screen.route}`;
    const firstRead = page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === `/api/teaching/sections/${LAST_YEAR}${screen.api}` &&
        answer.request().method() === 'GET',
    );
    await openAt(page, address, () => firstRead);

    // The settle point: what the answer carried is what the screen shows (#132).
    await expect(header(page).filter({ hasText: landedYear })).toHaveCount(1);

    let unroute;
    try {
      unroute = await heldSectionAnswerLosesTheJump(page, {
        screen,
        landed: LAST_YEAR,
        held: listed,
      });

      // Three clauses in one assertion, so none of them is the one left
      // unreached on the run that proves another: the document was never
      // replaced, the address is the Section the jump landed on, and the year
      // in the screen's own header — which is drawn from the answer — is that
      // Section's year rather than the one left behind.
      expect({
        document: await page.evaluate(() => window.__document),
        address: new URL(page.url()).pathname,
        years: await yearsDrawn(page),
      }).toEqual({
        document: DOCUMENT,
        address,
        years: [landedYear],
      });
    } finally {
      if (unroute) await page.unroute(unroute);
    }
  });
}

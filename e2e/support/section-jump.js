'use strict';

const { expect } = require('@playwright/test');

const { menu } = require('./shell');
const {
  DASHBOARD,
  waitForSection,
  waitForSections,
  sectionCard,
} = require('./teaching-screen');

/**
 * Two addresses of one route shape, inside one document — #141's walk, shared.
 *
 * `GET /api/teaching/sections` filters the dashboard to the current term, so
 * `teacher.one`'s two Sections (`section_id` 1, 2569/1, and `section_id` 3,
 * 2568/1) draw **one** card and the application lists no second address. Only
 * one of the two has to come from the application: the first can come from the
 * address bar — a bookmark, a typed URL, a link in a mail, a reload of a screen
 * left open since last term — and `GET /api/teaching/sections/:id` is
 * deliberately not term-restricted, so a document load is free to land on 2568
 * while the dashboard's list holds only 2569. The sequence is therefore
 * asymmetric, which is the whole of what `141a` had thought impossible:
 *
 * ```
 *   entry 0   last year's Section, by its address          ← the only document load
 *   entry 1   up to the dashboard, by the side menu
 *   entry 2   this year's Section, by the card the list draws
 *   entry 3   a screen of this year's Section
 *             history.go(-3)                                ← one move, no commit
 * ```
 *
 * `141b` measured on 5 October 2569 that the marker written on `window` survives
 * that move, so the router never replaced the document and the screen is the
 * same instance that asked for 2569. Every row that jumps asserts the marker,
 * because that is the precondition the whole family rests on.
 *
 * This file is the walk and nothing else: it ends with the screen in the state a
 * row is about and reads nothing, so every claim stays in the row that called it
 * (#171). `141b` holds the eleven superseded-answer rows and `202a` the two
 * sentence rows of the enrolment screen, whose own pager stopped being a way in
 * when #199 closed it on 15 October 2569.
 */

/** The Section nothing lists, because its term has passed. */
const LAST_YEAR = 3;

/** The subject both Sections teach, which is what makes them one route shape. */
const SUBJECT = '01076105';

/** What a row reads back off `window` to say the document was never replaced. */
const DOCUMENT = 'the one the router has been moving inside';

/**
 * The link the side menu draws for an address, which is the control a person
 * presses. It is found by `href` because the breadcrumb draws links of the same
 * name and the same address, and because an `href` is an identifier where a
 * label is a sentence — `shell.js` says the first half of that and #118 the
 * second.
 */
const menuPathLink = (page, path) => menu(page).locator(`a[href="${path}"]`);

/** Marks the document, for the clause every jumping row asserts. */
const markDocument = page =>
  page.evaluate(mark => {
    window.__document = mark;
  }, DOCUMENT);

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
 * The same walk, to a screen one menu press beyond the Section screen, and
 * waiting for each step: for a caller that holds nothing until it has arrived.
 *
 * `route` is the suffix under `${DASHBOARD}/:sectionId`, `wait` the screen's own
 * waiter. It hands back the response the screen was drawn from, so the caller
 * can settle on what the answer carried (#132).
 */
async function intoTheListedSectionScreen(page, sectionId, route, wait) {
  const section = waitForSection(page);
  await intoTheListedSection(page);
  await section;

  const drawn = wait(page);
  await menuPathLink(page, `${DASHBOARD}/${sectionId}${route}`).click();
  return drawn;
}

module.exports = {
  LAST_YEAR,
  SUBJECT,
  DOCUMENT,
  menuPathLink,
  markDocument,
  intoTheListedSection,
  intoTheListedSectionScreen,
};

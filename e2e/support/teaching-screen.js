'use strict';

const { expect } = require('@playwright/test');

const { openAt } = require('./navigation');

/**
 * รายวิชาที่สอน and the ตอนเรียน behind it — #24, as a browser reaches it.
 *
 * One thing here is unlike every screen before it: the address carries the
 * context. `/teacher/teacherDashboard` is the list, and
 * `/teacher/teacherDashboard/<section_id>` is one ตอนเรียน open — ADR-0004, and
 * the reason a reload keeps the Section is that it never left the URL.
 *
 * So the helpers below take a section id rather than a name. A name would not
 * be enough to find one: the seed teaches the same subject in two academic
 * years, so `OBJECT ORIENTED PROGRAMMING` ตอนเรียน 1 is two different Sections
 * and the id is the only thing that separates them. That is the argument
 * ADR-0004 makes, stated once more here because a helper written the other way
 * would look reasonable.
 */

const DASHBOARD = '/teacher/teacherDashboard';
const API = '/api/teaching/sections';

/** The dashboard's list call, whatever the answer turns out to be. */
const isSections = answer =>
  new URL(answer.url()).pathname === API && answer.request().method() === 'GET';

/** One Section being read back - the context resolving itself. */
const isSection = answer =>
  /^\/api\/teaching\/sections\/[^/]+$/.test(new URL(answer.url()).pathname) &&
  answer.request().method() === 'GET';

/**
 * The two reads, as waits.
 *
 * Each is used twice: handed to `openAt` below, which is where #160 wanted
 * them, and held across a press by a row that causes a reload. A press replaces
 * no document, so nothing there can lose #160's race; the eager body read that
 * used to live here is gone with that ticket, because `navigation.js` closes the
 * window rather than narrowing it and this was the only caller that had one.
 */
const waitForSections = page => page.waitForResponse(isSections);
const waitForSection = page => page.waitForResponse(isSection);

/** Opens the dashboard and hands back the list a passing row is about to read. */
const openDashboard = page => openAt(page, DASHBOARD, waitForSections);

/**
 * Goes straight to one Section's address, the way a reload or a pasted link
 * does — which is the only way the sixth criterion can be tried at all, since
 * a Section that is not the caller's is on nobody's dashboard to be clicked.
 */
const openSection = (page, sectionId) =>
  openAt(page, `${DASHBOARD}/${sectionId}`, waitForSection);

/**
 * One card on the dashboard, found by the subject code it carries.
 *
 * The card is a button, so it is found as one: a text match would also find the
 * heading of the Section screen once it is open, and a row helper that matched
 * two different pages would pass on the wrong one.
 */
const sectionCard = (page, subjectCode) =>
  page.getByRole('button').filter({ hasText: subjectCode });

/** Chooses a ตอนเรียน the way a person does, and waits for the context to resolve. */
async function chooseSection(page, subjectCode) {
  const [response] = await Promise.all([
    waitForSection(page),
    sectionCard(page, subjectCode).click(),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

/** The section id the address is currently carrying, or null on the dashboard. */
const sectionInUrl = page =>
  new URL(page.url()).pathname.match(/^\/teacher\/teacherDashboard\/(\d+)/)?.[1] ?? null;

module.exports = {
  DASHBOARD,
  API,
  waitForSections,
  waitForSection,
  openDashboard,
  openSection,
  sectionCard,
  chooseSection,
  sectionInUrl,
};

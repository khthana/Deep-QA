'use strict';

const { expect } = require('@playwright/test');

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

/** Waits for the dashboard's list call, whatever the answer turns out to be. */
/**
 * The body is pulled in as soon as the response lands, and thrown away.
 *
 * Chromium keeps a response body only until the page navigates away from it,
 * and a caller that reads `.json()` a few statements later is racing whatever
 * the screen does next — `27a` row 1 lost that race twice, with *Response body
 * is not available for a response that was navigated away from*. Playwright
 * caches the body once it has been read, so reading it here and discarding it
 * makes every later `.json()` on the same response a lookup rather than a
 * round trip. The `catch` is there because a body that is already gone is the
 * caller's problem to report, not this helper's.
 */
function waitForSections(page) {
  return page
    .waitForResponse(
      answer => new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
    )
    .then(async answer => {
      await answer.body().catch(() => {});
      return answer;
    });
}

/** Waits for one Section being read back — the context resolving itself. */
function waitForSection(page) {
  return page.waitForResponse(
    answer =>
      /^\/api\/teaching\/sections\/[^/]+$/.test(new URL(answer.url()).pathname) &&
      answer.request().method() === 'GET',
  );
}

/** Opens the dashboard and hands back the list a passing row is about to read. */
async function openDashboard(page) {
  const [response] = await Promise.all([waitForSections(page), page.goto(DASHBOARD)]);
  return response;
}

/**
 * Goes straight to one Section's address, the way a reload or a pasted link
 * does — which is the only way the sixth criterion can be tried at all, since
 * a Section that is not the caller's is on nobody's dashboard to be clicked.
 */
async function openSection(page, sectionId) {
  const [response] = await Promise.all([
    waitForSection(page),
    page.goto(`${DASHBOARD}/${sectionId}`),
  ]);
  return response;
}

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

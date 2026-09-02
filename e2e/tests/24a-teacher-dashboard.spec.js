'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { currentTerm } = require('../../db/term');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { breadcrumb, menuLink, switchTo } = require('../support/shell');
const {
  DASHBOARD,
  openDashboard,
  openSection,
  chooseSection,
  sectionCard,
  sectionInUrl,
} = require('../support/teaching-screen');

/**
 * docs/acceptance/24-teacher-dashboard.md — the half a browser can prove.
 *
 * The backend suite proves the same rules at the routes. What is here is what
 * only a browser shows: that the ตอนเรียน a person chose is in the address and
 * survives a reload, that a Section belonging to somebody else is refused on
 * the screen and not merely at the route, and that the account holding two
 * grants has to put the teaching one on before any of it is reachable.
 *
 * What is deliberately *not* here is the menu. "The Section-specific entries
 * appear once a Section is chosen" and "they are absent before" are assertions
 * about menu contents, which CLAUDE.md keeps as hand-walked rows: they are
 * about what a person reads down the left-hand side, and a spec asserting them
 * would be asserting the wording of thirteen labels. The address changing is
 * the behaviour underneath, and that is what these rows assert.
 *
 * ## Where the ids come from
 *
 * From the API, not from the database and not written down. A section id is a
 * surrogate that the seed does not promise the value of, and a row that spelled
 * one out would be a row that broke the first time the seed inserted in another
 * order. The teacher who owns a Section is asked for their own list; the
 * teacher who does not is then sent to it.
 */

const SUBJECT = '01076105';

/** The three ภาคการศึกษา as the screen writes them. Spelled out on purpose: */
/* the frontend's own copy is an ES module this suite cannot require, and the
 * words are what the row is about. A shared constant would make this assert
 * that two files agree rather than that the screen says the right thing. */
const SEMESTER_NAMES = ['ภาคต้น', 'ภาคปลาย', 'ภาคฤดูร้อน'];

const termLabel = () => {
  const term = currentTerm();
  return `${SEMESTER_NAMES[term.semester - 1]} ปีการศึกษา ${term.academicYear}`;
};

/** The section ids this account teaches this term, straight off its own dashboard. */
async function mySectionIds(page) {
  const answer = await openDashboard(page);
  expect(answer.status()).toBe(200);
  const { sections } = await answer.json();
  return sections.map(section => section.section_id);
}

test('row 1: the dashboard is this term, and only the sections of this term', async ({ page }) => {
  // teacher.one@ teaches one ตอนเรียน this term and one in the year before, so
  // a screen that ignored the term would show two cards rather than one.
  await signIn(page, ACCOUNTS.teacherOne);
  const answer = await openDashboard(page);

  expect(answer.status()).toBe(200);
  const { sections, term } = await answer.json();
  expect(sections).toHaveLength(1);
  expect(term).toEqual(currentTerm());

  await expect(sectionCard(page, SUBJECT)).toHaveCount(1);
  await expect(page.getByText(termLabel())).toBeVisible();
});

test('row 2: a teacher assigned to nothing is told which term was looked in', async ({ page }) => {
  // Not an error and not an empty page. The sentence has to name the term,
  // because "you have no sections" and "you have no sections in ภาคต้น 2569"
  // are different pieces of news to somebody who taught two last term.
  await signIn(page, ACCOUNTS.teacherTwo);
  const answer = await openDashboard(page);

  expect(answer.status()).toBe(200);
  expect((await answer.json()).sections).toEqual([]);

  await expect(page.getByText(new RegExp(`ยังไม่มีตอนเรียน.*${termLabel()}`))).toBeVisible();
  await expect(sectionCard(page, SUBJECT)).toHaveCount(0);
});

test('row 3: choosing a section puts its id in the address', async ({ page }) => {
  // The whole of the context mechanism, asserted where it lives. Nothing is
  // written down anywhere: what changes is the URL.
  await signIn(page, ACCOUNTS.teacherOne);
  await openDashboard(page);
  expect(sectionInUrl(page)).toBeNull();

  await chooseSection(page, SUBJECT);

  expect(sectionInUrl(page)).toMatch(/^\d+$/);
  await expect(page.getByText(`ตอนเรียน 1`, { exact: false })).toBeVisible();
});

test('row 3: a section-specific menu entry leads to that section and not to a placeholder', async ({
  page,
}) => {
  // The substitution itself, which is criterion 3's mechanism and the one line
  // ADR-0004 replaced outright. Each entry's path carries a token that the
  // sidebar swaps for the id in the address; a token that was never swapped
  // would navigate to a path containing the token itself, which routes to
  // NotBuiltYet - indistinguishable, on the screen, from a screen that has
  // genuinely not been built. So the address is what this reads.
  //
  // Which entries are in the menu is a different question and a hand-walked
  // one. This row asserts where one of them points, not which of them exist.
  await signIn(page, ACCOUNTS.teacherOne);
  await openDashboard(page);
  await chooseSection(page, SUBJECT);
  const chosen = sectionInUrl(page);

  await menuLink(page, 'รายชื่อนักศึกษาของรายวิชา').click();
  await page.waitForURL(`${DASHBOARD}/${chosen}/subjectStudents`);

  // Wait for the breadcrumb before asking about the menu, so this row always
  // runs in the state it used to fail in. It named the screen with a link of
  // its own all along; the assertion below simply used to get in first, about
  // two runs in three, and read one match where there were about to be two.
  await expect(breadcrumb(page)).toContainText('รายชื่อนักศึกษาของรายวิชา');

  // And the group stays open behind them: the sidebar reads the section out of
  // a path that now has a screen name after it, so the row that keeps the menu
  // in place is the same match that put it there.
  //
  // Asked of the menu by name rather than of the page, because the page has two
  // navigations and both hold this link — which is what #109 turned out to be.
  await expect(menuLink(page, 'รายชื่อนักศึกษาของรายวิชา')).toBeVisible();
});

test('row 5: the chosen section survives a reload, without being remembered', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await openDashboard(page);
  await chooseSection(page, SUBJECT);
  const chosen = sectionInUrl(page);

  await page.reload();
  await page.waitForLoadState('networkidle');

  // The same Section, and it is the address that carried it there. Storage is
  // asserted empty rather than left unmentioned: the inherited shell kept
  // `selectedCourse` and `section` in localStorage, ADR-0004 retired both, and
  // a reload passing while a stale copy quietly survived would be this row
  // passing for the reason it was written to rule out.
  expect(sectionInUrl(page)).toBe(chosen);
  await expect(page.getByText(SUBJECT)).toBeVisible();
  expect(
    await page.evaluate(() => [
      localStorage.getItem('selectedCourse'),
      localStorage.getItem('section'),
    ]),
  ).toEqual([null, null]);
});

test('row 6: a section that is somebody else\'s is refused on the screen', async ({
  page,
  browser,
}) => {
  // The id is real, the Section is real, and it is not theirs. teacher.two@
  // teaches nothing at all, so every Section in the system is one of these -
  // which is what makes this row about the teaching register rather than about
  // the department the two of them share.
  //
  // The owner is asked in a context of their own and not in a second page of
  // this one. A cookie belongs to a browser profile rather than to a tab, so
  // two pages of one context are one signed-in person: signing in as the owner
  // there would sign this page in as the owner too, and the row would be
  // teacher.one@ being shown their own Section. #94 is where that cost a
  // hand-walk; here it would have cost the assertion.
  const elsewhere = await browser.newContext();
  const owner = await elsewhere.newPage();
  await signIn(owner, ACCOUNTS.teacherOne);
  const [theirs] = await mySectionIds(owner);
  await elsewhere.close();

  await signIn(page, ACCOUNTS.teacherTwo);
  const answer = await openSection(page, theirs);

  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound)).toBeVisible();

  // And a way back to the ones that are theirs, which is the whole of what the
  // person can usefully do from here.
  await page.getByRole('button', { name: 'กลับไปที่รายวิชาที่สอน' }).click();
  await page.waitForURL(url => url.pathname === DASHBOARD);
});

test('row 7: the account holding two grants has to be wearing the teaching one', async ({
  page,
}) => {
  // multi.role@ holds กรรมการหลักสูตร and อาจารย์ผู้สอน, and the shell starts in
  // the senior of the two. The dashboard is not open to it - which is what
  // makes switching worth anything, and is the same rule as #23 row 9 rather
  // than an exception to it: there the screen wanted the senior grant and this
  // account was already in it.
  await signIn(page, ACCOUNTS.multiRole);
  const refused = await openDashboard(page);
  expect(refused.status()).toBe(403);
  await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();

  const switched = await switchTo(page, 'อาจารย์ผู้สอน');
  expect(switched.status()).toBe(200);

  const listed = await openDashboard(page);
  expect(listed.status()).toBe(200);
  expect((await listed.json()).sections).toHaveLength(1);
  await expect(sectionCard(page, SUBJECT)).toHaveCount(1);
});

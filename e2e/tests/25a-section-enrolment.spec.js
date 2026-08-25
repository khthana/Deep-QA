'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { BACKEND_URL } = require('../support/env');
const { signIn } = require('../support/auth');
const { switchTo } = require('../support/shell');
const {
  downloadTemplate,
  headerOf,
  csv,
  importCsv,
  reportedLines,
  reportedReason,
} = require('../support/import-panel');
const { keysOn, reading, step } = require('../support/pager');
const {
  IMPORT,
  path,
  waitForList,
  openEnrolment,
  mySectionIds,
  listTable,
  SPARE_CODES,
  UNKNOWN_CODE,
  enrol,
  removeStudent,
} = require('../support/enrolment-screen');

/**
 * docs/acceptance/25-section-enrolment.md — the half a browser can prove.
 *
 * The backend suite proves the nine criteria at the routes, and for the rules
 * themselves that is the stronger seam: whether a code is in the register is a
 * fact about a row. What is here is the part that is only true if a person
 * sitting in front of the screen would find it true — that the refusal naming
 * the register reaches the page rather than being swallowed, that cancelling
 * the confirmation removes nobody, that the template arrives on the disk under
 * a name and a header the import will accept, and that a Section typed into the
 * address bar is refused by the server and not merely absent from a menu.
 *
 * ## Every row puts back what it took
 *
 * This suite shares one schema across every spec, and four rows below write
 * enrolments. The cleaning up is an `afterEach` and not a last line in each
 * row, which is the difference between tidy and correct: the first draft ended
 * each row with the removal, row 7 failed one assertion before reaching it, and
 * row 8 then read three enrolments it had not made and reported a line it was
 * not testing. A row that fails has to leave the schema as it found it, and the
 * only place that can be promised is outside the row.
 *
 * It cleans up through the API rather than through the screen: clicking would
 * assert the removal path a second time, and would fail for its own reasons.
 *
 * ## What is deliberately not here
 *
 * The wording of the empty state, the heading, and the sentence under it are
 * appearance and stay hand-walked. So does the menu entry that leads here: 24a
 * row 3 already asserts that a Section-specific entry carries the id rather
 * than the token, and it is `รายชื่อนักศึกษาของรายวิชา` it asserts it with.
 */

const SUBJECT = '01076105';

/**
 * Whatever a row enrolled, gone again — pass or fail.
 *
 * Signed in over the API with its own request context, so it is unaffected by
 * whatever state the page was left in. Every status is accepted: 204 for a code
 * the row enrolled, 404 for one it removed itself or never added.
 */
test.afterEach(async ({ request }) => {
  const signedIn = await request.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.teacherOne, password: PASSWORD },
  });
  expect(signedIn.status()).toBe(200);
  const mine = await request.get(`${BACKEND_URL}/api/teaching/sections`);
  const { sections } = await mine.json();
  for (const section of sections) {
    for (const code of SPARE_CODES) {
      await request.delete(
        `${BACKEND_URL}/api/teaching/sections/${section.section_id}/students/${code}`,
      );
    }
  }
});

/** teacher.one@ and their ตอนเรียน of the current term, where every row starts. */
async function asTeacherOne(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  return section;
}

/** multi.role@ with the teaching hat on, and their ตอนเรียน of the same Offering. */
async function asMultiRole(page) {
  await signIn(page, ACCOUNTS.multiRole);
  expect((await switchTo(page, 'อาจารย์ผู้สอน')).status()).toBe(200);
  const [section] = await mySectionIds(page);
  return section;
}

test('row 1: the class list opens under a ตอนเรียน and pages ten at a time', async ({ page }) => {
  const section = await asTeacherOne(page);
  const answer = await openEnrolment(page, section);
  expect(answer.status()).toBe(200);

  const table = listTable(page);
  const first = await reading(page, table);
  expect(first.shown).toBe(1);
  expect(first.pages).toBeGreaterThan(1);

  const onFirst = await keysOn(table);
  expect(onFirst).toHaveLength(10);

  expect((await step(page, 'forward', waitForList)).status()).toBe(200);
  const onSecond = await keysOn(table);
  expect(onSecond).toHaveLength(10);
  // A different set of people, which is what paging means. Two pages drawn
  // from one query with the offset left off would be the same ten.
  expect(onSecond.filter(code => onFirst.includes(code))).toEqual([]);
});

test('row 1: the total the pager reads out is the whole class, not the page', async ({ page }) => {
  const section = await asTeacherOne(page);
  await openEnrolment(page, section);

  const { total } = await reading(page, listTable(page));
  // The seed alternates 113 students across two ตอนเรียน, so neither is ten
  // and neither is 113. A screen counting its own rows would say 10.
  expect(total).toBeGreaterThan(10);
  expect(total).toBeLessThan(113);
  await expect(page.getByText(`นักศึกษา ${total} คน`)).toBeVisible();
});

test('row 2: a Teacher enrols a student by code and they appear in the list', async ({ page }) => {
  const section = await asTeacherOne(page);
  await openEnrolment(page, section);
  const [code] = SPARE_CODES;

  const { total: before } = await reading(page, listTable(page));
  expect((await enrol(page, code)).status()).toBe(201);

  await expect(page.getByText(new RegExp(`เพิ่ม ${code} .* เข้าตอนเรียนแล้ว`))).toBeVisible();
  const { total: after } = await reading(page, listTable(page));
  expect(after).toBe(before + 1);

  // On the screen, not only in the count. The list is sorted by code and the
  // prior-year cohort sorts first, so the new row is on page 1.
  expect(await keysOn(listTable(page))).toContain(code);
});

test('row 3: a code the register does not hold is refused, naming the register', async ({
  page,
}) => {
  const section = await asTeacherOne(page);
  await openEnrolment(page, section);
  const { total: before } = await reading(page, listTable(page));

  expect((await enrol(page, UNKNOWN_CODE)).status()).toBe(404);
  // The server's own sentence, unreworded. It is the one that says where to go
  // and add them, and a screen that softened it into "not found" would leave
  // the person with nowhere to go.
  await expect(page.getByText(REFUSALS.studentNotInRegister)).toBeVisible();

  const { total: after } = await reading(page, listTable(page));
  expect(after).toBe(before);
});

test('row 4: enrolling the same student twice is refused rather than duplicated', async ({
  page,
}) => {
  const section = await asTeacherOne(page);
  await openEnrolment(page, section);
  const [code] = SPARE_CODES;

  expect((await enrol(page, code)).status()).toBe(201);
  const { total: after } = await reading(page, listTable(page));

  expect((await enrol(page, code)).status()).toBe(409);
  await expect(page.getByText(REFUSALS.duplicateEnrolment)).toBeVisible();
  expect(await reading(page, listTable(page))).toMatchObject({ total: after });
});

test('row 5: the confirmation decides it — cancelling removes nobody', async ({ page }) => {
  const section = await asTeacherOne(page);
  await openEnrolment(page, section);
  const [code] = SPARE_CODES;
  expect((await enrol(page, code)).status()).toBe(201);
  const { total: enrolled } = await reading(page, listTable(page));

  const sentWhileCancelling = await removeStudent(page, code, { confirm: false });
  expect(sentWhileCancelling).toEqual([]);
  expect(await keysOn(listTable(page))).toContain(code);

  expect((await removeStudent(page, code)).status()).toBe(204);
  const { total: after } = await reading(page, listTable(page));
  expect(after).toBe(enrolled - 1);
  expect(await keysOn(listTable(page))).not.toContain(code);
});

test('row 5: removing somebody who already has marks is refused on the screen', async ({
  page,
}) => {
  // Not one of #25's nine. Nothing in the schema references `student_course`,
  // so the DELETE would succeed and strand the marks; the guard is the server's
  // and this row is that the person is told rather than left with a row that
  // silently came back on the next load.
  const section = await asTeacherOne(page);
  await openEnrolment(page, section);
  const table = listTable(page);
  const { total: before } = await reading(page, table);
  const [marked] = await keysOn(table);

  expect((await removeStudent(page, marked)).status()).toBe(409);
  await expect(page.getByText(REFUSALS.enrolmentHasScores)).toBeVisible();
  expect(await reading(page, table)).toMatchObject({ total: before });
  expect(await keysOn(table)).toContain(marked);
});

test('row 6: the import template downloads from the screen', async ({ page }) => {
  const section = await asTeacherOne(page);
  await openEnrolment(page, section);

  const template = await downloadTemplate(page);
  expect(template.name).toBe('section-students-template.csv');
  // One column, because one is all an enrolment is. A template carrying the
  // register's four would invite somebody to fill in a name here.
  expect(headerOf(template)).toBe('student_id');
});

test('row 7: a valid spreadsheet enrols every student listed in it', async ({ page }) => {
  const section = await asTeacherOne(page);
  await openEnrolment(page, section);
  const { total: before } = await reading(page, listTable(page));

  const template = await downloadTemplate(page);
  const sent = await importCsv(page, {
    path: IMPORT(section),
    text: csv(headerOf(template), ...SPARE_CODES),
    name: 'section-students.csv',
  });
  expect(sent.status()).toBe(201);
  await expect(page.getByText(`นำเข้าสำเร็จ ${SPARE_CODES.length} รายการ`)).toBeVisible();

  const { total: after } = await reading(page, listTable(page));
  expect(after).toBe(before + SPARE_CODES.length);
});

test('row 8: a spreadsheet with an unknown code reports that row and applies nothing', async ({
  page,
}) => {
  const section = await asTeacherOne(page);
  await openEnrolment(page, section);
  const { total: before } = await reading(page, listTable(page));

  const template = await downloadTemplate(page);
  const sent = await importCsv(page, {
    path: IMPORT(section),
    // The good row is *first*, so "applies nothing" is the whole assertion: a
    // route that wrote as it went would have committed line 2 before it read
    // line 3, and the count below would be one higher.
    text: csv(headerOf(template), SPARE_CODES[0], UNKNOWN_CODE),
    name: 'section-students.csv',
  });
  expect(sent.status()).toBe(400);

  expect(await reportedLines(page)).toEqual([3]);
  await expect(reportedReason(page, 3)).toHaveText(REFUSALS.studentNotInRegister);

  const { total: after } = await reading(page, listTable(page));
  expect(after).toBe(before);
  expect(await keysOn(listTable(page))).not.toContain(SPARE_CODES[0]);
});

test('row 9: a ตอนเรียน this account does not teach is refused, at the server', async ({
  browser,
}) => {
  // Two contexts, because a cookie belongs to a browser profile rather than to
  // a tab — 24a row 6, and #94 is where that cost a hand-walk. The address is
  // learned as multi.role@ and then typed in as teacher.one@, which is the only
  // way this can be tried: somebody else's ตอนเรียน is on nobody's dashboard.
  const theirContext = await browser.newContext();
  const theirPage = await theirContext.newPage();
  const theirs = await asMultiRole(theirPage);
  await theirContext.close();

  const myContext = await browser.newContext();
  const myPage = await myContext.newPage();
  await signIn(myPage, ACCOUNTS.teacherOne);

  const [answer] = await Promise.all([waitForList(myPage), myPage.goto(path(theirs))]);
  expect(answer.status()).toBe(404);
  await expect(myPage.getByText(REFUSALS.sectionNotFound)).toBeVisible();
  // And no class list behind the banner: a screen that drew the table from a
  // stale state would show somebody else's students under their own refusal.
  await expect(listTable(myPage)).toHaveCount(0);

  await myContext.close();
});

test('row 9: the subject the two ตอนเรียน share does not make them one class list', async ({
  browser,
}) => {
  // The Section is the grain, and this is where that is visible rather than
  // argued: #27's CLOs are one set across both ตอนเรียน of this Offering, and
  // the class lists are two. A route that resolved the Offering the way
  // `clos.js` does would put all 113 on both screens.
  const mine = await browser.newContext();
  const minePage = await mine.newPage();
  const mySection = await asTeacherOne(minePage);
  await openEnrolment(minePage, mySection);
  const myCodes = await keysOn(listTable(minePage));

  const theirs = await browser.newContext();
  const theirPage = await theirs.newPage();
  const theirSection = await asMultiRole(theirPage);
  await openEnrolment(theirPage, theirSection);
  const theirCodes = await keysOn(listTable(theirPage));

  expect(theirSection).not.toBe(mySection);
  expect(theirCodes.filter(code => myCodes.includes(code))).toEqual([]);
  // Same รายวิชา, so this is not two unrelated screens agreeing by accident.
  await expect(minePage.getByText(SUBJECT, { exact: false }).first()).toBeVisible();

  await mine.close();
  await theirs.close();
});

'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { planWeeksFor } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { switchTo } = require('../support/shell');
const { DASHBOARD } = require('../support/teaching-screen');
const {
  openPlan,
  waitForPlan,
  mySectionIds,
  cardLabel,
  weekCard,
  headingsOnScreen,
  numbersOnScreen,
  submitWeek,
  removeWeek,
} = require('../support/plan-screen');

/**
 * docs/acceptance/31-teaching-plan.md — the half a browser can prove.
 *
 * The backend suite proves the grain, the shape checks and the delete guard
 * at the routes. What is here is what is only true in front of the screen:
 * that the menu entry lands on this Section's plan drawn in calendar order,
 * that two ตอนเรียน of one Offering read two plans and an edit in one never
 * reaches the other, that added topics land where the calendar puts them and
 * a removal takes only itself, that cancelling removes nothing, and that the
 * server's refusals — the in-use guard and the shape check — reach the page
 * in their own words.
 *
 * ## What is deliberately not here
 *
 * The menu entry's wording, the grain sentence under the heading, and the
 * dialog's sentence are appearance and stay hand-walked. The seed bakes the
 * section number and the year into every title (`composePlanWeek`), so the
 * grain rows read the screen rather than trusting the address.
 *
 * ## Which weeks the rows touch
 *
 * Week 1 carries the seeded Activity reference and is only ever read, refused
 * or cancelled at. Rows that write use week 3 (edited and restored) or weeks
 * of their own making, so the seeded plan is exactly as seeded whichever
 * order the rows run in.
 */

/** teacher.one@ teaching ตอนเรียน 1 of the current term. */
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

/** The plan the seed wrote for the Section an answer names, as card labels. */
const seededLabels = section =>
  planWeeksFor(section.section_number, section.academic_year).map(cardLabel);

test('row 1: the menu entry lands on this section\'s plan, drawn in calendar order', async ({
  page,
}) => {
  // The way in is the sidebar's entry; its wording is the walk's, its address
  // is behaviour. The seeded three weeks come back in week order, and the
  // prose rows are drawn only where the seed wrote prose: week 1 has both,
  // week 3 has neither.
  const section = await asTeacherOne(page);
  await page.goto(`${DASHBOARD}/${section}`);
  const [answer] = await Promise.all([
    waitForPlan(page),
    page.getByRole('link', { name: 'แผนการสอน' }).click(),
  ]);

  expect(answer.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(`${DASHBOARD}/${section}/teachingPlan`);

  const mine = await answer.json();
  const weeks = planWeeksFor(mine.section.section_number, mine.section.academic_year);
  expect(await headingsOnScreen(page)).toEqual(seededLabels(mine.section));

  await expect(weekCard(page, weeks[0]).getByText(weeks[0].description)).toBeVisible();
  await expect(weekCard(page, weeks[0]).getByText(weeks[0].remark)).toBeVisible();
  // By element, not by text: week 3's own title happens to end in the word
  // รายละเอียด, so the honest assert is "no prose list at all".
  await expect(weekCard(page, weeks[2]).locator('dl')).toHaveCount(0);
});

test('row 2: two sections of one offering hold two plans, and an edit stays in its own', async ({
  page,
  browser,
}) => {
  // The ticket's own line, on two screens belonging to two people — the exact
  // opposite of 28a row 3. The titles carry the section number, so "different
  // plan" is read off the cards; then a real edit goes in through ตอนเรียน 1
  // and ตอนเรียน 2 is read again to see it did NOT arrive.
  const mine = await asTeacherOne(page);
  const answered = await (await openPlan(page, mine)).json();
  expect(await headingsOnScreen(page)).toEqual(seededLabels(answered.section));

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  expect(theirSection).not.toBe(mine);
  const theirAnswer = await (await openPlan(theirs, theirSection)).json();
  expect(theirAnswer.section.section_number).not.toBe(answered.section.section_number);
  const theirSeeded = seededLabels(theirAnswer.section);
  expect(await headingsOnScreen(theirs)).toEqual(theirSeeded);
  expect(theirSeeded).not.toEqual(seededLabels(answered.section));

  // The edit: week 3 of ตอนเรียน 1 gets a new title...
  const weeks = planWeeksFor(answered.section.section_number, answered.section.academic_year);
  const marker = 'หัวข้อที่แก้จากตอนเรียนที่หนึ่ง ตอนเรียนที่สองต้องไม่เห็น';
  await page.getByRole('button', { name: `แก้ไข${cardLabel(weeks[2])}`, exact: true }).click();
  expect((await submitWeek(page, { title: marker }, 'PUT')).status()).toBe(200);
  await expect(page.getByRole('heading', { name: `สัปดาห์ที่ 3 · ${marker}` })).toBeVisible();

  // ...and ตอนเรียน 2, read afresh, still says what its own seed says.
  await openPlan(theirs, theirSection);
  expect(await headingsOnScreen(theirs)).toEqual(theirSeeded);
  await expect(theirs.getByText(marker)).toHaveCount(0);
  await elsewhere.close();

  await page.getByRole('button', { name: `แก้ไขสัปดาห์ที่ 3 · ${marker}`, exact: true }).click();
  expect((await submitWeek(page, { title: weeks[2].title }, 'PUT')).status()).toBe(200);
  await expect.poll(() => headingsOnScreen(page)).toEqual(seededLabels(answered.section));
});

test('row 3: a topic lands where the calendar puts it, and a week may hold two', async ({
  page,
}) => {
  // The person types the number; the list orders by it, and a second topic on
  // an occupied week is legal and reads under the first — the two properties
  // the CLO screens do not have, proved together.
  const section = await asTeacherOne(page);
  const answered = await (await openPlan(page, section)).json();
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3]);

  const fourth = { week_no: 4, title: 'หัวข้อชั่วคราวสัปดาห์ที่สี่' };
  await page.getByRole('button', { name: 'เพิ่มหัวข้อ' }).click();
  expect((await submitWeek(page, fourth, 'POST')).status()).toBe(201);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2, 3, 4]);

  const second = { week_no: 2, title: 'หัวข้อที่สองของสัปดาห์ที่สอง ชั่วคราว' };
  await page.getByRole('button', { name: 'เพิ่มหัวข้อ' }).click();
  expect((await submitWeek(page, second, 'POST')).status()).toBe(201);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2, 2, 3, 4]);
  // Insertion order within the week: the seeded topic first, this one under it.
  expect((await headingsOnScreen(page))[2]).toBe(cardLabel(second));

  expect((await removeWeek(page, second)).status()).toBe(204);
  expect((await removeWeek(page, fourth)).status()).toBe(204);
  await expect.poll(() => headingsOnScreen(page)).toEqual(seededLabels(answered.section));
});

test('row 4: removing a row takes only itself — nothing renumbers', async ({ page }) => {
  // The other half of "the numbers are the person's": deleting a topic from
  // the middle leaves every later week wearing the number it had. Two rows of
  // this test's own; the earlier one goes; weeks 3 and 4 must still say 3 and 4.
  const section = await asTeacherOne(page);
  await openPlan(page, section);

  const second = { week_no: 2, title: 'หัวข้อชั่วคราวที่จะถูกลบ' };
  const fourth = { week_no: 4, title: 'หัวข้อชั่วคราวที่ต้องคงเลขเดิม' };
  for (const week of [second, fourth]) {
    await page.getByRole('button', { name: 'เพิ่มหัวข้อ' }).click();
    expect((await submitWeek(page, week, 'POST')).status()).toBe(201);
  }
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2, 2, 3, 4]);

  expect((await removeWeek(page, second)).status()).toBe(204);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2, 3, 4]);
  await expect(weekCard(page, fourth)).toHaveCount(1);

  expect((await removeWeek(page, fourth)).status()).toBe(204);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2, 3]);
});

test('row 5: the confirmation decides it — cancelling removes nobody', async ({ page }) => {
  // The dialog's wording is the walk's; what the browser can prove is that
  // ยกเลิก sends nothing at all.
  const section = await asTeacherOne(page);
  const answered = await (await openPlan(page, section)).json();
  const weeks = planWeeksFor(answered.section.section_number, answered.section.academic_year);

  expect(await removeWeek(page, weeks[0], { confirm: false })).toEqual([]);
  await expect(weekCard(page, weeks[0])).toHaveCount(1);
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3]);
});

test('row 6: a week an activity is filed under is refused by name, and stays', async ({
  page,
}) => {
  // The delete guard, in front of a person: the seed files สอบกลางภาค under
  // week 1, so the refusal comes back naming the week, the sentence reaches
  // the page as sent, and the card is still there.
  const section = await asTeacherOne(page);
  const answered = await (await openPlan(page, section)).json();
  const weeks = planWeeksFor(answered.section.section_number, answered.section.academic_year);

  const refused = await removeWeek(page, weeks[0]);
  expect(refused.status()).toBe(400);
  await expect(page.getByText(REFUSALS.weekInUse(1))).toBeVisible();
  await expect(weekCard(page, weeks[0])).toHaveCount(1);
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3]);
});

test('row 7: a section that is somebody else\'s hides the plan too', async ({
  page,
  browser,
}) => {
  // The register decides (ADR-0002), at the address a person could type. The
  // refusal is the same ไม่พบ as everywhere under this dashboard.
  const elsewhere = await browser.newContext();
  const owner = await elsewhere.newPage();
  const theirs = await asTeacherOne(owner);
  await elsewhere.close();

  await signIn(page, ACCOUNTS.teacherTwo);
  const answer = await openPlan(page, theirs);

  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound)).toBeVisible();
  expect(await numbersOnScreen(page)).toEqual([]);
});

test('row 8: a week the server refuses comes back in the server\'s words', async ({ page }) => {
  // The shape check surfacing: 40000 passes the browser's own checks (the
  // field has a floor, not a ceiling — the smallint is the server's to know)
  // and the refusal sentence is shown as sent. Nothing lands in the list.
  const section = await asTeacherOne(page);
  await openPlan(page, section);

  await page.getByRole('button', { name: 'เพิ่มหัวข้อ' }).click();
  const refused = await submitWeek(
    page,
    { week_no: 40000, title: 'สัปดาห์ที่ไม่มีในปฏิทิน' },
    'POST',
  );
  expect(refused.status()).toBe(400);
  await expect(page.getByText(REFUSALS.invalidWeek)).toBeVisible();
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3]);
});

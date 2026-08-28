'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { switchTo } = require('../support/shell');
const { DASHBOARD } = require('../support/teaching-screen');
const {
  openCriteria,
  mySectionIds,
  myClos,
  criterionCard,
  numbersOnScreen,
  bandsOnScreen,
  submitCriterion,
  removeCriterion,
} = require('../support/achievements-screen');

/**
 * docs/acceptance/29-achievement-criteria.md — the half a browser can prove.
 *
 * The backend suite proves the grain, the closed band list and the optional
 * description at the routes. What is here is what is only true in front of
 * the screen: that the way in from a CLO's card lands on that CLO, that two
 * ผู้สอน of two ตอนเรียน read one list, that an edit made in one browser
 * appears in the other, that the numbers a person sees close up when a row is
 * removed, that a criterion saves with the description box left alone, that
 * cancelling removes nothing, and that a refusal from the server reaches the
 * page.
 *
 * ## What is deliberately not here
 *
 * The dropdown's contents — the four bands in their order — are appearance
 * and stay hand-walked, as are the grain sentence and the dialog's wording.
 * The rows below assert the band landing on the card, which is behaviour;
 * whether ดีเยี่ยม is spelled ดีเยี่ยม is the walk's.
 *
 * ## Which CLOs the rows touch
 *
 * Rows that only read use CLO-1. Rows that write criteria use CLO-9, and add
 * their own before removing anything, so the seeded four-band set under every
 * other CLO stays exactly as seeded whichever order the rows run in.
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

const cloNumbered = (clos, code) => clos.find(clo => clo.clo_number === code);

test('row 1: the card link lands on that CLO, and the four bands arrive in order', async ({
  page,
}) => {
  // The way in is #27's card, beside the way into #28, and the address it
  // builds carries both ids. The link's mechanics are behaviour; its wording
  // is the walk's.
  const section = await asTeacherOne(page);
  const clos = await myClos(page, section);
  const clo = cloNumbered(clos, 'CLO-1');

  await page.goto(`${DASHBOARD}/${section}/courseOutcomes`);
  const [answer] = await Promise.all([
    page.waitForResponse(response => response.request().method() === 'GET'
      && /\/criteria$/.test(new URL(response.url()).pathname)),
    page.getByRole('link', { name: 'เกณฑ์การบรรลุผลของ CLO-1' }).click(),
  ]);

  expect(answer.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(
    `${DASHBOARD}/${section}/courseOutcomes/${clo.clo_id}/criteria`,
  );

  // The heading names the CLO, the numbers are 1..N, and the bands are the
  // seed's four, best first — one criterion per band, which is the fourth
  // criterion's shape on the screen.
  await expect(page.getByRole('heading', { name: /^เกณฑ์การบรรลุผลของ CLO-1$/ })).toBeVisible();
  const { offering, criteria } = await answer.json();
  expect(criteria).toHaveLength(4);
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3, 4]);
  expect(await bandsOnScreen(page)).toEqual(['ดีเยี่ยม', 'ดี', 'พอใช้', 'ต้องปรับปรุง']);
  await expect(page.getByText(`ปีการศึกษา ${offering.academic_year}`, { exact: false })).toBeVisible();
});

test('row 2: the two teachers of two sections are reading one list', async ({ page, browser }) => {
  // The fifth criterion's first half, where it has to be true: on two screens
  // belonging to two people. The clo id is the same because the CLO set is the
  // Offering's; what this row adds is that the rows drawn under it match.
  const mine = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, mine), 'CLO-1');
  await openCriteria(page, mine, clo.clo_id);
  const here = await page.getByRole('listitem').getByRole('heading').allTextContents();

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  expect(theirSection).not.toBe(mine);
  const theirClo = cloNumbered(await myClos(theirs, theirSection), 'CLO-1');
  expect(theirClo.clo_id).toBe(clo.clo_id);

  await openCriteria(theirs, theirSection, theirClo.clo_id);
  expect(await theirs.getByRole('listitem').getByRole('heading').allTextContents()).toEqual(here);
  await elsewhere.close();
});

test('row 3: an edit made in one section is what the other section reads', async ({
  page,
  browser,
}) => {
  // The write goes in through ตอนเรียน 1 and is read back through ตอนเรียน 2
  // in another browser context — 28a row 3, one table over. The edit keeps
  // its number and its band: what moves is the substance.
  const mine = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, mine), 'CLO-1');
  await openCriteria(page, mine, clo.clo_id);

  const detail = 'แก้เกณฑ์จากตอนเรียนที่หนึ่ง เพื่อให้ตอนเรียนที่สองอ่านเจอ';
  await criterionCard(page, 1).getByRole('button', { name: 'แก้ไขข้อ 1' }).click();
  const original = await page.getByLabel('เกณฑ์การประเมิน', { exact: true }).inputValue();
  expect((await submitCriterion(page, { detail }, 'PUT')).status()).toBe(200);
  await expect(criterionCard(page, 1).getByText(detail)).toBeVisible();

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  await openCriteria(theirs, theirSection, clo.clo_id);
  await expect(theirs.getByText(detail)).toBeVisible();
  await elsewhere.close();

  await criterionCard(page, 1).getByRole('button', { name: 'แก้ไขข้อ 1' }).click();
  expect((await submitCriterion(page, { detail: original }, 'PUT')).status()).toBe(200);
});

test('row 4: an added criterion takes the next number, wears its band, and needs no description', async ({
  page,
}) => {
  // The first criterion's add and the second's optional field in one row: the
  // server assigns ข้อ 5, the band lands on the card as the word the dropdown
  // offered, and the description box was never touched — บันทึก does not wait
  // for it. On CLO-9, which no reading row touches.
  const section = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, section), 'CLO-9');
  await openCriteria(page, section, clo.clo_id);
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3, 4]);

  await page.getByRole('button', { name: 'เพิ่มเกณฑ์การบรรลุผล' }).click();
  const created = await submitCriterion(
    page,
    {
      band: 'ต้องปรับปรุง',
      detail: 'ยังจัดการข้อยกเว้นไม่ได้ ต้องทบทวนบทที่ว่าด้วยข้อผิดพลาด',
    },
    'POST',
  );
  expect(created.status()).toBe(201);
  expect((await created.json()).criterion.criteria_description).toBe(null);

  await expect(criterionCard(page, 5)).toHaveCount(1);
  await expect(
    criterionCard(page, 5).getByRole('heading', { name: 'ข้อ 5 · ต้องปรับปรุง' }),
  ).toBeVisible();
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3, 4, 5]);

  expect((await removeCriterion(page, 5)).status()).toBe(204);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2, 3, 4]);
});

test('row 5: removing a row closes the gap, and the rows keep their substance', async ({
  page,
}) => {
  // The numbering half of the first criterion. Two rows of this test's own on
  // top of CLO-9's seeded four; the fifth of the six goes, and what was ข้อ 6
  // must be drawn as ข้อ 5 still saying what it said.
  const section = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, section), 'CLO-9');
  await openCriteria(page, section, clo.clo_id);

  const fifth = 'เกณฑ์ชั่วคราวข้อห้า';
  const sixth = 'เกณฑ์ชั่วคราวข้อหก';
  for (const detail of [fifth, sixth]) {
    await page.getByRole('button', { name: 'เพิ่มเกณฑ์การบรรลุผล' }).click();
    expect(
      (await submitCriterion(page, { band: 'ดี', detail }, 'POST')).status(),
    ).toBe(201);
  }
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3, 4, 5, 6]);

  expect((await removeCriterion(page, 5)).status()).toBe(204);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2, 3, 4, 5]);
  await expect(criterionCard(page, 5).getByText(sixth)).toBeVisible();

  expect((await removeCriterion(page, 5)).status()).toBe(204);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2, 3, 4]);
});

test('row 6: the confirmation decides it — cancelling removes nobody', async ({ page }) => {
  // The sixth criterion. The dialog's wording is the walk's; what the browser
  // can prove is that ยกเลิก sends nothing at all.
  const section = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, section), 'CLO-1');
  await openCriteria(page, section, clo.clo_id);

  expect(await removeCriterion(page, 1, { confirm: false })).toEqual([]);
  await expect(criterionCard(page, 1)).toHaveCount(1);
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3, 4]);
});

test('row 7: a section that is somebody else\'s hides the criteria too', async ({
  page,
  browser,
}) => {
  // The seventh criterion, at the address a person could type. The register
  // decides (ADR-0002), and it answers #24's sentence — reaching for what
  // hangs two levels under the Section changes nothing.
  const elsewhere = await browser.newContext();
  const owner = await elsewhere.newPage();
  const theirs = await asTeacherOne(owner);
  const clo = cloNumbered(await myClos(owner, theirs), 'CLO-1');
  await elsewhere.close();

  await signIn(page, ACCOUNTS.teacherTwo);
  const answer = await openCriteria(page, theirs, clo.clo_id);

  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound)).toBeVisible();
  expect(await numbersOnScreen(page)).toEqual([]);
});

test('row 8: a CLO this Offering does not hold is refused in words', async ({ page }) => {
  // The address bar can carry any clo id; the grain refuses as ไม่พบ, and the
  // sentence reaches the page rather than a blank list pretending to be an
  // empty one. Which set another *year's* CLO falls outside is the backend
  // suite's row — a browser has no honest way to name last year's id, because
  // the dashboard only lists this term.
  const section = await asTeacherOne(page);

  const answer = await openCriteria(page, section, 999999);
  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.cloNotFound)).toBeVisible();
  expect(await numbersOnScreen(page)).toEqual([]);
});

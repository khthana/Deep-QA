'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { switchTo } = require('../support/shell');
const { DASHBOARD } = require('../support/teaching-screen');
const {
  openBehaviors,
  mySectionIds,
  myClos,
  behaviorCard,
  numbersOnScreen,
  submitBehavior,
  removeBehavior,
} = require('../support/behaviors-screen');

/**
 * docs/acceptance/28-measurable-behaviors.md — the half a browser can prove.
 *
 * The backend suite proves the grain and the two closed lists at the routes.
 * What is here is what is only true in front of the screen: that the way in
 * from a CLO's card lands on that CLO, that two ผู้สอน of two ตอนเรียน read
 * one list, that an edit made in one browser appears in the other, that the
 * numbers a person sees close up when a row is removed, that cancelling
 * removes nothing, and that a refusal from the server reaches the page.
 *
 * ## What is deliberately not here
 *
 * The contents of the two dropdowns — R064's six Thai labels and R063's four —
 * are appearance and stay hand-walked (TC-CLO-005 and TC-CLO-006 name them
 * row by row). So do the grain sentence under the heading and the dialog's
 * wording. The rows below assert the enum *value* landing on the card, which
 * is behaviour; whether จำ is spelled จำ is the walk's.
 *
 * ## Which CLOs the rows touch
 *
 * Rows that only read use CLO-1. Rows that write behaviours use CLO-9, and
 * add their own before removing anything, so the seeded pair under every
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

test('row 1: the card link lands on that CLO, and the list is numbered from one', async ({
  page,
}) => {
  // The way in is #27's card, and the address it builds carries both ids. The
  // link's mechanics are behaviour; its wording is the walk's.
  const section = await asTeacherOne(page);
  const clos = await myClos(page, section);
  const clo = cloNumbered(clos, 'CLO-1');

  await page.goto(`${DASHBOARD}/${section}/courseOutcomes`);
  const [answer] = await Promise.all([
    page.waitForResponse(response => response.request().method() === 'GET'
      && /\/behaviors$/.test(new URL(response.url()).pathname)),
    page.getByRole('link', { name: 'พฤติกรรมบ่งชี้ของ CLO-1' }).click(),
  ]);

  expect(answer.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(
    `${DASHBOARD}/${section}/courseOutcomes/${clo.clo_id}/behaviors`,
  );

  // The heading names the CLO, the numbers are 1..N, and the year is the
  // Offering's — the seed writes two per CLO.
  await expect(page.getByRole('heading', { name: /^พฤติกรรมบ่งชี้ของ CLO-1$/ })).toBeVisible();
  const { offering, behaviors } = await answer.json();
  expect(behaviors).toHaveLength(2);
  expect(await numbersOnScreen(page)).toEqual([1, 2]);
  await expect(page.getByText(`ปีการศึกษา ${offering.academic_year}`, { exact: false })).toBeVisible();
});

test('row 2: the two teachers of two sections are reading one list', async ({ page, browser }) => {
  // The fifth criterion's first half, where it has to be true: on two screens
  // belonging to two people. The clo id is the same because the CLO set is the
  // Offering's; what this row adds is that the rows drawn under it match.
  const mine = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, mine), 'CLO-1');
  await openBehaviors(page, mine, clo.clo_id);
  const here = await page.getByRole('listitem').getByRole('heading').allTextContents();

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  expect(theirSection).not.toBe(mine);
  const theirClo = cloNumbered(await myClos(theirs, theirSection), 'CLO-1');
  expect(theirClo.clo_id).toBe(clo.clo_id);

  await openBehaviors(theirs, theirSection, theirClo.clo_id);
  expect(await theirs.getByRole('listitem').getByRole('heading').allTextContents()).toEqual(here);
  await elsewhere.close();
});

test('row 3: an edit made in one section is what the other section reads', async ({
  page,
  browser,
}) => {
  // The write goes in through ตอนเรียน 1 and is read back through ตอนเรียน 2
  // in another browser context — 27a row 3, one tier down. The edit keeps its
  // number: what moves is the substance.
  const mine = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, mine), 'CLO-1');
  await openBehaviors(page, mine, clo.clo_id);

  const detail = 'แก้พฤติกรรมจากตอนเรียนที่หนึ่ง เพื่อให้ตอนเรียนที่สองอ่านเจอ';
  await behaviorCard(page, 1).getByRole('button', { name: 'แก้ไขข้อ 1' }).click();
  const original = await page.getByLabel('รายละเอียดพฤติกรรม', { exact: true }).inputValue();
  expect((await submitBehavior(page, { detail }, 'PUT')).status()).toBe(200);
  await expect(behaviorCard(page, 1).getByText(detail)).toBeVisible();

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  await openBehaviors(theirs, theirSection, clo.clo_id);
  await expect(theirs.getByText(detail)).toBeVisible();
  await elsewhere.close();

  await behaviorCard(page, 1).getByRole('button', { name: 'แก้ไขข้อ 1' }).click();
  expect((await submitBehavior(page, { detail: original }, 'PUT')).status()).toBe(200);
});

test('row 4: an added behaviour takes the next number and wears its two tags', async ({ page }) => {
  // The first criterion's add, and the second's fields as a person sees them:
  // the server assigns ข้อ 3, and the enum values come back as the Thai labels
  // the dropdown offered. On CLO-9, which no reading row touches.
  const section = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, section), 'CLO-9');
  await openBehaviors(page, section, clo.clo_id);
  expect(await numbersOnScreen(page)).toEqual([1, 2]);

  await page.getByRole('button', { name: 'เพิ่มพฤติกรรมบ่งชี้' }).click();
  const created = await submitBehavior(
    page,
    {
      detail: 'ประเมินคุณภาพโค้ดของเพื่อนร่วมกลุ่มได้',
      level: 'ประเมินค่า',
      activity: 'งานที่มอบหมาย',
    },
    'POST',
  );
  expect(created.status()).toBe(201);

  await expect(behaviorCard(page, 3)).toHaveCount(1);
  await expect(behaviorCard(page, 3).getByText('ประเมินค่า')).toBeVisible();
  await expect(behaviorCard(page, 3).getByText('งานที่มอบหมาย')).toBeVisible();
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3]);

  expect((await removeBehavior(page, 3)).status()).toBe(204);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2]);
});

test('row 5: removing a row closes the gap, and the rows keep their substance', async ({
  page,
}) => {
  // The numbering half of the second criterion. Two rows of this test's own on
  // top of CLO-9's seeded pair; the middle of the four goes, and what was ข้อ 4
  // must be drawn as ข้อ 3 still saying what it said.
  const section = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, section), 'CLO-9');
  await openBehaviors(page, section, clo.clo_id);

  const third = 'พฤติกรรมชั่วคราวข้อสาม';
  const fourth = 'พฤติกรรมชั่วคราวข้อสี่';
  for (const detail of [third, fourth]) {
    await page.getByRole('button', { name: 'เพิ่มพฤติกรรมบ่งชี้' }).click();
    expect(
      (await submitBehavior(page, { detail, level: 'จำ', activity: 'ข้อสอบ' }, 'POST')).status(),
    ).toBe(201);
  }
  expect(await numbersOnScreen(page)).toEqual([1, 2, 3, 4]);

  expect((await removeBehavior(page, 3)).status()).toBe(204);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2, 3]);
  await expect(behaviorCard(page, 3).getByText(fourth)).toBeVisible();

  expect((await removeBehavior(page, 3)).status()).toBe(204);
  await expect.poll(() => numbersOnScreen(page)).toEqual([1, 2]);
});

test('row 6: the confirmation decides it — cancelling removes nobody', async ({ page }) => {
  // The sixth criterion. The dialog's wording is the walk's; what the browser
  // can prove is that ยกเลิก sends nothing at all.
  const section = await asTeacherOne(page);
  const clo = cloNumbered(await myClos(page, section), 'CLO-1');
  await openBehaviors(page, section, clo.clo_id);

  expect(await removeBehavior(page, 1, { confirm: false })).toEqual([]);
  await expect(behaviorCard(page, 1)).toHaveCount(1);
  expect(await numbersOnScreen(page)).toEqual([1, 2]);
});

test('row 7: a section that is somebody else\'s hides the behaviours too', async ({
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
  const answer = await openBehaviors(page, theirs, clo.clo_id);

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

  const answer = await openBehaviors(page, section, 999999);
  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.cloNotFound)).toBeVisible();
  expect(await numbersOnScreen(page)).toEqual([]);
});

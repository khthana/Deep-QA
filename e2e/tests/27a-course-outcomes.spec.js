'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { switchTo } = require('../support/shell');
const { DASHBOARD } = require('../support/teaching-screen');
const {
  openClos,
  mySectionIds,
  cloCard,
  codesOnScreen,
  submitClo,
  removeClo,
} = require('../support/clos-screen');

/**
 * docs/acceptance/27-course-learning-outcomes.md — the half a browser can prove.
 *
 * The backend suite proves the same rules at the routes, and for most of this
 * ticket that is the stronger seam: whether a CLO belongs to a year is a fact
 * about a row. What is here is the part that is only true if a person sitting
 * in front of the screen would find it true — that two ผู้สอน of two ตอนเรียน
 * are looking at one list, that an edit made in one browser appears in the
 * other, that cancelling a removal removes nothing, and that a refusal from the
 * server reaches the page instead of being swallowed.
 *
 * ## Two contexts, not two pages
 *
 * The third and fourth criteria need two people signed in at once. A cookie
 * belongs to a browser profile rather than to a tab, so two pages of one
 * context are one signed-in person — 24a row 6 says the same thing and #94 is
 * where it cost a hand-walk. Every row below that involves both teachers opens
 * a second context.
 *
 * ## What is deliberately not here
 *
 * The sentence under the heading that explains the grain, the wording of the
 * empty state, and ยังไม่ระบุ in the picker are appearance and stay
 * hand-walked. So does the menu entry that leads here: 24a row 3 already
 * asserts that a Section-specific entry carries the id rather than the token,
 * and asserting it a second time for a second label would be asserting the
 * label.
 */

const SUBJECT = '01076105';

/** A code no seeded row uses, so a row that leaves one behind is visible. */
const SPARE = 'CLO-90';

const DRAFT = {
  รหัสผลการเรียนรู้: SPARE,
  รายละเอียดผลการเรียนรู้: 'เขียนโปรแกรมจัดการข้อยกเว้นได้อย่างเหมาะสม',
  วิธีการสอน: 'บรรยายและปฏิบัติ',
  วิธีการวัดผล: 'ตรวจผลงาน',
};

/** teacher.one@ teaching ตอนเรียน 1 of the current term, which is where most rows start. */
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

test('row 1: the set opens under a section and names the year it belongs to', async ({ page }) => {
  const section = await asTeacherOne(page);
  const answer = await openClos(page, section);

  expect(answer.status()).toBe(200);
  const { offering, clos } = await answer.json();
  expect(clos).toHaveLength(9);

  // The address is the ตอนเรียน and the record is the Offering's, which is the
  // whole of ADR-0003 meeting ADR-0004 on one screen.
  expect(new URL(page.url()).pathname).toBe(`${DASHBOARD}/${section}/courseOutcomes`);
  expect(await codesOnScreen(page)).toEqual(clos.map(clo => clo.clo_number));
  await expect(page.getByText(`ปีการศึกษา ${offering.academic_year}`, { exact: false })).toBeVisible();
});

test('row 2: the two teachers of two sections are reading one list', async ({ page, browser }) => {
  // The third criterion, and the reason it needs a browser at all: the routes
  // already prove the rows are the same rows. What a person has to be able to
  // see is that their colleague's screen says what theirs says.
  const mine = await asTeacherOne(page);
  await openClos(page, mine);
  const here = await codesOnScreen(page);

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  expect(theirSection).not.toBe(mine);
  await openClos(theirs, theirSection);

  expect(await codesOnScreen(theirs)).toEqual(here);
  await elsewhere.close();
});

test('row 3: an edit made in one section is what the other section reads', async ({
  page,
  browser,
}) => {
  // The fourth criterion. The write goes in through ตอนเรียน 1 and is read back
  // through ตอนเรียน 2, in another browser context, by another person - which
  // is the only arrangement in which "visible from another Section" means what
  // the ticket means by it.
  const mine = await asTeacherOne(page);
  await openClos(page, mine);

  const detail = 'แก้จากตอนเรียนที่หนึ่ง เพื่อให้ตอนเรียนที่สองอ่านเจอ';
  await cloCard(page, 'CLO-1').getByRole('button', { name: 'แก้ไข CLO-1' }).click();
  const original = await page.getByLabel('รายละเอียดผลการเรียนรู้', { exact: true }).inputValue();
  expect((await submitClo(page, { รายละเอียดผลการเรียนรู้: detail }, 'PUT')).status()).toBe(200);

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  await openClos(theirs, await asMultiRole(theirs));
  await expect(theirs.getByText(detail)).toBeVisible();
  await elsewhere.close();

  await cloCard(page, 'CLO-1').getByRole('button', { name: 'แก้ไข CLO-1' }).click();
  expect((await submitClo(page, { รายละเอียดผลการเรียนรู้: original }, 'PUT')).status()).toBe(200);
});

test('row 4: the row says who last changed it, and an edit moves the name', async ({
  page,
  browser,
}) => {
  // The seventh criterion, and it is behaviour rather than wording: the name on
  // the row has to become the person who just typed. The seed writes every CLO
  // as อนันต์, so the assertion that carries the row is the one after the other
  // teacher saves.
  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  await openClos(theirs, theirSection);

  await expect(cloCard(theirs, 'CLO-2').getByText(/แก้ไขล่าสุดโดย.*อนันต์/)).toBeVisible();

  await cloCard(theirs, 'CLO-2').getByRole('button', { name: 'แก้ไข CLO-2' }).click();
  const original = await theirs.getByLabel('รายละเอียดผลการเรียนรู้', { exact: true }).inputValue();
  expect(
    (await submitClo(theirs, { รายละเอียดผลการเรียนรู้: original + ' (ปรับถ้อยคำ)' }, 'PUT')).status(),
  ).toBe(200);

  await expect(cloCard(theirs, 'CLO-2').getByText(/แก้ไขล่าสุดโดย.*กิตติ/)).toBeVisible();

  await cloCard(theirs, 'CLO-2').getByRole('button', { name: 'แก้ไข CLO-2' }).click();
  expect((await submitClo(theirs, { รายละเอียดผลการเรียนรู้: original }, 'PUT')).status()).toBe(200);
  await elsewhere.close();
});

test('row 5: the picker offers the PLOs of this subject and no others', async ({ page }) => {
  // The second criterion. The coverage grid places eight of the thirteen; the
  // count is compared against what the server said rather than against the
  // number eight, because the number is the seed's and the rule is the grid's.
  const section = await asTeacherOne(page);
  const answer = await openClos(page, section);
  const { plos } = await answer.json();

  await page.getByRole('button', { name: 'เพิ่มผลการเรียนรู้รายวิชา' }).click();
  const picker = page.getByLabel('ผลการเรียนรู้ของหลักสูตรที่รองรับ', { exact: true });

  // One more than the mapped PLOs: the empty option, which is a real state
  // rather than a placeholder and is a hand-walked row of its own.
  await expect(picker.getByRole('option')).toHaveCount(plos.length + 1);
  for (const plo of plos) {
    await expect(picker.getByRole('option', { name: new RegExp(plo.outcome_code) }).first()).toHaveCount(1);
  }
  // PLO-4 is in the หลักสูตร and is not on this รายวิชา, so it is the one the
  // row is really about - a picker built from `learning_outcomes` alone would
  // pass every assertion above and fail this one.
  expect(plos.some(plo => plo.outcome_code === 'PLO-4')).toBe(false);
  await expect(picker.getByRole('option', { name: /^PLO-4 / })).toHaveCount(0);
});

test('row 6: a code already used this year is refused on the screen', async ({ page }) => {
  // The sixth criterion's refusal, asserted where a person meets it. The server
  // decides; what this row proves is that the sentence arrives on the page
  // rather than being swallowed into a blank save.
  const section = await asTeacherOne(page);
  await openClos(page, section);

  await page.getByRole('button', { name: 'เพิ่มผลการเรียนรู้รายวิชา' }).click();
  const refused = await submitClo(page, { ...DRAFT, รหัสผลการเรียนรู้: 'CLO-1' }, 'POST');

  expect(refused.status()).toBe(409);
  await expect(page.getByText(REFUSALS.duplicateCloNumber)).toBeVisible();
  expect(await codesOnScreen(page)).toHaveLength(9);
});

test('row 7: a CLO with marks against it is refused, and stays on the screen', async ({ page }) => {
  // The eighth criterion. Every seeded CLO carries marks, so the bin on any of
  // them is this state; the row that matters is the one after the refusal -
  // a screen that reported the refusal and had already dropped the card from
  // its list would look exactly the same until the next reload.
  const section = await asTeacherOne(page);
  await openClos(page, section);

  const refused = await removeClo(page, 'CLO-3');
  expect(refused.status()).toBe(409);
  await expect(page.getByText(REFUSALS.cloHasScores)).toBeVisible();
  await expect(cloCard(page, 'CLO-3')).toHaveCount(1);
});

test('row 8: adding and removing, with the confirmation actually deciding it', async ({ page }) => {
  // The first and ninth criteria together. The cancel is the half worth the
  // browser: a dialog that appeared and then deleted anyway would pass a row
  // that only asserted the dialog, so what is asserted is that the CLO is still
  // there afterwards and that no DELETE was sent.
  const section = await asTeacherOne(page);
  await openClos(page, section);

  await page.getByRole('button', { name: 'เพิ่มผลการเรียนรู้รายวิชา' }).click();
  expect((await submitClo(page, DRAFT, 'POST')).status()).toBe(201);
  await expect(cloCard(page, SPARE)).toHaveCount(1);

  expect(await removeClo(page, SPARE, { confirm: false })).toEqual([]);
  await expect(cloCard(page, SPARE)).toHaveCount(1);

  expect((await removeClo(page, SPARE)).status()).toBe(204);
  await expect(cloCard(page, SPARE)).toHaveCount(0);
  expect(await codesOnScreen(page)).toHaveLength(9);
});

test('row 9: a section that is somebody else\'s hides its outcomes too', async ({
  page,
  browser,
}) => {
  // The screen is under a Section address, so it inherits #24's refusal rather
  // than inventing one: the register decides, and a Section that is not theirs
  // answers the same sentence whether they asked for the Section or for what
  // hangs under it.
  const elsewhere = await browser.newContext();
  const owner = await elsewhere.newPage();
  await signIn(owner, ACCOUNTS.teacherOne);
  const [theirs] = await mySectionIds(owner);
  await elsewhere.close();

  await signIn(page, ACCOUNTS.teacherTwo);
  const answer = await openClos(page, theirs);

  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound)).toBeVisible();
  expect(await codesOnScreen(page)).toEqual([]);
});

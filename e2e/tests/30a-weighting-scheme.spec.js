'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { switchTo } = require('../support/shell');
const { DASHBOARD } = require('../support/teaching-screen');
const { importCsv, reportedLines, reportedReason } = require('../support/import-panel');
const {
  openWeights,
  waitForWeights,
  mySectionIds,
  categoryInput,
  weightInput,
  schemeOnScreen,
  totalLine,
  saveScheme,
  removeRow,
} = require('../support/weights-screen');

/**
 * docs/acceptance/30-weighting-scheme.md — the half a browser can prove.
 *
 * The backend suite proves the hundred rule against crafted requests, the
 * pairing of ids to the Offering, the rename swap and the whole import
 * grammar. What is here is what is only true in front of the screen: that
 * the menu entry lands on the scheme, that two ผู้สอน of two ตอนเรียน read
 * one draft, that the running total follows the keys, that the server's
 * refusals — the total in its sentence, the in-use category by name — reach
 * the page, that cancelling a removal removes nothing, and that the import
 * panel walks the whole shared-module path from a real file input.
 *
 * ## Restore discipline
 *
 * The scheme is one shared row set, so every row that saves puts the seeded
 * โครงงาน 40 / สอบกลางภาค 30 / สอบปลายภาค 30 back before it ends — the next
 * row starts by reading it.
 */

const SEEDED = [
  { score_category: 'โครงงาน', weight: '40' },
  { score_category: 'สอบกลางภาค', weight: '30' },
  { score_category: 'สอบปลายภาค', weight: '30' },
];

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

const importPath = section => `/api/teaching/sections/${section}/weights/import`;

test('row 1: the menu entry lands on the scheme, and it reads one hundred', async ({ page }) => {
  // The way in is the sidebar's own entry — 24a proved the token swap, this
  // proves the entry goes somewhere real. The three seeded rows arrive in
  // order, and the courtesy total reads what BR-05 promises.
  const section = await asTeacherOne(page);
  await page.goto(`${DASHBOARD}/${section}`);

  const [answer] = await Promise.all([
    waitForWeights(page),
    page.getByRole('link', { name: 'สัดส่วนคะแนน' }).click(),
  ]);
  expect(answer.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(`${DASHBOARD}/${section}/gradingWeights`);

  expect(await schemeOnScreen(page)).toEqual(SEEDED);
  await expect(totalLine(page)).toHaveText('รวม 100 / 100');
});

test('row 2: the two teachers of two sections are reading one scheme', async ({
  page,
  browser,
}) => {
  const mine = await asTeacherOne(page);
  await openWeights(page, mine);
  const here = await schemeOnScreen(page);

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  expect(theirSection).not.toBe(mine);
  await openWeights(theirs, theirSection);
  expect(await schemeOnScreen(theirs)).toEqual(here);
  await elsewhere.close();
});

test('row 3: a rebalance saved in one section is what the other section reads', async ({
  page,
  browser,
}) => {
  const mine = await asTeacherOne(page);
  await openWeights(page, mine);

  await weightInput(page, 1).fill('50');
  await weightInput(page, 3).fill('20');
  await expect(totalLine(page)).toHaveText('รวม 100 / 100');
  expect((await saveScheme(page)).status()).toBe(200);

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  await openWeights(theirs, theirSection);
  expect((await schemeOnScreen(theirs))[0]).toEqual({
    score_category: 'โครงงาน',
    weight: '50',
  });
  await elsewhere.close();

  await weightInput(page, 1).fill('40');
  await weightInput(page, 3).fill('30');
  expect((await saveScheme(page)).status()).toBe(200);
});

test('row 4: a total that is not one hundred is refused, and the sentence carries it', async ({
  page,
}) => {
  // The second criterion on the screen: the total line follows the keys as a
  // courtesy, the save is refused by the server, and the sentence that
  // reaches the banner is the server's own, ninety and all.
  const section = await asTeacherOne(page);
  await openWeights(page, section);

  await weightInput(page, 3).fill('20');
  await expect(totalLine(page)).toHaveText('รวม 90 / 100');

  const refused = await saveScheme(page);
  expect(refused.status()).toBe(400);
  await expect(page.getByText(REFUSALS.weightsNotHundred(90))).toBeVisible();

  // And nothing moved: a reload reads the seeded scheme.
  await openWeights(page, section);
  expect(await schemeOnScreen(page)).toEqual(SEEDED);
});

test('row 5: a category joins with the weights rebalanced, and leaves the same way', async ({
  page,
}) => {
  const section = await asTeacherOne(page);
  await openWeights(page, section);

  await page.getByRole('button', { name: 'เพิ่มหมวดคะแนน' }).click();
  await categoryInput(page, 4).fill('สอบย่อย');
  await weightInput(page, 4).fill('10');
  await weightInput(page, 3).fill('20');
  expect((await saveScheme(page)).status()).toBe(200);

  await expect(categoryInput(page, 4)).toHaveValue('สอบย่อย');
  await expect(totalLine(page)).toHaveText('รวม 100 / 100');

  // Removing it is a draft edit behind the dialog; the save is what persists,
  // and it may drop the row because nothing is filed under it yet.
  await removeRow(page, 4);
  await weightInput(page, 3).fill('30');
  expect((await saveScheme(page)).status()).toBe(200);
  await expect(page.getByLabel(/^ชื่อหมวดคะแนนที่ /)).toHaveCount(3);
  expect(await schemeOnScreen(page)).toEqual(SEEDED);
});

test('row 6: the confirmation decides it — cancelling removes nobody', async ({ page }) => {
  const section = await asTeacherOne(page);
  await openWeights(page, section);

  await removeRow(page, 1, { confirm: false });
  expect(await schemeOnScreen(page)).toEqual(SEEDED);
});

test('row 7: a category with Activities against it cannot be dropped, and the refusal names it', async ({
  page,
}) => {
  // The sixth criterion. Every seeded category carries Activities, so
  // removing โครงงาน from the draft and rebalancing is exactly the save the
  // guard exists for — refused at the server, named in the banner, and the
  // saved scheme untouched.
  const section = await asTeacherOne(page);
  await openWeights(page, section);

  await removeRow(page, 1);
  await weightInput(page, 1).fill('50');
  await weightInput(page, 2).fill('50');
  await expect(totalLine(page)).toHaveText('รวม 100 / 100');

  const refused = await saveScheme(page);
  expect(refused.status()).toBe(400);
  await expect(page.getByText(REFUSALS.weightInUse('โครงงาน'))).toBeVisible();

  await openWeights(page, section);
  expect(await schemeOnScreen(page)).toEqual(SEEDED);
});

test('row 8: an import replaces the scheme as one, from a real file', async ({ page }) => {
  // The seventh criterion's happy half, walked through the shared panel: a
  // file becomes the scheme, the screen reloads itself, and a second file
  // puts the seeded three back — the removal of สอบย่อย riding through the
  // import's own delete path.
  const section = await asTeacherOne(page);
  await openWeights(page, section);

  // A successful import reloads the scheme, so the reload wait is registered
  // before the file goes in — saveScheme's reason, one panel over.
  const grewAgain = waitForWeights(page);
  const grown = await importCsv(page, {
    path: importPath(section),
    name: 'weighting-scheme.csv',
    text: 'score_category,weight\nโครงงาน,40\nสอบกลางภาค,30\nสอบปลายภาค,20\nสอบย่อย,10\n',
  });
  expect(grown.status()).toBe(201);
  await grewAgain;
  await expect(page.getByText('นำเข้าสำเร็จ 4 รายการ')).toBeVisible();
  await expect(categoryInput(page, 4)).toHaveValue('สอบย่อย');

  const shrankAgain = waitForWeights(page);
  const restored = await importCsv(page, {
    path: importPath(section),
    name: 'weighting-scheme.csv',
    text: 'score_category,weight\nโครงงาน,40\nสอบกลางภาค,30\nสอบปลายภาค,30\n',
  });
  expect(restored.status()).toBe(201);
  await shrankAgain;
  await expect(page.getByLabel(/^ชื่อหมวดคะแนนที่ /)).toHaveCount(3);
  expect(await schemeOnScreen(page)).toEqual(SEEDED);
});

test('row 9: an import is refused with the file total, or row by row, and applies nothing', async ({
  page,
}) => {
  const section = await asTeacherOne(page);
  await openWeights(page, section);

  // The whole-file rule arrives as the banner's sentence, total and all —
  // there is no row to pin it on, so there is no report table.
  const short = await importCsv(page, {
    path: importPath(section),
    name: 'weighting-scheme.csv',
    text: 'score_category,weight\nโครงงาน,40\nสอบกลางภาค,30\nสอบปลายภาค,20\n',
  });
  expect(short.status()).toBe(400);
  await expect(page.getByText(REFUSALS.weightsNotHundred(90))).toBeVisible();

  // A bad row arrives as the report, named by line.
  const bad = await importCsv(page, {
    path: importPath(section),
    name: 'weighting-scheme.csv',
    text: 'score_category,weight\nโครงงาน,40\nสอบกลางภาค,ยี่สิบ\nสอบปลายภาค,60\n',
  });
  expect(bad.status()).toBe(400);
  expect(await reportedLines(page)).toEqual([3]);
  await expect(reportedReason(page, 3)).toHaveText(REFUSALS.invalidWeight);

  await openWeights(page, section);
  expect(await schemeOnScreen(page)).toEqual(SEEDED);
});

test('row 10: a section that is somebody else\'s hides the scheme too', async ({
  page,
  browser,
}) => {
  const elsewhere = await browser.newContext();
  const owner = await elsewhere.newPage();
  const theirs = await asTeacherOne(owner);
  await elsewhere.close();

  await signIn(page, ACCOUNTS.teacherTwo);
  const answer = await openWeights(page, theirs);

  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound)).toBeVisible();
  expect(await schemeOnScreen(page)).toEqual([]);
});

'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const {
  SCORE_RATIOS,
  ACTIVITIES,
  unmarkedActivityName,
  unmarkedActivityDates,
} = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { switchTo } = require('../support/shell');
const { DASHBOARD } = require('../support/teaching-screen');
const {
  openActivities,
  waitForActivities,
  mySectionIds,
  activityCard,
  groupsOnScreen,
  namesOnScreen,
  namesInCategory,
  removeActivity,
} = require('../support/activities-screen');

/**
 * docs/acceptance/32-activity-list.md — the half a browser can prove.
 *
 * The backend suite proves the two grains, the ordering and both delete
 * guards at the routes. What is here is what is only true in front of the
 * screen: that the menu entry lands on this Section's list, that the work is
 * drawn under the category it counts towards and an empty category is still
 * drawn, that two ตอนเรียน show two lists under one scheme, that the one
 * deletable Activity can be deleted and takes only itself, that cancelling
 * removes nothing, and that both refusals — marks and evidence — reach the
 * page in the server's own words.
 *
 * ## What is deliberately not here
 *
 * The menu entry's wording, the grain sentence, the field labels and the
 * dialog's sentence are appearance and stay hand-walked. The evidence guard
 * has no browser row either: evidence is a real PDF uploaded on #35's screen,
 * which is not built, and the seed says in as many words that it does not
 * seed evidence. That refusal is proved at the HTTP seam.
 *
 * ## Which Activity the rows touch
 *
 * Only the seed's one deletable fixture is ever deleted — the row nothing
 * points at, whose name carries its ตอนเรียน and year. Every other Activity
 * carries a cohort's marks, and deleting one is what the guard exists to
 * refuse.
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

const deletableName = section =>
  unmarkedActivityName(section.section_number, section.academic_year);

test('row 1: the menu entry lands on this section\'s work, filed under the scheme', async ({
  page,
}) => {
  // The way in is the sidebar's entry; its wording is the walk's, its address
  // is behaviour. The groups are the scheme's own categories, in the scheme's
  // order — not an order derived from what happens to be filed.
  const section = await asTeacherOne(page);
  await page.goto(`${DASHBOARD}/${section}`);
  const [answer] = await Promise.all([
    waitForActivities(page),
    page.getByRole('link', { name: 'กิจกรรมการเรียนรู้ในรายวิชา' }).click(),
  ]);

  expect(answer.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(`${DASHBOARD}/${section}/learningActivities`);

  expect(await groupsOnScreen(page)).toEqual(
    SCORE_RATIOS.map(ratio => expect.stringContaining(ratio.category)),
  );

  // Every seeded Activity is drawn, and the deletable fixture with them.
  const names = await namesOnScreen(page);
  expect(names).toHaveLength(ACTIVITIES.length + 1);
});

test('row 2: each piece of work is drawn under the category it counts towards', async ({
  page,
}) => {
  // The first criterion, where only the screen can show it: สอบกลางภาค under
  // สอบกลางภาค, the three โครงงาน under โครงงาน, and none of them anywhere
  // else.
  const section = await asTeacherOne(page);
  await openActivities(page, section);

  // Asserted as a whole ordered list rather than name by name: within a
  // category the rows keep the order the work was made in, and a list that
  // reshuffled between two loads would still contain every name.
  for (const ratio of SCORE_RATIOS) {
    const expected = ACTIVITIES.filter(one => one.category === ratio.category).map(one => one.name);
    const drawn = await namesInCategory(page, ratio.category);
    expect(drawn.filter(name => expected.includes(name))).toEqual(expected);
  }

  // And the fixture is filed where the seed files it, which is what makes
  // the group it is in provably the category and not a coincidence.
  const answered = await (await openActivities(page, section)).json();
  expect(await namesInCategory(page, 'โครงงาน')).toContain(deletableName(answered.section));
});

test('row 3: the groups are the scheme, and every activity sits in exactly one', async ({
  page,
}) => {
  // The property that makes the grouping the scheme's rather than the list's:
  // the headings are the หมวดคะแนน, in the scheme's order, and no Activity is
  // drawn twice or dropped. A screen that derived its groups from the rows
  // would pass every other row of this file and fail here the moment a
  // category went empty.
  //
  // The empty category itself is not reachable in a browser with this seed —
  // all three หมวด carry work in both years — so *drawing* an empty group is
  // a hand-walked row, and the sheet names the path: add a fourth category on
  // #30's screen and come back here.
  const section = await asTeacherOne(page);
  await openActivities(page, section);

  expect(await groupsOnScreen(page)).toEqual(
    SCORE_RATIOS.map(ratio => expect.stringContaining(ratio.category)),
  );

  // Every seeded piece of work is drawn exactly once across all the groups.
  // Counted rather than compared against the screen's own total, because a
  // screen that drew the same rows under every heading would agree with
  // itself: the count that matters comes from the seed.
  const grouped = [];
  for (const ratio of SCORE_RATIOS) grouped.push(...(await namesInCategory(page, ratio.category)));
  for (const spec of ACTIVITIES) {
    expect(grouped.filter(name => name === spec.name)).toHaveLength(1);
  }
  expect(grouped).toHaveLength(await namesOnScreen(page).then(names => names.length));
});

test('row 4: two sections of one offering show two lists under one scheme', async ({
  page,
  browser,
}) => {
  // The eighth criterion on two screens belonging to two people: the group
  // headings match word for word (the scheme is the Offering's), and the
  // deletable fixture names a different ตอนเรียน on each (the work is not).
  const mine = await asTeacherOne(page);
  const here = await (await openActivities(page, mine)).json();
  const myGroups = await groupsOnScreen(page);

  const elsewhere = await browser.newContext();
  const theirs = await elsewhere.newPage();
  const theirSection = await asMultiRole(theirs);
  expect(theirSection).not.toBe(mine);
  const there = await (await openActivities(theirs, theirSection)).json();

  expect(await groupsOnScreen(theirs)).toEqual(myGroups);
  expect(there.section.section_number).not.toBe(here.section.section_number);

  await expect(activityCard(page, deletableName(here.section))).toHaveCount(1);
  await expect(activityCard(theirs, deletableName(there.section))).toHaveCount(1);
  await expect(page.getByText(deletableName(there.section))).toHaveCount(0);
  await elsewhere.close();
});

// Declared before row 5 although it is numbered after it: row 5 deletes the
// fixture, the schema is reseeded once per run and not per test, and the
// browser cannot make another Activity until #33 builds the editor. Anything
// that needs the deletable row has to run ahead of the row that spends it.
test('row 9: an entry carries its type, its full mark and its two dates', async ({ page }) => {
  // The second criterion's values, as against its labels — the labels and the
  // layout are the walk's. The seed gives dates to exactly one Activity, so
  // this row reads both halves of the same screen: the fixture shows a real
  // date, and a seeded one with no dates shows the dash rather than
  // `Invalid Date` or 1970, which is the failure a screen with no dates at
  // all could never show.
  const section = await asTeacherOne(page);
  const answered = await (await openActivities(page, section)).json();
  const fixture = activityCard(page, deletableName(answered.section));

  await expect(fixture.getByText('งานเดี่ยว')).toBeVisible();
  await expect(fixture.getByText('20', { exact: true })).toBeVisible();

  // Both values of the type enum, on one screen: the seed's โครงงาน are group
  // work and the fixture is not, so a screen that printed one label for
  // everything would be caught here rather than agreeing with itself.
  const group = activityCard(page, ACTIVITIES.find(one => one.type === 'group').name);
  await expect(group.getByText('งานกลุ่ม')).toBeVisible();
  await expect(group.getByText('100', { exact: true })).toBeVisible();

  const dates = unmarkedActivityDates(answered.section.academic_year);
  for (const value of [dates.announcement_date, dates.deadline_date]) {
    const drawn = new Date(value).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    await expect(fixture.getByText(drawn)).toBeVisible();
  }

  // And the seeded work, which carries no dates, says so with a dash.
  const undated = activityCard(page, 'สอบกลางภาค');
  await expect(undated.getByText('งานเดี่ยว')).toBeVisible();
  expect(await undated.getByText('—').count()).toBe(2);
});

test('row 5: the one activity nothing points at can be deleted, and takes only itself', async ({
  page,
}) => {
  // The third criterion. Everything else in the seed carries a cohort's
  // marks, so this row is the only successful delete a browser can make —
  // which is why the seed plants a row nothing points at.
  //
  // It also *spends* that row: the schema is reseeded per run, so every row
  // that needs the fixture is declared above this one.
  const section = await asTeacherOne(page);
  const answered = await (await openActivities(page, section)).json();
  const target = deletableName(answered.section);

  const before = await namesOnScreen(page);
  expect(before).toContain(target);

  expect((await removeActivity(page, target)).status()).toBe(204);
  await expect.poll(() => namesOnScreen(page)).toEqual(before.filter(name => name !== target));
  await expect(activityCard(page, target)).toHaveCount(0);
});

test('row 6: the confirmation decides it — cancelling removes nobody', async ({ page }) => {
  // The dialog's wording is the walk's; what the browser can prove is that
  // ยกเลิก sends nothing at all.
  const section = await asTeacherOne(page);
  await openActivities(page, section);
  const before = await namesOnScreen(page);

  expect(await removeActivity(page, 'สอบกลางภาค', { confirm: false })).toEqual([]);
  await expect(activityCard(page, 'สอบกลางภาค')).toHaveCount(1);
  expect(await namesOnScreen(page)).toEqual(before);
});

test('row 7: work that has been marked is refused, in the server\'s words', async ({ page }) => {
  // The fourth and sixth criteria in front of a person: the marks CASCADE, so
  // the refusal is the only thing between a press and a cohort's marks. The
  // count in the sentence is the server's own.
  const section = await asTeacherOne(page);
  const answered = await (await openActivities(page, section)).json();
  const marked = answered.activities.find(one => one.activity_name === 'สอบกลางภาค');

  const refused = await removeActivity(page, 'สอบกลางภาค');
  expect(refused.status()).toBe(400);
  const message = (await refused.json()).message;
  expect(message).toMatch(/^กิจกรรมนี้มีคะแนนที่บันทึกไว้แล้ว \d+ รายการ/);
  await expect(page.getByText(message)).toBeVisible();
  await expect(activityCard(page, marked.activity_name)).toHaveCount(1);
});

test('row 8: a section that is somebody else\'s hides the work too', async ({ page, browser }) => {
  // The ninth criterion, at the address a person could type. The register
  // decides (ADR-0002), and the refusal reaches the page rather than an empty
  // list pretending to be an empty Section.
  const elsewhere = await browser.newContext();
  const owner = await elsewhere.newPage();
  const theirs = await asTeacherOne(owner);
  await elsewhere.close();

  await signIn(page, ACCOUNTS.teacherTwo);
  const answer = await openActivities(page, theirs);

  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound)).toBeVisible();
  expect(await namesOnScreen(page)).toEqual([]);
});

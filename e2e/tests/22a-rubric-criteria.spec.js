'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { settled } = require('../support/pager');
const {
  openRubrics,
  rubricRow,
  addRubric,
  startRemoval: startRubricRemoval,
  confirmRemoval: confirmRubricRemoval,
  criteriaLink,
} = require('../support/rubrics-screen');
const {
  table,
  openCriteriaVia,
  openCriteriaAt,
  criterionRow,
  openAddForm,
  openEditor,
  addCriterion,
  fillCriterion,
  save,
  startRemoval,
  confirmRemoval,
  listedNames,
} = require('../support/rubric-criteria-screen');

/**
 * docs/acceptance/22-rubric-criteria.md — what a Rubric scores on, read through
 * the screen that keeps it.
 *
 * The backend suite already proves what the routes answer. What only a browser
 * can show is the half these rows are about: that #21's list actually leads
 * here and lands on the right rubric, that a criterion written through the form
 * appears with its weight and all four of its bands, that the order the
 * committee set is the order the table draws, that a criterion cannot be
 * removed without being asked about first, and that a person who types another
 * curriculum's rubric into the address bar is refused *in words* rather than
 * shown an empty table that would read as "this rubric has no criteria".
 *
 * Whether the four band columns are *labelled* with what each band means, and
 * whether the confirmation reads like a warning, are appearance and stay
 * hand-walked rows.
 *
 * `mode: 'serial'` because these rows build one rubric up and take it away
 * again, and each still makes the state it asserts on rather than inheriting an
 * assertion from the row above it.
 *
 * **This file works inside a rubric it makes itself.** #21's rows already
 * delete a seeded rubric, and the seed is laid down once per run rather than
 * once per file, so a row here that added a criterion to RUB-02 would change a
 * number another spec asserts. `MINE` is made in the first row and removed in
 * the last.
 */
test.describe.configure({ mode: 'serial' });

/** The rubric this file adds to 0501, works inside, and takes away again. */
const MINE = 'RUB-Y1';

const BANDS = [
  'อธิบายได้ครบและยกตัวอย่างประกอบ',
  'อธิบายได้ครบ',
  'อธิบายได้บางส่วน',
  'ยังอธิบายไม่ได้',
];

const criterion = (name, overrides = {}) => ({
  th: name,
  en: `${name} in English`,
  weight: 10,
  order: 1,
  bands: BANDS,
  ...overrides,
});

/** The id the browser is on, which is the id the route was authorised against. */
const rubricIdOf = page => page.url().match(/rubrics\/(\d+)\/criteria/)[1];

test('the way in from the rubric list lands on that rubric, and an empty one says so', async ({
  page,
}) => {
  // #21's fifth criterion meeting #22's first: the link that row offers is a
  // way in, and what it opens is this rubric rather than the list of them.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  const created = await addRubric(page, {
    code: MINE,
    th: 'การอธิบายเหตุผลเชิงวิศวกรรม',
    en: 'Engineering reasoning',
    // Order 0 and not a high one: 0501 holds eleven rubrics and the list pages
    // at ten, so a twelfth ordered last would be on the second page and every
    // row below would have to walk there first. Nothing here is about paging.
    order: 0,
  });
  expect(created.status()).toBe(201);

  await expect(criteriaLink(page, MINE)).toHaveText(/ยังไม่มีเกณฑ์/);
  await openCriteriaVia(page, rubricRow(page, MINE));

  await expect(
    page.getByRole('heading', { name: new RegExp(`เกณฑ์การให้คะแนนของ Rubric ${MINE}`) }),
  ).toBeVisible();
  await expect(page.getByText('การอธิบายเหตุผลเชิงวิศวกรรม')).toBeVisible();
  await expect(page.getByText('ยังไม่มีเกณฑ์การให้คะแนนใน Rubric นี้')).toBeVisible();
});

test('a criterion is added through the form, with its weight and all four bands', async ({
  page,
}) => {
  // The ticket's first, second and third criteria, in the half a browser
  // shows: the row that comes back carries the number the person typed and the
  // four sentences they wrote, rather than only the two names.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));
  await openCriteriaVia(page, rubricRow(page, MINE));

  // Not there until it is saved: the form is opened and filled and the table
  // behind it still has nothing in it.
  await openAddForm(page);
  await fillCriterion(page, criterion('ZQ1 ความถูกต้องของเนื้อหา', { weight: 40, order: 10 }));
  await expect(criterionRow(page, 'ZQ1 ความถูกต้องของเนื้อหา')).toHaveCount(0);

  const answer = await save(page);
  expect(answer.status()).toBe(201);

  const row = criterionRow(page, 'ZQ1 ความถูกต้องของเนื้อหา');
  await expect(row).toContainText('ZQ1 ความถูกต้องของเนื้อหา in English');
  await expect(row).toContainText('40');
  for (const band of BANDS) await expect(row).toContainText(band);

  await expect(page.getByText('Rubric นี้มีเกณฑ์การให้คะแนน 1 ข้อ')).toBeVisible();
});

test('the criteria are in the order the committee set, and a tie is settled', async ({ page }) => {
  // The ticket's fourth criterion. The two tied criteria are written in the
  // order that would put them the wrong way round if the list came back by
  // name, and the third is given an order that puts it above a criterion
  // written before it - so a table that ignored ลำดับ fails here rather than
  // passing by luck.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));
  await openCriteriaVia(page, rubricRow(page, MINE));

  await addCriterion(page, criterion('ZQ3 การนำเสนอ', { order: 20 }));
  await addCriterion(page, criterion('ZQ2 การอ้างอิง', { order: 20 }));
  await addCriterion(page, criterion('ZQ4 ความสมบูรณ์', { order: 5 }));

  await expect(criterionRow(page, 'ZQ4 ความสมบูรณ์')).toBeVisible();
  expect(await listedNames(page)).toEqual([
    'ZQ4 ความสมบูรณ์',
    'ZQ1 ความถูกต้องของเนื้อหา',
    'ZQ3 การนำเสนอ',
    'ZQ2 การอ้างอิง',
  ]);
});

test('an edit is saved, and the row afterwards is the row that was edited', async ({ page }) => {
  // The first criterion's middle verb. The editor reads the criterion back
  // from the server rather than editing the row the table was holding, so what
  // is in the boxes is what is in the database now.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));
  await openCriteriaVia(page, rubricRow(page, MINE));

  await openEditor(page, 'ZQ2 การอ้างอิง');
  await fillCriterion(page, criterion('ZQ2 การอ้างอิงและบรรณานุกรม', { weight: 15.5, order: 20 }));
  const answer = await save(page);
  expect(answer.status()).toBe(200);

  // Read as the first line of the first cell rather than as a row containing
  // the text: that cell holds the Thai name *and* the English one, so a filter
  // by text matches a row whose Thai name never changed as long as its English
  // name did - which is exactly what a PUT that dropped one field would leave
  // behind, and it would pass.
  const names = await listedNames(page);
  expect(names).toContain('ZQ2 การอ้างอิงและบรรณานุกรม');
  expect(names).not.toContain('ZQ2 การอ้างอิง');
  await expect(criterionRow(page, 'ZQ2 การอ้างอิงและบรรณานุกรม')).toContainText('15.5');
});

test('the rubric list counts what this screen wrote', async ({ page }) => {
  // Where the two tickets meet. #21's list shows how many criteria a rubric
  // holds, and that number is a subquery over the table this screen writes -
  // so a rubric that read ยังไม่มีเกณฑ์ in the first row of this file now says
  // how many there are.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  await expect(criteriaLink(page, MINE)).toHaveText(/ดูเกณฑ์ 4 ข้อ/);
});

test('removal asks first, and answering no leaves the criterion where it was', async ({ page }) => {
  // The ticket's fifth criterion, in the half a browser can assert. What the
  // dialog *says* - that the four descriptions go with it and that it cannot be
  // undone - is a hand-walked row.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));
  await openCriteriaVia(page, rubricRow(page, MINE));

  await startRemoval(page, 'ZQ3 การนำเสนอ');
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(criterionRow(page, 'ZQ3 การนำเสนอ')).toBeVisible();

  await startRemoval(page, 'ZQ3 การนำเสนอ');
  await confirmRemoval(page);

  await expect(criterionRow(page, 'ZQ3 การนำเสนอ')).toHaveCount(0);
  await expect(page.getByText('ลบเกณฑ์ ZQ3 การนำเสนอ เรียบร้อยแล้ว')).toBeVisible();
  // The others are untouched: a removal that took the rubric's criteria with it
  // would satisfy the line above and be a different, much worse screen.
  await expect(criterionRow(page, 'ZQ1 ความถูกต้องของเนื้อหา')).toBeVisible();
  await expect(page.getByText('Rubric นี้มีเกณฑ์การให้คะแนน 3 ข้อ')).toBeVisible();
});

test('another curriculum’s rubric is refused in words, not shown as an empty one', async ({
  page,
}) => {
  // The ticket's sixth criterion, enforced at the server and read by the person
  // who typed the address. An empty table would say "this rubric has no
  // criteria", which is a different statement and a false one - and would tell
  // a caller that the id they guessed at exists.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));
  await openCriteriaVia(page, rubricRow(page, MINE));
  const mineId = rubricIdOf(page);

  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.committee0503);

  const answer = await openCriteriaAt(page, mineId);
  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.rubricNotFound)).toBeVisible();
  await expect(table(page)).toHaveCount(0);
});

test('the accounts this screen is not for are refused it, not merely kept off its menu', async ({
  page,
}) => {
  // #79 one tier down, for the faculty administrator; ADR-0002 for the central
  // administrator; and "marking against a rubric is not writing one" for the
  // ผู้สอน. None of the three has a menu entry that leads here, and none of
  // them is stopped by that - this is what stops them.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));
  await openCriteriaVia(page, rubricRow(page, MINE));
  const mineId = rubricIdOf(page);

  for (const account of [ACCOUNTS.facultyAdmin, ACCOUNTS.systemAdmin, ACCOUNTS.teacherOne]) {
    await page.context().clearCookies();
    await signIn(page, account);

    const answer = await openCriteriaAt(page, mineId);
    expect(answer.status(), `${account} should be refused`).toBe(403);
    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
    await expect(table(page)).toHaveCount(0);
  }
});

test('the rubric goes, and takes the criteria written here with it', async ({ page }) => {
  // #21's deletion, proved against criteria this file wrote rather than against
  // the seed's. It is also how this file leaves the database as it found it:
  // the rubric it made is the only thing it added.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  await startRubricRemoval(page, MINE);
  await confirmRubricRemoval(page);

  await expect(rubricRow(page, MINE)).toHaveCount(0);
  await expect(page.getByText(/เกณฑ์การให้คะแนน 3 ข้อ/)).toBeVisible();
});

test('a rubric that was never made answers the same way as one out of reach', async ({ page }) => {
  // Both are 404 and both say the same sentence, which is the point: telling
  // them apart would turn the address bar into a way of learning which rubrics
  // exist and which curriculum keeps them.
  await signIn(page, ACCOUNTS.committee0501);

  const answer = await openCriteriaAt(page, 99999999);
  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.rubricNotFound)).toBeVisible();
});

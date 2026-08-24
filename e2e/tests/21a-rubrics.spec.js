'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { RUBRICS: SEEDED, RUBRICS_INTL } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { reading, keysOn, step, settled } = require('../support/pager');
const {
  RUBRICS,
  table,
  waitForList,
  openRubrics,
  rubricRow,
  openAddForm,
  openEditor,
  addRubric,
  save,
  startRemoval,
  confirmRemoval,
  listedCodes,
  filterTo,
  criteriaLink,
} = require('../support/rubrics-screen');

/**
 * docs/acceptance/21-rubrics.md — the scales a หลักสูตร marks against, read
 * through the screen that keeps them.
 *
 * The backend suite already proves what the routes answer. What only a browser
 * can show is the half these rows are about: that a code taken by a curriculum
 * this account cannot see is refused *with the sentence that explains why*,
 * that the list is in the order the committee set rather than the order of the
 * codes and stays settled where two rubrics claim the same place, that the
 * eleventh rubric is reachable by pressing ถัดไป, and that every row offers a
 * way into its criteria.
 *
 * Whether the confirmation *reads* like a warning about criteria that are about
 * to be destroyed is appearance, and stays a hand-walked row. That the deletion
 * happens and reports what went is here.
 *
 * `mode: 'serial'` because these rows add a rubric, edit it and take it away
 * again, and because the paging rows read a total the later rows change. Each
 * still makes the state it asserts on rather than inheriting an assertion from
 * the row above it. The paging rows come first for that reason: a row that
 * deleted a seeded rubric before them would leave ten, and a list of ten does
 * not page at all.
 */
test.describe.configure({ mode: 'serial' });

/** The rubric this file adds to 0501 and takes away again. */
const MINE = 'RUB-Z1';

/** A seeded rubric of 0501 that the seed gave criteria to — see RUBRICS. */
const WITH_CRITERIA = SEEDED.find(entry => entry.criteria > 0);

test('a committee member is told which curriculum is theirs, and sees its rubrics', async ({
  page,
}) => {
  // The first criterion's setting, and the seventh as the person meets it: one
  // curriculum in reach is stated rather than asked about.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);

  await expect(page.getByText('0501 วิศวกรรมคอมพิวเตอร์', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);

  await expect(rubricRow(page, SEEDED[0].code)).toContainText(SEEDED[0].th);
  await expect(rubricRow(page, SEEDED[0].code)).toContainText(SEEDED[0].en);
});

test('the list is in the stated order, not in the order of the codes', async ({ page }) => {
  // The fourth criterion's *respected*. The seed sorts RUB-02 above RUB-01 and
  // RUB-05 above RUB-04 for this row specifically — #96's lesson, learned in
  // #19 where every seeded order equalled the number in its own code and an
  // assertion on either ordering passed whichever the screen actually used.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  const codes = await listedCodes(page);
  expect(codes.indexOf('RUB-02')).toBeLessThan(codes.indexOf('RUB-01'));
  expect(codes.indexOf('RUB-05')).toBeLessThan(codes.indexOf('RUB-04'));
});

test('two rubrics claiming the same place are drawn in a settled order', async ({ page }) => {
  // `display_order` is NOT NULL DEFAULT 0, so a tie is the state every rubric
  // starts out in rather than an edge case, and this list pages. RUB-06 and
  // RUB-07 share an order in the seed so the tiebreak has something to break;
  // unsettled, they can appear either way round and — across a page boundary —
  // one of them twice and the other never.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  const tied = SEEDED.filter(entry => entry.order === 6).map(entry => entry.code);
  expect(tied, 'the seed no longer holds a tie for this row to read').toHaveLength(2);

  const codes = await listedCodes(page);
  expect(codes.indexOf(tied[1]) - codes.indexOf(tied[0])).toBe(1);
});

test('the eleventh rubric is on the second page, and no rubric is on both', async ({ page }) => {
  // The eighth criterion. The seed holds eleven rubrics for this curriculum
  // because ten would let a broken pager draw itself, say "หน้า 1 จาก 1", and
  // pass every assertion about it.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);

  const first = await reading(page, table(page));
  expect(first.total).toBeGreaterThan(10);
  expect(first.pages).toBeGreaterThan(1);
  const firstKeys = await keysOn(table(page));
  expect(firstKeys).toHaveLength(10);

  await step(page, 'forward', waitForList);
  const second = await reading(page, table(page));
  expect(second.shown).toBe(2);
  const secondKeys = await keysOn(table(page));
  expect(secondKeys.length).toBeGreaterThan(0);

  // Different pages of one list are different pages only if their keys are
  // disjoint. This is the assertion an unsettled tie fails.
  expect(firstKeys.filter(code => secondKeys.includes(code))).toEqual([]);
  expect(new Set([...firstKeys, ...secondKeys]).size).toBe(first.total);
});

test('every rubric offers a way into its criteria, and the way carries the rubric', async ({
  page,
}) => {
  // The fifth criterion. The criteria themselves are #22 and the destination
  // says so; what this screen owes the ticket is that each row has a door and
  // that the door leads to *that* rubric rather than to a screen that would
  // then have to ask which one.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  const rows = await page.locator('table tbody tr').count();
  expect(await page.locator('table tbody tr').getByRole('link').count()).toBe(rows);

  // The count the row reads out is the number of criteria the seed gave it, so
  // the door is labelled with what is behind it rather than with a guess.
  await expect(criteriaLink(page, WITH_CRITERIA.code)).toContainText(
    String(WITH_CRITERIA.criteria),
  );
  await expect(criteriaLink(page, 'RUB-03')).toContainText('ยังไม่มีเกณฑ์');

  await criteriaLink(page, WITH_CRITERIA.code).click();
  await expect(page).toHaveURL(/\/main\/rubrics\/[0-9]+\/criteria$/);
});

test('a rubric is added through the form, edited, and is not there until it is saved', async ({
  page,
}) => {
  // The first criterion, and the shape of it a browser can see: opening the
  // form is not creating anything.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));
  const before = await listedCodes(page);

  await openAddForm(page);
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await settled(table(page));
  expect(await listedCodes(page)).toEqual(before);

  // Order 0 so the new rubric sorts to the top of the first page. Saving does
  // not carry the screen to whichever page the row landed on - no paged screen
  // on this system does - so a row that gave it order 91 would be asserting
  // that a rubric on page two is invisible, which is true and is not what this
  // row is about. docs/acceptance/21 records the gap.
  await addRubric(page, {
    code: MINE,
    th: 'เกณฑ์ที่เพิ่มระหว่างการทดสอบ',
    en: 'Rubric added under test',
    order: 0,
  });
  await expect(rubricRow(page, MINE)).toBeVisible();
  await expect(rubricRow(page, MINE)).toContainText('เกณฑ์ที่เพิ่มระหว่างการทดสอบ');

  await openEditor(page, MINE);
  await page.getByPlaceholder('เช่น การนำเสนอผลงาน').fill('เกณฑ์ที่ถูกแก้ไขแล้ว');
  await save(page);
  await expect(rubricRow(page, MINE)).toContainText('เกณฑ์ที่ถูกแก้ไขแล้ว');
});

test('a code held by a curriculum this account cannot see is refused, and the sentence says why', async ({
  page,
}) => {
  // The second criterion, in the direction that only a browser can show the
  // consequence of. `rubric_code` is UNIQUE across the institution, so 0503's
  // committee member cannot have RUB-01 — and cannot see the row that holds it
  // either. The refusal is the only thing that tells them the code is gone, so
  // it has to say ทั้งระบบ or they search their own eleven-row list, find it
  // free, and conclude the screen is broken.
  await signIn(page, ACCOUNTS.committee0503);
  await openRubrics(page);
  await settled(table(page));

  await expect(rubricRow(page, SEEDED[0].code)).toHaveCount(0);

  const refused = await addRubric(page, {
    code: SEEDED[0].code,
    th: 'ชื่ออื่น',
    en: 'Another name',
    order: 92,
  });
  expect(refused.status()).toBe(409);
  // The whole sentence, not a fragment of it: the form's own hint says ทั้งระบบ
  // too, so a match on that word alone would pass against a screen that had
  // refused silently and left the hint on display.
  await expect(page.getByText(REFUSALS.duplicateRubricCode)).toBeVisible();
});

test('a department administrator reaches both curricula, and the filter narrows to one', async ({
  page,
}) => {
  // The seventh criterion from above. The two curricula hold disjoint codes,
  // which is the difference from #19 the walk sheet is careful about.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openRubrics(page);

  await filterTo(page, '0503');
  await settled(table(page));
  expect(await listedCodes(page)).toEqual(
    [...RUBRICS_INTL].sort((a, b) => a.order - b.order).map(entry => entry.code),
  );

  await filterTo(page, '0501');
  await settled(table(page));
  await expect(rubricRow(page, SEEDED[0].code)).toHaveCount(1);
  await expect(rubricRow(page, RUBRICS_INTL[0].code)).toHaveCount(0);
});

test('removal asks first, and answering no leaves the rubric where it was', async ({ page }) => {
  // The sixth criterion, in the half a browser can assert. What the dialog
  // *says* — that the criteria go too and that it cannot be undone — is a
  // hand-walked row.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  await startRemoval(page, MINE);
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(rubricRow(page, MINE)).toBeVisible();

  await startRemoval(page, MINE);
  await confirmRemoval(page);
  await expect(rubricRow(page, MINE)).toHaveCount(0);
});

test('removing a rubric that has criteria says how many went with it', async ({ page }) => {
  // The one thing on this screen that cannot be undone. Nothing points at a
  // rubric except its own criteria and those CASCADE, so there is no
  // "switched off instead" branch to fall into — and a banner that said only
  // ลบแล้ว over three destroyed criteria would be telling half the truth.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  await expect(criteriaLink(page, WITH_CRITERIA.code)).toContainText(
    String(WITH_CRITERIA.criteria),
  );

  await startRemoval(page, WITH_CRITERIA.code);
  await confirmRemoval(page);

  await expect(rubricRow(page, WITH_CRITERIA.code)).toHaveCount(0);
  await expect(
    page.getByText(new RegExp(`เกณฑ์การให้คะแนน ${WITH_CRITERIA.criteria} ข้อ`)),
  ).toBeVisible();
});

test('the accounts this screen is not for are refused it, not merely kept off its menu', async ({
  page,
}) => {
  // #79 for the faculty administrator - the faculty keeps the list of
  // หลักสูตร and what is inside one is decided below it - ADR-0002 for the
  // central administrator, and "marking against a rubric is not writing one"
  // for the ผู้สอน. The menu entry each of them lacks is a convenience; this is
  // the rule, and it holds for an account that typed the address.
  for (const account of [ACCOUNTS.facultyAdmin, ACCOUNTS.systemAdmin, ACCOUNTS.teacherOne]) {
    await page.context().clearCookies();
    await signIn(page, account);

    const [answer] = await Promise.all([waitForList(page), page.goto(RUBRICS)]);
    expect(answer.status(), `${account} should be refused`).toBe(403);
    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();

    // The screen is this screen, drawn and empty, rather than a redirect
    // somewhere else that would satisfy the line above by never having asked.
    await expect(
      page.getByRole('heading', { name: 'ข้อมูล Rubric กลาง', exact: true }),
    ).toBeVisible();
    await expect(rubricRow(page, 'RUB-02')).toHaveCount(0);
  }
});

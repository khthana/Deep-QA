'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { PLOS: SEEDED, PLOS_INTL } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  PLOS,
  waitForList,
  openPlos,
  ploRow,
  parentPicker,
  statusPicker,
  offeredLabels,
  openAddForm,
  openEditor,
  addOutcome,
  save,
  startRemoval,
  confirmRemoval,
  listedCodes,
  filterTo,
} = require('../support/plos-screen');

/**
 * docs/acceptance/19-programme-learning-outcomes.md — what a graduate of a
 * หลักสูตร can do, read through the screen that says so.
 *
 * The backend suite already proves what the routes answer. What only a browser
 * can show is the half these rows are about: that the same รหัส really does
 * name two different outcomes in two curricula, that a ข้อย่อย is drawn
 * directly under the ข้อหลัก it belongs to and moves when its ลำดับ changes,
 * that the ข้อหลัก picker will not offer a choice the server would refuse, and
 * that a removal comes back as one of three different things.
 *
 * Whether the nesting is *visible* - the indent, the rule down the left, the
 * word ข้อย่อย - is appearance, and stays a hand-walked row. What is here is
 * the order the rows are in, which is the half a browser can assert.
 *
 * `mode: 'serial'` because these rows build a small tree and then take it
 * apart. Each still makes the state it asserts on rather than inheriting an
 * assertion from the row above it.
 *
 * Row 9 switches a *seeded* outcome off and back on again, which is the only
 * way to reach the deactivation branch from a browser: nothing points at an
 * outcome this file could make, because the screen that maps รายวิชา onto them
 * is #20 and does not exist yet. It restores what it changed in the same row,
 * for the reason it is testing - that being switched off is not a one-way door.
 */
test.describe.configure({ mode: 'serial' });

/** The tree this file builds in 0501 and takes apart again. */
const MAIN = 'PLO-Z1';
const FIRST = 'PLO-Z1-1';
const SECOND = 'PLO-Z1-2';

/** A seeded outcome of 0501 that a รายวิชา maps onto — see PLO_MAPPING. */
const MAPPED = 'PLO-12';

test('a committee member is told which curriculum is theirs, and sees its own PLO-1', async ({
  page,
}) => {
  // The first criterion's setting, and the eighth as the person meets it: one
  // curriculum in reach is stated rather than asked about.
  await signIn(page, ACCOUNTS.committee0501);
  await openPlos(page);

  await expect(page.getByText('0501 วิศวกรรมคอมพิวเตอร์', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);

  await expect(ploRow(page, 'PLO-1')).toContainText(SEEDED[0].title);
});

test('the other curriculum holds its own PLO-1, and it is a different outcome', async ({ page }) => {
  // The fifth criterion, through the screen. The inherited schema made
  // outcome_code globally unique; had that survived, one of these two rows
  // could not exist.
  await signIn(page, ACCOUNTS.committee0503);
  await openPlos(page);

  await expect(page.getByText('0503 วิศวกรรมคอมพิวเตอร์ (หลักสูตรนานาชาติ)')).toBeVisible();
  await expect(ploRow(page, 'PLO-1')).toContainText(PLOS_INTL[0].title);
  await expect(ploRow(page, 'PLO-1')).not.toContainText(SEEDED[0].title);
});

test('the list is in the stated order, not in the order of the codes', async ({ page }) => {
  // The fourth criterion, on the only seeded rows where the two orderings
  // disagree: PLO-2 is given ลำดับ 1 and PLO-1 is given 2.
  await signIn(page, ACCOUNTS.committee0503);
  await openPlos(page);

  const codes = await listedCodes(page);
  expect(codes.indexOf('PLO-2')).toBeLessThan(codes.indexOf('PLO-1'));
  // And its own ข้อย่อย follow it, before PLO-1 begins.
  expect(codes.indexOf('PLO-2-1')).toBe(codes.indexOf('PLO-2') + 1);
  expect(codes.indexOf('PLO-2-2')).toBe(codes.indexOf('PLO-2') + 2);
});

test('an outcome is added, then a second added under it, and the child follows its parent', async ({
  page,
}) => {
  // The first and second criteria. Whether the nesting is drawn *visibly* is a
  // hand-walked row; that the child is in the right place is this one.
  await signIn(page, ACCOUNTS.committee0501);
  await openPlos(page);

  await addOutcome(page, {
    code: MAIN,
    title: 'ผลการเรียนรู้ที่เพิ่มระหว่างการทดสอบ',
    type: 'skills',
    order: 91,
  });
  await expect(ploRow(page, MAIN)).toBeVisible();

  await addOutcome(page, {
    code: SECOND,
    title: 'ข้อย่อยที่สอง',
    type: 'skills',
    order: 2,
    parent: MAIN,
  });
  await addOutcome(page, {
    code: FIRST,
    title: 'ข้อย่อยที่หนึ่ง',
    type: 'skills',
    order: 1,
    parent: MAIN,
  });

  const codes = await listedCodes(page);
  expect(codes.indexOf(FIRST)).toBe(codes.indexOf(MAIN) + 1);
  expect(codes.indexOf(SECOND)).toBe(codes.indexOf(MAIN) + 2);
});

test('changing the display order moves the row', async ({ page }) => {
  // The fourth criterion's *settable* half, asserted as a move rather than as a
  // number: the two ข้อย่อย swap places and stay under their ข้อหลัก.
  await signIn(page, ACCOUNTS.committee0501);
  await openPlos(page);

  await openEditor(page, FIRST);
  await page.locator('input[type="number"]').fill('3');
  await save(page);

  const codes = await listedCodes(page);
  expect(codes.indexOf(SECOND)).toBe(codes.indexOf(MAIN) + 1);
  expect(codes.indexOf(FIRST)).toBe(codes.indexOf(MAIN) + 2);
});

test('the parent picker offers neither the outcome being edited nor anything under it', async ({
  page,
}) => {
  // The refusal the server makes, kept off the screen in the first place: a
  // picker that offers a choice the server will turn down is a picker that lies.
  await signIn(page, ACCOUNTS.committee0501);
  await openPlos(page);

  await openEditor(page, MAIN);
  const offered = await offeredLabels(parentPicker(page));
  expect(offered.some(label => label.includes(MAIN))).toBe(false);
  expect(offered.some(label => label.includes(FIRST))).toBe(false);
  // The seeded outcomes of the same curriculum are still there to choose from.
  expect(offered.some(label => label.includes('PLO-3'))).toBe(true);
});

test('removal asks first, and answering no leaves the outcome where it was', async ({ page }) => {
  // The seventh criterion, in the half a browser can assert. What the dialog
  // *says* is a hand-walked row.
  await signIn(page, ACCOUNTS.committee0501);
  await openPlos(page);

  await startRemoval(page, FIRST);
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(ploRow(page, FIRST)).toBeVisible();
});

test('a main outcome with sub-outcomes is refused, and goes once they do', async ({ page }) => {
  // Not in the ticket, and a decision - see the note on `ploHasChildren`. The
  // sentence has to be the one that says what to do, because every other
  // removal on this screen quietly succeeds at something else instead.
  await signIn(page, ACCOUNTS.committee0501);
  await openPlos(page);

  await startRemoval(page, MAIN);
  await confirmRemoval(page);
  await expect(page.getByText(REFUSALS.ploHasChildren)).toBeVisible();
  await expect(ploRow(page, MAIN)).toBeVisible();

  for (const code of [FIRST, SECOND]) {
    await startRemoval(page, code);
    await confirmRemoval(page);
    await expect(ploRow(page, code)).toHaveCount(0);
  }

  await startRemoval(page, MAIN);
  await confirmRemoval(page);
  await expect(ploRow(page, MAIN)).toHaveCount(0);
});

test('an outcome a subject maps onto is switched off rather than deleted, and switched back on', async ({
  page,
}) => {
  // The sixth criterion, and the way back from it. This row restores what it
  // changes: see the note at the top of the file.
  await signIn(page, ACCOUNTS.committee0501);
  await openPlos(page);

  // Its ข้อย่อย go first, and they go for real: nothing points at them, so each
  // is a plain 204. That is the point of doing it here rather than assuming -
  // every seeded ข้อหลัก has ข้อย่อย, so without this the removal below
  // would meet the refusal row 8 is about and never reach the branch this row
  // is about. Two different answers to the same button, one after the other.
  for (const sub of [`${MAPPED}-1`, `${MAPPED}-2`]) {
    await startRemoval(page, sub);
    await confirmRemoval(page);
    await expect(ploRow(page, sub)).toHaveCount(0);
  }

  await startRemoval(page, MAPPED);
  await confirmRemoval(page);
  await expect(page.getByText(/ปิดการใช้งานแทนการลบ/)).toBeVisible();
  await expect(ploRow(page, MAPPED)).toContainText('ปิดใช้งาน');

  await openEditor(page, MAPPED);
  await statusPicker(page).selectOption('active');
  await save(page);
  await expect(ploRow(page, MAPPED)).toContainText('ใช้งานอยู่');
});

test('a department administrator reaches both curricula, and each keeps its own codes', async ({
  page,
}) => {
  // The eighth criterion from above: the same รหัส in two curricula are two
  // rows, and narrowing to one shows one of them.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openPlos(page);

  await filterTo(page, '0503');
  await expect(ploRow(page, 'PLO-1')).toHaveCount(1);
  await expect(ploRow(page, 'PLO-1')).toContainText(PLOS_INTL[0].title);

  await filterTo(page, '0501');
  await expect(ploRow(page, 'PLO-1')).toHaveCount(1);
  await expect(ploRow(page, 'PLO-1')).toContainText(SEEDED[0].title);
});

test('the accounts this screen is not for are refused it, not merely kept off its menu', async ({
  page,
}) => {
  // #79 for the faculty administrator - the faculty keeps the list of
  // หลักสูตร and what is inside one is decided below it - ADR-0002 for the
  // central administrator, and "serving an outcome is not writing one" for the
  // ผู้สอน. The menu entry each of them lacks is a convenience; this is the rule,
  // and it holds for an account that reached the screen by typing its address.
  for (const account of [ACCOUNTS.facultyAdmin, ACCOUNTS.systemAdmin, ACCOUNTS.teacherOne]) {
    await page.context().clearCookies();
    await signIn(page, account);

    const [answer] = await Promise.all([waitForList(page), page.goto(PLOS)]);
    expect(answer.status(), `${account} should be refused`).toBe(403);
    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();

    // The screen is this screen, drawn and empty, rather than a redirect
    // somewhere else that would satisfy the line above by never having asked.
    await expect(
      page.getByRole('heading', { name: 'ผลการเรียนรู้ระดับหลักสูตร', exact: true }),
    ).toBeVisible();
    await expect(ploRow(page, 'PLO-1')).toHaveCount(0);
  }
});

test('the add form starts empty and the outcome it makes is not there until it is saved', async ({
  page,
}) => {
  // The shape of the first criterion a browser can see: opening the form is not
  // creating anything, and cancelling leaves nothing behind.
  await signIn(page, ACCOUNTS.committee0501);
  await openPlos(page);
  const before = await listedCodes(page);

  await openAddForm(page);
  await page.getByRole('button', { name: 'ยกเลิก' }).click();

  expect(await listedCodes(page)).toEqual(before);
});

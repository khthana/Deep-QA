'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { downloadTemplate, headerOf, csv } = require('../support/import-panel');
const {
  pagerLine,
  previous,
  next,
  reading,
  keysOn,
  step,
  toLastPage,
} = require('../support/pager');
const users = require('../support/users-screen');
const departments = require('../support/departments-screen');
const programs = require('../support/programs-screen');
const subjects = require('../support/subjects-screen');

/**
 * docs/acceptance/57-pager.md — the shared paging control.
 *
 * #57 introduced no behaviour. It replaced five hand-written paging bars with
 * one component, and the whole of its acceptance is that every screen still
 * does exactly what it did. That is precisely the kind of claim a hand-walk
 * proves once and cannot keep proving, which is why it is here.
 *
 * Two things this file is careful about.
 *
 * **It owns its data.** `57a` sorts after every `16x` and `18x` file under one
 * worker, so a row that read "ten on the page" from what those left behind
 * would be a row whose meaning depends on files it never mentions. Every count
 * is measured against what the table holds at that moment, and every code this
 * file writes is in a range no other spec uses — `Z…` for departments,
 * `ZP…` for curricula, `010797…` for subjects.
 *
 * **Order inside a row matters.** "หน้าถัดไปคือคนละชุด" is asserted before the
 * line that reads "หน้า 2". A screen that stopped sending `page` would be
 * answered with page one, and `shown` would read 1 — so the label dies first
 * and the claim the row is actually about would have no evidence behind it.
 *
 * What stays outside the seam is colour. Every "ปุ่มเป็นสีจาง" is
 * `disabled:opacity-40` and is an appearance claim; `toBeDisabled()` proves
 * "กดไม่ได้" and says nothing about how it looks. Those rows are ⚙ with the
 * colour half written into the row, the way #14's and #18's mixed rows are.
 *
 * `mode: 'serial'` because these rows share four tables and assert counts on
 * them.
 */
test.describe.configure({ mode: 'serial' });

/** The codes each block below writes, in an order that sorts the way it reads. */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * How many rows to add so the last page holds exactly one.
 *
 * The delete-and-step-back rows need a last page with a single row on it, and
 * how many that takes depends on what the specs before this one left in the
 * table. Computed rather than hardcoded, for that reason.
 */
function toLeaveOneOnTheLastPage(before) {
  let add = (1 - (before % 10) + 10) % 10;
  if (add === 0) add = 10;
  while (before + add < 11) add += 10;
  return add;
}

test.describe('ผู้ใช้งานระบบ — the control itself', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.systemAdmin);
    await users.openUsers(page);
  });

  test('row 1: the first page is ten rows, and ก่อนหน้า cannot be pressed', async ({
    page,
  }) => {
    const { total, shown, pages } = await reading(page, users.listTable(page));

    // Ten, and not "all of them" - the seeded accounts alone are more than a
    // page and the specs before this one added more.
    expect(total).toBeGreaterThan(10);
    expect(await keysOn(users.listTable(page))).toHaveLength(10);

    // The line reads out where the reader is standing, and how far it goes.
    expect(shown).toBe(1);
    expect(pages).toBe(Math.ceil(total / 10));

    // There is no page before the first one.
    await expect(previous(page)).toBeDisabled();
  });

  test('row 1: ถัดไป is a different set of people, and ก่อนหน้า comes back', async ({
    page,
  }) => {
    const first = await keysOn(users.listTable(page));

    await step(page, 'forward', users.waitForList);
    const second = await keysOn(users.listTable(page));

    // First, because this is what the row claims. A screen that asked for page
    // one again would be answered, would draw the same ten people, and would
    // read "หน้า 1" - so the label below would fail before this did and the
    // row's own claim would go unproved.
    expect(second).not.toHaveLength(0);
    expect(second.filter(key => first.includes(key))).toEqual([]);

    await expect(pagerLine(page)).toContainText('หน้า 2 จาก');
    await expect(previous(page)).toBeEnabled();

    // And back is back: the same ten, in the same order.
    await step(page, 'back', users.waitForList);
    expect(await keysOn(users.listTable(page))).toEqual(first);
    await expect(pagerLine(page)).toContainText('หน้า 1 จาก');
  });

  test('row 1: the last page is the last one — ถัดไป cannot be pressed', async ({
    page,
  }) => {
    const pages = await toLastPage(page, users.listTable(page), users.waitForList);

    const { shown, total } = await reading(page, users.listTable(page));
    expect(shown).toBe(pages);

    // The page number did not run past the end, and the last page holds what
    // is left over rather than nothing.
    const left = total - (pages - 1) * 10;
    expect(await keysOn(users.listTable(page))).toHaveLength(left);

    await expect(next(page)).toBeDisabled();
  });

  test('row 9: an empty list reads หน้า 1 จาก 1, not จาก 0', async ({ page }) => {
    // A search nobody answers, which is the emptiest a list gets without
    // deleting anything.
    await users.search(page, 'zzz-nobody-by-this-name');

    // จาก 1 and not จาก 0. `Math.ceil(0 / 10)` is zero, and "หน้า 1 จาก 0" is
    // a page count that says the page the reader is on does not exist.
    await expect(pagerLine(page)).toHaveText('ทั้งหมด 0 รายการ · หน้า 1 จาก 1');

    // Neither direction leads anywhere from a list of nothing.
    await expect(previous(page)).toBeDisabled();
    await expect(next(page)).toBeDisabled();
  });
});

test.describe('ข้อมูลภาควิชา — row 3', () => {
  /** The codes this block writes. `Z…` sorts after everything already there. */
  let codes = [];

  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await departments.openDepartments(page);
  });

  test('row 3: more than ten departments page ten at a time', async ({ page }) => {
    const header = headerOf(await downloadTemplate(page));
    const { total: before } = await reading(page, departments.listTable(page));
    const add = toLeaveOneOnTheLastPage(before);
    codes = Array.from({ length: add }, (unused, i) => `Z${ALPHABET[i]}`);

    await departments.importDepartments(
      page,
      csv(header, ...codes.map((code, i) => `${code},ภาควิชาทดสอบแบ่งหน้า ${i},Paging Test ${i}`)),
    );
    await expect(page.getByText(`นำเข้าสำเร็จ ${add} รายการ`)).toBeVisible();

    await expect.poll(async () => (await reading(page, departments.listTable(page))).total).toBe(
      before + add,
    );
    expect(await keysOn(departments.listTable(page))).toHaveLength(10);

    const first = await keysOn(departments.listTable(page));
    await step(page, 'forward', departments.waitForList);
    const second = await keysOn(departments.listTable(page));
    expect(second.filter(key => first.includes(key))).toEqual([]);
    await expect(pagerLine(page)).toContainText('หน้า 2 จาก');

    await step(page, 'back', departments.waitForList);
    expect(await keysOn(departments.listTable(page))).toEqual(first);
  });

  test('row 3: deleting the last row of the last page steps back a page', async ({
    page,
  }) => {
    const pages = await toLastPage(page, departments.listTable(page), departments.waitForList);
    expect(pages).toBeGreaterThan(1);

    // One row, and it is one of this block's own - which is what the arithmetic
    // in the row above was for.
    const last = await keysOn(departments.listTable(page));
    expect(last).toEqual([codes[codes.length - 1]]);

    await departments.removeDepartment(page, last[0]);

    // Stepped back, rather than standing on a page that now reads
    // "ยังไม่มีภาควิชาในระบบ" - which is the table saying there are none when
    // there are eleven.
    const after = await reading(page, departments.listTable(page));
    expect(after.shown).toBe(pages - 1);
    expect(after.pages).toBe(pages - 1);
    expect(await keysOn(departments.listTable(page))).toHaveLength(10);
  });
});

test.describe('ข้อมูลหลักสูตร — row 4', () => {
  /** `ZP…`, which sorts after the seeded curricula and after nothing else. */
  let codes = [];

  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await programs.openPrograms(page);
  });

  test('row 4: more than ten curricula page ten at a time', async ({ page }) => {
    const header = headerOf(await downloadTemplate(page));
    const { total: before } = await reading(page, programs.listTable(page));
    const add = toLeaveOneOnTheLastPage(before);
    codes = Array.from({ length: add }, (unused, i) => `ZP${ALPHABET[i]}`);

    await programs.importPrograms(
      page,
      csv(
        header,
        ...codes.map(
          (code, i) => `${code},หลักสูตรทดสอบแบ่งหน้า ${i},Paging Test ${i},05,2565`,
        ),
      ),
    );
    await expect(page.getByText(`นำเข้าสำเร็จ ${add} รายการ`)).toBeVisible();

    await expect.poll(async () => (await reading(page, programs.listTable(page))).total).toBe(
      before + add,
    );
    expect(await keysOn(programs.listTable(page))).toHaveLength(10);

    const first = await keysOn(programs.listTable(page));
    await step(page, 'forward', programs.waitForList);
    const second = await keysOn(programs.listTable(page));
    expect(second.filter(key => first.includes(key))).toEqual([]);
    await expect(pagerLine(page)).toContainText('หน้า 2 จาก');

    await step(page, 'back', programs.waitForList);
    expect(await keysOn(programs.listTable(page))).toEqual(first);
  });

  test('row 4: deleting the last row of the last page steps back a page', async ({
    page,
  }) => {
    const pages = await toLastPage(page, programs.listTable(page), programs.waitForList);
    expect(pages).toBeGreaterThan(1);

    const last = await keysOn(programs.listTable(page));
    expect(last).toEqual([codes[codes.length - 1]]);

    // Nothing points at a curriculum imported a moment ago, so this is a
    // deletion and not the deactivation the screen falls back to.
    await programs.removeProgram(page, last[0]);
    await expect(page.getByText('ลบหลักสูตรเรียบร้อยแล้ว')).toBeVisible();

    const after = await reading(page, programs.listTable(page));
    expect(after.shown).toBe(pages - 1);
    expect(after.pages).toBe(pages - 1);
    expect(await keysOn(programs.listTable(page))).toHaveLength(10);
  });
});

test.describe('ข้อมูลรายวิชา — row 5', () => {
  test('row 5: the department administrator pages their own catalogue', async ({
    page,
  }) => {
    // `dept.admin.05@` and not `faculty.admin@`. The walk of 19 ส.ค. used the
    // faculty administrator, and #61 decided that post has no business on this
    // screen at all - which is why this row was unticked and became #63.
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await subjects.openSubjects(page);

    const header = headerOf(await downloadTemplate(page));
    const { total: before } = await reading(page, subjects.listTable(page));
    const add = Math.max(1, 11 - before);
    const codes = Array.from(
      { length: add },
      (unused, i) => `010797${String(i + 1).padStart(2, '0')}`,
    );

    await subjects.importSubjects(
      page,
      csv(header, ...codes.map((code, i) => `${code},รายวิชาทดสอบแบ่งหน้า ${i},Paging Test ${i},3,05,,`)),
    );
    await expect(page.getByText(`นำเข้าสำเร็จ ${add} รายการ`)).toBeVisible();

    await expect
      .poll(async () => (await reading(page, subjects.listTable(page))).total)
      .toBe(before + add);
    const { total, pages } = await reading(page, subjects.listTable(page));
    expect(pages).toBe(Math.ceil(total / 10));
    expect(await keysOn(subjects.listTable(page))).toHaveLength(10);

    const first = await keysOn(subjects.listTable(page));
    await step(page, 'forward', subjects.waitForList);
    const second = await keysOn(subjects.listTable(page));
    expect(second.filter(code => first.includes(code))).toEqual([]);

    // The numbers on the bar follow what is on the screen, which is all this
    // row asks - the department filter is #16's business, not this one's.
    await expect(pagerLine(page)).toContainText(`ทั้งหมด ${total} รายการ · หน้า 2 จาก ${pages}`);

    await step(page, 'back', subjects.waitForList);
    expect(await keysOn(subjects.listTable(page))).toEqual(first);
  });
});

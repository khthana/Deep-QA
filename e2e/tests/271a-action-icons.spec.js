'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openDepartments } = require('../support/departments-screen');
const { openPrograms } = require('../support/programs-screen');
const { openSubjects } = require('../support/subjects-screen');
const { openProgramSubjects } = require('../support/program-subjects-screen');
const { openUsers } = require('../support/users-screen');
const { openEditor: openGrants, grantsTable } = require('../support/grants-panel');
const { openOfferings } = require('../support/offerings-screen');
const { openPlos } = require('../support/plos-screen');
const { openRubrics, table: rubricsTable } = require('../support/rubrics-screen');
const { openCriteriaVia } = require('../support/rubric-criteria-screen');
const { openEnrolment, mySectionIds, listTable } = require('../support/enrolment-screen');

/**
 * docs/acceptance/271-action-icons.md — the row actions drawn as icons (#271).
 *
 * The owner's answer of 10 November 2569 restores the delivered system's
 * action column: an icon in a bordered square instead of a word, under a
 * header that reads ดำเนินการ. What a browser can hold of that is two
 * attributes and one absence, asked of every place the column is drawn:
 *
 *   - the button's **accessible name** is still the word it used to show,
 *     which is what tells four trash cans apart for anybody who cannot see
 *     them and what every other spec in this suite presses by;
 *   - its **title** - the tooltip - is that same word, which is what tells
 *     them apart for anybody who can;
 *   - and the word is **not drawn**: the button's own text is empty and it
 *     holds one icon.
 *
 * Eleven places, one row each. They share one component, so one mutant in it
 * kills all eleven, and that is the point of having eleven rows rather than
 * one (#191): each row's own claim is that its screen's way in arrives at the
 * component, which a screen still drawing its old text button would fail.
 *
 * What is not here is appearance - the colour of the border, which icon, the
 * header's wording and its alignment. Those are the sheet's walked rows.
 *
 * Where a button is disabled for the person's own account (ระงับ on their own
 * row, ยกเลิกบทบาท on their own grant) the tooltip carries the reason instead
 * of the word, by design; every row below presses past those by asking for an
 * enabled button.
 */

/** The three claims, about one button found by the word it stands for. */
async function isAnIcon(button, word) {
  await expect(button, `a button named ${word}`).toBeVisible();
  await expect(button, 'its tooltip is the word').toHaveAttribute('title', word);
  expect((await button.textContent()).trim(), 'the word is not drawn').toBe('');
  await expect(button.locator('svg'), 'it holds one icon').toHaveCount(1);
}

/** The first enabled button on the screen whose accessible name is exactly this. */
const named = (scope, word) =>
  scope.getByRole('button', { name: word, exact: true }).and(scope.locator(':enabled')).first();

test('row 1: ข้อมูลภาควิชา - แก้ไข and ลบ', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);
  await isAnIcon(named(page, 'แก้ไข'), 'แก้ไข');
  await isAnIcon(named(page, 'ลบ'), 'ลบ');
});

test('row 2: ข้อมูลหลักสูตร - แก้ไข and ลบ', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openPrograms(page);
  await isAnIcon(named(page, 'แก้ไข'), 'แก้ไข');
  await isAnIcon(named(page, 'ลบ'), 'ลบ');
});

test('row 3: ข้อมูลรายวิชา - แก้ไข and ลบ', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openSubjects(page);
  await isAnIcon(named(page, 'แก้ไข'), 'แก้ไข');
  await isAnIcon(named(page, 'ลบ'), 'ลบ');
});

test('row 4: รายวิชาในหลักสูตร - แก้ไข and นำออก', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);
  await isAnIcon(named(page, 'แก้ไข'), 'แก้ไข');
  await isAnIcon(named(page, 'นำออก'), 'นำออก');
});

test('row 5: ข้อมูลผู้ใช้งาน - แก้ไข and ระงับ', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await isAnIcon(named(page, 'แก้ไข'), 'แก้ไข');
  await isAnIcon(named(page, 'ระงับ'), 'ระงับ');
});

test('row 6: the grants table - ยกเลิกบทบาท', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openGrants(page, ACCOUNTS.teacherOne);
  await isAnIcon(named(grantsTable(page), 'ยกเลิกบทบาท'), 'ยกเลิกบทบาท');
});

test('row 7: รายวิชาที่เปิดสอน - ตอนเรียนและผู้สอน and ยกเลิกการเปิด', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  await isAnIcon(named(page, 'ตอนเรียนและผู้สอน'), 'ตอนเรียนและผู้สอน');
  await isAnIcon(named(page, 'ยกเลิกการเปิด'), 'ยกเลิกการเปิด');
});

test('row 8: ผลการเรียนรู้ของหลักสูตร - แก้ไข and ลบ', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openPlos(page);
  await isAnIcon(named(page, 'แก้ไข'), 'แก้ไข');
  await isAnIcon(named(page, 'ลบ'), 'ลบ');
});

test('row 9: Rubric กลาง - แก้ไข and ลบ', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await isAnIcon(named(page, 'แก้ไข'), 'แก้ไข');
  await isAnIcon(named(page, 'ลบ'), 'ลบ');
});

test('row 10: เกณฑ์ของ Rubric - แก้ไข and ลบ', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await openCriteriaVia(page, rubricsTable(page).getByRole('row').nth(1));
  await isAnIcon(named(page, 'แก้ไข'), 'แก้ไข');
  await isAnIcon(named(page, 'ลบ'), 'ลบ');
});

test('row 11: นักศึกษาในตอนเรียน - นำออก', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  await openEnrolment(page, section);
  const button = listTable(page).getByRole('button', { name: /^นำ .+ ออกจากตอนเรียน$/ }).first();
  const word = await button.getAttribute('aria-label');
  await isAnIcon(button, word);
});

'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openClos, mySectionIds } = require('../support/clos-screen');
const { openBehaviors } = require('../support/behaviors-screen');
const { openCriteria } = require('../support/achievements-screen');
const { openPlan: openTeachingPlan } = require('../support/plan-screen');
const { openGroups } = require('../support/groups-screen');
const { openWeights } = require('../support/weights-screen');
const { openActivities } = require('../support/activities-screen');
const { PDF_BYTES, attach, fileRow, removeFile } = require('../support/evidence-screen');
const {
  LABELS,
  chooseClo,
  clearEntry,
  myClos,
  openPlan: openImprovement,
  planOf,
  seedEntry,
} = require('../support/improvement-screen');

/**
 * docs/acceptance/273-teacher-row-actions.md - the teacher screens' row
 * actions drawn as `RowAction` (#273, the owner's answer ก of 12 November
 * 2569).
 *
 * #271 put the administration screens' actions through `RowAction`. Ten
 * teacher-side places still drew their own bare Heroicons button, with no
 * border and no tooltip. The answer keeps their cards and their names - which
 * already say what the act is done to, `ลบสัปดาห์ที่ 3 · …` - and makes the
 * tooltip that **full name** (`RowAction`'s default when no `title` is
 * handed). The one control that was not an icon button, the clickable file
 * name on ActivityEvidence, becomes a blue eye beside edit and delete, and
 * the name stays on the card as plain text.
 *
 * The claim asked of every button is `271a`'s, with the word replaced by the
 * button's own name: its tooltip is its accessible name, it draws no text, and
 * it holds one icon. The bare buttons already drew no text and one icon, so
 * the tooltip is what a screen still drawing its own button fails. Appearance -
 * which icon, which border colour - is the sheet's walked row.
 *
 * Rows are not `serial`: one screen still drawing its own button reddens its
 * own row and leaves the others standing (#191).
 */

/** `271a`'s claims, with the tooltip compared to the button's own name. */
async function isARowAction(control) {
  await expect(control, 'the control is drawn').toBeVisible();
  const name = await control.getAttribute('aria-label');
  expect(name, 'it has a name').toBeTruthy();
  await expect(control, 'its tooltip is its whole name').toHaveAttribute('title', name);
  expect((await control.textContent()).trim(), 'no word is drawn').toBe('');
  await expect(control.locator('svg'), 'it holds one icon').toHaveCount(1);
}

/** The first button whose accessible name starts with these words. */
const starting = (page, words, role = 'button') =>
  page.getByRole(role, { name: new RegExp('^' + words) }).first();

let sectionId;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  [sectionId] = await mySectionIds(page);
});

test('row 1: ผลการเรียนรู้รายวิชา - แก้ไข and ลบ', async ({ page }) => {
  await openClos(page, sectionId);
  await isARowAction(starting(page, 'แก้ไข CLO-'));
  await isARowAction(starting(page, 'ลบ CLO-'));
});

test('row 2: พฤติกรรมที่วัดได้ - แก้ไขข้อ and ลบข้อ', async ({ page }) => {
  const [clo] = await myClos(page, sectionId);
  await openBehaviors(page, sectionId, clo.clo_id);
  await isARowAction(starting(page, 'แก้ไขข้อ '));
  await isARowAction(starting(page, 'ลบข้อ '));
});

test('row 3: เกณฑ์การประเมิน - แก้ไขข้อ and ลบข้อ', async ({ page }) => {
  const [clo] = await myClos(page, sectionId);
  await openCriteria(page, sectionId, clo.clo_id);
  await isARowAction(starting(page, 'แก้ไขข้อ '));
  await isARowAction(starting(page, 'ลบข้อ '));
});

test('row 4: แผนการสอน - แก้ไขสัปดาห์ที่ and ลบสัปดาห์ที่', async ({ page }) => {
  await openTeachingPlan(page, sectionId);
  await isARowAction(starting(page, 'แก้ไขสัปดาห์ที่ '));
  await isARowAction(starting(page, 'ลบสัปดาห์ที่ '));
});

test('row 5: กลุ่มงานนักศึกษา - เปลี่ยนชื่อ and ลบ', async ({ page }) => {
  await openGroups(page, sectionId);
  await isARowAction(starting(page, 'เปลี่ยนชื่อ '));
  await isARowAction(starting(page, 'ลบ '));
});

test('row 6: สัดส่วนคะแนน - ลบหมวดคะแนนที่', async ({ page }) => {
  await openWeights(page, sectionId);
  await isARowAction(starting(page, 'ลบหมวดคะแนนที่ '));
});

test('row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม', async ({ page }) => {
  await openActivities(page, sectionId);
  // หลักฐาน is a place and not an act, so it stays a link (#35).
  await isARowAction(starting(page, 'หลักฐานการประเมินของ ', 'link'));
  await isARowAction(starting(page, 'แก้ไขกิจกรรม '));
  await isARowAction(starting(page, 'ลบกิจกรรม '));
});

test('row 8: the activity form - นำผลการเรียนรู้แถวที่ … ออก', async ({ page }) => {
  await openActivities(page, sectionId);
  // An activity that already has outcomes, so the form opens with rows.
  await starting(page, 'แก้ไขกิจกรรม ').click();
  await isARowAction(starting(page, 'นำผลการเรียนรู้แถวที่ 1 ออก'));
});

test('row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน', async ({ page }) => {
  const NAME = '273a-evidence.pdf';
  await openActivities(page, sectionId);
  await starting(page, 'หลักฐานการประเมินของ ', 'link').click();
  await attach(page, { bytes: PDF_BYTES, name: NAME });
  await expect(fileRow(page, NAME)).toBeVisible();
  try {
    await isARowAction(page.getByRole('button', { name: `เปิดหลักฐาน ${NAME}`, exact: true }));
    await isARowAction(page.getByRole('button', { name: `แก้ไขหลักฐาน ${NAME}`, exact: true }));
    await isARowAction(page.getByRole('button', { name: `ลบหลักฐาน ${NAME}`, exact: true }));

    // The file name is still on the card, and is no longer the control.
    await expect(fileRow(page, NAME)).toContainText(NAME);
    await expect(
      fileRow(page, NAME).getByRole('button').filter({ hasText: NAME }),
      'the file name is text, not a button',
    ).toHaveCount(0);
  } finally {
    await removeFile(page, NAME);
  }
});

test('row 10: การปรับปรุงอย่างต่อเนื่อง - แก้ไข and ลบ an entry', async ({ page }) => {
  const [clo] = await myClos(page, sectionId);
  const before = await planOf(page, sectionId);
  expect(before.entries ?? [], 'the section starts with no entries').toHaveLength(0);
  const entry = await seedEntry(page, sectionId, {
    clo_id: clo.clo_id,
    detail_type: 'REFLECTION',
    detail_text: '273a',
  });
  try {
    await openImprovement(page, sectionId);
    await chooseClo(page, clo.clo_number);
    await isARowAction(page.getByRole('button', { name: `แก้ไข${LABELS.REFLECTION}`, exact: true }));
    await isARowAction(page.getByRole('button', { name: `ลบ${LABELS.REFLECTION}`, exact: true }));
  } finally {
    await clearEntry(page, sectionId, entry.entry_id);
  }
});

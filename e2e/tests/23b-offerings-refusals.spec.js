'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  OFFERINGS,
  waitForList,
  openOfferings,
  filterToTerm,
  offeringRow,
} = require('../support/offerings-screen');

/**
 * docs/acceptance/23-offerings.md, criterion 9 — the one screen the committee
 * holds alone.
 *
 * The backend suite proves the same rule at the route. What is here is the half
 * that only a browser shows: an account with no menu entry for this screen is
 * refused all the same when it types the address, and the screen says so rather
 * than drawing an empty table that reads as "there is nothing this term".
 *
 * Faculty Admin is the row a reader doubts, and is asserted by name: every
 * screen from #14 to #17 admits them, #18 stopped at the department, and this
 * one stops one tier further down. So is the system administrator, who reaches
 * everything else in the system and not this.
 */

/** The seeded Offering of 2568, which every account here either sees or does not. */
const SEEDED = '01076105';

for (const [who, account] of [
  ['ผู้ดูแลระบบ', ACCOUNTS.systemAdmin],
  ['ผู้ดูแลระดับคณะ', ACCOUNTS.facultyAdmin],
  ['ผู้ดูแลระดับภาควิชา', ACCOUNTS.departmentAdmin05],
  ['อาจารย์ผู้สอน', ACCOUNTS.teacherOne],
]) {
  test(`row 9: ${who} typing the address is refused by the server`, async ({ page }) => {
    await signIn(page, account);

    const [response] = await Promise.all([waitForList(page), page.goto(OFFERINGS)]);
    expect(response.status(), `${account} was allowed to list`).toBe(403);

    // Refused in words. An empty table under no banner would be the inherited
    // system's defect exactly - a screen that looks as though it loaded and
    // showed nothing.
    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
    await expect(offeringRow(page, SEEDED)).toHaveCount(0);
  });
}

test('row 9: the committee of another curriculum sees none of this one', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0503);
  await openOfferings(page);

  // Told which curriculum, rather than asked - one programme in reach, so there
  // is no filter that could be set to somebody else's.
  await expect(
    page.getByText('0503 วิศวกรรมคอมพิวเตอร์ (หลักสูตรนานาชาติ)', { exact: true }),
  ).toBeVisible();

  // 0501's seeded term is real and is not theirs. The filter is the server's
  // `program_id = ANY(reach)` and not a query this screen sent.
  await filterToTerm(page, '2568', 2);
  await expect(offeringRow(page, SEEDED)).toHaveCount(0);
  await expect(page.getByText('ยังไม่มีรายวิชาที่เปิดสอนตามเงื่อนไขนี้')).toBeVisible();
});

test('row 9: the account holding two roles gets in as the committee', async ({ page }) => {
  // U_MULTI holds both PROG_MANAGER and TEACHER. The acting grant is the more
  // senior of the two, so this account reaches the screen without switching
  // roles - which is what makes the four refusals above about the role and not
  // about the account.
  await signIn(page, ACCOUNTS.multiRole);
  await openOfferings(page);
  await filterToTerm(page, '2568', 2);
  await expect(offeringRow(page, SEEDED)).toHaveCount(1);
});

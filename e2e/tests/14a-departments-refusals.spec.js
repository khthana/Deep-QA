'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  DEPARTMENTS,
  waitForList,
  openDepartments,
  departmentRow,
} = require('../support/departments-screen');

/**
 * docs/acceptance/14-departments.md, rows 8 — typing the address in.
 *
 * Departments belong to the faculty administrator. Both rows below name an
 * account that has no business on this screen and say the same thing twice:
 * the menu entry is absent, *and* the server refuses if the address is typed
 * in anyway. Only the second half is here. Whether a menu entry is drawn is a
 * matter of what is on the screen and stays a hand-walked row (#65).
 *
 * A test that only looked for the red banner would still pass if the frontend
 * had decided by itself and never called the API - which is exactly the
 * "hidden menu" the row is written to tell apart from a real refusal. So each
 * case waits for the answer to `GET /api/departments` and asserts its status.
 *
 * The control at the end is what keeps the two refusals honest: they would
 * both pass against a route that refused everybody, or that had been deleted.
 */

test('row 8: dept.admin.05@ typing the address is refused by the server', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);

  const [response] = await Promise.all([waitForList(page), page.goto(DEPARTMENTS)]);

  expect(response.status()).toBe(403);
  await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
  // Not an empty table that reads as "there are no departments": the row says
  // the screen must say why, and the seeded two must not be listed either.
  await expect(departmentRow(page, '05')).toHaveCount(0);
  await expect(departmentRow(page, '01')).toHaveCount(0);
});

test('row 8: admin@ typing the address is refused by the server', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);

  const [response] = await Promise.all([waitForList(page), page.goto(DEPARTMENTS)]);

  // The Central Admin manages accounts and grants "and nothing else"
  // (ADR-0002), so this route does not list FULL_ADMIN in `requireRole`.
  expect(response.status()).toBe(403);
  await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
  await expect(departmentRow(page, '05')).toHaveCount(0);
});

test('control: faculty.admin@ reaches the same screen and sees the seeded departments', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.facultyAdmin);

  await openDepartments(page);

  await expect(departmentRow(page, '05')).toHaveCount(1);
  await expect(departmentRow(page, '01')).toHaveCount(1);
  await expect(page.getByText(REFUSALS.forbidden)).toHaveCount(0);
});

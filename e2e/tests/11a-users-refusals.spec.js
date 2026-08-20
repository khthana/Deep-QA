'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  USERS,
  waitForList,
  openUsers,
  search,
  userRow,
} = require('../support/users-screen');

/**
 * docs/acceptance/11-user-accounts.md, rows 8 - who reaches the accounts
 * screen, and how much of it.
 *
 * Two different refusals live in this criterion and it is worth keeping them
 * apart. One is a role that has no business here at all and is turned away at
 * the door. The other is an administrator who is let in and then shown a
 * shorter list than the person above them - a refusal that leaves no banner
 * behind, only absent rows, and is therefore the one a hand-walk is least
 * likely to catch.
 *
 * Both are asserted against the server's own answer rather than against the
 * menu: a screen that decided by itself and never called the API would look
 * identical to a screen the server had refused, and telling those two apart is
 * the whole reason this ticket's rows are written the way they are.
 *
 * Rows are looked up through the screen's own search box, because ten seeded
 * accounts and a page of ten mean "is this person listed" cannot be read off
 * page one alone.
 */

test('row 8: teacher.one@ typing the address is refused by the server', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);

  const [response] = await Promise.all([waitForList(page), page.goto(USERS)]);

  expect(response.status()).toBe(403);
  await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
  // Not an empty table that reads as "there are no accounts": nothing of the
  // register is drawn, not even the row of the person who typed the address.
  await expect(userRow(page, ACCOUNTS.teacherOne)).toHaveCount(0);
});

test('row 8: dept.admin.05@ is let in and sees only its own department', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  // Let in: the screen answers 200 and lists the department's own people -
  // both the teacher who sits in the department itself and the committee
  // member whose grant is at a programme underneath it, which is the second
  // half of what the row means by "this department and what is under it".
  for (const visible of [ACCOUNTS.teacherOne, ACCOUNTS.committee0501]) {
    await search(page, visible);
    await expect(userRow(page, visible)).toHaveCount(1);
  }

  // And no further. The Central Admin sits above this account, the faculty
  // administrator sits above it, and the neighbouring department sits beside
  // it - none of the three is this account's to see or to edit.
  for (const hidden of [
    ACCOUNTS.systemAdmin,
    ACCOUNTS.facultyAdmin,
    ACCOUNTS.departmentAdmin01,
  ]) {
    await search(page, hidden);
    await expect(userRow(page, hidden)).toHaveCount(0);
  }
});

test('row 8: faculty.admin@ sees both departments, and still not the Central Admin', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openUsers(page);

  // Wider than the department administrator above: both departments under the
  // faculty, not only the one this account happens to sit in.
  for (const visible of [ACCOUNTS.departmentAdmin05, ACCOUNTS.departmentAdmin01]) {
    await search(page, visible);
    await expect(userRow(page, visible)).toHaveCount(1);
  }

  // But not unlimited. `admin@` administers accounts across the whole
  // university and is nobody's subordinate, so the widening stops short of it.
  await search(page, ACCOUNTS.systemAdmin);
  await expect(userRow(page, ACCOUNTS.systemAdmin)).toHaveCount(0);
});

test('control: admin@ finds every account the two rows above could not', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  // The control the two scope rows need. Searching for an address and finding
  // nothing is what those rows assert, and a search box that matched nothing
  // for anybody - or a seed missing these accounts - would satisfy them
  // without a single rule being enforced.
  for (const email of [
    ACCOUNTS.systemAdmin,
    ACCOUNTS.facultyAdmin,
    ACCOUNTS.departmentAdmin05,
    ACCOUNTS.departmentAdmin01,
  ]) {
    await search(page, email);
    await expect(userRow(page, email)).toHaveCount(1);
  }
});

'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { openUsers, search, userRow } = require('../support/users-screen');

/**
 * docs/acceptance/11-user-accounts.md, row 3 - the screen half of #84.
 *
 * #83 gave the refusal a sentence of its own; this file is about the person
 * never having to read it. The manage column drew *ระงับ* on the signed-in
 * administrator's own row exactly as it drew it on everybody else's, and
 * pressing it could not succeed: `backend/routes/users.js` refuses a status
 * change aimed at the caller. A control that always fails tells the person
 * the action is available when it is not.
 *
 * **Additive, never a replacement.** ADR-0002 says hiding is not guarding, so
 * the third row below reaches the route directly, past the disabled button,
 * and asserts the server still refuses. If a later change ever deletes the
 * guard because "the screen prevents it", that row is what fails - and it
 * fails here as well as in `users.test.js`, because this is the screen the
 * argument would be made about.
 *
 * **Why the grants panel is not in this file.** The same shape sits on
 * `GrantsPanel`'s *ยกเลิกบทบาท*, and it is deliberately left alone: three
 * browser rows press that button precisely in order to obtain its refusal,
 * and `121a`'s own comment calls it "the one refusal this panel can be given
 * without writing anything". Disabling it means finding #121 another refusal,
 * which is a decision rather than a tick - #130. The suspend button has the opposite
 * property, measured during #83: no row in `e2e/` presses it on its own row,
 * which is why `statusisjustforbidden` killed no browser row at all - on 10
 * September, before this file existed. Re-measured on the 11th it kills one:
 * the third row below, which reaches the route *past* the button rather than
 * by pressing it. So no row presses it still, but the kill count has stopped
 * being the evidence for that.
 *
 * **The title is a copy, and it cannot not be.** `create-react-app` refuses
 * imports from outside `frontend/src`, so the screen cannot read
 * `backend/auth/refusals`. The copy is closed here instead: row 1 asserts the
 * title is `REFUSALS.selfStatus` itself, so the two drift apart in this file
 * rather than in front of a person.
 */

/** The suspend / reactivate control of one row. */
const statusButton = (page, email) =>
  userRow(page, email).getByRole('button', { name: /ระงับ|เปิดใช้งาน/ });

test('row 3: the signed-in administrator cannot press ระงับ on their own row', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.systemAdmin);

  const own = statusButton(page, ACCOUNTS.systemAdmin);
  await expect(own).toBeVisible();

  // Drawn, not hidden. The column keeps its shape, so the row still reads the
  // same as every other row and the reason is on the control itself.
  await expect(own).toBeDisabled();
  await expect(own).toHaveAttribute('title', REFUSALS.selfStatus);
});

test('row 3: every other row keeps the button it always had', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.teacherOne);

  // The control against a mutant that disables the column rather than the
  // row: this account is not the caller, so nothing about it changed.
  const other = statusButton(page, ACCOUNTS.teacherOne);
  await expect(other).toBeEnabled();
  await expect(other).not.toHaveAttribute('title', REFUSALS.selfStatus);
});

test('row 3: the server refuses it anyway, which is what makes the button a convenience', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  // Past the disabled button, on the cookie this browser is holding - the
  // request the screen will no longer send. ADR-0002: hiding is not guarding.
  //
  // This row is not proved by any mutant of this ticket's own: all three are
  // about the button, and none of them deletes the server's guard. What proves
  // it is `83:statusisjustforbidden`, one sheet over, which makes the route
  // answer `REFUSALS.forbidden` and fails the assertion below.
  const refused = await page.request.put(
    `${BACKEND_URL}/api/users/${IDS.systemAdmin}/status`,
    { data: { status: 'inactive' } },
  );
  expect(refused.status()).toBe(403);
  expect((await refused.json()).message).toBe(REFUSALS.selfStatus);

  // And the row is untouched, which is the half a status code cannot say.
  await search(page, ACCOUNTS.systemAdmin);
  await expect(
    userRow(page, ACCOUNTS.systemAdmin).getByText('ใช้งานอยู่'),
  ).toBeVisible();
});

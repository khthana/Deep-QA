'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUsers } = require('../support/users-screen');

/**
 * #309 - the users screen given back its delivered card title, `ผู้ใช้งานระบบ`
 * with the history button on the same row (the owner's answer of 25 November
 * 2569, scope: every screen).
 *
 * What the browser can say is here: that the screen has a title a reader can
 * find, that it is the only level-1 heading on the screen, and that the history
 * button stands on the title's own row rather than above or below it. Every
 * other screen's title and card are held by `frontend/scripts/content-titles.js`,
 * which reads the code; the card's look - white, rounded, shadowed - and each
 * screen's icon are appearance, and are hand-walked rows of
 * `docs/acceptance/11-user-accounts.md` §#309.
 */

const TITLE = 'ผู้ใช้งานระบบ';
const HISTORY_BUTTON = 'แสดงประวัติการใช้งาน';

test('row 1: the users screen has a level-1 title, ผู้ใช้งานระบบ, and only one', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  await expect(page.getByRole('heading', { level: 1, name: TITLE, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 }), 'one level-1 heading').toHaveCount(1);
});

test('row 2: the history button stands on the title row', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  const title = page.getByRole('heading', { level: 1, name: TITLE, exact: true });
  const button = page.getByRole('button', { name: HISTORY_BUTTON });
  await expect(title).toBeVisible();
  await expect(button).toBeVisible();

  const t = await title.boundingBox();
  const b = await button.boundingBox();
  const middle = b.y + b.height / 2;
  expect(middle, 'the button middle is within the title row').toBeGreaterThanOrEqual(t.y);
  expect(middle, 'the button middle is within the title row').toBeLessThanOrEqual(t.y + t.height);
  expect(b.x, 'the button is to the right of the title').toBeGreaterThan(t.x + t.width);
});

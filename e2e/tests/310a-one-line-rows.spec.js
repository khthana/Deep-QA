'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { ROLE_NAMES } = require('../support/grants-panel');
const { openUsers, search, listTable, roleCell, grantTitles } = require('../support/users-screen');

/**
 * #310 - the users table's rows one line high, as the delivered table's were
 * (the owner's answer of 26 November 2569).
 *
 * The delivered row fitted on one line because it had seven columns; the
 * rebuild keeps nine (`docs/users-screen.md` rule 1), and what took the width
 * was the role column - 576 px unwrapped, the scope names in its brackets
 * being most of it. Measured on 25-26 November 2569 by a probe at 1280, 1440
 * and 1920 against every option the ticket listed and the one the owner added
 * (English abbreviations); the owner chose: each grant drawn as an English
 * abbreviation, its role and scope in the abbreviation's tooltip, the cells'
 * padding back to the delivered `px-2`, nothing wrapped, and **1920** as the
 * width the table has to fit at with the side bar open. Narrower, the table
 * scrolls inside its own box (#98), and no row wraps.
 *
 * Which letters stand for which role is wording, the owner's, and lives in
 * `frontend/src/components/MapRole.js`; the rows below read the abbreviations
 * only as "not the Thai name" and the tooltip in rule 1's own words. The look
 * of the abbreviation (its dotted underline) and whether a person finds the
 * tooltip are hand-walked rows of `docs/acceptance/11-user-accounts.md` §#310.
 */

const WIDE = { width: 1920, height: 900 };
const NARROW = { width: 1440, height: 900 };

/**
 * The most lines any one cell of a row is drawn on, per body row - read off the
 * text's own line boxes rather than a row height, which a taller control would
 * move without any text wrapping (#264: read the effect, not the property).
 */
const linesPerRow = page =>
  listTable(page).evaluate(table =>
    [...table.querySelectorAll('tbody tr')].map(row =>
      Math.max(
        ...[...row.children].map(cell => {
          const tops = new Set();
          const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            for (const box of range.getClientRects())
              if (box.width > 0) tops.add(Math.round(box.top));
          }
          return Math.max(tops.size, 1);
        }),
      ),
    ),
  );

/**
 * Whether the last column, ดำเนินการ, ends inside the table's box before
 * anything is scrolled - which, the table starting at the box's left edge, is
 * every column being in view. One claim and one assertion: an overflow figure
 * or สถานะ read below it would be proved by nothing (#88).
 */
const lastColumnInView = page =>
  listTable(page).evaluate(table => {
    const right = table.parentElement.getBoundingClientRect().right;
    const actions = [...table.querySelectorAll('thead th')].find(
      th => th.textContent.trim() === 'ดำเนินการ',
    );
    return actions.getBoundingClientRect().right <= right;
  });

test('row 1: at 1920 every row of the users table is one line', async ({ page }) => {
  await page.setViewportSize(WIDE);
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  const lines = await linesPerRow(page);
  expect(lines.length, 'a page of rows to read').toBeGreaterThan(1);
  expect(lines, 'lines per row at 1920').toEqual(lines.map(() => 1));
});

test('row 2: at 1920 the table fits its box, ดำเนินการ in view', async ({ page }) => {
  await page.setViewportSize(WIDE);
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  expect(await lastColumnInView(page), 'ดำเนินการ in view at 1920').toBe(true);
});

// Narrower, the table scrolls in its own box and the page does not - which is
// #98's claim, held for this screen by `98a`'s `ข้อมูลผู้ใช้งาน ที่จอแคบ`.
test('row 3: at 1440 no row wraps', async ({ page }) => {
  await page.setViewportSize(NARROW);
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  const lines = await linesPerRow(page);
  expect(lines, 'lines per row at 1440').toEqual(lines.map(() => 1));
});

test('row 4: the role column draws an abbreviation per grant, not the Thai name', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.multiRole);

  const cell = await roleCell(page, ACCOUNTS.multiRole);
  await expect(cell, 'the cell is abbreviations and commas').toHaveText(/^[A-Z]+(, [A-Z]+)*$/);
});

test('row 5: each abbreviation says its role and scope in full in its tooltip', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.systemAdmin);

  const cell = await roleCell(page, ACCOUNTS.systemAdmin);
  await expect.poll(() => grantTitles(cell), 'the tooltip').toEqual([
    `${ROLE_NAMES.FULL_ADMIN} (ทั้งมหาวิทยาลัย)`,
  ]);
});

// Row 4's other half, a row of its own (#66): a cell of letters and commas
// passes whether it draws every grant or only the first.
test('row 6: the role column draws one abbreviation for each grant', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.multiRole);

  const cell = await roleCell(page, ACCOUNTS.multiRole);
  await expect(cell.locator('abbr'), 'one abbreviation per grant').toHaveCount(2);
});

// The tooltip is for a mouse; the words a screen reader reads are the cell's
// accessible name, the same words as the tooltips (#310's review).
test('row 7: the role cell is named by its grants in full', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.systemAdmin);

  const cell = await roleCell(page, ACCOUNTS.systemAdmin);
  await expect(cell, 'the cell read aloud').toHaveAccessibleName(
    `${ROLE_NAMES.FULL_ADMIN} (ทั้งมหาวิทยาลัย)`,
  );
});

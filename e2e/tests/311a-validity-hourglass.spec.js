'use strict';

const { test, expect } = require('@playwright/test');
const { resetValidity } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { E2E_SCHEMA } = require('../support/env');
const { openUsers, search, userRow, listTable } = require('../support/users-screen');

/**
 * #311 - the users table's validity column as an hourglass, by the owner's
 * answers of 26 November 2569: few accounts carry a window, so the column
 * that drew it as ISO dates was wide and mostly `—`. Its header is now
 * วันใช้งาน; an account with a window draws one hourglass, one colour whatever
 * the window's state, with the window in Thai dates in its `title` and its
 * accessible name; an account with none draws an empty cell.
 *
 * The three shapes of a window are built on `ext01` (`U_EXT`) with fixed
 * dates, because the seed's windows are offsets from the day it ran (so their
 * Thai dates cannot be written down) and the seed has no account open at the
 * near end. `resetValidity` puts the seed's own window back, whatever a row
 * left behind (#89, #181). The dates are literals, not built with the
 * formatter the screen uses (#104); 5 ต.ค. is a single-digit day so that the
 * row also says the day is not zero-padded.
 *
 * The icon's shape and colour, and whether a person finds the tooltip, are
 * hand-walked rows of `docs/acceptance/11-user-accounts.md` §#311.
 */

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(async () => {
  try {
    await resetValidity(db, 'U_EXT');
  } finally {
    await db.end();
  }
});

const setWindow = (from, until) =>
  db.query(`UPDATE users SET valid_from = $2, valid_until = $3 WHERE user_id = $1`, [
    IDS.externalAssessor,
    from,
    until,
  ]);

/** One row's วันใช้งาน cell, found by the header above it. */
async function windowCell(page, email) {
  const headers = await listTable(page).getByRole('columnheader').allTextContents();
  const column = headers.map(text => text.trim()).indexOf('วันใช้งาน');
  expect(column, 'the accounts table has no วันใช้งาน column').toBeGreaterThanOrEqual(0);
  return userRow(page, email).getByRole('cell').nth(column);
}

/** Opens the table on one account with the window given, and returns its cell. */
async function cellWithWindow(page, from, until) {
  await setWindow(from, until);
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.externalAssessor);
  return windowCell(page, ACCOUNTS.externalAssessor);
}

/** The cell holds one hourglass and no words of its own, the words being in the tooltip. */
async function expectHourglass(cell, words) {
  const icon = cell.getByRole('img');
  await expect(icon).toHaveCount(1);
  await expect(icon).toHaveAttribute('title', words);
  await expect(icon).toHaveAccessibleName(words);
  await expect(cell).toHaveText('');
}

test('row 1: a window with both ends reads in Thai dates in the hourglass tooltip', async ({
  page,
}) => {
  const cell = await cellWithWindow(page, '2026-10-27', '2026-12-26');
  await expectHourglass(cell, '27 ต.ค. 2569 ถึง 26 ธ.ค. 2569');
});

test('row 2: a window open at the far end reads ตั้งแต่ and the day it opens', async ({
  page,
}) => {
  const cell = await cellWithWindow(page, '2026-10-05', null);
  await expectHourglass(cell, 'ตั้งแต่ 5 ต.ค. 2569');
});

test('row 3: a window open at the near end reads ถึง and the day it closes', async ({ page }) => {
  const cell = await cellWithWindow(page, null, '2026-12-26');
  await expectHourglass(cell, 'ถึง 26 ธ.ค. 2569');
});

test('row 4: an account with no window draws an empty cell, with no icon', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.teacherOne);

  const cell = await windowCell(page, ACCOUNTS.teacherOne);
  // The row is drawn first, so the counts below are read off a drawn row and
  // not off one still on its way (#50).
  await expect(userRow(page, ACCOUNTS.teacherOne)).toHaveCount(1);
  await expect(cell.getByRole('img')).toHaveCount(0);
  await expect(cell).toHaveText('');
});

test.describe('west of UTC', () => {
  // The route sends a date-only text, which `Date` reads as UTC midnight; a
  // browser west of UTC would draw it as the evening before unless the screen
  // formats in UTC. The suite's browser takes the machine's zone, Bangkok here,
  // east of UTC, where the two agree - so this row moves the browser to where
  // they disagree (#117).
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('row 5: the same dates in a browser west of UTC, not a day earlier', async ({ page }) => {
    const cell = await cellWithWindow(page, '2026-10-27', '2026-12-26');
    await expect(cell.getByRole('img')).toHaveAttribute('title', '27 ต.ค. 2569 ถึง 26 ธ.ค. 2569');
  });
});

// Appended below the rows rather than above them, so that the line numbers
// `mutation/311-validity-hourglass.py` cites stay where its sweep found them
// (#97, #85). Both are file-scoped whatever their position.
//
// Rows 1-4 in Bangkok whatever the machine's zone, so that `s311localzone`
// survives them by construction and not because of where the suite runs
// (#187: the clock must not pick which claim runs). Row 5's describe overrides it.
test.use({ timezoneId: 'Asia/Bangkok' });

// Row 4 reads `teach01` as an account with no window; the seed says so today,
// and this says it on the row's behalf rather than leaving it to memory (#129).
test.beforeAll(async () => {
  const { rows } = await db.query(
    `SELECT valid_from, valid_until FROM users WHERE user_id = $1`,
    [IDS.teacherOne],
  );
  expect(rows, 'teach01 carries no window').toEqual([{ valid_from: null, valid_until: null }]);
});

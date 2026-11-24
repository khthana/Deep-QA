'use strict';

const { test, expect } = require('@playwright/test');
const { PROGRAMS } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { E2E_SCHEMA } = require('../support/env');
const { menuEntries } = require('../support/shell');
const { openUsers } = require('../support/users-screen');
const {
  ACTIONS,
  HISTORY,
  openHistory,
  searchHistory,
  entries,
  entryCell,
} = require('../support/history-panel');

/**
 * #305 - the history page given back its delivered table of every account's
 * lines (`docs/users-screen.md` rules 5 and 11, the owner's answer of
 * 22 November 2569).
 *
 * `13a` keeps #13's rows - filing, the record named, Bangkok time, a
 * department's reach - read through this table since #305. These are the rows
 * that are #305's own: the way in and the way back, the menu entry gone, one
 * table holding several accounts' lines newest first and naming who wrote each,
 * and a search the server answers that finds what was done *to* an account.
 *
 * Rows 3 and 4 write their lines straight to `user_log`, dated in the future
 * so they are the newest lines of the table whatever the files before this one
 * wrote (#132), and take them out again below the seam whatever the row did
 * (#181, #233). The scope of the table and the `%` `_` of its search are `13a`
 * row 12's and `272c`'s.
 */

const PROGRAM = PROGRAMS.find(entry => entry.id === '0501');

const db = createPool({ schema: E2E_SCHEMA });
let written = [];

test.afterAll(async () => {
  try {
    if (written.length) await db.query('DELETE FROM user_log WHERE id = ANY($1)', [written]);
  } finally {
    await db.end();
  }
});

/** Writes log lines below the seam and remembers them for the clean-up. */
async function writeLines(values, params) {
  const { rows } = await db.query(
    `INSERT INTO user_log (user_id, activity, target_kind, target_id, time_stamp)
     VALUES ${values} RETURNING id`,
    params,
  );
  written.push(...rows.map(row => row.id));
}

/**
 * An account's name as the table should draw it, read out of the database
 * rather than copied from the seed, and joined by `personName`'s rule.
 */
async function nameOf(userId) {
  const { rows } = await db.query(
    'SELECT title_th, first_name_th, last_name_th FROM users WHERE user_id = $1',
    [userId],
  );
  const [account] = rows;
  return [account.title_th, account.first_name_th, account.last_name_th]
    .filter(Boolean)
    .join(' ');
}

test('row 1: the history is reached from the users page, and left back to it', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  // Rule 5: the button at the top of the users page.
  await page.getByRole('button', { name: 'แสดงประวัติการใช้งาน' }).click();
  await expect(page, 'แสดงประวัติการใช้งาน opens the history').toHaveURL(
    new RegExp(`${HISTORY}$`),
  );
  await expect(page.getByRole('heading', { name: 'ประวัติการใช้งาน' })).toBeVisible();
  await expect(entries(page).first()).toBeVisible();

  // Rule 11: and the way back.
  await page.getByRole('button', { name: 'แสดงรายชื่อผู้ใช้งาน' }).click();
  await expect(page, 'แสดงรายชื่อผู้ใช้งาน goes back to the users page').toHaveURL(
    /\/main\/users$/,
  );
  await expect(page.getByRole('button', { name: 'แสดงประวัติการใช้งาน' })).toBeVisible();
});

for (const [role, email] of [
  ['FULL_ADMIN', ACCOUNTS.systemAdmin],
  ['FACULTY_ADMIN', ACCOUNTS.facultyAdmin],
  ['DEPT_ADMIN', ACCOUNTS.departmentAdmin05],
]) {
  test(`row 2: the side menu of ${role} has no ประวัติการใช้งาน entry`, async ({ page }) => {
    await signIn(page, email);
    await openUsers(page);

    const labels = (await menuEntries(page)).map(entry => entry.label);
    // The control: the menu was read, and it is the menu the history is
    // reached beside - so an absence below is an absence and not an unread menu.
    expect(labels).toContain('ข้อมูลผู้ใช้งาน');
    expect(labels, 'rule 11: the menu entry is gone').not.toContain('ประวัติการใช้งาน');
  });
}

test('row 3: one table holds several accounts\' lines, newest first, each naming who wrote it', async ({
  page,
}) => {
  await writeLines(
    `($1, 'CREATE_PROGRAM', 'PROGRAM', $3, now() + interval '2 days'),
     ($2, 'LOGIN', NULL, NULL, now() + interval '2 days' - interval '1 second')`,
    [IDS.systemAdmin, IDS.teacherOne, PROGRAM.id],
  );
  const [admin, teacher] = [await nameOf(IDS.systemAdmin), await nameOf(IDS.teacherOne)];

  await signIn(page, ACCOUNTS.systemAdmin);
  await openHistory(page);

  // The newer line first, whoever wrote it - and it was the administrator,
  // reading their own table: a table of one account would not hold the next.
  await expect(entryCell(page, 0, 'รหัสผู้ใช้งาน')).toHaveText(IDS.systemAdmin);
  await expect(entryCell(page, 0, 'ผู้ใช้งาน')).toHaveText(admin);
  await expect(entryCell(page, 0, 'กิจกรรม')).toHaveText(ACTIONS.CREATE_PROGRAM);
  await expect(entryCell(page, 0, 'ทำกับข้อมูล')).toHaveText(`หลักสูตร${PROGRAM.th}`);

  await expect(entryCell(page, 1, 'รหัสผู้ใช้งาน')).toHaveText(IDS.teacherOne);
  await expect(entryCell(page, 1, 'ผู้ใช้งาน')).toHaveText(teacher);
  await expect(entryCell(page, 1, 'กิจกรรม')).toHaveText(ACTIONS.LOGIN);
});

test('row 4: the search finds what was done to an account, not only what it did', async ({
  page,
}) => {
  // A line the administrator wrote about `teach02`, so the account's id is in
  // the record column and nowhere among the actor's own columns.
  await writeLines(`($1, 'SET_USER_STATUS', 'USER', $2, now() + interval '3 days')`, [
    IDS.systemAdmin,
    IDS.teacherTwo,
  ]);

  await signIn(page, ACCOUNTS.systemAdmin);
  await openHistory(page);
  const answer = await searchHistory(page, IDS.teacherTwo);

  const { entries: found } = await answer.json();
  expect(found[0].user_id, 'the server found the line by its record').toBe(IDS.systemAdmin);
  await expect(entryCell(page, 0, 'รหัสผู้ใช้งาน')).toHaveText(IDS.systemAdmin);
  await expect(entryCell(page, 0, 'ทำกับข้อมูล')).toHaveText(`บัญชีผู้ใช้ ${IDS.teacherTwo}`);
  await expect(entries(page)).toHaveCount(found.length);
});

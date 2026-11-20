'use strict';

const { test, expect } = require('@playwright/test');
const { DEPARTMENTS } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUsers, search, listTable, userRow } = require('../support/users-screen');
const { ROLE_NAMES, openEditor, grantsTable } = require('../support/grants-panel');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');

/**
 * #297 - a department or programme with no Thai name.
 *
 * `department_name_th` and `program_name_th` may be null
 * (`db/migrations/0001_identity_and_organisation.sql`), unlike the faculty's.
 * The application's own routes refuse a unit without one, so such a row comes
 * only from data the application did not write - a migration from the old
 * system, a hand-written `UPDATE`. Until #297 `scopeLabel` read the name with
 * `startsWith` and the accounts screen threw on it. The owner answered on
 * 20 November 2569 that the screen falls back to the kind word and the code,
 * `ภาควิชา 05`, as the history already does for a unit that is gone (#294 rule 6),
 * and that the column stays nullable.
 *
 * The seed holds no such unit, so each row builds one below the seam and puts
 * the name back in `finally` - saying nothing about the screen, so a failure
 * there cannot speak over the row's own (#181). Department `05` because it is
 * the one the two accounts below sit in: its administrator offers it, and
 * `teacher.one@` holds a grant over it. Three rows for the three places
 * `scopeLabel` draws a scope for an administrator - the picker, the held-roles
 * table and the accounts list's role column. The fix is one line they share,
 * so no mutant can tell them apart; what each row adds is that its own way in
 * reaches it (#191).
 */

const KIND_DEPARTMENT = 'ภาควิชา';
const DEPARTMENT = DEPARTMENTS.find(entry => entry.id === '05');

/** The fallback the owner chose: the kind word, a space, the code. */
const NAMELESS = `${KIND_DEPARTMENT} ${DEPARTMENT.id}`;

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(() => db.end());

/** Runs `body` with department 05 nameless, and puts its name back whatever happens. */
async function withoutItsName(body) {
  expect(DEPARTMENT, 'the seed holds no department 05').toBeDefined();
  const { rowCount } = await db.query(
    'UPDATE departments SET department_name_th = NULL WHERE department_id = $1',
    [DEPARTMENT.id],
  );
  // The arrangement is asserted where it is used (#51): an update that touched
  // nothing would leave the seeded name on the screen and every row below red
  // for a reason that is not theirs.
  expect(rowCount, 'department 05 was made nameless').toBe(1);
  try {
    await body();
  } finally {
    await db.query('UPDATE departments SET department_name_th = $1 WHERE department_id = $2', [
      DEPARTMENT.th,
      DEPARTMENT.id,
    ]);
  }
}

const scopePicker = page => page.getByRole('combobox', { name: 'ขอบเขตของบทบาท' });

test('row 1: the scope picker names a nameless department by its kind and code', async ({
  page,
}) => {
  await withoutItsName(async () => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await page.getByRole('button', { name: 'เพิ่มผู้ใช้งาน' }).click();

    // By the value the entry would grant, and read whole: the value is the
    // locator's premise and the text is the claim (#85, #111).
    await expect(scopePicker(page).locator(`option[value="${DEPARTMENT.id}"]`)).toHaveText(
      NAMELESS,
    );
  });
});

test('row 2: the held-roles table says the same', async ({ page }) => {
  await withoutItsName(async () => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await openEditor(page, ACCOUNTS.teacherOne);

    // The grant arrives with no name from the server (`scopeNames.js` reads the
    // same column), so the cell is drawn from the picker's list - the second of
    // the two ways into `scopeLabel`. Found by the role, which is one grant on
    // this account, and asserted to be (#51).
    const rows = grantsTable(page)
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: ROLE_NAMES.TEACHER, exact: true }) });
    await expect(rows, 'teacher.one holds one teacher grant').toHaveCount(1);
    const headers = await grantsTable(page).getByRole('columnheader').allTextContents();
    const column = headers.indexOf('ขอบเขต');
    expect(column, 'the held-roles table has no ขอบเขต column').toBeGreaterThanOrEqual(0);
    await expect(rows.getByRole('cell').nth(column)).toHaveText(NAMELESS);
  });
});

test('row 3: the accounts list says the same in its role column', async ({ page }) => {
  await withoutItsName(async () => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await search(page, ACCOUNTS.teacherOne);

    const headers = await listTable(page).getByRole('columnheader').allTextContents();
    const column = headers.indexOf('บทบาท');
    expect(column, 'the accounts table has no บทบาท column').toBeGreaterThanOrEqual(0);
    // A retrying read: the column is drawn first from the bare code and again
    // once the picker's list lands, which is the moment the unfixed screen threw.
    await expect(userRow(page, ACCOUNTS.teacherOne).getByRole('cell').nth(column)).toHaveText(
      `${ROLE_NAMES.TEACHER} (${NAMELESS})`,
    );
  });
});

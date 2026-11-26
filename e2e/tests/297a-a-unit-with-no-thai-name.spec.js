'use strict';

const { test, expect } = require('@playwright/test');
const { DEPARTMENTS } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUsers, search, roleCell, grantTitles } = require('../support/users-screen');
const {
  ROLE_NAMES,
  openEditor,
  openGrantDialog,
  scopeStatement,
  saysScope,
} = require('../support/grants-panel');
const { actingButton } = require('../support/shell');
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
 * `teacher.one@` holds a grant over it. Rows 1-3 are the three places
 * `scopeLabel` draws a scope for an administrator - the picker, the held-roles
 * table and the accounts list's role column. The fix is one line they share,
 * so no mutant can tell them apart; what each row adds is that its own way in
 * reaches it (#191).
 *
 * Rows 4-6 came from the review of the first commit, which found two more ways
 * in that drew a bare code: a nameless unit outside the reader's reach, which
 * `grantScope` sent to a list that has no entry for it, and the role picker,
 * which puts the kind word in front itself and returned the code before it
 * looked for one.
 */

const KIND_DEPARTMENT = 'ภาควิชา';
const KIND_PROGRAM = 'หลักสูตร';
const DEPARTMENT = DEPARTMENTS.find(entry => entry.id === '05');

/** The fallback the owner chose: the kind word, a space, the code. */
const NAMELESS = `${KIND_DEPARTMENT} ${DEPARTMENT.id}`;

/** The units these rows take the name from, by table and key. */
const DEPARTMENT_05 = { table: 'departments', key: 'department_id', column: 'department_name_th', id: '05' };
const DEPARTMENT_01 = { table: 'departments', key: 'department_id', column: 'department_name_th', id: '01' };
const PROGRAM_0501 = { table: 'programs', key: 'program_id', column: 'program_name_th', id: '0501' };

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(() => db.end());

/**
 * Runs `body` with one unit nameless, and puts back whatever name it had
 * whatever happens - the name read in the same statement that takes it away,
 * not the seed's, so a rename an earlier file left is not overwritten (#137).
 */
async function withoutItsName(unit, body) {
  const { rows } = await db.query(
    `UPDATE ${unit.table} t SET ${unit.column} = NULL
       FROM (SELECT ${unit.key}, ${unit.column} FROM ${unit.table} WHERE ${unit.key} = $1 FOR UPDATE) old
      WHERE t.${unit.key} = old.${unit.key}
      RETURNING old.${unit.column} AS was`,
    [unit.id],
  );
  // The arrangement is asserted where it is used (#51): an update that touched
  // nothing, or a unit already nameless, would leave every row below red or
  // green for a reason that is not theirs.
  expect(rows, `${unit.table} ${unit.id} was made nameless`).toHaveLength(1);
  expect(rows[0].was, `${unit.table} ${unit.id} had a name to take away`).toBeTruthy();
  try {
    await body();
  } finally {
    await db.query(`UPDATE ${unit.table} SET ${unit.column} = $1 WHERE ${unit.key} = $2`, [
      rows[0].was,
      unit.id,
    ]);
  }
}

const scopePicker = page => page.getByRole('combobox', { name: 'ขอบเขตของบทบาท' });

test('row 1: the scope picker names a nameless department by its kind and code', async ({
  page,
}) => {
  await withoutItsName(DEPARTMENT_05, async () => {
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
  await withoutItsName(DEPARTMENT_05, async () => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await openEditor(page, ACCOUNTS.teacherOne);

    // The grant arrives with no name from the server (`scopeNames.js` reads the
    // same column), so the cell is drawn from the picker's list - the second of
    // the two ways into `scopeLabel`. Found by the role, which is one grant on
    // this account, and asserted to be (#51).
    // A card since #303: the kind is the statement's word, and the name under
    // it is the kind word and the code (`GrantsPanel.js`'s `scopeOf`).
    await saysScope(
      await scopeStatement(page, ROLE_NAMES.TEACHER),
      KIND_DEPARTMENT,
      NAMELESS,
    );
  });
});

test('row 3: the accounts list says the same in its role column', async ({ page }) => {
  await withoutItsName(DEPARTMENT_05, async () => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await search(page, ACCOUNTS.teacherOne);

    // A retrying read: the column is drawn first from the bare code and again
    // once the picker's list lands, which is the moment the unfixed screen threw.
    // Since #310 the words are the abbreviation's tooltip.
    const roles = await roleCell(page, ACCOUNTS.teacherOne);
    await expect
      .poll(() => grantTitles(roles))
      .toEqual([`${ROLE_NAMES.TEACHER} (${NAMELESS})`]);
  });
});

/**
 * Rows 4 and 5 - a nameless unit outside the reader's reach.
 *
 * `cross01`'s one grant is over department 01, which a 05 administrator cannot
 * offer, so the picker's list has no entry for it. The server still finds the
 * tier and sends `scope_kind`; with `scope_name` null, the review of ef1c5fa
 * found that `grantScope` went to the list and drew a bare `01` - the asymmetry
 * #294 closed, reopened for this one case.
 */
const OUT_OF_REACH = `${KIND_DEPARTMENT} ${DEPARTMENT_01.id}`;

test('row 4: the accounts list names a nameless unit out of reach by its kind and code', async ({
  page,
}) => {
  await withoutItsName(DEPARTMENT_01, async () => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await search(page, ACCOUNTS.crossScope);

    const roles = await roleCell(page, ACCOUNTS.crossScope);
    await expect
      .poll(() => grantTitles(roles))
      .toEqual([`${ROLE_NAMES.TEACHER} (${OUT_OF_REACH})`]);
  });
});

test('row 5: the held-roles table says the same, from the grant and not the list', async ({
  page,
}) => {
  await withoutItsName(DEPARTMENT_01, async () => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openUsers(page);
    await search(page, ACCOUNTS.crossScope);
    await openEditor(page, ACCOUNTS.crossScope);

    // The mechanism (#226): the list has landed and holds the administrator's
    // own department, and holds nothing for 01 - so what the cell says below
    // did not come from it.
    // The pickers are in the เพิ่มสิทธิ์ dialog since #303.
    await openGrantDialog(page);
    await expect(scopePicker(page).locator(`option[value="${DEPARTMENT.id}"]`)).toHaveCount(1);
    await expect(scopePicker(page).locator(`option[value="${DEPARTMENT_01.id}"]`)).toHaveCount(0);

    // A card since #303: the kind is the statement's word, and the name under
    // it is the kind word and the code (`GrantsPanel.js`'s `scopeOf`).
    await saysScope(
      await scopeStatement(page, ROLE_NAMES.TEACHER),
      KIND_DEPARTMENT,
      OUT_OF_REACH,
    );
  });
});

/**
 * Row 6 - the role picker, which is not `scopeLabel`'s: `RoleDropdown` puts
 * the kind word in front itself, and only where the role's name does not say
 * it. The assessor's does not, so a nameless curriculum reads
 * `ผู้ประเมินภายนอก หลักสูตร 0501`. (The committee's does, so its nameless
 * label is the role's name and the code, which the code before #297 already
 * drew and which no row here needs.)
 */
test('row 6: the role picker names a nameless curriculum by its kind and code', async ({
  page,
}) => {
  await withoutItsName(PROGRAM_0501, async () => {
    await signIn(page, ACCOUNTS.externalAssessor);

    const label = `${ROLE_NAMES.EXT_ASSESSOR} ${KIND_PROGRAM} ${PROGRAM_0501.id}`;
    await expect(actingButton(page)).toHaveText(label);
  });
});

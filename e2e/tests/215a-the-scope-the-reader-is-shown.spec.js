'use strict';

const { test, expect } = require('@playwright/test');
const { DEPARTMENTS, PROGRAMS } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUsers, search, listTable, userRow } = require('../support/users-screen');
const { ROLE_NAMES, openEditor, grantsTable } = require('../support/grants-panel');

/**
 * docs/acceptance/12-role-grants.md and 11-user-accounts.md §#215 and §#216 -
 * the two
 * administration screens that draw a scope for somebody to **read** say it the
 * way the picker says it.
 *
 * #90 gave the words to `GrantPicker`, the field where a scope is *chosen*.
 * #215 asked whether the three places that draw one for reading get the same
 * words; the owner answered on 23 October 2569 that the two administration
 * screens do, in `GrantPicker`'s wording letter for letter, and that
 * `RoleDropdown` is a question of its own because nothing it is handed carries
 * a name at all.
 *
 * The claim is #90's with the reader in place of the chooser. `05` and `0501`
 * are one digit apart on the screen and one level apart in authority, and this
 * is where an administrator goes to **check** that a grant went where it was
 * meant to - so a column that says `0501` and nothing else is the same
 * ambiguity #90 was opened about, read instead of pressed.
 *
 * Two rows for the two screens, because the wording is one shared function and
 * no mutant inside it can tell the two apart: what each row adds is that its
 * own way in arrives there (#191, #104). The third and fourth are for the other
 * half of the mechanism - the name is looked up in what the server said this
 * administrator may offer, so a grant outside their reach has no name to find
 * and keeps the bare code.
 *
 * That half is two rows for the same reason #198's pair is: the editor
 * *replaces* the accounts table, so the list's column and the panel's cell
 * cannot be read in one state. It was one row until the sweep, where
 * `dashwhenunknown` killed it at the column and left the panel's cell under the
 * red line, proved by nothing (#88).
 *
 * Rows 5 and 6 are #216's, added on 24 October 2569 when the owner took the
 * brackets off the one entry whose stored value is not a code. They are a pair
 * for the same reason rows 1 and 2 are: one function writes the words and no
 * mutant inside it can tell the accounts list from the held-roles table, so
 * what each adds is its own way in arriving (#191). Both are signed in as the
 * Central Admin, who is the only reader either way - see row 5.
 *
 * No row here writes anything. `multi01` holds the colliding pair by seed and
 * `cross01` is the account #130 added for exactly this asymmetry: the person is
 * inside department 05 and the grant is over 01, so a 05 administrator reaches
 * the one and not the other.
 */

/**
 * The kind words, in `CONTEXT.md`'s own vocabulary.
 *
 * Written out here as `90a` writes them out, and for the same reason: they are
 * read from the domain's vocabulary rather than from the component, so a screen
 * that renamed a kind fails a row rather than agreeing with itself.
 */
const KIND = { faculty: 'คณะ', department: 'ภาควิชา', program: 'หลักสูตร' };

/**
 * The unconfined entry's label, which `backend/routes/grants.js` decides and
 * only that file holds. Written out here as `90a` writes it out, for the
 * reason the kind words above are.
 */
const UNCONFINED = 'ทั้งมหาวิทยาลัย';

const scopeOf = (list, id) => list.find(entry => entry.id === id);

/** The colliding pair `multi01` holds a grant at each end of. */
const DEPARTMENT = scopeOf(DEPARTMENTS, '05');
const PROGRAM = scopeOf(PROGRAMS, '0501');

/** The scope as the screens are to write it, which is `GrantPicker`'s wording. */
const asDrawn = (kind, scope) => `${kind} · ${scope.th} (${scope.id})`;

/**
 * The precondition both of the first two rows press on, asserted where it is
 * used (#51): without one name held by two kinds there is nothing for a word to
 * disambiguate, and a row that stopped meeting it would read one entry twice.
 */
function theNameIsSharedByTwoKinds() {
  expect(DEPARTMENT, 'the seed holds no department 05').toBeDefined();
  expect(PROGRAM, 'the seed holds no programme 0501').toBeDefined();
  expect(PROGRAM.th).toBe(DEPARTMENT.th);
  expect(PROGRAM.id).not.toBe(DEPARTMENT.id);
}

/**
 * The role column of one account's row, found through the header above it.
 *
 * By header rather than by a number, because the column's position is not what
 * the claim is about and a number here would expire the day the table gains a
 * column (#173).
 */
async function roleCell(page, email) {
  const headers = await listTable(page).getByRole('columnheader').allTextContents();
  const column = headers.indexOf('บทบาท');
  expect(column, 'the accounts table has no บทบาท column').toBeGreaterThanOrEqual(0);
  return userRow(page, email).getByRole('cell').nth(column);
}

/**
 * The scope cell of the one grant a role is held at, by the column header.
 *
 * Not `grantCell`, which finds a grant by its role **and** its scope code: here
 * the code is the thing the claim is about, so a locator built on it is read at
 * the row's arrival and not at the cell. A mutant that rewrites the cell would
 * leave the row unfindable, and the row would die at the timeout with its own
 * assertion never read (#139, #213). The role alone identifies the row on both
 * of the accounts these rows use, and that it does is asserted here rather than
 * assumed (#51).
 */
async function panelScopeCell(page, roleLabel) {
  const rows = grantsTable(page)
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: roleLabel, exact: true }) });
  await expect(rows, `the panel holds one ${roleLabel} grant`).toHaveCount(1);
  const headers = await grantsTable(page).getByRole('columnheader').allTextContents();
  const column = headers.indexOf('ขอบเขต');
  expect(column, 'the held-roles table has no ขอบเขต column').toBeGreaterThanOrEqual(0);
  return rows.getByRole('cell').nth(column);
}

test('row 1: the held-roles table names each scope by kind and name', async ({ page }) => {
  theNameIsSharedByTwoKinds();

  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.multiRole);

  await expect(await panelScopeCell(page, ROLE_NAMES.TEACHER)).toHaveText(
    asDrawn(KIND.department, DEPARTMENT),
  );
  await expect(await panelScopeCell(page, ROLE_NAMES.PROG_MANAGER)).toHaveText(
    asDrawn(KIND.program, PROGRAM),
  );
});

test('row 2: the accounts list says it the same way in its role column', async ({ page }) => {
  theNameIsSharedByTwoKinds();

  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  // Through the screen's own search box: ten seeded accounts and a page of ten
  // mean this person is not necessarily on page one.
  await search(page, ACCOUNTS.multiRole);

  const roles = await roleCell(page, ACCOUNTS.multiRole);
  await expect(roles).toContainText(
    `${ROLE_NAMES.TEACHER} (${asDrawn(KIND.department, DEPARTMENT)})`,
  );
  await expect(roles).toContainText(
    `${ROLE_NAMES.PROG_MANAGER} (${asDrawn(KIND.program, PROGRAM)})`,
  );
});

/**
 * The scope `cross01`'s one grant is over, which a 05 administrator cannot hand
 * out. Asserted where it is used, like the colliding pair above it (#51).
 */
function theScopeOutOfReach() {
  const outOfReach = scopeOf(DEPARTMENTS, '01');
  expect(DEPARTMENT, 'the seed holds no department 05').toBeDefined();
  expect(outOfReach, 'the seed holds no department 01').toBeDefined();
  expect(outOfReach.id).not.toBe(DEPARTMENT.id);
  return outOfReach;
}

test('row 3: the accounts list keeps the bare code for a scope out of reach', async ({ page }) => {
  const outOfReach = theScopeOutOfReach();

  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  // The list is what is on screen before anything is opened: one grant, over a
  // department this administrator cannot hand out. The mechanism behind the
  // bare code is read by row 4, which has the picker to ask.
  //
  // `grantable` draws nothing of its own on this screen, so until it lands every
  // scope reads as a bare code and this row would pass on a screen that had
  // simply never asked (#132). The settle point is another account's row:
  // `multi01`'s scopes are both in reach, so the words appearing there say the
  // answer has arrived - and the code below is then the fallback and not the
  // empty list. Row 4 fences the same thing with the picker's own options.
  await search(page, ACCOUNTS.multiRole);
  await expect(await roleCell(page, ACCOUNTS.multiRole)).toContainText(
    `(${asDrawn(KIND.department, DEPARTMENT)})`,
  );

  await search(page, ACCOUNTS.crossScope);
  await expect(await roleCell(page, ACCOUNTS.crossScope)).toHaveText(
    `${ROLE_NAMES.TEACHER} (${outOfReach.id})`,
  );
});

test('row 4: the held-roles table keeps it, and the picker says why', async ({ page }) => {
  const outOfReach = theScopeOutOfReach();

  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await search(page, ACCOUNTS.crossScope);
  await openEditor(page, ACCOUNTS.crossScope);

  // The mechanism rather than the symptom: the name comes from what the server
  // said this administrator may offer, and this scope is not in that list. A
  // row that only read the cell would pass on a screen that had simply lost the
  // words (#145).
  // Waited for by what the answer carries rather than by the answer itself:
  // `openEditor` waits for the panel's read, and `grantable` is a second call
  // whose options are not on the screen yet when it returns (#132). The
  // administrator's own department is what that list must hold.
  const options = page.getByRole('combobox', { name: 'ขอบเขตของบทบาท' }).locator('option');
  await expect(options.filter({ hasText: `(${DEPARTMENT.id})` })).toHaveCount(1);

  const offered = await options.allTextContents();
  expect(offered.filter(text => text.endsWith(`(${outOfReach.id})`))).toHaveLength(0);

  await expect(await panelScopeCell(page, ROLE_NAMES.TEACHER)).toHaveText(outOfReach.id);
});

/**
 * #216 - the unconfined grant, which is the one scope whose code is not a code
 * (`CONTEXT.md` §Scope). The owner answered on 24 October 2569 that its
 * brackets go, and because the wording is one function the answer arrives at
 * all three sites at once; what this row adds is that it arrives **here**
 * (#191), where the role column put the scope's own brackets inside its own
 * and the cell read `ผู้ดูแลระบบกลาง (ทั้งมหาวิทยาลัย (FULL_ADMIN))`.
 *
 * Its reader is the one administrator who can get to it, which is measured
 * rather than assumed: a 05 and a faculty administrator searching for this
 * account on 24 October 2569 were each shown 0 rows. `backend/routes/users.js`
 * filters the list by `COALESCE(SENIORITY, 99) >= $2`, which excludes every
 * holder of a grant confined to nothing, and by `OWN_SCOPE = ANY($1)`, which
 * excludes this account again because it has neither a department nor a
 * programme. So the fallback to a bare code that rows 3 and 4 are about cannot
 * be reached for this scope at all: whoever may read it is offered it.
 */
test('row 5: the scope whose code is not a code says itself and nothing else', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.systemAdmin);

  await expect(await roleCell(page, ACCOUNTS.systemAdmin)).toHaveText(
    `${ROLE_NAMES.FULL_ADMIN} (${UNCONFINED})`,
  );
});

/**
 * #216 at the third site, which is the one the two rows above do not reach.
 * The held-roles table of `GrantsPanel` drew `ทั้งมหาวิทยาลัย (FULL_ADMIN)` in
 * its scope column, and that it now draws the name alone is this screen's own
 * claim rather than row 5's (#191, #50 - a gap explained in prose is not a gap
 * marked).
 *
 * The account is the reader's own: nothing on this screen refuses a person
 * their own editor - only the status toggle is disabled for oneself - and the
 * Central Admin is the only account holding the grant, so their own panel is
 * the one place in the system this cell exists.
 */
test('row 6: the held-roles table says the unconfined scope the same way', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.systemAdmin);
  await openEditor(page, ACCOUNTS.systemAdmin);

  await expect(await panelScopeCell(page, ROLE_NAMES.FULL_ADMIN)).toHaveText(UNCONFINED);
});

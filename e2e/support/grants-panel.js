'use strict';

const { expect } = require('@playwright/test');
const { openAccount } = require('./users-screen');
const { DEPARTMENTS, FACULTY, PROGRAMS } = require('../../db/seed');

/**
 * The grants panel - #12.
 *
 * It has no screen of its own. Since #303 it is the *สิทธิ์ของระบบ* tab of an
 * account's own page (`/main/users/edit-user/:userId`), one card per grant,
 * so everything here starts by putting that tab on screen and the rest is
 * scoped to the list inside its tab panel. Until #303 it was a table drawn
 * below the details form on `/main/users`, beside #13's history, and was told
 * apart from that by its `ผู้กำหนด` column; the history is not on the page
 * now (`docs/users-screen.md` rule 9), and a hidden tab panel is not in the
 * accessibility tree, so the tab's own name is the handle.
 */

/**
 * The panel's three calls, which are the read, the grant and the revoke.
 *
 * The revoke names the grant in the path - `.../roles/:roleId/:scopeId` - so
 * the pattern has to allow what follows `roles`, and the method is what tells
 * the three apart.
 */
const rolesOf = answer =>
  /^\/api\/users\/[^/]+\/roles(\/|$)/.test(new URL(answer.url()).pathname);

const waitForGrants = (page, method = 'GET') =>
  page.waitForResponse(answer => rolesOf(answer) && answer.request().method() === method);

/**
 * Opens one person's page and its *สิทธิ์ของระบบ* tab, and waits for the
 * panel's read - #12, re-aimed by #303.
 *
 * The panel reads its list when the page mounts, behind the hidden tab, so the
 * read is waited for across the press that opens the page and not across the
 * tab's.
 */
async function openEditor(page, email) {
  const [response] = await Promise.all([waitForGrants(page), openAccount(page, email)]);
  expect(response.status()).toBe(200);
  await page.getByRole('tab', { name: 'สิทธิ์ของระบบ' }).click();
  return response;
}

/** The tab the grants are on - #303. */
const grantsTab = page => page.getByRole('tabpanel', { name: 'สิทธิ์ของระบบ' });

/** The cards, one per grant - #303. */
const grantsList = page => grantsTab(page).getByRole('list');

/**
 * Where a grant is, as its card says it - #303: the word for its kind above
 * the unit's name, *ภาควิชา :* and the department's name under it.
 *
 * Until #303 the table's one cell read `ชนิดชื่อ`, the kind word written
 * straight onto the name (#295), and this was `scopeCell`. The words are built
 * out of `db/seed.js` rather than retyped (#118), and the pair is matched
 * whole, in one statement: department `05` and programme `0501` are both named
 * for computer engineering, the kind word is the only thing telling the two
 * apart, and `0501`'s name is a substring of `0503`'s (#116). A scope the seed
 * does not name reads under *ขอบเขต*, which is how the card draws one whose
 * unit is gone.
 *
 * This is an instrument and not a claim. The rows about the wording are
 * `215a`'s, `90a`'s and `303a`'s; the callers here use it to find a grant.
 */
const scopeOnCard = scopeId => {
  const department = DEPARTMENTS.find(entry => entry.id === scopeId);
  if (department) return { word: 'ภาควิชา', name: department.th };
  const program = PROGRAMS.find(entry => entry.id === scopeId);
  if (program) return { word: 'หลักสูตร', name: program.th };
  if (scopeId === FACULTY.id) return { word: 'คณะ', name: FACULTY.th };
  return { word: 'ขอบเขต', name: scopeId };
};

/**
 * One statement of a card - the word and its value inside one `dl` row, so a
 * word cannot be matched with another row's value (#93's *statement*).
 */
const statement = (page, word, value) =>
  page
    .locator('dl > div')
    .filter({ has: page.locator('dt').getByText(`${word} :`, { exact: true }) })
    .filter({ has: page.locator('dd').getByText(value, { exact: true }) });

/**
 * One grant, found by both of the things that identify it.
 *
 * A role alone is not enough: the same role held at two scopes is two cards,
 * and #12 is largely about the scope half.
 */
const grantRow = (page, roleLabel, scopeId) => {
  const where = scopeOnCard(scopeId);
  return grantsList(page)
    .getByRole('listitem')
    .filter({ has: statement(page, 'สิทธิ์', roleLabel) })
    .filter({ has: statement(page, where.word, where.name) });
};

/**
 * One value of a grant's card, by what the table's column was called until
 * #303 - the role, the scope, and the two halves of the small line under them.
 */
const grantCell = (page, roleLabel, scopeId, column) => {
  const card = grantRow(page, roleLabel, scopeId);
  if (column === 'บทบาท') return card.locator('dl > div').nth(0).locator('dd');
  if (column === 'ขอบเขต') return card.locator('dl > div').nth(1).locator('dd');
  return card.locator('p > span').nth(column === 'ผู้กำหนด' ? 0 : 1);
};

/** The add dialog - #303. */
const grantDialog = page => page.getByRole('dialog', { name: /^เพิ่มสิทธิ์ / });

/**
 * Opens the add dialog by *เพิ่มสิทธิ์* and hands it back - #303. The pickers
 * are inside it, and drawn only while it is open.
 */
async function openGrantDialog(page) {
  await page.getByRole('button', { name: 'เพิ่มสิทธิ์', exact: true }).click();
  await expect(grantDialog(page)).toBeVisible();
  return grantDialog(page);
}

/**
 * The scope statement of the one card a role is held on - #303, for the rows
 * about how a scope is worded (`215a`, `297a`).
 *
 * Found by the role alone, not by `grantRow`, because the scope's words are
 * the thing these rows are about: a locator built on them would leave the
 * card unfindable under a mutant that rewrote them, and the row would die at
 * the timeout with its own assertion never read (#139, #213). That the role
 * names one card on the account is asserted rather than assumed (#51).
 */
async function scopeStatement(page, roleLabel) {
  const cards = grantsList(page)
    .getByRole('listitem')
    .filter({ has: statement(page, 'สิทธิ์', roleLabel) });
  await expect(cards, `the panel holds one ${roleLabel} grant`).toHaveCount(1);
  return cards.locator('dl > div').nth(1);
}

/** That a scope statement reads this word over this name - #303. */
async function saysScope(where, word, name) {
  await expect(where.locator('dt')).toHaveText(`${word} :`);
  await expect(where.locator('dd')).toHaveText(name);
}

/**
 * Hands out a grant through the dialog's two pickers and waits for the
 * server's answer - through *เพิ่มสิทธิ์* on the tab bar since #303.
 *
 * The answer is returned rather than asserted: a refusal is what several of
 * #12's rows are about, and they need the status. A refusal leaves the dialog
 * open with its sentence inside; `closeGrantDialog` puts it away.
 */
async function addGrant(page, { role, scope }) {
  const dialog = await openGrantDialog(page);
  // By role and accessible name rather than by label: the two pickers are
  // wrapped in their `<label>` rather than pointed at by `for`, so a label
  // lookup takes the label's whole text - the caption *and* every option
  // inside the select - and matches neither caption on its own.
  await dialog.getByRole('combobox', { name: 'บทบาท', exact: true }).selectOption(role);
  await dialog.getByRole('combobox', { name: 'ขอบเขตของบทบาท' }).selectOption(scope);
  const [response] = await Promise.all([
    waitForGrants(page, 'POST'),
    dialog.getByRole('button', { name: 'บันทึก', exact: true }).click(),
  ]);
  return response;
}

/** Puts a refused add's dialog away by its ยกเลิก - #303. */
async function closeGrantDialog(page) {
  await grantDialog(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(grantDialog(page)).toHaveCount(0);
}

/** The trash can on one grant's card - #303. */
const revokeButton = (page, roleLabel, scopeId) =>
  grantRow(page, roleLabel, scopeId).getByRole('button', { name: 'ยกเลิกสิทธิ์' });

/**
 * Revokes one grant from its own card and its question, and returns the
 * server's answer - the question since #303.
 */
async function revoke(page, roleLabel, scopeId) {
  await revokeButton(page, roleLabel, scopeId).click();
  const question = page.getByRole('dialog', { name: 'ยืนยันการยกเลิกสิทธิ์' });
  const [response] = await Promise.all([
    waitForGrants(page, 'DELETE'),
    question.getByRole('button', { name: 'ยกเลิกสิทธิ์', exact: true }).click(),
  ]);
  return response;
}

/**
 * The role names the panel prints, so a spec reads as the acceptance row does.
 *
 * Copied rather than imported: `frontend/src/components/MapRole.js` is an ES
 * module inside the CRA build and this suite is CommonJS. What the copy risks
 * is drifting from the screen, and a drifted name fails the row that uses it
 * rather than passing quietly, because these are the strings the assertions
 * look for.
 */
const ROLE_NAMES = {
  FULL_ADMIN: 'ผู้ดูแลระบบกลาง',
  FACULTY_ADMIN: 'ผู้ดูแลระบบระดับคณะ',
  DEPT_ADMIN: 'ผู้ดูแลระบบระดับภาควิชา',
  PROG_MANAGER: 'กรรมการหลักสูตร',
  TEACHER: 'อาจารย์ผู้สอน',
  EXT_ASSESSOR: 'ผู้ประเมินภายนอก',
};

module.exports = {
  ROLE_NAMES,
  waitForGrants,
  openEditor,
  grantsTab,
  grantsList,
  scopeOnCard,
  grantRow,
  grantCell,
  grantDialog,
  openGrantDialog,
  scopeStatement,
  saysScope,
  addGrant,
  closeGrantDialog,
  revokeButton,
  revoke,
};

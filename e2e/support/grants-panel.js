'use strict';

const { expect } = require('@playwright/test');
const { search, userRow } = require('./users-screen');

/**
 * The grants panel - #12.
 *
 * It has no screen of its own. It is drawn below the details form once an
 * existing account is open on `/main/users`, so everything here starts by
 * putting a person's editor on screen and the rest is scoped to the one table
 * inside that panel.
 *
 * Scoped by the table's own `ผู้กำหนด` column, which is the only unambiguous
 * handle on it: the editor draws two tables at once - this one and #13's
 * history, whose headers are `กิจกรรม | ทำกับข้อมูล | เมื่อ` - and both share
 * the word `เมื่อ`. The accounts list is not a third, because the editor
 * replaces it rather than sitting beside it.
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
 * Opens one person's editor from the list, and waits for the panel's read.
 *
 * Through the screen's own search box, because ten seeded accounts and a page
 * of ten mean the row being asked for is not necessarily on page one.
 */
async function openEditor(page, email) {
  // Only when the box is not already showing this person. The filter survives
  // the editor closing, so typing the same term a second time changes nothing,
  // fires no `change`, and there is no request to wait for.
  const box = page.getByPlaceholder('ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้');
  if ((await box.inputValue()) !== email) await search(page, email);
  const [response] = await Promise.all([
    waitForGrants(page),
    userRow(page, email).getByRole('button', { name: 'แก้ไข' }).click(),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

/** The grants table, told apart from the history table below it. */
const grantsTable = page =>
  page
    .getByRole('table')
    .filter({ has: page.getByRole('columnheader', { name: 'ผู้กำหนด' }) });

/**
 * One grant, found by both of the things that identify it.
 *
 * A role alone is not enough: the same role held at two scopes is two rows,
 * and #12 is largely about the scope half.
 */
const grantRow = (page, roleLabel, scopeId) =>
  grantsTable(page)
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: roleLabel, exact: true }) })
    .filter({ has: page.getByRole('cell', { name: scopeId, exact: true }) });

/** One cell of a grant's row, by the column header above it. */
const COLUMNS = { บทบาท: 0, ขอบเขต: 1, ผู้กำหนด: 2, เมื่อ: 3 };
const grantCell = (page, roleLabel, scopeId, column) =>
  grantRow(page, roleLabel, scopeId).getByRole('cell').nth(COLUMNS[column]);

/**
 * Hands out a grant through the two pickers and waits for the server's answer.
 *
 * The answer is returned rather than asserted: a refusal is what several of
 * #12's rows are about, and they need the status.
 */
async function addGrant(page, { role, scope }) {
  // By role and accessible name rather than by label: the two pickers are
  // wrapped in their `<label>` rather than pointed at by `for`, so a label
  // lookup takes the label's whole text - the caption *and* every option
  // inside the select - and matches neither caption on its own.
  await page.getByRole('combobox', { name: 'บทบาท', exact: true }).selectOption(role);
  await page.getByRole('combobox', { name: 'ขอบเขตของบทบาท' }).selectOption(scope);
  const [response] = await Promise.all([
    waitForGrants(page, 'POST'),
    page.getByRole('button', { name: 'เพิ่มบทบาท' }).click(),
  ]);
  return response;
}

/** Revokes one grant from its own row, and returns the server's answer. */
async function revoke(page, roleLabel, scopeId) {
  const [response] = await Promise.all([
    waitForGrants(page, 'DELETE'),
    grantRow(page, roleLabel, scopeId).getByRole('button', { name: 'ยกเลิกบทบาท' }).click(),
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
  grantsTable,
  grantRow,
  grantCell,
  addGrant,
  revoke,
};

'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');
const { untilDrawn } = require('./pager');
const { openAt } = require('./navigation');

const DEPARTMENTS = '/main/departments';
const API = '/api/departments';

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/** Opens the screen and waits for the list a passing row is about to assert on to be drawn. */
async function openDepartments(page) {
  const response = await openAt(page, DEPARTMENTS, waitForList);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
}

/** This screen's import, bound to the endpoint it posts to. */
const importDepartments = (page, text, name = 'departments.csv') =>
  importCsv(page, { path: `${API}/import`, text, name });

/**
 * One row of the table, found by the identifier in its first cell.
 *
 * By cell rather than by `hasText`, because a two-character identifier such as
 * `05` appears inside other rows' text and inside the pager's line, and a row
 * matched that loosely would make a count assertion true by accident.
 */
const departmentRow = (page, departmentId) =>
  page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: departmentId, exact: true }) });

/**
 * Opens the editor on one row and waits for the department to be read back.
 *
 * The screen asks for the record again when the pencil is pressed rather than
 * drawing the form from the row in hand, so the status box below is showing
 * what the server holds and not what the list happened to carry.
 */
async function openEditor(page, departmentId) {
  await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === `${API}/${departmentId}` &&
        answer.request().method() === 'GET',
    ),
    departmentRow(page, departmentId).getByRole('button', { name: 'แก้ไข' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'แก้ไขภาควิชา' })).toBeVisible();
}

/**
 * The form's status control.
 *
 * A checkbox today, which is what every row built on this is a claim about;
 * #180 asks whether the five forms that carry this field should all use the
 * `select` two of them use, and if that is answered yes this is the one line
 * that changes.
 */
const statusBox = page => page.getByRole('checkbox', { name: 'เปิดใช้งาน' });

/** Presses *บันทึก* and waits for the list the save reloads. */
async function save(page) {
  const [reloaded] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return reloaded;
}

/**
 * The status badge of one row - the fourth cell, as the table's own header
 * orders them (รหัส · ชื่อ (ไทย) · ชื่อ (อังกฤษ) · สถานะ · จัดการ).
 */
const statusOf = (page, departmentId) =>
  departmentRow(page, departmentId).getByRole('cell').nth(3);

/**
 * The screen's own list, told apart from the rejection report's table.
 *
 * `first()` because the list is drawn above the import panel, and a refused
 * import puts the report's table on the screen underneath it.
 */
const listTable = page => page.locator('table').first();

/**
 * Deletes one department through the screen's own confirmation, and waits for
 * the list that follows.
 *
 * The wait is for a list request rather than for the banner, because the row
 * this serves — `57-pager.md` row 3 — is about *which page* the screen lands
 * on afterwards, and that is decided by the request it sends.
 */
async function removeDepartment(page, departmentId) {
  await departmentRow(page, departmentId).getByRole('button', { name: 'ลบ' }).click();
  const [answer] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'ลบภาควิชา' }).click(),
  ]);
  expect(answer.status()).toBe(200);
  return answer;
}

module.exports = {
  DEPARTMENTS,
  API,
  waitForList,
  openDepartments,
  importDepartments,
  departmentRow,
  openEditor,
  statusBox,
  save,
  statusOf,
  listTable,
  removeDepartment,
};

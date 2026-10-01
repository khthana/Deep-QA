'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');
const { untilDrawn } = require('./pager');
const { openAt } = require('./navigation');

/**
 * The curriculum screen — #15.
 *
 * Written for `docs/acceptance/57-pager.md` row 4 — open, import, find a row,
 * delete it — and added to by #181, which brought this screen's own status rows
 * to the browser seam. The rest of #15's checklist is still walked by hand, so
 * this module is those two subjects and not the whole screen.
 */

const PROGRAMS = '/main/programs';
const API = '/api/programs';

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/** Opens the screen and waits for the list a passing row is about to assert on to be drawn. */
async function openPrograms(page) {
  const response = await openAt(page, PROGRAMS, waitForList);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
}

/** This screen's import, bound to the endpoint it posts to. */
const importPrograms = (page, text, name = 'programs.csv') =>
  importCsv(page, { path: `${API}/import`, text, name });

/**
 * The screen's own list, told apart from the rejection report's table.
 *
 * `first()` because the list is drawn above the import panel, and a refused
 * import puts the report's table on the screen underneath it.
 */
const listTable = page => page.locator('table').first();

/**
 * One row of the table, found by the code in its first cell.
 *
 * By cell rather than by `hasText`, for `departmentRow`'s reason: the
 * confirmation dialog repeats a code, and a row matched loosely would make a
 * count assertion true by accident.
 */
const programRow = (page, programId) =>
  page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: programId, exact: true }) });

/**
 * Opens the editor on one row and waits for the programme to be read back.
 *
 * Its own request, as the departments screen's is: the form is drawn from this
 * answer, so the status box below reads what the server holds rather than what
 * the list happens to be showing.
 */
async function openEditor(page, programId) {
  await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === `${API}/${programId}` &&
        answer.request().method() === 'GET',
    ),
    programRow(page, programId).getByRole('button', { name: 'แก้ไข' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'แก้ไขหลักสูตร' })).toBeVisible();
}

/**
 * The form's status control - drawn only on an edit here, because a programme
 * is created in order to be offered and the route reads no such field on a
 * creation. See `departments-screen.js` for what #180 asks about its shape.
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
 * The status badge of one row - the fifth cell, as the table's own header
 * orders them (รหัส · ชื่อ · ภาควิชา · ปี · สถานะ · จัดการ) - one further along than the departments
 * table's, which is why each screen says its own index here.
 */
const statusOf = (page, programId) =>
  programRow(page, programId).getByRole('cell').nth(4);

/**
 * Deletes one programme through the screen's own confirmation, and waits for
 * the list that follows.
 *
 * The wait is for a list request rather than for the banner, because the row
 * this serves is about *which page* the screen lands on afterwards — and that
 * is decided by the request it sends, not by what it says.
 */
async function removeProgram(page, programId) {
  await programRow(page, programId).getByRole('button', { name: 'ลบ' }).click();
  const [answer] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'ลบหลักสูตร' }).click(),
  ]);
  expect(answer.status()).toBe(200);
  return answer;
}

module.exports = {
  PROGRAMS,
  API,
  waitForList,
  openPrograms,
  importPrograms,
  listTable,
  programRow,
  openEditor,
  statusBox,
  save,
  statusOf,
  removeProgram,
};

'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');

/**
 * The curriculum screen — #15.
 *
 * Written for `docs/acceptance/57-pager.md` row 4, which is the only row of
 * this screen the browser seam reaches so far: #15's own checklist was walked
 * by hand and has no spec file. What is here is therefore what that one row
 * needs — open, import, find a row, delete it — and not the whole screen.
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

/** Opens the screen and waits for the list a passing row is about to assert on. */
async function openPrograms(page) {
  const [response] = await Promise.all([waitForList(page), page.goto(PROGRAMS)]);
  expect(response.status()).toBe(200);
  return response;
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
  removeProgram,
};

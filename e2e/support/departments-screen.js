'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');

const DEPARTMENTS = '/main/departments';
const API = '/api/departments';

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/** Opens the screen and waits for the list a passing row is about to assert on. */
async function openDepartments(page) {
  const [response] = await Promise.all([waitForList(page), page.goto(DEPARTMENTS)]);
  expect(response.status()).toBe(200);
  return response;
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

module.exports = {
  DEPARTMENTS,
  API,
  waitForList,
  openDepartments,
  importDepartments,
  departmentRow,
};

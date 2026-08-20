'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');

/**
 * The accounts screen - #11.
 *
 * The first screen this system built an import for, and the one the shared
 * `ImportPanel` was written against, so its rows are the originals the other
 * screens' import rows are copies of.
 */

const USERS = '/main/users';
const API = '/api/users';

/**
 * Waits for the list the screen asks for, whatever the answer turns out to be.
 *
 * Matched on the exact path: the form's own `GET /api/users/grantable` and a
 * row's `GET /api/users/:userId` both live under this one, and a looser match
 * would return whichever of the three answered first.
 */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/** Opens the screen and waits for the list a passing row is about to assert on. */
async function openUsers(page) {
  const [response] = await Promise.all([waitForList(page), page.goto(USERS)]);
  expect(response.status()).toBe(200);
  return response;
}

/**
 * Types into the screen's own search box and waits for the answer to the query
 * that box built.
 *
 * The screen reloads on every keystroke - there is no debounce - so several
 * requests are in flight while a word is being typed and all but the last are
 * about a prefix of it. The wait is therefore for the response whose own `q`
 * is the whole term, not merely for the next response to arrive.
 */
async function search(page, term) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === API &&
        new URL(answer.url()).searchParams.get('q') === term,
    ),
    page.getByPlaceholder('ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้').fill(term),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

/** This screen's import, bound to the endpoint it posts to. */
const importUsers = (page, text, name = 'users.csv') =>
  importCsv(page, { path: `${API}/import`, text, name });

/**
 * One row of the table, found by the address in its own cell.
 *
 * By cell rather than by `hasText`, because every seeded address ends in the
 * same domain and `admin@kmitl.ac.th` is a substring of
 * `faculty.admin@kmitl.ac.th` - a row matched that loosely would make the
 * scope rows below true by accident, which is the one thing they must not be.
 */
const userRow = (page, email) =>
  page.getByRole('row').filter({ has: page.getByRole('cell', { name: email, exact: true }) });

/**
 * The screen's own list, told apart from the rejection report's table.
 *
 * `first()` because the list is drawn above the import panel, and a refused
 * import puts the report's table on the screen underneath it.
 */
const listTable = page => page.locator('table').first();

module.exports = {
  USERS,
  API,
  waitForList,
  openUsers,
  search,
  importUsers,
  userRow,
  listTable,
};

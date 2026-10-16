'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');
const { panel } = require('./confirm-dialog');
const { untilDrawn } = require('./pager');
const { openAt } = require('./navigation');

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

/** Opens the screen and waits for the list a passing row is about to assert on to be drawn. */
async function openUsers(page) {
  const response = await openAt(page, USERS, waitForList);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
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

/** The route one row's switch writes to, which is also where it is held. */
const statusPath = userId => `${API}/${userId}/status`;

/**
 * The button that answers the question the switch asks since #86.
 *
 * It is the delivered screen's own word - `StatusConfirmModal` in
 * `DEEP-QA-FRONTEND` confirmed with `ยืนยันการเปลี่ยน`, and #86 restored a
 * control the rebuild had dropped rather than inventing one. It is an
 * instrument here, for the six files that only need to get *through* the box;
 * what the box *says* is `86a`'s own claim and is written out there as
 * literals, because a row that read its expected text from the helper the
 * screen is driven by would assert nothing (#104).
 */
const CONFIRM_STATUS = 'ยืนยันการเปลี่ยน';

/** One row's suspend / reactivate control, by the verb it is showing. */
const statusButton = (page, email, label) =>
  userRow(page, email).getByRole('button', { name: label, exact: true });

/**
 * Presses it, which since #86 asks rather than writes.
 *
 * The row is found by the caller's address and not again here: the screen
 * reloads the list on the same search term after a status change, so the row is
 * still on screen with the other verb on its button - and typing the term a
 * second time would set the box to what it already holds, fire no change event
 * and wait for a request that is never sent.
 */
const startStatusChange = (page, email, label) => statusButton(page, email, label).click();

/**
 * Answers the question. Scoped to the dialog's own box rather than to the page,
 * because the table underneath it is live the whole time (#204).
 */
const confirmStatusChange = page =>
  panel(page).getByRole('button', { name: CONFIRM_STATUS, exact: true }).click();

/**
 * The whole change as a person performs it - ask, confirm, and wait for the
 * answer to the one write it makes.
 *
 * The `PUT` is waited for from behind the confirming press rather than before
 * it, because nothing is sent until the question is answered: that is #86's
 * first claim, and a helper that waited for the write around the *first* press
 * would hang on the fixed code and pass on the broken one.
 */
async function setStatusByHand(page, email, userId, label) {
  await startStatusChange(page, email, label);
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        new URL(response.url()).pathname === statusPath(userId) &&
        response.request().method() === 'PUT',
    ),
    confirmStatusChange(page),
  ]);
  return answer;
}

module.exports = {
  USERS,
  API,
  CONFIRM_STATUS,
  waitForList,
  openUsers,
  search,
  importUsers,
  userRow,
  listTable,
  statusPath,
  statusButton,
  startStatusChange,
  confirmStatusChange,
  setStatusByHand,
};

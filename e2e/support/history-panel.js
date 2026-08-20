'use strict';

const { expect } = require('@playwright/test');
const { waitForList, search } = require('./users-screen');

/**
 * The activity history - #13.
 *
 * One panel drawn in two places: beneath an open account's editor on
 * `/main/users`, and on `/main/users/user-history`, where the reader picks the
 * person first. Everything here is bound to the second, because that is where
 * the picker rows of the checklist live, and the panel itself is the same
 * component either way.
 *
 * The picker's search box carries the same placeholder as the accounts
 * screen's and feeds the same `GET /api/users`, so `search` is imported rather
 * than written again - what differs between the two screens is only what the
 * answer is drawn into.
 */

const HISTORY = '/main/users/user-history';

/** Where one account's history is read from, which is per account. */
const historyPath = userId => `/api/users/${userId}/history`;

/**
 * Waits for the read of one named account's history, optionally of one page
 * of it.
 *
 * Named rather than "the next history response", because the rows that matter
 * here are about the panel swapping from one person to another, and a wait
 * that would accept either answer could not tell the swap from a page that
 * never changed.
 *
 * The page number matters for the same reason under the development server:
 * React's strict mode runs the panel's effect twice, so two identical reads of
 * page one are in flight after every change of person, and a wait for "the
 * next one" would be answered by the straggler rather than by the request the
 * click just made.
 */
const waitForHistory = (page, userId, pageNumber) =>
  page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === historyPath(userId) &&
      (pageNumber === undefined ||
        new URL(answer.url()).searchParams.get('page') === String(pageNumber)),
  );

/** Opens the screen and waits for the list the picker is filled from. */
async function openHistory(page) {
  const [response] = await Promise.all([waitForList(page), page.goto(HISTORY)]);
  expect(response.status()).toBe(200);
  return response;
}

/**
 * Narrows the picker, chooses a person, and waits for their history.
 *
 * The search is optional because the picker holds a hundred accounts and the
 * seed has ten - but the checklist's filter row is about typing into the box,
 * so the rows that are about it pass a term.
 */
async function pick(page, { userId, q }) {
  if (q !== undefined) await search(page, q);
  const [response] = await Promise.all([
    waitForHistory(page, userId),
    page.getByRole('combobox').selectOption(userId),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

/**
 * The history table, told apart from the grants table.
 *
 * Both are drawn at once when this panel is reached through an account's
 * editor, and both have a `เมื่อ` column - so the handle is `กิจกรรม`, which
 * only this one has.
 */
const historyTable = page =>
  page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'กิจกรรม' }) });

/** The lines of the history, newest first, as the panel drew them. */
const entries = page => historyTable(page).locator('tbody tr');

/** One cell of the nth line, by the column header above it. */
const COLUMNS = { กิจกรรม: 0, ทำกับข้อมูล: 1, เมื่อ: 2 };
const entryCell = (page, index, column) =>
  entries(page).nth(index).getByRole('cell').nth(COLUMNS[column]);

/**
 * What the panel's pager reads out, which is where the page number shows.
 *
 * Not scoped to the panel, because on `/main/users/user-history` the panel's
 * is the only pager on screen - the picker above it is a search box and a
 * `<select>`. A row that used this on the accounts editor would have to scope
 * it, and none does.
 */
const pagerLine = page => page.getByText(/ทั้งหมด \d+ รายการ · หน้า/);

/**
 * The activity labels the panel prints, so a spec reads as the checklist row
 * does. Copied from `frontend/src/components/users/HistoryPanel.js` for the
 * same reason `ROLE_NAMES` is copied - the suite is CommonJS and the screen is
 * an ES module inside the CRA build.
 */
const ACTIONS = {
  LOGIN: 'เข้าสู่ระบบ',
  LOGOUT: 'ออกจากระบบ',
  SET_USER_STATUS: 'เปลี่ยนสถานะบัญชี',
  UPDATE_USER: 'แก้ไขข้อมูลผู้ใช้',
  GRANT_ROLE: 'ให้บทบาท',
  REVOKE_ROLE: 'ยกเลิกบทบาท',
};

module.exports = {
  HISTORY,
  ACTIONS,
  historyPath,
  waitForHistory,
  openHistory,
  pick,
  historyTable,
  entries,
  entryCell,
  pagerLine,
};

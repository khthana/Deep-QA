'use strict';

const { expect } = require('@playwright/test');
const { untilDrawn } = require('./pager');
const { openAt } = require('./navigation');

/**
 * The activity history - #13, given back its delivered table by #305.
 *
 * One table of every account's lines on `/main/users/user-history`, read from
 * `GET /api/history` a page at a time, with a search box over it - the
 * owner's rule 11 of `docs/users-screen.md` (22 November 2569). Until #305 the
 * screen was a picker over one account's history at a time, read from
 * `GET /api/users/:id/history`, and this file's `pick` chose the person; that
 * route is still there and no screen reads it.
 *
 * The file keeps its name because three specs require it by that name.
 */

const HISTORY = '/main/users/user-history';

/** Where the table is read from - every account's lines, one route. */
const API = '/api/history';

/** The box's placeholder, which is also its accessible name (`SearchBox`). */
const BOX = 'ค้นหาประวัติการใช้งาน';

/**
 * Waits for a read of the table, optionally of one search term and one page.
 *
 * Narrowed by the term and the page because the development server runs the
 * screen's effect twice (strict mode), so after every change there is more
 * than one read in flight, and a wait for "the next one" would be answered by
 * a straggler rather than by the read the row just caused (#132).
 */
const waitForHistory = (page, { q, pageNumber } = {}) =>
  page.waitForResponse(answer => {
    const url = new URL(answer.url());
    return (
      url.pathname === API &&
      answer.request().method() === 'GET' &&
      (q === undefined || (url.searchParams.get('q') ?? '') === q) &&
      (pageNumber === undefined || url.searchParams.get('page') === String(pageNumber))
    );
  });

/** Opens the screen and waits for its first page to be drawn. */
async function openHistory(page) {
  const response = await openAt(page, HISTORY, shown => waitForHistory(shown));
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
}

/**
 * Types into the screen's search box and waits for the answer to the term,
 * drawn.
 *
 * The box asks once typing pauses (#272), so the wait is for the response
 * whose own `q` is the whole term. Not for page one of it, although that is
 * where a new term puts the reader: a screen that kept the last term's page
 * would then hang this wait, where `13a` row 6 wants it to fail at the claim
 * that the pager reads หน้า 1 (#139).
 */
async function searchHistory(page, term) {
  const [response] = await Promise.all([
    waitForHistory(page, { q: term }),
    page.getByRole('searchbox', { name: BOX }).fill(term),
  ]);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
}

/** The history table - the one table on the screen. */
const historyTable = page =>
  page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'กิจกรรม' }) });

/** The lines of the table, newest first, as the screen drew them. */
const entries = page => historyTable(page).locator('tbody tr');

/** One cell of the nth line, by the column header above it. */
const COLUMNS = {
  ผู้ใช้งาน: 0,
  กิจกรรม: 1,
  วันที่: 2,
  เวลา: 3,
  รหัสผู้ใช้งาน: 4,
  ทำกับข้อมูล: 5,
};
const entryCell = (page, index, column) =>
  entries(page).nth(index).getByRole('cell').nth(COLUMNS[column]);

/** What the pager reads out, which is where the page number shows. */
const pagerLine = page => page.getByText(/ทั้งหมด \d+ รายการ · หน้า/);

/**
 * The activity labels the screen prints, so a spec reads as the checklist row
 * does. Copied from `frontend/src/components/users/historyEntry.js` for the
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
  CREATE_PROGRAM: 'เพิ่มหลักสูตร',
};

module.exports = {
  HISTORY,
  API,
  BOX,
  ACTIONS,
  waitForHistory,
  openHistory,
  searchHistory,
  historyTable,
  entries,
  entryCell,
  pagerLine,
};

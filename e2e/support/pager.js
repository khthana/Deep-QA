'use strict';

const { expect } = require('@playwright/test');

/**
 * The paging control every list draws — `frontend/src/components/Pager.js`,
 * ticket #57.
 *
 * One module rather than a copy in each screen's module, for the reason #57
 * exists at all: six screens render the same component, and a helper written
 * six times is six chances to assert something slightly different about the
 * same markup.
 *
 * What a screen must still supply is its own *table*, because that is the part
 * that differs — and because the table is what says whether the screen has
 * finished drawing. See `settled`.
 */

/** The line that reads out the count and the page. */
const pagerLine = page =>
  page.getByText(/ทั้งหมด \d+ รายการ · หน้า \d+ จาก \d+/);

const previous = page => page.getByRole('button', { name: 'ก่อนหน้า' });
const next = page => page.getByRole('button', { name: 'ถัดไป' });

/**
 * Waits until the table is showing rows rather than "กำลังโหลด…".
 *
 * The list request answering and the screen redrawing are two moments, and
 * every one of these screens keeps its old numbers and draws a placeholder row
 * in between. A read taken in that gap is a read of the page before, or of the
 * placeholder — and the first mutation sweep of `57a` found a row passing on
 * exactly that: the placeholder is one "key", disjoint from every real page,
 * so "หน้าถัดไปคือคนละชุด" was true without anything having paged.
 *
 * Nothing here reads the pager or the table without going through this first.
 *
 * The "ไม่พบ…" line an empty list draws is deliberately let through: it is
 * what a settled empty table looks like, and the rows that read an empty list
 * assert the pager's own line rather than counting keys.
 */
async function settled(table) {
  await expect(table.locator('tbody tr td:first-child').first()).not.toHaveText(
    'กำลังโหลด…',
  );
}

/**
 * What the line says, as numbers.
 *
 * Read from the rendered line rather than from the response, deliberately: the
 * rows this backs are about what the reader is told, and a helper that
 * answered from the network would agree with a screen that drew nothing.
 */
async function reading(page, table) {
  await settled(table);
  const text = await pagerLine(page).innerText();
  const [, total, shown, pages] = text.match(
    /ทั้งหมด (\d+) รายการ · หน้า (\d+) จาก (\d+)/,
  );
  return { total: Number(total), shown: Number(shown), pages: Number(pages) };
}

/**
 * The identity of every row the table is showing, in the order it shows them.
 *
 * The first cell of each row, which on all six of these screens is the natural
 * key — a user id, a department code, a programme code, a subject code. That
 * is what makes "หน้าถัดไปคือคนละชุด" checkable: two pages of a list are
 * different pages only if the keys on them are disjoint.
 *
 * `tbody tr td:first-child` and not `getByRole('row')`, because the loading
 * placeholder and the "ไม่พบ…" line are rows too, and both carry a single
 * `colSpan` cell that would come back as one more "key".
 */
async function keysOn(table) {
  await settled(table);
  return table.locator('tbody tr td:first-child').allInnerTexts();
}

/**
 * Presses *ถัดไป* (or *ก่อนหน้า*) and waits for the list that press asks for.
 *
 * The wait is on the screen's own list request, handed in, because the four
 * screens this is used from ask four different endpoints and each has its own
 * `waitForList` already.
 */
async function step(page, direction, waitForList) {
  const button = direction === 'back' ? previous(page) : next(page);
  const [answer] = await Promise.all([waitForList(page), button.click()]);
  expect(answer.status()).toBe(200);
  return answer;
}

/** Walks forward to the last page, and answers how many pages there were. */
async function toLastPage(page, table, waitForList) {
  const { pages } = await reading(page, table);
  for (let at = 1; at < pages; at += 1) await step(page, 'forward', waitForList);
  return pages;
}

module.exports = {
  pagerLine,
  previous,
  next,
  settled,
  reading,
  keysOn,
  step,
  toLastPage,
};

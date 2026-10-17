'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  PROGRAM_SUBJECTS,
  PROGRAM_SUBJECTS_API,
  menuLink,
} = require('../support/shell');

/**
 * #214 — the side menu's group header is a toggle, and nothing used to press it
 * on purpose.
 *
 * `SidebarItem.js` draws a group header as a `NavLink` that prevents its own
 * default and calls `handleToggleSubmenu(item.key)`; `Sidebar.js` keeps the open
 * groups in a list and that call adds or removes the key. For every role but the
 * teacher the arrival effect opens **all** the groups, so the first press on a
 * header closes one.
 *
 * Until #212 the only rows pressing a header were four committee arrivals that
 * believed the group was shut: they pressed it, closing the group, and then
 * clicked the entry underneath inside the window `AnimatePresence` leaves it in
 * the document for. #212 measured that window at **eight frames** on this
 * machine and took the press out of all four, which left the header's own
 * behaviour proved by nothing at all — this file is that gap, and the ticket it
 * was written into rather than left in a story (#119, #89, #125).
 *
 * ## Why the rows wait for the entry to go
 *
 * Row 2's claim is that a second press brings the group back. Pressed at a
 * settle point straight after the first press, that row would read an entry the
 * exit animation had not finished removing and pass on a shell that never
 * reopened anything — the eight frames are long enough. So the close is read
 * **to completion** before the second press, which is this suite's rule about
 * reading a thing at the moment it is about rather than at the first convenient
 * one (#50, #164).
 *
 * The negative read is a retrying one, which in this suite is usually the
 * assertion that cannot fail (#50). It can here, and the mutants are the
 * evidence: `alwaysopen` leaves the entry in the document for ever and the wait
 * spends its timeout saying so. What makes the difference is that nothing
 * removes this entry by itself — only the press under test does.
 */

/** The committee's second group and the first entry inside it. */
const GROUP = 'หลักสูตร';
const ENTRY = 'รายวิชาในหลักสูตร';

/**
 * The group's own header, as a person reaches it.
 *
 * `menuLink` is exact for the reason its own comment gives — the shell's names
 * nest, and ข้อมูลหลัก is inside ข้อมูลหลักสูตร. Here it matters twice over:
 * หลักสูตร is a substring of this role's four other labels, including the entry
 * this row presses next.
 */
const groupHeader = page => menuLink(page, GROUP);
const groupEntry = page => menuLink(page, ENTRY);

/**
 * Arrives in the committee's shell with the group open, and says so.
 *
 * The count is asserted rather than the visibility: the claim both rows rest on
 * is that the group arrives **open**, which is what makes the first press a
 * close, and it is the premise `arrivesclosed` is aimed at. A row that only read
 * the header would pass in a shell that arrived shut, and then row 1 would be
 * measuring a press that opens.
 */
async function arriveWithTheGroupOpen(page) {
  await signIn(page, ACCOUNTS.committee0501);
  await expect(groupHeader(page)).toBeVisible();
  await expect(groupEntry(page), 'the entry on arrival').toHaveCount(1);
}

test('row 1: pressing an open group header closes the group', async ({
  page,
}) => {
  await arriveWithTheGroupOpen(page);

  await groupHeader(page).click();

  // Gone from the document, not merely invisible: the exit animation takes the
  // list out, and until it has the entry is still clickable - which is the
  // whole of #212.
  await expect(
    groupEntry(page),
    'the entry after the press that closes',
  ).toHaveCount(0);
  // And the header it was pressed on is still there to press again, which is
  // what makes it a toggle rather than a way out.
  await expect(groupHeader(page)).toBeVisible();
});

test('row 2: pressing it again reopens the group, and the entry still works', async ({
  page,
}) => {
  await arriveWithTheGroupOpen(page);

  await groupHeader(page).click();
  await expect(
    groupEntry(page),
    'the entry after the first press',
  ).toHaveCount(0);

  await groupHeader(page).click();
  await expect(
    groupEntry(page),
    'the entry after the second press',
  ).toHaveCount(1);

  // The entry is not only drawn again but reaches its screen, which is the half
  // a reopened group is for. The answer is read rather than the address alone:
  // a shell that drew the entry and navigated nowhere would pass on the URL.
  const [answer] = await Promise.all([
    page.waitForResponse(
      response => new URL(response.url()).pathname === PROGRAM_SUBJECTS_API,
    ),
    groupEntry(page).click(),
  ]);
  expect(answer.status()).toBe(200);
  await expect(page).toHaveURL(PROGRAM_SUBJECTS);
});

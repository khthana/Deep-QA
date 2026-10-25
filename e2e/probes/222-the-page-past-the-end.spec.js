/*
 * #222 - can one person, alone, reach a page the list no longer has?
 *
 * A probe and not a row. #222 asks whether `backend/lib/paging.js` should put
 * a ceiling on `page`, and its reason for *not hurting yet* is that every
 * paginated screen corrects the server on the client since #209's answer ก.
 * That reason is a claim with a date on it (#81), and the code says it is
 * false: `<Pager>` has eleven mount points and seven carry #209's correction.
 * `Users.js` is one of the four that do not, and it is the only one of the
 * four with a write that can make the list it is drawing shorter - the status
 * filter plus ระงับ, which moves a row out of `status=active`.
 *
 * So this asks the screen, rather than reasoning from the code (#141). It is
 * the shape of #209's own two measurements, with one difference that is the
 * point: **there is no second actor here.** One person, one filter, one press
 * at a time, no held answer and no race - the screen simply stays there until
 * the person presses something themselves. A reload does take it away, the
 * page number being `useState(1)` on the screen rather than part of the URL.
 *
 * Run it (the ports are this machine's today - read `netsh interface ipv4
 * show excludedportrange protocol=tcp` before trusting any number here, #237):
 *
 *   cp e2e/probes/222-the-page-past-the-end.spec.js e2e/tests/000-probe-222.spec.js
 *   cd e2e && E2E_BACKEND_PORT=3600 E2E_FRONTEND_PORT=5310 \
 *     npx playwright test tests/000-probe-222.spec.js --reporter=line
 *   rm e2e/tests/000-probe-222.spec.js
 *
 * What it cannot say (#123):
 *
 *   - it cannot say what the person *should* read. That is the owner's
 *     question, which is what #222 is;
 *   - it cannot say the other three uncorrected mount points are safe. It says
 *     nothing about them: `Students.js` has no แก้ไข and no ลบ, and
 *     `HistoryPanel` / `GroupHistory` write nothing at all, so no press on
 *     those screens shortens their own list. A second actor is another
 *     question and this probe does not ask it;
 *   - it is a claim about this seed. The arm asserts what it found on arrival,
 *     so a seed whose active accounts no longer fill more than one page makes
 *     it **red** rather than wrong;
 *   - the suspends it performs are real writes. `hold()` puts them back, and
 *     the arm reports the status it is about to change so a run that is killed
 *     leaves the numbers behind in the output.
 */

'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { reading, keysOn, toLastPage, pagerLine } = require('../support/pager');
const users = require('../support/users-screen');

const EMAIL = /[^\s]+@[^\s]+/;

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(async () => {
  await release();
});

/** The status filter, found by the option it carries rather than by its label. */
const statusFilter = (page) =>
  page.locator('select').filter({ has: page.locator('option', { hasText: 'ทุกสถานะ' }) });

/** Every address drawn in the rows of the list, in the order they are drawn. */
async function addressesOn(page) {
  const rows = await users.listTable(page).locator('tbody tr').all();
  const found = [];
  for (const row of rows) {
    const match = (await row.innerText()).match(EMAIL);
    if (match) found.push(match[0]);
  }
  return found;
}

test('Users.js: one person suspends the last page out from under themselves', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await users.openUsers(page);
  const table = users.listTable(page);

  const [answer] = await Promise.all([
    page.waitForResponse(
      (reply) =>
        new URL(reply.url()).pathname === users.API &&
        new URL(reply.url()).searchParams.get('status') === 'active',
    ),
    statusFilter(page).selectOption('active'),
  ]);
  expect(answer.status()).toBe(200);

  const first = await reading(page, table);
  // The precondition, asserted where it is used (#51). A seed with one page of
  // active accounts cannot build this situation at all, and the arm says so
  // here rather than passing for the wrong reason.
  expect(first.pages, 'the active list fills more than one page').toBeGreaterThan(1);

  const last = await toLastPage(page, table, users.waitForList);
  const onTheLastPage = await keysOn(table);
  const addresses = await addressesOn(page);
  console.log(
    `#222 · status=active · ทั้งหมด ${first.total} · หน้าสุดท้าย ${last} · ` +
      `แถวบนหน้านั้น ${onTheLastPage.length} · ที่อยู่ที่อ่านได้ ${addresses.length}`,
  );
  expect(addresses.length, 'every row on the last page has an address to press').toBe(
    onTheLastPage.length,
  );

  // Suspend them one at a time, as a person does: ask, confirm, wait for the
  // list the screen reloads. Nothing is held and nothing races.
  const lines = [];
  for (const address of addresses) {
    await users.startStatusChange(page, address, 'ระงับ');
    await Promise.all([users.waitForList(page), users.confirmStatusChange(page)]);
    lines.push(await pagerLine(page).innerText());
    console.log(`#222 · ระงับ ${address} → ${lines[lines.length - 1]}`);
  }

  const after = await reading(page, table);
  // What the table holds, not how many rows it has: the empty state **is** a
  // row, so counting them answers 1 on the screen that is drawing nothing
  // (#164's sampler, one species along - and the first run of this probe
  // predicted 0 and was wrong for exactly that reason).
  const held = await keysOn(table);
  console.log(
    `#222 · หลังระงับครบ: ทั้งหมด ${after.total} · อยู่หน้า ${after.shown} · ` +
      `มีทั้งหมด ${after.pages} หน้า · สิ่งที่ตารางถือ ${JSON.stringify(held)}`,
  );

  // The prediction, made an assertion rather than kept in the reader's head
  // (#205). If `Users.js` had #209's correction this would be false, because
  // the screen would have handed the person to the last page that still
  // exists before anything was drawn.
  expect(
    after.shown,
    'predicted: the screen stays on a page the list no longer has',
  ).toBeGreaterThan(after.pages);
  expect(
    await table.locator('tbody').innerText(),
    'predicted: and the table says it found nobody, on a page it is standing on',
  ).toContain('ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก');
});

'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isGet } = require('../support/gate');
const { csv, downloadTemplate, headerOf } = require('../support/import-panel');
const { keysOn, reading, toLastPage } = require('../support/pager');
const users = require('../support/users-screen');

/**
 * #239 - #209's rule reaches the accounts screen, where one person alone takes
 * their own page away.
 *
 * ## Whose decision this is
 *
 * Not a new rule. The owner answered #209 option ก on 19 ตุลาคม 2569 - *let the
 * server say how many pages there are, and if the page the person is on no
 * longer exists, take them to the last page that does* - and that answer went
 * into the `load` of the seven screens #209's own census could see. `<Pager>`
 * has eleven mount points; `Users.js` was one of the four outside that
 * population, and `docs/06` §Out of Scope is not in the way, because the
 * decision is already taken (#196).
 *
 * ## The way in, and what is missing from it
 *
 * **There is no second actor here**, which is what makes this screen different
 * from `209a`'s. One person, one filter, one press at a time, nothing held and
 * nothing racing: the filter *ใช้งานอยู่* and the button *ระงับ* are a read and
 * a write of the same list, and the write moves a row out of what the read
 * asked for. Suspend the last page's last row and the list is one page shorter
 * than the page it is drawing.
 *
 * `e2e/probes/222-the-page-past-the-end.spec.js` is where that was measured, on
 * 25 ตุลาคม 2569, against the seed's own active accounts; the numbers are on
 * `docs/acceptance/57-pager.md` §#222. These rows build the situation
 * themselves instead (#129): eleven accounts of their own through the screen's
 * import, found by a token in their addresses, so the total, the last page and
 * the row on it are the row's own numbers and not a claim about the seed.
 *
 * ## Why one landing is the whole claim here
 *
 * `209a` reads the pages the screen asked for in order, because a second actor
 * can take several pages away at once and *one page back* and *the last page
 * that exists* are then different numbers (#117). A lone actor cannot: each
 * press moves the boundary by one row, so the two readings coincide on this
 * screen by construction. What these rows hold is that the correction happens
 * at all, and where the person is left - the walk is read as well, because a
 * screen that walked 2, 1 and a screen that asked for 1 once are the same
 * landing arrived at differently.
 *
 * ## Run against the unfixed code first (#203)
 *
 * All three rows were run against `HEAD` before their mutants were written and
 * all three were red there, but not in the same way: row 1 died at its own
 * `poll`, reading `shown` 2 against `pages` 1, and rows 2 and 3 at the held
 * read's timeout, the handed read never happening at all - a kill at a wait and
 * not at a claim (#139), which is why the two sentence claims are measured by
 * their own mutants and not by that run. The numbers are on
 * `docs/acceptance/11-user-accounts.md` §#239.
 *
 * `mode: 'serial'` and a `hold()`: the rows import accounts, which this register
 * has no route to remove, and each row takes its own token so no row's import
 * is another's duplicate. The schema is put back when the file ends (#134).
 */
test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** What the screen says when a suspension lands. */
const SUSPENDED = 'ระงับการใช้งานบัญชีเรียบร้อยแล้ว';

/** What the screen says when a save lands. */
const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';

/** The empty state, which is what the uncorrected screen draws where it stands. */
const NOBODY = 'ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก';

/** Two pages of accounts, with one row on the second. */
const COUNT = 11;

const pageOf = request => new URL(request.url()).searchParams.get('page');

/** The status filter, found by the option it carries rather than by its label. */
const statusFilter = page =>
  page.locator('select').filter({ has: page.locator('option', { hasText: 'ทุกสถานะ' }) });

/** What every imported account shares; only the address and the code are a row's own. */
const account = fields => ({
  title_th: 'นาย',
  first_name_th: 'ทดสอบ',
  last_name_th: 'สองหน้า',
  department_id: '05',
  role_id: 'TEACHER',
  scope_id: '05',
  ...fields,
});

/** One data line, in whatever order the screen's own template puts the columns. */
const lineFor = (header, fields) =>
  header
    .split(',')
    .map(column => fields[column.trim()] ?? '')
    .join(',');

const addressOf = (token, at) => `${token}.${String(at).padStart(2, '0')}@kmitl.ac.th`;

/**
 * Eleven active accounts of this row's own, narrowed to by the token they share.
 *
 * Both halves of the filter are set, because both are needed: the token is what
 * makes the list this row's own, and *ใช้งานอยู่* is what makes a suspension
 * shorten it. Nothing else on this screen can make the list it is drawing
 * shorter, which is why these two controls are the way in.
 *
 * Hands back the table, the reading on arrival and the last page's keys.
 */
async function elevenActiveAccounts(page, token, code) {
  const header = headerOf(await downloadTemplate(page));
  await users.importUsers(
    page,
    csv(
      header,
      ...Array.from({ length: COUNT }, (_, at) =>
        lineFor(
          header,
          account({
            user_id: `${code}${String(at + 1).padStart(2, '0')}`,
            email: addressOf(token, at + 1),
          }),
        ),
      ),
    ),
  );
  await expect(page.getByText(`นำเข้าสำเร็จ ${COUNT} รายการ`)).toBeVisible();

  const table = users.listTable(page);
  await users.search(page, token);
  const [answer] = await Promise.all([
    page.waitForResponse(
      reply =>
        new URL(reply.url()).pathname === users.API &&
        new URL(reply.url()).searchParams.get('status') === 'active',
    ),
    statusFilter(page).selectOption('active'),
  ]);
  expect(answer.status()).toBe(200);

  // The precondition, asserted where it is used and as the shape this row needs
  // rather than as whatever the seed would have given (#51, #129).
  const arrival = await reading(page, table);
  expect(arrival.total, 'the accounts this row imported, and nobody else').toBe(COUNT);
  expect(arrival.pages, 'they fill more than one page').toBeGreaterThan(1);

  const pages = await toLastPage(page, table, users.waitForList);
  const last = await keysOn(table);
  expect(last, 'one row on the last page, which is the page the press takes away').toHaveLength(1);
  return { table, pages, last: last[0] };
}

/** Suspends one row through the screen's own question, as a person does. */
async function suspend(page, address) {
  await users.startStatusChange(page, address, 'ระงับ');
  const [answer] = await Promise.all([
    users.waitForList(page),
    users.confirmStatusChange(page),
  ]);
  expect(answer.status()).toBe(200);
  return answer;
}

test.describe('ข้อมูลผู้ใช้งาน (Users.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.systemAdmin);
    await users.openUsers(page);
  });

  /**
   * The landing. Polled rather than waited for, because every way of getting
   * this wrong leaves the person where they were: a wait for the drawing the
   * defect takes away is a timeout on the screen that has the defect, where the
   * poll fails with the numbers the pager is showing (#139, #209).
   *
   * The empty state is read as well as the numbers, because that is the price
   * the ticket is about - *ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก* on a page the
   * filter has found ten people on.
   */
  test('a page the person suspended away hands them to the last page that is left', async ({
    page,
  }) => {
    const { table, pages, last } = await elevenActiveAccounts(page, 'e2e.p239a', '92390');

    const walk = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname === users.API && request.method() === 'GET') {
        walk.push(pageOf(request));
      }
    });

    const asked = await suspend(page, addressOf('e2e.p239a', Number(last.slice(-2))));
    expect(pageOf(asked.request()), 'the page the suspension re-reads').toBe(String(pages));

    await expect
      .poll(() => reading(page, table), {
        message: 'where the person is left, and what the pager says there',
      })
      .toEqual({ total: COUNT - 1, shown: 1, pages: 1 });
    expect(await keysOn(table), 'the rows on the page they were handed').toHaveLength(COUNT - 1);
    await expect(table.getByText(NOBODY), 'the sentence the ticket is about').toHaveCount(0);
    expect(walk, 'the pages the screen asked for, in order').toEqual([String(pages), '1']);
  });

  /**
   * The sentence crosses the hand-on - its own row, because the landing and the
   * sentence are two claims and the mutants that kill them are different ones
   * (#88).
   *
   * This screen's handlers read what their loader answered, which the six
   * administration screens' do not (`Departments.js` §`HANDED_ON` measured that
   * on 20 ตุลาคม 2569). So the third answer has to carry the read it handed to,
   * and `confirmSwitch` hands its sentence over keyed for that read rather than
   * saying it on a truthy answer.
   *
   * **Which is why the row holds the window and not only the end of it.** A
   * sentence said on the truthy answer is still on the screen when the handed
   * page arrives - nothing clears a notice - so a row that read only the
   * finished screen would pass on both, and the mutant written for this claim
   * would survive for free (#203). What tells them apart is *when*: the handed
   * read is held at the route, and in that window the correct screen says
   * nothing, because the sentence is still a key in a ref. The negative is read
   * at a named settle point - the held request having reached the route - and
   * the only thing that can put the sentence there in that window is the code
   * this row is about (#50, #214).
   */
  test('the suspension says so on the page the person was handed, and not before', async ({
    page,
  }) => {
    const { table, last } = await elevenActiveAccounts(page, 'e2e.p239b', '92391');

    // The read the screen is handed to, held. Installed here and not at the top
    // of the row: every read before this one is also a read of page one -
    // arriving, searching, filtering - and the gate holds the first request its
    // own `matches` accepts.
    const handed = await gate(
      page,
      new RegExp(`^${users.API}$`),
      request => isGet(request) && pageOf(request) === '1',
    );

    await suspend(page, addressOf('e2e.p239b', Number(last.slice(-2))));
    await handed.sent;

    await expect(
      page.getByText(SUSPENDED),
      'nothing is said over the page being replaced',
    ).toHaveCount(0);

    handed.open();
    await handed.answered;

    await expect
      .poll(() => reading(page, table), { message: 'the page they were handed' })
      .toEqual({ total: COUNT - 1, shown: 1, pages: 1 });
    await expect(
      page.getByText(SUSPENDED),
      'the sentence, on the page the read was handed to',
    ).toBeVisible();
  });

  /**
   * The other handler, because a guard written for one caller is a claim about
   * every caller (#68, #133). `save` reads its loader's answer exactly as
   * `confirmSwitch` does, and a save reaches the same situation by a different
   * road: an edit cannot add a row, but it can move one **out** of the list it
   * was read from - here an address out of the search term the screen is
   * filtered by - and the page that row was the last of then stops existing.
   *
   * Held at the route for the same reason as the row above: what a hand-over
   * buys over a sentence said on a truthy answer is the window, not the end of
   * it.
   */
  test('a save that moves a row out of the filter hands the page on too', async ({ page }) => {
    const { table, last } = await elevenActiveAccounts(page, 'e2e.p239c', '92392');
    const address = addressOf('e2e.p239c', Number(last.slice(-2)));

    await users.userRow(page, address).getByRole('button', { name: 'แก้ไข' }).click();
    await page.getByLabel('อีเมล').fill('e2e.moved239c@kmitl.ac.th');

    const handed = await gate(
      page,
      new RegExp(`^${users.API}$`),
      request => isGet(request) && pageOf(request) === '1',
    );
    const [written] = await Promise.all([
      page.waitForResponse(
        reply =>
          new URL(reply.url()).pathname === `${users.API}/${last}` &&
          reply.request().method() === 'PUT',
      ),
      page.getByRole('button', { name: 'บันทึก' }).click(),
    ]);
    expect(written.status()).toBe(200);
    await handed.sent;

    await expect(
      page.getByText(SAVED),
      'nothing is said over the page being replaced',
    ).toHaveCount(0);

    handed.open();
    await handed.answered;

    await expect
      .poll(() => reading(page, table), { message: 'the page they were handed' })
      .toEqual({ total: COUNT - 1, shown: 1, pages: 1 });
    await expect(
      page.getByText(SAVED),
      'the sentence, on the page the read was handed to',
    ).toBeVisible();
  });
});

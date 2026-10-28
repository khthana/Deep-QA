'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isGet } = require('../support/gate');
const { csv, downloadTemplate, headerOf } = require('../support/import-panel');
const { keysOn, previous, reading, toLastPage } = require('../support/pager');
const { watchForTheSentence } = require('../support/frame-sampler');
const users = require('../support/users-screen');

/**
 * #238 - does `Users.js` still hold **one** behaviour, now that #239 has given
 * it a second way to say its sentence?
 *
 * A probe and not a row. #238 carries two owner's questions, and question one
 * rests on a measurement: `Users.js` says its sentence in all six sequences
 * (#221's nine-arm table, 25 ตุลาคม 2569, re-run unchanged on 28 ตุลาคม 2569),
 * which is what puts it on the other side of the line from `Students.js`, where
 * the clock chooses between saying and not saying (#52, #199).
 *
 * #239 landed on this screen on 28 ตุลาคม 2569 and fired the first two of
 * #221's own four expiry conditions: it changed `Users.save` and
 * `Users.confirmSwitch`, and it gave this screen the `readOf` key the condition
 * names by name. The nine-arm table did not move, because the key is written on
 * **one** of the two paths - so the question this probe asks is whether the
 * screen now answers differently depending on which path a person's press took,
 * which is a fork the person cannot see (#224) and not a preference anybody can
 * state (#232).
 *
 *     save / confirmSwitch
 *       reloaded.handedTo  -> waiting.current = { of: handedTo, said }   (keyed)
 *       reloaded           -> setNotice(said)                            (unkeyed)
 *
 * The unkeyed path is the one #221 measured: the sentence is said whatever the
 * person did meanwhile. The keyed path only exists where the write took the
 * person's page away, which is the situation #239 built - and `load` says the
 * sentence only when `waiting.current.of === key`, then clears the ref in
 * `finally` on any read that did not hand on.
 *
 * ## What it answered, and on which code - 28 ตุลาคม 2569
 *
 * The owner answered rule ก the same day, so this probe was run on **both
 * sides** of the fix rather than only on the shape described above (#207): a
 * probe that dates a defect beside your own change is run on the code that has
 * it and on the code that does not, and the pre-fix side is reproduced by
 * `mutation/239-the-page-the-press-took-away.py switchsaysitovertheoldpage`,
 * which is this handler's shape before #238 character for character, rather
 * than by an argument about what it used to do (#115, #203).
 *
 * | ลำดับ | with the fix | with `239:switchsaysitovertheoldpage` |
 * |---|---|---|
 * | ไม่กดอะไร (ควบคุม) | พูด 182 จาก 194 เฟรม | พูด 182 จาก 196 เฟรม |
 * | กด ย้อนกลับ ในหน้าต่าง | พูด 179 จาก 193 เฟรม | พูด 183 จาก 195 เฟรม |
 * | ขยับตัวกรอง ค้นหา ในหน้าต่าง | **ไม่พูด** 0 จาก 202 เฟรม | **พูด 182** - the arm goes red |
 *
 * So the fork #239 left is gone: the sentence is said where the person stayed
 * on the list it is about and nowhere else, and the arm that proves it is the
 * one whose `predicted` fails on the unfixed code. The pager arm reports
 * *ย้อนกลับ ปิดอยู่ ไม่มีอะไรให้กด* on both sides, which is the answer #221's
 * question one wanted priced: on this screen, inside this window, the pager is
 * not a way in at all, because the screen has already been handed to the page
 * it corrected to (#217).
 *
 * ## How to run it
 *
 *     cp e2e/probes/238-the-handed-on-sentence.spec.js e2e/tests/000-probe-238.spec.js
 *     cd e2e && npx playwright test tests/000-probe-238.spec.js
 *     rm e2e/tests/000-probe-238.spec.js
 *
 * The runner only sees it inside `tests/`, the convention
 * `probes/221-the-two-windows.spec.js` carries. No port is written here:
 * `e2e/README.md` §Ports is the one statement of that rule (#237).
 *
 * ## The three arms
 *
 * Each arm imports eleven active accounts of its own through the screen's own
 * import, narrows to them with the search box and *ใช้งานอยู่*, walks to the
 * last page - one row - and suspends it, which is #239's way in and needs no
 * second actor. The read the screen is handed to is then **held at the route**,
 * and the arm does whatever it is about inside that window. *Was the sentence
 * ever on the screen* is counted with a sample per frame (#164), because a
 * sentence a later read never says is gone by any settle point and a sentence
 * said and replaced would read the same way at one.
 *
 * - **ควบคุม** presses nothing. It is the green reading this probe needs before
 *   a silence anywhere else means anything (#171), and it is `239a` row 2's
 *   claim read with the sampler instead of a settle point.
 * - **ย้อนกลับ** presses the pager inside the window. `page` was already set to
 *   the page the screen handed to, so the press may be a no-op - which is what
 *   the arm is for: `busy={busy}` on this pager is priced by whether the press
 *   is a way in at all here (#217, #221).
 * - **ค้นหา** moves the filter inside the window, which is the way in #221
 *   measured on both screens: no filter anywhere is `disabled={busy}`, and a
 *   filter rebuilds the same loader with a different key.
 *
 * Each arm carries its prediction as an assertion (#205), because without one
 * this instrument cannot go red: the sampler is built from the sentence's own
 * text, so a wording change in the frontend makes every arm print `0 of n` and
 * exit 0 - the count is the tell, not the exit code (#208).
 *
 * ## What it cannot say (#123)
 *
 * - **It cannot say whether what the person reads is right.** That is `docs/06`
 *   §Out of Scope and the owner's, which is the whole of why #238 is a
 *   `question` ticket.
 * - **It cannot see the status write's own first window.** Pressing the pager
 *   while the write is out is `221`'s second arm and lives there; here the
 *   dialog has already been confirmed, because the hand-on cannot exist until
 *   the write has landed.
 * - **It is a claim about this screen's two handlers.** `confirmSwitch` is what
 *   the arms press; `save` reaches the same code through a different road
 *   (`239a` row 3), and nothing here measures it.
 * - **It is not a claim about the seed.** The eleven accounts are the arm's own
 *   (#129), and every arm asserts the shape it needs on arrival.
 */
test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** What the screen says when a suspension lands. */
const SUSPENDED = 'ระงับการใช้งานบัญชีเรียบร้อยแล้ว';

/** Two pages of accounts, with one row on the second - #239's shape. */
const COUNT = 11;

/** Long enough for whatever the arm pressed to be answered and drawn. */
const AFTER_MS = 3_000;

const sleep = ms => new Promise(done => setTimeout(done, ms));
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

const lineFor = (header, fields) =>
  header
    .split(',')
    .map(column => fields[column.trim()] ?? '')
    .join(',');

const addressOf = (token, at) => `${token}.${String(at).padStart(2, '0')}@kmitl.ac.th`;

/** `239a`'s arrangement: eleven active accounts of this arm's own, on two pages. */
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

  const arrival = await reading(page, table);
  expect(arrival.total, 'the accounts this arm imported, and nobody else').toBe(COUNT);
  expect(arrival.pages, 'they fill more than one page').toBeGreaterThan(1);

  const pages = await toLastPage(page, table, users.waitForList);
  const last = await keysOn(table);
  expect(last, 'one row on the last page, which is the page the press takes away').toHaveLength(1);
  return { table, pages, last: last[0] };
}

const found = [];

/**
 * One arm: suspend the last page's only row, hold the read the screen is handed
 * to, do `inside` in that window, then let the answer land and read the sampler.
 */
async function arm(page, { token, code, sequence, predicted, inside }) {
  const { table, pages, last } = await elevenActiveAccounts(page, token, code);

  const handed = await gate(
    page,
    new RegExp(`^${users.API}$`),
    request => isGet(request) && pageOf(request) === '1',
  );

  const watch = await watchForTheSentence(page, SUSPENDED);
  await users.startStatusChange(page, addressOf(token, Number(last.slice(-2))), 'ระงับ');
  const [written] = await Promise.all([
    page.waitForResponse(
      reply => /\/status$/.test(new URL(reply.url()).pathname) && reply.request().method() === 'PUT',
    ),
    users.confirmStatusChange(page),
  ]);
  expect(written.status(), 'the suspension landed').toBe(200);
  await handed.sent;

  const aside = inside ? await inside(page, pages) : 'ไม่กดอะไร';

  handed.open();
  await handed.answered;
  await sleep(AFTER_MS);

  const seen = await watch.read();
  expect(seen.frames, 'frames sampled').toBeGreaterThan(10);
  if (predicted === 'said') expect(seen.saying, 'predicted: the sentence is said').toBeGreaterThan(0);
  if (predicted === 'silent') expect(seen.saying, 'predicted: nothing says it').toBe(0);

  const line = await reading(page, table);
  found.push({
    sequence,
    saying: seen.saying,
    frames: seen.frames,
    page: line.shown,
    pages: line.pages,
    total: line.total,
    aside,
  });
}

test.afterAll(() => {
  const rows = found.map(
    f =>
      `| ${f.sequence} | ${f.saying > 0 ? 'พูด' : '**ไม่พูด**'} ${f.saying} จาก ${f.frames} เฟรม | ` +
      `${f.page} จาก ${f.pages} (ทั้งหมด ${f.total}) | ${f.aside} |`,
  );
  console.log(
    [
      '',
      '#238 - the handed-on sentence on Users.js, with a control pressed inside the window',
      '',
      '| ลำดับ | ประโยคขึ้นจอ | หน้าที่คนอยู่เมื่อจบ | สิ่งที่กดในหน้าต่าง |',
      '|---|---|---|---|',
      ...rows,
      '',
    ].join('\n'),
  );
});

test.describe('ข้อมูลผู้ใช้งาน (Users.js) - the handed-on sentence', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.systemAdmin);
    await users.openUsers(page);
  });

  test('ควบคุม: nothing is pressed inside the window', async ({ page }) => {
    await arm(page, { token: 'e2e.p238a', code: '92380', sequence: 'ไม่กดอะไร', predicted: 'said' });
  });

  test('ย้อนกลับ pressed inside the window', async ({ page }) => {
    await arm(page, {
      token: 'e2e.p238b',
      code: '92381',
      sequence: 'กด ย้อนกลับ ในหน้าต่าง',
      predicted: 'said',
      inside: async page => {
        const live = !(await previous(page).isDisabled());
        if (live) await previous(page).click();
        return live ? 'ย้อนกลับ ยังกดได้ และถูกกด' : 'ย้อนกลับ ปิดอยู่ ไม่มีอะไรให้กด';
      },
    });
  });

  test('ค้นหา moved inside the window', async ({ page }) => {
    await arm(page, {
      token: 'e2e.p238c',
      code: '92382',
      sequence: 'ขยับตัวกรอง ค้นหา ในหน้าต่าง',
      predicted: 'silent',
      inside: async page => {
        // Filled without waiting for the answer: the window is what is being
        // measured, and `users.search` waits for the read it starts.
        await page.getByPlaceholder('ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้').fill('e2e.p238c.0');
        return 'พิมพ์ต่อในช่องค้นหา ไม่ได้ปิดอยู่';
      },
    });
  });
});

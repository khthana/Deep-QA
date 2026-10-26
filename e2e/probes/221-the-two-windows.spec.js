/*
 * #221 - do the two windows of #199 exist on `Students.js` and `Users.js`?
 *
 * A probe and not a row. #221's first closing criterion is that both windows be
 * **measured on the screen** and written down with a date, not concluded from
 * the code, and its owner's question (#210's second) is unanswered, so nothing
 * here may become a claim of any sheet: the fix a row would be written for is
 * not licensed yet (#210, #221).
 *
 * It is kept rather than deleted because it is the only thing that can read
 * these nine sequences again (#169), and because the answer it gives expires
 * the day anything on either screen changes what says the sentence.
 *
 * ## How to run it
 *
 *     cp e2e/probes/221-the-two-windows.spec.js e2e/tests/000-probe-221.spec.js
 *     cd e2e && npx playwright test tests/000-probe-221.spec.js
 *     rm e2e/tests/000-probe-221.spec.js
 *
 * The runner only sees it inside `tests/`, which is the convention
 * `probes/219-first.spec.js` carries. No port is written above: `e2e/README.md`
 * §Ports is the one statement of that rule, and it says which of the two
 * symptoms is which. Read it before a run on a machine that has just rebooted
 * (#237, 26 October 2569).
 *
 * ## What each arm does
 *
 * The shape is #210's, which measured the same two windows on `Rubrics` and
 * `Departments`: hold the answer at the route, press ถัดไป inside the window,
 * and count *was the sentence ever on the screen* with a sample per frame
 * (#164) rather than with a wait, because a sentence a later read replaces is
 * gone by any settle point. The sampler is `e2e/support/frame-sampler.js`,
 * shared because no row's claim lives in it (#171).
 *
 * `ยกเลิก` is how a person moves the screen on while a write is out, since
 * #217 contained the focus; `e2e/support/confirm-dialog.js` `dismiss` is that
 * instrument, and dismissing cancels nothing that has left.
 *
 * The status arms press **whichever verb the row is showing**, read below the
 * seam, so each adapts to whatever the arm before it left. What puts the row
 * back is `hold()` in `beforeAll`, which restores a row that changed under its
 * key column by column (#137): an arm-level `finally` would be a second writer
 * of the same state, and a throwing one replaces the arm's own failure (#181).
 *
 * Two arms move the screen's **filter** instead of its pager. They are what
 * says whether `busy={busy}` on `<Pager>` would end the fork or only narrow it
 * (#217's question - what can the person still do): neither screen's filter is
 * `disabled={busy}`, and neither is `Offerings.js`'s year filter, which is a
 * screen whose pager already has the flag. Each of those two arms carries its
 * prediction as an assertion (#205).
 *
 * ## What it cannot say (#123)
 *
 * - **It cannot say whether what the person reads is right.** That is `docs/06`
 *   §Out of Scope and the owner's, and it is the whole of why #221 is not a fix
 *   ticket yet.
 * - **It cannot see a window on a control that says no sentence.** Both
 *   screens' `onImported` hands the list back to the effect and says nothing,
 *   so the import is a way in to #140's claim and not to this one. The
 *   sentence-bearing writes are `Users.save`, `Users.confirmSwitch` and
 *   `Students.save`, and they are what is measured here.
 * - **It cannot build the first window where the form replaces the table.** On
 *   both screens the form and the table are the two halves of one ternary, so
 *   while a save is out there is no pager in the document at all - which the
 *   arms measure by reading what is drawn with the form - three numbers and
 *   not one, for the reason `whileTheFormIsOpen` carries - rather than by
 *   reading the JSX.
 * - **It is a claim about this seed.** Both windows need a second page, because
 *   #57's end rule disables both buttons when there is one (#210 paid that
 *   price on four screens of six). Every arm asserts `pages > 1` on arrival and
 *   prints what the line read.
 */

'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { next, reading, keysOn } = require('../support/pager');
const { watchForTheSentence } = require('../support/frame-sampler');
const { dismiss } = require('../support/confirm-dialog');
const users = require('../support/users-screen');
const students = require('../support/students-screen');

const db = createPool({ schema: E2E_SCHEMA });

/** Long enough for page two to be answered and drawn before the held answer is let go. */
const HELD_MS = 2_000;
/** Long enough for the held answer to land and for whatever it causes to be drawn. */
const AFTER_MS = 3_500;

const SAVED_USER = 'บันทึกข้อมูลเรียบร้อยแล้ว';
const SUSPENDED = 'ระงับการใช้งานบัญชีเรียบร้อยแล้ว';
const REACTIVATED = 'เปิดใช้งานบัญชีเรียบร้อยแล้ว';
const SAVED_STUDENT = 'บันทึกข้อมูลนักศึกษาเรียบร้อยแล้ว';

const SWITCH_ROW = 'past.assessor@tabee-review.org';
const EDIT_ROW = 'dept.admin.01@kmitl.ac.th';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const asPage = (url, n) => url.searchParams.get('page') === String(n);

/** Holds a read of page one; the superseding read of page two is never held (#160). */
const heldPageOne = (list) => (url) => url.pathname === list && asPage(url, 1);

const lateRead = (ms) => async (route, request) => {
  if (request.method() === 'GET') await sleep(ms);
  try {
    await route.continue();
  } catch {
    // The arm has ended and closed the page.
  }
};

const lateWrite = (ms) => async (route) => {
  await sleep(ms);
  try {
    await route.continue();
  } catch {
    // The arm has ended and closed the page.
  }
};

const statusWrite = (url) => /^\/api\/users\/[^/]+\/status$/.test(url.pathname);

/**
 * Reads once that ถัดไป is live and presses it - #225.
 *
 * `toBeEnabled()` retries, and a pager that comes back to life when the held
 * answer is drawn satisfies it by waiting, which moves the press out of the
 * window instead of saying the window was shut (#209, #214).
 */
async function pressNext(page, when) {
  expect(await next(page).isDisabled(), `ถัดไป is live ${when}`).toBe(false);
  await next(page).click();
}

const found = [];

/**
 * One line of the report: what the sampler counted, and where the person ended.
 *
 * `predicted` is the arm's prediction made an assertion rather than kept in the
 * reader's head (#205). The filter arms were written for a prediction -- that
 * the pager is not what decides this, so closing the pager would narrow the
 * fork rather than end it -- but **every** arm carries one, because without it
 * this instrument cannot go red. The sampler is built from `SAVED_USER` and
 * its siblings, so a wording change in the frontend makes all nine arms print
 * `0 of n` and exit 0: the probe's whole answer inverted with nothing saying
 * so. The count is the tell, not the exit code (#208, #171).
 */
async function record(page, { screen, write, sequence, table, watch, aside, predicted }) {
  const seen = await watch.read();
  expect(seen.frames, 'frames sampled').toBeGreaterThan(10);
  if (predicted === 'said') expect(seen.saying, 'predicted: the sentence is said').toBeGreaterThan(0);
  if (predicted === 'silent') expect(seen.saying, 'predicted: nothing says it').toBe(0);
  const line = await reading(page, table);
  const keys = await keysOn(table);
  found.push({
    screen,
    write,
    sequence,
    saying: seen.saying,
    frames: seen.frames,
    page: line.shown,
    pages: line.pages,
    total: line.total,
    first: (keys[0] ?? '').trim(),
    aside,
  });
}

let release;
test.beforeAll(async () => {
  release = await hold();
});

test.afterAll(async () => {
  await release();
  await db.end();
  const rows = found.map(
    (f) =>
      `| ${f.screen} | ${f.write} | ${f.sequence} | ` +
      `${f.saying > 0 ? 'พูด' : '**ไม่พูด**'} ${f.saying} จาก ${f.frames} เฟรม | ` +
      `${f.page} จาก ${f.pages} (ทั้งหมด ${f.total}) | ${f.first} |`,
  );
  console.log(
    [
      '',
      '#221 - two windows on Students.js and Users.js',
      '',
      '| จอ | การเขียน | ลำดับ | ประโยคขึ้นจอ | หน้าที่คนอยู่เมื่อจบ | แถวแรก |',
      '|---|---|---|---|---|---|',
      ...rows,
      '',
      ...found.filter((f) => f.aside).map((f) => `- ${f.screen} ${f.write}: ${f.aside}`),
      '',
    ].join('\n'),
  );
});

async function openUsers(page) {
  await signIn(page, ACCOUNTS.systemAdmin);
  await users.openUsers(page);
  const table = users.listTable(page);
  const line = await reading(page, table);
  expect(line.pages, 'the arm needs a page two to move to').toBeGreaterThan(1);
  return table;
}

async function openStudents(page) {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await students.openRegister(page);
  const table = students.listTable(page);
  const line = await reading(page, table);
  expect(line.pages, 'the arm needs a page two to move to').toBeGreaterThan(1);
  return table;
}

/**
 * Waits until the form is drawn, then says what is on the screen with it - is
 * the first window buildable through the list's own pager?
 *
 * **A count of ถัดไป is the wrong instrument on its own, and this is where the
 * first run of this probe was wrong.** `Users.js` draws `HistoryPanel` in the
 * branch the form occupies, and that panel has a `<Pager>` of its own - one of
 * the two callers #221's table calls *safe by construction* - so a bare count
 * answers 1 while the list and the list's pager are both out of the document.
 * It is
 * the species of #85 and #111 read from the other end: the locator found a
 * control that is not the one the question is about, and #219's *one name on
 * two controls* is the same trap one layer along.
 *
 * So the reading is three numbers, not one: the pagers in the document, whether
 * the panel that owns the other one is drawn, and the rows of the list itself.
 */
async function whileTheFormIsOpen(page) {
  await expect(page.getByRole('button', { name: 'บันทึก', exact: true })).toBeVisible();
  return {
    pagers: await next(page).count(),
    history: await page.getByRole('heading', { name: 'ประวัติการใช้งาน' }).count(),
    tables: await page.locator('table').count(),
  };
}

const saysWhatIsDrawn = (seen) =>
  `ตัวแบ่งหน้าในเอกสารขณะฟอร์มเปิด ${seen.pagers} ตัว · ` +
  `หัวข้อ ประวัติการใช้งาน ${seen.history} อัน · ตาราง ${seen.tables} ตาราง`;

// ── Users.js · สถานะ ────────────────────────────────────────────────────────
//
// The one write on either screen that says a sentence with the table, and so
// the pager, drawn underneath it: `ConfirmDialog` covers the list rather than
// replacing it, so both of #199's windows are buildable here.

/** Which verb that row is showing, and the sentence pressing it says. */
async function theSwitch() {
  const { rows } = await db.query('SELECT user_id, status FROM users WHERE email = $1', [
    SWITCH_ROW,
  ]);
  expect(rows, `${SWITCH_ROW} is in the seed`).toHaveLength(1);
  const [who] = rows;
  const active = who.status === 'active';
  return {
    user_id: who.user_id,
    status: who.status,
    label: active ? 'ระงับ' : 'เปิดใช้งาน',
    said: active ? SUSPENDED : REACTIVATED,
  };
}

async function switchArm(page, sequence, inside) {
  const table = await openUsers(page);
  const control = await theSwitch();
  const watch = await watchForTheSentence(page, control.said);
  await inside({ page, table, control });
  // All three สถานะ arms predict the same thing, which is the point of the
  // screen: `Users.js` has no fork. The status goes back through `hold()` in
  // `beforeAll` rather than through a `finally` here -- it restores a row that
  // changed under its key, column by column (#137), and a throwing restore
  // would replace this arm's own failure (#181).
  await record(page, {
    screen: 'Users.js',
    write: control.label,
    sequence,
    table,
    watch,
    predicted: 'said',
  });
}

test('Users.js สถานะ: the twin that presses nothing', async ({ page }) => {
  await switchArm(page, 'ไม่กดอะไร', async ({ page: open, control }) => {
    await users.startStatusChange(open, SWITCH_ROW, control.label);
    await users.confirmStatusChange(open);
    await sleep(AFTER_MS);
  });
});

test('Users.js สถานะ: ถัดไป pressed while the write is held', async ({ page }) => {
  await switchArm(page, 'กด ถัดไป ขณะที่การเขียนค้างอยู่', async ({ page: open, control }) => {
    await open.route(statusWrite, lateWrite(HELD_MS));
    try {
      await users.startStatusChange(open, SWITCH_ROW, control.label);
      await users.confirmStatusChange(open);
      // The box is still up: `setSwitching(null)` runs when the write answers.
      await dismiss(open);
      await pressNext(open, 'while the status write is held');
      await sleep(HELD_MS + AFTER_MS);
    } finally {
      await open.unroute(statusWrite);
    }
  });
});

test('Users.js สถานะ: the write answers, then ถัดไป while the reload is held', async ({ page }) => {
  await switchArm(
    page,
    'ปล่อยให้การเขียนตอบ แล้วกดขณะที่การอ่านใหม่ค้างอยู่',
    async ({ page: open, control }) => {
      const held = heldPageOne(users.API);
      const written = open.waitForResponse(
        (answer) => statusWrite(new URL(answer.url())) && answer.request().method() === 'PUT',
      );
      await open.route(held, lateRead(HELD_MS));
      try {
        await users.startStatusChange(open, SWITCH_ROW, control.label);
        await users.confirmStatusChange(open);
        await written;
        await pressNext(open, 'while the status reload is held');
        await sleep(HELD_MS + AFTER_MS);
      } finally {
        await open.unroute(held);
      }
    },
  );
});

// ── Users.js · บันทึก ────────────────────────────────────────────────────────

test('Users.js บันทึก: the twin that presses nothing', async ({ page }) => {
  const table = await openUsers(page);
  const watch = await watchForTheSentence(page, SAVED_USER);
  await users.userRow(page, EDIT_ROW).getByRole('button', { name: 'แก้ไข', exact: true }).click();
  const drawn = await whileTheFormIsOpen(page);
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await sleep(AFTER_MS);
  await record(page, {
    screen: 'Users.js',
    write: 'บันทึก',
    sequence: 'ไม่กดอะไร',
    table,
    watch,
    aside: saysWhatIsDrawn(drawn),
    predicted: 'said',
  });
});

test('Users.js บันทึก: ถัดไป pressed while the reload is held', async ({ page }) => {
  const table = await openUsers(page);
  const held = heldPageOne(users.API);
  const watch = await watchForTheSentence(page, SAVED_USER);
  await users.userRow(page, EDIT_ROW).getByRole('button', { name: 'แก้ไข', exact: true }).click();
  await whileTheFormIsOpen(page);
  const written = page.waitForResponse(
    (answer) =>
      new URL(answer.url()).pathname.startsWith(`${users.API}/`) &&
      answer.request().method() === 'PUT',
  );
  await page.route(held, lateRead(HELD_MS));
  try {
    await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await written;
    await pressNext(page, 'while the บันทึก reload is held');
    await sleep(HELD_MS + AFTER_MS);
    await record(page, {
      screen: 'Users.js',
      write: 'บันทึก',
      sequence: 'กดขณะที่การอ่านใหม่ค้างอยู่',
      table,
      watch,
      predicted: 'said',
    });
  } finally {
    await page.unroute(held);
  }
});

test('Users.js บันทึก: the ค้นหา filter typed while the reload is held', async ({ page }) => {
  const table = await openUsers(page);
  const held = (url) => heldPageOne(users.API)(url) && !url.searchParams.get('q');
  const watch = await watchForTheSentence(page, SAVED_USER);
  await users.userRow(page, EDIT_ROW).getByRole('button', { name: 'แก้ไข', exact: true }).click();
  await whileTheFormIsOpen(page);
  const written = page.waitForResponse(
    (answer) =>
      new URL(answer.url()).pathname.startsWith(`${users.API}/`) &&
      answer.request().method() === 'PUT',
  );
  await page.route(held, lateRead(HELD_MS));
  try {
    await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await written;
    // Not `users.search`, which waits for the answer it asks for: the point of
    // this arm is that the superseding read is the one that is **not** held.
    await page.getByPlaceholder('ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้').fill('admin');
    await sleep(HELD_MS + AFTER_MS);
    await record(page, {
      screen: 'Users.js',
      write: 'บันทึก',
      sequence: 'ขยับตัวกรอง ค้นหา ขณะที่การอ่านใหม่ค้างอยู่',
      table,
      watch,
      predicted: 'said',
    });
  } finally {
    await page.unroute(held);
  }
});

// ── Students.js · บันทึก ─────────────────────────────────────────────────────
//
// The only write on this screen that says a sentence, and the same ternary, so
// one window rather than two. `save` hands the sentence to `load` keyed on
// `readOf(1, program)` - the page the pager is on now - which `Users.js` does
// not do, and that is the asymmetry the ticket's table does not carry.

const NEW_STUDENT = { first: 'ทดสอบ', last: 'หัววัดสองสองหนึ่ง', program: PROGRAM };

test('Students.js บันทึก: the twin that presses nothing', async ({ page }) => {
  const table = await openStudents(page);
  const watch = await watchForTheSentence(page, SAVED_STUDENT);
  await page.getByRole('button', { name: 'เพิ่มนักศึกษา' }).click();
  const drawn = await whileTheFormIsOpen(page);
  await page.getByLabel('รหัสนักศึกษา').fill('68221001');
  await page.getByLabel('ชื่อ', { exact: true }).fill(NEW_STUDENT.first);
  await page.getByLabel('นามสกุล', { exact: true }).fill(NEW_STUDENT.last);
  await page.getByLabel('หลักสูตร').selectOption(NEW_STUDENT.program);
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await sleep(AFTER_MS);
  await record(page, {
    screen: 'Students.js',
    write: 'บันทึก',
    sequence: 'ไม่กดอะไร',
    table,
    watch,
    aside: saysWhatIsDrawn(drawn),
    predicted: 'said',
  });
});

test('Students.js บันทึก: ถัดไป pressed while the reload is held', async ({ page }) => {
  const table = await openStudents(page);
  const held = heldPageOne('/api/students');
  const watch = await watchForTheSentence(page, SAVED_STUDENT);
  await page.route(held, lateRead(HELD_MS));
  try {
    await students.addStudent(page, { code: '68221002', ...NEW_STUDENT });
    await pressNext(page, 'while the บันทึก reload is held');
    await sleep(HELD_MS + AFTER_MS);
    await record(page, {
      screen: 'Students.js',
      write: 'บันทึก',
      sequence: 'กดขณะที่การอ่านใหม่ค้างอยู่',
      table,
      watch,
      predicted: 'silent',
    });
  } finally {
    await page.unroute(held);
  }
});

test('Students.js บันทึก: the หลักสูตร filter moved while the reload is held', async ({ page }) => {
  const table = await openStudents(page);
  // The filter's own read is page one too - it calls `setPage(1)` - so the
  // held matcher is the read with no `program_id`, which is the one the save
  // asked for. Holding both would leave the arm waiting for the answer it is
  // about to compare (#160's species).
  const held = (url) =>
    heldPageOne('/api/students')(url) && !url.searchParams.get('program_id');
  const watch = await watchForTheSentence(page, SAVED_STUDENT);
  await page.route(held, lateRead(HELD_MS));
  try {
    await students.addStudent(page, { code: '68221003', ...NEW_STUDENT });
    // Not `students.filterProgram`, for the reason the ค้นหา arm gives.
    await page.getByLabel('หลักสูตร').selectOption(PROGRAM);
    await sleep(HELD_MS + AFTER_MS);
    await record(page, {
      screen: 'Students.js',
      write: 'บันทึก',
      sequence: 'ขยับตัวกรอง หลักสูตร ขณะที่การอ่านใหม่ค้างอยู่',
      table,
      watch,
      predicted: 'silent',
    });
  } finally {
    await page.unroute(held);
  }
});

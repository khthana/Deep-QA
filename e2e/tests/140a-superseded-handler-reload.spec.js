'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { byAlias, CURRENT_YEAR, PROGRAM, PROGRAM_INTL } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { downloadTemplate, headerOf, csv, importCsv } = require('../support/import-panel');
const { next, reading, keysOn, untilDrawn } = require('../support/pager');
const {
  DOCUMENT,
  LAST_YEAR,
  intoTheListedSectionScreen,
  markDocument,
} = require('../support/section-jump');
const users = require('../support/users-screen');
const departments = require('../support/departments-screen');
const programs = require('../support/programs-screen');
const subjects = require('../support/subjects-screen');
const pairs = require('../support/program-subjects-screen');
const rubrics = require('../support/rubrics-screen');
const offerings = require('../support/offerings-screen');
const students = require('../support/students-screen');
const enrolment = require('../support/enrolment-screen');

/**
 * #140 — a list a handler reloads does not land on top of a page the pager has
 * already left.
 *
 * #68 gave the `load` of each of the nine list screens below a flag with a
 * default, `isCurrent = () => true`, and the effect hands it one that the cleanup
 * turns off. The handlers — บันทึก, ลบ,
 * the refusal of แก้ไข, the import, and on some screens a status switch, a copy
 * or กลับไปหน้ารายการ — call `load()` with nothing, so they take the default,
 * and the default says *yes*. Nothing tears a handler down, so the effect's flag
 * could not have served them; what they can ask is *is the list still where it
 * was when I was sent*, and before this ticket none of them asked it.
 *
 * Every one of them reloads with the pager on screen. Some close their form or
 * their confirmation **before** they reload, some never had one, and a refused
 * แก้ไข never opened one — so ถัดไป can be pressed while the reload is out, and
 * without the question the reload's answer, arriving last, drew page one under
 * a pager that had moved to page two: rows the person is not looking at, with a
 * line saying they are.
 *
 * ## How a row is built
 *
 * Each row opens its screen, holds back the read its handler is about to send
 * with `page.route` for `HELD_MS`, and presses the handler. Once the reload has
 * been **sent** — waited for as a request, so a handler that reloads nothing
 * fails the row rather than passing it — it supersedes that read, waits for the
 * superseding one to answer, then for the held answer to be handed back, and
 * reads the screen once after `SETTLE_MS`: the pager's line and the first cell
 * of every row, against the superseding answer.
 *
 * `SubjectStudents` has one site with two callers — `reload`, which adding a
 * student and the import both call — so it has two rows and one guard.
 *
 * ## Which control supersedes the read, and why it is ถัดไป on eleven rows only
 *
 * It was ถัดไป on every row until 19 ตุลาคม 2569, that being the one control
 * every screen has. #199 then gave the enrolment screen's pager
 * `disabled={busy}` and #210 the six administration screens' — and `busy` is up
 * from a handler's press until the read it is waiting for has been drawn, so on
 * seven of the nine screens this file's press became a press of a dead button.
 * Nothing went red. `supersede` pressed it behind
 * `await expect(next(page)).toBeEnabled()`, which is a **retrying wait** and
 * not an assertion: the press moved to after the held answer had been drawn, so
 * the supersession each row exists to build never happened and the row passed
 * whether the guard was there or not (#171, and the `CLAUDE.md` line #209 wrote
 * about a wait in front of a superseding press).
 *
 * Which claims that left standing was swept on 20 ตุลาคม 2569, one mutant at a
 * time: of the thirty-one in `mutation/140-superseded-handler-reload.py`, five
 * are on the two screens whose pager is still live (#221 holds the question of
 * whether it should be), eleven were still killed, and **fifteen were proved by
 * nothing**. Eleven and not one, because three ways in were never gated:
 * `ImportPanel` keeps its own flag and touches neither of the screen's, which
 * leaves the pager live through the five imports' own rows; `onBack` on
 * ข้อมูลการเปิดรายวิชา lets `busy` down before it reloads; and `144a`'s rows
 * supersede by **filter**, which kept the four refusals of the filtered screens
 * killed in a file this file's own sweep never runs (#123).
 *
 * So eighteen rows are re-aimed here, on 20 ตุลาคม 2569, at a control the
 * person still has while the write is out — the price of closing a way in, paid
 * wherever they have another way to the same situation (#217):
 *
 * - **twelve** on the four screens that import. `ImportPanel`'s `onImported`
 *   goes to page one when the person is not on it, so the row stands on **page
 *   two** and the superseding read is still a page move, asked for by a control
 *   the screen leaves live. `held` says which read is held, for exactly this.
 * - **four** on Rubric and ข้อมูลการเปิดรายวิชา, which have no import panel: a
 *   **filter**, which is a dependency of `load` like the page and is not
 *   `disabled={busy}` on any of these screens. `140:offeringssavestalewins` was
 *   given one on 19 ตุลาคม 2569 and was the only mutant of those two screens
 *   still killing anything the morning this was measured.
 * - **two** on the enrolment screen, which has neither a filter nor a panel
 *   move from page one: the **section jump**, which `202a` was re-aimed at when
 *   #199 closed the same way in there, and which `141b` measured keeps the
 *   document (`load` is keyed on `sectionId` as well as on `page`).
 *
 * A nineteenth row was re-aimed before this ticket, and it is why the three
 * numbers above do not account for the file on their own: ข้อมูลการเปิดรายวิชา's
 * เปิดรายวิชา was moved onto the ปีการศึกษา box by #210 itself on 19 ตุลาคม
 * 2569, and left described on sheet `23` as pressing ถัดไป, which #223
 * corrected there. So the thirty-two rows are **eighteen** re-aimed here, one
 * re-aimed by #210, **two** nets and **eleven** still pressing ถัดไป.
 *
 * #223's third question was asked before either of its options — does any
 * other caller defer a press the same way? Measured 20 ตุลาคม 2569: the suite
 * presses a pager at four sites, `supersede` and `ontoPageTwo` here and
 * `68a:98` and `68a:228`, and only `supersede`'s stands behind a retrying
 * `toBeEnabled()`. `68a`'s two are on ข้อมูลนักศึกษา, whose `<Pager>` is handed
 * no `busy` at all, so the census of other blinded callers is **empty**. The
 * wait is still in `supersede` for the eleven rows below, which is safe only
 * while their own screens leave the control live — **#225**.
 *
 * Eleven rows still press ถัดไป, and five of them are the reason to read this
 * paragraph before writing one: ข้อมูลผู้ใช้งาน's three and ข้อมูลนักศึกษา's two
 * are on the two screens whose `<Pager>` is handed no `busy` although the
 * screen holds one, which is **#221**'s question and not a property of this
 * file. The day it is answered the way #210 was, those five rows are blinded
 * exactly as these were and nothing goes red (measured 20 ตุลาคม 2569; the
 * other six press a control the handler leaves live - the five imports and
 * `onBack`).
 *
 * Two rows are left as **nets** instead — the refused แก้ไข of Rubric and of
 * ข้อมูลการเปิดรายวิชา. Their only way in left is the filter, and `144a` already
 * presses that handler and moves that filter, so a re-aim here would be a copy
 * of a row in another file. Each reads once that ถัดไป is dead while the reload
 * is out, which is the premise under #210's price, and says where its claim is
 * held (#47, #203 — a row left as a net says it is one).
 *
 * ## What this file writes
 *
 * The seed has two departments, three programmes, one subject, one placement
 * and two offerings, and a page two needs eleven. So before the first row this
 * file puts in eleven departments, eleven programmes, thirteen subjects, eleven
 * placements, eleven offerings in a year nobody else uses, and two rubrics,
 * each keyed to sort **first** so the rows a handler deletes or edits are on
 * page one. Straight into the schema, because the imports are other files'
 * subjects (#139's reason). The rows themselves write too — an edit saved
 * unchanged, a suspension, an import, an enrolment, a deletion, a copy — and
 * `hold()` puts all of it back.
 *
 * Four more subjects since #223, sorting after the first ten and so onto page
 * two: one for the removal that happens there, because a placed subject is
 * refused by the schema's `RESTRICT` and a refusal reloads nothing, and three
 * for รายวิชาในหลักสูตร's three moves to place, a placement being what that
 * screen's import panel adds. A seed that gains a row a mutant can reach
 * expires a kill count (#48, #202), which is why every mutant of this file was
 * swept again the day they went in.
 */

const db = createPool({ schema: E2E_SCHEMA });

/** A year no other file opens an offering in: `23a` uses the next one. */
const FUTURE = String(Number(CURRENT_YEAR) + 2);

/** Eleven, zero-padded to sort before every seeded code. */
const eleven = (prefix, width) =>
  Array.from({ length: 11 }, (unused, i) => `${prefix}${String(i).padStart(width, '0')}`);

const DEPARTMENTS = eleven('00140', 2);
const PROGRAMS = eleven('00140', 2);
/** `00140000` is placed nowhere, `00140001`…`00140011` are placed, `00140012` is for the import. */
const SUBJECTS = Array.from({ length: 13 }, (unused, i) => `00140${String(i).padStart(3, '0')}`);
const PLACED = SUBJECTS.slice(1, 12);
const UNPLACED_FOR_IMPORT = SUBJECTS[12];
/**
 * Four subjects of page two, since #223, placed nowhere.
 *
 * `00140050` is what the ข้อมูลรายวิชา removal removes from there - `SUBJECTS[10]`
 * is on page two too but is placed, and `RESTRICT` would refuse it. The other
 * three are what รายวิชาในหลักสูตร's three moves place, one each: its import
 * panel adds a placement, so each move needs a subject that has none.
 */
const PAGE_TWO_SPARE = '00140050';
const TO_PLACE = ['00140060', '00140061', '00140062'];
const RUBRICS = ['RUB-140A', 'RUB-140B'];

let release;
test.beforeAll(async () => {
  release = await hold();
  const admin = byAlias('U_ADMIN');
  for (const [i, id] of DEPARTMENTS.entries()) {
    await db.query(
      `INSERT INTO departments (department_id, department_name_th, department_name_en, faculty_id)
       VALUES ($1, $2, $3, 'ENG')`,
      [id, `ภาควิชาของแถว #140 ${i}`, `Department for #140 ${i}`],
    );
  }
  for (const [i, id] of PROGRAMS.entries()) {
    await db.query(
      `INSERT INTO programs (program_id, program_name_th, program_name_en, department_id, revision_year)
       VALUES ($1, $2, $3, '05', '2565')`,
      [id, `หลักสูตรของแถว #140 ${i}`, `Programme for #140 ${i}`],
    );
  }
  for (const [i, id] of [...SUBJECTS, PAGE_TWO_SPARE, ...TO_PLACE].entries()) {
    await db.query(
      `INSERT INTO subjects (subject_id, subject_name_th, subject_name_en, credits, department_id, created_by)
       VALUES ($1, $2, $3, 3, '05', $4)`,
      [id, `วิชาของแถว #140 ${i}`, `Subject for #140 ${i}`, admin],
    );
  }
  for (const id of PLACED) {
    await db.query(
      `INSERT INTO program_subjects (program_id, subject_id, subject_type, created_by)
       VALUES ($1, $2, 'required', $3)`,
      [PROGRAM, id, admin],
    );
    await db.query(
      `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
       VALUES ($1, $2, $3, 1)`,
      [PROGRAM, id, FUTURE],
    );
  }
  for (const [i, code] of RUBRICS.entries()) {
    await db.query(
      `INSERT INTO rubrics (rubric_code, rubric_name_th, rubric_name_en, program_id, display_order, created_by)
       VALUES ($1, $2, $3, $4, 0, $5)`,
      [code, `Rubric ของแถว #140 ${i}`, `Rubric for #140 ${i}`, PROGRAM, admin],
    );
  }
});
test.afterAll(async () => {
  await release();
  await db.end();
});

/** Long enough for page two to be answered and drawn before page one is let go. */
const HELD_MS = 2_000;

/**
 * How long the held answer is given to be drawn before the screen is read.
 *
 * It can decide, as `139a`'s can: an answer rightly dropped draws nothing to
 * wait for (#50). What stands behind the number is the sweep of
 * `mutation/140-superseded-handler-reload.py`, not the claim that timing cannot
 * matter (#52, #136).
 */
const SETTLE_MS = 250;

/** Worded so no screen could say it by itself. */
const REFUSED = 'ไม่พบรายการนี้แล้ว (แถวของ #140)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const asPage = (url, n) => url.searchParams.get('page') === String(n);

/** A route handler that lets a read through `ms` late, and anything else at once. */
const late = (ms) => async (route, request) => {
  if (request.method() === 'GET') await sleep(ms);
  try {
    await route.continue();
  } catch {
    // The row has already ended and closed the page.
  }
};

/**
 * Presses a handler, supersedes its reload while it is out, and reads once.
 *
 * `list` is the pathname the screen's list is read from, `table` its table,
 * `rows` the key of the answer's array and `key` the natural key a row's first
 * cell shows. `press` does whatever makes the handler run and may return before
 * the reload is sent: the wait for the request is here.
 *
 * `move` is the superseding read, and it defaults to the pager's: a press of
 * ถัดไป and page two. A row whose screen disables the pager while its own write
 * is out passes one of its own - `reads` says which request is the superseding
 * one, `press` makes it, and `pages` is for the premise that only a page move
 * needs (#210, #223 and `## Which control supersedes the read` above). `reads`
 * identifies that request whole, path and all, because a jump to another
 * Section's list is a read of another path.
 *
 * `held` says which read the row holds, and defaults to page one of `list`: the
 * twelve rows that stand on page two so the import panel's move is a page move
 * pass their own (#223).
 */
async function supersede(page, { list, table, rows, key, press, move, held }) {
  const isList = (url) => url.pathname === list;
  const moveTo = move ?? {
    pages: true,
    reads: (url) => isList(url) && asPage(url, 2),
    press: async () => {
      await expect(next(page)).toBeEnabled();
      await next(page).click();
    },
  };
  const isAsked = held ?? ((url) => isList(url) && asPage(url, 1));
  // The superseding read is not held, whatever identifies it: holding both
  // would leave the row waiting for the answer it is about to compare (#160's
  // species - a matcher that takes in more than the request it names).
  const isHeld = (url) => isAsked(url) && !moveTo.reads(url);

  const before = await reading(page, table);
  if (moveTo.pages) expect(before.pages, 'the row needs a page two to move to').toBeGreaterThan(1);

  // `unroute` finds a route by the matcher it was given, compared with `===`,
  // so the same function goes to both.
  await page.route(isHeld, late(HELD_MS));

  try {
    const reloadSent = page.waitForRequest(
      (request) => request.method() === 'GET' && isHeld(new URL(request.url())),
    );
    const heldArrived = page.waitForResponse(
      (answer) => answer.request().method() === 'GET' && isHeld(new URL(answer.url())),
    );
    const movedArrived = page.waitForResponse(
      (answer) => answer.request().method() === 'GET' && moveTo.reads(new URL(answer.url())),
    );

    await press(page);
    await reloadSent;

    await moveTo.press(page);

    const moved = await (await movedArrived).json();
    const held = await (await heldArrived).json();
    expect(held[rows].map(key)).not.toEqual(moved[rows].map(key));

    await page.waitForTimeout(SETTLE_MS);

    const shown = await reading(page, table);
    expect({
      page: shown.shown,
      total: shown.total,
      keys: (await keysOn(table)).map((cell) => cell.trim()),
    }).toEqual({
      page: moved.page,
      total: moved.total,
      keys: moved[rows].map(key),
    });
  } finally {
    await page.unroute(isHeld);
  }
}

/** Refuses the read of one row, straight away: what is on trial is the reload after it. */
async function refuseRead(page, pathname) {
  await page.route(
    (url) => url.pathname === pathname,
    (route, request) =>
      request.method() === 'GET'
        ? route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: REFUSED }),
          })
        : route.continue(),
  );
}

/** Opens a row's form through its own read, and saves it unchanged. */
async function saveUnchanged(page, row, pathname) {
  await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === pathname && answer.request().method() === 'GET',
    ),
    row.getByRole('button', { name: 'แก้ไข', exact: true }).click(),
  ]);
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
}

/**
 * Presses a control on one row and then the confirmation's own button.
 * Three removals and, since #86, the accounts screen's status switch.
 */
async function pressAndConfirm(page, row, label, confirm) {
  await row.getByRole('button', { name: label, exact: true }).first().click();
  await page.getByRole('button', { name: confirm, exact: true }).click();
}

/** The screen's own template's header, and one line built under it. */
async function importLine(page, path, line) {
  const header = headerOf(await downloadTemplate(page));
  await importCsv(page, { path, text: csv(header, typeof line === 'function' ? line(header) : line), name: 'row-140.csv' });
}

/**
 * Walks to page two, and says the screen is on it - #223.
 *
 * The premise of the twelve rows whose superseding control is the import panel:
 * `onImported` reloads by hand when the person is on page one and moves them to
 * page one when they are not, so the move is a page move only from somewhere
 * else. Walked here, before anything is held, where the pager is live because
 * nothing is out.
 */
async function ontoPageTwo(page, { list, table }) {
  const drawn = page.waitForResponse(
    (answer) =>
      answer.request().method() === 'GET' &&
      new URL(answer.url()).pathname === list &&
      asPage(new URL(answer.url()), 2),
  );
  await expect(next(page), 'the row needs a page two to stand on').toBeEnabled();
  await next(page).click();
  await untilDrawn(page, await drawn);
  expect((await reading(page, table)).shown, 'standing on page two').toBe(2);
}

/**
 * The import panel's move to page one, as a superseding read - #223.
 *
 * `ImportPanel` keeps its own flag and touches neither of the screen's - the
 * comment over `writing` in `frontend/src/pages/Departments.js` says so, and
 * the sweep of 20 ตุลาคม 2569 measured it: the five imports' own rows were among
 * the eleven that still killed, their press being the one that leaves the pager
 * live. From page two its `onImported` calls `setPage(1)`, so what replaces the
 * handler's held read is a read of another page, exactly as ถัดไป's was.
 *
 * The template is fetched by the caller, before the hold: a download inside the
 * window would spend it (`HELD_MS` is what the move has to finish in).
 */
function throughTheImportPanel(page, { list, path, template, line }) {
  return {
    reads: (url) => url.pathname === list && asPage(url, 1),
    press: () =>
      importCsv(page, { path, text: csv(template, line), name: 'move-223.csv' }),
  };
}

/**
 * Reads once that ถัดไป is dead while the handler's reload is out - #223.
 *
 * What the two net rows assert in place of a supersession they cannot build.
 * Read once rather than with `expect(...).toBeDisabled()`, because a retrying
 * read of a button that comes back to life when the held answer lands is a read
 * that can be satisfied by waiting - which is the whole defect this file walked
 * into (#209, #50).
 */
async function pagerIsDeadWhileTheReloadIsOut(page, { list, table, press }) {
  const isHeld = (url) => url.pathname === list && asPage(url, 1);
  expect((await reading(page, table)).pages, 'a page two, so ถัดไป is not dead for #57').toBeGreaterThan(1);
  await expect(next(page), 'the premise: ถัดไป is live with nothing out').toBeEnabled();

  await page.route(isHeld, late(HELD_MS));
  try {
    const reloadSent = page.waitForRequest(
      (request) => request.method() === 'GET' && isHeld(new URL(request.url())),
    );
    await press(page);
    await reloadSent;
    expect(
      await next(page).isDisabled(),
      'ถัดไป while the reload the handler is waiting for is out',
    ).toBe(true);
  } finally {
    await page.unroute(isHeld);
  }
}

// ── ข้อมูลผู้ใช้งาน ─────────────────────────────────────────────────────────

async function openUsersScreen(page) {
  await signIn(page, ACCOUNTS.systemAdmin);
  await users.openUsers(page);
  return { list: users.API, table: users.listTable(page), rows: 'users', key: (user) => user.user_id };
}

test('ข้อมูลผู้ใช้งาน (Users.js): the list บันทึก reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `Users.save` closes the form before it reloads.
  const screen = await openUsersScreen(page);
  const row = users.userRow(page, 'dept.admin.01@kmitl.ac.th');
  await supersede(page, {
    ...screen,
    press: async () => {
      await row.getByRole('button', { name: 'แก้ไข', exact: true }).click();
      await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    },
  });
});

test('ข้อมูลผู้ใช้งาน (Users.js): the list ระงับ reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `Users.confirmSwitch` closes its question after the write, as the nine
  // removals do: since #86 the switch asks first, so the press is two - and the
  // box is gone before the reload this row holds is answered, which is why
  // ถัดไป below is an ordinary click rather than #204's keyboard way in.
  const screen = await openUsersScreen(page);
  await supersede(page, {
    ...screen,
    press: () =>
      pressAndConfirm(
        page,
        users.userRow(page, 'past.assessor@tabee-review.org'),
        'ระงับ',
        'ยืนยันการเปลี่ยน',
      ),
  });
});

test('ข้อมูลผู้ใช้งาน (Users.js): the list an import reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `Users`' `onImported`, fired by `ImportPanel` beside the list.
  const screen = await openUsersScreen(page);
  const account = {
    user_id: '91140001',
    email: 'e2e.row.140@kmitl.ac.th',
    title_th: 'นาย',
    first_name_th: 'ทดสอบ',
    last_name_th: 'แถวหนึ่งสี่ศูนย์',
    department_id: '05',
    role_id: 'TEACHER',
    scope_id: '05',
  };
  await supersede(page, {
    ...screen,
    press: () =>
      importLine(page, `${users.API}/import`, (header) =>
        header
          .split(',')
          .map((column) => account[column.trim()] ?? '')
          .join(','),
      ),
  });
});

// ── ข้อมูลภาควิชา · ข้อมูลหลักสูตร · ข้อมูลรายวิชา · รายวิชาในหลักสูตร ─────────────
//
// The four screens that import: each reloads from the refusal of แก้ไข, from
// บันทึก, from ลบ (นำออก) and from the import.

const MASTER = [
  {
    name: 'ข้อมูลภาควิชา',
    file: 'Departments.js',
    account: ACCOUNTS.facultyAdmin,
    open: departments.openDepartments,
    list: departments.API,
    rows: 'departments',
    key: (row) => row.department_id,
    row: (page) => departments.departmentRow(page, DEPARTMENTS[10]),
    detail: `${departments.API}/${DEPARTMENTS[10]}`,
    removed: (page) => departments.departmentRow(page, DEPARTMENTS[10]),
    remove: 'ลบ',
    confirm: 'ลบภาควิชา',
    importPath: `${departments.API}/import`,
    importLine: 'X140,ภาควิชานำเข้าของแถว #140,',
    moves: [
      'X223A,ภาควิชาที่การนำเข้าแซงด้วย A,',
      'X223B,ภาควิชาที่การนำเข้าแซงด้วย B,',
      'X223C,ภาควิชาที่การนำเข้าแซงด้วย C,',
    ],
  },
  {
    name: 'ข้อมูลหลักสูตร',
    file: 'Programs.js',
    account: ACCOUNTS.facultyAdmin,
    open: programs.openPrograms,
    list: programs.API,
    rows: 'programs',
    key: (row) => row.program_id,
    row: (page) => programs.programRow(page, PROGRAMS[10]),
    detail: `${programs.API}/${PROGRAMS[10]}`,
    removed: (page) => programs.programRow(page, PROGRAMS[10]),
    remove: 'ลบ',
    confirm: 'ลบหลักสูตร',
    importPath: `${programs.API}/import`,
    importLine: 'ZP140,หลักสูตรนำเข้าของแถว #140,Imported for #140,05,2565',
    moves: [
      'ZP223A,หลักสูตรที่การนำเข้าแซงด้วย A,Imported for #223 A,05,2565',
      'ZP223B,หลักสูตรที่การนำเข้าแซงด้วย B,Imported for #223 B,05,2565',
      'ZP223C,หลักสูตรที่การนำเข้าแซงด้วย C,Imported for #223 C,05,2565',
    ],
  },
  {
    name: 'ข้อมูลรายวิชา',
    file: 'Subjects.js',
    account: ACCOUNTS.departmentAdmin05,
    open: subjects.openSubjects,
    list: subjects.API,
    rows: 'subjects',
    key: (row) => row.subject_id,
    row: (page) => subjects.subjectRow(page, SUBJECTS[10]),
    detail: `${subjects.API}/${SUBJECTS[10]}`,
    // The one subject of page two that is placed nowhere, so `RESTRICT` lets it
    // go and the removal has a reload to supersede.
    removed: (page) => subjects.subjectRow(page, PAGE_TWO_SPARE),
    remove: 'ลบ',
    confirm: 'ลบรายวิชา',
    importPath: `${subjects.API}/import`,
    importLine: '01140199,วิชานำเข้าของแถว #140,Imported for #140,3,05,,',
    moves: [
      '01140190,วิชาที่การนำเข้าแซงด้วย A,Imported for #223 A,3,05,,',
      '01140191,วิชาที่การนำเข้าแซงด้วย B,Imported for #223 B,3,05,,',
      '01140192,วิชาที่การนำเข้าแซงด้วย C,Imported for #223 C,3,05,,',
    ],
  },
  {
    name: 'รายวิชาในหลักสูตร',
    file: 'ProgramSubjects.js',
    account: ACCOUNTS.committee0501,
    open: pairs.openProgramSubjects,
    list: pairs.API,
    rows: 'program_subjects',
    key: (row) => row.subject_id,
    row: (page) => pairs.pairRow(page, PLACED[10]),
    detail: `${pairs.API}/${PROGRAM}/${PLACED[10]}`,
    removed: (page) => pairs.pairRow(page, PLACED[10]),
    remove: 'นำออก',
    confirm: 'นำออกจากหลักสูตร',
    importPath: `${pairs.API}/import`,
    importLine: `${PROGRAM},${UNPLACED_FOR_IMPORT},required`,
    moves: TO_PLACE.map((subject) => `${PROGRAM},${subject},required`),
  },
];

async function openMaster(page, screen) {
  await signIn(page, screen.account);
  await screen.open(page);
  return { list: screen.list, table: page.locator('table').first(), rows: screen.rows, key: screen.key };
}

/**
 * These screens' three rows, as they are built since #223: standing on page
 * two, with the import panel's move to page one as the superseding read.
 *
 * `move` is which of the screen's three lines this row imports, so no two rows
 * import the same key. The template is fetched here, before anything is held.
 */
async function supersededByTheImportPanel(page, screen, moveIndex, press) {
  const opened = await openMaster(page, screen);
  const template = headerOf(await downloadTemplate(page));
  await ontoPageTwo(page, opened);
  await supersede(page, {
    ...opened,
    held: (url) => url.pathname === screen.list && asPage(url, 2),
    move: throughTheImportPanel(page, {
      list: screen.list,
      path: screen.importPath,
      template,
      line: screen.moves[moveIndex],
    }),
    press,
  });
}

for (const screen of MASTER) {
  test(`${screen.name} (${screen.file}): the list a refused แก้ไข reloads does not land on the page the pager has left`, async ({
    page,
  }) => {
    // `openEditor`'s `catch`: the form never opened, so the page never left.
    await supersededByTheImportPanel(page, screen, 0, async () => {
      await refuseRead(page, screen.detail);
      await screen.row(page).getByRole('button', { name: 'แก้ไข', exact: true }).click();
    });
  });

  test(`${screen.name} (${screen.file}): the list บันทึก reloads does not land on the page the pager has left`, async ({
    page,
  }) => {
    // `save` closes the form before it reloads.
    await supersededByTheImportPanel(page, screen, 1, () =>
      saveUnchanged(page, screen.row(page), screen.detail),
    );
  });

  test(`${screen.name} (${screen.file}): the list ${screen.remove} reloads does not land on the page the pager has left`, async ({
    page,
  }) => {
    // `confirmRemoval` closes the confirmation before it reloads.
    await supersededByTheImportPanel(page, screen, 2, () =>
      pressAndConfirm(page, screen.removed(page), screen.remove, screen.confirm),
    );
  });

  test(`${screen.name} (${screen.file}): the list an import reloads does not land on the page the pager has left`, async ({
    page,
  }) => {
    // `onImported`, fired by `ImportPanel` beside the list.
    const opened = await openMaster(page, screen);
    await supersede(page, {
      ...opened,
      press: () => importLine(page, screen.importPath, screen.importLine),
    });
  });
}

// ── Rubric ───────────────────────────────────────────────────────────────────

/**
 * The screen, as a Department Admin of 05 since #223.
 *
 * It was a กรรมการหลักสูตร until then, and a committee reaches one curriculum
 * and is drawn **no** หลักสูตร picker - `Rubrics.js` draws the name instead when
 * `programs.length === 1`. The filter is the only control this screen leaves
 * live while a write is out, so the two rows that supersede by filter need an
 * account that is offered it, and `DEPT_ADMIN` is a maintainer of a Rubric by
 * `backend/routes/rubrics.js`'s own list. `144a` signs the same account in for
 * the same reason.
 */
async function openRubricsScreen(page) {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  const answer = await (await rubrics.openRubrics(page)).json();
  return {
    opened: { list: rubrics.API, table: rubrics.table(page), rows: 'rubrics', key: (row) => row.rubric_code },
    idOf: (code) => answer.rubrics.find((rubric) => rubric.rubric_code === code).id,
  };
}

/** The หลักสูตร filter, which is a dependency of `load` and is never `disabled={busy}`. */
const throughTheProgramFilter = (page) => ({
  reads: (url) => url.pathname === rubrics.API && url.searchParams.get('program_id') === PROGRAM_INTL,
  press: async () => {
    await expect(
      rubrics.programFilter(page),
      'the filter, which is not disabled while the write is out',
    ).toBeEnabled();
    await rubrics.programFilter(page).selectOption(PROGRAM_INTL);
  },
});

test('Rubric (Rubrics.js): the list a refused แก้ไข reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // A net since #223, and not a re-aim. #210 closed this row's way in - ถัดไป
  // is dead from the press until the held read is drawn - and the only control
  // left is the filter, which `144a`'s *the list a refused แก้ไข reloads does
  // not land on the หลักสูตร filter that has moved* already presses with the
  // same handler. So what is left to read here is the premise under that
  // price, and the claim itself is held there (#47, #203, #217).
  const { opened, idOf } = await openRubricsScreen(page);
  await refuseRead(page, `${rubrics.API}/${idOf(RUBRICS[1])}`);
  await pagerIsDeadWhileTheReloadIsOut(page, {
    ...opened,
    press: () =>
      rubrics.rubricRow(page, RUBRICS[1]).getByRole('button', { name: 'แก้ไข', exact: true }).click(),
  });
});

test('Rubric (Rubrics.js): the list บันทึก reloads does not land on the page the pager has left', async ({ page }) => {
  const { opened, idOf } = await openRubricsScreen(page);
  await supersede(page, {
    ...opened,
    move: throughTheProgramFilter(page),
    press: () =>
      saveUnchanged(page, rubrics.rubricRow(page, RUBRICS[1]), `${rubrics.API}/${idOf(RUBRICS[1])}`),
  });
});

test('Rubric (Rubrics.js): the list ลบ reloads does not land on the page the pager has left', async ({ page }) => {
  const { opened } = await openRubricsScreen(page);
  await supersede(page, {
    ...opened,
    move: throughTheProgramFilter(page),
    press: () => pressAndConfirm(page, rubrics.rubricRow(page, RUBRICS[0]), 'ลบ', 'ลบ Rubric'),
  });
});

// ── ข้อมูลการเปิดรายวิชา ──────────────────────────────────────────────────────

async function openOfferingsScreen(page) {
  await signIn(page, ACCOUNTS.committee0501);
  const answer = await (await offerings.openOfferings(page)).json();
  return {
    opened: {
      list: offerings.API,
      table: page.locator('table').first(),
      rows: 'offerings',
      key: (row) => row.subject_id,
    },
    answer,
  };
}

const offeringDetail = /^\/api\/offerings\/\d+$/;

/**
 * The ปีการศึกษา box, which is a dependency of `load` and is not
 * `disabled={busy}` - the move #210 gave this screen's save row on 19 ตุลาคม
 * 2569 and #223 gave its other two writing rows.
 *
 * The fixture's offerings are all in `FUTURE` and the seed's in the current
 * year, so the two reads answer different rows. Named once: a locator built out
 * of a source string is a claim about the DOM (#118), and one written twice is
 * two.
 */
const throughTheYearFilter = (page) => ({
  reads: (url) =>
    url.pathname === offerings.API && url.searchParams.get('academic_year') === CURRENT_YEAR,
  press: async () => {
    await expect(
      offerings.yearFilter(page),
      'the filter, which is not disabled while the write is out',
    ).toBeEnabled();
    await offerings.yearFilter(page).fill(CURRENT_YEAR);
  },
});

test('ข้อมูลการเปิดรายวิชา (Offerings.js): the list a refused ตอนเรียนและผู้สอน reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `openSections`' `catch`: the panel never opened.
  //
  // A net since #223, for Rubric's reason one screen along: ถัดไป is dead from
  // the press until the held read is drawn, and `144a` presses this same
  // handler and moves each of this screen's three filters - three rows, which
  // is where the claim is held (#47, #203, #217).
  const { opened, answer } = await openOfferingsScreen(page);
  const [first] = answer.offerings;
  await refuseRead(page, `${offerings.API}/${first.id}`);
  await pagerIsDeadWhileTheReloadIsOut(page, {
    ...opened,
    press: () =>
      offerings
        .offeringRow(page, first.subject_id)
        .first()
        .getByRole('button', { name: 'ตอนเรียนและผู้สอน' })
        .click(),
  });
});

test('ข้อมูลการเปิดรายวิชา (Offerings.js): the list กลับไปหน้ารายการ reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `onBack` takes the panel away and reloads in the same breath.
  const { opened } = await openOfferingsScreen(page);
  await supersede(page, {
    ...opened,
    // The panel replaces the list, so it is opened inside the press: the row
    // reads the pager before it starts.
    press: async () => {
      await offerings.openSections(page, PLACED[2]);
      await page.getByRole('button', { name: 'กลับไปหน้ารายการ' }).click();
    },
  });
});

test('ข้อมูลการเปิดรายวิชา (Offerings.js): the list เปิดรายวิชา reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `save` closes the form, reloads, and only then opens the new Offering's
  // panel. The panel's read is held until well after the row has read the
  // list, because the harm is the window between the two: a panel drawn over
  // the list would leave nothing to read, with the defect in place or not.
  const { opened } = await openOfferingsScreen(page);
  await page.route((url) => offeringDetail.test(url.pathname), late(HELD_MS * 5));
  await supersede(page, {
    ...opened,
    // The pager is `disabled={busy}` here since #210 and the save is still out,
    // so what supersedes the reload is the screen's own ปีการศึกษา box.
    move: throughTheYearFilter(page),
    // The form replaces the list, so it is filled inside the press: the row
    // reads the pager before it starts.
    press: async () => {
      await offerings.openForm(page);
      await expect(offerings.subjectPicker(page).locator(`option[value="${PLACED[3]}"]`)).toHaveCount(1);
      await offerings.subjectPicker(page).selectOption(PLACED[3]);
      await page.locator('form input[inputmode="numeric"]').fill(FUTURE);
      await page.locator('form select:has(option:text-is("1 — ภาคต้น"))').selectOption('3');
      await page.getByRole('button', { name: 'เปิดรายวิชา', exact: true }).click();
    },
  });
});

test('ข้อมูลการเปิดรายวิชา (Offerings.js): the list คัดลอก reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `runCopy` — the copy panel sits under the list and never takes it away.
  const { opened } = await openOfferingsScreen(page);
  await supersede(page, {
    ...opened,
    // Re-aimed at the filter by #223: `runCopy` holds `writing` until its own
    // reload has answered, so ถัดไป is dead for the whole window.
    move: throughTheYearFilter(page),
    press: () =>
      offerings.copyFromTerm(page, { year: FUTURE, semester: 1 }, { year: FUTURE, semester: 2 }),
  });
});

test('ข้อมูลการเปิดรายวิชา (Offerings.js): the list ยกเลิกการเปิด reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `confirmRemoval`'s Offering branch closes the confirmation before it reloads.
  const { opened } = await openOfferingsScreen(page);
  await supersede(page, {
    ...opened,
    // Re-aimed at the filter by #223, with the save row's reason.
    move: throughTheYearFilter(page),
    press: () =>
      pressAndConfirm(page, offerings.offeringRow(page, PLACED[4]), 'ยกเลิกการเปิด', 'ยกเลิกการเปิดรายวิชา'),
  });
});

// ── ข้อมูลนักศึกษา ────────────────────────────────────────────────────────────

async function openStudentsScreen(page) {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await students.openRegister(page);
  return {
    list: '/api/students',
    table: students.listTable(page),
    rows: 'students',
    key: (row) => row.student_id,
  };
}

test('ข้อมูลนักศึกษา (Students.js): the list บันทึก reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `save` closes the form before it reloads.
  const opened = await openStudentsScreen(page);
  await supersede(page, {
    ...opened,
    press: () =>
      students.addStudent(page, {
        code: '68140001',
        first: 'ทดสอบ',
        last: 'แถวหนึ่งสี่ศูนย์',
        program: PROGRAM,
      }),
  });
});

test('ข้อมูลนักศึกษา (Students.js): the list an import reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `onImported`, fired by `ImportPanel` beside the list.
  const opened = await openStudentsScreen(page);
  await supersede(page, {
    ...opened,
    press: () =>
      importLine(page, '/api/students/import', `68140002,ทดสอบ,นำเข้าแถวหนึ่งสี่ศูนย์,${PROGRAM}`),
  });
});

// ── รายชื่อนักศึกษาของรายวิชา ─────────────────────────────────────────────────

async function openEnrolmentScreen(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await enrolment.mySectionIds(page);
  await enrolment.openEnrolment(page, section);
  return {
    section,
    opened: {
      list: `/api/teaching/sections/${section}/students`,
      table: enrolment.listTable(page),
      rows: 'students',
      key: (row) => row.student_id,
    },
  };
}

/**
 * The same screen, with last year's Section underneath it in the history list
 * of one document - #223, and `202a`'s own re-aim when #199 closed this screen's
 * pager on 15 ตุลาคม 2569.
 *
 * This screen has no filter, and its import panel's move is a page move only
 * from somewhere other than page one - where `reload` reads by hand and so has
 * nothing of its own to supersede. What is left is the **section jump**: `load`
 * is keyed on `sectionId` as well as on `page`, so a move to another Section of
 * the same route shape replaces the loader exactly as a page move did.
 * `support/section-jump.js` carries the walk and says why the sequence is
 * asymmetric; `141b` measured on 5 ตุลาคม 2569 that the document survives it,
 * which is the premise each of these two rows reads back.
 */
async function openWhereTheJumpIsPossible(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await enrolment.mySectionIds(page);
  await enrolment.openEnrolment(page, LAST_YEAR);
  await markDocument(page);

  const drawn = await intoTheListedSectionScreen(
    page,
    section,
    '/subjectStudents',
    enrolment.waitForList,
  );
  await untilDrawn(page, drawn);
  const table = enrolment.listTable(page);
  expect((await reading(page, table)).shown, "page one of this year's list").toBe(1);
  return {
    list: `/api/teaching/sections/${section}/students`,
    table,
    rows: 'students',
    key: (row) => row.student_id,
  };
}

/** Last year's Section, in one move of the history list and with no commit. */
const throughTheSectionJump = (page) => ({
  reads: (url) => url.pathname === `/api/teaching/sections/${LAST_YEAR}/students`,
  press: () => page.evaluate(() => window.history.go(-3)),
});

/** What says the router never replaced the document - the premise of both jumps. */
const sameDocument = async (page) => {
  expect(
    await page.evaluate(() => window.__document),
    'the one document the router has been moving inside',
  ).toBe(DOCUMENT);
};

test('รายชื่อนักศึกษาของรายวิชา (SubjectStudents.js): the list เพิ่มนักศึกษา reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `reload`, from `add`. The same site as the import's row below, which keeps
  // the pager as its way in because `ImportPanel` holds its own flag.
  const opened = await openWhereTheJumpIsPossible(page);
  await supersede(page, {
    ...opened,
    move: throughTheSectionJump(page),
    press: () => enrolment.enrol(page, enrolment.SPARE_CODES[0]),
  });
  await sameDocument(page);
});

test('รายชื่อนักศึกษาของรายวิชา (SubjectStudents.js): the list an import reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `reload` again, from `onImported={reload}` — passed by name, which is the
  // caller no grep for `load(` could find.
  const { section, opened } = await openEnrolmentScreen(page);
  await supersede(page, {
    ...opened,
    press: () => importLine(page, enrolment.IMPORT(section), enrolment.SPARE_CODES[1]),
  });
});

test('รายชื่อนักศึกษาของรายวิชา (SubjectStudents.js): the list นำออก reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `remove` closes the confirmation before it reloads. The student removed is
  // one this row enrols, because a seeded one has marks and is refused — and a
  // refusal reloads nothing.
  const opened = await openWhereTheJumpIsPossible(page);
  const code = enrolment.SPARE_CODES[2];
  await Promise.all([enrolment.waitForList(page), enrolment.enrol(page, code)]);
  await expect(page.getByRole('button', { name: `นำ ${code} ออกจากตอนเรียน` })).toBeVisible();
  await supersede(page, {
    ...opened,
    move: throughTheSectionJump(page),
    press: async () => {
      await page.getByRole('button', { name: `นำ ${code} ออกจากตอนเรียน` }).click();
      await page.getByRole('button', { name: 'นำออก', exact: true }).click();
    },
  });
  await sameDocument(page);
});

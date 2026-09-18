'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS } = require('../support/accounts');
const { byAlias, CURRENT_YEAR, FACULTY, PROGRAM, PROGRAM_INTL, SUBJECT } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { reading, keysOn } = require('../support/pager');
const users = require('../support/users-screen');
const subjects = require('../support/subjects-screen');
const pairs = require('../support/program-subjects-screen');
const rubrics = require('../support/rubrics-screen');
const offerings = require('../support/offerings-screen');
const students = require('../support/students-screen');

/**
 * #144 — a list a handler reloads does not land on top of a filter that has
 * already moved.
 *
 * #140 gave every handler that reloads a list the question
 * `onScreen.current === load`, and `load` is rebuilt whenever anything the
 * list asks for changes: the page, and on these six screens a filter as well.
 * So the one comparison answers for the pager and for every filter at once —
 * which is why it is right, and why `140a`, whose rows all press ถัดไป, is not
 * evidence for the filters. A mutant at the call site breaks the guard for
 * every control together and cannot tell them apart.
 *
 * The rows here move a filter instead, one row per control, and the mutants of
 * `mutation/144-superseded-reload-by-filter.py` break the guard **for one
 * control and no other**: they leave that control out of the dependencies of
 * the effect that writes `onScreen`, so the ref stops following `load` when
 * that control moves and follows it for everything else.
 *
 * ## How a row is built
 *
 * Each row opens its screen with no filter set, holds back every read of that
 * unfiltered page one with `page.route` for `HELD_MS`, and presses a handler.
 * Once the reload has been **sent** it moves the filter, waits for the
 * filtered list to answer, then for the held answer to be handed back, and
 * reads the screen once after `SETTLE_MS`: the pager's line and the first cell
 * of every row, against the filtered answer. The filtered answer has rows,
 * because an empty table draws a sentence in the first cell and the read would
 * be of that.
 *
 * ## What this file writes
 *
 * Whatever a filtered answer needs to differ from the unfiltered one and still
 * have rows, straight into the schema: a suspended account, a subject of
 * department 01, two students and a placement of 0503, and an Offering of that
 * placement in a term nobody else opens. The handlers write too — an edit saved
 * unchanged, a student added — and `hold()` puts all of it back. The ภาควิชา
 * row and the three ข้อมูลการเปิดรายวิชา rows also widen one grant for their own
 * length, and `widened` moves it back in its `finally`.
 */

const db = createPool({ schema: E2E_SCHEMA });

/** A term no other file opens: `23a` uses the next year, `140a` this one in terms 1 and 2, this file its ภาคฤดูร้อน. */
const FUTURE = String(Number(CURRENT_YEAR) + 2);

/** Suspended, so the สถานะ filter has somebody to find. */
const SUSPENDED = { id: 'e2e144', email: 'e2e.suspended.144@kmitl.ac.th' };
/** Department 01's, so the unfiltered catalogue is not department 05's. */
const CIVIL_SUBJECT = '00144001';
/** 0503's placement, and its Offering in ภาคฤดูร้อน of `FUTURE`. */
const INTL_SUBJECT = '00144002';
/** Filed under the other หลักสูตร, so filtering to it leaves only these. */
const INTL_STUDENTS = ['68144901', '68144902'];

let release;
test.beforeAll(async () => {
  release = await hold();
  const admin = byAlias('U_ADMIN');
  await db.query(
    `INSERT INTO users (user_id, email, first_name_th, last_name_th, department_id, status)
     VALUES ($1, $2, 'ทดสอบ', 'ถูกระงับของแถว #144', '05', 'inactive')`,
    [SUSPENDED.id, SUSPENDED.email],
  );
  for (const [id, department] of [
    [CIVIL_SUBJECT, '01'],
    [INTL_SUBJECT, '05'],
  ]) {
    await db.query(
      `INSERT INTO subjects (subject_id, subject_name_th, subject_name_en, credits, department_id, created_by)
       VALUES ($1, $2, $3, 3, $4, $5)`,
      [id, `วิชาของแถว #144 ${id}`, `Subject for #144 ${id}`, department, admin],
    );
  }
  await db.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type, created_by)
     VALUES ($1, $2, 'required', $3)`,
    [PROGRAM_INTL, INTL_SUBJECT, admin],
  );
  await db.query(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, $3, 3)`,
    [PROGRAM_INTL, INTL_SUBJECT, FUTURE],
  );
  for (const [i, id] of INTL_STUDENTS.entries()) {
    await db.query(
      `INSERT INTO student (student_id, first_name_th, last_name_th, department_id, program_id)
       VALUES ($1, $2, $3, '05', $4)`,
      [id, 'ทดสอบ', `ตัวกรองของแถว #144 ${i}`, PROGRAM_INTL],
    );
  }
});
test.afterAll(async () => {
  await release();
  await db.end();
});

/** Long enough for the filtered list to be answered and drawn before the held one is let go. */
const HELD_MS = 2_000;

/**
 * How long the held answer is given to be drawn before the screen is read. It
 * can decide, as `140a`'s can (#50); what stands behind the number is the
 * sweep of `mutation/144-superseded-reload-by-filter.py` (#52, #136).
 */
const SETTLE_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Presses a handler, moves one filter while its reload is out, and reads once.
 *
 * `list` is the pathname the list is read from, `filters` every query
 * parameter the screen's filters send — the held read is page one with none of
 * them — and `moved` the one parameter and value this row's control sends.
 * `rows` is the key of the answer's array and `key` the value a row's first
 * cell shows. `table` is the list's table, `press` sets off the handler and
 * `move` moves this row's control.
 */
async function refilter(page, { list, table, filters, moved, rows, key, press, move }) {
  const isList = (url) => url.pathname === list;
  const isHeld = (url) =>
    isList(url) &&
    url.searchParams.get('page') === '1' &&
    filters.every((name) => !url.searchParams.has(name));
  const isMoved = (url) => isList(url) && url.searchParams.get(moved[0]) === moved[1];

  await reading(page, table);

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
      (answer) => answer.request().method() === 'GET' && isMoved(new URL(answer.url())),
    );

    await press(page);
    await reloadSent;
    await move(page);

    const filtered = await (await movedArrived).json();
    const held = await (await heldArrived).json();
    expect(filtered[rows].length, 'the filtered list needs rows to read').toBeGreaterThan(0);
    expect(held[rows].map(key)).not.toEqual(filtered[rows].map(key));

    await page.waitForTimeout(SETTLE_MS);

    const shown = await reading(page, table);
    expect({
      page: shown.shown,
      total: shown.total,
      keys: (await keysOn(table)).map((cell) => cell.trim()),
    }).toEqual({
      page: filtered.page,
      total: filtered.total,
      keys: filtered[rows].map(key),
    });
  } finally {
    await page.unroute(isHeld);
  }
}

/** Worded so no screen could say it by itself. */
const REFUSED = 'ไม่พบรายการนี้แล้ว (แถวของ #144)';

/**
 * Refuses the read of one row, straight away: what is on trial is the reload
 * after it, and a refused แก้ไข opens no form, so the filter never leaves.
 */
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

/**
 * Runs `body` with one account's grant moved from one scope to a wider one,
 * and moves it back whatever `body` does. A filter drawn only when a grant
 * reaches more than one of something needs a grant that does, and #12 lets a
 * Central Admin hand out exactly this one.
 */
async function widened(userId, role, [from, to], body) {
  const move = (a, b) =>
    db.query(
      `UPDATE user_roles SET scope_id = $4 WHERE user_id = $1 AND role_id = $2 AND scope_id = $3`,
      [userId, role, a, b],
    );
  expect((await move(from, to)).rowCount).toBe(1);
  try {
    await body();
  } finally {
    await move(to, from);
  }
}

// ── ข้อมูลผู้ใช้งาน ─────────────────────────────────────────────────────────
//
// Three controls in one object: `filter(key)` writes the search box, the role
// and the status into the same `filters`, so each moves `load` alone.

const USER_FILTERS = ['q', 'role', 'status'];

async function openUsersScreen(page) {
  await signIn(page, ACCOUNTS.systemAdmin);
  await users.openUsers(page);
  return {
    list: users.API,
    table: users.listTable(page),
    filters: USER_FILTERS,
    rows: 'users',
    key: (user) => user.user_id,
    // `Users.save` closes the form before it reloads.
    press: async () => {
      const row = users.userRow(page, 'dept.admin.01@kmitl.ac.th');
      await row.getByRole('button', { name: 'แก้ไข', exact: true }).click();
      await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    },
  };
}

test('ข้อมูลผู้ใช้งาน (Users.js): the list บันทึก reloads does not land on the search the box has moved to', async ({
  page,
}) => {
  const screen = await openUsersScreen(page);
  await refilter(page, {
    ...screen,
    moved: ['q', 'teacher'],
    // One `fill` is one change event, so one request rather than one a letter.
    move: () => page.getByPlaceholder('ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้').fill('teacher'),
  });
});

test('ข้อมูลผู้ใช้งาน (Users.js): the list บันทึก reloads does not land on the บทบาท filter that has moved', async ({
  page,
}) => {
  const screen = await openUsersScreen(page);
  await refilter(page, {
    ...screen,
    moved: ['role', 'EXT_ASSESSOR'],
    move: () =>
      page.locator('select:has(option:text-is("ทุกบทบาท"))').selectOption('EXT_ASSESSOR'),
  });
});

test('ข้อมูลผู้ใช้งาน (Users.js): the list บันทึก reloads does not land on the สถานะ filter that has moved', async ({
  page,
}) => {
  const screen = await openUsersScreen(page);
  await refilter(page, {
    ...screen,
    moved: ['status', 'inactive'],
    move: () => page.locator('select:has(option:text-is("ทุกสถานะ"))').selectOption('inactive'),
  });
});

// ── ข้อมูลรายวิชา ─────────────────────────────────────────────────────────────

test('ข้อมูลรายวิชา (Subjects.js): the list a refused แก้ไข reloads does not land on the ภาควิชา filter that has moved', async ({
  page,
}) => {
  // Only a Department Admin reaches the catalogue, and a Department Admin at a
  // department reaches one — so the filter is drawn for nobody the seed signs
  // in as. A Department Admin granted at the faculty reaches two.
  await widened(IDS.departmentAdmin01, 'DEPT_ADMIN', ['01', FACULTY.id], async () => {
    await signIn(page, ACCOUNTS.departmentAdmin01);
    await subjects.openSubjects(page);
    await refuseRead(page, `${subjects.API}/${SUBJECT.id}`);
    await refilter(page, {
      list: subjects.API,
      table: subjects.listTable(page),
      filters: ['department_id'],
      moved: ['department_id', '05'],
      rows: 'subjects',
      key: (row) => row.subject_id,
      press: () =>
        subjects.subjectRow(page, SUBJECT.id).getByRole('button', { name: 'แก้ไข', exact: true }).click(),
      move: () => page.getByLabel('ภาควิชา').selectOption('05'),
    });
  });
});

// ── รายวิชาในหลักสูตร ─────────────────────────────────────────────────────────

test('รายวิชาในหลักสูตร (ProgramSubjects.js): the list a refused แก้ไข reloads does not land on the หลักสูตร filter that has moved', async ({
  page,
}) => {
  // A Department Admin reaches both of 05's curricula; a committee reaches one
  // and is drawn no filter.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await pairs.openProgramSubjects(page);
  await refuseRead(page, `${pairs.API}/${PROGRAM}/${SUBJECT.id}`);
  await refilter(page, {
    list: pairs.API,
    table: page.locator('table').first(),
    filters: ['program_id'],
    moved: ['program_id', PROGRAM_INTL],
    rows: 'program_subjects',
    key: (row) => row.subject_id,
    press: () =>
      pairs.pairRow(page, SUBJECT.id).getByRole('button', { name: 'แก้ไข', exact: true }).click(),
    move: () => pairs.programFilter(page).selectOption(PROGRAM_INTL),
  });
});

// ── Rubric ───────────────────────────────────────────────────────────────────

test('Rubric (Rubrics.js): the list a refused แก้ไข reloads does not land on the หลักสูตร filter that has moved', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  const [first] = (await (await rubrics.openRubrics(page)).json()).rubrics;
  await refuseRead(page, `${rubrics.API}/${first.id}`);
  await refilter(page, {
    list: rubrics.API,
    table: rubrics.table(page),
    filters: ['program_id'],
    moved: ['program_id', PROGRAM_INTL],
    rows: 'rubrics',
    key: (row) => row.rubric_code,
    press: () =>
      rubrics.rubricRow(page, first.rubric_code).getByRole('button', { name: 'แก้ไข', exact: true }).click(),
    move: () => rubrics.programFilter(page).selectOption(PROGRAM_INTL),
  });
});

// ── ข้อมูลการเปิดรายวิชา ──────────────────────────────────────────────────────
//
// Three controls, each its own dependency of `load`. One Offering this file
// opens answers all three: 0503's, in `FUTURE`, in ภาคฤดูร้อน.
//
// The screen is a กรรมการหลักสูตร's alone, and a committee granted at a
// หลักสูตร reaches one and is drawn no หลักสูตร filter. One granted at the
// department reaches both — and 0503's Offering, which the ปีการศึกษา and
// ภาคการศึกษา rows need as well.

const OFFERING_FILTERS = ['program_id', 'academic_year', 'semester'];

/** Signs in as 0501's committee, widened to department 05, and hands `body` the screen. */
async function onOfferingsScreen(page, body) {
  await widened(IDS.committee0501, 'PROG_MANAGER', [PROGRAM, '05'], async () => {
    await signIn(page, ACCOUNTS.committee0501);
    const [first] = (await (await offerings.openOfferings(page)).json()).offerings;
    await refuseRead(page, `${offerings.API}/${first.id}`);
    await body({
      list: offerings.API,
      table: page.locator('table').first(),
      filters: OFFERING_FILTERS,
      rows: 'offerings',
      key: (row) => row.subject_id,
      // `openSections`' `catch`: the panel never opened.
      press: () =>
        offerings
          .offeringRow(page, first.subject_id)
          .first()
          .getByRole('button', { name: 'ตอนเรียนและผู้สอน' })
          .click(),
    });
  });
}

test('ข้อมูลการเปิดรายวิชา (Offerings.js): the list a refused ตอนเรียนและผู้สอน reloads does not land on the หลักสูตร filter that has moved', async ({
  page,
}) => {
  await onOfferingsScreen(page, (screen) =>
    refilter(page, {
      ...screen,
      moved: ['program_id', PROGRAM_INTL],
      move: () => page.getByLabel('หลักสูตร').selectOption(PROGRAM_INTL),
    }),
  );
});

test('ข้อมูลการเปิดรายวิชา (Offerings.js): the list a refused ตอนเรียนและผู้สอน reloads does not land on the ปีการศึกษา filter that has moved', async ({
  page,
}) => {
  await onOfferingsScreen(page, (screen) =>
    refilter(page, {
      ...screen,
      moved: ['academic_year', FUTURE],
      move: () => offerings.yearFilter(page).fill(FUTURE),
    }),
  );
});

test('ข้อมูลการเปิดรายวิชา (Offerings.js): the list a refused ตอนเรียนและผู้สอน reloads does not land on the ภาคการศึกษา filter that has moved', async ({
  page,
}) => {
  await onOfferingsScreen(page, (screen) =>
    refilter(page, {
      ...screen,
      moved: ['semester', '3'],
      move: () => offerings.semesterFilter(page).selectOption('3'),
    }),
  );
});

// ── ข้อมูลนักศึกษา ────────────────────────────────────────────────────────────

test('ข้อมูลนักศึกษา (Students.js): the list บันทึก reloads does not land on the หลักสูตร filter that has moved', async ({
  page,
}) => {
  // `save` closes the form before it reloads, so the filter is back under the
  // hand while the reload is out.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await students.openRegister(page);
  await refilter(page, {
    list: '/api/students',
    table: students.listTable(page),
    filters: ['program_id'],
    moved: ['program_id', PROGRAM_INTL],
    rows: 'students',
    key: (row) => row.student_id,
    press: () =>
      students.addStudent(page, {
        code: '68144001',
        first: 'ทดสอบ',
        last: 'แถวหนึ่งสี่สี่',
        program: '0501',
      }),
    move: () => page.getByLabel('หลักสูตร').selectOption(PROGRAM_INTL),
  });
});

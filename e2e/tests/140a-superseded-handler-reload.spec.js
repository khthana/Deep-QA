'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { byAlias, CURRENT_YEAR, PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { downloadTemplate, headerOf, csv, importCsv } = require('../support/import-panel');
const { next, reading, keysOn } = require('../support/pager');
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
 * Each row opens its screen on page one, holds back every read of page one with
 * `page.route` for `HELD_MS`, and presses the handler. Once the reload has been
 * **sent** — waited for as a request, so a handler that reloads nothing fails
 * the row rather than passing it — it presses ถัดไป, waits for page two to
 * answer, then for the held answer to be handed back, and reads the screen once
 * after `SETTLE_MS`: the pager's line and the first cell of every row, against
 * page two's answer. The pager is the control on every screen because it is the
 * one every one of them has; the filters some of them also carry supersede the
 * same request by the same route through `load`'s dependencies.
 *
 * `SubjectStudents` has one site with two callers — `reload`, which adding a
 * student and the import both call — so it has two rows and one guard.
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
      `INSERT INTO programs (program_id, program_name_th, program_name_en, department_id, year)
       VALUES ($1, $2, $3, '05', '2565')`,
      [id, `หลักสูตรของแถว #140 ${i}`, `Programme for #140 ${i}`],
    );
  }
  for (const [i, id] of SUBJECTS.entries()) {
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
 * Presses a handler, moves the pager while its reload is out, and reads once.
 *
 * `list` is the pathname the screen's list is read from, `table` its table,
 * `rows` the key of the answer's array and `key` the natural key a row's first
 * cell shows. `press` does whatever makes the handler run and may return before
 * the reload is sent: the wait for the request is here.
 */
async function supersede(page, { list, table, rows, key, press }) {
  const isList = (url) => url.pathname === list;
  const isHeld = (url) => isList(url) && asPage(url, 1);

  const before = await reading(page, table);
  expect(before.pages, 'the row needs a page two to move to').toBeGreaterThan(1);

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
      (answer) =>
        answer.request().method() === 'GET' &&
        isList(new URL(answer.url())) &&
        asPage(new URL(answer.url()), 2),
    );

    await press(page);
    await reloadSent;

    await expect(next(page)).toBeEnabled();
    await next(page).click();

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

/** Presses a row's delete and the confirmation's own button. */
async function removeRow(page, row, label, confirm) {
  await row.getByRole('button', { name: label, exact: true }).first().click();
  await page.getByRole('button', { name: confirm, exact: true }).click();
}

/** The screen's own template's header, and one line built under it. */
async function importLine(page, path, line) {
  const header = headerOf(await downloadTemplate(page));
  await importCsv(page, { path, text: csv(header, typeof line === 'function' ? line(header) : line), name: 'row-140.csv' });
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
  // `Users.toggle` has no form and no confirmation: the pager never leaves.
  const screen = await openUsersScreen(page);
  await supersede(page, {
    ...screen,
    press: () =>
      users
        .userRow(page, 'past.assessor@tabee-review.org')
        .getByRole('button', { name: 'ระงับ', exact: true })
        .click(),
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
    row: (page) => departments.departmentRow(page, DEPARTMENTS[1]),
    detail: `${departments.API}/${DEPARTMENTS[1]}`,
    removed: (page) => departments.departmentRow(page, DEPARTMENTS[0]),
    remove: 'ลบ',
    confirm: 'ลบภาควิชา',
    importPath: `${departments.API}/import`,
    importLine: 'X140,ภาควิชานำเข้าของแถว #140,',
  },
  {
    name: 'ข้อมูลหลักสูตร',
    file: 'Programs.js',
    account: ACCOUNTS.facultyAdmin,
    open: programs.openPrograms,
    list: programs.API,
    rows: 'programs',
    key: (row) => row.program_id,
    row: (page) => programs.programRow(page, PROGRAMS[1]),
    detail: `${programs.API}/${PROGRAMS[1]}`,
    removed: (page) => programs.programRow(page, PROGRAMS[0]),
    remove: 'ลบ',
    confirm: 'ลบหลักสูตร',
    importPath: `${programs.API}/import`,
    importLine: 'ZP140,หลักสูตรนำเข้าของแถว #140,Imported for #140,05,2565',
  },
  {
    name: 'ข้อมูลรายวิชา',
    file: 'Subjects.js',
    account: ACCOUNTS.departmentAdmin05,
    open: subjects.openSubjects,
    list: subjects.API,
    rows: 'subjects',
    key: (row) => row.subject_id,
    row: (page) => subjects.subjectRow(page, SUBJECTS[1]),
    detail: `${subjects.API}/${SUBJECTS[1]}`,
    removed: (page) => subjects.subjectRow(page, SUBJECTS[0]),
    remove: 'ลบ',
    confirm: 'ลบรายวิชา',
    importPath: `${subjects.API}/import`,
    importLine: '01140199,วิชานำเข้าของแถว #140,Imported for #140,3,05,,',
  },
  {
    name: 'รายวิชาในหลักสูตร',
    file: 'ProgramSubjects.js',
    account: ACCOUNTS.committee0501,
    open: pairs.openProgramSubjects,
    list: pairs.API,
    rows: 'program_subjects',
    key: (row) => row.subject_id,
    row: (page) => pairs.pairRow(page, PLACED[1]),
    detail: `${pairs.API}/${PROGRAM}/${PLACED[1]}`,
    removed: (page) => pairs.pairRow(page, PLACED[0]),
    remove: 'นำออก',
    confirm: 'นำออกจากหลักสูตร',
    importPath: `${pairs.API}/import`,
    importLine: `${PROGRAM},${UNPLACED_FOR_IMPORT},required`,
  },
];

async function openMaster(page, screen) {
  await signIn(page, screen.account);
  await screen.open(page);
  return { list: screen.list, table: page.locator('table').first(), rows: screen.rows, key: screen.key };
}

for (const screen of MASTER) {
  test(`${screen.name} (${screen.file}): the list a refused แก้ไข reloads does not land on the page the pager has left`, async ({
    page,
  }) => {
    // `openEditor`'s `catch`: the form never opened, so the pager never left.
    const opened = await openMaster(page, screen);
    await refuseRead(page, screen.detail);
    await supersede(page, {
      ...opened,
      press: () => screen.row(page).getByRole('button', { name: 'แก้ไข', exact: true }).click(),
    });
  });

  test(`${screen.name} (${screen.file}): the list บันทึก reloads does not land on the page the pager has left`, async ({
    page,
  }) => {
    // `save` closes the form before it reloads.
    const opened = await openMaster(page, screen);
    await supersede(page, {
      ...opened,
      press: () => saveUnchanged(page, screen.row(page), screen.detail),
    });
  });

  test(`${screen.name} (${screen.file}): the list ${screen.remove} reloads does not land on the page the pager has left`, async ({
    page,
  }) => {
    // `confirmRemoval` closes the confirmation before it reloads.
    const opened = await openMaster(page, screen);
    await supersede(page, {
      ...opened,
      press: () => removeRow(page, screen.removed(page), screen.remove, screen.confirm),
    });
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

async function openRubricsScreen(page) {
  await signIn(page, ACCOUNTS.committee0501);
  const answer = await (await rubrics.openRubrics(page)).json();
  return {
    opened: { list: rubrics.API, table: rubrics.table(page), rows: 'rubrics', key: (row) => row.rubric_code },
    idOf: (code) => answer.rubrics.find((rubric) => rubric.rubric_code === code).id,
  };
}

test('Rubric (Rubrics.js): the list a refused แก้ไข reloads does not land on the page the pager has left', async ({
  page,
}) => {
  const { opened, idOf } = await openRubricsScreen(page);
  await refuseRead(page, `${rubrics.API}/${idOf(RUBRICS[1])}`);
  await supersede(page, {
    ...opened,
    press: () =>
      rubrics.rubricRow(page, RUBRICS[1]).getByRole('button', { name: 'แก้ไข', exact: true }).click(),
  });
});

test('Rubric (Rubrics.js): the list บันทึก reloads does not land on the page the pager has left', async ({ page }) => {
  const { opened, idOf } = await openRubricsScreen(page);
  await supersede(page, {
    ...opened,
    press: () =>
      saveUnchanged(page, rubrics.rubricRow(page, RUBRICS[1]), `${rubrics.API}/${idOf(RUBRICS[1])}`),
  });
});

test('Rubric (Rubrics.js): the list ลบ reloads does not land on the page the pager has left', async ({ page }) => {
  const { opened } = await openRubricsScreen(page);
  await supersede(page, {
    ...opened,
    press: () => removeRow(page, rubrics.rubricRow(page, RUBRICS[0]), 'ลบ', 'ลบ Rubric'),
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

test('ข้อมูลการเปิดรายวิชา (Offerings.js): the list a refused ตอนเรียนและผู้สอน reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `openSections`' `catch`: the panel never opened.
  const { opened, answer } = await openOfferingsScreen(page);
  const [first] = answer.offerings;
  await refuseRead(page, `${offerings.API}/${first.id}`);
  await supersede(page, {
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
    press: () =>
      removeRow(page, offerings.offeringRow(page, PLACED[4]), 'ยกเลิกการเปิด', 'ยกเลิกการเปิดรายวิชา'),
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

test('รายชื่อนักศึกษาของรายวิชา (SubjectStudents.js): the list เพิ่มนักศึกษา reloads does not land on the page the pager has left', async ({
  page,
}) => {
  // `reload`, from `add`. The same site as the import's row below.
  const { opened } = await openEnrolmentScreen(page);
  await supersede(page, {
    ...opened,
    press: () => enrolment.enrol(page, enrolment.SPARE_CODES[0]),
  });
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
  const { opened } = await openEnrolmentScreen(page);
  const code = enrolment.SPARE_CODES[2];
  await Promise.all([enrolment.waitForList(page), enrolment.enrol(page, code)]);
  await expect(page.getByRole('button', { name: `นำ ${code} ออกจากตอนเรียน` })).toBeVisible();
  await supersede(page, {
    ...opened,
    press: async () => {
      await page.getByRole('button', { name: `นำ ${code} ออกจากตอนเรียน` }).click();
      await page.getByRole('button', { name: 'นำออก', exact: true }).click();
    },
  });
});

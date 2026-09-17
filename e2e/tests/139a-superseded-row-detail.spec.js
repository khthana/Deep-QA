'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { byAlias, PROGRAM, SUBJECT } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { openDepartments } = require('../support/departments-screen');
const { openPrograms } = require('../support/programs-screen');
const { openSubjects } = require('../support/subjects-screen');
const { openProgramSubjects } = require('../support/program-subjects-screen');
const { openRubrics, rubricRow } = require('../support/rubrics-screen');
const { openCriteriaVia } = require('../support/rubric-criteria-screen');
const { importCsv } = require('../support/import-panel');
const {
  openPlos,
  waitForList: waitForPlos,
  programFilter,
  parentPicker,
} = require('../support/plos-screen');
const {
  openOfferings,
  waitForList: waitForOfferings,
  waitForDetail,
} = require('../support/offerings-screen');

/**
 * #139 — a form or a panel opens on the row that was asked for last.
 *
 * Seven list screens read a row afresh before opening its form, and ข้อมูลการ
 * เปิดรายวิชา reads an Offering afresh before opening its panel. The answer was
 * drawn without asking whether the request that caused it was still the one
 * the screen wanted, so the answer that **arrives** last won rather than the
 * one **asked for** last. Every control beside แก้ไข stays pressable while that
 * read is out — nothing is disabled by `busy` in the table — so the situation is
 * built from the screen itself, not from a test's imagination.
 *
 * ## What supersedes a read
 *
 * The ticket named one way in on every screen and a second on `Plos`. Measured,
 * there are five on every list screen, a sixth on the four that import, and
 * six on the Offering panel — and the one on `Plos` is not what the ticket said
 * it was:
 *
 * - **another แก้ไข** — the ticket's own. The second form opens, and the first
 *   answer then replaced it with the row the person had moved away from;
 * - **the first แก้ไข refused** — the same race with a refusal in the late
 *   answer: a red bar about one row landed over the form for another;
 * - **เพิ่ม** — the add form opens, and the late answer turned it into an edit
 *   of the first row, throwing away whatever had been typed;
 * - **ลบ** (นำออก on รายวิชาในหลักสูตร) — the confirmation opens over the
 *   table, and the late answer put the first row's form underneath a question
 *   about a different row;
 * - **แก้ไข again on the same row** — found by the review of the first fix,
 *   which asked by row: the two presses matched each other, so the first
 *   answer opened the form again after ยกเลิก;
 * - **the import** on ข้อมูลภาควิชา, ข้อมูลหลักสูตร, ข้อมูลรายวิชา and
 *   รายวิชาในหลักสูตร — also found by that review: the panel sits beside the
 *   table, and the late form took it off the screen in the middle of an upload;
 * - on the Offering panel the first four under its own words — another
 *   ตอนเรียนและผู้สอน, its refusal, เปิดรายวิชา, ยกเลิกการเปิด — the same row
 *   pressed again, whose older reading of the Offering was drawn over the newer,
 *   and **กลับไปหน้ารายการ** after a section write whose read-back is still out:
 *   the panel came back by itself.
 *
 * *A row that names two ways in is two rows* (#66), so each is a row of its own
 * here, and `mutation/139-superseded-row-detail.py` carries a mutant per row
 * that must take that row down and leave the rest of this file standing.
 *
 * **Moving the list is not one of them.** The ticket said a read on `Plos` that
 * lands after the หลักสูตร filter has moved opens *an outcome of the curriculum
 * the screen has just left*, the harm #133's flag closes on `load`. Read, the
 * form is truthful about itself: its หลักสูตร field carries the outcome's own
 * curriculum and is locked, and its ข้อหลัก picker asks for that curriculum's
 * outcomes rather than using the table's. Nothing drawn is wrong — a form the
 * person asked for opens after they looked elsewhere, which is what every
 * filter and pager on these screens does, not `Plos` alone. Whether that should
 * cancel the ask was put to the person who owns the UI (docs/06 §Out of Scope),
 * and the answer on 17 September 2569 was no. The last row holds that answer.
 *
 * ## How a row is built
 *
 * The first detail read is held back with `page.route` and handed over only
 * after `HELD_MS`; every other read goes straight through. So which answer lands
 * second is a fact about this file rather than about the machine, and each row
 * reads the screen once, after the held answer has been handed back and has had
 * `SETTLE_MS` to draw. The rows only read: nothing is saved. The one write the
 * panel row sends is a section number the Offering already has, and the import
 * rows send a file that is no screen's template; the server refuses both.
 *
 * ## What this file writes
 *
 * One subject, placed into the seeded หลักสูตร, before the first row. The seed
 * has exactly one subject and one placement, so ข้อมูลรายวิชา and รายวิชาใน
 * หลักสูตร each draw a single row on their own — and a second แก้ไข needs a
 * second row. A full run usually has more, left by `16a` and `18a`, but *a row
 * that holds a defect builds the situation itself* (#129) rather than waiting
 * for another file to leave one. It is written straight into the schema rather
 * than through the import, because the import is `16b`'s and `18b`'s subject and
 * not this file's; `hold()` takes it out again, with anything a failing row
 * left behind.
 */

const db = createPool({ schema: E2E_SCHEMA });

/** The second subject. Department 05 and หลักสูตร 0501 are the seeded one's. */
const SECOND = { id: '01139139', th: 'วิชาที่สองของแถว #139', en: 'Second subject for #139' };

let release;
test.beforeAll(async () => {
  release = await hold();
  await db.query(
    `INSERT INTO subjects (subject_id, subject_name_en, subject_name_th, credits, department_id, created_by)
     VALUES ($1, $2, $3, 3, $4, $5)`,
    [SECOND.id, SECOND.en, SECOND.th, SUBJECT.department, byAlias('U_ADMIN')],
  );
  await db.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type, created_by)
     VALUES ($1, $2, 'required', $3)`,
    [PROGRAM, SECOND.id, byAlias('U_ADMIN')],
  );
});
test.afterAll(async () => {
  await release();
  await db.end();
});

/** Long enough for the unheld answer to be drawn before the held one is let go. */
const HELD_MS = 2_000;

/**
 * How long the held answer is given to be drawn before the screen is read.
 *
 * This one can decide: a late answer drawn slower than this would read as not
 * drawn, and the row would pass with the defect in place. Nothing on the screen
 * marks an answer that was rightly dropped, so there is no drawing to wait for
 * instead (#50). What stands behind the number is the sweep — every mutant that
 * lets a late answer draw was caught inside it, on 17 September 2569 — and not
 * the claim that timing cannot matter (#52, #136).
 */
const SETTLE_MS = 250;

/** The refusal the error rows hand back — worded so no screen could say it by itself. */
const REFUSED = 'ไม่พบรายการนี้แล้ว (แถวของ #139)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A form field, by the words of its own label.
 *
 * By the label's first `<span>` rather than by accessible name: `Field` wraps
 * the control inside the `<label>` and puts a hint beside it on some fields, so
 * a name lookup would have to know which fields carry one.
 */
const field = (page, label) =>
  page
    .locator('form label')
    .filter({ has: page.locator(`span:text-is("${label}")`) })
    .locator('input, select, textarea')
    .first();

const heading = (page, name) => page.getByRole('heading', { name, exact: true });

/** Any confirmation, whichever screen's words it is in. */
const confirmation = (page) => page.getByRole('heading', { name: /^ยืนยันการ/ });

/**
 * The seven list screens, and what each one's form says about which row it is.
 *
 * `shows` reads the form; `of` reads the same fact out of the answer to the
 * read, so a row compares the screen with what the server sent rather than
 * with a value copied from the seed.
 */
const LIST_SCREENS = [
  {
    name: 'ข้อมูลภาควิชา',
    file: 'Departments.js',
    account: ACCOUNTS.facultyAdmin,
    open: (page) => openDepartments(page),
    detail: /^\/api\/departments\/\d+$/,
    importPath: '/api/departments/import',
    edit: 'แก้ไขภาควิชา',
    addButton: 'เพิ่มภาควิชา',
    add: 'เพิ่มภาควิชา',
    remove: 'ลบ',
    shows: (page) => field(page, 'รหัสภาควิชา').inputValue(),
    of: (answer) => answer.department.department_id,
  },
  {
    name: 'ข้อมูลหลักสูตร',
    file: 'Programs.js',
    account: ACCOUNTS.facultyAdmin,
    open: (page) => openPrograms(page),
    detail: /^\/api\/programs\/\d+$/,
    importPath: '/api/programs/import',
    edit: 'แก้ไขหลักสูตร',
    addButton: 'เพิ่มหลักสูตร',
    add: 'เพิ่มหลักสูตร',
    remove: 'ลบ',
    shows: (page) => field(page, 'รหัสหลักสูตร').inputValue(),
    of: (answer) => answer.program.program_id,
  },
  {
    name: 'ข้อมูลรายวิชา',
    file: 'Subjects.js',
    account: ACCOUNTS.departmentAdmin05,
    open: (page) => openSubjects(page),
    detail: /^\/api\/subjects\/\d+$/,
    importPath: '/api/subjects/import',
    edit: 'แก้ไขรายวิชา',
    addButton: 'เพิ่มรายวิชา',
    add: 'เพิ่มรายวิชา',
    remove: 'ลบ',
    shows: (page) => field(page, 'รหัสวิชา').inputValue(),
    of: (answer) => answer.subject.subject_id,
  },
  {
    name: 'รายวิชาในหลักสูตร',
    file: 'ProgramSubjects.js',
    account: ACCOUNTS.committee0501,
    open: (page) => openProgramSubjects(page),
    detail: /^\/api\/program-subjects\/\d+\/\d+$/,
    importPath: '/api/program-subjects/import',
    edit: 'แก้ไขรายวิชาในหลักสูตร',
    addButton: 'เพิ่มรายวิชาเข้าหลักสูตร',
    add: 'เพิ่มรายวิชาเข้าหลักสูตร',
    remove: 'นำออก',
    shows: (page) => field(page, 'รายวิชา').inputValue(),
    of: ({ program_subject: pair }) => `${pair.subject_id} ${pair.subject_name_th ?? ''}`.trim(),
  },
  {
    name: 'Rubric',
    file: 'Rubrics.js',
    account: ACCOUNTS.committee0501,
    open: (page) => openRubrics(page),
    detail: /^\/api\/rubrics\/\d+$/,
    edit: 'แก้ไข Rubric',
    addButton: 'เพิ่ม Rubric',
    add: 'เพิ่ม Rubric',
    remove: 'ลบ',
    shows: (page) => field(page, 'รหัส Rubric').inputValue(),
    of: (answer) => answer.rubric.rubric_code,
  },
  {
    name: 'เกณฑ์การให้คะแนน',
    file: 'RubricCriteria.js',
    account: ACCOUNTS.committee0501,
    // RUB-01 is the seeded rubric with the most criteria — three — and it is
    // reached the way a person reaches it, through #21's link.
    open: async (page) => {
      await openRubrics(page);
      await openCriteriaVia(page, rubricRow(page, 'RUB-01'));
    },
    detail: /^\/api\/rubrics\/\d+\/criteria\/\d+$/,
    edit: 'แก้ไขเกณฑ์การให้คะแนน',
    addButton: 'เพิ่มเกณฑ์',
    add: 'เพิ่มเกณฑ์การให้คะแนน',
    remove: 'ลบ',
    shows: (page) => field(page, 'ชื่อเกณฑ์ (ภาษาไทย)').inputValue(),
    of: (answer) => answer.criterion.criteria_name_th,
  },
  {
    name: 'ผลการเรียนรู้ระดับหลักสูตร',
    file: 'Plos.js',
    account: ACCOUNTS.departmentAdmin05,
    open: (page) => openPlos(page),
    detail: /^\/api\/plos\/\d+$/,
    edit: 'แก้ไขผลการเรียนรู้ของหลักสูตร',
    addButton: 'เพิ่มผลการเรียนรู้',
    add: 'เพิ่มผลการเรียนรู้ของหลักสูตร',
    remove: 'ลบ',
    shows: (page) => field(page, 'รหัสผลการเรียนรู้').inputValue(),
    of: (answer) => answer.plo.outcome_code,
  },
];

/**
 * Holds the first detail read back and lets every later one through.
 *
 * `handed` settles once the held answer has been given to the page, which is
 * the moment a row starts counting `SETTLE_MS` from. A row that never sends a
 * read waits on it until it times out — so a `detail` pattern that matches
 * nothing fails the row rather than letting it pass without racing anything.
 *
 * `refusal` hands back a 404 carrying that sentence instead of the answer;
 * `older` hands back the real answer passed through it, for a row that needs
 * the held answer to differ from a later read of the same row.
 */
async function holdFirstRead(page, detail, { refusal = null, older = null } = {}) {
  const reads = (url) => detail.test(url.pathname);
  const held = { request: null };
  let hand;
  held.handed = new Promise((resolve) => {
    hand = resolve;
  });

  await page.route(reads, async (route, request) => {
    if (request.method() !== 'GET' || held.request !== null) return route.continue();
    held.request = request;
    try {
      await sleep(HELD_MS);
      // A refusal is made up here rather than caused, because what it is about
      // is when it lands and not why: the row it is for has been removed by
      // somebody else, which is the refusal a read of one row can meet.
      if (refusal) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: refusal }),
        });
      } else if (older) {
        // Made up for the same reason: what matters is that a reading taken
        // before the row changed lands after one taken since.
        const response = await route.fetch();
        await route.fulfill({
          response,
          contentType: 'application/json',
          body: JSON.stringify(older(await response.json())),
        });
      } else {
        await route.fulfill({ response: await route.fetch() });
      }
    } catch {
      // The row has already ended - failed, most likely - and closed the page.
    }
    hand();
  });

  held.release = () => page.unroute(reads);
  return held;
}

/**
 * The answer to a detail read other than the held one — told apart by request
 * rather than by URL, because a row pressed twice asks the same URL twice.
 */
const otherRead = (page, detail, held) =>
  page.waitForResponse(
    (answer) =>
      detail.test(new URL(answer.url()).pathname) &&
      answer.request().method() === 'GET' &&
      answer.request() !== held.request,
  );

/** The rows of the list that carry a button of this name, first two asserted. */
async function twoRows(page, button) {
  const rows = page
    .locator('table')
    .first()
    .locator('tbody tr')
    .filter({ has: page.getByRole('button', { name: button, exact: true }) });
  await expect(rows.nth(1)).toBeVisible();
  return [rows.nth(0), rows.nth(1)];
}

/**
 * What occupies the place a form opens in, read once.
 *
 * All four facts in one object, so one `toEqual` states the whole screen: a
 * late answer that opened the wrong form and one that opened a form under a
 * dialog fail the same assertion for different visible reasons, and the
 * difference is in the report rather than in which `expect` was reached first.
 */
async function drawn(page, screen) {
  const editing = await heading(page, screen.edit).count();
  return {
    editing,
    adding: await heading(page, screen.add).count(),
    asking: await confirmation(page).count(),
    shows: editing ? await screen.shows(page) : null,
  };
}

for (const screen of LIST_SCREENS) {
  test.describe(`${screen.name} (${screen.file})`, () => {
    test('a second แก้ไข is the form that stays open', async ({ page }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const [first, second] = await twoRows(page, 'แก้ไข');

      const held = await holdFirstRead(page, screen.detail);
      try {
        const secondArrived = otherRead(page, screen.detail, held);
        await first.getByRole('button', { name: 'แก้ไข', exact: true }).click();
        await second.getByRole('button', { name: 'แก้ไข', exact: true }).click();

        const answer = await (await secondArrived).json();
        // The second form, drawn, before the first answer is let go — without
        // this the row could read a screen still waiting on both.
        await expect(heading(page, screen.edit)).toBeVisible();
        await expect.poll(() => screen.shows(page)).toBe(screen.of(answer));

        await held.handed;
        await page.waitForTimeout(SETTLE_MS);

        expect(await drawn(page, screen)).toEqual({
          editing: 1,
          adding: 0,
          asking: 0,
          shows: screen.of(answer),
        });
      } finally {
        await held.release();
      }
    });

    test('a refusal of the first แก้ไข does not land on the second form', async ({ page }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const [first, second] = await twoRows(page, 'แก้ไข');

      const held = await holdFirstRead(page, screen.detail, { refusal: REFUSED });
      try {
        const secondArrived = otherRead(page, screen.detail, held);
        await first.getByRole('button', { name: 'แก้ไข', exact: true }).click();
        await second.getByRole('button', { name: 'แก้ไข', exact: true }).click();

        const answer = await (await secondArrived).json();
        await expect(heading(page, screen.edit)).toBeVisible();
        await expect.poll(() => screen.shows(page)).toBe(screen.of(answer));

        await held.handed;
        await page.waitForTimeout(SETTLE_MS);

        expect({
          ...(await drawn(page, screen)),
          refused: await page.getByText(REFUSED).count(),
        }).toEqual({
          editing: 1,
          adding: 0,
          asking: 0,
          shows: screen.of(answer),
          refused: 0,
        });
      } finally {
        await held.release();
      }
    });

    test('เพิ่ม pressed while a แก้ไข is out stays the add form', async ({ page }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const [first] = await twoRows(page, 'แก้ไข');

      const held = await holdFirstRead(page, screen.detail);
      try {
        await first.getByRole('button', { name: 'แก้ไข', exact: true }).click();
        await page.getByRole('button', { name: screen.addButton, exact: true }).click();
        await expect(heading(page, screen.add)).toBeVisible();

        await held.handed;
        await page.waitForTimeout(SETTLE_MS);

        expect(await drawn(page, screen)).toEqual({
          editing: 0,
          adding: 1,
          asking: 0,
          shows: null,
        });
      } finally {
        await held.release();
      }
    });

    test(`${screen.remove} pressed while a แก้ไข is out leaves the table under its question`, async ({
      page,
    }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const [first, second] = await twoRows(page, 'แก้ไข');

      const held = await holdFirstRead(page, screen.detail);
      try {
        await first.getByRole('button', { name: 'แก้ไข', exact: true }).click();
        await second.getByRole('button', { name: screen.remove, exact: true }).click();
        await expect(confirmation(page)).toBeVisible();

        await held.handed;
        await page.waitForTimeout(SETTLE_MS);

        expect(await drawn(page, screen)).toEqual({
          editing: 0,
          adding: 0,
          asking: 1,
          shows: null,
        });
      } finally {
        await held.release();
      }
    });

    test('แก้ไข pressed again on the same row is a new ask, so ยกเลิก stays closed', async ({
      page,
    }) => {
      // Both presses read the same URL, so the second answer is told from the
      // held one by request, and the form it opens is closed before the first
      // is let go. Asked by row, the first answer matched the second press.
      await signIn(page, screen.account);
      await screen.open(page);
      const [first] = await twoRows(page, 'แก้ไข');

      const held = await holdFirstRead(page, screen.detail);
      try {
        const againArrived = otherRead(page, screen.detail, held);
        const edit = first.getByRole('button', { name: 'แก้ไข', exact: true });
        await edit.click();
        await edit.click();

        await againArrived;
        await expect(heading(page, screen.edit)).toBeVisible();
        await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
        await expect(heading(page, screen.edit)).toHaveCount(0);

        await held.handed;
        await page.waitForTimeout(SETTLE_MS);

        expect(await drawn(page, screen)).toEqual({
          editing: 0,
          adding: 0,
          asking: 0,
          shows: null,
        });
      } finally {
        await held.release();
      }
    });

    if (screen.importPath) {
      test('an import started while a แก้ไข is out keeps its panel on the screen', async ({
        page,
      }) => {
        // The panel is beside the table, not in it, and the form takes the
        // place of both. The file is no screen's template, so the server refuses
        // it and nothing is written: what the row is about is that it was begun.
        await signIn(page, screen.account);
        await screen.open(page);
        const [first] = await twoRows(page, 'แก้ไข');

        const held = await holdFirstRead(page, screen.detail);
        try {
          await first.getByRole('button', { name: 'แก้ไข', exact: true }).click();
          const imported = await importCsv(page, {
            path: screen.importPath,
            text: 'ไม่ใช่แบบฟอร์มของจอไหน\r\n1\r\n',
            name: 'not-a-template-139.csv',
          });
          expect(imported.status()).toBeGreaterThanOrEqual(400);

          await held.handed;
          await page.waitForTimeout(SETTLE_MS);

          expect({
            ...(await drawn(page, screen)),
            importing: await page.locator('input[type="file"]').count(),
          }).toEqual({
            editing: 0,
            adding: 0,
            asking: 0,
            shows: null,
            importing: 1,
          });
        } finally {
          await held.release();
        }
      });
    }
  });
}

/**
 * ข้อมูลการเปิดรายวิชา, whose read is `refresh` and whose place is a panel.
 *
 * The same five ways in under different words — ตอนเรียนและผู้สอน on another
 * row, its refusal, เปิดรายวิชา, ยกเลิกการเปิด, the same row pressed again — and
 * a sixth the list screens do not have, because `refresh` is also how every
 * section write reads the panel back.
 */
const OFFERINGS = {
  name: 'ข้อมูลการเปิดรายวิชา',
  file: 'Offerings.js',
  detail: /^\/api\/offerings\/\d+$/,
  open: 'ตอนเรียนและผู้สอน',
  back: 'กลับไปหน้ารายการ',
  form: 'เปิดรายวิชาในภาคการศึกษา',
};

/**
 * Which Offering a panel is about: the subject in its heading and the term in
 * the line under it. Both, because the seed opens one subject in two terms and
 * the heading alone would read the same for either.
 */
async function panelShows(page) {
  const title = await page
    .getByRole('heading', { level: 2 })
    .filter({ hasText: /^\d{8} / })
    .innerText();
  const line = await page.getByText(/^ปีการศึกษา \d+ ภาคการศึกษา \d/).innerText();
  const [, year, semester] = line.match(/^ปีการศึกษา (\d+) ภาคการศึกษา (\d)/);
  return { title: title.trim(), term: `${year}/${semester}` };
}

const panelOf = ({ offering }) => ({
  title: `${offering.subject_id} ${offering.subject_name_th}`,
  term: `${offering.academic_year}/${offering.semester}`,
});

async function panelDrawn(page) {
  const viewing = await page.getByRole('button', { name: OFFERINGS.back }).count();
  return {
    viewing,
    opening: await heading(page, OFFERINGS.form).count(),
    asking: await confirmation(page).count(),
    shows: viewing ? await panelShows(page) : null,
  };
}

test.describe(`${OFFERINGS.name} (${OFFERINGS.file})`, () => {
  test('a second ตอนเรียนและผู้สอน is the panel that stays open', async ({ page }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const [first, second] = await twoRows(page, OFFERINGS.open);

    const held = await holdFirstRead(page, OFFERINGS.detail);
    try {
      const secondArrived = otherRead(page, OFFERINGS.detail, held);
      await first.getByRole('button', { name: OFFERINGS.open, exact: true }).click();
      await second.getByRole('button', { name: OFFERINGS.open, exact: true }).click();

      const answer = await (await secondArrived).json();
      await expect(page.getByRole('button', { name: OFFERINGS.back })).toBeVisible();
      await expect.poll(() => panelShows(page)).toEqual(panelOf(answer));

      await held.handed;
      await page.waitForTimeout(SETTLE_MS);

      expect(await panelDrawn(page)).toEqual({
        viewing: 1,
        opening: 0,
        asking: 0,
        shows: panelOf(answer),
      });
    } finally {
      await held.release();
    }
  });

  test('a refusal of the first panel does not land on the second', async ({ page }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const [first, second] = await twoRows(page, OFFERINGS.open);

    const held = await holdFirstRead(page, OFFERINGS.detail, { refusal: REFUSED });
    try {
      const secondArrived = otherRead(page, OFFERINGS.detail, held);
      await first.getByRole('button', { name: OFFERINGS.open, exact: true }).click();
      await second.getByRole('button', { name: OFFERINGS.open, exact: true }).click();

      const answer = await (await secondArrived).json();
      await expect(page.getByRole('button', { name: OFFERINGS.back })).toBeVisible();
      await expect.poll(() => panelShows(page)).toEqual(panelOf(answer));

      await held.handed;
      await page.waitForTimeout(SETTLE_MS);

      expect({
        ...(await panelDrawn(page)),
        refused: await page.getByText(REFUSED).count(),
      }).toEqual({
        viewing: 1,
        opening: 0,
        asking: 0,
        shows: panelOf(answer),
        refused: 0,
      });
    } finally {
      await held.release();
    }
  });

  test('เปิดรายวิชา pressed while a panel is out stays the form', async ({ page }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const [first] = await twoRows(page, OFFERINGS.open);

    const held = await holdFirstRead(page, OFFERINGS.detail);
    try {
      await first.getByRole('button', { name: OFFERINGS.open, exact: true }).click();
      await page.getByRole('button', { name: 'เปิดรายวิชา', exact: true }).click();
      await expect(heading(page, OFFERINGS.form)).toBeVisible();

      await held.handed;
      await page.waitForTimeout(SETTLE_MS);

      expect(await panelDrawn(page)).toEqual({
        viewing: 0,
        opening: 1,
        asking: 0,
        shows: null,
      });
    } finally {
      await held.release();
    }
  });

  test('ยกเลิกการเปิด pressed while a panel is out leaves the list under its question', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const [first, second] = await twoRows(page, OFFERINGS.open);

    const held = await holdFirstRead(page, OFFERINGS.detail);
    try {
      await first.getByRole('button', { name: OFFERINGS.open, exact: true }).click();
      await second.getByRole('button', { name: 'ยกเลิกการเปิด', exact: true }).click();
      await expect(confirmation(page)).toBeVisible();

      await held.handed;
      await page.waitForTimeout(SETTLE_MS);

      // The panel's own dialog is a different one, drawn from `removing` too. With
      // `offeringscancelkeepsask` applied the late panel opens and the question
      // turns into ยืนยันการลบตอนเรียน over the first Offering, with no sentence
      // and a ลบตอนเรียน button (seen on the failure's screenshot, 17 September
      // 2569). Behind that button `confirmRemoval` still reads `kind: 'offering'`
      // and would cancel the second Offering - read from the code, not pressed.
      expect(await panelDrawn(page)).toEqual({
        viewing: 0,
        opening: 0,
        asking: 1,
        shows: null,
      });
    } finally {
      await held.release();
    }
  });

  test('กลับไปหน้ารายการ while a section write is read back does not reopen the panel', async ({
    page,
  }) => {
    // `refresh`'s other callers: every section write reads the panel back
    // through it, and กลับไปหน้ารายการ is not disabled while one is out. The
    // write is a section number the Offering already has, so the server refuses
    // it and the panel is read back from the refusal - nothing is stored.
    await signIn(page, ACCOUNTS.committee0501);
    const list = await (await openOfferings(page)).json();
    const offering = list.offerings.find((row) => row.section_count > 0);
    expect(offering, 'the first page should carry an Offering with a section').toBeTruthy();

    const row = page
      .locator('table')
      .first()
      .locator('tbody tr')
      .filter({ has: page.getByRole('cell', { name: offering.subject_id, exact: true }) })
      .filter({ hasText: `${offering.semester} — ` })
      .filter({ hasText: String(offering.academic_year) });
    const [opened] = await Promise.all([
      waitForDetail(page),
      row.first().getByRole('button', { name: OFFERINGS.open, exact: true }).click(),
    ]);
    const { offering: shown } = await opened.json();
    // The row filter above narrows by subject, term and year; this says it
    // landed on the Offering the list answer named.
    expect(shown.id).toBe(offering.id);
    const [taken] = shown.sections;

    const held = await holdFirstRead(page, OFFERINGS.detail);
    try {
      const refused = page.waitForResponse(
        (answer) =>
          new URL(answer.url()).pathname === `/api/offerings/${shown.id}/sections` &&
          answer.request().method() === 'POST',
      );
      await page.getByPlaceholder('เช่น 1 หรือ พ1').fill(taken.section_number);
      await page.getByRole('button', { name: 'เพิ่มตอนเรียน' }).click();
      expect((await refused).status()).toBe(409);

      await Promise.all([
        waitForOfferings(page),
        page.getByRole('button', { name: OFFERINGS.back }).click(),
      ]);

      await held.handed;
      await page.waitForTimeout(SETTLE_MS);

      expect(await panelDrawn(page)).toEqual({
        viewing: 0,
        opening: 0,
        asking: 0,
        shows: null,
      });
    } finally {
      await held.release();
    }
  });

  test('ตอนเรียนและผู้สอน pressed again on the same row draws the later reading', async ({
    page,
  }) => {
    // Both presses ask for the same Offering, so what tells the two readings
    // apart has to be made: the held one is handed back with its subject's name
    // marked, standing for a reading taken before a section write. Asked by id,
    // the older reading matched the later press and was drawn over it.
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const [first] = await twoRows(page, OFFERINGS.open);

    const held = await holdFirstRead(page, OFFERINGS.detail, {
      older: (answer) => ({
        ...answer,
        offering: {
          ...answer.offering,
          subject_name_th: `${answer.offering.subject_name_th} (อ่านก่อน)`,
        },
      }),
    });
    try {
      const againArrived = otherRead(page, OFFERINGS.detail, held);
      const open = first.getByRole('button', { name: OFFERINGS.open, exact: true });
      await open.click();
      await open.click();

      const answer = await (await againArrived).json();
      await expect(page.getByRole('button', { name: OFFERINGS.back })).toBeVisible();
      await expect.poll(() => panelShows(page)).toEqual(panelOf(answer));

      await held.handed;
      await page.waitForTimeout(SETTLE_MS);

      expect(await panelDrawn(page)).toEqual({
        viewing: 1,
        opening: 0,
        asking: 0,
        shows: panelOf(answer),
      });
    } finally {
      await held.release();
    }
  });
});

test('a form asked for on ผลการเรียนรู้ระดับหลักสูตร still opens after the filter moves', async ({
  page,
}) => {
  // The ticket's second way in, measured rather than taken. The outcome asked
  // for belongs to the curriculum the screen opened on; the filter then moves to
  // the other one while its read is out. The form opens — the person asked for
  // it and moving the list is not withdrawing that — and what it draws belongs
  // to the outcome rather than to the table: the locked หลักสูตร field names the
  // outcome's own curriculum, and the ข้อหลัก picker offers that curriculum's
  // outcomes, not the ones on screen.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  const opening = await (await openPlos(page)).json();
  const filter = programFilter(page);
  const from = await filter.inputValue();
  const to = await filter
    .locator('option')
    .evaluateAll((options, left) => options.map((o) => o.value).find((v) => v && v !== left), from);
  expect(to, 'this account should reach a second curriculum').toBeTruthy();

  const [first] = await twoRows(page, 'แก้ไข');
  const asked = await first.locator('td').first().innerText();
  const askedCode = asked.replace('ข้อย่อย', '').trim().split(/\s+/)[0];
  const outcome = opening.plos.find((plo) => plo.outcome_code === askedCode);
  expect(outcome, 'the first row should name an outcome of the list answer').toBeTruthy();

  const held = await holdFirstRead(page, /^\/api\/plos\/\d+$/);
  try {
    await first.getByRole('button', { name: 'แก้ไข', exact: true }).click();
    await Promise.all([waitForPlos(page), filter.selectOption(to)]);

    await held.handed;
    await page.waitForTimeout(SETTLE_MS);

    // The fields are read only when a form is there: a form that never opened
    // is this row's failure, and it has to be reported as that rather than as a
    // read left waiting for a field until the timeout.
    const editing = await heading(page, 'แก้ไขผลการเรียนรู้ของหลักสูตร').count();
    expect({
      editing,
      shows: editing ? await field(page, 'รหัสผลการเรียนรู้').inputValue() : null,
      program: editing ? await field(page, 'หลักสูตร').inputValue() : null,
    }).toEqual({ editing: 1, shows: askedCode, program: from });

    // The picker's options, compared with the outcome's own curriculum minus
    // the outcome and everything beneath it — the form's rule, restated from
    // the answer the screen opened on rather than from the table it now shows.
    const beneath = new Set([outcome.outcome_id]);
    for (const plo of opening.plos) {
      if (beneath.has(plo.parent_outcome_id)) beneath.add(plo.outcome_id);
    }
    const offered = opening.plos
      .filter((plo) => !beneath.has(plo.outcome_id))
      .map((plo) => plo.outcome_code);
    await expect
      .poll(() =>
        parentPicker(page)
          .locator('option')
          .evaluateAll((options) =>
            options
              .filter((option) => option.value !== '')
              .map((option) => option.textContent.trim().replace(/^(—\s*)+/, '').split(/\s+/)[0]),
          ),
      )
      .toEqual(offered);
  } finally {
    await held.release();
  }
});

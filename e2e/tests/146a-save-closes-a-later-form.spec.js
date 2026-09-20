'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { byAlias, PROGRAM, SUBJECT } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isGet, isWrite } = require('../support/gate');
const { openDepartments } = require('../support/departments-screen');
const { openPrograms } = require('../support/programs-screen');
const { openSubjects } = require('../support/subjects-screen');
const { openUsers } = require('../support/users-screen');
const { openRegister } = require('../support/students-screen');
const { openOfferings, openForm, subjectPicker } = require('../support/offerings-screen');
const { PDF_BYTES, attach, evidencePath } = require('../support/evidence-screen');
const improvement = require('../support/improvement-screen');
const clos = require('../support/clos-screen');
const criteria = require('../support/achievements-screen');
const behaviors = require('../support/behaviors-screen');
const plan = require('../support/plan-screen');
const activities = require('../support/activities-screen');

/**
 * #146 — a save closes the form it was sent from, and no other.
 *
 * `save` ended with `setEditing(null)` and a banner, both unconditional. A
 * write is not torn down by anything, so its answer can arrive on a screen
 * that has moved on: ยกเลิก is pressable while a save is out on these screens,
 * the table it returns to disables nothing, and แก้ไข or เพิ่ม… opens a second
 * form. The first save's answer then closed that second form and put its own
 * sentence over the table — a save nobody could see saying "บันทึกแล้ว" about
 * a record the person was no longer looking at, and whatever they had typed
 * into the new form gone without a word.
 *
 * This is #133's rule met at the other end: *a save's answer is a read*, so it
 * asks *is the screen still where it was when I was sent* before it draws.
 * #139 asked that of the read that **opens** a form; here it is asked of the
 * write that **closes** one, with a ref for the same reason — a handler is
 * torn down by nothing.
 *
 * ## What each row builds
 *
 * บันทึก on one row's form, held at the route; ยกเลิก; then a second form,
 * opened the two ways there are — แก้ไข on another row, and เพิ่ม…, which is
 * the one a person has typed into. The held answer is then let go and the
 * screen is read **once**.
 *
 * The refusal is the same question answered the other way: an overtaken save's
 * red bar is not reported either, which is what `openEditor` already does with
 * an overtaken read's (#139).
 *
 * ## Where a row reads
 *
 * After the answer has reached the page, the screen sends the list `load` that
 * every save ends with; that response is the row's settle point, because the
 * close a defect would draw is committed before the request that follows it is
 * sent. `SETTLE_MS` is then for the commit itself and nothing else, and it can
 * decide (#52): a screen slower than this would read as a form left alone. What
 * stands behind it is the sweep, and a run of each row under a renderer slowed
 * six times (#136).
 *
 * The third row has no such point — a refused save reloads nothing, and a
 * banner that is rightly not drawn leaves no mark to wait for (#50) — so there
 * `SETTLE_MS` is all there is, from the moment the answer reached the page.
 *
 * ## What this file writes
 *
 * No row writes: every held write is answered by `gate` — a crafted 200 for the
 * rows about a save that succeeds, a crafted 409 for the one about a refusal —
 * so nothing reaches the database and there is nothing to put back. What the
 * write would have written is not the subject; what the screen does when it
 * answers is.
 *
 * The file itself writes one subject, because ข้อมูลรายวิชา has one seeded row
 * and the first row needs a second to press แก้ไข on. A row that holds a defect
 * builds its situation itself (#129), and `hold()` takes it out again.
 */

const db = createPool({ schema: E2E_SCHEMA });

/** The second subject, so ข้อมูลรายวิชา has a row to press แก้ไข on after the save. */
const SECOND = { id: '01146146', th: 'วิชาที่สองของแถว #146', en: 'Second subject for #146' };

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

/** The answer a held save is given: a body every one of these routes could send. */
const SAVED = {};

/** The refusal the third row's save is given — worded so no screen could say it. */
const REFUSED = 'ไม่อนุญาตให้บันทึกรายการนี้ (แถวของ #146)';

/** What the third row's add form is typed into with, to see it survive. */
const TYPED = 'ข้อความที่พิมพ์ค้างไว้ของแถว #146';

/**
 * How long the commit of a form being closed is given before the screen is
 * read. See *Where a row reads*.
 */
const SETTLE_MS = 250;

/** One file being replaced, and the shelf the save reloads afterwards. */
const EVIDENCE_WRITE = /^\/api\/teaching\/sections\/\d+\/evidence\/\d+$/;
const EVIDENCE_LIST = /\/activities\/\d+\/evidence$/;

const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const heading = (page, name) => page.getByRole('heading', { name, exact: true });

/** The first two rows of the list that carry แก้ไข. */
async function twoRows(page) {
  const rows = page
    .locator('table')
    .first()
    .locator('tbody tr')
    .filter({ has: page.getByRole('button', { name: 'แก้ไข', exact: true }) });
  await expect(rows.nth(1)).toBeVisible();
  return [rows.nth(0), rows.nth(1)];
}

/** The list request every save ends with, and the row's settle point. */
function waitForReload(page, list) {
  const on = (pathname) => (typeof list === 'string' ? pathname === list : list.test(pathname));
  return page.waitForResponse(
    (answer) =>
      on(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );
}

/**
 * The screens whose form replaces the table, and leaves ยกเลิก pressable while
 * a save is out — the three #142's fourth row measured, and ข้อมูลผู้ใช้งาน,
 * whose ยกเลิก carries no `disabled` either.
 *
 * `detail` is the path a row is saved on, `list` the one the save reloads,
 * `edit` and `add` the two forms' headings (`add` is also the button's own
 * label, told apart by role), and `named` a field both forms carry.
 *
 * `readsOnEdit` marks the three whose แก้ไข opens its form from a read rather
 * than from the row in hand (#139): those three have a window between the press
 * and the form, and the row at the end of this block is about it.
 * `refusalRow` marks the one screen that carries the refusal half of *nothing
 * took its place* — the same clause at a second site, asked once per shape.
 */
const SCREENS = [
  {
    name: 'ข้อมูลภาควิชา',
    file: 'Departments.js',
    account: ACCOUNTS.facultyAdmin,
    open: (page) => openDepartments(page),
    detail: /^\/api\/departments\/\d+$/,
    list: '/api/departments',
    edit: 'แก้ไขภาควิชา',
    add: 'เพิ่มภาควิชา',
    readsOnEdit: true,
    refusalRow: true,
    named: 'ชื่อภาควิชา (ไทย)',
    saved: 'บันทึกข้อมูลเรียบร้อยแล้ว',
  },
  {
    name: 'ข้อมูลหลักสูตร',
    file: 'Programs.js',
    account: ACCOUNTS.facultyAdmin,
    open: (page) => openPrograms(page),
    detail: /^\/api\/programs\/\d+$/,
    list: '/api/programs',
    edit: 'แก้ไขหลักสูตร',
    add: 'เพิ่มหลักสูตร',
    readsOnEdit: true,
    named: 'ชื่อหลักสูตร (ไทย)',
    saved: 'บันทึกข้อมูลเรียบร้อยแล้ว',
  },
  {
    name: 'ข้อมูลรายวิชา',
    file: 'Subjects.js',
    account: ACCOUNTS.departmentAdmin05,
    open: (page) => openSubjects(page),
    detail: /^\/api\/subjects\/\d+$/,
    list: '/api/subjects',
    edit: 'แก้ไขรายวิชา',
    add: 'เพิ่มรายวิชา',
    readsOnEdit: true,
    named: 'ชื่อวิชา (ไทย)',
    saved: 'บันทึกข้อมูลเรียบร้อยแล้ว',
  },
  {
    name: 'ข้อมูลผู้ใช้งาน',
    file: 'Users.js',
    account: ACCOUNTS.facultyAdmin,
    open: (page) => openUsers(page),
    // A user id is not digits on every account, so the shape is *one segment*.
    detail: /^\/api\/users\/[^/]+$/,
    list: '/api/users',
    edit: 'แก้ไขข้อมูลผู้ใช้งาน',
    add: 'เพิ่มผู้ใช้งาน',
    named: 'ชื่อ (ไทย)',
    saved: 'บันทึกข้อมูลเรียบร้อยแล้ว',
  },
];

/**
 * Sends a save from the first row's form and leaves it held at the route, with
 * the table back on the screen.
 */
async function saveAndCancel(page, screen, answer) {
  const [first, second] = await twoRows(page);
  await button(first, 'แก้ไข').click();
  await expect(heading(page, screen.edit)).toBeVisible();

  const write = await gate(page, screen.detail, isWrite, answer);
  await button(page, 'บันทึก').click();
  await write.sent;

  // Not disabled by the flag on these three screens — #142 measured which.
  await button(page, 'ยกเลิก').click();
  await expect(heading(page, screen.edit)).toBeHidden();
  return { write, second };
}

for (const screen of SCREENS) {
  test.describe(`${screen.name} (${screen.file})`, () => {
    test('a save that lands after แก้ไข leaves the form it found open', async ({ page }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const { write, second } = await saveAndCancel(page, screen, { success: SAVED });

      await button(second, 'แก้ไข').click();
      const form = heading(page, screen.edit);
      await expect(form).toBeVisible();
      const shown = await page.getByLabel(screen.named).inputValue();

      const reloaded = waitForReload(page, screen.list);
      write.open();
      await write.answered;
      await reloaded;
      await page.waitForTimeout(SETTLE_MS);

      expect(await form.isVisible(), 'the second form after the save answered').toBe(true);
      expect(await page.getByLabel(screen.named).inputValue()).toBe(shown);
      expect(await page.getByText(screen.saved).count(), "the first save's banner").toBe(0);
    });

    test('a save that lands after เพิ่ม leaves what was typed where it was', async ({ page }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const { write } = await saveAndCancel(page, screen, { success: SAVED });

      await button(page, screen.add).click();
      const form = heading(page, screen.add);
      await expect(form).toBeVisible();
      await page.getByLabel(screen.named).fill(TYPED);

      const reloaded = waitForReload(page, screen.list);
      write.open();
      await write.answered;
      await reloaded;
      await page.waitForTimeout(SETTLE_MS);

      expect(await form.isVisible(), 'the add form after the save answered').toBe(true);
      expect(await page.getByLabel(screen.named).inputValue()).toBe(TYPED);
      expect(await page.getByText(screen.saved).count(), "the first save's banner").toBe(0);
    });

    test('a save refused after the screen moved on says nothing over the new form', async ({
      page,
    }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const { write, second } = await saveAndCancel(page, screen, { refusal: REFUSED });

      await button(second, 'แก้ไข').click();
      const form = heading(page, screen.edit);
      await expect(form).toBeVisible();

      write.open();
      await write.answered;
      await page.waitForTimeout(SETTLE_MS);

      expect(await page.getByText(REFUSED).count(), 'the overtaken refusal').toBe(0);
      expect(await form.isVisible(), 'the second form after the refusal').toBe(true);
    });

    test('a save that nothing took the place of says what it did', async ({ page }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const { write } = await saveAndCancel(page, screen, { success: SAVED });

      // ยกเลิก and then nothing. The form the save was sent from is gone, but
      // no other one is there for its sentence to read as being about, and the
      // person who pressed บันทึก is owed the news either way — the question
      // #146 parked, answered by the advisor (`docs/06` §Out of Scope).
      const reloaded = waitForReload(page, screen.list);
      write.open();
      await write.answered;
      await reloaded;

      await expect(page.getByText(screen.saved)).toBeVisible();
      expect(await heading(page, screen.edit).count(), 'a form back on the screen').toBe(0);
    });

    if (screen.refusalRow) {
      test('a refusal that nothing took the place of is still said', async ({ page }) => {
        await signIn(page, screen.account);
        await screen.open(page);
        const { write } = await saveAndCancel(page, screen, { refusal: REFUSED });

        write.open();
        await write.answered;

        await expect(page.getByText(REFUSED)).toBeVisible();
      });
    }

    if (screen.readsOnEdit) {
      test('a save that lands while the next row is being read says nothing', async ({
        page,
      }) => {
        await signIn(page, screen.account);
        await screen.open(page);
        const { write, second } = await saveAndCancel(page, screen, { success: SAVED });

        // The window ยกเลิก leaves open on these three: แก้ไข reads the row
        // before it can draw its form, so between the press and the answer
        // there is no form on the screen at all. Held here, the save answers
        // inside it — and would put its sentence over the form about to be
        // drawn if the ref were written where the read lands (#139's rule:
        // ask by the press, not by the row).
        const read = await gate(page, screen.detail, isGet);
        await button(second, 'แก้ไข').click();
        await read.sent;

        const reloaded = waitForReload(page, screen.list);
        write.open();
        await write.answered;
        await reloaded;
        read.open();
        await read.answered;
        await expect(heading(page, screen.edit)).toBeVisible();
        await page.waitForTimeout(SETTLE_MS);

        expect(await page.getByText(screen.saved).count(), "the first save's banner").toBe(0);
      });
    }
  });
}

/**
 * The five teacher screens that draw the form above a list they never disable.
 *
 * No ยกเลิก is needed there: the pencil of another card replaces the form while
 * the save is still out. `open` signs the account in, goes to the screen and
 * hands back nothing — every row that follows works from what is drawn.
 *
 * `write` is the path a save goes to and `list` the one the reload comes back
 * on; on these screens they are the same read, told apart by method.
 */
const CARD_SCREENS = [
  {
    name: 'ผลการเรียนรู้รายวิชา',
    file: 'CourseOutcomes.js',
    open: async (page) => {
      const [sectionId] = await clos.mySectionIds(page);
      await clos.openClos(page, sectionId);
    },
    api: clos.API,
    saved: 'บันทึกผลการเรียนรู้รายวิชาแล้ว',
    refusalRow: true,
  },
  {
    name: 'เกณฑ์การบรรลุผล',
    file: 'AchievementCriteria.js',
    open: async (page) => {
      const [sectionId] = await criteria.mySectionIds(page);
      const [clo] = await criteria.myClos(page, sectionId);
      await criteria.openCriteria(page, sectionId, clo.clo_id);
    },
    api: criteria.API,
    saved: 'บันทึกเกณฑ์การบรรลุผลแล้ว',
  },
  {
    name: 'พฤติกรรมบ่งชี้',
    file: 'MeasurableBehaviors.js',
    open: async (page) => {
      const [sectionId] = await behaviors.mySectionIds(page);
      const [clo] = await behaviors.myClos(page, sectionId);
      await behaviors.openBehaviors(page, sectionId, clo.clo_id);
    },
    api: behaviors.API,
    saved: 'บันทึกพฤติกรรมบ่งชี้แล้ว',
  },
  {
    name: 'แผนการสอน',
    file: 'TeachingPlan.js',
    open: async (page) => {
      const [sectionId] = await plan.mySectionIds(page);
      await plan.openPlan(page, sectionId);
    },
    api: plan.API,
    saved: 'บันทึกแผนการสอนแล้ว',
  },
  {
    name: 'กิจกรรมการเรียนรู้',
    file: 'LearningActivities.js',
    open: async (page) => {
      const [sectionId] = await activities.mySectionIds(page);
      await activities.openActivities(page, sectionId);
    },
    api: activities.API,
    saved: 'บันทึกกิจกรรมแล้ว',
  },
];

/** The form's own heading: the one drawn immediately above the form itself. */
const formHeading = (page) =>
  page.locator('form').first().locator('xpath=preceding-sibling::h2[1]');

/** Every card's pencil, whose label starts with แก้ไข on all five screens. */
const pencils = (page) => page.getByRole('button', { name: /^แก้ไข/ });

/**
 * Opens one card's form, sends its save and leaves it held at the route, with
 * the form still on the screen.
 */
async function saveFromTheFirstCard(page, screen, answer) {
  const heading = formHeading(page);
  await expect(pencils(page).nth(1), 'a second card to press แก้ไข on').toBeVisible();
  await pencils(page).nth(0).click();
  await expect(heading).toBeVisible();

  const write = await gate(page, screen.api, isWrite, answer);
  await button(page, 'บันทึก').click();
  await write.sent;
  return { write, heading };
}

for (const screen of CARD_SCREENS) {
  test.describe(`${screen.name} (${screen.file})`, () => {
    test("a save that lands after another card's แก้ไข leaves that form open", async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      const { write, heading } = await saveFromTheFirstCard(page, screen, { success: SAVED });

      // No ยกเลิก: the list under the form disables nothing while a write is out.
      await pencils(page).nth(1).click();
      const second = await heading.textContent();

      const reloaded = waitForReload(page, screen.api);
      write.open();
      await write.answered;
      await reloaded;
      await page.waitForTimeout(SETTLE_MS);

      expect(await heading.isVisible(), "the second card's form").toBe(true);
      expect(await heading.textContent()).toBe(second);
      expect(await page.getByText(screen.saved).count(), "the first save's banner").toBe(0);
    });

    test('a save refused after the screen moved on says nothing over the new form', async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      const { write, heading } = await saveFromTheFirstCard(page, screen, { refusal: REFUSED });

      await pencils(page).nth(1).click();
      const second = await heading.textContent();

      write.open();
      await write.answered;
      await page.waitForTimeout(SETTLE_MS);

      expect(await page.getByText(REFUSED).count(), 'the overtaken refusal').toBe(0);
      expect(await heading.textContent(), "the second card's form").toBe(second);
    });

    test('a save that nothing took the place of says what it did', async ({ page }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      const { write, heading } = await saveFromTheFirstCard(page, screen, { success: SAVED });

      // ยกเลิก is pressable on these five while a write is out, so the form can
      // be gone with nothing in its place — หลักฐานการประเมิน is the one that
      // disables it, and has no row like this one.
      await button(page, 'ยกเลิก').click();
      await expect(heading).toBeHidden();

      const reloaded = waitForReload(page, screen.api);
      write.open();
      await write.answered;
      await reloaded;

      await expect(page.getByText(screen.saved)).toBeVisible();
    });

    if (screen.refusalRow) {
      test('a refusal that nothing took the place of is still said', async ({ page }) => {
        await signIn(page, ACCOUNTS.teacherOne);
        await screen.open(page);
        const { write, heading } = await saveFromTheFirstCard(page, screen, { refusal: REFUSED });

        await button(page, 'ยกเลิก').click();
        await expect(heading).toBeHidden();

        write.open();
        await write.answered;

        await expect(page.getByText(REFUSED)).toBeVisible();
      });
    }
  });
}

/**
 * หลักฐานการประเมิน, whose form is the five teacher screens' shape with one
 * difference: its ยกเลิก *is* disabled while a write is out, so the only way in
 * is another file's pencil — which is the way in the five have as well, and the
 * reason no screen is safe for having disabled the obvious one.
 *
 * The two files are attached by the rows themselves: `activity_evidence` is
 * deliberately not seeded, and a row that holds a defect builds its situation
 * (#129). `hold()` takes them out again, the shelf and the disk both.
 */
test.describe('หลักฐานการประเมิน (ActivityEvidence.js)', () => {
  /** What is written in the form now — the one field that names which file it is about. */
  const describedAs = (page) => page.getByLabel('คำอธิบาย', { exact: true });

  const pencilOf = (page, name) =>
    page.getByRole('button', { name: `แก้ไขหลักฐาน ${name}`, exact: true });

  /** The Activity `teacher.one@` can attach to, and the shelf it hangs on. */
  async function shelf() {
    const { rows } = await db.query(
      `SELECT a.id, a.section_id
         FROM activities a
         JOIN course_sections_teacher cst ON cst.section_id = a.section_id
         JOIN users u ON u.user_id = cst.user_id
        WHERE u.email = $1
        ORDER BY a.id ASC
        LIMIT 1`,
      [ACCOUNTS.teacherOne],
    );
    expect(rows, 'the seed should give teacher.one an Activity').toHaveLength(1);
    return rows[0];
  }

  /**
   * Two files on the shelf, named after the row that hung them there.
   *
   * The shelf is one and both rows leave their files on it, so a shared pair of
   * names would give the second row two pencils answering to each.
   */
  async function twoFiles(page, tag) {
    const activity = await shelf();
    await page.goto(evidencePath(activity.section_id, activity.id));
    const names = [`หนึ่ง-146-${tag}.pdf`, `สอง-146-${tag}.pdf`];
    for (const name of names) {
      await attach(page, { bytes: PDF_BYTES, name, description: `แฟ้ม ${name}` });
    }
    await expect(pencilOf(page, names[1])).toBeVisible();
    return names;
  }

  test("a save that lands after another file's pencil leaves that form open", async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [first, second] = await twoFiles(page, 'ก');

    await pencilOf(page, first).click();
    await expect(describedAs(page)).toBeVisible();

    const write = await gate(page, EVIDENCE_WRITE, isWrite, { success: SAVED });
    await button(page, 'บันทึก').click();
    await write.sent;

    await pencilOf(page, second).click();

    const reloaded = waitForReload(page, EVIDENCE_LIST);
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);

    // What the form holds is not read here: this screen puts a loading state up
    // while it reloads, which takes the form down and builds it again from the
    // file it is about. Whether it is there at all is the question #146 asks.
    //
    // It is also not readable. `EvidenceForm` initialises its state once, so the
    // second file's pencil leaves the first file's values in the boxes — #147,
    // found by this row and not fixed by it.
    expect(await button(page, 'บันทึก').isVisible(), "the second file's form").toBe(true);
    expect(
      await page.getByText('บันทึกหลักฐานการประเมินแล้ว').count(),
      "the first save's banner",
    ).toBe(0);
  });

  test('a save refused after the screen moved on says nothing over the new form', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [first, second] = await twoFiles(page, 'ข');

    await pencilOf(page, first).click();
    const write = await gate(page, EVIDENCE_WRITE, isWrite, { refusal: REFUSED });
    await button(page, 'บันทึก').click();
    await write.sent;

    await pencilOf(page, second).click();
    await describedAs(page).fill(TYPED);

    write.open();
    await write.answered;
    await page.waitForTimeout(SETTLE_MS);

    expect(await page.getByText(REFUSED).count(), 'the overtaken refusal').toBe(0);
    expect(await describedAs(page).isVisible(), "the second file's form").toBe(true);
    expect(await describedAs(page).inputValue()).toBe(TYPED);
  });
});

/**
 * แผนพัฒนาต่อเนื่อง, whose four sections are four openings of one form — and
 * which has a control the other twelve screens do not: the outcome picker,
 * which closes the form without being a form control at all. A save overtaken
 * by it would have said บันทึก…แล้ว under the heading of an outcome nobody had
 * written a word about.
 */
test.describe('แผนพัฒนาต่อเนื่อง (ContinuousImprovement.js)', () => {
  const editor = (page, type) =>
    improvement.formSection(page, type).getByLabel(improvement.LABELS[type], { exact: true });

  /**
   * Opens one section's editor and leaves its บันทึก held at the route.
   *
   * Which of the two buttons is there is read once and does not retry, so the
   * read waits for one of them first — `support/improvement-screen.js` carries
   * the measurement that made this necessary.
   */
  async function writeAndHold(page, type, answer) {
    const region = improvement.formSection(page, type);
    const start = region.getByRole('button', {
      name: `เขียน${improvement.LABELS[type]}`,
      exact: true,
    });
    const change = region.getByRole('button', {
      name: `แก้ไข${improvement.LABELS[type]}`,
      exact: true,
    });
    await expect(start.or(change)).toBeVisible();
    if (await start.count()) await start.click();
    else await change.click();
    await editor(page, type).fill(TYPED);

    const write = await gate(page, improvement.API, isWrite, answer);
    await region.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await write.sent;
    return write;
  }

  /** The screen, on a ตอนเรียน whose plan has more than one outcome to write about. */
  async function openTwoOutcomes(page) {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await improvement.mySectionIds(page);
    const clos = await improvement.myClos(page, sectionId);
    expect(clos.length, 'two outcomes to move between').toBeGreaterThan(1);
    await improvement.openPlan(page, sectionId);
    return clos;
  }

  test("a save that lands after another section's เขียน leaves that form open", async ({ page }) => {
    await openTwoOutcomes(page);
    const write = await writeAndHold(page, 'SUMMARY', { success: SAVED });

    await improvement
      .formSection(page, 'REFLECTION')
      .getByRole('button', { name: `เขียน${improvement.LABELS.REFLECTION}`, exact: true })
      .click();
    await editor(page, 'REFLECTION').fill(TYPED);

    const reloaded = improvement.waitForPlan(page);
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);

    // That the editor is still there, and not what is in it: the reload every
    // save ends with re-seeds a section whose `entry` changed identity, which
    // clears what was typed into another section's box — #148, which #146's own
    // fix is what made reachable.
    expect(await editor(page, 'REFLECTION').isVisible(), 'the second section\'s editor').toBe(
      true,
    );
    expect(
      await page.getByText(`บันทึก${improvement.LABELS.SUMMARY}แล้ว`).count(),
      "the first save's banner",
    ).toBe(0);
  });

  test('a save that lands after the outcome picker moved says nothing about the one now shown', async ({
    page,
  }) => {
    const clos = await openTwoOutcomes(page);
    const write = await writeAndHold(page, 'SUMMARY', { success: SAVED });

    await improvement.chooseClo(page, clos[1].clo_number);

    const reloaded = improvement.waitForPlan(page);
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);

    expect(
      await page.getByText(`บันทึก${improvement.LABELS.SUMMARY}แล้ว`).count(),
      'a sentence about the outcome that was left',
    ).toBe(0);
  });
  /**
   * The refusal, which on this screen never reaches a reload: the close and the
   * list both sit on the success path, so all an overtaken refusal can do is put
   * a red sentence over a section nobody sent.
   */
  test('a save refused after the screen moved on says nothing over the new form', async ({
    page,
  }) => {
    await openTwoOutcomes(page);
    const write = await writeAndHold(page, 'SUMMARY', { refusal: REFUSED });

    await improvement
      .formSection(page, 'REFLECTION')
      .getByRole('button', { name: `เขียน${improvement.LABELS.REFLECTION}`, exact: true })
      .click();
    const second = editor(page, 'REFLECTION');
    await second.fill(TYPED);

    write.open();
    await write.answered;
    await page.waitForTimeout(SETTLE_MS);

    expect(await page.getByText(REFUSED).count(), 'the overtaken refusal').toBe(0);
    expect(await second.isVisible(), "the second section's editor").toBe(true);
  });

  test('a save that nothing took the place of says what it did', async ({ page }) => {
    await openTwoOutcomes(page);
    const write = await writeAndHold(page, 'SUMMARY', { success: SAVED });

    const region = improvement.formSection(page, 'SUMMARY');
    await region.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(editor(page, 'SUMMARY')).toBeHidden();

    const reloaded = improvement.waitForPlan(page);
    write.open();
    await write.answered;
    await reloaded;

    await expect(page.getByText(`บันทึก${improvement.LABELS.SUMMARY}แล้ว`)).toBeVisible();
  });

  /**
   * The refusal half on this screen, which no other carries: its refusal path
   * reaches no reload at all, so the sentence is the whole of what it does.
   */
  test('a refusal that nothing took the place of is still said', async ({ page }) => {
    await openTwoOutcomes(page);
    const write = await writeAndHold(page, 'SUMMARY', { refusal: REFUSED });

    const region = improvement.formSection(page, 'SUMMARY');
    await region.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(editor(page, 'SUMMARY')).toBeHidden();

    write.open();
    await write.answered;

    await expect(page.getByText(REFUSED)).toBeVisible();
  });
});

/**
 * การเปิดรายวิชาในภาคการศึกษา, the one screen with a single form and no แก้ไข: the
 * second opening is the same control pressed again, which is a way in #139
 * had to name too.
 *
 * The crafted answer is a real Offering read from the register rather than an
 * empty body, because what a save does with its answer is the subject: a body
 * the success path cannot read would be answered by the refusal path instead,
 * and a row measuring the guard would pass on a throw.
 */
test.describe('การเปิดรายวิชาในภาคการศึกษา (Offerings.js)', () => {
  const OPEN = 'เปิดรายวิชา';
  const FORM = 'เปิดรายวิชาในภาคการศึกษา';

  /** A body the screen's success path can read all the way through. */
  async function craftedOffering() {
    const { rows } = await db.query(
      `SELECT sc.id, sc.subject_id, s.subject_name_th, sc.academic_year, sc.semester
         FROM semester_courses sc
         JOIN subjects s ON s.subject_id = sc.subject_id
        ORDER BY sc.id ASC
        LIMIT 1`,
    );
    expect(rows, 'the seed should have opened a subject').toHaveLength(1);
    return { offering: rows[0] };
  }

  /** Fills the form, sends it, and leaves the answer held with the list back on the screen. */
  async function openAndCancel(page, answer) {
    await openForm(page);
    await expect(subjectPicker(page).locator('option')).not.toHaveCount(1);
    const subject = await subjectPicker(page).locator('option').nth(1).getAttribute('value');
    await subjectPicker(page).selectOption(subject);
    await page.locator('form input[inputmode="numeric"]').fill('2570');
    await page.locator('form select:has(option:text-is("1 — ภาคต้น"))').selectOption('1');

    const write = await gate(page, /^\/api\/offerings$/, isWrite, answer);
    await button(page, OPEN).click();
    await write.sent;

    // Not disabled by the flag here either — only บันทึก is, and this form's is เปิดรายวิชา.
    await button(page, 'ยกเลิก').click();
    await expect(heading(page, FORM)).toBeHidden();
    return write;
  }

  test('a save that lands after the form was opened again leaves what was typed where it was', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const write = await openAndCancel(page, { success: await craftedOffering() });

    await button(page, OPEN).click();
    await expect(heading(page, FORM)).toBeVisible();
    await page.locator('form input[inputmode="numeric"]').fill('2571');

    const reloaded = waitForReload(page, '/api/offerings');
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);

    expect(await heading(page, FORM).isVisible(), 'the form opened again').toBe(true);
    expect(await page.locator('form input[inputmode="numeric"]').inputValue()).toBe('2571');
    expect(await page.getByText(/เรียบร้อยแล้ว ขั้นต่อไปคือเพิ่มตอนเรียน$/).count(), "the first save's banner").toBe(0);
  });

  test('a save refused after the screen moved on says nothing over the new form', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const write = await openAndCancel(page, { refusal: REFUSED });

    await button(page, OPEN).click();
    await expect(heading(page, FORM)).toBeVisible();

    write.open();
    await write.answered;
    await page.waitForTimeout(SETTLE_MS);

    expect(await page.getByText(REFUSED).count(), 'the overtaken refusal').toBe(0);
    expect(await heading(page, FORM).isVisible(), 'the form opened again').toBe(true);
  });

  test('a save that nothing took the place of says what it did', async ({ page }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const write = await openAndCancel(page, { success: await craftedOffering() });

    const reloaded = waitForReload(page, '/api/offerings');
    write.open();
    await write.answered;
    await reloaded;

    await expect(page.getByText(/เรียบร้อยแล้ว ขั้นต่อไปคือเพิ่มตอนเรียน$/)).toBeVisible();
  });
});

/**
 * ข้อมูลนักศึกษากลาง — the thirteenth screen, and the one no list in the ticket
 * could have held.
 *
 * #146 was written from a grep for `setEditing(null)`. The register has nothing
 * to edit, so it holds `adding` instead and appears on no list of the sixteen;
 * it was found by asking which screens have a `save` and no `showing`, which is
 * a different question from the one the grep asked (#133).
 *
 * The way in is one control short of the four list screens'. There is no แก้ไข,
 * so it is ยกเลิก — `StudentForm` disables บันทึก and nothing else — and then
 * เพิ่มนักศึกษา again, which is the same shape as การเปิดรายวิชา's one form above.
 *
 * The crafted answer is a 200 with an empty body rather than the register's own
 * 201: this success path reads neither, only that the call did not throw, and
 * what the row is about is what it does next. Nothing is written either way.
 */
test.describe('ข้อมูลนักศึกษากลาง (Students.js)', () => {
  const ADD = 'เพิ่มนักศึกษา';
  const CODE = 'รหัสนักศึกษา';

  /** Fills the add form, sends it, and leaves the answer held with the register back on the screen. */
  async function openAndCancel(page, answer) {
    await button(page, ADD).click();
    await page.getByLabel(CODE).fill('61146001');
    await page.getByLabel('ชื่อ', { exact: true }).fill('นักศึกษา');
    await page.getByLabel('นามสกุล', { exact: true }).fill('ของแถว 146');
    await page.getByLabel('หลักสูตร').selectOption(PROGRAM);

    const write = await gate(page, /^\/api\/students$/, isWrite, answer);
    await button(page, 'บันทึก').click();
    await write.sent;

    await button(page, 'ยกเลิก').click();
    await expect(heading(page, ADD)).toBeHidden();
    return write;
  }

  test('a save that lands after the form was opened again leaves what was typed where it was', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openRegister(page);
    const write = await openAndCancel(page, { success: SAVED });

    await button(page, ADD).click();
    await expect(heading(page, ADD)).toBeVisible();
    await page.getByLabel(CODE).fill('61146002');

    const reloaded = waitForReload(page, '/api/students');
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);

    expect(await heading(page, ADD).isVisible(), 'the form opened again').toBe(true);
    expect(await page.getByLabel(CODE).inputValue()).toBe('61146002');
    expect(
      await page.getByText('บันทึกข้อมูลนักศึกษาเรียบร้อยแล้ว').count(),
      "the first save's banner",
    ).toBe(0);
  });

  test('a save refused after the screen moved on says nothing over the new form', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openRegister(page);
    const write = await openAndCancel(page, { refusal: REFUSED });

    await button(page, ADD).click();
    await expect(heading(page, ADD)).toBeVisible();

    write.open();
    await write.answered;
    await page.waitForTimeout(SETTLE_MS);

    expect(await page.getByText(REFUSED).count(), 'the overtaken refusal').toBe(0);
    expect(await heading(page, ADD).isVisible(), 'the form opened again').toBe(true);
  });

  test('a save that nothing took the place of says what it did', async ({ page }) => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openRegister(page);
    const write = await openAndCancel(page, { success: SAVED });

    const reloaded = waitForReload(page, '/api/students');
    write.open();
    await write.answered;
    await reloaded;

    await expect(page.getByText('บันทึกข้อมูลนักศึกษาเรียบร้อยแล้ว')).toBeVisible();
  });
});

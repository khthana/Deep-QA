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
const { openProgramSubjects } = require('../support/program-subjects-screen');
const { openRubrics, rubricRow } = require('../support/rubrics-screen');
const { openCriteriaVia } = require('../support/rubric-criteria-screen');
const { openPlos } = require('../support/plos-screen');
const { openOfferings } = require('../support/offerings-screen');

/**
 * #142 — a read that lands late does not give a write its button back.
 *
 * Eight screens read a row afresh before opening its form or its panel, and
 * each read held the screen's one `busy` flag — the flag that disables บันทึก,
 * the confirmation, and the panel's section controls while a write is out. The
 * read's `finally` put that flag down whether or not the read was still the one
 * the screen wanted, and whether or not a write had picked the flag up since.
 *
 * ## What was measured before the fix
 *
 * Three orders on ข้อมูลภาควิชา, on 19 September 2569 at `8bb9a92`:
 *
 * - **a read, a second read, a save** — the ticket's. The second read's
 *   `finally` puts the flag down while the first is still out, so the second
 *   form opens with บันทึก pressable; pressed, the save picks the flag up, and
 *   the first read's `finally` then puts it down under the save. บันทึก was
 *   pressable again with the save still out. **Red, as the ticket said.**
 * - **a read, then ลบ** — not a way in. The first read's flag is still up when
 *   the confirmation opens, so its button is disabled until the read lands, and
 *   the delete can only start after it has.
 * - **a save, then ลบ** — not a way in either. ยกเลิก is pressable during a
 *   save, so the table comes back, but the save's flag is up and the
 *   confirmation opens disabled. Two writes cannot overlap: every control that
 *   starts one is disabled by the flag, and nothing but a read puts it down
 *   early.
 *
 * So the one thing that can end another's hold is a read, because a read is
 * the one thing the table lets start while the flag is up. It can do that in
 * two orders:
 *
 * - **superseded** — a read another read has overtaken lands after a write
 *   started. The ticket's order, the first row on every screen.
 * - **current** — a write is out, what sent it is closed with ยกเลิก (which
 *   the flag does not disable), and a read started from the table lands while
 *   the write is still out. The read was the one asked for; the flag it put
 *   down was the write's. There are two ยกเลิก to close with. The
 *   confirmation's is on every list screen: the second row. The form's is
 *   pressable during a save only on ข้อมูลภาควิชา, ข้อมูลหลักสูตร and
 *   ข้อมูลรายวิชา — the other four forms disable it with the flag — and there
 *   แก้ไข on the same row sent the same save a second time: the fourth row,
 *   measured red before the fix like the other two.
 *
 * ## The third row on each screen
 *
 * The ticket said why #139's guard could not be copied here: a read that
 * released only when it was still `asked` would never release when เพิ่ม or ลบ
 * took its place — they write `asked` and pick up no flag of their own — and a
 * confirmation opened meanwhile would stay disabled for good. The fix does not
 * ask `asked`; the third row holds that it does not, by opening ลบ while a read
 * is out and waiting for the confirmation to come back.
 *
 * ## How a row is built
 *
 * With `gate`, not with a timer: the row says when the held read lands, after
 * the write has left. Every held write is answered with a made-up 409, so no
 * row changes the database. The second and fourth rows read the button once the
 * form the read opened is on the screen: the read's `finally` runs in the same tick as
 * the `setEditing` that draws it, and React commits the two together. The
 * first row has no such point — the overtaken read draws nothing, and nothing
 * on the screen marks a flag that was rightly left alone (#50) — so it reads
 * the button once, `SETTLE_MS` after the held answer has been handed to the
 * page.
 *
 * ## What this file writes
 *
 * One subject, placed into the seeded หลักสูตร, as `139a` does and for the same
 * reason: ข้อมูลรายวิชา and รายวิชาในหลักสูตร need a second row, and a row that
 * holds a defect builds its situation itself (#129). `hold()` takes it out.
 */

const db = createPool({ schema: E2E_SCHEMA });

/** The second subject. Department 05 and หลักสูตร 0501 are the seeded one's. */
const SECOND = { id: '01142142', th: 'วิชาที่สองของแถว #142', en: 'Second subject for #142' };

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

/**
 * How long the held answer is given to reach its `finally` before the first
 * row reads the button. This one can decide: a `finally` slower than this
 * would read as a flag left alone, and the row would pass with the defect in
 * place (#52). What stands behind it is the sweep, and one run of each first
 * row's mutant with the renderer slowed six times (#136), which still killed.
 */
const SETTLE_MS = 250;

/** Every held write's answer — worded so no screen could say it by itself. */
const REFUSED = 'ไม่อนุญาตให้ทำรายการนี้ (แถวของ #142)';

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

const button = (scope, name) => scope.getByRole('button', { name, exact: true });

/**
 * The seven list screens. `detail` is the path a row is read, saved and
 * removed on; `edit` the form's heading; `remove` and `confirm` the row's
 * button and the confirmation's. `cancelDuringSave` marks the three whose
 * form leaves ยกเลิก pressable while a save is out.
 */
const LIST_SCREENS = [
  {
    name: 'ข้อมูลภาควิชา',
    file: 'Departments.js',
    account: ACCOUNTS.facultyAdmin,
    open: (page) => openDepartments(page),
    detail: /^\/api\/departments\/\d+$/,
    edit: 'แก้ไขภาควิชา',
    remove: 'ลบ',
    confirm: 'ลบภาควิชา',
    cancelDuringSave: true,
  },
  {
    name: 'ข้อมูลหลักสูตร',
    file: 'Programs.js',
    account: ACCOUNTS.facultyAdmin,
    open: (page) => openPrograms(page),
    detail: /^\/api\/programs\/\d+$/,
    edit: 'แก้ไขหลักสูตร',
    remove: 'ลบ',
    confirm: 'ลบหลักสูตร',
    cancelDuringSave: true,
  },
  {
    name: 'ข้อมูลรายวิชา',
    file: 'Subjects.js',
    account: ACCOUNTS.departmentAdmin05,
    open: (page) => openSubjects(page),
    detail: /^\/api\/subjects\/\d+$/,
    edit: 'แก้ไขรายวิชา',
    remove: 'ลบ',
    confirm: 'ลบรายวิชา',
    cancelDuringSave: true,
  },
  {
    name: 'รายวิชาในหลักสูตร',
    file: 'ProgramSubjects.js',
    account: ACCOUNTS.committee0501,
    open: (page) => openProgramSubjects(page),
    detail: /^\/api\/program-subjects\/\d+\/\d+$/,
    edit: 'แก้ไขรายวิชาในหลักสูตร',
    remove: 'นำออก',
    confirm: 'นำออกจากหลักสูตร',
  },
  {
    name: 'Rubric',
    file: 'Rubrics.js',
    account: ACCOUNTS.committee0501,
    open: (page) => openRubrics(page),
    detail: /^\/api\/rubrics\/\d+$/,
    edit: 'แก้ไข Rubric',
    remove: 'ลบ',
    confirm: 'ลบ Rubric',
  },
  {
    name: 'เกณฑ์การให้คะแนน',
    file: 'RubricCriteria.js',
    account: ACCOUNTS.committee0501,
    // RUB-01 is the seeded rubric with the most criteria, reached through #21's link.
    open: async (page) => {
      await openRubrics(page);
      await openCriteriaVia(page, rubricRow(page, 'RUB-01'));
    },
    detail: /^\/api\/rubrics\/\d+\/criteria\/\d+$/,
    edit: 'แก้ไขเกณฑ์การให้คะแนน',
    remove: 'ลบ',
    confirm: 'ลบเกณฑ์',
  },
  {
    name: 'ผลการเรียนรู้ระดับหลักสูตร',
    file: 'Plos.js',
    account: ACCOUNTS.departmentAdmin05,
    open: (page) => openPlos(page),
    detail: /^\/api\/plos\/\d+$/,
    edit: 'แก้ไขผลการเรียนรู้ของหลักสูตร',
    remove: 'ลบ',
    confirm: 'ลบผลการเรียนรู้',
  },
];

for (const screen of LIST_SCREENS) {
  test.describe(`${screen.name} (${screen.file})`, () => {
    test('a superseded read that lands during a save leaves บันทึก disabled', async ({ page }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const [first, second] = await twoRows(page, 'แก้ไข');

      const read = await gate(page, screen.detail, isGet);
      const write = await gate(page, screen.detail, isWrite, { refusal: REFUSED });

      await button(first, 'แก้ไข').click();
      await read.sent;
      await button(second, 'แก้ไข').click();
      await expect(page.getByRole('heading', { name: screen.edit, exact: true })).toBeVisible();

      const save = button(page, 'บันทึก');
      await save.click();
      await write.sent;

      read.open();
      await read.answered;
      await page.waitForTimeout(SETTLE_MS);
      expect(await save.isDisabled(), 'บันทึก while the save is out').toBe(true);

      write.open();
      await expect(page.getByText(REFUSED)).toBeVisible();
      await expect(save).toBeEnabled();
    });

    test('a read that lands while a removal is out leaves บันทึก disabled', async ({ page }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const [first, second] = await twoRows(page, 'แก้ไข');

      const write = await gate(page, screen.detail, isWrite, { refusal: REFUSED });

      await button(second, screen.remove).click();
      await button(page, screen.confirm).click();
      await write.sent;
      // The confirmation's ยกเลิก is not disabled by the flag: the table comes
      // back with the removal still out.
      await button(page, 'ยกเลิก').click();

      await button(first, 'แก้ไข').click();
      // The read's `finally` commits with the form it opened, so the form on
      // the screen is the settle point.
      await expect(page.getByRole('heading', { name: screen.edit, exact: true })).toBeVisible();
      const save = button(page, 'บันทึก');
      expect(await save.isDisabled(), 'บันทึก while the removal is out').toBe(true);

      write.open();
      await expect(page.getByText(REFUSED)).toBeVisible();
      await expect(save).toBeEnabled();
    });

    test(`a read that ${screen.remove} took the place of still frees the confirmation when it lands`, async ({
      page,
    }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      const [first, second] = await twoRows(page, 'แก้ไข');

      const read = await gate(page, screen.detail, isGet);

      await button(first, 'แก้ไข').click();
      await read.sent;
      await button(second, screen.remove).click();
      const confirm = button(page, screen.confirm);
      // Disabled while the read is out, as it was before #142: the read still
      // holds the screen, it is only not allowed to put down anything else.
      await expect(confirm).toBeDisabled();

      read.open();
      await read.answered;
      await expect(confirm).toBeEnabled();
      await button(page, 'ยกเลิก').click();
    });

    // Only where the form's ยกเลิก is left pressable during a save: on the
    // other four screens it takes the flag too, and this order cannot start.
    if (screen.cancelDuringSave) {
      test('a read of the same row after ยกเลิก leaves บันทึก disabled while its save is out', async ({
        page,
      }) => {
        await signIn(page, screen.account);
        await screen.open(page);
        const [first] = await twoRows(page, 'แก้ไข');
        const heading = page.getByRole('heading', { name: screen.edit, exact: true });
        const save = button(page, 'บันทึก');

        await button(first, 'แก้ไข').click();
        await expect(heading).toBeVisible();
        const write = await gate(page, screen.detail, isWrite, { refusal: REFUSED });
        await save.click();
        await write.sent;
        // The form's ยกเลิก is not disabled by the flag here: the table comes
        // back with the save still out.
        await button(page, 'ยกเลิก').click();
        await expect(heading).toBeHidden();

        await button(first, 'แก้ไข').click();
        // The read's `finally` commits with the form it opened, so the form on
        // the screen is the settle point.
        await expect(heading).toBeVisible();
        expect(await save.isDisabled(), 'บันทึก while the save is out').toBe(true);

        write.open();
        await expect(page.getByText(REFUSED)).toBeVisible();
        await expect(save).toBeEnabled();
      });
    }
  });
}

/**
 * ข้อมูลการเปิดรายวิชา: the same three orders in its own words. The read is
 * ตอนเรียนและผู้สอน, the write the panel's เพิ่มตอนเรียน — whose button is
 * disabled by the flag once a number is typed — and the removal the list's
 * ยกเลิกการเปิด.
 */
const OFFERINGS = {
  name: 'ข้อมูลการเปิดรายวิชา',
  file: 'Offerings.js',
  detail: /^\/api\/offerings\/\d+$/,
  sections: /^\/api\/offerings\/\d+\/sections$/,
  open: 'ตอนเรียนและผู้สอน',
  back: 'กลับไปหน้ารายการ',
  add: 'เพิ่มตอนเรียน',
  cancel: 'ยกเลิกการเปิด',
  confirm: 'ยกเลิกการเปิดรายวิชา',
};

const sectionNumber = (page) => page.getByPlaceholder('เช่น 1 หรือ พ1');

test.describe(`${OFFERINGS.name} (${OFFERINGS.file})`, () => {
  test('a superseded read that lands during a section write leaves เพิ่มตอนเรียน disabled', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const [first, second] = await twoRows(page, OFFERINGS.open);

    const read = await gate(page, OFFERINGS.detail, isGet);
    const write = await gate(page, OFFERINGS.sections, isWrite, { refusal: REFUSED });

    await button(first, OFFERINGS.open).click();
    await read.sent;
    await button(second, OFFERINGS.open).click();
    await expect(button(page, OFFERINGS.back)).toBeVisible();

    const add = button(page, OFFERINGS.add);
    await sectionNumber(page).fill('91');
    await add.click();
    await write.sent;
    // The form empties itself on submit; a number typed again is what leaves
    // the flag as the only thing that can disable the button.
    await sectionNumber(page).fill('92');

    read.open();
    await read.answered;
    await page.waitForTimeout(SETTLE_MS);
    expect(await add.isDisabled(), 'เพิ่มตอนเรียน while the section write is out').toBe(true);

    write.open();
    await expect(page.getByText(REFUSED)).toBeVisible();
    await expect(add).toBeEnabled();
  });

  test('a read of the same panel after กลับไปหน้ารายการ leaves เพิ่มตอนเรียน disabled while its section write is out', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const [first] = await twoRows(page, OFFERINGS.open);
    const back = button(page, OFFERINGS.back);

    const write = await gate(page, OFFERINGS.sections, isWrite, { refusal: REFUSED });

    await button(first, OFFERINGS.open).click();
    await expect(back).toBeVisible();
    await sectionNumber(page).fill('91');
    await button(page, OFFERINGS.add).click();
    await write.sent;
    // กลับไปหน้ารายการ is not disabled by the flag: the list comes back with the
    // section write still out.
    await back.click();
    await expect(back).toBeHidden();

    const [again] = await twoRows(page, OFFERINGS.open);
    await button(again, OFFERINGS.open).click();
    // The read's `finally` commits with the panel it opened, so the panel on
    // the screen is the settle point.
    await expect(back).toBeVisible();
    await sectionNumber(page).fill('91');

    const add = button(page, OFFERINGS.add);
    expect(await add.isDisabled(), 'เพิ่มตอนเรียน while the section write is out').toBe(true);

    write.open();
    await write.answered;
    await expect(add).toBeEnabled();
  });

  test('a read that ยกเลิกการเปิด took the place of still frees the confirmation when it lands', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);
    const [first, second] = await twoRows(page, OFFERINGS.open);

    const read = await gate(page, OFFERINGS.detail, isGet);

    await button(first, OFFERINGS.open).click();
    await read.sent;
    await button(second, OFFERINGS.cancel).click();
    const confirm = button(page, OFFERINGS.confirm);
    await expect(confirm).toBeDisabled();

    read.open();
    await read.answered;
    await expect(confirm).toBeEnabled();
    await button(page, 'ยกเลิก').click();
  });
});

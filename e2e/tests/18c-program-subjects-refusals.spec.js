'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { PROGRAMS } = require('../../db/seed');
const { saidBy } = require('../support/confirm-dialog');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { downloadTemplate, headerOf, csv, total } = require('../support/import-panel');
const { openSubjects, importSubjects } = require('../support/subjects-screen');
const {
  PROGRAM_SUBJECTS,
  CELL,
  waitForList,
  openProgramSubjects,
  importProgramSubjects,
  pairRow,
  programFilter,
  filterTo,
  typePicker,
  offered,
  openEditor,
  save,
  startRemoval,
} = require('../support/program-subjects-screen');

/**
 * docs/acceptance/18-program-subjects.md, criterion 8 — who reaches which
 * curriculum.
 *
 * The backend suite proves the same rule at the route. What is here is the
 * half that only a browser shows: that an account which never sees a menu entry
 * is refused all the same when it types the address, and that the reach is
 * drawn — one committee member is *told* which curriculum they hold while the
 * administrator above them is *offered* a choice between both, which is the
 * same fact wearing two faces.
 *
 * A pairing is placed in `0503` first, by an administrator who holds it. Row 8's
 * first half is that the committee of `0503` sees its own curriculum and not
 * `0501`'s, and against an empty table that would be true of a list that failed
 * to load.
 *
 * `mode: 'serial'` because the middle row edits the pairing the first row
 * counts, and puts it back.
 */
test.describe.configure({ mode: 'serial' });

/**
 * This file files a subject and places it in the curriculum - taken out
 * again when the file ends (#134).
 *
 * `support/hold.js` says what it puts back, and what it does not.
 */
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** The catalogue entry this file places, and the curriculum it places it in. */
const OTHERS = '01079841';
const SEEDED = '01076105';

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    // Both writes are the department administrator's: they hold department 05,
    // so the catalogue entry and both curricula under it are theirs.
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openSubjects(page);
    const subjects = headerOf(await downloadTemplate(page));
    await importSubjects(
      page,
      csv(subjects, `${OTHERS},วิชาของหลักสูตรนานาชาติ,International Programme Subject,3,,`),
    );
    await expect(page.getByText('นำเข้าสำเร็จ 1 รายการ')).toBeVisible();

    await openProgramSubjects(page);
    const pairings = headerOf(await downloadTemplate(page));
    await importProgramSubjects(page, csv(pairings, `0503,${OTHERS},required`));
    await expect(page.getByText('นำเข้าสำเร็จ 1 รายการ')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('row 8: the committee of one curriculum is shown that one and only that one', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0503);
  await openProgramSubjects(page);

  // Their own pairing is here, so the table loaded; the seeded pairing of 0501
  // is not, and neither is anything else 18a and 18b placed there. The filter
  // is the server's `program_id = ANY(reach)`, not a query this screen sent.
  await expect(pairRow(page, OTHERS)).toHaveCount(1);
  await expect(pairRow(page, SEEDED)).toHaveCount(0);
  expect(await total(page)).toBe(1);

  // Not asked - so there is no filter to be set wrongly and no option naming a
  // curriculum this account does not hold. Until 16 พ.ย. 2569 the row also read
  // the curriculum's name stated in the filter's place; the owner's answer took
  // it off the screen, and 18a row 1 holds its absence.
  await expect(programFilter(page)).toHaveCount(0);
});

test('row 8: the administrator above both curricula reaches both', async ({ page }) => {
  for (const account of [ACCOUNTS.departmentAdmin05]) {
    await page.context().clearCookies();
    await signIn(page, account);
    await openProgramSubjects(page);

    // A choice rather than a statement, which is the other face of the same
    // rule: two curricula are in reach, so the screen has to ask which is being
    // read.
    // The owner's answer of 17 พ.ย. 2569: the work is done one curriculum at a time,
    // so the list has no หลักสูตร column - read here, on the account that
    // reaches two, where the column was the only thing telling rows apart.
    await expect(
      page.locator('table').first().locator('thead th'),
      'the list has no หลักสูตร column',
    ).toHaveText(['รหัสวิชา', 'ชื่อวิชา', 'หน่วยกิต', 'ประเภท', 'สถานะ', 'ดำเนินการ']);

    // And the choice is of one curriculum at a time: no *ทุกหลักสูตร*, and the
    // list opens on the first.
    const options = await offered(programFilter(page));
    expect(options, `${account} should be offered both curricula`).toEqual(
      expect.arrayContaining(['0501', '0503']),
    );
    expect(options, 'and never every curriculum at once').not.toContain('');
    await expect(programFilter(page), 'the list opens on the first').toHaveValue('0501');

    // And reaching is not only listing. The editor reads the pair back from the
    // server, and a pair out of reach answers the same 404 as one that was
    // never made - so opening it on a row of each curriculum is the rule being
    // enforced rather than a menu being generous.
    // Through the filter, which is the only way to reach the second
    // curriculum's rows: the list is one curriculum's, and it opened on 0501.
    await openEditor(page, SEEDED);
    await page.getByRole('button', { name: 'ยกเลิก' }).click();

    await filterTo(page, '0503');
    await openEditor(page, OTHERS);
    await page.getByRole('button', { name: 'ยกเลิก' }).click();
  }

  // One real edit, on the curriculum this account does not sit on the
  // committee of - and put back, because the row above counts what is here.
  await openEditor(page, OTHERS);
  await typePicker(page).selectOption('elective');
  await save(page);
  await expect(pairRow(page, OTHERS).getByRole('cell').nth(CELL.type)).toHaveText('วิชาเลือก');

  await openEditor(page, OTHERS);
  await typePicker(page).selectOption('required');
  await save(page);
  await expect(pairRow(page, OTHERS).getByRole('cell').nth(CELL.type)).toHaveText('วิชาบังคับ');
});

test('row 8: a curriculum is not the central administrator\'s, the faculty\'s or a teacher\'s', async ({
  page,
}) => {
  for (const account of [ACCOUNTS.systemAdmin, ACCOUNTS.teacherOne, ACCOUNTS.facultyAdmin]) {
    await page.context().clearCookies();
    await signIn(page, account);

    const [answer] = await Promise.all([waitForList(page), page.goto(PROGRAM_SUBJECTS)]);

    // The half of the row that is enforced. The missing menu entry is a
    // convenience and a drawn thing; this is the rule, and it holds for an
    // account that reached the screen by typing its address. What a curriculum
    // is made of is not the central administrator's decision (ADR-0002),
    // teaching a subject is not choosing it, and since #79 the faculty keeps
    // the list of curricula rather than deciding their contents.
    expect(answer.status(), `${account} should be refused`).toBe(403);
    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();

    // The screen is this screen, drawn and empty, rather than a redirect
    // somewhere else that would satisfy the line above by never having asked.
    await expect(page.getByRole('heading', { name: 'รายวิชาในหลักสูตร', exact: true })).toBeVisible();
    await expect(pairRow(page, SEEDED)).toHaveCount(0);
  }
});

test('#294: the removal question names the curriculum the row is in, not the first one in reach', async ({
  page,
}) => {
  // 18a row 6 reads the curriculum's name in this question, as the committee of
  // 0501 - who holds one curriculum, so the screen's list of curricula has one
  // entry and *the entry the row is in* and *the first entry* are the same one.
  // The lookup's binding is unreachable there. Here the account reaches two, the
  // list opens on 0501, and the row being removed is in 0503: the one situation
  // where a lookup that took the first entry would name the wrong curriculum.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openProgramSubjects(page);
  await filterTo(page, '0503');

  await startRemoval(page, OTHERS);
  const said = await saidBy(page);

  // The whole phrase up to ใช่หรือไม่: 0501's name is a substring of 0503's, so a
  // read of the name alone would pass on the wrong curriculum (#116, #294).
  const curriculum = PROGRAMS.find(entry => entry.id === '0503').th;
  expect(said).toContain(`ออกจากหลักสูตร${curriculum} ใช่หรือไม่`);

  // Answered no: the row above counts the pairings in 0503, and this one stays.
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(pairRow(page, OTHERS)).toHaveCount(1);
});

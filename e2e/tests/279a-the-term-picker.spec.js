'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { byAlias, CURRENT_YEAR, SEMESTER, PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isGet, isWrite } = require('../support/gate');
const { openAt } = require('../support/navigation');
const {
  departmentCommittee,
  signInAsDepartmentCommittee,
} = require('../support/department-committee');
const {
  OFFERINGS,
  API,
  NEXT,
  openOfferings,
  filterToTerm,
  termFilter,
  termOf,
  programFilter,
  listTable,
  openForm,
  subjectPicker,
  copyDialog,
  copySource,
  openCopy,
} = require('../support/offerings-screen');

/**
 * docs/acceptance/23-offerings.md §#279 - the owner's six changes to
 * การเปิดรายวิชาในภาคการศึกษา, 17 พ.ย. 2569.
 *
 * One term picker written `ภาค/ปี` in place of a year box and a semester
 * picker; no *every year*, *every term* or *every curriculum*; no year,
 * semester or curriculum column; ตอนเรียน called กลุ่มเรียน; and the copy a
 * popup opened from the top bar, onto the term the list shows. The decisions
 * behind each are in `CONTEXT.md` (Term, Section) and in #279 itself.
 *
 * The renaming is held where the words are pressed, in `23a` and the files
 * that press the same controls; the copy's target is held by `247c` row 2,
 * which reads the request. What is here is the rest: one row per claim, and
 * not `serial`, because each has its own mutant in
 * `mutation/279-the-term-picker.py` and the first red in a `serial` file
 * stops the rows after it from being read at all (#67, #88).
 *
 * ## Which term is which
 *
 * The current term is the server's (`db/term.js`), so it is read off the
 * seed's `CURRENT_YEAR` and `SEMESTER` and never written as a literal. Row 4
 * needs ภาคปลาย - the one term where a form that always sent ภาคต้น would be
 * wrong (#117, #154) - which is the current term from November to May and the
 * next from June to October; `SECOND` picks it.
 */

/** This file's own subjects, placed in 0501. */
const OPENED = '00279001';
const EARLIER = '00279002';

/** A term older than the current one, which `EARLIER` is opened in so the copy has a source this file knows of. */
const OLDER = { year: String(Number(CURRENT_YEAR) - 3), semester: 1 };

/** Of the current and the next term, the one that is ภาคปลาย. */
const SECOND =
  Number(SEMESTER) === 2 ? { year: CURRENT_YEAR, semester: 2 } : { year: NEXT.year, semester: 2 };

const TERMS = '/api/offerings/terms';
const isTerms = answer =>
  new URL(answer.url()).pathname === TERMS && answer.request().method() === 'GET';

const SETTLE_MS = 500;

let release;
test.beforeAll(async () => {
  release = await hold();
  const admin = byAlias('U_ADMIN');
  const db = createPool({ schema: E2E_SCHEMA });
  try {
    for (const code of [OPENED, EARLIER]) {
      await db.query(
        `INSERT INTO subjects (subject_id, subject_name_th, subject_name_en, credits, department_id, created_by)
         VALUES ($1, $2, $3, 3, '05', $4)`,
        [code, `วิชาของแถว #279 ${code}`, `Subject for #279 ${code}`, admin],
      );
      await db.query(
        `INSERT INTO program_subjects (program_id, subject_id, subject_type, created_by)
         VALUES ($1, $2, 'required', $3)`,
        [PROGRAM, code, admin],
      );
    }
    await db.query(
      `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
       VALUES ($1, $2, $3, $4)`,
      [PROGRAM, EARLIER, OLDER.year, OLDER.semester],
    );
  } finally {
    await db.end();
  }
});
test.afterAll(() => release());

/** Opens the screen and hands back the terms answer it read on the way. */
async function openWithTerms(page) {
  const terms = page.waitForResponse(isTerms);
  await openOfferings(page);
  return (await terms).json();
}

test('row 1: the term picker offers the terms this curriculum ran, the current and the next, newest first, and opens on the current', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  const answer = await openWithTerms(page);

  // The premise: the server offers the current and the next whether or not
  // anything is open in them, which the backend's own suite holds.
  const labels = answer.terms.map(term => `${term.semester}/${term.academic_year}`);
  expect(labels, 'the current term is among those offered').toContain(
    termOf(CURRENT_YEAR, SEMESTER),
  );

  await expect(
    termFilter(page).locator('option'),
    'every term the server offered, written ภาค/ปี, in the order it gave them',
  ).toHaveText(labels);
  await expect(termFilter(page), 'and the list opens on the current term').toHaveValue(
    termOf(CURRENT_YEAR, SEMESTER),
  );
});

test.describe('as a committee member of the whole department', () => {
  // Two curricula, so the curriculum picker is drawn at all: a committee
  // granted at one curriculum is drawn no picker (`21a`'s reason).
  let releaseCommittee;
  test.beforeAll(async ({ playwright }) => {
    releaseCommittee = await departmentCommittee(playwright);
  });
  test.afterAll(async () => {
    const trouble = releaseCommittee ? await releaseCommittee() : null;
    if (trouble) throw new Error(trouble);
  });

  test('row 2: no picker offers every curriculum or every term', async ({ page }) => {
    await signInAsDepartmentCommittee(page);
    await openOfferings(page);

    await expect(programFilter(page), 'the curriculum picker is drawn').toBeVisible();
    const programs = programFilter(page).locator('option');
    expect(await programs.count(), 'the department reaches two curricula').toBeGreaterThan(1);

    await expect(
      programFilter(page).locator('option[value=""]'),
      'no ทุกหลักสูตร - the work is done one curriculum at a time',
    ).toHaveCount(0);
    await expect(
      termFilter(page).locator('option[value=""]'),
      'no ทุกภาค and no ทุกปี - one term at a time',
    ).toHaveCount(0);
    await expect(
      programFilter(page),
      'and it opens on the first curriculum it offers',
    ).toHaveValue(await programs.first().getAttribute('value'));
  });
});

test('row 3: the list has no year, semester or curriculum column', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);

  await expect(
    listTable(page).locator('thead th'),
    'the term is the picker\'s and the curriculum the screen\'s, so neither is a column',
  ).toHaveText(['รหัสวิชา', 'ชื่อวิชา', 'กลุ่มเรียน', 'ดำเนินการ']);
});

test('row 4: the form opens a subject in the term the list shows', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  await filterToTerm(page, SECOND.year, SECOND.semester);

  await openForm(page);
  await expect(
    page.getByRole('heading', { name: `เปิดรายวิชาในภาคการศึกษา ${termOf(SECOND.year, 2)}` }),
    'the form says which term it opens in',
  ).toBeVisible();
  await expect(subjectPicker(page).locator(`option[value="${OPENED}"]`)).toHaveCount(1);
  await subjectPicker(page).selectOption(OPENED);

  const [sent] = await Promise.all([
    page.waitForRequest(
      request => new URL(request.url()).pathname === API && request.method() === 'POST',
    ),
    page.getByRole('button', { name: 'เปิดรายวิชา', exact: true }).click(),
  ]);
  const body = sent.postDataJSON();
  expect(
    { year: body.academic_year, semester: body.semester },
    'the term the list shows, and not one the form chose',
  ).toEqual({ year: SECOND.year, semester: 2 });
});

test('row 5: the copy offers the terms before the shown one that ran, the nearest first', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  const answer = await openWithTerms(page);
  const shown = { academic_year: CURRENT_YEAR, semester: Number(SEMESTER) };
  const before = answer.terms.filter(
    term =>
      term.offered &&
      (Number(term.academic_year) < Number(shown.academic_year) ||
        (term.academic_year === shown.academic_year && Number(term.semester) < shown.semester)),
  );
  expect(
    before.map(term => `${term.semester}/${term.academic_year}`),
    'the precondition: this file\'s older term is among them',
  ).toContain(termOf(OLDER.year, OLDER.semester));

  await openCopy(page);
  await expect(
    copySource(page).locator('option'),
    'the terms before this one that ran, newest first - not this one and not a later one',
  ).toHaveText(before.map(term => `${term.semester}/${term.academic_year}`));
  await expect(copySource(page), 'the nearest chosen').toHaveValue(
    `${before[0].academic_year}:${before[0].semester}`,
  );
});

test('row 6: the list is not read before the curriculum and its terms are known', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  const reads = [];
  const onRequest = request => {
    const url = new URL(request.url());
    if (url.pathname === API && request.method() === 'GET') reads.push(url);
  };
  page.on('request', onRequest);
  try {
    await openAt(page, OFFERINGS, fenced => fenced.waitForResponse(isTerms));
    await expect(termFilter(page)).toHaveValue(termOf(CURRENT_YEAR, SEMESTER));
    await page.waitForTimeout(SETTLE_MS);
  } finally {
    page.off('request', onRequest);
  }

  expect(
    reads.map(url => ({
      program: url.searchParams.get('program_id'),
      year: url.searchParams.get('academic_year'),
      semester: url.searchParams.get('semester'),
    })),
    'one read, of one curriculum in one term - a read before the terms would be of every term',
  ).toEqual([{ program: PROGRAM, year: CURRENT_YEAR, semester: String(SEMESTER) }]);
});

test('row 7: while a copy is out the popup cannot be closed and its source cannot be changed', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  await openCopy(page);

  // Answered by the gate, so nothing is copied: what is on trial is the window.
  const held = await gate(page, /^\/api\/offerings\/copy$/, isWrite, {
    success: {
      created: [],
      skipped_existing: [],
      skipped_unplaced: [],
      skipped_closed: [],
      dropped_teachers: [],
      sections: 0,
    },
  });
  await copyDialog(page).getByRole('button', { name: 'คัดลอก', exact: true }).click();
  await held.sent;

  await expect(
    copyDialog(page).getByRole('button', { name: 'ปิด', exact: true }),
    'ปิด while the copy is out',
  ).toBeDisabled();
  await expect(copySource(page), 'the source while the copy is out').toBeDisabled();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(SETTLE_MS);
  await expect(copyDialog(page), 'Escape while the copy is out').toBeVisible();

  held.open();
  await held.answered;
  await expect(copyDialog(page).getByRole('button', { name: 'ปิด', exact: true })).toBeEnabled();
});

test('row 8: before the terms are known nothing that needs a term can be pressed', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  const held = await gate(page, /^\/api\/offerings\/terms$/, isGet);
  await page.goto(OFFERINGS);
  await held.sent;
  await page.waitForTimeout(SETTLE_MS);

  await expect(termFilter(page), 'the term picker').toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'คัดลอกจากภาคการศึกษาก่อน', exact: true }),
    'the copy, which copies onto the term shown',
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'เปิดรายวิชา', exact: true }),
    'the form, which opens a subject in the term shown',
  ).toBeDisabled();

  held.open();
  await held.answered;
  await expect(termFilter(page)).toBeEnabled();
});

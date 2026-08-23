'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { CURRENT_YEAR, SEMESTER } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { downloadTemplate, headerOf, csv } = require('../support/import-panel');
const { openSubjects, importSubjects } = require('../support/subjects-screen');
const {
  openProgramSubjects,
  importProgramSubjects,
} = require('../support/program-subjects-screen');
const {
  openOfferings,
  filterToTerm,
  offeringRow,
  openForm,
  openSubject,
  openSections,
  backToList,
  sectionCard,
  addSection,
  assignTeachers,
  teachersOf,
  startRemoval,
  confirmDialog,
  copyFromTerm,
} = require('../support/offerings-screen');

/**
 * docs/acceptance/23-offerings.md — the term being planned, read through the
 * screen that plans it.
 *
 * The backend suite already proves what the routes answer. What only a browser
 * can show is the half these rows are about: that the section number a person
 * types twice comes back refused *and the section list is still what it was*,
 * that reassigning teachers replaces the set rather than adding to it, that a
 * removal asks before it acts and that cancelling really does nothing, and that
 * an Offering the server protects stays on the screen after the refusal.
 *
 * `mode: 'serial'` because these rows build one term and then read it: row 1
 * opens the subject rows 2 to 5 work inside, and row 6 copies the whole of it.
 * Each still makes the state it asserts on rather than inheriting an assertion.
 *
 * The subject this file opens is its own, made in `beforeAll` with a code of
 * its own. The seeded `01076105` is not usable for it: `16a-subjects.spec.js`
 * runs first against the same schema and its row 82 closes that catalogue entry
 * to show a referenced subject is deactivated rather than deleted, and a closed
 * entry is not offered here - correctly, since opening one is refused. A row
 * that leaned on it would be a row whose meaning depends on a file it never
 * mentions, and one that broke the day `16a` was reordered.
 *
 * The seeded subject is still what row 5 uses, because what row 5 needs is the
 * Offering the seed hangs 113 enrolments and their marks off, and that is on
 * `01076105` whatever its catalogue entry now says.
 *
 * The term this file builds is the year after the seed's, which no seed and no
 * other spec touches - the seed opens its Offerings in the current term and the
 * one before it, and row 5 needs the current one still to be there. Counted off
 * the seed rather than spelled out: the seed takes its term from the calendar
 * now, so a written-down year is free only until the calendar reaches it.
 */
test.describe.configure({ mode: 'serial' });

/**
 * The catalogue entry this file opens, and the หลักสูตร it is placed in.
 *
 * `01079851` because the invented-subject space is already crowded and a
 * collision here is a rejected import ten minutes into a full run, whose only
 * symptom is a missing toast on a screen this file is not about. What is taken:
 * `010797NN` by `57a`'s pager rows, `0107981N` by `18a`, `010798(21..30)` by
 * `18b`'s import, `01079841` by `18c`, and `010799(01..03)` by `16a`.
 * `010798` fifty-one upward is therefore left to this file, and the next screen that
 * needs invented subjects should take a block of its own rather than a code.
 */
const SUBJECT = '01079851';
const PROGRAM = '0501';

/** The seeded Offering, the one with enrolments and marks hanging off it. */
const SEEDED = '01076105';

const YEAR = String(Number(CURRENT_YEAR) + 1);

const TEACHER_ONE = 'ดร. อนันต์ สอนดี';
const TEACHER_TWO = 'ดร. ภัทรา ว่างสอน';

/**
 * A subject in the catalogue and placed into หลักสูตร 0501, through the two
 * screens that own those facts rather than written into the database.
 *
 * `dept.admin.05@` is the only account that reaches ข้อมูลรายวิชา for
 * department 05 since #61, and the placement is the committee's own.
 */
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openSubjects(page);
    const subjects = headerOf(await downloadTemplate(page));
    const made = await importSubjects(
      page,
      csv(subjects, `${SUBJECT},วิชาสำหรับการเปิดสอน,Offering Test Subject,3,05,,`),
    );
    // Asserted on the answer rather than on the toast. This runs tenth in a
    // full suite and first in a single-file one, and when it failed there it
    // was the toast that was missing, which says nothing about why. The body
    // names the rejected line.
    expect(await made.text(), 'catalogue entry').toContain('"created":1');

    await page.context().clearCookies();
    await signIn(page, ACCOUNTS.committee0501);
    await openProgramSubjects(page);
    const pairings = headerOf(await downloadTemplate(page));
    const placed = await importProgramSubjects(
      page,
      csv(pairings, `${PROGRAM},${SUBJECT},required`),
    );
    expect(await placed.text(), 'placement').toContain('"created":1');
  } finally {
    await context.close();
  }
});

test('row 1: a committee member opens a subject for a chosen year and semester', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);

  await openForm(page);
  await openSubject(page, { subject: SUBJECT, year: YEAR, semester: 1 });

  // Opening a subject lands on its sections rather than back on the list: an
  // Offering with no ตอนเรียน is not yet anything a teacher can reach, and the
  // next thing to do is always to add one.
  await expect(page.getByRole('button', { name: 'กลับไปหน้ารายการ' })).toBeVisible();
  await expect(page.getByText('ยังไม่มีตอนเรียนในรายวิชาที่เปิดสอนนี้')).toBeVisible();

  await backToList(page);
  await filterToTerm(page, YEAR, 1);
  await expect(offeringRow(page, SUBJECT)).toHaveCount(1);
});

test('row 2: several sections, and the same number twice is refused', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  await filterToTerm(page, YEAR, 1);
  await openSections(page, SUBJECT);

  await addSection(page, '1');
  await addSection(page, '2');
  await expect(sectionCard(page, '1')).toHaveCount(1);
  await expect(sectionCard(page, '2')).toHaveCount(1);

  // The third criterion, through the screen. What matters as much as the
  // message is that the panel is still showing two sections: a refusal that
  // left a phantom third on the screen would read as having worked.
  await addSection(page, '1');
  await expect(page.getByText(REFUSALS.duplicateSectionNumber)).toBeVisible();
  // Named list items only: the shell's own menu is a list too, and an
  // unqualified `listitem` count would be counting the sidebar.
  await expect(page.getByRole('listitem', { name: /^ตอนเรียน / })).toHaveCount(2);
});

test('row 4: teachers are assigned, and reassigning replaces them', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  await filterToTerm(page, YEAR, 1);
  await openSections(page, SUBJECT);

  await expect(sectionCard(page, '1').getByText('ยังไม่ได้กำหนดผู้สอน')).toBeVisible();

  await assignTeachers(page, '1', [TEACHER_ONE, TEACHER_TWO]);
  await expect(teachersOf(page, '1')).toHaveText([TEACHER_ONE, TEACHER_TWO]);

  // The half the backend cannot show: the box is a replacement, so a person
  // un-ticked is a person taken off the class. A control that could only add
  // would leave both here and pass every server-side test.
  await assignTeachers(page, '1', [TEACHER_TWO]);
  await expect(teachersOf(page, '1')).toHaveText([TEACHER_TWO]);
});

test('row 8: removing a section asks first, and cancelling does nothing', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  await filterToTerm(page, YEAR, 1);
  await openSections(page, SUBJECT);

  await sectionCard(page, '2').getByRole('button', { name: 'ลบตอนเรียน' }).click();
  await expect(confirmDialog(page)).toBeVisible();

  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(confirmDialog(page)).toHaveCount(0);
  await expect(sectionCard(page, '2')).toHaveCount(1);

  await sectionCard(page, '2').getByRole('button', { name: 'ลบตอนเรียน' }).click();
  await page.getByRole('button', { name: 'ลบตอนเรียน', exact: true }).last().click();
  await expect(page.getByText('ลบตอนเรียนเรียบร้อยแล้ว')).toBeVisible();
  await expect(sectionCard(page, '2')).toHaveCount(0);
  await expect(sectionCard(page, '1')).toHaveCount(1);
});

test('row 8: an Offering with enrolled students is refused and stays on the screen', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  // The seeded term: 113 students enrolled and their marks recorded.
  await filterToTerm(page, CURRENT_YEAR, SEMESTER);

  await startRemoval(page, 'ยกเลิกการเปิด');
  await expect(confirmDialog(page)).toBeVisible();
  await page.getByRole('button', { name: 'ยกเลิกการเปิดรายวิชา' }).click();

  await expect(page.getByText(REFUSALS.offeringInUse)).toBeVisible();
  // Refused rather than switched off: there is no such state here, so the row
  // has to come back exactly as it was. A screen that removed it optimistically
  // and left the banner underneath would be telling the person two things.
  await expect(offeringRow(page, SEEDED)).toHaveCount(1);

  // And the section beneath it is protected for the same reason.
  await openSections(page, SEEDED);
  await sectionCard(page, '1').getByRole('button', { name: 'ลบตอนเรียน' }).click();
  await page.getByRole('button', { name: 'ลบตอนเรียน', exact: true }).last().click();
  await expect(page.getByText(REFUSALS.sectionInUse)).toBeVisible();
  await expect(sectionCard(page, '1')).toHaveCount(1);
});

test('row 7: a whole term is copied, and the screen says what it did', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);

  // 1 → 3: a copy onto a term this file has not touched is a copy whose
  // report is about the copy and nothing else.
  await copyFromTerm(page, { year: YEAR, semester: 1 }, { year: YEAR, semester: 3 });

  await expect(page.getByText(/คัดลอกเรียบร้อยแล้ว เปิดรายวิชาใหม่ 1 รายวิชา/)).toBeVisible();

  // The sections came with it, and so did the teaching: row 4 left one teacher
  // on section 1 and that is what the copy has to reproduce.
  await filterToTerm(page, YEAR, 3);
  await expect(offeringRow(page, SUBJECT)).toHaveCount(1);
  await openSections(page, SUBJECT);
  await expect(sectionCard(page, '1')).toHaveCount(1);
  await expect(teachersOf(page, '1')).toHaveText([TEACHER_TWO]);

  // Pressing it again creates nothing and says which subjects were already
  // there — the outcome a single count would have hidden.
  await backToList(page);
  await copyFromTerm(page, { year: YEAR, semester: 1 }, { year: YEAR, semester: 3 });
  await expect(page.getByText('ไม่มีรายวิชาใดถูกคัดลอก รายละเอียดอยู่ในกล่องด้านล่าง')).toBeVisible();
  await expect(page.getByText(`ข้ามเพราะเปิดสอนอยู่แล้ว 1 รายวิชา — ${SUBJECT}`)).toBeVisible();
});

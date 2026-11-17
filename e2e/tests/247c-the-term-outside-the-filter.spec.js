'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { byAlias, CURRENT_YEAR, SEMESTER, PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { OUTSIDE_THE_FILTER } = require('../support/outside-the-filter');
const {
  API,
  openOfferings,
  filterToTerm,
  offeringRow,
  termOf,
  copyDialog,
  copySource,
  openCopy,
} = require('../support/offerings-screen');

/**
 * docs/acceptance/23-offerings.md §#247 - the **second** save on this screen.
 *
 * #247 landed the owner's answer ข้อ จ on the row form of seven screens. The
 * review of 29 ตุลาคม 2569 found that this screen has two saves and not one:
 * `CopyTermPanel`'s *ไปยังภาคการศึกษา* writes `academic_year` and `semester`,
 * which are two of the three filters `load` reads, so a copy into one term
 * while the list is on another opened rows the person could not see and the
 * screen said *คัดลอกเรียบร้อยแล้ว เปิดรายวิชาใหม่ N รายวิชา* over a list
 * holding none of them.
 *
 * The census could not have found it and says so in its own docblock: it asks
 * the **file** and not each `error: false` object, so a screen that wraps one
 * sentence and leaves another bare is green (#226's shape - what an instrument
 * cannot measure is written where the count is).
 *
 * Two rows, and **not** `serial`: the positive one and the control are two
 * claims and two mutants, and the first red in a `serial` file stops the second
 * from running at all (#67, #88).
 *
 * The year is this file's own, four on from the seed's - `23a` takes +1, `140a`
 * +2 and `203a` +3 - and the emptiness of each term is asserted rather than
 * assumed, because a term another spec had filled would make row 1 true for the
 * wrong reason (#129).
 *
 * The term the list is **on** is never the term being copied *from*, although
 * that is the sequence the ticket describes. The subjects a copy opens are the
 * subjects the source term already holds, so a reader keyed on the code finds
 * the source's own row and reads as *the copy is in this list* - a locator
 * built out of a value is a claim about the DOM and this one would be false
 * (#118). The first draft of row 1 failed exactly there, which is the reason
 * written down rather than the reason guessed at.
 *
 * ## Since 17 พ.ย. 2569 (#279)
 *
 * The owner's answer in #279 made the copy a popup whose **target is the term
 * the list shows**, named in the popup and not a field. A copy into a term the
 * list is not on can no longer be made, so `outside` is false on every copy and
 * row 1's claim has no way in: the mutant that held it,
 * `247:offeringscopynosuffix`, is withdrawn to a record. Row 1 stays as a net
 * and reads the **mechanism** instead (#203) - the popup has one picker, the
 * source, and the request it sends names the term the list is on - with the
 * condition that would make the old claim reachable again: a target the person
 * can pick inside the popup.
 *
 * Row 2 is the control and keeps its claim. Its term has to be one the picker
 * offers, which since #279 is a term the curriculum ran, the current or the
 * next, so one Offering of this file's own subject is written into it first
 * and the precondition reads *that one and nothing else* where it read *empty*.
 */

/**
 * This file's own subject, placed in 0501 and opened only in row 2's term:
 * the seed's term holds the seeded subject alone, so an anchor of that subject
 * would be skipped by the copy and leave it opening nothing.
 */
const ANCHOR = '00247301';

/** The term the seed fills, which is what there is to copy. */
const SOURCE = { year: CURRENT_YEAR, semester: SEMESTER };

/** This file's own year. */
const YEAR = String(Number(CURRENT_YEAR) + 4);

let release;
test.beforeAll(async () => {
  release = await hold();
  const admin = byAlias('U_ADMIN');
  const db = createPool({ schema: E2E_SCHEMA });
  try {
    await db.query(
      `INSERT INTO subjects (subject_id, subject_name_th, subject_name_en, credits, department_id, created_by)
       VALUES ($1, 'วิชาของแถว #247c', 'Subject for #247c', 3, '05', $2)`,
      [ANCHOR, admin],
    );
    await db.query(
      `INSERT INTO program_subjects (program_id, subject_id, subject_type, created_by)
       VALUES ($1, $2, 'required', $3)`,
      [PROGRAM, ANCHOR, admin],
    );
    await db.query(
      `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
       VALUES ($1, $2, $3, 2)`,
      [PROGRAM, ANCHOR, YEAR],
    );
  } finally {
    await db.end();
  }
});
test.afterAll(() => release());

/**
 * Filters the table to row 2's term and reads the answer to say it holds the
 * anchor and nothing else.
 *
 * The precondition is read off the answer and not off the table: a term
 * another spec had filled would make the row true for the wrong reason (#129),
 * and counting drawn rows cannot tell a sentence in the first cell from a row
 * (#164). It read *empty* until 17 พ.ย. 2569, when a term nobody ran stopped
 * being one the picker offers (#279).
 */
async function filterToAnchoredTerm(page, semester) {
  const [answered] = await Promise.all([
    page.waitForResponse(
      a =>
        new URL(a.url()).pathname === API &&
        a.request().method() === 'GET' &&
        new URL(a.url()).searchParams.get('academic_year') === YEAR &&
        new URL(a.url()).searchParams.get('semester') === String(semester),
    ),
    filterToTerm(page, YEAR, semester),
  ]);
  const { offerings } = await answered.json();
  expect(
    offerings.map(row => row.subject_id),
    'the precondition: this term holds the anchor alone, so the list is the copy and the anchor',
  ).toEqual([ANCHOR]);
}

/**
 * Picks the seed's term as the source in the popup and presses คัดลอก, handing
 * back the request and what the answer said.
 *
 * `copyFromTerm` in the support module does the same and throws the report
 * away; these rows need it, because what the sentence has to be is built from
 * the count the server reported and not from a number typed into the row - a
 * pinned count would be a claim about the seed and not about the sentence.
 */
async function copyInto(page) {
  await openCopy(page);
  await copySource(page).selectOption(`${SOURCE.year}:${SOURCE.semester}`);

  const [answer] = await Promise.all([
    page.waitForResponse(
      a => new URL(a.url()).pathname === `${API}/copy` && a.request().method() === 'POST',
    ),
    copyDialog(page).getByRole('button', { name: 'คัดลอก', exact: true }).click(),
  ]);
  expect(answer.status()).toBe(200);
  const report = await answer.json();
  expect(report.created.length, 'the precondition of both claims: the copy opened rows').toBeGreaterThan(0);
  return { asked: answer.request().postDataJSON(), report };
}

const copied = report =>
  `คัดลอกเรียบร้อยแล้ว เปิดรายวิชาใหม่ ${report.created.length} รายวิชา รวม ${report.sections} กลุ่มเรียน`;

test('row 1: a term copied into a term the table is not on', async ({ page }) => {
  // A net since 17 พ.ย. 2569 (#279) - see the docblock. What it reads is why
  // the claim has no way in: the popup offers a source and nothing else, names
  // the term the list is on as its target, and sends that term. The copy is not
  // pressed, so this row writes nothing; the request is read off the press in
  // row 2, which is the one that copies.
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  await filterToTerm(page, YEAR, 2);
  await openCopy(page);

  await expect(
    copyDialog(page).getByRole('combobox'),
    'one picker in the popup, the source - the target is not a field',
  ).toHaveCount(1);
  await expect(copySource(page)).toHaveCount(1);
  await expect(
    copyDialog(page).getByText(`คัดลอกมายังภาคการศึกษา ${termOf(YEAR, 2)}`),
    'the popup names the term the list is on as where the copy goes',
  ).toBeVisible();
});

test('row 2: a term copied into the term the table is on', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);

  await filterToAnchoredTerm(page, 2);

  const { asked, report } = await copyInto(page);
  expect(
    { year: asked.academic_year, semester: asked.semester },
    'the copy goes to the term the list is on - the mechanism row 1 stands on (#279)',
  ).toEqual({ year: YEAR, semester: 2 });

  await expect(
    page.getByRole('status'),
    'nothing added to a report whose own list holds the rows',
  ).toHaveText(copied(report));
  await expect(
    offeringRow(page, report.created[0].subject_id),
    'which the list does',
  ).toHaveCount(1);
});

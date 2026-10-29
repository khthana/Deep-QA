'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { CURRENT_YEAR, SEMESTER } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { OUTSIDE_THE_FILTER } = require('../support/outside-the-filter');
const {
  API,
  openOfferings,
  filterToTerm,
  offeringRow,
  copyControls,
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
 */

/** The term the seed fills, which is what there is to copy. */
const SOURCE = { year: CURRENT_YEAR, semester: SEMESTER };

/** This file's own year. */
const YEAR = String(Number(CURRENT_YEAR) + 4);

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/**
 * Filters the table to a term of this file's own year and reads the answer to
 * say it is empty.
 *
 * The precondition is read off the answer and not off the table: an empty list
 * is drawn as a sentence rather than as rows, so counting rows would pass on an
 * empty term and on a full one alike (#164).
 */
async function filterToEmptyTerm(page, semester) {
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
  const { total } = await answered.json();
  expect(total, 'the precondition: nothing is in this term, so the list is the copy or nothing').toBe(
    0,
  );
}

/**
 * Fills both ends of the copy panel and presses คัดลอก, handing back what the
 * answer said.
 *
 * `copyFromTerm` in the support module does the same and throws the report
 * away; these rows need it, because what the sentence has to be is built from
 * the count the server reported and not from a number typed into the row - a
 * pinned count would be a claim about the seed and not about the sentence.
 */
async function copyInto(page, to) {
  const { fromYear, toYear, fromTerm, toTerm } = await copyControls(page);
  await fromYear.fill(String(SOURCE.year));
  await fromTerm.selectOption(String(SOURCE.semester));
  await toYear.fill(String(to.year));
  await toTerm.selectOption(String(to.semester));

  const [answer] = await Promise.all([
    page.waitForResponse(
      a => new URL(a.url()).pathname === `${API}/copy` && a.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'คัดลอก' }).click(),
  ]);
  expect(answer.status()).toBe(200);
  const report = await answer.json();
  expect(report.created.length, 'the precondition of both claims: the copy opened rows').toBeGreaterThan(0);
  return report;
}

const copied = report =>
  `คัดลอกเรียบร้อยแล้ว เปิดรายวิชาใหม่ ${report.created.length} รายวิชา รวม ${report.sections} ตอนเรียน`;

test('row 1: a term copied into a term the table is not on', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);

  // Looking at one term of next year and copying into another: the sequence is
  // the ticket's, with the source term kept out of the list for the reason in
  // the docblock above.
  await filterToEmptyTerm(page, 3);

  const report = await copyInto(page, { year: YEAR, semester: 1 });

  await expect(
    page.getByRole('status'),
    "the copy's own report, and the shared sentence saying the rows are not in this list",
  ).toHaveText(`${copied(report)} ${OUTSIDE_THE_FILTER}`);

  // And they are not: the table is still the empty term it was filtered to.
  await expect(
    offeringRow(page, report.created[0].subject_id),
    'the list the sentence stands over holds none of the rows the copy opened',
  ).toHaveCount(0);
});

test('row 2: a term copied into the term the table is on', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);

  await filterToEmptyTerm(page, 2);

  const report = await copyInto(page, { year: YEAR, semester: 2 });

  await expect(
    page.getByRole('status'),
    'nothing added to a report whose own list holds the rows',
  ).toHaveText(copied(report));
  await expect(
    offeringRow(page, report.created[0].subject_id),
    'which the list does',
  ).toHaveCount(1);
});

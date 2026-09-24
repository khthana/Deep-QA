'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { linesOf, bare, splitOf, seamsInsideAToken, overflowOf } = require('../support/line-breaks');
// The locators, but deliberately not `saidBy` - taking the joiners out is
// what this file is here to measure.
const { panel, messageOf } = require('../support/confirm-dialog');
const improvement = require('../support/improvement-screen');
const offerings = require('../support/offerings-screen');
const rubrics = require('../support/rubrics-screen');

/**
 * #118 - the one dialog every deletion in the system uses, and where it is
 * allowed to break a Thai sentence.
 *
 * **What the ticket suspected, and what it turned out to be.** The ticket named
 * two candidates: `break-words` on the paragraph, and the 384px `max-w-sm` that
 * makes the sentence wrap at all. Both were measured, and so were two more
 * nobody had named - `lang="th"` on the paragraph, and `word-break: keep-all` -
 * and none of the four moves the break by a single character. The paragraph
 * never overflows, so `break-words` never fires; the break at `ปีการ|ศึกษา` is
 * a break opportunity Chromium *chose*, because ICU segments the run as
 * `ใน|ปี|การ|ศึกษา` and a boundary after `การ` is a legitimate one to it.
 * `ConfirmDialog` says so in full.
 *
 * **What these rows therefore assert.** Not that a class is present - the class
 * list is what was asked for, not what the browser did. Where the lines
 * actually ended, read off each character's own client rect. Two shapes of
 * claim:
 *
 * * *this word is drawn whole* - the ticket's own criterion, and the one a
 *   reader of the dialog would state;
 * * *every line ended on a space somebody wrote* - the rule the fix installs,
 *   which is stronger and is what a mutant has to break.
 *
 * Rows 3 and 4 are the other half, and they are here because a fix that stops
 * all breaking would pass both claims above while making the dialog worse: a
 * name with no break opportunity in it has to break rather than run out of the
 * box. That is what `break-words` was for, and until this file nothing measured
 * it.
 *
 * **Why both a Latin one and a Thai one.** They are not the same row, and the
 * sweep is what said so. Row 3's Latin identifier is the ticket's own fourth
 * criterion, and it is blind to the design question: the alternative that was
 * measured and not taken - `white-space: nowrap` per space-delimited token -
 * leaves a Latin token alone and passes row 3 comfortably. What it cannot do is
 * break a *Thai* run that is longer than the line, and that is row 4, where it
 * runs 213px past the edge of a 384px dialog. Row 4 was written because
 * `nowrapinstead` survived a sweep this file had predicted would kill it.
 *
 * Rows 1 to 4 cancel their dialogs. None of them confirms - what is being
 * measured is the question, not the deletion.
 *
 * Row 5 is a different species and is marked on no sheet: it asserts the
 * *premise* - that ICU offers the boundary at all - rather than a criterion. It
 * is here because criterion 2 asks for the cause, and a cause that lives only in
 * prose expires without anybody noticing. No mutant can kill it, for the same
 * reason no mutant can kill an attribute a locator is built on (#85).
 */

const dismiss = page => page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();

/** Reads the drawn lines and reports them whichever way the row fails. */
async function drawn(page) {
  const lines = await linesOf(messageOf(page));
  return { lines, text: bare(lines).join(''), shown: bare(lines).join('\n') };
}

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

test('row 1: the sentence the ticket was written about keeps ปีการศึกษา whole', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [sectionId] = await improvement.mySectionIds(page);
  const found = (await improvement.planOf(page, sectionId)).entries;
  for (const entry of found) await improvement.clearEntry(page, sectionId, entry.entry_id);

  try {
    await improvement.openPlan(page, sectionId);
    await improvement.chooseClo(page, 'CLO-3');
    await improvement.writeSection(page, 'SUMMARY', 'ข้อความสำหรับแถวของ #118');
    await page
      .getByRole('button', { name: `ลบ${improvement.LABELS.SUMMARY}`, exact: true })
      .click();
    await page.getByRole('button', { name: 'ลบ', exact: true }).waitFor();

    const { lines, shown } = await drawn(page);

    // The row is only about wrapping if the sentence wraps. Before the fix this
    // sentence drew on three lines; a change that made it fit on one would pass
    // every assertion below while saying nothing.
    expect(lines.length, `the sentence has to wrap for this row to mean anything:\n${shown}`)
      .toBeGreaterThan(1);

    expect(splitOf(lines, 'ปีการศึกษา'), `lines drawn:\n${shown}`).toBeNull();
    expect(seamsInsideAToken(lines), `lines drawn:\n${shown}`).toEqual([]);

    await dismiss(page);
  } finally {
    const left = (await improvement.planOf(page, sectionId)).entries;
    for (const entry of left) await improvement.clearEntry(page, sectionId, entry.entry_id);
  }
});

test('row 2: the longest confirmation in the system keeps all three compounds whole', async ({
  page,
}) => {
  // `Offerings.js`'s ยกเลิกการเปิดรายวิชา is the longest message any caller
  // builds - 219 characters of fixed text against 151 for the next longest
  // (`Plos.js`), counted across all 19 dialogs on 24 September 2569. The ticket
  // asks for the fix to be checked against it rather than only against #41's. It carries three of the compounds ICU splits:
  // `ปีการศึกษา`, `ภาคการศึกษา` and `ผู้สอน`, the last two of which #41's
  // sentence does not contain at all.
  await signIn(page, ACCOUNTS.committee0501);
  await offerings.openOfferings(page);

  await page.getByRole('button', { name: 'ยกเลิกการเปิด', exact: true }).first().click();
  await expect(offerings.confirmDialog(page)).toBeVisible();

  const { lines, text, shown } = await drawn(page);
  expect(lines.length, `the sentence has to wrap:\n${shown}`).toBeGreaterThan(1);

  for (const word of ['ปีการศึกษา', 'ภาคการศึกษา', 'ผู้สอน']) {
    expect(text, 'the longest message should contain every compound this row names').toContain(word);
    expect(splitOf(lines, word), `lines drawn:\n${shown}`).toBeNull();
  }
  expect(seamsInsideAToken(lines), `lines drawn:\n${shown}`).toEqual([]);

  await dismiss(page);
});

test('row 3: a name with nowhere to break still breaks rather than leaving the dialog', async ({
  page,
}) => {
  // What `break-words` is for, and the reason the fix glues Thai rather than
  // forbidding the breaks outright. A `white-space: nowrap` written per word
  // passes rows 1 and 2 and runs this name 213px past the edge of the dialog.
  const CODE = 'RUB-118A';
  const NAME = 'ProjectBasedLearningAssessmentRubricForSoftwareEngineering2569';

  await signIn(page, ACCOUNTS.committee0501);
  await rubrics.openRubrics(page);

  const made = await rubrics.addRubric(page, { code: CODE, th: NAME, en: 'Long name', order: 0 });
  expect(made.status()).toBe(201);

  try {
    await rubrics.startRemoval(page, CODE);
    const { lines, text, shown } = await drawn(page);

    expect(text, 'the dialog should be naming the rubric this row made').toContain(NAME);
    // The name is longer than the line, so it has to be drawn across lines.
    expect(splitOf(lines, NAME), `a name that cannot fit has to break:\n${shown}`).not.toBeNull();
    // And having broken, nothing sticks out of the box that holds it.
    expect(await overflowOf(messageOf(page)), `lines drawn:\n${shown}`).toBeLessThanOrEqual(0);
    expect(await overflowOf(panel(page)), `lines drawn:\n${shown}`).toBeLessThanOrEqual(0);

    await dismiss(page);
  } finally {
    await rubrics.startRemoval(page, CODE);
    await rubrics.confirmRemoval(page);
    await expect(rubrics.rubricRow(page, CODE)).toHaveCount(0);
  }
});

test('row 4: a Thai run with nowhere to break breaks too, rather than leaving the dialog', async ({
  page,
}) => {
  // The row that tells the fix apart from the design it replaced. A joiner
  // forbids a break and `overflow-wrap` may break where a joiner forbids it, so
  // a Thai run longer than the line still comes apart. `white-space: nowrap`
  // cannot be overridden that way, which is why it is not what `ConfirmDialog`
  // does - and rows 1 to 3 cannot see the difference between the two. Written
  // after `nowrapinstead` survived a sweep that had predicted row 3 would kill
  // it.
  const CODE = 'RUB-118B';
  // 78 characters and not one space in them - a title pasted in whole.
  const NAME = 'การบริหารจัดการหลักสูตรและการประกันคุณภาพการศึกษาภายในระดับหลักสูตรบัณฑิตศึกษา';

  await signIn(page, ACCOUNTS.committee0501);
  await rubrics.openRubrics(page);

  const made = await rubrics.addRubric(page, { code: CODE, th: NAME, en: 'Long Thai', order: 0 });
  expect(made.status()).toBe(201);

  try {
    await rubrics.startRemoval(page, CODE);
    const { lines, text, shown } = await drawn(page);

    expect(text, 'the dialog should be naming the rubric this row made').toContain(NAME);
    expect(splitOf(lines, NAME), `a Thai run that cannot fit has to break:\n${shown}`).not.toBeNull();
    expect(await overflowOf(messageOf(page)), `lines drawn:\n${shown}`).toBeLessThanOrEqual(0);
    expect(await overflowOf(panel(page)), `lines drawn:\n${shown}`).toBeLessThanOrEqual(0);

    await dismiss(page);
  } finally {
    await rubrics.startRemoval(page, CODE);
    await rubrics.confirmRemoval(page);
    await expect(rubrics.rubricRow(page, CODE)).toHaveCount(0);
  }
});

test('row 5: the premise - ICU offers the break the glue forbids', async ({ page }) => {
  // Not one of the ticket's criteria, and not a claim about this repo's code at
  // all: a claim about the engine the fix is built on. Nothing in `ConfirmDialog`
  // decides where Thai words end - Chromium asks ICU, and ICU offers a boundary
  // after `การ`. Every other row here measures a consequence of that; this one
  // measures the premise, which is why no mutant can kill it (#85).
  //
  // Criterion 2 asks for the cause to be established rather than worked around.
  // The four candidates that were ruled out were ruled out by measurements made
  // once, before the fix, and written on to `ConfirmDialog.js`. This is the one
  // part of that account the suite can keep re-asking, and it is the part that
  // would make the whole design unnecessary if it ever changed.
  await signIn(page, ACCOUNTS.teacherOne);

  const segments = await page.evaluate(() =>
    Array.from(
      new Intl.Segmenter('th', { granularity: 'word' }).segment('ในปีการศึกษา'),
      part => part.segment,
    ),
  );

  expect(segments).toEqual(['ใน', 'ปี', 'การ', 'ศึกษา']);
});

'use strict';

const fs = require('node:fs/promises');

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS } = require('../support/accounts');
const { REFUSALS } = require('../../backend/auth/refusals');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const {
  openReport,
  verdictOf,
  rateOf,
  fractionOf,
  meanOf,
  verdicts,
  exportPdf,
  rubricToggle,
} = require('../support/clo-assessment-screen');

/**
 * docs/acceptance/40-clo-assessment-report.md — the half a browser can prove.
 *
 * `backend/test/clo-assessment.test.js` owns the arithmetic: both thresholds
 * from both sides, the agreement with #38, the refusals. Repeating any of that
 * here would be asserting one rule in two places, and the second place is the
 * one that goes stale.
 *
 * What is here is what only exists in front of the screen:
 *
 * - that the verdict is a **word** and not only a colour, which is the whole
 *   reason a monochrome photocopy of this report still says anything;
 * - that the criterion the screen prints is the rule that judged, so the
 *   sentence and the figure beside it cannot describe different rules;
 * - that a PDF actually reaches the person's disk with a Thai face **embedded**
 *   in it rather than merely named;
 * - and that a ตอนเรียน with no marks says so instead of drawing a column of
 *   dashes.
 *
 * ## The seed passes everything, so the failing rows build the failure
 *
 * Every outcome in the seed clears sixty per cent comfortably. A screen that
 * printed ผ่าน unconditionally would satisfy every row written against the
 * seed alone, so the rows below zero an outcome's marks and put them back.
 */

const db = createPool({ schema: E2E_SCHEMA });

let section;
let restoreMarks;
let invented;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) [section] = await mySectionIds(page);
  restoreMarks = [];
  invented = { clos: [], sections: [] };
});

test.afterEach(async () => {
  for (const row of restoreMarks) {
    await db.query('UPDATE activity_scores SET score = $2 WHERE score_id = $1', [
      row.score_id,
      row.score,
    ]);
  }
  for (const cloId of invented.clos) {
    await db.query('DELETE FROM subject_clo WHERE clo_id = $1', [cloId]);
  }
  for (const sectionId of invented.sections) {
    await db.query('DELETE FROM course_sections_teacher WHERE section_id = $1', [sectionId]);
    await db.query('DELETE FROM course_sections WHERE section_id = $1', [sectionId]);
  }
});

test.afterAll(async () => {
  await db.end();
});

/**
 * Puts every mark on one outcome to nought, remembering them first.
 *
 * Nought and not null: a blank is #34's *not marked yet*, which would empty the
 * row rather than fail it, and what these rows need is an outcome that has been
 * measured and did badly.
 */
async function failOutcome(cloNumber) {
  const { rows } = await db.query(
    `SELECT s.score_id, s.score
       FROM activity_scores s
       JOIN activities a ON a.id = s.activity_id
       JOIN subject_clo c ON c.clo_id = s.clo_id
      WHERE a.section_id = $1 AND c.clo_number = $2`,
    [section, cloNumber],
  );
  restoreMarks.push(...rows);
  await db.query(
    `UPDATE activity_scores s SET score = 0
       FROM activities a, subject_clo c
      WHERE s.activity_id = a.id AND a.section_id = $1
        AND c.clo_id = s.clo_id AND c.clo_number = $2
        AND s.score IS NOT NULL`,
    [section, cloNumber],
  );
}

/** An outcome of this Offering nobody has been marked on — the seed has none. */
async function unmeasuredOutcome(number) {
  const { rows } = await db.query(
    `INSERT INTO subject_clo (program_id, subject_id, academic_year, clo_number, clo_detail)
     SELECT sc.program_id, sc.subject_id, sc.academic_year, $2, $3
       FROM course_sections cs
       JOIN semester_courses sc ON sc.id = cs.semester_course_id
      WHERE cs.section_id = $1
     RETURNING clo_id`,
    [section, number, 'ผลการเรียนรู้ที่ยังไม่มีใครถูกวัด'],
  );
  invented.clos.push(rows[0].clo_id);
  return rows[0].clo_id;
}

/** A ตอนเรียน of the same Offering with nothing marked in it. */
async function bareSection(number) {
  const { rows } = await db.query(
    `INSERT INTO course_sections (semester_course_id, section_number)
     SELECT cs.semester_course_id, $2 FROM course_sections cs WHERE cs.section_id = $1
     RETURNING section_id`,
    [section, number],
  );
  const bare = rows[0].section_id;
  invented.sections.push(bare);
  await db.query('INSERT INTO course_sections_teacher (section_id, user_id) VALUES ($1, $2)', [
    bare,
    IDS.teacherOne,
  ]);
  return bare;
}

test('row 1: every outcome has a row carrying its criterion, its share and its verdict', async ({
  page,
}) => {
  const response = await openReport(page, section);
  const body = await response.json();

  // One row per outcome of the Offering — not per outcome the marks reached.
  const drawn = await verdicts(page);
  expect(drawn.length).toBe(body.clos.length);

  for (const clo of body.clos) {
    await expect(fractionOf(page, clo.clo_number)).toHaveText(
      `${clo.passed_count} / ${clo.student_count}`,
    );
    await expect(rateOf(page, clo.clo_number)).toHaveText(`${clo.pass_rate}%`);
  }

  // The criterion column says the rule that judged, in the rule's own numbers.
  // A screen typing *3.00* as a literal would pass this today and go on saying
  // it after the pass line moved; these come from the answer.
  const { pass_score: pass, scale, pass_percent: share } = body.rule;
  await expect(page.getByText(`คะแนน ≥ ${pass.toFixed(2)} จาก ${scale}`).first()).toBeVisible();

  // The whole clause, not the substring `ร้อยละ 60`. BR-17 is strict and
  // `bands.js` says in its own doc that มากกว่า against ไม่น้อยกว่า "would
  // describe a different rule" — so a screen that swapped that one word would
  // print a criterion the verdicts beside it were not decided by, and the
  // substring form of this line could not tell.
  await expect(
    page.getByText(`ผู้ผ่านมากกว่าร้อยละ ${share} ของผู้มีคะแนน`).first(),
  ).toBeVisible();
});

test('row 2: the verdict is a word, so a monochrome copy of the report still says it', async ({
  page,
}) => {
  // The seed passes everything, so one outcome is failed on purpose. Both
  // verdicts have to be readable as text: a report whose only statement of
  // ไม่ผ่าน is a red fill says nothing once it is photocopied into a course
  // file, which is the one thing this screen is for.
  await failOutcome('CLO-1');
  await openReport(page, section);

  await expect(verdictOf(page, 'CLO-1')).toHaveText('ไม่ผ่าน');
  await expect(verdictOf(page, 'CLO-2')).toHaveText('ผ่าน');
});

test('row 3: an outcome nobody has been marked on is ยังไม่ประเมิน, not ไม่ผ่าน', async ({
  page,
}) => {
  // The third state, and the one a two-state screen gets wrong in the
  // direction that matters: an outcome the term has not reached yet has not
  // failed its criterion, and a formal report saying otherwise is an
  // accusation the marks do not support.
  await unmeasuredOutcome('CLO-96');
  await openReport(page, section);

  await expect(verdictOf(page, 'CLO-96')).toHaveText('ยังไม่ประเมิน');
  await expect(fractionOf(page, 'CLO-96')).toHaveText('0 / 0');
  await expect(rateOf(page, 'CLO-96')).toHaveText('—');
  await expect(meanOf(page, 'CLO-96')).toHaveText('—');
});

test('row 4: the outcomes that did not pass are named, not left to the chips', async ({ page }) => {
  await failOutcome('CLO-1');
  await openReport(page, section);

  // #38's habit: what a ผู้สอน is meant to act on is written in a sentence
  // rather than left to be spotted among nine chips.
  const said = page.getByRole('status').filter({ hasText: 'ยังไม่ผ่านเกณฑ์' });
  await expect(said).toContainText('CLO-1');
});

test('row 5: the export hands over a PDF with a Thai face embedded in it', async ({ page }) => {
  const response = await openReport(page, section);
  const body = await response.json();

  const download = await exportPdf(page);

  // The name says which ตอนเรียน of which รายวิชา in which year, because a
  // course file collects these and a folder of `assessment.pdf` is a folder
  // nobody can sort. Asserted against the answer's own values rather than a
  // pattern: `assessment-.+\.pdf` was the first version of this line and it
  // matched a filename carrying none of them.
  expect(download.suggestedFilename()).toBe(
    `assessment-${body.subject.subject_id}-sec${body.section.section_number}-${body.section.academic_year}.pdf`,
  );

  // `20a`'s two assertions, one claim from two sides. Take the `addFont` calls
  // out of `assessmentPdf.js` and a PDF still downloads, still opens, and
  // still carries this name — and prints a page of tofu. Naming a face and
  // carrying it are different things in PDF, and a file that only names it
  // draws boxes on any reader without TH Sarabun installed.
  //
  // What is NOT asserted here: that the vowels and tone marks sit where they
  // should, or that fourteen point is large enough to read. Nothing in a
  // browser sees either; both are hand-walked rows.
  const bytes = await fs.readFile(await download.path());
  expect(bytes.length).toBeGreaterThan(20_000);
  const raw = bytes.toString('latin1');
  expect(raw).toContain('THSarabun');
  expect(raw).toContain('/FontFile2');
});

test('row 6: the rubric is behind a disclosure, and is not what the criterion column says', async ({
  page,
}) => {
  await openReport(page, section);

  // Closed to begin with: #29's four sentences are reference and none of them
  // decided a figure in the table, so they do not sit among the figures.
  const bands = page.getByText('ทำได้ตามเกณฑ์ขั้นต่ำ', { exact: false });
  await expect(bands.first()).toBeHidden();

  await rubricToggle(page).click();
  await expect(bands.first()).toBeVisible();
});

test('row 7: a ตอนเรียน with nothing marked says so instead of a column of dashes', async ({
  page,
}) => {
  const bare = await bareSection('90');
  await openReport(page, bare);

  await expect(page.getByRole('status').filter({ hasText: 'ยังไม่มีคะแนน' })).toBeVisible();
  await expect(page.locator('table')).toHaveCount(0);

  // And the export is not offered, because there is nothing to file.
  await expect(page.getByRole('button', { name: 'บันทึกเป็น PDF' })).toBeDisabled();
});

test('row 8: the ตอนเรียน of another account is refused rather than reported', async ({ page }) => {
  // The session from `beforeEach` is dropped first: `signIn` fills the form on
  // `/`, and an account already signed in never sees one.
  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.teacherTwo);

  const response = await openReport(page, section);
  expect(response.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound, { exact: true })).toBeVisible();

  // #43's walk found two screens showing a refusal with *กำลังโหลดข้อมูล…*
  // underneath it for ever. The `finally` in this page's loader is why that
  // sentence is gone rather than merely covered.
  await expect(page.getByText('กำลังโหลดข้อมูล…')).toBeHidden();
});

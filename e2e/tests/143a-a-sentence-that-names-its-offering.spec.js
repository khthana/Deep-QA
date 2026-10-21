'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { byAlias, PROGRAM, SUBJECT, CURRENT_YEAR, SEMESTER } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { dismiss } = require('../support/confirm-dialog');
const { holdBack, wentThroughTheWindow } = require('../support/late-answer');
const {
  openOfferings,
  filterToTerm,
  openSections,
  backToList,
  sectionCard,
} = require('../support/offerings-screen');

/**
 * docs/acceptance/23-offerings.md — #143: a section write's sentence says which
 * Offering it is about.
 *
 * ## What was measured, and what the owner decided
 *
 * Every sentence a section write ends in is drawn on the banner above the
 * screen, and nothing beside the panel is disabled while that write is out: so
 * กลับไปหน้ารายการ and then ตอนเรียนและผู้สอน of another Offering can both be
 * pressed first, and the answer arrives over somebody else's panel. #143 read
 * that from the code in September and said so; measured on 21 ตุลาคม 2569 with
 * a probe, all three ways in it names do it:
 *
 * | way in                                   | on the list | over B's panel |
 * |------------------------------------------|-------------|----------------|
 * | เพิ่มตอนเรียน, accepted (`onSection`)      | says it     | says it        |
 * | a duplicate number, refused (`onSection`) | —           | says it        |
 * | ลบตอนเรียน (`confirmRemoval`)              | says it     | says it        |
 *
 * The owner's answer of 21 ตุลาคม 2569 is #143's third option: **the sentence
 * names the Offering**. The first option (drop it once another panel is open)
 * was declined because a refusal that really happened would go silent and the
 * person would believe the write went through; the second (keep it as it was)
 * because the repository would then hold two behaviours for one decision —
 * `ActivityScores` has named the activity its sentence is about since
 * 12 ตุลาคม 2569 and three other sites deliberately did not.
 *
 * ## Why the removal's way in needs ยกเลิก pressed first
 *
 * The confirmation box covers กลับไปหน้ารายการ until the write answers, so a
 * row that simply clicked it would wait for the cover to go, which is the
 * answer landing — and would then measure the box holding the person in place
 * rather than the sentence. The probe's first version did exactly that and read
 * the removal as already silent. ยกเลิก puts the box away while the write it
 * confirmed is still in flight, which is the one way out #217 left
 * (`support/confirm-dialog.js` carries it, and #217 carries the rule).
 *
 * ## What each row reads, and what it does not
 *
 * The claim is *the sentence says which Offering*, so each row asserts that the
 * banner names this file's own subject and its term while the panel on the
 * screen is the seeded Offering's. It does not retype the Thai sentences: those
 * are proved by `23a-offerings.spec.js`, and a Thai string retyped into a spec
 * is a string that can be wrong in a way nothing here would notice. What is
 * retyped is the subject's name, which this file writes into the schema itself.
 *
 * The two Offerings share one term, because a row is found by its code only
 * after the filters have narrowed the list to one (`offerings-screen.js` says
 * why). So what tells them apart here is the subject; the term is asserted as
 * **present** in the sentence rather than as distinguishing, which is what
 * fails a mutant that leaves it out.
 *
 * The lateness is `late-answer.js` rather than `page.route`: it wraps the
 * page's own `fetch` and hands the real answer on late, so nothing about the
 * request changes.
 */

const db = createPool({ schema: E2E_SCHEMA });

/**
 * The subject this file opens, and the หลักสูตร it is placed in.
 *
 * `01143143` after `139a`'s `01139139` — the invented-subject space is
 * crowded and `23a` reserves `010798` fifty-one upward, so a ticket-numbered
 * code of its own collides with nothing.
 */
const MINE = { id: '01143143', th: 'วิชาของแถว #143', en: 'Subject for the #143 rows' };

/** How late the write's answer reaches the screen — long enough to move twice. */
const LATE_MS = 3_000;

/** What the screen is given to draw the late answer in. */
const SETTLE_MS = 1_500;

const sleep = ms => new Promise(done => setTimeout(done, ms));

let release;
let offeringA;

test.beforeAll(async () => {
  release = await hold();
  await db.query(
    `INSERT INTO subjects (subject_id, subject_name_en, subject_name_th, credits, department_id, created_by)
     VALUES ($1, $2, $3, 3, $4, $5)`,
    [MINE.id, MINE.en, MINE.th, SUBJECT.department, byAlias('U_ADMIN')],
  );
  await db.query(
    `INSERT INTO program_subjects (program_id, subject_id, subject_type, created_by)
     VALUES ($1, $2, 'required', $3)`,
    [PROGRAM, MINE.id, byAlias('U_ADMIN')],
  );
  const { rows } = await db.query(
    `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [PROGRAM, MINE.id, CURRENT_YEAR, SEMESTER],
  );
  offeringA = rows[0].id;
});

test.afterAll(async () => {
  await release();
  await db.end();
});

/** A section of this file's Offering, written straight into the schema. */
const giveASection = number =>
  db.query(
    `INSERT INTO course_sections (semester_course_id, section_number) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [offeringA, number],
  );

const SECTION_WRITE = '^/api/offerings/\\d+/sections$';
const SECTION_REMOVAL = '^/api/offerings/\\d+/sections/\\d+$';

/**
 * Signs in, opens the term both Offerings are in, and asserts both rows are
 * there — the precondition the move needs, where it is used (#51).
 */
async function intoTheTerm(page, pattern) {
  await holdBack(page, pattern, LATE_MS);
  await signIn(page, ACCOUNTS.committee0501);
  await openOfferings(page);
  await filterToTerm(page, CURRENT_YEAR, SEMESTER);
  await expect(page.getByRole('cell', { name: MINE.id, exact: true })).toHaveCount(1);
  await expect(page.getByRole('cell', { name: SUBJECT.id, exact: true })).toHaveCount(1);
}

/** Leaves A's panel and opens the seeded Offering's, while the write is out. */
async function moveToTheOtherPanel(page) {
  await backToList(page);
  await openSections(page, SUBJECT.id);
  await expect(
    page.getByRole('heading', { name: `${SUBJECT.id} ${SUBJECT.th}` }),
  ).toBeVisible();
}

/**
 * Asserts the sentence on the banner names this file's Offering and not the one
 * being looked at.
 *
 * The screen's own line, read once the answer has had its settle: a retrying
 * `toContainText` against the banner would be waiting for a sentence that the
 * behaviour under test is free never to draw, and would then fail at the
 * timeout rather than with the words it found (#209).
 */
async function namesMyOffering(page, role, what) {
  const said = (await page.getByRole(role).allInnerTexts()).join(' | ');
  expect(said, `${what} is drawn at all`).not.toBe('');
  expect(said, `${what} names the Offering it is about`).toContain(MINE.th);
  expect(said, `${what} names that Offering's academic year`).toContain(CURRENT_YEAR);
  expect(said, `${what} names that Offering's semester`).toContain(String(SEMESTER));
  expect(said, `${what} does not name the Offering on the screen`).not.toContain(SUBJECT.th);
}

test('1 an accepted section write says which Offering it added to', async ({ page }) => {
  await intoTheTerm(page, SECTION_WRITE);
  await openSections(page, MINE.id);

  await page.getByPlaceholder('เช่น 1 หรือ พ1').fill('1');
  await page.getByRole('button', { name: 'เพิ่มตอนเรียน' }).click();

  await moveToTheOtherPanel(page);
  await sleep(LATE_MS + SETTLE_MS);

  await wentThroughTheWindow(page);
  await namesMyOffering(page, 'status', 'the success sentence');
});

test('2 a refused section write says which Offering refused it', async ({ page }) => {
  // Its own collision, so this row does not inherit row 1's section (#129).
  await giveASection('2');

  await intoTheTerm(page, SECTION_WRITE);
  await openSections(page, MINE.id);

  await page.getByPlaceholder('เช่น 1 หรือ พ1').fill('2');
  await page.getByRole('button', { name: 'เพิ่มตอนเรียน' }).click();

  await moveToTheOtherPanel(page);
  await sleep(LATE_MS + SETTLE_MS);

  await wentThroughTheWindow(page);
  await namesMyOffering(page, 'alert', 'the refusal');
});

test('3 a section removal says which Offering it removed from', async ({ page }) => {
  await giveASection('3');

  await intoTheTerm(page, SECTION_REMOVAL);
  await openSections(page, MINE.id);
  await expect(sectionCard(page, '3')).toHaveCount(1);

  await sectionCard(page, '3').getByRole('button', { name: 'ลบตอนเรียน' }).click();
  await page.getByRole('button', { name: 'ลบตอนเรียน', exact: true }).last().click();
  // The box covers the way out until the write answers - see the docstring.
  await dismiss(page);

  await moveToTheOtherPanel(page);
  await sleep(LATE_MS + SETTLE_MS);

  await wentThroughTheWindow(page);
  await namesMyOffering(page, 'status', 'the removal sentence');
});

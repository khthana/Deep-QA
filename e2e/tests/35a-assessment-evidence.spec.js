'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');

const { ACCOUNTS } = require('../support/accounts');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { COHORTS } = require('../../db/seed');
const {
  openReport,
  showIntake,
  sourceButton,
  drillDown,
} = require('../support/program-results-screen');
const {
  PDF_BYTES,
  PNG_BYTES,
  activitiesPath,
  attach,
  evidenceLink,
  evidencePath,
  fileRow,
  openFile,
  removeFile,
} = require('../support/evidence-screen');

/**
 * docs/acceptance/35-assessment-evidence.md — the half a browser can prove.
 *
 * `backend/test/evidence.test.js` owns the rules. The PDF signature, the five
 * types, the size limit and who may open which file are all decided there,
 * where the answer is a status and a sentence and can be checked against the
 * criterion word for word.
 *
 * Four things exist only in front of the screen and are here:
 *
 * - the **round trip through a real file input**. Every backend row builds its
 *   own multipart body; nothing in that suite proves the form on the screen
 *   sends what the route reads, and multipart is exactly where a client and a
 *   server disagree silently;
 * - the **refusal arriving as words on the screen** rather than as a status,
 *   for the file that is named `.pdf` and is not one;
 * - **opening a file is a request**. The defect this ticket exists for was a
 *   directory served statically, where opening one was not a request at all;
 * - the **way in from the Activity**, which is a link and cannot be seen in any
 *   payload.
 *
 * Every row cleans up after itself through the screen's own delete, so the
 * shelf a later row opens is the one it expects.
 */

const db = createPool({ schema: E2E_SCHEMA });

test.afterAll(() => db.end());

/** The Section `teacher.one@` teaches, and one Activity in it. */
async function shelf() {
  const { rows } = await db.query(
    `SELECT a.id, a.activity_name, a.section_id
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

test('a teacher reaches the shelf from the Activity, attaches a PDF, and it is there', async ({
  page,
}) => {
  // Criteria 1 and 4's first half, and the way in. The bytes go through a real
  // file input to a real multipart route — the one part of this ticket that the
  // in-process suite cannot exercise, because supertest writes the body itself.
  await signIn(page, ACCOUNTS.teacherOne);
  const activity = await shelf();

  await page.goto(activitiesPath(activity.section_id));
  await evidenceLink(page, activity.activity_name).click();
  await page.waitForURL(evidencePath(activity.section_id, activity.id));

  await attach(page, {
    bytes: PDF_BYTES,
    name: 'โจทย์งานกลุ่ม.pdf',
    type: 'brief',
    description: 'โจทย์ที่แจกในสัปดาห์ที่ 5',
  });

  // The cleanup is in a `finally` rather than at the end of the body. A row
  // that tidies up only when it passes leaves its file on the shelf for the
  // next row exactly when something has gone wrong — which the mutation sweep
  // demonstrated: a mutant that should have killed this row alone killed the
  // next one too, on a shelf this row had failed to clear.
  try {
    await expect(fileRow(page, 'โจทย์งานกลุ่ม.pdf')).toBeVisible();
    await expect(page.getByText('โจทย์ที่แจกในสัปดาห์ที่ 5')).toBeVisible();

    // Opening it is a request that carries the session and comes back as a PDF.
    // A static directory could answer the first half and never the second.
    const answer = await openFile(page, 'โจทย์งานกลุ่ม.pdf');
    expect(answer.status()).toBe(200);
    expect(answer.headers()['content-type']).toContain('application/pdf');
  } finally {
    await db.query(`DELETE FROM activity_evidence WHERE activity_id = $1`, [activity.id]);
  }

  // Removing through the screen is its own claim, and it is made on a file this
  // row puts there for the purpose.
  await page.reload();
  await attach(page, { bytes: PDF_BYTES, name: 'ชั่วคราว.pdf', type: 'poor' });
  await removeFile(page, 'ชั่วคราว.pdf');
  await expect(page.getByText('ยังไม่มีหลักฐานแนบกับกิจกรรมนี้')).toBeVisible();
});

test('a file named .pdf that is not one is refused, in words, on the screen', async ({ page }) => {
  // BR-15 as a person meets it. The name says PDF and the browser declares
  // `application/pdf`; both are the uploader's to write. What the server reads
  // is the first five bytes, and what the screen shows is the sentence it sends.
  await signIn(page, ACCOUNTS.teacherOne);
  const activity = await shelf();

  await page.goto(evidencePath(activity.section_id, activity.id));
  await attach(page, { bytes: PNG_BYTES, name: 'brief.pdf', type: 'brief' });

  await expect(page.getByText(REFUSALS.evidenceNotPdf)).toBeVisible();
  // And nothing was filed. Asserted as *this file is not on the shelf* rather
  // than as *the shelf is empty*: what the row is about is the refused upload,
  // and a claim about the whole shelf would be a claim about whatever the rows
  // before it left behind.
  await expect(fileRow(page, 'brief.pdf')).toHaveCount(0);
});

test('a committee member opens the evidence behind a figure from the drill-down', async ({
  page,
  browser,
}) => {
  // #42's fifth criterion, the half that was ◐ until this ticket. The file is
  // attached by the teacher who owns it and then opened by somebody who teaches
  // nothing — reaching it through the report rather than through the Section,
  // which is the second of #35's two entitlements.
  await signIn(page, ACCOUNTS.teacherOne);
  const activity = await shelf();

  await page.goto(evidencePath(activity.section_id, activity.id));
  await attach(page, {
    bytes: PDF_BYTES,
    name: 'หลักฐานสำหรับกรรมการ.pdf',
    type: 'excellent',
    description: 'ตัวอย่างผลงานระดับดีเยี่ยม',
  });
  await expect(fileRow(page, 'หลักฐานสำหรับกรรมการ.pdf')).toBeVisible();

  try {
    // Which outcome's drill-down this Activity is behind. Read from the
    // database rather than written here, so the row keeps finding it if the
    // seed's attribution changes.
    const { rows } = await db.query(
      `SELECT DISTINCT o.outcome_code
         FROM activity_clo_mapping m
         JOIN subject_clo c ON c.clo_id = m.clo_id
         JOIN learning_outcomes o ON o.outcome_id = c.plo_id
        WHERE m.activity_id = $1
        ORDER BY o.outcome_code ASC
        LIMIT 1`,
      [activity.id],
    );
    expect(rows, 'the Activity should be attributed to an outcome').toHaveLength(1);
    const code = rows[0].outcome_code;

    // A context of its own rather than a second sign-in on this one. The
    // sign-in helper starts at `/`, and an already-signed-in browser is sent
    // off that address before the form is drawn — so signing in twice in one
    // context hangs on a screen that is not there. Two people is also what this
    // row is about: the teacher who attached the file and the committee member
    // who opens it are not the same session.
    const reader = await browser.newContext();
    const readerPage = await reader.newPage();
    try {
      await signIn(readerPage, ACCOUNTS.committee0501);
      await openReport(readerPage);
      // The cohort with marks, for 42a's and 43a's reason: the screen opens on
      // the newest intake the curriculum has students in, and the import rows
      // earlier in this suite enrol a newer one than the seed has.
      await showIntake(readerPage, COHORTS[0].admission);
      await sourceButton(readerPage, code).click();
      await expect(drillDown(readerPage)).toBeVisible();

      const answer = await openFile(readerPage, 'หลักฐานสำหรับกรรมการ.pdf');
      expect(answer.status()).toBe(200);
      expect(answer.headers()['content-type']).toContain('application/pdf');
    } finally {
      await reader.close();
    }
  } finally {
    await page.goto(evidencePath(activity.section_id, activity.id));
    await removeFile(page, 'หลักฐานสำหรับกรรมการ.pdf');
  }
});

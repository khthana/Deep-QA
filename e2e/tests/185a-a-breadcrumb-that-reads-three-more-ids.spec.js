'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { breadcrumb } = require('../support/shell');
const { openBehaviors, myClos } = require('../support/behaviors-screen');
const { openCriteriaAt } = require('../support/rubric-criteria-screen');
const { DASHBOARD: DASHBOARD_PATH } = require('../support/teaching-screen');

/**
 * #185 -- the breadcrumb reads three more ids out as names.
 *
 * #116's defect one segment deeper, in the three shapes that are left: a CLO
 * id under `courseOutcomes`, an Activity id under `learningActivities`, and a
 * Rubric id under `/main/rubrics`. All three are surrogate keys (ADR-0001)
 * that the rebuild put in the address, so `breadcrumbNameMap` -- which turns a
 * segment that is a *word* into a sentence -- has no entry for them and never
 * could, and the trail printed the number.
 *
 * All three are restorations and not additions, which is what `docs/06`
 * section Out of Scope asks first. The delivered system printed a name in each
 * place: `CourseOutcomes.js` navigated with `CLO-${clo.clo_number}`, and the
 * other two addresses carried the constant words `activityScores` and
 * `edit-Rubric`. The ticket's own first diagnosis said otherwise about the CLO
 * and was corrected on the ticket.
 *
 * ## Why the fixture is the Section of 2568
 *
 * The same reason 116a is on Section 3, one tier down. The current year's CLOs
 * are seeded first, so `clo_id` 1..9 carry `CLO-1`..`CLO-9` and a trail that
 * printed `CLO-${id}` would read correctly there -- the ticket's own rejected
 * fallback, passing. The prior year's set carries the same nine numbers on
 * nine different ids, which is the one place the key and the label disagree,
 * and row 1 asserts that precondition rather than trusting the seed for it.
 *
 * ## What is not here
 *
 * Three things.
 *
 * Whether the trail *looks* right is appearance and stays a hand-walked row on
 * `docs/acceptance/10`.
 *
 * The second of the two CLO addresses -- `courseOutcomes/:cloId/criteria` --
 * is the same segment at the same index resolved by the same call, so it is
 * one claim with row 1 and not two.
 *
 * And the pairing guard, which keys the label by `kind:id` rather than by id
 * alone, has no row: the frame it is about is the single render after a move
 * between two addresses of the same shape, and what the crumb falls back to in
 * that frame is the number -- which is also what it says before any answer has
 * arrived. A read that cannot fail is not a row (#50). `docs/acceptance/10`
 * says so with the date rather than with a mark.
 */

/** Every crumb the trail draws, in order, as a person reads them. */
const crumbsOn = async page =>
  (await breadcrumb(page).getByRole('link').allTextContents()).map(text => text.trim());

const HOME = 'หน้าหลัก';
const DASHBOARD = 'รายวิชาที่รับผิดชอบ';
const COURSE_OUTCOMES = 'ผลการเรียนรู้รายวิชา';
const BEHAVIORS = 'พฤติกรรมที่วัดผลได้ตาม CLO';
const ACTIVITIES = 'กิจกรรมการเรียนรู้ในรายวิชา';
const EVIDENCE = 'หลักฐานการประเมิน';
const RUBRICS = 'ข้อมูล Rubric กลาง';
const RUBRIC_CRITERIA = 'เกณฑ์การให้คะแนนของ Rubric';

/** Section 3 is Section *1* of 2568/1, taught by `teacher.one@` -- 116a's fixture. */
const OTHER_YEAR = 3;

/** What the trail says for it, read from the row that proved it. */
const LAST_YEAR_LABEL = 'ตอนเรียน 1 · ปีการศึกษา 2568';

test('row 1: the CLO crumb reads its number, not the id in the address', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);

  const clos = await myClos(page, OTHER_YEAR);
  const clo = clos.find(one => one.clo_number === 'CLO-1');
  expect(clo).toBeTruthy();

  // The precondition this fixture exists for, asserted where it is used: the
  // id and the number must disagree, or a trail built out of the segment
  // would read correctly and the mutant for it would survive (#117).
  expect(String(clo.clo_id)).not.toBe('1');

  await page.goto(`${DASHBOARD_PATH}/${OTHER_YEAR}/courseOutcomes/${clo.clo_id}/behaviors`);

  // Polling rather than reading once: the label arrives with an answer, and
  // the value polled for is not the value on screen before it -- the trail
  // says the id until the CLO is resolved, so this cannot pass early.
  await expect
    .poll(() => crumbsOn(page))
    .toEqual([DASHBOARD, LAST_YEAR_LABEL, COURSE_OUTCOMES, 'CLO-1', BEHAVIORS]);
});

test('row 2: the Activity crumb reads its name', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);

  const answer = await page.request.get(
    `${BACKEND_URL}/api/teaching/sections/${OTHER_YEAR}/activities`,
  );
  expect(answer.status()).toBe(200);
  const [activity] = (await answer.json()).activities;
  expect(activity.activity_name).toBeTruthy();

  await page.goto(`${DASHBOARD_PATH}/${OTHER_YEAR}/learningActivities/${activity.id}/evidence`);

  await expect
    .poll(() => crumbsOn(page))
    .toEqual([DASHBOARD, LAST_YEAR_LABEL, ACTIVITIES, activity.activity_name, EVIDENCE]);
});

test('row 3: the Rubric crumb reads its code', async ({ page }) => {
  // The one of the three that needed no new request: `GET /api/rubrics/:id`
  // has answered one rubric since #21, which is why the ticket called this the
  // cheapest of them.
  await signIn(page, ACCOUNTS.committee0501);

  const answer = await page.request.get(`${BACKEND_URL}/api/rubrics`);
  expect(answer.status()).toBe(200);
  const [rubric] = (await answer.json()).rubrics;
  expect(rubric.rubric_code).toBeTruthy();
  expect(rubric.rubric_code).not.toBe(String(rubric.id));

  const opened = await openCriteriaAt(page, rubric.id);
  expect(opened.status()).toBe(200);

  await expect
    .poll(() => crumbsOn(page))
    .toEqual([HOME, RUBRICS, `Rubric ${rubric.rubric_code}`, RUBRIC_CRITERIA]);
});

test('row 4: an id the server refuses leaves the crumb saying nothing untrue', async ({ page }) => {
  // #116's row 4 one tier down. The crumb keeps the number, which is what was
  // there before this ticket and says nothing a person could be misled by; a
  // trail that invented `CLO-999999` from the segment would be the ticket's
  // own rejected fallback, naming an outcome that does not exist.
  await signIn(page, ACCOUNTS.teacherOne);

  const refused = await openBehaviors(page, OTHER_YEAR, 999999);
  expect(refused.status()).toBe(404);

  // A settle point and not a wait: the screen words the same refusal the
  // resolver was handed, so once the sentence is on screen the resolver has
  // had its answer too. The crumb is then read once -- polling for the number
  // here would be a read that cannot fail, since the number is also what the
  // trail says before any answer arrives (#50).
  await expect(page.getByText(REFUSALS.cloNotFound)).toBeVisible();

  expect(await crumbsOn(page)).toEqual([
    DASHBOARD,
    LAST_YEAR_LABEL,
    COURSE_OUTCOMES,
    '999999',
    BEHAVIORS,
  ]);
});

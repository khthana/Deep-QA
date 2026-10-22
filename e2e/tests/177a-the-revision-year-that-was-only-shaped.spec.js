'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openPrograms, API } = require('../support/programs-screen');

/**
 * #177 — the year that was checked for shape and not for plausibility.
 *
 * `programs.revision_year` holds the Buddhist-era year a Program's curriculum
 * was revised in, as text. Until this ticket the guard was `/^\d{4}$/`, so `2024` — the
 * common-era year for what somebody means as 2567 — was stored, and answered
 * with the generic *ข้อมูลหลักสูตรไม่ครบถ้วนหรือไม่ถูกต้อง* only when it was not
 * four digits at all. The owner's answer on 22 October 2569 was both links of
 * the guard, with a constant ceiling.
 *
 * ## Why a row at this seam, when `programs.test.js` holds the refusal
 *
 * Because the form could have answered first and nobody would have noticed.
 * The field carries `pattern="\d{4}"` inside a form with no `noValidate`, which
 * is how the *shape* refusal became the browser's sentence rather than the
 * server's — `docs/acceptance/15-programs.md`'s row for `25` says so in its own
 * words, *เบราว์เซอร์ทักที่ช่อง หรือแถบแดง …*. A bound put on a field changes who
 * answers the person (#88), and `2024` satisfies that bound. So the claim this
 * row holds is the one no HTTP test can make: **the request leaves the page**,
 * and what the person reads is the sentence that names the year.
 *
 * The second row is the other half of a refusal that names a way out (#60,
 * #178): the sentence tells them to type 2567, which is worth nothing if the
 * save has thrown away what they typed. So the field is read back.
 *
 * Nothing is created here — both rows end in a refusal — so there is nothing to
 * put back. `T7721` is named by no other spec.
 */

const ERA_SENTENCE = REFUSALS.revisionYearEra(2024, 2567);

/** Fills the add form with a programme whose only mistake is its year. */
async function enterAProgrammeRevisedIn(page, year) {
  await page.getByRole('button', { name: 'เพิ่มหลักสูตร' }).click();
  await expect(page.getByRole('heading', { name: 'เพิ่มหลักสูตร' })).toBeVisible();

  await page.getByLabel('รหัสหลักสูตร', { exact: true }).fill('T7721');
  // `getByRole` and not `getByLabel` on the picker, for 55a's reason: the label
  // wraps the whole `<select>`, so its text counts every option's text too.
  await page.getByRole('combobox', { name: 'ภาควิชา' }).selectOption('05');
  await page
    .getByLabel('ชื่อหลักสูตร (ไทย)', { exact: true })
    .fill('หลักสูตรที่กรอกปีเป็น ค.ศ.');
  await page.getByLabel('ปีหลักสูตร', { exact: false }).fill(year);
}

/** Presses *บันทึก* and hands back the answer to the creation it asked for. */
async function saveAndWaitForTheAnswer(page) {
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        new URL(response.url()).pathname === API && response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return answer;
}

test.describe('#177: a common-era year typed into a Buddhist-era field', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openPrograms(page);
  });

  test('the field lets it through and the screen names the year to use instead', async ({
    page,
  }) => {
    await enterAProgrammeRevisedIn(page, '2024');

    // That the request happened at all is half of this row: four digits satisfy
    // the field's own `pattern`, so the browser does not stop the save and the
    // server's sentence is reachable from this screen.
    const answer = await saveAndWaitForTheAnswer(page);
    expect(answer.status(), 'the save the form sent').toBe(400);

    // The screen's own banner, which is `role="alert"` on a refusal since #111.
    // Read whole rather than for a substring: the sentence that does the
    // arithmetic and the generic one share their first half.
    await expect(page.getByRole('alert')).toHaveText(ERA_SENTENCE);
  });

  test('and what was typed is still there to correct', async ({ page }) => {
    await enterAProgrammeRevisedIn(page, '2024');
    expect((await saveAndWaitForTheAnswer(page)).status()).toBe(400);

    // The sentence names a way out - type 2567 instead - which is a claim that
    // the way out is reachable from where it is read. The form is still open on
    // what was typed, the year included, so the correction is one field away.
    await expect(page.getByRole('heading', { name: 'เพิ่มหลักสูตร' })).toBeVisible();
    await expect(page.getByLabel('ปีหลักสูตร', { exact: false })).toHaveValue('2024');
    await expect(page.getByLabel('รหัสหลักสูตร', { exact: true })).toHaveValue('T7721');
  });
});

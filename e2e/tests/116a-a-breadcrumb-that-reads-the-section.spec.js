'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { breadcrumb } = require('../support/shell');
const { openAt } = require('../support/navigation');

/**
 * #116 — the breadcrumb reads the Section out as a name, not as a row id.
 *
 * Every Teacher screen under `/teacher/teacherDashboard/:sectionId/*` drew that
 * id straight into the trail: *รายวิชาที่รับผิดชอบ › 3 ›  …*. The delivered
 * system drew a name there, because its own address carried one
 * (`{subject}-Section-{n}`); the rebuild moved the Section into the URL as a key
 * (ADR-0004) and the trail went on printing whatever the segment said. So this
 * is a restoration and not an addition, which is what `docs/06` §Out of Scope
 * asks first.
 *
 * ## Why the fixture is Section 3
 *
 * `section_id` is a surrogate key and `section_number` is a label — the
 * migration says so beside the column. In the seed they coincide for the
 * Section this account is normally sent to (id 1 is number 1), so a trail that
 * prints the id and a trail that prints the name read **the same** there, and a
 * row built on it would pass either way. Id 3 is number *1*, of 2568/1, and it
 * is the one place the two disagree.
 *
 * The label is the ticket's target sentence, *ตอนเรียน 1 · ปีการศึกษา 2569*, and the
 * year is not decoration there: it is the only half that tells `section_id` 1
 * and 3 apart, both of which are *ตอนเรียน 1*.
 *
 * It also disposes of the ticket's own fallback. It offers *ตอนเรียน {id}* as
 * the cheap version, "without waiting for data from the server" — which on this
 * Section would read *ตอนเรียน 3*, a sentence about a class that does not
 * exist. There is no truthful label in the address alone.
 *
 * ## Why it is reachable at all
 *
 * The dashboard lists this term only, so nothing on screen links to a Section
 * of 2568. The address does: `GET /api/teaching/sections/:id` is deliberately
 * not restricted to the current term (`backend/routes/teaching.js`), for the
 * Teacher who follows a link to last year's class. These rows type the address,
 * which is the way in a person has.
 *
 * ## What is not here
 *
 * Two things, both deliberate.
 *
 * Whether the trail *looks* right — the separators, the weight of the last
 * crumb — is appearance and stays a hand-walked row on `docs/acceptance/10`.
 *
 * And the superseded-answer guard the resolver carries (#133's family) has no
 * row here: it needs two Sections of one account reachable from one another
 * without the shell coming down, and the dashboard draws one card. The sheet
 * says so with the date and what would expire it, rather than a mark.
 */

/** Every crumb the trail draws, in order, as a person reads them. */
const crumbsOn = async page =>
  (await breadcrumb(page).getByRole('link').allTextContents()).map(text => text.trim());

const DASHBOARD = 'รายวิชาที่รับผิดชอบ';
const MAPPING = 'ความเชื่อมโยงผลการเรียนรู้และกิจกรรม';

/** Section 3 is Section *1* of 2568/1, and `teacher.one@` teaches it. */
const OTHER_YEAR = 3;

/** Section 1 is Section *1* of the current term, which is the ticket's example. */
const THIS_YEAR = 1;

/** What the trail should say at each of the two, and the ticket's own sentence. */
const LAST_YEAR_LABEL = 'ตอนเรียน 1 · ปีการศึกษา 2568';
const THIS_YEAR_LABEL = 'ตอนเรียน 1 · ปีการศึกษา 2569';

/** Section 2 belongs to another account, so the server answers 404 for this one. */
const NOT_THEIRS = 2;

test('row 1: the Section crumb reads its number, not the id in the address', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await page.goto(`/teacher/teacherDashboard/${OTHER_YEAR}`);

  // Polling rather than reading once: the label arrives with an answer, and the
  // value polled for is not the value on screen before it — the trail says `3`
  // until the Section is resolved, so this cannot pass early.
  await expect.poll(() => crumbsOn(page)).toEqual([DASHBOARD, LAST_YEAR_LABEL]);
});

test('row 2: a screen below the Section reads it the same way', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await page.goto(`/teacher/teacherDashboard/${OTHER_YEAR}/outcomeActivityMapping`);

  // The deeper screen is the half of the claim that matters most: there are
  // sixteen of them under one id, and `TeacherSection` — the index — is the
  // only one that fetches the Section for itself. Everywhere else the shell is
  // the only thing that knows.
  await expect.poll(() => crumbsOn(page)).toEqual([DASHBOARD, LAST_YEAR_LABEL, MAPPING]);
});

test("row 3: the year is the Section's own, not the one the clock is in", async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await page.goto(`/teacher/teacherDashboard/${THIS_YEAR}`);

  // The ticket's own example, and the row that tells two claims apart (#145).
  // Rows 1 and 2 sit on a Section of 2568, so a trail that wrote the year of
  // *today's* term would read correctly here and wrongly there, while one that
  // left the year out reads wrongly in both. A row each way, with a mutant each,
  // is what makes the year a claim rather than a decoration.
  await expect.poll(() => crumbsOn(page)).toEqual([DASHBOARD, THIS_YEAR_LABEL]);
});

test('row 4: a Section that is refused leaves the crumb saying nothing untrue', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);

  const refusal = await openAt(
    page,
    `/teacher/teacherDashboard/${NOT_THEIRS}`,
    inDocument =>
      // Matched by path alone and not by status, because a predicate that asked
      // for 404 would make the assertion below unable to fail: a route that
      // answered 200 would time out here instead of reading as a red, and the
      // row would be about the waiter rather than about the refusal (#50).
      inDocument.waitForResponse(
        answer => new URL(answer.url()).pathname === `/api/teaching/sections/${NOT_THEIRS}`,
      ),
  );
  expect(refusal.status()).toBe(404);

  // A settle point and not a wait: the button below is drawn from the same
  // refusal, so once it is on screen the resolver has had its answer too. The
  // crumb is then read once. Polling for the value here would be a read that
  // cannot fail — `2` is also what the trail says before any answer arrives.
  await expect(page.getByRole('button', { name: 'กลับไปที่รายวิชาที่สอน' })).toBeVisible();

  expect(await crumbsOn(page)).toEqual([DASHBOARD, String(NOT_THEIRS)]);
});

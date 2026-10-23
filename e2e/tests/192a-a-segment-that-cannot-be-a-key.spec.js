'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { breadcrumb } = require('../support/shell');

/**
 * #192 — the shell asks nobody to name a segment that cannot be a key.
 *
 * `Mainpage.js` tests *is this segment all digits* in three places, with the
 * same expression written out three times: `teacherSectionCrumb` (#116),
 * `labelledIdCrumb`'s `numeric` (#185) and `wordCrumbLabel` (#189). The ticket
 * asks whether to consolidate them, and cites #97 — two places holding one
 * opinion is a claim neither of them can be shown to hold.
 *
 * ## Why these two rows exist, and why they come before the merge
 *
 * Because the claim was not held anywhere. Measured on 22 October 2569, by
 * widening one copy at a time so that every segment reads as an id and running
 * `116a`, `185a`, `188a` and `10a` against each:
 *
 * | copy | widened | what went red |
 * |---|---|---|
 * | `teacherSectionCrumb` | 22 passed | nothing |
 * | `labelledIdCrumb` | 22 passed | nothing |
 * | `wordCrumbLabel` | 1 failed / 21 passed | `185a` row 1 |
 *
 * So one of the three was held by a row and two by nothing at all — and not
 * because the situation is unreachable. `:sectionId` matches any segment,
 * `rubrics/:rubricId/criteria` matches `/main/rubrics/<word>/criteria`, and
 * `courseOutcomes/:cloId/criteria` matches a word at the fifth segment; what no
 * spec did was *type* such an address. A grep of `e2e/` for one found five
 * matches and all five were `:id` written in a comment.
 *
 * The owner chose to write these rows **first and merge after**: while the three
 * copies still stand, each row holds its own copy, which is the only arrangement
 * in which #97's three claims are ever separately proved. The merge then makes
 * them one claim about one expression with three ways in (#191), and the three
 * mutants at the three call sites are what say each way in arrives there.
 *
 * ## What the rows assert, and why it is the request and not the screen
 *
 * That no request is made for a name the segment cannot have. On a word at an
 * id's position the crumb reads the word either way — with the guard because
 * nothing was asked, and without it because the answer is a 404 and a refusal
 * is left to say nothing (#116's row 4). The two are the same drawing, so the
 * drawn text cannot tell them apart and the request can.
 *
 * It has to be the resolver's *own* path, exactly. The address below each row's
 * word is a screen that asks for its own data under the same prefix, so a
 * prefix matcher would answer *the shell asked* about a request the screen made
 * (#218). `/api/teaching/sections/:id` is the shell's alone — of the seventeen
 * screens under that id only `TeacherSection`, the index, fetches the Section
 * for itself, which is why these rows stand on a deeper screen. `/api/rubrics/:id`
 * is the shell's alone too: `RubricCriteria` reads
 * `/api/rubrics/:id/criteria` and never the rubric.
 *
 * The settle point is the screen's own answer and not its drawing, because that
 * answer is a round trip and the shell's request — if the guard let one out —
 * was sent in the same mount, so it is recorded before any answer comes back.
 * Waiting for the screen's refusal sentence instead would be a wait for a
 * drawing on a row whose whole subject is a request that was never made.
 *
 * ## What is not here
 *
 * `wordCrumbLabel`, which row 1 of `185a` holds. And what the trail *looks*
 * like, which is appearance and stays a hand-walked row on
 * `docs/acceptance/10`.
 */

/** Every crumb the trail draws, in order, as a person reads them. */
const crumbsOn = async page =>
  (await breadcrumb(page).getByRole('link').allTextContents()).map(text => text.trim());

const HOME = 'หน้าหลัก';
const DASHBOARD = 'รายวิชาที่รับผิดชอบ';
const MAPPING = 'ความเชื่อมโยงผลการเรียนรู้และกิจกรรม';
const RUBRICS = 'ข้อมูล Rubric กลาง';
const RUBRIC_CRITERIA = 'เกณฑ์การให้คะแนนของ Rubric';

/**
 * A segment that cannot be a key — and the one that is wrong under a weaker
 * guard rather than under none.
 *
 * `abc` would do for a guard that is absent, but the fixture is built where two
 * implementations disagree and not merely where one is missing (#117). `1a` is
 * what `parseInt` reads as `1` and `Number.isInteger(parseInt(s))` accepts,
 * which is the shape a consolidated helper is most likely to be written as; it
 * is also still a word to `breadcrumbNameMap`, which holds no entry for it, so
 * the crumb falls through to the segment itself.
 */
const NOT_A_KEY = '1a';

/** Every request the page makes from here on, by pathname. */
const pathsAsked = page => {
  const asked = [];
  page.on('request', request => asked.push(new URL(request.url()).pathname));
  return asked;
};

test('row 1: a Section segment that cannot be a key is never asked about', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);

  const asked = pathsAsked(page);

  // Matched by the request and not by the status, which is asserted below: a
  // predicate that filtered on 404 would make that `expect` read back what it
  // had guaranteed, and a route that answered otherwise would hang here and die
  // at the timeout instead of reading as a red (#116).
  const screenAnswered = page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname ===
      `/api/teaching/sections/${NOT_A_KEY}/outcome-activity-map`,
  );
  await page.goto(`/teacher/teacherDashboard/${NOT_A_KEY}/outcomeActivityMapping`);

  // The screen's own call is refused for the same reason the shell must not make
  // one: `integerId` answers `null` for a segment this schema could not hold,
  // and every route turns that into its own ไม่พบ (`backend/lib/fields.js`).
  expect((await screenAnswered).status()).toBe(404);

  expect(asked).not.toContain(`/api/teaching/sections/${NOT_A_KEY}`);
  expect(await crumbsOn(page)).toEqual([DASHBOARD, NOT_A_KEY, MAPPING]);
});

test('row 2: a Rubric segment that cannot be a key is never asked about', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);

  const asked = pathsAsked(page);

  const screenAnswered = page.waitForResponse(
    answer => new URL(answer.url()).pathname === `/api/rubrics/${NOT_A_KEY}/criteria`,
  );
  await page.goto(`/main/rubrics/${NOT_A_KEY}/criteria`);

  expect((await screenAnswered).status()).toBe(404);

  expect(asked).not.toContain(`/api/rubrics/${NOT_A_KEY}`);

  // The last crumb comes through `breadcrumbNameMap` rather than through
  // `wordCrumbLabel`'s pair, and on this address that is right: the word above
  // the id is `1a` itself, so the pair misses, and the map's one sentence for
  // `criteria` is this screen's. #189's open half is the *other* address, where
  // the same fallthrough names the wrong screen; `Mainpage.js` says so over
  // `wordCrumbLabel` with the date, and it is not this ticket's.
  expect(await crumbsOn(page)).toEqual([HOME, RUBRICS, NOT_A_KEY, RUBRIC_CRITERIA]);
});

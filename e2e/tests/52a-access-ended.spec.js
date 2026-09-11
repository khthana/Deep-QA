'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { COHORTS, resetValidity } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { E2E_SCHEMA } = require('../support/env');
const { menuLink } = require('../support/shell');
const { SIGN_IN_HEADING, attemptSignIn, refusalBanner } = require('../support/sign-in-screen');
const { cohortLine, intakePicker, showIntake } = require('../support/program-results-screen');
const { openPrograms, waitForList } = require('../support/programs-screen');

/**
 * docs/acceptance/11-user-accounts.md - #52, what the browser does when an
 * account stops being usable while it is still holding a good cookie.
 *
 * `sessionAdmission` already refuses the very next request (`11c` is where
 * that is proved, with the screen's own suspend button). What was left was the
 * person at the other end of that refusal: a red banner on whatever screen they
 * were on, beside a page they could no longer use, or - if they typed an
 * address - a silent return to the sign-in page with nothing said at all.
 *
 * The account is changed in the database rather than through the screen,
 * because these rows are about the suspended person's browser and not about
 * the administrator's. How an account comes to be suspended is `11c`'s claim;
 * how its window comes to close is a calendar's.
 *
 * Every row puts the account back in a `finally`. Specs share one schema and
 * run in file order, and `departmentAdmin01` and the assessor both sign in
 * again in later files.
 */

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(() => db.end());

const setStatus = (userId, status) =>
  db.query(`UPDATE users SET status = $2 WHERE user_id = $1`, [userId, status]);

/** The sign-in screen, drawn, which the rows below arrive at. */
const signInHeading = page => page.getByRole('heading', { name: SIGN_IN_HEADING });

/**
 * Signed in as the department administrator, on a screen whose own request has
 * already been answered.
 *
 * `signIn` returns once the address has settled, which is before the landing
 * screen's list comes back - and a list that comes back *after* the suspension
 * below is refused, and since #52 it takes the person to sign-in before the
 * row has clicked anything. The first green run met exactly that: the failure
 * screenshot was the sign-in page with the right sentence on it, and the menu
 * link the row went on to press was no longer there. So the row settles on a
 * screen first, and the request it is about is the one it makes itself.
 */
async function settledAsDepartmentAdmin(page) {
  await signIn(page, ACCOUNTS.departmentAdmin01);
  await openPrograms(page);
}

test('row 1: an account suspended mid-session is taken to sign-in on its next request, and told why', async ({
  page,
}) => {
  await settledAsDepartmentAdmin(page);
  await setStatus(IDS.departmentAdmin01, 'inactive');
  try {
    // A request from inside the shell that was already drawn - no reload, so
    // nothing re-reads `/api/me` on the way. The users screen asks the server
    // for its list the moment it opens.
    await menuLink(page, 'ข้อมูลผู้ใช้งาน').click();

    // The heading before the sentence. Before #52 the users screen drew the
    // same sentence in its own banner, which is also `role="alert"`, so the
    // sentence alone cannot tell being told on the sign-in page from being
    // told beside a screen that is no longer usable.
    await expect(signInHeading(page)).toBeVisible();
    await expect(refusalBanner(page)).toHaveText(REFUSALS.inactive);
  } finally {
    await setStatus(IDS.departmentAdmin01, 'active');
  }
});

test('row 2: an assessor whose window ends mid-session is taken to sign-in the same way', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.externalAssessor);
  // Their one screen, settled on a report, so the request below is a change of
  // intake and not the screen's first load.
  await expect(cohortLine(page)).toBeVisible();

  await db.query(
    `UPDATE users SET valid_from = CURRENT_DATE - 20, valid_until = CURRENT_DATE - 10
      WHERE user_id = $1`,
    [IDS.externalAssessor],
  );
  try {
    // Whichever seeded intake is not already on screen: choosing the one that
    // is fires no request, and then nothing would be asked of the server.
    const current = await intakePicker(page).inputValue();
    const other = COHORTS.map(cohort => cohort.admission).find(year => year !== current);
    await showIntake(page, other);

    await expect(signInHeading(page)).toBeVisible();
    // The sentence that says what to do next - ask for the round to be
    // extended - rather than the one for a window that has not yet opened.
    await expect(refusalBanner(page)).toHaveText(REFUSALS.validityEnded);
  } finally {
    await resetValidity(db, 'U_EXT');
  }
});

test('row 3: an address typed after the suspension says why, rather than landing on sign-in in silence', async ({
  page,
}) => {
  await settledAsDepartmentAdmin(page);
  await setStatus(IDS.departmentAdmin01, 'inactive');
  try {
    // The path #52's walk found: a full load, so the first thing the shell
    // asks is `GET /api/me`, and until #52 its refusal was read as *nobody
    // signed in* and the route guard sent the person to `/` without a word.
    await page.goto('/main/rubrics');

    await expect(signInHeading(page)).toBeVisible();
    await expect(refusalBanner(page)).toHaveText(REFUSALS.inactive);
  } finally {
    await setStatus(IDS.departmentAdmin01, 'active');
  }
});

test('row 4: the session is ended, not only hidden - reactivated, the account still has to sign in', async ({
  page,
}) => {
  await settledAsDepartmentAdmin(page);
  await setStatus(IDS.departmentAdmin01, 'inactive');
  try {
    // The sign-out is sent without being waited for, and the `goto` below
    // would cancel it in flight - which would leave the cookie and fail this
    // row for a reason that is not about the row. So the row waits for it,
    // and only waits: whether one was sent at all is what the last line asks,
    // and a browser that never sends it has to get there to be caught by it.
    const signedOut = page
      .waitForResponse(response => new URL(response.url()).pathname === '/api/auth/logout', {
        timeout: 5_000,
      })
      .catch(() => null);
    await menuLink(page, 'ข้อมูลผู้ใช้งาน').click();
    await expect(signInHeading(page)).toBeVisible();
    await signedOut;
  } finally {
    await setStatus(IDS.departmentAdmin01, 'active');
  }

  // Taken back to sign-in means signed out. A browser that only drew the
  // sign-in page over a cookie it kept would walk straight back in the moment
  // the account was reactivated, as whoever held that cookie - which on a
  // shared machine is not necessarily the person now at the keyboard.
  await page.goto('/main/programs');
  await expect(signInHeading(page)).toBeVisible();
});

test('row 5: a screen refused three times at once signs the person out once', async ({
  page,
}) => {
  await settledAsDepartmentAdmin(page);

  const signOuts = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/auth/logout') signOuts.push(request);
  });

  await setStatus(IDS.departmentAdmin01, 'inactive');
  try {
    // The register asks for its list and for two pickers' options on opening,
    // none of them waiting on another, so all three are refused.
    const refused = ['/api/students', '/api/students/programs', '/api/students/departments'].map(
      path =>
        page.waitForResponse(response => new URL(response.url()).pathname === path),
    );
    await menuLink(page, 'ข้อมูลนักศึกษากลาง').click();
    for (const response of await Promise.all(refused)) {
      expect(response.status()).toBe(403);
      await response.finished();
    }
    await expect(signInHeading(page)).toBeVisible();

    // Read once, as a value, and not with a retrying assertion: a retrying
    // `toHaveLength(1)` passes the moment the first sign-out goes, before the
    // other two refusals have been read. The settle point is every refusal
    // answered and a second for the page to read each one. A second too short
    // could only let the mutant through, never fail a build that is right,
    // and `signsoutpereach` is the measurement that it is long enough.
    await page.waitForTimeout(1000);
    expect(signOuts).toHaveLength(1);
  } finally {
    await setStatus(IDS.departmentAdmin01, 'active');
  }
});

test('row 6: ended, signed in again in the same tab, and ended again - signed out the second time too', async ({
  page,
}) => {
  await settledAsDepartmentAdmin(page);
  await setStatus(IDS.departmentAdmin01, 'inactive');
  try {
    await menuLink(page, 'ข้อมูลผู้ใช้งาน').click();
    await expect(signInHeading(page)).toBeVisible();
  } finally {
    await setStatus(IDS.departmentAdmin01, 'active');
  }

  // Back in through the form already on screen. Not `signIn`: its `goto`
  // loads the page afresh and takes the shell's memory of the first ending
  // with it, and that memory - row 5's once-only - is what this row is about.
  const landed = waitForList(page);
  const answer = await attemptSignIn(page, { email: ACCOUNTS.departmentAdmin01, password: PASSWORD });
  expect(answer?.status()).toBe(200);
  expect((await landed).status()).toBe(200);

  await setStatus(IDS.departmentAdmin01, 'inactive');
  try {
    const signedOut = page.waitForResponse(
      response => new URL(response.url()).pathname === '/api/auth/logout',
      { timeout: 10_000 },
    );
    await menuLink(page, 'ข้อมูลผู้ใช้งาน').click();
    await expect(signInHeading(page)).toBeVisible();
    // A once-only that is never reset is once per tab, not once per ending:
    // the second ending would draw the sign-in page over a cookie it kept.
    expect((await signedOut).status()).toBe(200);
  } finally {
    await setStatus(IDS.departmentAdmin01, 'active');
  }
});

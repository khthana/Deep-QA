'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { BACKEND_URL } = require('../support/env');
const {
  PROGRAM_SUBJECTS,
  PROGRAM_SUBJECTS_API,
  actingButton,
  switchTo,
} = require('../support/shell');
const { RUBRICS, API, listedCodes, openRubrics } = require('../support/rubrics-screen');

/**
 * #155 — what the open screen shows when the grant under it changes.
 *
 * #81 answered the *route* half of the same press: a switch now navigates to
 * the first entry of the new grant's own menu, so the screen standing open
 * unmounts and the next one asks for its data under the new hat. That carried
 * most of this ticket away, and its own spec file says what it leaves: the case
 * where the address does not change, because the person is already standing on
 * the landing of the grant they are putting on. `navigate` then goes where the
 * router already is, nothing remounts, and nothing asks the server anything.
 *
 * **The ticket's measurement is dated and the dates matter.** Its table was
 * taken on 23 September 2569, six days before #81 landed, and two of its four
 * rows read differently today: the URL does change, and the stale table is
 * gone. Measured again on 10 October 2569, the sequence it describes
 * (`course-in-program`, committee → teacher) now navigates to
 * `/teacher/teacherDashboard`, draws no rows of the old screen, and asks
 * `/api/program-subjects` nothing. The residue below is what is left of it.
 *
 * ## The situation the residue needs, and why it is a row and not a note
 *
 * `landingPath` is keyed on `role_id` alone, so two grants of one role code at
 * different scopes land on the same screen - and `81a`'s docstring, written
 * when the shape had no fixture, says no seeded account has it. It does not
 * need one: the grants route of #12 makes the shape at runtime, which is what
 * `grantSecondScope` below does with `admin@`'s own session. So the residue is
 * measured rather than argued, and the seed is left as it is.
 *
 * Why this screen: `/main/rubrics` is the committee's landing *and* its list is
 * scoped by the acting grant (`coveredScopes` in `backend/routes/rubrics.js`),
 * so the two scopes answer with different rows - 0501's eleven and 0503's two,
 * numbered apart because `rubric_code` is UNIQUE institution-wide. A landing
 * whose data did not move with the grant could not fail these rows.
 *
 * ## Two rows, because the answer chosen has two halves
 *
 * The owner settled it on 10 October 2569: *re-read, but only where the address
 * does not change*. So row 1 is the re-read, and row 2 is the half that says it
 * is only there - the screen a moving switch is leaving is not re-read under the
 * new grant on its way out. Row 2 is what an unconditional remount would fail:
 * keying the outlet on the acting grant alone remounts the screen being left,
 * firing its load under a hat that may not read it, and the refusal would be
 * drawn for the moment it takes the navigation to land.
 */

const COMMITTEE = 'กรรมการหลักสูตร';
const FIRST_SCOPE = '0501';
const SECOND_SCOPE = '0503';

/**
 * The grant both rows stand on, made once for the file and taken back once.
 *
 * It is in `beforeAll` and not in each row because a timed-out row has its own
 * context closed before its `finally` runs - the first draft put the revoke
 * there and the only thing the red said was *Target page, context or browser
 * has been closed*, over the assertion that had actually failed (#181). A
 * worker-scoped context outlives that, so the fixture is taken back whatever
 * the rows do.
 *
 * Sharing it between the two rows costs them nothing: it is an instrument and
 * neither row's claim lives in it (#171).
 */
let release;
let admin;
let cleanupFailure = null;

test.beforeAll(async ({ playwright }) => {
  release = await hold();
  admin = await playwright.request.newContext();

  // Through the API as `admin@` rather than through #12's screen: the rows
  // below are about what a switch does to an open screen, and a grant made by
  // clicking would put the grants panel's own behaviour inside their premise.
  // It is the same route that screen posts to.
  const inn = await admin.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.systemAdmin, password: PASSWORD },
  });
  expect(inn.status(), 'the administrator who makes the fixture').toBe(200);

  const made = await admin.post(`${BACKEND_URL}/api/users/${IDS.multiRole}/roles`, {
    data: { role_id: 'PROG_MANAGER', scope_id: SECOND_SCOPE },
  });
  expect(made.status(), 'the second committee grant').toBe(201);
});

test.afterAll(async () => {
  // Below the seam the rows are about - over HTTP rather than through a screen -
  // so it lands while a mutant has the frontend broken. It asserts nothing
  // here: its own failure is carried to the hook below rather than thrown over
  // whatever a row was saying (#181).
  try {
    const undone = await admin.delete(
      `${BACKEND_URL}/api/users/${IDS.multiRole}/roles/PROG_MANAGER/${SECOND_SCOPE}`,
    );
    if (undone.status() !== 200) {
      cleanupFailure = `the second grant was answered ${undone.status()} on the way out`;
    }
  } catch (error) {
    cleanupFailure = `the second grant could not be revoked: ${error.message}`;
  }
  await admin.dispose();
  release();
});

// Last, so a fixture left behind fails the file rather than the next one.
test.afterAll(() => {
  if (cleanupFailure) throw new Error(cleanupFailure);
});

test('a switch that leaves the address where it is re-reads the screen under the new grant', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);
  await openRubrics(page);

  // The preconditions this row cannot be allowed to assume, asserted where
  // they are used (#51): the screen is the one the next grant also lands on,
  // and it is showing the scope being taken off.
  expect(new URL(page.url()).pathname, 'the screen the switch begins on').toBe(RUBRICS);
  const before = await listedCodes(page);
  expect(before, 'the first curriculum’s rubrics are what is drawn').toContain('RUB-01');

  await switchTo(page, `${COMMITTEE} ${SECOND_SCOPE}`);

  // The situation, said out loud: the hat changed and the address did not, so
  // nothing but the fix this row is about can have re-read anything.
  await expect(actingButton(page)).toHaveText(new RegExp(`${COMMITTEE} ${SECOND_SCOPE}`));
  expect(new URL(page.url()).pathname, 'the switch moved nobody').toBe(RUBRICS);

  // What this grant is owed, asked of the server through the page's own cookie
  // rather than written here - a list written here would be a claim about the
  // seed and not about the screen (#132). Asked rather than *waited for*:
  // a waiter on the screen's own call is a wait and not an assertion, and a
  // mutant that stops the call from being made would kill this row at a
  // timeout instead of at its claim (#139).
  const answer = await page.request.get(`${BACKEND_URL}${API}`);
  expect(answer.status(), 'the list the new grant is owed').toBe(200);
  const owed = (await answer.json()).rubrics.map(rubric => rubric.rubric_code);
  expect(owed, 'the two curricula answer differently, or this row proves nothing').not.toEqual(
    before,
  );

  // Bounded, so a screen that never re-reads fails here with the two lists
  // beside each other instead of running the file out of time and letting the
  // teardown have the last word.
  await expect
    .poll(() => listedCodes(page), {
      message: 'what the table shows once the new grant’s answer has been drawn',
      timeout: 15_000,
    })
    .toEqual(owed);
});

test('and a switch that moves does not re-read the screen it is leaving', async ({ page }) => {
  await signIn(page, ACCOUNTS.multiRole);

  const drawn = page.waitForResponse(
    response => new URL(response.url()).pathname === PROGRAM_SUBJECTS_API,
  );
  await page.goto(PROGRAM_SUBJECTS);
  expect((await drawn).status(), 'the screen the switch begins on').toBe(200);

  // Collected from the press onwards. The screen being left asks for
  // `/api/program-subjects` and the landing asks for `/api/rubrics`, so the two
  // are told apart by the path and never by a clock.
  const asked = [];
  page.on('request', call => asked.push(new URL(call.url()).pathname));

  await switchTo(page, `${COMMITTEE} ${SECOND_SCOPE}`);

  // The situation: this switch moves, which is what makes it the other half.
  await expect.poll(() => new URL(page.url()).pathname).toBe(RUBRICS);
  await expect
    .poll(() => asked.filter(path => path === API).length, {
      message: 'the landing’s own list, which says the navigation has landed',
    })
    .toBeGreaterThan(0);

  expect(
    asked.filter(path => path === PROGRAM_SUBJECTS_API),
    'the screen being left was not re-read under the new grant',
  ).toEqual([]);
});

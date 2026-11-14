'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { BACKEND_URL } = require('../support/env');
const { committeeLabel, actingButton, switchTo } = require('../support/shell');
const { statedLabel } = require('../support/stated-label');
const { PROGRAMS } = require('../../db/seed');
const {
  RUBRICS,
  API,
  listedCodes,
  openAddForm,
  openRubrics,
} = require('../support/rubrics-screen');
const { DASHBOARD, API: TEACHING_API } = require('../support/teaching-screen');

/**
 * #198 — what the re-read of #155 takes with it, and what it no longer does.
 *
 * #155 settled that a switch of hats which lands where the router already is
 * re-reads the open screen. The way that was built was a key on the shell's
 * `<Outlet />`: raising it remounted the screen, and a remount re-reads. #198
 * asked what *else* a remount throws away and the answer, measured on
 * 23 October 2569, was everything the screen was holding — the page it was on,
 * its filter, and a form typed and not yet saved. The owner chose the narrower
 * mechanism the same day: the generation is handed down the tree
 * (`frontend/src/context/ScreenGeneration.js`) and each landing names it as a
 * dependency of its own read, so the list is asked for again and nothing
 * unmounts.
 *
 * ## Why this file exists beside `155a` rather than inside it
 *
 * `155a` holds the two halves of #155: *the stayed-put switch re-reads* and
 * *the moving switch does not re-read the screen it is leaving*. Both of those
 * are still true and still proved there. What #198 adds is a claim neither of
 * those rows can make, because both were written about the table alone: that
 * the re-read happens **without the screen being replaced**. Row 1 below is
 * that claim, and it is the row the code before this ticket fails — measured
 * against the unfixed tree before the mutant was written (#203), where the
 * typed field is not wrong but gone, the dialog having gone with the remount.
 *
 * ## Row 2, and why #155's other half needed a second witness
 *
 * `155a`'s second row leaves `/main/course-in-program`, which is nobody's
 * landing — so under this ticket's mechanism that screen does not read the
 * generation at all, and a `RoleDropdown` that raised the generation on *every*
 * switch would no longer be caught there. Row 2 takes the same half of #155
 * through a screen that does read it: the committee's own landing, left for the
 * teacher's. Under the mechanism the key gave, the leaving screen's load fired
 * under a hat that may not read it; under this one nothing may ask again on the
 * way out either, and that is what row 2 measures.
 *
 * ## Row 3, and the half the first two rows could not see
 *
 * A remount re-read *everything the screen asked for on mount*; a dependency
 * re-reads one list. `Rubrics` asks for two — its rubrics, and the curricula
 * this account may place one in — and the second was fetched once, under a
 * comment saying it is a property of the grant. Under the key that was true by
 * construction, because a new grant meant a new mount. Under this mechanism it
 * is true only if that read names the generation too, and the review of
 * 23 October 2569 found it did not: the pool the form's picker draws from, and
 * the statement of which curriculum the screen is in, stayed the old hat's
 * until a reload. That is the defect #155 opened read the other way round — the
 * rows change scope and the picker over them does not — so row 3 holds the
 * second read, and the dependency was added for it. `Programs` carries the same
 * pair for departments; which screen proves a rule that holds on several is the
 * census's answer and not the subject's (#68, #171), and
 * [#230](https://github.com/khthana/Deep-QA/issues/230) is where that census is
 * owed.
 *
 * ## #276, 14 พ.ย. 2569 — the form lost its curriculum, and the rows read the statement
 *
 * The owner's answer to #276 drew the add and edit forms as rows of the table,
 * the delivered screen's way, and took their หลักสูตร field away: a new rubric
 * is written into the curriculum the list shows. So the picker rows 1 and 3
 * read the second read off is gone, and they read the screen's statement of
 * which curriculum it is in instead - the same list drawn in the one place it
 * still is. Row 4's claim was *which curriculum the form starts on*; with no
 * field it is *which curriculum the save writes into*, read off the request.
 * Row 5 was about `RubricForm`'s branch that left an existing rubric's
 * curriculum alone, and went with the field: the server never moved one on an
 * edit (`backend/routes/rubrics.js`), and nothing on the screen now can try.
 * `docs/acceptance/21-rubrics.md` §#276 is the record.
 */

const TEACHER = 'อาจารย์ผู้สอน';
const SECOND_SCOPE = '0503';

/**
 * The scope the seed already grants, which row 3 watches leave.
 *
 * A `PROG_MANAGER`'s scope is a curriculum, so these two strings are both the
 * grant's scope and the `program_id` the picker offers as an option value —
 * which is what lets one read answer *whose list is this*.
 */
const FIRST_SCOPE = '0501';

/** The second list `Rubrics` reads: what this account may place a rubric in. */
const REACHABLE = `${API}/programs`;

/** A code nothing in the seed carries, so finding it is finding what was typed. */
const TYPED = 'RUB-198';

/** What the screen says it is in, before the switch and after it. */
const nameOf = id => PROGRAMS.find(program => program.id === id).th;
const inFirst = page => statedLabel(page, 'หลักสูตร', nameOf(FIRST_SCOPE));
const inSecond = page => statedLabel(page, 'หลักสูตร', nameOf(SECOND_SCOPE));

/**
 * The second committee grant both this file's situations are reached through,
 * made once and taken back once — `155a`'s fixture, for `155a`'s reasons: it is
 * made over HTTP so that a mutant in the frontend cannot stop it being taken
 * back, and it is an instrument rather than a claim, so sharing it between the
 * rows costs them nothing (#171, #181).
 */
let release;
let admin;
let cleanupFailure = null;

test.beforeAll(async ({ playwright }) => {
  release = await hold();
  admin = await playwright.request.newContext();

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
  // Awaited since 14 พ.ย. 2569. Until #276 nothing in this file wrote a row
  // the hold had to take out, so a release left running past the hook cost
  // nothing; row 4 now saves `TYPED`, and the run that first did so left it in
  // 0503 for every later file to read.
  try {
    await release();
  } catch (error) {
    cleanupFailure = cleanupFailure ?? `the hold could not be released: ${error.message}`;
  }
});

// Last, so a fixture left behind fails the file rather than the next one.
test.afterAll(() => {
  if (cleanupFailure) throw new Error(cleanupFailure);
});

test('a switch that leaves the address where it is re-reads the list without taking the form with it', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);
  await openRubrics(page);

  // The preconditions, asserted where they are used (#51): the screen is the
  // one the next grant also lands on, and it is showing the scope being taken
  // off.
  expect(new URL(page.url()).pathname, 'the screen the switch begins on').toBe(RUBRICS);
  const before = await listedCodes(page);
  expect(before, 'the first curriculum’s rubrics are what is drawn').toContain('RUB-01');

  // The thing a remount throws away. A code typed and not saved, in the one
  // field on the screen whose contents cannot have come from the server.
  await openAddForm(page);
  const code = page.getByPlaceholder(/เช่น RUB-/);
  await code.fill(TYPED);
  await expect(code, 'what was typed, before the switch').toHaveValue(TYPED);

  // Collected from the press onwards, because what the table is showing cannot
  // be read while the form is open - the dialog replaced the list rather than
  // sitting over it, measured 23 October 2569. Since #276 the form is a row of
  // the table and the list's loading line stands under it while the read is
  // out, so the drawing is still `155a` row 1's claim and this row still reads
  // the *request*, which is the half the form's survival has to be paired with.
  const asked = [];
  page.on('request', call => {
    if (call.method() === 'GET' && new URL(call.url()).pathname === API) asked.push(call.url());
  });

  // The second read's answer, asked for before the press so the row can wait
  // for it rather than race it. Until 23 October 2569 this row read the field
  // from the press onwards and was red about three runs in five: the form is
  // thrown away by `RubricForm`'s own effect when this answer sets `programs`,
  // so a retrying read that happened to see the field before the answer landed
  // passed, and the claim was measured at the wrong moment (#152, #232).
  const pool = page.waitForResponse(
    answer =>
      answer.request().method() === 'GET' && new URL(answer.url()).pathname === REACHABLE,
  );

  await switchTo(page, committeeLabel(SECOND_SCOPE));

  // The situation, said out loud: the hat changed and the address did not.
  await expect(actingButton(page)).toContainText(committeeLabel(SECOND_SCOPE));
  expect(new URL(page.url()).pathname, 'the switch moved nobody').toBe(RUBRICS);

  // The settle point is what the answer carries rather than the answer itself
  // (#132): the statement of the new curriculum is the drawing that says the
  // second read has been applied to this screen - the form's own picker until
  // #276. Row 3 is where that is a claim; here it is the precondition that
  // puts the field's read on the far side of it (#51).
  await pool;
  await expect(
    inSecond(page),
    'the second read has landed and the screen has been drawn from it',
  ).toBeVisible({ timeout: 15_000 });

  // #198's own claim, and first, because it is the one the remount fails: the
  // form is still open and still holds what was typed into it.
  await expect(code, 'what was typed survived the switch').toHaveValue(TYPED);

  // And the other half of the pair, below it: the list *was* asked for again.
  // A row that only held the form would pass on a screen that had quietly
  // stopped re-reading, which is the opposite defect and the one #155 opened.
  await expect
    .poll(() => asked.length, {
      message: 'the list this screen asked for again under the new grant',
      timeout: 15_000,
    })
    .toBeGreaterThan(0);
});

test('and a switch that moves does not re-read the landing it is leaving', async ({ page }) => {
  await signIn(page, ACCOUNTS.multiRole);
  await openRubrics(page);

  // The precondition this row is built on: the screen being left is a landing,
  // and so is one of the screens that reads the generation at all. `155a`'s own
  // second row leaves a screen that does not, which is why this one exists.
  expect(new URL(page.url()).pathname, 'the landing the switch begins on').toBe(RUBRICS);

  // Collected from the press onwards. The screen being left asks for
  // `/api/rubrics` and the landing being arrived at asks for
  // `/api/teaching/sections`, so the two are told apart by the path and never
  // by a clock (#160).
  const asked = [];
  page.on('request', call => asked.push(new URL(call.url()).pathname));

  await switchTo(page, TEACHER);

  // The situation: this switch moves, which is what makes it the other half.
  await expect
    .poll(() => new URL(page.url()).pathname, {
      message: 'where the browser stands once the switch has landed',
    })
    .toBe(DASHBOARD);
  await expect
    .poll(() => asked.filter(path => path === TEACHING_API).length, {
      message: 'the landing’s own list, which says the navigation has landed',
    })
    .toBeGreaterThan(0);

  expect(
    asked.filter(path => path === API),
    'the landing being left was not re-read under the new grant',
  ).toEqual([]);
});

test('and the curricula the screen may place a rubric in are read again too', async ({ page }) => {
  await signIn(page, ACCOUNTS.multiRole);
  await openRubrics(page);

  // A committee member reaches one curriculum, which the screen states beside
  // หลักสูตร rather than offering. Until #276 the form's select was read here,
  // as the one control drawing every reachable curriculum whatever the count;
  // the form has no curriculum now, and the statement is that list drawn.
  await expect(
    inFirst(page),
    'the curriculum of the hat being taken off, which makes this read a green one first (#171)',
  ).toBeVisible();

  const asked = [];
  page.on('request', call => {
    if (call.method() === 'GET' && new URL(call.url()).pathname === REACHABLE) asked.push(call.url());
  });

  await switchTo(page, committeeLabel(SECOND_SCOPE));

  await expect(actingButton(page)).toContainText(committeeLabel(SECOND_SCOPE));
  expect(new URL(page.url()).pathname, 'the switch moved nobody').toBe(RUBRICS);

  // The claim: the pool is the new grant's. Both halves are read, because a
  // list that had gained the new curriculum and kept the old one would be a
  // different defect — the server decides what is in reach (ADR-0002) and a
  // committee member reaches exactly one.
  await expect(inSecond(page), 'the curriculum the new grant reaches is stated').toBeVisible({
    timeout: 15_000,
  });
  await expect(inFirst(page), 'and the one it does not reach is gone').toHaveCount(0);

  // The mechanism underneath the drawing, said out loud: the screen asked.
  expect(asked.length, 'the curricula in reach were asked for again').toBeGreaterThan(0);
});

test('and the curriculum a rubric typed across the switch is written into is the new hat\'s', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);
  await openRubrics(page);
  await expect(inFirst(page), 'the curriculum of the hat being taken off (#171)').toBeVisible();

  // Until #276 this row read the form's curriculum picker, which re-picked to
  // the new grant's while keeping what was typed (#232). The form has no
  // curriculum now: the screen adds the one it shows to the draft at the save,
  // so the claim is the save's request and the typed fields beside it.
  await openAddForm(page);
  const code = page.getByPlaceholder(/เช่น RUB-/);
  await code.fill(TYPED);
  await page.getByPlaceholder('เช่น การนำเสนอผลงาน').fill('ข้ามการสลับหมวก');
  await page.getByPlaceholder('เช่น Presentation').fill('Across the switch');

  const pool = page.waitForResponse(
    answer =>
      answer.request().method() === 'GET' && new URL(answer.url()).pathname === REACHABLE,
  );

  await switchTo(page, committeeLabel(SECOND_SCOPE));
  await expect(actingButton(page)).toContainText(committeeLabel(SECOND_SCOPE));
  await pool;
  await expect(inSecond(page)).toBeVisible({ timeout: 15_000 });
  await expect(code, 'what was typed is still there').toHaveValue(TYPED);

  // Into the curriculum the new grant reaches, and not the old one, which the
  // server would refuse (ADR-0002). `hold` takes the rubric out again.
  const [sent] = await Promise.all([
    page.waitForRequest(
      call => call.method() === 'POST' && new URL(call.url()).pathname === API,
    ),
    page.getByRole('button', { name: 'บันทึก', exact: true }).click(),
  ]);
  expect(sent.postDataJSON().program_id, 'the curriculum the save writes into').toBe(SECOND_SCOPE);
  expect(sent.postDataJSON().rubric_code).toBe(TYPED);
});

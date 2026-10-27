'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { BACKEND_URL } = require('../support/env');
const { committeeLabel, actingButton, switchTo } = require('../support/shell');
const {
  RUBRICS,
  API,
  listedCodes,
  openAddForm,
  openEditor,
  openRubrics,
  programPicker,
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

/** A rubric the seed files in `FIRST_SCOPE`, for the row that opens an editor. */
const SEEDED = 'RUB-01';

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
  release();
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
  // be read while the form is open - the dialog replaces the list rather than
  // sitting over it, measured 23 October 2569. So the drawing is `155a` row 1's
  // claim and this row reads the *request*, which is the half the form's
  // survival has to be paired with.
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
  // (#132): the picker's new option is the drawing that says the second read
  // has been applied to this form. Row 3 is where that is a claim; here it is
  // the precondition that puts the field's read on the far side of it (#51).
  await pool;
  await expect(
    page.getByRole('combobox').locator(`option[value="${SECOND_SCOPE}"]`),
    'the second read has landed and the form has been drawn from it',
  ).toHaveCount(1, { timeout: 15_000 });

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

  // The form is opened because its picker is where this list is drawn: a
  // committee member reaches one curriculum, which the screen states beside
  // หลักสูตร rather than offering, and the form's select is the one control
  // that draws every reachable curriculum as an option whatever the count.
  await openAddForm(page);
  const picker = page.getByRole('combobox');
  await expect(
    picker.locator(`option[value="${FIRST_SCOPE}"]`),
    'the curriculum of the hat being taken off, which makes this read a green one first (#171)',
  ).toHaveCount(1);

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
  await expect(
    picker.locator(`option[value="${SECOND_SCOPE}"]`),
    'the curriculum the new grant reaches is offered',
  ).toHaveCount(1, { timeout: 15_000 });
  await expect(
    picker.locator(`option[value="${FIRST_SCOPE}"]`),
    'and the one it does not reach is gone',
  ).toHaveCount(0);

  // The mechanism underneath the drawing, said out loud: the screen asked.
  expect(asked.length, 'the curricula in reach were asked for again').toBeGreaterThan(0);
});

test('and the curriculum the form starts on is the new hat\'s, not the old one\'s', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.multiRole);
  await openRubrics(page);

  // A committee member reaches exactly one curriculum, so the form picks it
  // rather than offering a choice - which is why the value this row reads is
  // the screen's own statement of which curriculum a rubric typed here would
  // be written into.
  await openAddForm(page);
  const picker = page.getByRole('combobox');
  await expect(picker, 'the curriculum of the hat being taken off (#171)').toHaveValue(FIRST_SCOPE);

  const code = page.getByPlaceholder(/เช่น RUB-/);
  await code.fill(TYPED);

  const pool = page.waitForResponse(
    answer =>
      answer.request().method() === 'GET' && new URL(answer.url()).pathname === REACHABLE,
  );

  await switchTo(page, committeeLabel(SECOND_SCOPE));
  await expect(actingButton(page)).toContainText(committeeLabel(SECOND_SCOPE));
  await pool;

  // The claim #232 added: what the person typed is kept and the curriculum
  // they never picked is re-picked, because the old one is not in reach any
  // more and a value outside the pool can be neither drawn nor saved
  // (ADR-0002, and row 3 above, where the pool being the new grant's is the
  // claim). Keeping everything would leave the picker pointing at a curriculum
  // the server would refuse.
  await expect(picker, 'the curriculum the new grant reaches').toHaveValue(SECOND_SCOPE, {
    timeout: 15_000,
  });
  await expect(code, 'and what was typed is still there beside it').toHaveValue(TYPED);
});

test("an existing rubric keeps its own curriculum even when that curriculum is retired", async ({
  page,
  playwright,
}) => {
  // The one situation that separates #232's two conditions, and so the only
  // one that can prove the branch which leaves an existing rubric alone.
  // `GET /api/rubrics/programs` answers with retired curricula too
  // (`reachablePrograms`: *Retired ones come too*), and the form keeps them out
  // of the pool it may auto-pick from, because auto-picking a retired one would
  // put the form in a state the server refuses before anybody has touched it.
  // So a rubric filed in a retired curriculum holds a `program_id` that is
  // **not** in the pool - the shape the second effect would re-pick if the
  // `editing` branch were not there, which would leave the form saying the
  // rubric belongs to a curriculum it does not belong to, and a save moving it.
  //
  // The seed has no retired curriculum (measured 23 October 2569), so the row
  // makes one over HTTP and puts it back in `finally`, for the reasons the
  // fixture at the head of this file gives: a mutant in the frontend cannot
  // stop the restore, and `workers: 1` means nothing else is reading the
  // curriculum while this row holds it switched off.
  // A curriculum is maintained by the faculty and the department, not by the
  // system administrator who makes this file's grant: `backend/routes/programs`
  // names `FACULTY_ADMIN` and `DEPT_ADMIN` and answers anybody else 403, which
  // is what the first draft of this row read (#107).
  const faculty = await playwright.request.newContext();
  const inn = await faculty.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.facultyAdmin, password: PASSWORD },
  });
  expect(inn.status(), 'the administrator who may switch a curriculum off').toBe(200);

  const read = await faculty.get(`${BACKEND_URL}/api/programs/${FIRST_SCOPE}`);
  expect(read.status(), 'the curriculum this row switches off for a moment').toBe(200);
  const { program } = await read.json();

  const off = await faculty.put(`${BACKEND_URL}/api/programs/${FIRST_SCOPE}`, {
    data: { ...program, is_active: false },
  });
  expect(off.status(), 'switching the curriculum off').toBe(200);
  const retired = await off.json();
  expect(retired.program.is_active, 'the situation this row is about').toBe(false);

  try {
    await signIn(page, ACCOUNTS.multiRole);
    await openRubrics(page);
    await openEditor(page, SEEDED);

    await expect(
      programPicker(page),
      'the rubric still says which curriculum it is in',
    ).toHaveValue(FIRST_SCOPE);
  } finally {
    const on = await faculty.put(`${BACKEND_URL}/api/programs/${FIRST_SCOPE}`, {
      data: { ...program, is_active: true },
    });
    if (on.status() !== 200) {
      cleanupFailure = `the curriculum was answered ${on.status()} when switched back on`;
    }
    await faculty.dispose();
  }
});

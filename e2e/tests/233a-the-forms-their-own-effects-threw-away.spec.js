'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { holdBack, wentThroughTheWindow } = require('../support/late-answer');
const { BACKEND_URL, E2E_SCHEMA } = require('../support/env');
const { createPool } = require('../../db/pool');
const { actingButton } = require('../support/shell');
const { PROGRAMS, openPrograms, openEditor } = require('../support/programs-screen');
const { SUBJECTS, openSubjects, departmentPicker } = require('../support/subjects-screen');
const { PLOS, openAddForm: openOutcomeForm } = require('../support/plos-screen');
const {
  PROGRAM_SUBJECTS,
  openProgramSubjects,
  openAddForm: openPairForm,
} = require('../support/program-subjects-screen');

/**
 * #233 — the four forms a re-read still threw away, and the two ways in.
 *
 * #232 fixed `rubrics/RubricForm`, whose effect wrote the whole draft again and
 * named `onlyOne` — a value derived from the answer by **identity** — in its
 * dependency list. The answer is a new array every time, so the effect re-ran
 * whenever the screen read the pool again, and it threw away a form typed and
 * not saved: the one thing #198 narrowed the remount in order to keep.
 * `grep -rln onlyOne frontend/src/components` found seven files, four of which
 * wrote the draft the same way. This file is those four.
 *
 * ## The two ways in are not alike, and only one of them has a screen today
 *
 * **A second read of the pool.** Under #198 that happens where the screen names
 * the generation as a dependency of the read, and of these four screens exactly
 * one does: `Programs.js` (measured against `useScreenGeneration` across
 * `frontend/src/pages`, 26 ตุลาคม 2569 — `Plos.js`, `ProgramSubjects.js` and
 * `Subjects.js` all end their pool read `}, [report])`). A department
 * administrator holding two grants switches hat, `landingPath` leaves them
 * where they are, the departments in reach are read again — and the form goes.
 * Rows 1 and 2 are that, and row 1 is the one the unfixed code fails.
 *
 * **The answer the mount itself was waiting for.** The pool is read once per
 * mount, and that answer alone moves `onlyOne` from `null` to an object. A
 * person who opens the add form and types before it lands loses what they typed
 * — on every one of the four screens, with no second grant and no switch. The
 * window is one HTTP round trip, which is why it is opened with
 * `late-answer.js` (#170) rather than by running the row again (#136), and it is
 * the only way in the other three screens have until their pool reads name the
 * generation. Rows 3, 4 and 5 are that, one per remaining form.
 *
 * ## Why four rows and not one
 *
 * The rule holds on four screens and the code is **copied** rather than shared,
 * so a mutant in one of the four is proved by nothing that presses another
 * (#83). Which screen proves a *shared* rule is the census's answer (#68,
 * #171); which screens prove four copies is all of them.
 *
 * ## What this file does not measure
 *
 * The `if (editing) return` branch is proved here for `ProgramForm` alone, by
 * row 2 — the one situation that separates the second effect's two conditions,
 * an existing row filed in something the pool keeps out. The same branch in
 * `PloForm`, `ProgramSubjectForm` and `SubjectForm` is reachable the same way
 * (retire the curriculum or the department the existing row sits in) and is
 * **untested rather than unreachable** — #102's three answers, and the third of
 * them is in the tracker rather than only in this paragraph.
 *
 * And the mount-answer way in is measured on three of the four screens, not on
 * four: `Programs.js` has rows 1 and 2, which both come in through the second
 * read, and its own add form races the same answer the other three do. That
 * window is **untested rather than unreachable** too — the row would be row 3's
 * shape over `openPrograms` — and it is the way in that needs no second grant,
 * so it is the cheaper of the two to write and the one left out here.
 */

/**
 * Department 01: the grant this file lends `deptadm05`, and also the single
 * department `deptadm01` reaches — which is why row 3 signs in as that account
 * and not as this file's borrower, who reaches two while the fixture stands and
 * so has no `onlyOne` at all.
 */
const DEPT_01 = '01';

/** Department 05: the seed's grant to `deptadm05`, and the hat row 1 puts on. */
const DEPT_05 = '05';

const DEPT_ADMIN = 'ผู้ดูแลระบบระดับภาควิชา';

/** The pool each screen reads, by the path the request names. */
const REACH = {
  programs: '/api/programs/departments',
  subjects: '/api/subjects/departments',
  plos: '/api/plos/programs',
  programSubjects: '/api/program-subjects/programs',
};

/** The one curriculum a committee member reaches, which is also its option value. */
const CURRICULUM = '0501';

/** Codes nothing in the seed carries, so finding one is finding what was typed. */
const TYPED = {
  programme: '0599',
  subject: '01099233',
  outcome: 'PLO-233',
};

/** A programme the seed files in `DEPT_05`, for the row that opens an editor. */
const SEEDED_PROGRAMME = '0501';

/**
 * How late a held-back answer is handed on.
 *
 * `late-answer.js`'s own 400ms is the width #170 needed for a raw read. These
 * rows have to sign in, open a screen, press เพิ่ม and type inside the window,
 * all of which happens after the mount that asked for the pool — measured at
 * about three seconds on 26 ตุลาคม 2569, where a 3000ms hold had already been
 * handed on before the form was opened and the rows read a drawn pool as their
 * own precondition. So it is widened here rather than in the instrument, and
 * the reads on the far side of it are given the room that leaves inside the
 * 60s test timeout.
 */
const LATE_BY = 15_000;

/** What a read on the far side of the window is allowed to wait. */
const PAST_THE_WINDOW = 25_000;

/**
 * The second department grant rows 1 and 2 are reached through, made once and
 * taken back once — `155a`'s and `198a`'s fixture, for their reasons: it is made
 * over HTTP so that a mutant in the frontend cannot stop it being taken back,
 * and it is an instrument rather than a claim, so sharing it between the rows
 * costs them nothing (#171, #181).
 */
let release;
let admin;
let cleanupFailure = null;
const cleanUp = createPool({ schema: E2E_SCHEMA });

test.beforeAll(async ({ playwright }) => {
  release = await hold();
  admin = await playwright.request.newContext();

  const inn = await admin.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.systemAdmin, password: PASSWORD },
  });
  expect(inn.status(), 'the administrator who makes the fixture').toBe(200);

  const made = await admin.post(`${BACKEND_URL}/api/users/${IDS.departmentAdmin05}/roles`, {
    data: { role_id: 'DEPT_ADMIN', scope_id: DEPT_01 },
  });
  expect(made.status(), 'the second department grant').toBe(201);
});

test.afterAll(async () => {
  try {
    const undone = await admin.delete(
      `${BACKEND_URL}/api/users/${IDS.departmentAdmin05}/roles/DEPT_ADMIN/${DEPT_01}`,
    );
    if (undone.status() !== 200) {
      cleanupFailure = `the second grant was answered ${undone.status()} on the way out`;
    }
  } catch (error) {
    cleanupFailure = `the second grant could not be revoked: ${error.message}`;
  }

  // And then the row itself, which the revoke above does not take out:
  // `DELETE /api/users/:id/roles/:role/:scope` is `UPDATE user_roles SET
  // is_active = false` (`backend/routes/grants.js`), on purpose, so the grant
  // stops being honoured and the record of it stays. `155a`'s and `198a`'s
  // grants are to a key the seed already holds, so a soft revoke puts that key
  // back as it was; this one is a key nothing had, and the full run of 26
  // ตุลาคม 2569 reported it as `user_roles: +1
  // deptadm05/DEPT_ADMIN/01` — a spec that writes takes it out again (#132),
  // and the only seam that can is the database.
  try {
    await cleanUp.query(
      `DELETE FROM user_roles
        WHERE user_id = $1 AND role_id = 'DEPT_ADMIN' AND scope_id = $2 AND NOT is_active`,
      [IDS.departmentAdmin05, DEPT_01],
    );
  } catch (error) {
    cleanupFailure = `the revoked grant's row could not be removed: ${error.message}`;
  }
  await cleanUp.end();

  await admin.dispose();
  release();
});

// Last, so a fixture left behind fails the file rather than the next one.
test.afterAll(() => {
  if (cleanupFailure) throw new Error(cleanupFailure);
});

/**
 * The programme form's two controls this file reads.
 *
 * The picker is found by its **role and name**, not by the label's words:
 * `Field` wraps the whole control in the `<label>`, so a wrapping label's text
 * content carries the `<option>`s with it while the accessible name is the
 * label's own words (#180, and `subjects-screen.js`'s `departmentPicker`
 * carries the measurement). The code field is an `<input>`, which contributes
 * no text of its own, so `getByLabel` is exact there.
 */
const codeField = page => page.getByLabel('รหัสหลักสูตร', { exact: true });
const departmentField = page => page.getByRole('combobox', { name: 'ภาควิชา' });

/**
 * Puts on the *other* department administrator grant.
 *
 * `shell.js`'s `switchTo` finds an entry by its words, and two `DEPT_ADMIN`
 * grants are drawn with the same words: `RoleDropdown`'s label carries the
 * scope for `PROG_MANAGER` and `EXT_ASSESSOR` alone, because what it draws
 * comes from `/api/me`, which answers no scope name at all. Which is
 * [#231](https://github.com/khthana/Deep-QA/issues/231)'s subject and the
 * owner's, not this ticket's — and it is also why the stayed-put switch on this
 * screen cannot be reached through the shared helper, a person telling the two
 * entries apart no better than the locator does.
 *
 * So they are told apart here the one way the screen tells them apart: the
 * acting grant carries the component's own `text-secondary`, and this presses
 * the entry that does not. The count is asserted beside it, because a locator
 * unique by accident of what is drawn is a locator that has stopped being the
 * claim (#93).
 */
async function switchToTheOtherDepartment(page) {
  await actingButton(page).click();

  const entries = page.locator('li > button', { hasText: DEPT_ADMIN });
  await expect(entries, 'two department grants, drawn with the same words').toHaveCount(2);

  const other = page.locator('li > button:not(.text-secondary)', { hasText: DEPT_ADMIN });
  await expect(other, 'the one entry that is not the grant already on').toHaveCount(1);

  const [answer] = await Promise.all([
    page.waitForResponse(
      response => new URL(response.url()).pathname === '/api/me/acting-role',
    ),
    other.click(),
  ]);
  expect(answer.status(), 'the server decided the switch, not the menu').toBe(200);
  return answer;
}

test('a switch of hats that stays put keeps the programme typed into the form, and moves the department to the one the new hat reaches', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openPrograms(page);

  // The precondition, asserted where it is used (#51): the screen is the one
  // the next grant also lands on, so the switch moves nobody. Both grants are
  // `DEPT_ADMIN`, whose landing is this screen - which is what makes this the
  // only screen in the suite where way in #1 can be reached at all, since
  // `Programs.js` is the one of the four whose pool read names the generation.
  expect(new URL(page.url()).pathname, 'the screen the switch begins on').toBe(PROGRAMS);

  await page.getByRole('button', { name: 'เพิ่มหลักสูตร' }).click();

  // A department administrator reaches exactly one department, so the form
  // picks it rather than leaving the choice open - which is the screen's own
  // statement of where a programme typed here would be filed, and is a read
  // that has been seen green before anything is broken (#171).
  //
  // It is also the only place the hat's scope is readable: the menu draws no
  // scope for this role (#231), so which of the two grants the session opened
  // on is said by this field and nowhere else. Measured 26 ตุลาคม 2569 - the
  // session opens on the grant the server lists first, which is the lent one.
  await expect(departmentField(page), 'the department of the hat being taken off').toHaveValue(
    DEPT_01,
  );

  // The thing a re-read threw away: a code typed and not saved, in the one
  // field on this form whose contents cannot have come from the server.
  const code = codeField(page);
  await code.fill(TYPED.programme);
  await expect(code, 'what was typed, before the switch').toHaveValue(TYPED.programme);

  // Asked for before the press so the row waits for the answer rather than
  // racing it: the fields are read on the far side of the read that was
  // throwing them away, which is where the claim lives (#152, #232).
  const pool = page.waitForResponse(
    answer =>
      answer.request().method() === 'GET' && new URL(answer.url()).pathname === REACH.programs,
  );

  await switchToTheOtherDepartment(page);

  // The situation, said out loud: the hat changed and the address did not. The
  // change of hat is read off the server's answer above and off the pool below,
  // the menu having no words for it (#231).
  expect(new URL(page.url()).pathname, 'the switch moved nobody').toBe(PROGRAMS);
  await pool;

  // The settle point is what the answer carried rather than the answer itself
  // (#132): the picker's new option is the drawing that says the second read
  // has reached this form.
  await expect(
    departmentField(page).locator(`option[value="${DEPT_05}"]`),
    'the second read has landed and the form has been drawn from it',
  ).toHaveCount(1, { timeout: 15_000 });

  // #233's own claim, and first, because it is the one the unfixed code fails.
  await expect(code, 'what was typed survived the re-read').toHaveValue(TYPED.programme);

  // And the half below it, which is why the effect is kept rather than deleted:
  // the department follows the new hat, because the old one is not in reach any
  // more and a value outside the pool is one the server refuses (ADR-0002). A
  // row holding only the typed code would pass on a form that had quietly
  // stopped following the pool at all.
  await expect(departmentField(page), 'the department the new grant reaches').toHaveValue(DEPT_05);
});

test('an existing programme keeps its own department even when that department is retired', async ({
  page,
  playwright,
}) => {
  // The one situation that separates the second effect's two conditions, and so
  // the only one that can prove the branch which leaves an existing programme
  // alone. `GET /api/programs/departments` answers with retired departments too
  // (`backend/lib/reach.js` - *Retired ones come too*), and the form keeps them
  // out of the pool it may pick from, because picking one would put the form in
  // a state the server refuses before anybody had touched it. So a programme
  // filed in a retired department holds a `department_id` the pool does not
  // contain - and with the branch gone, the faculty administrator, who reaches
  // two departments of which one is now retired, would be shown this programme
  // sitting in the other one.
  //
  // The seed has no retired department (26 ตุลาคม 2569), so the row makes one
  // over HTTP and puts it back in `finally`, for the head fixture's reasons.
  const faculty = await playwright.request.newContext();
  const inn = await faculty.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.facultyAdmin, password: PASSWORD },
  });
  expect(inn.status(), 'the administrator who may switch a department off').toBe(200);

  const read = await faculty.get(`${BACKEND_URL}/api/departments/${DEPT_05}`);
  expect(read.status(), 'the department this row switches off for a moment').toBe(200);
  const { department } = await read.json();

  const off = await faculty.put(`${BACKEND_URL}/api/departments/${DEPT_05}`, {
    data: { ...department, is_active: false },
  });
  expect(off.status(), 'switching the department off').toBe(200);

  try {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openPrograms(page);
    await openEditor(page, SEEDED_PROGRAMME);

    // The claim comes first and the picker's half second, which is the other
    // way round from how this row was written. `movesanexistingprogramme`
    // clears the field, and the option is drawn only because the field holds
    // it, so a precondition read above the claim took the red and left the
    // claim itself unread (#88). Read this way the mutant dies at the value,
    // and the count below says the picker can still name a retired department
    // for a programme that sits in one - nothing else here may be filed under
    // it, which is what makes the option's presence worth reading at all.
    await expect(
      departmentField(page),
      'the programme still says which department it is in',
    ).toHaveValue(DEPT_05);
    await expect(
      departmentField(page).locator(`option[value="${DEPT_05}"]`),
      'and the department it sits in is still drawn as an option',
    ).toHaveCount(1);
  } finally {
    const on = await faculty.put(`${BACKEND_URL}/api/departments/${DEPT_05}`, {
      data: { ...department, is_active: true },
    });
    if (on.status() !== 200) {
      cleanupFailure = `the department was answered ${on.status()} when switched back on`;
    }
    await faculty.dispose();
  }
});

test('the subject form keeps what was typed when the departments it may file under arrive after it was opened', async ({
  page,
}) => {
  // The second way in, which needs neither a second grant nor a switch: the
  // pool is read once on mount, and that answer alone moves `onlyOne` from
  // `null` to an object. Held back from inside the document (#170), because the
  // window is one round trip and rerunning the row does not widen it (#136).
  await holdBack(page, `^${REACH.subjects}$`, LATE_BY);

  await signIn(page, ACCOUNTS.departmentAdmin01);
  await openSubjects(page);
  expect(new URL(page.url()).pathname, 'the screen the form is opened on').toBe(SUBJECTS);

  await page.getByRole('button', { name: 'เพิ่มรายวิชา' }).click();

  // The precondition, counted on the options rather than read off the control,
  // because a reader that asks what a control holds cannot tell an absent
  // control from an empty one (#164). The list's own ภาควิชา is a statement and
  // not a second combobox while one department is reached, so this locator is
  // the form's picker alone.
  await expect(
    departmentPicker(page).locator(`option[value="${DEPT_01}"]`),
    'the pool has not been handed on yet',
  ).toHaveCount(0);

  const code = page.getByLabel('รหัสวิชา', { exact: true });
  await code.fill(TYPED.subject);

  // The answer's drawing is the settle point (#132): the option is what the
  // pool answer put on the screen.
  await expect(
    departmentPicker(page).locator(`option[value="${DEPT_01}"]`),
    'the pool has been handed on and the form drawn from it',
  ).toHaveCount(1, { timeout: PAST_THE_WINDOW });

  await expect(code, 'and what was typed survived it').toHaveValue(TYPED.subject);
  await expect(departmentPicker(page), 'the single department it may be filed under').toHaveValue(
    DEPT_01,
  );

  // The fixture is only a fixture if the screen went through it (#51).
  await wentThroughTheWindow(page);
});

test('the outcome form keeps what was typed when the curricula it may write into arrive after it was opened', async ({
  page,
}) => {
  await holdBack(page, `^${REACH.plos}$`, LATE_BY);

  await signIn(page, ACCOUNTS.committee0501);

  // Opened with a bare `goto` rather than through `plos-screen.js`'s
  // `openPlos`, which waits for the outcome list - and on this screen that list
  // is read *of* the curriculum the picker is on (#133), so it cannot be asked
  // for until the pool has landed. Waiting for it would therefore close the
  // very window this row is about: measured 26 ตุลาคม 2569, where the row spent
  // the whole 15s hold inside `openPlos` and then read a pool already drawn as
  // its own precondition. The add button is in the header and is drawn before
  // either answer, so pressing it needs no settle point at all; the `addInitScript`
  // wrapper reaches this document like any other, which the last line asserts.
  await page.goto(PLOS);
  expect(new URL(page.url()).pathname, 'the screen the form is opened on').toBe(PLOS);

  await openOutcomeForm(page);

  // By role and name rather than through `plos-screen.js`'s `programPicker`,
  // which finds the control *by* the curriculum option this row is waiting for
  // (#85, #111): built on that, the locator would answer *not there* about a
  // control that is drawn, both before the answer and after a defect threw the
  // form away.
  const picker = page.getByRole('combobox', { name: 'หลักสูตร' });
  await expect(
    picker.locator(`option[value="${CURRICULUM}"]`),
    'the pool has not been handed on yet',
  ).toHaveCount(0);

  const code = page.getByPlaceholder(/เช่น PLO-1/);
  await code.fill(TYPED.outcome);

  await expect(
    picker.locator(`option[value="${CURRICULUM}"]`),
    'the pool has been handed on and the form drawn from it',
  ).toHaveCount(1, { timeout: PAST_THE_WINDOW });

  await expect(code, 'and what was typed survived it').toHaveValue(TYPED.outcome);
  await expect(picker, 'the one curriculum a committee member writes into').toHaveValue(CURRICULUM);
  await wentThroughTheWindow(page);
});

test('the programme-subject form keeps what was chosen when the curricula arrive after it was opened', async ({
  page,
}) => {
  await holdBack(page, `^${REACH.programSubjects}$`, LATE_BY);

  await signIn(page, ACCOUNTS.committee0501);
  await openProgramSubjects(page);
  expect(new URL(page.url()).pathname, 'the screen the form is opened on').toBe(PROGRAM_SUBJECTS);

  await openPairForm(page);

  const picker = page.getByRole('combobox', { name: 'หลักสูตร' });
  await expect(
    picker.locator(`option[value="${CURRICULUM}"]`),
    'the pool has not been handed on yet',
  ).toHaveCount(0);

  // This form has no code of its own - the subject is chosen out of the
  // catalogue, which is a search of its own and state beside the draft rather
  // than in it, so the effect never reached it. What the effect did reach is
  // ประเภทรายวิชา, read here moved off the value `EMPTY` starts it at, so a
  // draft written again is a draft visibly back at `required`.
  const type = page.getByRole('combobox', { name: 'ประเภทรายวิชา' });
  await expect(type, 'the value the form opens on').toHaveValue('required');
  await type.selectOption('elective');

  await expect(
    picker.locator(`option[value="${CURRICULUM}"]`),
    'the pool has been handed on and the form drawn from it',
  ).toHaveCount(1, { timeout: PAST_THE_WINDOW });

  await expect(type, 'and what was chosen survived it').toHaveValue('elective');
  await expect(picker, 'the one curriculum a committee member writes into').toHaveValue(CURRICULUM);
  await wentThroughTheWindow(page);
});

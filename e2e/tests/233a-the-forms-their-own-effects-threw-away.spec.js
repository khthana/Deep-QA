'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { holdBack, wentThroughTheWindow } = require('../support/late-answer');
const { SUBJECTS, openSubjects } = require('../support/subjects-screen');
const { PLOS, openAddForm: openOutcomeForm } = require('../support/plos-screen');
const {
  PROGRAM_SUBJECTS,
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
 * Rows 1 and 2 were that, and row 1 was the one the unfixed code failed.
 *
 * **Both rows went with the picker on 18 พ.ย. 2569 (#282).** The owner took
 * the programmes screen off the Faculty Admin and its department off the form:
 * the server files a new programme under the acting grant's department and an
 * edit never moves one. `Programs.js` reads no pool any more, so row 1's re-read
 * is structurally unreachable rather than untested; and row 2's claim - an
 * existing programme keeps its own department - moved to the server, where
 * `backend/test/programs.test.js` holds it and `282:s282putmoves` is
 * its mutant. The rows below were 3, 4 and 5 until then, and the sweep records
 * in `docs/acceptance/10-application-shell.md` and `18-program-subjects.md`
 * cite them by those numbers (#54).
 *
 * **The answer the mount itself was waiting for.** The pool is read once per
 * mount, and that answer alone moves `onlyOne` from `null` to an object. A
 * person who opens the add form and types before it lands loses what they typed
 * — on every one of the four screens, with no second grant and no switch. The
 * window is one HTTP round trip, which is why it is opened with
 * `late-answer.js` (#170) rather than by running the row again (#136), and it is
 * the only way in the other three screens have until their pool reads name the
 * generation. Rows 1, 2 and 3 are that, one per remaining form (they were 3, 4
 * and 5 until #282).
 *
 * ## Why four rows and not one
 *
 * The rule held on four screens and the code is **copied** rather than shared,
 * so a mutant in one of the four is proved by nothing that presses another
 * (#83). Which screen proves a *shared* rule is the census's answer (#68,
 * #171); which screens prove copies is all of them - three since #282 took the
 * fourth copy away with the field it wrote.
 *
 * ## What this file does not measure
 *
 * The `if (editing) return` branch was proved here for `ProgramForm` alone,
 * by the row #282 withdrew. The same branch in `PloForm`, `ProgramSubjectForm`
 * and `SubjectForm` is `244a`'s (#244).
 *
 * Until 18 พ.ย. 2569 this paragraph also said `Programs.js`'s own add form
 * raced the mount's answer like the other three and was **untested rather than
 * unreachable**. Since #282 there is no pool and no answer to race, so that
 * window is gone rather than untested.
 *
 * **Row 1 is a net since 19 พ.ย. 2569 (#284).** The owner took the department
 * field off `SubjectForm`, so `Subjects.js` reads no pool and there is no
 * answer for what was typed to race: the claim is structurally unreachable
 * rather than untested (#102), and `233:subjectarrayidentity` is a record. The
 * row is kept rather than deleted so the rows after it keep their numbers,
 * which ninety-odd records cite; it now asserts the **mechanism** - nothing
 * asks for the departments in reach, and the form draws no field to re-pick -
 * and the condition that would re-date it is a department field back on the
 * form (#203).
 */

/** The pool each screen reads, by the path the request names. */
const REACH = {
  // Gone since #284; row 1 asserts nothing asks for it.
  subjects: '/api/subjects/departments',
  plos: '/api/plos/programs',
  programSubjects: '/api/program-subjects/programs',
};

/** The one curriculum a committee member reaches, which is also its option value. */
const CURRICULUM = '0501';

/** Codes nothing in the seed carries, so finding one is finding what was typed. */
const TYPED = {
  subject: '01099233',
  outcome: 'PLO-233',
};

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

test('the subject form reads no departments since #284, so what was typed has no answer to race (a net)', async ({
  page,
}) => {
  // Every request for the departments in reach, from the moment the page
  // exists: the read this row used to hold back (#170) and the one whose
  // absence is now the claim.
  const asked = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === REACH.subjects) asked.push(request.url());
  });

  await signIn(page, ACCOUNTS.departmentAdmin01);
  await openSubjects(page);
  expect(new URL(page.url()).pathname, 'the screen the form is opened on').toBe(SUBJECTS);

  await page.getByRole('button', { name: 'เพิ่มรายวิชา' }).click();

  // The control, seen green before the absences are read (#171): the form is
  // open and takes what is typed.
  const code = page.getByLabel('รหัสวิชา', { exact: true });
  await code.fill(TYPED.subject);
  await expect(code, 'the add form is open and holds what was typed').toHaveValue(TYPED.subject);

  // The mechanism, which is what a net asserts (#203): no field for a late
  // answer to re-pick, and no read for it to be the answer of.
  await expect(
    page.getByRole('combobox', { name: 'ภาควิชา' }),
    'the form draws no department field',
  ).toHaveCount(0);
  expect(asked, 'and nothing asked for the departments in reach').toEqual([]);
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
  // A bare `goto`, for the outcome row's reason above: since 17 พ.ย. 2569 this list
  // too is read *of* the curriculum the pool names, so waiting for it would
  // close the window this row is about.
  await page.goto(PROGRAM_SUBJECTS);
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

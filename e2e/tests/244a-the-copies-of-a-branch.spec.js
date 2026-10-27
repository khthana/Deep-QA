'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { facultyContext, switchOff } = require('../support/retiring');
const { openSubjects, subjectRow, departmentPicker } = require('../support/subjects-screen');
const {
  openProgramSubjects,
  openEditor: openPairEditor,
  programPicker: pairProgramPicker,
  programFilter: pairProgramFilter,
} = require('../support/program-subjects-screen');
const {
  openPlos,
  openEditor: openOutcomeEditor,
  programPicker: outcomeProgramPicker,
  programFilter: outcomeProgramFilter,
  filterTo,
} = require('../support/plos-screen');

/**
 * #244 — the three other copies of `if (editing) return`, and the one whose
 * screen cannot show the difference.
 *
 * #233 put that branch in four forms. It is the half that leaves a record
 * which already exists where it is, instead of letting the effect that picks a
 * parent for a *new* record move it: `GET /api/<thing>/departments` and
 * `GET /api/<thing>/programs` answer with retired parents too
 * (`backend/lib/reach.js` — *Retired ones come too*), the form keeps those out
 * of the pool it may pick from, so a record filed under a retired parent holds
 * a value the pool does not contain — the one shape that separates the
 * effect's two conditions.
 *
 * `ProgramForm` has `233a` row 2 and `233:movesanexistingprogramme`;
 * `RubricForm` has `198a` row 5 and `232:movesanexistingrubric`. The other
 * three had nothing, which is what this file is for — the code is **copied**
 * rather than shared, so a mutant in one form is proved by nothing that
 * presses another (#83).
 *
 * ## What the census of the ticket moved
 *
 * #244 priced three rows and three mutants. Two of the three are rows: the
 * third is a **net**, because the screen that mounts `PloForm` cannot put the
 * form in the state the branch is about. A fourth row then came out of row 2,
 * the two forms not drawing a retired parent's option the same way — it is at
 * the end of the file, with the reason on it.
 *
 * `starting` is `defaultProgram || onlyOne?.program_id || ''` on both
 * `PloForm` and `ProgramSubjectForm`, and `defaultProgram` is the parent
 * screen's filter. `pages/Plos.js` has exactly one mount point
 * (`Plos.js:371`, measured 26 ตุลาคม 2569) and its list is *per curriculum* —
 * `load` returns without asking while no curriculum is chosen, and
 * `listPlos({ program_id: program })` is the read — so every outcome the table
 * can offer an แก้ไข for belongs to the curriculum the filter is on, which is
 * the value `starting` holds. Both branches of the effect therefore write the
 * same `program_id`, and the mutant that deletes the branch is a mutant
 * nothing can see (#206: ask what the row's own arithmetic makes equal before
 * believing *never at risk*; here it is the screen's arithmetic and not the
 * row's). Row 3 reads the mechanism instead, and the condition that would
 * re-date it is written on the row.
 *
 * `pages/ProgramSubjects.js` is the same shape with one difference that
 * decides this: its filter starts at `''` and its list is **not** per
 * programme, so a pair filed in a retired curriculum is listed while
 * `defaultProgram` is empty. `starting` then falls through to
 * `onlyOne?.program_id`, which with `0501` retired is the one curriculum still
 * active — `0503`, the value the mutant writes over the pair. That is row 2,
 * and the empty filter is the half of it the row asserts as its own
 * precondition (#51).
 *
 * `pages/Subjects.js` has no filter at all — `starting` is `onlyOne` or
 * nothing — so a faculty administrator who reaches two departments of which
 * one is retired is row 1, which is `233a` row 2 on another form.
 *
 * ## What this file does not measure
 *
 * No row presses บันทึก. What a save would do with a moved value is the
 * server's answer and not this branch's, and the branch is about what the form
 * *says*: the person reads a record filed somewhere it is not. The saves are
 * `16a`'s and `18a`'s business.
 */

/** The seed's one subject, and the pair it sits in — `db/seed.js`. */
const SUBJECT = '01076105';

/** The department that subject is filed in, and the one this file retires. */
const DEPT_05 = '05';

/** The curriculum the seeded pair and the seeded outcomes belong to. */
const CURRICULUM = '0501';

/** The first main outcome of that curriculum — `PLOS[0]` of the seed. */
const OUTCOME = 'PLO-1';

/**
 * The schema, remembered and put back — #134.
 *
 * Each row below also restores what it switched off in its own `finally`, for
 * `233a` row 2's reasons: a mutant in the frontend cannot stop a restore made
 * over HTTP. This is the other half, and it is what puts a record back when a
 * row fails before its own restore runs.
 *
 * It does not take the audit rows out: `user_log` is in `hold`'s `except` by
 * decision (#134), being the product recording what the spec did. A single run
 * of this file reports it and nothing else.
 */
let release;

/**
 * What a row's own restore could not do, reported by a hook rather than by the
 * row — #181. A `finally` that throws replaces the body's error, so a sweep
 * would name the housekeeping and not the claim that had just failed.
 */
let cleanupFailure = null;

/**
 * Adds a failure rather than replacing one: every row below writes it through
 * `switchOff`'s restore, and the second to fail would otherwise silence the
 * first.
 */
function report(sentence) {
  cleanupFailure = cleanupFailure ? `${cleanupFailure}; ${sentence}` : sentence;
}

test.beforeAll(async () => {
  release = await hold();
});

test.afterAll(() => release());

test.afterAll(() => {
  if (cleanupFailure) throw new Error(cleanupFailure);
});

test('an existing subject keeps its own department even when that department is retired', async ({
  page,
  playwright,
}) => {
  const faculty = await facultyContext(playwright);
  const switchBackOn = await switchOff(faculty, `/api/departments/${DEPT_05}`, 'department', {
    onFailure: report,
  });

  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openSubjects(page);

    // Read afresh by the screen rather than edited out of the row the table is
    // holding (`Subjects.js:249`), so the form is drawn from this answer.
    await Promise.all([
      page.waitForResponse(
        answer =>
          new URL(answer.url()).pathname === `/api/subjects/${SUBJECT}` &&
          answer.request().method() === 'GET',
      ),
      subjectRow(page, SUBJECT).getByRole('button', { name: 'แก้ไข' }).click(),
    ]);

    // The arrival read as a claim of its own, which the `openEditor` helpers
    // the other two rows use do for them (#213). Not a precondition the mutant
    // can take away: the heading is drawn whichever way the effect goes.
    await expect(
      page.getByRole('heading', { name: 'แก้ไขรายวิชา' }),
      'the editor for that subject is open',
    ).toBeVisible();

    // The claim first and the picker's half second, which is `233a` row 2's
    // order and for its reason: `movesanexistingsubject` re-picks the field,
    // and the option is drawn only because the field holds it — `offered` keeps
    // a retired department when it is `draft.department_id` — so a precondition
    // read above the claim takes the red and leaves the claim itself unread
    // (#88).
    //
    // This administrator reaches department `05` alone, so with `05` switched
    // off the pool is **empty** and `starting` is `''`. That is what the branch
    // under test stops this form from writing over a subject that already
    // exists.
    await expect(
      departmentPicker(page),
      'the subject still says which department it is in',
    ).toHaveValue(DEPT_05);
    await expect(
      departmentPicker(page).locator(`option[value="${DEPT_05}"]`),
      'and the department it sits in is still drawn as an option',
    ).toHaveCount(1);
  } finally {
    await switchBackOn();
  }
});

test('an existing pair keeps its own curriculum even when that curriculum is retired', async ({
  page,
  playwright,
}) => {
  const faculty = await facultyContext(playwright);
  const switchBackOn = await switchOff(faculty, `/api/programs/${CURRICULUM}`, 'program', {
    onFailure: report,
  });

  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openProgramSubjects(page);

    // The precondition, asserted where it is used (#51) and counted on the
    // option rather than read off a control that may not be there (#164): the
    // filter is on no curriculum, so `defaultProgram` is `''` and `starting`
    // is not this pair's curriculum. This is the whole difference between this
    // row and row 3 — the list here is not per curriculum, so a pair filed in
    // a retired one is listed while the form would pick nothing.
    await expect(
      pairProgramFilter(page).locator('option[value=""]'),
      'the list is drawn with no curriculum chosen',
    ).toHaveCount(1);
    await expect(pairProgramFilter(page), 'and that is the value it is on').toHaveValue('');

    await openPairEditor(page, SUBJECT);

    await expect(
      pairProgramPicker(page),
      'the pair still says which curriculum it is in',
    ).toHaveValue(CURRICULUM);
    // What this form does with the option is a second claim, and it is row 4:
    // a claim below a claim is read by nobody, because the mutant kills the
    // line above it first (#88).
  } finally {
    await switchBackOn();
  }
});

test('the outcome form is handed its own curriculum by the filter, which is why nothing here can be at risk', async ({
  page,
  playwright,
}) => {
  const faculty = await facultyContext(playwright);
  const switchBackOn = await switchOff(faculty, `/api/programs/${CURRICULUM}`, 'program', {
    onFailure: report,
  });

  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openPlos(page);

    // `Plos.js:192` lands the filter on the first curriculum that is *not*
    // retired, so the retired one is reached by moving the filter by hand —
    // which the screen offers, the options being drawn from everything in
    // reach (#234's subject, and not this row's).
    await filterTo(page, CURRICULUM);

    // A net, and what it holds is the **mechanism** rather than the absence
    // (#203's ninth reading): the two reads below are of one value, and that is
    // why `if (editing) return` cannot be put at risk on this screen. The form
    // is handed `defaultProgram={program}` — this filter — and the table can
    // only offer an แก้ไข for an outcome of that same curriculum, so the branch
    // that leaves an existing outcome alone and the branch that re-picks
    // `starting` write the same `program_id`.
    //
    // The two are read on either side of the แก้ไข rather than together,
    // because they are never on screen at once: `plos-screen.js` says so in
    // the comment above `programFilter`, and the form replaces the list.
    //
    // This expires the day `PloForm` is mounted somewhere whose
    // `defaultProgram` can differ from the curriculum of the outcome being
    // edited — a list that is not per curriculum, as `ProgramSubjects.js` has
    // and row 2 uses. One mount point, measured 26 ตุลาคม 2569, which is what
    // makes that a claim about every place this form is mounted (#220).
    await expect(
      outcomeProgramFilter(page),
      'the curriculum the list is filtered to, which is what the form is handed',
    ).toHaveValue(CURRICULUM);

    await openOutcomeEditor(page, OUTCOME);

    await expect(
      outcomeProgramPicker(page),
      'and the curriculum the form says this outcome is in',
    ).toHaveValue(CURRICULUM);
  } finally {
    await switchBackOn();
  }
});

/**
 * Row 4 — row 2's second claim, as a row of its own, and it is a different
 * claim on each of the two forms.
 *
 * `SubjectForm` **filters**: `offered` draws a retired department only when it
 * is the value the field holds, so row 1 can count the option and the count is
 * at risk. `ProgramSubjectForm` does not filter — it maps every programme to
 * an `<option>` and sets `disabled` on a retired one **unless it is the value
 * the field holds** — so counting the option here is a claim nothing could put
 * at risk (#97), which is what the first version of row 2 asserted. The half
 * the branch decides on this form is whether the person sees their own
 * curriculum as a live choice rather than greyed out, which is `disabled`.
 *
 * It is appended rather than inserted so that no citation to rows 1–3 moves
 * (#97, #85).
 */
test('an existing pair still offers its own retired curriculum as a live choice', async ({
  page,
  playwright,
}) => {
  const faculty = await facultyContext(playwright);
  const switchBackOn = await switchOff(faculty, `/api/programs/${CURRICULUM}`, 'program', {
    onFailure: report,
  });

  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openProgramSubjects(page);
    await expect(pairProgramFilter(page), 'the list is drawn with no curriculum chosen').toHaveValue(
      '',
    );

    await openPairEditor(page, SUBJECT);

    await expect(
      pairProgramPicker(page).locator(`option[value="${CURRICULUM}"]`),
      'the retired curriculum the pair sits in is offered rather than greyed out',
    ).toHaveJSProperty('disabled', false);
  } finally {
    await switchBackOn();
  }
});

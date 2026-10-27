'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { facultyContext, switchOff } = require('../support/retiring');
const {
  openRubrics,
  programFilter: rubricFilter,
  programPicker: rubricPicker,
  openAddForm: openRubricForm,
  filterTo: filterRubricsTo,
} = require('../support/rubrics-screen');
const {
  openProgramSubjects,
  programFilter: pairFilter,
  programPicker: pairPicker,
  openAddForm: openPairForm,
  filterTo: filterPairsTo,
} = require('../support/program-subjects-screen');
const {
  openPlos,
  programPicker: outcomeSelect,
  openAddForm: openOutcomeForm,
  filterTo: filterOutcomesTo,
} = require('../support/plos-screen');

/**
 * #234 — the screen's filter is drawn from a wider list than the form's pool.
 *
 * `backend/lib/reach.js` answers these screens' pickers with retired curricula
 * too (*Retired ones come too*), which is what lets somebody read the rubrics,
 * the pairs and the outcomes of a curriculum that has been closed. Each screen
 * draws its filter from that list whole. Each form then keeps the retired ones
 * out of the pool it may pick from, because `programInReach` requires
 * `is_active` and a value outside the pool is one the server refuses
 * (ADR-0002) — and three of the four forms started on the filter's value
 * regardless:
 *
 *     const starting = defaultProgram || onlyOne?.program_id || ''
 *
 * So the person who filtered by a closed curriculum and pressed เพิ่ม was
 * handed a form whose picker was **already** on a value no save could carry.
 * Nothing on the screen said so: the option is drawn, and `RubricForm`,
 * `PloForm` and `ProgramSubjectForm` each leave a retired option *enabled*
 * while it is the field's own value — the clause #232 wrote for the record that
 * is filed in one (`198a` row 5, `244a` row 4). A form that reads as complete,
 * and a refusal at บันทึก.
 *
 * `OfferingForm` is the fourth copy and the one with no row here; `§what this
 * file does not measure` below says what it would cost.
 *
 * ## Which value each row asserts, and why it is not `''`
 *
 * A ผู้ดูแลภาควิชา of department `05` reaches `0501` and `0503` (`db/seed.js`),
 * so with `0501` switched off the pool holds exactly one curriculum and
 * `starting` falls through to `onlyOne` — `0503`. That is a stronger reading
 * than an empty picker: the form opens on the one curriculum this person may
 * write into, which is the half of #234's first option that decides it is a fix
 * and not a change to what anybody sees on a screen that behaves.
 *
 * `pages/Plos.js` already took the same rule for the screen's own landing —
 * *a retired one is a poor thing to open on, and is landed on only when it is
 * all there is* — so the repo had answered this species before the ticket asked
 * (#196). What it had not covered is the curriculum a person picks **by hand**
 * afterwards, which is every row below.
 *
 * ## What this file does not measure
 *
 * No row presses บันทึก. That the server refuses a retired curriculum is
 * `backend/test/rubrics.test.js`'s claim and `programInReach`'s, measured there
 * already; what is new here is the state the form is handed to the person in.
 *
 * And no row is about `components/offerings/OfferingForm.js`, which carries the
 * same `defaultProgram ||` inside its effect. Its screen is `PROG_MANAGER`'s
 * alone (`backend/routes/offerings.js`: `const COMMITTEE = ['PROG_MANAGER']`)
 * and a committee grant's scope is one curriculum, so the filter is drawn for
 * nobody the seed holds: reaching that form needs a second committee grant made
 * over HTTP as `198a`'s fixture does, on top of the retirement. The fix lands
 * there with the other three — the line is the same line, and leaving one copy
 * unfixed is what #244 was opened to repair — and
 * [#245](https://github.com/khthana/Deep-QA/issues/245) carries the row.
 */

/** The curriculum every row here switches off — the one the seed files in. */
const RETIRED = '0501';

/**
 * The curriculum left in reach, and so the one each form may write into.
 *
 * `0503` is department 05's second curriculum; `0101` belongs to department 01
 * and is outside this account's reach, which is why the pool is one and not two.
 */
const LIVE = '0503';

/** The schema, remembered and put back — #134. `244a` carries the reasons. */
let release;

/** What a row's own restore could not do, reported by a hook and not by the row — #181. */
let cleanupFailure = null;

/** Adds a failure rather than replacing one — three rows write through the same slot. */
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

test('the rubric form does not open on the retired curriculum the list is filtered to', async ({
  page,
  playwright,
}) => {
  const faculty = await facultyContext(playwright);
  const switchBackOn = await switchOff(faculty, `/api/programs/${RETIRED}`, 'program', {
    onFailure: report,
  });

  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openRubrics(page);

    // The capability itself, read as a claim of its own: the curriculum that has
    // been closed is still **offered** by the filter, which is what #234's
    // second option proposed to take away. A declined option is only declined
    // once it has been made to run (#48), and `234:rubricfilterhidestheretired`
    // is that option — so this screen is where the rule is proved, chosen by the
    // census rather than by the subject (#68).
    //
    // It is read *above* the filtering, which is necessity and not choice: a
    // filter that no longer offers the option leaves `selectOption` with nothing
    // to pick, and `filterTo`'s `waitForList` then dies at the timeout rather
    // than at a claim (#139, measured 27 ตุลาคม 2569 before this line was added).
    await expect(
      rubricFilter(page).locator(`option[value="${RETIRED}"]`),
      'the closed curriculum is still offered, so its rubrics can be read',
    ).toHaveCount(1);

    await filterRubricsTo(page, RETIRED);

    // The precondition read where it is used and not where it was set (#51),
    // and read before the form is opened because the form replaces the list.
    // It is also the sentence that says the capability is still there: the
    // rubrics of a closed curriculum are listed, which is what #234's second
    // option would have taken away.
    await expect(
      rubricFilter(page),
      'the list is filtered to the curriculum that was switched off',
    ).toHaveValue(RETIRED);

    await openRubricForm(page);

    // The arrival as a claim of its own (#213): the heading is drawn whichever
    // curriculum the effect picks, so the mutant cannot turn the row below into
    // a wait that dies at the timeout.
    await expect(
      page.getByRole('heading', { name: 'เพิ่ม Rubric' }),
      'the add form is open',
    ).toBeVisible();

    await expect(
      rubricPicker(page),
      'and it starts on the curriculum this account may file a rubric in',
    ).toHaveValue(LIVE);
  } finally {
    await switchBackOn();
  }
});

test('the pair form does not open on the retired curriculum the list is filtered to', async ({
  page,
  playwright,
}) => {
  const faculty = await facultyContext(playwright);
  const switchBackOn = await switchOff(faculty, `/api/programs/${RETIRED}`, 'program', {
    onFailure: report,
  });

  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openProgramSubjects(page);
    await filterPairsTo(page, RETIRED);

    await expect(
      pairFilter(page),
      'the list is filtered to the curriculum that was switched off',
    ).toHaveValue(RETIRED);

    await openPairForm(page);

    await expect(
      page.getByRole('heading', { name: 'เพิ่มรายวิชาเข้าหลักสูตร' }),
      'the add form is open',
    ).toBeVisible();

    await expect(
      pairPicker(page),
      'and it starts on the curriculum this account may file a pair in',
    ).toHaveValue(LIVE);
  } finally {
    await switchBackOn();
  }
});

test('the outcome form does not open on the retired curriculum the list is filtered to', async ({
  page,
  playwright,
}) => {
  const faculty = await facultyContext(playwright);
  const switchBackOn = await switchOff(faculty, `/api/programs/${RETIRED}`, 'program', {
    onFailure: report,
  });

  try {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await openPlos(page);

    // This screen opens on the first curriculum *still running*, so with
    // `0501` switched off it lands on `0503` by its own rule and the retired
    // one is reached by a press — which is the way in this row is about. One
    // locator answers for the filter and for the form's picker, the two never
    // being on screen together (`plos-screen.js`).
    await filterOutcomesTo(page, RETIRED);

    await expect(
      outcomeSelect(page),
      'the list is filtered to the curriculum that was switched off',
    ).toHaveValue(RETIRED);

    await openOutcomeForm(page);

    await expect(
      page.getByRole('heading', { name: 'เพิ่มผลการเรียนรู้ของหลักสูตร' }),
      'the add form is open',
    ).toBeVisible();

    await expect(
      outcomeSelect(page),
      'and it starts on the curriculum this account may file an outcome in',
    ).toHaveValue(LIVE);
  } finally {
    await switchBackOn();
  }
});

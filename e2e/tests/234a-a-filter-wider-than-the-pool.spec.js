'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, IDS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
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
const {
  openOfferings,
  programFilter: offeringFilter,
  filterToProgram: filterOfferingsTo,
  waitForOfferable,
  openForm: openOfferingForm,
  subjectPicker,
} = require('../support/offerings-screen');

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
 * `OfferingForm` is the fourth copy. It had no row here until 28 ตุลาคม 2569;
 * row 4 is it, and `§what this file does not measure` below carries what the
 * paragraph said while it was missing.
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
 * **Until 28 ตุลาคม 2569 no row was about `components/offerings/OfferingForm.js`,
 * which carries the same `defaultProgram ||` inside its effect.** Its screen is
 * `PROG_MANAGER`'s alone (`backend/routes/offerings.js`:
 * `const COMMITTEE = ['PROG_MANAGER']`) and a committee grant's scope is one
 * curriculum, so the filter is drawn for nobody the seed holds: reaching that
 * form needs a second committee grant made over HTTP as `198a`'s fixture does,
 * on top of the retirement. The fix lands there with the other three — the line
 * is the same line, and leaving one copy unfixed is what #244 was opened to
 * repair — and [#245](https://github.com/khthana/Deep-QA/issues/245) carried
 * the row.
 *
 * That paragraph was right about the cost and wrong about the fixture, which is
 * the correction #245 measured: **a second committee grant is a second shell and
 * not a wider one.** `/api/offerings/programs` is answered from
 * `reachablePrograms(pool, req.auth.acting.scope_id)`, one acting grant at a
 * time, so an account holding two curriculum grants still reads one curriculum
 * per shell and the filter is still not drawn. What draws it is a `PROG_MANAGER`
 * grant whose scope is the **department** — row 4's fixture, and its own comment
 * says why that is a state a person can be in and not one only the seam can
 * build.
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

/**
 * Row 4 closes the other one, and that is a property of the seed.
 *
 * `db/seed.js` files its one `program_subjects` row under `0501`
 * (`seedSubject`), so `0501` is the only curriculum whose subject picker can
 * hold anything. Row 4 therefore closes `0503` and reads the form opening on
 * `0501`: the same claim as the three rows above, with a reading that has a
 * subject in it rather than an empty picker — which is drawn identically
 * whether the form asked about the right curriculum or was refused for asking
 * about the wrong one (#164).
 */
const RETIRED_IN_ROW_4 = LIVE;
const OFFERABLE = RETIRED;

/** The department both curricula hang under — the scope row 4's grant is made at. */
const DEPARTMENT = '05';

/** The one subject `db/seed.js` places in `OFFERABLE`, so the one the picker may offer. */
const PLACED = '01076105';

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

/**
 * Row 4 — `components/offerings/OfferingForm.js`, the fourth copy (#245).
 *
 * Its defect is not the other three's shape. They draw the retired option and
 * leave it **enabled** while the field holds it, so the person reads a form that
 * looks complete and is refused at บันทึก. `OfferingForm` draws its picker from
 * `usable` alone, so a retired curriculum there is a value **no option can
 * show**: before the fix the field read out the name of a curriculum that is
 * still running while the draft held the closed one, and `listOfferableSubjects`
 * was called with a curriculum the server refuses. That is two claims and not
 * one (#66), ordered as the mutant leads (#88) — the request first, the drawing
 * that follows from it second.
 *
 * ## The two arrangements, and why the grant is made at a department
 *
 * The retirement is this file's, through the same `switchOff`. The grant is
 * `198a`'s, narrowed to this row so rows 1–3 are not handed a wider shell than
 * they are about, and its scope is the **department** rather than a second
 * curriculum: `/api/offerings/programs` is answered from
 * `reachablePrograms(pool, req.auth.acting.scope_id)`, one acting grant at a
 * time, so two curriculum grants are two shells of one curriculum each and the
 * filter is still not drawn (measured 28 ตุลาคม 2569). `assignable` permits the
 * department scope — it asks that the role be no more senior than the
 * administrator's and that the scope exist, be live and be in reach, not that
 * the scope's kind match the role — so this is a state an administrator can put
 * somebody in through the real screens, and not one only the seam can build
 * (#47).
 *
 * Nothing is pressed to choose the grant: `allRoles` orders
 * `BY r.priority ASC, ur.scope_id ASC` and both grants are `PROG_MANAGER`, so
 * `05` sorts before `0501` and the department grant is what `actingFrom` wears
 * by default. The arrival of the form is a claim here as it is in rows 1–3
 * (#213), read one layer in: `openForm` asserts the heading itself, which is
 * why this row does not repeat it. The revoke **deactivates** the row rather
 * than deleting it (#233), so what takes it back out is `hold()`: it remembers
 * every table from the catalogue and puts rows that appeared out again on
 * release, which is why this file reports no `user_roles` leftover although
 * nothing deleted the grant. `allRoles` asking `ur.is_active` is why the
 * account is handed back to the next file reaching the one curriculum the seed
 * gave it — it is not why the report is clean (measured 28 ตุลาคม 2569, after a
 * review predicted the leftover).
 *
 * ## What this row reads in place of the curriculum control
 *
 * Rows 1–3 read the control's value. This one cannot: `usable` filters
 * `is_active !== false`, so with `0503` retired the two curricula this account
 * reaches leave **one** usable, and `OfferingForm` draws the field as a `<span>`
 * of the name rather than as a `<select>` (`usable.length > 1`). There is no
 * value on it to read, which is why the two claims are the request's
 * `program_id` and the picker's option — the state the field's own `<span>`
 * would only be a second reading of.
 */
test('the offering form reads the subjects of a curriculum this account may open one in', async ({
  page,
  playwright,
}) => {
  const admin = await playwright.request.newContext();
  const grant = `/api/users/${IDS.committee0501}/roles`;

  const inn = await admin.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.systemAdmin, password: PASSWORD },
  });
  expect(inn.status(), "the administrator who makes this row's fixture").toBe(200);

  const made = await admin.post(`${BACKEND_URL}${grant}`, {
    data: { role_id: 'PROG_MANAGER', scope_id: DEPARTMENT },
  });

  // Read *inside* the `try`, so an answer that is not 201 but left the row
  // behind — the route's own `ON CONFLICT` reaching an existing grant would be
  // one — is still revoked rather than handed to the rest of a `workers: 1`
  // run with nothing to say so (#132). `198a` asserts this outside its own
  // `try`, which is the shape this one does not copy.
  try {
    expect(made.status(), 'the committee grant that reaches more than one curriculum').toBe(201);

    const faculty = await facultyContext(playwright);
    const switchBackOn = await switchOff(
      faculty,
      `/api/programs/${RETIRED_IN_ROW_4}`,
      'program',
      { onFailure: report },
    );

    try {
      await signIn(page, ACCOUNTS.committee0501);
      await openOfferings(page);

      // The grant read as a precondition where it is used and not where it was
      // set (#51): the filter is a control at all only because this account now
      // reaches two curricula, and it still offers the closed one, which is
      // `reach.js`'s *Retired ones come too*. Read above the filtering for row
      // 1's reason — an option that is not offered leaves `selectOption` with
      // nothing to pick and the helper dies at the timeout rather than at a
      // claim (#139).
      await expect(
        offeringFilter(page).locator(`option[value="${RETIRED_IN_ROW_4}"]`),
        'the closed curriculum is still offered by the filter',
      ).toHaveCount(1);

      await filterOfferingsTo(page, RETIRED_IN_ROW_4);

      await expect(
        offeringFilter(page),
        'the list is filtered to the curriculum that was switched off',
      ).toHaveValue(RETIRED_IN_ROW_4);

      const [offerable] = await Promise.all([waitForOfferable(page), openOfferingForm(page)]);

      expect(
        new URL(offerable.url()).searchParams.get('program_id'),
        'the form read the subjects of the curriculum this account may open one in',
      ).toBe(OFFERABLE);
      expect(offerable.status(), 'and the server answered that read rather than refusing it').toBe(
        200,
      );

      // The reading that follows from the claim above, which is why it is below
      // it (#233): an empty picker is drawn the same whether the form asked
      // about the right curriculum or was refused for asking about the wrong
      // one, so what is read is the subject the seed places in `OFFERABLE`.
      await expect(
        subjectPicker(page).locator(`option[value="${PLACED}"]`),
        "so the picker holds that curriculum's subject",
      ).toHaveCount(1);
    } finally {
      await switchBackOn();
    }
  } finally {
    try {
      const undone = await admin.delete(`${BACKEND_URL}${grant}/PROG_MANAGER/${DEPARTMENT}`);
      if (undone.status() !== 200) {
        report(`the committee grant was answered ${undone.status()} on the way out`);
      }
    } catch (error) {
      report(`the committee grant could not be revoked: ${error.message}`);
    }
    await admin.dispose();
  }
});

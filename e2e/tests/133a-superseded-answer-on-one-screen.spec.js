'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { COHORTS, PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const {
  MAPPING,
  API: MAPPING_API,
  OTHER_PROGRAM,
  listedCodes,
} = require('../support/plo-mapping-screen');
const {
  PLOS,
  API: PLOS_API,
  openPlos,
  filterTo,
  programFilter,
  saveButton: ploSaveButton,
  openEditor,
  listedCodes: listedPloCodes,
} = require('../support/plos-screen');
const { hold } = require('../support/hold');
const {
  openReport,
  showIntake,
  sourceButton,
  drillDown,
} = require('../support/program-results-screen');
const {
  openIndividual,
  showIntake: showRollIntake,
  chooseStudent,
  sourceButton: studentSource,
  drillDown: studentDrill,
} = require('../support/program-student-screen');
const {
  API: SCORES_API,
  openScores,
  chooseActivity,
  activityPicker,
  gridHeading,
  saveButton,
} = require('../support/scores-screen');

/**
 * #133 — six more screens draw the answer to the request they are still on.
 *
 * #68 closed this on fifteen paged panels and deferred the rest of the grep it
 * published. The ticket counts what was left as sixteen sites that still read
 * an answer as `setSomething(await getSomething(…))`, with nothing tying the
 * answer to the request that caused it: the one that **arrives** last wins
 * rather than the one **asked for** last.
 *
 * **Sixteen is what that grep could match; the number is twenty-two.** Six
 * more sites name the answer before drawing it — `Plos`, `GradingWeights`,
 * `ContinuousImprovement`, `TeacherSection`, `GrantsPanel`, and the activity
 * list `ActivityScores` reads beside its grid — so no pattern of the shape
 * `set…(await …)` could have reached them, and no file list built from one
 * could carry them. What found them was listing every `await` in the tree and
 * reading what each one does with its answer, rather than sharpening the
 * pattern: *a grep is evidence for the pattern you typed, not for the claim
 * you wanted.* `TeacherDashboard` came off that list and is **not** one of the
 * twenty-two — it asks with no parameter at all, so there is no second
 * request for a first to lose to, and writing that down is cheaper than
 * leaving the next reader to measure it again.
 *
 * The twenty-two are not one family, and the difference is *what can supersede
 * a request*. Sixteen ask with `useParams` alone, or with a prop the screen
 * above can only replace by unmounting them, so superseding one means
 * travelling from one CLO or Activity to another on the same route — and every
 * link on those screens goes **up**, to a list that unmounts the screen. Those
 * are `ยังไม่ได้ทดสอบ` on their sheets, with the reason and the date, rather
 * than `ไม่ต้องมี`.
 *
 * Six can be superseded by a control on the screen itself, and this file is
 * their price — a row each, not a line each:
 *
 * - `PloMapping` — the หลักสูตร picker, which is #68's own shape;
 * - `Plos` — the หลักสูตร filter above the list, the same shape and the same
 *   control, drawn only for an account that maintains more than one;
 * - `ProgramLevelByIntake` — the drill-down, opened on one outcome while
 *   another's is still out. #68 guarded the report on that screen and left the
 *   panel under it unguarded;
 * - `ProgramLevelIndividual` — the same panel, superseded by choosing another
 *   student, which is the only second press that screen offers (an outcome
 *   nobody measured this person on has no button to press);
 * - `ActivityScores` — the กิจกรรม picker. The ticket files this screen under
 *   *`useParams`*, and it is wrong about it: only `sectionId` comes from the
 *   route (ADR-0004), while `activityId` is state driven by a `<select>` on the
 *   screen. Both of its sites are therefore this family, and the second is
 *   **the answer to a save**, which is a read like any other.
 *
 * A seventh row belongs to none of the six and to all of them: the **second
 * caller**, which the ticket's own last clause asks about. Five of the six are
 * read by an effect alone, and an effect's flag is torn down with it; but
 * `Plos` and `ActivityScores` each reload from a handler as well, and nothing
 * tears a handler down. The first pass read those callers for the *shape* of
 * the flag — required or defaulted — and wrote that a handler's honest answer
 * to *are you still current* is yes. On these two screens that sentence is
 * false, because a control sits beside the handler the whole time its request
 * is out. *A guard written for one caller is a claim about every caller* (#68),
 * and the comment is the claim. The row is `Plos`'s, because its situation can
 * be built without importing a class's marks; `ActivityScores`'s import path
 * has the same guard and `ยังไม่ได้ทดสอบ` on #34's sheet, with the reason.
 * The story is in `docs/lessons.md`.
 *
 * Every row builds the race itself. The superseded answer is held back with
 * `page.route` and the one that supersedes it is not, so which answer arrives
 * second is a fact about this file rather than about the machine it runs on;
 * each row reads the screen once, at the point where the held answer has landed
 * and the newer one is already drawn. `mutation/133-superseded-on-screen.py`
 * carries a mutant per site, and each must take its own row down.
 *
 * ## What this file writes
 *
 * Five rows only read. The sixth presses บันทึกคะแนน without touching a cell,
 * so the request carries `marks: []` and the schema does not move — what is on
 * trial is the answer being drawn, not what a save stores, and #34's rows own
 * the storing.
 *
 * That the empty list moves nothing is the server's doing rather than the
 * screen's: `record()` in `backend/routes/activityScores.js` upserts and never
 * deletes, and its chunk loop runs zero times for an empty `marks` — read there
 * rather than inferred from a grid that looks unchanged.
 *
 * The seventh row does write. It saves an outcome without changing a field, so
 * the row keeps its values, but `updated_at` moves and *a comparison by key
 * cannot see a rewrite* (#137) — `hold()` takes the whole schema and puts it
 * back, which is the same answer `10a` gives for the same reason.
 */

const db = createPool({ schema: E2E_SCHEMA });

test.afterAll(() => db.end());

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/**
 * Long enough for the unheld answer to be back, and drawn, before the held one
 * is let go. If it ever were not, these rows fail rather than pass: the screen
 * would be showing the state it was in before the race instead of the newer
 * answer, and every assertion below names the newer answer.
 */
const HELD_MS = 2_000;

/** The render the held answer would cause. It decides nothing — the mutants do. */
const SETTLE_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('a grid the หลักสูตร picker has left behind does not land on top of the one it is on', async ({
  page,
}) => {
  // `PloMapping.js:111`, and the family #68 is named for: one screen, one
  // control, two requests. The picker is only drawn for an account that reaches
  // more than one curriculum, which is what the department's administrator is
  // here for — a กรรมการหลักสูตร is shown a label and has nothing to press.
  await signIn(page, ACCOUNTS.departmentAdmin05);

  const anyGrid = (url) => url.pathname === MAPPING_API;
  const forProgram = (url, id) => anyGrid(url) && url.searchParams.get('program_id') === id;

  try {
    await page.route(anyGrid, async (route, request) => {
      if (forProgram(new URL(request.url()), PROGRAM)) await sleep(HELD_MS);
      await route.continue();
    });

    const openingArrived = page.waitForResponse((answer) =>
      forProgram(new URL(answer.url()), PROGRAM),
    );
    const otherArrived = page.waitForResponse((answer) =>
      forProgram(new URL(answer.url()), OTHER_PROGRAM),
    );

    await page.goto(MAPPING);

    // The picker's own options come from `/api/programs/reachable`, which is
    // not held: the curriculum can be changed while the grid of the last one is
    // still out. The screen opens on the first curriculum in reach, and this
    // row holds that one — asserted rather than assumed, because a row that
    // held a request nobody makes would pass without ever racing anything.
    const picker = page.getByLabel('หลักสูตร');
    await expect(picker).toHaveValue(PROGRAM);
    await expect(picker.locator(`option[value="${OTHER_PROGRAM}"]`)).toHaveCount(1);
    await picker.selectOption(OTHER_PROGRAM);

    const other = await (await otherArrived).json();
    // The two curricula have different outcomes — thirteen against two, with
    // their sub-outcomes — so the header of one is not the header of the other
    // and a row that read the wrong grid cannot read it as the right one.
    expect(other.outcomes.length).toBeGreaterThan(0);

    await openingArrived;
    await page.waitForTimeout(SETTLE_MS);

    // Both halves in one assertion: the picker says which curriculum is being
    // asked about and the header says which one is drawn, and a superseded
    // answer makes those two disagree. Two `expect`s would leave the second
    // unreached on the run that proves the first.
    expect({
      chosen: await picker.inputValue(),
      codes: await listedCodes(page),
    }).toEqual({
      chosen: OTHER_PROGRAM,
      codes: other.outcomes.map((outcome) => outcome.outcome_code),
    });
  } finally {
    await page.unroute(anyGrid);
  }
});

test('a list the หลักสูตร filter has left behind does not land on top of the one it is on', async ({
  page,
}) => {
  // `Plos.js:98`, and one of the three the ticket's grep could not have found:
  // this screen destructures the answer (`const { plos: rows } = await …`)
  // before drawing it, so the pattern the ticket searched for never matched it.
  // The control is the same as the first row's — one filter, two requests — and
  // it is drawn only for an account that maintains more than one curriculum.
  await signIn(page, ACCOUNTS.departmentAdmin05);

  const anyList = (url) => url.pathname === PLOS_API;
  const forProgram = (url, id) => anyList(url) && url.searchParams.get('program_id') === id;

  try {
    // `${PLOS_API}/programs` — the reach, which decides what the filter offers
    // — is a different path and is not held, so the curriculum can be changed
    // while the list of the last one is still out.
    await page.route(anyList, async (route, request) => {
      if (forProgram(new URL(request.url()), PROGRAM)) await sleep(HELD_MS);
      await route.continue();
    });

    const openingArrived = page.waitForResponse((answer) =>
      forProgram(new URL(answer.url()), PROGRAM),
    );
    const otherArrived = page.waitForResponse((answer) =>
      forProgram(new URL(answer.url()), OTHER_PROGRAM),
    );

    await page.goto(PLOS);

    // Which curriculum the screen opens on is #101's claim and not this row's,
    // but this row holds that request by name — so it says out loud which one it
    // expects to be holding rather than racing nothing and passing.
    const filter = programFilter(page);
    await expect(filter).toHaveValue(PROGRAM);
    await filter.selectOption(OTHER_PROGRAM);

    const other = await (await otherArrived).json();
    const opening = await (await openingArrived).json();
    // A code belongs to a curriculum and two curricula may each hold a `PLO-1`,
    // which is #19's whole subject — so the two lists being different lists is
    // the premise that makes the assertion below able to fail at all.
    expect(other.plos.map((plo) => plo.outcome_code)).not.toEqual(
      opening.plos.map((plo) => plo.outcome_code),
    );

    await page.waitForTimeout(SETTLE_MS);

    // Both halves in one assertion, for the first row's reason: the filter says
    // which curriculum is being asked about and the rows say which one is drawn.
    expect({
      chosen: await filter.inputValue(),
      codes: await listedPloCodes(page),
    }).toEqual({
      chosen: OTHER_PROGRAM,
      codes: other.plos.map((plo) => plo.outcome_code),
    });
  } finally {
    await page.unroute(anyList);
  }
});

test('the ที่มา panel of a cohort report names the outcome that was pressed last', async ({
  page,
}) => {
  // `ProgramLevelByIntake.js:172`. #68 guarded the report and wrote its own
  // comment about this screen; the panel underneath it was never part of that
  // measurement, and it is the half a person spends their time in.
  await signIn(page, ACCOUNTS.committee0501);

  const opening = await (await openReport(page)).json();
  await showIntake(page, COHORTS[0].admission);

  // The outcome ids are the curriculum's, not the cohort's, so they survive the
  // intake being changed above.
  const held = opening.plos.find((plo) => plo.outcome_code === 'PLO-2');
  const fast = opening.plos.find((plo) => plo.outcome_code === 'PLO-1');
  expect(Boolean(held && fast), 'the curriculum should carry PLO-1 and PLO-2').toBe(true);

  const anyDrill = (url) => url.pathname.startsWith('/api/program-results/by-intake/outcomes/');
  const forOutcome = (url, outcomeId) =>
    url.pathname === `/api/program-results/by-intake/outcomes/${outcomeId}`;

  try {
    await page.route(anyDrill, async (route, request) => {
      if (forOutcome(new URL(request.url()), held.outcome_id)) await sleep(HELD_MS);
      await route.continue();
    });

    const heldArrived = page.waitForResponse((answer) =>
      forOutcome(new URL(answer.url()), held.outcome_id),
    );
    const fastArrived = page.waitForResponse((answer) =>
      forOutcome(new URL(answer.url()), fast.outcome_id),
    );

    // Pressed one after the other, without waiting in between: the first press
    // is superseded while its answer is still out. Every row of this report
    // carries the button, so the second press needs nothing of the seed beyond
    // a second outcome.
    await sourceButton(page, 'PLO-2').click();
    await sourceButton(page, 'PLO-1').click();

    const drawn = await (await fastArrived).json();
    await heldArrived;
    await page.waitForTimeout(SETTLE_MS);

    // The heading is built out of the answer — `drill.outcome` — so it says
    // which answer the panel is drawing rather than which button is pressed,
    // and a superseded answer names an outcome the reader did not ask for.
    expect((await drillDown(page).innerText()).trim()).toBe(
      `ที่มาของ ${drawn.outcome.outcome_code} ${drawn.outcome.outcome_title}`,
    );
  } finally {
    await page.unroute(anyDrill);
  }
});

test('the ที่มา panel of a personal report names the student on screen', async ({ page }) => {
  // `ProgramLevelIndividual.js:211`. The same panel, superseded differently:
  // this screen offers the button only where the student has a score, so the
  // second press this row needs is on **another student's** row rather than on
  // another outcome. Choosing a student closes the panel and reloads the
  // report, which is exactly the situation a late answer reopens.
  await signIn(page, ACCOUNTS.committee0501);
  const [current] = COHORTS;
  const [first, second] = await markedStudents(current.admission);

  await openIndividual(page);
  await showRollIntake(page, current.admission);
  await chooseStudent(page, first.student_id, first.full_name_th);

  const anyDrill = (url) =>
    url.pathname.startsWith('/api/program-results/students/') &&
    url.pathname.includes('/outcomes/');
  const forStudent = (url, studentId) =>
    anyDrill(url) && url.pathname.startsWith(`/api/program-results/students/${studentId}/`);

  try {
    await page.route(anyDrill, async (route, request) => {
      if (forStudent(new URL(request.url()), first.student_id)) await sleep(HELD_MS);
      await route.continue();
    });

    const heldArrived = page.waitForResponse((answer) =>
      forStudent(new URL(answer.url()), first.student_id),
    );

    await studentSource(page, 'PLO-2').click();

    // The roll stays on screen beside the report, so the next person can be
    // chosen while the panel of the last one is still out.
    await chooseStudent(page, second.student_id, second.full_name_th);

    const fastArrived = page.waitForResponse((answer) =>
      forStudent(new URL(answer.url()), second.student_id),
    );
    await studentSource(page, 'PLO-2').click();
    const drawn = await (await fastArrived).json();

    await heldArrived;
    await page.waitForTimeout(SETTLE_MS);

    // The heading names the student as well as the outcome, which is what makes
    // this panel's superseded answer readable at all: the same outcome of two
    // different people is the same sentence apart from the name.
    expect((await studentDrill(page).innerText()).trim()).toBe(
      `ที่มาของ ${drawn.outcome.outcome_code} ${drawn.outcome.outcome_title} — ` +
        `${drawn.student.student_id} ${drawn.student.full_name_th}`,
    );
  } finally {
    await page.unroute(anyDrill);
  }
});

test('the grid of a กิจกรรม the picker has left behind does not land on the one it is on', async ({
  page,
}) => {
  // `ActivityScores.js:179`. The ticket files this under *`useParams`*; only
  // `sectionId` comes from the route. `activityId` is state, and the `<select>`
  // that sets it is on the screen — so this is #68's family, and the seeded
  // ตอนเรียน has six pieces of work to switch between.
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);

  const opened = await (await openScores(page, section)).json();
  const picker = activityPicker(page);
  const others = await pickerIds(picker, opened.activity.id);
  expect(others.length, 'this ตอนเรียน should offer more than one กิจกรรม').toBeGreaterThan(1);
  const [heldId, fastId] = others;

  const forActivity = (url, activityId) =>
    url.pathname === `${SCORES_API(section)}/${activityId}/scores`;
  const anyScores = (url) =>
    url.pathname.startsWith(`${SCORES_API(section)}/`) && url.pathname.endsWith('/scores');

  try {
    await page.route(anyScores, async (route, request) => {
      if (forActivity(new URL(request.url()), heldId)) await sleep(HELD_MS);
      await route.continue();
    });

    const heldArrived = page.waitForResponse((answer) =>
      forActivity(new URL(answer.url()), heldId),
    );

    // Chosen straight from the control rather than through `chooseActivity`,
    // which waits for the grid — this one is being held on purpose.
    await picker.selectOption(heldId);
    const fast = await chooseActivity(page, section, fastId);
    const drawn = await fast.json();

    await heldArrived;
    await page.waitForTimeout(SETTLE_MS);

    // The heading over the grid is `data.activity.activity_name`, so it is the
    // answer speaking rather than the picker: teacher and grid disagreeing
    // about which piece of work is being marked is how a class of marks gets
    // typed into the wrong Activity.
    expect({
      chosen: await picker.inputValue(),
      heading: (await gridHeading(page).innerText()).trim(),
    }).toEqual({
      chosen: fastId,
      heading: drawn.activity.activity_name,
    });
  } finally {
    await page.unroute(anyScores);
  }
});

test("a save's answer does not redraw a กิจกรรม the picker has already left", async ({ page }) => {
  // `ActivityScores.js:312`, the site that is not a load. A save answers with
  // the whole screen — `screenOf` — and that answer is drawn exactly like a
  // read, so a save that lands after the teacher has moved on puts the marks of
  // one piece of work under the name of another, with every cell editable.
  //
  // บันทึกคะแนน is pressed without a cell being touched, so the request carries
  // `marks: []` and nothing is written: what this row is about is the answer,
  // and #34's rows own what a save stores.
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);

  const opened = await (await openScores(page, section)).json();
  const picker = activityPicker(page);
  const others = await pickerIds(picker, opened.activity.id);
  const [heldId, fastId] = others;

  await chooseActivity(page, section, heldId);

  const forActivity = (url, activityId) =>
    url.pathname === `${SCORES_API(section)}/${activityId}/scores`;
  const anyScores = (url) =>
    url.pathname.startsWith(`${SCORES_API(section)}/`) && url.pathname.endsWith('/scores');

  try {
    await page.route(anyScores, async (route, request) => {
      if (request.method() === 'PUT') await sleep(HELD_MS);
      await route.continue();
    });

    const savedArrived = page.waitForResponse(
      (answer) =>
        forActivity(new URL(answer.url()), heldId) && answer.request().method() === 'PUT',
    );

    await saveButton(page).click();
    const fast = await chooseActivity(page, section, fastId);
    const drawn = await fast.json();

    const saved = await savedArrived;
    // A save of nothing is still a save, and a refusal here would leave this
    // row racing an error banner instead of an answer.
    expect(saved.status()).toBe(200);
    await page.waitForTimeout(SETTLE_MS);

    expect({
      chosen: await picker.inputValue(),
      heading: (await gridHeading(page).innerText()).trim(),
    }).toEqual({
      chosen: fastId,
      heading: drawn.activity.activity_name,
    });
  } finally {
    await page.unroute(anyScores);
  }
});

test('a list a save reloads does not land on top of the หลักสูตร the filter has moved to', async ({
  page,
}) => {
  // `Plos.js` again, and its second caller rather than its effect. บันทึก, ลบ
  // and a refused แก้ไข each reload the list, and nothing tears a handler down —
  // so the flag the effect hands out cannot serve them, and the question they
  // ask is the one the save on `ActivityScores` asks: *is the filter still where
  // it was when I was sent*. Without it the reload a save asks for draws the
  // curriculum the teacher has just left, with every row's แก้ไข opening a form
  // about an outcome the screen is not showing.
  //
  // The form replaces the filter while it is open, so this looks unreachable
  // until you read the order: `save` clears `editing` before it reloads, which
  // puts the filter back on screen with the request still out.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openPlos(page);
  await filterTo(page, PROGRAM);

  const [code] = await listedPloCodes(page);
  await openEditor(page, code);

  const anyList = (url) => url.pathname === PLOS_API;
  const forProgram = (url, id) => anyList(url) && url.searchParams.get('program_id') === id;

  try {
    // Installed after the screen has drawn, unlike the row above: this one needs
    // a list on screen to press แก้ไข on, and only the reload is on trial.
    await page.route(anyList, async (route, request) => {
      if (forProgram(new URL(request.url()), PROGRAM)) await sleep(HELD_MS);
      await route.continue();
    });

    const reloadArrived = page.waitForResponse((answer) =>
      forProgram(new URL(answer.url()), PROGRAM),
    );
    const otherArrived = page.waitForResponse((answer) =>
      forProgram(new URL(answer.url()), OTHER_PROGRAM),
    );

    // Saved without a field being changed: what is on trial is the reload, and
    // #19's rows own what a save stores. The outcome keeps its values; the
    // `updated_at` it does not keep is what `hold()` is here for.
    await ploSaveButton(page).click();

    // The filter comes back when `editing` is cleared, which is before the
    // reload is awaited — so this is a wait for the screen, not a sleep.
    const filter = programFilter(page);
    await expect(filter).toBeVisible();
    await filter.selectOption(OTHER_PROGRAM);

    const other = await (await otherArrived).json();
    const reloaded = await (await reloadArrived).json();
    expect(other.plos.map((plo) => plo.outcome_code)).not.toEqual(
      reloaded.plos.map((plo) => plo.outcome_code),
    );

    await page.waitForTimeout(SETTLE_MS);

    expect({
      chosen: await filter.inputValue(),
      codes: await listedPloCodes(page),
    }).toEqual({
      chosen: OTHER_PROGRAM,
      codes: other.plos.map((plo) => plo.outcome_code),
    });
  } finally {
    await page.unroute(anyList);
  }
});

/**
 * Two students of the seeded intake with marks under PLO-2 — 45a's query, for
 * its reason, asking for two.
 *
 * Marked *on PLO-2* and enrolled in the Section the Activity belongs to, which
 * is what `cohortMarks` requires before a mark counts. A student picked on any
 * mark could be one whose marks are all under some other outcome, and this row
 * needs the ที่มา button on both of them: the screen offers it only where there
 * is a score.
 */
async function markedStudents(admissionYear) {
  const { rows } = await db.query(
    `SELECT DISTINCT st.student_id, st.full_name_th
       FROM student st
       JOIN activity_scores s ON s.student_id = st.student_id
       JOIN activities a ON a.id = s.activity_id
       JOIN student_course sc
         ON sc.student_id = s.student_id AND sc.section_id = a.section_id
       JOIN subject_clo c ON c.clo_id = s.clo_id
       JOIN learning_outcomes o ON o.outcome_id = c.plo_id
      WHERE st.program_id = $1 AND st.admission_year = $2
        AND s.score IS NOT NULL AND c.program_id = $1 AND o.outcome_code = 'PLO-2'
      ORDER BY st.student_id ASC
      LIMIT 2`,
    [PROGRAM, admissionYear],
  );
  expect(rows, 'the seeded intake should have two students marked on PLO-2').toHaveLength(2);
  return rows;
}

/** The กิจกรรม the picker offers other than the one the screen opened on. */
async function pickerIds(picker, opened) {
  const ids = await picker.locator('option').evaluateAll((options) =>
    options.map((option) => option.value),
  );
  return ids.filter((id) => id !== String(opened));
}

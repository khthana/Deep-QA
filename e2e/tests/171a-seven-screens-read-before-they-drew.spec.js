'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openDashboard } = require('../support/teaching-screen');
const { openRubrics, rubricRow } = require('../support/rubrics-screen');
const { holdBack, wentThroughTheWindow } = require('../support/late-answer');

const clos = require('../support/clos-screen');
const behaviors = require('../support/behaviors-screen');
const criteria = require('../support/achievements-screen');
const plan = require('../support/plan-screen');
const scores = require('../support/scores-screen');
const mapping = require('../support/plo-mapping-screen');
const rubric = require('../support/rubric-criteria-screen');

/**
 * #171 - the seven screens that opened with nowhere to settle.
 *
 * #170 closed one screen of eight that shared a hole: `openAt(page, path,
 * waitForX)` returns when the answer's **headers** land, the screen draws from a
 * body that arrives after them and from state React sets after that, and a
 * non-retrying read on the next line reads a screen that has drawn nothing. The
 * other seven were a census with a date on it, carried here.
 *
 * ## Measured before anything was written - all seven, 10 red of 10
 *
 * The instrument is `support/late-answer.js`, which is `170a`'s fixture moved out
 * of it when the review pointed out that this file had made a second copy with a
 * renamed global (#96). It works for `170a`'s reason: the knob is the **answer's**
 * own lateness and not the renderer's, because these reads are executed by the
 * renderer too, so a CPU throttle or a held thread queues the read behind the
 * drawing it was supposed to beat (#164, #170 - 0 reds in 20 each, both knobs).
 * What opens the window is a `fetch` wrapper that lets the answer arrive and then
 * waits before handing it on, with the thread left free. That file says the rest.
 *
 * With that window at 400ms, every one of the seven read wrongly on **every one
 * of ten opens**, measured on 29 September 2569:
 *
 * | helper | read | reds |
 * |---|---|---|
 * | `clos-screen.js` | `codesOnScreen` | 10/10 |
 * | `behaviors-screen.js` | `numbersOnScreen` | 10/10 |
 * | `achievements-screen.js` | `numbersOnScreen` | 10/10 |
 * | `plan-screen.js` | `headingsOnScreen` | 10/10 |
 * | `scores-screen.js` | `columns`, after `chooseActivity` | 10/10 |
 * | `plo-mapping-screen.js` | `listedCodes` | 10/10 |
 * | `rubric-criteria-screen.js` | `listedNames` | 10/10 |
 *
 * The marks screen's row is the one whose first measurement was wrong, and it is
 * worth the sentence. The ticket's table is not what was wrong: it cites
 * `scores-screen.js:117`, which is that file's raw read, and so it is. What was
 * wrong is what got built on it. `columns` scopes itself to the table carrying
 * รหัสนักศึกษา, and that screen opens on whichever Activity the seed put first - a
 * **group** one, so the first column is named กลุ่ม and `columns` is `[]` on a fully
 * drawn screen as well as on an undrawn one. Ten reds of ten that mean nothing,
 * and a settle point built on them that read fifty-seven where the grid draws six.
 *
 * Read by where the risk is instead, this screen's reads sit behind a **press**
 * rather than behind an open: `whoColumn` at `34a:452`, four lines after the
 * `chooseActivity` at `34a:448`, and `columns` at `34a:197`, behind the same press
 * with two clicks that send no request in between. Same headers-only wait, reached
 * by pressing a control rather than by opening an address - so that is where this
 * row reads, and the settle point is at both sites.
 *
 * The natural window is the one #170 timed at 11-22ms and caught once in ten
 * opens with no instrument at all. Nothing here re-measures that per screen: a
 * row that only reran would be the row that catches a defect on some runs rather
 * than the row that holds it (#129).
 *
 * ## Seven settle points and not one helper
 *
 * Each screen gets its own `until…Drawn`, written with that screen's own locator
 * and its own count, which is the ticket's third criterion and #68's rule: one
 * hook behind seven screens would turn seven claims into one no control could
 * measure apart. Each is two clauses that cover each other's blind spot, as
 * `untilActivitiesDrawn` is:
 *
 * - a **count** of what the answer carried, which is the clause that holds on a
 *   reload, where a list stays drawn while one is out (#149) and a heading drawn
 *   from `data` already says what this answer says;
 * - a **text the answer named**, which is the clause that holds on an open whose
 *   list is empty, where the count is `0` both before the screen has drawn
 *   anything and after.
 *
 * ## What proves each one - seven controls, run on 29 September 2569
 *
 * A control run by hand, one per row - `e2e/support/` is not what `mutation/`
 * mutates, and `160a` says why. Each was taken out on its own and `171a` was run
 * together with that screen's own spec, so the run answers two questions at once:
 * what the control kills, and what it does not. Every one of the seven killed
 * **one row - its own** - and left the other six and the whole of the screen's own
 * spec standing:
 *
 * | control off | red row | red message | rest |
 * |---|---|---|---|
 * | `untilClosDrawn` | 27 | 9 codes vs 1 | 15 passed |
 * | `untilBehaviorsDrawn` | 28 | 2 vs `[]` | 14 passed |
 * | `untilCriteriaDrawn` | 29 | 4 vs `[]` | 14 passed |
 * | `untilPlanDrawn` | 31 | 3 vs `[]` | 14 passed |
 * | `untilScoresDrawn` (at `chooseActivity`) | 34 | `drawn[0]` undefined | 20 passed |
 * | `untilGridDrawn` | 20 | 13 codes vs 1 | 14 passed |
 * | `untilListDrawn` (at `openCriteriaAt`) | 22 | 3 names vs the loading row | 16 passed |
 *
 * Row 34's is the one that was also repeated, because it is the one whose figure
 * was re-measured: **10 red of 10** with the control out, **10 green of 10** with
 * it in.
 *
 * The seven were run while the instrument still lived in this file. Moving it into
 * `support/late-answer.js` afterwards is a change to what builds the window and
 * not to what the controls take out, so one of them was re-run against the shared
 * instrument rather than all seven: screen 27's, which still kills its own row and
 * nothing else, with the same red. The record is in `docs/lessons.md` §#171.
 *
 * ## What is not here
 *
 * The reads that follow a **delete** on these screens. Measured rather than
 * assumed: on `28a`, `29a` and `31a` the raw read after a removal follows a
 * *cancel*, which sends no request and reloads nothing, and each is preceded by a
 * retrying count. The one real one is `27a:244`'s, where `clos-screen.js`'s
 * `removeClo` waits for the DELETE's headers and for nothing after them. That is
 * not fixed here and it is not this row's business; it is #174, with the
 * three chart screens the census missed, and it is named here so nobody reads
 * this file as covering it.
 */

/** The first Section this teacher has, read off their own dashboard. */
async function teacherSection(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const { sections } = await (await openDashboard(page)).json();
  return sections[0].section_id;
}

test('27: the CLO codes are read after the set is drawn, not before', async ({ page }) => {
  await holdBack(page, '/clos$');
  const section = await teacherSection(page);

  const answer = await clos.openClos(page, section);
  await wentThroughTheWindow(page);

  const { clos: answered } = await answer.json();
  // Counted as well as read (#164): an empty answer and an undrawn screen read
  // the same way round, and only the count tells them apart. The seed puts nine
  // outcomes on this Offering, which is what `27a` row 1 counts.
  expect(answered).toHaveLength(9);
  expect(await clos.codesOnScreen(page)).toEqual(answered.map(clo => clo.clo_number));
});

test('28: the behaviour numbers are read after the list is drawn, not before', async ({ page }) => {
  await holdBack(page, '/behaviors$');
  const section = await teacherSection(page);
  const [clo] = await behaviors.myClos(page, section);

  const answer = await behaviors.openBehaviors(page, section, clo.clo_id);
  await wentThroughTheWindow(page);

  const { behaviors: answered } = await answer.json();
  expect(answered.length).toBeGreaterThan(0);
  expect(await behaviors.numbersOnScreen(page)).toHaveLength(answered.length);
});

test('29: the criterion numbers are read after the list is drawn, not before', async ({ page }) => {
  await holdBack(page, '/criteria$');
  const section = await teacherSection(page);
  const [clo] = await criteria.myClos(page, section);

  const answer = await criteria.openCriteria(page, section, clo.clo_id);
  await wentThroughTheWindow(page);

  const { criteria: answered } = await answer.json();
  expect(answered.length).toBeGreaterThan(0);
  expect(await criteria.numbersOnScreen(page)).toHaveLength(answered.length);
});

test('31: the plan headings are read after the calendar is drawn, not before', async ({ page }) => {
  await holdBack(page, '/plan$');
  const section = await teacherSection(page);

  const answer = await plan.openPlan(page, section);
  await wentThroughTheWindow(page);

  const { weeks } = await answer.json();
  expect(weeks.length).toBeGreaterThan(0);
  expect(await plan.headingsOnScreen(page)).toHaveLength(weeks.length);
});

/**
 * The seeded Activity that is marked per person, as `34a` names it.
 *
 * Named rather than taken by position because which Activity the screen opens on
 * is the seed's business (`34a` says so), and this row needs the other kind: the
 * grid it reads has to be the roll's, or `columns` finds no table to read.
 */
const MIDTERM = 'สอบกลางภาค';

test('34: the grid columns are read after the grid is drawn, not before', async ({ page }) => {
  await holdBack(page, '/scores$');
  const section = await teacherSection(page);

  await scores.openScores(page, section);
  // The picker's option carries the name and the id, so the id comes off the
  // screen rather than out of the database - one dependency fewer than `34a`
  // needs, because this row is about the drawing and not about the marks.
  const individual = await scores
    .activityPicker(page)
    .locator('option', { hasText: MIDTERM })
    .getAttribute('value');
  const answer = await scores.chooseActivity(page, section, individual);
  await wentThroughTheWindow(page);

  const { activity, students } = await answer.json();
  // The precondition, asserted where it is used (#51): `columns` can only read a
  // table headed รหัสนักศึกษา, and only a non-group Activity draws one. An open that
  // landed on a group Activity would read `[]` and look exactly like the defect.
  expect(activity.activity_type).not.toBe('group');
  expect(students.length).toBeGreaterThan(0);

  const drawn = await scores.columns(page);
  expect(drawn[0]).toContain('รหัสนักศึกษา');
  expect(drawn.length).toBeGreaterThan(1);
});

test('20: the grid columns are read after the header is drawn, not before', async ({ page }) => {
  await holdBack(page, '/api/plo-mapping$');
  await signIn(page, ACCOUNTS.committee0501);

  const answer = await mapping.openMapping(page);
  await wentThroughTheWindow(page);

  const { outcomes } = await answer.json();
  // Thirteen, which is 0501's own count and what `20a` row 1 asserts - written
  // as the answer's length rather than as the number, because the row is about
  // the drawing and not about the seed.
  expect(outcomes).toHaveLength(13);
  expect(await mapping.listedCodes(page)).toEqual(outcomes.map(outcome => outcome.outcome_code));
});

test('22: the criterion names are read after the table is drawn, not before', async ({ page }) => {
  await holdBack(page, '/criteria$');
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await rubric.openCriteriaVia(page, rubricRow(page, 'RUB-01'));
  const rubricId = page.url().match(/rubrics\/(\d+)\/criteria/)[1];

  const answer = await rubric.openCriteriaAt(page, rubricId);
  await wentThroughTheWindow(page);

  const { criteria: answered } = await answer.json();
  expect(answered.length).toBeGreaterThan(0);
  expect(await rubric.listedNames(page)).toHaveLength(answered.length);
});

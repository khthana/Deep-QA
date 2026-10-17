'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { COHORTS } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { menuEntries, menuLink } = require('../support/shell');
const {
  PATH: TREND_PATH,
  showRange,
  yearHeader,
} = require('../support/program-trend-screen');
const {
  PATH: HEATMAP_PATH,
  showIntake: showHeatmapIntake,
  codesOnScreen,
} = require('../support/all-students-screen');
const {
  PATH: INDIVIDUAL_PATH,
  showIntake: showRollIntake,
  rollRows,
} = require('../support/program-student-screen');

/**
 * The screens an external assessor may reach — #49.
 *
 * `docs/01` ROLE-6 said of this role only that the account is time-boxed, so
 * until 16 October 2569 its menu was one invented entry and said so in its own
 * docstring. The requirement owner settled the set that day: the four
 * programme-level results the curriculum committee reads, read-only, which is
 * `docs/01` §9 `OWN-01`. These rows are that requirement, asked of the shell.
 *
 * ## What is here that the HTTP seam cannot see
 *
 * The server was already open at all nine `/program-results/*` routes to this
 * role before the menu was — the guard is one constant shared by the four
 * screens (`backend/routes/programResults.js`, `READERS`) — so every one of
 * those endpoints answered 200 to an assessor while three of the four screens
 * had no way in. That is the half this file holds: a set of entries is drawn or
 * it is not, and *reaching a screen from the menu* is a sequence of states
 * rather than a payload. The server's half, including the refusal of every
 * screen the set leaves out, is `backend/test/shell.test.js`.
 *
 * ## Why the by-intake arrival is not a row here
 *
 * It is already `42a`'s, where it was written when that was the only entry this
 * role had, and a second row saying it would be one claim in two places (#97).
 * What changed there is the wording it presses: this role's entries are the
 * committee's own, under the committee's group, so the first of them is
 * *ระดับหลักสูตรตามรุ่นปีรับเข้า* and no longer the invented
 * *ผลการเรียนรู้ระดับหลักสูตร*. The four labels are delivered wording
 * (`docs/05` A15–A18); the one they replace was not, the inherited frontend
 * having had no menu for this role at all.
 *
 * ## The set, and one row per arrival
 *
 * Row 1 reads the whole menu and compares it against the five labels written
 * out below rather than against `MENUS`, because an assertion fed by the list
 * that drew the menu holds nothing (`docs/acceptance/10-application-shell.md`
 * row 1 says so of the user menu). Its mutant is `assessormenuiscommittee`,
 * which hands this role the committee's whole menu: every entry these rows
 * press is still there, so it dies here and nowhere else.
 *
 * The three arrivals are three rows and not one, because a row that pressed
 * all three would report the first one that failed and leave the other two
 * unread (#88). Each one's mutant points its own entry at a sibling's path, so
 * the label is untouched, row 1 passes, and the row dies at its own
 * `toHaveURL` with the two addresses named.
 */

const [CURRENT, PRIOR] = COHORTS;

/** The group the four entries hang under, and the four themselves. */
const GROUP = 'การประเมินผลการเรียนรู้';
const BY_INTAKE = 'ระดับหลักสูตรตามรุ่นปีรับเข้า';
const COMPARE = 'เปรียบเทียบระดับหลักสูตร';
const INDIVIDUAL = 'ระดับหลักสูตรรายคน';
const ALL_STUDENTS = 'ระดับหลักสูตรของนักศึกษาทุกคน';

/**
 * Signs the assessor in and opens one of their entries.
 *
 * The group is pressed before the entry the way the committee's own rows press
 * it (`43a`, `44a`), and the URL is asserted rather than waited for: a wait
 * says where it waited, where `toHaveURL` says which address the press
 * actually reached, which is the sentence the path mutants have to produce.
 */
async function arriveAt(page, entry, path) {
  await signIn(page, ACCOUNTS.externalAssessor);

  // One press, not two. `SidebarItem` opens every group that has a `sub` for
  // every role but the teacher, so the four entries are already on the screen
  // when the shell draws - measured: five entries and the compare link visible
  // on arrival. The group header *toggles*, and the sub list is drawn only
  // while the group is open, so pressing it first **closes** the group and
  // takes the entry off the screen; the press that follows lands only by
  // beating React's re-render, which is a read racing a drawing in the other
  // direction and the shape row 3 lost to under all four mutants.
  //
  // The four sibling rows that pressed twice (`42a`, `43a`, `44a`, `45a`) are
  // the committee's, written before that was measured, and were not this
  // ticket's to rewrite: #212 took the press out of all four and counted
  // the race at eight frames, the exit animation's rather than a render's.
  await menuLink(page, entry).click();

  await expect(page).toHaveURL(path);
}

test('row 1: the assessor sees the four programme-level screens and nothing else', async ({
  page,
}) => {
  // The whole menu, not a lookup per entry: what the requirement decided is a
  // set, and a row that asked after each of the four by name would pass with a
  // fifth beside them.
  await signIn(page, ACCOUNTS.externalAssessor);
  await expect(menuLink(page, BY_INTAKE)).toBeVisible();

  const labels = (await menuEntries(page)).map(entry => entry.label);

  expect(labels).toEqual([GROUP, BY_INTAKE, COMPARE, INDIVIDUAL, ALL_STUDENTS]);
});

test('row 2: the comparison across intakes is one of them', async ({ page }) => {
  await arriveAt(page, COMPARE, TREND_PATH);

  // The screen as well as the address: an entry that led to a drawn-nothing
  // report would satisfy the URL and leave this role where it was before #42.
  await showRange(page, PRIOR.admission, CURRENT.admission);
  await expect(yearHeader(page, CURRENT.admission)).toBeVisible();
});

test('row 3: one student at a time is one of them', async ({ page }) => {
  await arriveAt(page, INDIVIDUAL, INDIVIDUAL_PATH);

  // The roll is read from the curriculum this role's grant names, so a roll
  // with nobody on it would mean the scope reached nothing rather than that
  // the screen drew.
  //
  // Retrying, and read off the first row rather than counted: `showIntake`
  // returns the moment the picker holds the year the screen opened on, and
  // nothing between the menu press and here waits for the roll itself, so a
  // `count()` is a read racing a drawing (#132). It won on a clean run and
  // lost under all four of this ticket's mutants, which is what said so.
  await showRollIntake(page, CURRENT.admission);
  await expect(rollRows(page).first()).toBeVisible();
});

test('row 4: the whole-cohort heatmap is one of them', async ({ page }) => {
  await arriveAt(page, ALL_STUDENTS, HEATMAP_PATH);

  await showHeatmapIntake(page, CURRENT.admission);

  // The grid and not the control. `orderPicker` is drawn whatever the answer
  // carried, so reading it would pass for an entry that led to a
  // drawn-nothing report - which is the thing this row is about, and the
  // reason rows 2 and 3 read the year heading and the roll. Through the
  // helper's own locator, and polled, because `codesOnScreen` does not retry
  // (#132).
  await expect
    .poll(async () => (await codesOnScreen(page)).length, {
      message: 'the heatmap should draw a row per student on the intake',
    })
    .toBeGreaterThan(0);
});

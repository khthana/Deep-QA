'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { menuEntries, menuLink } = require('../support/shell');
const { openDashboard, chooseSection } = require('../support/teaching-screen');

/**
 * #105 — the side menu draws the icon each entry declares.
 *
 * Every entry of every role's menu has carried an icon in its config since the
 * system was delivered, and the shell drew a 4px dot for each sub-item and
 * used none of them. It was found walking #30's menu row and deferred three
 * times, on the sheets for #30, #31 and #32, because it was the whole panel's
 * behaviour and not any one screen's.
 *
 * ## What is here and what is not
 *
 * A picture is appearance, and appearance is hand-walked in this suite. What
 * is not appearance is whether the shell reads each entry's own config at all
 * - the defect was that it read none of them - and that is what these rows
 * ask: that no entry is left drawing nothing, and that two entries do not get
 * the same drawing. Whether the drawing beside สัดส่วนคะแนน is a pair of
 * scales is the row that stays on docs/acceptance/30.
 *
 * ## Why two roles
 *
 * The sub-item branch these rows are about is the one the teacher's menu goes
 * through - the only menu whose entries have their `%SECTION%` swapped for the
 * id in the address. A fix written inside that branch would look right on
 * every screen a teacher opens and leave the other five menus drawing dots,
 * which is the shape #112 found on a chart shared by two screens. Row 2 is
 * what `onlyteacher` is aimed at, and it is the row that dies to it.
 */

const SUBJECT = '01076105';

/** The pair the rows name: two entries of the teacher's section menu. */
const SCALE = 'สัดส่วนคะแนน';
const PLAN = 'แผนการสอน';

/**
 * The pair for a menu that is nobody's section - a committee's own screens.
 *
 * Both are entries of the same group, as the teacher's pair are. A pair taken
 * from two different groups would draw two different things under `groupicon`
 * as well, and the row would pass a shell that had stopped reading the entries
 * altogether.
 */
const SUBJECTS_IN_PROGRAM = 'รายวิชาในหลักสูตร';
const OFFERINGS = 'การเปิดรายวิชาในภาคการศึกษา';

/**
 * Asserts the whole menu draws, and that the two named entries draw different
 * things.
 *
 * The two names are read first on purpose. `blank` is a claim about a list,
 * and a list that is empty satisfies it without anybody noticing - a menu that
 * failed to draw at all would pass a row written the other way round.
 *
 * Before any of that, one retrying wait for the first name. What gets these
 * rows here waits for an answer - `signIn` for the login response and then a
 * URL, `chooseSection` for the section's - and an answer is not a drawing, so
 * the snapshot below, which does not retry, can be taken of a panel that has
 * not painted. That is a red for a reason these rows are not about. The wait
 * is for a name and not for a drawing, so it is still the assertions below
 * that every mutant has to get past.
 */
async function everyEntryDraws(page, [first, second]) {
  await expect(menuLink(page, first)).toBeVisible();

  const entries = await menuEntries(page);
  const labels = entries.map(entry => entry.label);
  expect(labels).toContain(first);
  expect(labels).toContain(second);

  const blank = entries.filter(entry => entry.drawing === null).map(entry => entry.label);
  expect(blank).toEqual([]);

  const drawn = name => entries.find(entry => entry.label === name).drawing;
  expect(drawn(first)).not.toBe(drawn(second));
}

test('row 1: every entry of a teacher\'s section menu draws its own icon', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await openDashboard(page);
  await chooseSection(page, SUBJECT);

  await everyEntryDraws(page, [SCALE, PLAN]);
});

test('row 2: the menu of a role with no section draws its icons too', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0501);

  await everyEntryDraws(page, [SUBJECTS_IN_PROGRAM, OFFERINGS]);
});

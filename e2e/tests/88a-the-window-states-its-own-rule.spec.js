'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUsers } = require('../support/users-screen');
const { openEditor } = require('../support/grants-panel');

/**
 * #88 - the two ends of an account's validity window state their own rule.
 *
 * Walked on 21 August 2569 (sheet `11`, row 4, the row *a window the wrong way
 * round*): a start of 29/08 with an end of 28/08 is refused, correctly, by
 * `validateUser` in `backend/routes/users.js` and by the table's own CHECK
 * constraint - but only once the form has been filled in and posted. Nothing
 * on the screen said the rule while the person was choosing the dates.
 *
 * This is an addition and not a replacement. Both server-side guards stay
 * where they are: a rule a form enforces alone is a rule with a way around it
 * (ADR-0002), and #125's mutation record already shows that flipping the
 * route's comparison still gets the window refused, by the constraint. What
 * these rows are about is the half that was missing - that the field a person
 * is choosing in carries the bound, so the browser's own picker will not offer
 * a day the system is going to refuse.
 *
 * Why the attribute rather than a screenshot of the picker: the bound is what
 * the browser decides with, and `validity.rangeUnderflow` is that decision
 * being read back. The picker's appearance is a hand-walked row and stays one.
 *
 * Why an empty counterpart leaves the field unbounded: the server's rule is
 * `from && until && from > until`, so an end with no start is open and a start
 * with no end is open. A field that bounded itself anyway would refuse a
 * window the system accepts - the other direction of a *refuse only where X*
 * guard (#48, #108).
 *
 * No row here writes to the register. The add form is filled and never
 * submitted, and the editor is only read, so the file can be run twice and
 * leaves the seeded accounts as it found them. The three `user_log` rows the
 * leftovers report names are the sign-ins themselves, which every spec in this
 * suite leaves behind.
 */

/** The three labels, as the screen writes them. */
const ADD = 'เพิ่มผู้ใช้งาน';
const START = 'เริ่มใช้งานได้';
const UNTIL = 'ใช้งานได้ถึง';

/**
 * The two fields, by the statement inside their own label.
 *
 * `exact` because the labels share their words with each other and with the
 * fieldset's legend, and a loose match on this screen has been wrong before
 * (#93).
 */
const startField = page => page.getByLabel(START, { exact: true });
const untilField = page => page.getByLabel(UNTIL, { exact: true });

/** Puts the add form on the screen, with both of its date fields drawn. */
async function openAddForm(page) {
  await openUsers(page);
  await page.getByRole('button', { name: ADD }).click();
  await expect(startField(page)).toBeVisible();
  await expect(untilField(page)).toBeVisible();
}

/** What the browser makes of the value a field is holding. */
const rangeOf = field =>
  field.evaluate(element => ({
    under: element.validity.rangeUnderflow,
    over: element.validity.rangeOverflow,
  }));

test('row 1: the end of the window is bounded below by the start that was chosen', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openAddForm(page);

  // Nothing chosen yet, so there is nothing to bound: an end with no start is
  // a window the server accepts.
  expect(await untilField(page).getAttribute('min')).toBeNull();

  await startField(page).fill('2026-08-29');
  await expect(untilField(page)).toHaveAttribute('min', '2026-08-29');
});

test('row 2: the start of the window is bounded above by the end that was chosen', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openAddForm(page);

  expect(await startField(page).getAttribute('max')).toBeNull();

  // The same rule from the other end, and it is a rule of its own: a person
  // filling the form from the bottom up chooses the end first.
  await untilField(page).fill('2026-08-28');
  await expect(startField(page)).toHaveAttribute('max', '2026-08-28');
});

test('row 3: an account that already has a window is bounded before anything is typed', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.externalAssessor);

  // The precondition, asserted where it is used and not where it was arranged
  // (#51): this is the seeded assessor, and the row means nothing unless the
  // window it is drawn from has both ends.
  const from = await startField(page).inputValue();
  const until = await untilField(page).inputValue();
  expect(from).not.toBe('');
  expect(until).not.toBe('');

  // Bound from the values the editor was drawn with, so the rule is stated to
  // somebody who opens an existing window and moves one end of it - which is
  // the way the refusal is most easily reached in use.
  await expect(untilField(page)).toHaveAttribute('min', from);
  await expect(startField(page)).toHaveAttribute('max', until);
});

test('row 4: clearing one end takes the bound off the other again', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openAddForm(page);

  // Its own row, and not the last line of rows 1 and 2, because the two
  // mutants about a bound where there is nothing to bound die at the *first*
  // unbounded assertion of each - so this one, which is the same claim at a
  // later moment, would be a claim nothing was ever read against (#119).
  await startField(page).fill('2026-08-29');
  await untilField(page).fill('2026-09-30');
  await expect(untilField(page)).toHaveAttribute('min', '2026-08-29');
  await expect(startField(page)).toHaveAttribute('max', '2026-09-30');

  // A person who clears a date has taken that end of the window off, which the
  // server reads as open. The field it was bounding is unbounded again rather
  // than keeping the value that has just gone.
  //
  // Read once, with no settle point, and it cannot race: an absent attribute is
  // not something `toHaveAttribute` can retry for, and the read the renderer
  // executes queues behind the drawing the `fill` caused (#170). If it ever
  // does come back late, the repair is a named settle point rather than a
  // longer wait (#50).
  await startField(page).fill('');
  expect(await untilField(page).getAttribute('min')).toBeNull();
  await untilField(page).fill('');
  expect(await startField(page).getAttribute('max')).toBeNull();
});

test('row 5: the bound is what the browser decides with, and it counts that day in', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openAddForm(page);

  await startField(page).fill('2026-08-29');
  await untilField(page).fill('2026-08-29');

  // The same day at both ends is a one-day window and is allowed - the walked
  // row *the first day of the window* on sheet `11`, and the reason the bound
  // is the counterpart's own day rather than the day after it.
  expect(await rangeOf(untilField(page))).toEqual({ under: false, over: false });
  expect(await rangeOf(startField(page))).toEqual({ under: false, over: false });

  // And the day the wrong side of the counterpart is what the bound exists
  // for: the browser holds it as out of range, where until now the round trip
  // to the server was the first thing to say so. This is the attribute being a
  // rule rather than decoration, which is the half a screenshot cannot show.
  await untilField(page).fill('2026-08-28');
  expect(await rangeOf(untilField(page))).toEqual({ under: true, over: false });
  expect(await rangeOf(startField(page))).toEqual({ under: false, over: true });
});

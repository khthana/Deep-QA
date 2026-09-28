'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openChangePassword, passwordFields } = require('../support/shell');

/**
 * #167 — a dialog cancelled from the user menu does not hand the next open what
 * was typed into it, or what the last person chose to reveal.
 *
 * Found on the way out of #47, whose photo dialog had the same symptom and a
 * different cause. The two were measured as a grid rather than argued about
 * (#148, #149), and only one half of it is here:
 *
 * - **The half this file holds.** The change-password form is not a component:
 *   it is written inside `Navbar.js`, and what is typed lives in the navbar's own
 *   `pwdData`. Cancelling set `showChangePwd` to false and cleared `error`, and
 *   nothing cleared the three passwords — `setPwdData` back to empty happened on
 *   a *successful* change and nowhere else. The navbar is never unmounted, so the
 *   next open is drawn from state that outlived the box: the current password
 *   somebody typed is on the screen again, behind an eye they can press.
 * - **The half no row can hold**, written down with its numbers in
 *   `mutation/47-profile-photo.py`: in a tab that is not getting frames the
 *   closed dialog is not removed from the document at all. That was measured on
 *   the photo dialog, the sibling inside this same `AnimatePresence`; under
 *   Playwright the box *is* removed, within a few hundred milliseconds, so the
 *   seam cannot build that situation for either box. It is the same ticket and it
 *   is not this row's claim.
 *
 * What is asserted here therefore holds in any browser, with no animation in it:
 * type, reveal, cancel, open again, and the fields are empty and hidden again.
 * Nothing is compared against a clock (#52).
 *
 * ## Two claims, so two reads and two mutants
 *
 * The fields being empty and the eyes being back are separate claims, and a
 * mutant that removed the whole exit would kill them as one (#145's shape: the
 * control mutant is what tells two claims apart). So the values are read off
 * **every** input in the form, which does not care what type it is, and the
 * reveal is read as *how many inputs are still `type="password"`* — which is
 * `shell.js`'s own `passwordFields`, exported rather than written again here so
 * that the two files cannot drift apart about what a password field is. Each has a
 * mutant of its own in `mutation/167-a-cancelled-dialog-forgets.py`, narrowed to
 * the line it is about.
 *
 * Counting the inputs beside reading them is #164's lesson: a read of what a
 * control holds cannot tell an absent control from an empty one.
 *
 * This file never submits, so it writes nothing: the password it types is never
 * sent and `10a`'s rows, which do change a password and change it back, are
 * untouched by it whichever order the two run in.
 */

/** Worded so that nothing else in the suite types it, and no account has it. */
const TYPED = {
  current: 'typed-then-cancelled-167',
  next: 'never-sent-167',
};

/** All three fields, whether or not an eye has turned one into plain text. */
const formInputs = page => page.locator('form').locator('input');

/** The eye beside a field: the button that is its own sibling, not any button. */
const eyeOf = field => field.locator('xpath=following-sibling::button');

/**
 * Scoped to the form: the profile-photo dialog is the sibling inside the same
 * `AnimatePresence` and carries a ยกเลิก of its own, so an unscoped lookup is a
 * claim about which of the two is open rather than about this one's button.
 */
const cancelButton = page =>
  page.locator('form').getByRole('button', { name: 'ยกเลิก' });

test('a change-password dialog reopened after a cancel holds nothing that was typed', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherTwo);
  await openChangePassword(page);

  const fields = formInputs(page);
  await expect(fields).toHaveCount(3);
  await expect(passwordFields(page)).toHaveCount(3);

  await fields.nth(0).fill(TYPED.current);
  await fields.nth(1).fill(TYPED.next);
  await fields.nth(2).fill(TYPED.next);

  // The preconditions, asserted where they are used (#51): there is something
  // for the box to forget, and one of the eyes is open. Without these the row
  // would pass on a screen whose fields never took the text in the first place,
  // and on one where nothing was ever revealed.
  await expect(fields.nth(0)).toHaveValue(TYPED.current);
  await eyeOf(fields.nth(0)).click();
  await expect(passwordFields(page)).toHaveCount(2);

  await cancelButton(page).click();
  await expect(formInputs(page)).toHaveCount(0);

  await openChangePassword(page);

  const reopened = formInputs(page);
  await expect(reopened).toHaveCount(3);
  await expect(reopened.nth(0)).toHaveValue('');
  await expect(reopened.nth(1)).toHaveValue('');
  await expect(reopened.nth(2)).toHaveValue('');
  await expect(passwordFields(page)).toHaveCount(3);
});

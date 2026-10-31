'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { openChangePassword, passwordFields } = require('../support/shell');

/**
 * #254 — the refusal that outlived the box that asked for it.
 *
 * `components/Navbar.js`' change-password box clears everything on the way out
 * (#167) — and it clears at the **press**, while the refusal arrives after it.
 * `handlePasswordSubmit`'s `catch` wrote `setError(err.message)` with nothing
 * asking whether the box is still the one that sent the change, and **nothing
 * unmounts this navbar**: the state stayed, and the box is drawn from
 * `{error && <p role="alert">…}`, so the next open read the last open's
 * refusal. #205's species — *what nothing clears is not lost; it turns up over
 * something it is not about* — met where the surface is a dialog rather than a
 * list.
 *
 * ## Why the guard is keyed on the opening and not on the flag
 *
 * The two rows below are the two claims, and they are what tell those two
 * guards apart (#145):
 *
 * 1. the refusal of a box that was cancelled is not in the box the next open
 *    draws — which a guard reading `showChangePwd` alone would also satisfy;
 * 2. and it is not in a box opened **while that same change is still out**,
 *    which only a key that says *which opening sent it* can answer (#185,
 *    #133). The second row is reachable by hand: `ยกเลิก` and the backdrop hold
 *    no flag, so the person can leave and come back inside the round trip.
 *
 * The positive claim — the refusal **is** said to the box that sent it — is
 * the second row of `243a`, which this file does not repeat: two places
 * holding one opinion is a claim neither can be shown to hold (#97). A mutant
 * that removes this guard leaves that row standing, which is what makes it the
 * control (#48).
 *
 * ## What this file writes
 *
 * Nothing. The change is held at the route and answered there with this file's
 * own refusal, so it never reaches the server — which matters here more than
 * usually, because `teacher.two@`'s seeded password is what `10a` row 7, `13a`
 * and `243a` sign in with, and a change that landed would take them with it.
 *
 * Measured rather than assumed (#132), on 31 ตุลาคม 2569: `leftovers.js`
 * reports 34 tables checked and one moved, `user_log +2`, which is this file's
 * two sign-ins — the one table nobody can clean, as `201a`, `88a` and `253a`
 * say of their own. The file can be run twice.
 */

/** This file's own refusal, so no row reads a real sentence loosely (#93). */
const REFUSED = 'คำปฏิเสธของแถว #254 เอง ไม่ได้มาจากเซิร์ฟเวอร์';

/** What the box is filled with; never saved. */
const TYPED = { current: PASSWORD, next: 'deep-core-254' };

const PASSWORD_ROUTE = /^\/api\/me\/password$/;

/** The box's own ยกเลิก, scoped to the form — `167a`'s and `243a`'s reason. */
const cancelButton = (page) =>
  page.locator('form').getByRole('button', { name: 'ยกเลิก' });

const saveButton = (page) =>
  page.getByRole('button', { name: 'บันทึกรหัสใหม่' });

/** The heading, which is what says a box is drawn rather than leaving. */
const boxHeading = (page) =>
  page.getByRole('heading', { name: 'เปลี่ยนรหัสผ่าน' });

/**
 * Opens the box, fills it, presses save and holds the change at the route.
 *
 * The fields are counted before they are filled, because a reader built on a
 * locator that found nothing fills nothing and reports neither (#164), and the
 * precondition that they are live is asserted where it is used (#51).
 */
async function sendAndHold(page) {
  await openChangePassword(page);

  const fields = passwordFields(page);
  await expect(fields).toHaveCount(3);
  await fields.nth(0).fill(TYPED.current);
  await fields.nth(1).fill(TYPED.next);
  await fields.nth(2).fill(TYPED.next);
  await expect(saveButton(page)).toBeEnabled();

  const write = await gate(page, PASSWORD_ROUTE, isWrite, { refusal: REFUSED });
  await saveButton(page).click();
  await write.sent;
  return write;
}

test('the refusal of a box that was cancelled is not in the box the next open draws', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherTwo);
  const write = await sendAndHold(page);

  // Where `243a`'s first row ends: ยกเลิก holds nothing while the change is
  // out, which is the owner's answer of 26 ตุลาคม 2569 and the way in this row
  // uses rather than one it opens.
  const cancel = cancelButton(page);
  await expect(cancel, 'ยกเลิก while the change is out').toBeEnabled();
  await cancel.click();

  // The box leaves on a tween, so the wait is for it to be gone before the
  // refusal is let go: this is the arrangement and not the claim, and what
  // removes it is `RetiringPresence` and nothing else (#214's question).
  await expect(boxHeading(page)).toHaveCount(0);

  write.open();
  await write.answered;

  await openChangePassword(page);

  // Counted, not only read (#164): a box that failed to open has no alert in
  // it either, so the controls say the screen is the one this row is about.
  await expect(
    passwordFields(page),
    'the fields of the box the next open draws',
  ).toHaveCount(3);

  // The claim. Read as a count at a named settle point and not as a retrying
  // negative (#50): the box has been drawn, and nothing in this screen removes
  // that banner once it is there (#214), so a read that passes here is a read
  // that could have failed.
  await expect(
    page.getByRole('alert'),
    'the refusal of the box that was cancelled, in the box the next open draws',
  ).toHaveCount(0);
  await expect(
    page.getByText(REFUSED),
    'the sentence of the change the person walked away from',
  ).toHaveCount(0);
});

test('nor is it in a box opened while that same change is still out', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherTwo);
  const write = await sendAndHold(page);

  await cancelButton(page).click();
  await expect(boxHeading(page)).toHaveCount(0);

  // Back in before the answer: the opening the refusal is about is gone, and
  // the box on the screen is a different one, which `showChangePwd` cannot
  // tell apart — the whole of why the guard holds a key and not a boolean
  // (#185, #207).
  await openChangePassword(page);
  await expect(
    passwordFields(page),
    'the fields of the box opened inside the round trip',
  ).toHaveCount(3);

  write.open();
  await write.answered;

  await expect(
    page.getByRole('alert'),
    'the refusal of the first opening, in the box opened inside the round trip',
  ).toHaveCount(0);
  await expect(
    page.getByText(REFUSED),
    'the sentence of the first opening, read on the second',
  ).toHaveCount(0);
});

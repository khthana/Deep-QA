'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { next, previous, reading, step } = require('../support/pager');
const enrolment = require('../support/enrolment-screen');

/**
 * #199 — the pager of รายชื่อนักศึกษาของรายวิชา is dead while a write of this
 * screen's is out.
 *
 * ## What was measured, and why the answer was not a guard
 *
 * #202 had already put the guard in: a sentence is said only if the screen is
 * still the one that asked (`onScreen.current === sent`), and `202a` walks it.
 * What that left is what the probe of 15 October 2569 read on the real screen,
 * four orderings and their unpressed twins:
 *
 * - press ถัดไป while the `POST` is out, and the answer arrives after the move:
 *   the person is taken back to page one and **told** — #205's key, working.
 * - let the `POST` answer and press ถัดไป while the **reload** is out: the
 *   enrolment happened and **nothing is ever said**.
 *
 * So one handler, one person, one action, and whether they are told depends on
 * which of two windows their press landed in — which nobody can see. Timing may
 * not decide anything (#52), and the owner's answer on 15 October 2569 was
 * #199's first option: close the control that opens both windows rather than
 * choose which sentence the two windows should agree on. The guards stay, and
 * what proves them is now the section jump (`202a`) and the sibling screen whose
 * pager is still live (`205a` on `Students.js`).
 *
 * The removal's own window was never reachable with a mouse: the dialog's
 * overlay takes the click, which the probe read as *intercepts pointer events*
 * and `205a` had already written down — the pager under the dialog needs #204's
 * keyboard hole. A disabled button is not in the tab order either, so the third
 * row below is that hole closed for this control, and not a claim about the
 * dialog.
 *
 * ## Why each row asserts the control twice
 *
 * `toBeEnabled()` before the write is the premise: a row that only ever reads
 * *disabled* passes on a screen where the button is disabled for its own
 * reasons — page one's ก่อนหน้า is disabled by #57's end rule whatever this
 * ticket does. The pair is what makes the second read a measurement (#171).
 */

const SPARE = enrolment.SPARE_CODES[1];
const ENROLLED = { student: { student_id: SPARE, full_name_th: 'ทดสอบ แถวของ #199' } };
const DONE = {};
const REMOVAL = /^\/api\/teaching\/sections\/\d+\/students\/\d+$/;

const button = (scope, name) => scope.getByRole('button', { name, exact: true });

/** Opens the screen, and says which page it is on and that there is another. */
async function openOnPageOne(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [sectionId] = await enrolment.mySectionIds(page);
  await enrolment.openEnrolment(page, sectionId);
  const table = enrolment.listTable(page);
  const { shown, pages } = await reading(page, table);
  expect({ shown, enough: pages > 1 }, 'page one, with a page two to move to').toEqual({
    shown: 1,
    enough: true,
  });
  return table;
}

/** Types a code and submits, with the answer held: the write is out on return. */
async function enrolmentOut(page) {
  const write = await gate(page, enrolment.API, isWrite, { success: ENROLLED });
  await page.getByLabel('รหัสนักศึกษา', { exact: true }).fill(SPARE);
  await button(page, 'เพิ่มนักศึกษา').click();
  await write.sent;
  return write;
}

/** Lets the held write answer, and waits for the screen to settle after it. */
async function letItLand(page, write) {
  write.open();
  await write.answered;
  await expect(button(page, 'เพิ่มนักศึกษา')).toBeEnabled();
}

test.describe('รายชื่อนักศึกษาของรายวิชา — the pager while a write is out', () => {
  test.describe.configure({ mode: 'serial' });

  test('ถัดไป cannot be pressed while an enrolment is out', async ({ page }) => {
    await openOnPageOne(page);

    await expect(next(page), 'the premise: it is pressable with nothing out').toBeEnabled();
    const write = await enrolmentOut(page);
    await expect(next(page), 'ถัดไป while the enrolment is out — #199').toBeDisabled();

    await letItLand(page, write);
    await expect(next(page), 'and live again once the write and its read are in').toBeEnabled();
  });

  test('ก่อนหน้า cannot be pressed while an enrolment is out', async ({ page }) => {
    const table = await openOnPageOne(page);
    expect((await step(page, 'forward', enrolment.waitForList)).status()).toBe(200);
    expect((await reading(page, table)).shown, 'the page the row is on').toBe(2);

    await expect(previous(page), 'the premise: page two, so the end rule is quiet').toBeEnabled();
    const write = await enrolmentOut(page);
    await expect(previous(page), 'ก่อนหน้า while the enrolment is out — #199').toBeDisabled();

    await letItLand(page, write);
  });

  test('ถัดไป cannot be reached under the dialog while a removal is out', async ({ page }) => {
    const table = await openOnPageOne(page);
    const code = (await table.locator('tbody tr td:first-child').first().textContent()).trim();

    await expect(next(page), 'the premise: it is pressable with nothing out').toBeEnabled();
    const write = await gate(page, REMOVAL, isWrite, { success: DONE });
    await button(page, `นำ ${code} ออกจากตอนเรียน`).click();
    await button(page, 'นำออก').click();
    await write.sent;

    // The claim is about the pager, not about the overlay: a mouse was never
    // getting through, and this says a keyboard would not either (#204).
    await expect(next(page), 'ถัดไป under the dialog, with the removal out — #199').toBeDisabled();

    write.open();
    await write.answered;
  });
});

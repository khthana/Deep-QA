'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { openChangePassword, passwordFields } = require('../support/shell');

/**
 * #243 — the two screens where #228's premise did not hold.
 *
 * #228 named its defect *what the person sees and what is being saved can part
 * company*, and bounded it with a sentence about the save button: *บันทึก of all
 * five screens is `disabled={busy}` already, so moving a field in between does
 * not cause a second send*. #243's census found 66 fields in 17 files holding
 * no flag at all while their own save is out, and asked which of them the
 * window is really open on. The question that answered it is not the one in the
 * ticket's table but #228's own premise read as a claim about each screen
 * (#133): of the 27 submit buttons in that population, **25 hold the page's
 * flag and two hold nothing** — `components/Navbar.js`, whose dialog this file
 * presses, and `components/LoginForm.js`, whose screen takes itself away.
 *
 * So the two rows below are the two halves of one measurement, and they
 * disagree about what was wrong:
 *
 * 1. the change-password dialog's three fields and its own button are closed
 *    while the change is out, and *ยกเลิก* is not — #228's shape, landed where
 *    the defect was a **second request** and not only a divergence;
 * 2. and a second press of that button sends nothing, which is the half the
 *    divergence rows of `228a` and `242a` do not read;
 * 3. the sign-in screen is not on the screen at all while the sign-in is out,
 *    which is why that file is given a dated reason and no flag (#141). It is
 *    a claim about what a person can reach, so it is read rather than argued
 *    (#169) — and what it cannot see is the exit animation's own frames, where
 *    the leaving form is still in the document (#212).
 *
 * `docs/acceptance/10-application-shell.md` carries rows 1 and 2; row 3 is on
 * `docs/acceptance/50-sign-in-screens.md`.
 *
 * Nothing here writes. Every request on both paths is stopped at the route —
 * the first by `gate`, any further one by this file's own refusal below it, so
 * a mutant that lets a second press through cannot reach the database with it.
 * That matters more here than it usually does: the seeded password of
 * `teacher.two@` is what `10a` row 7 and `13a` sign in with, and a change that
 * landed would take them with it (`11c` says the same about its own probe).
 */

/** This file's own refusal, so no row reads a real sentence loosely (#93). */
const REFUSED = 'คำปฏิเสธของแถวนี้เอง ไม่ได้มาจากเซิร์ฟเวอร์ (#243)';

/** What the dialog's three fields are filled with; never saved. */
const TYPED = { current: PASSWORD, next: 'deep-core-243' };

const PASSWORD_PATH = '/api/me/password';
const LOGIN_PATH = '/api/auth/login';

/** The dialog's own ยกเลิก, scoped to the form — `167a`'s reason. */
const cancelButton = page =>
  page.locator('form').getByRole('button', { name: 'ยกเลิก' });

const saveButton = page => page.getByRole('button', { name: 'บันทึกรหัสใหม่' });

/**
 * Counts what left the browser on one path, and refuses it at the route.
 *
 * The count is taken from `page.on('request')` rather than from the route
 * handler, because what a row about a second press has to count is every
 * request the screen *made* — including one a handler registered later lets
 * through. The refusal is registered before `gate`, so `gate`'s `fallback()`
 * reaches it: the first request is the held one and every other is answered
 * 409 without touching the server.
 */
async function countAndRefuse(page, pathname) {
  const sent = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === pathname && request.method() !== 'GET')
      sent.push(request);
  });
  await page.route(
    url => url.pathname === pathname,
    route =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: REFUSED }),
      }),
  );
  return sent;
}

test('a change-password save that is out closes the dialog that sent it, and ยกเลิก is not closed', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherTwo);
  await openChangePassword(page);

  const fields = passwordFields(page);
  await expect(fields).toHaveCount(3);
  await fields.nth(0).fill(TYPED.current);
  await fields.nth(1).fill(TYPED.next);
  await fields.nth(2).fill(TYPED.next);

  // The precondition, asserted where it is used (#51): all three fields and
  // the button are live before the save leaves, or every read below would be
  // true for a reason that has nothing to do with this fix.
  for (const index of [0, 1, 2]) await expect(fields.nth(index)).toBeEnabled();
  await expect(saveButton(page)).toBeEnabled();

  await countAndRefuse(page, PASSWORD_PATH);
  const write = await gate(page, /^\/api\/me\/password$/, isWrite, { refusal: REFUSED });
  await saveButton(page).click();
  await write.sent;

  // The claim, read in the order a mutant has to be able to tell apart (#88) —
  // and by the strings `docs/acceptance/10-application-shell.md` cites them by, because a
  // citation by line number ages the day anything above it grows (#173).
  await expect(fields.nth(0), 'the current-password field of the dialog that sent the save').toBeDisabled();
  await expect(fields.nth(1), 'the new-password field of the dialog that sent the save').toBeDisabled();
  await expect(fields.nth(2), 'the confirmation field of the dialog that sent the save').toBeDisabled();
  await expect(saveButton(page), 'บันทึกรหัสใหม่ while the change it sent is out').toBeDisabled();

  // And what it still lets the person do — the half the owner's answer of
  // 26 ตุลาคม 2569 kept, and the half 19 rows of two closed tickets rest on.
  const cancel = cancelButton(page);
  await expect(cancel, 'ยกเลิก while the change is out').toBeEnabled();
  await cancel.click();
  await expect(page.getByRole('heading', { name: 'เปลี่ยนรหัสผ่าน' })).toBeHidden();

  write.open();
  await write.answered;
});

test('a second press of บันทึกรหัสใหม่ while the first change is out sends nothing', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherTwo);
  await openChangePassword(page);

  const fields = passwordFields(page);
  await expect(fields).toHaveCount(3);
  await fields.nth(0).fill(TYPED.current);
  await fields.nth(1).fill(TYPED.next);
  await fields.nth(2).fill(TYPED.next);

  const sent = await countAndRefuse(page, PASSWORD_PATH);
  const write = await gate(page, /^\/api\/me\/password$/, isWrite, { refusal: REFUSED });
  await saveButton(page).click();
  await write.sent;
  expect(sent.length, 'requests after the first press').toBe(1);

  // `force` because the press is the act being measured and a disabled button
  // is what is meant to refuse it: without it this line would wait for the
  // button to become enabled and die at the timeout, which is a report about
  // the waiting and not about the second request (#139).
  await saveButton(page).click({ force: true });

  // Read at a settle point and not as a retrying negative (#50): the answer
  // this row is about is *nothing left the browser*, and the thing that would
  // have left is a request the first press's own answer has not come back for
  // yet. The dialog still being there is what says the screen has not moved on.
  await expect(page.getByRole('heading', { name: 'เปลี่ยนรหัสผ่าน' })).toBeVisible();
  expect(sent.length, 'requests after a second press while the first is out').toBe(1);

  write.open();
  await write.answered;
  // The refusal is said, and the dialog stays open holding what was typed —
  // the window #228 named, now closed to everything but reading it.
  await expect(page.getByText(REFUSED)).toBeVisible();
  expect(sent.length, 'requests once the first answer has landed').toBe(1);

  // And the flag comes down, which is what makes a refusal a correction to make
  // rather than a dialog to abandon (`10a` row 7). A flag raised at the press
  // and let go nowhere would leave all four assertions above true and this one
  // false, so it is read here and not inferred from them (#227).
  await expect(fields.nth(0), 'the current-password field once the refusal has landed').toBeEnabled();
  await expect(saveButton(page), 'บันทึกรหัสใหม่ once the refusal has landed').toBeEnabled();
});

test('the sign-in form is not on the screen while the sign-in is out', async ({ page }) => {
  await page.goto('/');

  const email = page.getByLabel('Email');
  const password = page.getByLabel('Password');
  const submit = page.getByRole('button', { name: 'Login to your account' });

  await email.fill(ACCOUNTS.teacherTwo);
  await password.fill(PASSWORD);
  // The precondition: there is a form here to take away.
  await expect(submit).toBeEnabled();

  const sent = await countAndRefuse(page, LOGIN_PATH);
  const write = await gate(page, /^\/api\/auth\/login$/, isWrite, { refusal: REFUSED });
  await submit.click();
  await write.sent;

  // The reason written beside `components/LoginForm.js`, read rather than
  // argued: neither field nor button is on the screen while the sign-in is
  // out, so the flag that file does not carry has nothing to close.
  await expect(password, 'the password field while the sign-in is out').toHaveCount(0);
  await expect(submit, 'the sign-in button while the sign-in is out').toHaveCount(0);
  expect(sent.length, 'sign-in requests while the first is out').toBe(1);

  write.open();
  await write.answered;

  // And it comes back, with the refusal said: the window this file reports as
  // closed is the round trip, not the screen for ever.
  await expect(page.getByText(REFUSED)).toBeVisible();
  await expect(submit).toBeEnabled();
  expect(new URL(page.url()).pathname).toBe('/');
});

'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { openChangePassword, passwordFields } = require('../support/shell');

/**
 * #258 — the flag says which opening's change is out, not that one is.
 *
 * #249 gave the change-password dialog's three fields and its own button
 * `disabled={sending}` on the owner's answer of 26 ตุลาคม 2569, and left
 * *ยกเลิก* and the backdrop holding nothing by that same answer, because a
 * person who has given up on a save must be able to leave. Those two sentences
 * together are the way in this file is about: the person presses *บันทึก­รหัสใหม่*,
 * presses *ยกเลิก* while the change is still out and opens the box again —
 * and on `HEAD` of 31 ตุลาคม 2569 they got a box they could not type in, closed
 * by the **earlier** opening's flag, with nothing on the screen saying why.
 * Measured before the fix with `e2e/probes/258-the-second-opening`:
 * `fields disabled [true, true, true] | save disabled true`, and a press there
 * sending nothing. It is #185's and #249's species — a flag that says *the save
 * is still out* has to say *whose* — met where **one form is opened twice**.
 *
 * The owner answered on 1 พฤศจิกายน 2569, with the question and all four prices
 * written on the ticket (#141, #228): **ข้อ ก, the flag holds the opening that
 * sent**, so a second change may be sent while the first is out; and the later
 * box is **closed as today** when an earlier change succeeds, because what it
 * holds is the current password that very change has just replaced.
 *
 * ## The two rows
 *
 * 1. the box opened inside the round trip is live and can send — which is the
 *    owner's answer read off the screen, and the row the page-wide flag of
 *    option ง kills;
 * 2. and with two changes out at once, the first answer does not free the box
 *    whose own change is still out — the half that makes the fix a *key* and
 *    not a clearing, and the row option ข kills. It is `243a`'s second row met
 *    one opening along: a flag let go at the wrong answer lets a third request
 *    leave, which the probe read as `requests 3`.
 *
 * Row 1 counts the three fields before reading them, and row 2 counts them
 * again at its own settle point: a reader that only reads what a control holds
 * cannot tell an absent control from a closed one, so a box that never opened
 * would read as a box with nothing closed in it — which is the answer a fix
 * wants to see (#164).
 *
 * `docs/acceptance/10-application-shell.md` carries both rows, where `243a`'s
 * first two rows are.
 *
 * ## Why this file holds its own way of holding a request
 *
 * `gate` holds the **first** request on a path and lets every other one fall
 * through, which is the right instrument for *one change out*. Row 2's subject
 * is two changes out at once — the state a boolean cannot describe — so it
 * needs a hold that keeps a list and says which to answer, and `holdEveryOne`
 * below is that. It is not shared: nothing else in `e2e/` has asked for two
 * writes of one path out at once, and a helper moved to `support/` before a
 * second caller exists is a fixture written for one row (#171, #87).
 *
 * Nothing here writes. Every request on `/api/me/password` is stopped at the
 * route — in row 1 the first by `gate` and any further one by this file's own
 * refusal, in row 2 all of them by `holdEveryOne` — so no press, and no mutant
 * that lets one through, can reach the database. That matters more here than it
 * usually does: the seeded password of `teacher.two@` is what `10a` row 7 and
 * `13a` sign in with, and a change that landed would take them with it
 * (`243a` says the same of its own rows).
 */

/** This file's own refusal, so no row reads a real sentence loosely (#93). */
const REFUSED = 'คำปฏิเสธของแถวนี้เอง ไม่ได้มาจากเซิร์ฟเวอร์ (#258)';

/** What the dialog's three fields are filled with; never saved. */
const TYPED = { current: PASSWORD, next: 'deep-core-258' };

const PASSWORD_PATH = '/api/me/password';

const heading = page => page.getByRole('heading', { name: 'เปลี่ยนรหัสผ่าน' });

const saveButton = page => page.getByRole('button', { name: 'บันทึกรหัสใหม่' });

/** The dialog's own ยกเลิก, scoped to the form — `167a`'s reason. */
const cancelButton = page =>
  page.locator('form').getByRole('button', { name: 'ยกเลิก' });

/**
 * Counts what left the browser on the path, handing back the list it fills.
 *
 * Both rows count, and only one of them refuses, so the counting is its own
 * helper: an instrument, with no row's claim living in it (#171).
 */
function countSent(page) {
  const sent = [];
  page.on('request', request => {
    if (
      new URL(request.url()).pathname === PASSWORD_PATH &&
      request.method() !== 'GET'
    )
      sent.push(request);
  });
  return sent;
}

/**
 * Counts what left the browser on the path, and refuses whatever reaches here.
 *
 * The count is taken from `page.on('request')` and not from the route handler,
 * because what these rows have to count is every request the screen *made*,
 * including one a handler registered later lets through. Registered before
 * `gate`, so `gate`'s `fallback()` reaches it (`243a`).
 */
async function countAndRefuse(page) {
  const sent = countSent(page);
  await page.route(
    url => url.pathname === PASSWORD_PATH,
    route =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: REFUSED }),
      }),
  );
  return sent;
}

/**
 * Holds **every** request on the path, answered one at a time by index.
 *
 * Each is answered 409 with this file's own sentence, so nothing reaches the
 * database here either. `answer(index)` hands the one that arrived at that
 * position its refusal; a row that holds a request answers it before it ends,
 * or the page is closed with the route still waiting.
 */
async function holdEveryOne(page) {
  const waiting = [];
  await page.route(
    url => url.pathname === PASSWORD_PATH,
    async route => {
      let release;
      const held = new Promise(resolve => {
        release = resolve;
      });
      waiting.push(release);
      await held;
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: REFUSED }),
      });
    },
  );
  return {
    answer: index => waiting[index](),
    answerTheRest: from => waiting.slice(from).forEach(release => release()),
  };
}

/**
 * A settle point for *an answer landed and the screen did nothing about it*.
 *
 * Row 2's claim is that an answer leaves the box on the screen exactly as it
 * was, which is the one claim a retrying read cannot hold: `toBeDisabled`
 * passes on its first poll whether or not the answer has been dealt with yet,
 * so under a mutant that frees the box the row would be green for the length of
 * one round trip and nothing would say so (#50, #214). So the row waits for the
 * answer to reach the page — the `response` event, which is the protocol
 * itself and not a clock (#52) — and then for two frames, by which time
 * anything that answer caused has been committed and drawn (#164, #188).
 */
async function answerAndSettle(page, held, index, request) {
  const landed = page.waitForResponse(response => response.request() === request);
  held.answer(index);
  await landed;
  await page.evaluate(
    () =>
      new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

/** Fills the three fields of whichever opening is on the screen. */
async function fillTheBox(page) {
  const fields = passwordFields(page);
  await fields.nth(0).fill(TYPED.current);
  await fields.nth(1).fill(TYPED.next);
  await fields.nth(2).fill(TYPED.next);
}

test('the change-password box opened while an earlier change is out is live, and can send', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherTwo);
  await openChangePassword(page);

  const fields = passwordFields(page);
  await expect(fields).toHaveCount(3);
  await fillTheBox(page);

  const sent = await countAndRefuse(page);
  const write = await gate(page, /^\/api\/me\/password$/, isWrite, {
    refusal: REFUSED,
  });
  await saveButton(page).click();
  await write.sent;

  // The preconditions, asserted where they are used (#51): the change is out,
  // and the box that sent it is closed — which is `243a`'s first row, read here
  // because without it every reading below is true for a reason that has
  // nothing to do with a second opening.
  expect(sent.length, 'requests after the first press').toBe(1);
  await expect(
    saveButton(page),
    'บันทึกรหัสใหม่ of the box that sent the change',
  ).toBeDisabled();

  // Out through the way the owner's answer of 26 ตุลาคม 2569 left open, and
  // back in — which is the sequence this file is about.
  await cancelButton(page).click();
  await expect(heading(page), 'the box after ยกเลิก').toBeHidden();
  await openChangePassword(page);

  // The claim. The count comes first: every `toBeEnabled` below is read off a
  // located element, so a box that is not on the screen would answer *nothing
  // is closed* here, which is the answer a fix wants to see (#164). Then the
  // three fields and the button, in the order a mutant has to be able to tell
  // apart (#88) and by the strings `docs/acceptance/10-application-shell.md`
  // cites them by, because a citation by line number ages the day anything
  // above it grows (#173).
  await expect(fields, 'the fields of the box opened inside the round trip').toHaveCount(3);
  await expect(fields.nth(0), 'the current-password field of the second opening').toBeEnabled();
  await expect(fields.nth(1), 'the new-password field of the second opening').toBeEnabled();
  await expect(fields.nth(2), 'the confirmation field of the second opening').toBeEnabled();
  await expect(saveButton(page), 'บันทึกรหัสใหม่ of the second opening').toBeEnabled();
  await expect(cancelButton(page), 'ยกเลิก of the second opening').toBeEnabled();

  // And the other half of the owner's answer: the person may **send** from it.
  // A box that is live and whose press does nothing would leave all five
  // readings above true and this one false, so it is read and not inferred.
  await fillTheBox(page);
  await saveButton(page).click();
  await expect(() => expect(sent.length, 'requests after the second opening pressed save').toBe(2)).toPass();

  write.open();
  await write.answered;
});

test('with two changes out, the first answer does not free the box whose own change is still out', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherTwo);
  const sent = countSent(page);
  const held = await holdEveryOne(page);

  // The situation this row is about, built by the row itself and not waited for
  // (#129): one change out, left behind through *ยกเลิก*, and a second change
  // sent from the box opened after it.
  await openChangePassword(page);
  await expect(passwordFields(page)).toHaveCount(3);
  await fillTheBox(page);
  await saveButton(page).click();
  await expect(() => expect(sent.length, 'requests after the first press').toBe(1)).toPass();

  await cancelButton(page).click();
  await expect(heading(page), 'the box after ยกเลิก').toBeHidden();
  await openChangePassword(page);
  await fillTheBox(page);
  await saveButton(page).click();
  await expect(() => expect(sent.length, 'requests after the second opening pressed save').toBe(2)).toPass();

  // The first change's answer, while the second is still at the route, and a
  // settle point that says the screen has had it (see `answerAndSettle`).
  await answerAndSettle(page, held, 0, sent[0]);

  // The claim: the box on the screen has a change of its own still out, so the
  // earlier answer leaves it closed. The count first, for the same reason as
  // row 1 (#164) — and the fields before the button, because an answer that
  // freed the box would free all four and a mutant must be able to say which
  // reading it broke (#88).
  const fields = passwordFields(page);
  await expect(fields, 'the fields of the second opening when the first answer lands').toHaveCount(3);
  await expect(fields.nth(0), 'the current-password field while its own change is out').toBeDisabled();
  await expect(fields.nth(1), 'the new-password field while its own change is out').toBeDisabled();
  await expect(fields.nth(2), 'the confirmation field while its own change is out').toBeDisabled();
  await expect(saveButton(page), 'บันทึกรหัสใหม่ while its own change is out').toBeDisabled();

  // And what that buys, which is the whole reason the half is there: a press
  // inside that window sends nothing. `force`, because the press is the act
  // being measured and a disabled button is what is meant to refuse it —
  // without it this line would wait for the button and die at the timeout,
  // which is a report about the waiting (#139, `243a`'s second row).
  await saveButton(page).click({ force: true });
  await expect(heading(page), 'the second box after its own press').toBeVisible();
  // A net, not a proof: any mutant that would let this press send has to free
  // the button, and the read four lines above dies first, so this claim cannot
  // be put at risk at this seam (#47's sixth reading, #88). It would become
  // readable the day the press is refused somewhere other than the attribute -
  // which is what `258:secondsendrefused` does, and that mutant kills the row
  // above this line, at the arrangement.
  expect(sent.length, 'requests after a press while its own change is out').toBe(2);

  // Then its own answer lands and the flag comes down, which is what makes a
  // refusal a correction to make rather than a box to abandon (`10a` row 7,
  // #227). A key that let nothing go would leave every reading above true and
  // this one false.
  held.answerTheRest(1);
  await expect(page.getByText(REFUSED), 'the refusal of its own change').toBeVisible();
  await expect(fields.nth(0), 'the current-password field once its own answer has landed').toBeEnabled();
  await expect(saveButton(page), 'บันทึกรหัสใหม่ once its own answer has landed').toBeEnabled();
  expect(sent.length, 'requests once both answers have landed').toBe(2);
});

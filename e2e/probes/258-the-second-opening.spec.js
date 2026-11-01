'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { openChangePassword, passwordFields } = require('../support/shell');

/**
 * #258 — what the second opening of the change-password box can do, measured
 * rather than reasoned about, so the owner's question is written down with
 * prices that were read off a screen (#77, #141).
 *
 * This is an instrument, not a row: it is run on `HEAD` and on each candidate
 * fix, and it is deleted once the fix it priced has been measured (#207). It
 * prints; it asserts only the preconditions that would make a printed number a
 * lie. Nothing in the repository runs it — copy it into `e2e/tests/` to run it:
 *
 * ```
 * cp e2e/probes/258-the-second-opening.spec.js e2e/tests/258probe.spec.js
 * npx playwright test tests/258probe --reporter=line
 * rm e2e/tests/258probe.spec.js
 * ```
 *
 * ## What it reads, and why each reading is there
 *
 * Both arms get as far as *a box opened while an earlier opening's change is
 * still out*, which is the window the ticket is about, and then differ in what
 * the held answer carries — a refusal in the first, a success in the second,
 * because `handlePasswordSubmit`'s success path calls `closeChangePassword()`
 * with no guard on it and that is a different thing happening to the second box.
 *
 * Inside the window it **counts** the three fields as well as reading whether
 * they are disabled: a reader that only reads what a control holds cannot tell
 * an absent control from a closed one, and a box that never opened would read
 * as a box with nothing live in it (#164).
 *
 * It also presses *บันทึกรหัสใหม่* in the second box with `force`, because the
 * press is the act being measured and a disabled button is what is meant to
 * refuse it — without `force` the line would wait for the button and die at the
 * timeout, which is a report about the waiting (#139, `243a`'s second row).
 *
 * Nothing it does writes. Every request on `/api/me/password` is stopped at the
 * route, the held one by `gate` and any other by this file's own 409, so the
 * seeded password of `teacher.two@` — which `10a` row 7 and `13a` sign in with —
 * is never changed (`243a` says the same of its own rows).
 */

const REFUSED = 'คำปฏิเสธของตัววัดนี้เอง ไม่ได้มาจากเซิร์ฟเวอร์ (#258)';

const TYPED = { current: PASSWORD, next: 'deep-core-258' };

const PASSWORD_PATH = '/api/me/password';

const heading = page => page.getByRole('heading', { name: 'เปลี่ยนรหัสผ่าน' });

const saveButton = page => page.getByRole('button', { name: 'บันทึกรหัสใหม่' });

const cancelButton = page =>
  page.locator('form').getByRole('button', { name: 'ยกเลิก' });

/** Counts everything that leaves on the path, and refuses whatever `gate` lets by. */
async function countAndRefuse(page) {
  const sent = [];
  page.on('request', request => {
    if (
      new URL(request.url()).pathname === PASSWORD_PATH &&
      request.method() !== 'GET'
    )
      sent.push(request);
  });
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
 * Reads the second box's controls: how many there are, and what each one holds.
 *
 * The count comes first on purpose. Every `disabled` below is read off a
 * located element, so a box that is not on the screen makes all four readings
 * answer *nothing is closed* — which is the answer a fix wants to see.
 */
async function readTheBox(page, label) {
  const fields = passwordFields(page);
  const count = await fields.count();
  const shown = await heading(page).isVisible();
  const closed = [];
  for (let index = 0; index < count; index += 1)
    closed.push(await fields.nth(index).isDisabled());
  const save = (await saveButton(page).count())
    ? await saveButton(page).isDisabled()
    : '(no button)';
  const cancel = (await cancelButton(page).count())
    ? await cancelButton(page).isDisabled()
    : '(no button)';
  console.log(
    `PROBE258 ${label}: box shown ${shown} | fields ${count} | ` +
      `fields disabled [${closed.join(', ')}] | save disabled ${save} | ` +
      `cancel disabled ${cancel}`,
  );
  return { count, shown, closed, save, cancel };
}

/** Opens the box, fills it and sends, holding the change at the route. */
async function sendAndHold(page, answer) {
  const write = await gate(page, /^\/api\/me\/password$/, isWrite, answer);
  const fields = passwordFields(page);
  await fields.nth(0).fill(TYPED.current);
  await fields.nth(1).fill(TYPED.next);
  await fields.nth(2).fill(TYPED.next);
  await saveButton(page).click();
  await write.sent;
  return write;
}

/**
 * Holds **every** request on the path, released one at a time by index.
 *
 * `gate` holds the first and lets the rest fall through, which is the right
 * instrument for one request out. The third arm needs two out at once — the
 * state a boolean cannot describe — so this one keeps a list and the arm says
 * which to answer. Each is answered 409 with this file's own sentence, so
 * nothing reaches the database here either.
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
  return waiting;
}

/**
 * Two changes out at once, which is the reading the ticket's own cost line for
 * option ข is a claim about — *one line cheaper than ก and the same behaviour*.
 * A flag that is a boolean comes down at whichever answer lands first, so this
 * arm releases the **first** request while the second is still out and reads
 * what the second box holds then. On `HEAD` the second box cannot send at all,
 * which it prints rather than skipping.
 */
test('#258 two changes out at once', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherTwo);
  const sent = [];
  page.on('request', request => {
    if (
      new URL(request.url()).pathname === PASSWORD_PATH &&
      request.method() !== 'GET'
    )
      sent.push(request);
  });
  const waiting = await holdEveryOne(page);

  await openChangePassword(page);
  const fields = passwordFields(page);
  await fields.nth(0).fill(TYPED.current);
  await fields.nth(1).fill(TYPED.next);
  await fields.nth(2).fill(TYPED.next);
  await saveButton(page).click();
  await expect(() => expect(sent.length).toBe(1)).toPass({ timeout: 5000 });

  await cancelButton(page).click();
  await expect(heading(page), 'the box after ยกเลิก').toBeHidden();
  await openChangePassword(page);
  const second = await readTheBox(page, 'ซ้อน · the second opening');
  expect(second.count, 'fields of the second opening').toBe(3);

  if (second.closed.every(closed => !closed)) {
    await fields.nth(0).fill(TYPED.current);
    await fields.nth(1).fill(TYPED.next);
    await fields.nth(2).fill(TYPED.next);
  }
  await saveButton(page).click({ force: true });
  await page.waitForTimeout(400);
  console.log(`PROBE258 ซ้อน · after a press in the second opening: requests ${sent.length}`);

  if (sent.length < 2) {
    console.log('PROBE258 ซ้อน · no second request left, so there is no overlap to read');
    waiting.forEach(release => release());
    return;
  }

  // The first answer, while the second change is still at the route.
  waiting[0]();
  await page.waitForTimeout(400);
  const between = await readTheBox(page, 'ซ้อน · first answer landed, second change still out');
  await saveButton(page).click({ force: true });
  await page.waitForTimeout(400);
  console.log(
    `PROBE258 ซ้อน · a press after the first answer: requests ${sent.length}` +
      ` | second box's save disabled ${between.save}`,
  );
  waiting.slice(1).forEach(release => release());
  await page.waitForTimeout(400);
});

for (const arm of [
  { name: 'ปฏิเสธ', answer: { refusal: REFUSED } },
  { name: 'สำเร็จ', answer: { success: { message: 'ok' } } },
]) {
  test(`#258 the second opening, first answer ${arm.name}`, async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherTwo);
    const sent = await countAndRefuse(page);

    await openChangePassword(page);
    // The precondition, read where it is used (#51): three live fields and a
    // live button, or every reading below is true for a reason that has nothing
    // to do with the window.
    const before = await readTheBox(page, `${arm.name} · the first opening`);
    expect(before.count, 'fields of the first opening').toBe(3);
    expect(before.closed, 'the first opening before the send').toEqual([
      false,
      false,
      false,
    ]);

    const write = await sendAndHold(page, arm.answer);
    expect(sent.length, 'requests after the first press').toBe(1);
    await readTheBox(page, `${arm.name} · inside the round trip, box that sent`);

    // Out through the way the owner's answer of 26 ตุลาคม 2569 left open, and
    // back in — which is the sequence the ticket is about.
    await cancelButton(page).click();
    await expect(heading(page), 'the box after ยกเลิก').toBeHidden();
    await openChangePassword(page);
    const second = await readTheBox(page, `${arm.name} · the second opening`);
    expect(second.count, 'fields of the second opening').toBe(3);

    // And what the person can do with it: a press that is refused by a disabled
    // button sends nothing, a press on a live one sends.
    await saveButton(page).click({ force: true });
    await expect(heading(page), 'the second box after its own press').toBeVisible();
    console.log(
      `PROBE258 ${arm.name} · a press in the second opening: requests now ${sent.length}`,
    );

    write.open();
    await write.answered;
    // A turn for the renderer, behind the reading rather than in front of it
    // (#170), so what is printed is what the answer did.
    await page.waitForTimeout(400);
    const after = await readTheBox(page, `${arm.name} · once the first answer has landed`);
    console.log(
      `PROBE258 ${arm.name} · after the answer: requests ${sent.length} | ` +
        `box shown ${after.shown} | ` +
        `success alert ${await page.getByText('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว').count()} | ` +
        `this probe's refusal ${await page.getByText(REFUSED).count()}`,
    );
  });
}

'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { DEPARTMENTS } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { gate, isGet, isWrite } = require('../support/gate');
const { keysOn, next, reading, untilDrawn } = require('../support/pager');
const enrolment = require('../support/enrolment-screen');
const {
  openDepartments,
  departmentRow,
  API: DEPARTMENTS_API,
} = require('../support/departments-screen');
const { openUsers, userRow, search, API: USERS_API } = require('../support/users-screen');
const plos = require('../support/plos-screen');

/**
 * #202 — the sentence belongs to the screen that was asked, at the handlers
 * that are not `save`.
 *
 * #146 asked *is the screen still where it was when I was sent* of the write
 * that closes a form, and thirteen screens ask it in `save`. Nothing asked it
 * anywhere else: a removal, a status switch and a term copy each ended with a
 * success sentence set unconditionally, so an answer arriving on a screen the
 * person had moved on from put *ลบ…เรียบร้อยแล้ว* over a form about something
 * else — in the one place on the screen where a sentence reads as being about
 * what is in front of it.
 *
 * Measured on 11 October 2569 with a throwaway counter — every `error: false`
 * with an `await` above it in the same crudely cut function, called guarded if a
 * ref comparison or #152's flag opens a block around it: **41 sentences, 23
 * asking and 18 bare in 10 files** before the fix. After it the same counter
 * prints **33 asking, 2 on #152's flag and 6 bare** — which is not the state of
 * the code, because it reads the eight lines *above* a sentence and the guard
 * this ticket adds sits below the sentence at two of the four sites and on the
 * sentence's own line at a third. Read against the code, **36 of the 41 are
 * decided by a ref comparison and 5 are not**. #202's own table said 22 and 20
 * in 13 files, counted the same crude way; what is reported here is what could
 * be measured, and what the instrument cannot see is reported beside it (#102,
 * #123).
 *
 * The five that are left are where the instrument has to be read rather than
 * believed: four are a `save` whose form's ยกเลิก is `disabled={busy}`, so
 * nothing can take the screen while the write is out — structurally unreachable
 * today, and they carry a dated reason rather than a guard no row could reach
 * (#97) — and one is `Offerings.onSection`, decided on 1 October 2569 and
 * documented on itself.
 *
 * **Fifteen sentences moved, not eleven**, and the extra four are what the
 * instrument sorted wrongly: it reads the eight lines above a sentence, so
 * `if (await reload(said))`, which sits *below* it, read as bare, and
 * `const reloaded = await load(() => onScreen.current === load)` on the line
 * above read as a ref comparison when it is #152's flag. Asked of the code
 * instead — every consumer of that flag, and whether it also asks the ref — the
 * answer is four sites: `SubjectStudents.add`, `SubjectStudents.remove`,
 * `GradingWeights.save` and `StudentGroups.after`. A census is evidence about
 * the property it counted (#174), including one written to replace somebody
 * else's census.
 *
 * ## The two ways in, and why one of them has a ticket
 *
 * **Behind the question.** Nine of the eleven are a `confirmRemoval`, and while
 * `ConfirmDialog` is open there is no form to press anything from — the table
 * is still there underneath it. The overlay is `fixed inset-0` and traps
 * nothing: no focus trap, no `inert`, no `aria-hidden`, and the dialog does not
 * even take focus when it opens, so focus is still on the `ลบ` that opened it
 * and every control of the table is still in the tab order. A mouse click is
 * eaten by the overlay; Enter is not. That is #204, and the day it closes these
 * two rows stop being reachable and must be re-aimed or left as nets.
 *
 * **Beside the list.** The other two are `Users.toggle` and
 * `Offerings.runCopy`, which ask no question at all: the list stays live, so
 * แก้ไข on another row is an ordinary click. `Users.toggle` is the row;
 * `Offerings.runCopy` shares its shape and its code is its own, so it is
 * guarded and said on the sheet to be unproved.
 *
 * **Through the pager.** The four sites that rode on #152's flag are superseded
 * by a control that takes nothing away and opens nothing: ถัดไป, which changes
 * what the read is *of*. `Pager` carries no `busy` — #199 measured that in the
 * code — so it is pressable for as long as a write is out, and on the enrolment
 * screen that is a way in needing no second defect and no keyboard. Of the four,
 * that screen's two are the rows below; the other two are superseded by the
 * section jump instead, which no row walks yet and which their sheets say is
 * unproved (#68).
 *
 * ## What each row builds
 *
 * The write — a `DELETE`, or the status `PUT` — held at the route by `gate`;
 * then the screen is moved on, the answer is let go, and the screen is read
 * **once** at the list request every one of these handlers ends with.
 *
 * Each negative has a positive beside it: a red is not a measurement until the
 * same read has been seen green (#171), and the whole claim is that the
 * sentence is *kept* for the person who is still there.
 *
 * ## What this file writes
 *
 * Nothing. Every held write is answered by `gate` with a crafted 200, so no
 * department, outcome or account is touched and there is nothing to put back.
 * What the write would have written is not the subject; what the screen says
 * when it answers is.
 */

/** The answer a held write is given: a body every one of these routes could send. */
const DONE = {};

/**
 * How long the commit of a sentence being drawn is given before the screen is
 * read — `146a`'s constant, and it can decide (#52). What stands behind it is
 * the mutant beside each row.
 */
const SETTLE_MS = 250;

const DEPARTMENT = DEPARTMENTS[0].id;
const OUTCOME = 'PLO-1';

const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const heading = (page, name) => page.getByRole('heading', { name, exact: true });

/** The list request each of these handlers ends with, and the row's settle point. */
function waitForReload(page, path) {
  return page.waitForResponse(
    (answer) =>
      new URL(answer.url()).pathname === path && answer.request().method() === 'GET',
  );
}

/**
 * Presses a control the open dialog is covering, the way a person can — #204.
 *
 * `focus()` rather than a click, and that is the faithful half: the dialog never
 * took focus, so the table's controls are where focus already is. A click would
 * be refused by the overlay, which is the whole reason this way in is the one
 * nobody noticed.
 */
async function pressBehindTheDialog(control) {
  await control.focus();
  await expect(control).toBeFocused();
  await control.page().keyboard.press('Enter');
}

test.describe('ข้อมูลภาควิชา — a removal answered after the screen moved on', () => {
  async function removalHeldAtTheRoute(page) {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openDepartments(page);

    const write = await gate(page, /^\/api\/departments\/\d+$/, isWrite, { success: DONE });
    await button(departmentRow(page, DEPARTMENT), 'ลบ').click();
    await button(page, 'ลบภาควิชา').click();
    await write.sent;
    return write;
  }

  test('says nothing over the form that was opened while it was out', async ({ page }) => {
    const write = await removalHeldAtTheRoute(page);

    // เพิ่มภาควิชา rather than another row's แก้ไข: it opens its form in the
    // same task, so the form is on the screen before the answer can land, and
    // it is the form a person has typed into.
    await pressBehindTheDialog(button(page, 'เพิ่มภาควิชา'));
    await expect(heading(page, 'เพิ่มภาควิชา')).toBeVisible();

    const reloaded = waitForReload(page, DEPARTMENTS_API);
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);

    expect(await page.getByText('ลบภาควิชาเรียบร้อยแล้ว').count(), "the removal's sentence").toBe(0);
    expect(await heading(page, 'เพิ่มภาควิชา').isVisible(), 'the form that took its place').toBe(
      true,
    );
  });

  test('says what it did when nothing took the screen', async ({ page }) => {
    const write = await removalHeldAtTheRoute(page);

    const reloaded = waitForReload(page, DEPARTMENTS_API);
    write.open();
    await write.answered;
    await reloaded;

    await expect(page.getByText('ลบภาควิชาเรียบร้อยแล้ว')).toBeVisible();
  });
});

test.describe('ผลการเรียนรู้ระดับหลักสูตร — the screen that had no ref at all', () => {
  async function removalHeldAtTheRoute(page) {
    await signIn(page, ACCOUNTS.committee0501);
    await plos.openPlos(page);

    const write = await gate(page, /^\/api\/plos\/\d+$/, isWrite, { success: DONE });
    await plos.startRemoval(page, OUTCOME);
    await plos.confirmRemoval(page);
    await write.sent;
    return write;
  }

  test('says nothing over the form that was opened while it was out', async ({ page }) => {
    const write = await removalHeldAtTheRoute(page);

    // This screen had no `showing` before #202, so the add button had nothing to
    // write: the ref and this way in arrive together, and the mutant that takes
    // the write out leaves the guard reading `null === null`.
    await pressBehindTheDialog(button(page, 'เพิ่มผลการเรียนรู้'));
    await expect(heading(page, 'เพิ่มผลการเรียนรู้ของหลักสูตร')).toBeVisible();

    const reloaded = waitForReload(page, plos.API);
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);

    expect(await page.getByText('ลบผลการเรียนรู้เรียบร้อยแล้ว').count(), "the removal's sentence").toBe(
      0,
    );
    expect(
      await heading(page, 'เพิ่มผลการเรียนรู้ของหลักสูตร').isVisible(),
      'the form that took its place',
    ).toBe(true);
  });

  test('says what it did when nothing took the screen', async ({ page }) => {
    const write = await removalHeldAtTheRoute(page);

    const reloaded = waitForReload(page, plos.API);
    write.open();
    await write.answered;
    await reloaded;

    await expect(page.getByText('ลบผลการเรียนรู้เรียบร้อยแล้ว')).toBeVisible();
  });
});

test.describe('ข้อมูลผู้ใช้งาน — the switch that asks nothing first', () => {
  /**
   * Two rows the faculty administrator reaches, found through the screen's own
   * search box: ten seeded accounts and a page of ten mean neither is certain to
   * be on page one, and the two teachers are the pair that is never the account
   * signed in (`ระงับ` is disabled on one's own row, and for good reason).
   */
  async function twoTeachers(page) {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openUsers(page);
    await search(page, 'teacher');
    await expect(userRow(page, ACCOUNTS.teacherTwo)).toHaveCount(1);
    await expect(userRow(page, ACCOUNTS.teacherOne)).toHaveCount(1);
  }

  async function suspensionHeldAtTheRoute(page) {
    const write = await gate(page, /^\/api\/users\/[^/]+\/status$/, isWrite, { success: DONE });
    await button(userRow(page, ACCOUNTS.teacherTwo), 'ระงับ').click();
    await write.sent;
    return write;
  }

  test('says nothing over the form that was opened while it was out', async ({ page }) => {
    await twoTeachers(page);
    const write = await suspensionHeldAtTheRoute(page);

    // No dialog here, so this is a click: the list stays live while the status
    // switch is out, and แก้ไข on another row opens its form in the same task.
    await button(userRow(page, ACCOUNTS.teacherOne), 'แก้ไข').click();
    await expect(heading(page, 'แก้ไขข้อมูลผู้ใช้งาน')).toBeVisible();

    const reloaded = waitForReload(page, USERS_API);
    write.open();
    await write.answered;
    await reloaded;
    await page.waitForTimeout(SETTLE_MS);

    expect(
      await page.getByText('ระงับการใช้งานบัญชีเรียบร้อยแล้ว').count(),
      "the suspension's sentence",
    ).toBe(0);
    expect(await heading(page, 'แก้ไขข้อมูลผู้ใช้งาน').isVisible(), 'the form that took its place').toBe(
      true,
    );
  });

  test('says what it did when nothing took the screen', async ({ page }) => {
    await twoTeachers(page);
    const write = await suspensionHeldAtTheRoute(page);

    const reloaded = waitForReload(page, USERS_API);
    write.open();
    await write.answered;
    await reloaded;

    await expect(page.getByText('ระงับการใช้งานบัญชีเรียบร้อยแล้ว')).toBeVisible();
  });
});

test.describe('รายชื่อนักศึกษาของรายวิชา — the sentence that rode on a flag about the read', () => {
  /**
   * Two sites, one screen, and a way in that is an ordinary click.
   *
   * `add` and `remove` say their sentence behind `load`'s answer, and that
   * answer is `true` from inside its `try` whatever `isCurrent()` says: it means
   * *the read was not refused* and never *it drew* (#152). So a person who
   * presses ถัดไป while the write is out is moved to page two and then told
   * that somebody was enrolled — the rows of page two under a sentence about
   * neither of them. #199 found it by reading the code; these rows are the
   * measurement, and the fix is the question #146 asks, with `onScreen`, the
   * ref this screen already keeps.
   *
   * The pager is the control because it is the one the screen leaves live, and
   * `toBeEnabled()` is asserted before it is pressed: that assertion is the
   * whole premise, and the day #199 closes by disabling it these two negatives
   * stop being reachable here and must be re-aimed at the section jump or left
   * as nets that say they are nets (#67).
   *
   * The write is answered by `gate` with a crafted 200, so no enrolment is made
   * and none is removed; the **reload** is what is held, which is the request
   * whose lateness the row is about.
   */
  const CODE = '65019902';
  const NAME = 'ทดสอบ แถวสองศูนย์สอง';
  const ENROLLED = { student: { student_id: CODE, full_name_th: NAME } };
  const SAID_ENROLLED = `เพิ่ม ${CODE} ${NAME} เข้าตอนเรียนแล้ว`;
  const REMOVAL = /^\/api\/teaching\/sections\/\d+\/students\/\d+$/;

  /** Opens the screen on page one, and says so — the premise of every row here. */
  async function openOnPageOne(page) {
    await signIn(page, ACCOUNTS.teacherOne);
    const [section] = await enrolment.mySectionIds(page);
    await enrolment.openEnrolment(page, section);
    const table = enrolment.listTable(page);
    const { shown, pages } = await reading(page, table);
    expect({ shown, enough: pages > 1 }, 'page one, with a page two to move to').toEqual({
      shown: 1,
      enough: true,
    });
    return table;
  }

  /**
   * Holds the reload the handler is about to send.
   *
   * Registered after the write's gate and matching the same path, which is how
   * `gate` is built to compose: `isGet` turns the write away to the gate
   * underneath it, and the move to page two finds this one already holding its
   * one request and is turned away too.
   */
  const heldReload = (page) => gate(page, enrolment.API, isGet);

  /** Presses ถัดไป while the held reload is out, and waits for page two to be drawn. */
  async function moveToPageTwo(page) {
    await expect(next(page), 'ถัดไป while a write is out — #199').toBeEnabled();
    const moved = page.waitForResponse(
      (answer) =>
        enrolment.API.test(new URL(answer.url()).pathname) &&
        answer.request().method() === 'GET' &&
        new URL(answer.url()).searchParams.get('page') === '2',
    );
    await next(page).click();
    await untilDrawn(page, await moved);
  }

  async function enrolmentHeldAtTheReload(page) {
    const write = await gate(page, enrolment.API, isWrite, { success: ENROLLED });
    const read = await heldReload(page);

    await page.getByLabel('รหัสนักศึกษา', { exact: true }).fill(CODE);
    await button(page, 'เพิ่มนักศึกษา').click();
    await write.sent;
    write.open();
    await write.answered;
    await read.sent;
    return read;
  }

  async function removalHeldAtTheReload(page, table) {
    const code = (await keysOn(table))[0].trim();
    const write = await gate(page, REMOVAL, isWrite, { success: DONE });
    const read = await heldReload(page);

    await button(page, `นำ ${code} ออกจากตอนเรียน`).click();
    await button(page, 'นำออก').click();
    await write.sent;
    write.open();
    await write.answered;
    await read.sent;
    return { code, read };
  }

  test('says nothing over the page the pager moved to while the enrolment was out', async ({
    page,
  }) => {
    const table = await openOnPageOne(page);
    const read = await enrolmentHeldAtTheReload(page);

    await moveToPageTwo(page);
    read.open();
    await read.answered;
    await page.waitForTimeout(SETTLE_MS);

    expect(await page.getByText(SAID_ENROLLED).count(), "the enrolment's sentence").toBe(0);
    expect((await reading(page, table)).shown, 'the page the person moved to').toBe(2);
  });

  test('says what it enrolled when the pager stayed where it was', async ({ page }) => {
    await openOnPageOne(page);
    const read = await enrolmentHeldAtTheReload(page);

    read.open();
    await read.answered;

    await expect(page.getByText(SAID_ENROLLED)).toBeVisible();
  });

  test('says nothing over the page the pager moved to while the removal was out', async ({
    page,
  }) => {
    const table = await openOnPageOne(page);
    const { code, read } = await removalHeldAtTheReload(page, table);

    await moveToPageTwo(page);
    read.open();
    await read.answered;
    await page.waitForTimeout(SETTLE_MS);

    const said = new RegExp(`นำ ${code} .+ ออกจากตอนเรียนแล้ว`);
    expect(await page.getByText(said).count(), "the removal's sentence").toBe(0);
    expect((await reading(page, table)).shown, 'the page the person moved to').toBe(2);
  });

  test('says what it removed when the pager stayed where it was', async ({ page }) => {
    const table = await openOnPageOne(page);
    const { code, read } = await removalHeldAtTheReload(page, table);

    read.open();
    await read.answered;

    await expect(page.getByText(new RegExp(`นำ ${code} .+ ออกจากตอนเรียนแล้ว`))).toBeVisible();
  });
});

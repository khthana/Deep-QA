'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { DEPARTMENTS } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { dismiss } = require('../support/confirm-dialog');
const { gate, isGet, isWrite } = require('../support/gate');
const { keysOn, reading, untilDrawn } = require('../support/pager');
const enrolment = require('../support/enrolment-screen');
const {
  DOCUMENT,
  LAST_YEAR,
  intoTheListedSectionScreen,
  markDocument,
} = require('../support/section-jump');
const { DASHBOARD } = require('../support/teaching-screen');
const {
  openDepartments,
  departmentRow,
  API: DEPARTMENTS_API,
} = require('../support/departments-screen');
const {
  openUsers,
  userRow,
  search,
  startStatusChange,
  confirmStatusChange,
  API: USERS_API,
} = require('../support/users-screen');
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
 * **Behind the question.** Nine of the eleven are a `confirmRemoval`, and since
 * 16 ตุลาคม 2569 a tenth asks the same question before a status change: #86
 * restored the box the accounts screen had dropped, so the paragraph below
 * about that screen's ordinary click is a record of what was true until then,
 * and its two rows are here as well. While a `ConfirmDialog` is open there is no form to
 * press anything from — the table is still there underneath it, and the
 * overlay is `fixed inset-0` and traps nothing: no focus trap, no `inert` and
 * no `aria-hidden`, so every control of the table is still in the tab order. A
 * mouse click is eaten by the overlay; Enter is not. That is #204.
 *
 * #204 closed on 18 ตุลาคม 2569 with the **announcing** half only - the box now
 * takes focus when it opens, says `role="dialog"`, `aria-modal="true"`, and has
 * a name and a description - and the **containment** half, a trap or `inert`,
 * was deferred to a ticket of its own (#217). So the sentence above about focus being
 * left on the ลบ is a record of what was true until that date.
 *
 * **#217 landed the same day and closed that way in.** The box takes the focus
 * back whenever it leaves, so nothing under the cover answers a key any more.
 * The three rows that reached through it - one of the removals and the two
 * accounts rows below - were **re-aimed, not left as nets**:
 * `moveOnWhileTheWriteIsOut` puts the question away with ยกเลิก and then clicks
 * the control, which is the way a person has to the same situation (#203; the
 * price of closing a way in is on `14-departments.md` §#217). The other three
 * of the six were counted by the ticket and are the paired positives of #171,
 * which press nothing under the cover.
 *
 * **Beside the list.** The other two were `Users.toggle` and
 * `Offerings.runCopy`, which asked no question at all: the list stayed live, so
 * แก้ไข on another row was an ordinary click, and `Users.toggle` was the
 * row. Since #86 only `Offerings.runCopy` is this shape, and it has no row of
 * its own — it shares the shape and its code is its own, so it is guarded and
 * said on the sheet to be unproved. What that costs this file is written on the
 * accounts row below: the way in it was the only one here to have, a bare
 * mouse, is gone, and both of its rows now expire with the containment half of
 * #204 (16 ตุลาคม 2569, re-dated 18 ตุลาคม 2569).
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
 * Moves the screen on while the write is out, the way a person can — #217.
 *
 * Until 18 ตุลาคม 2569 this reached the control *through* the open question: the
 * overlay ate a mouse click, but Enter went to wherever the keyboard was,
 * because nothing contained it. That is what #204 described, and #217 contained
 * it on the same day, so the question is dismissed first and the control is then
 * pressed with an ordinary click.
 *
 * The mistake is preserved, which is what makes this a re-aim and not a
 * different row (#203): a write is out, the person moves the screen on, and the
 * sentence lands where they moved to. What changed is only how they got there -
 * and this way needs no second defect to be a way in, where the old one needed
 * the missing trap.
 */
async function moveOnWhileTheWriteIsOut(control) {
  const page = control.page();
  await dismiss(page);
  await control.click();
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
    await moveOnWhileTheWriteIsOut(button(page, 'เพิ่มภาควิชา'));
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
    await moveOnWhileTheWriteIsOut(button(page, 'เพิ่มผลการเรียนรู้'));
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

test.describe('ข้อมูลผู้ใช้งาน — the switch that asks first since #86', () => {
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
    await startStatusChange(page, ACCOUNTS.teacherTwo, 'ระงับ');
    await confirmStatusChange(page);
    await write.sent;
    return write;
  }

  test('says nothing over the form that was opened while it was out', async ({ page }) => {
    await twoTeachers(page);
    const write = await suspensionHeldAtTheRoute(page);

    // Behind the question since #86 (16 ตุลาคม 2569), where this was an
    // ordinary click: the switch asks first now, so this row's way in is the
    // keyboard one the nine removals have and it expires with them the day the
    // containment half of #204 lands as #217 (#204 itself closed on 18 ตุลาคม 2569 with
    // the announcing half, which left this way in standing). แก้ไข rather than เพิ่มผู้ใช้งาน all the same - on this
    // screen แก้ไข opens its form from the row already in hand, with no read of
    // its own, so the form is on the screen before the answer can land.
    await moveOnWhileTheWriteIsOut(button(userRow(page, ACCOUNTS.teacherOne), 'แก้ไข'));
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
   * leaves the list while the write is out is told, over whatever is in front of
   * them, that somebody was enrolled — a sentence about neither of the rows they
   * are looking at. #199 found it by reading the code; these rows are the
   * measurement, and the fix is the question #146 asks, with `onScreen`, the
   * ref this screen already keeps.
   *
   * ## The way in, and why it is no longer the pager
   *
   * It was ถัดไป until 15 October 2569, the pager being the one control this
   * screen left live while a write was out, and the day this block predicted —
   * the owner's answer to #199 disabled it, and the two negatives had to be
   * re-aimed at the section jump or left as nets that say they are nets (#67).
   * They are re-aimed, because the jump reaches the same code with nothing
   * weakened: `load` is keyed on `sectionId` as well as on `page`, so a move to
   * another Section of the same route shape replaces the loader exactly as a
   * page move did, and `onScreen.current === sent` is false for the same reason.
   * What it costs is the walk — two addresses of one route shape inside one
   * document, which `support/section-jump.js` carries and `141b` measured.
   *
   * It is also the only way in left: the handler says its sentence after
   * `reload` has answered `true`, and `reload` answers `true` only on the branch
   * that reads by hand, which is the one taken when the pager is on page one. A
   * move the person makes on page one is a move to another Section or nothing at
   * all.
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

  /** Opens the screen on page one, and says so — the premise of the two rows
   * that stay on it; the two that jump have `openWhereTheJumpIsPossible` below. */
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

  /** The address the jump lands on, which is where the sentence must not be. */
  const LAST_YEARS_LIST = `${DASHBOARD}/${LAST_YEAR}/subjectStudents`;

  /**
   * This year's class list, with last year's Section underneath it in the
   * history list of the same document — the premise of the two rows that jump.
   *
   * Asserts page one, because that is the branch where the handler reads by hand
   * and so has an answer of its own to say a sentence behind (`reload` returns
   * `false` from every other page).
   */
  async function openWhereTheJumpIsPossible(page) {
    await signIn(page, ACCOUNTS.teacherOne);
    const [section] = await enrolment.mySectionIds(page);
    await enrolment.openEnrolment(page, LAST_YEAR);
    await markDocument(page);

    const drawn = await intoTheListedSectionScreen(
      page,
      section,
      '/subjectStudents',
      enrolment.waitForList,
    );
    await untilDrawn(page, drawn);
    const table = enrolment.listTable(page);
    expect((await reading(page, table)).shown, "page one of this year's list").toBe(1);
    return table;
  }

  /**
   * Back to last year's Section in one move of the history list, while the held
   * reload is out, and settled on what that Section's own answer carried (#132).
   *
   * One move and not three: a walk through the dashboard would unmount the
   * screen the row is about, and the history list travels any distance in one
   * move — which is #141's correction, and what makes two addresses of one route
   * shape siblings rather than strangers.
   */
  async function jumpToLastYearsSection(page) {
    const landed = enrolment.waitForList(page);
    await page.evaluate(() => window.history.go(-3));
    await untilDrawn(page, await landed);
  }

  /** The three clauses every jumping row reads, in one object (#141b's shape). */
  async function whereTheyAre(page) {
    return {
      document: await page.evaluate(() => window.__document),
      address: new URL(page.url()).pathname,
      rows: (await page.getByRole('button', { name: /^นำ / }).count()) > 0,
    };
  }

  const LANDED = { document: DOCUMENT, address: LAST_YEARS_LIST, rows: true };

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

  test('says nothing over the Section the jump moved to while the enrolment was out', async ({
    page,
  }) => {
    await openWhereTheJumpIsPossible(page);
    const read = await enrolmentHeldAtTheReload(page);

    await jumpToLastYearsSection(page);
    read.open();
    await read.answered;
    await page.waitForTimeout(SETTLE_MS);

    expect(await page.getByText(SAID_ENROLLED).count(), "the enrolment's sentence").toBe(0);
    // Where the absence was read: the same document, last year's address, and a
    // list with rows in it — a row that only says *I saw nothing* passes on a
    // screen that drew nothing (#203, #171).
    expect(await whereTheyAre(page), 'the screen the sentence was not said on').toEqual(LANDED);
  });

  test('says what it enrolled when the pager stayed where it was', async ({ page }) => {
    await openOnPageOne(page);
    const read = await enrolmentHeldAtTheReload(page);

    read.open();
    await read.answered;

    await expect(page.getByText(SAID_ENROLLED)).toBeVisible();
  });

  test('says nothing over the Section the jump moved to while the removal was out', async ({
    page,
  }) => {
    const table = await openWhereTheJumpIsPossible(page);
    const { code, read } = await removalHeldAtTheReload(page, table);

    await jumpToLastYearsSection(page);
    read.open();
    await read.answered;
    await page.waitForTimeout(SETTLE_MS);

    const said = new RegExp(`นำ ${code} .+ ออกจากตอนเรียนแล้ว`);
    expect(await page.getByText(said).count(), "the removal's sentence").toBe(0);
    expect(await whereTheyAre(page), 'the screen the sentence was not said on').toEqual(LANDED);
  });

  test('says what it removed when the pager stayed where it was', async ({ page }) => {
    const table = await openOnPageOne(page);
    const { code, read } = await removalHeldAtTheReload(page, table);

    read.open();
    await read.answered;

    await expect(page.getByText(new RegExp(`นำ ${code} .+ ออกจากตอนเรียนแล้ว`))).toBeVisible();
  });
});

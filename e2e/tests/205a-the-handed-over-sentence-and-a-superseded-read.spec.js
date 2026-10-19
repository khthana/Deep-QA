'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isGet, isWrite } = require('../support/gate');
const { next, previous, reading, step } = require('../support/pager');
const enrolment = require('../support/enrolment-screen');
const students = require('../support/students-screen');
const { PROGRAM } = require('../../db/seed');

/**
 * #205 - a sentence handed to `load` is thrown away by a read that was already
 * superseded when it landed.
 *
 * #152's shape, which #203 carried to the administration screens: a handler
 * that moves the page rather than reloading it has nothing to await and cannot
 * know whether it drew, so it hands its sentence to the `waiting` ref and
 * `load` says it once it has drawn. What `load` then does in its `finally` is
 *
 *     if (isCurrent()) setLoading(false)
 *     waiting.current = null
 *
 * - the clearing outside the question, in all eight files that hold the ref.
 * So a read that nobody is waiting for any more still clears the sentence that
 * was handed over after it left, and the person who enrolled a student
 * successfully is told nothing at all.
 *
 * ## Why this row is on the enrolment screen
 *
 * Of the ten sites that hand a sentence over, three sit behind a form submit
 * (`SubjectStudents` twice and `Students` once) and seven behind the removal
 * dialog, whose ยืนยัน really is `disabled={busy}`. The three need no second
 * defect to reach: no `Pager` on any of the eight screens carried `busy` when
 * this was written, which `SubjectStudents.add`'s own comment measured on
 * 11 October 2569 (#199), so ถัดไป was pressable for as long as the write was
 * out. Six of the eight took one on 19 ตุลาคม 2569, the owner's answer to #210,
 * and these rows run unchanged - which is the measurement that says they do not
 * arrange their situation on one of the six. What expired is the sentence and
 * not the rows (#130). The seven needed the
 * keyboard hole of #204 to reach the pager under the dialog - closed by #217 on
 * 18 ตุลาคม 2569, after which what reaches them is ยกเลิก and then an
 * ordinary click (#203) - and this file says so rather than claiming the shape
 * is unreachable there.
 *
 * ## What the row has to arrange, and why both reads are gated
 *
 * The loss needs the superseded read to land **after** the handover and
 * **before** the read the handover was for. Holding both says when each lands
 * instead of leaving it to a timer (#142), and the row asserts the page each one
 * asked for, because that is what says the handler took the moving branch and
 * not the reading one (#51).
 *
 * `page.route` runs the most recently added handler first, so the gate that is
 * to take the *first* read is registered *last*.
 */

/** The register's own address, which its save and its list share. */
const REGISTER_PATH = '/api/students';
const REGISTER = /^\/api\/students$/;
const ADDED_CODE = '68205001';
const FIRST = 'ทดสอบ';
const LAST = 'แถวของ #205';
const filterOf = request => new URL(request.url()).searchParams.get('program_id') || '';

const CODE_INDEX = 0;
const ENROLLED = 'ชื่อของแถว 205';
const SETTLE_MS = 250;

const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const pageOf = request => new URL(request.url()).searchParams.get('page');

/** Holds the next two reads of the list, in the order they leave. */
async function gateTwoReads(page) {
  const second = await gate(page, enrolment.API, isGet);
  const first = await gate(page, enrolment.API, isGet);
  return { first, second };
}

test.describe('SubjectStudents.js', () => {
  test('a sentence handed over is still said when a superseded read lands first', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await enrolment.mySectionIds(page);
    await enrolment.openEnrolment(page, sectionId);
    // Any page but the first, so the enrolment hands its sentence over instead
    // of awaiting the read itself.
    expect((await step(page, 'forward', enrolment.waitForList)).status()).toBe(200);

    await page
      .getByLabel('รหัสนักศึกษา', { exact: true })
      .fill(enrolment.SPARE_CODES[CODE_INDEX]);
    // The answer carries a student because the handler reads one out of it to
    // build its sentence; held at the route, it reaches no database.
    const write = await gate(page, enrolment.API, isWrite, {
      success: {
        student: { student_id: enrolment.SPARE_CODES[CODE_INDEX], full_name_th: ENROLLED },
      },
    });
    const reads = await gateTwoReads(page);

    // The page move that supersedes nothing yet: its read is the one that will
    // be stale by the time it lands.
    //
    // Pressed **before** the write rather than while it is out, which is where
    // it was until #199 closed this screen's pager for the length of one. What
    // the row is about is a read that is already superseded when it **lands**,
    // and holding it is what arranges that: the move is still in flight when
    // the handover is made, whichever side of the write it was pressed on. The
    // page numbers asserted below are what say so.
    await button(page, 'ถัดไป').click();
    await reads.first.sent;

    await button(page, 'เพิ่มนักศึกษา').click();
    await write.sent;

    // The write answers, and the handler hands its sentence over and asks for
    // the first page.
    write.open();
    await write.answered;
    await reads.second.sent;
    expect(pageOf(reads.first.request), 'the page the superseded read asked for').toBe('3');
    expect(pageOf(reads.second.request), 'the page the handover asked for').toBe('1');

    // The superseded read lands first and draws nothing - and must take nothing
    // away either.
    reads.first.open();
    await reads.first.answered;
    reads.second.open();
    await reads.second.answered;
    await page.waitForTimeout(SETTLE_MS);

    // The list that was asked for is what makes the sentence's absence a
    // measurement rather than a screen that drew nothing (#171, #48).
    expect(
      await page.getByRole('cell', { name: enrolment.SPARE_CODES[CODE_INDEX] }).count(),
      'the code the write was held from reaching the database',
    ).toBe(0);
    expect(await page.getByRole('button', { name: /^นำ / }).count()).toBeGreaterThan(0);
    expect(
      await page.getByText('เข้าตอนเรียนแล้ว').count(),
      'the banner of the enrolment, said by the read that drew',
    ).toBe(1);
  });

  /**
   * The other half of the same defect, and the half #199 took off the screen.
   *
   * `reload` was built over the page its render closed on, so a handler sent
   * from page two that found the person back on page one asked for page one by
   * `setPage(1)` - which changes nothing there and causes no read at all. The
   * sentence was then left in the ref with nobody coming to say it, and the
   * measurement of 13 October 2569 found it said by the person's *next* move,
   * over a list it was not about. The fix reads the page the pager is on now,
   * and the row that held it pressed ก่อนหน้า while the write was out.
   *
   * ## Why this row is now a net
   *
   * That press is the situation, and the owner's answer to #199 on 15 October
   * 2569 closed the control that makes it: this screen's `Pager` is `disabled`
   * for as long as one of its own writes is out. Of the ten sites that hand a
   * sentence over, this was the one where a pager was drawn beside a form that
   * could be submitted - the other two forms replace their list
   * (`Students.js`) and the seven removals put a dialog over it - so what is
   * left is unreachable **for a person**, and not merely at this seam (#47's
   * sixth reading one step further, #203's ninth). `alwaysmoves` has therefore
   * come out of `mutation/205-the-sentence-names-its-read.py` rather than being
   * left to survive, and its own docstring says what would put it back.
   *
   * So this row asserts the **mechanism** rather than an absence, which is what
   * stops a net passing for the wrong reason (#203): the control the old row
   * pressed is dead while the write is out, so nothing can move `onPage` off
   * the page the handler was sent from - and the handover from page two, which
   * is the half still reachable, says its sentence when the read it is for
   * lands. It becomes a claim again if any screen comes to draw a live pager
   * beside an open form. #204's keyboard hole was closed by #217 on
   * 18 ตุลาคม 2569, which is not the other way round: the control this row
   * is about is dead because of **this** screen's `busy`, and the dismissal the
   * other files now use reaches a dead button just the same.
   * #205's own mutants no longer reach this row, and what holds it instead is
   * #199's pair: `199:prevstayslive` and `199:nextstayslive` each fail this row
   * and pass the other three, which is the control being dead stated as a
   * claim. The half of #205 that its own mutants still prove is row 1's
   * `finally`.
   */
  test('nothing can move the page the handler was sent from, and the handover still says it', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await enrolment.mySectionIds(page);
    await enrolment.openEnrolment(page, sectionId);
    const table = enrolment.listTable(page);
    expect((await step(page, 'forward', enrolment.waitForList)).status()).toBe(200);

    await page
      .getByLabel('รหัสนักศึกษา', { exact: true })
      .fill(enrolment.SPARE_CODES[CODE_INDEX]);
    const write = await gate(page, enrolment.API, isWrite, {
      success: {
        student: { student_id: enrolment.SPARE_CODES[CODE_INDEX], full_name_th: ENROLLED },
      },
    });

    // The premise of the net, read before the write so that the reads below are
    // measurements and not the end rule answering for them (#171).
    await expect(previous(page), 'ก่อนหน้า with nothing out').toBeEnabled();
    await expect(next(page), 'ถัดไป with nothing out').toBeEnabled();

    await button(page, 'เพิ่มนักศึกษา').click();
    await write.sent;

    // The net: both ways off this page are shut while the write is out - #199.
    await expect(previous(page), 'ก่อนหน้า while the enrolment is out').toBeDisabled();
    await expect(next(page), 'ถัดไป while the enrolment is out').toBeDisabled();

    // The handover is made for the first page and the effect's read is what
    // says it, which is the half of this row that is still a claim.
    const drawn = enrolment.waitForList(page);
    write.open();
    await write.answered;
    expect(pageOf((await drawn).request()), 'the page the handover asked for').toBe('1');
    await page.waitForTimeout(SETTLE_MS);

    expect((await reading(page, table)).shown, 'the page the handover drew').toBe(1);
    expect(await page.getByRole('button', { name: /^นำ / }).count()).toBeGreaterThan(0);
    expect(
      await page.getByText('เข้าตอนเรียนแล้ว').count(),
      'the banner of the enrolment, said by the read it was handed to',
    ).toBe(1);
  });

  /**
   * And what the key is for, which neither row above can fail on: a read the
   * screen **does** still want, of a list the sentence is not about. The
   * handover names page one; the person then moves again, so the read that
   * lands and draws is page two's. Saying the sentence there would put the
   * enrolment's banner over a list it says nothing about - #133's rule for
   * sentences - so the read clears it without saying it.
   */
  test('a read of another list clears the sentence without saying it', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await enrolment.mySectionIds(page);
    await enrolment.openEnrolment(page, sectionId);
    expect((await step(page, 'forward', enrolment.waitForList)).status()).toBe(200);

    await page
      .getByLabel('รหัสนักศึกษา', { exact: true })
      .fill(enrolment.SPARE_CODES[CODE_INDEX]);
    const write = await gate(page, enrolment.API, isWrite, {
      success: {
        student: { student_id: enrolment.SPARE_CODES[CODE_INDEX], full_name_th: ENROLLED },
      },
    });
    const handed = await gate(page, enrolment.API, isGet);

    await button(page, 'เพิ่มนักศึกษา').click();
    await write.sent;
    write.open();
    await write.answered;
    // The read the handover is for, held at the route.
    await handed.sent;
    expect(pageOf(handed.request), 'the page the handover asked for').toBe('1');

    // The person moves on before it lands, so page two's read is the one the
    // screen wants, and it is not the one the sentence is about.
    const moved = await gate(page, enrolment.API, isGet);
    await button(page, 'ถัดไป').click();
    await moved.sent;
    expect(pageOf(moved.request), 'the page the person moved to').toBe('2');

    handed.open();
    await handed.answered;
    moved.open();
    await moved.answered;
    await page.waitForTimeout(SETTLE_MS);

    expect(await page.getByRole('button', { name: /^นำ / }).count()).toBeGreaterThan(0);
    expect(
      await page.getByText('เข้าตอนเรียนแล้ว').count(),
      'the banner of the enrolment, over a list it is not about',
    ).toBe(0);
  });
});

test.describe('Students.js', () => {
  /**
   * The same claim as the row above, in the other half of the key.
   *
   * A read of this list is of a page **and** of a filter, because the same page
   * of a different programme is a different list - so `readOf` takes both, and
   * the register's save hands its sentence over for the page one of the filter
   * the person was looking at. `save` closes the form before it reloads
   * (`Students.js` sets `adding` to false inside its own `try`), so the filter
   * is back under the hand while that read is out, which is the way in that
   * `144a`'s register row already walks for the list. What it does not hold is the **sentence**.
   *
   * Moving the filter is therefore the raceless sibling of pressing the pager
   * (#179), and the answer the key gives is the same: the read that draws is of
   * another list, so it clears the sentence without saying it. The row asserts
   * the drawn table against the moved filter's own answer (#132), because a row
   * that only says *I saw nothing* passes on a screen that drew nothing (#203).
   *
   * The filter the person moves to is the programme the student was just added
   * to, so the list that draws is one that certainly has rows - and the sentence
   * is still not said, which is what *of* means: not *about these students* but
   * *of the read it was handed to*.
   */
  test('a read of another filter clears the sentence without saying it', async ({ page }) => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await students.openRegister(page);

    // Held so it reaches no database, and opened before the helper presses:
    // `addStudent` waits for the answer itself.
    const write = await gate(page, REGISTER, isWrite, { success: {} });
    // The read `save` does by hand, because the register is on page one.
    const handed = await gate(page, REGISTER, isGet);
    write.open();
    expect(
      (
        await students.addStudent(page, {
          code: ADDED_CODE,
          first: FIRST,
          last: LAST,
          program: PROGRAM,
        })
      ).status(),
      'the crafted answer the handler reads its sentence out of',
    ).toBe(200);
    await handed.sent;
    expect(filterOf(handed.request), 'the filter the handover is of').toBe('');

    // The person moves the filter while that read is out. `page.route` runs the
    // most recently added handler first, so this gate takes the next read and
    // the one above keeps the read it is already holding.
    const moved = await gate(page, REGISTER, isGet);
    const drawn = page.waitForResponse(
      answer =>
        isGet(answer.request()) &&
        new URL(answer.url()).pathname === REGISTER_PATH &&
        filterOf(answer.request()) === PROGRAM,
    );
    await page.getByLabel('หลักสูตร').selectOption(PROGRAM);
    await moved.sent;

    handed.open();
    await handed.answered;
    moved.open();
    await moved.answered;
    const listed = (await (await drawn).json()).students;
    expect(listed.length, "the moved filter's own answer").toBeGreaterThan(0);
    await expect(
      students.listTable(page).locator('tbody tr'),
      'the table the moved filter drew',
    ).toHaveCount(listed.length);

    expect(
      await page.getByText('บันทึกข้อมูลนักศึกษาเรียบร้อยแล้ว').count(),
      'the banner of the addition, over a list it is not of',
    ).toBe(0);
  });
});

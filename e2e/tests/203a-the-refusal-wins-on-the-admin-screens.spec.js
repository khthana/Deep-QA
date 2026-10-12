'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const {
  DEPARTMENTS,
  PROGRAMS,
  SUBJECT,
  PROGRAM,
  CURRENT_YEAR,
  RUBRICS,
} = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { gate, isGet, isWrite } = require('../support/gate');
const { step } = require('../support/pager');
const { watchForTheSentence, neverSaid } = require('../support/frame-sampler');
const departments = require('../support/departments-screen');
const programs = require('../support/programs-screen');
const subjects = require('../support/subjects-screen');
const pairs = require('../support/program-subjects-screen');
const rubrics = require('../support/rubrics-screen');
const criteria = require('../support/rubric-criteria-screen');
const plos = require('../support/plos-screen');
const offerings = require('../support/offerings-screen');
const students = require('../support/students-screen');
const users = require('../support/users-screen');

/**
 * #203 - the refusal wins on the ten administration screens #152 scoped out.
 *
 * The family is #152's, letter for letter: the handler writes something, calls
 * the screen's own `load` to draw the list again and says *…เรียบร้อยแล้ว* -
 * while `load` catches its own failure, reports it itself and returns normally.
 * The person is told the write worked and hears nothing about the list in front
 * of them, or hears both at once.
 *
 * The owner settled it on 10 October 2569: **the refusal wins**. #152 carried
 * that to eighteen sites in ten ผู้สอน files. `swallowed-refusals.js`, the
 * census #200 built out of that walk, found the rest - **twenty sites in ten
 * administration files**, still 20 of 37 when they were re-measured on
 * 12 October 2569 before any of this was written. This file is a row per site.
 *
 * ## Why these twenty are a file of their own and not more rows in `152a`
 *
 * The claim is the same and the population is not: `152a` walks the ผู้สอน
 * screens as a teacher and this walks the registrar's and the administrator's.
 * Each row here is killed by its own mutant in
 * `mutation/203-the-refusal-wins-on-the-admin-screens.py`, and keeping the two
 * sheets' citations apart is what a mutant name colliding across files costs
 * (#185).
 *
 * ## The one screen where the claim cannot be reached
 *
 * Eighteen of the twenty sites are held up by a mutant of their own.
 * `RubricCriteria` is the exception, and that is a measurement rather than an
 * omission: a refused list there replaces the whole screen, so the sentence has
 * nowhere to draw either way, and both mutants written for it survived **0 of
 * 22**. Its own describe below carries the mechanism; its two rows are nets that
 * say they are nets (#45, #47).
 *
 * ## Why every row here samples frames, where `152a` reads most of its own once
 *
 * These twenty say their sentence **above** the reload, so the refusal that
 * follows *replaces* it: by any settle point the banner says the refusal and
 * nothing else, on the broken screen exactly as on the fixed one. Written as a
 * single read, nineteen of these twenty rows passed against the defect they
 * were written for - measured on 12 October 2569, before any code was changed.
 * `152a`'s rows can read once because #152 moved the sentence below the reload
 * first, so its mutants say it *after* the refusal; its two page-moving rows,
 * which are this shape, sample frames for this reason (#164, and the seventh
 * reading of a survivor in `CLAUDE.md`).
 *
 * So each row asks two things, which are two claims:
 *
 *   - **no painted frame said it**, from before the press until the refusal has
 *     landed. That is the sentence not being said.
 *   - **the refusal is on the screen** at the end. Without it the first half
 *     would pass on a screen that said nothing whatever, and a sampler looking
 *     for a sentence the screen never writes answers *never* at every lateness
 *     (#171).
 *
 * ## How a reload is made to fail
 *
 * `151a`'s way, through `152a`: the write is answered by `gate` with a crafted
 * 200 and the list read that follows with a crafted 409, so **no row here
 * reaches the database through a write** and there is nothing to put back.
 *
 * The refusal is held `HELD_MS` after it has been asked for. That widens the
 * window the sentence is drawn in rather than deciding anything (#52): a
 * screen that does not say it does not say it at any lateness, and this only
 * makes a screen that does say it easier to catch.
 *
 * The write is let go the moment it is gated: nothing has to happen while it is
 * out, and three of these presses are made through helpers that wait for the
 * write's own answer - a write held past them would be a row deadlocked on its
 * own fixture rather than a measurement.
 *
 * The two crafted answers that have to carry a body are `Offerings.save`'s,
 * whose handler reads an Offering out of it and reads that Offering back, and
 * `Offerings.runCopy`'s, whose report panel reads five lists out of it. Both
 * are written from what the code reads, and the first carries a real Offering
 * read from the database. Nothing is written for either.
 *
 * ## What this file writes
 *
 * Nothing. Every write is stopped at the route.
 */

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(async () => {
  await db.end();
});

/** The body a gated write is answered with. Nothing on these screens draws it. */
const DONE = {};

/** The reload's refusal - worded so no screen of the ten could say it itself. */
const REFUSED = 'เรียกรายการใหม่ไม่ได้ เพื่อการทดสอบ #203';

/** How long the refusal is held after being asked for - see the note above. */
const HELD_MS = 300;

/**
 * How long the commit of the refusal is given before the screen is read -
 * `152a`'s constant, and it can decide (#52). What stands behind it is the
 * mutant beside each row.
 */
const SETTLE_MS = 250;

/** The sentence seven of these forms say, which is the same sentence. */
const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';

/** The outcome the `Plos` rows act on, which the seed gives every curriculum. */
const OUTCOME = 'PLO-1';

/** A term nothing is open in, so the form the `Offerings` save row fills is valid. */
const FUTURE = String(Number(CURRENT_YEAR) + 3);

const button = (scope, name) => scope.getByRole('button', { name, exact: true });

/**
 * Gates the write a press sends and the list read that follows it.
 *
 * Two gates can sit on one path where a screen's list and its create share an
 * address: `gate` falls through to the next handler for anything its own
 * matcher refuses, so the GET gate never sees the write and the write gate
 * never sees the read.
 *
 * The write is opened here, before the press: see the file's note.
 */
async function gateTheWriteAndItsReload(page, write, list, success = DONE) {
  const sent = await gate(page, write, isWrite, { success });
  const reload = await gate(page, list, isGet, { refusal: REFUSED });
  sent.open();
  return { sent, reload };
}

/**
 * The claim, for one site: the press, and then nothing but the refusal.
 *
 * `press` does whatever makes the handler run; `sentence` is what that handler
 * says when it goes right, and `what` names it for the failure message.
 */
async function theRefusalWins(page, { write, list, success, sentence, what, press }) {
  const gates = await gateTheWriteAndItsReload(page, write, list, success);
  const watch = await watchForTheSentence(page, sentence);

  await press();
  await gates.reload.sent;
  await page.waitForTimeout(HELD_MS);
  gates.reload.open();
  await gates.reload.answered;
  await page.waitForTimeout(SETTLE_MS);

  await neverSaid(watch, what);
  expect(await page.getByText(REFUSED).count(), "the failed reload's refusal").toBe(1);
}

/** Opens a row's own form through the read the pencil sends, and waits for บันทึก. */
async function openTheEditor(page, row) {
  await button(row, 'แก้ไข').click();
  await expect(button(page, 'บันทึก'), 'the form the save is pressed on').toBeVisible();
}

/**
 * The seven screens whose save - and, on six of them, whose removal - is this
 * shape and is drawn over the list it reloads.
 *
 * `write` and `list` are the two addresses a row gates; `openForm` opens
 * whatever the save is pressed on, `startRemoval` presses the bin and
 * `confirm` is the confirmation's own button. No `removed` means the screen has
 * no removal of this shape: `Users` switches a status instead, which is its own
 * describe below because the sentence is not a save's. `RubricCriteria` has
 * both shapes and is still its own describe, because what the refusal does to
 * that screen is the row's subject there.
 */
const SCREENS = [
  {
    name: 'ข้อมูลภาควิชา',
    file: 'Departments.js',
    account: ACCOUNTS.facultyAdmin,
    open: (page) => departments.openDepartments(page),
    list: /^\/api\/departments$/,
    write: /^\/api\/departments\/[^/]+$/,
    openForm: (page) => openTheEditor(page, departments.departmentRow(page, DEPARTMENTS[0].id)),
    saved: SAVED,
    startRemoval: (page) =>
      button(departments.departmentRow(page, DEPARTMENTS[0].id), 'ลบ').click(),
    confirm: 'ลบภาควิชา',
    removed: 'ลบภาควิชาเรียบร้อยแล้ว',
  },
  {
    name: 'ข้อมูลหลักสูตร',
    file: 'Programs.js',
    account: ACCOUNTS.facultyAdmin,
    open: (page) => programs.openPrograms(page),
    list: /^\/api\/programs$/,
    write: /^\/api\/programs\/[^/]+$/,
    openForm: (page) => openTheEditor(page, programs.programRow(page, PROGRAMS[0].id)),
    saved: SAVED,
    startRemoval: (page) => button(programs.programRow(page, PROGRAMS[0].id), 'ลบ').click(),
    confirm: 'ลบหลักสูตร',
    removed: 'ลบหลักสูตรเรียบร้อยแล้ว',
  },
  {
    name: 'ข้อมูลรายวิชา',
    file: 'Subjects.js',
    account: ACCOUNTS.departmentAdmin05,
    open: (page) => subjects.openSubjects(page),
    list: /^\/api\/subjects$/,
    write: /^\/api\/subjects\/[^/]+$/,
    openForm: (page) => openTheEditor(page, subjects.subjectRow(page, SUBJECT.id)),
    saved: SAVED,
    startRemoval: (page) => button(subjects.subjectRow(page, SUBJECT.id), 'ลบ').click(),
    confirm: 'ลบรายวิชา',
    removed: 'ลบรายวิชาเรียบร้อยแล้ว',
  },
  {
    name: 'รายวิชาในหลักสูตร',
    file: 'ProgramSubjects.js',
    account: ACCOUNTS.committee0501,
    open: (page) => pairs.openProgramSubjects(page),
    list: /^\/api\/program-subjects$/,
    write: /^\/api\/program-subjects\/[^/]+\/[^/]+$/,
    openForm: (page) => pairs.openEditor(page, SUBJECT.id),
    saved: SAVED,
    startRemoval: (page) => pairs.startRemoval(page, SUBJECT.id),
    confirm: 'นำออกจากหลักสูตร',
    removed: 'นำรายวิชาออกจากหลักสูตรเรียบร้อยแล้ว',
  },
  {
    name: 'Rubric',
    file: 'Rubrics.js',
    account: ACCOUNTS.committee0501,
    open: (page) => rubrics.openRubrics(page),
    list: /^\/api\/rubrics$/,
    write: /^\/api\/rubrics\/\d+$/,
    openForm: (page) => openTheEditor(page, rubrics.rubricRow(page, RUBRICS[3].code)),
    saved: SAVED,
    startRemoval: (page) => rubrics.startRemoval(page, RUBRICS[3].code),
    confirm: 'ลบ Rubric',
    removed: 'ลบ Rubric เรียบร้อยแล้ว',
  },
  {
    name: 'ผลการเรียนรู้ระดับหลักสูตร',
    file: 'Plos.js',
    account: ACCOUNTS.committee0501,
    open: (page) => plos.openPlos(page),
    list: /^\/api\/plos$/,
    write: /^\/api\/plos\/\d+$/,
    openForm: (page) => plos.openEditor(page, OUTCOME),
    saved: SAVED,
    startRemoval: (page) => plos.startRemoval(page, OUTCOME),
    confirm: 'ลบผลการเรียนรู้',
    removed: 'ลบผลการเรียนรู้เรียบร้อยแล้ว',
  },
  {
    name: 'ข้อมูลผู้ใช้งาน',
    file: 'Users.js',
    account: ACCOUNTS.facultyAdmin,
    open: async (page) => {
      await users.openUsers(page);
      await users.search(page, 'teacher');
      await expect(users.userRow(page, ACCOUNTS.teacherTwo)).toHaveCount(1);
    },
    list: /^\/api\/users$/,
    write: /^\/api\/users\/[^/]+$/,
    openForm: (page) => openTheEditor(page, users.userRow(page, ACCOUNTS.teacherTwo)),
    saved: SAVED,
  },
];

for (const screen of SCREENS) {
  test.describe(`${screen.name} (${screen.file})`, () => {
    test('a save whose reload is refused says the refusal and not that it saved', async ({
      page,
    }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      await screen.openForm(page);

      await theRefusalWins(page, {
        write: screen.write,
        list: screen.list,
        sentence: screen.saved,
        what: 'the banner of the save',
        press: () => button(page, 'บันทึก').click(),
      });
    });

    if (screen.removed) {
      test('a removal whose reload is refused says the refusal and not that it removed', async ({
        page,
      }) => {
        await signIn(page, screen.account);
        await screen.open(page);

        await theRefusalWins(page, {
          write: screen.write,
          list: screen.list,
          sentence: screen.removed,
          what: 'the banner of the removal',
          press: async () => {
            await screen.startRemoval(page);
            await button(page, screen.confirm).click();
          },
        });
      });
    }
  });
}

/**
 * The one screen of the ten where this claim cannot be reached.
 *
 * `load` here does not put a banner over the table: a refusal about this rubric
 * is the state of the whole screen, so it sets `refusal`, and the component
 * returns a card carrying that sentence and a way back instead of the table and
 * its `<Notice>`. The sentence a handler sets after a refused reload therefore
 * has nowhere to draw - before this ticket and after it - and the only way off
 * the card unmounts the screen.
 *
 * Measured, not reasoned about: the two mutants written for this screen in the
 * shape of the other eighteen sites both survived **0 of 22** on 12 October
 * 2569, which is the first reading of a sweep - a claim never at risk (#45) -
 * so they were taken out and these two rows stay as nets that say they are
 * nets (#47). They assert the **mechanism** as well as the absence, because a
 * row that only says it saw nothing passes for the wrong reason. The day
 * `load` here starts drawing a banner over the table instead, the claim
 * becomes reachable and those two mutants are the ones to write back.
 */
test.describe('เกณฑ์การให้คะแนนของ Rubric (RubricCriteria.js) - the screen the refusal replaces', () => {
  const LIST = /^\/api\/rubrics\/\d+\/criteria$/;
  const WRITE = /^\/api\/rubrics\/\d+\/criteria\/\d+$/;
  const BACK = 'กลับไปหน้าข้อมูล Rubric กลาง';

  async function openTheCriteria(page) {
    await signIn(page, ACCOUNTS.committee0501);
    await rubrics.openRubrics(page);
    await criteria.openCriteriaVia(page, rubrics.rubricRow(page, RUBRICS[0].code));
  }

  /** The card is up at the end of every row below, so the way back is read there. */
  const theScreenWasReplaced = (page) =>
    expect(
      page.getByRole('link', { name: BACK }),
      'the way back off the refusal card',
    ).toBeVisible();

  test('a save whose reload is refused is answered by the whole screen, so nothing says it saved', async ({
    page,
  }) => {
    await openTheCriteria(page);
    const [first] = await criteria.listedNames(page);
    await openTheEditor(page, criteria.criterionRow(page, first));

    await theRefusalWins(page, {
      write: WRITE,
      list: LIST,
      sentence: SAVED,
      what: 'the banner of the save',
      press: () => button(page, 'บันทึก').click(),
    });

    await theScreenWasReplaced(page);
  });

  test('a removal whose reload is refused is answered by the whole screen, so nothing says it removed', async ({
    page,
  }) => {
    await openTheCriteria(page);

    await theRefusalWins(page, {
      write: WRITE,
      list: LIST,
      sentence: 'ลบเกณฑ์เรียบร้อยแล้ว',
      what: 'the banner of the removal',
      press: async () => {
        const [first] = await criteria.listedNames(page);
        await criteria.startRemoval(page, first);
        await button(page, 'ลบเกณฑ์').click();
      },
    });

    await theScreenWasReplaced(page);
  });
});

test.describe('ข้อมูลผู้ใช้งาน (Users.js) - the switch that is not a save', () => {
  /**
   * `toggle` is not a save, so #203 asks its sentence as its own words: what it
   * says is that an account was suspended, and the question is whether that may
   * be said when the list it is about could not be read back. It may not, for
   * the same reason - the rows of accounts in front of the person are the thing
   * the sentence is about, and the switch is read off one of them.
   *
   * The pair of teachers is `202a`'s, for its reason: ten seeded accounts and a
   * page of ten mean neither is certain to be on page one, and a teacher is
   * never the account signed in - `ระงับ` is disabled on one's own row.
   */
  test('a suspension whose reload is refused says the refusal and not that it suspended', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await users.openUsers(page);
    await users.search(page, 'teacher');
    await expect(users.userRow(page, ACCOUNTS.teacherTwo)).toHaveCount(1);

    await theRefusalWins(page, {
      write: /^\/api\/users\/[^/]+\/status$/,
      list: /^\/api\/users$/,
      sentence: 'ระงับการใช้งานบัญชีเรียบร้อยแล้ว',
      what: "the switch's sentence",
      press: () => button(users.userRow(page, ACCOUNTS.teacherTwo), 'ระงับ').click(),
    });
  });
});

test.describe('ข้อมูลนักศึกษา (Students.js)', () => {
  /** The register's list, and the write it answers at the same address. */
  const LIST = /^\/api\/students$/;
  const ADDED = 'บันทึกข้อมูลนักศึกษาเรียบร้อยแล้ว';
  const FIRST = 'ทดสอบ';
  const LAST = 'แถวของ #203';

  /**
   * `save` reloads by hand only when the register is already on page one; from
   * any other page it asks for page one instead and the effect does that read.
   * This row is the first branch, which is the site the census names.
   */
  test('an addition whose reload is refused says the refusal and not that it added', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await students.openRegister(page);

    await theRefusalWins(page, {
      write: /^\/api\/students$/,
      list: /^\/api\/students$/,
      sentence: ADDED,
      what: 'the banner of the addition',
      press: () =>
        students.addStudent(page, {
          code: '68203001',
          first: FIRST,
          last: LAST,
          program: PROGRAM,
        }),
    });
  });
  /** The read the register's list answers, for the pager and for the gates. */
  const listOfStudents = (page) =>
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === '/api/students' &&
        answer.request().method() === 'GET',
    );

  /**
   * The other branch, and the half of #203 the census cannot see.
   *
   * A student added from any page but the first is not on the page the person is
   * looking at, so `save` asks for page one instead of reloading - and that read
   * is the **effect's**. The handler has nothing to await, so the sentence is
   * handed to the `waiting` ref for `load` to say when it has drawn, which is
   * #152's shape on `SubjectStudents.js`. The census cannot see any of it: the
   * handler awaits no loader on this branch, so there is no answer to read.
   *
   * Six removals step the page back the same way and `Offerings`' term copy
   * asks for the first page like this one; what is measured here is the shape,
   * which is the same code on all eight (#191 for what each way in would add).
   *
   * The two rows are a pair on purpose: the first says the handover happens at
   * all, the second that a refusal still wins across it. Without the first,
   * deleting the line in `load` that says the waiting sentence would break
   * nothing on this screen.
   */
  test.describe('the page it asks for instead of the one it is on', () => {
    test('a sentence handed to the page move is said when that page draws', async ({ page }) => {
      await signIn(page, ACCOUNTS.departmentAdmin05);
      await students.openRegister(page);
      await step(page, 'forward', listOfStudents);

      // The write is crafted, so nothing is added and the page one that draws
      // is the page one the seed has. The sentence is the claim, not the row.
      const sent = await gate(page, LIST, isWrite, { success: DONE });
      sent.open();
      await students.addStudent(page, {
        code: '68203002',
        first: FIRST,
        last: LAST,
        program: PROGRAM,
      });

      await expect(page.getByText(ADDED), 'the banner of the addition').toBeVisible();
    });

    test('a sentence handed to the page move is not said when that page is refused', async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.departmentAdmin05);
      await students.openRegister(page);
      await step(page, 'forward', listOfStudents);

      await theRefusalWins(page, {
        write: LIST,
        list: LIST,
        sentence: ADDED,
        what: 'the banner of the addition',
        press: () =>
          students.addStudent(page, {
            code: '68203003',
            first: FIRST,
            last: LAST,
            program: PROGRAM,
          }),
      });
    });
  });
});

test.describe('ข้อมูลการเปิดรายวิชา (Offerings.js)', () => {
  /** One Offering of the seed, for the crafted answer `save` reads an id out of. */
  async function anOffering() {
    const { rows } = await db.query(
      `SELECT o.id, o.subject_id, s.subject_name_th, o.academic_year, o.semester
         FROM semester_courses o
         JOIN subjects s ON s.subject_id = o.subject_id
        WHERE o.program_id = $1
        ORDER BY o.id ASC
        LIMIT 1`,
      [PROGRAM],
    );
    expect(rows, 'the seed should open at least one รายวิชา for this curriculum').toHaveLength(1);
    return rows[0];
  }

  /** Every list `CopyTermPanel` reads out of the report, empty. */
  const NOTHING_COPIED = {
    created: [],
    sections: 0,
    skipped_existing: [],
    skipped_unplaced: [],
    skipped_closed: [],
    dropped_teachers: [],
  };

  test('a เปิดรายวิชา whose reload is refused says the refusal and not that it opened', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await offerings.openOfferings(page);
    const existing = await anOffering();

    // The form is filled by hand rather than through `openSubject`, which waits
    // for the read-back this row holds until after the refusal has landed.
    await offerings.openForm(page);
    await expect(
      offerings.subjectPicker(page).locator(`option[value="${SUBJECT.id}"]`),
      'the curriculum should offer this รายวิชา',
    ).toHaveCount(1);
    await offerings.subjectPicker(page).selectOption(SUBJECT.id);
    await page.locator('form input[inputmode="numeric"]').fill(FUTURE);
    await page.locator('form select:has(option:text-is("1 — ภาคต้น"))').selectOption('1');

    await theRefusalWins(page, {
      write: /^\/api\/offerings$/,
      list: /^\/api\/offerings$/,
      success: { offering: existing },
      sentence: `เปิดรายวิชา ${existing.subject_id} ${existing.subject_name_th}`,
      what: 'the banner of the opening',
      press: () => button(page, 'เปิดรายวิชา').click(),
    });
  });

  test('a คัดลอก whose reload is refused says the refusal and not that it copied', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await offerings.openOfferings(page);

    await theRefusalWins(page, {
      write: /^\/api\/offerings\/copy$/,
      list: /^\/api\/offerings$/,
      success: NOTHING_COPIED,
      sentence: 'ไม่มีรายวิชาใดถูกคัดลอก รายละเอียดอยู่ในกล่องด้านล่าง',
      what: 'the banner of the copy',
      press: () =>
        offerings.copyFromTerm(
          page,
          { year: CURRENT_YEAR, semester: 1 },
          { year: FUTURE, semester: 1 },
        ),
    });
  });

  test('a ยกเลิกการเปิด whose reload is refused says the refusal and not that it cancelled', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await offerings.openOfferings(page);

    await theRefusalWins(page, {
      write: /^\/api\/offerings\/\d+$/,
      list: /^\/api\/offerings$/,
      sentence: 'ยกเลิกการเปิดรายวิชาเรียบร้อยแล้ว',
      what: 'the banner of the cancellation',
      press: async () => {
        await offerings.startRemoval(page, 'ยกเลิกการเปิด');
        await button(page, 'ยกเลิกการเปิดรายวิชา').click();
      },
    });
  });
});

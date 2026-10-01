'use strict';

const { test, expect } = require('@playwright/test');

const { createPool } = require('../../db/pool');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { E2E_SCHEMA } = require('../support/env');
const { hold } = require('../support/hold');
const {
  openDepartments,
  openEditor: openDepartmentEditor,
  statusBox: departmentStatusBox,
  save: saveDepartment,
  statusOf: departmentStatus,
} = require('../support/departments-screen');
const {
  openPrograms,
  openEditor: openProgramEditor,
  statusBox: programStatusBox,
  save: saveProgram,
  statusOf: programStatus,
  removeProgram,
} = require('../support/programs-screen');
const { openAt } = require('../support/navigation');
const { openUsers, userRow } = require('../support/users-screen');
const { PLOS, waitForReach, ploRow } = require('../support/plos-screen');

/**
 * #181 — the status switch two screens were never asked about.
 *
 * Five forms carry a status field. Three screens have a browser-seam row that
 * presses their own one and reads the table back; the ภาควิชา and หลักสูตร
 * screens had none, and their rows were held up by hand-walked ticks alone —
 * `14-departments.md` item 3 and `15-programs.md` items 4 and 5.
 *
 * Which matters most on the first of them, because **ภาควิชา is the one screen
 * whose `DELETE` refuses rather than closing the row for you** (#60: three
 * routes refuse, five deactivate through `lib/removal`). Both of its refusals
 * end *หากต้องการเลิกใช้งานให้ปิดการใช้งานแทน*, which is a claim that the way
 * out is reachable from the screen the sentence is read on. These rows are what
 * holds that claim.
 *
 * ## What was already at risk, and what was not
 *
 * The department box is *pressed* at this seam already — `16a` row 97 closes
 * department `01` from a second context, as a fixture, to look at what the
 * subject form's picker then offers. So a form that ignored the box would be
 * caught there. What no row asked is the question these rows ask: **does the
 * ภาควิชา screen itself read the field back**, in the badge its own table draws.
 * An instrument is not an assertion (#171), and that is the difference between
 * the two.
 *
 * ## Why each row closes the thing it closes
 *
 * ภาควิชา is closed from the form, because nothing else can close it. หลักสูตร
 * is closed twice, because there the form is not the only way in: once through
 * *ลบ* on a curriculum that has data under it, which the route turns into a
 * deactivation, and once from the form itself. The first is the shape `18a` and
 * `19a` use for their own screens and is what `15`'s sheet is written on; the
 * second is what makes the form's *closing* direction a claim rather than an
 * inference from its opening one — no mutant on the route's path can tell the
 * two apart.
 *
 * What is left to a person on both sheets is the appearance: the wording of the
 * label, the colour of the badge, and the question #180 asks about the shape of
 * the control.
 *
 * ## Why the cleanup here goes to the database
 *
 * Each row ends by putting its subject back, and two sweeps of this file taught
 * what that cleanup may not be. It may not **assert**: a `finally` that throws
 * replaces the error it is cleaning up after, so the first sweep's four reds
 * named the restoring step and none of them named the claim that had just
 * failed. And it may not go through **the code under test**: a restore that
 * presses the same form a mutant has pinned cannot land while that mutant is
 * applied, so the subject stays closed and the next row dies on its own
 * precondition — a kill, counted, that is about the row before it (#52, #89, one
 * layer out). So the restoring is an `UPDATE`, which is an instrument and not an
 * assertion (#171); it is idempotent, it reports its own failure rather than
 * throwing it over a row's red, and `afterAll` reads that report so a green run
 * cannot hide a cleanup that did not land. `hold` is the net under all of it.
 */

/**
 * The world this file writes in, put back when it ends.
 *
 * `hold` remembers every row before anything here runs and puts back what moved,
 * including a row that stayed and changed (#137) — which is all this file does.
 * It is the net under the cleanups, not a replacement for them: a row that left
 * `05` closed would be read by the rows below it and by `16a`.
 */
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** The same schema the stack under test is reading, for the cleanups below. */
const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(() => db.end());

/** The seeded department every row here closes: `05` has curricula under it. */
const DEPARTMENT = '05';

/** And a seeded curriculum under it, which has an Offering and marks under it. */
const PROGRAM = '0501';

/** A seeded outcome of that curriculum, as `19a` names it. */
const SEEDED_PLO = 'PLO-12';

const ACTIVE = 'ใช้งานอยู่';
const CLOSED = 'ปิดใช้งาน';
const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';

/**
 * Opens the editor, moves the box the way asked, saves and reads the banner.
 *
 * The box's state before the press is asserted rather than assumed: it is drawn
 * from the answer the editor read, so a form that drew it from a default would
 * make the press a no-op and the badge assertion below true by accident (#51).
 */
async function setStatus(page, { box, open, openEditor, save }) {
  await openEditor(page);
  await expect(box(page)).toBeChecked({ checked: !open });
  if (open) await box(page).check();
  else await box(page).uncheck();
  const reloaded = await save(page);
  expect(reloaded.status()).toBe(200);
  await expect(page.getByText(SAVED)).toBeVisible();
}

/**
 * Puts a subject back open in the database, asserting nothing.
 *
 * Not through the form, which is the code every mutant here pins: a cleanup that
 * pressed it would never land while one is applied, and the row after this one
 * would die on its own precondition instead. Writing the column is idempotent
 * and says nothing about whether the screen can do it, which is the whole point
 * — the claim is the row's, not the fixture's.
 */
let cleanupsThatDidNotLand = 0;
async function reopen({ restore, what }) {
  try {
    await restore();
  } catch (error) {
    // Reported rather than thrown: the row's own red is what this must not
    // replace. `afterAll` below fails the file if this ever ran.
    cleanupsThatDidNotLand += 1;
    console.log(
      `181a: the cleanup for ${what} did not land — ${error.message}`,
    );
  }
}

test.afterAll(() => {
  expect(cleanupsThatDidNotLand, 'cleanups that reported a failure').toBe(0);
});

const department = {
  what: `department ${DEPARTMENT}`,
  box: departmentStatusBox,
  openEditor: page => openDepartmentEditor(page, DEPARTMENT),
  save: saveDepartment,
  status: page => departmentStatus(page, DEPARTMENT),
  restore: () =>
    db.query(
      'UPDATE departments SET is_active = TRUE WHERE department_id = $1',
      [DEPARTMENT],
    ),
};

const program = {
  what: `curriculum ${PROGRAM}`,
  box: programStatusBox,
  openEditor: page => openProgramEditor(page, PROGRAM),
  save: saveProgram,
  status: page => programStatus(page, PROGRAM),
  restore: () =>
    db.query('UPDATE programs SET is_active = TRUE WHERE program_id = $1', [
      PROGRAM,
    ]),
};

test('14 item 3: a department is retired from its own form, and its table says so', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);

  await expect(department.status(page)).toHaveText(ACTIVE);

  try {
    await setStatus(page, { ...department, open: false });

    // The row still there and closed, which is the criterion whole: a retirement
    // that dropped the row would leave the badge with nothing to fail on, so
    // both halves are read.
    await expect(department.status(page)).toHaveCount(1);
    await expect(department.status(page)).toHaveText(CLOSED);

    // *คืนสถานะได้* — the way back, through the same box, which is a second
    // claim and not the first one read backwards.
    await setStatus(page, { ...department, open: true });
    await expect(department.status(page)).toHaveText(ACTIVE);
  } finally {
    await reopen(department);
  }
});

test('14 item 3: closing a department is not a silent revocation', async ({ page, browser }) => {
  // The faculty administrator closes it; the department's own administrator is a
  // second context, because one profile cannot hold two sessions and the claim
  // is about what that other account can still do while it is closed.
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);

  try {
    await setStatus(page, { ...department, open: false });
    await expect(department.status(page)).toHaveText(CLOSED);

    const context = await browser.newContext();
    try {
      const theirs = await context.newPage();
      await signIn(theirs, ACCOUNTS.departmentAdmin05);
      await openUsers(theirs);

      // Signed in, on the screen their grant is for, still seeing the people of
      // department 05 — `coveredScopes` joins by the identifier and reads no
      // `is_active`, so closing a department edits data and revokes nothing.
      //
      // Two people, because an account's own scope is its programme if it has
      // one and its department otherwise: a teacher of `0501` is reached
      // through the curriculum and would still be listed by a reach that had
      // dropped the department itself. The second row is somebody whose scope
      // *is* `05`, which is the only kind this claim can be broken on.
      await expect(userRow(theirs, ACCOUNTS.teacherOne)).toHaveCount(1);
      await expect(userRow(theirs, ACCOUNTS.departmentAdmin05)).toHaveCount(1);
    } finally {
      await context.close();
    }
  } finally {
    await reopen(department);
  }
});

test('15 item 4: a curriculum is closed from its own form as well', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openPrograms(page);

  await expect(program.status(page)).toHaveText(ACTIVE);

  try {
    await setStatus(page, { ...program, open: false });
    await expect(program.status(page)).toHaveCount(1);
    await expect(program.status(page)).toHaveText(CLOSED);

    await setStatus(page, { ...program, open: true });
    await expect(program.status(page)).toHaveText(ACTIVE);
  } finally {
    await reopen(program);
  }
});

test('15 item 5: closing a curriculum is not a silent revocation either', async ({ page, browser }) => {
  // The twin of the ภาควิชา row above, on the screen whose grant is scoped to
  // this one curriculum. Written here rather than left for later because it is
  // the same sentence as its department half, and half a sentence deferred is a
  // decision nobody can find (#119).
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openPrograms(page);

  try {
    await setStatus(page, { ...program, open: false });
    await expect(program.status(page)).toHaveText(CLOSED);

    const context = await browser.newContext();
    try {
      const theirs = await context.newPage();
      await signIn(theirs, ACCOUNTS.committee0501);

      // Opened on the screen's *reach* call rather than on its list, because a
      // grant that reached nothing would never ask for a list at all and the
      // row would die at a wait instead of at its claim (#139). The reach call
      // is made either way; what it answers is what this row is about.
      const reach = await openAt(theirs, PLOS, waitForReach);
      expect(reach.status()).toBe(200);

      // On the screen their grant over `0501` is for, with the curriculum
      // closed: `coveredScopes` joins by the identifier and reads no
      // `is_active` here either.
      await expect(ploRow(theirs, SEEDED_PLO)).toHaveCount(1);
    } finally {
      await context.close();
    }
  } finally {
    await reopen(program);
  }
});

test('15 items 4 and 5: a curriculum with data under it is closed, and reopened from its form', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openPrograms(page);

  await expect(program.status(page)).toHaveText(ACTIVE);

  try {
    await removeProgram(page, PROGRAM);

    // What the person is told, which is the row's point: not *ลบเรียบร้อยแล้ว*
    // and not a system error either. The seed hangs an Offering, its CLOs, the
    // weighting scheme and every mark off this curriculum.
    await expect(
      page.getByText('ระบบจึงปิดการใช้งานแทนการลบ', { exact: false }),
    ).toBeVisible();
    await expect(program.status(page)).toHaveCount(1);
    await expect(program.status(page)).toHaveText(CLOSED);

    // The way back, which is the only one there is: placing it again is not an
    // option, because the row is still there.
    await setStatus(page, { ...program, open: true });
    await expect(program.status(page)).toHaveText(ACTIVE);
  } finally {
    await reopen(program);
  }
});

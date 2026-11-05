'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { DEPARTMENTS, RUBRICS } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { dismiss, panel } = require('../support/confirm-dialog');
const { hold } = require('../support/hold');
const { downloadTemplate, headerOf, csv } = require('../support/import-panel');
const { keysOn, next, reading } = require('../support/pager');
const departments = require('../support/departments-screen');
const offerings = require('../support/offerings-screen');
const programs = require('../support/programs-screen');
const subjects = require('../support/subjects-screen');
const rubrics = require('../support/rubrics-screen');

/**
 * #210 - the administration pagers take `busy`, so a write that is out closes
 * the pager rather than leaving it live.
 *
 * `Pager` has carried a `busy` since [#199](https://github.com/khthana/Deep-QA/issues/199),
 * written first into `disabled={busy || page <= 1}` and `disabled={busy || page >= pages}`,
 * and one of its eleven call sites passed it: the enrolment screen's, where
 * #199 measured what a live pager under a pending write costs. The other ten
 * were unchanged **by construction and not by measurement**, which is the
 * sentence #210 exists to settle.
 *
 * Measured on 19 ตุลาคม 2569 before anything was changed: of the six
 * administration screens the ticket names, only `Rubrics` can reach the window
 * in today's seed - #57's end rule disables both buttons on a one-page list, and
 * the other five read *หน้า 1 จาก 1*. The two windows #199 found (the write out,
 * and the reload out) no longer fork what the person is told, #205 having keyed
 * the sentence to the read that draws what it is about; what was left was one
 * behaviour - the sentence drawn over the page the person had moved to - and the
 * owner's answer on 19 ตุลาคม 2569 was option 1: send `busy` to all six.
 *
 * ## What each row claims
 *
 * The rule is one line at six sites, and `Pager` is one component, so no mutant
 * at the component can tell the sites apart. Each row is therefore a
 * **reachability** claim of its own (#191): that this screen's pager really is
 * handed the flag, and that a removal held at the route really does close it.
 * The control read above each claim is the same button with nothing out, which
 * is what keeps a red a measurement (#171) - a button disabled by #57's end rule
 * would read `disabled` on the broken screen too.
 *
 * ## The one site with no row here
 *
 * `ProgramSubjects` and `Offerings` carry the same line, and until 5 พ.ย. 2569
 * neither was rowed. The paragraph that stood here gave one reason for both —
 * *an offering needs a (programme, subject) pair for every row, so a second
 * page of offerings is a seed change rather than a fixture* — and that half was
 * **false on the day it was written**, so it is corrected rather than dated
 * (#54, #130). `semester_courses` is unique on
 * `(program_id, subject_id, academic_year, semester)`, not on the pair, so one
 * placed pair opens in as many terms as anybody asks for; and this file's own
 * `secondPage` hook was already building second pages as fixtures for three of
 * its five rows while the sentence said a fixture could not. #267 measured both
 * halves on 4–5 พ.ย. 2569, and the owner's answer was ง: build the page here
 * and leave the seed alone.
 *
 * `ProgramSubjects` keeps the ☐ and the date. Its key really is
 * `PRIMARY KEY (program_id, subject_id)`, so an eleventh row there is ten more
 * subjects — which is a seed change, and the owner's call (#130).
 *
 * Each row writes - an import, and a removal that really lands - so the file
 * holds the schema and puts it back when it ends (#134).
 */

test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** Ten more rows than a page holds, so ถัดไป is live before anything is out. */
const PAGE_SIZE = 10;

/**
 * The terms the offerings fixture opens its subject in — four years of this
 * file's own, the last kept for the one row that is pressed. Far enough ahead
 * that no seed and no other spec plans a term in them, which is what keeps this
 * file's rows out of every other file's reading (#132).
 */
const PAGING_YEARS = [2590, 2591, 2592, 2593];

async function untilAtLeast(page, table, total) {
  await expect.poll(async () => (await reading(page, table)).total).toBeGreaterThanOrEqual(total);
}

const SCREENS = [
  {
    name: 'Rubric (Rubrics.js)',
    account: ACCOUNTS.committee0501,
    open: page => rubrics.openRubrics(page),
    table: page => rubrics.table(page),
    write: /^\/api\/rubrics\/\d+$/,
    // Eleven in the seed, measured on 19 ตุลาคม 2569: two pages with no fixture at
    // all, which is why this is the screen the rule is proved on.
    secondPage: async () => {},
    startRemoval: page => rubrics.startRemoval(page, RUBRICS[3].code),
    confirm: 'ลบ Rubric',
  },
  {
    name: 'ข้อมูลภาควิชา (Departments.js)',
    account: ACCOUNTS.facultyAdmin,
    open: page => departments.openDepartments(page),
    table: page => departments.listTable(page),
    write: /^\/api\/departments\/[^/]+$/,
    secondPage: page =>
      departments.threePagesEndingIn(page, { rows: 3, prefix: 'Q2', note: 'Row 210' }),
    // One of the fixture's own rows, not a seeded department: every seeded one
    // has programmes and subjects pointing at it, and the `RESTRICT` doctrine
    // refuses that removal (ADR-0001's tier one, measured here on
    // 19 ตุลาคม 2569 - the count did not move and the row read 23 of 23). What
    // this row is about is the window while the write is out, and a write that
    // is refused never leaves it.
    startRemoval: async page => {
      const keys = await keysOn(departments.listTable(page));
      const mine = keys.find(key => key.startsWith('Q2'));
      expect(mine, 'a fixture row on the first page, which is the one that really deletes').toBeTruthy();
      await departments.departmentRow(page, mine).getByRole('button', { name: 'ลบ' }).click();
    },
    confirm: 'ลบภาควิชา',
  },
  {
    name: 'ข้อมูลหลักสูตร (Programs.js)',
    account: ACCOUNTS.facultyAdmin,
    open: page => programs.openPrograms(page),
    table: page => programs.listTable(page),
    write: /^\/api\/programs\/[^/]+$/,
    secondPage: async page => {
      const table = programs.listTable(page);
      const { total } = await reading(page, table);
      if (total > PAGE_SIZE) return;
      const header = headerOf(await downloadTemplate(page));
      const rows = Array.from(
        { length: PAGE_SIZE + 1 - total },
        (unused, i) =>
          `9${String(i).padStart(3, '0')},หลักสูตรทดสอบแบ่งหน้า ${i},Paging ${i},${DEPARTMENTS[0].id},2569`,
      );
      await programs.importPrograms(page, csv(header, ...rows));
      await untilAtLeast(page, table, PAGE_SIZE + 1);
    },
    startRemoval: page =>
      programs.programRow(page, '9000').getByRole('button', { name: 'ลบ' }).click(),
    confirm: 'ลบหลักสูตร',
  },
  {
    name: 'ข้อมูลรายวิชา (Subjects.js)',
    account: ACCOUNTS.departmentAdmin05,
    open: page => subjects.openSubjects(page),
    table: page => subjects.listTable(page),
    write: /^\/api\/subjects\/[^/]+$/,
    secondPage: async page => {
      const table = subjects.listTable(page);
      const { total } = await reading(page, table);
      if (total > PAGE_SIZE) return;
      const header = headerOf(await downloadTemplate(page));
      const rows = Array.from(
        { length: PAGE_SIZE + 1 - total },
        (unused, i) =>
          `9999${String(i).padStart(4, '0')},รายวิชาทดสอบแบ่งหน้า ${i},Paging ${i},3,05,,`,
      );
      await subjects.importSubjects(page, csv(header, ...rows));
      await untilAtLeast(page, table, PAGE_SIZE + 1);
    },
    startRemoval: page =>
      subjects.subjectRow(page, '99990000').getByRole('button', { name: 'ลบ' }).click(),
    confirm: 'ลบรายวิชา',
  },
  {
    name: 'การเปิดรายวิชาในภาคการศึกษา (Offerings.js)',
    account: ACCOUNTS.committee0501,
    open: page => offerings.openOfferings(page),
    table: page => offerings.listTable(page),
    write: /^\/api\/offerings\/\d+$/,
    // #267's answer ง (5 พ.ย. 2569): a second page here is a fixture, and the
    // years are this file's own so that no other file shares a term with it.
    // The last of them holds the one row this row presses - see
    // `moreThanOnePage`.
    secondPage: page => offerings.moreThanOnePage(page, { years: PAGING_YEARS }),
    // The fixture's own row, in the one year holding a single Offering: it has
    // no section and nothing points at it, so the removal really lands, where
    // the seeded Offerings carry 113 enrolments and their marks and are refused
    // (`23a` row 8). A refused write never leaves the window this row is about.
    startRemoval: (page, built) =>
      offerings
        .offeringTermRow(page, built.spare)
        .getByRole('button', { name: 'ยกเลิกการเปิด' })
        .click(),
    confirm: 'ยกเลิกการเปิดรายวิชา',
  },
];

for (const screen of SCREENS) {
  test(`${screen.name}: the pager is closed while a removal is out`, async ({ page }) => {
    await signIn(page, screen.account);
    await screen.open(page);
    // What the fixture built, for the rows whose removal has to land on a row
    // of the fixture's own rather than on a seeded one.
    const built = await screen.secondPage(page);

    const table = screen.table(page);
    const line = await reading(page, table);
    expect(line.pages, 'the row needs a second page, or the end rule answers for the flag').toBeGreaterThan(1);

    // The control (#171): with nothing out, ถัดไป is live on page one of two.
    // Without this read, a `disabled` below would be #57's end rule and not
    // this ticket's flag.
    await expect(next(page), 'ถัดไป with nothing out').toBeEnabled();

    await screen.startRemoval(page, built);
    const write = await gate(page, screen.write, isWrite);
    await panel(page).getByRole('button', { name: screen.confirm }).click();
    await write.sent;
    // The question goes away first: ยกเลิก is not disabled while a write is out,
    // and putting the box away cancels nothing that has left the browser - the
    // way in #217 left, and the one a person has (#203).
    await dismiss(page);

    // The claim, and `ถัดไป` alone. What the fixture builds is a second page,
    // not a move onto a middle one, so every row stands on page one - where
    // `disabled={busy || page <= 1}` closes `ก่อนหน้า` by #57's end rule
    // whatever the flag says, and a read of it here is an assertion that
    // cannot fail (#50, #214; the row's red came from the line below in the
    // first draft of 19 ตุลาคม 2569, which is why going red before the fix
    // licences the row and not each of its lines - #88). The component's other
    // half is held on page two by `199a`, and on the last page of the
    // department screen by `207a`'s net, where the two swap roles.
    await expect(next(page), 'ถัดไป while the removal is out').toBeDisabled();

    // Let it land, so the file leaves nothing held and the schema `hold()`
    // restores is one the route really wrote. Read the count down rather than
    // the button up: on `Rubrics` the eleventh row is the second page, so a
    // removal that lands takes the list back to one page and #57's end rule
    // answers for the flag again.
    write.open();
    await write.answered;
    await expect
      .poll(async () => (await reading(page, table)).total, {
        message: 'the count the line reads out, once the removal has landed',
      })
      .toBe(line.total - 1);
  });
}

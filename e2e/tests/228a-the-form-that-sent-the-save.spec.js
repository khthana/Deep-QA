'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const departments = require('../support/departments-screen');
const programs = require('../support/programs-screen');
const subjects = require('../support/subjects-screen');

/**
 * #228 — the fields of the form that sent the save, and of the one that did not.
 *
 * `docs/acceptance/14-departments.md`, `15-programs.md` and `16-subjects.md`,
 * one row each. Until 26 October 2569 the only control these three forms closed
 * while a save was out was *บันทึก*: the status field the ticket is named for,
 * every text box and *ยกเลิก* were all live, so what the person was looking at
 * and what was being saved could part company. On a save that succeeds the page
 * closes the form and takes the parted value with it; on a save the server
 * **refuses**, the form stays open holding a value nobody sent, and stays that
 * way until the person looks again. That refused save is the window these rows
 * are about, which is why each one holds its write with a refusal.
 *
 * ## Why the flag is the form's, which is half of what each row claims
 *
 * The owner's first answer was `busy` on every control, as `ProgramSubjectForm.js`
 * and `PloForm.js` have always had it. What sent that back was a census of the
 * press and not of the claim (#199, #221): **19 rows in two closed tickets
 * arrange their situation by pressing *ยกเลิก* while a save is out on these
 * three screens** — `142a`'s `cancelDuringSave` marks exactly these three, and
 * `146a`'s `saveAndCancel` is the whole administration block's arrangement
 * (ภาควิชา 6, หลักสูตร 5, รายวิชา 5). Three of the 19 go further and type into a
 * **second** form while the first write is still out, which `busy` on the fields
 * alone would have broken as well, `busy` being the page's flag and not the
 * form's.
 *
 * So each row below reads three things, in the order a mutant has to be able to
 * tell apart (#88):
 *
 * 1. the status field of the form that sent the save is closed;
 * 2. so is a text box of that form;
 * 3. *ยกเลิก* is **not** — the form can still be abandoned, which is what the
 *    19 rows measured and what this ticket did not take away;
 * 4. and the form opened **after** it, which sent nothing, is live while the
 *    first save is still out. That is the one a page-wide flag fails.
 *
 * ## What is not here
 *
 * The *wording* of the hint each status field now carries is a hand-walked row
 * on each of the three sheets, as the shape and wording of the control itself
 * has been since #180 — which is also why `180-the-status-field-shape.py` has no
 * mutant for the options. What an instrument can say about the hint is said once
 * and is not a row: it lands in the control's accessible name, measured on
 * 26 October 2569, which is the premise `getByRole('combobox', { name: 'สถานะ' })`
 * rests on in all three screen helpers and therefore not a claim any row of
 * theirs can hold (#85, #111).
 *
 * Nothing here writes: every save is stopped at the route with a refusal, and
 * the typing in step 4 is never saved, so there is nothing for `hold()` to put
 * back.
 */

/** This file's own refusal, so no row reads a real sentence loosely (#93). */
const REFUSED = 'คำปฏิเสธของแถวนี้เอง ไม่ได้มาจากเซิร์ฟเวอร์ (#228)';

/** Typed into the form that sent nothing, which is step 4's instrument. */
const TYPED = 'ชื่อที่พิมพ์ในฟอร์มที่ไม่ได้ส่งอะไร #228';

const SCREENS = [
  {
    name: 'ข้อมูลภาควิชา (DepartmentForm.js)',
    account: ACCOUNTS.facultyAdmin,
    open: page => departments.openDepartments(page),
    openEditor: page => departments.openEditor(page, '05'),
    write: /^\/api\/departments\/[^/]+$/,
    status: page => departments.statusField(page),
    named: 'ชื่อภาควิชา (ไทย)',
    edit: 'แก้ไขภาควิชา',
    add: 'เพิ่มภาควิชา',
  },
  {
    name: 'ข้อมูลหลักสูตร (ProgramForm.js)',
    account: ACCOUNTS.facultyAdmin,
    open: page => programs.openPrograms(page),
    openEditor: page => programs.openEditor(page, '0501'),
    write: /^\/api\/programs\/[^/]+$/,
    status: page => programs.statusField(page),
    named: 'ชื่อหลักสูตร (ไทย)',
    edit: 'แก้ไขหลักสูตร',
    add: 'เพิ่มหลักสูตร',
  },
  {
    name: 'ข้อมูลรายวิชา (SubjectForm.js)',
    account: ACCOUNTS.departmentAdmin05,
    open: page => subjects.openSubjects(page),
    // No `openEditor` in this screen's helper — `16a` presses the row itself.
    // The subject the seed files under department 05, which is the one this
    // account reaches.
    openEditor: async page => {
      await Promise.all([
        page.waitForResponse(
          answer =>
            new URL(answer.url()).pathname === '/api/subjects/01076105' &&
            answer.request().method() === 'GET',
        ),
        subjects.subjectRow(page, '01076105').getByRole('button', { name: 'แก้ไข' }).click(),
      ]);
      await expect(page.getByRole('heading', { name: 'แก้ไขรายวิชา' })).toBeVisible();
    },
    write: /^\/api\/subjects\/[^/]+$/,
    status: page => subjects.statusField(page),
    named: 'ชื่อวิชา (ไทย)',
    edit: 'แก้ไขรายวิชา',
    add: 'เพิ่มรายวิชา',
  },
];

for (const screen of SCREENS) {
  test(`${screen.name}: a save that is out closes the fields of the form that sent it, and no others`, async ({
    page,
  }) => {
    await signIn(page, screen.account);
    await screen.open(page);
    await screen.openEditor(page);

    // Read by the label's own words, which is safe while that field carries no
    // `hint`: the label wraps its control, so a hint under it would join the
    // accessible name and this read would find nothing (#180, measured for the
    // status field on 26 October 2569).
    const named = page.getByLabel(screen.named, { exact: true });
    // The precondition, asserted where it is used and not where it was arranged
    // (#51): a field that was already closed would make every read below true
    // for the wrong reason.
    await expect(screen.status(page)).toBeEnabled();
    await expect(named).toBeEnabled();

    const write = await gate(page, screen.write, isWrite, { refusal: REFUSED });
    await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await write.sent;

    // 1 and 2 — the form that sent it. Each assertion carries the string the
    // three sheets cite it by, because a citation by line number ages the day
    // anything above it grows (#173).
    await expect(screen.status(page), 'the status field of the form that sent the save').toBeDisabled();
    await expect(named, 'a text box of the form that sent the save').toBeDisabled();

    // 3 — and what it still lets the person do.
    const cancel = page.locator('form').getByRole('button', { name: 'ยกเลิก', exact: true });
    await expect(cancel).toBeEnabled();
    await cancel.click();
    await expect(page.getByRole('heading', { name: screen.edit, exact: true })).toBeHidden();

    // 4 — the form that sent nothing, with the first save still out.
    await page.getByRole('button', { name: screen.add, exact: true }).click();
    const fresh = page.getByLabel(screen.named, { exact: true });
    await expect(fresh, 'the field of a form that sent nothing').toBeEnabled();
    await fresh.fill(TYPED);
    expect(await fresh.inputValue(), 'what the fresh form accepted').toBe(TYPED);

    write.open();
    await write.answered;
  });
}

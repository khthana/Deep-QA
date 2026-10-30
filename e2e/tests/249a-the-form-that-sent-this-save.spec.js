'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isGet, isWrite } = require('../support/gate');
const { openUsers } = require('../support/users-screen');
const { openOfferings } = require('../support/offerings-screen');
const { openGroups, card, groupNames } = require('../support/groups-screen');
const improvement = require('../support/improvement-screen');
const { CARD_SCREENS, pencils, boxOf } = require('../support/card-screens');

/**
 * #249 — the form that sent a save closes its own fields, on five mechanisms.
 *
 * `docs/acceptance/11-user-accounts.md`, `23-offerings.md`, `26-work-groups.md`
 * and `41-continuous-improvement-plan.md`.
 *
 * #228, answered by the owner on 26 ตุลาคม 2569, settled the shape: **the form
 * that sent a save closes its own fields with a flag of its own while the save
 * is out, and *ยกเลิก* holds nothing.** It landed on three screens, #242
 * carried it to four more, and `save-window-fields.js` then counted what was
 * left — 57 controls in 15 files, which is this ticket.
 * `frontend/src/components/users/UserForm.js` carries the reasons for all
 * fifteen; this file holds the rows.
 *
 * ## Why five screens and not fifteen
 *
 * The census chooses the screen, not the subject (#68, #171): fifteen files
 * holding one copied shape are fifteen copies of it, and a row per copy proves
 * the copy rather than the rule. What the fifteen are **not** is uniform, and
 * these five are the five mechanisms the measurement of 30 ตุลาคม 2569 found — four
 * of them before the fix and the fifth from the full suite that evening, which
 * is the one the mount points could not be read for (see 5). Each of the other
 * ten files is one of these five by construction and says which in its own
 * docblock.
 *
 * 1. **ข้อมูลผู้ใช้งาน** — a form drawn in the half of a ternary whose other
 *    half is the list, which is nine of the fifteen. Twelve fields, a flag of
 *    the form's own, and nothing to clear it but the `finally`, because
 *    closing the form unmounts the component (#220).
 * 2. **แผนการปรับปรุงอย่างต่อเนื่อง** — the one card drawn four times on a
 *    screen that never unmounts it. Two rows: the grain of the flag, and the
 *    second way down it needs where the removal is reversed rather than
 *    completed (#227), which `150a`'s own sequence is the way in to.
 * 3. **กลุ่มงานนักศึกษา** — a page holding three forms and no component to put
 *    a flag in, so the flag holds **which** of them sent the write.
 * 4. **ตอนเรียนและผู้สอน** — the form that emptied its own field at the press.
 *    Closing a field says nothing where the value has already gone, so the
 *    claim here is the number staying in the box, and still being there when
 *    the answer is a refusal.
 * 5. **ผลการเรียนรู้รายวิชา** — a form drawn **above** its list, which is the five
 *    ผู้สอน card screens of `CARD_SCREENS`. The pencils are still on the screen
 *    while the form is open, so a press on another card arrives **while this
 *    card's save is out** and React re-renders the component instead of
 *    remounting it: the flag stays up over a card that has sent nothing. This
 *    is the state mechanism 1's reasoning says cannot happen, and it was found
 *    by the full suite of 30 ตุลาคม 2569 — ten rows of `149a` and `151a`,
 *    five screens each, every one of them dying at a `fill` and not at a claim
 *    (#139). The fix is the way back in, in the effect the subject keys, and
 *    this row is the one that reads it **as a claim**.
 *
 * ## What each row reads, and in what order
 *
 * The claim first and the reading that follows from it second (#88, #233): a
 * mutant kills the first assertion it reaches, so a claim written below another
 * claim is proved by nothing. Where a row then asserts that a neighbouring
 * field is **live**, it types into it as well as reading it — a sampler of what
 * a control holds cannot tell an absent control from an empty one (#164).
 *
 * ## What this file writes
 *
 * One row: row 2 of แผนการปรับปรุงอย่างต่อเนื่อง, for `150a`'s reason. The
 * mechanism **is** the save landing, and a write stopped at the route creates
 * nothing, so that row writes for real and `hold()` puts the entry back. Every
 * other save here is answered at the route with a crafted 200 or 409, so
 * nothing else reaches the database.
 */

/** The answer a held save is given — `146a`'s shape: a body that says nothing. */
const SAVED = {};

/** Worded so no record and no other row holds any of them (#93). */
const REFUSED = 'ไม่อนุญาตให้บันทึกรายการนี้ (แถวของ #249)';
const TYPED = 'ข้อความของฟอร์มที่ยังพิมพ์ได้ #249';
const SUMMARY_SAVED = 'ข้อความที่บันทึกไปแล้วของแถว #249';
const SUMMARY_TYPING = 'ข้อความที่พิมพ์ตอนเปิดกล่องใหม่อีกครั้ง #249';
const GROUP_TYPED = 'กลุ่มที่ยังพิมพ์ชื่อได้ #249';

/** How long a commit is given before a row reads the screen — `146a`'s number. */
const SETTLE_MS = 250;

const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const heading = (page, name) => page.getByRole('heading', { name, exact: true });

/** The first row of a list screen that offers `verb` — `142a`'s `twoRows`, halved. */
function firstRow(page, verb) {
  return page
    .locator('table')
    .first()
    .locator('tbody tr')
    .filter({ has: page.getByRole('button', { name: verb, exact: true }) })
    .first();
}

// ── 1 · ข้อมูลผู้ใช้งาน (UserForm.js) ───────────────────────────────────────

/** A user id is not digits on every account, so the shape is *one segment*. */
const USER_DETAIL = /^\/api\/users\/[^/]+$/;
const USER_LIST = /^\/api\/users$/;

test.describe('ข้อมูลผู้ใช้งาน (UserForm.js)', () => {
  test('a save that is out closes the fields of the form that sent it, and the form after it is live', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.facultyAdmin);
    await openUsers(page);

    const row = firstRow(page, 'แก้ไข');
    await expect(row).toBeVisible();
    await button(row, 'แก้ไข').click();
    await expect(heading(page, 'แก้ไขข้อมูลผู้ใช้งาน')).toBeVisible();

    const email = page.getByLabel('อีเมล', { exact: true });
    const firstName = page.getByLabel('ชื่อ (ไทย)', { exact: true });
    // The precondition, read where it is used and not where it was arranged
    // (#51): a field closed by something else would make the two reads below
    // true for a reason that is not this ticket's.
    await expect(email).toBeEnabled();
    await expect(firstName).toBeEnabled();

    const write = await gate(page, USER_DETAIL, isWrite, { success: SAVED });
    const reload = await gate(page, USER_LIST, isGet);
    await button(page, 'บันทึก').click();
    await write.sent;

    await expect(email, 'the อีเมล field of the form that sent the save').toBeDisabled();
    await expect(
      firstName,
      'the ชื่อ (ไทย) field of the form that sent the save',
    ).toBeDisabled();

    // The half a page-wide flag gets wrong, and the reason the flag is the
    // form's own: the save has landed, the form has closed, and the screen is
    // still reading its list. เพิ่มผู้ใช้งาน is disabled by nothing, so this is
    // a window a person meets with nobody else on the system.
    write.open();
    await write.answered;
    await reload.sent;
    await expect(heading(page, 'แก้ไขข้อมูลผู้ใช้งาน')).toBeHidden();

    await button(page, 'เพิ่มผู้ใช้งาน').click();
    const fresh = page.getByLabel('ชื่อ (ไทย)', { exact: true });
    await expect(fresh, 'the field of a form that sent nothing').toBeEnabled();
    await fresh.fill(TYPED);
    expect(await fresh.inputValue(), 'what the fresh form accepted').toBe(TYPED);

    reload.open();
    await reload.answered;
  });
});

// ── 2 · แผนการปรับปรุงอย่างต่อเนื่อง (EntrySection.js) ──────────────────────

const { LABELS } = improvement;
const region = (page, type) => improvement.formSection(page, type);
const editor = (page, type) => region(page, type).getByLabel(LABELS[type], { exact: true });
const start = (page, type) => button(region(page, type), `เขียน${LABELS[type]}`);

test.describe('แผนการปรับปรุงอย่างต่อเนื่อง (EntrySection.js)', () => {
  /**
   * The section both rows send their save from.
   *
   * `150a` writes in this one too and puts it back, and these rows run after
   * it; what each of them needs is a section holding nothing, which is read off
   * the screen rather than assumed of the seed (#129).
   */
  const SENDING = 'SUMMARY';

  /** The card row 1 types into while the other one's save is out. */
  const BYSTANDER = 'REFLECTION';

  let release;
  test.beforeAll(async () => {
    release = await hold();
  });
  test.afterAll(async () => {
    await release();
  });

  async function openPlan(page) {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await improvement.mySectionIds(page);
    await improvement.openPlan(page, sectionId);
  }

  test("a save that is out closes the box it was sent from and leaves another card's alone", async ({
    page,
  }) => {
    await openPlan(page);

    await expect(start(page, SENDING), 'a section nothing is written in yet').toBeVisible();
    await start(page, SENDING).click();
    await editor(page, SENDING).fill(SUMMARY_SAVED);

    const write = await gate(page, improvement.API, isWrite, { success: SAVED });
    await button(region(page, SENDING), 'บันทึก').click();
    await write.sent;

    await expect(
      editor(page, SENDING),
      'the box of the card that sent the save',
    ).toBeDisabled();

    // The grain of the flag: four cards of one component, and the one that sent
    // nothing is still being written in. A flag held by the page closes this
    // box too, which is the shape #228's answer was written against.
    await start(page, BYSTANDER).click();
    const other = editor(page, BYSTANDER);
    await expect(other, "the other card's box").toBeEnabled();
    await other.fill(TYPED);
    expect(await other.inputValue(), 'what that box accepted').toBe(TYPED);

    write.open();
    await write.answered;
  });

  test('a box opened again while the save that closed it is still out is live', async ({
    page,
  }) => {
    await openPlan(page);

    // `150a`'s sequence, which is the only way in to the second way down this
    // flag needs: the save goes through for real and the reload it ends with is
    // held, so the page's handler has not resolved and `.finally` has not run.
    // The section therefore still holds nothing and still offers เขียน.
    await expect(start(page, SENDING), 'a section nothing is written in yet').toBeVisible();
    await start(page, SENDING).click();
    await editor(page, SENDING).fill(SUMMARY_SAVED);

    const reload = await gate(page, improvement.API, isGet);
    await button(region(page, SENDING), 'บันทึก').click();
    await reload.sent;

    await expect(
      start(page, SENDING),
      'the way back in while the reload is still out',
    ).toBeVisible();
    await start(page, SENDING).click();

    const box = editor(page, SENDING);
    await expect(box, 'the box opened again under its own save').toBeEnabled();
    await box.fill(SUMMARY_TYPING);
    expect(await box.inputValue(), 'what the reopened box accepted').toBe(SUMMARY_TYPING);

    reload.open();
    await reload.answered;
    await page.waitForTimeout(SETTLE_MS);

    // And the save really did go through, so the two assertions above were
    // about something — `150a`'s guard against a row green for a reason
    // unconnected to its ticket (#51).
    await button(region(page, SENDING), 'ยกเลิก').click();
    await expect(
      region(page, SENDING).getByText(SUMMARY_SAVED),
      'the entry that save created',
    ).toBeVisible();
  });
});

// ── 3 · กลุ่มงานนักศึกษา (StudentGroups.js) ─────────────────────────────────

test.describe('กลุ่มงานนักศึกษา (StudentGroups.js)', () => {
  const PLACE = /^\/api\/teaching\/sections\/\d+\/groups\/\d+\/students$/;

  test("a placement that is out closes that card's picker and leaves สร้างกลุ่มงาน live", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await improvement.mySectionIds(page);
    await openGroups(page, sectionId);

    const [group] = await groupNames(page);
    expect(group, 'a seeded group to place somebody into').toBeTruthy();
    const picker = card(page, group).getByRole('combobox');
    const named = page.getByLabel('ชื่อกลุ่มงาน', { exact: true });
    await expect(picker, "the card's own picker").toBeEnabled();
    await expect(named, 'the สร้างกลุ่มงาน box').toBeEnabled();

    // The second option: the first is เลือกนักศึกษา…, which sends nothing. The
    // count is read rather than assumed, because `selectOption` against a
    // picker holding only that one dies at the timeout and not at a claim.
    expect(
      await picker.locator('option').count(),
      'the picker, with the roll in it',
    ).toBeGreaterThan(1);
    await picker.selectOption({ index: 1 });

    const write = await gate(page, PLACE, isWrite, { success: SAVED });
    await button(card(page, group), 'เพิ่มเข้ากลุ่ม').click();
    await write.sent;

    await expect(picker, 'the picker of the card that sent the write').toBeDisabled();
    // The flag holds which form sent it, so the other two forms this page draws
    // are live. A boolean closes all three, and สร้างกลุ่มงาน is a form nobody
    // on this screen has pressed.
    await expect(named, 'the สร้างกลุ่มงาน box while a card is placing').toBeEnabled();
    await named.fill(GROUP_TYPED);
    expect(await named.inputValue(), 'what the สร้างกลุ่มงาน box accepted').toBe(GROUP_TYPED);

    write.open();
    await write.answered;
  });
});

// ── 4 · ตอนเรียนและผู้สอน (SectionsPanel.js) ────────────────────────────────

test.describe('ตอนเรียนและผู้สอน (SectionsPanel.js)', () => {
  const SECTIONS = /^\/api\/offerings\/\d+\/sections$/;
  const NUMBER = '93';

  const sectionNumber = (page) => page.getByPlaceholder('เช่น 1 หรือ พ1');

  test('the number stays in the box while its own save is out, and survives a refusal', async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0501);
    await openOfferings(page);

    const row = firstRow(page, 'ตอนเรียนและผู้สอน');
    await expect(row).toBeVisible();
    await button(row, 'ตอนเรียนและผู้สอน').click();
    await expect(button(page, 'กลับไปหน้ารายการ')).toBeVisible();

    const box = sectionNumber(page);
    await expect(box, 'the เลขตอนเรียน box').toBeEnabled();
    await box.fill(NUMBER);

    const write = await gate(page, SECTIONS, isWrite, { refusal: REFUSED });
    await button(page, 'เพิ่มตอนเรียน').click();
    await write.sent;

    // The claim this screen is its own mechanism for: closing a field says
    // nothing where the value has already gone. Until 30 ตุลาคม 2569 this box
    // emptied itself at the press, so what was being saved was on nobody's
    // screen, and `142a`'s first row had to type the number a second time to
    // read the flag at all.
    expect(
      await box.inputValue(),
      'the number the held save was sent with',
    ).toBe(NUMBER);
    await expect(box, 'the box that sent the save').toBeDisabled();

    write.open();
    await write.answered;
    await expect(page.getByText(REFUSED)).toBeVisible();

    // And the other half of putting the clearing where the answer is: a refusal
    // leaves the person what they typed, and a box to send it again from.
    await expect(box, 'the box after the refusal').toBeEnabled();
    expect(
      await box.inputValue(),
      'the number after a refusal, which clears nothing',
    ).toBe(NUMBER);
  });
});

// ── 5 · ผลการเรียนรู้รายวิชา (CloForm.js, and the four card screens beside it) ────

/** The first of `CARD_SCREENS` — the five forms drawn above their list. */
const CARD = CARD_SCREENS[0];

test.describe(`${CARD.name} (CloForm.js)`, () => {
  test("a pencil on another card while the save is out opens that card's form live", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    await CARD.open(page);
    await expect(pencils(page).nth(1), 'a second card to press แก้ไข on').toBeVisible();

    await pencils(page).nth(0).click();
    await expect(boxOf(page, CARD.field), "the first card's box before the press").toBeEnabled();

    const write = await gate(page, CARD.api, isWrite, { success: SAVED });
    await button(page, 'บันทึก').click();
    await write.sent;
    await expect(boxOf(page, CARD.field), 'the box of the card that sent the save').toBeDisabled();

    // The claim: the pencil of a card that has sent nothing. The component is
    // not remounted here — the list is above the form, so the subject changes
    // underneath it — and the ten rows of `149a` and `151a` that this closes
    // all died at a `fill`, which is a timeout and not a claim (#139).
    await pencils(page).nth(1).click();
    await expect(
      boxOf(page, CARD.field),
      "the second card's box, opened while the first card's save is out",
    ).toBeEnabled();
    await boxOf(page, CARD.field).fill(TYPED);
    expect(await boxOf(page, CARD.field).inputValue(), 'what that box accepted').toBe(TYPED);

    write.open();
    await write.answered;
    await page.waitForTimeout(SETTLE_MS);
  });
});

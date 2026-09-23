'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isGet } = require('../support/gate');
const improvement = require('../support/improvement-screen');

/**
 * #150 — an entry arriving under an open editor does not take what is typed.
 *
 * #148 keyed `EntrySection`'s seeding on the entry's id rather than on the
 * object, so a reload that rebuilds the same entry no longer wrote the record
 * over what was being typed. The case that decision did not look at is the id
 * changing **from nothing to something** while the editor is open, which is
 * what a person's own save landing looks like from inside the box:
 *
 * 1. เขียน on a section nothing is written in, type, บันทึก.
 * 2. The save writes, the form closes, and the reload it ends with is still
 *    out. The section therefore still holds no entry, so it still offers
 *    เขียน — press it, and the editor opens on `undefined`.
 * 3. Type. The reload lands, the section comes to hold the entry step 1
 *    created, `entry_id` goes `undefined` → an id, and the effect seeds the
 *    box from `detail_text`.
 *
 * What was typed in step 3 was gone, replaced by what was saved in step 1.
 *
 * ## Why the save is not held and the reload is
 *
 * Every other row about this screen answers its write with a crafted 200 so
 * nothing reaches the database (`149a`). This row cannot: the whole mechanism
 * is the reload bringing back **an entry that now exists**, and a save stopped
 * at the route creates none. So the write goes through for real and only the
 * `GET` that follows it is held, which is why this file needs `hold()` — it is
 * one of the few that writes through the screen on purpose.
 *
 * ## The assertion that stops row 1 passing for the wrong reason
 *
 * If the save were to fail silently, the reload would bring nothing, the id
 * would stay `undefined`, the effect would never re-run, and what was typed
 * would survive — for no reason connected to this ticket, in a row that would
 * look green forever. So the row goes on to close the editor and read the
 * section, proving the entry really did arrive under it. That read is the
 * precondition asserted where it is used rather than where it is arranged
 * (#51), and without it this row is a claim about a mechanism it never built.
 *
 * ## Why there is a second row
 *
 * Telling *arriving* from *being replaced* needs a ref that remembers the id
 * the open draft was seeded from, and that ref has to be put back when the
 * editor closes or the next opening is not recognised as one. Row 2 is the row
 * that holds the putting back. It is written for the one situation where the
 * stale ref is visible: the ref holds `undefined` only where the editor was
 * opened on a section that had nothing in it, so the box that is not reseeded
 * is a box that should have gone back to empty.
 *
 * `41a` row 3 reopens an editor too and cannot see it, which is why this row
 * exists rather than leaning on that one: there the draft left behind is the
 * text that was just saved, so a box that is never reseeded shows exactly what
 * a box that is correctly reseeded would show. The two coincide, and a claim
 * only breaks where the values differ (#154).
 *
 * ## What this file does not say
 *
 * Nothing about the other way in — somebody else replacing or deleting the
 * entry under the open editor, where reseeding is arguably the right answer.
 * That is the question on #150 and it stays open; row 1 is only about the
 * arrival of the entry the person typing has just created themselves.
 */

const { LABELS } = improvement;

/** The section row 1 writes in — the only one this file writes in at all. */
const ARRIVING = 'SUMMARY';

/**
 * The section row 2 types in and abandons.
 *
 * A different one from row 1's on purpose: row 1 leaves a real entry behind
 * until `hold()` puts it back at the end of the file, and row 2 needs a section
 * that holds nothing whichever order the two run in.
 */
const ABANDONED_IN = 'REFLECTION';

/** How long the commit is given once the held answer has reached the page. */
const SETTLE_MS = 250;

/** Worded so no record and no other row holds any of them. */
const SAVED = 'ข้อความที่บันทึกไปแล้วของแถว #150';
const TYPING = 'ข้อความที่กำลังพิมพ์อยู่ตอนคำตอบเดินทางกลับ #150';
const ABANDONED = 'ข้อความที่พิมพ์ทิ้งไว้แล้วกดยกเลิกของแถวที่สอง #150';

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(async () => {
  await release();
});

const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const region = (page, type) => improvement.formSection(page, type);
const editor = (page, type) => region(page, type).getByLabel(LABELS[type], { exact: true });
const start = (page, type) => button(region(page, type), `เขียน${LABELS[type]}`);

/** Signs in and opens the plan this file's rows both work on. */
async function openPlan(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [sectionId] = await improvement.mySectionIds(page);
  await improvement.openPlan(page, sectionId);
}

test('an entry arriving under an open editor leaves what is being typed alone', async ({
  page,
}) => {
  await openPlan(page);

  // The shape the row needs, read off the screen rather than assumed of the
  // seed (#129): a section with nothing written in it, which is what makes the
  // id `undefined` when the editor opens.
  await expect(
    start(page, ARRIVING),
    'a section nothing is written in yet',
  ).toBeVisible();

  await start(page, ARRIVING).click();
  await editor(page, ARRIVING).fill(SAVED);

  // The write goes through; only the reload after it is held.
  const reload = await gate(page, improvement.API, isGet);
  await button(region(page, ARRIVING), 'บันทึก').click();
  await reload.sent;

  // The list has not landed, so the section still holds no entry and still
  // offers the way in. Pressing it opens the editor on `undefined` — step 2.
  await expect(
    start(page, ARRIVING),
    'the section while its reload is still out',
  ).toBeVisible();
  await start(page, ARRIVING).click();
  await editor(page, ARRIVING).fill(TYPING);

  reload.open();
  await reload.answered;
  await page.waitForTimeout(SETTLE_MS);

  expect(
    await editor(page, ARRIVING).inputValue(),
    'what was being typed when the entry arrived under the editor',
  ).toBe(TYPING);

  // And the entry really did arrive, so the assertion above was about
  // something. Closing the editor shows what step 1 saved.
  await button(region(page, ARRIVING), 'ยกเลิก').click();
  await expect(
    region(page, ARRIVING).getByText(SAVED),
    'the entry the save created, which the reload brought back',
  ).toBeVisible();
});

test('an editor reopened on a section that still holds nothing starts empty', async ({
  page,
}) => {
  await openPlan(page);

  await expect(
    start(page, ABANDONED_IN),
    'a section nothing is written in yet',
  ).toBeVisible();

  // Typed and thrown away. Nothing is saved, so the section holds exactly what
  // it held before — which is what makes the second opening another opening on
  // nothing, and the id `undefined` on both sides of it.
  await start(page, ABANDONED_IN).click();
  await editor(page, ABANDONED_IN).fill(ABANDONED);
  await button(region(page, ABANDONED_IN), 'ยกเลิก').click();
  await expect(
    start(page, ABANDONED_IN),
    'the section after the editor was abandoned',
  ).toBeVisible();

  await start(page, ABANDONED_IN).click();
  expect(
    await editor(page, ABANDONED_IN).inputValue(),
    'the box a second เขียน opens, on a section that still holds nothing',
  ).toBe('');
});

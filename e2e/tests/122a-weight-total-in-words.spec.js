'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  openWeights,
  mySectionIds,
  weightInput,
  totalLine,
} = require('../support/weights-screen');
const {
  openActivities,
  openEditor,
  fillActivity,
  cloRow,
} = require('../support/activities-screen');

/**
 * A running total that is only a colour — ticket #122.
 *
 * Two screens draw a weight total against a hundred and say whether it is
 * acceptable by **changing the colour of the number and nothing else**. The
 * text does not change, the structure does not change, and nothing announces.
 * Somebody who cannot tell the two shades apart — and red against green is the
 * common one — reads *รวม 120 / 100* exactly as they read *รวม 80 / 100*, and
 * presses บันทึก none the wiser. #38 got this right for the heatmap: a person
 * who cannot see a shade still needs the fact.
 *
 * ## The two screens do not share a rule, so they do not share a sentence
 *
 * The ticket describes one defect on two screens and it is really two, which
 * is the half of it worth keeping:
 *
 * - **สัดส่วนคะแนน (#30)** must total *exactly* 100 — `น้ำหนักทุกหมวดรวมกัน
 *   ต้องเท่ากับ 100 จึงจะบันทึกได้`. Three states, and short is as unsaveable
 *   as over. Its colour was `green when exactly 100, red otherwise`, so the
 *   colour there never meant *over* at all.
 * - **The Activity editor (#33)** must total *at most* 100 — a share of a mark
 *   cannot exceed the whole, but a half-finished attribution is legal and
 *   saveable, as that form's own docstring says. Two states.
 *
 * A single sentence written from the ticket's account would be wrong on one of
 * them. Rows 1 and 2 are what pin the difference: 100 on the scheme is the
 * saveable state and says so, 100 in the editor is unremarkable and says
 * nothing.
 *
 * ## What this file asserts, and what it cannot
 *
 * That the words are on the screen, and that the element carrying them is a
 * polite live region. **Whether a screen reader reads them out is a different
 * claim and is not here** — the two sheets carry it as a ◐ for an ear, the way
 * #85 and #111 left theirs.
 *
 * ## Why the sentences are typed out here rather than imported
 *
 * 33a row 4's lesson. A constant shared between the screen and the row moves
 * on both sides at once, and the row would go on passing while the words
 * changed underneath it. These are the words a person reads, so they are
 * written where a reader of this file can see them.
 *
 * ## Nothing here is saved
 *
 * Every row edits a draft and leaves. The scheme is one shared row set with a
 * restore discipline in `30a`, and the editor's saves are `33a`'s business;
 * this file touches neither, so it can run beside them in any order.
 */

const SHORT = 'ยังไม่ถึง 100 จึงยังบันทึกไม่ได้';
const OVER = 'เกิน 100 จึงยังบันทึกไม่ได้';
const DONE = 'ครบ 100 แล้ว บันทึกได้';

/**
 * The sentence, found by the words a person reads.
 *
 * Deliberately **not** found by `aria-live`: #85 moved a locator onto the
 * attribute it was testing and the attribute stopped being falsifiable —
 * every row that mentioned the banner then failed together and proved nothing
 * about any of them. Found by text, the attribute below is a claim these rows
 * make rather than the premise they stand on.
 */
const said = (page, words) => page.getByText(words, { exact: true });

/** Announced, and announced politely — the decision #122 made once. */
async function isPoliteLiveRegion(sentence) {
  await expect(sentence).toBeVisible();
  await expect(sentence).toHaveAttribute('aria-live', 'polite');
  // Not the assertive one. A total that changes while somebody is typing is
  // the case #111's own §Note on scope set aside as *not* the alert case, and
  // `role="alert"` here would cut a reader off on every keystroke.
  expect(await sentence.getAttribute('role')).toBeNull();
}

test('row 1: the scheme says which side of a hundred it is on, in words', async ({ page }) => {
  // สัดส่วนคะแนน, all three states. The seeded scheme totals 100, so the row
  // starts on the state the other two are read against.
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  await openWeights(page, section);

  await expect(totalLine(page)).toHaveText('รวม 100 / 100');
  await isPoliteLiveRegion(said(page, DONE));

  // Short of a hundred is refused just as firmly as over, and the old colour
  // said nothing about which of the two this was.
  await weightInput(page, 3).fill('20');
  await expect(totalLine(page)).toHaveText('รวม 90 / 100');
  await isPoliteLiveRegion(said(page, SHORT));

  // Over, from the short state rather than from the seeded one — 60 + 30 + 20.
  await weightInput(page, 1).fill('60');
  await expect(totalLine(page)).toHaveText('รวม 110 / 100');
  await isPoliteLiveRegion(said(page, OVER));

  // One sentence at a time: a screen holding both would be a screen that
  // announced a state it had left.
  expect(await said(page, SHORT).count()).toBe(0);
  expect(await said(page, DONE).count()).toBe(0);
});

test('row 2: the editor speaks only when the share exceeds the whole', async ({ page }) => {
  // The same defect on the other screen, under the other rule. Nothing is
  // saved: the draft is typed, read and abandoned.
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  await openActivities(page, section);
  await openEditor(page);

  await fillActivity(page, { clos: [{ weight: 60 }, { weight: 50 }] });
  await expect(cloRow(page, 2).weight).toHaveValue('50');
  await isPoliteLiveRegion(said(page, OVER));

  // Back to exactly a hundred, which on this screen is ordinary rather than
  // an achievement — this is the assertion that stops #30's three-state
  // sentence being copied onto a two-state screen.
  await cloRow(page, 2).weight.fill('40');
  await expect(cloRow(page, 2).weight).toHaveValue('40');
  expect(await said(page, DONE).count()).toBe(0);
  expect(await said(page, OVER).count()).toBe(0);

  // And under a hundred is a legal, saveable, half-finished attribution, so
  // it is not announced either. Read once at a settle point rather than left
  // to a retrying negative — #50's rule, kept even where the element is not
  // one that removes itself.
  await cloRow(page, 2).weight.fill('10');
  await expect(cloRow(page, 2).weight).toHaveValue('10');
  expect(await said(page, SHORT).count()).toBe(0);
  expect(await said(page, OVER).count()).toBe(0);

  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
});

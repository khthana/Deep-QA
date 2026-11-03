'use strict';

const { test, expect } = require('@playwright/test');
const { PROGRAMS } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { linesOf } = require('../support/line-breaks');
const { actingButton, navbar } = require('../support/shell');

/**
 * #261 — the role picker's label is drawn on one line, so the button stays
 * inside the bar.
 *
 * #231 put the scope's name in the label on 27 October 2569, and the longest
 * name in this organisation made the label wrap: the button went to 68px in a
 * bar that is 64px, over the top by 2px and under the bottom by 2px. The walk
 * of `docs/acceptance/10-application-shell.md` row 3 found it on
 * 2 November 2569, which is what that row's own ☐ was citing.
 *
 * Every number the fix could have moved is one the **delivered** screen chose:
 * `DEEP-QA-FRONTEND/src/components/RoleDropdown.js` writes the same
 * `px-5 py-2.5` and the same absent `whitespace-nowrap`, and drew a scope in
 * the trigger too - `ชื่อ - ปี`, which is longer again. So the rebuild walked
 * into this rather than causing it (#103), and which wording the person reads
 * was the owner's to choose (`docs/06` §Out of Scope).
 *
 * The owner answered **จ** on 3 November 2569, with every option priced off a
 * screen by `e2e/probes/261-the-button-in-the-bar.spec.js`: `whitespace-nowrap`
 * with no cut, and the narrow widths as their own ticket. What that probe read
 * at 1280 and at 1024 - the widths this suite and the hand-walks use - is the
 * button coming inside the bar with 10px of air above and below, while the
 * logo's 156px and the user name's 129×24 stay what they are today, to the
 * pixel. Below 1024 the two sides do give room up, and there the probe read the
 * same bar **already** wrapping the user's name at 768 and already squeezing
 * the logo at 640 with no `nowrap` anywhere - a defect of the bar and not of
 * this button, which is why it is #264 and not a reason to cut the label.
 *
 * ## What each row is for
 *
 * The two claims are two rows because one mutant kills whichever is read
 * first, and a claim written below another claim is proved by nothing (#88).
 * Row 1 is the drawing - the label on one line - and row 2 is the consequence
 * the ticket is about, the button's box inside the bar's.
 *
 * **Row 2 holds one claim with two halves, in one assertion, and the first
 * draft of it held three.** It read the heights first and then each bound, so
 * the sheet's only mutant died at the height and neither bound was ever read -
 * #88 inside one row, which no kill count can show (#233). Two rows would be
 * wrong too: the defect pushes the button through the top **and** the bottom at
 * once, so no mutant can tell the halves apart, and two rows would be two
 * claims neither of which can be shown to be held (#97). The height comparison
 * is gone because the bounds imply it.
 *
 * Row 2 asserts the **relation** and not a height: a row that pinned 44px
 * would hold today's value rather than the rule, and the rule is that the
 * button fits whatever the bar is (#145). The bar's own height is read into
 * the message so a failure prints both numbers.
 *
 * Row 1 asks `support/line-breaks.js`, which `e2e/README.md` makes the
 * instrument for *did this come apart*: it walks every text node and compares
 * each character's own `top`. The first draft of this row counted
 * `getClientRects()` on the first text node inline, which is both a copy of a
 * shared instrument (#171) and a weaker reading of it.
 *
 * Neither row reads the colours, the wording, or whether the open menu is in
 * frame. Those are what a person looks at, and they stay on row 3 of the
 * shell's sheet.
 */

const SCOPE = '0503';

/** The seeded name, read where it is decided rather than retyped (#118). */
const LONGEST = PROGRAMS.find(entry => entry.id === SCOPE).th;

/**
 * Both rows' arrangement: the one account whose scope carries the long name.
 *
 * The `toContainText` is the precondition that would make either row a lie.
 * The fix cannot change the text, so reading it above the claim is safe here
 * (#233) - and it is the assertion `231`'s mutants die at, which is why
 * neither of those two proves anything about this sheet.
 */
const openTheBar = async page => {
  await signIn(page, ACCOUNTS.committee0503);
  const button = actingButton(page);
  await expect(button).toBeVisible();
  await expect(button).toContainText(LONGEST);
  return button;
};

test('row 1 (#261): the longest label is drawn on one line', async ({
  page,
}) => {
  const button = await openTheBar(page);

  const lines = await linesOf(button);
  expect(lines, `the label ${LONGEST} must not wrap`).toHaveLength(1);
});

test('row 2 (#261): the button stays inside the bar', async ({ page }) => {
  const button = await openTheBar(page);

  const outer = await navbar(page).boundingBox();
  const inner = await button.boundingBox();
  const past = {
    overTheTop: Math.max(0, Math.round(outer.y - inner.y)),
    underTheBottom: Math.max(
      0,
      Math.round(inner.y + inner.height - (outer.y + outer.height))
    ),
  };

  expect(
    past,
    `the button is ${Math.round(inner.height)}px in a bar of ${Math.round(outer.height)}px`
  ).toEqual({ overTheTop: 0, underTheBottom: 0 });
});

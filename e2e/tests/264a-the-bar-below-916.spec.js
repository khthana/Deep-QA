'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS: SEEDED } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { linesOf } = require('../support/line-breaks');
const { actingButton, committeeLabel, navbar } = require('../support/shell');

/**
 * #264 — below 916px the role picker cuts its own label, so the logo and the
 * user's name keep theirs.
 *
 * The bar's three boxes are a left third, a middle that holds the picker and a
 * right third, and as the window narrows something has to give. Today it is the
 * two sides: the name goes to two lines at 916, the logo loses its first pixel
 * at 857, the name is on three lines at 791 and the row overflows at 659. The
 * picker gives up nothing, because #261 made its label `whitespace-nowrap` and
 * nothing cuts it.
 *
 * Every number any option could move is one the **delivered** screen chose -
 * `DEEP-QA-FRONTEND/src/components/Navbar.js` writes the same `h-[64px]`
 * (`:140`) and the same two `w-1/3` columns (`:143`, `:167`) - so which box
 * pays was the owner's to answer and not a defect to fix (`docs/06` §Out of
 * Scope). Each option was priced off a screen by
 * `e2e/probes/264-the-bar-at-narrow-widths.spec.js` and the owner answered
 * **จ-ค ที่ 916** on 3 November 2569: above 916 nothing changes from today by
 * so much as a pixel, and below it the picker elides its label while the two
 * sides keep their boxes.
 *
 * ## What each row is for
 *
 * The rule has a gate and a mechanism, and they fail in opposite directions, so
 * one row cannot hold both: a fix that cut at every width would pass a row read
 * only at 916, and a fix that cut nowhere would pass a row read only at 1280.
 * Row 1 is the gate, rows 2 and 3 the mechanism.
 *
 * Row 1's *every box is what it was* half is true of today's code as well, so
 * what proves that half is its mutant - the owner's answer with the gate taken
 * off, which is the ungated option made to run (#48) - and not a run against
 * the unfixed tree (#203). Its other half, that the label has a box of its own
 * and nothing in it is hidden, does fail today: unfixed there is no box at all
 * and `cut` reads `null`.
 *
 * The owner's answer has a third clause - *the bar stays 64px tall at every
 * width* - and it is the clause that tells จ-ค from จ-ง, so rows 2 and 3 read it
 * too: the bar's own height, and whether the picker is still drawn inside it.
 * `261a` holds that relation at one width only, having set no viewport, which is
 * a width above the boundary; below it nothing read it until the review of
 * 3 November 2569 asked. On row 1 the mutant that puts it at risk is
 * `261:labelwraps`, re-aimed by this ticket, which reads `inside false` at 917
 * and 1280 and kills it.
 *
 * On rows 2 and 3 those two keys are a **net**, and the re-sweep is what said
 * so against a prediction that they would die there too: Tailwind's `truncate`
 * is `overflow: hidden` **and** `text-overflow: ellipsis` **and**
 * `white-space: nowrap`, so below the gate the label states #261's protection
 * on itself and no mutant of either sheet can make it wrap - 261's own takes
 * the class off the button, which is where the gate has already handed the
 * question to the span. The keys stay, because they are two of the three
 * clauses of the owner's answer and the net is what says nothing holds them
 * (#47, #203); the condition that would make them provable is a mutant that
 * takes `truncate` off the span while leaving its box, and that one is also
 * the mutant the hand-walked row exists for (#102).
 *
 * Rows 2 and 3 are **two claims and not one claim at two widths**. At 916 what
 * was wrong was the name's second line; at 791 the logo had lost 34px as well,
 * and the name was on three lines. They are two defects of the same bar, and a
 * mutant that cut the label only a little would kill the second and leave the
 * first standing.
 *
 * Each row reads 1280 first and compares, rather than pinning 156 and 129: the
 * rule is that the sides keep whatever they have above the boundary, not that
 * the logo is 156px (#145). The numbers are printed into the message so a
 * failure says which box moved.
 *
 * ## What these rows do not say
 *
 * The ellipsis itself is appearance - whether a person reads `…` as *there is
 * more* - and stays a hand-walked row on
 * `docs/acceptance/10-application-shell.md`. These rows read the **mechanism**:
 * the label's own box is too small for its text, which is what puts the glyphs
 * away and is the thing a browser can answer.
 *
 * Below 660 the room runs out whatever is cut - with the fix in, the probe read
 * the logo at 137 and the name on two lines at 659 - and nothing here claims
 * otherwise. The owner's answer reaches the widths above that, and the narrow
 * end is the half `docs/acceptance/10-application-shell.md` row 3 still
 * carries. The first draft of this paragraph said *the row 25px over at 659*,
 * which was the **unfixed** reading: the review of 3 November 2569 asked, and
 * the repaired probe says the row does not overflow at 659 at all any more.
 * What is left at that end is the logo, 156 down to 768 and losing its first
 * pixel at 710, where unfixed it lost one at 857.
 *
 * `readBar` here and the probe's are two readers of one bar with the same name,
 * and they are not merged: the probe is an instrument and these are claims, so
 * a fixture a second file needs is shared and an assertion is not (#68, #171).
 * This one reads what the owner's answer is about and nothing else; the probe
 * reads eleven properties of five candidates.
 *
 * The gate is a rule about the **layout** viewport, which is what a media query
 * reads and also what makes the name wrap, so the two meet exactly: measured on
 * 3 November 2569, `(max-width: 916px)` is true at 916 and false at 917, and
 * the name goes to two lines at 916 and not at 917. On a screen that has a
 * vertical scrollbar the layout viewport is some 15px narrower than the window,
 * so the cut starts that much sooner in window pixels - the same 15px the
 * wrapping starts sooner by. This landing has no vertical scrollbar at 720px
 * tall, which is why these rows can name window widths at all.
 */

/** The one width above the boundary this suite and the hand-walks both use. */
const WIDE = 1280;

/** The boundary, from the probe's bisection: the first width that was wrong. */
const BOUNDARY = 916;

/** One width above it, where the owner's answer says nothing may change. */
const ABOVE = 917;

/** Well below it, where the logo had lost 34px as well. */
const NARROW = 791;

const person = SEEDED.find(account => account.alias === 'U_COM2');

/**
 * The name as the bar draws it: the title and then the two names, which
 * `Navbar.js` writes as `{title_th}{first last}` with no space after the title.
 *
 * Read out of `db/seed.js` rather than retyped, for `261a`'s reason (#118), and
 * compared as text and never as a pattern - this one holds no brackets, but the
 * label beside it does and that is the file's convention (#231).
 */
const NAME = `${person.th[0]}${person.th[1]} ${person.th[2]}`;

/**
 * Everything the owner's answer is about, in one reading.
 *
 * The label's own element is located **by the element** and not by what a
 * person reads, which is worth saying out loud: the label is the picker's only
 * `<span>`, the other child being the chevron's `<svg>`. That is a
 * discriminator rather than a description, like `support/shell.js`' avatar
 * button, and if the trigger ever gains a second span this is the line that
 * will need a real one. There is no alternative here, because the element
 * exists for this rule: a bare text node is an anonymous flex item and has no
 * box a reader can ask about at all, which is why the fix had to wrap it.
 *
 * `cut` is the mechanism and not the glyphs: the box the label is drawn in is
 * narrower than the text it holds. Above the boundary the element carries no
 * `overflow`, so the two are equal and nothing is hidden.
 *
 * The logo's and the name's boxes are read without counting, so their absence
 * is asserted in `barAt`, at the settle point, rather than throwing inside this
 * reader: that is #139's rule from the other side, and the review of
 * 3 November 2569 asked for it. Those two are preconditions the fix cannot
 * change, and no mutant of this sheet takes either away, so they cannot hide a
 * claim below them (#233).
 *
 * The box is **counted before it is read**, and `cut` is `null` where there is
 * none. A read of something that may not exist is a wait and not an assertion:
 * it dies at the timeout, which is what a mutant that stopped the application
 * would do too (#139). With the count, a tree whose label has no box of its own
 * fails in a second at the claim, printing `label cut null`.
 */
async function readBar(page) {
  const button = actingButton(page);
  const bar = navbar(page);
  const label = button.locator('span');
  const logo = bar.locator('img[alt="Logo"]');
  const name = bar.getByText(NAME);
  const widthOf = async locator =>
    Math.round((await locator.boundingBox()).width);
  const labelBoxes = await label.count();
  const [barBox, pickerBox] = [await bar.boundingBox(), await button.boundingBox()];
  return {
    picker: await widthOf(button),
    logo: await widthOf(logo),
    name: await widthOf(name),
    nameLines: (await linesOf(name)).length,
    bar: Math.round(barBox.height),
    insideBar:
      pickerBox.y >= barBox.y &&
      pickerBox.y + pickerBox.height <= barBox.y + barBox.height,
    cut:
      labelBoxes === 1
        ? await label.evaluate(
            element => element.scrollWidth - element.clientWidth > 0
          )
        : null,
  };
}

const line = read =>
  `picker ${read.picker} · logo ${read.logo} · name ${read.name} on ` +
  `${read.nameLines} · bar ${read.bar} · inside ${read.insideBar} · ` +
  `label cut ${read.cut}`;

/**
 * Both readings of one row.
 *
 * The reload after each resize is the settle point, and it is the probe's: a
 * media query is applied at layout, but the bar's own drawing is React's, and
 * reading a resized page without reloading it would be reading whatever the
 * previous width left (#188). The label's text is asserted on the way in - the
 * precondition that would make every number below a lie, and one the fix cannot
 * change (#233).
 */
const barAt = async (page, widths) => {
  const readings = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 720 });
    await page.reload();
    const button = actingButton(page);
    await expect(button).toBeVisible();
    await expect(button).toContainText(committeeLabel('0503'));
    await expect(navbar(page).locator('img[alt="Logo"]')).toBeVisible();
    await expect(navbar(page).getByText(NAME)).toBeVisible();
    readings.push(await readBar(page));
  }
  return readings;
};

test('row 1 (#264): above 916 the bar is what it was', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0503);

  const [wide, above] = await barAt(page, [WIDE, ABOVE]);

  expect(
    { above, cutAtWide: wide.cut },
    `at ${ABOVE}px the bar reads ${line(above)}, at ${WIDE}px ${line(wide)}`
  ).toEqual({ above: { ...wide, cut: false }, cutAtWide: false });
});

test('row 2 (#264): at 916 the picker gives up the room, not the name', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0503);

  const [wide, boundary] = await barAt(page, [WIDE, BOUNDARY]);

  expect(
    {
      cut: boundary.cut,
      pickerIsNarrower: boundary.picker < wide.picker,
      logoKeepsIt: boundary.logo === wide.logo,
      nameKeepsIt: boundary.name === wide.name,
      nameLines: boundary.nameLines,
      bar: boundary.bar,
      insideBar: boundary.insideBar,
    },
    `at ${BOUNDARY}px the bar reads ${line(boundary)}, at ${WIDE}px ${line(wide)}`
  ).toEqual({
    cut: true,
    pickerIsNarrower: true,
    logoKeepsIt: true,
    nameKeepsIt: true,
    nameLines: 1,
    bar: 64,
    insideBar: true,
  });
});

test('row 3 (#264): at 791 the logo and the name are still whole', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0503);

  const [wide, narrow] = await barAt(page, [WIDE, NARROW]);

  expect(
    {
      cut: narrow.cut,
      logoKeepsIt: narrow.logo === wide.logo,
      nameKeepsIt: narrow.name === wide.name,
      nameLines: narrow.nameLines,
      bar: narrow.bar,
      insideBar: narrow.insideBar,
    },
    `at ${NARROW}px the bar reads ${line(narrow)}, at ${WIDE}px ${line(wide)}`
  ).toEqual({
    cut: true,
    logoKeepsIt: true,
    nameKeepsIt: true,
    nameLines: 1,
    bar: 64,
    insideBar: true,
  });
});

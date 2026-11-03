'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { linesOf } = require('../support/line-breaks');
const { actingButton, navbar } = require('../support/shell');

/**
 * #261 — the role picker's box against the bar's, measured rather than
 * reasoned about, so the owner's question carries prices read off a screen
 * (#77, #141, #163).
 *
 * This is an instrument, not a row: it prints, and asserts only the
 * preconditions that would make a printed number a lie. Nothing in the
 * repository runs it — copy it into `e2e/tests/` to run it:
 *
 * ```
 * cp e2e/probes/261-the-button-in-the-bar.spec.js e2e/tests/261probe.spec.js
 * npx playwright test tests/261probe --reporter=line
 * rm e2e/tests/261probe.spec.js
 * ```
 *
 * ## What it reads, and why each reading is there
 *
 * The ticket's own numbers are a claim like any other (#66), and three of its
 * claims need a screen to settle:
 *
 * 1. **The overflow.** 68px in a 64px bar, read for every grant whose label
 *    carries a scope — the two the ticket walked and the two it did not. It
 *    reads the label **off the screen** rather than from the ticket's table,
 *    because that table names a role the code does not write.
 *
 * 2. **Option ข's unmeasured number** — *at what length does the button cover
 *    the user's name on the right?* The reading is of the bar's own layout,
 *    not of a width: `Navbar.js` gives the two sides `w-1/3` and the picker the
 *    middle, so nothing here is positioned and nothing can overlap. What a
 *    `whitespace-nowrap` with no cut does instead is **take** the width, and
 *    the question becomes what the two sides lose. So the probe applies the
 *    candidate and reads all four boxes again.
 *
 * 3. **What one line would cost.** The width the label needs unbroken, which
 *    is what any cut has to be measured against, and the room the middle third
 *    has. The text is measured in a span of its own carrying the button's own
 *    computed font, rather than by typing into the live button: a write to the
 *    DOM React owns is a claim about React's next render (#188), and the
 *    question here is about the text, not about the component.
 *
 * It does not ask whether the label *should* carry the scope. That is #231's
 * answer of 27 October 2569 and the delivered screen's own behaviour, and the
 * owner is the one who moves it (`docs/06` §Out of Scope).
 *
 * It writes nothing: every account only signs in and reads.
 */

/** The grants whose label carries a scope, and so can wrap — plus one that cannot. */
const WHO = [
  ['committee0501', 'PROG_MANAGER over 0501 — the short name'],
  ['committee0503', 'PROG_MANAGER over 0503 — the name the ticket walked'],
  ['multiRole', 'several grants — the ticket read 1 line, 44px here'],
  ['externalAssessor', 'EXT_ASSESSOR — the other role that draws a scope'],
];

/** Box of a locator, rounded, so the print is readable. */
async function box(locator) {
  const value = await locator.boundingBox();
  if (!value) return null;
  return {
    x: Math.round(value.x),
    y: Math.round(value.y),
    w: Math.round(value.width),
    h: Math.round(value.height),
  };
}

/**
 * How many lines the button's own text is drawn on.
 *
 * `support/line-breaks.js` is the instrument `e2e/README.md` names for *did
 * this come apart*, and it reads each character's own `top`, which is a
 * stronger reading than the client rects of one text node - the first draft of
 * this probe had its own copy of the weaker one, and a shared instrument is
 * not a claim of any sheet (#171). Read from the glyphs and never from the
 * height, because the height is what the ticket is asking about and deriving
 * the line count from it would be the same number twice.
 */
const lineCount = async locator => (await linesOf(locator)).length;

/** The width that text needs unbroken, in the button's own font. */
const unbrokenWidth = (locator, label) =>
  locator.evaluate((node, text) => {
    const style = getComputedStyle(node);
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.visibility = 'hidden';
    span.style.whiteSpace = 'nowrap';
    span.style.font = style.font;
    span.style.letterSpacing = style.letterSpacing;
    span.textContent = text;
    document.body.appendChild(span);
    const width = span.getBoundingClientRect().width;
    span.remove();
    const pad =
      parseFloat(style.paddingLeft) +
      parseFloat(style.paddingRight) +
      parseFloat(style.borderLeftWidth) +
      parseFloat(style.borderRightWidth);
    return { text: Math.round(width), padding: Math.round(pad) };
  }, label);

/** Everything the bar is made of, in one reading. */
async function readBar(page) {
  const bar = navbar(page);
  const button = actingButton(page);
  const logo = bar.locator('img[alt="Logo"]');
  const name = bar.locator('span.text-white').first();
  return {
    nav: await box(bar),
    button: await box(button),
    logo: await box(logo),
    name: await box(name),
    lines: await lineCount(button),
    label: (await button.textContent()).trim(),
  };
}

const show = (who, when, read) => {
  const over = read.nav.y - read.button.y;
  const under = read.button.y + read.button.h - (read.nav.y + read.nav.h);
  console.log(
    `${who} · ${when}\n` +
      `  label   ${read.label}\n` +
      `  lines   ${read.lines}   button ${read.button.w}x${read.button.h}` +
      ` at (${read.button.x},${read.button.y})\n` +
      `  nav     ${read.nav.w}x${read.nav.h} at (${read.nav.x},${read.nav.y})` +
      `   overflow above ${over} below ${under}\n` +
      `  logo    right edge ${read.logo.x + read.logo.w}\n` +
      `  name    ${read.name.w}x${read.name.h} at (${read.name.x},${read.name.y})`
  );
};

/**
 * How wide the picker can get before the two sides lose anything — option
 * ข's own question, asked of the layout rather than of a width.
 *
 * The label is grown with `textContent`, which is a write to the DOM React
 * owns: it holds only until React's next render, and nothing here causes one
 * (the trigger's text is `label(worn)` and no state moves while this runs).
 * The read is taken in the same turn, and the precondition that the text
 * landed is asserted, so a write React undid cannot print as a width (#188,
 * #164).
 *
 * The number it is looking for is the point at which the right column, which
 * is `justify-end`, has to give up room it was using - the name's own box
 * moving or wrapping - not the point at which the button is wide, because a
 * wide button in a column with slack costs nobody anything.
 */
test('261 · how wide the picker gets before the name is squeezed', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0503);
  const button = actingButton(page);
  await expect(button).toBeVisible();
  await button.evaluate(node => node.classList.add('whitespace-nowrap'));

  const start = await readBar(page);
  console.log(
    `start   button ${start.button.w}   name ${start.name.w}x${start.name.h}` +
      ` at (${start.name.x},${start.name.y})   logo right ${start.logo.x + start.logo.w}`
  );

  const grown = [];
  for (let repeat = 1; repeat <= 12; repeat += 1) {
    const text = `${start.label} ${'วิศวกรรม'.repeat(repeat)}`;
    await button.evaluate((node, value) => {
      node.textContent = value;
    }, text);
    expect((await button.textContent()).trim()).toBe(text.trim());
    const read = await readBar(page);
    grown.push({ chars: text.length, read });
    const squeezed =
      read.name.x !== start.name.x ||
      read.name.h !== start.name.h ||
      read.logo.x + read.logo.w !== start.logo.x + start.logo.w;
    console.log(
      `  ${String(text.length).padStart(3)} chars   button ${read.button.w}` +
        `   lines ${read.lines}   name ${read.name.w}x${read.name.h}` +
        ` at (${read.name.x},${read.name.y})` +
        `   logo right ${read.logo.x + read.logo.w}` +
        `   squeezed ${squeezed}`
    );
    if (squeezed) break;
  }
  const last = grown[grown.length - 1];
  console.log(
    `stopped at ${last.chars} chars, button ${last.read.button.w}px;` +
      ` the longest seeded label needs ${start.button.w}px`
  );
});

/**
 * The same bar at three widths, because a rule about layout is checked with
 * numbers and the one viewport the suite runs at is one sample (#111, #122).
 *
 * 640px is below Tailwind's `sm`, where `Navbar.js` hides the user's name
 * altogether, so the right column holds the avatar alone - which is why it is
 * one of the three.
 */
for (const width of [1280, 1024, 768, 640]) {
  test(`261 · the 0503 label at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await signIn(page, ACCOUNTS.committee0503);
    const button = actingButton(page);
    await expect(button).toBeVisible();

    // Both halves print the same boxes, because what the sides lose at a
    // narrow width is a question about the cause and needs its control group
    // (#194): the logo and the name are already being squeezed at 768 today.
    const sides = read =>
      `button left ${read.button.x} right ${read.button.x + read.button.w}` +
      `   logo ${read.logo ? `${read.logo.w} right ${read.logo.x + read.logo.w}` : 'not drawn'}` +
      `   name ${read.name ? `${read.name.w}x${read.name.h} at ${read.name.x}` : 'not drawn'}`;

    const today = await readBar(page);
    const over = today.nav.y - today.button.y;
    const under = today.button.y + today.button.h - (today.nav.y + today.nav.h);
    console.log(
      `${width} · today    lines ${today.lines}   button ${today.button.w}x${today.button.h}` +
        ` at (${today.button.x},${today.button.y})   overflow above ${over} below ${under}
` +
        `         ${sides(today)}`
    );

    await button.evaluate(node => node.classList.add('whitespace-nowrap'));
    const read = await readBar(page);
    const above = read.nav.y - read.button.y;
    const below = read.button.y + read.button.h - (read.nav.y + read.nav.h);
    const bar = read.nav;
    console.log(
      `${width} · nowrap   lines ${read.lines}   button ${read.button.w}x${read.button.h}` +
        ` at (${read.button.x},${read.button.y})   overflow above ${above} below ${below}
` +
        `         ${sides(read)}   bar ${bar.x}..${bar.x + bar.w}` +
        `   past the bar ${read.button.x < bar.x || read.button.x + read.button.w > bar.x + bar.w}` +
        `   page scrolls sideways ${await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        )}`
    );
  });
}

/**
 * The candidate the ticket does not list: a cut, with the column allowed to
 * shrink, so no width has to be chosen - and what it costs in markup.
 *
 * Option ก is `nowrap` plus `truncate` at *a* width, and the ticket leaves
 * that width open. The layout already knows it: `Navbar.js` gives the two sides
 * `w-1/3` and the picker the middle, and a flex item with `min-w-0` cuts at
 * whatever the row has left rather than at a number somebody picked (#247,
 * #156 - the option nobody listed comes out of the remeasurement).
 *
 * The first version of this arm put `min-w-0` on `node.parentElement` and read
 * *nothing bought*: the button's parent is `RoleDropdown`'s own `relative`
 * div, not the nav's `flex justify-center` column, so the class landed and the
 * property it was asserted on was the wrong element's. The arrangement built to
 * measure a candidate is a claim like the instrument (#260), and the
 * precondition passed either way, so only reading the component said so.
 *
 * What the real arrangement needs, which is the candidate's price in markup
 * and not in classes:
 *
 * - the label **wrapped in an element of its own.** The button is itself
 *   `flex`, so the label is a bare text node beside the chevron - an anonymous
 *   flex item, which no class can reach. `truncate` on the button cuts nothing.
 * - `min-w-0` on every box between the nav's flex row and the label, because a
 *   flex item's floor is its min-content width unless each ancestor gives it up.
 */
for (const width of [1280, 1024, 768, 640]) {
  test(`261 · a cut with a shrinkable column at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 720 });
    await signIn(page, ACCOUNTS.committee0503);
    const button = actingButton(page);
    await expect(button).toBeVisible();

    const today = await readBar(page);

    const landed = await button.evaluate(node => {
      const text = [...node.childNodes].find(child => child.nodeType === 3);
      const span = document.createElement('span');
      span.textContent = text.textContent;
      span.style.minWidth = '0';
      span.style.overflow = 'hidden';
      span.style.textOverflow = 'ellipsis';
      span.style.whiteSpace = 'nowrap';
      text.replaceWith(span);
      for (let box = node; box; box = box.parentElement) {
        box.style.minWidth = '0';
        if (box.matches('nav')) break;
      }
      const style = getComputedStyle(span);
      return {
        said: span.textContent,
        whiteSpace: style.whiteSpace,
        ellipsis: style.textOverflow,
        buttonMin: getComputedStyle(node).minWidth,
        columnMin: getComputedStyle(node.parentElement.parentElement).minWidth,
        clipped: span.scrollWidth - span.clientWidth,
        shown: span.getBoundingClientRect().width,
        lines: span.getClientRects().length,
      };
    });
    // Each property the candidate is made of, read back off the element it was
    // meant to change: a class that landed on the wrong box reads exactly like
    // a candidate that buys nothing (#156, #260).
    expect(landed.whiteSpace).toBe('nowrap');
    expect(landed.ellipsis).toBe('ellipsis');
    expect(landed.buttonMin).toBe('0px');
    expect(landed.columnMin).toBe('0px');
    expect(landed.said).toContain('0503');

    const read = await readBar(page);
    const above = read.nav.y - read.button.y;
    const below = read.button.y + read.button.h - (read.nav.y + read.nav.h);
    console.log(
      `${width} · today    lines ${today.lines}   button ${today.button.w}x${today.button.h}` +
        `   logo ${today.logo ? today.logo.w : 'none'}` +
        `   name ${today.name ? `${today.name.w}x${today.name.h}` : 'not drawn'}
` +
        `${width} · cut      lines ${landed.lines}   button ${read.button.w}x${read.button.h}` +
        `   overflow above ${above} below ${below}
` +
        `         logo ${read.logo ? read.logo.w : 'none'}` +
        `   name ${read.name ? `${read.name.w}x${read.name.h}` : 'not drawn'}` +
        `   label drawn ${Math.round(landed.shown)}px, cut by ${landed.clipped}px
` +
        // A candidate that moves the overflow sideways instead of removing it
        // reads as free in every box above, so the row is asked whether
        // anything has left the bar and whether the page now scrolls (#164).
        `         button ${read.button.x}..${read.button.x + read.button.w}` +
        `   bar ${read.nav.x}..${read.nav.x + read.nav.w}` +
        `   past the bar ${
          read.button.x < read.nav.x ||
          read.button.x + read.button.w > read.nav.x + read.nav.w
        }` +
        `   row overflows by ${await page.evaluate(() => {
          const row = document.querySelector(
            'nav[aria-label="แถบด้านบน"] > div'
          );
          return Math.round(row.scrollWidth - row.clientWidth);
        })}px` +
        `   page scrolls sideways ${await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        )}`
    );
  });
}

/**
 * Option ค - less `py` - priced on both kinds of account, because its own
 * wording says it changes the button for the accounts whose label is short too.
 *
 * `py-2.5` is 10px, and two 24px lines need the padding down to 8px (`py-2`)
 * to make 64px exactly, with nothing left over. So the arm reads 8px and 6px:
 * the first is the smallest change that fits and the second is what buys any
 * air at all. Both numbers are the delivered screen's to move
 * (`DEEP-QA-FRONTEND/src/components/RoleDropdown.js` writes the same
 * `px-5 py-2.5`), which is why this is priced and not built (#156).
 */
for (const [key, padding] of [
  ['committee0503', 8],
  ['committee0503', 6],
  ['committee0501', 8],
]) {
  test(`261 · option ค on ${key} with ${padding}px of padding`, async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS[key]);
    const button = actingButton(page);
    await expect(button).toBeVisible();

    const today = await readBar(page);
    const landed = await button.evaluate((node, value) => {
      node.style.paddingTop = `${value}px`;
      node.style.paddingBottom = `${value}px`;
      const style = getComputedStyle(node);
      return { top: style.paddingTop, bottom: style.paddingBottom };
    }, padding);
    expect(landed.top).toBe(`${padding}px`);
    expect(landed.bottom).toBe(`${padding}px`);

    const read = await readBar(page);
    const above = read.nav.y - read.button.y;
    const below = read.button.y + read.button.h - (read.nav.y + read.nav.h);
    console.log(
      `${key} · py ${padding}px   lines ${today.lines} -> ${read.lines}` +
        `   button ${today.button.h}px -> ${read.button.h}px` +
        `   overflow above ${above} below ${below}` +
        `   air left in the bar ${read.nav.h - read.button.h}px`
    );
  });
}

for (const [key, why] of WHO) {
  test(`261 · ${key} — ${why}`, async ({ page }) => {
    await signIn(page, ACCOUNTS[key]);
    const button = actingButton(page);
    await expect(button).toBeVisible();

    const today = await readBar(page);
    show(key, 'as it is today', today);

    // The room the middle third has, and what the label needs unbroken. The
    // difference is what any `truncate` would have to cut.
    const needs = await unbrokenWidth(button, today.label);
    console.log(
      `  unbroken ${needs.text} + padding ${needs.padding} =` +
        ` ${needs.text + needs.padding}   today's button ${today.button.w}` +
        `   between logo and name ${today.name.x - (today.logo.x + today.logo.w)}`
    );

    // Candidate ข — `whitespace-nowrap` and no cut. Applied as a class, which
    // is the property it is meant to change, so a candidate that buys nothing
    // cannot read as one that does (#156).
    await button.evaluate(node => node.classList.add('whitespace-nowrap'));
    const nowrap = await page.evaluate(() =>
      getComputedStyle(
        document.querySelector('nav[aria-label="แถบด้านบน"] button')
      ).whiteSpace
    );
    expect(nowrap).toBe('nowrap');
    const withNowrap = await readBar(page);
    show(key, 'with whitespace-nowrap (candidate ข)', withNowrap);
    console.log(
      `  name moved ${withNowrap.name.x - today.name.x}px,` +
        ` width ${today.name.w} -> ${withNowrap.name.w},` +
        ` height ${today.name.h} -> ${withNowrap.name.h}\n` +
        `  logo right edge ${today.logo.x + today.logo.w} ->` +
        ` ${withNowrap.logo.x + withNowrap.logo.w}\n` +
        `  button overlaps the name: ` +
        `${withNowrap.button.x + withNowrap.button.w > withNowrap.name.x}`
    );
  });
}

'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { linesOf } = require('../support/line-breaks');
const { actingButton, navbar } = require('../support/shell');

/**
 * #264 — what each of the bar's options costs at every width, read off a
 * screen, so the owner's question carries prices rather than expectations
 * (#77, #228, #156).
 *
 * This is an instrument, not a row: it prints, and asserts only the
 * preconditions that would make a printed number a lie. Nothing in the
 * repository runs it — copy it into `e2e/tests/` to run it:
 *
 * ```
 * cp e2e/probes/264-the-bar-at-narrow-widths.spec.js e2e/tests/264probe.spec.js
 * npx playwright test tests/264probe --reporter=line
 * rm e2e/tests/264probe.spec.js
 * ```
 *
 * ## Why every arm reads the control group too
 *
 * The bar loses the logo's box and the user's name as the window narrows
 * **today**, with no `nowrap` anywhere in it — #264's own table says so, and
 * that is the half that decides how the owner's question is worded. (The
 * ticket's *below 1024px* is its own inherited number: at 1024 not one box has
 * lost a pixel, and the first break is the name's second line at 916. The
 * bisection at the bottom of this file is what says so.) So the question *what
 * does this option make worse* can only be answered against today's numbers and
 * never against an expectation (#194, #103). Each arm therefore reloads the
 * page, reads the unmodified bar at that width, applies its one candidate, and
 * reads again — the reload is what makes the control a reading rather than a
 * memory, because every candidate here is a DOM write React owns (#188).
 *
 * ## What is read, and why
 *
 * - **the logo's width**, because it is an `<img>` that is a flex item with no
 *   floor of its own: #264's mechanism claim is that it shrinks to 0, and a
 *   width is what settles it.
 * - **the name's box and its line count**, from the glyphs rather than from the
 *   height (`support/line-breaks.js` is the instrument `e2e/README.md` names for
 *   *did this come apart*), because the height is what the ticket is asking
 *   about and deriving the line count from it would be the same number twice.
 * - **the picker's box, its lines and its overflow out of the 64px bar**, since
 *   option ข's whole price is that the middle is what loses the room instead.
 * - **whether the row or the page overflows sideways**, because a candidate that
 *   moves the damage out of the bar instead of removing it reads as free in
 *   every box above (#164).
 *
 * ## What it cannot say
 *
 * 1. It reads **one account**, `prog.manager.0503@`, which is the account
 *    #264's own table was measured on. The right column's width is that
 *    person's name plus title, so every *name* number here is of that string
 *    and not of the longest one the seed holds.
 * 2. It reads **Chromium at `deviceScaleFactor` 1**. A rule about layout is
 *    checked with numbers (#111, #122) and these are one browser's.
 * 3. It prices the options; it does not say which is **allowed**, and it does
 *    not say *whose* each value is either — which is the question #156 asks
 *    before an option can be called a divergence. `ข` and `ง` move values the
 *    delivered `DEEP-QA-FRONTEND/src/components/Navbar.js` chose (`w-1/3` at
 *    `:143` and `:167`, `h-[64px]` at `:140`, `hidden … sm:flex` at `:168`,
 *    character for character), so they are the owner's under `docs/06`
 *    §Out of Scope. `before-261` does **not**: `whitespace-nowrap` sits on the
 *    **trigger** only in the rebuild, landed by #261 on 3 November 2569, while
 *    the delivered file has it on the option rows
 *    (`DEEP-QA-FRONTEND/src/components/RoleDropdown.js:103`). Undoing it is
 *    therefore a change to the owner's own answer **จ** and not a divergence
 *    from the delivered screen.
 * 4. It says nothing about whether the name *should* be hidden below `sm`.
 *    That is the delivered screen's own decision and is outside #264.
 * 5. The bisection's premise — that each property is monotonic in the width —
 *    is **reported, not proved**: the two ends are read and a non-monotonic
 *    pair is printed instead of bisected, which is why each question carries
 *    its own floor. Two endpoints are not monotonicity, so a property that
 *    comes back inside the range would be bisected to the wrong boundary and
 *    nothing here would say so.
 * 6. Two of its readers are copies rather than readings (#118, #85): the bar's
 *    accessible name in `BAR` is a copy of `support/shell.js`'s, because a
 *    `page.evaluate` needs a selector and not a locator; and the name is read
 *    as `span.text-white`, which is unique only by accident of what the right
 *    column holds today (#93). Both are premises of every number above, not
 *    claims — a fix that adds a white `span` to that column silently moves
 *    every *name* figure.
 *
 * It writes nothing: the account only signs in and reads.
 */

/** A copy of `support/shell.js`'s accessible name. See *What it cannot say* 6. */
const BAR = 'nav[aria-label="แถบด้านบน"]';

/**
 * Wide to narrow, including the four boundaries the bisection below returns, so
 * that no arm is read only between the breaks — the mistake #264's own headline
 * is made of (#223).
 */
const WIDTHS = [
  1366, 1280, 1152, 1024, 960, 916, 896, 857, 832, 791, 768, 704, 659, 640,
  576, 540,
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
 * The logo's width, or `null` where it has no box at all — which a 0 would read
 * as a shrunken image and is not the same thing (#227).
 */
const logoWidth = read => (read.logo ? read.logo.w : null);

/** Everything #264 is about, in one reading. */
async function readBar(page) {
  const bar = navbar(page);
  const button = actingButton(page);
  const logo = bar.locator('img[alt="Logo"]');
  const name = bar.locator('span.text-white').first();
  const middle = bar.locator('> div > div').nth(1);
  const drawn = await name.count();
  const visible = drawn > 0 && (await name.isVisible());
  return {
    nav: await box(bar),
    button: await box(button),
    buttonLines: (await linesOf(button)).length,
    logo: await box(logo),
    middle: await box(middle),
    row: await page.evaluate(
      selector =>
        Math.round(
          document.querySelector(selector + ' > div').getBoundingClientRect()
            .width
        ),
      BAR
    ),
    name: visible ? await box(name) : null,
    nameLines: visible ? (await linesOf(name)).length : 0,
    rowOverflow: await page.evaluate(selector => {
      const row = document.querySelector(selector + ' > div');
      return Math.round(row.scrollWidth - row.clientWidth);
    }, BAR),
    pageScrolls: await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    ),
  };
}

/** One line per reading, so an arm and its control can be read side by side. */
const line = (what, read) =>
  `  ${what.padEnd(8)} logo ${String(logoWidth(read) === null ? 'none' : logoWidth(read)).padStart(4)}` +
  `   name ${read.name ? `${read.name.w}x${read.name.h} on ${read.nameLines}` : 'not drawn'}`.padEnd(
    26
  ) +
  `   picker ${read.button.w}x${read.button.h} on ${read.buttonLines}` +
  `   bar ${read.nav.h}` +
  `   out of the bar ${read.nav.y - read.button.y > 0 ? read.nav.y - read.button.y : 0}` +
  `/${
    read.button.y + read.button.h - (read.nav.y + read.nav.h) > 0
      ? read.button.y + read.button.h - (read.nav.y + read.nav.h)
      : 0
  }` +
  `   row overflows ${read.rowOverflow}   page scrolls ${read.pageScrolls}` +
  `   middle ${read.middle.w} at ${read.middle.x}..${read.middle.x + read.middle.w}` +
  ` of a ${read.row}px row`;

/**
 * The candidates, each applied to **the element it is meant to change**, with
 * every property it writes read back off the element it was written on: a style
 * that landed on the wrong box reads exactly like a candidate that buys nothing
 * (#156, #260, and #261's own `min-w-0` on the wrong parent). Each returns
 * `landed`, the one value `LANDED` checks, and `also`, a list of
 * `[what, value]` pairs for its other writes, which the test asserts against
 * `ALSO` — an arm whose second write silently failed would be a price nobody
 * paid.
 */
const CANDIDATES = {
  /**
   * The control group **in time**: #261's `whitespace-nowrap` taken back off
   * the trigger, which is the only reading that can settle *#261 widened it*
   * (#194, #103) — and it is also the price of the option nobody listed,
   * which is to revert #261. Note *What it cannot say* 3: this is the only
   * candidate here that moves a value the **rebuild** chose rather than one
   * the delivered screen did.
   */
  'before-261': (page, selector) =>
    page.evaluate(sel => {
      const button = document.querySelector(sel + ' button');
      button.classList.remove('whitespace-nowrap');
      return {
        where: 'the trigger',
        landed: getComputedStyle(button).whiteSpace,
        also: [],
      };
    }, selector),
  /** ข, at the column — the left third keeps its basis and gives up nothing. */
  'ข-column': (page, selector) =>
    page.evaluate(sel => {
      const column = document.querySelector(sel + ' > div > div:first-child');
      column.style.flexShrink = '0';
      return {
        where: column.className,
        landed: getComputedStyle(column).flexShrink,
        also: [],
      };
    }, selector),
  /** ข, at the image — every box between it and the row may still shrink. */
  'ข-img': (page, selector) =>
    page.evaluate(sel => {
      const img = document.querySelector(sel + ' img[alt="Logo"]');
      img.style.flexShrink = '0';
      return {
        where: img.getAttribute('alt'),
        landed: getComputedStyle(img).flexShrink,
        also: [],
      };
    }, selector),
  /**
   * ค — the picker cuts its own label. The label is a bare text node beside the
   * chevron inside a `flex` button, so it is an anonymous flex item no class can
   * reach: the price in markup is a wrapper element **plus** `min-w-0` on every
   * box up to the row, which is what #261 measured and what this arm repeats.
   * The chain is the arm's whole price, so every box in it is read back.
   */
  'ค-cut': (page, selector) =>
    page.evaluate(sel => {
      const button = document.querySelector(sel + ' button');
      const text = [...button.childNodes].find(child => child.nodeType === 3);
      const span = document.createElement('span');
      span.textContent = text.textContent;
      span.style.minWidth = '0';
      span.style.overflow = 'hidden';
      span.style.textOverflow = 'ellipsis';
      span.style.whiteSpace = 'nowrap';
      text.replaceWith(span);
      const chain = [];
      for (let node = button; node; node = node.parentElement) {
        node.style.minWidth = '0';
        chain.push(getComputedStyle(node).minWidth);
        if (node.matches('nav')) break;
      }
      return {
        where: span.textContent.trim(),
        landed: getComputedStyle(span).textOverflow,
        also: [
          ['the span is cut', getComputedStyle(span).overflow],
          ['the chain reached the bar', String(chain.length >= 3)],
          ['every box in the chain', [...new Set(chain)].join(',')],
        ],
      };
    }, selector),
  /** ง — the row may take a second line, so the bar's fixed height has to go. */
  'ง-wrap': (page, selector) =>
    page.evaluate(sel => {
      const bar = document.querySelector(sel);
      const row = bar.querySelector(':scope > div');
      bar.style.height = 'auto';
      bar.style.minHeight = '64px';
      row.style.flexWrap = 'wrap';
      return {
        where: 'nav + row',
        landed: getComputedStyle(row).flexWrap,
        also: [
          ['the bar keeps its floor', getComputedStyle(bar).minHeight],
          ['the bar may grow', bar.style.height],
        ],
      };
    }, selector),
};

/** What each candidate's own property must read back as, on its own element. */
const LANDED = {
  'before-261': 'normal',
  'ข-column': '0',
  'ข-img': '0',
  'ค-cut': 'ellipsis',
  'ง-wrap': 'wrap',
};

/** And what each candidate's *other* writes must read back as (#260). */
const ALSO = {
  'ค-cut': ['hidden', 'true', '0px'],
  'ง-wrap': ['64px', 'auto'],
};

for (const name of Object.keys(CANDIDATES)) {
  test(`264 · option ${name} against today, at every width`, async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.committee0503);
    await expect(actingButton(page)).toBeVisible();

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 720 });
      // The reload is what makes the control a reading and not a memory: every
      // candidate below is a DOM write, and the previous width's write would
      // otherwise still be standing (#188).
      await page.reload();
      await expect(actingButton(page)).toBeVisible();

      const today = await readBar(page);
      const landed = await CANDIDATES[name](page, BAR);
      expect(landed.landed).toBe(LANDED[name]);
      expect(landed.also.map(pair => pair[1])).toEqual(ALSO[name] || []);
      const after = await readBar(page);

      console.log(
        `${String(width).padStart(4)}px   ${name}   landed on ${landed.where}\n` +
          `${line('today', today)}\n` +
          `${line(name, after)}`
      );
    }
  });
}

/**
 * The widths #264's wording needs: where the name first wraps, where the logo
 * first loses a pixel, and four more — **today**, with no candidate applied.
 *
 * Asked by bisection rather than by reading the table, because *below 1024px*
 * is the ticket's phrase and the boundary is what the owner is being asked
 * about. The premise is reported rather than proved: see *What it cannot say* 5.
 */
test('264 · the width each break starts at, today', async ({ page }) => {
  await signIn(page, ACCOUNTS.committee0503);
  await expect(actingButton(page)).toBeVisible();

  const at = async width => {
    await page.setViewportSize({ width, height: 720 });
    await page.reload();
    await expect(actingButton(page)).toBeVisible();
    return readBar(page);
  };

  const wide = await at(1366);
  console.log(
    `1366px is the reference: ${line('today', wide)
      .trim()
      .replace(/\s+/g, ' ')}`
  );

  for (const [what, broken, floor] of [
    ['the name wraps', read => read.name !== null && read.nameLines > 1, 640],
    ['the name is on three lines', read => read.nameLines > 2, 640],
    [
      'the logo shrinks',
      read => logoWidth(read) === null || logoWidth(read) < logoWidth(wide),
      540,
    ],
    ['the row overflows', read => read.rowOverflow > 0, 540],
    ['the logo is gone', read => logoWidth(read) === null || logoWidth(read) === 0, 540],
    ['the name is not drawn', read => read.name === null, 540],
  ]) {
    const narrow = await at(floor);
    if (!broken(narrow) || broken(wide)) {
      console.log(
        `${what}: not bisected — 1366 ${broken(wide)} / ${floor} ${broken(narrow)}` +
          `, so the property is not one this search can follow`
      );
      continue;
    }
    let good = 1366;
    let bad = floor;
    while (good - bad > 1) {
      const middle = Math.floor((good + bad) / 2);
      if (broken(await at(middle))) bad = middle;
      else good = middle;
    }
    console.log(`${what}: first at ${bad}px, still whole at ${good}px`);
  }
});

'use strict';

const { expect } = require('@playwright/test');

/**
 * The instrument that opens the window between an answer and its drawing — #170,
 * #171.
 *
 * `waitForResponse` resolves on the answer's **headers**; a screen draws from the
 * body that arrives after them, from the state React sets after that, and from
 * the paint after that. A non-retrying read on the next line of a row — an
 * `allTextContents()`, an `allInnerTexts()`, an `innerText()` — reads whatever is
 * there, which in that window is nothing. #170 timed the natural gap at 11–22ms
 * and caught the raw read inside it once in ten opens with no instrument at all.
 *
 * ## Why the knob is the answer's lateness and not the machine's
 *
 * Because those reads are executed by the renderer too. A CPU throttle or a held
 * main thread makes the drawing late *and* makes the read queue behind it: #170
 * measured **0 reds in 20** each way on a defect the full suite had already
 * caught. So the only thing that widens the window is the answer's own lateness,
 * and this widens it from inside a single response — the body arrives, and the
 * screen's continuation is handed it late, with the thread left free.
 *
 * `page.route` cannot do this. A fulfilled route is answered all at once, so the
 * response event fires at the fulfil and there is no gap left to read into.
 *
 * ## Why it is here rather than in a spec
 *
 * Because two files need it and a third will: `170a`, `171a`, and whatever closes
 * the chart screens the census missed. A fixture built inside one test file is one
 * no other file has (#96), and a second private copy is a grep that finds one of
 * them. It is an instrument and not an assertion, so #68's rule about shared hooks
 * does not bite: no row's *claim* lives here. What lives here is the window.
 */

/** How late the screen's own continuation is, in milliseconds. */
const LATE = 400;

/**
 * Runs in the page: wraps `fetch` so a matching answer is handed on late.
 *
 * The regular expression travels as a string because this function is serialised
 * into the document, and it is matched against the **pathname** so a query string
 * cannot make a pattern miss.
 */
const arriveLate = ({ pattern, lateBy }) => {
  window.__late = 0;
  const matches = new RegExp(pattern);
  const real = window.fetch;
  window.fetch = async (...args) => {
    const url = String(args[0]?.url ?? args[0]);
    const answer = await real(...args);
    if (matches.test(new URL(url, location.href).pathname)) {
      window.__late += 1;
      await new Promise(done => setTimeout(done, lateBy));
    }
    return answer;
  };
};

/**
 * Holds back every answer whose path matches `pattern`, for every document this
 * page loads from now on.
 *
 * Called before the sign-in, because `addInitScript` reaches the documents that
 * come after it and not the one already loaded.
 */
const holdBack = (page, pattern, lateBy = LATE) =>
  page.addInitScript(arriveLate, { pattern, lateBy });

/**
 * The precondition every row using this shares, asserted where it is used (#51).
 *
 * The fixture is only a fixture if the screen went through it. A document the init
 * script did not reach would read perfectly and prove nothing — and it would do so
 * while looking exactly like a pass.
 */
async function wentThroughTheWindow(page) {
  expect(
    await page.evaluate(() => window.__late),
    'the screen asked for its own list through the late-arrival wrapper',
  ).toBeGreaterThan(0);
}

module.exports = { LATE, holdBack, wentThroughTheWindow };

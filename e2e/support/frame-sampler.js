'use strict';

const { expect } = require('@playwright/test');

/**
 * *Was it ever on the screen* - answered by a sample per frame, not by a wait.
 *
 * Written inside `152a` for its two page-moving rows and moved here by #203,
 * which needs it for every row it has: a sentence set before a reload and
 * replaced by that reload's refusal is **gone by any settle point**, so a row
 * that reads once at one passes on the broken screen and on the fixed one
 * alike. #203 found that the cheap way - nineteen of its twenty rows green
 * against the defect they were written for, before a mutant was written - and
 * #152 found it the expensive way, as two mutants surviving 21 of 21 (#164,
 * and the seventh reading of a survivor in `CLAUDE.md`).
 *
 * No row's claim lives in here: it is an instrument, which is what makes it
 * shareable where a fixture that carried a claim would not be (#171).
 *
 * `document.body.innerText` inside the callback rather than a locator, because
 * a locator read is executed by the renderer and queues behind the drawing it
 * is trying to catch (#170); in here the DOM is whatever the last commit left.
 *
 * `alsoShowing` is an optional second reading, added by #257: a selector and the
 * text one of its elements must carry, counted per frame as `alsoFrames`. It is
 * what lets a row say that the window it sampled **existed** - a sampler that
 * read nothing on a screen which took its subject away instantly has proved
 * that nothing can be drawn in a window that is not there, which is the vacuous
 * pass a reader scoped to something never drawn gives (#171). Left out, nothing
 * extra is read and `alsoFrames` stays 0, so the callers that came before it
 * are untouched; the reading is by `textContent` on a selector rather than
 * through `innerText`, because the words a row wants to find this way are
 * usually a heading the menu that opens it carries too.
 */
async function watchForTheSentence(page, sentence, alsoShowing = null) {
  await page.evaluate(
    ([said, also]) => {
      window.__sightings = { frames: 0, saying: 0, alsoFrames: 0 };
      const tick = () => {
        window.__sightings.frames += 1;
        if (document.body.innerText.includes(said)) window.__sightings.saying += 1;
        if (
          also &&
          Array.from(document.querySelectorAll(also.selector)).some(
            (node) => node.textContent === also.text,
          )
        ) {
          window.__sightings.alsoFrames += 1;
        }
        window.__frameTick = requestAnimationFrame(tick);
      };
      window.__frameTick = requestAnimationFrame(tick);
    },
    [sentence, alsoShowing],
  );
  return {
    read: () =>
      page.evaluate(() => {
        cancelAnimationFrame(window.__frameTick);
        return window.__sightings;
      }),
  };
}

/**
 * Reads the sampler and says what it counted.
 *
 * The frame count is asserted as well as the sightings: a sampler that never
 * ran reports nothing said, which is the answer the row wants and no evidence
 * at all.
 *
 * The reading is handed back, for a row with a second precondition of its own to
 * assert below the claim: the order is the claim first and what follows from it
 * second, so that a mutant takes the claim away rather than the reading above it
 * (#233).
 */
async function neverSaid(watch, what) {
  const seen = await watch.read();
  expect(seen.frames, 'frames sampled').toBeGreaterThan(10);
  expect(seen.saying, what).toBe(0);
  return seen;
}

module.exports = { watchForTheSentence, neverSaid };

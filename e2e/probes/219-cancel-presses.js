/*
 * #219 - an instrument, not a row. It answers *which control does each press
 * of a ยกเลิก land on: the confirm box's, or a form's* - which no static
 * reading of `e2e/` can answer, because 37 of the 45 sites that name the word
 * build their locator on `page` and nothing in the text says which of the two
 * controls is on the screen at that moment. The ticket's first closing
 * criterion asks for that classification **by instrument**, and this is it.
 * `219-cancel-sites.js` beside it holds the population; this says what the
 * presses landed on, and the two are joined by the enclosing test's title.
 *
 * Measured on 24 ตุลาคม 2569. Four runs, and the figures below are the
 * **fourth**, the only one made with the version of this file that is in the
 * tree - it is the one that asks `test.info()` for the row, and the first in
 * which every press came back attributed. Over a full run of 849 rows:
 * **108 presses, 48 on the confirm box and 60 on a form**, with no `neither`
 * and no `both` - `.max-w-sm` against `form` separates every press in the
 * suite. Attributed back to the sites by `219-join.js`, 20 of them are the
 * box's and 25 are a form's.
 *
 * The three complete runs (1, 3 and 4) returned the same 108 presses and the
 * same 48 / 60 split, which is the figure shape three's answer rests on; what
 * the edits between them changed is how many presses could be traced back to a
 * row: 48 of 108 in run 1 and 52 in run 3, where the only reader was the call
 * stack, against all 108 in run 4. Run 2 is the red one, below.
 *
 * It works by patching `Locator.prototype.click` in the worker process. The
 * prototype is reached from an instance, because `playwright-core` ships its
 * client bundled and its `exports` map does not offer the module - so the
 * patch is installed by a spec that runs first in the ordered, single-worker
 * run, and every file after it in that worker is instrumented.
 *
 * For every click whose locator chain names a control called exactly
 * `ยกเลิก` - the quoted name, so that `ยกเลิกบทบาท` and `ยกเลิกการเปิด`, which
 * are different controls, stay out - it asks the element itself:
 *
 *     el.closest('.max-w-sm')   the confirm box      -> dialog
 *     el.closest('form')        a form               -> form
 *
 * and writes one JSON line per press to `PROBE219_OUT` with the row that was
 * running - asked of `test.info()`, which is answered by the runner - and the
 * `e2e/` frames of the call stack, which name the press line itself wherever
 * the caller is synchronous.
 *
 * What it cannot say, written down because that is the part a count never says:
 *
 * - it reports **presses**, not sites: a site inside a loop over four screens
 *   is four lines, and a site in a row that does not run is no line at all.
 *   The static census is what holds the population; this says what the presses
 *   landed on;
 * - `.max-w-sm` is the box's own class and the same claim `confirm-dialog.js`
 *   is built on (#85) - if the box is ever drawn by something else, this reads
 *   `neither` rather than going wrong quietly;
 * - **a red ends the measurement.** Playwright tears the worker down after a
 *   failed test and the next one starts unpatched, with nothing to install it
 *   again - so a run with a red in it records the presses up to that row and
 *   then goes quiet, which reads exactly like a tree that stopped pressing.
 *   The count is the tell (#208): the second run of this probe recorded 12
 *   presses against the first run's 108, over a single red at `142a`;
 * - it reads `first()`, while the click is strict: where a chain resolves two
 *   elements the press fails and this line describes the first of them;
 * - the read is a round trip **in front of** the click, which is a turn for the
 *   renderer and the very thing #170 says to avoid. It cannot go behind,
 *   because pressing this control is what takes the control away: the box or
 *   the form is detached by the time the click resolves, and `closest()` has
 *   nothing to be asked of. So the cost is paid knowingly - the rows that press
 *   a ยกเลิก while a write is out are measuring a race, so a red under this
 *   probe is the probe's and not the code's, and nothing is concluded from a
 *   run with reds in it.
 *
 * Running it: copy `probes/219-first.spec.js` to `tests/000-probe-219.spec.js`
 * (ordered first), then
 *
 *     PROBE219_OUT=<file> npx playwright test tests/000-probe-219.spec.js <specs...>
 *
 * and delete the copy afterwards.
 */
'use strict';

const fs = require('fs');
const { test } = require('@playwright/test');

/**
 * Which row is pressing, asked of the runner rather than of a stack.
 *
 * A stack read inside an `async` function holds the frames of its own
 * synchronous callers and loses everything across an `await`, so a press made
 * inside a helper the spec awaited reports the helper and not the row: 56 of
 * the third run's 108 presses came back with no `e2e/` frame at all, and the
 * nine `remove*` helpers reported themselves with `asked by ?`. `test.info()`
 * is answered by the worker and is the same answer wherever it is asked from.
 */
function row() {
  try {
    const info = test.info();
    return { file: info.file.split(/[\\/]/).pop(), title: info.titlePath.slice(1).join(' › ') };
  } catch {
    return null;
  }
}

const CANCEL = "name: 'ยกเลิก'";
const OUT = process.env.PROBE219_OUT;

let installed = false;

function frames(stack) {
  const out = [];
  for (const line of String(stack).split('\n')) {
    const m = line.match(/\(([^()]*e2e.(?:tests|support|probes)[^()]*)\)/);
    if (!m) continue;
    const posix = m[1].split('\\').join('/');
    const under = posix.split('/e2e/')[1];
    // The patch's own frame is the innermost one and says nothing about who
    // asked for the press.
    if (under && under.indexOf('probes/219-cancel-presses.js') !== 0) out.push(under);
  }
  return out;
}

function record(press) {
  if (!OUT) return;
  fs.appendFileSync(OUT, JSON.stringify(press) + '\n', 'utf8');
}

/** Patches the prototype of the locator handed in, once per worker. */
function install(locator) {
  if (installed) return false;
  // The spec's own frame sits under Playwright's internals, and the default of
  // ten is not always deep enough to reach it. It is raised for every error in
  // the worker, which costs a longer stack on a failure and nothing else.
  Error.stackTraceLimit = 60;
  const proto = Object.getPrototypeOf(locator);
  const original = proto.click;
  proto.click = async function patchedClick(...args) {
    const chain = String(this);
    if (chain.indexOf(CANCEL) >= 0) {
      // Captured before the first `await`: an async function's stack has lost
      // its caller by the time the next tick runs, and 60 of the first run's
      // 108 presses came back with no `e2e/` frame in them at all. The
      // *formatting* is left until after the press, because it is the
      // expensive half and a press is what some of these rows are racing.
      const captured = new Error();
      let kind = 'unreadable';
      try {
        await this.first().waitFor({ state: 'attached', timeout: 5000 });
        kind = await this.first().evaluate(el => {
          const panel = !!el.closest('.max-w-sm');
          const form = !!el.closest('form');
          return panel && form ? 'both' : panel ? 'dialog' : form ? 'form' : 'neither';
        });
      } catch (e) {
        kind = 'unreadable: ' + String(e.message).split('\n')[0].slice(0, 60);
      }
      const answer = await original.apply(this, args);
      record({ kind, chain, row: row(), frames: frames(captured.stack) });
      return answer;
    }
    return original.apply(this, args);
  };
  installed = true;
  return true;
}

module.exports = { install, OUT };

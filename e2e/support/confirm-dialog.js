'use strict';

const { JOINER } = require('./line-breaks');

/**
 * The dialog every deletion in the system asks through, read the way a person
 * reads it.
 *
 * Since #118 `ConfirmDialog` glues its message with U+2060 WORD JOINER between
 * every pair of adjacent Thai letters, so that Chromium breaks the sentence
 * only where its author wrote a space. The joiner occupies no width and is a
 * default-ignorable code point, so nothing a person sees has changed - but it
 * is in the DOM, and `getByText('ต้องการนำรายวิชา')` no longer matches the
 * sentence that contains exactly those words. That is not a locator that has
 * gone stale; it is a locator that was always asking the DOM a question about
 * the source string.
 *
 * So a row about *what the dialog says* reads the text and takes the joiners
 * back out. A row about *where the lines fell* is a different question and
 * belongs in `118a-thai-line-breaks.spec.js`, which uses `line-breaks.js` and
 * must not strip anything.
 *
 * Only the message is glued - the title is not - so this reads the message.
 *
 * That the title is left alone is a measurement and not an oversight. The 19
 * titles that existed then were drawn into the dialog's own `h2` on 24 September
 * 2569 - counted again by AST on 18 ตุลาคม 2569 the component has 20 call sites
 * in 19 files, the twentieth being the status switch #86 added - : the longest
 * is 32 characters and the eight longest all come back one line, in a 336px box
 * at 18px/600. A title that does not wrap cannot break inside a word, so there
 * is nothing there to fix - and gluing it anyway would have a price, because a
 * title is an accessible name and `getByRole('heading', { name })` is how the
 * suite finds these dialogs. The day a title is written long enough to wrap,
 * that changes; the measurement has a date on it for exactly that reason.
 */
const panel = page => page.locator('.max-w-sm').last();

const messageOf = page => panel(page).getByRole('paragraph').last();

/**
 * What the open dialog asks, with the joiners taken out. Waits for the message
 * itself rather than for the box around it: the two arrive in one commit, but
 * the one being read is the one to wait for.
 */
async function saidBy(page) {
  const message = messageOf(page);
  await message.waitFor();
  return ((await message.textContent()) || '').split(JOINER).join('');
}

/**
 * Dismisses the open question while the answer it confirmed is still out.
 *
 * ยกเลิก and not Escape, because it is the way with no keyboard in it at all: the
 * button is inside the box, where the cover cannot eat the click, and it is not
 * disabled while the box is `busy` - the component's own rule is that its two
 * ways out answer alike.
 *
 * Dismissing cancels nothing that has left. The write is in flight and its
 * handler goes on to say its sentence and read the list again, so this is how a
 * person moves the screen on while a write is out - and since #217 contained the
 * focus (18 ตุลาคม 2569) it is the only way they have. The rows that need that
 * situation used to reach straight through the cover with the keyboard, which is
 * the hole #204 described and #217 closed; what they measure is unchanged, and
 * only the way in moved (#203).
 *
 * An instrument and not an assertion, which is why it is shared by the eight
 * files that need it (#171): no row's claim lives in getting out of the box.
 * Five on 18 ตุลาคม 2569 when #217 wrote this paragraph, seven by the time #219
 * counted on 24 ตุลาคม 2569, and eight with `118a`, which #219 moved off a copy
 * of its own that waited for nothing.
 * The box is waited for by `panel` and not by `getByRole('dialog')` for the
 * reason `204a` gives: the role is a claim of that file's own rows, and a
 * locator eight files share would make it their premise instead (#85, #111).
 */
async function dismiss(page) {
  await panel(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await panel(page).waitFor({ state: 'detached' });
}

module.exports = { panel, messageOf, saidBy, dismiss };

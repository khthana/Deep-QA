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
 * That the title is left alone is a measurement and not an oversight. All 19
 * titles were drawn into the dialog's own `h2` on 24 September 2569: the longest
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

module.exports = { panel, messageOf, saidBy };

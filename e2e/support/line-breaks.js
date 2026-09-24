'use strict';

/**
 * Where a paragraph's lines actually end, read off the glyphs.
 *
 * #118 is a claim about layout, and the rule for those in this repo is that
 * they are checked with numbers (#111, #122). The number here is the `top` of
 * each character's own client rect: characters that share a `top` are on one
 * line, and the place where `top` changes is a line break the browser chose.
 * Nothing else on the page can answer the question - the class list says what
 * was asked for, not what the browser did with it, and `innerText` does not
 * carry soft wraps at all.
 *
 * Walking text nodes rather than the paragraph's own string keeps this honest
 * if the message is ever split into elements.
 */

/** U+2060 WORD JOINER - what `ConfirmDialog` glues Thai with. */
const JOINER = '⁠';

/** The paragraph's visual lines, exactly as drawn, joiners and all. */
const linesOf = paragraph =>
  paragraph.evaluate(p => {
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    const range = document.createRange();
    const lines = [];
    let top = null;
    let line = '';
    for (const text of nodes) {
      const content = text.textContent;
      for (let i = 0; i < content.length; i++) {
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        const rect = range.getClientRects()[0];
        // A zero-width or collapsed character draws nothing and cannot start a
        // line; it belongs to the line being built.
        if (!rect) {
          line += content[i];
          continue;
        }
        if (top === null) top = rect.top;
        else if (Math.abs(rect.top - top) > 1) {
          lines.push(line);
          line = '';
          top = rect.top;
        }
        line += content[i];
      }
    }
    lines.push(line);
    return lines;
  });

/** The same lines with the joiners taken out, for matching words against. */
const bare = lines => lines.map(line => line.split(JOINER).join(''));

/**
 * The offsets, into the sentence a reader sees, at which a line ended.
 *
 * Measured on the bare text so that an offset means the same thing as an index
 * into the string the screen's source wrote.
 */
const seamsOf = lines => {
  const out = [];
  let n = 0;
  for (const line of bare(lines).slice(0, -1)) {
    n += line.length;
    out.push(n);
  }
  return out;
};

/**
 * `null` when `word` is drawn whole, or a sentence naming where it was cut.
 *
 * A word the sentence does not contain is an error rather than a pass: a row
 * that asks about a word that is not there is a row that cannot fail.
 */
const splitOf = (lines, word) => {
  const text = bare(lines).join('');
  const at = text.indexOf(word);
  if (at < 0) throw new Error(`the sentence does not contain ${word}: ${text}`);
  const inside = seamsOf(lines).filter(seam => seam > at && seam < at + word.length);
  if (!inside.length) return null;
  return inside
    .map(seam => `${word} is cut as ${text.slice(at, seam)} / ${text.slice(seam, at + word.length)}`)
    .join('; ');
};

/** Every seam that does not fall immediately after a space the author wrote. */
const seamsInsideAToken = lines => {
  const text = bare(lines).join('');
  return seamsOf(lines)
    .filter(seam => text[seam - 1] !== ' ')
    .map(seam => `${text.slice(Math.max(0, seam - 12), seam)}|${text.slice(seam, seam + 12)}`);
};

/** How far the element's content runs past the box that holds it. */
const overflowOf = element =>
  element.evaluate(node => node.scrollWidth - Math.ceil(node.getBoundingClientRect().width));

module.exports = { JOINER, linesOf, bare, splitOf, seamsInsideAToken, overflowOf };

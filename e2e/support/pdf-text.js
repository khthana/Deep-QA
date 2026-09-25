'use strict';

/**
 * The text of a generated PDF, line by line, as the file itself holds it.
 *
 * #117 is a claim about where lines fall on paper, and the only witness to that
 * is the document. `20a` and `40a` already read the saved bytes, but they read
 * them for a font: `expect(raw).toContain('/FontFile2')` says a face was
 * embedded and says nothing at all about the sentence drawn with it. Between
 * those assertions and the person who opened the file and saw a word cut in half
 * there was no instrument, which is why the defect survived three green suites -
 * `40a`'s own comment says as much.
 *
 * This is that instrument, and it needs nothing installed. Four properties of
 * what jsPDF writes make it possible:
 *
 * - **The file is not compressed.** jsPDF leaves its content streams as plain
 *   text unless asked otherwise, so the drawing operators can be read directly.
 *   `isReadable` below is the assertion of that, and a row calls it before
 *   trusting anything else here: the day jsPDF compresses by default this module
 *   goes quiet rather than wrong.
 * - **Every embedded face carries a `/ToUnicode` CMap.** The text is written as
 *   glyph ids of a subset font, so `<00f1...> Tj` is meaningless on its own; the
 *   CMap is the file's own table from those ids back to characters, and it is
 *   there because a reader needs to be able to copy text out.
 * - **Every embedded face carries a `/W` array** of glyph advances in
 *   thousandths of an em, which is what makes a line's drawn width a number
 *   rather than a character count. #115 is the standing reminder that those are
 *   not the same thing.
 * - **autoTable draws a cell's border before its text**, so the rectangle most
 *   recently added is the box the following line sits in. That is what lets a
 *   row ask whether a line ran past its cell without being told the column
 *   widths a second time.
 *
 * Everything is in PDF user space - points, y upwards from the bottom left -
 * because that is the unit the file is written in, whatever unit the document
 * was built with. A row comparing `x + width` against `box.x + box.width` is
 * comparing points with points and needs no conversion.
 *
 * The DOM's answer to the same question is `line-breaks.js`, from #118. They
 * share no code on purpose: one reads client rects a browser produced, this one
 * reads a file, and a helper that tried to be both would be able to say neither
 * accurately.
 */

/**
 * The two Thai classes the ticket's criteria name, written here rather than
 * imported from the application.
 *
 * `frontend/src/lib/thaiWrap.js` holds its own copy of the leading vowels. That
 * is deliberate: a test that asked the code for the list would be asking the
 * code whether it agrees with itself. These five are from #117's acceptance
 * criteria, and the ticket is the authority for both copies.
 */
const LEADING_VOWELS = 'เแโใไ';

/**
 * The tone marks and the vowels written above and below, which are the
 * characters that must never begin a line - each of them is drawn on the
 * consonant before it, so a line that starts with one starts with a mark
 * floating over nothing.
 */
const MARKS =
  'ัิีึืฺุู' +
  '็่้๊๋์ํ๎';

/** Latin-1, because a PDF is bytes and the operators in it are ASCII. */
const textOf = bytes => Buffer.from(bytes).toString('latin1');

/**
 * Whether this file is one this module can read at all.
 *
 * A compressed content stream is not a failure of the code under test, and a
 * row that reported it as one would be blaming #117 for a change in jsPDF.
 */
const isReadable = bytes => {
  const raw = textOf(bytes);
  return raw.includes('%PDF-') && !raw.includes('/Filter /FlateDecode') && /\bTj\b/.test(raw);
};

const objectsOf = raw => {
  const objects = new Map();
  for (const match of raw.matchAll(/(\d+) 0 obj\b([\s\S]*?)endobj/g)) {
    objects.set(Number(match[1]), match[2]);
  }
  return objects;
};

const streamOf = body => {
  const match = body.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
  return match ? match[1] : null;
};

/** Glyph id to character, out of a `/ToUnicode` CMap's two block kinds. */
const cmapOf = stream => {
  const map = new Map();
  if (!stream) return map;
  for (const block of stream.match(/beginbfchar([\s\S]*?)endbfchar/g) || []) {
    for (const pair of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      map.set(parseInt(pair[1], 16), String.fromCharCode(parseInt(pair[2].slice(0, 4), 16)));
    }
  }
  for (const block of stream.match(/beginbfrange([\s\S]*?)endbfrange/g) || []) {
    for (const trio of block.matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g
    )) {
      const from = parseInt(trio[1], 16);
      const to = parseInt(trio[2], 16);
      const first = parseInt(trio[3].slice(0, 4), 16);
      for (let gid = from; gid <= to; gid += 1) {
        map.set(gid, String.fromCharCode(first + (gid - from)));
      }
    }
  }
  return map;
};

/**
 * Glyph id to advance width, in thousandths of an em, out of a CIDFont's `/W`.
 *
 * The array is a sequence of `<first gid> [ w w w … ]` groups. The other legal
 * form - `<first> <last> <w>` for a run of equal widths - is not written by
 * jsPDF and is not read here; a glyph the array does not mention is reported
 * rather than guessed, because a width guessed at is the character count of
 * #115 wearing a different name.
 */
const widthsOf = body => {
  const widths = new Map();
  const array = body.match(/\/W\s*\[([\s\S]*?)\]\s*(?:\/|>>)/);
  if (!array) return widths;
  for (const group of array[1].matchAll(/(\d+)\s*\[([^\]]*)\]/g)) {
    const first = Number(group[1]);
    const numbers = group[2].trim().split(/\s+/).filter(Boolean).map(Number);
    numbers.forEach((w, i) => widths.set(first + i, w));
  }
  return widths;
};

/**
 * The faces the page can select, by the resource name the operators use.
 *
 * Keyed by name and never merged into one table: two subsets of two faces
 * number their glyphs from the same low ids, so a single flat map would decode
 * the bold text with the normal face's table. On 25 September 2569 the two
 * THSarabun subsets shared ten ids and agreed about all ten - which is luck, not
 * a reason to rely on it.
 */
const facesOf = objects => {
  const faces = new Map();
  for (const body of objects.values()) {
    const dictionary = body.match(/\/Font\s*<<([\s\S]*?)>>/);
    if (!dictionary) continue;
    for (const entry of dictionary[1].matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) {
      const font = objects.get(Number(entry[2])) || '';
      const toUnicode = font.match(/\/ToUnicode\s+(\d+) 0 R/);
      const descendant = font.match(/\/DescendantFonts\s*\[\s*(\d+) 0 R/);
      faces.set(entry[1], {
        name: (font.match(/\/BaseFont\s*\/([^\s/>[\]]+)/) || [])[1] || null,
        object: Number(entry[2]),
        cmap: cmapOf(toUnicode ? streamOf(objects.get(Number(toUnicode[1])) || '') : null),
        widths: descendant ? widthsOf(objects.get(Number(descendant[1])) || '') : new Map(),
      });
    }
  }
  return faces;
};

/** The page content streams, in the order the document's `/Kids` lists them. */
const pageStreamsOf = objects => {
  const order = [];
  for (const body of objects.values()) {
    if (!/\/Type\s*\/Pages/.test(body)) continue;
    const kids = body.match(/\/Kids\s*\[([^\]]*)\]/);
    if (!kids) continue;
    for (const kid of kids[1].matchAll(/(\d+) 0 R/g)) order.push(Number(kid[1]));
  }
  const streams = [];
  for (const page of order) {
    const contents = (objects.get(page) || '').match(/\/Contents\s+(\d+) 0 R/);
    if (!contents) continue;
    const stream = streamOf(objects.get(Number(contents[1])) || '');
    if (stream) streams.push(stream);
  }
  return streams;
};

/**
 * Every line of text the document draws, in the order it draws them.
 *
 * Each line carries what it says, the face and size it says it in, where it
 * starts, how wide it is drawn, and the cell rectangle it sits inside when it
 * sits in one. A glyph whose face has no entry for it becomes U+FFFD and adds
 * nothing to the width, so a line that cannot be decoded is visible as one
 * rather than quietly short.
 */
const linesOf = bytes => {
  const raw = textOf(bytes);
  const objects = objectsOf(raw);
  const faces = facesOf(objects);
  const lines = [];

  for (const [page, stream] of pageStreamsOf(objects).entries()) {
    let face = null;
    let resource = null;
    let size = 0;
    let leading = 0;
    let box = null;
    let x = 0;
    let y = 0;

    const operators =
      /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+re\b|\/(F\d+)\s+(-?[\d.]+)\s+Tf\b|(-?[\d.]+)\s+TL\b|(-?[\d.]+)\s+(-?[\d.]+)\s+Td\b|(T\*)|<([0-9A-Fa-f]*)>\s*Tj\b/g;

    for (const token of stream.matchAll(operators)) {
      if (token[4] !== undefined) {
        box = {
          x: Number(token[1]),
          y: Number(token[2]),
          width: Number(token[3]),
          height: Number(token[4]),
        };
        continue;
      }
      if (token[5] !== undefined) {
        resource = token[5];
        face = faces.get(resource) || null;
        size = Number(token[6]);
        continue;
      }
      if (token[7] !== undefined) {
        leading = Number(token[7]);
        continue;
      }
      if (token[9] !== undefined) {
        x = Number(token[8]);
        y = Number(token[9]);
        continue;
      }
      if (token[10] !== undefined) {
        y -= leading;
        continue;
      }

      const glyphs = (token[11].match(/.{4}/g) || []).map(hex => parseInt(hex, 16));
      lines.push({
        page,
        text: glyphs.map(gid => face?.cmap.get(gid) ?? '�').join(''),
        font: face?.name ?? null,
        resource,
        size,
        x,
        y,
        width: glyphs.reduce((total, gid) => total + (face?.widths.get(gid) ?? 0), 0) * size / 1000,
        // A rectangle drawn before any text, or a heading drawn outside a table,
        // leaves this null rather than pointing at whatever was drawn last.
        box: box && box.height < 0 && y < box.y && y > box.y + box.height ? box : null,
      });
    }
  }

  return lines;
};

/**
 * The lines regrouped into the cells that hold them.
 *
 * A cell is the run of consecutive lines drawn inside one rectangle, which is
 * how autoTable emits them: the border, then every line of that cell, then the
 * next border. Grouping by the rectangle rather than by `x` is what keeps a
 * centred or right-aligned cell in one piece.
 *
 * `text` is the cell's lines run together with nothing between them, and
 * `breaks` the offsets into that string at which a line ended. Those offsets are
 * the subject of #117: an offset that is not a word boundary is a word cut in
 * half. Lines drawn outside any table - the headings at the top of both
 * documents - have no rectangle and are left out, because a heading that does
 * not wrap has no break to ask about.
 */
const cellsOf = lines => {
  const cells = [];
  let current = null;
  const same = (a, b) =>
    a && b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  for (const line of lines) {
    if (!line.box) {
      current = null;
      continue;
    }
    if (!current || !same(current.box, line.box)) {
      current = { box: line.box, page: line.page, size: line.size, resource: line.resource, lines: [] };
      cells.push(current);
    }
    current.lines.push(line);
  }
  return cells.map(cell => {
    const text = cell.lines.map(line => line.text).join('');
    const breaks = [];
    let at = 0;
    for (const line of cell.lines.slice(0, -1)) {
      at += line.text.length;
      breaks.push(at);
    }
    return { ...cell, text, breaks };
  });
};

/**
 * The places a line ended with a leading vowel, as sentences naming both sides.
 *
 * The next line's first character is part of the finding because that is the
 * consonant the vowel belongs in front of: `…และอินเทอร์เ` alone reads like a
 * typo, and `เ` / `ฟ` names the defect.
 */
const strandedVowels = lines =>
  lines
    .map((line, i) => ({ line, next: lines[i + 1] }))
    .filter(
      ({ line, next }) =>
        next &&
        line.page === next.page &&
        // `''.slice(-1)` is `''`, and every string contains the empty string, so
        // a line that drew nothing would otherwise be reported as stranding
        // every vowel at once.
        line.text !== '' &&
        LEADING_VOWELS.includes(line.text.slice(-1))
    )
    .map(
      ({ line, next }) =>
        `${line.text.slice(-14)} | ${next.text.slice(0, 14)}` +
        ` (${line.text.slice(-1)} stranded before ${next.text.slice(0, 1)})`
    );

/** The lines that begin with a mark drawn on a consonant that is not there. */
const orphanedMarks = lines =>
  lines
    .filter(line => line.text !== '' && MARKS.includes(line.text.slice(0, 1)))
    .map(line => `${line.text.slice(0, 14)} begins with ${line.text.slice(0, 1)}`);

/**
 * How far each line runs past the right edge of the cell drawn around it, in
 * points, for the lines that run past at all.
 *
 * The comparison is against the cell's border and not against its text area,
 * so a line that eats into the padding is not reported: autoTable adds a point
 * of slack to the width it wraps at, and a row that called that an overflow
 * would be asserting a rounding fudge rather than a document that cannot be
 * read.
 */
const overflows = lines =>
  lines
    .filter(line => line.box && line.x + line.width > line.box.x + line.box.width)
    .map(
      line =>
        `${line.text.slice(0, 20)} runs ` +
        `${(line.x + line.width - line.box.x - line.box.width).toFixed(2)}pt past its cell`
    );

/** Every line whose text contains `word`, for a row that wants to ask about one. */
const holding = (lines, word) => lines.filter(line => line.text.includes(word));

// `LEADING_VOWELS` and `MARKS` stay in here. They are what `strandedVowels` and
// `orphanedMarks` are about, and a row that imported them would be restating the
// question rather than asking it.
module.exports = {
  isReadable,
  linesOf,
  cellsOf,
  strandedVowels,
  orphanedMarks,
  overflows,
  holding,
};

/**
 * Where a line of Thai may be broken, for the documents that have to break it
 * themselves — #117.
 *
 * A browser knows this already. `overflow-wrap` and the CSS line breaker ask ICU
 * where Thai words are and break between them, which is why nothing on any
 * screen in this application shows the defect this module exists for. A PDF has
 * no line breaker: jsPDF measures a character at a time and its own source says
 * what that means — *at this time works only on Western scripts, ones with space
 * char separating the words*. Thai writes no spaces between words, so a whole
 * sentence is one word to it and the break lands wherever the column runs out,
 * cutting คำ in half and, at worst, leaving a leading vowel behind on the line
 * above the consonant it is written in front of.
 *
 * So the wrapping is done here, before the text is handed to a table, and it is
 * the same dictionary the browser uses: `Intl.Segmenter('th', { granularity:
 * 'word' })`. #118 measured what that answers for Thai and the answer is worth
 * repeating, because it is the limit of this fix as much as its mechanism: ICU
 * segments by a dictionary, so `ปีการศึกษา` comes back as `ปี|การ|ศึกษา` and
 * `อินเทอร์เฟซ`, which its dictionary does not hold, as `อิน|เท|อร์เฟซ`. A break
 * at any of those is a break a Thai reader may still find odd. What it is not is
 * a break in the middle of a syllable, which is what this replaces.
 *
 * ## Three rules, and why the ticket's two options are both needed
 *
 * #117 offers word segmentation *or*, failing that, a small rule forbidding a
 * break after a leading vowel. Measured, they are not alternatives:
 *
 * 1. **Break between words** where the dictionary gives a boundary.
 * 2. **A word too wide for the column on its own is cut between grapheme
 *    clusters.** Something has to give, and a cluster boundary is the least bad
 *    place: a Thai tone mark or an above/below vowel belongs to the consonant
 *    before it, and ICU's grapheme clusters keep the two together, so no line
 *    can begin with a mark drawn over nothing. `ำ` is kept with its consonant
 *    too, which ICU does of its own accord and the fallback had to be taught
 *    (#165).
 * 3. **No line ends with a leading vowel.** Rule 1 does not imply this — a
 *    segment can itself end in one — and rule 2 cannot, because `เ` is a
 *    grapheme cluster of its own. The retreat is always backwards, never
 *    forwards: a piece is moved down to the next line, so a line that fitted
 *    still fits. Pushing the vowel down onto a line that was already full would
 *    trade this defect for text drawn through the table's border.
 *
 * The caller measures. `widthOf` is the document's own text measurement with the
 * document's own font and size selected, because a width computed any other way
 * is the character count of #115 in a different costume.
 */

/**
 * The five vowels written before the consonant they are pronounced after.
 *
 * Not exported. `e2e/support/pdf-text.js` holds its own copy of this list, on
 * purpose: a row that imported this one would be asking the code whether it
 * agrees with itself. #117's acceptance criteria are the authority for both.
 */
const LEADING_VOWELS = 'เแโใไ'

/**
 * A consonant and the marks drawn on it, for a browser with no `Intl.Segmenter`.
 *
 * Reached by no browser the application supports — Chrome, Edge, Firefox and
 * Safari have all had `Intl.Segmenter` for years, and #118's row 5 asserts it is
 * there in the one the suite drives. It is here because the alternative to a
 * fallback is a `TypeError` inside an export button: untested rather than
 * unreachable, and the same call this module would make to it if it were.
 *
 * `ำ` is in the class and is not a mark — #165. It is written to the right of
 * its consonant and it carries a width, where the other sixteen carry none, and
 * that is why it was missed: the ranges here are the marks, by block. ICU does
 * not miss it. U+0E33 is `Grapheme_Cluster_Break = SpacingMark`, so UAX #29
 * forbids a break in front of it and `Intl.Segmenter` answers `นำ` as one
 * cluster. What this line is for is agreeing with that answer when there is
 * nobody to ask, and one character's disagreement was a line beginning with half
 * a syllable.
 */
const CLUSTER = /[\s\S][ัิ-ฺ็-๎ำ]*/g

const segmenters = new Map()

const piecesOf = (text, granularity) => {
  if (typeof Intl.Segmenter !== 'function') {
    // No dictionary means no word boundaries at all, so the whole paragraph is
    // one word and rule 2 does the wrapping. Clusters are still recoverable
    // without ICU, which is what keeps rule 2's promise about marks.
    return granularity === 'word' ? [text] : text.match(CLUSTER) || []
  }
  if (!segmenters.has(granularity)) {
    segmenters.set(granularity, new Intl.Segmenter('th', { granularity }))
  }
  return [...segmenters.get(granularity).segment(text)].map(one => one.segment)
}

const endsWithLeadingVowel = piece => LEADING_VOWELS.includes(piece.slice(-1))

/**
 * How many of `pieces` the line may keep, given rule 3.
 *
 * Never returns zero: a line of one piece that ends in a leading vowel has
 * nowhere to retreat to, and an empty line would lose the text rather than move
 * it.
 */
const retreat = (pieces, take) => {
  let kept = take
  while (kept > 1 && endsWithLeadingVowel(pieces[kept - 1])) kept -= 1
  return kept
}

/** One over-wide word, cut between clusters, each line as wide as it can be. */
const chop = (word, maxWidth, widthOf) => {
  const clusters = piecesOf(word, 'grapheme')
  const lines = []
  let from = 0
  while (from < clusters.length) {
    let take = 0
    let line = ''
    while (from + take < clusters.length) {
      const next = line + clusters[from + take]
      if (take > 0 && widthOf(next) > maxWidth) break
      line = next
      take += 1
    }
    const kept = retreat(clusters.slice(from), take)
    lines.push(clusters.slice(from, from + kept).join(''))
    from += kept
  }
  return lines
}

const wrapParagraph = (paragraph, maxWidth, widthOf) => {
  if (paragraph === '' || widthOf(paragraph) <= maxWidth) return [paragraph]

  const words = piecesOf(paragraph, 'word')
  const lines = []
  let line = []

  const close = () => {
    const kept = retreat(line, line.length)
    const rest = line.slice(kept)
    lines.push(line.slice(0, kept).join('').replace(/\s+$/, ''))
    line = rest
  }

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]
    if (line.length === 0) {
      // A space that has become the first thing on a line is the space the
      // break replaced, and drawing it would indent the line by it.
      if (/^\s+$/.test(word)) continue
      if (widthOf(word) > maxWidth) {
        const pieces = chop(word, maxWidth, widthOf)
        lines.push(...pieces.slice(0, -1))
        line = [pieces[pieces.length - 1]]
        continue
      }
      line = [word]
      continue
    }
    if (widthOf(line.join('') + word) <= maxWidth) {
      line.push(word)
      continue
    }
    close()
    i -= 1
  }

  if (line.length > 0) lines.push(line.join('').replace(/\s+$/, ''))
  return lines
}

/**
 * `text` broken into lines none of which is wider than `maxWidth`.
 *
 * Line feeds the caller wrote are kept as breaks of their own: they are the
 * author saying where a line ends, and a wrapper that reflowed across them would
 * be overruling `CLO-4\n` + its detail into one paragraph.
 */
const wrapThai = (text, maxWidth, widthOf) =>
  text.split('\n').flatMap(paragraph => wrapParagraph(paragraph, maxWidth, widthOf))

/**
 * The same, as the one string a table cell takes — and the only way in, because
 * a cell is a string in and a string out.
 *
 * A caller passing something that is not a string gets it back untouched. No
 * caller does today — every one is a template string — and the guard is here
 * because the alternative is an export button that throws on a null where it
 * used to draw nothing. It is written once, here, rather than at both doors.
 */
export const wrapped = (text, maxWidth, widthOf) =>
  typeof text === 'string' ? wrapThai(text, maxWidth, widthOf).join('\n') : text

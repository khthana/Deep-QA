/**
 * How a five-point figure is drawn, for every screen that draws one.
 *
 * `backend/lib/attainment.js` owns the rules — what a score is, where it
 * passes, which band it falls in. Nothing here decides any of that. What is
 * here is the other half, the half the rules say nothing about: which colour a
 * band is painted, how many decimal places a score is written to, and how a
 * range reads in words. Two screens now draw the same figures — #38 at the
 * level of one Section and one CLO, #42 at the level of one intake and one PLO
 * — and a second copy of the colours is the kind of debt that never announces
 * itself: both screens go on drawing plausible cells, and only somebody
 * holding the two side by side sees they disagree.
 *
 * It sits in `lib/` rather than `components/` for the reason `backend/lib/`
 * exists: none of it renders anything, and a directory of components is a
 * promise that everything in it does.
 */

/**
 * BR-20's five bands, as colours.
 *
 * Indexed by the band the server sent, so a band nobody has a colour for is a
 * missing key rather than a silently wrong shade. The *ranges* are not here:
 * they arrive as `band_floors` with the data, because a legend that kept its
 * own copy of the numbers would go on saying 3.0 – 3.4 after the rule moved.
 *
 * **All five sit at 400, and the level is a measurement rather than a taste.**
 * #37's walk found the ramp too faint to read as colour at all — measured off
 * the running screen, every band's background was between 1.03 and 1.22 times
 * the page's white, which is a tint a reader has to look for. #113 asked for
 * two numbers instead: a background at least 1.5 against white, so the colour
 * is seen without being hunted, and text at least 4.5 on it, which is AA for
 * the 12px these cells are set in. The ticket proposed level 200; measured,
 * 200 reaches only 1.16–1.45 and fails the first of its own numbers. 400 is
 * the lowest uniform level where every band passes both: 1.51–2.77 against
 * white, 5.06–5.84 for the text.
 *
 * Band 1 is the one exception, and it is the same rule rather than a lapse:
 * `text-red-900` on `bg-red-400` is 3.62, under AA, so band 1 reads at 950.
 * The criterion is the contrast number, not the digit on the token.
 *
 * `chip` is left where it was. A chip carries no text and its job is to key
 * the legend to the cells, which it does at any level the eye can pair with
 * them; its own spread of 300–500 is untidy and was looked at on 10 October
 * 2569 and deliberately kept, so a later reader does not read it as drift.
 */
export const BANDS = {
  1: { cell: 'bg-red-400 text-red-950', chip: 'bg-red-500' },
  2: { cell: 'bg-amber-400 text-amber-900', chip: 'bg-amber-400' },
  3: { cell: 'bg-yellow-400 text-yellow-900', chip: 'bg-yellow-300' },
  4: { cell: 'bg-lime-400 text-lime-900', chip: 'bg-lime-400' },
  5: { cell: 'bg-emerald-400 text-emerald-900', chip: 'bg-emerald-500' },
}

/**
 * The mark that rides beside a flagged figure, as a class.
 *
 * Here and not in the four screens that draw it because all four sank the
 * same way the day the ramp was darkened, and for one reason: on the pale
 * `bg-red-100` the ramp used to be painted in, the mark could be the cell's
 * own text colour and be read, while on `bg-red-400` `text-red-950` is 5.84 —
 * which passes AA and still sank, because a mark the same colour as the
 * figure beside it is read as part of the figure rather than as a second
 * signal. The walk of 10 October 2569 said so in those words.
 *
 * White is 2.77 on `bg-red-400` and so would fail the contrast this ticket
 * exists to raise — the shadow is what pays for it, putting `text-red-950`
 * immediately around every stroke, which is the contrast the eye actually
 * reads a glyph against. It is a shadow and not a chip because a chip was
 * looked at on the same walk and read as a second control inside the cell.
 * `#450a0a` is `red-950` written out, because an arbitrary value in a
 * Tailwind class cannot name a token; it is the same colour band 1's own
 * text reads at, and the two move together.
 *
 * **The fourth screen was found by a review and not by the walk.**
 * `LearningDetails`, `ProgramLevelAllStudents` and `ProgramLevelIndividual`
 * draw the mark from `flagged`; `ProgramLevelCompare` draws it from
 * `passed === false`, which is BR-17 at the level of an outcome and a
 * cohort rather than a student. A census that looks for the flag's name
 * cannot see it. The mechanism is *a mark drawn over a `BANDS` cell*, and
 * counting by that is what finds all four.
 *
 * **The shadow's colour does not assume the mark lands on band 1, because on
 * one of the four screens it does not.** The first draft of this paragraph
 * said it did, with a condition and a date; the condition was true of the three
 * `flagged` screens and false of the fourth, which is the same mistake as
 * counting the screens by the flag's name, made one paragraph later.
 *
 * On the three, the mark follows `PASS` and the colour follows `BAND_FLOORS`,
 * which are two settings and not one; they coincide today only because
 * `backend/lib/attainment.js` writes the second band's floor *as* `PASS`. The
 * walk of 10 October 2569 moved the floors to `[0, 2.5, 3.5, 4.0, 4.8]`, which
 * is what `38`'s row about the legend asks for, and watched the mark come up on
 * `bg-amber-400`, where a dark red halo is worth much less than it is on red.
 * `38`'s own note *the flag and the band are one line by coincidence* is that
 * observation one layer down, written before this constant existed.
 *
 * On `ProgramLevelCompare` the two are not even nearly one line, and **no
 * configuration has to move**: the mark is `passed === false`, which is
 * `passRate > OUTCOME_PASS_PERCENT` — a share of students — while the colour is
 * `bandOf(mean)`. A cohort can hold a mean of 3.9 and a pass rate of 55 per
 * cent on the same outcome, so with the configuration this installation ships
 * the mark can land on any of the five. The same walk raised
 * `OUTCOME_PASS_PERCENT` to 95 to build the situation the seed does not contain
 * and looked at it on `bg-yellow-400`; the answer both times was that the mark
 * still reads as a separate signal, so the constant is kept. What is written
 * down here is the reason it was kept, which is a measurement and not a range
 * of backgrounds the halo was designed for.
 *
 * The mark stays a character and not an icon for #38's reason, which has not
 * changed: below the line has to survive being printed and being read by
 * somebody who cannot tell two shades of a ramp apart.
 */
export const FLAG =
  'ml-1 font-bold text-white [text-shadow:0_0_2px_#450a0a,0_1px_1px_#450a0a]'

/** A number as a figure, or an em dash where there is no number to show. */
export const figure = (value, suffix = '') =>
  value === null || value === undefined ? '—' : `${value}${suffix}`

/**
 * A five-point score, always to two decimal places.
 *
 * The server rounds to two before sending, so the places are not invented
 * here — what they buy is a column that reads as a column. Left to
 * JavaScript's own idea of a number, a mean of exactly four prints as `4`
 * beside a `3.33`, and a reader comparing the two down a page of thirteen
 * outcomes is comparing figures that are not written the same way.
 */
export const score = (value, suffix = '') =>
  value === null || value === undefined ? '—' : `${value.toFixed(2)}${suffix}`

/**
 * A number of marks, always to two decimal places.
 *
 * Not a `score`. A score is out of five and a mark is out of whatever the work
 * happened to be worth; the two are written the same way and that is the whole
 * of what they have in common. It is here for the reason the file exists at
 * all — how many places a figure is written to is this module's question — and
 * because #39 had written it twice, once in a diagram and once in the table
 * beside it, under two different names.
 */
export const marks = value => value.toFixed(2)

/**
 * The criterion an outcome was judged by, said in words, from the rule itself.
 *
 * #40's report has to print what it judged by, because the document leaves the
 * application and is read by people who cannot ask. Two lines, because there
 * are two thresholds and they are about different things: the first is one
 * student against one outcome, the second is the outcome against its cohort.
 *
 * Every number comes from `rule`, which the server folds out of
 * `backend/lib/attainment.js`. Written out here as a literal instead, this
 * would be a sentence that goes on claiming three of five after the pass line
 * moved — on a page whose entire purpose is to state the rule correctly, which
 * makes it the worst possible place for a stale copy.
 *
 * `มากกว่า` is not decoration. BR-17 is strict, `outcomePassed` implements it
 * strictly, and an outcome exactly at sixty per cent has not passed — so a
 * sentence reading *ไม่น้อยกว่า* would describe a different rule from the one
 * that produced the verdict beside it.
 *
 * Neither clause carries a conjunction. They are joined differently in the
 * three places they appear — one above the table, one inside a cell, one on a
 * PDF — and a leading *และ* baked in here means every caller that wants the
 * clause on its own has to cut it back off, which is a caller editing a
 * sentence it did not write.
 */
export const criterionLines = rule => [
  `คะแนน ≥ ${rule.pass_score.toFixed(2)} จาก ${rule.scale}`,
  `ผู้ผ่านมากกว่าร้อยละ ${rule.pass_percent} ของผู้มีคะแนน`,
]

/**
 * Whether an outcome passed, as the word a person reads.
 *
 * Three states and not two. `outcomePassed` answers `null` for an outcome
 * nobody has been measured on, because such an outcome has not failed its
 * criterion — the term has not reached it — and a formal report saying
 * *ไม่ผ่าน* there is an accusation the marks do not support.
 *
 * Here rather than in the page because #40 says it twice, once on screen and
 * once on the PDF, and the two are read side by side by the person filing the
 * course file. Written out in both places, the labels drift the way any second
 * copy drifts: silently, with both artefacts still rendering plausibly. It is
 * the same argument this file already makes for `criterionLines`.
 *
 * The colours stay with the screen. A chip's shade is that screen's business
 * and the PDF has no chips — what has to agree is the word.
 */
export const verdictLabel = passed => {
  if (passed === null || passed === undefined) return 'ยังไม่ประเมิน'
  return passed ? 'ผ่าน' : 'ไม่ผ่าน'
}

/** One band's range, said in words, from the floors the rule was read off. */
export function rangeOf(floors, band) {
  const next = floors[band]
  if (band === 1) return `ต่ำกว่า ${floors[1].toFixed(1)}`
  if (next === undefined) return `${floors[band - 1].toFixed(1)} ขึ้นไป`
  return `${floors[band - 1].toFixed(1)} – ${(next - 0.1).toFixed(1)}`
}

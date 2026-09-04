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
 */
export const BANDS = {
  1: { cell: 'bg-red-100 text-red-900', chip: 'bg-red-500' },
  2: { cell: 'bg-amber-100 text-amber-900', chip: 'bg-amber-400' },
  3: { cell: 'bg-yellow-50 text-yellow-800', chip: 'bg-yellow-300' },
  4: { cell: 'bg-lime-100 text-lime-900', chip: 'bg-lime-400' },
  5: { cell: 'bg-emerald-100 text-emerald-900', chip: 'bg-emerald-500' },
}

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

/** One band's range, said in words, from the floors the rule was read off. */
export function rangeOf(floors, band) {
  const next = floors[band]
  if (band === 1) return `ต่ำกว่า ${floors[1].toFixed(1)}`
  if (next === undefined) return `${floors[band - 1].toFixed(1)} ขึ้นไป`
  return `${floors[band - 1].toFixed(1)} – ${(next - 0.1).toFixed(1)}`
}

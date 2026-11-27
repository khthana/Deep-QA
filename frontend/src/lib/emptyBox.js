/**
 * The box a list of cards draws when it has nothing to show - `docs/ui-consistency.md`
 * rule 10, the owner's answer of 27 November 2569 (#318).
 *
 * A dashed outline with small corners, no ground, and small grey type: the
 * teacher screens' box, which replaced the report screens' `rounded-xl ...
 * bg-white` one. The words inside stay each screen's own; a box that says a
 * second line still sets that line's own size.
 *
 * One constant, like `CARD`, so the next empty list cannot drift by a typo.
 * The empty message *inside a table* is a different thing and was already one
 * shape (`px-4 py-8 text-center text-slate-500`).
 */
export const EMPTY_BOX =
  'rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500'

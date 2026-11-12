/**
 * Is a row a save or an import wrote outside the search the table is on? -
 * #272, the owner's answer ข้อ 4 of 12 November 2569: the search box is a
 * filter like the others, so #247's sentence (`lib/outsideTheFilter.js`) is
 * said when the row just written does not hold the term.
 *
 * It restates `backend/lib/search.js`, which is what makes it a restatement and
 * not a second rule (#96): the term trimmed and blank meaning *no search*, each
 * value compared as text, any case, and the term a literal - the server escapes
 * `%` and `_`, so `includes` is the same question. Which values is the caller's,
 * written at its call beside the columns its route searches, so that each
 * screen's use is a claim with its own mutant (#104).
 *
 * `Users.js` keeps its own `matchesSearch`, which predates this and answers
 * for a route that still reads `%` and `_` as wildcards.
 */
export const outsideSearch = (term, values) => {
  const wanted = String(term ?? '').trim().toLowerCase()
  if (!wanted) return false
  return !values.some(value => String(value ?? '').toLowerCase().includes(wanted))
}

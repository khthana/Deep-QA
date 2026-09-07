'use strict';

/**
 * The order a list of ผลการเรียนรู้ is read in — #96.
 *
 * `subject_clo.clo_number` is `varchar(50)` and the person types it, so the
 * database orders it as text: `'CLO-10' < 'CLO-2'` is true, and a set with more
 * than nine outcomes reads with CLO-10 wedged between CLO-1 and CLO-2 on every
 * screen that lists one.
 *
 * ## Why nothing caught it
 *
 * `db/seed.js` builds `CLO-1..CLO-9` from a nine-entry array, and on nine
 * single-digit codes **ordering as text and ordering as a number give the same
 * nine rows**. Both suites passed over it for months, and **four** backend
 * tests built their expected order with a copy of the route's own `ORDER BY`,
 * so they would have gone on passing whatever this rule became. Seven files
 * match that grep; the other three are two fixture helpers that fetch three
 * CLOs *lowest number first* without claiming the route agrees, and a
 * `DESC LIMIT 1` that picks a row rather than asserting an order. CLO-10 is the first
 * code that tells the two apart, and the rows that prove this one state their
 * sequence literally.
 *
 * ## Why it is a fragment and not a comparator
 *
 * The order has to be the database's, because two of its callers page and one
 * takes `LIMIT 1`; sorting after the fact in JavaScript would order a page
 * rather than the set. So this is SQL, extracted here at its **tenth** use.
 * #96's own comment names four sites in three files; there are ten across eight
 * route files, plus two more in `sectionResults.js` that are deliberately not
 * callers — see below. (Counted with `grep -c`. The first draft of this line
 * said nine, in four places, and two of the four survived the first correction
 * — which is this repo's hand-kept-number lesson landing on the very ticket
 * whose headline is that #96's own diagnosis undercounted.)
 *
 * ## The shape of the key
 *
 * Digits are pulled out of the code and compared as a number; anything else in
 * the code is ignored for that comparison and the full text breaks the tie, so
 * two codes with the same digits keep a stable order rather than an arbitrary
 * one. A code with no digits at all sorts last rather than raising, which is
 * not a feature for a shape the owner says does not exist — it is the
 * difference between an odd row at the bottom of a list and a 500 on a screen.
 *
 * `numeric` and not `integer` on purpose: the column takes fifty characters,
 * and casting fifty digits to `integer` is [#107](https://github.com/khthana/Deep-QA/issues/107)
 * on a different table — an all-digit value that overflows is a 500, not an
 * answer.
 *
 * ## What is deliberately not a caller
 *
 * `sectionResults.js` builds `array_agg(DISTINCT c.clo_number ORDER BY
 * c.clo_number)` twice and compares the two arrays for equality, to ask whether
 * two academic years carry the same set of outcomes. That is a **set**
 * comparison whose order is internal and self-consistent: both sides are built
 * the same way, so the answer does not depend on which order is used, and
 * Postgres will not accept a sort key that is not one of the `DISTINCT`
 * expressions anyway. #96's comment reads as though every `ORDER BY
 * clo_number` in the store were the same defect. Two of them are not.
 */

/** A table alias as it may be written in front of a column, or none. */
const qualifier = (alias) => {
  if (alias === undefined || alias === null || alias === '') return '';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
    throw new TypeError(`cloOrder: ${JSON.stringify(alias)} is not a table alias`);
  }
  return `${alias}.`;
};

/**
 * The two sort keys a list of outcomes is ordered by, for `ORDER BY`.
 *
 * Callers append whatever else they order by — `c.clo_id ASC` for a stable
 * tail, or nothing where the column is grouped and no id is in scope.
 */
const cloOrder = (alias = 'c') => {
  const at = qualifier(alias);
  return (
    `NULLIF(regexp_replace(${at}clo_number, '[^0-9]', '', 'g'), '')::numeric ASC NULLS LAST, ` +
    `${at}clo_number ASC`
  );
};

module.exports = { cloOrder };

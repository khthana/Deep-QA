'use strict';

const { blankToNull } = require('./fields');

/**
 * The search box of a list - #272, the owner's answer of 12 November 2569.
 *
 * The delivered screens filtered the rows in hand (`DEEP-QA-FRONTEND/src/
 * components/SeachSection.js` with `toLowerCase().includes` over the row), and
 * a list the rebuild pages on the server holds ten of them, so the same box in
 * the browser would find what is on the current page and nothing else. The
 * search is therefore a parameter of each list route, `?q=`, and this module is
 * what the routes share of it: reading the term, and writing the clause.
 *
 * **Which columns is each route's**, written at the call so that a grep for a
 * column finds the list that searches it, and so that a mutant can take one
 * route's column away and leave the others standing (#68, #104). The answer
 * was *every column the table shows*; what each route passes is the record's
 * own text that the table shows - its code, its names, and a year where the
 * table has one. The department, programme and status columns are the other
 * lists' names and a label, and the screens that show them carry a filter for
 * them or a picker; that is a reading of the answer, and #272 says so.
 *
 * **A term is text.** `%` and `_` are what a person typed, so they are escaped
 * before they reach `ILIKE`, whose default escape is the backslash. The search
 * on `routes/users.js` predates this and reads them as wildcards, which its
 * screen documents as a limit; that route is left as it is.
 *
 * Blank is no search, trimmed as `blankToNull` trims, and a `q` that arrives
 * twice (`?q=a&q=b`, which Express hands over as an array) is no search either
 * rather than a value the driver would have to turn into text.
 */
const searchOf = (req) => {
  const term = typeof req.query.q === 'string' ? blankToNull(req.query.q) : null;
  return term === null ? null : term.replace(/[\\%_]/g, '\\$&');
};

/**
 * `($n IS NULL OR a ILIKE '%' || $n || '%' OR b ...)` - absent means no
 * restriction, as every other filter in these routes is written, so the SQL is
 * never assembled from what was sent: only the column names, which are this
 * module's callers' constants, are put into the text.
 */
const holding = (param, columns) =>
  `($${param}::text IS NULL OR ${columns
    .map((column) => `${column}::text ILIKE '%' || $${param} || '%'`)
    .join(' OR ')})`;

module.exports = { searchOf, holding };

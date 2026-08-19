'use strict';

/**
 * Reading a field, and reading Postgres' answer — extracted at the third copy.
 *
 * Every screen that maintains master data reads its fields the same way and
 * asks the database the same two questions, and by #15 the four helpers below
 * were written out verbatim in `routes/users.js`, `routes/departments.js` and
 * `routes/programs.js`. #14 extracted `lib/importer` on exactly this argument:
 * what the screens share is worth writing once, because the second and third
 * copies are where a rule quietly drifts.
 *
 * They are here rather than in `lib/importer` because they are not about
 * importing. A typed form uses them as much as a spreadsheet row does - that is
 * the point of `readUser`, `readDepartment` and `readProgram` each being one
 * function for both.
 */

/** Whitespace either side of a typed field is not part of the value. */
const trimmed = (value) => (typeof value === 'string' ? value.trim() : value);

/**
 * An empty box and an absent column both mean "not given".
 *
 * A form sends `''` for a field the person left alone and a spreadsheet leaves
 * the cell out entirely; storing the first as an empty string would make two
 * rows that look identical on screen differ in the table, and every later
 * comparison would have to know which one it was looking at.
 */
const blankToNull = (value) => {
  const text = trimmed(value);
  return text === '' || text === undefined ? null : text;
};

/** Postgres says a unique index was violated; which one is not the point. */
const isDuplicate = (error) => error.code === '23505';

/** Something still references the row that was asked to be destroyed. */
const isReferenced = (error) => error.code === '23503';

module.exports = { trimmed, blankToNull, isDuplicate, isReferenced };

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

/** The largest value an `integer` column will take; one more is a 22003. */
const INT4_MAX = 2147483647;

/**
 * An id from a URL, if it is one this schema could actually hold.
 *
 * Every route that addresses a surrogate key guards it with `/^\d+$/` before
 * querying, because the column is an `integer` and a non-numeric id would be
 * a 22P02 from the database rather than the 404 the caller is owed. The
 * regular expression alone is not the whole guard: `99999999999999999999` is
 * all digits and still overflows, and 22003 reaches the error handler as
 * เกิดข้อผิดพลาดในระบบ — a system fault, reported for a URL somebody typed.
 *
 * So the bound belongs with the shape. Anything outside it is `null`, which
 * every caller already turns into its own ไม่พบ.
 *
 * Found by #32's own tests. The routes still guarding by hand — `clos.js`,
 * `behaviors.js`, `achievementCriteria.js`, `offerings.js` — are
 * [#107](https://github.com/khthana/Deep-QA/issues/107); the three on #32's
 * own path (this ticket's route, `teachingPlan.js` and `sectionOf`) use it.
 */
const integerId = (value) => {
  const text = String(value);
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id >= 1 && id <= INT4_MAX ? id : null;
};

/** Postgres says a unique index was violated; which one is not the point. */
const isDuplicate = (error) => error.code === '23505';

/** Something still references the row that was asked to be destroyed. */
const isReferenced = (error) => error.code === '23503';

module.exports = { trimmed, blankToNull, integerId, isDuplicate, isReferenced };

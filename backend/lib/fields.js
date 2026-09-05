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

/** What `student.student_id` holds: varchar(20), and a code is never blank. */
const STUDENT_CODE_MAX = 20;

/**
 * A student's code from a URL, if it is one this schema could actually hold.
 *
 * `integerId`'s argument with a different column under it. A code past twenty
 * characters is a 22001 from the database, which reaches the error handler as
 * เกิดข้อผิดพลาดในระบบ — the system reporting a fault for a URL somebody typed,
 * when what happened is that they asked for something that cannot exist. So
 * the bound belongs with the shape here too, and anything outside it is `null`
 * for the caller to turn into its own ไม่พบ.
 *
 * Unlike `integerId` the shape is only *length*: a student code is a string
 * the registry issues and this system does not get to have an opinion about
 * what one looks like.
 */
const studentCode = (value) => {
  const text = trimmed(String(value ?? ''));
  return text.length >= 1 && text.length <= STUDENT_CODE_MAX ? text : null;
};

/**
 * A whole number a person typed, inside the bounds its column allows —
 * extracted at the third copy, like everything else here.
 *
 * A JSON number and a typed string both arrive at these routes, so both shapes
 * are read; `4.5` and `สี่` are refused rather than rounded, because a number
 * the server silently changed is one the person cannot reconcile with what
 * they typed. The bound belongs with the shape for `integerId`'s reason: a
 * week of 40000 refused here is a sentence, and refused by the smallint is a
 * 22003 reported as เกิดข้อผิดพลาดในระบบ.
 *
 * The copies it replaces were `readWeekNo` in `routes/teachingPlan.js` (#31),
 * `readWeight` in `routes/weights.js` (#30) and `readWeight` in
 * `routes/activities.js` (#33), which is the third and the reason this exists.
 */
const boundedInteger = (value, { min, max }) => {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : NaN;
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
};

/**
 * A number to the hundredth, which is how far every mark in this system counts.
 *
 * Three routes reached for it independently — a mark being read, a share being
 * divided, an average being taken — and three copies of a rounding rule is
 * three places for the hundredth to be decided differently.
 */
const round2 = (value) => Math.round(value * 100) / 100;

/** Postgres says a unique index was violated; which one is not the point. */
const isDuplicate = (error) => error.code === '23505';

/** Something still references the row that was asked to be destroyed. */
const isReferenced = (error) => error.code === '23503';

module.exports = {
  trimmed,
  blankToNull,
  integerId,
  studentCode,
  boundedInteger,
  round2,
  isDuplicate,
  isReferenced,
};

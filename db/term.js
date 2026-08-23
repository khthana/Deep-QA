'use strict';

/**
 * Which academic term the calendar is in.
 *
 * Nothing in the delivered system answered this. The screens that need it -
 * the Teacher dashboard of #24 first among them - open on "this term", and
 * "this term" had to come from somewhere that is neither a request body nor a
 * value someone remembers to edit every November. A configuration variable was
 * the obvious answer and is the wrong one: it is correct until the day it is
 * not, and the day it is not is a day nobody is looking.
 *
 * So it is derived from the date, by the rule the faculty actually works to
 * and stated by the user on 23 Aug 2026:
 *
 *   - June to October is semester 1. June rather than July because the
 *     teaching-preparation window is June, and a lecturer who opens the system
 *     to prepare should find the term they are preparing for rather than the
 *     one that ended.
 *   - November to May is semester 2. It straddles the Gregorian new year,
 *     which is why the academic year cannot be read off the calendar year.
 *   - There is no semester 3. The database and the Offerings filter still
 *     accept one - a summer term someone opens by hand is a real thing - but
 *     no date is ever in it, so this never returns one.
 *
 * The academic year is Buddhist Era and turns over with the term, in June:
 * June to December take the current พ.ศ., January to May take the one before.
 * That is what makes 1 ม.ค. and 31 ธ.ค. the same term rather than two.
 *
 * The date is a parameter with a per-call default and never a module-level
 * constant. `db/seed.js` reads this at require time in a process that may
 * outlive the boundary, and a timestamp captured at load is the kind of thing
 * that works for months and then does not.
 *
 * Local components throughout, deliberately: the boundary this draws is a
 * calendar boundary in the faculty's own timezone, and reading it in UTC moves
 * every one of them by seven hours.
 */

const BUDDHIST_OFFSET = 543;

/** The first month of semester 1, and of the academic year. 1-based. */
const YEAR_STARTS_IN = 6;

/** The month after semester 1 ends. 1-based, so semester 1 is June..October. */
const SEMESTER_TWO_STARTS_IN = 11;

/**
 * The term that contains `when`, as `{ academicYear, semester }`.
 *
 * `academicYear` is a four-digit พ.ศ. string, which is what
 * `semester_courses.academic_year` holds and what every screen sends; a number
 * here would be converted at each of them.
 */
function currentTerm(when = new Date()) {
  const month = when.getMonth() + 1;
  const gregorianYear = when.getFullYear();

  const inFirstHalf = month >= YEAR_STARTS_IN && month < SEMESTER_TWO_STARTS_IN;
  const beforeYearTurns = month < YEAR_STARTS_IN;

  return {
    academicYear: String(gregorianYear + BUDDHIST_OFFSET - (beforeYearTurns ? 1 : 0)),
    semester: inFirstHalf ? 1 : 2,
  };
}

module.exports = { currentTerm, BUDDHIST_OFFSET };

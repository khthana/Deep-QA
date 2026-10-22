'use strict';

const { BUDDHIST_OFFSET } = require('../../db/term');
const { REFUSALS } = require('../auth/refusals');

/**
 * The years a Program may say its curriculum was revised in, and what to say
 * about one that is not - #177.
 *
 * `programs.revision_year` is Buddhist-era text, kept as the registrar writes
 * it. Until this ticket it was checked for shape alone, four digits, so `1234`
 * and `9999` were stored and so was `2024` - the common-era year for what
 * somebody means as 2567, which is a wrong label on three screens that print
 * it. The owner's answer on 22 October 2569 was both links of the guard.
 *
 * **Why this is not `lib/year.js`.** That file looks like the home for it and
 * is the wrong one, measured: its range is 1900-2200 *of the common era*, so
 * `yearRefusal(2565)` - the correct value, the one this column exists to hold -
 * refuses it and offers `2022`, while `yearRefusal(2024)` returns null. It is a
 * claim about dates, and a helper named for a type is a promise about that type
 * (#107). What the two files share is the shape of the answer, not the range:
 * the year inside its own era's range is accepted, the year whose *other*
 * reading lands inside it is offered that reading, and everything else is told
 * the range. Here the arithmetic runs the other way - a common-era year is
 * offered its Buddhist reading - because this column's era is the Buddhist one.
 *
 * **Why the ceiling is a constant.** A Program can be revised for a year that
 * has not arrived, so the plausible ceiling is "a few years ahead", which is
 * the clock. No bound in this server's validation is derived from the clock. One guard
 * does read it - `auth/accounts.js`'s `validityRefusal` compares an account's
 * stored window against today - and what it reads the clock *for* is the
 * person's own data, not a bound this code chose. A ceiling of "a few years
 * from now" would be the first bound in the system that moved with the day,
 * which would let the day a test runs decide what the test asserts (#52). 2600 is wide
 * enough that no real revision reaches it, which is how `lib/year.js` chose
 * 2200.
 */
const EARLIEST_REVISION_YEAR = 2500;
const LATEST_REVISION_YEAR = 2600;

/**
 * The sentence refusing `year`, or null when it is a plausible Buddhist-era
 * one.
 *
 * Only the years whose Buddhist reading lands inside the range get the
 * conversion offered; the rest are told the range, for `lib/year.js`'s reason
 * one era along - answering somebody who typed 1234 with 1777 would be worse
 * than saying nothing.
 */
function revisionYearRefusal(year) {
  if (year >= EARLIEST_REVISION_YEAR && year <= LATEST_REVISION_YEAR) return null;
  const buddhist = year + BUDDHIST_OFFSET;
  const readable = buddhist >= EARLIEST_REVISION_YEAR && buddhist <= LATEST_REVISION_YEAR;
  return readable
    ? REFUSALS.revisionYearEra(year, buddhist)
    : REFUSALS.revisionYearOutOfRange(year, EARLIEST_REVISION_YEAR, LATEST_REVISION_YEAR);
}

module.exports = { revisionYearRefusal };

'use strict';

const { BUDDHIST_OFFSET } = require('../../db/term');
const { REFUSALS } = require('../auth/refusals');

/**
 * The years a date may be filed in, and what to say about one that is not.
 *
 * Not a guess at how long this system will run - the range is wide enough that
 * no real date comes near either end. It exists so that a year in the Buddhist
 * era, which is the year on every other Thai form a person filled in today,
 * cannot be filed as a common-era one: #125 on an account's validity window,
 * #127 on an Activity's dates.
 *
 * What is shared is the range and the sentence, not the reading. The two
 * `readDate`s have different contracts - the accounts' takes a day and nothing
 * else, an Activity's takes a timestamp too - so each reads its own string and
 * hands the year here.
 */
const EARLIEST_YEAR = 1900;
const LATEST_YEAR = 2200;

/**
 * The sentence refusing `year`, or null when the year is inside the range.
 *
 * Only the years whose Buddhist reading lands inside the range get the
 * conversion offered; the rest are told the range. Doing the arithmetic for
 * somebody who typed 1500 would answer them with 957.
 */
function yearRefusal(year) {
  if (year >= EARLIEST_YEAR && year <= LATEST_YEAR) return null;
  const commonEra = year - BUDDHIST_OFFSET;
  const readable = commonEra >= EARLIEST_YEAR && commonEra <= LATEST_YEAR;
  return readable
    ? REFUSALS.yearEra(year, commonEra)
    : REFUSALS.yearOutOfRange(year, EARLIEST_YEAR, LATEST_YEAR);
}

module.exports = { yearRefusal };

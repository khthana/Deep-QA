'use strict';

/**
 * The rules that turn marks into attainment, extracted at their second use.
 *
 * #38 wrote all of this inside `routes/learningDetails.js`, where it was the
 * whole of that file's reason to exist. #42 reports the same quantities one
 * level up — an intake against a PLO rather than a Section against a CLO — and
 * needs every one of them unchanged. Two copies of a normalisation is the kind
 * of duplication that does not announce itself when it drifts: both screens go
 * on rendering plausible numbers, and only a person holding the two side by
 * side would ever notice they disagree. #104 is the same shape of debt one
 * table over.
 *
 * What is here is the arithmetic and the thresholds, and nothing that knows
 * about a request, a Section or an outcome. The queries stay in the routes,
 * because what counts as *the marks in scope* is exactly what differs between
 * the two screens and is the one thing they must not share.
 */

const { round2 } = require('./fields');

/** BR-18: every outcome score is out of five, whatever the Activities were worth. */
const SCALE = 5;

/**
 * The line one student passes one outcome on.
 *
 * Not in the schema, because the criteria table holds four sentences per
 * outcome rather than a number, and BR-17 only ever talks about the
 * proportion. Agreed with the user before #38 was built, and two written rules
 * already point at it: sixty per cent of five is three exactly, and three is
 * where BR-20 stops flagging.
 */
const PASS = 3;

/** BR-17: an outcome passes when *more than* this share of its students did. */
const OUTCOME_PASS_PERCENT = 60;

/**
 * BR-20's five ranges, as the boundary each band starts at.
 *
 * Read as *the last band whose floor the score has reached*, so the edges
 * belong to the band above: 3.0 is the second band and not the first, 4.5 is
 * the fifth. Band one is the flagged one.
 *
 * `BAND_FLOORS[1]` and `PASS` are equal, and the screens rely on their being
 * equal — a red cell is meant to read as *this one did not pass*. They are
 * still two constants, which is [#110](https://github.com/khthana/Deep-QA/issues/110).
 */
const BAND_FLOORS = [0, 3.0, 3.5, 4.0, 4.5];

const round1 = (value) => Math.round(value * 10) / 10;

function bandOf(score) {
  if (score === null) return null;
  let band = 1;
  for (const [index, floor] of BAND_FLOORS.entries()) {
    if (score >= floor) band = index + 1;
  }
  return band;
}

/**
 * One outcome score, from what was earned against what was available.
 *
 * `available` of nought is not a score of nought: it is an outcome nothing
 * marked has been attributed to, and the caller draws a blank rather than a
 * failure. The rounding happens here rather than at the caller so that the
 * band and the number on screen are computed from the same value — a cell
 * reading 3.50 in one colour and 3.5 in another is a screen arguing with
 * itself.
 */
function outcomeScore(earned, available) {
  if (!(Number(available) > 0)) return null;
  return round2((Number(earned) / Number(available)) * SCALE);
}

/** The mean of what is there, to a hundredth, or null when nothing is. */
function meanOf(scores) {
  if (scores.length === 0) return null;
  return round2(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

/** The share of scores at or above the pass line, to a tenth, or null when there are none. */
function passRateOf(scores) {
  if (scores.length === 0) return null;
  return round1((scores.filter((score) => score >= PASS).length / scores.length) * 100);
}

/**
 * Whether an outcome passed, from the share of its students who did.
 *
 * Null rather than false when nobody has been measured against it: an outcome
 * nobody has been marked on has not failed, it has not been assessed, and
 * saying otherwise would put every outcome on the attention list on the first
 * day of term.
 */
function outcomePassed(passRate) {
  return passRate === null ? null : passRate > OUTCOME_PASS_PERCENT;
}

/**
 * One outcome's line, from the scores its students earned on it.
 *
 * #38 and #36 report the same four things about an outcome — how many students
 * were measured on it, their mean, the share that passed, and whether the
 * outcome itself passed — from two entirely different queries. The query is
 * what differs and stays in the routes; this fold is what does not, and it was
 * written twice before it was written here.
 *
 * The order matters and is easy to get subtly wrong by hand: `passed` must be
 * read off the same `pass_rate` that goes on screen, or an outcome can be shown
 * at sixty-point-nought and marked as passing on a fraction that was not.
 */
function columnOf(scores) {
  const passRate = passRateOf(scores);
  return {
    student_count: scores.length,
    mean: meanOf(scores),
    pass_rate: passRate,
    passed: outcomePassed(passRate),
  };
}

/**
 * The headline figures, from every (student, outcome) that has a score.
 *
 * `studentCount` is passed in rather than derived, because it is the only one
 * of the five that counts students: the other four count *scores*, and a
 * Section of fifty-seven students across nine outcomes has five hundred and
 * thirteen of those. `scored_count` and `passed_count` travel so the screen can
 * show the fraction rather than hope a label carries the grain — a percentage
 * next to a card reading *57 คน* is read as a share of students however it is
 * worded, and `473 of 506` cannot be.
 *
 * There is no per-student roll-up here and there is not meant to be. No rule
 * says when a student passes a *Section*: BR-17 is about one outcome across a
 * cohort and BR-20 about one student on one outcome, and inventing the third
 * would be a threshold nobody agreed to.
 */
function summaryOf(scored, studentCount) {
  return {
    student_count: studentCount,
    mean: meanOf(scored),
    pass_rate: passRateOf(scored),
    scored_count: scored.length,
    passed_count: scored.filter((score) => score >= PASS).length,
  };
}

// `SCALE` and `OUTCOME_PASS_PERCENT` are deliberately not exported. Both are
// rules rather than numbers a caller has any business applying itself — five
// is inside `outcomeScore` and sixty is inside `outcomePassed` — and a route
// that imported one would be a route about to re-implement the function it
// belongs to. `PASS` and `BAND_FLOORS` are exported because a caller does have
// business with them: one asks *did this one score pass*, the other travels to
// the browser so the legend is drawn from the rule rather than from a copy.
module.exports = {
  PASS,
  BAND_FLOORS,
  bandOf,
  outcomeScore,
  meanOf,
  passRateOf,
  outcomePassed,
  columnOf,
  summaryOf,
};

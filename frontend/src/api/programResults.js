import { get, query } from './client'

/**
 * ผลการเรียนรู้ระดับหลักสูตร — #42, #43 and #44.
 *
 * Six reads and no write: this screen owns no data at all. Every figure on it
 * is an opinion about marks that #34 stored, and every one of those opinions is
 * formed on the server — BR-17's sixty per cent, BR-18's scale of five and the
 * two-step roll-up from CLO to PLO are business rules, and a browser that
 * worked any of them out itself would be a second place they could be wrong.
 *
 * The curricula and the intakes come from here rather than from the screen's
 * own knowledge for the same reason `plos.js` gives: what an account reaches is
 * the server's answer (ADR-0002), and a list assembled in the browser would be
 * a second opinion about authorisation.
 */

/** The curricula this account may read results for. */
export const listResultPrograms = () => get('/api/program-results/programs')

/** The intakes one curriculum actually has students in, newest first. */
export const listIntakes = programId =>
  get(`/api/program-results/intakes${query({ program_id: programId })}`)

/** One intake against every main outcome of its curriculum. */
export const getResultsByIntake = (programId, admissionYear) =>
  get(
    `/api/program-results/by-intake${query({
      program_id: programId,
      admission_year: admissionYear,
    })}`,
  )

/**
 * The Subjects, CLOs and Activities behind one outcome's figure.
 *
 * Fetched when an outcome is opened rather than sent with the report, because
 * a curriculum has thirteen outcomes and a person reads one of them at a time —
 * and because the drill-down carries the evidence list, which is the largest
 * part of either answer.
 */
export const getOutcomeContributions = (programId, admissionYear, outcomeId) =>
  get(
    `/api/program-results/by-intake/outcomes/${outcomeId}${query({
      program_id: programId,
      admission_year: admissionYear,
    })}`,
  )

/**
 * Every year of a range against every main outcome — #44.
 *
 * The whole range in one answer, because the question is the *shape* of the
 * line and a shape read a year at a time is not read at all. The server caps
 * how wide a range may be and says so in words when it is exceeded; the two
 * ends come from the same intake list the screen beside this one picks a single
 * year from, so a range that reaches the cap is one this curriculum's register
 * really is that long.
 */
export const getResultsAcrossIntakes = (programId, fromYear, toYear) =>
  get(
    `/api/program-results/across-intakes${query({
      program_id: programId,
      from_year: fromYear,
      to_year: toYear,
    })}`,
  )

/**
 * Every student of one intake against every main outcome — #43.
 *
 * The whole cohort in one answer rather than a page at a time, because the
 * question the screen exists for is *how is this spread*, and a distribution
 * read a page at a time is not read at all. The order the rows arrive in is
 * the register's; the sorting a reader asks for happens in the browser, on
 * data it already holds, because it changes nothing about what the figures are
 * and a round-trip per sort would make a reader think twice about looking.
 */
export const getStudentHeatmap = (programId, admissionYear) =>
  get(
    `/api/program-results/by-intake/students${query({
      program_id: programId,
      admission_year: admissionYear,
    })}`,
  )

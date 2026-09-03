import { get, query } from './client'

/**
 * ผลการเรียนรู้ระดับหลักสูตรตามปีรับเข้า — #42.
 *
 * Four reads and no write: this screen owns no data at all. Every figure on it
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

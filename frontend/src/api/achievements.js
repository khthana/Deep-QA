import { get, post, put, del } from './client'

/**
 * เกณฑ์การบรรลุผล — #29.
 *
 * Addressed by `sectionId` and `cloId` together, and belonging to the CLO
 * alone, exactly as behaviors.js is: the Section is how a Teacher proves they
 * may be here (ADR-0002, resolved server-side through the teaching register),
 * and the CLO is what the criteria hang off. `criteria_no` is position, the
 * server assigns it, and a caller putting one in the body is sending a field
 * the server ignores.
 */

/** The criteria of one CLO, with the CLO and the Offering for the heading. */
export const getCriteria = (sectionId, cloId) =>
  get(`/api/teaching/sections/${sectionId}/clos/${cloId}/criteria`)

export const createCriterion = (sectionId, cloId, draft) =>
  post(`/api/teaching/sections/${sectionId}/clos/${cloId}/criteria`, draft)

export const updateCriterion = (sectionId, cloId, criterionId, draft) =>
  put(
    `/api/teaching/sections/${sectionId}/clos/${cloId}/criteria/${criterionId}`,
    draft
  )

export const deleteCriterion = (sectionId, cloId, criterionId) =>
  del(
    `/api/teaching/sections/${sectionId}/clos/${cloId}/criteria/${criterionId}`
  )

import { get, post, del } from './client'

/**
 * แผนการปรับปรุงอย่างต่อเนื่อง — #41.
 *
 * Addressed by `sectionId` alone and belonging to the Offering behind it: the
 * Section is how a Teacher proves they may be here (ADR-0002, resolved
 * server-side through the teaching register) and the record is at the
 * (Program, Subject, academic year) grain the CLO set is at (ADR-0003).
 *
 * There is no update call. The key of an entry is (year, CLO, section of the
 * form), the screen knows all three before it knows whether anything is
 * written there, and so writing and rewriting are one request — `saveEntry`
 * for both. `reference_academic_year` is not among the fields a caller sends;
 * the server writes it, and only on an improvement.
 */

/** This year's entries, last year's for reference, and the CLOs to hang them on. */
export const getImprovementPlan = sectionId =>
  get(`/api/teaching/sections/${sectionId}/improvement-plan`)

export const saveEntry = (sectionId, draft) =>
  post(`/api/teaching/sections/${sectionId}/improvement-plan/entries`, draft)

export const deleteEntry = (sectionId, entryId) =>
  del(`/api/teaching/sections/${sectionId}/improvement-plan/entries/${entryId}`)

import { get, post, put, del } from './client'

/**
 * ผลการเรียนรู้รายวิชา — #27.
 *
 * Every call here is addressed by `sectionId`, and every record it returns
 * belongs to the Offering behind that Section rather than to the Section
 * itself. That is not an inconsistency: ADR-0004 makes the Section id the only
 * carrier of context a Teacher screen has, and ADR-0003 puts the CLO set at the
 * (Program, Subject, ปีการศึกษา) grain. The server holds both facts together by
 * resolving one into the other on every request.
 *
 * The consequence worth stating here, because it is the thing a caller of this
 * module can get wrong: the triple is never sent. `getCourseOutcomes` returns
 * the Offering it resolved, and that is for the screen to *display* — putting
 * it back into a `createCourseOutcome` body would be handing the server an
 * authorisation input from the client, which ADR-0002 forbids and which the
 * server ignores.
 */

/** The CLO set of this Section's Offering, the PLOs that may be linked, and the Offering. */
export const getCourseOutcomes = sectionId =>
  get(`/api/teaching/sections/${sectionId}/clos`)

export const createCourseOutcome = (sectionId, draft) =>
  post(`/api/teaching/sections/${sectionId}/clos`, draft)

export const updateCourseOutcome = (sectionId, cloId, draft) =>
  put(`/api/teaching/sections/${sectionId}/clos/${cloId}`, draft)

export const deleteCourseOutcome = (sectionId, cloId) =>
  del(`/api/teaching/sections/${sectionId}/clos/${cloId}`)

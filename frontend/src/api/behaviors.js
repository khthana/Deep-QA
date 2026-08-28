import { get, post, put, del } from './client'

/**
 * พฤติกรรมบ่งชี้ — #28.
 *
 * Addressed by `sectionId` and `cloId` together, and belonging to the CLO
 * alone: the Section is how a Teacher proves they may be here (ADR-0002,
 * resolved server-side through the teaching register), and the CLO is what the
 * behaviours hang off. Everything #27's api module says about never sending
 * the resolved triple back holds here too, one tier down — and so does its
 * point about `behavior_no`: the number is position, the server assigns it,
 * and a caller putting one in the body is sending a field the server ignores.
 */

/** The behaviours of one CLO, with the CLO and the Offering for the heading. */
export const getBehaviors = (sectionId, cloId) =>
  get(`/api/teaching/sections/${sectionId}/clos/${cloId}/behaviors`)

export const createBehavior = (sectionId, cloId, draft) =>
  post(`/api/teaching/sections/${sectionId}/clos/${cloId}/behaviors`, draft)

export const updateBehavior = (sectionId, cloId, behaviorId, draft) =>
  put(`/api/teaching/sections/${sectionId}/clos/${cloId}/behaviors/${behaviorId}`, draft)

export const deleteBehavior = (sectionId, cloId, behaviorId) =>
  del(`/api/teaching/sections/${sectionId}/clos/${cloId}/behaviors/${behaviorId}`)

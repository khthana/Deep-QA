import { get, put, post } from './client'

/**
 * สัดส่วนคะแนน — #30.
 *
 * One read and one write, because the hundred rule is about the scheme as a
 * whole: the screen edits a draft of the entire list and PUTs the entire
 * list, and the server refuses anything that does not total 100. Rows carry
 * their `score_ratio_id` back so the server updates the rows Activities
 * point at rather than replacing them.
 */

/** The scheme, with the Offering for the heading. */
export const getWeights = sectionId =>
  get(`/api/teaching/sections/${sectionId}/weights`)

export const saveWeights = (sectionId, weights) =>
  put(`/api/teaching/sections/${sectionId}/weights`, { weights })

/** The template, as its text, so the screen can hand it to the browser. */
export const importTemplate = sectionId =>
  get(`/api/teaching/sections/${sectionId}/weights/import-template`, {
    accept: 'text',
  })

/** A completed file, posted as its own text. */
export const importWeights = (sectionId, csv) =>
  post(`/api/teaching/sections/${sectionId}/weights/import`, csv, {
    contentType: 'text/csv',
  })

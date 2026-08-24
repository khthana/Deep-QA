import { del, get, post, put } from './client'

/**
 * The Rubric criteria calls — #22.
 *
 * เกณฑ์การให้คะแนนของ Rubric: what a Rubric actually scores on. Every call
 * below is addressed *through* its rubric, and that is not a naming
 * convention — `rubric_details` carries no หลักสูตร of its own, so the rubric
 * in the path is the only thing that decides whether the request may be
 * answered at all. A flat `/api/criteria/:id` would have nothing to check.
 *
 * There is no `listReachablePrograms` here for the same reason. The screen
 * never asks which curriculum it is in; it is in whichever one its rubric
 * belongs to, and the list call returns that rubric alongside the criteria so
 * the heading can say which rubric is open without a second request.
 */

/** Every criterion of one rubric, with the rubric itself. The list does not page. */
export const listCriteria = rubricId => get(`/api/rubrics/${rubricId}/criteria`)

/**
 * One criterion, read back from the server.
 *
 * The editor asks for this rather than reusing the row the table already drew,
 * so a form opened on a page that has been sitting there edits what is in the
 * database now — #21's habit, and it matters more here because the four band
 * descriptions are long enough that two people editing one criterion would not
 * notice each other's work in a table.
 */
export const getCriterion = (rubricId, criterionId) =>
  get(`/api/rubrics/${rubricId}/criteria/${criterionId}`)

export const createCriterion = (rubricId, draft) =>
  post(`/api/rubrics/${rubricId}/criteria`, draft)

export const updateCriterion = (rubricId, criterionId, draft) =>
  put(`/api/rubrics/${rubricId}/criteria/${criterionId}`, draft)

/**
 * Taking one away.
 *
 * One answer, as on the rubric above it: nothing references a criterion, so
 * there is nothing to switch off instead. `criteria_name_th` comes back so the
 * banner names the criterion the server actually removed rather than the one
 * the screen believed it was pointing at.
 */
export const deleteCriterion = (rubricId, criterionId) =>
  del(`/api/rubrics/${rubricId}/criteria/${criterionId}`)

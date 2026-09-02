import { get, post, put, query } from './client'

/**
 * คะแนนกิจกรรมการเรียนรู้ — #34.
 *
 * Addressed by the Section *and* the Activity, because a mark is only ever
 * about one piece of work in one ตอนเรียน, and because the server pairs the two
 * before it looks at either: an Activity id belonging to the Section next door
 * is ไม่พบ through this address rather than somebody else's marks.
 *
 * `saveScores` sends the toggles rather than the marks the toggles produced.
 * A screen that divided a whole-Activity mark across the CLOs itself would be
 * deciding, in the browser, the one thing the ticket's fifth criterion is about
 * — whether a mark is inside its ceiling — and the ceiling is the server's.
 * So `mode` and `entry` travel with the numbers, and the division happens once,
 * where the rule lives.
 */

/** The Activity, its CLO rows, the roll, the groups and the marks already recorded. */
export const getScores = (sectionId, activityId) =>
  get(`/api/teaching/sections/${sectionId}/activities/${activityId}/scores`)

/**
 * The whole grid, saved as one list.
 *
 * `marks` is rows of `{ student_id, score }`, `{ student_id, scores }` or
 * `{ group_id, … }` depending on the two toggles, and the answer is the screen
 * read back — so a save and a reload cannot disagree about what was recorded.
 */
export const saveScores = (sectionId, activityId, body) =>
  put(`/api/teaching/sections/${sectionId}/activities/${activityId}/scores`, body)

/** The blank file, in the shape the per-CLO toggle is currently in. */
export const scoresTemplate = (sectionId, activityId, params = {}) =>
  get(
    `/api/teaching/sections/${sectionId}/activities/${activityId}/scores/import-template${query(params)}`,
    { accept: 'text' },
  )

/** A completed file, posted as its own text. */
export const importScores = (sectionId, activityId, csv) =>
  post(`/api/teaching/sections/${sectionId}/activities/${activityId}/scores/import`, csv, {
    contentType: 'text/csv',
  })

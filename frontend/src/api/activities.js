import { get, post, put, del } from './client'

/**
 * กิจกรรมการเรียนรู้ — #32's list and #33's editor.
 *
 * Addressed by `sectionId`, and belonging to it: an Activity is the Section's
 * own work, as the teaching plan's weeks are. What comes back carries three
 * more lists alongside — the Offering's หมวดคะแนน and CLOs, and this Section's
 * plan weeks — because the editor's pickers are filled from exactly the lists
 * the server validates a save against, and two round trips could disagree.
 *
 * A draft carries `clo_rows`, one row per CLO with the share of the mark it
 * accounts for. Sending the same id twice, or a set adding to more than a
 * hundred, is refused in the server's own words.
 */

/** The Section's Activities with their CLO rows, the pickers' three lists, and the Section. */
export const getActivities = sectionId => get(`/api/teaching/sections/${sectionId}/activities`)

export const createActivity = (sectionId, draft) =>
  post(`/api/teaching/sections/${sectionId}/activities`, draft)

export const updateActivity = (sectionId, activityId, draft) =>
  put(`/api/teaching/sections/${sectionId}/activities/${activityId}`, draft)

export const deleteActivity = (sectionId, activityId) =>
  del(`/api/teaching/sections/${sectionId}/activities/${activityId}`)

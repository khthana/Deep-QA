import { get, del } from './client'

/**
 * กิจกรรมการเรียนรู้ — #32.
 *
 * Addressed by `sectionId`, and belonging to it: an Activity is the Section's
 * own work, as the teaching plan's weeks are. What comes back carries the
 * Offering's หมวดคะแนน alongside, because the list is grouped by them and a
 * category nobody has filed work under yet still has to appear — see the
 * screen's own note.
 *
 * Two verbs only. Creating and editing an Activity, and attributing it to
 * CLOs, is #33's editor and its own module.
 */

/** The Section's Activities, the scheme they are grouped under, and the Section. */
export const getActivities = sectionId => get(`/api/teaching/sections/${sectionId}/activities`)

export const deleteActivity = (sectionId, activityId) =>
  del(`/api/teaching/sections/${sectionId}/activities/${activityId}`)

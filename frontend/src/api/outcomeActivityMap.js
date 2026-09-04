import { get } from './client'

/**
 * ความเชื่อมโยงผลการเรียนรู้และกิจกรรม — #39.
 *
 * One read, and no write: nothing on this screen is stored. The diagram is
 * `activity_clo_mapping` seen whole, and the mean beside each outcome is the
 * one #38 shows for it — folded on the server from the same marks by the same
 * rules, because a browser that worked it out itself would be a second place
 * for the scale of five and the blank-is-not-a-nought rule to be wrong.
 */
export const getOutcomeActivityMap = sectionId =>
  get(`/api/teaching/sections/${sectionId}/outcome-activity-map`)

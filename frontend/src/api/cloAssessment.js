import { get } from './client'

/**
 * การประเมินผลการเรียนรู้ — #40.
 *
 * One read, and no write: the report stores nothing, it states what the marks
 * already say. The pass verdict per outcome is folded on the server by
 * `lib/attainment.js`, and so is the rule that produced it — a browser working
 * either out for itself would be a second place for BR-17's sixty per cent to
 * be wrong, on the one screen whose output is a document somebody files.
 */
export const getCloAssessment = sectionId =>
  get(`/api/teaching/sections/${sectionId}/clo-assessment`)

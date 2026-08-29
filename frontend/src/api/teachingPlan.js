import { get, post, put, del } from './client'

/**
 * แผนการสอน — #31.
 *
 * Addressed by `sectionId` alone, and — unlike the CLO family one directory
 * over — belonging to it too: the plan is the one Section-grain thing a
 * Teacher edits, so the id in the path is both the proof of teaching
 * (ADR-0002, resolved server-side) and the owner of the rows. Nothing else
 * goes in the address, and the body never carries a section id — the server
 * ignores one if sent, as `weights.js` says about its resolved pair.
 *
 * The week number DOES go in the body, unlike `behavior_no`: it is not a
 * position the server assigns but the week of the semester the person means,
 * and two rows may legally carry the same one.
 */

/** The plan of one Section, weeks in calendar order, with the Section for the heading. */
export const getPlan = sectionId => get(`/api/teaching/sections/${sectionId}/plan`)

export const createWeek = (sectionId, draft) =>
  post(`/api/teaching/sections/${sectionId}/plan`, draft)

export const updateWeek = (sectionId, weekId, draft) =>
  put(`/api/teaching/sections/${sectionId}/plan/${weekId}`, draft)

export const deleteWeek = (sectionId, weekId) =>
  del(`/api/teaching/sections/${sectionId}/plan/${weekId}`)

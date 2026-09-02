import { del, get, post, put, query } from './client'

/**
 * กลุ่มงานนักศึกษา — #26.
 *
 * Every call is addressed by `sectionId`, as `enrolment.js` beside it is and
 * for the same reason: a กลุ่มงาน belongs to one ตอนเรียน, not to the รายวิชา
 * behind it. Two ตอนเรียน of one Offering divide their own rolls.
 *
 * The two verbs that look alike are the point of the module. `addToGroup` puts
 * somebody in a group they are not yet in and is refused, naming the group, if
 * they are already in another; `moveToGroup` is the one that changes their
 * group, and it is a different request because the server writes a different
 * word into the history. A screen that quietly turned the refusal into a move
 * would be the delete-and-add the ticket's fifth criterion forbids.
 *
 * `moveToGroup` sends no body. Which group somebody is in now is a fact the
 * server holds; the address names where they are going and nothing else.
 */

/** Every group of this ตอนเรียน, its members, and the roll they are drawn from. */
export const listGroups = sectionId => get(`/api/teaching/sections/${sectionId}/groups`)

/** One new group, by the name typed into the box. */
export const createGroup = (sectionId, groupName) =>
  post(`/api/teaching/sections/${sectionId}/groups`, { group_name: groupName })

/** A new name for one group. The server writes no history line for this. */
export const renameGroup = (sectionId, groupId, groupName) =>
  put(`/api/teaching/sections/${sectionId}/groups/${groupId}`, {
    group_name: groupName,
  })

/** The group disbanded. Its members stay in the ตอนเรียน; the confirmation is the screen's. */
export const deleteGroup = (sectionId, groupId) =>
  del(`/api/teaching/sections/${sectionId}/groups/${groupId}`)

/** Somebody into a group they are not in yet. */
export const addToGroup = (sectionId, groupId, studentId) =>
  post(`/api/teaching/sections/${sectionId}/groups/${groupId}/students`, {
    student_id: studentId,
  })

/** Somebody out of one group and into this one, recorded as one move. */
export const moveToGroup = (sectionId, groupId, studentId) =>
  put(`/api/teaching/sections/${sectionId}/groups/${groupId}/students/${studentId}`, {})

/** Somebody out of a group, and out of no more than that. */
export const removeFromGroup = (sectionId, groupId, studentId) =>
  del(`/api/teaching/sections/${sectionId}/groups/${groupId}/students/${studentId}`)

/** One page of what has happened to this ตอนเรียน's groups, newest first. */
export const listGroupHistory = (sectionId, params = {}) =>
  get(`/api/teaching/sections/${sectionId}/groups/history${query(params)}`)

/** The template, as its text, so the screen can hand it to the browser. */
export const importTemplate = sectionId =>
  get(`/api/teaching/sections/${sectionId}/groups/import-template`, { accept: 'text' })

/** A completed file, posted as its own text. */
export const importGroups = (sectionId, csv) =>
  post(`/api/teaching/sections/${sectionId}/groups/import`, csv, {
    contentType: 'text/csv',
  })

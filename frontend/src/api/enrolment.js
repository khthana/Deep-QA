import { del, get, post, query } from './client'

/**
 * รายชื่อนักศึกษาของรายวิชา — #25.
 *
 * Every call is addressed by `sectionId` and every record belongs to that
 * ตอนเรียน alone. That is the difference between this module and `clos.js`
 * beside it, and it is worth stating because the two screens are reached the
 * same way and look alike: a CLO belongs to the Offering behind the Section
 * (ADR-0003), so two ตอนเรียน share one set; an enrolment belongs to the
 * Section itself, so two ตอนเรียน of one รายวิชา are two different class lists
 * and nothing here is shared with the one next door.
 *
 * The register is somewhere else. A code this system has never seen is not a
 * student to be created from this screen — the server answers with a sentence
 * naming ข้อมูลนักศึกษากลาง, and the screen shows that sentence rather than
 * offering to add them, because a half-formed student record is the thing #25
 * exists to prevent.
 *
 * A Section this account does not teach is answered 404 by the server with the
 * same sentence a Section that does not exist gets, as in `teaching.js`. The
 * screen has one refusal to word, not two.
 */

/** One page of this Section's class list, with the total behind it. */
export const listEnrolled = (sectionId, params = {}) =>
  get(`/api/teaching/sections/${sectionId}/students${query(params)}`)

/** One student, by the code typed into the box. */
export const enrolStudent = (sectionId, studentId) =>
  post(`/api/teaching/sections/${sectionId}/students`, { student_id: studentId })

/** Taking one back out. The confirmation before this is the screen's own. */
export const removeEnrolment = (sectionId, studentId) =>
  del(`/api/teaching/sections/${sectionId}/students/${studentId}`)

/** The template, as its text, so the screen can hand it to the browser. */
export const importTemplate = sectionId =>
  get(`/api/teaching/sections/${sectionId}/students/import-template`, { accept: 'text' })

/** A completed file, posted as its own text. */
export const importEnrolments = (sectionId, csv) =>
  post(`/api/teaching/sections/${sectionId}/students/import`, csv, {
    contentType: 'text/csv',
  })

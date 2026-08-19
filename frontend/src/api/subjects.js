import { del, get, post, put, query } from './client'

/**
 * The subject calls — #16.
 *
 * #15's shape for a different table, with one addition the ticket asks for: the
 * list takes a `department_id`, so a faculty administrator reading a catalogue
 * of hundreds can narrow it to one department. The filter narrows within what
 * the account already reaches and cannot widen it — the server applies it
 * inside the same reach it filters by (ADR-0002).
 */

/** One page of subjects, with the total so a pager can be drawn. */
export const listSubjects = (params = {}) => get(`/api/subjects${query(params)}`)

/**
 * The departments this account reaches, each with its `is_active`.
 *
 * Read from the subjects routes rather than from `/api/departments`, which
 * belongs to the faculty administrator alone — a department administrator
 * belongs on this screen and would be refused by that one. What comes back is
 * the same reach the server checks against, so neither the picker nor the
 * filter can name a choice that would then be turned down.
 *
 * Retired ones come too, and are the screen's only way of naming the department
 * a subject already filed under one lives in. Deciding which of them may be
 * *picked* is the form's job, not this call's.
 */
export const listReachableDepartments = () => get('/api/subjects/departments')

/**
 * One subject, read back from the server.
 *
 * The editor asks for this rather than reusing the row the list already drew,
 * so a form opened on a page that has been sitting there edits what is in the
 * database now.
 */
export const getSubject = subjectId => get(`/api/subjects/${subjectId}`)

export const createSubject = draft => post('/api/subjects', draft)

export const updateSubject = (subjectId, draft) => put(`/api/subjects/${subjectId}`, draft)

/**
 * Removing one.
 *
 * Two answers rather than one. A subject nothing points at is deleted and comes
 * back 204 with no body; a subject a รายวิชาในหลักสูตร or an Offering points at
 * is switched off instead and comes back with `deactivated: true` and the row
 * as it now stands. The screen says which of the two happened, because "ลบแล้ว"
 * for a record that is still there would be a lie the person acts on.
 */
export const deleteSubject = subjectId => del(`/api/subjects/${subjectId}`)

/** The template, as its text, so the screen can hand it to the browser. */
export const importTemplate = () =>
  get('/api/subjects/import-template', { accept: 'text' })

/** A completed file, posted as its own text. */
export const importSubjects = csv =>
  post('/api/subjects/import', csv, { contentType: 'text/csv' })

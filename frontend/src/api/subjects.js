import { del, get, post, put, query } from './client'

/**
 * The subject calls — #16.
 *
 * #15's shape for a different table. The list took a `department_id` filter
 * until #284 (19 พ.ย. 2569), and the form sent a department; neither does now.
 * The server files a subject under the department of the acting grant, and
 * `listReachableDepartments`, which drew the form's picker, the filter and the
 * department column, went with all three.
 */

/** One page of subjects, with the total so a pager can be drawn. */
export const listSubjects = (params = {}) => get(`/api/subjects${query(params)}`)

/**
 * What the server scopes to the acting grant, and what takes **no argument** to
 * say which rows it means - `frontend/scripts/landing-generations.js` reads it
 * (#230). Empty since #284 took `listReachableDepartments` away.
 */
export const GRANT_SCOPED = []

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

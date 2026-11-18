import { del, get, post, put, query } from './client'

/**
 * The programme calls — #15.
 *
 * Short, because the server does the deciding. No department is sent since
 * #282 (18 พ.ย. 2569): the server files a programme under the department of the
 * acting grant, and `listReachableDepartments`, which drew the form's picker
 * and named each row's department, went with the picker.
 */

/** One page of programmes, with the total so a pager can be drawn. */
export const listPrograms = (params = {}) => get(`/api/programs${query(params)}`)

/**
 * What the server scopes to the acting grant, and what takes **no argument** to
 * say which rows it means - `frontend/scripts/landing-generations.js` reads it
 * (#230). Empty since #282 took `listReachableDepartments` away.
 */
export const GRANT_SCOPED = []

/**
 * One programme, read back from the server.
 *
 * The editor asks for this rather than reusing the row the list already drew,
 * so a form opened on a page that has been sitting there edits what is in the
 * database now.
 */
export const getProgram = programId => get(`/api/programs/${programId}`)

export const createProgram = draft => post('/api/programs', draft)

export const updateProgram = (programId, draft) => put(`/api/programs/${programId}`, draft)

/**
 * Removing one.
 *
 * Two answers rather than one. A programme nothing points at is deleted and
 * comes back 204 with no body; a programme that PLOs, Program Subjects,
 * students, rubrics or accounts point at is switched off instead and comes
 * back with `deactivated: true` and the row as it now stands. The screen says
 * which of the two happened, because "ลบแล้ว" for a record that is still there
 * would be a lie the person acts on.
 */
export const deleteProgram = programId => del(`/api/programs/${programId}`)

/** The template, as its text, so the screen can hand it to the browser. */
export const importTemplate = () =>
  get('/api/programs/import-template', { accept: 'text' })

/** A completed file, posted as its own text. */
export const importPrograms = csv =>
  post('/api/programs/import', csv, { contentType: 'text/csv' })

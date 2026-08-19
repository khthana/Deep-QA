import { del, get, post, put, query } from './client'

/**
 * The programme calls — #15.
 *
 * Short, because the server does the deciding. A department *is* sent, unlike
 * #14's faculty: a programme has to be filed under one and only the person
 * knows which, so it is named by the request and then checked against the
 * reach derived from the acting grant (ADR-0002 refuses authority read from a
 * body, not a target named by one).
 */

/** One page of programmes, with the total so a pager can be drawn. */
export const listPrograms = (params = {}) => get(`/api/programs${query(params)}`)

/**
 * The departments this account may file a programme under.
 *
 * Read from the programmes routes rather than from `/api/departments`, which
 * belongs to the faculty administrator alone — a department administrator
 * belongs on this screen and would be refused by that one. What comes back is
 * the same reach the server checks against, so the picker cannot offer a
 * choice that would then be turned down.
 */
export const listUsableDepartments = () => get('/api/programs/departments')

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

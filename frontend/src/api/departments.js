import { del, get, post, put, query } from './client'

/**
 * The department calls — #14.
 *
 * Short, because the server does the deciding. Nothing here sends a faculty:
 * a faculty administrator's is derived from their acting grant and a body
 * naming another one is refused (ADR-0002), so the screen has no field for it
 * and this file has no parameter for it.
 */

/** One page of departments, with the total so a pager can be drawn. */
export const listDepartments = (params = {}) =>
  get(`/api/departments${query(params)}`)

export const createDepartment = draft => post('/api/departments', draft)

export const updateDepartment = (departmentId, draft) =>
  put(`/api/departments/${departmentId}`, draft)

/**
 * Removing one.
 *
 * A department that programmes, accounts, subjects or students point at comes
 * back as a 409 carrying the server's own words - which the screen shows as
 * they are, because they say the way round it: switch the department off
 * instead of destroying it.
 */
export const deleteDepartment = departmentId =>
  del(`/api/departments/${departmentId}`)

/** The template, as its text, so the screen can hand it to the browser. */
export const importTemplate = () =>
  get('/api/departments/import-template', { accept: 'text' })

/** A completed file, posted as its own text. */
export const importDepartments = csv =>
  post('/api/departments/import', csv, { contentType: 'text/csv' })

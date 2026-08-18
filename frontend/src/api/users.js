import { del, get, post, put, query } from './client'

/**
 * The user-account calls — #11.
 *
 * Gathered here rather than written inline in the screen, so the shape of the
 * API is stated in one place and the screen is about what the person sees. The
 * server is the authority on all of it: the list arrives already filtered to
 * what the signed-in administrator may reach, and nothing below sends a role,
 * a scope or an identifier that the caller could use to widen that (ADR-0002).
 */

/** One page of accounts, with the total so a pager can be drawn. */
export const listUsers = (params = {}) => get(`/api/users${query(params)}`)

export const createUser = draft => post('/api/users', draft)

export const updateUser = (userId, draft) => put(`/api/users/${userId}`, draft)

export const setUserStatus = (userId, status) =>
  put(`/api/users/${userId}/status`, { status })

/**
 * The grant calls — #12.
 *
 * `listGrantable` is what the administrator may offer: the roles no more
 * senior than their own and the scopes their acting grant reaches, both
 * decided by the server from the database. It exists so the pickers can be
 * honest, not so they can be the guard - the same grant posted past them is
 * refused on the same rule (ADR-0002, and #12's sixth criterion).
 */
export const listGrantable = () => get('/api/users/grantable')

export const listGrants = userId => get(`/api/users/${userId}/roles`)

export const grantRole = (userId, role) =>
  post(`/api/users/${userId}/roles`, role)

export const revokeGrant = (userId, roleId, scopeId) =>
  del(`/api/users/${userId}/roles/${roleId}/${scopeId}`)

/**
 * One page of an account's activity, newest first — #13.
 *
 * The account is named in the path and nothing else narrows the answer: the
 * server decides whether this administrator reaches that person, and answers
 * the same 404 for an account out of their scope as for one that does not
 * exist (ADR-0002).
 */
export const listHistory = (userId, params = {}) =>
  get(`/api/users/${userId}/history${query(params)}`)

/** The template, as its text, so the screen can hand it to the browser. */
export const importTemplate = () =>
  get('/api/users/import-template', { accept: 'text' })

/**
 * A completed file, posted as its own text.
 *
 * A rejected import comes back as a refusal carrying `details` - the per-row
 * report - because nothing was written, and a 200 saying so would be a lie the
 * screen would have to unpick.
 */
export const importUsers = csv =>
  post('/api/users/import', csv, { contentType: 'text/csv' })

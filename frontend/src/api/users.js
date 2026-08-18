import { get, post, put } from './client'

/**
 * The user-account calls — #11.
 *
 * Gathered here rather than written inline in the screen, so the shape of the
 * API is stated in one place and the screen is about what the person sees. The
 * server is the authority on all of it: the list arrives already filtered to
 * what the signed-in administrator may reach, and nothing below sends a role,
 * a scope or an identifier that the caller could use to widen that (ADR-0002).
 */

const query = params => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

/** One page of accounts, with the total so a pager can be drawn. */
export const listUsers = (params = {}) => get(`/api/users${query(params)}`)

export const createUser = draft => post('/api/users', draft)

export const updateUser = (userId, draft) => put(`/api/users/${userId}`, draft)

export const setUserStatus = (userId, status) =>
  put(`/api/users/${userId}/status`, { status })

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

/**
 * Hands the browser a file to save.
 *
 * The blob is built from the text the API answered rather than by pointing a
 * link at the endpoint, because the endpoint needs the session cookie and a
 * plain `<a href>` download is a request this application's client does not
 * make - it would arrive without credentials and be refused. The object URL is
 * revoked afterwards; without it the file stays in memory for the life of the
 * tab.
 */
export function saveAsFile(text, filename) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/csv;charset=utf-8' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

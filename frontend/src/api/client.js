/**
 * The one place the frontend talks to the API.
 *
 * Every call goes through `api`, so three things are true everywhere rather
 * than remembered at each call site: the session cookie is sent
 * (`credentials: 'include'`, which a cross-origin fetch omits by default and
 * without which every request arrives anonymous), the base URL comes from one
 * place, and a refusal is turned into an error carrying the server's own words
 * rather than a status the caller has to interpret.
 *
 * A 401 is also announced here rather than at each call site. The shell shows
 * one dialog when a session ends (#10's sixth criterion), and a dialog that
 * depends on every future screen remembering to raise it is a dialog that
 * will be missing from most of them. `onSessionExpired` registers the one
 * listener; a call that expects an anonymous answer - the sign-in page asking
 * who is signed in, before anyone is - passes `anonymous` and is not counted,
 * because nothing has expired yet. Such a call still has to distinguish the
 * two, and does it by the `reason` the guard sends rather than by its wording:
 * a tab left open past the half hour and then reloaded is an ended session and
 * gets the dialog, where a first visit is neither.
 *
 * 401 and 403 are kept apart. The inherited utils/session.js treated them as
 * one state — `isSessionExpired` returned true for both — so an idle session
 * and a permission refusal looked identical to the person at the screen, which
 * is exactly what #10's sixth criterion asks us to stop doing. Here a 401 is
 * "your session ended, sign in again" and a 403 is "you are signed in and this
 * is not yours"; `expired` on the error says which.
 */

const BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(status, message, reason) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    /**
     * The server's own word for why, where it sends one. Only the session
     * guard does today: 'anonymous', 'expired' or 'invalid'. It exists so the
     * shell can tell those apart without matching on Thai prose.
     */
    this.reason = reason
    /** The session ended; the shell shows the sign-in-again dialog. */
    this.expired = status === 401
    /** Signed in, but not allowed this; the shell says so and stays put. */
    this.forbidden = status === 403
  }
}

/** The shell's listener for a session that has ended; see AuthContext. */
let sessionExpiredListener = null

export const onSessionExpired = listener => {
  sessionExpiredListener = listener
}

async function api(
  path,
  { method = 'GET', body, signal, anonymous = false, contentType, accept } = {}
) {
  // A body that is already a string is sent as it stands, under the type the
  // caller named: #11 posts an import file as text/csv rather than wrapping a
  // spreadsheet inside a JSON string. Everything else is JSON, as before.
  const raw = typeof body === 'string'
  const response = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    signal,
    headers:
      body === undefined
        ? undefined
        : { 'Content-Type': contentType ?? 'application/json' },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  })

  // A refusal is JSON whatever was asked for, because the error handler and
  // the guards answer in JSON on every route.
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    if (response.status === 401 && !anonymous) sessionExpiredListener?.()
    // The fallback speaks only about what is known here, which is the status
    // and nothing else. It used to say the connection had failed, and that is
    // never what this branch means: the response reached this line, so the
    // connection worked. A server that cannot be reached at all rejects the
    // fetch above and never arrives here. #95 is the hour that guess cost -
    // the real cause was a 404 whose sentence the old field name hid.
    const error = new ApiError(
      response.status,
      payload.message ??
        `เซิร์ฟเวอร์ปฏิเสธคำขอนี้โดยไม่ได้ระบุเหตุผล (สถานะ ${response.status})`,
      payload.reason
    )
    // The per-row import report rides on the refusal rather than on a 200,
    // because a rejected import is a refusal: nothing was written. The screen
    // needs the rows, so the error carries them.
    error.details = payload.errors ?? null
    throw error
  }

  if (accept === 'text') return response.text()
  // A 204 fails to parse and should not become a parse error the caller has
  // to read as a status.
  return response.json().catch(() => ({}))
}

/**
 * A query string from the parameters that were actually given.
 *
 * Blank, null and undefined are dropped rather than sent empty, because the
 * routes read an absent filter as "no restriction" and `?q=` would otherwise
 * be a filter on the empty string.
 */
export const query = params => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

const BOM = '\uFEFF'

/**
 * Hands the browser a file to save.
 *
 * The blob is built from the text the API answered rather than by pointing a
 * link at the endpoint, because the endpoint needs the session cookie and a
 * plain `<a href>` download is a request this application's client does not
 * make - it would arrive without credentials and be refused. The object URL is
 * revoked afterwards; without it the file stays in memory for the life of the
 * tab.
 *
 * The byte-order mark is put back here - ticket #62. `formatCsv` on the server
 * writes one, and reading the answer with `response.text()` strips it: the
 * Fetch specification decodes UTF-8 with a BOM-removal step, so by the time the
 * text reaches this function the mark is gone and the blob is written without
 * it. Excel then reads a Thai template as cp874 mojibake. Do not delete this as
 * redundant on the strength of `formatCsv` visibly adding one - it does, and the
 * client throws it away. Guarded so that a caller that somehow still holds the
 * mark does not get two.
 */
export function saveAsFile(text, filename) {
  const url = URL.createObjectURL(
    new Blob([text.startsWith(BOM) ? text : BOM + text], {
      type: 'text/csv;charset=utf-8',
    })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const get = (path, options) => api(path, options)
export const post = (path, body, options) =>
  api(path, { ...options, method: 'POST', body })
export const put = (path, body, options) =>
  api(path, { ...options, method: 'PUT', body })

// #12 revokes a grant, which is the first request this application makes that
// names what it is removing in the path and carries no body.
export const del = (path, options) => api(path, { ...options, method: 'DELETE' })

export default api

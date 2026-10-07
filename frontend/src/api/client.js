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
 * A session that has ended is announced here rather than at each call site.
 * The shell shows one dialog when that happens (#10's sixth criterion), and a
 * dialog that depends on every future screen remembering to raise it is a
 * dialog that will be missing from most of them. `onSessionExpired` registers
 * the one listener.
 *
 * What is announced is every 401, *with the reason the server gave for it* -
 * #97. It used to be every 401 whose caller had not flagged the call
 * `anonymous`, which is the same rule stated backwards: it asked each call
 * site to know in advance whether a refusal would be ordinary, and counted the
 * ones that forgot. `POST /api/auth/login` is the call that forgot, and it is
 * a 401 every time somebody mistypes a password - so the dialog was drawn over
 * the sentence saying the password was wrong, telling a person who had never
 * had a session that theirs had ended. Its one button returned to the screen
 * they were already on.
 *
 * What this file does *not* do is decide what a 401 means. It cannot: half the
 * answer is the server's `reason` and the other half is whether anybody was
 * signed in a moment ago, which is state this module does not hold and should
 * not start holding. So it reports, and `AuthContext` - which does hold it -
 * decides. See the listener there for the rule.
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
     * The server's own word for why. The session guard sends 'anonymous',
     * 'expired' or 'invalid'; the sign-in route sends 'credentials'; the
     * account rules send the six a refusal can name. It exists so the shell
     * can tell those apart without matching on Thai prose, and since #97 it
     * is half of what decides whether the expiry dialog is drawn - the other
     * half being whether anybody was signed in, which only AuthContext knows.
     */
    this.reason = reason
    /**
     * This was a 401.
     *
     * Sixty-odd call sites read it as *the shell is handling this, so do not
     * also show a notice*, and that reading was exact while every 401 raised
     * the dialog. Since #97 it is one step off: a 401 the shell decided to say
     * nothing about still arrives here as `expired`. Nothing is wrong today,
     * because the only 401 that is not a session ending comes from
     * `POST /api/auth/login` and the one screen that makes that call reads
     * `error.message` rather than this flag. A screen that both signs somebody
     * in and uses the `if (!error.expired)` idiom would swallow its own
     * refusal, so read the name as *was a 401* and not as *was handled*.
     */
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

/**
 * The shell's listener for an account that stopped being usable mid-session -
 * #52.
 *
 * A third answer beside the two above, and it is a 403 rather than a 401 for
 * the reason those two are kept apart: the caller proved who they are and the
 * session has not expired. What makes it different from every other 403 is
 * that it is a fact about the account, so every screen in the system would
 * answer it identically and there is nothing left to stay on. The server says
 * so in `accessEnded` (`backend/auth/authorise.js`), and that field is the
 * whole test here - not the status, which is every refusal of a role, and not
 * the words, which are Thai and belong to `refusals.js`.
 */
let accessEndedListener = null

export const onAccessEnded = listener => {
  accessEndedListener = listener
}

/**
 * The shell's listener for the caller's grants having changed - #77.
 *
 * A third listener beside the two above, and for their reason: what a grant
 * list is worth depends on state only `AuthContext` holds, and a rule each
 * screen has to remember is a rule most of them will not. Every answer under
 * the API's session guard carries `X-Deep-Grants`, so a left-menu press - which
 * is a client-side route change and asks `/api/me` nothing - still brings the
 * picker up to date on the request the new screen was making anyway.
 *
 * **Only the newest reading is announced.** Two requests out at once come back
 * in whichever order the network gives them, and the header on each describes
 * the grants as they stood when *that request was read*. Applying the older
 * reading after the newer one would put a revoked grant back on the picker -
 * the same superseded-answer shape as #51 and #133, arriving through a header
 * rather than through a body.
 *
 * The order worth comparing them in is therefore the order they were **read**
 * in, and only the server knows that, so the server says it: `read_at`. The
 * order the requests *left* in is not the same order and cannot stand in for
 * it - a request that leaves first can be read second, and keying on departure
 * would then drop the newer reading and keep the older, which is the one
 * direction that matters. This is #68's rule about asking what identifies the
 * request, one layer out: what identifies a *reading* is when it was read.
 *
 * What this cannot tell apart is two readings inside the same millisecond; the
 * later-arriving one wins. They describe different states only if a grant was
 * written between them.
 */
let grantsListener = null
/** The `read_at` of the newest reading announced, so older ones are dropped. */
let announcedAt = 0

export const onGrantsChanged = listener => {
  grantsListener = listener
}

/** The header's name, spelt once; `backend/auth/authorise.js` sets it. */
export const GRANTS_HEADER = 'X-Deep-Grants'

/**
 * Base64 of JSON, because `role_name` is Thai and a header is latin-1. A
 * header this side cannot read is nothing to raise an error about: the answer
 * the caller asked for is fine, and the picker simply stays as it was until the
 * next request - so this swallows rather than throws.
 */
const readGrants = response => {
  const raw = response.headers.get(GRANTS_HEADER)
  if (!raw) return null
  try {
    const decoded = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0)))
    )
    const usable =
      Array.isArray(decoded.roles) && typeof decoded.read_at === 'number'
    return usable ? decoded : null
  } catch {
    return null
  }
}

async function api(
  path,
  { method = 'GET', body, signal, contentType, accept } = {}
) {
  // A body that is already a string is sent as it stands, under the type the
  // caller named: #11 posts an import file as text/csv rather than wrapping a
  // spreadsheet inside a JSON string. Everything else is JSON, as before.
  const raw = typeof body === 'string'
  // ...except a form, which #35's PDF upload sends. Its Content-Type carries a
  // boundary that only the browser knows, so naming the type here would produce
  // a header the body does not match and a multipart parser that finds nothing.
  // The one case where saying less is saying it correctly.
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData
  const response = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    signal,
    headers:
      body === undefined || multipart
        ? undefined
        : { 'Content-Type': contentType ?? 'application/json' },
    body: body === undefined || raw || multipart ? body : JSON.stringify(body),
  })

  // Before the refusal below as well as before the body: a 403 from a route
  // this grant may not reach is answered *under* the guard, so it carries the
  // header too, and it is one of the answers that says the grants moved.
  if (grantsListener) {
    const grants = readGrants(response)
    if (grants && grants.read_at > announcedAt) {
      announcedAt = grants.read_at
      grantsListener(grants)
    }
  }

  // A refusal is JSON whatever was asked for, because the error handler and
  // the guards answer in JSON on every route.
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    if (response.status === 401) sessionExpiredListener?.(payload.reason)
    if (payload.accessEnded === true) accessEndedListener?.(payload.message)
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
  // A PDF comes back as bytes rather than as prose. It is fetched rather
  // than linked to for `saveAsFile`'s reason one function down: the endpoint
  // needs the session cookie, and the caller wants the refusal in this
  // application's words rather than as a browser error page.
  if (accept === 'blob') return response.blob()
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

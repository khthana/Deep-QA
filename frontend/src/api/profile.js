import api from './client'

/**
 * The caller's own profile photo — #47.
 *
 * Two calls, and neither of them names an account: the endpoints read the
 * session cookie, which is the whole of the retrieval fix. The delivered system
 * put `${BASE_URL}/static/user_image/<user_id>_<timestamp>.png` in the profile
 * answer and served that directory to anybody who asked, so a photo was
 * reachable by anyone who could guess a name built out of two things they knew.
 *
 * ## Why the photo is fetched and not linked to
 *
 * `evidence.js`' reason, one screen over: `<img src={`${BASE}/api/me/photo`}>`
 * is a request this client does not make. It would carry the cookie today —
 * the API and the frontend are the same site, whatever their ports — and stop
 * carrying it the day the API moves to a domain of its own, which is a
 * deployment change nobody would expect to blank out everyone's face. Going
 * through `client.js` keeps `credentials: 'include'` in one place, and it means
 * a refusal arrives as this application's own sentence rather than as a broken
 * image.
 */

/** The photo as bytes this tab can draw. Throws a 404 when there is none. */
export const getProfilePhoto = () => api('/api/me/photo', { accept: 'blob' })

/**
 * Sets or replaces the photo.
 *
 * multipart for `evidence.js`' reason — an image is not characters — and the
 * field is `image`, which is what the server's `upload.single` reads and what
 * the delivered route called it.
 */
export const uploadProfilePhoto = file => {
  const form = new FormData()
  form.append('image', file, file.name)
  return api('/api/me/photo', { method: 'POST', body: form })
}

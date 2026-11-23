/**
 * Where the accounts list is, as an address - #303.
 *
 * `docs/users-screen.md` rule 6: the edit page's *แสดงรายชื่อผู้ใช้งานทั้งหมด*
 * goes back to the table **at the page and filter it came from**, kept in the
 * edit page's own address, and the browser's back button does the same. The
 * second half is what decides where this lives: back can only land on the page
 * and filter the person left if the **list's** address already says them, so the
 * list writes its page and three filters into its query as they change and
 * reads them from there when it is drawn. The edit page is handed the same
 * query, and its button goes back to `/main/users` with it.
 *
 * One spelling for both directions, so the list and the edit page cannot
 * disagree about which key is which. Empty values are left out, so the list
 * with nothing chosen is still the bare `/main/users` every row opens.
 *
 * Nothing here decides what the person may see: a filter in an address is a
 * question the server answers for this reader as for any other (ADR-0002).
 */

export const USERS = '/main/users'

const KEYS = ['q', 'role', 'status']

/** The query for one page of one filter, with a leading `?` or nothing at all. */
export const listQuery = (page, filters) => {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  for (const key of KEYS) if (filters[key]) params.set(key, filters[key])
  const text = params.toString()
  return text ? `?${text}` : ''
}

/**
 * The page and filters an address names. A page that is not a whole number
 * above zero is page 1, which is what the server does with one too
 * (`backend/lib/paging.js` floors it); a page past the end is #239's to hand on.
 */
export const fromQuery = search => {
  const params = new URLSearchParams(search)
  const asked = Number(params.get('page'))
  return {
    page: Number.isInteger(asked) && asked > 0 ? asked : 1,
    filters: Object.fromEntries(KEYS.map(key => [key, params.get(key) ?? ''])),
  }
}

/** One account's edit page, carrying the list it was opened from. */
export const editAddress = (userId, page, filters) =>
  `${USERS}/edit-user/${encodeURIComponent(userId)}${listQuery(page, filters)}`

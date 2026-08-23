import { del, get, post, put, query } from './client'

/**
 * The Programme Learning Outcome calls — #19.
 *
 * ผลการเรียนรู้ระดับหลักสูตร. Two things about this set differ from every screen
 * before it, and both show up here.
 *
 * *There is no page.* `listPlos` fetches the whole set for a หลักสูตร, because a
 * child on page two whose parent is on page one is not a tree. The rows arrive
 * already in tree order, carrying the `level_depth` the screen indents by, so
 * the list is drawn in the order it is given rather than re-sorted here — the
 * order is the server's answer, and the fourth criterion is about that answer.
 *
 * *A code is unique inside its หลักสูตร and nowhere wider.* Two curricula may
 * each hold a `PLO-1`, which is the whole point of the ticket, so nothing here
 * treats a code as an identifier. The identifier is `outcome_id`, and it is
 * what every path below carries.
 */

/** The whole tree for one หลักสูตร, in the order it is meant to be drawn. */
export const listPlos = (params = {}) => get(`/api/plos${query(params)}`)

/**
 * The curricula this account may maintain.
 *
 * Read from here rather than from `/api/programs`, which belongs to the two
 * administrators (#15) — a กรรมการหลักสูตร belongs on this screen and would be
 * refused by that one. A committee member gets exactly one back, which the
 * screen shows as a label rather than as a dropdown.
 */
export const listReachablePrograms = () => get('/api/plos/programs')

/**
 * One outcome, read back from the server.
 *
 * The editor asks for this rather than reusing the row the list already drew,
 * so a form opened on a page that has been sitting there edits what is in the
 * database now.
 */
export const getPlo = outcomeId => get(`/api/plos/${outcomeId}`)

export const createPlo = draft => post('/api/plos', draft)

export const updatePlo = (outcomeId, draft) => put(`/api/plos/${outcomeId}`, draft)

/**
 * Taking one out.
 *
 * Three answers rather than one. An outcome nothing points at is deleted and
 * comes back 204 with no body; one a subject mapping or a CLO points at is
 * switched off instead and comes back with `deactivated: true` and the row as
 * it now stands; and one that still has ข้อย่อย is refused outright, because
 * switching a parent off while its children stay listed underneath is not what
 * the person asked for. The screen says which of the three happened — "ลบแล้ว"
 * for a record that is still there would be a lie the person acts on.
 */
export const deletePlo = outcomeId => del(`/api/plos/${outcomeId}`)

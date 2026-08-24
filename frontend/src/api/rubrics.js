import { del, get, post, put, query } from './client'

/**
 * The Rubric calls — #21.
 *
 * ข้อมูล Rubric กลาง: the reusable scoring guides a หลักสูตร marks against. Two
 * things about this set differ from the ผลการเรียนรู้ one screen earlier, and
 * both show up here.
 *
 * *A code is unique across the institution, not within its หลักสูตร.* #19 exists
 * to make two curricula able to hold a PLO-1 each; `rubric_code` is the
 * opposite, `UNIQUE` on its own, because the inherited lookup is handed a code
 * with no curriculum beside it. So a 409 from any call below may be about a
 * rubric this account cannot see, and the sentence the server sends is the only
 * way of learning that — nothing here should paraphrase it.
 *
 * *There is a page.* A rubric list is flat, so it pages at ten like every other
 * master-data screen; the tree that stopped #19 from paging is not here.
 */

/** One page of the list. `program_id` narrows it inside the account's reach. */
export const listRubrics = (params = {}) => get(`/api/rubrics${query(params)}`)

/**
 * The curricula this account may maintain.
 *
 * Read from here rather than from `/api/programs`, which belongs to the two
 * administrators (#15) — a กรรมการหลักสูตร belongs on this screen and would be
 * refused by that one. A committee member gets exactly one back, which the
 * screen shows as a label rather than as a dropdown.
 */
export const listReachablePrograms = () => get('/api/rubrics/programs')

/**
 * One rubric, read back from the server.
 *
 * The editor asks for this rather than reusing the row the list already drew,
 * so a form opened on a page that has been sitting there edits what is in the
 * database now.
 */
export const getRubric = rubricId => get(`/api/rubrics/${rubricId}`)

export const createRubric = draft => post('/api/rubrics', draft)

export const updateRubric = (rubricId, draft) => put(`/api/rubrics/${rubricId}`, draft)

/**
 * Taking one out, for good.
 *
 * One answer, not three. Every other master-data screen may come back having
 * switched a row off instead, because something points at it; nothing points at
 * a rubric except its own criteria, and those are `ON DELETE CASCADE`. So this
 * deletes, and `criteria_removed` says how many criteria went with it — which
 * the screen puts in the banner, because "ลบแล้ว" over four destroyed criteria
 * is half the truth.
 */
export const deleteRubric = rubricId => del(`/api/rubrics/${rubricId}`)

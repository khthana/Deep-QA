import { del, get, post, put, query } from './client'

/**
 * The Program Subject calls — #18.
 *
 * The pairing of a หลักสูตร with a รายวิชา. Two things about it differ from
 * every screen before it and both show up here.
 *
 * A pairing is named by two identifiers rather than one — the key is the pair
 * (ADR-0001, tier two) — so the path carries both, and neither half can be
 * edited: moving a subject between programmes is a removal and a placement.
 *
 * The two pickers are read from different places on purpose. The programmes are
 * the account's own reach, and every write is checked against the same reach on
 * the server, so what the picker offers cannot be turned down. The catalogue is
 * deliberately wider: a computer engineering curriculum contains mathematics and
 * general education subjects owned by other departments, and a picker narrowed
 * to the programme's department could not express a real one.
 */

/** One page of pairings, with the total so a pager can be drawn. */
export const listProgramSubjects = (params = {}) =>
  get(`/api/program-subjects${query(params)}`)

/**
 * The programmes this account may maintain, each with its `is_active`.
 *
 * Read from here rather than from `/api/programs`, which belongs to the two
 * administrators (#15) — a กรรมการหลักสูตร belongs on this screen and would be
 * refused by that one. A committee member gets exactly one back, which is what
 * the screen shows as a label rather than as a dropdown.
 */
export const listReachablePrograms = () => get('/api/program-subjects/programs')

/**
 * The catalogue to choose from, narrowed by what was typed.
 *
 * Only subjects the university still teaches come back, because placing a
 * retired one is refused — a picker offering a choice the server will turn down
 * is a picker that lies.
 */
export const searchCatalogue = q =>
  get(`/api/program-subjects/catalogue${query({ q })}`)

/**
 * One pairing, read back from the server.
 *
 * The editor asks for this rather than reusing the row the list already drew, so
 * a form opened on a page that has been sitting there edits what is in the
 * database now.
 */
export const getProgramSubject = (programId, subjectId) =>
  get(`/api/program-subjects/${programId}/${subjectId}`)

export const createProgramSubject = draft => post('/api/program-subjects', draft)

export const updateProgramSubject = (programId, subjectId, draft) =>
  put(`/api/program-subjects/${programId}/${subjectId}`, draft)

/**
 * Taking one out.
 *
 * Two answers rather than one. A pairing nothing points at is deleted and comes
 * back 204 with no body; one that an Offering — and through it the CLOs and
 * every mark — points at is switched off instead and comes back with
 * `deactivated: true` and the row as it now stands. The screen says which of the
 * two happened, because "ลบแล้ว" for a record that is still there would be a lie
 * the person acts on.
 */
export const deleteProgramSubject = (programId, subjectId) =>
  del(`/api/program-subjects/${programId}/${subjectId}`)

/** The template, as its text, so the screen can hand it to the browser. */
export const importTemplate = () =>
  get('/api/program-subjects/import-template', { accept: 'text' })

/** A completed file, posted as its own text. */
export const importProgramSubjects = csv =>
  post('/api/program-subjects/import', csv, { contentType: 'text/csv' })

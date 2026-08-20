import { get, post, query } from './client'

/**
 * The central student register — #17.
 *
 * Four things about this screen differ from every master-data screen before it,
 * and all four show up in what is and is not exported here.
 *
 * There is no update and no removal. docs/06 asks for browse, add and page, and
 * #17 asks for nothing else: a student who leaves is a `status`, and the ticket
 * that needs to set one can add the call. So there is no `updateStudent` and no
 * `deleteStudent` to be tempted by.
 *
 * The department is never sent. A student's row carries one, but it is taken
 * from the หลักสูตร they are admitted to — so the form asks for the programme
 * and the server derives the rest, and neither the draft nor the import file
 * has a department in it.
 *
 * The admission year is never sent either. It is the first two digits of the
 * student code plus 2500, computed on the server, and a form that offered the
 * field would be offering to edit something the server discards.
 *
 * An import that meets a code the register already holds updates it. That is
 * the ticket's sixth criterion and it is why `importStudents` can answer 201
 * with `created` counting rows that overwrote somebody rather than rows that
 * were added — the screen says how many rows were applied, not how many
 * students are new.
 */

/** One page of the register, with the total so a pager can be drawn. */
export const listStudents = (params = {}) => get(`/api/students${query(params)}`)

/**
 * The หลักสูตร this account may file a student under, each with its department.
 *
 * Read from here rather than from `/api/programs`, which belongs to the two
 * administrators (#15) and answers a different question — this list is exactly
 * what the server will accept on a write, so the picker cannot offer a choice
 * that is then turned down.
 */
export const listReachablePrograms = () => get('/api/students/programs')

/** The departments in reach, which is how a `department_id` becomes a name. */
export const listReachableDepartments = () => get('/api/students/departments')

export const createStudent = draft => post('/api/students', draft)

/** The template, as its text, so the screen can hand it to the browser. */
export const importTemplate = () =>
  get('/api/students/import-template', { accept: 'text' })

/** A completed file, posted as its own text. */
export const importStudents = csv =>
  post('/api/students/import', csv, { contentType: 'text/csv' })

import { get, put, query } from './client'

/**
 * The outcome-to-subject mapping calls — #20.
 *
 * การเชื่อมโยงผลการเรียนรู้กับรายวิชา. Two things about this screen differ from
 * every one before it, and both show up here.
 *
 * *One read answers the whole screen.* Every other screen lists one table and
 * its api file has a `listX`. A grid is two axes and the cells between them, and
 * fetching those separately would draw the screen three times and leave it
 * briefly wrong twice — a column arriving before the cell that belongs under it
 * is a cell in the wrong square. So `readGrid` is one call and one snapshot.
 *
 * *The write names no identifier in its path.* A cell has no surrogate key —
 * ADR-0001 tier 2 puts the three names in the primary key instead — so there is
 * nothing to put after a slash. `saveCell` is a PUT to the collection carrying
 * the three names in the body, and it is a PUT rather than a POST because the
 * same request means the same thing whether the cell has been set before or
 * not: a grid does not create cells, it fills the ones its axes already make.
 */

/** The rows, the columns and the cells of one หลักสูตร's grid, from one call. */
export const readGrid = programId =>
  get(`/api/plo-mapping${query({ program_id: programId })}`)

/**
 * The curricula this account may maintain.
 *
 * Borrowed from #19's endpoint rather than given one of its own. The two
 * screens ask the identical question of the identical pair of roles, and a
 * second route answering it would be a second place for the reach to drift.
 * `/api/programs` is not the answer for either of them: it belongs to the two
 * administrators (#15) and would refuse the กรรมการหลักสูตร this screen is
 * mainly for.
 */
export const listReachablePrograms = () => get('/api/plos/programs')

/** One cell, at one of the five levels. */
export const saveCell = cell => put('/api/plo-mapping', cell)

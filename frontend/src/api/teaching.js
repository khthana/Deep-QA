import { get } from './client'

/**
 * The Teacher's own Sections — #24.
 *
 * Two calls, and the difference between them is the whole of the Section
 * context. `listMySections` is the dashboard: what this account teaches in the
 * term the server says it is. `getMySection` is one of them, asked for by id,
 * and it is what every Teacher screen below the dashboard resolves its context
 * with — including after a reload, when nothing but the address is left.
 *
 * The id in that address is the whole carrier. Nothing here writes to
 * `localStorage`, and the screens must not either: ADR-0004 says why, and the
 * short version is that a remembered Section and a URL are two answers to one
 * question and the remembered one wins silently when they disagree.
 *
 * A Section the account does not teach is answered 404 by the server, with the
 * same sentence a Section that does not exist gets. The screen therefore has
 * one refusal to word rather than two, and it must not soften it into "choose
 * a section" — the person may have followed a real link to a real class that
 * is somebody else's, and the answer to that is that it is not theirs.
 */

/**
 * The Sections this account teaches this term, and which term that is.
 *
 * The term comes back with the list on purpose: an empty dashboard has to say
 * which term it found nothing in, and a screen that worked that out from the
 * browser's own clock would disagree with the server for one day a year.
 */
export const listMySections = () => get('/api/teaching/sections')

/** One Section of theirs, by the id the route is carrying. */
export const getMySection = sectionId => get(`/api/teaching/sections/${sectionId}`)

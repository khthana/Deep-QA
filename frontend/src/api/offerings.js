import { del, get, post, put, query } from './client'

/**
 * The Offering and Section calls — #23.
 *
 * รายวิชาที่เปิดสอน: which of a หลักสูตร's subjects run in a given ปีการศึกษา
 * and ภาคการศึกษา, split into ตอนเรียน, each given to one or more ผู้สอน.
 *
 * Three things about this screen differ from every one before it and all three
 * show up here.
 *
 * *One role reaches it.* The whole of this module answers 403 to anybody who is
 * not a กรรมการหลักสูตร, Faculty Admin included. The screen does not check that
 * — the server does, and the sidebar only offers the entry to the role that
 * holds it.
 *
 * *There are two grains.* An Offering is the subject-in-a-term and has its own
 * path; a Section lives under it, so every section call carries both
 * identifiers. That is not decoration: a section id guessed against another
 * Offering is answered 404 rather than edited.
 *
 * *Nothing here is switched off.* `deleteProgramSubject` has two answers —
 * deleted, or deactivated instead. These have one. Neither `semester_courses`
 * nor `course_sections` carries an `is_active`, so a removal either happens or
 * is refused with a message about what is depending on it, and the screen has
 * no third state to word.
 */

/** One page of Offerings, with the total so a pager can be drawn. */
export const listOfferings = (params = {}) => get(`/api/offerings${query(params)}`)

/**
 * The programmes this account may open subjects in.
 *
 * Read from here rather than from `/api/programs`, which belongs to the two
 * administrators (#15) and would refuse the committee member this screen is
 * entirely for. A committee member gets exactly one back, which the screen
 * shows as a label rather than as a dropdown.
 */
export const listReachablePrograms = () => get('/api/offerings/programs')

/**
 * The subjects that may be opened in one programme.
 *
 * Only what #18 placed there and only what is still switched on: opening a
 * subject that is not in the curriculum is refused, and a picker offering a
 * choice the server will turn down is a picker that lies.
 */
export const listOfferableSubjects = programId =>
  get(`/api/offerings/subjects${query({ program_id: programId })}`)

/**
 * The people who may be given a section, narrowed by what was typed.
 *
 * Every registered account rather than only those holding TEACHER — the ticket
 * says "already registered as a user", and a section is sometimes taught by
 * somebody whose grant is another role. Suspended accounts are absent, which is
 * the other half of the refusal the server gives for one.
 */
export const searchTeachers = q => get(`/api/offerings/teachers${query({ q })}`)

/**
 * One Offering with its sections, each carrying the people teaching it and how
 * many students are enrolled.
 *
 * The count is what the confirmation dialog is worded from: the refusal to
 * remove a section that is in use is the server's, and a screen that only
 * learns of it from a 409 cannot warn anybody first.
 */
export const getOffering = id => get(`/api/offerings/${id}`)

export const createOffering = draft => post('/api/offerings', draft)

/** Closing one. 204 and gone, or 409 with what is depending on it. */
export const deleteOffering = id => del(`/api/offerings/${id}`)

export const createSection = (offeringId, draft) =>
  post(`/api/offerings/${offeringId}/sections`, draft)

export const updateSection = (offeringId, sectionId, draft) =>
  put(`/api/offerings/${offeringId}/sections/${sectionId}`, draft)

export const deleteSection = (offeringId, sectionId) =>
  del(`/api/offerings/${offeringId}/sections/${sectionId}`)

/**
 * Who teaches a section — a replacement rather than an addition.
 *
 * The whole set goes up together, because a box that can only add cannot take
 * somebody off a class they no longer teach. One unknown code writes nothing.
 */
export const assignTeachers = (offeringId, sectionId, userIds) =>
  put(`/api/offerings/${offeringId}/sections/${sectionId}/teachers`, {
    user_ids: userIds,
  })

/**
 * Copying a whole term onto another.
 *
 * Answers a report rather than a count: what it created, what was already open
 * in the target term, what has since been taken out of the curriculum, and
 * which teachers were dropped because their accounts are no longer active. All
 * four happen on a real copy, and the screen reads out the ones that are not
 * empty.
 */
export const copyTerm = draft => post('/api/offerings/copy', draft)

'use strict';

/**
 * The teaching register — the join ADR-0002 rests on, extracted at the third
 * copy, #104.
 *
 * "Does this account teach this ตอนเรียน" is answered by `course_sections_teacher`
 * joined through `course_sections` to `semester_courses`, keyed on
 * `(section_id, user_id)` and on nothing the caller sent. By #25 that join was
 * written out three times — `routes/teaching.js`'s `FROM`, `clos.js`'s
 * `offeringOf` and `enrolment.js`'s `sectionOf` — and the three agreed only
 * because #25's code review checked them against each other by hand. Nothing
 * kept them agreeing: a future `cst.valid_until`, or a change in how a missing
 * ตอนเรียน and a colleague's share one refusal, would have to be re-discovered
 * twice. `lib/fields.js` extracted at the third copy on the same argument.
 *
 * These are here rather than in `auth/authorise` for `lib/reach.js`'s reason:
 * they are query text, not guards. The route still decides what the answer
 * means — and, ADR-0002, the `user_id` that goes in comes from the session,
 * which the server put there from the database.
 *
 * *The two grains stay two.* `sectionOf` (Section) and `offeringOf` (Offering)
 * are projections over these fragments and must not become one function.
 * Enrolment stops at the ตอนเรียน deliberately — two ตอนเรียน of one Offering
 * are two class lists, which is the whole reason a Section exists — while CLOs
 * resolve through to the Offering because ADR-0003 puts them at (Program,
 * Subject, ปีการศึกษา). What they share is *who may see this ตอนเรียน*, which
 * is what is written here; what they return is theirs, and stays in their own
 * file beside the note that says why.
 */

/**
 * The register itself: the ตอนเรียน, and the Offering it belongs to.
 *
 * `subjects` is not joined here because `offeringOf` does not want it — the
 * Offering triple is what ADR-0003 asks for, and a join for a name nobody reads
 * is a join a later reader has to justify. The two callers that do want the
 * name add `WITH_SUBJECT` below.
 */
const REGISTER = `FROM course_sections_teacher cst
       JOIN course_sections cs ON cs.section_id = cst.section_id
       JOIN semester_courses sc ON sc.id = cs.semester_course_id`;

/** The รายวิชา's names and credits, for the screens whose heading says them. */
const WITH_SUBJECT = `JOIN subjects s ON s.subject_id = sc.subject_id`;

/**
 * This ตอนเรียน, if it is this account's — `$1` the section id, `$2` the user.
 *
 * The register is the whole of the WHERE clause. A Teacher's grant is scoped at
 * their department, and the department is not what decides this and must not
 * be: a colleague's ตอนเรียน is in the same department and is not theirs.
 *
 * Nothing here is restricted to the current term. A Teacher following a link to
 * last year's ตอนเรียน is asking for one they taught, and the register says so;
 * refusing it would be the dashboard's listing rule enforced as an
 * authorisation rule, which is the confusion ADR-0002 exists to prevent.
 */
const THIS_ACCOUNTS_SECTION = `WHERE cs.section_id = $1 AND cst.user_id = $2`;

/**
 * What is deliberately *not* here is the refusal. `notThisSection` stays in
 * `routes/enrolment.js`, exported beside `sectionOf` because the two are one
 * act — resolve the ตอนเรียน, or refuse it — and nine route files take the pair
 * from there in one `require`. `lib/reach.js` left its refusal key
 * behind for the neighbouring reason: these answer in query text, and the route
 * says what the answer means.
 */

module.exports = { REGISTER, WITH_SUBJECT, THIS_ACCOUNTS_SECTION };

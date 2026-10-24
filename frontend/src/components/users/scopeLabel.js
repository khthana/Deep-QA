/**
 * A scope as a person reads it, in one place — #90, #215.
 *
 * #90 gave these words to `GrantPicker`, the field where an administrator
 * *chooses* a scope. #215 asked whether the three screens that draw one for
 * somebody to *read* get the same words, and the owner answered on 23 October
 * 2569 that the two administration screens do - the held-roles table of
 * `GrantsPanel` and the role column of the accounts list - in the picker's
 * wording, letter for letter.
 *
 * Extracted to a module of its own rather than imported from the picker, the
 * way `personName` was when the history screen needed the users table's rule.
 * The text being shared costs the proof nothing as long as the mutants stay at
 * the call sites: this file is then a premise and each screen's *use* of it is
 * still its own claim (#104).
 */

/** The kinds of scope, in `CONTEXT.md`'s own words. */
const KINDS = { faculty: 'คณะ', department: 'ภาควิชา', program: 'หลักสูตร' }

/**
 * The name with the stored code after it, except where the code is not a code.
 *
 * Every scope's brackets hold an identifier the organisation uses - `05`,
 * `0501`, `ENG` - and the grant confined to nothing holds `FULL_ADMIN`, which
 * `CONTEXT.md` §Scope chose in place of a null so that the column could stay
 * `NOT NULL`. The field teaches *brackets hold this thing's code*, so that one
 * entry was teaching a code nobody in the organisation says; #216 asked, and
 * the owner answered on 24 October 2569 that the brackets go with it.
 *
 * Asked of the kind the server sends rather than of the code's own spelling,
 * because what the rule is about is the one scope that is not a record. There
 * is one such kind today: a second sentinel would be owed this clause too, and
 * `KINDS` above has no `global` entry for the same reason the label needs no
 * word in front of it.
 */
const withCode = scope =>
  scope.kind === 'global' ? scope.label : `${scope.label} (${scope.scope_id})`

/**
 * The scope as a person reads it: which kind of thing it is, its name, and -
 * where the stored value is a code at all - that code.
 *
 * The kind comes from the server - `GET /api/users/grantable` has answered it
 * all along - because the alternative is the screen inferring it from the
 * length of the code, which is #90: a department and a programme can carry the
 * same name, and in this organisation two of them do. That is not a cosmetic
 * difference. This field decides how wide the grant's authority is, both
 * values are legal, and nothing refuses the wrong one.
 *
 * No word goes in front of a label that already says it. The grant confined to
 * nothing is one such label - its own name holds the whole of the organisation
 * - and so is the faculty, which this organisation calls
 * `คณะวิศวกรรมศาสตร์`; the owner was asked and answered on 17 October 2569
 * that the duplicate goes. The first version of this rule was written for the
 * unconfined grant alone, which was a condition drawn from one case while a
 * sibling was already outside it (#113).
 *
 * The map keeps its `faculty` entry even so, because the entry is the rule and
 * the seed is one instance of it: a faculty named without the word is owed one,
 * and `90a` row 5 renames the seeded faculty to measure exactly that. Any kind
 * this map has never heard of reads the way every entry did before #90 rather
 * than reading `undefined`.
 */
export const scopeLabel = scope => {
  const kind = KINDS[scope.kind]
  return kind && !scope.label.startsWith(kind)
    ? `${kind} · ${withCode(scope)}`
    : withCode(scope)
}

/**
 * The same sentence for the screens that are handed a code and nothing else.
 *
 * `GET /api/users/grantable` is the only answer in the system that carries a
 * name and a kind, and what it answers is *what this administrator may offer* -
 * not *what this code is*. The grants a person already holds arrive as bare
 * codes, from `/users/:userId/roles` and from the accounts list, so the name is
 * looked up in the list the screen is already holding for its pickers.
 *
 * A code that is not in that list keeps the bare code. That is what a reader
 * sees for a grant outside their own reach - the asymmetry `cross01` exists for,
 * a person inside department 05 whose grant is over 01 - and for every grant at
 * all while the fetch is in flight or has been refused, since `useGrantable`
 * answers an empty list on a 401 or a 403. The alternative, naming the kind from
 * the length of the code, is #90 itself; a dash would be worse again, because
 * the code is the one thing the screen does know.
 *
 * `215a` row 3 is that reading, and asserts the mechanism beside it: the scope
 * it reads a bare code for is one the picker on the same screen does not offer.
 *
 * The sentinel is the one scope this fallback cannot be reached for, measured
 * on 24 October 2569 for #216: a faculty and a department administrator
 * searching for the account that holds a grant confined to nothing were each
 * shown no rows at all. `backend/routes/users.js` filters the accounts list by
 * seniority as well as by scope, and the seniority half excludes every holder
 * of that grant wherever they sit. Whoever may read it is offered it, and so
 * has its name.
 */
export const scopeNamed = (scopes, scopeId) => {
  const scope = scopes.find(entry => entry.scope_id === scopeId)
  return scope ? scopeLabel(scope) : scopeId
}

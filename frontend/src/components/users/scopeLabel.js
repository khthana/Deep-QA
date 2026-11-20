/**
 * A scope as a person reads it, in one place — #90, #215, #294.
 *
 * #90 gave these words to `GrantPicker`, the field where an administrator
 * *chooses* a scope. #215 asked whether the three screens that draw one for
 * somebody to *read* get the same words, and the owner answered on 23 October
 * 2569 that the two administration screens do - the held-roles table of
 * `GrantsPanel` and the role column of the accounts list - in the picker's
 * wording, letter for letter.
 *
 * **The code went on 20 November 2569 (#294).** Until then every label here
 * carried the stored code in brackets after the name - `0501`, `05`, `ENG` -
 * which the owner had chosen on 23 October (#215) and again for the role
 * picker on 27 October (#231). #294 reversed both: a faculty, department or
 * programme is read by its name everywhere except the two screens that manage
 * those records (`main/programs`, `main/departments`), with the kind word in
 * front wherever the line does not already say it. The kind word is what keeps
 * department `05` and programme `0501` apart now that both read
 * `วิศวกรรมคอมพิวเตอร์`; two programmes whose names match letter for letter
 * cannot be told apart, and the owner accepted that price (#294 rule 3).
 *
 * **The separator went the same day (#295).** #294 left the kind word joined
 * three ways - ` · ` here, straight onto the name on the panel line, the
 * removal question, the PDF heading and the history, and after a role's name
 * in the role picker - and the owner answered on 20 November 2569 that every
 * screen joins it the way the PDF heading they wrote does:
 * `หลักสูตรวิศวกรรมคอมพิวเตอร์`. A code standing in for a name that cannot be
 * found keeps its space (`หลักสูตร Z294GONE`), which is not this file's.
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
 * The word for a kind of scope, or `undefined` for a kind that has none - the
 * grant confined to nothing, and any kind this map has never heard of.
 *
 * Exported for the role picker (#294), which puts the word in front of the
 * name itself because its line already holds the role's name, and a role
 * name can say the kind already - `กรรมการหลักสูตร` - or not -
 * `ผู้ประเมินภายนอก`.
 */
export const kindWord = kind => KINDS[kind]

/**
 * The scope as a person reads it: which kind of thing it is, and its name.
 *
 * The kind comes from the server - `GET /api/users/grantable` has answered it
 * all along, and since #294 so does every read of a held grant - because the
 * alternative is the screen inferring it from the length of the code, which is
 * #90: a department and a programme can carry the same name, and in this
 * organisation two of them do. That is not a cosmetic difference. This field
 * decides how wide the grant's authority is, both values are legal, and
 * nothing refuses the wrong one.
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
 * this map has never heard of reads its name alone rather than `undefined`.
 */
export const scopeLabel = scope => {
  const kind = KINDS[scope.kind]
  // A department or programme with no Thai name - the column may be null, and
  // only data the application did not write leaves it so. It reads as its kind
  // and its code, the way the history reads a unit that is gone (#294 rule 6);
  // the owner answered on 20 November 2569 that the screen falls back and the
  // column stays nullable (#297). Until then `startsWith` threw here and took
  // the accounts screen down with it.
  if (!scope.label) return kind ? `${kind} ${scope.scope_id}` : scope.scope_id
  return kind && !scope.label.startsWith(kind)
    ? `${kind}${scope.label}`
    : scope.label
}

/**
 * The same sentence for a code and nothing else, looked up in a list.
 *
 * `GET /api/users/grantable` answers *what this administrator may offer*, not
 * *what this code is*, so a code outside that list keeps the bare code. Since
 * #294 a held grant arrives with its own name (`grantScope` below), and this is
 * reached for the two scopes that have none: the grant confined to nothing,
 * whose name lives only in that list (`ทั้งมหาวิทยาลัย`), and a `scope_id`
 * naming nothing in the three tables, where the code is the only true thing
 * left to say.
 *
 * The sentinel's own reach was measured on 24 October 2569 for #216: a faculty
 * and a department administrator searching for the account that holds a grant
 * confined to nothing were each shown no rows at all, because
 * `backend/routes/users.js` filters the accounts list by seniority as well as
 * by scope. Whoever may read it is offered it, and so has its name.
 */
export const scopeNamed = (scopes, scopeId) => {
  const scope = scopes.find(entry => entry.scope_id === scopeId)
  return scope ? scopeLabel(scope) : scopeId
}

/**
 * A held grant's scope, read off the grant - #294.
 *
 * Until #294 a held grant arrived as a bare code and was named out of the
 * picker's own list (`scopeNamed`), which left a grant outside the reader's
 * reach - the asymmetry `cross01` exists for, a person inside department 05
 * whose grant is over 01 - drawn as `01` (#215's row 3). The owner answered on
 * 20 November 2569 that the server sends the name instead, so
 * `/users/:userId/roles` and the accounts list now carry `scope_name` and
 * `scope_kind` from `backend/auth/scopeNames.js`, the same resolver as the role
 * picker's (#231). A grant the server cannot name falls back to the list.
 */
export const grantScope = (scopes, grant) =>
  grant.scope_name
    ? scopeLabel({ kind: grant.scope_kind, label: grant.scope_name })
    : scopeNamed(scopes, grant.scope_id)

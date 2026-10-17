import { roleName } from '../MapRole'

/**
 * One role and one scope, chosen from what the server says may be offered.
 *
 * Shared by the add-account form, which makes the first grant, and by the
 * grants panel, which makes every one after it. A second copy would be a
 * second place for the two halves to drift apart - a grant naming a role
 * without a scope is not a grant, and both screens have to say so the same
 * way.
 */

const field =
  'block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
const labelling = 'mb-1 block text-sm text-gray-500'

/** The kinds of scope, in `CONTEXT.md`'s own words. */
const KINDS = { faculty: 'คณะ', department: 'ภาควิชา', program: 'หลักสูตร' }

/**
 * The scope as a person reads it: which kind of thing it is, its name, and the
 * code that is stored.
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
const scopeLabel = scope => {
  const kind = KINDS[scope.kind]
  return kind && !scope.label.startsWith(kind)
    ? `${kind} · ${scope.label} (${scope.scope_id})`
    : `${scope.label} (${scope.scope_id})`
}

export default function GrantPicker({ grantable, value, onChange, disabled }) {
  const set = key => event => onChange({ ...value, [key]: event.target.value })

  return (
    <>
      <label className="block">
        <span className={labelling}>บทบาท</span>
        <select
          className={field}
          value={value.role_id}
          onChange={set('role_id')}
          disabled={disabled}
        >
          <option value="">— เลือกบทบาท —</option>
          {grantable.roles.map(role => (
            <option key={role.role_id} value={role.role_id}>
              {roleName(role.role_id)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelling}>ขอบเขตของบทบาท</span>
        <select
          className={field}
          value={value.scope_id}
          onChange={set('scope_id')}
          disabled={disabled}
        >
          <option value="">— เลือกขอบเขต —</option>
          {grantable.scopes.map(scope => (
            <option key={scope.scope_id} value={scope.scope_id}>
              {scopeLabel(scope)}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

import { roleName } from '../MapRole'
import { scopeLabel } from './scopeLabel'

/**
 * One role and one scope, chosen from what the server says may be offered.
 *
 * Shared by the add-account form, which makes the first grant, and by the
 * grants panel, which makes every one after it. A second copy would be a
 * second place for the two halves to drift apart - a grant naming a role
 * without a scope is not a grant, and both screens have to say so the same
 * way.
 *
 * How a scope is worded was this file's until #215, when two screens that draw
 * one for reading were given the same words; it lives in `scopeLabel.js` now
 * and the mutants that prove it stayed where they were (#104).
 */

const field =
  'block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
const labelling = 'mb-1 block text-sm text-gray-500'

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

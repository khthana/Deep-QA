import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import GrantPicker from './GrantPicker'
import useGrantable from './useGrantable'

/**
 * The form for adding an account and for editing one — #11.
 *
 * One component for both, because the fields are the same and a second copy is
 * a second place for a rule to be forgotten. What differs is small and stated
 * where it happens: the identifier cannot change once it exists, and the role
 * pickers are shown only when adding, because that is the one grant made with
 * the account. Every grant after it is managed in the panel beside this form
 * (#12), which is where a person already holding roles has them listed.
 *
 * The validity period is shown for every role and not only for the external
 * assessor, because it is a property of the account rather than of the grant
 * (migration 0005). It is where an assessor's `บัญชีชั่วคราว` is stated, and
 * an ordinary account simply leaves it blank.
 *
 * Nothing here decides what the person may do. The roles and scopes offered
 * are the ones the server said this administrator may hand out, and the server
 * decides again when the form is posted; a form that enforced it alone would
 * be a rule with a way around it (ADR-0002).
 */

const EMPTY = {
  user_id: '',
  email: '',
  title_th: '',
  first_name_th: '',
  last_name_th: '',
  title_en: '',
  first_name_en: '',
  last_name_en: '',
  department_id: '',
  program_id: '',
  password: '',
  valid_from: '',
  valid_until: '',
  role_id: '',
  scope_id: '',
}

const field =
  'block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
const labelling = 'mb-1 block text-sm text-gray-500'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelling}>{label}</span>
      {children}
    </label>
  )
}

export default function UserForm({ user, onSubmit, onCancel, busy }) {
  const editing = Boolean(user)
  const grantable = useGrantable()
  const [draft, setDraft] = useState(EMPTY)

  useEffect(() => {
    if (!user) return setDraft(EMPTY)
    setDraft({
      ...EMPTY,
      ...Object.fromEntries(
        Object.entries(user).map(([key, value]) => [key, value ?? ''])
      ),
    })
  }, [user])

  const set = key => event =>
    setDraft(current => ({ ...current, [key]: event.target.value }))

  // The two roles the sign-in rule sends to the password form; everybody else
  // goes to Google. Marked here as well as refused server-side so the person
  // finds out while they are still filling the form in.
  const needsPassword =
    draft.role_id === 'FULL_ADMIN' || draft.role_id === 'EXT_ASSESSOR'

  const submit = event => {
    event.preventDefault()
    const { role_id, scope_id, password, ...details } = draft
    // An edit sends the details alone. The grants an existing account holds are
    // the panel's - they are added and revoked one at a time against their own
    // routes - and a role smuggled into an edit body would be one the server
    // has to decide whether to ignore.
    onSubmit(
      editing
        ? details
        : { ...details, password, role: { role_id, scope_id } }
    )
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="รหัสผู้ใช้">
            <input
              className={field}
              value={draft.user_id}
              onChange={set('user_id')}
              disabled={editing}
              required
            />
          </Field>
          <Field label="อีเมล">
            <input
              className={field}
              type="email"
              value={draft.email}
              onChange={set('email')}
              required
            />
          </Field>

          <Field label="คำนำหน้า (ไทย)">
            <input
              className={field}
              value={draft.title_th}
              onChange={set('title_th')}
            />
          </Field>
          <Field label="คำนำหน้า (อังกฤษ)">
            <input
              className={field}
              value={draft.title_en}
              onChange={set('title_en')}
            />
          </Field>

          <Field label="ชื่อ (ไทย)">
            <input
              className={field}
              value={draft.first_name_th}
              onChange={set('first_name_th')}
            />
          </Field>
          <Field label="นามสกุล (ไทย)">
            <input
              className={field}
              value={draft.last_name_th}
              onChange={set('last_name_th')}
            />
          </Field>

          <Field label="ชื่อ (อังกฤษ)">
            <input
              className={field}
              value={draft.first_name_en}
              onChange={set('first_name_en')}
            />
          </Field>
          <Field label="นามสกุล (อังกฤษ)">
            <input
              className={field}
              value={draft.last_name_en}
              onChange={set('last_name_en')}
            />
          </Field>

          <Field label="รหัสภาควิชา">
            <input
              className={field}
              value={draft.department_id}
              onChange={set('department_id')}
              placeholder="05"
            />
          </Field>
          <Field label="รหัสหลักสูตร">
            <input
              className={field}
              value={draft.program_id}
              onChange={set('program_id')}
              placeholder="0501"
            />
          </Field>
        </div>

        {/*
          R005's time-boxed account. Both ends are optional and an empty one is
          open: an ordinary staff account leaves both blank, and an external
          assessor is the case the columns exist for.
        */}
        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="px-2 text-sm text-gray-500">
            ช่วงเวลาใช้งาน (เว้นว่างได้ ใช้กับบัญชีผู้ประเมินภายนอก)
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="เริ่มใช้งานได้">
              <input
                className={field}
                type="date"
                value={draft.valid_from}
                onChange={set('valid_from')}
              />
            </Field>
            <Field label="ใช้งานได้ถึง">
              <input
                className={field}
                type="date"
                value={draft.valid_until}
                onChange={set('valid_until')}
              />
            </Field>
          </div>
        </fieldset>

        {!editing && (
          <div className="grid gap-4 md:grid-cols-3">
            <GrantPicker
              grantable={grantable}
              value={{ role_id: draft.role_id, scope_id: draft.scope_id }}
              onChange={grant =>
                setDraft(current => ({ ...current, ...grant }))
              }
            />
            <Field
              label={
                needsPassword
                  ? 'รหัสผ่าน (บทบาทนี้ต้องกำหนด)'
                  : 'รหัสผ่าน (ถ้าไม่ได้เข้าผ่าน Google)'
              }
            >
              <input
                className={field}
                type="password"
                value={draft.password}
                onChange={set('password')}
                autoComplete="new-password"
                required={needsPassword}
              />
            </Field>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
          >
            บันทึก
          </button>
        </div>
      </form>
    </ContentMotionDIV>
  )
}

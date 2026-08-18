import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The form for adding a department and for editing one — #14.
 *
 * One component for both, as #11's does, because the fields are the same and a
 * second copy is a second place for a rule to be forgotten. Two things differ
 * and both are stated where they happen.
 *
 * The identifier cannot change once it exists. `05` is what the university
 * calls Computer Engineering (ADR-0001, tier one) and four tables reference it,
 * so changing it is a migration rather than an edit; the server refuses to read
 * it on an edit and the field is disabled here to say so before the person
 * types.
 *
 * There is no faculty field. A faculty administrator's faculty is derived from
 * their acting grant server-side and a body naming another one is refused
 * (ADR-0002), so a field for it would be a field whose only possible use is to
 * be rejected.
 *
 * Switching a department off is how one is retired when programmes, subjects
 * and graded work still point at it - which is what the server offers in place
 * of a deletion it will not allow.
 */

const EMPTY = {
  department_id: '',
  department_name_th: '',
  department_name_en: '',
  is_active: true,
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

export default function DepartmentForm({ value, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const editing = Boolean(value?.department_id)

  useEffect(() => {
    setDraft({ ...EMPTY, ...value })
  }, [value])

  const set = key => event =>
    setDraft(current => ({ ...current, [key]: event.target.value }))

  const submit = event => {
    event.preventDefault()
    onSave({
      // Sent on an edit as well, and ignored there: the server reads the
      // identifier from the path, so the two cannot disagree.
      department_id: draft.department_id.trim(),
      department_name_th: draft.department_name_th.trim(),
      department_name_en: draft.department_name_en.trim(),
      is_active: draft.is_active,
    })
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไขภาควิชา' : 'เพิ่มภาควิชา'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="รหัสภาควิชา">
            <input
              className={field}
              value={draft.department_id}
              onChange={set('department_id')}
              disabled={editing}
              maxLength={10}
              required
            />
          </Field>
          <Field label="ชื่อภาควิชา (ไทย)">
            <input
              className={field}
              value={draft.department_name_th}
              onChange={set('department_name_th')}
              maxLength={200}
              required
            />
          </Field>
          <Field label="ชื่อภาควิชา (อังกฤษ)">
            <input
              className={field}
              value={draft.department_name_en ?? ''}
              onChange={set('department_name_en')}
              maxLength={200}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={event =>
              setDraft(current => ({
                ...current,
                is_active: event.target.checked,
              }))
            }
          />
          เปิดใช้งาน
        </label>

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

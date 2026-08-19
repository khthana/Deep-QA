import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The form for adding a programme and for editing one — #15.
 *
 * One component for both, as #11's and #14's are, because the fields are the
 * same and a second copy is a second place for a rule to be forgotten.
 *
 * The identifier cannot change once it exists. `0501` is what the university
 * calls the Computer Engineering programme (ADR-0001, tier one) and five tables
 * reference it, so changing it is a migration rather than an edit; the server
 * refuses to read it on an edit and the field is disabled here to say so before
 * the person types.
 *
 * The department *is* a field, unlike #14's faculty, and it is a picker rather
 * than a box: what it offers is drawn from the list the server said this
 * account reaches, so the form cannot be made to name a department the save
 * would then be refused for.
 *
 * A retired department is offered only when it is the one this programme is
 * already filed under, and disabled there. That is the fourth criterion read
 * for the department - switched off "stops appearing in selection lists" - and
 * the exception is the reason retiring a department does not freeze every
 * programme beneath it: the person can still fix a name, or move the programme
 * out, without the picker being empty and the save impossible.
 *
 * Switching a programme off is how one is retired when PLOs, Program Subjects,
 * students and graded work still point at it - and is also what the server does
 * by itself when a deletion is asked for and something depends on the record.
 * The box is on the edit form only; a programme being added is being offered.
 *
 * Every field is sent on every save, blank ones included, because the server
 * reads a PUT as a replacement: an emptied year is an intentionally emptied
 * year, and the form is the thing that knows the person emptied it.
 */

const EMPTY = {
  program_id: '',
  program_name_th: '',
  program_name_en: '',
  department_id: '',
  year: '',
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

export default function ProgramForm({ value, departments, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const editing = Boolean(value?.program_id)

  // The one department there is to file under, when there is only one. Retired
  // ones do not count: auto-picking one would put the form in a state the
  // server refuses before the person has touched anything.
  const usable = departments.filter(department => department.is_active !== false)
  const onlyOne = usable.length === 1 ? usable[0] : null

  useEffect(() => {
    setDraft(current => ({
      ...EMPTY,
      // A department to start on, so adding one to a faculty with a single
      // department is not a choice the person has to make by hand.
      department_id: onlyOne ? onlyOne.department_id : current.department_id,
      ...value,
    }))
  }, [value, onlyOne])

  const set = key => event => setDraft(current => ({ ...current, [key]: event.target.value }))

  // The retired department this programme already sits in is kept in the list
  // so the picker can show where it lives; every other retired one is left out,
  // because nothing may be filed under it.
  const offered = departments.filter(
    department => department.is_active !== false || department.department_id === draft.department_id,
  )

  const submit = event => {
    event.preventDefault()
    onSave({
      // Sent on an edit as well, and ignored there: the server reads the
      // identifier from the path, so the two cannot disagree.
      program_id: draft.program_id.trim(),
      program_name_th: draft.program_name_th.trim(),
      program_name_en: draft.program_name_en.trim(),
      department_id: draft.department_id,
      year: draft.year.trim(),
      is_active: draft.is_active,
    })
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไขหลักสูตร' : 'เพิ่มหลักสูตร'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="รหัสหลักสูตร">
            <input
              className={field}
              value={draft.program_id}
              onChange={set('program_id')}
              disabled={editing}
              maxLength={10}
              required
            />
          </Field>
          <Field label="ภาควิชา">
            <select
              className={field}
              value={draft.department_id}
              onChange={set('department_id')}
              required
            >
              <option value="">เลือกภาควิชา</option>
              {offered.map(department => (
                <option
                  key={department.department_id}
                  value={department.department_id}
                  disabled={department.is_active === false}
                >
                  {department.department_id} {department.department_name_th}
                  {department.is_active === false && ' (ปิดใช้งาน)'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ชื่อหลักสูตร (ไทย)">
            <input
              className={field}
              value={draft.program_name_th}
              onChange={set('program_name_th')}
              maxLength={200}
              required
            />
          </Field>
          <Field label="ชื่อหลักสูตร (อังกฤษ)">
            <input
              className={field}
              value={draft.program_name_en ?? ''}
              onChange={set('program_name_en')}
              maxLength={200}
            />
          </Field>
          <Field label="ปีหลักสูตร (พ.ศ.)">
            <input
              className={field}
              value={draft.year ?? ''}
              onChange={set('year')}
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              placeholder="2564"
            />
          </Field>
        </div>

        {/* Only on an edit: a programme is created because it is being offered,
            and the server does not read the field on a creation either. */}
        {editing && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={event =>
                setDraft(current => ({ ...current, is_active: event.target.checked }))
              }
            />
            เปิดใช้งาน
          </label>
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

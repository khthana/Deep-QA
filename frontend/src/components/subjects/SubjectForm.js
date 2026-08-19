import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The form for adding a subject and for editing one — #16.
 *
 * One component for both, as #11's, #14's and #15's are, because the fields are
 * the same and a second copy is a second place for a rule to be forgotten.
 *
 * The code cannot change once it exists. `01076105` is what the registrar, the
 * transcript and every other system call this subject (ADR-0001, tier one), and
 * รายวิชาในหลักสูตร and the Offerings beneath it reference it — so changing it
 * is a migration rather than an edit. The server refuses to read it on an edit
 * and the field is disabled here to say so before the person types. Eight
 * characters wide, which is both the column and a real subject code.
 *
 * Both names are required, unlike a programme's: the columns say so and the
 * ticket asks for a subject with "both names". The two descriptions are the
 * optional pair instead, and they are paragraphs rather than lines, so they are
 * textareas with no length cap.
 *
 * Credits are a whole number. The box is numeric and required, because a blank
 * one would reach a NOT NULL column and come back as a system error rather than
 * as "you left this out".
 *
 * A retired department is offered only when it is the one this subject is
 * already filed under, and disabled there — the same rule #15's form applies,
 * and the reason retiring a department does not freeze the catalogue beneath
 * it.
 *
 * Every field is sent on every save, blank ones included, because the server
 * reads a PUT as a replacement: an emptied description is an intentionally
 * emptied description, and the form is the thing that knows the person emptied
 * it.
 */

const EMPTY = {
  subject_id: '',
  subject_name_th: '',
  subject_name_en: '',
  credits: '',
  description_th: '',
  description_en: '',
  department_id: '',
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

export default function SubjectForm({ value, departments, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const editing = Boolean(value?.subject_id)

  // The one department there is to file under, when there is only one. Retired
  // ones do not count: auto-picking one would put the form in a state the
  // server refuses before the person has touched anything.
  const usable = departments.filter(department => department.is_active !== false)
  const onlyOne = usable.length === 1 ? usable[0] : null

  useEffect(() => {
    setDraft(current => ({
      ...EMPTY,
      // A department to start on, so adding a subject in a faculty with a
      // single department is not a choice the person has to make by hand.
      department_id: onlyOne ? onlyOne.department_id : current.department_id,
      ...value,
      // The server answers with a number and the boxes hold text.
      credits: value?.credits === undefined || value?.credits === null ? '' : String(value.credits),
    }))
  }, [value, onlyOne])

  const set = key => event => setDraft(current => ({ ...current, [key]: event.target.value }))

  // The retired department this subject already sits in is kept in the list so
  // the picker can show where it lives; every other retired one is left out,
  // because nothing may be filed under it.
  const offered = departments.filter(
    department => department.is_active !== false || department.department_id === draft.department_id,
  )

  const submit = event => {
    event.preventDefault()
    onSave({
      // Sent on an edit as well, and ignored there: the server reads the code
      // from the path, so the two cannot disagree.
      subject_id: draft.subject_id.trim(),
      subject_name_th: draft.subject_name_th.trim(),
      subject_name_en: draft.subject_name_en.trim(),
      credits: draft.credits.trim(),
      description_th: draft.description_th?.trim() ?? '',
      description_en: draft.description_en?.trim() ?? '',
      department_id: draft.department_id,
      is_active: draft.is_active,
    })
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไขรายวิชา' : 'เพิ่มรายวิชา'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="รหัสวิชา">
            <input
              className={field}
              value={draft.subject_id}
              onChange={set('subject_id')}
              disabled={editing}
              maxLength={8}
              placeholder="01076105"
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
          <Field label="ชื่อวิชา (ไทย)">
            <input
              className={field}
              value={draft.subject_name_th}
              onChange={set('subject_name_th')}
              maxLength={200}
              required
            />
          </Field>
          <Field label="ชื่อวิชา (อังกฤษ)">
            <input
              className={field}
              value={draft.subject_name_en}
              onChange={set('subject_name_en')}
              maxLength={200}
              required
            />
          </Field>
          <Field label="หน่วยกิต">
            <input
              className={field}
              value={draft.credits}
              onChange={set('credits')}
              inputMode="numeric"
              pattern="\d{1,2}"
              maxLength={2}
              placeholder="3"
              required
            />
          </Field>
        </div>

        <Field label="คำอธิบายรายวิชา (ไทย)">
          <textarea
            className={field}
            value={draft.description_th ?? ''}
            onChange={set('description_th')}
            rows={3}
          />
        </Field>
        <Field label="คำอธิบายรายวิชา (อังกฤษ)">
          <textarea
            className={field}
            value={draft.description_en ?? ''}
            onChange={set('description_en')}
            rows={3}
          />
        </Field>

        {/* Only on an edit: a subject is added to the catalogue because it is
            being taught, and the server does not read the field on a creation
            either. */}
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

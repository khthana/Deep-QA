import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The one form, used for adding and for editing — #27's first criterion.
 *
 * One form rather than two because the fields are the same five and the only
 * difference is what is in them when it opens. Two would be two places to add
 * the sixth field to, and one of them would be forgotten.
 *
 * ## The PLO picker offers what it was given and nothing else
 *
 * The second criterion. `plos` arrives already narrowed by the server to the
 * ผลการเรียนรู้ของหลักสูตร that this รายวิชา's coverage grid carries, and this
 * component does no filtering of its own — a `<select>` that filtered would be
 * a second copy of a rule that lives on the server, and the copy that drifts is
 * always the one nobody is testing.
 *
 * The empty option is real and is not a placeholder. A CLO may be written
 * before anyone has settled which PLO it serves, and a form that insisted would
 * refuse a half-finished thought; ยังไม่ระบุ is what that state is called.
 *
 * ## Why the code is not generated
 *
 * CLO-1..CLO-9 look like a sequence and are not one: the sixth criterion makes
 * the code unique within the ปีการศึกษา, and a หลักสูตร that renumbers, splits
 * or retires an outcome mid-year needs to be able to say CLO-3ก. The field is
 * text, the person types it, and the server refuses a clash.
 */
export default function CloForm({ clo, plos, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)

  useEffect(() => {
    setDraft(clo ? read(clo) : EMPTY)
  }, [clo])

  const set = (field, value) => setDraft(current => ({ ...current, [field]: value }))
  const complete = draft.clo_number.trim() && draft.clo_detail.trim()

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-primary">
        {clo ? `แก้ไข ${clo.clo_number}` : 'เพิ่มผลการเรียนรู้รายวิชา'}
      </h2>

      <form
        onSubmit={event => {
          event.preventDefault()
          onSubmit({
            clo_number: draft.clo_number.trim(),
            clo_detail: draft.clo_detail.trim(),
            teaching_method: draft.teaching_method.trim(),
            assessment_method: draft.assessment_method.trim(),
            plo_id: draft.plo_id === '' ? null : Number(draft.plo_id),
          })
        }}
        className="mt-4 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">รหัส</span>
            <input
              value={draft.clo_number}
              onChange={event => set('clo_number', event.target.value)}
              placeholder="เช่น CLO-1"
              maxLength={50}
              aria-label="รหัสผลการเรียนรู้"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm text-gray-500">
              ผลการเรียนรู้ของหลักสูตรที่รองรับ
            </span>
            <select
              value={draft.plo_id}
              onChange={event => set('plo_id', event.target.value)}
              aria-label="ผลการเรียนรู้ของหลักสูตรที่รองรับ"
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900"
            >
              <option value="">ยังไม่ระบุ</option>
              {plos.map(plo => (
                <option key={plo.outcome_id} value={plo.outcome_id}>
                  {plo.outcome_code} {plo.outcome_title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-500">รายละเอียด</span>
          <textarea
            value={draft.clo_detail}
            onChange={event => set('clo_detail', event.target.value)}
            rows={2}
            aria-label="รายละเอียดผลการเรียนรู้"
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">วิธีการสอน</span>
            <textarea
              value={draft.teaching_method}
              onChange={event => set('teaching_method', event.target.value)}
              rows={2}
              aria-label="วิธีการสอน"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">วิธีการวัดผล</span>
            <textarea
              value={draft.assessment_method}
              onChange={event => set('assessment_method', event.target.value)}
              rows={2}
              aria-label="วิธีการวัดผล"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={busy || !complete}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
          >
            บันทึก
          </button>
        </div>
      </form>
    </ContentMotionDIV>
  )
}

const EMPTY = {
  clo_number: '',
  clo_detail: '',
  teaching_method: '',
  assessment_method: '',
  plo_id: '',
}

/**
 * A CLO as the server sends it, in the shape the inputs need.
 *
 * Every field is coerced to a string, nulls included, because a `<textarea>`
 * given `null` becomes an uncontrolled input and React says so in the console
 * once and then never again — and `plo_id` is a number on the way in and the
 * `<select>`'s value is compared as a string.
 */
const read = clo => ({
  clo_number: clo.clo_number ?? '',
  clo_detail: clo.clo_detail ?? '',
  teaching_method: clo.teaching_method ?? '',
  assessment_method: clo.assessment_method ?? '',
  plo_id: clo.plo_id === null || clo.plo_id === undefined ? '' : String(clo.plo_id),
})

import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The one form, used for adding and for editing — as BehaviorForm is for #28.
 *
 * ## The band dropdown is the four permitted values and nothing else
 *
 * The ticket's third criterion. The four bands are a closed list — a CHECK in
 * the database, checked again by the route — so the options are a constant
 * here rather than a fetch. Unlike #28's enums there is no label table: the
 * stored values are the Thai words themselves, the rubric's own vocabulary,
 * so what goes over the wire is what the person reads.
 *
 * The blank option is a prompt, disabled once a choice exists, and บันทึก
 * stays off until the band and the detail are given. The description is the
 * one field allowed to stay empty — the column is nullable and the ticket
 * names it optional — so it never gates the button.
 *
 * ## No number field
 *
 * The sequence number is position and the server assigns it — the next free
 * number on add, closed up on delete. A form that offered the number would be
 * offering a field the server is going to ignore.
 */

/** The four bands of migration 0002's CHECK, best first. */
const ACHIEVEMENT_LEVELS = ['ดีเยี่ยม', 'ดี', 'พอใช้', 'ต้องปรับปรุง']

export default function CriterionForm({ criterion, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)

  useEffect(() => {
    setDraft(criterion ? read(criterion) : EMPTY)
  }, [criterion])

  const set = (field, value) =>
    setDraft(current => ({ ...current, [field]: value }))
  const complete = draft.achievement_level && draft.criteria_detail.trim()

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-primary">
        {criterion
          ? `แก้ไขเกณฑ์การบรรลุผลข้อ ${criterion.criteria_no}`
          : 'เพิ่มเกณฑ์การบรรลุผล'}
      </h2>

      <form
        onSubmit={event => {
          event.preventDefault()
          onSubmit({
            achievement_level: draft.achievement_level,
            criteria_detail: draft.criteria_detail.trim(),
            criteria_description: draft.criteria_description.trim(),
          })
        }}
        className="mt-4 space-y-4"
      >
        <label className="block sm:max-w-xs">
          <span className="mb-1 block text-sm text-gray-500">
            ระดับการบรรลุผล
          </span>
          <select
            value={draft.achievement_level}
            onChange={event => set('achievement_level', event.target.value)}
            aria-label="ระดับการบรรลุผล"
            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900"
          >
            <option value="" disabled>
              เลือกระดับ
            </option>
            {ACHIEVEMENT_LEVELS.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-500">
            เกณฑ์การประเมิน
          </span>
          <textarea
            value={draft.criteria_detail}
            onChange={event => set('criteria_detail', event.target.value)}
            rows={2}
            placeholder="สิ่งที่งานระดับนี้ต้องแสดงให้เห็น เช่น ทำได้ครบถ้วนถูกต้องและอธิบายเหตุผลได้"
            aria-label="เกณฑ์การประเมิน"
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-500">
            คำอธิบาย (ไม่บังคับ)
          </span>
          <textarea
            value={draft.criteria_description}
            onChange={event => set('criteria_description', event.target.value)}
            rows={2}
            placeholder="รายละเอียดเพิ่มเติมประกอบการตัดสิน"
            aria-label="คำอธิบาย"
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
          />
        </label>

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
  achievement_level: '',
  criteria_detail: '',
  criteria_description: '',
}

const read = criterion => ({
  achievement_level: criterion.achievement_level ?? '',
  criteria_detail: criterion.criteria_detail ?? '',
  criteria_description: criterion.criteria_description ?? '',
})

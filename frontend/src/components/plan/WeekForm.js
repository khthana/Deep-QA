import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The one form, used for adding and for editing — as BehaviorForm is for #28.
 *
 * ## The week number is a field here, and that is deliberate
 *
 * The CLO-family forms have no number field because their numbers are
 * position, assigned by the server. A plan's number is the week of the
 * semester the person means — deleting week 2 does not make week 3 into
 * week 2, and two topics may share a week — so the number is typed, and
 * editing it is how a topic moves. What the server checks is only the shape
 * (a positive integer), and its refusal sentence is shown as sent.
 *
 * ## Two fields are the row, two are prose
 *
 * สัปดาห์ที่ and หัวข้อ make the entry, so บันทึก stays off until both are
 * given. รายละเอียด and หมายเหตุ may be absent — a blank is sent as the
 * nothing it is (the route stores NULL, never ''), so the rows can draw the
 * paragraph only when there is one.
 */
export default function WeekForm({ week, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)

  useEffect(() => {
    setDraft(week ? read(week) : EMPTY)
  }, [week])

  const set = (field, value) => setDraft(current => ({ ...current, [field]: value }))
  const complete = draft.week_no.trim() && draft.title.trim()

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-primary">
        {week ? `แก้ไขสัปดาห์ที่ ${week.week_no}` : 'เพิ่มหัวข้อในแผนการสอน'}
      </h2>

      <form
        onSubmit={event => {
          event.preventDefault()
          onSubmit({
            week_no: draft.week_no.trim(),
            title: draft.title.trim(),
            description: draft.description.trim(),
            remark: draft.remark.trim(),
          })
        }}
        className="mt-4 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">สัปดาห์ที่</span>
            <input
              type="number"
              min="1"
              value={draft.week_no}
              onChange={event => set('week_no', event.target.value)}
              aria-label="สัปดาห์ที่"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">หัวข้อ</span>
            <input
              type="text"
              value={draft.title}
              onChange={event => set('title', event.target.value)}
              placeholder="เช่น แนะนำรายวิชาและแนวคิดเชิงวัตถุ"
              aria-label="หัวข้อ"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-500">รายละเอียด (ไม่บังคับ)</span>
          <textarea
            value={draft.description}
            onChange={event => set('description', event.target.value)}
            rows={2}
            aria-label="รายละเอียด"
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-500">หมายเหตุ (ไม่บังคับ)</span>
          <textarea
            value={draft.remark}
            onChange={event => set('remark', event.target.value)}
            rows={2}
            aria-label="หมายเหตุ"
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
  week_no: '',
  title: '',
  description: '',
  remark: '',
}

const read = week => ({
  week_no: String(week.week_no ?? ''),
  title: week.title ?? '',
  description: week.description ?? '',
  remark: week.remark ?? '',
})

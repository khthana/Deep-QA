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
 *
 * ## The four fields are closed while this form's own save is out
 *
 * #249, which is #228's answer of 26 ตุลาคม 2569 reaching this form:
 * `components/users/UserForm.js` carries the reasons for the fifteen files of
 * that population, and the measurement that is this form's own is the mount
 * point — `pages/TeachingPlan.js:191`, the only one on 30 ตุลาคม 2569, which is
 * what makes `sending` a claim about every place this is drawn (#220).
 *
 * This form is one of the five ผู้สอน card screens, whose ternary swaps the form
 * with the button that opens it and leaves the card list, and its pencils,
 * standing underneath. A pencil on another card therefore arrives **while this
 * card's save is out**, re-rendering this component instead of remounting it,
 * which is why the flag needs the way back in written at the effect the subject
 * keys (#227). The row that reads it as a claim is `249a`'s fifth, on
 * `clos/CloForm.js`; what holds it **here** is `149a` and `151a`, whose rows
 * for this screen were red the evening this landed and die at a `fill` rather
 * than at a claim (#139).
 */
export default function WeekForm({ week, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setDraft(week ? read(week) : EMPTY)
    // The way back in, for the one state `.finally` cannot reach: this form is
    // drawn above its list, so a pencil on another card arrives while this
    // card's save is still out and the component is re-rendered rather than
    // remounted (#220, #227). The subject changing is that arrival, so the flag
    // comes down with the draft it was raised over.
    setSending(false)
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
          setSending(true)
          onSubmit({
            week_no: draft.week_no.trim(),
            title: draft.title.trim(),
            description: draft.description.trim(),
            remark: draft.remark.trim(),
          }).finally(() => setSending(false))
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
              disabled={sending}
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
              disabled={sending}
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
            disabled={sending}
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
            disabled={sending}
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

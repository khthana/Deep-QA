import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import { COGNITIVE_LEVELS, LEARNING_ACTIVITIES } from './labels'

/**
 * The one form, used for adding and for editing — as CloForm is for #27.
 *
 * ## The two dropdowns are the permitted values and nothing else
 *
 * The ticket's third and fourth criteria. R064's six cognitive levels and
 * R063's four activity kinds are closed lists — enums in the database, checked
 * again by the route — so the options are a constant here rather than a fetch:
 * a list that cannot change per request has nothing to ask the server for. The
 * enum value goes over the wire; the Thai label is display copy and lives in
 * one place (`labels.js`), shared with the rows.
 *
 * Neither select offers an empty choice as a real state. A behaviour with no
 * cognitive level is not half-finished the way a CLO with no PLO is — the
 * column is NOT NULL and the level is half of what the record is for — so the
 * blank is a prompt, disabled once a choice exists, and บันทึก stays off until
 * all three fields are given.
 *
 * ## No number field
 *
 * The sequence number is position and the server assigns it — the next free
 * number on add, closed up on delete. A form that offered the number would be
 * offering a field the server is going to ignore.
 */
export default function BehaviorForm({ behavior, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)

  useEffect(() => {
    setDraft(behavior ? read(behavior) : EMPTY)
  }, [behavior])

  const set = (field, value) => setDraft(current => ({ ...current, [field]: value }))
  const complete =
    draft.behavior_detail.trim() && draft.cognitive_level && draft.learning_activity

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-primary">
        {behavior ? `แก้ไขพฤติกรรมบ่งชี้ข้อ ${behavior.behavior_no}` : 'เพิ่มพฤติกรรมบ่งชี้'}
      </h2>

      <form
        onSubmit={event => {
          event.preventDefault()
          onSubmit({
            behavior_detail: draft.behavior_detail.trim(),
            cognitive_level: draft.cognitive_level,
            learning_activity: draft.learning_activity,
          })
        }}
        className="mt-4 space-y-4"
      >
        <label className="block">
          <span className="mb-1 block text-sm text-gray-500">รายละเอียดพฤติกรรม</span>
          <textarea
            value={draft.behavior_detail}
            onChange={event => set('behavior_detail', event.target.value)}
            rows={2}
            placeholder="สิ่งที่นักศึกษาทำให้เห็นได้ เช่น เขียนโปรแกรมจัดการข้อยกเว้นได้ถูกต้อง"
            aria-label="รายละเอียดพฤติกรรม"
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">ระดับพุทธิพิสัย</span>
            <select
              value={draft.cognitive_level}
              onChange={event => set('cognitive_level', event.target.value)}
              aria-label="ระดับพุทธิพิสัย"
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900"
            >
              <option value="" disabled>
                เลือกระดับ
              </option>
              {COGNITIVE_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">กิจกรรมการเรียนรู้</span>
            <select
              value={draft.learning_activity}
              onChange={event => set('learning_activity', event.target.value)}
              aria-label="กิจกรรมการเรียนรู้"
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900"
            >
              <option value="" disabled>
                เลือกประเภท
              </option>
              {LEARNING_ACTIVITIES.map(activity => (
                <option key={activity.value} value={activity.value}>
                  {activity.label}
                </option>
              ))}
            </select>
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
  behavior_detail: '',
  cognitive_level: '',
  learning_activity: '',
}

const read = behavior => ({
  behavior_detail: behavior.behavior_detail ?? '',
  cognitive_level: behavior.cognitive_level ?? '',
  learning_activity: behavior.learning_activity ?? '',
})

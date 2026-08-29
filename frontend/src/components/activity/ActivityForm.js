import { useEffect, useState } from 'react'
import { HiOutlineTrash } from 'react-icons/hi2'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The one form, used for adding and for editing — as WeekForm is for #31.
 *
 * ## Two halves, and the second one is the ticket
 *
 * Above the rule is the piece of work: what it is called, whether it is done
 * alone or in a group, what it is out of, when it is announced and due, which
 * week of the plan it belongs to and which หมวดคะแนน it counts towards. Below
 * the rule is the attribution — one row per CLO with the share of the mark
 * that CLO accounts for — and that half is why the ticket exists. An Activity
 * with no rows is legal and saveable; it simply contributes to no outcome, and
 * the form says so where the rows would be.
 *
 * ## The pickers offer what the server will accept, and nothing else
 *
 * The categories and the CLOs are the Offering's, the weeks are this
 * Section's, and all three arrive in the same request the list does. A CLO
 * already used by another row is not offered again, which is the fifth
 * criterion made unreachable rather than merely refused — the server still
 * refuses it, because a screen is not an authority.
 *
 * ## The total is shown, not enforced
 *
 * Weights are a percentage of this Activity's mark, so the running total is
 * drawn beside the rows the way #30 draws its hundred: over a hundred the save
 * is refused (by the server, in its own words), under a hundred it is a
 * half-finished attribution somebody may come back to. Each row also shows the
 * mark it works out to, because that number — not the percentage — is what
 * #34 will enter marks against.
 */
export default function ActivityForm({ activity, categories, clos, weeks, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)

  useEffect(() => {
    setDraft(activity ? read(activity) : EMPTY)
  }, [activity])

  const set = (field, value) => setDraft(current => ({ ...current, [field]: value }))

  const setRow = (index, field, value) =>
    setDraft(current => ({
      ...current,
      clo_rows: current.clo_rows.map((row, at) => (at === index ? { ...row, [field]: value } : row)),
    }))

  const addRow = () =>
    setDraft(current => ({
      ...current,
      clo_rows: [...current.clo_rows, { clo_id: String(unusedClo(clos, current.clo_rows) ?? ''), weight: '' }],
    }))

  const dropRow = index =>
    setDraft(current => ({
      ...current,
      clo_rows: current.clo_rows.filter((row, at) => at !== index),
    }))

  const mark = Number(draft.score_number)
  const total = draft.clo_rows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0)
  const complete = draft.activity_name.trim() && draft.score_number.trim() !== ''

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-primary">
        {activity ? `แก้ไข ${activity.activity_name}` : 'เพิ่มกิจกรรมการเรียนรู้'}
      </h2>

      <form
        onSubmit={event => {
          event.preventDefault()
          onSubmit({
            activity_name: draft.activity_name.trim(),
            activity_type: draft.activity_type,
            score_number: draft.score_number.trim(),
            announcement_date: draft.announcement_date || null,
            deadline_date: draft.deadline_date || null,
            course_syllabus_id: draft.course_syllabus_id === '' ? null : Number(draft.course_syllabus_id),
            score_ratio_id: draft.score_ratio_id === '' ? null : Number(draft.score_ratio_id),
            clo_rows: draft.clo_rows
              .filter(row => row.clo_id !== '')
              .map(row => ({ clo_id: Number(row.clo_id), weight: row.weight === '' ? 0 : Number(row.weight) })),
          })
        }}
        className="mt-4 space-y-4"
      >
        <label className="block">
          <span className="mb-1 block text-sm text-gray-500">ชื่อกิจกรรม</span>
          <input
            type="text"
            value={draft.activity_name}
            onChange={event => set('activity_name', event.target.value)}
            placeholder="เช่น โครงงานย่อยที่ 1 — คลาสและอ็อบเจกต์"
            aria-label="ชื่อกิจกรรม"
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">ประเภท</span>
            <select
              value={draft.activity_type}
              onChange={event => set('activity_type', event.target.value)}
              aria-label="ประเภท"
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900"
            >
              <option value="individual">งานเดี่ยว</option>
              <option value="group">งานกลุ่ม</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">คะแนนเต็ม</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.score_number}
              onChange={event => set('score_number', event.target.value)}
              aria-label="คะแนนเต็ม"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">หมวดคะแนน</span>
            <select
              value={draft.score_ratio_id}
              onChange={event => set('score_ratio_id', event.target.value)}
              aria-label="หมวดคะแนน"
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900"
            >
              <option value="">ยังไม่ระบุ</option>
              {categories.map(category => (
                <option key={category.score_ratio_id} value={category.score_ratio_id}>
                  {category.score_category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">วันที่ประกาศ (ไม่บังคับ)</span>
            <input
              type="date"
              value={draft.announcement_date}
              onChange={event => set('announcement_date', event.target.value)}
              aria-label="วันที่ประกาศ"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">กำหนดส่ง (ไม่บังคับ)</span>
            <input
              type="date"
              value={draft.deadline_date}
              onChange={event => set('deadline_date', event.target.value)}
              aria-label="กำหนดส่ง"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">สัปดาห์ในแผนการสอน (ไม่บังคับ)</span>
            <select
              value={draft.course_syllabus_id}
              onChange={event => set('course_syllabus_id', event.target.value)}
              aria-label="สัปดาห์ในแผนการสอน"
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900"
            >
              <option value="">ไม่ระบุสัปดาห์</option>
              {weeks.map(week => (
                <option key={week.id} value={week.id}>
                  สัปดาห์ที่ {week.week_no} · {week.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section aria-label="ความเชื่อมโยงกับผลการเรียนรู้" className="border-t border-gray-200 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-600">ความเชื่อมโยงกับผลการเรียนรู้</h3>
            <p className="text-sm text-slate-400">
              รวมน้ำหนัก <span className={total > 100 ? 'font-medium text-red-600' : 'font-medium text-slate-600'}>{total}</span> / 100
            </p>
          </div>

          {draft.clo_rows.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-slate-400">
              ยังไม่ได้เชื่อมโยงผลการเรียนรู้ กิจกรรมนี้จะไม่ถูกนับในผลลัพธ์การเรียนรู้ข้อใดเลย
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {draft.clo_rows.map((row, index) => (
                <li key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_6rem_auto] sm:items-center">
                  <select
                    value={row.clo_id}
                    onChange={event => setRow(index, 'clo_id', event.target.value)}
                    aria-label={`ผลการเรียนรู้แถวที่ ${index + 1}`}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900"
                  >
                    <option value="">เลือกผลการเรียนรู้</option>
                    {clos
                      .filter(clo => clo.clo_id === Number(row.clo_id) || !taken(draft.clo_rows, index, clo.clo_id))
                      .map(clo => (
                        <option key={clo.clo_id} value={clo.clo_id}>
                          {clo.clo_number} · {clo.clo_detail}
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={row.weight}
                    onChange={event => setRow(index, 'weight', event.target.value)}
                    aria-label={`น้ำหนักแถวที่ ${index + 1}`}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
                  />

                  {/* What the percentage is worth in marks — the number #34
                      enters against, and the reason the share is a percentage
                      here rather than a mark typed twice. */}
                  <p className="text-sm text-slate-400">
                    {Number.isFinite(mark) && row.weight !== ''
                      ? `${Math.round(mark * Number(row.weight)) / 100} คะแนน`
                      : '—'}
                  </p>

                  <button
                    type="button"
                    onClick={() => dropRow(index)}
                    aria-label={`นำผลการเรียนรู้แถวที่ ${index + 1} ออก`}
                    className="justify-self-start rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <HiOutlineTrash className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={addRow}
            disabled={draft.clo_rows.length >= clos.length}
            className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            เพิ่มผลการเรียนรู้
          </button>
        </section>

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
  activity_name: '',
  activity_type: 'individual',
  score_number: '',
  announcement_date: '',
  deadline_date: '',
  course_syllabus_id: '',
  score_ratio_id: '',
  clo_rows: [],
}

/** timestamptz on the wire, `yyyy-mm-dd` in the field. */
const dateField = value => (value ? String(value).slice(0, 10) : '')

/** The sixth criterion: an edit opens on what is there, rows and all. */
const read = activity => ({
  activity_name: activity.activity_name ?? '',
  activity_type: activity.activity_type ?? 'individual',
  score_number: String(Number(activity.score_number ?? 0)),
  announcement_date: dateField(activity.announcement_date),
  deadline_date: dateField(activity.deadline_date),
  course_syllabus_id: activity.course_syllabus_id === null ? '' : String(activity.course_syllabus_id),
  score_ratio_id: activity.score_ratio_id === null ? '' : String(activity.score_ratio_id),
  clo_rows: (activity.clo_rows ?? []).map(row => ({
    clo_id: String(row.clo_id ?? ''),
    weight: String(row.weight ?? ''),
  })),
})

/** Is this CLO already spoken for by a row other than this one? */
const taken = (rows, index, cloId) =>
  rows.some((row, at) => at !== index && Number(row.clo_id) === cloId)

/** The first CLO no row holds, so a new row opens on something usable. */
const unusedClo = (clos, rows) =>
  clos.find(clo => !rows.some(row => Number(row.clo_id) === clo.clo_id))?.clo_id

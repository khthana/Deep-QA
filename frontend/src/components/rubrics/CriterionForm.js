import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The form for writing a criterion down and for changing one — #22.
 *
 * One component for both, as every other form on this system is. Three things
 * about it are decisions.
 *
 * *All four bands are asked for, and none of them is optional.* The columns
 * behind them are nullable `text`, so nothing below this form would refuse a
 * criterion that describes only excellence — the server does, on purpose, and
 * so does this. A half-written band is worse than an empty rubric: it looks
 * like guidance and gives none, and the marker fills the gap with the judgement
 * the rubric exists to remove.
 *
 * *The bands are labelled with what they mean, not just with their number.*
 * ๔ ดีเยี่ยม, ๓ ดีมาก, ๒ ปานกลาง, ๑ ต้องปรับปรุง — the words the inherited
 * screen used, kept because the people who will read them have been reading
 * them. A column headed only "4" leaves the writer deciding privately whether
 * high is good.
 *
 * *น้ำหนัก is a number with two decimal places and no more.* The column is
 * `numeric(5,2)`; a third decimal is not refused by PostgreSQL but rounded
 * silently, so the server refuses it and `step` says so before the person gets
 * that far.
 */

const EMPTY = {
  criteria_name_th: '',
  criteria_name_en: '',
  weight: 1,
  display_order: 1,
  level_4_description: '',
  level_3_description: '',
  level_2_description: '',
  level_1_description: '',
}

/** Highest band first, which is how a marker reads down a rubric. */
export const BANDS = [
  { key: 'level_4_description', label: '4 — ดีเยี่ยม' },
  { key: 'level_3_description', label: '3 — ดีมาก' },
  { key: 'level_2_description', label: '2 — ปานกลาง' },
  { key: 'level_1_description', label: '1 — ต้องปรับปรุง' },
]

const field =
  'block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
const labelling = 'mb-1 block text-sm text-gray-500'

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className={labelling}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export default function CriterionForm({ value, rubric, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const editing = Boolean(value?.id)

  useEffect(() => {
    setDraft({ ...EMPTY, ...value })
  }, [value])

  const set = name => event => setDraft(current => ({ ...current, [name]: event.target.value }))

  const submit = event => {
    event.preventDefault()
    onSave({
      criteria_name_th: draft.criteria_name_th,
      criteria_name_en: draft.criteria_name_en,
      weight: draft.weight,
      display_order: draft.display_order,
      level_4_description: draft.level_4_description,
      level_3_description: draft.level_3_description,
      level_2_description: draft.level_2_description,
      level_1_description: draft.level_1_description,
    })
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-medium text-primary">
        {editing ? 'แก้ไขเกณฑ์การให้คะแนน' : 'เพิ่มเกณฑ์การให้คะแนน'}
      </h2>
      {/* Which rubric this criterion is being written into. The form is opened
          from that rubric's own page, but a person who has scrolled to the
          bottom of a long form no longer has the heading in view. */}
      <p className="mb-4 text-sm text-slate-500">
        ใน Rubric {rubric?.rubric_code} {rubric?.rubric_name_th}
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ชื่อเกณฑ์ (ภาษาไทย)">
            <input
              className={field}
              value={draft.criteria_name_th}
              onChange={set('criteria_name_th')}
              placeholder="เช่น ความถูกต้องของเนื้อหา"
              maxLength={255}
              disabled={busy}
              required
            />
          </Field>

          <Field label="ชื่อเกณฑ์ (ภาษาอังกฤษ)" hint="ใช้ในเอกสารประกอบการประเมินหลักสูตร">
            <input
              className={field}
              value={draft.criteria_name_en}
              onChange={set('criteria_name_en')}
              placeholder="เช่น Accuracy of content"
              maxLength={255}
              disabled={busy}
              required
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="น้ำหนัก" hint="มากกว่า 0 และไม่เกิน 999.99 ทศนิยมไม่เกินสองตำแหน่ง">
            <input
              className={field}
              type="number"
              value={draft.weight}
              onChange={set('weight')}
              step="0.01"
              min="0.01"
              max="999.99"
              disabled={busy}
              required
            />
          </Field>

          <Field label="ลำดับการแสดงผล" hint="เรียงจากน้อยไปมาก ลำดับเท่ากันจะเรียงตามลำดับที่เพิ่ม">
            <input
              className={field}
              type="number"
              value={draft.display_order}
              onChange={set('display_order')}
              step={1}
              min={0}
              disabled={busy}
              required
            />
          </Field>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            คำอธิบายทั้งสี่ระดับต้องกรอกให้ครบ ผู้ตรวจใช้ข้อความเหล่านี้ในการแยกงานแต่ละระดับออกจากกัน
          </p>
          {BANDS.map(band => (
            <Field key={band.key} label={`ระดับ ${band.label}`}>
              <textarea
                className={field}
                value={draft[band.key]}
                onChange={set(band.key)}
                rows={2}
                placeholder="อธิบายลักษณะงานที่อยู่ในระดับนี้"
                disabled={busy}
                required
              />
            </Field>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
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

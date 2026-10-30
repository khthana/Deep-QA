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
 *
 * ## The three fields are closed while this form's own save is out
 *
 * #249, which is #228's answer of 26 ตุลาคม 2569 reaching this form:
 * `components/users/UserForm.js` carries the reasons for the fifteen files of
 * that population, and the measurement that is this form's own is the mount
 * point — `pages/AchievementCriteria.js:209`, the only one on 30 ตุลาคม 2569,
 * which is what makes `sending` a claim about every place this is drawn (#220).
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
 * `components/rubrics/CriterionForm.js` is a different component with the same
 * name and had its own flag from #242.
 */

/** The four bands of migration 0002's CHECK, best first. */
const ACHIEVEMENT_LEVELS = ['ดีเยี่ยม', 'ดี', 'พอใช้', 'ต้องปรับปรุง']

export default function CriterionForm({ criterion, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setDraft(criterion ? read(criterion) : EMPTY)
    // The way back in, for the one state `.finally` cannot reach: this form is
    // drawn above its list, so a pencil on another card arrives while this
    // card's save is still out and the component is re-rendered rather than
    // remounted (#220, #227). The subject changing is that arrival, so the flag
    // comes down with the draft it was raised over.
    setSending(false)
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
          setSending(true)
          onSubmit({
            achievement_level: draft.achievement_level,
            criteria_detail: draft.criteria_detail.trim(),
            criteria_description: draft.criteria_description.trim(),
          }).finally(() => setSending(false))
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
            disabled={sending}
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
            disabled={sending}
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
            disabled={sending}
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

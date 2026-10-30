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
 * or retires an outcome mid-year needs to be able to leave a gap, or to reuse a
 * number an earlier year has already spent. The field is text, the person types
 * it, and the server refuses a clash.
 *
 * ## What this paragraph used to claim, and why it was wrong
 *
 * It justified the free text with `CLO-3ก` — a code with a Thai letter on the
 * end. The owner settled it on 7 September 2569: **the codes carry no letters,
 * they are numbers only.** Nobody had asked, and
 * [#96](https://github.com/khthana/Deep-QA/issues/96) sat open for fifteen days
 * behind that unasked question, because ordering codes correctly was held to
 * depend on deciding where `CLO-3ก` sorts.
 *
 * The answer is why `backend/lib/cloOrder.js` can sort on the digits at all.
 * Its text fallback stays: the column is `varchar(50)` and a person types into
 * it, so a code with no digits in it is still reachable by a typing mistake and
 * has to land somewhere defined. **The fallback is a safety net now, not the
 * case the rule was written for.**
 *
 * ## The five fields are closed while this form's own save is out
 *
 * #249, which is #228's answer of 26 ตุลาคม 2569 reaching this form:
 * `components/users/UserForm.js` carries the reasons for the fifteen files of
 * that population, and the measurement that is this form's own is the mount
 * point — `pages/CourseOutcomes.js:229`, the only one on 30 ตุลาคม 2569, which
 * is what makes `sending` a claim about every place this is drawn (#220).
 *
 * This form is one of the five ผู้สอน card screens, whose ternary swaps the form
 * with the button that opens it and leaves the card list, and its pencils,
 * standing underneath. A pencil on another card therefore arrives **while this
 * card's save is out**, re-rendering this component instead of remounting it,
 * which is why the flag needs the way back in written at the effect the subject
 * keys (#227). `249a`'s fifth row reads that here - the mutant is
 * `249:cloflagstuck` - and the other four of the five are held by the ten rows
 * of `149a` and `151a` that were red the evening this landed.
 */
export default function CloForm({ clo, plos, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setDraft(clo ? read(clo) : EMPTY)
    // The way back in, for the one state `.finally` cannot reach: this form is
    // drawn above its list, so a pencil on another card arrives while this
    // card's save is still out and the component is re-rendered rather than
    // remounted (#220, #227). The subject changing is that arrival, so the flag
    // comes down with the draft it was raised over.
    setSending(false)
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
          setSending(true)
          onSubmit({
            clo_number: draft.clo_number.trim(),
            clo_detail: draft.clo_detail.trim(),
            teaching_method: draft.teaching_method.trim(),
            assessment_method: draft.assessment_method.trim(),
            plo_id: draft.plo_id === '' ? null : Number(draft.plo_id),
          }).finally(() => setSending(false))
        }}
        className="mt-4 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-500">รหัส</span>
            <input
              value={draft.clo_number}
              onChange={event => set('clo_number', event.target.value)}
              disabled={sending}
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
              disabled={sending}
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
            disabled={sending}
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
              disabled={sending}
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
              disabled={sending}
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

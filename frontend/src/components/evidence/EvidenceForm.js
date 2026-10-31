import { useState } from 'react'

/**
 * One evidence file, being attached or corrected.
 *
 * The five kinds come from the server with the shelf rather than being listed
 * here, which is `activities.js`' rule about a picker and a validator that must
 * not be able to disagree: the set this offers is the set the save is checked
 * against, and there is no second copy to drift.
 *
 * ## The file input's `accept` is a courtesy, not the check
 *
 * `accept=".pdf"` filters what the file chooser shows and nothing else — a
 * person can still pick anything, and a request need not come from this screen
 * at all. BR-15 is enforced on the bytes at the server, which is the whole
 * point of #35: what was delivered enforced it in neither place, and putting it
 * only here would move the defect rather than fix it. The sentence under the
 * input says what will be accepted so that a refusal is not a surprise.
 *
 * ## Editing without replacing
 *
 * When a row is being corrected the file is optional: the type and the
 * description are saved on their own, and the name of the file already there is
 * shown so a person can see what they are keeping.
 *
 * ## The three fields are closed while this form's own save is out
 *
 * #249, which is #228's answer of 26 ตุลาคม 2569 reaching this form:
 * `components/users/UserForm.js` carries the reasons. The mount point is
 * `pages/ActivityEvidence.js:221`, the only one on 30 ตุลาคม 2569 (#220), and
 * what is this form's own is that **the flag needs no second way down**: the
 * mount is keyed on the file (the paragraph below), so another file's pencil
 * builds a new form with `sending` false - which is what keeps `146a` and
 * `149a` typing into the second file's box while the first file's save is
 * still out.
 *
 * ## ยกเลิก holds nothing - #253, 31 ตุลาคม 2569
 *
 * It held `busy`, the page's flag. That it should hold nothing is the other
 * half of #228's answer of 26 ตุลาคม 2569, and the half #249 left in its own
 * prose instead of in the tracker, which is the thing the rule it cited
 * forbids (#119).
 *
 * The number that deferral carried - *four* - was `202a`'s, and `202a`'s four
 * were `Plos`, `Rubrics`, `RubricCriteria` and `ProgramSubjects`, freed by
 * #242 on 28 ตุลาคม 2569, two days before the paragraph naming them was
 * written. What replaced it is a census by the **mechanism** rather than by
 * the word *screen* (#174) - `frontend/scripts/save-window-fields.js`' third
 * question, *which button that hands the form back holds a flag while the
 * form's own save is out*. Measured on 31 ตุลาคม 2569 over the 27 forms that
 * send something: **two**, this one and `components/ProfilePhotoDialog.js`,
 * and neither of them one of the four.
 *
 * What freeing it costs is a way in: a save can now be answered with this
 * form gone. `pages/ActivityEvidence.js` had already decided what happens
 * then and says so at its `onCancel` - ยกเลิก writes nothing to `showing`, so
 * a form closing is nobody taking the screen and the save is still owed its
 * sentence (#146). That is a decision in the code and not an owner's
 * question, which is why only the box in the navbar needed one; `253a`'s
 * first two rows hold it, one per answer.
 *
 * ## One form per file
 *
 * The boxes are seeded once, when the form mounts. That is right only because
 * the page gives each file its own form with a `key`; a form handed a second
 * file without one kept the first file's values (#147).
 */
export default function EvidenceForm({ evidence, types, maxBytes, busy, onSubmit, onCancel }) {
  const editing = Boolean(evidence)
  const [sending, setSending] = useState(false)
  const [type, setType] = useState(evidence?.evidence_type ?? types[0]?.evidence_type ?? '')
  const [description, setDescription] = useState(evidence?.description ?? '')
  const [file, setFile] = useState(null)

  const submit = event => {
    event.preventDefault()
    setSending(true)
    onSubmit({ evidence_type: type, description, file }).finally(() => setSending(false))
  }

  const megabytes = Math.floor(maxBytes / (1024 * 1024))

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">ประเภทหลักฐาน</span>
          <select
            value={type}
            onChange={event => setType(event.target.value)}
            disabled={sending}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
          >
            {types.map(entry => (
              <option key={entry.evidence_type} value={entry.evidence_type}>
                {entry.label_th}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">คำอธิบาย</span>
          <input
            type="text"
            value={description}
            onChange={event => setDescription(event.target.value)}
            disabled={sending}
            placeholder="เช่น โจทย์ที่แจกให้นักศึกษาในสัปดาห์ที่ 5"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-slate-600">{editing ? 'เปลี่ยนไฟล์ (ถ้าต้องการ)' : 'ไฟล์'}</span>
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={event => setFile(event.target.files?.[0] ?? null)}
          disabled={sending}
          className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:text-gray-700"
        />
        <span className="mt-1 block text-xs text-slate-500">
          รองรับเฉพาะไฟล์ PDF ขนาดไม่เกิน {megabytes} MB
        </span>
        {editing && !file && (
          <span className="mt-1 block text-xs text-slate-500">
            ไม่เลือกไฟล์ใหม่ = เก็บไฟล์เดิมไว้ ({evidence.file_name})
          </span>
        )}
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || (!editing && !file)}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-50"
        >
          {editing ? 'บันทึก' : 'แนบหลักฐาน'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  )
}

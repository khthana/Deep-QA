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
 */
export default function EvidenceForm({ evidence, types, maxBytes, busy, onSubmit, onCancel }) {
  const editing = Boolean(evidence)
  const [type, setType] = useState(evidence?.evidence_type ?? types[0]?.evidence_type ?? '')
  const [description, setDescription] = useState(evidence?.description ?? '')
  const [file, setFile] = useState(null)

  const submit = event => {
    event.preventDefault()
    onSubmit({ evidence_type: type, description, file })
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
          disabled={busy}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  )
}

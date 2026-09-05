import { useEffect, useState } from 'react'
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2'

/**
 * One of the four sections of the cycle, for one ผลการเรียนรู้ — #41.
 *
 * The card is the box and the button both: a section that has been written in
 * shows what it says with a pencil and a bin beside it, and one that has not
 * shows the sentence saying so with the way to start. There is no separate
 * "add" anywhere on the screen, because the four sections are fixed and known
 * before anything is in them — what a person does here is fill one in, not
 * create one.
 *
 * The textarea holds a draft of its own rather than writing through to the
 * page. Cancelling has to leave what was saved untouched, and a page-level
 * draft would have to be cleared by whoever closed the editor rather than
 * ceasing to exist when it closed.
 *
 * `reference_academic_year` renders only on the section that carries one, and
 * only when the server wrote one. It is the citation an accreditation panel
 * follows: this change was made in answer to that year's reflection. A section
 * with no earlier year to point at says nothing rather than saying ไม่มี — the
 * first cycle a รายวิชา ever has is not missing anything.
 */
export default function EntrySection({
  label,
  hint,
  entry,
  editing,
  busy,
  onEdit,
  onCancel,
  onSubmit,
  onRemove,
}) {
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (editing) setDraft(entry?.detail_text ?? '')
  }, [editing, entry])

  return (
    <section
      aria-label={label}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium text-gray-900">{label}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
        </div>

        {!editing && entry && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`แก้ไข${label}`}
              className="rounded-lg p-2 text-primary hover:bg-blue-50"
            >
              <HiOutlinePencil className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`ลบ${label}`}
              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
            >
              <HiOutlineTrash className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={event => {
            event.preventDefault()
            onSubmit(draft.trim())
          }}
          className="mt-3 space-y-3"
        >
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            rows={5}
            aria-label={label}
            placeholder={hint}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm leading-relaxed text-gray-900"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
            >
              บันทึก
            </button>
          </div>
        </form>
      ) : entry ? (
        <>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {entry.detail_text}
          </p>
          {entry.reference_academic_year && (
            <p className="mt-2 text-xs text-slate-400">
              ต่อเนื่องจากการสะท้อนคิดของปีการศึกษา{' '}
              {entry.reference_academic_year}
            </p>
          )}
        </>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-slate-500">ยังไม่ได้บันทึก{label}</p>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`เขียน${label}`}
            className="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-primary hover:bg-blue-50"
          >
            เขียน{label}
          </button>
        </div>
      )}
    </section>
  )
}

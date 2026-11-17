import { useEffect, useId, useRef, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import useModalFocus from '../useModalFocus'
import { termLabel } from './terms'

/**
 * Copying a whole term onto another — #23's seventh criterion.
 *
 * A popup since 17 พ.ย. 2569 - the owner's answer in #279: a button on the top
 * bar, คัดลอกจากภาคการศึกษาก่อน, opens it, where it used to be a panel under the
 * list with both terms typed in. The file keeps its name so the records that
 * cite it still find it (#54).
 *
 * **The target is not a field.** It is the term the list is showing, handed in
 * as `target` and named in the heading with the curriculum, and a person who
 * wants another target picks it on the list first. The source is picked from
 * `sources`: the terms this curriculum ran that are older than the target, the
 * nearest first and chosen by default. With none, the popup says so and คัดลอก
 * stays disabled.
 *
 * What makes it worth its own box is the answer: the server reports four
 * outcomes and this reads out every one that is not empty, because a single
 * count would hide the three that need doing something about.
 *
 * *สร้างแล้ว* is the copy. *มีอยู่แล้ว* is a subject already open in the target
 * term, which is a skip and not an error — pressing this twice has to be safe,
 * or somebody unsure whether the first press went through has no way to find
 * out. *ไม่อยู่ในหลักสูตรแล้ว* is a subject taken out of the curriculum since
 * the source term, and is the one the person has to act on. *ผู้สอนที่ไม่ได้
 * คัดลอกมา* is somebody whose account is no longer active; their leaving is not
 * a reason the rest of the term should not be opened, so the copy goes ahead
 * and names them.
 *
 * The report stays in the popup until the person closes it, and the popup
 * closes only when they do. While the copy is out it cannot be closed and the
 * source cannot be changed (#228): ปิด, Escape and the picker all wait for
 * `busy` to come down.
 */

const field =
  'rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'

const keyOf = term => `${term.academic_year}:${term.semester}`

export default function CopyTermPanel({
  open,
  target,
  programName,
  sources,
  busy,
  report,
  onCopy,
  onClose,
}) {
  const box = useRef(null)
  const titleId = useId()
  const [from, setFrom] = useState('')

  // The nearest earlier term, each time the popup opens: `sources` arrives
  // newest first. A choice the person made survives while it is still offered.
  const offered = sources.some(term => keyOf(term) === from)
  const chosen = offered ? from : sources[0] ? keyOf(sources[0]) : ''
  useEffect(() => {
    if (!open) setFrom('')
  }, [open])

  const close = () => {
    if (!busy) onClose()
  }
  useModalFocus(box, open, close)

  if (!open) return null

  const source = sources.find(term => keyOf(term) === chosen)

  return (
    <ContentMotionDIV className="fixed inset-0 z-[9998] !m-0 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl focus:outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold text-primary">
          คัดลอกจากภาคการศึกษาก่อน
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          คัดลอกมายังภาคการศึกษา {termLabel(target)}
          {programName ? ` หลักสูตร ${programName}` : ''}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          ระบบจะคัดลอกรายวิชาที่เปิดสอน กลุ่มเรียน และผู้สอน จากภาคการศึกษาต้นทางมายังภาคนี้
          รายวิชาที่เปิดไว้แล้วจะถูกข้าม ไม่ถูกเขียนทับ
        </p>

        {sources.length === 0 ? (
          <p className="mt-4 text-sm text-amber-700">
            หลักสูตรนี้ยังไม่มีภาคการศึกษาก่อนหน้าที่เปิดรายวิชาไว้ จึงไม่มีอะไรให้คัดลอก
          </p>
        ) : (
          <label className="mt-4 block">
            <span className="mb-1 block text-sm text-gray-500">จากภาคการศึกษา</span>
            <select
              value={chosen}
              onChange={event => setFrom(event.target.value)}
              disabled={busy}
              className={field}
            >
              {sources.map(term => (
                <option key={keyOf(term)} value={keyOf(term)}>
                  {termLabel(term)}
                </option>
              ))}
            </select>
          </label>
        )}

        {report && (
          <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            <p>
              เปิดรายวิชาใหม่ {report.created.length} รายวิชา รวม {report.sections} กลุ่มเรียน
            </p>
            {report.skipped_existing.length > 0 && (
              <p>
                ข้ามเพราะเปิดสอนอยู่แล้ว {report.skipped_existing.length} รายวิชา —{' '}
                {report.skipped_existing.join(', ')}
              </p>
            )}
            {report.skipped_unplaced.length > 0 && (
              <p className="text-amber-700">
                ข้ามเพราะไม่อยู่ในหลักสูตรแล้ว {report.skipped_unplaced.length} รายวิชา —{' '}
                {report.skipped_unplaced.join(', ')}
              </p>
            )}
            {report.skipped_closed?.length > 0 && (
              <p className="text-amber-700">
                ข้ามเพราะรายวิชาถูกปิดในคลังรายวิชาแล้ว {report.skipped_closed.length} รายวิชา —{' '}
                {report.skipped_closed.join(', ')}
              </p>
            )}
            {report.dropped_teachers.length > 0 && (
              <p className="text-amber-700">
                ไม่ได้คัดลอกผู้สอน {report.dropped_teachers.length} รายการ
                เพราะบัญชีถูกระงับการใช้งาน —{' '}
                {report.dropped_teachers
                  .map(dropped => `${dropped.subject_id} กลุ่มเรียน ${dropped.section_number}`)
                  .join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={busy || !source}
            onClick={() =>
              onCopy({
                from_academic_year: source.academic_year,
                from_semester: Number(source.semester),
                academic_year: target.academic_year,
                semester: Number(target.semester),
              })
            }
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
          >
            คัดลอก
          </button>
        </div>
      </div>
    </ContentMotionDIV>
  )
}

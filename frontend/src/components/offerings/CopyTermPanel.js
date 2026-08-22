import { useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import { SEMESTERS, isYear } from './terms'

/**
 * Copying a whole term onto another — #23's seventh criterion.
 *
 * Two terms and a button. What makes it worth its own panel is the answer: the
 * server reports four outcomes and this reads out every one that is not empty,
 * because a single count would hide the three that need doing something about.
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
 * The panel keeps the last report on the screen until the next copy. A report
 * that vanished on the next render would be a report nobody read.
 */

const field =
  'rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

function Term({ label, year, semester, onYear, onSemester }) {
  return (
    <div>
      <span className="mb-1 block text-sm text-gray-500">{label}</span>
      <div className="flex gap-2">
        <input
          value={year}
          onChange={event => onYear(event.target.value)}
          placeholder="ปีการศึกษา"
          inputMode="numeric"
          maxLength={4}
          className={`w-32 ${field}`}
        />
        <select value={semester} onChange={event => onSemester(event.target.value)} className={field}>
          {SEMESTERS.map(term => (
            <option key={term.value} value={term.value}>
              {term.value} — {term.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function CopyTermPanel({ busy, report, onCopy }) {
  const [from, setFrom] = useState({ year: '', semester: 1 })
  const [to, setTo] = useState({ year: '', semester: 2 })

  const sameTerm =
    from.year === to.year && Number(from.semester) === Number(to.semester)
  const ready = isYear(from.year) && isYear(to.year) && !sameTerm

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-primary">คัดลอกการเปิดรายวิชาจากภาคการศึกษาก่อน</h2>
      <p className="mt-1 text-sm text-slate-500">
        ระบบจะคัดลอกรายวิชาที่เปิดสอน ตอนเรียน และผู้สอน จากภาคการศึกษาต้นทางมายังปลายทาง
        รายวิชาที่เปิดไว้แล้วจะถูกข้าม ไม่ถูกเขียนทับ
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <Term
          label="จากภาคการศึกษา"
          year={from.year}
          semester={from.semester}
          onYear={year => setFrom(current => ({ ...current, year }))}
          onSemester={semester => setFrom(current => ({ ...current, semester }))}
        />
        <Term
          label="ไปยังภาคการศึกษา"
          year={to.year}
          semester={to.semester}
          onYear={year => setTo(current => ({ ...current, year }))}
          onSemester={semester => setTo(current => ({ ...current, semester }))}
        />
        <button
          type="button"
          disabled={busy || !ready}
          onClick={() =>
            onCopy({
              from_academic_year: from.year.trim(),
              from_semester: Number(from.semester),
              academic_year: to.year.trim(),
              semester: Number(to.semester),
            })
          }
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
        >
          คัดลอก
        </button>
      </div>

      {sameTerm && isYear(from.year) && (
        <p className="mt-2 text-sm text-amber-700">
          ต้นทางและปลายทางเป็นภาคการศึกษาเดียวกัน กรุณาเลือกให้ต่างกัน
        </p>
      )}

      {report && (
        <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          <p>
            เปิดรายวิชาใหม่ {report.created.length} รายวิชา รวม {report.sections} ตอนเรียน
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
          {report.dropped_teachers.length > 0 && (
            <p className="text-amber-700">
              ไม่ได้คัดลอกผู้สอน {report.dropped_teachers.length} รายการ
              เพราะบัญชีถูกระงับการใช้งาน —{' '}
              {report.dropped_teachers
                .map(dropped => `${dropped.subject_id} ตอน ${dropped.section_number}`)
                .join(', ')}
            </p>
          )}
        </div>
      )}
    </ContentMotionDIV>
  )
}

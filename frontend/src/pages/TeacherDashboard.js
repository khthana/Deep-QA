import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import { listMySections } from '../api/teaching'
import { semesterLabel } from '../components/offerings/terms'

/**
 * รายวิชาที่สอน — ticket #24, the first screen a ผู้สอน sees.
 *
 * The ตอนเรียน this account teaches in the current term, and nothing else.
 * Choosing one is what puts a Section in context; every Teacher screen after
 * this one works from that choice, and none of them is reachable before it.
 *
 * ## What decides the list
 *
 * Not this file. The server reads `course_sections_teacher` for the signed-in
 * account and filters to the term the calendar is in, and what arrives is what
 * this account teaches (ADR-0002). There is no filter on this screen and no
 * term picker, because "this term" is not a preference — a lecturer opening the
 * system in August is looking at the class they are teaching in August.
 *
 * The term therefore comes back with the list rather than being worked out
 * here. That is what lets the empty state name it. A screen that read its own
 * clock would agree with the server on all but one day a year, and disagree on
 * the day the term turns, which is the one day someone would notice.
 *
 * ## Choosing one
 *
 * Navigating to the Section's own address, and that is the whole of the
 * mechanism — no `localStorage`, no context that outlives the route. ADR-0004
 * has the reasoning; the visible consequence is that a reload keeps the Section
 * because the address keeps it, and that a link to a Section is a link somebody
 * can send.
 *
 * ## The empty state
 *
 * A lecturer with no ตอนเรียน this term is not an error and must not read like
 * one. What they need to know is which term was looked in and who opens a
 * subject for a term, because the answer is that the กรรมการหลักสูตร has not
 * assigned them one — nothing they can fix from here, and a sentence that
 * pretends otherwise wastes their afternoon.
 */
export default function TeacherDashboard() {
  const [sections, setSections] = useState([])
  const [term, setTerm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listMySections()
      setSections(data.sections)
      setTerm(data.term)
    } catch (error) {
      // An ended session is the shell's to announce, not this screen's — the
      // dialog is already on its way and a banner underneath it would be a
      // second answer to the same event.
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const termLabel = term
    ? `${semesterLabel(term.semester)} ปีการศึกษา ${term.academicYear}`
    : ''

  return (
    <ContentMotionDIV className="px-6 py-6">
      <Notice notice={notice} />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">รายวิชาที่สอน</h1>
        {term && (
          <p className="mt-1 text-sm text-slate-500">{termLabel}</p>
        )}
      </div>

      {loading && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {!loading && sections.length === 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-8 text-center">
          <p className="text-base font-medium text-primary">
            ยังไม่มีตอนเรียนที่ได้รับมอบหมายใน{termLabel}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            ตอนเรียนจะปรากฏที่นี่เมื่อกรรมการหลักสูตรเปิดรายวิชาในภาคการศึกษานี้และกำหนดให้ท่านเป็นผู้สอน
          </p>
        </div>
      )}

      {!loading && sections.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map(section => (
            <li key={section.section_id}>
              <button
                type="button"
                onClick={() =>
                  navigate(`/teacher/teacherDashboard/${section.section_id}`)
                }
                className="flex h-full w-full flex-col rounded-xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <span className="text-xs font-medium text-slate-400">
                  {section.subject_id}
                </span>
                <span className="mt-1 text-base font-semibold text-primary">
                  {section.subject_name_th}
                </span>
                <span className="text-xs text-slate-400">
                  {section.subject_name_en}
                </span>
                <span className="mt-4 flex items-center justify-between text-sm text-slate-500">
                  <span>ตอนเรียน {section.section_number}</span>
                  <span>{section.student_count} คน</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ContentMotionDIV>
  )
}

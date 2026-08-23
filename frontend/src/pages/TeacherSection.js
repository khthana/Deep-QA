import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import { getMySection } from '../api/teaching'
import { semesterLabel } from '../components/offerings/terms'

/**
 * ตอนเรียนที่เปิดอยู่ — ticket #24, the Section in context.
 *
 * The screen a ผู้สอน lands on after choosing a ตอนเรียน, and the one every
 * Section-specific menu entry hangs under. Its whole job is to resolve the id
 * in the address into a Section this account actually teaches, and to say which
 * one is open.
 *
 * ## Why the id is fetched rather than carried
 *
 * The dashboard already had the Section it navigated from, and passing it along
 * in router state would save a request. It would also be a Section that exists
 * only while the person does not reload — which is #24's fifth criterion
 * failing on the first F5. The address is the carrier (ADR-0004), so the
 * address is what this reads, every time, whether it was arrived at by clicking
 * or by pasting.
 *
 * ## The refusal
 *
 * A Section that is not theirs and a Section that does not exist get the same
 * 404 and the same sentence from the server, deliberately — two answers would
 * let someone walk the id space and learn which classes are real. So there is
 * one refusal to show here. It is not softened into "please choose a section":
 * the person may have followed a real link to a real class, and what they need
 * to be told is that it is not theirs, with a way back to the ones that are.
 */
export default function TeacherSection() {
  const { sectionId } = useParams()
  const [section, setSection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setSection(null)
    try {
      const data = await getMySection(sectionId)
      setSection(data.section)
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <ContentMotionDIV className="px-6 py-6">
      <Notice notice={notice} />

      {loading && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {!loading && !section && (
        <button
          type="button"
          onClick={() => navigate('/teacher/teacherDashboard')}
          className="text-sm font-medium text-blue-600 hover:underline focus:outline-none"
        >
          กลับไปที่รายวิชาที่สอน
        </button>
      )}

      {!loading && section && (
        <div>
          <p className="text-xs font-medium text-slate-400">{section.subject_id}</p>
          <h1 className="mt-1 text-xl font-semibold text-primary">
            {section.subject_name_th}
          </h1>
          <p className="text-sm text-slate-400">{section.subject_name_en}</p>
          <p className="mt-3 text-sm text-slate-500">
            ตอนเรียน {section.section_number} · {semesterLabel(section.semester)}{' '}
            ปีการศึกษา {section.academic_year} · นักศึกษา {section.student_count} คน
          </p>

          <p className="mt-6 text-sm text-slate-500">
            เมนูข้อมูลรายวิชาทางด้านซ้ายทำงานกับตอนเรียนนี้
          </p>
        </div>
      )}
    </ContentMotionDIV>
  )
}

import { useState, useMemo, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'
import { PiBooksFill } from 'react-icons/pi'
import ContentTitle from '../../../ContentTitle'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../../../context/AuthContext'
import {
  getCurrentTermAndYear,
  generateTermOptions,
  generateYearOptions,
} from '../../../TermAndYearUtils'
import { AnimatePresence } from 'framer-motion'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
function TeacherDashboard() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const navigate = useNavigate()
  const [term, setTerm] = useState(null)
  const [year, setYear] = useState(null)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const { profile } = useAuth()
  const [TeacherCourseList, setTeacherCourseList] = useState([])

  useEffect(() => {
    const { term: currentTerm, year: currentYear } = getCurrentTermAndYear()
    setTerm(currentTerm)
    setYear(currentYear)
    localStorage.removeItem('selectedCourse')
    localStorage.removeItem('section')
    localStorage.removeItem('section_id')
  }, [])

  useEffect(() => {
    if (!term) return
    fetchCoursesBySemester(term)
    localStorage.setItem('term', `${term}`)
    localStorage.setItem('year', `${year}`)
  }, [term])

  useEffect(() => {
    const savedTerm = localStorage.getItem('term')
    const savedYear = localStorage.getItem('year')

    if (savedTerm && savedYear) {
      setTerm(savedTerm)
      setYear(savedYear)
    } else {
      const { term: currentTerm, year: currentYear } = getCurrentTermAndYear()
      setTerm(currentTerm)
      setYear(currentYear)
    }

    localStorage.removeItem('selectedCourse')
    localStorage.removeItem('section')
    localStorage.removeItem('section_id')
  }, [])

  const termOptions = generateTermOptions()

  const fetchCoursesBySemester = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/teacher/getTeacherCourse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user_id: profile.user_id,
            academic_year: year,
            semester: term,
          }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('API Error')

      const data = await res.json()
      // console.log(data)
      setTeacherCourseList(data.data)
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const filteredCourses = useMemo(() => {
    return TeacherCourseList.filter((c) => {
      const matchSearch =
        c.subject_name_th.toLowerCase().includes(search.toLowerCase()) ||
        c.subject_id.includes(search)
      return matchSearch
    })
  }, [TeacherCourseList, search])

  return (
    <div className="w-full px-4 py-6">
      <div className="w-full rounded-xl bg-white p-6 shadow">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <ContentTitle titlename={'รายวิชา'} icon={PiBooksFill} />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-m text-gray-600">ภาคการศึกษา</label>
            <select
              value={term || ''}
              onChange={(e) => setTerm(parseInt(e.target.value))}
              className="text-m rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {termOptions.map((t) => (
                <option key={t} value={t}>
                  {t}/{year}
                </option>
              ))}
            </select>

            <div className="relative w-48">
              <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหารายวิชา"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-m w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <ContentMotionDIV
            key="loading"
            className="flex h-40 flex-col items-center justify-center gap-2"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
            <span className="text-sm text-gray-400">กำลังโหลดข้อมูล</span>
          </ContentMotionDIV>
        ) : (
          <div
            key={'subject-card'}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3"
          >
            {filteredCourses.map((course) =>
              course.sections.map((section) => (
                <div
                  key={`${course.subject_id}-${section.section_number}`}
                  onClick={() => {
                    localStorage.setItem(
                      'selectedCourse',
                      JSON.stringify(course),
                    )
                    localStorage.setItem('section', section.section_number)
                    localStorage.setItem('section_id', section.section_id)
                    const slug = course.subject_name_en.replace(/\s+/g, '-')
                    navigate(
                      `/teacher/teacherDashboard/${slug}-Section-${section.section_number}/subjectStudents`,
                    )
                  }}
                  className="relative z-10 flex h-full flex-1 flex-col overflow-hidden cursor-pointer rounded-xl border border-gray-200 shadow transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-blue-400 hover:bg-slate-50 hover:shadow-xl"
                >
                  <div className="text-m rounded-t-xl bg-secondary px-4 py-2 text-white">
                    {course.subject_id}
                  </div>
                  <div className="flex flex-col gap-3 p-2">
                    <div className="flex flex-col">
                      <div className="text-lg font-medium text-gray-800">
                        {course.subject_name_th}
                      </div>
                      <div className="text-sm font-medium text-gray-500">
                        {course.subject_name_en}
                      </div>
                    </div>

                    {(() => {
                      const color = getColor(section.section_number)
                      return (
                        <span
                          className={`w-fit rounded-lg px-2 py-1 text-sm ${color.bg} ${color.text}`}
                        >
                          กลุ่มเรียนที่ {section.section_number}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              )),
            )}
            <SessionExpiredDialog open={sessionExpired} />
          </div>
        )}
      </div>
    </div>
  )
}

export default TeacherDashboard

const colors = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-red-100', text: 'text-red-700' },
]

function getColor(subject_id) {
  const index = subject_id.charCodeAt(0) % colors.length
  return colors[index]
}

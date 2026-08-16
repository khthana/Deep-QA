import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FaUserGroup, FaFileImport } from 'react-icons/fa6'
import { FaSearch, FaUserEdit } from 'react-icons/fa'
import { IoMdPersonAdd } from 'react-icons/io'
import AddUserDialog from '../UserMangement/AddUserDialog'
import ImportUserDialog from '../UserMangement/ImportUserDilog'
import Pagination from '@mui/material/Pagination'
import ContentTitle from '../../../ContentTitle'
import { FaBookOpen } from 'react-icons/fa6'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { IoMdAdd } from 'react-icons/io'
import CardCourseInterm from './CardCourseInTerm'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CopyDataDialog from './CopyDataDialog'
import SessionExpiredDialog from '../../../SessionExpiredDialog.js'
import { isSessionExpired } from '../../../../utils/session.js'

import {
  getCurrentTermAndYear,
  generateTermOptions,
  generateYearOptions,
} from '../../../TermAndYearUtils'

function CourseInTerm() {
  const [term, setTerm] = useState(null)
  const [year, setYear] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const Scope = localStorage.getItem('scopeID')
  const [SubjectInProg, setSubjectInProg] = useState([])
  const [semesterCourses, setSemesterCourses] = useState([])
  const [DeptData, setDaptData] = useState()
  const [teacherList, setTeacherList] = useState()
  const [isCopyDailogOpen, setIsCopyDialogOpen] = useState(false)
  const [oldYear, setOldYear] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const { term: currentTerm, year: currentYear } = getCurrentTermAndYear()
    setTerm(currentTerm)
    setYear(currentYear)
  }, [])

  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const termOptions = generateTermOptions()
  const yearOptions = generateYearOptions(2565, 2568)

  const fetchSubjectsInProgram = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/program_subjects/get-program-subjectsby-program_id`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ program_id: Scope }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('API Error')

      const data = await res.json()
      // console.log(data)
      setSubjectInProg(data.data)
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const fetchSemesterCourses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/semesterCourses/get-by-year-semester`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            academic_year: year,
            semester: term,
            program_id: Scope,
          }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('API Error')

      const data = await res.json()
      const sortedCourses = data.data.sort(
        (a, b) => b.semester_course_id - a.semester_course_id,
      )
      setSemesterCourses(sortedCourses)
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const fetchScopeOrder = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user_roles/scope-order`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope_id: Scope }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('API Error')

      const data = await res.json()
      setDaptData(data)
    } catch (err) {
      console.error('Error :', err)
    }
  }

  const fetchTeacherInDepartment = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/get-teacher-in-department`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ department_id: DeptData.department_id }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      console.log(data)
      setTeacherList(data.data)
    } catch (err) {
      console.error('Error :', err)
    }
  }

  useEffect(() => {
    if (!Scope) return
    fetchSubjectsInProgram()
    fetchScopeOrder()
  }, [Scope])

  useEffect(() => {
    if (!DeptData) return
    fetchTeacherInDepartment()
  }, [DeptData])

  useEffect(() => {
    if (!Scope || !year || !term) return
    fetchSemesterCourses()
  }, [Scope, year, term])

  return (
    <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
      <ContentTitle
        titlename={'การเปิดรายวิชาในภาคการศึกษา'}
        icon={FaBookOpen}
      />
      <div className="my-3 flex w-full items-center justify-between rounded-lg border bg-white p-5 shadow">
        <div className="flex w-full flex-row items-center justify-between gap-6">
          <div className="inline-flex items-center gap-6">
            <div className="inline-flex items-center gap-2">
              <span className="select-none text-gray-600">ปีการศึกษา</span>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-left text-gray-700 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="select-none text-gray-600">ภาคเรียนที่</span>
              <select
                value={term}
                onChange={(e) => setTerm(parseInt(e.target.value))}
                className="rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-left text-gray-700 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {termOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="inline-flex items-center gap-3">
            <button
              onClick={() => {
                setAlert({
                  open: true,
                  message: `กรอกรหัสวิชา และกดปุ่มบันทึก บันทึก เพื่อเปิดรายวิชาในภาคการศึกษา`,
                  severity: 'info',
                })
                setIsAdding(true)
              }}
              type="button"
              className="flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 text-center text-white hover:bg-cyan-700"
            >
              <IoMdAdd className="me-2" />
              เพิ่มวิชา
            </button>

            <button
              onClick={() => {
                setIsCopyDialogOpen(true)
              }}
              className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 text-center text-white hover:bg-secondary_hover"
            >
              คัดลอกจากปีการศึกษาเก่า
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg p-2 ">
        <AnimatePresence>
          <ContentMotionDIV className="p-2 text-xl text-secondary">
            ภาคเรียนที่ {term}/{year}
          </ContentMotionDIV>
        </AnimatePresence>

        <div className=" flex flex-col gap-6">
          <AnimatePresence>
            {isAdding && (
              <CardCourseInterm
                courses={null}
                SubjectInProg={SubjectInProg}
                year={year}
                term={term}
                setAdding={setIsAdding}
                fetchSemesterCourses={fetchSemesterCourses}
                setAlert={setAlert}
                semesterCourses={semesterCourses}
              ></CardCourseInterm>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {semesterCourses.map((courses) => (
              <CardCourseInterm
                key={
                  courses.semester_course_id ||
                  courses.subject_id ||
                  courses.name
                }
                courses={courses}
                fetchSemesterCourses={fetchSemesterCourses}
                setAlert={setAlert}
                teacherList={teacherList}
              ></CardCourseInterm>
            ))}
          </AnimatePresence>
        </div>
      </div>
      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      <CopyDataDialog
        open={isCopyDailogOpen}
        setOpen={setIsCopyDialogOpen}
        selectedYear={oldYear}
        setSelectedYear={setOldYear}
        years={yearOptions}
        currentYear={year}
        setAlert={setAlert}
        fetchSemesterCourses={fetchSemesterCourses}
      ></CopyDataDialog>

      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default CourseInTerm

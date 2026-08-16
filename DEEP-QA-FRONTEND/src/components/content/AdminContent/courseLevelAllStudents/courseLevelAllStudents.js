import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { IoDocumentTextOutline } from 'react-icons/io5'
import { useState, useEffect } from 'react'
import SelecteProgForProgManager from '../../../SelecteProgForProgManager'
import { mapRole } from '../../../MapRole'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import { isSessionExpired } from '../../../../utils/session'
import { AnimatePresence } from 'framer-motion'
import { getCurrentTermAndYear } from '../../../TermAndYearUtils'

function CourseLevelAllStudents() {
  const [selectedProgram, setSelectedProgram] = useState(null)
  const { term, year } = getCurrentTermAndYear()
  const [selectedYear, setSelectedYear] = useState(year)
  const [loading, setLoading] = useState(false)
  const scopeID = localStorage.getItem('scopeID')
  const [evaData, setEvaData] = useState([])
  const [StudentList, setStudentList] = useState([])
  const [sessionExpired, setSessionExpired] = useState(false)

  const fetchScoreEva = async () => {
    const start = Date.now()

    try {
      setLoading(true)

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/ploScore/${scopeID}/year/${selectedYear}/studentAll`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      )

      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('API Error')

      const data = await res.json()
      const plos =
        data.students?.[0]?.plos?.map(p => ({
          plo_id: p.plo_id,
          plo_code: p.plo_code,
          plo_name: p.plo_name,
        })) || []

      // console.log(data)
      setEvaData(plos)
      setStudentList(data.students || [])
    } catch (err) {
      console.error('Error :', err)
    } finally {
      const elapsed = Date.now() - start
      const delay = Math.max(1000 - elapsed, 0)

      setTimeout(() => {
        setLoading(false)
      }, delay)
    }
  }

  useEffect(() => {
    if (!scopeID) return
    fetchScoreEva()
  }, [scopeID, selectedYear])

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
        <ContentTitle
          titlename=" ผลการเรียนรู้ระดับหลักสูตร ของนักศึกษาทุกคน"
          icon={IoDocumentTextOutline}
        />
        <SelecteProgForProgManager
          startYear={true}
          selectedProgram={selectedProgram}
          setSelectedProgram={setSelectedProgram}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />

        <div className="overflow-x-auto rounded-lg">
          <AnimatePresence mode="wait">
            {loading ? (
              <ContentMotionDIV
                key="loading"
                className="flex h-40 flex-col items-center justify-center gap-2"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
                <span className="text-sm text-gray-400">กำลังโหลดข้อมูล</span>
              </ContentMotionDIV>
            ) : StudentList.length === 0 ? (
              <ContentMotionDIV
                key="empty"
                className="flex h-40 items-center justify-center text-sm text-gray-400"
              >
                ไม่มีข้อมูล
              </ContentMotionDIV>
            ) : (
              <ContentMotionDIV key="table">
                <table className="min-w-full border-collapse text-sm text-gray-700">
                  <thead className="bg-gradient-to-r from-slate-100 to-slate-100 text-gray-800">
                    <tr>
                      <th className="whitespace-nowrap border border-gray-300 px-2 py-2 text-center">
                        รหัสนักศึกษา
                      </th>
                      <th className="whitespace-nowrap border border-gray-300 px-2 py-2 text-left">
                        ชื่อ นามสกุล
                      </th>

                      {evaData.map((plo, idx) => (
                        <th
                          key={idx}
                          className="whitespace-nowrap border border-gray-300 px-2 py-2 text-center"
                        >
                          {plo.plo_code}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {StudentList.map((student, i) => (
                      <tr
                        key={i}
                        className="transition-all duration-150 hover:bg-blue-50"
                      >
                        <td className="border border-gray-200 px-2 py-2 text-center font-medium">
                          {student.student_id}
                        </td>

                        <td className="border border-gray-200 px-2 py-2 font-medium">
                          {student.title_th}
                          {student.first_name} {student.last_name}
                        </td>

                        {evaData.map((plo, j) => {
                          const score = student.plos.find(
                            p => p.plo_id === plo.plo_id
                          )?.score

                          return (
                            <td
                              key={j}
                              className="border border-gray-200 px-1 py-1"
                            >
                              <div
                                className={`rounded-lg px-2 py-2 text-center font-medium ${
                                  score == null
                                    ? 'bg-gray-100 text-gray-400'
                                    : getColor(score)
                                }`}
                              >
                                {score != null ? score.toFixed(2) : '-'}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ContentMotionDIV>
            )}
          </AnimatePresence>
        </div>
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default CourseLevelAllStudents

const getColor = value => {
  const num = Number(value)
  if (num < 3) return 'bg-rose-600 text-rose-200' //แดง
  if (num < 3.5) return 'bg-orange-500 text-orange-200' //ส้ม
  if (num < 4) return 'bg-yellow-500 text-yellow-200' // เหลือง
  if (num < 4.5) return 'bg-[#2baf2b] text-green-200' //เขียวอ่อน
  return 'bg-[#056f00] text-green-300' //เขียวเข้ม
}

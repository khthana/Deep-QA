import { useState, useEffect } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { HiOutlineDocumentReport } from 'react-icons/hi'
import MotionTr from '../../../MotionTr'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

function LearningDetails() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const section_id = localStorage.getItem('section_id') || ''
  const [students, setStudents] = useState([])
  const [avgResult, setAvgResult] = useState([])
  const [studentScore, setStudentScore] = useState([])

  useEffect(() => {
    if (section_id) {
      fetchAverageScore()
      fetchStudentCourses()
      fetchStudentScoure()
    }
  }, [section_id])

  const getColor = (value) => {
    const num = Number(value)
    if (num < 3) return 'bg-rose-600' //แดง
    if (num < 3.5) return 'bg-orange-500' //ส้ม
    if (num < 4) return 'bg-yellow-500' // เหลือง
    if (num < 4.5) return 'bg-[#2baf2b]' //เขียวอ่อน
    return 'bg-[#056f00]' //เขียวเข้ม
  }

  const fetchStudentCourses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentCourse/get/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)

      const data = await res.json()

      // console.log('Fetched Students:', data.data, section_id)
      setStudents(data.data)
      // setSelectedStudent(data.data[0] || null)
    } catch (err) {
      console.error('Error :', err)
      setStudents([])
    }
  }

  const fetchAverageScore = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/scoreEva/section/${section_id}/average`,
        {
          method: 'GET',
          credentials: 'include',
          withCredentials: true,
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)

      const data = await res.json()
      // console.log('Average Score Data:', data)
      setAvgResult(data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchStudentScoure = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/scoreEva/section/${section_id}/student-clo-scores`,
        {
          method: 'GET',
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)

      const data = await res.json()
      setStudentScore(data)
      console.log('Student CLO Scores:', data)
    } catch (err) {
      console.error(err)
    }
  }

  const avgScore =
    avgResult?.data?.length > 0
      ? (
          avgResult.data.reduce((sum, d) => sum + d.earned_score, 0) /
          avgResult.data.length
        ).toFixed(2)
      : 0

  const analyzeCloScores = (studentData = []) => {
    const cloScores = {}

    studentData.forEach((student) => {
      Object.entries(student.score).forEach(([clo, score]) => {
        if (clo === 'average') return
        if (!cloScores[clo]) cloScores[clo] = []
        cloScores[clo].push(score)
      })
    })

    const cloAvgList = Object.entries(cloScores).map(([clo, scores]) => ({
      clo, // "1", "2", ...
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))

    const lowestClo =
      cloAvgList.length > 0
        ? cloAvgList.reduce((min, cur) => (cur.avg < min.avg ? cur : min))
        : null

    return {
      cloAvgList, // ใช้แสดง header
      lowestClo, // ใช้สรุป
    }
  }

  const cloAnalysis = studentScore?.data
    ? analyzeCloScores(studentScore.data)
    : null

  const lowestClo = cloAnalysis?.lowestClo
  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle
        Subject="การเขียนโปรแกรมเชิงวัตถุ"
        term="1/2568"
      ></ContentSubjectTitle>
      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <ContentTitle
          titlename="รายละเอียดผลการเรียนรู้ระดับรายวิชา"
          icon={HiOutlineDocumentReport}
        />

        <ContentMotionDIV className="flex gap-4">
          {[
            {
              value: students ? students.length : [],
              label: 'นักศึกษาทั้งหมด',
              bg: 'green',
              text: 'text-green-700',
            },
            {
              value: avgScore,
              label: 'คะแนนเฉลี่ยรวม',
              bg: 'purple',
              text: 'text-purple-700',
            },
            {
              value: avgResult?.passing_rate
                ? `${avgResult.passing_rate} %`
                : '0.00 %',
              label: 'อัตราผ่านเกณฑ์',
              bg: 'yellow',
              text: 'text-yellow-700',
            },
            {
              value: lowestClo ? `CLO-${lowestClo.clo}` : '-',
              label: 'CLO ที่ต้องปรับปรุง',
              bg: 'orange',
              text: 'text-orange-700',
            },
          ].map((s, i) => (
            <ContentMotionDIV
              key={i}
              className={`bg-${s.bg}-100 flex w-full flex-col items-center rounded-lg px-4 py-6`}
            >
              <span className={`text-4xl ${s.text}`}>{s.value}</span>
              <span className={`text-lg ${s.text}`}>{s.label}</span>
            </ContentMotionDIV>
          ))}
        </ContentMotionDIV>

        {/* Legend */}
        <ContentMotionDIV className="flex justify-center py-4">
          <ContentMotionDIV className="inline-flex gap-6">
            {[
              { color: 'text-rose-600', bg: 'bg-rose-600', label: '<3.0' },
              {
                color: 'text-orange-400',
                bg: 'bg-orange-400',
                label: '3.0 - 3.4',
              },
              {
                color: 'text-yellow-500',
                bg: 'bg-yellow-500',
                label: '3.5 - 3.9',
              },
              {
                color: 'text-[#2baf2b]',
                bg: 'bg-[#2baf2b]',
                label: '4.0 - 4.4',
              },
              { color: 'text-[#056f00]', bg: 'bg-[#056f00]', label: '≥ 4.5' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={`p-3 ${l.bg} rounded-md `}></div>
                <span className={`${l.color}`}>{l.label}</span>
              </div>
            ))}
          </ContentMotionDIV>
        </ContentMotionDIV>

        <ContentMotionDIV className="flex rounded-xl bg-white shadow">
          <div className="w-full overflow-x-auto rounded-lg">
            <table className="w-full border-collapse border border-gray-200 text-gray-700">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  {/* คอลัมน์นักศึกษา */}
                  <th className="sticky left-0 z-20 min-w-[220px] border-b bg-slate-100 px-3 py-2 text-left">
                    <div className="flex flex-col">
                      <span>นักศึกษา</span>
                      <span className="font-normal text-gray-400">
                        (จำนวน {students?.length ?? 0} คน)
                      </span>
                    </div>
                  </th>

                  {/* CLO headers */}
                  {Object.values(studentScore?.clo ?? {}).map(
                    (cloNumber, i) => {
                      const avgObj = cloAnalysis?.cloAvgList.find(
                        (c) => c.clo === String(cloNumber),
                      )

                      return (
                        <th
                          key={i}
                          className="min-w-[80px] border-b px-2 py-2 text-center transition-colors hover:bg-slate-200"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{`CLO-${cloNumber}`}</span>
                            <span className="whitespace-nowrap font-normal text-gray-400">
                              (เฉลี่ย {avgObj ? avgObj.avg.toFixed(2) : '-'})
                            </span>
                          </div>
                        </th>
                      )
                    },
                  )}

                  <th className="min-w-[90px] border-b px-3 py-2 text-center">
                    ค่าเฉลี่ย
                  </th>
                </tr>
              </thead>

              <tbody>
                {!studentScore?.data?.length
                  ? null
                  : studentScore.data.map((s) => {
                      const cloScores = Object.entries(s.score)
                        .filter(([k]) => k !== 'average')
                        .map(([, v]) => v)

                      return (
                        <MotionTr
                          key={s.student_id}
                          className="transition-colors hover:bg-slate-50"
                        >
                          {/* ชื่อนักศึกษา */}
                          <td className="sticky left-0 z-10 border border-gray-200 bg-white px-2 py-1 text-left transition-colors group-hover:bg-slate-50">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {`${s.title_th}${s.first_name} ${s.last_name}`}
                              </span>
                              <span className="text-sm text-gray-400">
                                {s.student_id}
                              </span>
                            </div>
                          </td>

                          {/* คะแนน CLO */}
                          {cloScores.map((v, i) => (
                            <td
                              key={i}
                              className="min-w-[80px] border border-gray-200 p-1 text-sm"
                            >
                              <ContentMotionDIV
                                className={`h-full w-full rounded-lg px-1 py-2 text-center text-white transition
                        hover:scale-[1.03] hover:shadow-md ${
                          !v ? 'bg-gray-300 text-gray-600' : getColor(v)
                        }`}
                              >
                                {v ?? 0}
                              </ContentMotionDIV>
                            </td>
                          ))}

                          {/* ค่าเฉลี่ย */}
                          <td className="min-w-[90px] border border-gray-200 p-1 text-center text-sm font-black text-gray-500">
                            <span className="transition hover:text-gray-800">
                              {s.score.average}
                            </span>
                          </td>
                        </MotionTr>
                      )
                    })}
              </tbody>
            </table>
          </div>
        </ContentMotionDIV>
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default LearningDetails

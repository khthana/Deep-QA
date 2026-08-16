import { useState, useEffect } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { HiOutlineDocumentReport } from 'react-icons/hi'
import { Radar } from 'react-chartjs-2'
import { useStudentCourses } from '../../../../hooks/useStudentCourses'
import { motion } from 'framer-motion'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
)

function StudentResults() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const [studentData, setStudentData] = useState([])
  const [selectedId, setSelectedId] = useState()
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showAvg, setShowAvg] = useState(false)
  const section_id = localStorage.getItem('section_id') || ''
  const [result, setResult] = useState([])
  const [studentResult, setStudentResult] = useState([])
  const [students, setStudents] = useState([])

  useEffect(() => {
    if (section_id) {
      fetchAverageScore()
      fetchStudentCourses()
    }
  }, [section_id])

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentResults()
    }
  }, [selectedStudent])

  const fetchAverageScore = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/scoreEva/section/${section_id}/average`,
        {
          method: 'GET',
          credentials: 'include',
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('โหลด average ไม่สำเร็จ')

      const data = await res.json()
      // console.log(data)
      setResult(data)
      // setState ตรงนี้ตามที่เธอใช้จริง
      // setAverageScores(data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchStudentResults = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/scoreEva/section/${section_id}/student/${selectedStudent.student_id}`,
        {
          method: 'GET',
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('โหลด average ไม่สำเร็จ')

      const data = await res.json()
      // console.log(data)
      setStudentResult(data)
    } catch (err) {
      console.error(err)
    }
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
      setSelectedStudent(data.data[0] || null)
    } catch (err) {
      console.error('Error :', err)
      setStudents([])
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle
        Subject="การเขียนโปรแกรมเชิงวัตถุ"
        term="1/2568"
      ></ContentSubjectTitle>
      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <div className="inline-flex items-center justify-between align-middle">
          <ContentTitle
            titlename="ผลลัพธ์การเรียนรู้รายบุคคล"
            icon={HiOutlineDocumentReport}
          />
          <ContentMotionDIV className="inline-flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowAvg(!showAvg)}
              className={`flex items-center justify-center rounded-lg px-5 py-2.5 font-medium text-white transition ${
                showAvg
                  ? 'bg-gray-500 hover:bg-gray-600'
                  : 'bg-secondary hover:bg-secondary_hover'
              }`}
            >
              {showAvg
                ? 'ซ่อนการเปรียบเทียบ'
                : 'เปรียบเทียบกับการเรียนรู้เฉลี่ย'}
            </button>
          </ContentMotionDIV>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-m text-gray-600">กิจกรรมการเรียนรู้</label>
          <select
            value={selectedId}
            onChange={(e) => (
              setSelectedId(Number(e.target.value)),
              setSelectedStudent(
                students.find((s) => s.student_id === e.target.value),
              ),
              fetchStudentResults()
            )}
            className="text-m rounded-md border border-gray-300 px-3 py-1.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_id} {s.title_th}
                {s.first_name_th} {s.last_name_th}
              </option>
            ))}
          </select>
        </div>

        <div className="flex h-full items-center justify-center py-6">
          <div style={{ width: '90%', maxWidth: 600, height: '90%' }}>
            <SrChart
              student={selectedStudent}
              studentResult={studentResult}
              averageData={showAvg ? result : null}
            />
          </div>
        </div>
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default StudentResults

function SrChart({ student, averageData, studentResult }) {
  if (!student || !studentResult || studentResult.length === 0) return null

  // console.log('Student Result:', averageData)
  const data = studentResult.data

  const chartData = {
    labels: data.map((d) => `CLO-${d.clo_number}`),
    datasets: [
      {
        label: `ผลลัพธ์ของ ${student.first_name_th} ${student.last_name_th}`,
        data: data.map((d) => d.earned_score),
        backgroundColor: 'rgba(59,130,246,0.3)',
        borderColor: 'rgba(59,130,246,1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59,130,246,1)',
        pointBorderColor: '#fff',
      },

      ...(averageData
        ? [
            {
              label: 'ค่าเฉลี่ยของกลุ่มเรียน',
              data: averageData.data.map((d) => d.earned_score),
              backgroundColor: 'rgba(16,185,129,0.2)',
              borderColor: 'rgba(16,185,129,1)',
              borderWidth: 2,
              borderDash: [5, 5],
              pointBackgroundColor: 'rgba(16,185,129,1)',
              pointBorderColor: '#fff',
            },
          ]
        : []),
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    elements: {
      line: { tension: 0 },
    },
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 5, // full_score
        ticks: {
          stepSize: 1,
          backdropColor: 'transparent',
        },
        angleLines: { color: 'rgba(0,0,0,0.2)' },
        grid: { color: 'rgba(0,0,0,0.1)' },
        pointLabels: {
          font: { size: 14 },
          color: '#333',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const clo = data[context.dataIndex]
            return [
              `คะแนน: ${clo.earned_score} / ${clo.full_score}`,
              '',
              ...wrapText(clo.clo_detail),
            ]
          },
        },
      },
    },
  }

  return <Radar data={chartData} options={options} />
}

const wrapText = (text, maxLength = 60) => {
  const words = text.split(' ')
  let lines = []
  let current = ''

  words.forEach((w) => {
    if ((current + w).length > maxLength) {
      lines.push(current)
      current = w
    } else {
      current += (current ? ' ' : '') + w
    }
  })

  if (current) lines.push(current)
  return lines
}

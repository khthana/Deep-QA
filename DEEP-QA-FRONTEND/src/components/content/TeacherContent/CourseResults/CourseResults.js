import React, { useEffect, useState } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { HiOutlineDocumentReport } from 'react-icons/hi'
import CrChart from './crChart'
import { useStudentCourses } from '../../../../hooks/useStudentCourses'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

function CourseResults() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const section_id = localStorage.getItem('section_id') || ''
  const [result, setResult] = React.useState([])
  const [otherYears, setOtherYears] = useState(null)
  const [showOtherYears, setShowOtherYears] = useState(false)
  const [ListPLO, setListPLO] = useState([])
  const savedCourse = JSON.parse(localStorage.getItem('selectedCourse'))

  useEffect(() => {
    if (section_id) {
      // fetchStudentCourses()
      // fetchActivitiesForScore()
      fetchAverageScore()
      fetchPLOinCourse()
    }
  }, [section_id])

  const fetchPLOinCourse = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/plo-mapping/get-mapping-in-subject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
          body: JSON.stringify({
            program_id: '0501',
            subject_id: savedCourse?.subject_id || '',
          }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) {
        throw new Error(`Failed to fetch rubrics: ${res.status}`)
      }

      const data = await res.json()
      const sortedData = data.data.sort((a, b) => {
        const numA = parseInt(a.outcome_code.split('-')[1])
        const numB = parseInt(b.outcome_code.split('-')[1])
        return numA - numB
      })
      setListPLO(sortedData)
    } catch (err) {
      console.error(err)
      setListPLO([])
    }
  }

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

  const fetchAverageBySection = async (secId) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/scoreEva/section/${secId}/average`,
        {
          method: 'GET',
          credentials: 'include',
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('โหลด average ไม่สำเร็จ')

      const data = await res.json()
      return data
    } catch (err) {
      console.error(err)
      return null
    }
  }

  const fetchOtherYears = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/scoreEva/section/${section_id}/other-years`,
        {
          method: 'GET',
          credentials: 'include',
        },
      )

      if (isSessionExpired(res)) return setSessionExpired(true)
      if (!res.ok) throw new Error('โหลด other years ไม่สำเร็จ')

      const data = await res.json()
      // console.log('Other Years:', data)

      const results = await Promise.all(
        data.data.map((item) => fetchAverageBySection(item.section_id)),
      )

      // console.log('Other Years Average:', results)

      setOtherYears(results)
    } catch (err) {
      console.error(err)
    }
  }

  const avgScore =
    result?.data?.length > 0
      ? (
          result.data.reduce((sum, d) => sum + d.earned_score, 0) /
          result.data.length
        ).toFixed(2)
      : 0

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle></ContentSubjectTitle>
      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <div className="inline-flex items-center justify-between align-middle">
          <ContentTitle
            titlename="ผลลัพธ์การเรียนรู้รายวิชา"
            icon={HiOutlineDocumentReport}
          />
          <div className="inline-flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (!showOtherYears) {
                  fetchOtherYears() // โหลดตอนเปิดครั้งแรก
                }
                setShowOtherYears(!showOtherYears)
              }}
              className="flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white hover:bg-secondary_hover"
            >
              {showOtherYears
                ? 'ซ่อนผลการเรียนรู้ย้อนหลัง'
                : 'เปรียบเทียบผลการเรียนรู้ย้อนหลัง'}
            </button>
          </div>
        </div>

        <ContentMotionDIV className="flex flex-row justify-between gap-4">
          <ContentMotionDIV className="flex w-full flex-col items-center rounded-lg bg-green-100 px-4 py-6">
            <span className="text-4xl  text-green-700">
              {result.total_student || 0}
            </span>
            <span className="text-lg  text-green-700">นักศึกษาทั้งหมด</span>
          </ContentMotionDIV>

          <ContentMotionDIV className="flex w-full flex-col items-center rounded-lg bg-purple-100 px-4 py-6">
            <span className="text-4xl text-purple-700">{avgScore}</span>
            <span className="text-lg  text-purple-700">คะแนนเฉลี่ยรวม</span>
          </ContentMotionDIV>
          <ContentMotionDIV className="flex w-full flex-col items-center rounded-lg bg-yellow-100 px-4 py-6 ">
            <span className="text-4xl  text-yellow-700">
              {result.passing_rate || 0} %
            </span>
            <span className="text-lg  text-yellow-700">อัตราผ่านเกณฑ์</span>
          </ContentMotionDIV>
        </ContentMotionDIV>

        <ContentMotionDIV className="flex h-full w-full items-center justify-center">
          <div style={{ width: '90%', maxWidth: 600, height: '90%' }}>
            <CrChart
              data={result.data}
              otherYears={showOtherYears ? otherYears : null}
              ListPLO={ListPLO}
            />
          </div>
        </ContentMotionDIV>
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default CourseResults

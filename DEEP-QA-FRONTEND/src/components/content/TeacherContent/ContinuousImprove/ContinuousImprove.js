import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { GrPlan } from 'react-icons/gr'
import ContinuousCard from './ContinuousCard'
import { useState, useEffect } from 'react'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import { getCurrentTermAndYear } from '../../../TermAndYearUtils'

function ContinuousImprove() {
  const section_id = localStorage.getItem('section_id')
  const [result, setResult] = useState([])
  const [sessionExpired, setSessionExpired] = useState(false)
  const [CycleId, setCycleId] = useState()
  const [currentYear, setCurrentYear] = useState(null)
  const [clos, setClos] = useState([])

  const fetchCLOPlan = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/cloPLan/section/${section_id}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)

      const data = await res.json()

      setResult(data.data)
      setCycleId(data.data.clo_course_cycle_id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveDetail = async (payload) => {
    console.log('Saving detail:', payload)
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/cloPLan/detail/upsert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...payload,
            clo_course_cycle_id: CycleId,
            year: currentYear,
          }),
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) fetchCLOPlan()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteDetail = async (plan_detail_id) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/cloPLan/${plan_detail_id}/delete`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      if (res.ok) fetchCLOPlan()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchCLO = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/subjectClo/get/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      // console.log('CLO:', data)
      setClos(data.data || [])
    } catch (err) {
      console.error('fetch clo error:', err)
      setClos([])
    }
  }

  useEffect(() => {
    if (section_id) {
      const { term: currentTerm, year: currentYear } = getCurrentTermAndYear()
      setCurrentYear(currentYear)
      fetchCLOPlan()
      fetchCLO()
    }
  }, [section_id])

  if (!result) return null

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle></ContentSubjectTitle>

      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <ContentTitle titlename="การปรับปรุงอย่างต่อเนื่อง" icon={GrPlan} />
        <ContentMotionDIV className="flex flex-col gap-4">
          <ContinuousCard
            title="สรุปผลการประเมิน CLOs"
            type="SUMMARY"
            data={result.summary || []}
            currentYear={currentYear}
            cloOptions={clos}
            onSave={handleSaveDetail}
            onDelete={handleDeleteDetail}
          />
          <ContinuousCard
            title="แนวทางการพัฒนาในการสอนครั้งถัดไป"
            type="NEXT_PLAN"
            data={result.next_plan || []}
            cloOptions={clos}
            currentYear={currentYear}
            onSave={handleSaveDetail}
            onDelete={handleDeleteDetail}
          />
          <ContinuousCard
            title="การสะท้อนคิด (Reflection)"
            type="REFLECTION"
            data={result.reflection || []}
            cloOptions={clos}
            currentYear={currentYear}
            onSave={handleSaveDetail}
            onDelete={handleDeleteDetail}
          />
          <ContinuousCard
            title="การปรับปรุงจากรอบก่อนหน้า"
            type="IMPROVEMENT"
            data={result.improvement_from_previous || []}
            cloOptions={clos}
            currentYear={currentYear}
            onSave={handleSaveDetail}
            onDelete={handleDeleteDetail}
          />
        </ContentMotionDIV>
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default ContinuousImprove

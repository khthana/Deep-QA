import React, { useEffect, useState } from 'react'
import ContentMotionDIV from '../../../ContentMotionDIV'
import ContentSubjectTitle from '../../../ContentSubjectTitle'
import ContentTitle from '../../../ContentTitle'
import { RxActivityLog } from 'react-icons/rx'
import { IoMdAdd } from 'react-icons/io'
import TypeTitle from './TypeTitle'
import ActivityCard from './ActivityCard'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

function LearningActivities() {
  const [sessionExpired, setSessionExpired] = useState(false)
  const navigate = useNavigate()
  const section_id = localStorage.getItem('section_id') || ''
  const [activities, setActivities] = useState([])

  const [filterType, setFilterType] = useState('ทั้งหมด')

  const filteredActivities =
    filterType === 'ทั้งหมด'
      ? activities
      : activities.filter((item) => item.score_category === filterType)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      const section_id = localStorage.getItem('section_id') || ''

      if (!section_id) return

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/activity/get/${section_id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          withCredentials: true,
        },
      )
      if (isSessionExpired(res)) return setSessionExpired(true)
      const data = await res.json()
      // console.log('activities:', data)

      // สมมติ backend คืน data.data
      setActivities(data.result || [])
    } catch (err) {
      console.error('fetch activities error:', err)
    }
  }

  return (
    <ContentMotionDIV className="flex h-full flex-col gap-2">
      <ContentSubjectTitle></ContentSubjectTitle>

      <ContentMotionDIV className="flex h-full flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <div className="inline-flex items-center justify-between align-middle">
          <ContentTitle
            titlename="กิจกรรมการเรียนรู้ในรายวิชา"
            icon={RxActivityLog}
          />
          <div className="inline-flex items-center gap-4">
            <label className="text-m text-gray-600">ประเภทกิจกรรม</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-m rounded-md border border-gray-300 px-3 py-1.5 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {activities.map((type) => (
                <option key={type.score_category} value={type.score_category}>
                  {type.score_category}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => navigate('AddNewActivity')}
              className={
                'flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 font-medium text-white hover:bg-secondary_hover'
              }
            >
              <IoMdAdd className="me-2 h-5 w-5" />
              เพิ่มข้อมูล
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 px-6">
          <ContentMotionDIV className="flex w-full flex-col gap-4 px-6">
            <AnimatePresence>
              {filteredActivities.map((type) => (
                <ContentMotionDIV
                  key={type.score_ratio_id}
                  className="flex flex-col gap-4"
                >
                  <TypeTitle
                    name={type.score_category}
                    ratio={type.weight}
                    quantity={type.activities.length}
                  />

                  <AnimatePresence>
                    {type.activities.length === 0 ? (
                      <EmptyActivityCard />
                    ) : (
                      <AnimatePresence>
                        {type.activities.map((item, idx) => (
                          <ContentMotionDIV
                            key={item.activity_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                          >
                            <ActivityCard
                              idx={idx + 1}
                              Activity={item}
                              fetchActivities={fetchActivities}
                            />
                          </ContentMotionDIV>
                        ))}
                      </AnimatePresence>
                    )}
                  </AnimatePresence>

                  <div className="my-4 w-full" />
                </ContentMotionDIV>
              ))}
            </AnimatePresence>
          </ContentMotionDIV>
        </div>
      </ContentMotionDIV>
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}
export default LearningActivities

const EmptyActivityCard = () => (
  <div className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-6 text-gray-500">
    ไม่มีกิจกรรมในหมวดนี้
  </div>
)

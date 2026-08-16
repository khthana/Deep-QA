import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiDeleteBin6Line } from 'react-icons/ri'
import { MdOutlineRemoveRedEye } from 'react-icons/md'
import DeleteDialog from '../../../DeleteDialog'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'

export default function ActivityCard({ Activity, idx, fetchActivities }) {
  const [sessionExpired, setSessionExpired] = useState(false)
  const navigate = useNavigate()
  const activity = Activity
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleConfirmDelete = async () => {
    try {
      await deleteActivity(Activity.activity_id)
      setDialogOpen(false)
      fetchActivities()
    } catch (err) {
      console.error(err)
    }
  }

  const deleteActivity = async (activityId) => {
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/api/activity/${activityId}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        withCredentials: true,
      },
    )
    if (isSessionExpired(res)) return setSessionExpired(true)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'ลบไม่สำเร็จ')
    return data
  }

  const activityMap = {
    individual: {
      label: 'กิจกรรมเดี่ยว',
      className: 'bg-orange-100 text-orange-500',
    },
    group: {
      label: 'กิจกรรมกลุ่ม',
      className: 'bg-green-100 text-green-600',
    },
  }

  const config = activityMap[activity.activity_type] ?? {
    label: activity.activity_type,
    className: 'bg-gray-100 text-gray-500',
  }

  return (
    <ContentMotionDIV className="inline-flex w-full items-stretch overflow-hidden rounded-lg border py-2 shadow">
      <div className="flex w-20 items-center justify-center bg-white px-4 py-2">
        <span>{idx}</span>
      </div>
      <div className="w-px bg-gray-300"></div>

      <div className="flex flex-1 flex-col justify-center bg-white px-4 py-2">
        <div className="inline-flex items-center gap-2 align-middle">
          <span className="text-lg text-secondary">
            {activity.activity_name}
          </span>
          <span className={`rounded-lg px-2 py-1 text-xs ${config.className}`}>
            {config.label}
          </span>
        </div>
        <span className="text-sm text-gray-500">{activity.description}</span>
      </div>
      <div className="w-px bg-gray-300"></div>

      <div className="flex w-28 flex-col items-center justify-center bg-white px-4 py-2 text-secondary">
        <span className="font-bold">
          {Number.isInteger(Number(activity.total_score))
            ? Number(activity.total_score)
            : parseFloat(activity.total_score).toFixed(2)}
        </span>
        <span className="text-sm">คะแนน</span>
      </div>
      <div className="w-px bg-gray-300"></div>

      <div className="flex w-28 items-center justify-center gap-4 bg-white px-4 py-2">
        <button
          onClick={() =>
            navigate('AddNewActivity', {
              state: { activity_id: activity.activity_id },
            })
          }
        >
          <MdOutlineRemoveRedEye className="text-xl text-blue-700" />
        </button>
        <button con onClick={() => setDialogOpen(true)}>
          <RiDeleteBin6Line className="text-xl text-rose-700" />
        </button>
      </div>
      <DeleteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        Name={activity?.activity_name}
      />
      <SessionExpiredDialog open={sessionExpired} />
    </ContentMotionDIV>
  )
}

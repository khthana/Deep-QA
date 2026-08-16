import { useState, useEffect } from 'react'
import { useUserList } from '../../../../hooks/useUserList'
import ContentMotionDIV from '../../../ContentMotionDIV'
import { LuHistory } from 'react-icons/lu'
import { useOutletContext, useNavigate } from 'react-router-dom'
import ContentTitle from '../../../ContentTitle'
import { FaUserGroup } from 'react-icons/fa6'
import { useMemo } from 'react'
import usePagination from '../../../usePagination'
import { isSessionExpired } from '../../../../utils/session'
import SessionExpiredDialog from '../../../SessionExpiredDialog'
import PageNumber from '../../../PageNumber'
import SeachSection from '../../../SeachSection'
import { AnimatePresence } from 'framer-motion'
import MotionTr from '../../../MotionTr'

function UserHistory() {
  const Role = localStorage.getItem('selectedRole')
  const [sessionExpired, setSessionExpired] = useState(false)
  const navigate = useNavigate()
  const [userLogList, setUserLogList] = useState([])
  const [searchText, setSearchText] = useState('')

const userActivityMapping = {
    LOGIN: {
      label: 'เข้าสู่ระบบ (อีเมลและรหัสผ่าน)',
      class: 'bg-emerald-100 text-emerald-700', // โทนเขียวมรกต
    },
    GOOGLE_LOGIN: {
      label: 'เข้าสู่ระบบ (Google)',
      class: 'bg-sky-100 text-sky-700', // โทนฟ้าสว่าง (ต่างจาก Blue ปกติ)
    },
    LOGOUT: { 
      label: 'ออกจากระบบ', 
      class: 'bg-zinc-100 text-zinc-600' // โทนเทาเข้ม/เหล็ก
    },
    UPDATE_PROFILE: {
      label: 'แก้ไขข้อมูลส่วนตัว',
      class: 'bg-indigo-100 text-indigo-700', // โทนม่วงน้ำเงิน
    },
    CHANGE_PASSWORD: {
      label: 'เปลี่ยนรหัสผ่าน',
      class: 'bg-fuchsia-100 text-fuchsia-700', // โทนม่วงชมพู
    },
    ACTIVE: {
      label: 'เปิดการใช้งานผู้ใช้งาน',
      class: 'bg-lime-100 text-lime-700', // โทนเขียวมะนาว (ต่างจาก Emerald)
    },
    INACTIVE: {
      label: 'ปิดการใช้งานผู้ใช้งาน',
      class: 'bg-orange-100 text-orange-700', // โทนส้มสว่าง
    },
    DELETE_USER: {
      label: 'ลบผู้ใช้งาน',
      class: 'bg-rose-100 text-rose-700', // โทนแดงกุหลาบ
    }
  }

  const filteredUserLogs = useMemo(() => {
    if (!userLogList || userLogList.length === 0) return []
    if (!searchText) return userLogList

    const lower = searchText.toLowerCase()

    return userLogList.filter(log => {
      // ใช้ Object.entries เพื่อไล่เช็คทุก Key-Value ใน Object ตัวนั้นๆ
      return Object.entries(log).some(([key, val]) => {
        if (!val) return false

        // 1. ตรวจสอบกรณีพิเศษ: ฟิลด์ activity ให้เช็คคำแปลภาษาไทยด้วย
        if (key === 'activity') {
          // ดึง label จาก userActivityMapping (ถ้ามี) หรือใช้ Logic เดิมของคุณ
          const activityLabel = userActivityMapping[val]?.label || ''
          if (activityLabel.toLowerCase().includes(lower)) return true
        }

        // 2. ตรวจสอบข้อมูลดิบในฟิลด์นั้นๆ (ครอบคลุม ID, ชื่อ, นามสกุล และค่าภาษาอังกฤษ)
        return val.toString().toLowerCase().includes(lower)
      })
    })
  }, [searchText, userLogList])

  const {
    page,
    setPage,
    currentData,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredUserLogs, 200)

  useEffect(() => {
    fetchUserLogs()
  }, [])

  const fetchUserLogs = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/user/log`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (isSessionExpired(res)) return setSessionExpired(true)

      const result = await res.json()
      setUserLogList(result.data || [])
      // console.log('Fetched user logs:', result.data)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <ContentMotionDIV className="flex h-full flex-col rounded-xl bg-white p-6 shadow">
        <ContentMotionDIV className="flex flex-row justify-between">
          <ContentTitle titlename={'ประวัติการใช้งาน'} icon={LuHistory} />
          <button
            onClick={() => navigate('/main/users')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm active:scale-95"
          >
            <FaUserGroup className="h-4 w-4" />
            แสดงรายชื่อผู้ใช้งาน
          </button>
        </ContentMotionDIV>
        <SeachSection
          addBtAction={false}
          searchText={'ค้นหาประวัติการใช้งาน'}
          onSearch={value => {
            setSearchText(value)
            setPage(1)
          }}
        ></SeachSection>
        <div className="flex h-full flex-col  rounded-xl  bg-white ">
          <table className="w-full rounded-xl text-left text-sm">
            <thead className="border border-t border-gray-200 bg-slate-100">
              <tr>
                <th className="border px-2 py-2 font-bold text-gray-700">
                  ผู้ใช้งาน
                </th>
                <th className="border px-2 py-2 text-center font-bold text-gray-700">
                  กิจกรรม
                </th>
                <th className="border px-2 py-2 font-bold text-gray-700">
                  วันที่
                </th>
                <th className="border px-2 py-2 font-bold text-gray-700">
                  เวลา
                </th>
                <th className="border px-2 py-2 text-center font-bold text-gray-700">
                  รหัสผู้ใช้งาน
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {currentData.length > 0 ? (
                  currentData.map(log => (
                    <MotionTr
                      key={log.id}
                      className="group transition-colors hover:bg-blue-50/30"
                    >
                      <td className="border px-2 py-1">
                        <div className="flex items-center gap-3">
                          <span className=" text-gray-800">
                            {log.title_th}
                            {log.first_name_th} {log.last_name_th}
                          </span>
                        </div>
                      </td>
                      <td className="items-center justify-center border px-2 py-1 text-center">
                        <span
                          className={`inline-flex w-full items-center justify-center rounded-md px-2.5 py-1 text-center text-[10px] ${
                            userActivityMapping[log.activity]?.class ||
                            'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {userActivityMapping[log.activity]?.label ||
                            log.activity ||
                            'ไม่ระบุกิจกรรม'}
                        </span>
                      </td>
                      <td className="border px-2 py-1 text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(log.time_stamp).toLocaleDateString(
                              'th-TH',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="border px-2 py-1 text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-medium ">
                            เวลา{' '}
                            {new Date(log.time_stamp).toLocaleTimeString(
                              'th-TH',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}{' '}
                            น.
                          </span>
                        </div>
                      </td>
                      <td className="border px-2 py-1 text-center">
                        <code className="rounded bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-500 group-hover:bg-white group-hover:shadow-sm">
                          {log.user_id}
                        </code>
                      </td>
                    </MotionTr>
                  ))
                ) : (
                  <MotionTr>
                    <td colSpan="5" className="py-5 text-center text-gray-400 ">
                      ไม่พบข้อมูลประวัติการใช้งาน
                    </td>
                  </MotionTr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
          <PageNumber
            startIndex={startIndex}
            endIndex={endIndex}
            page={page}
            setPage={setPage}
            totalItems={totalItems}
            totalPages={totalPages}
          ></PageNumber>
        </div>
      </ContentMotionDIV>

      <SessionExpiredDialog open={sessionExpired} />
    </div>
  )
}

export default UserHistory

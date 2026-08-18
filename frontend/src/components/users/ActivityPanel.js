import { useCallback, useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import { listActivity } from '../../api/users'

/**
 * What one account has done — #13.
 *
 * Shown beneath the roles panel, for the same reason that one is shown beside
 * the details form: the ticket opens with "an administrator selects a user and
 * reads what that account has done", and the selection is already made by the
 * time this is on screen. That selection is also the filter the third
 * criterion asks for - there is one history per person and it is the person
 * who is open - so there is no second picker here, and no second screen
 * listing everybody's activity at once.
 *
 * The reach is the server's decision. An administrator who cannot reach the
 * account never gets this far, because the row they would have opened it from
 * was not in their list, and asking for it directly is refused (ADR-0002).
 *
 * The paging is server-side. A history grows without bound - it is the only
 * table in the system nothing ever deletes from - so a screen that fetched it
 * whole would get slower every month it is used.
 */

const PAGE_SIZE = 10

/**
 * The activity codes, as a person reads them.
 *
 * Written where the actions are: `recordActivity` is called by the sign-in,
 * account, grant and profile routes, and these are the codes they write. An
 * unrecognised one falls through to the code itself rather than to a blank,
 * because a new activity nobody added a label for should still be visible in
 * an audit rather than silently absent.
 */
const ACTIVITY = {
  LOGIN: 'เข้าสู่ระบบ',
  GOOGLE_LOGIN: 'เข้าสู่ระบบด้วย Google',
  LOGOUT: 'ออกจากระบบ',
  SWITCH_ROLE: 'สลับบทบาทที่ใช้งาน',
  CHANGE_PASSWORD: 'เปลี่ยนรหัสผ่าน',
  CREATE_USER: 'เพิ่มบัญชีผู้ใช้',
  UPDATE_USER: 'แก้ไขข้อมูลผู้ใช้',
  SET_USER_STATUS: 'เปลี่ยนสถานะบัญชี',
  IMPORT_USERS: 'นำเข้าบัญชีผู้ใช้',
  GRANT_ROLE: 'ให้บทบาท',
  REVOKE_ROLE: 'ยกเลิกบทบาท',
}

/**
 * When it happened, in Bangkok time.
 *
 * The second criterion says "the time in the Bangkok timezone", and the zone
 * is named rather than left to the browser. The server sends the instant, so
 * without this the same log line reads as a different hour on a laptop whose
 * clock is set abroad - which for an audit record is the one thing it may not
 * do.
 */
const happenedAt = value =>
  value
    ? new Date(value).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : '—'

export default function ActivityPanel({ user, onError }) {
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState({ entries: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setHistory(await listActivity(user.user_id, { page, per_page: PAGE_SIZE }))
    } catch (error) {
      if (!error.expired) onError(error)
    } finally {
      setLoading(false)
    }
  }, [user.user_id, page, onError])

  useEffect(() => {
    load()
  }, [load])

  const pages = Math.max(1, Math.ceil(history.total / PAGE_SIZE))

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-medium text-primary">ประวัติการใช้งาน</h2>
      <p className="mb-4 text-sm text-gray-500">
        กิจกรรมของบัญชีนี้ เรียงจากล่าสุด เวลาตามเขตเวลากรุงเทพฯ
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">กิจกรรม</th>
              <th className="px-4 py-2">เมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                  กำลังโหลด…
                </td>
              </tr>
            )}
            {!loading && history.entries.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                  ยังไม่มีประวัติการใช้งานของบัญชีนี้
                </td>
              </tr>
            )}
            {!loading &&
              history.entries.map(entry => (
                <tr key={entry.id}>
                  <td className="px-4 py-2">
                    {ACTIVITY[entry.activity] ?? entry.activity}
                  </td>
                  <td className="px-4 py-2">{happenedAt(entry.time_stamp)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          ทั้งหมด {history.total} รายการ · หน้า {history.page ?? page} จาก {pages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-40"
          >
            ก่อนหน้า
          </button>
          <button
            type="button"
            onClick={() => setPage(current => Math.min(pages, current + 1))}
            disabled={page >= pages}
            className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </div>
    </ContentMotionDIV>
  )
}

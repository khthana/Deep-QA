import { useCallback, useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import Pager from '../Pager'
import { listHistory } from '../../api/users'

/**
 * What one account has done — #13.
 *
 * Drawn in two places, because the ticket asks for both: beneath the roles
 * panel of an account that is open, where the administrator already has
 * somebody selected, and on the ประวัติการใช้งาน screen, where they pick the
 * person first (criterion 3's "filterable by user", docs/05 A13). It takes the
 * account it draws and no filter of its own - the picking, wherever it
 * happened, is the filter - so the two entry points cannot disagree about what
 * a history is.
 *
 * It is a list of what this account *did*, not of what was done to it. A line
 * written when an administrator edits this account sits in that
 * administrator's history and names this account in the ทำกับข้อมูล column;
 * "who edited this person" is therefore a search across every account's log,
 * which no screen asks yet (migration 0006).
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
 * The codes `user_log.activity` holds, as a person reads them.
 *
 * Written where the actions are: `recordActivity` is called by the sign-in,
 * account, grant and profile routes, and by the four master-data screens since
 * #58, and these are the codes they write. An unrecognised one falls through to
 * the code itself rather than to a blank, because a new activity nobody added a
 * label for should still be visible in an audit rather than silently absent.
 *
 * `user_log.activity` is `varchar(20)`, which is why the pair of verbs an
 * account's status takes shares one code and why nothing here is longer than
 * `IMPORT_DEPARTMENTS`. A department has no deactivation of its own because it
 * has no status route: switching one off is an edit on its form, and #14's
 * removal refuses rather than deactivating. A programme and a subject do,
 * because their removal deactivates when something depends on the record, and a
 * line saying *deleted* would then be false.
 */
const ACTIONS = {
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
  CREATE_DEPARTMENT: 'เพิ่มภาควิชา',
  UPDATE_DEPARTMENT: 'แก้ไขภาควิชา',
  DELETE_DEPARTMENT: 'ลบภาควิชา',
  IMPORT_DEPARTMENTS: 'นำเข้าภาควิชา',
  CREATE_PROGRAM: 'เพิ่มหลักสูตร',
  UPDATE_PROGRAM: 'แก้ไขหลักสูตร',
  DELETE_PROGRAM: 'ลบหลักสูตร',
  DEACTIVATE_PROGRAM: 'ปิดการใช้งานหลักสูตร',
  IMPORT_PROGRAMS: 'นำเข้าหลักสูตร',
  CREATE_SUBJECT: 'เพิ่มรายวิชา',
  UPDATE_SUBJECT: 'แก้ไขรายวิชา',
  DELETE_SUBJECT: 'ลบรายวิชา',
  DEACTIVATE_SUBJECT: 'ปิดการใช้งานรายวิชา',
  IMPORT_SUBJECTS: 'นำเข้ารายวิชา',
  CREATE_STUDENT: 'เพิ่มนักศึกษา',
  IMPORT_STUDENTS: 'นำเข้านักศึกษา',
}

/**
 * The record the line was written about, as a person reads it.
 *
 * `target_kind` is the sort of record and `target_id` is its own id, and the
 * id is shown raw. Resolving it to a name would mean reading a record the
 * reader may not reach - an administrator reaches the person who acted without
 * necessarily reaching everything that person touched - so a name here would
 * be a disclosure the rest of the screens refuse. The roles panel shows
 * `assigned_by` the same way.
 *
 * Blank for the actions whose only object is the actor's own account, which is
 * what migration 0006 leaves null: signing in and out, switching role, and
 * changing one's own password. An import was on that list until #58 and is not
 * any more - it writes a line per row, each naming the record it wrote, so a
 * twelve-row upload reads as twelve named lines sharing one timestamp.
 */
const TARGETS = {
  USER: 'บัญชีผู้ใช้',
  DEPARTMENT: 'ภาควิชา',
  PROGRAM: 'หลักสูตร',
  SUBJECT: 'รายวิชา',
  STUDENT: 'นักศึกษา',
}

const actedOn = entry =>
  entry.target_id ? `${TARGETS[entry.target_kind] ?? entry.target_kind} ${entry.target_id}` : '—'

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

/**
 * The page number is state of *this account's* history, not of the panel, and
 * the two callers say so with a `key` - so an account swapped underneath draws
 * its first page from its first render, rather than asking for the page number
 * the last one was left on and correcting itself afterwards.
 */
export default function HistoryPanel({ user, onError }) {
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState({ entries: [], total: 0 })
  const [loading, setLoading] = useState(true)

  /**
   * #68 - the answer that is drawn is the answer to the request the screen is
   * still on; without the flag the answer that **arrives** last wins rather
   * than the one asked for last. The rule, the three rows that prove it, and
   * why fifteen panels repeat it rather than share one hook, are written on
   * `frontend/src/pages/Students.js`.
   */
  const load = useCallback(async isCurrent => {
    setLoading(true)
    try {
      const answer = await listHistory(user.user_id, { page, per_page: PAGE_SIZE })
      if (isCurrent()) setHistory(answer)
    } catch (error) {
      if (isCurrent() && !error.expired) onError(error)
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [user.user_id, page, onError])

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-medium text-primary">ประวัติการใช้งาน</h2>
      <p className="mb-4 text-sm text-gray-500">
        กิจกรรมที่บัญชีนี้เป็นผู้ลงมือ เรียงจากล่าสุด เวลาตามเขตเวลากรุงเทพฯ
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">กิจกรรม</th>
              <th className="px-4 py-2">ทำกับข้อมูล</th>
              <th className="px-4 py-2">เมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  กำลังโหลด…
                </td>
              </tr>
            )}
            {!loading && history.entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  ยังไม่มีประวัติการใช้งานของบัญชีนี้
                </td>
              </tr>
            )}
            {!loading &&
              history.entries.map(entry => (
                <tr key={entry.id}>
                  <td className="px-4 py-2">
                    {ACTIONS[entry.activity] ?? entry.activity}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{actedOn(entry)}</td>
                  <td className="px-4 py-2">{happenedAt(entry.time_stamp)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pager
        page={page}
        shown={history.page}
        total={history.total}
        perPage={PAGE_SIZE}
        onPage={setPage}
        className="mt-4"
      />
    </ContentMotionDIV>
  )
}

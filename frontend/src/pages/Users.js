import { useCallback, useEffect, useState } from 'react'

import HistoryPanel from '../components/users/HistoryPanel'
import ContentMotionDIV from '../components/ContentMotionDIV'
import GrantsPanel from '../components/users/GrantsPanel'
import ImportPanel from '../components/ImportPanel'
import UserForm from '../components/users/UserForm'
import { personName } from '../components/users/personName'
import { roleName } from '../components/MapRole'
import {
  createUser,
  importTemplate,
  importUsers,
  listUsers,
  setUserStatus,
  updateUser,
} from '../api/users'

/**
 * ผู้ใช้งานระบบ — tickets #11, #12 and #13.
 *
 * Who exists, who may be added, whose account is switched off, for how long an
 * external assessor's account works, and - #12 - which roles each person holds
 * and at what scope. Reached by the Central Admin and by the
 * administrators below them, whose sidebars carry the entry (docs/05 A11) and
 * who now reach the route as well - #10 left it open to the Central Admin alone
 * because that was all that ticket needed, and #11's eighth criterion is what
 * settles it.
 *
 * Nothing on this screen decides what the person may see or do. The list
 * arrives already narrowed to the accounts their acting grant reaches, and
 * every write is refused server-side on the same rule; the screen draws what it
 * was given (ADR-0002). So a department administrator's page is short not
 * because it filtered, but because that is what the server sent.
 *
 * The paging is server-side, which is the difference between the criterion
 * being met and appearing to be: a screen that fetched every account and
 * sliced ten off the front would look identical and would still be sending the
 * whole university down the wire.
 */

const PAGE_SIZE = 10

const STATUS = {
  active: { label: 'ใช้งานอยู่', className: 'bg-green-100 text-green-800' },
  inactive: { label: 'ถูกระงับ', className: 'bg-gray-200 text-gray-700' },
}

const control =
  'rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

/** The window as a person reads it, or a dash for an account that has none. */
const windowOf = user => {
  if (!user.valid_from && !user.valid_until) return '—'
  return `${user.valid_from ?? '…'} ถึง ${user.valid_until ?? '…'}`
}

export default function Users() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ q: '', role: '', status: '' })
  const [data, setData] = useState({ users: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await listUsers({ ...filters, page, per_page: PAGE_SIZE }))
    } catch (error) {
      // A 401 already raises the shell's dialog; saying it again here would
      // put a banner behind that dialog.
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    load()
  }, [load])

  // Memoised because the grants panel re-reads its list whenever its error
  // handler changes identity: a fresh closure every render would put that read
  // in a loop.
  const report = useCallback(error => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

  const save = async draft => {
    setBusy(true)
    try {
      if (editing?.user_id) await updateUser(editing.user_id, draft)
      else await createUser(draft)
      setEditing(null)
      setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })
      await load()
    } catch (error) {
      report(error)
    } finally {
      setBusy(false)
    }
  }

  const toggle = async user => {
    const next = user.status === 'active' ? 'inactive' : 'active'
    try {
      await setUserStatus(user.user_id, next)
      setNotice({
        error: false,
        message:
          next === 'inactive'
            ? 'ระงับการใช้งานบัญชีเรียบร้อยแล้ว'
            : 'เปิดใช้งานบัญชีเรียบร้อยแล้ว',
      })
      await load()
    } catch (error) {
      report(error)
    }
  }

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))

  // A filter changing has to send the reader back to the first page: staying
  // on page four of a result that now has one page shows an empty table and
  // reads as "no such user".
  const filter = key => event => {
    const { value } = event.target
    setPage(1)
    setFilters(current => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {notice && (
        <ContentMotionDIV
          className={`rounded-lg p-3 text-sm ${
            notice.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}
        >
          {notice.message}
        </ContentMotionDIV>
      )}

      {editing ? (
        <>
          <UserForm
            user={editing.user_id ? editing : null}
            onSubmit={save}
            onCancel={() => setEditing(null)}
            busy={busy}
          />
          {/*
            Only for an account that exists. A grant needs somebody to grant it
            to, and the first one is made with the account by the form above;
            everything after it is #12 and is managed here, one at a time.
          */}
          {editing.user_id && <GrantsPanel user={editing} onError={report} />}
          {/*
            #13, and the same condition for the same reason: a history is what
            an account has done, and an account being added has done nothing.
          */}
          {editing.user_id && <HistoryPanel user={editing} onError={report} />}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <input
                className={`${control} w-64`}
                value={filters.q}
                onChange={filter('q')}
                placeholder="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้"
              />
              <select
                className={control}
                value={filters.role}
                onChange={filter('role')}
              >
                <option value="">ทุกบทบาท</option>
                {[
                  'FULL_ADMIN',
                  'FACULTY_ADMIN',
                  'DEPT_ADMIN',
                  'PROG_MANAGER',
                  'TEACHER',
                  'EXT_ASSESSOR',
                ].map(role => (
                  <option key={role} value={role}>
                    {roleName(role)}
                  </option>
                ))}
              </select>
              <select
                className={control}
                value={filters.status}
                onChange={filter('status')}
              >
                <option value="">ทุกสถานะ</option>
                <option value="active">ใช้งานอยู่</option>
                <option value="inactive">ถูกระงับ</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setEditing({})}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
            >
              เพิ่มผู้ใช้งาน
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสผู้ใช้</th>
                  <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">บทบาท</th>
                  <th className="px-4 py-3">ช่วงเวลาใช้งาน</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      กำลังโหลด…
                    </td>
                  </tr>
                )}
                {!loading && data.users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.users.map(user => (
                    <tr key={user.user_id}>
                      <td className="px-4 py-3">{user.user_id}</td>
                      <td className="px-4 py-3">
                        {personName(user)}
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        {(user.roles ?? [])
                          .map(grant => `${roleName(grant.role_id)} (${grant.scope_id})`)
                          .join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3">{windowOf(user)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            STATUS[user.status]?.className ?? ''
                          }`}
                        >
                          {STATUS[user.status]?.label ?? user.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditing(user)}
                          className="rounded-lg px-3 py-1.5 text-secondary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => toggle(user)}
                          className="rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-100"
                        >
                          {user.status === 'active' ? 'ระงับ' : 'เปิดใช้งาน'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              ทั้งหมด {data.total} รายการ · หน้า {data.page ?? page} จาก {pages}
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

          <ImportPanel
            title="นำเข้าผู้ใช้งานจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย"
            templateName="users-template.csv"
            fetchTemplate={importTemplate}
            send={importUsers}
            onImported={() => {
              setPage(1)
              load()
            }}
            onError={report}
          />
        </>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import HistoryPanel from '../components/users/HistoryPanel'
import { personName } from '../components/users/personName'
import { listUsers } from '../api/users'

/**
 * ประวัติการใช้งาน — #13.
 *
 * The screen docs/05 A13 names at `/main/users/user-history`, and the third
 * criterion's "filterable by user": an administrator arrives with a question
 * about a person rather than about an account record, picks the person here,
 * and reads what they did. The same history is also on the account's edit form,
 * where the administrator already has somebody open - the two entry points are
 * the same panel, so they cannot disagree.
 *
 * The picker is fed by `GET /api/users`, which arrives already narrowed to the
 * accounts the acting grant reaches. So the list cannot offer a person this
 * administrator may not read, and the history route refuses them a second time
 * anyway if they ask for one directly (ADR-0002). Neither refusal is drawn
 * here.
 *
 * The search box narrows the picker rather than the history. A `<select>` is
 * unusable at university scale, so it holds one server page of matches and says
 * how many matched in total when there are more than fit.
 */

const PICKER_SIZE = 100

const control =
  'rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

/** The account as the picker lists it: the name, then the id that is stored. */
const pickerLabel = user => `${personName(user)} (${user.user_id})`

export default function UserHistory() {
  const [q, setQ] = useState('')
  const [found, setFound] = useState({ users: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [chosen, setChosen] = useState(null)
  const [notice, setNotice] = useState(null)

  const report = useCallback(error => {
    // A 401 already raises the shell's dialog; saying it again here would put a
    // banner behind that dialog.
    if (!error.expired) setNotice(error.message)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setFound(await listUsers({ q, page: 1, per_page: PICKER_SIZE }))
    } catch (error) {
      report(error)
    } finally {
      setLoading(false)
    }
  }, [q, report])

  useEffect(() => {
    load()
  }, [load])

  // The chosen account has to survive the search box being retyped, so it is
  // held whole rather than looked up in a list that is about to change. It is
  // dropped only when the search no longer offers it, because a history left on
  // screen under a filter that excludes its owner reads as a filter that did
  // nothing.
  useEffect(() => {
    if (loading || !chosen) return
    if (!found.users.some(user => user.user_id === chosen.user_id)) setChosen(null)
  }, [found, loading, chosen])

  return (
    <div className="space-y-6">
      {/* This screen keeps its notice as a bare string, and every one of them
          is a refusal, so the shape the shared banner takes is built here. */}
      <Notice notice={notice && { error: true, message: notice }} />

      <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-medium text-primary">เลือกผู้ใช้งาน</h2>
        <p className="mb-4 text-sm text-gray-500">
          เลือกได้เฉพาะบัญชีที่อยู่ในขอบเขตสิทธิ์ของบทบาทที่ใช้งานอยู่
        </p>

        <div className="flex flex-wrap gap-3">
          <input
            className={`${control} w-64`}
            value={q}
            onChange={event => setQ(event.target.value)}
            placeholder="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้"
          />
          <select
            className={`${control} w-80`}
            value={chosen?.user_id ?? ''}
            onChange={event =>
              setChosen(
                found.users.find(user => user.user_id === event.target.value) ?? null
              )
            }
            disabled={loading}
          >
            <option value="">— เลือกผู้ใช้งาน —</option>
            {found.users.map(user => (
              <option key={user.user_id} value={user.user_id}>
                {pickerLabel(user)}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          {loading && 'กำลังโหลดรายชื่อ…'}
          {!loading && found.total === 0 && 'ไม่พบผู้ใช้งานตามคำค้นนี้'}
          {!loading && found.total > PICKER_SIZE && (
            <>
              พบ {found.total} บัญชี แสดงให้เลือก {PICKER_SIZE} บัญชีแรก —
              พิมพ์คำค้นเพื่อให้แคบลง
            </>
          )}
        </p>
      </ContentMotionDIV>

      {chosen ? (
        // Keyed by the account: the picker can swap it, and page four of the
        // last person's history is not page four of this one's - on a shorter
        // history it is nothing at all, which reads as "this person did
        // nothing". A fresh panel starts on page one before it asks anything.
        <HistoryPanel key={chosen.user_id} user={chosen} onError={report} />
      ) : (
        <ContentMotionDIV className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-slate-500">
          เลือกผู้ใช้งานเพื่อดูประวัติการใช้งานของบัญชีนั้น
        </ContentMotionDIV>
      )}
    </div>
  )
}

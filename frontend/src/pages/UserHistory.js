import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaUserGroup } from 'react-icons/fa6'
import { LuHistory } from 'react-icons/lu'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import Pager from '../components/Pager'
import SearchBox from '../components/SearchBox'
import {
  actedOn,
  activityOf,
  badgeOf,
  dayOf,
  timeOf,
} from '../components/users/historyEntry'
import { personName } from '../components/users/personName'
import { listAllHistory } from '../api/users'

/**
 * ประวัติการใช้งาน — #13, given back its delivered table by #305.
 *
 * `docs/users-screen.md` rule 11, the owner's answer of 22 November 2569: one
 * table of every account's entries, as `DEEP-QA-FRONTEND/.../userLogs.js` drew
 * it - ผู้ใช้งาน · กิจกรรม in a coloured badge · วันที่ · เวลา · รหัสผู้ใช้งาน -
 * with a search box over it and แสดงรายชื่อผู้ใช้งาน to go back, reached from
 * the แสดงประวัติการใช้งาน button on ข้อมูลผู้ใช้งาน and no longer from the
 * menu. The last column, ทำกับข้อมูล, is #13's and was kept by that answer,
 * because a table of everybody's lines that does not say whom a line was about
 * cannot answer *who suspended whom*. Until #305 the page was a picker over one
 * account's history at a time.
 *
 * The rows are the server's (`GET /api/history`): newest first, a page at a
 * time, and narrowed to the accounts the acting grant reaches **in the read**,
 * so a department administrator's pages count only the lines they are shown
 * (ADR-0002). The delivered table fetched the whole log and paged and searched
 * it in the browser, which is the shape a log - the one table nothing deletes
 * from - cannot keep.
 *
 * The search box is #272's shared `SearchBox`, and since #305 it narrows the
 * lines rather than a picker: by the acting account's id, email or names, or by
 * the id of the record a line was about, so an account's id finds what was
 * done to it as well as what it did. The activity's Thai wording is this
 * screen's and the server does not hold it, so a search by activity is not
 * offered - the implementer's choice, written on the sheet.
 */

const PAGE_SIZE = 10

// pager-last-page: the rule the owner settled on 19 ตุลาคม 2569 (#209) is not
// here, because this screen writes nothing and the list it draws is a log,
// which only ever gains entries: no press of its own can take away the page it
// is standing on. Its one filter, the search box, puts the reader back on page
// one as it changes. Measured for the panel this replaces on 28 ตุลาคม 2569
// (#239) and again for this table on 24 พฤศจิกายน 2569 (#305). A second actor
// is a different question and this marker says nothing about it (#222).
export default function UserHistory() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState({ entries: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  // This screen keeps its notice as a bare string, and every one of them is a
  // refusal. `Notice` scrolls itself into view when the object it is given
  // changes, so building one inline would scroll on every render - #55.
  const banner = useMemo(
    () => (notice ? { error: true, message: notice } : null),
    [notice],
  )

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
      const answer = await listAllHistory({ q, page, per_page: PAGE_SIZE })
      if (isCurrent()) setHistory(answer)
    } catch (error) {
      // A 401 already raises the shell's dialog; saying it again here would put
      // a banner behind that dialog.
      if (isCurrent() && !error.expired) setNotice(error.message)
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [q, page])

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  return (
    <ContentMotionDIV className="space-y-6 rounded-xl border bg-white p-6 shadow">
      <div className="flex flex-row items-center justify-between gap-4">
        <h1 className="inline-flex items-center text-2xl font-medium text-secondary">
          <LuHistory aria-hidden="true" className="me-2 h-6 w-6 text-secondary" />
          ประวัติการใช้งาน
        </h1>
        <button
          type="button"
          onClick={() => navigate('/main/users')}
          className="flex max-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm active:scale-95"
        >
          <FaUserGroup aria-hidden="true" className="h-4 w-4" />
          แสดงรายชื่อผู้ใช้งาน
        </button>
      </div>

      <Notice notice={banner} />

      <SearchBox
        label="ค้นหาประวัติการใช้งาน"
        value={q}
        onSearch={term => {
          setPage(1)
          setQ(term)
        }}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border border-gray-200 bg-slate-100">
            <tr>
              <th className="border px-2 py-2 font-bold text-gray-700">ผู้ใช้งาน</th>
              <th className="border px-2 py-2 text-center font-bold text-gray-700">กิจกรรม</th>
              <th className="border px-2 py-2 font-bold text-gray-700">วันที่</th>
              <th className="border px-2 py-2 font-bold text-gray-700">เวลา</th>
              <th className="border px-2 py-2 text-center font-bold text-gray-700">
                รหัสผู้ใช้งาน
              </th>
              <th className="border px-2 py-2 font-bold text-gray-700">ทำกับข้อมูล</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="py-5 text-center text-slate-500">
                  กำลังโหลด…
                </td>
              </tr>
            )}
            {!loading && history.entries.length === 0 && (
              <tr>
                <td colSpan={6} className="py-5 text-center text-gray-400">
                  ไม่พบข้อมูลประวัติการใช้งาน
                </td>
              </tr>
            )}
            {!loading &&
              history.entries.map(entry => (
                <tr key={entry.id} className="group transition-colors hover:bg-blue-50/30">
                  <td className="border px-2 py-1 text-gray-800">{personName(entry)}</td>
                  <td className="border px-2 py-1 text-center">
                    <span
                      className={`inline-flex w-full items-center justify-center rounded-md px-2.5 py-1 text-center text-[10px] ${badgeOf(entry)}`}
                    >
                      {activityOf(entry)}
                    </span>
                  </td>
                  <td className="border px-2 py-1 font-medium text-gray-600">
                    {dayOf(entry.time_stamp)}
                  </td>
                  <td className="border px-2 py-1 font-medium text-gray-600">
                    {timeOf(entry.time_stamp)}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <code className="rounded bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-500 group-hover:bg-white group-hover:shadow-sm">
                      {entry.user_id}
                    </code>
                  </td>
                  <td className="border px-2 py-1 text-slate-600">{actedOn(entry)}</td>
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
      />
    </ContentMotionDIV>
  )
}

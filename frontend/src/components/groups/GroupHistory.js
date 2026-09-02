import { useCallback, useEffect, useState } from 'react'

import Pager from '../Pager'

/**
 * ประวัติการเปลี่ยนแปลงกลุ่มงาน — #26's sixth criterion.
 *
 * The panel exists for one conversation: a student says they were moved out of
 * their group, and somebody has to be able to say whether they were, by whom
 * and when. So every line is a sentence about an act rather than a row of
 * columns to be decoded, and the five acts are the five the server can write —
 * the schema's `action_type` holds exactly those and nothing else.
 *
 * ## The names in a line are two different kinds of name
 *
 * `group_name` on the entry is the name the group had *at the time*, copied
 * into the log when the line was written; `old_group_name` and `new_group_name`
 * are looked up now. That is what the schema kept and what it did not, and the
 * difference shows in one place only: a group deleted since answers null for
 * whichever side of a move it was on, and the line falls back to the copy. The
 * fallback is never wrong, because the copy on a MOVE_STUDENT line is the group
 * the student went *to* — it is only shorter than it would have been.
 *
 * ## A rename is not in here
 *
 * There is no entry for one, deliberately: see `routes/workGroups.js`. What a
 * rename would have recorded, every earlier line already carries.
 */

/** When it happened, in Bangkok time — `users/HistoryPanel`'s reason, verbatim. */
const happenedAt = value =>
  value
    ? new Date(value).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : '—'

/** The group a name is missing for: deleted since, and said so rather than blank. */
const GONE = 'กลุ่มที่ถูกลบแล้ว'

const who = entry => entry.student_name ?? entry.student_id ?? '—'

/**
 * One entry as the sentence a person reads.
 *
 * Not `sentenceOf`, which `backend/lib/importer.js` owns for a different
 * mapping — a refusal to its wording. One name for two jobs in one repo reads
 * as one job until somebody goes looking for the other.
 */
const readsAs = entry => {
  switch (entry.action_type) {
    case 'CREATE_GROUP':
      return `สร้างกลุ่ม ${entry.group_name}`
    case 'DELETE_GROUP':
      return `ลบกลุ่ม ${entry.group_name}`
    case 'ADD_STUDENT':
      return `เพิ่ม ${who(entry)} เข้ากลุ่ม ${entry.group_name}`
    case 'REMOVE_STUDENT':
      return `นำ ${who(entry)} ออกจากกลุ่ม ${entry.group_name}`
    case 'MOVE_STUDENT':
      return `ย้าย ${who(entry)} จากกลุ่ม ${entry.old_group_name ?? GONE} ไปกลุ่ม ${
        entry.new_group_name ?? entry.group_name
      }`
    default:
      return entry.action_type
  }
}

export default function GroupHistory({ fetchPage, onError }) {
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState({ entries: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setHistory(await fetchPage(page))
    } catch (error) {
      onError?.(error)
    } finally {
      setLoading(false)
    }
    // `fetchPage` is a fresh closure on every render of the screen above, so it
    // cannot be a dependency without reloading forever. The page number is what
    // this panel reads, and it is the dependency that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-base font-medium text-primary">ประวัติการเปลี่ยนแปลงกลุ่มงาน</h2>
        <p className="mt-1 text-sm text-slate-500">
          การสร้าง ลบ เพิ่ม นำออก และย้ายกลุ่ม เรียงจากล่าสุด · ทั้งหมด {history.total} รายการ
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-gray-200 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">เมื่อ</th>
              <th className="px-4 py-3 font-medium">สิ่งที่เกิดขึ้น</th>
              <th className="px-4 py-3 font-medium">โดย</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  กำลังโหลด…
                </td>
              </tr>
            )}
            {!loading && history.entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  ยังไม่มีการเปลี่ยนแปลงกลุ่มงานในตอนเรียนนี้
                </td>
              </tr>
            )}
            {!loading &&
              history.entries.map(entry => (
                <tr key={entry.log_id} className="border-b border-gray-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {happenedAt(entry.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{readsAs(entry)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {entry.performed_by_name || entry.performed_by || '—'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pager
        page={page}
        shown={history.page}
        total={history.total}
        perPage={history.per_page}
        onPage={setPage}
        className="border-t border-gray-200 px-4 py-3"
      />
    </div>
  )
}

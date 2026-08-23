import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2'

import CloForm from '../components/clos/CloForm'
import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import {
  createCourseOutcome,
  deleteCourseOutcome,
  getCourseOutcomes,
  updateCourseOutcome,
} from '../api/clos'

/**
 * ผลการเรียนรู้รายวิชา — ticket #27.
 *
 * What this รายวิชา teaches towards in one ปีการศึกษา, each outcome tied to a
 * ผลการเรียนรู้ของหลักสูตร. Reached from a ตอนเรียน and belonging to none of
 * them: ADR-0003 puts the set at the (หลักสูตร, รายวิชา, ปีการศึกษา) grain, and
 * this screen's whole job on top of the list is to make that visible, because a
 * Teacher who does not know it will not understand why their colleague's edit
 * appeared in their list.
 *
 * ## The line at the top is the point of the screen
 *
 * The heading says the รายวิชา and the ปีการศึกษา, and then a sentence says in
 * words that every ตอนเรียน of this Offering shares this set. Both the third
 * and the fourth criteria are about a person's expectations rather than about
 * data — the data is correct either way — and the only place to meet an
 * expectation is before it is formed.
 *
 * ## Who last changed it
 *
 * The seventh criterion, and it is on every row rather than behind a hover or a
 * detail pane. Two ผู้สอน of two ตอนเรียน edit one list and the last write wins
 * (ADR-0003); the name and the time are how the loser finds out. `updated_by`
 * is a `user_id` on the wire and a person on the screen — the server does the
 * join, because a screen fetching a name per row would be nine round trips for
 * a list of nine.
 *
 * ## Removal
 *
 * The ninth criterion is the confirmation and it is this screen's, not the
 * server's: there is nothing for a server to confirm against. The eighth is the
 * server's, and it answers three different sentences depending on what is
 * pointing at the CLO — marks, an Activity mapping, or the course-cycle plan.
 * None of them is reworded here. The screen shows what the server said, because
 * the server is the only thing that knows which of the three it is, and a
 * screen guessing would guess wrong on the day someone adds a fourth.
 */
export default function CourseOutcomes() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getCourseOutcomes(sectionId))
    } catch (error) {
      setData(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Save, whether that is an add or an edit.
   *
   * `editing` is the CLO being changed or the string 'new'; nothing else opens
   * the form, so the branch is the whole of the difference between the two
   * calls. The list is reloaded rather than patched in place, because a set two
   * people are editing is a set whose other rows may also have moved.
   */
  const save = async draft => {
    setBusy(true)
    setNotice(null)
    try {
      if (editing === 'new') await createCourseOutcome(sectionId, draft)
      else await updateCourseOutcome(sectionId, editing.clo_id, draft)
      setEditing(null)
      await load()
      setNotice({ error: false, message: 'บันทึกผลการเรียนรู้รายวิชาแล้ว' })
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await deleteCourseOutcome(sectionId, removing.clo_id)
      setRemoving(null)
      await load()
      setNotice({ error: false, message: 'ลบผลการเรียนรู้รายวิชาแล้ว' })
    } catch (error) {
      // The dialog closes either way. Leaving it open over a refusal puts the
      // banner behind it and offers the same button again, and pressing it
      // again cannot do anything different.
      setRemoving(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {!loading && data && (
        <>
          <div>
            <p className="text-xs font-medium text-slate-400">
              {data.offering.subject_id}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">
              ผลการเรียนรู้รายวิชา
            </h1>
            {/* The grain, in words. ADR-0003 in a sentence a ผู้สอน can act on. */}
            <p className="mt-2 text-sm text-slate-500">
              ปีการศึกษา {data.offering.academic_year} · ทุกตอนเรียนของรายวิชานี้ใน
              ปีการศึกษาเดียวกันใช้ชุดเดียวกันนี้ และปีการศึกษาอื่นมีชุดของตัวเอง
            </p>
          </div>

          {editing ? (
            <CloForm
              clo={editing === 'new' ? null : editing}
              plos={data.plos}
              busy={busy}
              onSubmit={save}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
            >
              เพิ่มผลการเรียนรู้รายวิชา
            </button>
          )}

          {data.clos.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500">
              ยังไม่มีผลการเรียนรู้รายวิชาในปีการศึกษา {data.offering.academic_year}
            </p>
          )}

          {/* Each item named by its own code, for SectionsPanel's reason: the
              cards carry the same two buttons as each other and differ only in
              their heading, so the code is the browser seam's only handle. */}
          <ul className="space-y-3">
            {data.clos.map(clo => (
              <li
                key={clo.clo_id}
                aria-label={clo.clo_number}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium text-gray-900">
                      {clo.clo_number} {clo.clo_detail}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {clo.plo_code
                        ? `รองรับ ${clo.plo_code} ${clo.plo_title}`
                        : 'ยังไม่ได้ระบุผลการเรียนรู้ของหลักสูตรที่รองรับ'}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(clo)}
                      aria-label={`แก้ไข ${clo.clo_number}`}
                      className="rounded-lg p-2 text-primary hover:bg-blue-50"
                    >
                      <HiOutlinePencil className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoving(clo)}
                      aria-label={`ลบ ${clo.clo_number}`}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <HiOutlineTrash className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-400">วิธีการสอน</dt>
                    <dd className="text-slate-600">{clo.teaching_method || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">วิธีการวัดผล</dt>
                    <dd className="text-slate-600">{clo.assessment_method || '—'}</dd>
                  </div>
                </dl>

                <p className="mt-3 text-xs text-slate-400">
                  แก้ไขล่าสุดโดย {clo.updated_by_name || clo.updated_by || '—'} เมื่อ{' '}
                  {changedAt(clo.updated_at)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ลบผลการเรียนรู้รายวิชา"
        message={
          removing
            ? `ต้องการลบ ${removing.clo_number} ออกจากปีการศึกษา ${data?.offering.academic_year} หรือไม่ ทุกตอนเรียนของรายวิชานี้จะไม่เห็นข้อนี้อีก`
            : ''
        }
        confirmLabel="ลบ"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </ContentMotionDIV>
  )
}

/**
 * When it was last changed, in Bangkok time — `HistoryPanel`'s reason.
 *
 * The server sends the instant; the zone is named rather than left to the
 * browser, so that two ผู้สอน editing one set do not read the same edit as
 * having happened at two different hours.
 */
const changedAt = value =>
  value
    ? new Date(value).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'

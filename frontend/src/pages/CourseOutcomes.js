import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

  // #133 - what is drawn is the answer to the request the screen still wants.
  // Every parameter comes from `useParams` and every link goes up a level,
  // so nothing here can supersede a request today: this is #68's rule
  // (`frontend/src/pages/Students.js`), not a defect anybody has seen, and the
  // sheet says ยังไม่ได้ทดสอบ rather than ไม่ต้องมี.
  const load = useCallback(async isCurrent => {
    setLoading(true)
    try {
      const answer = await getCourseOutcomes(sectionId)
      if (isCurrent()) setData(answer)
    } catch (error) {
      if (isCurrent()) {
        setData(null)
        if (!error.expired) setNotice({ error: true, message: error.message })
      }
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  /**
   * #140 - the list a handler reloads is drawn only if it is still the list the
   * screen is on: nothing tears a handler down, so it asks whether `load` is
   * still the one it was sent with. `frontend/src/pages/Students.js` carries the
   * reasons. For the reason #133 gives above `load`, nothing here can change
   * what `load` asks for while a reload is out, so no row proves this and the
   * sheet says ยังไม่ได้ทดสอบ rather than ไม่ต้องมี.
   */
  const onScreen = useRef(load)
  useEffect(() => {
    onScreen.current = load
  }, [load])

  /**
   * The last thing that opened on this screen - #146.
   *
   * The list under the form is drawn whether or not one is open and disables
   * nothing, so another row's pencil replaces the form while a save is still
   * out - here without even the ยกเลิก the list screens need. Closed unasked,
   * the save's answer took that second form away with whatever had been typed
   * into it, and put its own sentence where it reads as being about the record
   * now on the screen.
   *
   * So the save asks the question a read already asks on the screens that read
   * a row before opening one (#139): *is the screen still where it was when I
   * was sent*. The ref holds the last thing that opened here, written by every
   * control that opens one, and a save whose answer finds a different opening
   * closes nothing and says nothing, neither its banner nor its refusal. ยกเลิก
   * writes nothing and neither does the save that closes its own form: a save
   * that finds nothing in the form's place says what it did, which is the half
   * of #146 the advisor answered. `Departments.js` carries the reasons;
   * `146a-save-closes-a-later-form.spec.js` has the rows.
   *
   * The reload that follows is a second window, and the question is asked
   * again when it lands. Since #149 the list stays drawn while a reload is out
   * - blanking it took down whatever form was open, and what had been typed
   * went with it - so a pencil can be pressed before the answer is back. The
   * banner is set after the reload, and only when nothing has opened since the
   * save was sent; a removal asks the same of its own banner. The rows are in
   * `149a-reload-keeps-the-open-form.spec.js`.
   */
  const showing = useRef(null)

  /**
   * Save, whether that is an add or an edit.
   *
   * `editing` is the CLO being changed or the string 'new'; nothing else opens
   * the form, so the branch is the whole of the difference between the two
   * calls. The list is reloaded rather than patched in place, because a set two
   * people are editing is a set whose other rows may also have moved.
   */
  const save = async draft => {
    const sent = showing.current
    setBusy(true)
    setNotice(null)
    try {
      if (editing === 'new') await createCourseOutcome(sectionId, draft)
      else await updateCourseOutcome(sectionId, editing.clo_id, draft)
      const mine = showing.current === sent
      if (mine) {
        setEditing(null)
      }
      await load(() => onScreen.current === load)
      if (showing.current === sent)
        setNotice({ error: false, message: 'บันทึกผลการเรียนรู้รายวิชาแล้ว' })
    } catch (error) {
      if (showing.current === sent && !error.expired)
        setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    const sent = showing.current
    setBusy(true)
    setNotice(null)
    try {
      await deleteCourseOutcome(sectionId, removing.clo_id)
      setRemoving(null)
      await load(() => onScreen.current === load)
      if (showing.current === sent)
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

      {loading && !data && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {data && (
        <>
          <div>
            <p className="text-xs font-medium text-slate-400">
              {data.offering.subject_id}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">
              ผลการเรียนรู้รายวิชา
            </h1>
            {/*
              The grain, in words. ADR-0003 in a sentence a ผู้สอน can act on.

              The line break falls before และ, where a space belongs, and nowhere
              else. JSX joins two lines of text with one space, so a break placed
              for the sake of the margin puts that space on the screen — and Thai
              does not space between words, so it lands in the middle of a word.
              This sentence had one inside ในปีการศึกษา until somebody read it
              aloud on 23 ส.ค. 2569. Nothing in either seam noticed: every
              assertion matches on a fragment rather than on the whole sentence.
            */}
            <p className="mt-2 text-sm text-slate-500">
              ปีการศึกษา {data.offering.academic_year} ·
              ทุกตอนเรียนของรายวิชานี้ในปีการศึกษาเดียวกันใช้ชุดเดียวกันนี้
              และปีการศึกษาอื่นมีชุดของตัวเอง
            </p>
          </div>

          {editing ? (
            <CloForm
              clo={editing === 'new' ? null : editing}
              plos={data.plos}
              busy={busy}
              onSubmit={save}
              onCancel={() => {
                // ยกเลิก does not write this: a form closing is nobody taking the
                // screen, and a save still out is owed its sentence (#146).
                setEditing(null)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                showing.current = {}
                setEditing('new')
              }}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
            >
              เพิ่มผลการเรียนรู้รายวิชา
            </button>
          )}

          {data.clos.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500">
              ยังไม่มีผลการเรียนรู้รายวิชาในปีการศึกษา{' '}
              {data.offering.academic_year}
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
                      onClick={() => {
                        showing.current = {}
                        setEditing(clo)
                      }}
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
                    <dd className="text-slate-600">
                      {clo.teaching_method || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">วิธีการวัดผล</dt>
                    <dd className="text-slate-600">
                      {clo.assessment_method || '—'}
                    </dd>
                  </div>
                </dl>

                {/* The ways into #28 and #29, and each carries the CLO — the
                    criteria link on a rubric card, one screen over. */}
                <div className="mt-3 flex gap-4">
                  <Link
                    to={`/teacher/teacherDashboard/${sectionId}/courseOutcomes/${clo.clo_id}/behaviors`}
                    aria-label={`พฤติกรรมบ่งชี้ของ ${clo.clo_number}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    พฤติกรรมบ่งชี้
                  </Link>
                  <Link
                    to={`/teacher/teacherDashboard/${sectionId}/courseOutcomes/${clo.clo_id}/criteria`}
                    aria-label={`เกณฑ์การบรรลุผลของ ${clo.clo_number}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    เกณฑ์การบรรลุผล
                  </Link>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  แก้ไขล่าสุดโดย {clo.updated_by_name || clo.updated_by || '—'}{' '}
                  เมื่อ {changedAt(clo.updated_at)}
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

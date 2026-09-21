import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  HiOutlineArrowLeft,
  HiOutlinePencil,
  HiOutlineTrash,
} from 'react-icons/hi2'

import CriterionForm from '../components/achievements/CriterionForm'
import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import {
  createCriterion,
  deleteCriterion,
  getCriteria,
  updateCriterion,
} from '../api/achievements'

/**
 * เกณฑ์การบรรลุผลตาม CLO — ticket #29.
 *
 * What performance looks like at each of the four bands, so a raw mark
 * translates into an attainment level rather than being judged ad hoc.
 * Reached from a CLO's card on #27's screen beside the way into #28, and
 * inheriting that screen's grain whole: the set belongs to the CLO, the CLO
 * belongs to the Offering, and neither belongs to the ตอนเรียน in the
 * address. The heading says so for the reason #27's does — the data is
 * correct either way, and the only place to meet an expectation is before it
 * is formed.
 *
 * Everything MeasurableBehaviors says about the numbers and about removal
 * holds here unchanged — ข้อ 1..N assigned and closed up by the server, the
 * dialog's sentence the only thing between a slip and a loss. What is this
 * screen's own: the band is the stored Thai word, displayed as it is stored,
 * and the description renders only when there is one — a dash would imply a
 * field the person forgot, and the field is optional.
 */
export default function AchievementCriteria() {
  const { sectionId, cloId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)

  // #133 - what is drawn is the answer to the request the screen still wants.
  // Both parameters come from `useParams` - the route reaches this screen through
  // one CLO at a time and offers no way to another,
  // so nothing here can supersede a request today: this is #68's rule
  // (`frontend/src/pages/Students.js`), not a defect anybody has seen, and the
  // sheet says ยังไม่ได้ทดสอบ rather than ไม่ต้องมี.
  const load = useCallback(async isCurrent => {
    setLoading(true)
    try {
      const answer = await getCriteria(sectionId, cloId)
      if (isCurrent()) setData(answer)
    } catch (error) {
      if (isCurrent()) {
        setData(null)
        if (!error.expired) setNotice({ error: true, message: error.message })
      }
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [sectionId, cloId])

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

  const save = async draft => {
    const sent = showing.current
    setBusy(true)
    setNotice(null)
    try {
      if (editing === 'new') await createCriterion(sectionId, cloId, draft)
      else await updateCriterion(sectionId, cloId, editing.id, draft)
      const mine = showing.current === sent
      if (mine) {
        setEditing(null)
      }
      await load(() => onScreen.current === load)
      if (showing.current === sent)
        setNotice({ error: false, message: 'บันทึกเกณฑ์การบรรลุผลแล้ว' })
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
      await deleteCriterion(sectionId, cloId, removing.id)
      setRemoving(null)
      await load(() => onScreen.current === load)
      if (showing.current === sent)
        setNotice({ error: false, message: 'ลบเกณฑ์การบรรลุผลแล้ว' })
    } catch (error) {
      // The dialog closes either way, for CourseOutcomes' reason: a dialog
      // over a banner hides it, and the same button pressed again cannot do
      // anything different.
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
            <Link
              to={`/teacher/teacherDashboard/${sectionId}/courseOutcomes`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <HiOutlineArrowLeft className="h-4 w-4" />
              ผลการเรียนรู้รายวิชา
            </Link>
            <p className="mt-3 text-xs font-medium text-slate-400">
              {data.offering.subject_id}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">
              เกณฑ์การบรรลุผลของ {data.clo.clo_number}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{data.clo.clo_detail}</p>
            {/*
              The grain, in words — the line break falls before และ, where a
              space belongs, for CourseOutcomes' reason: JSX joins two lines
              with one space, and Thai does not space inside a word.
            */}
            <p className="mt-2 text-sm text-slate-500">
              ปีการศึกษา {data.offering.academic_year} ·
              ทุกตอนเรียนของรายวิชานี้ในปีการศึกษาเดียวกันใช้ชุดเดียวกันนี้
              และปีการศึกษาอื่นมีชุดของตัวเอง
            </p>
          </div>

          {editing ? (
            <CriterionForm
              criterion={editing === 'new' ? null : editing}
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
              เพิ่มเกณฑ์การบรรลุผล
            </button>
          )}

          {data.criteria.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500">
              ยังไม่มีเกณฑ์การบรรลุผลของ {data.clo.clo_number}
            </p>
          )}

          {/* Named by the number, the only stable handle the rows have: the
              band repeats — a CLO may carry several criteria of one band —
              and the id is not on the screen. */}
          <ul className="space-y-3">
            {data.criteria.map(criterion => (
              <li
                key={criterion.id}
                aria-label={`ข้อ ${criterion.criteria_no}`}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium text-gray-900">
                      ข้อ {criterion.criteria_no} ·{' '}
                      {criterion.achievement_level}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {criterion.criteria_detail}
                    </p>
                    {criterion.criteria_description && (
                      <p className="mt-1 text-sm text-slate-400">
                        {criterion.criteria_description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        showing.current = {}
                        setEditing(criterion)
                      }}
                      aria-label={`แก้ไขข้อ ${criterion.criteria_no}`}
                      className="rounded-lg p-2 text-primary hover:bg-blue-50"
                    >
                      <HiOutlinePencil className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoving(criterion)}
                      aria-label={`ลบข้อ ${criterion.criteria_no}`}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <HiOutlineTrash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ลบเกณฑ์การบรรลุผล"
        message={
          removing
            ? `ต้องการลบข้อ ${removing.criteria_no} ของ ${data?.clo.clo_number} หรือไม่ ข้อที่เหลือจะถูกจัดลำดับใหม่ และทุกตอนเรียนของรายวิชานี้จะไม่เห็นข้อนี้อีก`
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

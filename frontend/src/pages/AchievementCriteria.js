import { useCallback, useEffect, useState } from 'react'
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getCriteria(sectionId, cloId))
    } catch (error) {
      setData(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [sectionId, cloId])

  useEffect(() => {
    load()
  }, [load])

  const save = async draft => {
    setBusy(true)
    setNotice(null)
    try {
      if (editing === 'new') await createCriterion(sectionId, cloId, draft)
      else await updateCriterion(sectionId, cloId, editing.id, draft)
      setEditing(null)
      await load()
      setNotice({ error: false, message: 'บันทึกเกณฑ์การบรรลุผลแล้ว' })
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
      await deleteCriterion(sectionId, cloId, removing.id)
      setRemoving(null)
      await load()
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

      {loading && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {!loading && data && (
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
              onCancel={() => setEditing(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing('new')}
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
                      onClick={() => setEditing(criterion)}
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

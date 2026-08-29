import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2'

import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import WeekForm from '../components/plan/WeekForm'
import { createWeek, deleteWeek, getPlan, updateWeek } from '../api/teachingPlan'

/**
 * แผนการสอน — ticket #31.
 *
 * The week-by-week plan of one ตอนเรียน: what is taught in which week of the
 * semester, with optional prose under each topic. The grain is the opposite
 * of every other screen in this menu — the plan belongs to THIS Section, two
 * Sections of one Offering may differ — and the sentence under the heading
 * says so for the usual reason: the data is correct either way, and the only
 * place to meet an expectation is before it is formed.
 *
 * ## The numbers are the person's, not the server's
 *
 * Week numbers are typed, may repeat (one week, two topics), and never close
 * up on delete — week 5 is week 5 because the calendar says so. So the form
 * has a number field where the CLO-family forms deliberately have none, the
 * rows are named by number *and* title (the number alone is not unique), and
 * the delete dialog promises the opposite of #28's: nothing gets renumbered.
 *
 * ## Removal can be refused by name
 *
 * A week an Activity is filed under comes back refused with the week's
 * number in the sentence — the server's guard, shown as sent, same shape as
 * #30's หมวด. The dialog closes either way, for CourseOutcomes' reason.
 */
export default function TeachingPlan() {
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
      setData(await getPlan(sectionId))
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

  const save = async draft => {
    setBusy(true)
    setNotice(null)
    try {
      if (editing === 'new') await createWeek(sectionId, draft)
      else await updateWeek(sectionId, editing.id, draft)
      setEditing(null)
      await load()
      setNotice({ error: false, message: 'บันทึกแผนการสอนแล้ว' })
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
      await deleteWeek(sectionId, removing.id)
      setRemoving(null)
      await load()
      setNotice({ error: false, message: 'ลบหัวข้อออกจากแผนการสอนแล้ว' })
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
            <p className="text-xs font-medium text-slate-400">
              {data.section.subject_id}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">แผนการสอน</h1>
            {/*
              The grain, in words — and here the words are the OTHER ones.
              Every sibling screen says ทุกตอนเรียน…ใช้ชุดเดียวกัน; this one
              is the screen that would make that sentence a lie if it copied
              it. The line break falls before แต่ละ, where a space belongs,
              for CourseOutcomes' reason.
            */}
            <p className="mt-2 text-sm text-slate-500">
              ตอนเรียนที่ {data.section.section_number} · ปีการศึกษา {data.section.academic_year} ·
              แผนการสอนเป็นของตอนเรียนนี้โดยเฉพาะ
              แต่ละตอนเรียนมีแผนของตัวเอง
            </p>
          </div>

          {editing ? (
            <WeekForm
              week={editing === 'new' ? null : editing}
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
              เพิ่มหัวข้อ
            </button>
          )}

          {data.weeks.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500">
              ยังไม่มีแผนการสอนของตอนเรียนนี้
            </p>
          )}

          {/* Named by number AND title: the number is not unique (one week
              may hold two topics), so the number alone cannot tell two rows
              apart, and the id is not on the screen. */}
          <ul className="space-y-3">
            {data.weeks.map(week => (
              <li
                key={week.id}
                aria-label={`สัปดาห์ที่ ${week.week_no} · ${week.title}`}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium text-gray-900">
                      สัปดาห์ที่ {week.week_no} · {week.title}
                    </h2>
                    {(week.description || week.remark) && (
                      <dl className="mt-2 space-y-1 text-sm">
                        {week.description && (
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-slate-400">รายละเอียด</dt>
                            <dd className="text-slate-600">{week.description}</dd>
                          </div>
                        )}
                        {week.remark && (
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-slate-400">หมายเหตุ</dt>
                            <dd className="text-slate-600">{week.remark}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(week)}
                      aria-label={`แก้ไขสัปดาห์ที่ ${week.week_no} · ${week.title}`}
                      className="rounded-lg p-2 text-primary hover:bg-blue-50"
                    >
                      <HiOutlinePencil className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoving(week)}
                      aria-label={`ลบสัปดาห์ที่ ${week.week_no} · ${week.title}`}
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
        title="ลบหัวข้อในแผนการสอน"
        message={
          removing
            ? `ต้องการลบสัปดาห์ที่ ${removing.week_no} (${removing.title}) หรือไม่ สัปดาห์อื่นจะไม่ถูกเปลี่ยนเลข และแผนของตอนเรียนอื่นไม่ถูกกระทบ`
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

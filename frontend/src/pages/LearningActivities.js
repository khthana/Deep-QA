import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2'

import ActivityForm from '../components/activity/ActivityForm'
import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import { createActivity, deleteActivity, getActivities, updateActivity } from '../api/activities'

/**
 * กิจกรรมการเรียนรู้ในรายวิชา — ticket #32.
 *
 * Every piece of assessed work in this ตอนเรียน, filed under the หมวดคะแนน it
 * counts towards. The two grains meet on this screen and the sentence under
 * the heading says so: the work is this Section's (two ตอนเรียน of one
 * รายวิชา may assess differently), the categories it is filed under are the
 * Offering's and shared with every sibling Section.
 *
 * ## The groups are the scheme's, not the list's
 *
 * The categories are drawn in the scheme's order, and a category with no work
 * in it is drawn empty rather than omitted. That is the point of grouping
 * here: the empty หมวด is the one a Teacher needs to see, because it is the
 * one they have not written work for yet. An Activity filed under no category
 * at all — the column is nullable — lands in a last group of its own rather
 * than disappearing.
 *
 * ## Removal is refused more often than it is allowed
 *
 * Marks CASCADE and evidence RESTRICTs, so the server refuses an Activity
 * that has either, and both sentences are shown as sent. The dialog says what
 * will go with it, because for the ones that *are* deletable nothing else is
 * watching: an Activity nobody has marked is one press from gone.
 *
 * ## The editor is on this screen and not on another — #33
 *
 * A piece of work is written, attributed and read in one place, because the
 * thing a person checks after writing it is where it landed: which group it
 * fell into, and what the attribution adds up to. The form opens in place of
 * the list's own add button, as #31's does, and each card carries the CLOs it
 * is attributed to — so *editing loads what is there* is visible before the
 * form is even opened.
 */
export default function LearningActivities() {
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
      setData(await getActivities(sectionId))
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
      if (editing === 'new') await createActivity(sectionId, draft)
      else await updateActivity(sectionId, editing.id, draft)
      setEditing(null)
      await load()
      setNotice({ error: false, message: 'บันทึกกิจกรรมแล้ว' })
    } catch (error) {
      // The form stays open on a refusal, unlike the delete dialog: the draft
      // in it is the person's work, and a refusal about a weight or a repeated
      // ผลการเรียนรู้ is something they fix in the form they are looking at.
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await deleteActivity(sectionId, removing.id)
      setRemoving(null)
      await load()
      setNotice({ error: false, message: 'ลบกิจกรรมแล้ว' })
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

  const groups = data ? groupsOf(data) : []

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {!loading && data && (
        <>
          <div>
            <p className="text-xs font-medium text-slate-400">{data.section.subject_id}</p>
            <h1 className="mt-1 text-xl font-semibold text-primary">กิจกรรมการเรียนรู้</h1>
            {/*
              The grain, in words — both halves of it, because this screen is
              where they meet. The line break falls before และ, where a space
              belongs, for CourseOutcomes' reason.
            */}
            <p className="mt-2 text-sm text-slate-500">
              ตอนเรียนที่ {data.section.section_number} · ปีการศึกษา {data.section.academic_year} ·
              กิจกรรมเป็นของตอนเรียนนี้ แต่ละตอนเรียนมีกิจกรรมของตัวเอง
              และหมวดคะแนนที่ใช้จัดกลุ่มเป็นของรายวิชาที่เปิดสอน ใช้ร่วมกันทุกตอนเรียน
            </p>
          </div>

          {editing ? (
            <ActivityForm
              activity={editing === 'new' ? null : editing}
              categories={data.categories}
              clos={data.clos}
              weeks={data.weeks}
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
              เพิ่มกิจกรรม
            </button>
          )}

          {data.activities.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500">
              ยังไม่มีกิจกรรมการเรียนรู้ของตอนเรียนนี้
            </p>
          )}

          {data.activities.length > 0 &&
            groups.map(group => (
              <section key={group.key} aria-label={`หมวด ${group.name}`} className="space-y-2">
                <h2 className="text-sm font-medium text-slate-600">
                  {group.name}
                  {group.weight !== null && (
                    <span className="ml-2 font-normal text-slate-400">
                      น้ำหนัก {group.weight}
                    </span>
                  )}
                </h2>

                {group.activities.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-slate-400">
                    ยังไม่มีกิจกรรมในหมวดนี้
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {group.activities.map(activity => (
                      <li
                        key={activity.id}
                        aria-label={`กิจกรรม ${activity.activity_name}`}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-900">{activity.activity_name}</h3>
                            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                              <div className="flex gap-2">
                                <dt className="text-slate-400">ประเภท</dt>
                                <dd className="text-slate-600">{typeName(activity.activity_type)}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="text-slate-400">คะแนนเต็ม</dt>
                                <dd className="text-slate-600">{markOf(activity.score_number)}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="text-slate-400">วันที่ประกาศ</dt>
                                <dd className="text-slate-600">{dateOf(activity.announcement_date)}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="text-slate-400">กำหนดส่ง</dt>
                                <dd className="text-slate-600">{dateOf(activity.deadline_date)}</dd>
                              </div>
                            </dl>

                            {/* What this piece of work is attributed to. Drawn
                                on the card and not only inside the editor,
                                because "counts towards nothing" is a state a
                                Teacher needs to see from the list — it is the
                                one that makes an Activity invisible to every
                                attainment figure downstream. */}
                            <p
                              aria-label={`ผลการเรียนรู้ของ ${activity.activity_name}`}
                              className="mt-2 text-sm"
                            >
                              <span className="text-slate-400">ผลการเรียนรู้ </span>
                              <span className="text-slate-600">
                                {activity.clo_rows.length === 0
                                  ? 'ยังไม่ได้เชื่อมโยง'
                                  : activity.clo_rows
                                      .map(row => `${row.clo_number} (${row.weight}%)`)
                                      .join(' · ')}
                              </span>
                            </p>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(activity)}
                              aria-label={`แก้ไขกิจกรรม ${activity.activity_name}`}
                              className="rounded-lg p-2 text-primary hover:bg-blue-50"
                            >
                              <HiOutlinePencil className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoving(activity)}
                              aria-label={`ลบกิจกรรม ${activity.activity_name}`}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            >
                              <HiOutlineTrash className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ลบกิจกรรมการเรียนรู้"
        message={
          removing
            ? `ต้องการลบ ${removing.activity_name} หรือไม่ การลบจะเอาการเชื่อมโยงผลการเรียนรู้ของกิจกรรมนี้ไปด้วย และกิจกรรมของตอนเรียนอื่นไม่ถูกกระทบ`
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

/** individual / group, as the enum's two values read to a person. */
const typeName = type => (type === 'group' ? 'งานกลุ่ม' : 'งานเดี่ยว')

/** numeric(5,2) arrives as a string; 100.00 is read as 100. */
const markOf = score => {
  const mark = Number(score)
  return Number.isFinite(mark) ? String(mark) : '—'
}

/** A date, or the dash that says the Teacher has not set one. */
const dateOf = value =>
  value
    ? new Date(value).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—'

/**
 * The scheme's categories in the scheme's order, each with the work filed
 * under it, and — last, and only if it has anything — the group for work no
 * category claimed.
 *
 * That last group is defined by what the groups above did *not* take, not by
 * `score_ratio_id === null`. The nullable column is one way to land there;
 * migration 0003 names the other in as many words: nothing in the schema
 * stops `activities.score_ratio_id` naming a category of a different
 * Offering, "and only the service layer will notice". Bucketing by null
 * would drop such a row off the screen entirely — the one outcome this
 * screen must never have, because a Teacher is looking at it to see all
 * their work.
 */
function groupsOf({ categories, activities }) {
  const groups = categories.map(category => ({
    key: category.score_ratio_id,
    name: category.score_category,
    weight: category.weight,
    activities: activities.filter(one => one.score_ratio_id === category.score_ratio_id),
  }))

  const claimed = new Set(groups.flatMap(group => group.activities.map(one => one.id)))
  const unfiled = activities.filter(one => !claimed.has(one.id))
  return unfiled.length === 0
    ? groups
    : [...groups, { key: 'unfiled', name: 'ยังไม่ได้ระบุหมวดคะแนน', weight: null, activities: unfiled }]
}

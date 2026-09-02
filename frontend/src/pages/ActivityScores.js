import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import ContentMotionDIV from '../components/ContentMotionDIV'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import { getActivities } from '../api/activities'
import { getScores, importScores, saveScores, scoresTemplate } from '../api/activityScores'

/**
 * คะแนนกิจกรรมการเรียนรู้ — #34.
 *
 * One Activity at a time, and a grid under two toggles.
 *
 * ## The toggles change what is typed, never what is stored
 *
 * `activity_scores` has no row that is not against a CLO, so the per-CLO
 * toggle is a choice about columns and the group toggle a choice about rows.
 * Neither is sent as a fact about the marks; both are sent *with* them, and the
 * server does the division and the multiplication. That is deliberate: the
 * ceilings the ticket asks to be enforced are the server's, and a screen that
 * divided a whole-Activity mark itself would be deciding in the browser whether
 * the result cleared them.
 *
 * ## A group row shows a number only when the group agrees
 *
 * Group entry writes one number to every member, but nothing afterwards
 * remembers that they arrived together — and they may not still be together,
 * because marks can be corrected one student at a time and #26 can move
 * somebody out. So a group row is filled in only when every member currently
 * holds the same mark; when they do not, it is left blank and the row says so
 * rather than picking one member's number and implying the rest.
 *
 * ## Blank is not nought
 *
 * An empty cell is work nobody has marked yet and is saved as null. A teacher
 * who means nought types nought. The distinction is the column's already, and
 * a screen that turned every blank into a zero would mark a whole class down
 * the first time it was opened and saved.
 *
 * ## A save sends the rows that changed, and only those
 *
 * Which follows from the two paragraphs above. This screen draws a cell blank
 * for two reasons that are not *the teacher left it blank* — a group whose
 * members disagree, and a student whose outcomes are half marked — and a blank
 * is written as a null. Submitting every row on the grid would therefore erase
 * exactly the marks those two blanks exist to report, on a press aimed at some
 * other row. See `changed`.
 */

/** The mark rows of one student, by CLO id, as the server sent them. */
function byStudent(marks) {
  const held = new Map()
  for (const mark of marks) {
    if (!held.has(mark.student_id)) held.set(mark.student_id, new Map())
    held.get(mark.student_id).set(String(mark.clo_id), mark.score)
  }
  return held
}

/** A number as a cell holds it: the empty string for "not marked", never a zero. */
const asText = value => (value === null || value === undefined ? '' : String(Number(value)))

/**
 * Two decimals, which is what the column keeps and therefore all a mark can
 * mean — `backend/routes/activityScores.js` rounds the same way for the same
 * reason.
 *
 * Adding the shares back up is floating point arithmetic on numbers that were
 * exact when they were stored: 32.08 + 31.27 + 25.32 is 88.66999999999999, and
 * a teacher who opened this screen was shown that, in a box, as somebody's
 * mark. The division was already careful to be exact on the way in; this is the
 * same care on the way out.
 */
const round2 = value => Math.round(value * 100) / 100

/** What every member holds, or null when they do not all hold the same thing. */
function agreed(values) {
  if (values.length === 0) return null
  const [first] = values
  return values.every(value => value === first) ? first : null
}

/**
 * Whether a row still says exactly what the record says — and so whether
 * pressing บันทึกคะแนน is an instruction about it at all.
 *
 * A save sends only the rows that differ. Sending the rest would be harmless
 * arithmetic on most of them and destructive on two, both of which are cells
 * this screen draws blank on purpose: a group whose members disagree, and a
 * student whose outcomes are only half marked. Blank means *not marked*, so
 * submitting those rows writes a null over the very marks that made them blank
 * — a whole group's work erased by a press aimed at the row below.
 *
 * A teacher who blanks a filled cell still clears it: that row now differs
 * from the record, so it is sent, and the null it carries is one somebody
 * asked for.
 */
function changed(typed, held) {
  const text = value => (value === null || value === undefined ? '' : String(value).trim())
  if (typed !== null && typeof typed === 'object') {
    const keys = new Set([...Object.keys(typed), ...Object.keys(held ?? {})])
    return [...keys].some(key => text(typed[key]) !== text((held ?? {})[key]))
  }
  return text(typed) !== text(held)
}

export default function ActivityScores() {
  const { sectionId } = useParams()
  const [list, setList] = useState(null)
  const [activityId, setActivityId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [mode, setMode] = useState('activity')
  const [entry, setEntry] = useState('student')
  const [draft, setDraft] = useState({})

  const failed = error => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const answer = await getActivities(sectionId)
      setList(answer)
      // The first Activity, so the screen opens on a grid rather than on a
      // picker with nothing chosen — #32's list is already ordered by the
      // scheme, so "the first" is the first หมวด's first piece of work.
      setActivityId(current => current || String(answer.activities[0]?.id ?? ''))
    } catch (error) {
      setList(null)
      failed(error)
    } finally {
      setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    loadList()
  }, [loadList])

  const load = useCallback(async () => {
    if (!activityId) return
    try {
      setData(await getScores(sectionId, activityId))
    } catch (error) {
      setData(null)
      failed(error)
    }
  }, [sectionId, activityId])

  useEffect(() => {
    load()
  }, [load])

  /**
   * The grid as the record has it — recomputed whenever the record or either
   * toggle changes, and never merged with what is being typed. Switching a
   * toggle is a change of question, so the answer is read again rather than
   * carried across; a half-typed column of per-CLO marks does not become a
   * column of Activity marks by being looked at differently.
   */
  const recorded = useMemo(() => {
    if (!data) return {}
    const held = byStudent(data.marks)
    const clos = data.clo_rows.map(row => String(row.clo_id))

    const forStudent = studentId => {
      const mine = held.get(studentId) ?? new Map()
      if (mode === 'clo') {
        const scores = {}
        for (const clo of clos) scores[clo] = asText(mine.get(clo) ?? null)
        return scores
      }
      // A whole-Activity cell is the sum of the outcomes' shares, and a sum is
      // only a sum when every term is there. Marks entered per CLO and left
      // half-finished make a number that is smaller than the work done and
      // that nobody typed; shown in this cell it reads as a mark, and saved
      // back it would fill the untouched outcomes with a division of it.
      const values = clos.map(clo => mine.get(clo) ?? null)
      if (values.some(value => value === null)) return ''
      return asText(round2(values.reduce((sum, value) => sum + Number(value), 0)))
    }

    const grid = {}
    if (entry === 'group') {
      for (const group of data.groups) {
        const each = group.members.map(forStudent)
        grid[group.group_id] =
          mode === 'clo'
            ? Object.fromEntries(
                clos.map(clo => [clo, agreed(each.map(one => one[clo])) ?? '']),
              )
            : (agreed(each) ?? '')
      }
    } else {
      for (const student of data.students) grid[student.student_id] = forStudent(student.student_id)
    }
    return grid
  }, [data, mode, entry])

  useEffect(() => {
    setDraft(recorded)
  }, [recorded])

  /** The Activity being marked, from the list the picker was filled from. */
  const activity = data?.activity ?? null
  const ceiling = Number(activity?.score_number ?? 0)

  /**
   * The group toggle defaults from the Activity's own type and stays free
   * afterwards. What the work *was* is a fact; how a teacher enters marks for
   * it is a preference, and a group project marked individually is ordinary.
   *
   * Once per Activity, therefore, and not once per load. `data.activity` is a
   * new object after every save and every import, so keying this on the object
   * made *stays free afterwards* last until the teacher's next press: a group
   * Activity being marked รายคน snapped back to รายกลุ่ม on บันทึกคะแนน, and
   * the grid under the toggle changed shape while they were reading it.
   */
  const defaulted = useRef('')
  useEffect(() => {
    if (!activity || defaulted.current === String(activity.id)) return
    defaulted.current = String(activity.id)
    setEntry(activity.activity_type === 'group' ? 'group' : 'student')
  }, [activity])

  const type = (key, value, clo) =>
    setDraft(current => ({
      ...current,
      [key]: clo ? { ...(current[key] ?? {}), [clo]: value } : value,
    }))

  const rows = useMemo(() => {
    if (!data) return []
    return entry === 'group'
      ? data.groups.map(group => ({
          key: group.group_id,
          id: group.group_id,
          label: group.group_name,
          detail: `${group.members.length} คน`,
        }))
      : data.students.map(student => ({
          key: student.student_id,
          id: student.student_id,
          label: student.student_id,
          detail: student.full_name_th,
        }))
  }, [data, entry])

  const save = async event => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      const marks = rows
        .filter(row => changed(draft[row.key], recorded[row.key]))
        .map(row => {
          const who = entry === 'group' ? { group_id: row.id } : { student_id: row.id }
          return mode === 'clo'
            ? { ...who, scores: draft[row.key] ?? {} }
            : { ...who, score: draft[row.key] ?? '' }
        })
      setData(await saveScores(sectionId, activityId, { mode, entry, marks }))
      setNotice({ error: false, message: `บันทึกคะแนน ${activity.activity_name} แล้ว` })
    } catch (error) {
      failed(error)
    } finally {
      setBusy(false)
    }
  }

  const toggle = (current, value, label, onPick) => (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        current === value
          ? 'bg-primary text-white'
          : 'border border-gray-300 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && !list && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {list && (
        <>
          <div>
            <p className="text-xs font-medium text-slate-400">
              {list.section.subject_id} {list.section.subject_name_en}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">คะแนนกิจกรรมการเรียนรู้</h1>
            <p className="mt-2 text-sm text-slate-500">
              ตอนเรียน {list.section.section_number} · ปีการศึกษา {list.section.academic_year} ·{' '}
              {list.activities.length} กิจกรรม
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-medium text-primary">เลือกกิจกรรมและวิธีกรอก</h2>
            <p className="mb-4 text-sm text-slate-500">
              กรอกคะแนนต่อกิจกรรมแล้วระบบจะแบ่งให้ผลการเรียนรู้ตามน้ำหนักที่ตั้งไว้ หรือกรอกแยกทีละ
              ผลการเรียนรู้ก็ได้ · คะแนนของกลุ่มจะถูกบันทึกให้สมาชิกทุกคน · ช่องที่เว้นว่างหมายถึง
              ยังไม่ให้คะแนน ไม่ใช่ศูนย์
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="activity">
                กิจกรรม
              </label>
              <select
                id="activity"
                value={activityId}
                onChange={event => setActivityId(event.target.value)}
                className="w-80 rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
              >
                {list.activities.map(one => (
                  <option key={one.id} value={one.id}>
                    {one.activity_name} ({Number(one.score_number)} คะแนน)
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2" role="group" aria-label="วิธีกรอกคะแนน">
                {toggle(mode, 'activity', 'ต่อกิจกรรม', setMode)}
                {toggle(mode, 'clo', 'ต่อผลการเรียนรู้', setMode)}
              </div>

              <div className="flex items-center gap-2" role="group" aria-label="ผู้ถูกให้คะแนน">
                {toggle(entry, 'student', 'รายคน', setEntry)}
                {toggle(entry, 'group', 'รายกลุ่ม', setEntry)}
              </div>
            </div>
          </div>

          {data && data.clo_rows.length === 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              กิจกรรมนี้ยังไม่ได้เชื่อมโยงกับผลการเรียนรู้ จึงยังบันทึกคะแนนไม่ได้
            </p>
          )}

          {data && entry === 'group' && data.groups.length === 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              ตอนเรียนนี้ยังไม่มีกลุ่มงาน กรุณาสร้างกลุ่มที่หน้ากลุ่มงานนักศึกษาก่อน
            </p>
          )}

          {data && data.clo_rows.length > 0 && rows.length > 0 && (
            <form
              onSubmit={save}
              className="rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-medium text-primary">
                  {data.activity.activity_name}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  เต็ม {ceiling}
                </span>
                <button
                  type="submit"
                  disabled={busy}
                  className="ml-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
                >
                  บันทึกคะแนน
                </button>
              </div>

              {/*
               * The table scrolls inside its own frame — #98. A per-CLO grid of
               * ten outcomes is wider than a laptop, and a page that scrolled
               * sideways instead would take the breadcrumb with it.
               */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">
                        {entry === 'group' ? 'กลุ่ม' : 'รหัสนักศึกษา'}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {entry === 'group' ? 'จำนวนสมาชิก' : 'ชื่อ'}
                      </th>
                      {mode === 'clo' ? (
                        data.clo_rows.map(row => (
                          <th key={row.clo_id} className="px-4 py-3 font-medium">
                            {row.clo_number}
                            <span className="ml-1 font-normal text-slate-400">
                              (เต็ม {Number(row.score)})
                            </span>
                          </th>
                        ))
                      ) : (
                        <th className="px-4 py-3 font-medium">คะแนน</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key} className="border-b border-gray-100 last:border-0">
                        <td className="whitespace-nowrap px-4 py-2 text-slate-600">{row.label}</td>
                        <td className="px-4 py-2 text-slate-600">{row.detail}</td>
                        {mode === 'clo' ? (
                          data.clo_rows.map(clo => (
                            <td key={clo.clo_id} className="px-4 py-2">
                              <input
                                aria-label={`${row.label} ${clo.clo_number}`}
                                value={draft[row.key]?.[String(clo.clo_id)] ?? ''}
                                onChange={event =>
                                  type(row.key, event.target.value, String(clo.clo_id))
                                }
                                className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                              />
                            </td>
                          ))
                        ) : (
                          <td className="px-4 py-2">
                            <input
                              aria-label={`คะแนนของ ${row.label}`}
                              value={draft[row.key] ?? ''}
                              onChange={event => type(row.key, event.target.value)}
                              className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </form>
          )}

          {data && data.clo_rows.length > 0 && (
            <ImportPanel
              title="นำเข้าคะแนนจากไฟล์"
              subtitle="ดาวน์โหลดแบบฟอร์มของกิจกรรมนี้ กรอกคะแนนแล้วอัปโหลดกลับเข้ามา ไฟล์ต้องมีนักศึกษาครบทุกคนของตอนเรียนนี้ รหัสและชื่อต้องตรงกับทะเบียน และคอลัมน์คะแนนต้องตรงกับที่เลือกไว้ มิฉะนั้นจะถูกปฏิเสธทั้งไฟล์"
              templateName="activity-marks-template.csv"
              fetchTemplate={() => scoresTemplate(sectionId, activityId, { mode })}
              send={csv => importScores(sectionId, activityId, csv)}
              onStart={() => setNotice(null)}
              onImported={load}
              onError={failed}
            />
          )}
        </>
      )}
    </ContentMotionDIV>
  )
}

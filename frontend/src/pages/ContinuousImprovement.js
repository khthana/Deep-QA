import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import EntrySection from '../components/improvement/EntrySection'
import Notice from '../components/Notice'
import {
  deleteEntry,
  getImprovementPlan,
  saveEntry,
} from '../api/improvementPlan'

/**
 * แผนการปรับปรุงอย่างต่อเนื่อง — ticket #41.
 *
 * The narrative half of a year's record: what the results showed, what the
 * ผู้สอน make of it, what was changed following an earlier reflection, and what
 * they intend to do next — four sentences about one ผลการเรียนรู้, and a
 * รายวิชา's worth of them is what an accreditation panel reads beside the
 * numbers #40 prints.
 *
 * ## The grain, and why the heading says it
 *
 * The record belongs to the (Program, Subject, academic year) behind the
 * ตอนเรียน in the address and not to the ตอนเรียน itself — ADR-0003, and the
 * schema was already at that grain before the rebuild. So the two ผู้สอน of two
 * classes write one narrative between them, and what one saves the other sees.
 * That is the fifth criterion and it is also the thing most likely to surprise
 * somebody who has only met #31's weekly plan, which is Section-bound. The
 * heading says so for the reason #27's and #29's do: the data is correct either
 * way, and the only place to meet an expectation is before it is formed.
 *
 * ## Nothing is drawn onto nothing
 *
 * #40's hand-walk found a rubric disclosure that opened onto an empty box on a
 * รายวิชา with no outcomes, because it was drawn outside the state chain. Two
 * things here would go the same way if they were: the picker and the four
 * sections, which need a ผลการเรียนรู้ to be about, and the reference panel,
 * which needs an earlier year that somebody wrote in. Both sit inside the
 * condition that makes them mean something, and the empty case gets a sentence
 * saying which screen to go to instead.
 *
 * The panel has a second empty case that is deliberately *not* treated the same
 * way: an earlier year exists and wrote nothing about the ผลการเรียนรู้ that is
 * chosen. It stays drawn and says so. #40's defect was a control — a thing to
 * press that opened onto nothing — and this is a statement, which is the useful
 * half of the answer: *nobody wrote about this outcome last year* and *there was
 * no last year* are two different pieces of news, and a panel that vanished
 * would report them identically. It also stops the panel appearing and
 * disappearing as the picker moves.
 *
 * ## One box per section, and no add button
 *
 * The four sections are fixed and known before anything is in them, so there is
 * nothing to create — only to fill in. `saveEntry` writes and rewrites through
 * one call because (year, CLO, section) is the key, which is also why the
 * editor is opened by naming a section rather than by holding a row.
 */

/**
 * The four sections, in the order the cycle runs in.
 *
 * The labels are docs/02's own words for the four values of the CHECK, and the
 * hints are what each section is for in one line — they are the placeholder in
 * the editor and the subtitle on the card, one string rather than two, because
 * a person reading the card and a person filling it in are asking the same
 * question.
 */
const SECTIONS = [
  {
    type: 'SUMMARY',
    label: 'สรุปผลการดำเนินงาน',
    hint: 'ผลที่เกิดขึ้นจริงในปีการศึกษานี้ ทั้งที่เป็นไปตามที่ตั้งไว้และที่ไม่เป็น',
  },
  {
    type: 'REFLECTION',
    label: 'การสะท้อนคิด',
    hint: 'สาเหตุที่อธิบายผลข้างต้น และสิ่งที่ผลนั้นบอกเกี่ยวกับการจัดการเรียนการสอน',
  },
  {
    type: 'IMPROVEMENT',
    label: 'การปรับปรุงจากรอบก่อนหน้า',
    hint: 'สิ่งที่เปลี่ยนไปแล้วในปีนี้ ตามที่สะท้อนคิดไว้ในรอบก่อน และผลของการเปลี่ยนนั้น',
  },
  {
    type: 'NEXT_PLAN',
    label: 'แนวทางพัฒนาครั้งถัดไป',
    hint: 'สิ่งที่ตั้งใจจะทำในปีการศึกษาถัดไป และสิ่งที่จะใช้ดูว่าได้ผลหรือไม่',
  },
]

const labelOf = type => SECTIONS.find(section => section.type === type)?.label

export default function ContinuousImprovement() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  /** The CLO the four sections are about — chosen, never guessed at twice. */
  const [cloId, setCloId] = useState('')
  /** Which section's editor is open, by type; one at a time. */
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const answered = await getImprovementPlan(sectionId)
      setData(answered)
      // The chosen CLO survives a reload, so saving does not send the person
      // back to CLO-1 after every sentence. It falls back to the first only
      // when what was chosen is no longer on the list.
      setCloId(current =>
        answered.clos.some(clo => String(clo.clo_id) === String(current))
          ? current
          : String(answered.clos[0]?.clo_id ?? '')
      )
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

  const clo = useMemo(
    () => data?.clos.find(candidate => String(candidate.clo_id) === cloId),
    [data, cloId]
  )

  /** This year's entries for the chosen CLO, by section — at most one each. */
  const entries = useMemo(() => {
    const byType = {}
    for (const entry of data?.entries ?? []) {
      if (String(entry.clo_id) === cloId) byType[entry.detail_type] = entry
    }
    return byType
  }, [data, cloId])

  /**
   * Last year's entries for the same ผลการเรียนรู้, matched by number.
   *
   * The number and not the id: ADR-0003 gives every ปีการศึกษา its own CLO
   * rows, so last year's CLO-4 is a different row from this year's, and the
   * number is the only handle the two years share. The server joins the same
   * way; this is the screen's half of one decision.
   */
  const reference = useMemo(() => {
    if (!data?.previous || !clo) return []
    return data.previous.entries.filter(
      entry => entry.clo_number === clo.clo_number
    )
  }, [data, clo])

  const save = async text => {
    setBusy(true)
    setNotice(null)
    try {
      await saveEntry(sectionId, {
        clo_id: clo.clo_id,
        detail_type: editing,
        detail_text: text,
      })
      const written = labelOf(editing)
      setEditing(null)
      await load()
      setNotice({ error: false, message: `บันทึก${written}แล้ว` })
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setNotice(null)
    const removed = labelOf(removing.detail_type)
    try {
      await deleteEntry(sectionId, removing.entry_id)
      setRemoving(null)
      await load()
      setNotice({ error: false, message: `ลบ${removed}แล้ว` })
    } catch (error) {
      // The dialog closes either way, for AchievementCriteria's reason: a
      // dialog over a banner hides it, and the same button pressed again
      // cannot do anything different.
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
              แผนการปรับปรุงอย่างต่อเนื่อง
            </h1>
            {/* The line break falls before และ, where a space belongs: JSX
                joins two lines with one space, and Thai does not space inside
                a word. */}
            <p className="mt-2 text-sm text-slate-500">
              ปีการศึกษา {data.offering.academic_year} ·
              ทุกตอนเรียนของรายวิชานี้ในปีการศึกษาเดียวกันใช้แผนเดียวกันนี้
              และปีการศึกษาอื่นมีแผนของตัวเอง
            </p>
          </div>

          {data.clos.length === 0 ? (
            <div
              role="status"
              className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center"
            >
              <p className="text-sm font-medium text-slate-600">
                รายวิชานี้ยังไม่ได้กำหนดผลการเรียนรู้ จึงยังไม่มีอะไรให้ปรับปรุง
              </p>
              <p className="mt-1 text-xs text-slate-400">
                กำหนดผลการเรียนรู้ที่หน้า ผลการเรียนรู้รายวิชา ก่อน
              </p>
            </div>
          ) : (
            <>
              <label className="block sm:max-w-md">
                <span className="mb-1 block text-sm text-gray-500">
                  ผลการเรียนรู้ที่กำลังเขียนถึง
                </span>
                <select
                  value={cloId}
                  onChange={event => {
                    setCloId(event.target.value)
                    setEditing(null)
                  }}
                  aria-label="ผลการเรียนรู้ที่กำลังเขียนถึง"
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900"
                >
                  {data.clos.map(candidate => (
                    <option key={candidate.clo_id} value={candidate.clo_id}>
                      {candidate.clo_number} · {candidate.clo_detail}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  {SECTIONS.map(section => (
                    <EntrySection
                      key={section.type}
                      label={section.label}
                      hint={section.hint}
                      entry={entries[section.type]}
                      editing={editing === section.type}
                      busy={busy}
                      onEdit={() => setEditing(section.type)}
                      onCancel={() => setEditing(null)}
                      onSubmit={save}
                      onRemove={() => setRemoving(entries[section.type])}
                    />
                  ))}
                </div>

                {/* Drawn only where there is an earlier year somebody wrote in
                    — #40's lesson, applied before it could be repeated. A
                    panel that opens onto nothing is a control that answers
                    nothing, and no assertion here would have noticed. */}
                {data.previous && (
                  <aside
                    aria-label={`แผนของปีการศึกษา ${data.previous.academic_year}`}
                    className="h-fit rounded-xl border border-gray-200 bg-slate-50 p-4"
                  >
                    <h2 className="font-medium text-gray-900">
                      ปีการศึกษา {data.previous.academic_year}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      บันทึกของรอบก่อนหน้า สำหรับอ้างอิงขณะเขียนรอบนี้
                    </p>

                    {reference.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        ปีการศึกษา {data.previous.academic_year} ไม่มีบันทึกของ{' '}
                        {clo?.clo_number}
                      </p>
                    ) : (
                      <dl className="mt-3 space-y-3">
                        {reference.map(entry => (
                          <div key={entry.entry_id}>
                            <dt className="text-xs font-medium text-slate-500">
                              {labelOf(entry.detail_type)}
                            </dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                              {entry.detail_text}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </aside>
                )}
              </div>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ลบบันทึกของแผนการปรับปรุง"
        message={
          removing
            ? `ต้องการลบ${labelOf(removing.detail_type)}ของ ${removing.clo_number} ในปีการศึกษา ${data?.offering.academic_year} หรือไม่ ทุกตอนเรียนของรายวิชานี้จะไม่เห็นข้อความนี้อีก`
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

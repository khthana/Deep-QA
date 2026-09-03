import { useCallback, useEffect, useState } from 'react'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import { BANDS, figure, rangeOf, score } from '../lib/bands'
import {
  getOutcomeContributions,
  getResultsByIntake,
  listIntakes,
  listResultPrograms,
} from '../api/programResults'

/**
 * ผลการเรียนรู้ระดับหลักสูตรตามปีรับเข้า — #42.
 *
 * How one intake is doing against the outcomes its curriculum promises, and —
 * for any figure — what the figure is made of. The first screen in the rebuild
 * that reports on a cohort rather than on a room, and the first whose whole
 * purpose is that a number can be *checked* rather than believed.
 *
 * ## Two pickers, and neither of them is a guess
 *
 * The curricula come from the server because what an account reaches is the
 * server's answer and not the browser's (ADR-0002). The intakes come from the
 * server too, and for a smaller reason that matters at the seat: they are the
 * years this curriculum actually has students in, so there is no year in the
 * list that opens on an empty report. A committee member who picks a year and
 * finds nothing should be finding out something about the marking, never about
 * the picker.
 *
 * ## The screen decides colours and nothing else
 *
 * Same rule as #38, one level up. Every figure arrives already banded and every
 * verdict arrives already reached; the only judgement here is which colour a
 * band is drawn in, and the ranges in the legend are read off `band_floors`
 * rather than kept as a second copy of BR-20. The colours themselves are not
 * here either — `lib/bands.js` holds the one copy both screens draw from, on
 * the same argument that put the rules in `backend/lib/attainment.js`.
 *
 * ## Three states, not two
 *
 * An outcome nobody in the cohort has been measured against has not failed. It
 * has not been assessed, and the row says so — a dash and a neutral chip rather
 * than the red of a failure or the green of a pass. #38 shipped that bug and a
 * hand-walk caught it; this screen is built with it already known.
 *
 * ## The drill-down is fetched, not sent
 *
 * A curriculum has thirteen outcomes and a person opens one at a time, so the
 * contributing Subjects and Activities arrive when an outcome is opened. The
 * evidence attached to those Activities is *named* here and not opened: #35
 * owns the upload and the authenticated retrieval, and the delivered system
 * served that directory with no authentication at all, which is one of the two
 * defects that ticket exists to fix. A download button here would be #35's
 * acceptance criterion written a second time without its guard.
 */

/** What an outcome's type is called where a person reads it. */
const TYPES = {
  knowledge: 'ความรู้',
  skills: 'ทักษะ',
  ethics: 'จริยธรรม',
  character: 'ลักษณะบุคคล',
}

/**
 * What an outcome's row says when it is read aloud rather than looked at.
 *
 * The verdict is a single letter in a coloured chip, which is two ways of
 * saying the same thing to a reader who can see both and no way at all to one
 * who can see neither. #38 learned this on a hand-walk; the label carries the
 * figure and the verdict in words.
 */
function spoken(plo) {
  if (plo.passed === null) return `${plo.outcome_code} ยังไม่มีการวัด`
  const rate = `ผ่านเกณฑ์ ${plo.pass_rate}% ของนักศึกษาที่ถูกวัด`
  return `${plo.outcome_code} ${plo.passed ? 'ผ่าน' : 'ไม่ผ่าน'} — ${rate}`
}

/** The chip a verdict is drawn as: passed, not passed, or not yet asked. */
function verdict(plo) {
  if (plo.passed === null) return { text: '—', look: 'bg-slate-100 text-slate-400' }
  return plo.passed
    ? { text: 'Y', look: 'bg-emerald-100 text-emerald-900' }
    : { text: 'N', look: 'bg-red-100 text-red-900' }
}

export default function ProgramLevelByIntake() {
  const [programs, setPrograms] = useState([])
  const [program, setProgram] = useState('')
  const [intakes, setIntakes] = useState([])
  const [intake, setIntake] = useState('')
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(null)
  const [drill, setDrill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const report = (error) => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }

  useEffect(() => {
    let cancelled = false
    listResultPrograms()
      .then(({ programs: rows }) => {
        if (cancelled) return
        setPrograms(rows)
        // One curriculum is the committee member's ordinary case and the
        // assessor's only one; choosing it for them saves a click that has no
        // alternative to offer.
        if (rows.length > 0) setProgram(rows[0].program_id)
      })
      .catch(report)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!program) return undefined
    let cancelled = false
    setIntakes([])
    setIntake('')
    listIntakes(program)
      .then(({ intakes: rows }) => {
        if (cancelled) return
        setIntakes(rows)
        if (rows.length > 0) setIntake(rows[0].admission_year)
      })
      .catch(report)
    return () => {
      cancelled = true
    }
  }, [program])

  const load = useCallback(async () => {
    if (!program || !intake) {
      setData(null)
      return
    }
    setLoading(true)
    setOpen(null)
    setDrill(null)
    try {
      setData(await getResultsByIntake(program, intake))
    } catch (error) {
      setData(null)
      report(error)
    } finally {
      setLoading(false)
    }
  }, [program, intake])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(plo) {
    if (open === plo.outcome_id) {
      setOpen(null)
      setDrill(null)
      return
    }
    setOpen(plo.outcome_id)
    setDrill(null)
    try {
      setDrill(await getOutcomeContributions(program, intake, plo.outcome_id))
    } catch (error) {
      report(error)
    }
  }

  const chosen = programs.find(entry => entry.program_id === program)

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      <div>
        <h1 className="text-xl font-semibold text-primary">ผลการเรียนรู้ระดับหลักสูตรตามปีรับเข้า</h1>
        <p className="mt-2 text-sm text-slate-500">
          ผลการเรียนรู้ระดับหลักสูตรของนักศึกษารุ่นหนึ่ง รวบยอดจากคะแนนผลการเรียนรู้รายวิชาทุกวิชาที่รุ่นนั้นเรียนมา
          เลือกข้อใดข้อหนึ่งเพื่อดูรายวิชาและกิจกรรมที่เป็นที่มาของตัวเลข
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {programs.length > 1 ? (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            หลักสูตร
            <select
              value={program}
              onChange={event => setProgram(event.target.value)}
              className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
            >
              {programs.map(entry => (
                <option key={entry.program_id} value={entry.program_id}>
                  {entry.program_id} {entry.program_name_th}
                </option>
              ))}
            </select>
          </label>
        ) : (
          chosen && (
            <span className="flex items-center gap-2 text-sm text-slate-600">
              หลักสูตร
              <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                {chosen.program_id} {chosen.program_name_th}
              </span>
            </span>
          )
        )}

        <label className="flex items-center gap-2 text-sm text-slate-600">
          ปีรับเข้า
          <select
            value={intake}
            onChange={event => setIntake(event.target.value)}
            className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
          >
            {intakes.map(entry => (
              <option key={entry.admission_year} value={entry.admission_year}>
                {entry.admission_year} ({entry.student_count} คน)
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && !data && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {!loading && intakes.length === 0 && program && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">หลักสูตรนี้ยังไม่มีนักศึกษาในทะเบียน</p>
        </div>
      )}

      {data && (
        <>
          <p className="text-sm text-slate-500">
            ปีรับเข้า {data.admission_year} · {data.cohort.student_count} คน ·{' '}
            {data.plos.length} ผลการเรียนรู้ระดับหลักสูตร
          </p>

          {data.empty ? (
            // Not a table of dashes. Nobody in this intake has been marked on
            // anything yet, and thirteen rows of em dashes invite a committee
            // to look for a pattern in the fact that no marking has happened.
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-600">
                ยังไม่มีคะแนนของนักศึกษารุ่นนี้
              </p>
              <p className="mt-2 text-sm text-slate-500">
                เมื่ออาจารย์บันทึกคะแนนกิจกรรมการเรียนรู้ของรายวิชาที่รุ่นนี้เรียนแล้ว
                ผลการเรียนรู้ระดับหลักสูตรจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-medium text-primary">
                  ผลการเรียนรู้ระดับหลักสูตร (เต็ม 5)
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  {Object.entries(BANDS).map(([band, look]) => (
                    <span key={band} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className={`inline-block h-3 w-3 rounded-sm ${look.chip}`} />
                      {rangeOf(data.band_floors, Number(band))}
                    </span>
                  ))}
                </div>
              </div>

              {/* The table scrolls in its own frame so the page never does — #98. */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[48rem] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">ผลการเรียนรู้</th>
                      <th className="px-4 py-3 text-center font-medium">ประเภท</th>
                      <th className="px-4 py-3 text-center font-medium">จำนวนที่วัดได้</th>
                      <th className="px-4 py-3 text-center font-medium">คะแนนเฉลี่ย</th>
                      <th className="px-4 py-3 text-center font-medium">อัตราผ่านเกณฑ์</th>
                      <th className="px-4 py-3 text-center font-medium">ผ่าน</th>
                      <th className="px-4 py-3 text-center font-medium">ที่มา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.plos.map(plo => {
                      const mark = verdict(plo)
                      const look = BANDS[plo.band]
                      return (
                        <tr key={plo.outcome_id} className="align-top">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-700">{plo.outcome_code}</p>
                            <p className="text-xs text-slate-500">{plo.outcome_title}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-500">
                            {TYPES[plo.outcome_type] || plo.outcome_type}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {plo.student_count}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block w-full rounded-md px-2 py-1.5 text-xs font-medium ${
                                look ? look.cell : 'bg-slate-50 text-slate-400'
                              }`}
                            >
                              {score(plo.mean)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {figure(plo.pass_rate, '%')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              aria-label={spoken(plo)}
                              className={`inline-block rounded-md px-2 py-1.5 text-xs font-medium ${mark.look}`}
                            >
                              {mark.text}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggle(plo)}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-gray-50"
                            >
                              {open === plo.outcome_id ? 'ซ่อนที่มา' : 'ดูที่มา'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {open !== null && (
                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  {!drill ? (
                    <p className="text-sm text-slate-500">กำลังโหลดที่มาของตัวเลข…</p>
                  ) : (
                    <>
                      <h3 className="text-sm font-medium text-primary">
                        ที่มาของ {drill.outcome.outcome_code} {drill.outcome.outcome_title}
                      </h3>
                      {drill.subjects.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">
                          ยังไม่มีรายวิชาใดของรุ่นนี้ที่บันทึกคะแนนไว้กับผลการเรียนรู้ข้อนี้
                        </p>
                      ) : (
                        <div className="mt-3 space-y-4">
                          {drill.subjects.map(subject => (
                            <div
                              key={subject.subject_id}
                              className="rounded-lg border border-gray-200 bg-white p-4"
                            >
                              <p className="text-sm font-medium text-slate-700">
                                {subject.subject_id} {subject.subject_name_th}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                ผลการเรียนรู้รายวิชาที่เชื่อมโยง{' '}
                                {subject.clos.map(clo => clo.clo_number).join(' · ')}
                              </p>

                              <ul className="mt-3 space-y-2">
                                {subject.activities.map(activity => (
                                  <li
                                    key={activity.id}
                                    className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                                  >
                                    <p className="text-sm text-slate-700">
                                      {activity.activity_name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      ตอนเรียน {activity.section_id} · คะแนนเต็ม{' '}
                                      {activity.score_number} ·{' '}
                                      {activity.clos.map(clo => clo.clo_number).join(' · ')}
                                    </p>
                                    {activity.evidence.length > 0 ? (
                                      <ul className="mt-2 space-y-1">
                                        {activity.evidence.map(file => (
                                          <li key={file.evidence_id} className="text-xs text-slate-500">
                                            หลักฐาน {file.file_name}
                                            {file.description ? ` — ${file.description}` : ''}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="mt-2 text-xs text-slate-400">
                                        ยังไม่มีหลักฐานแนบกับกิจกรรมนี้
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {/* Said once, at the bottom, rather than as a dead
                              button beside every file: #35 owns both the upload
                              and the retrieval that checks who is asking.

                              `text-slate-400` at first, and the hand-walk sent
                              it back: the reader could find the sentence but
                              had to look for it. A note nobody reads is a note
                              that is not there, and this one is the answer to
                              *why can I not open this file* — so `text-slate-600`
                              on a `bg-gray-50` panel, which clears 4.5:1 where
                              the old one was near 2.5:1. Quiet, not hidden. */}
                          <p className="text-xs text-slate-600">
                            การเปิดไฟล์หลักฐานจะทำได้เมื่องาน #35 เสร็จ
                            ซึ่งเป็นงานที่ดูแลทั้งการแนบไฟล์และการตรวจสิทธิ์ก่อนให้ดาวน์โหลด
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </ContentMotionDIV>
  )
}

import { useCallback, useEffect, useState } from 'react'

import BandLegend from '../components/results/BandLegend'
import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import { BANDS, figure, score } from '../lib/bands'
import { OUTCOME_TYPES } from '../lib/outcomes'
import { CohortPickers, NoStudentsYet, useCohortPickers } from '../components/results/CohortPickers'
import { getEvidenceFile, showPdf } from '../api/evidence'
import { getOutcomeContributions, getResultsByIntake } from '../api/programResults'

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
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(null)
  const [drill, setDrill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  /**
   * Opens one evidence file — #35's authenticated retrieval, from the side that
   * is not teaching anything.
   *
   * A committee member reaches it because the Activity is attributed to a CLO
   * of a curriculum they read, which is the road this drill-down itself came
   * down. If they are not, the server refuses and the refusal is shown here in
   * its own words rather than as a broken tab.
   */
  const openEvidence = async file => {
    setNotice(null)
    try {
      showPdf(await getEvidenceFile(file.evidence_id), file.file_name)
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    }
  }

  const report = (error) => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }

  const { programs, program, setProgram, intakes, intake, setIntake, asked } =
    useCohortPickers(report)

  const load = useCallback(async () => {
    if (!program || !intake) {
      setData(null)
      // Nothing to ask for is an answer, not a wait. Without this an
      // account the server refuses — a ผู้สอน who typed this address — reads the
      // refusal and *กำลังโหลดข้อมูล…* underneath it, for ever. Found by the
      // hand-walk of #43; #42's screen had it too.
      setLoading(false)
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

      <CohortPickers
        programs={programs}
        program={program}
        setProgram={setProgram}
        intakes={intakes}
        intake={intake}
        setIntake={setIntake}
      />

      {loading && !data && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {asked && intakes.length === 0 && program && <NoStudentsYet />}

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
                <BandLegend floors={data.band_floors} />
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
                            {OUTCOME_TYPES[plo.outcome_type] || plo.outcome_type}
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
                                            {/* #35 landed, so this is a request
                                                and no longer a name on a page.
                                                The file is fetched with the
                                                session and shown from the bytes
                                                that come back — a link straight
                                                at the API would be the static
                                                mount that ticket removed. */}
                                            <button
                                              type="button"
                                              onClick={() => openEvidence(file)}
                                              aria-label={`เปิดหลักฐาน ${file.file_name}`}
                                              className="text-primary hover:underline"
                                            >
                                              หลักฐาน {file.file_name}
                                            </button>
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
                          {/* The sentence that used to stand here said the
                              files could not be opened yet and named the ticket
                              that would change it. #35 is that ticket, and it
                              is done — so the note is gone and each file is a
                              control. #42's own sheet was ◐ for this half. */}
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

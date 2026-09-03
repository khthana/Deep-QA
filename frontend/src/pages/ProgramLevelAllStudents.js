import { useCallback, useEffect, useMemo, useState } from 'react'

import BandLegend from '../components/results/BandLegend'
import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import { BANDS, score } from '../lib/bands'
import { CohortPickers, NoStudentsYet, useCohortPickers } from '../components/results/CohortPickers'
import { getStudentHeatmap } from '../api/programResults'

/**
 * ผลการเรียนรู้ระดับหลักสูตรของนักศึกษาทุกคน — #43.
 *
 * #42 answers *how did this intake do on each outcome*. This answers the
 * question its averages cannot: **who**. A curriculum can clear BR-17 on an
 * outcome — more than sixty per cent of the measured students at or above the
 * line — while a quarter of the cohort has never once reached it, and the mean
 * beside that outcome will not say so. The heatmap is the shape that does.
 *
 * ## The same rules, one step earlier
 *
 * Every figure here is the same two-step roll-up #42 draws, stopped one step
 * before it becomes a column: a student's CLO score is what they earned over
 * what was available times five, and their outcome score is the mean of the
 * CLO scores naming it. Both live in `backend/lib/cohort.js` and neither is
 * computed here. The colours come from `lib/bands.js`, the same copy #38 and
 * #42 draw from, and the legend's ranges are read off `band_floors` as they
 * arrive rather than kept as a second copy of BR-20.
 *
 * ## Sorting by a count, not by a figure nobody agreed to
 *
 * The ticket asks that the weakest students be reachable without scanning,
 * which needs an order. There is no rule that says what a student's score
 * across a whole curriculum is: BR-17 is about one outcome across a cohort,
 * BR-18 and BR-20 about one student on one outcome. #38 met the same gap and
 * declined to invent a per-student figure; so does this.
 *
 * What the reader sorts on instead is a **count of things the rules do
 * define** — how many outcomes this student is below three on, out of how many
 * they have been measured on at all. *2 จาก 7* can be checked against the row
 * it sits beside. A mean of 3.14 across seven outcomes can be checked against
 * nothing, and would quietly rank a student measured once against a student
 * measured seven times as though the two numbers meant the same thing.
 *
 * The sort happens here rather than at the server because the whole cohort is
 * already in the browser and reordering it changes no figure. What the server
 * decides is what the numbers are; what order they are read in is the reader's.
 */

/** What a cell says when it is read aloud rather than looked at. */
function spoken(student, plo, cell) {
  // *ยังไม่มีคะแนน* and not *ยังไม่มีการวัด*: this is a cell, and #38's cells
  // say the first for the same condition. Two sentences for one state is a
  // difference a reader hears and cannot account for.
  const figure = cell.score === null ? 'ยังไม่มีคะแนน' : `${cell.score.toFixed(2)} คะแนน`
  return `${student.student_id} ${plo.outcome_code} ${figure}${cell.flagged ? ' ต่ำกว่าเกณฑ์' : ''}`
}

/**
 * The orders a reader may put the roll in.
 *
 * Two, and the second one is the ticket's fourth criterion: the students with
 * the most outcomes under the line first, so the reader does not have to find
 * them by eye. Ties fall back to the code so that the order is total — a sort
 * that leaves equal rows in an arbitrary order looks broken the second time it
 * is drawn.
 */
const ORDERS = {
  student: {
    label: 'รหัสนักศึกษา',
    compare: (a, b) => a.student_id.localeCompare(b.student_id),
  },
  weakest: {
    label: 'จำนวนข้อที่ต่ำกว่าเกณฑ์ (มากไปน้อย)',
    compare: (a, b) => b.below_count - a.below_count || a.student_id.localeCompare(b.student_id),
  },
}

export default function ProgramLevelAllStudents() {
  const [order, setOrder] = useState('student')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const report = error => {
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
    try {
      setData(await getStudentHeatmap(program, intake))
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

  // A copy, because Array.prototype.sort works in place and the answer the
  // server sent is not this component's to rearrange.
  const rows = useMemo(
    () => (data ? [...data.students].sort(ORDERS[order].compare) : []),
    [data, order],
  )

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      <div>
        <h1 className="text-xl font-semibold text-primary">
          ผลการเรียนรู้ระดับหลักสูตรของนักศึกษาทุกคน
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          นักศึกษาทุกคนของรุ่นที่เลือก เทียบกับผลการเรียนรู้ระดับหลักสูตรทุกข้อ
          หน้านี้ตอบคำถามที่ค่าเฉลี่ยตอบไม่ได้ — หลักสูตรผ่านเกณฑ์ข้อหนึ่งได้ ทั้งที่นักศึกษาส่วนหนึ่งไม่เคยถึงเส้นเลย
        </p>
      </div>

      <CohortPickers
        programs={programs}
        program={program}
        setProgram={setProgram}
        intakes={intakes}
        intake={intake}
        setIntake={setIntake}
      >
        <label className="flex items-center gap-2 text-sm text-slate-600">
          เรียงตาม
          <select
            value={order}
            onChange={event => setOrder(event.target.value)}
            className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
          >
            {Object.entries(ORDERS).map(([key, entry]) => (
              <option key={key} value={key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </CohortPickers>

      {loading && !data && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {asked && intakes.length === 0 && program && <NoStudentsYet />}

      {data && (
        <>
          <p className="text-sm text-slate-500">
            ปีรับเข้า {data.admission_year} · {data.students.length} คน · {data.plos.length}{' '}
            ผลการเรียนรู้ระดับหลักสูตร
          </p>

          {data.empty ? (
            // Not a grid of dashes. Nobody in this intake has been marked on
            // anything, and a heatmap of empty cells invites a reader to look
            // for a pattern in the fact that no marking has happened.
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-600">ยังไม่มีคะแนนของนักศึกษารุ่นนี้</p>
              <p className="mt-2 text-sm text-slate-500">
                เมื่ออาจารย์บันทึกคะแนนกิจกรรมการเรียนรู้ของรายวิชาที่รุ่นนี้เรียนแล้ว
                ผลของนักศึกษาแต่ละคนจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-medium text-primary">
                  นักศึกษาทุกคน × ผลการเรียนรู้ระดับหลักสูตร (เต็ม 5)
                </h2>
                <BandLegend floors={data.band_floors} />
              </div>

              {/* The heatmap scrolls in its own frame so the page never does —
                  the ticket's third criterion, and #98's rule for every table
                  wider than the screen it is read on. */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">รหัสนักศึกษา</th>
                      <th className="px-4 py-3 font-medium">ชื่อ – นามสกุล</th>
                      <th className="px-4 py-3 text-center font-medium">ต่ำกว่าเกณฑ์</th>
                      {data.plos.map(plo => (
                        <th
                          key={plo.outcome_id}
                          title={plo.outcome_title}
                          className="px-2 py-3 text-center font-medium"
                        >
                          {plo.outcome_code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(student => (
                      <tr key={student.student_id} className="border-b border-gray-100">
                        <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                          {student.student_id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                          {student.full_name_th}
                        </td>
                        {/* The fraction and not the numerator alone: *2* beside
                            a student measured on two outcomes and *2* beside one
                            measured on seven are the same figure and not the
                            same news. */}
                        <td
                          aria-label={`${student.student_id} ต่ำกว่าเกณฑ์ ${student.below_count} จาก ${student.measured_count} ข้อที่วัดได้`}
                          className="whitespace-nowrap px-4 py-2 text-center text-xs text-slate-600"
                        >
                          {student.below_count} / {student.measured_count}
                        </td>
                        {data.plos.map(plo => {
                          const cell = student.scores[plo.outcome_id]
                          const look = cell.band ? BANDS[cell.band] : null
                          return (
                            <td key={plo.outcome_id} className="px-1 py-1 text-center">
                              <span
                                aria-label={spoken(student, plo, cell)}
                                className={`inline-block w-full rounded-md px-2 py-1.5 text-xs font-medium ${
                                  look ? look.cell : 'bg-slate-50 text-slate-400'
                                }`}
                              >
                                {score(cell.score)}
                                {/* The flag is not only a colour, for #38's
                                    reason: below three has to survive being
                                    printed and being read by somebody who
                                    cannot tell two shades of a ramp apart. */}
                                {cell.flagged && <span className="ml-1 font-bold">!</span>}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </ContentMotionDIV>
  )
}

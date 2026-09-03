import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import { BANDS, figure, rangeOf, score } from '../lib/bands'
import { getLearningDetails } from '../api/learningDetails'

/**
 * รายละเอียดผลการเรียนรู้ — #38.
 *
 * Every student against every outcome, so that a weak outcome is a column you
 * can see and a struggling student is a row.
 *
 * ## The screen decides colours and nothing else
 *
 * The band of each cell arrives with the cell. That is deliberate: BR-20's five
 * ranges and BR-17's sixty per cent are business rules, and a browser that
 * banded the numbers itself would be a second place for them to be wrong — one
 * that no backend test could reach. So `band` is read, never computed, and the
 * only judgement here is which colour a band is drawn in — and since #42 draws
 * the same bands one level up, even that judgement lives in `lib/bands.js`
 * rather than twice.
 *
 * ## The colours are a scale, and the flag is not part of it
 *
 * Bands two to five are one ramp from amber to green, because they are degrees
 * of the same thing. Band one is red and also carries a mark that is not a
 * colour, because the ticket asks for below-three to be *distinctly flagged*
 * and because a colour alone is not available to everyone reading it.
 *
 * ## The outcomes needing attention are written out
 *
 * Reading a heatmap tells you where to look, not what to do, and the ticket
 * asks for the list explicitly rather than left to be inferred from the
 * columns. It is the outcomes that did not clear BR-17 — the same rule the
 * Y/N column uses, so the list and the table cannot disagree.
 */

/**
 * What a cell says when it is read aloud rather than looked at.
 *
 * The whole point of the flag is that it does not depend on telling two shades
 * apart, and a label naming only the student and the outcome would have taken
 * the score away from the one reader who cannot see the colour at all.
 */
function spoken(student, clo, cell) {
  const score = cell.score === null ? 'ยังไม่มีคะแนน' : `${cell.score.toFixed(2)} คะแนน`
  return `${student.student_id} ${clo.clo_number} ${score}${cell.flagged ? ' ต่ำกว่าเกณฑ์' : ''}`
}

/**
 * The three figures, as one card each.
 *
 * `note` is where a figure says what it counted. Two of these three are pooled
 * over every (student, outcome) that has a score rather than over students, and
 * a percentage sitting beside a card reading *57 คน* is read as a share of
 * students however the label is worded. A fraction is not open to that.
 */
const card = (label, value, note) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-medium text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
  </div>
)

export default function LearningDetails() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getLearningDetails(sectionId))
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

  // Outcomes with no verdict at all: not passed, not failed, not asked.
  const unassessed = data ? data.clos.filter((clo) => clo.passed === null) : []

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && !data && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

      {data && (
        <>
          <div>
            <p className="text-xs font-medium text-slate-400">
              {data.section.subject_id} {data.section.subject_name_en}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">รายละเอียดผลการเรียนรู้</h1>
            <p className="mt-2 text-sm text-slate-500">
              ตอนเรียน {data.section.section_number} · ปีการศึกษา {data.section.academic_year} ·{' '}
              {data.clos.length} ผลการเรียนรู้
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {card('จำนวนนักศึกษา', `${data.summary.student_count} คน`, 'ที่ลงทะเบียนตอนเรียนนี้')}
            {card(
              'คะแนนเฉลี่ยรายคนรายข้อ',
              score(data.summary.mean, ' / 5'),
              `จาก ${data.summary.scored_count} ช่องที่มีคะแนน`,
            )}
            {card(
              'ผ่านเกณฑ์รายคนรายข้อ',
              figure(data.summary.pass_rate, '%'),
              `${data.summary.passed_count} จาก ${data.summary.scored_count} ช่องที่มีคะแนน`,
            )}
          </div>

          {data.empty ? (
            // Not a table of dashes: there is nothing to read yet, and a grid of
            // empty cells invites a teacher to look for a pattern in the fact
            // that nobody has marked anything.
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-600">ยังไม่มีคะแนนในตอนเรียนนี้</p>
              <p className="mt-2 text-sm text-slate-500">
                เมื่อบันทึกคะแนนกิจกรรมการเรียนรู้แล้ว ผลการเรียนรู้ของนักศึกษาจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-medium text-primary">
                    ผลการเรียนรู้รายบุคคล (เต็ม 5)
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
                  <table className="w-full min-w-[42rem] text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">รหัสนักศึกษา</th>
                        <th className="px-4 py-3 font-medium">ชื่อ</th>
                        {data.clos.map((clo) => (
                          <th key={clo.clo_id} className="px-4 py-3 text-center font-medium">
                            {clo.clo_number}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.students.map((student) => (
                        <tr key={student.student_id} className="border-b border-gray-100">
                          <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                            {student.student_id}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                            {student.full_name_th}
                          </td>
                          {data.clos.map((clo) => {
                            const cell = student.scores[clo.clo_id]
                            const look = cell.band ? BANDS[cell.band] : null
                            return (
                              <td key={clo.clo_id} className="px-1 py-1 text-center">
                                <span
                                  aria-label={spoken(student, clo, cell)}
                                  className={`inline-block w-full rounded-md px-2 py-1.5 text-xs font-medium ${
                                    look ? look.cell : 'bg-slate-50 text-slate-400'
                                  }`}
                                >
                                  {cell.score === null ? '—' : cell.score.toFixed(2)}
                                  {cell.flagged && <span className="ml-1 font-bold">!</span>}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 text-xs">
                      <tr>
                        <td className="px-4 py-3 font-medium text-slate-500" colSpan={2}>
                          คะแนนเฉลี่ย · อัตราผ่านเกณฑ์
                        </td>
                        {data.clos.map((clo) => (
                          <td
                            key={clo.clo_id}
                            aria-label={`สรุป ${clo.clo_number}`}
                            className="px-2 py-3 text-center text-slate-600"
                          >
                            <span className="block font-semibold">{score(clo.mean)}</span>
                            <span className="block">{figure(clo.pass_rate, '%')}</span>
                            {/* Three states, not two: an outcome nobody has been
                                marked on has not passed and has not failed, and
                                drawing it on the pass colour would say it did. */}
                            <span
                              className={`mt-1 inline-block rounded px-1.5 py-0.5 font-semibold ${
                                clo.passed === null
                                  ? 'bg-slate-100 text-slate-400'
                                  : clo.passed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {clo.passed === null ? '—' : clo.passed ? 'Y' : 'N'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-lg font-medium text-primary">ผลการเรียนรู้ที่ควรปรับปรุง</h2>
                <p className="mb-4 text-sm text-slate-500">
                  ข้อที่มีสัดส่วนนักศึกษาผ่านเกณฑ์ไม่เกิน 60% ตามเกณฑ์การประเมิน
                </p>
                {data.attention.length === 0 ? (
                  // An outcome nobody has been marked on has not passed, so
                  // *every outcome passed* is a sentence this screen is only
                  // entitled to when there are none of them. Otherwise it says
                  // the opposite of the dash in that column's own foot, three
                  // inches above.
                  unassessed.length === 0 ? (
                    <p className="text-sm text-emerald-700">
                      ทุกผลการเรียนรู้ผ่านเกณฑ์ ไม่มีข้อที่ต้องปรับปรุง
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">
                      ข้อที่ประเมินแล้วผ่านเกณฑ์ทุกข้อ ส่วน{' '}
                      <span className="font-semibold">
                        {unassessed.map((clo) => clo.clo_number).join(' · ')}
                      </span>{' '}
                      ยังไม่มีกิจกรรมใดวัด จึงยังตัดสินไม่ได้
                    </p>
                  )
                ) : (
                  <ul className="space-y-2">
                    {data.attention.map((clo) => (
                      <li
                        key={clo.clo_id}
                        aria-label={`ควรปรับปรุง ${clo.clo_number}`}
                        className="rounded-lg bg-red-50 p-3 text-sm text-red-900"
                      >
                        <span className="font-semibold">{clo.clo_number}</span> {clo.clo_detail}
                        <span className="ml-2 text-red-700">
                          (ผ่าน {clo.pass_rate}% · เฉลี่ย {score(clo.mean)})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </>
      )}
    </ContentMotionDIV>
  )
}

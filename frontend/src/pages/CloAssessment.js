import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HiOutlineArrowDownTray } from 'react-icons/hi2'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import { exportAssessmentToPdf } from '../components/results/assessmentPdf'
import { criterionLines, figure, score, verdictLabel } from '../lib/bands'
import { getCloAssessment } from '../api/cloAssessment'

/**
 * การประเมินผลการเรียนรู้ — #40.
 *
 * The formal assessment table, and the button that turns it into the document
 * it exists to be. R074 asks for the table and R075 for the PDF, and the PDF is
 * the reason the screen is shaped the way it is: what is on screen is what
 * prints, in the same order, under the same words.
 *
 * ## The criterion column states the rule, not the rubric
 *
 * `subject_clo_achievement_criteria` holds four sentences per outcome and not
 * one number, so nothing in it can decide whether a student met an outcome.
 * The line that decides is three of five, and BR-17's more-than-sixty-per-cent
 * decides the outcome. Those are what the column says, written by
 * `criterionLines` from the rule the server sent.
 *
 * The four bands are underneath, per outcome, as the reference they are. Put a
 * rubric sentence in the criterion column instead and every reader takes the
 * percentage beside it to be what that sentence produced.
 *
 * ## Three states, not two
 *
 * ผ่าน, ไม่ผ่าน, and **ยังไม่ประเมิน** — an outcome nobody has been marked on
 * has not failed. `outcomePassed` returns null there rather than false, and a
 * report printing ไม่ผ่าน against an outcome the term has not reached yet is
 * making an accusation the marks do not support. The verdict is a word with a
 * colour behind it and never a colour alone, which is also what the PDF does
 * and for the sharper reason: a course file gets photocopied.
 */

/**
 * The shade behind each verdict. The *word* is `verdictLabel`'s and is shared
 * with the PDF; only the colour is this screen's, because the PDF has no chips
 * and the two must not be able to disagree about what they call an outcome.
 */
const CHIPS = {
  true: 'bg-emerald-100 text-emerald-900',
  false: 'bg-red-100 text-red-900',
  null: 'bg-slate-100 text-slate-500',
}

const chipOf = passed => CHIPS[String(passed ?? null)]

export default function CloAssessment() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [showRubric, setShowRubric] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getCloAssessment(sectionId))
    } catch (error) {
      setData(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      // #43's walk found two screens that showed a refusal with
      // *กำลังโหลดข้อมูล…* under it for ever. The `finally` is the fix, and it
      // is one line per page rather than something shared.
      setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    load()
  }, [load])

  const [ruleScore, ruleShare] = data ? criterionLines(data.rule) : ['', '']

  const failing = data ? data.clos.filter(clo => clo.passed === false) : []

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && !data && (
        <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400">
                {data.subject.subject_id} {data.subject.subject_name_th}
              </p>
              <h1 className="mt-1 text-xl font-semibold text-primary">
                การประเมินผลการเรียนรู้
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                ตอนเรียน {data.section.section_number} · ภาคการศึกษา{' '}
                {data.section.semester} · ปีการศึกษา{' '}
                {data.section.academic_year}
              </p>
            </div>

            <button
              type="button"
              onClick={() => exportAssessmentToPdf(data)}
              disabled={data.empty || data.no_outcomes}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-secondary_hover disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <HiOutlineArrowDownTray className="h-5 w-5" aria-hidden="true" />
              บันทึกเป็น PDF
            </button>
          </div>

          {/* The rule, once and in full, above the table that applied it. The
              column repeats it per row so a row quoted on its own still says
              what judged it, but a reader meeting the page needs it stated
              plainly before the figures start. */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400">เกณฑ์การบรรลุ</p>
            <p className="mt-1 text-sm text-slate-700">
              ผลการเรียนรู้ข้อหนึ่งถือว่า <strong>ผ่าน</strong> เมื่อ{ruleShare}{' '}
              โดยผู้ที่ผ่านคือผู้ที่ได้{ruleScore}
            </p>
          </div>

          {data.no_outcomes ? (
            <div
              role="status"
              className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center"
            >
              <p className="text-sm font-medium text-slate-600">
                รายวิชานี้ยังไม่ได้กำหนดผลการเรียนรู้ จึงยังไม่มีอะไรให้ประเมิน
              </p>
              <p className="mt-1 text-xs text-slate-400">
                กำหนดผลการเรียนรู้ที่หน้า ผลการเรียนรู้รายวิชา ก่อน
              </p>
            </div>
          ) : data.empty ? (
            <div
              role="status"
              className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center"
            >
              <p className="text-sm font-medium text-slate-600">
                ตอนเรียนนี้ยังไม่มีคะแนน จึงยังประเมินผลการเรียนรู้ไม่ได้
              </p>
              <p className="mt-1 text-xs text-slate-400">
                บันทึกคะแนนกิจกรรมแล้วรายงานนี้จะคำนวณให้เอง
              </p>
            </div>
          ) : (
            <>
              {failing.length > 0 && (
                <p
                  role="status"
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                  <strong>
                    {failing.map(clo => clo.clo_number).join(' · ')}
                  </strong>{' '}
                  ยังไม่ผ่านเกณฑ์ที่ระบุไว้ข้างต้น
                </p>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-slate-400">
                      <th className="px-4 py-3 text-left font-medium">
                        ผลการเรียนรู้
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        เกณฑ์การบรรลุ
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        ผ่าน / ผู้มีคะแนน
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        ร้อยละ
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        คะแนนเฉลี่ย (เต็ม {data.rule.scale})
                      </th>
                      <th className="px-4 py-3 text-center font-medium">
                        ผลการประเมิน
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clos.map(clo => (
                        <tr
                          key={clo.clo_id}
                          className="border-b border-gray-100 last:border-0 align-top"
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-700">
                              {clo.clo_number}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {clo.clo_detail}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {ruleScore}
                            <span className="block">และ{ruleShare}</span>
                          </td>
                          <td
                            className="px-4 py-3 text-right tabular-nums text-slate-700"
                            aria-label={`ผ่าน ${clo.clo_number} ${clo.passed_count} จาก ${clo.student_count}`}
                          >
                            {clo.passed_count} / {clo.student_count}
                          </td>
                          <td
                            className="px-4 py-3 text-right tabular-nums font-medium text-slate-700"
                            aria-label={`ร้อยละ ${clo.clo_number} ${figure(clo.pass_rate)}`}
                          >
                            {figure(clo.pass_rate, '%')}
                          </td>
                          <td
                            className="px-4 py-3 text-right tabular-nums text-slate-700"
                            aria-label={`เฉลี่ย ${clo.clo_number} ${score(clo.mean)}`}
                          >
                            {score(clo.mean)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${chipOf(clo.passed)}`}
                              aria-label={`ผลการประเมิน ${clo.clo_number} ${verdictLabel(clo.passed)}`}
                            >
                              {verdictLabel(clo.passed)}
                            </span>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* The rubric, per outcome and behind a disclosure. It is what #29
              wrote and it is worth reading, but it decided none of the figures
              above, so it does not sit among them. */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowRubric(one => !one)}
              aria-expanded={showRubric}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-medium text-slate-700">
                เกณฑ์การบรรลุผลสี่ระดับของแต่ละข้อ (อ้างอิง)
              </span>
              <span className="text-xs text-slate-400">
                {showRubric ? 'ซ่อน' : 'แสดง'}
              </span>
            </button>

            {showRubric && (
              <div className="space-y-4 border-t border-gray-100 px-4 py-4">
                {data.clos.map(clo => (
                  <div key={clo.clo_id}>
                    <p className="text-xs font-medium text-slate-500">
                      {clo.clo_number}
                    </p>
                    {clo.criteria.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-400">
                        ยังไม่ได้กำหนดเกณฑ์การบรรลุผลของข้อนี้
                      </p>
                    ) : (
                      <dl className="mt-1 space-y-1">
                        {clo.criteria.map(one => (
                          <div
                            key={one.criteria_no}
                            className="flex gap-3 text-xs"
                          >
                            <dt className="w-24 shrink-0 font-medium text-slate-600">
                              {one.achievement_level}
                            </dt>
                            <dd className="text-slate-500">
                              {one.criteria_detail}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </ContentMotionDIV>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import RadarChart, {
  MAX_COMPARISONS,
  seriesStyle,
} from '../components/RadarChart'
import { figure, score } from '../lib/bands'
import { getSectionResults } from '../api/sectionResults'

/**
 * ผลลัพธ์การเรียนรู้รายวิชา — #36.
 *
 * How this ตอนเรียน did against each of its CLOs, as one shape, with previous
 * years of the same รายวิชา laid over it.
 *
 * ## The chart is not the data
 *
 * Every number the radar draws is also in the table under it, to two decimal
 * places, with the pass rate and the verdict beside it. That is not a courtesy:
 * a radar is very good at *this year is smaller than last year* and very bad at
 * *by how much*, and the questions a ผู้สอน brings to this screen — which
 * outcome fell, did it fall below the line — are answered by the figure and not
 * by the shape. The table is also the whole of the screen for a reader who
 * cannot see the shape at all.
 *
 * ## Which years may be ticked is the server's to say
 *
 * The picker lists what came back in `available_years` and nothing else. A CLO
 * belongs to a (Program, Subject, academic year), so two years' CLO-3 need not
 * be the same outcome, and the server offers a year only when the two years'
 * CLO numbers match exactly. The browser does not re-derive that — it could
 * only re-derive it wrongly, and a year drawn on axes that do not mean the same
 * thing is a chart that lies quietly.
 *
 * ## Ticking a year is a request
 *
 * Not a filter over data already here. The comparison years are computed from
 * marks the browser has never seen — an entire cohort of a past year — and
 * fetching them only when asked keeps the first paint about this ตอนเรียน.
 */

/**
 * The three figures, as one card each — the same shape #38 uses.
 *
 * `note` is where a figure says what it counted. Two of the three are pooled
 * over every (student, outcome) that has a score rather than over students, and
 * a percentage beside a card reading *57 คน* is read as a share of students
 * however it is labelled. A fraction is not open to that.
 */
const card = (label, value, note) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-medium text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
  </div>
)

/** An outcome's verdict, in the three states BR-17 actually has. */
const verdict = passed => (
  <span
    className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
      passed === null
        ? 'bg-slate-100 text-slate-400'
        : passed
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-red-100 text-red-800'
    }`}
  >
    {passed === null ? 'ยังไม่ได้วัด' : passed ? 'ผ่าน' : 'ไม่ผ่าน'}
  </span>
)

export default function SectionResults() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [years, setYears] = useState([])
  // The years the drawing on screen is actually of. It trails `years` by one
  // request, and it is what a refused tick is put back to — otherwise the box
  // stays ticked for a year the chart does not contain.
  const [shown, setShown] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  // Which read is the current one. Two ticks in quick succession are two reads
  // in flight, and without this the slower one wins whichever it was — the
  // defect #68 names on another screen, not repeated here.
  const latest = useRef(0)

  const load = useCallback(async () => {
    const ticket = latest.current + 1
    latest.current = ticket
    setLoading(true)
    try {
      const answer = await getSectionResults(sectionId, years)
      if (ticket !== latest.current) return
      setData(answer)
      setShown(years)
    } catch (error) {
      if (ticket !== latest.current) return
      // A refused *overlay* must not take the screen with it. The base read
      // failing means this ตอนเรียน cannot be shown at all and the screen goes
      // blank under the refusal; a year failing means only that year failed, so
      // the chart stays and the tick goes back to what is drawn. Blanking both
      // stranded the bad year in state with no control left to clear it, and
      // only a reload recovered — found by review.
      if (years.length === 0) setData(null)
      else setYears(shown)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      // Cleared on the refusal too, not only on the answer. #43's hand-walk
      // found the other shape of this: a screen that shows a refusal and
      // *กำลังโหลดข้อมูล…* underneath it, for ever.
      if (ticket === latest.current) setLoading(false)
    }
  }, [sectionId, years, shown])

  useEffect(() => {
    load()
  }, [load])

  const full = years.length >= MAX_COMPARISONS
  const toggleYear = year =>
    setYears(chosen =>
      chosen.includes(year)
        ? chosen.filter(one => one !== year)
        : [...chosen, year].sort()
    )

  if (!data) {
    return (
      <ContentMotionDIV className="space-y-4 px-6 py-6">
        <Notice notice={notice} />
        {loading && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}
      </ContentMotionDIV>
    )
  }

  const axes = data.clos.map(clo => clo.clo_number)
  const series = [
    {
      label: `ปีการศึกษา ${data.section.academic_year}`,
      values: data.clos.map(clo => clo.mean),
    },
    ...data.comparison.map(year => ({
      label: `ปีการศึกษา ${year.academic_year}`,
      values: year.clos.map(clo => clo.mean),
    })),
  ]

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      <div>
        <p className="text-xs font-medium text-slate-400">
          {data.section.subject_id} {data.section.subject_name_en}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-primary">
          ผลลัพธ์การเรียนรู้รายวิชา
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          ตอนเรียน {data.section.section_number} · ปีการศึกษา{' '}
          {data.section.academic_year} · {data.clos.length} ผลการเรียนรู้ ·
          คะแนนทุกข้อเทียบเป็นคะแนนเต็ม 5
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {card(
          'จำนวนนักศึกษา',
          `${data.summary.student_count} คน`,
          'ที่ลงทะเบียนตอนเรียนนี้'
        )}
        {card(
          'คะแนนเฉลี่ยรายคนรายข้อ',
          score(data.summary.mean, ' / 5'),
          `จาก ${data.summary.scored_count} ช่องที่มีคะแนน`
        )}
        {card(
          'ผ่านเกณฑ์รายคนรายข้อ',
          figure(data.summary.pass_rate, '%'),
          `${data.summary.passed_count} จาก ${data.summary.scored_count} ช่องที่มีคะแนน`
        )}
      </div>

      {data.empty ? (
        // A radar of nothing is a dot in the middle of five rings, which reads
        // as a class that scored zero on everything. So there is no chart at
        // all until there is something to draw.
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">
            ยังไม่มีคะแนนในตอนเรียนนี้
          </p>
          <p className="mt-2 text-sm text-slate-500">
            เมื่อบันทึกคะแนนกิจกรรมการเรียนรู้แล้ว
            ผลการเรียนรู้รายข้อและกราฟเรดาร์จะแสดงที่นี่
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-primary">
            ผลการเรียนรู้รายข้อ (เต็ม 5)
          </h2>

          {data.available_years.length > 0 ? (
            <fieldset className="mt-4">
              <legend className="text-sm text-slate-600">
                เปรียบเทียบผลการเรียนรู้ย้อนหลัง
              </legend>
              <p className="mt-1 text-xs text-slate-400">
                แสดงเฉพาะปีที่มีผลการเรียนรู้รายวิชาชุดเดียวกันกับปีนี้
                ตัวเลขของแต่ละปีรวบจากทุกตอนเรียนของรายวิชาในปีนั้น
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                {data.available_years.map(year => (
                  <label
                    key={year.academic_year}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={years.includes(year.academic_year)}
                      disabled={full && !years.includes(year.academic_year)}
                      onChange={() => toggleYear(year.academic_year)}
                      className="h-4 w-4 rounded border-gray-300 disabled:opacity-40"
                    />
                    ปีการศึกษา {year.academic_year}
                    <span className="text-xs text-slate-400">
                      ({year.section_count} ตอนเรียน · {year.student_count} คน)
                    </span>
                  </label>
                ))}
              </div>
              {full && (
                // Said, not merely done. A box that has gone grey without a
                // reason reads as a fault in the screen.
                <p className="mt-2 text-xs text-slate-400">
                  เทียบได้ครั้งละไม่เกิน {MAX_COMPARISONS} ปี
                  เอาปีที่เลือกไว้ออกก่อนจึงจะเลือกปีอื่นได้
                </p>
              )}
            </fieldset>
          ) : (
            // Said out loud rather than left as an absent control. A ผู้สอน
            // who has heard the screen compares years and cannot find where
            // is owed the reason, and the reason is about their data.
            <p className="mt-4 text-xs text-slate-400">
              ยังไม่มีปีการศึกษาก่อนหน้าที่เทียบได้ —
              ต้องเป็นปีที่เปิดสอนรายวิชานี้ มีผลการเรียนรู้รายวิชาชุดเดียวกัน
              และบันทึกคะแนนไว้แล้ว
            </p>
          )}

          <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-start">
            {axes.length < 3 ? (
              // Three axes is the fewest a polygon has. Two outcomes draw a
              // line and one draws a dot, and neither is a shape anybody can
              // read — so the figures stand alone in the table below, and the
              // reason is written rather than left as a gap on the page.
              <p className="text-sm text-slate-500">
                รายวิชานี้มีผลการเรียนรู้ {axes.length} ข้อ
                ซึ่งน้อยเกินกว่าจะวาดเป็นกราฟเรดาร์ได้
                ตัวเลขทั้งหมดอยู่ในตารางด้านล่าง
              </p>
            ) : (
              <RadarChart
                axes={axes}
                series={series}
                title={`ผลการเรียนรู้รายข้อของตอนเรียน ${data.section.section_number} เทียบเป็นคะแนนเต็ม 5`}
              />
            )}

            <ul className="space-y-2">
              {series.map((one, index) => {
                const style = seriesStyle(index)
                return (
                  <li
                    key={one.label}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <svg width="28" height="10" aria-hidden="true">
                      <line
                        x1="0"
                        y1="5"
                        x2="28"
                        y2="5"
                        stroke={style.stroke}
                        strokeWidth="2"
                        strokeDasharray={style.dash || undefined}
                      />
                    </svg>
                    {one.label}
                    {/* The stroke named in words, so the legend does not rest
                        on telling four colours apart. */}
                    <span className="text-xs text-slate-400">
                      ({style.dashLabel})
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* The table scrolls in its own frame so the page never does — #98. */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">
                คะแนนเฉลี่ยและอัตราผ่านเกณฑ์ของผลการเรียนรู้รายวิชาแต่ละข้อ
              </caption>
              <thead className="border-b border-gray-200 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ผลการเรียนรู้</th>
                  {series.map(one => (
                    <th
                      key={one.label}
                      className="px-4 py-3 text-center font-medium"
                    >
                      {one.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-medium">
                    อัตราผ่านเกณฑ์ปีนี้
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    สรุปปีนี้
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.clos.map((clo, index) => (
                  <tr key={clo.clo_id} className="border-b border-gray-100">
                    <td className="px-4 py-2">
                      <span className="font-medium text-slate-700">
                        {clo.clo_number}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        {clo.clo_detail}
                      </span>
                    </td>
                    {series.map(one => (
                      <td
                        key={one.label}
                        aria-label={`${clo.clo_number} ${one.label} ${
                          one.values[index] === null
                            ? 'ยังไม่ได้วัด'
                            : `${one.values[index].toFixed(2)} คะแนน`
                        }`}
                        className="px-4 py-2 text-center text-slate-600"
                      >
                        {score(one.values[index])}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center text-slate-600">
                      {figure(clo.pass_rate, '%')}
                      <span className="ml-1 text-xs text-slate-400">
                        ({clo.student_count} คน)
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {verdict(clo.passed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            ข้อหนึ่งถือว่าผ่านเมื่อมีนักศึกษาผ่านเกณฑ์ข้อนั้นมากกว่าร้อยละ 60
            (ร้อยละ 60 พอดียังไม่ผ่าน) และนักศึกษาหนึ่งคนถือว่าผ่านข้อหนึ่งที่{' '}
            {data.band_floors[1].toFixed(1)} คะแนนขึ้นไป
            ช่องที่ยังไม่มีใครถูกวัดจะเว้นว่างและกราฟจะขาดตอนตรงนั้น
            ไม่ใช่ลากลงศูนย์
          </p>
        </div>
      )}
    </ContentMotionDIV>
  )
}

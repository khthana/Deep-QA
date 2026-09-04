import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import RadarChart, {
  AVERAGE_STYLE,
  MAX_AXES,
  MAX_STUDENTS,
  seriesStyle,
} from '../components/RadarChart'
import { BANDS, score } from '../lib/bands'
import { getLearningDetails } from '../api/learningDetails'

/**
 * ผลลัพธ์การเรียนรู้รายบุคคล — #37.
 *
 * One student's shape against the shape of the class they sat in, and up to
 * four of them at once so that the spread between them is a thing you can see
 * rather than a thing you infer from a column of numbers.
 *
 * ## This screen computes nothing, and reads #38's endpoint to prove it
 *
 * The fifth criterion asks that the scores use the same five-point
 * normalisation as the Section results. The cheapest way to satisfy that is a
 * test; the honest way is to make it impossible to break, and that is what
 * reading `/learning-details` does. The heatmap already folds every student of
 * this ตอนเรียน against every outcome of it, behind the same guard, with the
 * Section's own mean per outcome in `clos[]` — which is exactly and entirely
 * what a radar of one student against the class needs.
 *
 * `backend/lib/attainment.js` sets the rule this follows: the arithmetic is
 * shared, and the query stays in the route because *what counts as the marks in
 * scope* is what differs between screens. Here nothing differs — same Section,
 * same marks, same fold — so a route of this screen's own would have been a
 * second copy of a query whose only future is to disagree with the first.
 *
 * It costs a coupling, and the coupling is worth naming: if #38's response
 * shape moves, this screen moves with it. That is the ordinary price of one
 * answer instead of two, and `37a`'s rows fail loudly if it is ever paid
 * carelessly.
 *
 * ## The roll arrives with the chart, which is why the picker can be searched
 *
 * The class list endpoint pages at ten. A ตอนเรียน of fifty-seven behind a
 * picker that pages is a person clicking *ถัดไป* five times to find one
 * student. Reading the heatmap's answer instead means the whole roll is already
 * here, so the search box filters what is in memory, choosing a student makes
 * no request at all, and the chart redraws in the same frame as the tick.
 *
 * ## Ten axes, and the table has the rest
 *
 * The fourth criterion caps the chart and asks that the screen say so. The cap
 * is the chart's alone — every outcome keeps its row in the table underneath,
 * because the table was always where the numbers get read. See #36's note on
 * what a radar is good at (*this one is smaller than that one*) and bad at
 * (*by how much*).
 */

/** What the Section's own line is called, in the chart, the legend and the table. */
const AVERAGE = 'ค่าเฉลี่ยของตอนเรียน'

/** Whether this student has been measured on any of the outcomes given. */
const hasAnyScore = (student, clos) =>
  clos.some(clo => student.scores[clo.clo_id].score !== null)

/** What a disabled box points at for its reason. */
const FULL_REASON = 'student-results-full'

/** A student, as a person is asked to recognise them: code first, then name. */
const nameOf = student => `${student.student_id} ${student.full_name_th}`

export default function StudentResults() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  // The codes on the chart, in the order they were ticked, which is the order
  // they take the palette in.
  const [chosen, setChosen] = useState([])
  const [term, setTerm] = useState('')

  // Which read is the current one. Moving between two ตอนเรียน quickly puts two
  // reads in flight and this screen is not remounted between them, so without
  // the ticket the slower one wins whichever it was - the defect #68 names on
  // another screen and #36 guards against on this one's sibling.
  const latest = useRef(0)

  const load = useCallback(async () => {
    const ticket = latest.current + 1
    latest.current = ticket
    setLoading(true)
    try {
      const answer = await getLearningDetails(sectionId)
      if (ticket !== latest.current) return
      setData(answer)
      // Cleared on the way in, not only set on the way out. A refusal read
      // followed by a good one otherwise leaves the old sentence standing over
      // a screen it is no longer about. Found by review.
      setNotice(null)
    } catch (error) {
      if (ticket !== latest.current) return
      setData(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      // Cleared on the refusal too. #43's hand-walk found the other shape of
      // this on two screens: a refusal with กำลังโหลดข้อมูล… underneath it, for
      // ever.
      if (ticket === latest.current) setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    load()
  }, [load])

  // A ตอนเรียน changing under the screen must not leave the previous one's
  // codes ticked. They would match nobody on the new roll and draw nothing,
  // which reads as a chart that has stopped working.
  useEffect(() => {
    setChosen([])
    setTerm('')
  }, [sectionId])

  const students = useMemo(() => data?.students ?? [], [data])
  const picked = useMemo(
    () =>
      chosen
        .map(code => students.find(student => student.student_id === code))
        .filter(Boolean),
    [chosen, students]
  )

  if (!data) {
    return (
      <ContentMotionDIV className="space-y-4 px-6 py-6">
        <Notice notice={notice} />
        {loading && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}
      </ContentMotionDIV>
    )
  }

  const full = chosen.length >= MAX_STUDENTS
  const toggle = code =>
    setChosen(current =>
      current.includes(code)
        ? current.filter(one => one !== code)
        : current.length >= MAX_STUDENTS
          ? current
          : [...current, code]
    )

  // Whoever matches what has been typed, plus whoever is already on the chart.
  // The second half is not a nicety: a filter that hid a ticked student would
  // leave their line drawn with no control left to take it off, and only a
  // reload would recover — the shape of defect #36's review found in its
  // refusal path.
  const query = term.trim().toLowerCase()
  const offered = students.filter(
    student =>
      chosen.includes(student.student_id) ||
      query === '' ||
      nameOf(student).toLowerCase().includes(query)
  )

  const drawnClos = data.clos.slice(0, MAX_AXES)
  const axes = drawnClos.map(clo => clo.clo_number)
  const series = [
    {
      label: AVERAGE,
      style: AVERAGE_STYLE,
      values: drawnClos.map(clo => clo.mean),
    },
    ...picked.map((student, index) => ({
      label: student.student_id,
      name: student.full_name_th,
      // The palette entry with its fill taken off. `AVERAGE_STYLE` says it is
      // the only filled series on this chart and it has to be: four closed
      // polygons washed over one another is mud, and the fill is what makes
      // the average read as the ground the others stand on rather than as a
      // fifth competitor. Found by review, which noticed the comment and the
      // code disagreeing.
      style: { ...seriesStyle(index), fill: 'none' },
      values: drawnClos.map(clo => student.scores[clo.clo_id].score),
    })),
  ]

  // Named rather than drawn. A student with nothing on the chart is an empty
  // polygon — no line at all — and a reader who ticked a box and saw nothing
  // appear is owed the reason. The sixth criterion.
  //
  // **Whose reason has two different answers, and the tenth axis is what
  // separates them.** Asking `data.clos` rather than `drawnClos` was the first
  // version of this and was wrong: a student marked only on outcomes past the
  // cap counts as marked, draws nothing, and is told nothing — exactly the
  // ticked box and unchanged chart this sentence exists to prevent, arrived at
  // by the fourth criterion rather than by the sixth. Found by review.
  const silent = picked.filter(student => !hasAnyScore(student, drawnClos))
  const neverMarked = silent.filter(student => !hasAnyScore(student, data.clos))
  const offChartOnly = silent.filter(student => hasAnyScore(student, data.clos))

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      <div>
        <p className="text-xs font-medium text-slate-400">
          {data.section.subject_id} {data.section.subject_name_en}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-primary">
          ผลลัพธ์การเรียนรู้รายบุคคล
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          ตอนเรียน {data.section.section_number} · ปีการศึกษา{' '}
          {data.section.academic_year} · {data.summary.student_count} คน ·{' '}
          {data.clos.length} ผลการเรียนรู้ · คะแนนทุกข้อเทียบเป็นคะแนนเต็ม 5
        </p>
      </div>

      {data.empty ? (
        // The same reasoning as #36's: a radar of nothing is a dot in the
        // middle of five rings, which reads as a class that scored zero on
        // everything rather than as a class nobody has marked yet.
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">
            ยังไม่มีคะแนนในตอนเรียนนี้
          </p>
          <p className="mt-2 text-sm text-slate-500">
            เมื่อบันทึกคะแนนกิจกรรมการเรียนรู้แล้ว
            ผลการเรียนรู้รายบุคคลและกราฟเรดาร์จะแสดงที่นี่
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-medium text-primary">เลือกนักศึกษา</h2>
            <p className="mt-1 text-xs text-slate-400">
              เลือกได้ครั้งละไม่เกิน {MAX_STUDENTS} คน
              เพื่อให้แต่ละเส้นยังแยกออกจากกันได้
            </p>
            <input
              value={term}
              onChange={event => setTerm(event.target.value)}
              // Labelled as well as prompted. A placeholder is the accessible
              // name only until somebody types, at which point the field goes
              // nameless for a screen reader. Found by review.
              aria-label="ค้นหานักศึกษาด้วยรหัสหรือชื่อ"
              placeholder="ค้นหาด้วยรหัสหรือชื่อ"
              className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
            />

            <div className="mt-3 max-h-96 space-y-1 overflow-y-auto">
              {offered.length === 0 && (
                <p className="p-2 text-sm text-slate-500">
                  ไม่พบนักศึกษาที่ตรงกับคำค้นหา
                </p>
              )}
              {offered.map(student => {
                const marked = hasAnyScore(student, data.clos)
                return (
                  <label
                    key={student.student_id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      // The code and the name together, because that is what a
                      // ผู้สอน is asked to recognise and it is what every row
                      // that addresses a student here matches on.
                      aria-label={nameOf(student)}
                      checked={chosen.includes(student.student_id)}
                      disabled={full && !chosen.includes(student.student_id)}
                      // The reason travels with the control, not only beside
                      // it. A reader who tabs to a greyed box hears why it is
                      // greyed rather than having to find the sentence under
                      // the list. Found by review.
                      aria-describedby={
                        full && !chosen.includes(student.student_id)
                          ? FULL_REASON
                          : undefined
                      }
                      onChange={() => toggle(student.student_id)}
                      className="h-4 w-4 rounded border-gray-300 disabled:opacity-40"
                    />
                    <span className="text-gray-900">{student.full_name_th}</span>
                    <span className="ml-auto text-xs text-slate-500">
                      {student.student_id}
                    </span>
                    {!marked && (
                      <span className="text-xs text-amber-700">
                        ยังไม่มีคะแนน
                      </span>
                    )}
                  </label>
                )
              })}
            </div>

            {full && (
              // Said, not merely done. A box that has gone grey without a
              // reason reads as a fault in the screen.
              <p id={FULL_REASON} className="mt-3 text-xs text-slate-400">
                เลือกครบ {MAX_STUDENTS} คนแล้ว
                เอาคนที่เลือกไว้ออกก่อนจึงจะเลือกคนอื่นได้
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-primary">
              ผลการเรียนรู้รายข้อ (เต็ม 5)
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              เส้นพื้นหลังคือค่าเฉลี่ยของทั้งตอนเรียน
              เลือกนักศึกษาเพื่อวางเส้นของแต่ละคนทับลงไป
            </p>

            {data.clos.length > MAX_AXES && (
              // The cap said out loud, with both numbers in it — the fourth
              // criterion asks for the sentence and not only for the ceiling.
              <p className="mt-2 text-xs text-amber-700">
                กราฟแสดงผลการเรียนรู้ {MAX_AXES} ข้อแรก จากทั้งหมด{' '}
                {data.clos.length} ข้อ
                คะแนนของทุกข้ออยู่ในตารางด้านล่างครบถ้วน
              </p>
            )}

            <div className="mt-4 flex flex-col items-center gap-6 lg:flex-row lg:items-start">
              {/* The chart says so itself when there are too few axes to draw
                  a polygon — it is the one that knows. */}
              <RadarChart
                axes={axes}
                series={series}
                title={`ผลการเรียนรู้รายข้อของนักศึกษาที่เลือก เทียบกับค่าเฉลี่ยของตอนเรียน ${data.section.section_number} เป็นคะแนนเต็ม 5`}
              />

              <ul className="space-y-2">
                {series.map(one => (
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
                        stroke={one.style.stroke}
                        strokeWidth="2"
                        strokeDasharray={one.style.dash || undefined}
                      />
                    </svg>
                    {one.label}
                    {one.name && (
                      <span className="text-slate-500">{one.name}</span>
                    )}
                    {/* The stroke named in words, so the legend does not rest
                        on telling five colours apart. */}
                    <span className="text-xs text-slate-400">
                      ({one.style.dashLabel})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {picked.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                ยังไม่ได้เลือกนักศึกษา —
                กราฟกำลังแสดงเฉพาะค่าเฉลี่ยของทั้งตอนเรียน
              </p>
            )}

            {silent.length > 0 && (
              // One live region and not two, because it is one answer to one
              // question — *why is there no line for the name I just ticked* —
              // and a reader waiting for a line should not have to find which
              // of two paragraphs is about them. A live region because it is a
              // consequence of ticking a box rather than part of the page.
              <div role="status" className="mt-4 space-y-1 text-sm text-amber-700">
                {neverMarked.length > 0 && (
                  <p>
                    {neverMarked.map(nameOf).join(' · ')}{' '}
                    ยังไม่มีคะแนนที่บันทึกไว้ในตอนเรียนนี้
                    จึงยังไม่มีเส้นบนกราฟ
                    และช่องในตารางเว้นว่างไว้
                  </p>
                )}
                {offChartOnly.length > 0 && (
                  <p>
                    {offChartOnly.map(nameOf).join(' · ')}{' '}
                    มีคะแนนเฉพาะข้อที่ไม่ได้อยู่บนกราฟ จึงยังไม่มีเส้น
                    คะแนนของเขาอยู่ในตารางด้านล่างครบถ้วน
                  </p>
                )}
              </div>
            )}

            {/* The table scrolls in its own frame so the page never does — #98. */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">
                  คะแนนรายข้อของนักศึกษาที่เลือก เทียบกับค่าเฉลี่ยของตอนเรียน
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
                        {one.name && (
                          <span className="block font-normal text-slate-400">
                            {one.name}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.clos.map(clo => (
                    <tr key={clo.clo_id} className="border-b border-gray-100">
                      <td className="px-4 py-2">
                        <span className="font-medium text-slate-700">
                          {clo.clo_number}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          {clo.clo_detail}
                        </span>
                      </td>
                      <td
                        aria-label={`${clo.clo_number} ${AVERAGE} ${
                          clo.mean === null
                            ? 'ยังไม่ได้วัด'
                            : `${clo.mean.toFixed(2)} คะแนน`
                        }`}
                        className="px-4 py-2 text-center text-slate-600"
                      >
                        {score(clo.mean)}
                      </td>
                      {picked.map(student => {
                        const cell = student.scores[clo.clo_id]
                        return (
                          <td
                            key={student.student_id}
                            // The band is the one thing on a cell a person can
                            // see that the number does not already say, so it
                            // is drawn — from the band the server sent, in the
                            // colours #38 established. `lib/bands.js` owns
                            // them; a second palette here would be a second
                            // thing to keep in step.
                            className={`px-4 py-2 text-center ${
                              cell.band === null
                                ? 'text-slate-400'
                                : BANDS[cell.band].cell
                            }`}
                            aria-label={`${clo.clo_number} ${student.student_id} ${
                              cell.score === null
                                ? 'ยังไม่ได้วัด'
                                : `${cell.score.toFixed(2)} คะแนน`
                            }${cell.flagged ? ' ต่ำกว่าเกณฑ์' : ''}`}
                          >
                            {score(cell.score)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              นักศึกษาหนึ่งคนถือว่าผ่านข้อหนึ่งที่{' '}
              {data.band_floors[1].toFixed(1)} คะแนนขึ้นไป
              ช่องที่ยังไม่มีใครถูกวัดจะเว้นว่างและกราฟจะขาดตอนตรงนั้น
              ไม่ใช่ลากลงศูนย์
            </p>
          </div>
        </div>
      )}
    </ContentMotionDIV>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'

import BandLegend from '../components/results/BandLegend'
import ContentMotionDIV from '../components/ContentMotionDIV'
import ContributionsPanel from '../components/results/ContributionsPanel'
import Notice from '../components/Notice'
import { BANDS, score } from '../lib/bands'
import { OUTCOME_TYPES } from '../lib/outcomes'
import { CohortPickers, NoStudentsYet, useCohortPickers } from '../components/results/CohortPickers'
import { getEvidenceFile, showPdf } from '../api/evidence'
import { getStudentContributions, getStudentResults, listRoll } from '../api/programResults'

/**
 * ผลการเรียนรู้ระดับหลักสูตรรายบุคคล — #45.
 *
 * The last of the four programme-level reports, and the only one about a
 * person. #42 asks how an intake did, #43 asks who inside it is struggling,
 * #44 asks whether last year's revision worked — and this one answers the
 * question all three of them raise and none of them can settle: *this student,
 * on this outcome, on the strength of what?*
 *
 * It is the screen an appeal is read from, and that is the whole of why it is
 * built the way it is below.
 *
 * ## One row of the heatmap, and provably the same row
 *
 * Everything here is #43's grid narrowed to a single student. The two could
 * have been made to agree by comparing them and finding that they did; instead
 * the server builds both with one `cellsFor` over marks read by one
 * `cohortMarks`, so a band, a flag and a count have one reading and are
 * rendered twice. A person who clicks a red cell on the heatmap and lands here
 * cannot be shown a different figure, because there is not a second figure to
 * be shown.
 *
 * ## Every outcome, including the ones nobody measured them on
 *
 * Thirteen rows whatever this student has sat. #38's rule at the grain of one
 * person: an outcome with no mark behind it is *ยังไม่มีการวัด* and neither a
 * pass nor a failure — and on an appeal it is the most important row on the
 * page, because a student cannot be held to an outcome nobody assessed them
 * against.
 *
 * A student nobody has marked at all gets a sentence rather than thirteen
 * dashes, for the reason #42's and #43's empty states already give one: a page
 * of blanks reads as a report that this person failed everything.
 *
 * ## The picker is the register's, and it says who has nothing
 *
 * From `/by-intake/roll` rather than from the marks, so the unassessed student
 * is choosable — again, the case an appeal is most likely to be about. Each row
 * says *ยังไม่มีคะแนน* where that is true, which is #37's wording for the same
 * state; a second sentence for one condition is a difference a reader hears
 * and cannot account for.
 *
 * ## The evidence is the student's own
 *
 * The drill-down is #42's, narrowed by the server to what this student was
 * actually marked on. An Activity the cohort sat and this person did not is
 * not evidence about this person, and on the screen an appeal is read from
 * that is not a cosmetic difference. Opening a file is #35's authenticated
 * retrieval, reached by the same road and shown from the bytes that come back.
 */

/**
 * What a student's row says when it is read aloud rather than looked at.
 *
 * Deliberately not #43's `spoken`, though it is close enough to be mistaken for
 * a copy of it, and the two differences are both about the report this one
 * looks like rather than the grain it reports at:
 *
 * - an outcome with no score says *ยังไม่มีการวัด*, which is #42's row wording,
 *   where #43's *cell* says *ยังไม่มีคะแนน*. This page is #42's table with #43's
 *   figures in it, and a reader who hears two sentences for one state cannot
 *   account for the difference;
 * - a score at or above the line says *ถึงเกณฑ์* rather than saying nothing.
 *   #43's cells are one row of thirteen among a hundred and are read as a
 *   pattern; these thirteen are the whole of what is said about one person, and
 *   silence on the good ones would leave a reader counting what was *not* said.
 */
function spoken(student, plo) {
  if (plo.score === null) return `${plo.outcome_code} ยังไม่มีการวัด`
  const line = plo.flagged ? 'ต่ำกว่าเกณฑ์' : 'ถึงเกณฑ์'
  return `${student.student_id} ${plo.outcome_code} ${plo.score.toFixed(2)} คะแนน ${line}`
}

/** One row of the picker, matched on the whole of what it shows. */
const matches = (student, term) =>
  `${student.student_id} ${student.full_name_th}`.toLowerCase().includes(term.trim().toLowerCase())

export default function ProgramLevelIndividual() {
  const [roll, setRoll] = useState([])
  const [term, setTerm] = useState('')
  const [chosen, setChosen] = useState('')
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(null)
  const [drill, setDrill] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)

  const report = error => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }

  const { programs, program, setProgram, intakes, intake, setIntake, asked } =
    useCohortPickers(report)

  const loadRoll = useCallback(async () => {
    if (!program || !intake) {
      setRoll([])
      setChosen('')
      return
    }
    try {
      const { students } = await listRoll(program, intake)
      setRoll(students)
      // Kept if the roll still has them, chosen for them if it does not.
      // Functional because the roll can land twice — a re-fetch, or React's
      // double-invoke in development — and a plain assignment would throw away
      // a student the reader had already picked. #44's suite found that defect
      // on the screen beside this one; it is not being written a second time.
      setChosen(current =>
        students.some(student => student.student_id === current) ? current : '',
      )
    } catch (error) {
      setRoll([])
      setChosen('')
      report(error)
    }
    // `report` is rebuilt every render; depending on it would re-ask on every
    // keystroke in the search box.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, intake])

  useEffect(() => {
    loadRoll()
  }, [loadRoll])

  const load = useCallback(async () => {
    setOpen(null)
    setDrill(null)
    if (!program || !chosen) {
      setData(null)
      // Nothing asked for is an answer and not a wait — the ตอบไม่ได้แต่ยัง
      // โหลดอยู่ state #43's hand-walk found on two screens.
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setData(await getStudentResults(program, chosen))
    } catch (error) {
      setData(null)
      report(error)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, chosen])

  useEffect(() => {
    load()
  }, [load])

  const offered = useMemo(() => roll.filter(student => matches(student, term)), [roll, term])

  async function toggle(plo) {
    if (open === plo.outcome_id) {
      setOpen(null)
      setDrill(null)
      return
    }
    setOpen(plo.outcome_id)
    setDrill(null)
    try {
      setDrill(await getStudentContributions(program, chosen, plo.outcome_id))
    } catch (error) {
      report(error)
    }
  }

  const openEvidence = async file => {
    setNotice(null)
    try {
      showPdf(await getEvidenceFile(file.evidence_id), file.file_name)
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    }
  }

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      <div>
        <h1 className="text-xl font-semibold text-primary">
          ผลการเรียนรู้ระดับหลักสูตรรายบุคคล
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          นักศึกษาหนึ่งคน เทียบกับผลการเรียนรู้ระดับหลักสูตรทุกข้อที่หลักสูตรสัญญาไว้
          เลือกข้อใดข้อหนึ่งเพื่อดูรายวิชา กิจกรรม และหลักฐานที่เป็นที่มาของคะแนนข้อนั้นของคนคนนี้
        </p>
      </div>

      {/* The same two questions the three screens beside this one open on,
          drawn by the same component. #44 takes them apart because its second
          question is a *range*; this one asks for a single intake exactly as
          #42 and #43 do, so it asks the way they ask. */}
      <CohortPickers
        programs={programs}
        program={program}
        setProgram={setProgram}
        intakes={intakes}
        intake={intake}
        setIntake={setIntake}
      />

      {asked && intakes.length === 0 && program && <NoStudentsYet />}

      {roll.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-medium text-primary">เลือกนักศึกษา</h2>
            <p className="mt-1 text-xs text-slate-400">
              ทะเบียนรุ่น {intake} ทั้งหมด {roll.length} คน
            </p>
            <input
              value={term}
              onChange={event => setTerm(event.target.value)}
              // Labelled as well as prompted: a placeholder stops being the
              // accessible name the moment somebody types. #37's lesson.
              aria-label="ค้นหานักศึกษาด้วยรหัสหรือชื่อ"
              placeholder="ค้นหาด้วยรหัสหรือชื่อ"
              className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
            />

            {offered.length === 0 ? (
              <p className="mt-3 p-2 text-sm text-slate-500">ไม่พบนักศึกษาที่ตรงกับคำค้นหา</p>
            ) : (
              /* A list, and a named one. A hundred and thirteen buttons in a
                 div is a shape a reader who cannot see the box is given no way
                 to skip, and the name is what tells them what they are in. */
              <ul
                aria-label="รายชื่อนักศึกษา"
                className="mt-3 max-h-96 space-y-1 overflow-y-auto"
              >
                {offered.map(student => (
                  <li key={student.student_id}>
                    <button
                      type="button"
                      onClick={() => setChosen(student.student_id)}
                      // The code and the name together, because that is what a
                      // committee is asked to recognise and what every row that
                      // addresses a student here matches on.
                      aria-label={`${student.student_id} ${student.full_name_th}`}
                      aria-current={student.student_id === chosen}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                        student.student_id === chosen ? 'bg-blue-50 ring-1 ring-primary' : ''
                      }`}
                    >
                      <span className="text-gray-900">{student.full_name_th}</span>
                      <span className="ml-auto text-xs text-slate-500">{student.student_id}</span>
                      {/* #37's wording for the same state, and the reason the
                          roll comes from the register: this is the student an
                          appeal is most likely to be about, and a picker built
                          from the marks would not offer them at all. */}
                      {student.measured_count === 0 && (
                        // A badge and not a word. As plain small print among
                        // other small print it has to be hunted for — the
                        // hand-walk's words were *จางเกินไป ต้องเพ่งหา* — and
                        // this is the row a committee opening an appeal is most
                        // likely to be looking for. #41 and #42 both found the
                        // same class of thing: a sentence that carries weight
                        // set as though it did not.
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          ยังไม่มีคะแนน
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            {!chosen && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <p className="text-sm text-slate-500">
                  เลือกนักศึกษาหนึ่งคนจากรายชื่อ เพื่อดูผลการเรียนรู้ระดับหลักสูตรของคนนั้น
                </p>
              </div>
            )}

            {loading && !data && <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>}

            {data && (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-700">
                    {data.student.student_id} {data.student.full_name_th}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    ปีรับเข้า {data.student.admission_year} · วัดได้ {data.measured_count} จาก{' '}
                    {data.plos.length} ข้อ ·{' '}
                    {/* The fraction and not the numerator: *2* out of two
                        measured and *2* out of seven are the same figure and
                        not the same news — #43's rule, one grain down. */}
                    <span aria-label={`ต่ำกว่าเกณฑ์ ${data.below_count} จาก ${data.measured_count} ข้อที่วัดได้`}>
                      ต่ำกว่าเกณฑ์ {data.below_count} จาก {data.measured_count} ข้อที่วัดได้
                    </span>
                  </p>
                </div>

                {data.empty ? (
                  // Said, not drawn. Thirteen dashes beside a named person
                  // reads as a report that they failed everything.
                  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-medium text-slate-600">
                      ยังไม่มีคะแนนของนักศึกษาคนนี้
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      นักศึกษาคนนี้อยู่ในทะเบียนของหลักสูตร แต่ยังไม่มีกิจกรรมการเรียนรู้ใดที่บันทึกคะแนนไว้
                      ผลการเรียนรู้ทุกข้อจึงยังไม่มีการวัด ไม่ใช่ไม่ผ่าน
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

                    {/* The table scrolls in its own frame so the page never
                        does — #98. The floor is 28rem and not #42's 48rem,
                        which is the number this screen cannot borrow: that
                        table has the width of the page and this one has what is
                        left beside a 20rem picker. At 48rem — or at 40rem,
                        where this shipped — the *ที่มา* column starts exactly on
                        the frame's right edge and is cut off whole, so the
                        control the screen exists for is not on screen at all
                        and nothing says it is missing. Found by the hand-walk. */}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[28rem] text-left text-sm">
                        <thead className="border-b border-gray-200 text-xs text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-medium">ผลการเรียนรู้</th>
                            <th className="px-4 py-3 text-center font-medium">ประเภท</th>
                            <th className="px-4 py-3 text-center font-medium">คะแนน</th>
                            <th className="px-4 py-3 text-center font-medium">ที่มา</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.plos.map(plo => {
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
                                <td className="px-4 py-3 text-center">
                                  <span
                                    aria-label={spoken(data.student, plo)}
                                    className={`inline-block w-full rounded-md px-2 py-1.5 text-xs font-medium ${
                                      look ? look.cell : 'bg-slate-50 text-slate-400'
                                    }`}
                                  >
                                    {score(plo.score)}
                                    {/* Not only a colour. #38's rule: below
                                        the line has to survive being printed
                                        and being read by somebody who cannot
                                        tell two shades of a ramp apart. */}
                                    {plo.flagged && <span className="ml-1 font-bold">!</span>}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {/* Offered only where there is something to
                                      open. #40's walk found a disclosure that
                                      worked perfectly on nothing, and an
                                      outcome this student was never measured
                                      on has no contributing Activity by
                                      definition. */}
                                  {plo.score === null ? (
                                    <span className="text-xs text-slate-400">ยังไม่มีการวัด</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggle(plo)}
                                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-gray-50"
                                    >
                                      {open === plo.outcome_id ? 'ซ่อนที่มา' : 'ดูที่มา'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {open !== null && (
                      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <ContributionsPanel
                          drill={drill}
                          heading={
                            drill &&
                            `ที่มาของ ${drill.outcome.outcome_code} ${drill.outcome.outcome_title} — ${drill.student.student_id} ${drill.student.full_name_th}`
                          }
                          nothing="ยังไม่มีรายวิชาใดที่บันทึกคะแนนของนักศึกษาคนนี้ไว้กับผลการเรียนรู้ข้อนี้"
                          onOpenEvidence={openEvidence}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </ContentMotionDIV>
  )
}

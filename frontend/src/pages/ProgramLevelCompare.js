import { useCallback, useEffect, useState } from 'react'

import BandLegend from '../components/results/BandLegend'
import ContentMotionDIV from '../components/ContentMotionDIV'
import Notice from '../components/Notice'
import { BANDS, score } from '../lib/bands'
import { OUTCOME_TYPES } from '../lib/outcomes'
import {
  IntakeSelect,
  NoStudentsYet,
  ProgramPicker,
  useCohortPickers,
} from '../components/results/CohortPickers'
import { getResultsAcrossIntakes } from '../api/programResults'

/**
 * เปรียบเทียบผลการเรียนรู้ระดับหลักสูตรข้ามรุ่นปีรับเข้า — #44.
 *
 * #42 answers *how did this intake do*. A committee that has changed something
 * about the curriculum cannot act on that answer, because one cohort is a
 * hundred-odd particular people who also had particular teachers in a
 * particular year, and a single figure carries all of it at once. This screen
 * puts the same figures side by side, year after year, so what is left when
 * those things vary is the part a decision can rest on.
 *
 * ## It is #42's report, drawn several times
 *
 * Every cell here comes back through the same `rollUpOutcomes` on the server
 * that #42's rows come through. That is the ticket's fourth criterion, and it
 * is met by there being one function rather than by two of them being checked
 * against each other — a trend assembled by arithmetic of its own would put a
 * step in the line that nothing in the teaching produced, and it would look
 * exactly like a finding.
 *
 * ## A year nobody was admitted in still gets a column
 *
 * The range is every year between its ends, not every year the register has
 * somebody in. A gap closed up draws two intakes as neighbours when a year
 * stands between them, and a reader following a line across cannot see that it
 * happened. So the column is there and its header says which of the two things
 * it is: nobody on the roll, or a roll nobody has marked yet.
 *
 * ## Three states in every cell, and the third is not a nought
 *
 * #38 shipped an outcome nobody had been measured on drawn as one that failed,
 * and a hand-walk caught it. On a trend the same mistake is worse than on a
 * table: a nought is a drop, a drop is a finding, and a committee acts on
 * findings. An unmeasured cell is blank, neutral, and says so when read aloud.
 */

/**
 * What one cell says when it is read aloud rather than looked at.
 *
 * A grid is the hardest thing on any of these screens to read without seeing
 * it: the figure is in the cell and what it is a figure *of* is two headers
 * away. So the label carries all four — the outcome, the year, the figure and
 * the verdict — rather than leaving a reader to hold a position in their head
 * while they move across thirteen rows.
 */
function spoken(plo, cell) {
  const where = `${plo.outcome_code} ปีรับเข้า ${cell.admission_year}`
  if (cell.mean === null) return `${where} ยังไม่มีการวัด`
  const verdict = cell.passed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'
  return `${where} คะแนนเฉลี่ย ${cell.mean.toFixed(2)} ${verdict} — ผ่าน ${cell.pass_rate}% ของนักศึกษาที่ถูกวัด`
}

/**
 * What a column header says under its year.
 *
 * Three sentences for three states, because the two that are not the ordinary
 * one are the reason the column is drawn at all. A year with nobody on the
 * roll and a year with a roll nobody has marked are different facts about the
 * curriculum, and a reader who cannot tell them apart is left to guess which
 * of them a row of blanks means.
 */
function standing(year) {
  if (year.student_count === 0) return 'ไม่มีนักศึกษารุ่นนี้'
  if (year.measured_count === 0)
    return `${year.student_count} คน · ยังไม่มีคะแนน`
  return `${year.student_count} คน`
}

export default function ProgramLevelCompare() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const report = error => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }

  const { programs, program, setProgram, intakes, maxSpan, asked } =
    useCohortPickers(report)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  /**
   * The range the screen opens on: everything the register has, cut back to fit.
   *
   * `intakes` arrives newest first, so the ends are its last and its first. The
   * server refuses a range wider than it will draw, and a curriculum whose
   * register really is longer than that would otherwise open on the refusal
   * rather than on a report — so the opening range is trimmed to the most
   * recent years, which are the ones a committee asks about first. Widening it
   * back out is a selection away, and the refusal is what answers if it is
   * widened too far.
   *
   * The trimmed end is the oldest intake still inside the cap, and **not** the
   * cap's own year: a curriculum can have no intake in that year at all, and
   * a picker showing a year its own list does not contain would be showing a
   * report about one range while saying another.
   *
   * `maxSpan` is nought until the list it travels with arrives, and nought
   * means *no cap known* rather than a cap of nought — the two land in one
   * answer, so this is a guard rather than a case.
   */
  useEffect(() => {
    if (intakes.length === 0) {
      setFrom('')
      setTo('')
      return
    }
    const years = intakes.map(entry => entry.admission_year)
    const newest = years[0]
    const floor = maxSpan ? Number(newest) - (maxSpan - 1) : -Infinity
    // Newest first, so the last one still inside the cap is the oldest one
    // that is. `newest` itself always qualifies, so this is never empty.
    const within = intakes.filter(
      entry => Number(entry.admission_year) >= floor
    )
    const oldest = within[within.length - 1].admission_year

    // An end that is already a year of this list is left where the reader put
    // it. This effect runs again every time the list arrives again — a
    // re-fetch, a re-mount, React running it twice in development — and an
    // opening range that reset itself on top of a choice already made would be
    // a control undoing that choice while the reader watched. **Found by the
    // full browser suite**: the row that asked for two years read six, because
    // the list landed a second time between the choosing and the reading.
    //
    // Changing curriculum still resets both ends, because the hook empties the
    // list first and the branch above puts them back to nothing.
    setTo(current => (years.includes(current) ? current : newest))
    setFrom(current => (years.includes(current) ? current : oldest))
  }, [intakes, maxSpan])

  /**
   * Moving one end never leaves the range inside out.
   *
   * The other end follows rather than the choice being refused, because a
   * person dragging a range back past its own start means to move the range,
   * and a control that answers *no* to an ordinary gesture is a control that
   * has to be argued with.
   */
  function chooseFrom(year) {
    setFrom(year)
    if (Number(year) > Number(to)) setTo(year)
  }

  function chooseTo(year) {
    setTo(year)
    if (Number(year) < Number(from)) setFrom(year)
  }

  const load = useCallback(async () => {
    if (!program || !from || !to) {
      setData(null)
      // Nothing to ask for is an answer, not a wait. #43's hand-walk found the
      // other half of this on the two screens beside it: an account the server
      // refuses read the refusal with *กำลังโหลดข้อมูล…* underneath it for ever.
      setLoading(false)
      return
    }
    setLoading(true)
    setNotice(null)
    try {
      setData(await getResultsAcrossIntakes(program, from, to))
    } catch (error) {
      setData(null)
      report(error)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, from, to])

  useEffect(() => {
    load()
  }, [load])

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      <div>
        <h1 className="text-xl font-semibold text-primary">
          เปรียบเทียบผลการเรียนรู้ระดับหลักสูตรข้ามรุ่น
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          ผลการเรียนรู้ระดับหลักสูตรของหลายรุ่นปีรับเข้าวางเรียงกัน
          เพื่อให้เห็นผลของการปรับปรุงหลักสูตรเป็นแนวโน้ม ไม่ใช่ภาพของรุ่นเดียว
          ทุกตัวเลขคิดด้วยกฎเดียวกับหน้า
          <span className="px-1">ระดับหลักสูตรตามรุ่นปีรับเข้า</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ProgramPicker
          programs={programs}
          program={program}
          setProgram={setProgram}
        />

        <IntakeSelect
          label="ตั้งแต่ปีรับเข้า"
          intakes={intakes}
          value={from}
          onChange={chooseFrom}
        />

        <IntakeSelect
          label="ถึงปีรับเข้า"
          intakes={intakes}
          value={to}
          onChange={chooseTo}
        />
      </div>

      {loading && !data && (
        <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>
      )}

      {asked && intakes.length === 0 && program && <NoStudentsYet />}

      {data &&
        (data.empty ? (
          // Not a grid of dashes. Nobody in any year of this range has been
          // marked on anything, and thirteen rows of em dashes across four
          // columns invite a committee to look for a pattern in the fact that
          // no marking has happened.
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              ยังไม่มีคะแนนของรุ่นใดในช่วงปีที่เลือก
            </p>
            <p className="mt-2 text-sm text-slate-500">
              เลือกช่วงปีรับเข้าที่กว้างขึ้น
              หรือรอจนกว่าอาจารย์จะบันทึกคะแนนกิจกรรมการเรียนรู้ของรุ่นเหล่านี้
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-primary">
                ผลการเรียนรู้ระดับหลักสูตร (เต็ม 5) · {data.years.length} รุ่น
              </h2>
              <BandLegend floors={data.band_floors} />
            </div>

            {/* The grid scrolls in its own frame so the page never does — #98.
                Its floor grows with the range, because a ten-year range on a
                narrow window has to scroll rather than squeeze ten columns
                into the width of four.

                `table-fixed`, and every year column the same width, because
                this is a time axis. Left to size themselves, the columns take
                their width from the sentence in the header — so a year nobody
                was admitted in, which has the longest sentence, comes out
                *wider* than the intakes either side of it. The gap columns
                exist so that a reader can see the years are evenly spaced;
                drawing them unevenly gives back the misreading they were
                added to prevent. The hand-walk found this. */}
            <div className="overflow-x-auto">
              <table
                className="w-full table-fixed text-left text-sm"
                style={{ minWidth: `${20 + data.years.length * 7}rem` }}
              >
                <thead className="border-b border-gray-200 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">ผลการเรียนรู้</th>
                    <th className="w-24 px-4 py-3 text-center font-medium">
                      ประเภท
                    </th>
                    {data.years.map(year => (
                      <th
                        key={year.admission_year}
                        className="w-28 px-4 py-3 text-center font-medium"
                      >
                        <span className="block text-sm text-slate-600">
                          {year.admission_year}
                        </span>
                        <span className="block font-normal">
                          {standing(year)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.plos.map(plo => (
                    <tr key={plo.outcome_id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">
                          {plo.outcome_code}
                        </p>
                        <p className="text-xs text-slate-500">
                          {plo.outcome_title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">
                        {OUTCOME_TYPES[plo.outcome_type] || plo.outcome_type}
                      </td>
                      {plo.years.map(cell => {
                        const look = BANDS[cell.band]
                        return (
                          <td
                            key={cell.admission_year}
                            className="px-4 py-3 text-center"
                          >
                            <span
                              aria-label={spoken(plo, cell)}
                              className={`inline-block w-full rounded-md px-2 py-1.5 text-xs font-medium ${
                                look ? look.cell : 'bg-slate-50 text-slate-400'
                              }`}
                            >
                              {score(cell.mean)}
                              {/* BR-17's verdict, as something that is not
                                  only a colour. #43 marks a cell below the
                                  line the same way and for the same reason:
                                  these reports are printed, and they are read
                                  by people who cannot tell two shades of a
                                  ramp apart. */}
                              {cell.passed === false && (
                                <span className="ml-1 font-bold">!</span>
                              )}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-slate-600">
              ช่องว่างหมายถึงยังไม่มีการวัดผลการเรียนรู้ข้อนั้นในรุ่นนั้น
              ไม่ได้หมายถึงคะแนนศูนย์ · เครื่องหมาย{' '}
              <span className="font-bold">!</span>{' '}
              หมายถึงข้อนั้นยังไม่ผ่านเกณฑ์ของรุ่นนั้น
            </p>
          </div>
        ))}
    </ContentMotionDIV>
  )
}

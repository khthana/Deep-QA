import { useCallback, useEffect, useState } from 'react'

import Notice from '../components/Notice'
import { listReachablePrograms, readGrid, saveCell } from '../api/ploMapping'
import { LEVELS, keyOf, mark } from '../components/ploMapping/levels'

/**
 * การเชื่อมโยงผลการเรียนรู้กับรายวิชา — ticket #20.
 *
 * A grid: one row per รายวิชา of the chosen หลักสูตร, one column per PLO of it,
 * and in each square how strongly that subject serves that outcome. It is the
 * coverage the accreditation submission is built from, and the only screen in
 * the house whose subject is the *relationship* between two other screens'
 * records rather than records of its own.
 *
 * Five things about it are decisions rather than habit.
 *
 * *Every square is a control, and there is no บันทึก.* A grid with a save
 * button is a grid somebody fills in and then loses when the session ends
 * mid-column, and a grid with one save per row is a rule about rows that the
 * data does not have. Each square is written on the change that made it, which
 * is also why the write is a PUT of one cell rather than of the grid: two
 * committee members working down two different columns must not overwrite each
 * other's work by both posting the whole thing.
 *
 * *The first column stays put while the rest scrolls.* Fifty-two columns is
 * wider than any window, and a coverage grid whose subject name has scrolled
 * off the left is a grid of squares nobody can attribute. `sticky left-0` on the
 * subject cells is what keeps the row readable at the right-hand edge. The
 * frame around the table scrolls, not the page — #98, whose whole subject was
 * this table before it existed.
 *
 * *An empty square and an `E` are different, and are drawn differently.* No row
 * at all means nobody has said; `E` means somebody said this subject does not
 * serve this outcome. The server keeps them apart and so does the export, so a
 * screen that drew both blank would be the one place the distinction was lost —
 * and it would be lost in favour of the reading that flatters, "not filled in
 * yet" looking exactly like "considered and answered".
 *
 * *There is no way back to empty.* The dropdown offers the five levels the
 * ticket names and nothing else. `ยังไม่ระบุ` shows for a square nobody has
 * touched and cannot be chosen, because the state it describes is the absence
 * of a row and un-saying something is not one of the five things this screen
 * does. Somebody who chose wrongly chooses again; somebody who meant "not
 * served" has `E` for it.
 *
 * *The export is built here, from what is already on screen.* It reads no
 * endpoint of its own, so what is printed is what is displayed, and the two
 * cannot come to disagree about which cells are set.
 */

const EMPTY = { program: null, subjects: [], outcomes: [], mappings: [] }

export default function PloMapping() {
  const [programs, setPrograms] = useState([])
  const [program, setProgram] = useState('')
  const [grid, setGrid] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(null)

  const report = useCallback(error => {
    // A 401 already raises the shell's dialog; saying it again here would put a
    // banner behind that dialog.
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

  // The curricula in reach, fetched once: what this account covers is a
  // property of the grant and does not change with what is being looked at.
  // The first of them is opened, because a grid with no curriculum chosen is a
  // screen showing nothing to somebody who has exactly one to look at.
  useEffect(() => {
    let cancelled = false
    listReachablePrograms()
      .then(({ programs: reachable }) => {
        if (cancelled) return
        setPrograms(reachable)
        if (reachable.length > 0)
          setProgram(current => current || reachable[0].program_id)
        else setLoading(false)
      })
      .catch(error => {
        if (!cancelled) {
          report(error)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [report])

  const load = useCallback(async () => {
    if (!program) return
    setLoading(true)
    try {
      setGrid(await readGrid(program))
    } catch (error) {
      setGrid(EMPTY)
      report(error)
    } finally {
      setLoading(false)
    }
  }, [program, report])

  useEffect(() => {
    load()
  }, [load])

  const levels = new Map(
    grid.mappings.map(cell => [
      keyOf(cell.subject_id, cell.outcome_id),
      cell.mapping_level,
    ])
  )

  /**
   * One square, written as it is chosen.
   *
   * The answer is folded into the grid already in hand rather than re-read: a
   * whole-grid fetch after every square would make a curriculum's worth of
   * filling in a curriculum's worth of round trips, and the cell the server
   * sends back is the whole of what changed. A refusal leaves the state alone,
   * so the square snaps back to what the database still holds rather than
   * showing a level that was never written.
   */
  const choose = async (subjectId, outcomeId, level) => {
    setNotice(null)
    setSaving(keyOf(subjectId, outcomeId))
    try {
      const { mapping } = await saveCell({
        program_id: program,
        subject_id: subjectId,
        outcome_id: outcomeId,
        mapping_level: level,
      })
      setGrid(current => ({
        ...current,
        mappings: [
          ...current.mappings.filter(
            cell =>
              !(cell.subject_id === subjectId && cell.outcome_id === outcomeId)
          ),
          mapping,
        ],
      }))
    } catch (error) {
      report(error)
    } finally {
      setSaving(null)
    }
  }

  /**
   * The export, fetched when it is asked for.
   *
   * `import()` rather than a plain import at the top, and the reason is weight:
   * the builder carries TH Sarabun twice over as base64, and jsPDF and its table
   * plugin behind that — about two hundred kilobytes that every screen in the
   * application would otherwise download to open the ones that never print
   * anything. It is a chunk of its own, fetched by the press that needs it.
   */
  const exportPdf = async () => {
    setNotice(null)
    try {
      const { exportGridToPdf } =
        await import('../components/ploMapping/exportPdf')
      exportGridToPdf(grid)
    } catch (error) {
      // A font that failed to load or a browser that refused the download is
      // not a refusal from the server, and the person is owed a sentence rather
      // than a button that did nothing.
      setNotice({
        error: true,
        message: 'สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      })
    }
  }

  const ready =
    Boolean(grid.program) &&
    grid.outcomes.length > 0 &&
    grid.subjects.length > 0

  return (
    <div className="space-y-6">
      <Notice notice={notice} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-medium text-primary">
          การเชื่อมโยงผลการเรียนรู้กับรายวิชา
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* A picker when there is a choice to make, and a statement of where
              one is when there is not — ผลการเรียนรู้ระดับหลักสูตร's control,
              for its reasons. A กรรมการหลักสูตร reaches one curriculum and is
              shown which. There is no ทุกหลักสูตร here, unlike that screen: the
              columns of one curriculum are not the columns of another, so there
              is no grid of all of them to show. */}
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
            programs.length === 1 && (
              <span className="flex items-center gap-2 text-sm text-slate-600">
                หลักสูตร
                <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                  {programs[0].program_id} {programs[0].program_name_th}
                </span>
              </span>
            )
          )}
          <button
            type="button"
            onClick={exportPdf}
            disabled={!ready}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            ส่งออก PDF
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-500">
        <p>
          เลือกระดับที่รายวิชาแต่ละแถวสอนผลการเรียนรู้แต่ละข้อ
          ระบบบันทึกทันทีที่เลือก ช่องที่ยังไม่ได้ระบุจะว่างไว้
        </p>
        {/* The dropdowns hold the mark alone, so that fifty-two columns fit a
            window at all. This is where the mark is read out — a legend beside
            the grid rather than a word inside every square. */}
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span>คำอธิบายระดับ</span>
          {LEVELS.map(([code, word]) => (
            <span key={code}>
              <span className="font-medium text-gray-900">{mark(code)}</span>{' '}
              {word}
            </span>
          ))}
        </p>
      </div>

      {/* The frame scrolls, not the page — #98. The subject column is `sticky`
          inside it so a row stays attributable at the right-hand edge. */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="sticky left-0 z-10 min-w-[16rem] bg-gray-50 px-4 py-3">
                รายวิชา
              </th>
              {grid.outcomes.map(outcome => (
                <th
                  key={outcome.outcome_id}
                  title={`${outcome.outcome_code} ${outcome.outcome_title}`}
                  className={`whitespace-nowrap px-2 py-3 text-center text-xs ${
                    outcome.level_depth > 1
                      ? 'font-normal text-slate-500'
                      : 'font-semibold text-gray-800'
                  }`}
                >
                  {outcome.outcome_code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td
                  colSpan={grid.outcomes.length + 1}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  กำลังโหลด…
                </td>
              </tr>
            )}
            {!loading && grid.outcomes.length === 0 && (
              <tr>
                <td
                  colSpan={1}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  หลักสูตรนี้ยังไม่มีผลการเรียนรู้ ต้องกำหนด PLO
                  ก่อนจึงจะเชื่อมโยงกับรายวิชาได้
                </td>
              </tr>
            )}
            {!loading &&
              grid.outcomes.length > 0 &&
              grid.subjects.length === 0 && (
                <tr>
                  <td
                    colSpan={grid.outcomes.length + 1}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    หลักสูตรนี้ยังไม่มีรายวิชา
                  </td>
                </tr>
              )}
            {!loading &&
              grid.subjects.map(subject => (
                <tr key={subject.subject_id}>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3">
                    <span className="text-gray-900">{subject.subject_id}</span>
                    <span className="block text-xs text-slate-500">
                      {subject.subject_name_th}
                    </span>
                  </td>
                  {grid.outcomes.map(outcome => {
                    const cell = keyOf(subject.subject_id, outcome.outcome_id)
                    const level = levels.get(cell) ?? ''
                    return (
                      <td
                        key={outcome.outcome_id}
                        className="px-1 py-2 text-center"
                      >
                        <select
                          value={level}
                          disabled={saving === cell}
                          aria-label={`${subject.subject_id} × ${outcome.outcome_code}`}
                          onChange={event =>
                            choose(
                              subject.subject_id,
                              outcome.outcome_id,
                              event.target.value
                            )
                          }
                          className={`w-14 rounded-md border border-gray-200 py-1 text-center text-sm ${
                            level
                              ? 'bg-blue-50 text-gray-900'
                              : 'bg-white text-slate-400'
                          }`}
                        >
                          {/* Present so an untouched square has something to
                              show, and disabled because the absence of a row is
                              not one of the five things a person may choose. */}
                          <option value="" disabled>
                            ยังไม่ระบุ
                          </option>
                          {LEVELS.map(([code]) => (
                            <option key={code} value={code}>
                              {mark(code)}
                            </option>
                          ))}
                        </select>
                      </td>
                    )
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

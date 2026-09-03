import { useEffect, useState } from 'react'

import { listIntakes, listResultPrograms } from '../../api/programResults'

/**
 * The curriculum and the intake, for every screen that reports on a cohort.
 *
 * #42 and #43 open on exactly the same two questions — *which curriculum* and
 * *which intake* — and answer them in exactly the same way, which by the time
 * #44 and #45 land would be four copies of the same sixty lines. It is the
 * argument `lib/bands.js` already won one level down: the copies do not fail
 * loudly when they drift, they simply answer differently on two screens that
 * are supposed to be two views of one thing.
 *
 * Both lists come from the server rather than from the browser's own
 * knowledge. What an account reaches is the server's answer (ADR-0002), and
 * the intakes are the years the curriculum actually has students in — so no
 * year in the list opens on an empty report, and a committee member who picks
 * one and finds nothing is finding out something about the marking rather than
 * about the picker.
 *
 * The hook owns the two questions and nothing else. Each screen still fetches
 * its own report, because what it asks for and what it does with the answer is
 * the whole of what makes it a different screen.
 */
export function useCohortPickers(onError) {
  const [programs, setPrograms] = useState([])
  const [program, setProgram] = useState('')
  const [intakes, setIntakes] = useState([])
  const [intake, setIntake] = useState('')
  const [asked, setAsked] = useState(false)

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
      .catch(onError)
      .finally(() => !cancelled && setAsked(true))
    return () => {
      cancelled = true
    }
    // Asked once, on mount. `onError` is the screen's own reporter and is
    // rebuilt on every render, so depending on it would re-ask the server for
    // the same list on every keystroke anywhere on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .catch(onError)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program])

  return { programs, program, setProgram, intakes, intake, setIntake, asked }
}

/**
 * The two controls, drawn.
 *
 * A caller who reaches one curriculum is shown a label rather than a dropdown,
 * because a dropdown with one option is a control that cannot be used and
 * still asks to be read. Every account in the seed is in that case; the select
 * is there for the day one is not.
 *
 * `children` is where a screen puts a control of its own beside these — #43's
 * order picker, for instance — so the three sit on one row and wrap together.
 */
export function CohortPickers({ programs, program, setProgram, intakes, intake, setIntake, children }) {
  const chosen = programs.find(entry => entry.program_id === program)

  return (
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

      {children}
    </div>
  )
}

/** What a curriculum with nobody on its register says instead of a report. */
export function NoStudentsYet() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-500">หลักสูตรนี้ยังไม่มีนักศึกษาในทะเบียน</p>
    </div>
  )
}

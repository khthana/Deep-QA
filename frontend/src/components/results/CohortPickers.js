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
 * The hook owns those two lists, and the one rule that is about them: how far
 * apart #44 may put the two ends of a range. Each screen still fetches its own
 * report, because what it asks for and what it does with the answer is the
 * whole of what makes it a different screen.
 */
export function useCohortPickers(onError) {
  const [programs, setPrograms] = useState([])
  const [program, setProgram] = useState('')
  const [intakes, setIntakes] = useState([])
  const [intake, setIntake] = useState('')
  /**
   * How many intakes #44's report will draw in one answer, from the server.
   *
   * It arrives with the list its two ends are chosen from rather than being
   * written into the browser, on the argument `band_floors` already won: a
   * second copy of a limit goes on being enforced after the limit has moved.
   * Nought until the list arrives, which the one screen that reads it treats
   * as *no cap known yet* rather than as a cap of nought.
   */
  const [maxSpan, setMaxSpan] = useState(0)
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
      .then(({ intakes: rows, max_span: span }) => {
        if (cancelled) return
        setMaxSpan(span || 0)
        setIntakes(rows)
        if (rows.length > 0) setIntake(rows[0].admission_year)
      })
      .catch(onError)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program])

  return {
    programs,
    program,
    setProgram,
    intakes,
    intake,
    setIntake,
    maxSpan,
    asked,
  }
}

/**
 * The curriculum, drawn.
 *
 * A caller who reaches one curriculum is shown a label rather than a dropdown,
 * because a dropdown with one option is a control that cannot be used and
 * still asks to be read. Every account in the seed is in that case; the select
 * is there for the day one is not.
 *
 * Its own component since #44, which asks the same first question and then a
 * different second one — a range of intakes rather than a single year — and
 * would otherwise have carried the second copy of these thirty lines.
 */
export function ProgramPicker({ programs, program, setProgram }) {
  const chosen = programs.find(entry => entry.program_id === program)

  if (programs.length > 1) {
    return (
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
    )
  }

  return (
    chosen && (
      <span className="flex items-center gap-2 text-sm text-slate-600">
        หลักสูตร
        <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
          {chosen.program_id} {chosen.program_name_th}
        </span>
      </span>
    )
  )
}

/** One intake of the list, said the way every screen says it. */
const intakeLabel = entry => `${entry.admission_year} (${entry.student_count} คน)`

/**
 * A dropdown over the intakes, under whatever a screen calls it.
 *
 * Three of these exist now — #42 and #43 pick one year with it, #44 picks each
 * end of a range — and they were three copies of the same fourteen lines
 * before this component was extracted. Which year the control *means* is the
 * whole of what differs between them, so that is the whole of what a caller
 * passes: the words above it, the year in it, and what to do when it changes.
 *
 * Every option carries how many students the intake has, because a committee
 * choosing between years is choosing between cohorts and the size of one is
 * the first thing they would ask.
 */
export function IntakeSelect({ label, intakes, value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      {label}
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
      >
        {intakes.map(entry => (
          <option key={entry.admission_year} value={entry.admission_year}>
            {intakeLabel(entry)}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * The two controls, drawn.
 *
 * `children` is where a screen puts a control of its own beside these — #43's
 * order picker, for instance — so the three sit on one row and wrap together.
 */
export function CohortPickers({ programs, program, setProgram, intakes, intake, setIntake, children }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ProgramPicker programs={programs} program={program} setProgram={setProgram} />

      <IntakeSelect
        label="ปีรับเข้า"
        intakes={intakes}
        value={intake}
        onChange={setIntake}
      />

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

import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The form for adding one student to the central register — #17.
 *
 * Unlike #11's, #14's, #15's and #16's, this one is for adding only. There is
 * no edit path on this screen, because docs/06 has no story for one and #17
 * asks for none, so the form has no `editing` branch and no disabled code
 * field: every student it is ever opened on is new.
 *
 * Four boxes, and two of them are not here.
 *
 * The **department** is not asked for. It is `programs.department_id` for
 * whichever หลักสูตร is picked, and the server takes it from there — so the
 * screen shows the department the picked programme belongs to and shows it as
 * a statement, because a box that must always agree with the box above it is a
 * box somebody can get wrong.
 *
 * The **admission year** is not asked for either. `66010001` is a student
 * admitted in 2566: the first two digits are the year less 2500. The server
 * derives it and discards anything sent, which is what "not editable" means on
 * a server — so the form shows what the code it has been given works out to,
 * as a read-only statement that moves as the code is typed. A person who mis-
 * types a year cannot; a person who mistypes a *code* sees it immediately.
 *
 * The code itself is eight digits, which is both what the register is filled
 * with and what makes the derivation possible. The pattern is enforced here so
 * the person is told before they submit, and again on the server, which is the
 * one that counts.
 */

const EMPTY = {
  student_id: '',
  first_name_th: '',
  last_name_th: '',
  program_id: '',
}

const field =
  'block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
const labelling = 'mb-1 block text-sm text-gray-500'
const derived = 'block rounded-lg bg-gray-100 p-2.5 text-sm text-gray-900'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelling}>{label}</span>
      {children}
    </label>
  )
}

const CODE = /^\d{8}$/

/** `66010001` was admitted in 2566 — the same rule the server applies. */
const admissionYearOf = studentId =>
  CODE.test(studentId) ? String(2500 + Number(studentId.slice(0, 2))) : ''

export default function StudentForm({ programs, departments, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)

  // Only programmes still being offered may be filed under; a retired one is
  // left out rather than shown disabled, because nothing here is ever opened on
  // an existing student who might already be in one.
  const offered = programs.filter(program => program.is_active !== false)
  const onlyOne = offered.length === 1 ? offered[0] : null

  useEffect(() => {
    // A หลักสูตร to start on when there is only one, so a department with a
    // single programme is not a choice anybody has to make by hand.
    setDraft(current => ({
      ...current,
      program_id: current.program_id || (onlyOne ? onlyOne.program_id : ''),
    }))
  }, [onlyOne])

  const set = key => event => setDraft(current => ({ ...current, [key]: event.target.value }))

  const picked = offered.find(program => program.program_id === draft.program_id)
  const department = picked
    ? departments.find(entry => entry.department_id === picked.department_id)
    : null

  const submit = event => {
    event.preventDefault()
    onSave({
      student_id: draft.student_id.trim(),
      first_name_th: draft.first_name_th.trim(),
      last_name_th: draft.last_name_th.trim(),
      program_id: draft.program_id,
    })
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">เพิ่มนักศึกษา</h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="รหัสนักศึกษา">
            <input
              className={field}
              value={draft.student_id}
              onChange={set('student_id')}
              inputMode="numeric"
              pattern="\d{8}"
              maxLength={8}
              placeholder="66010001"
              required
            />
          </Field>
          {/* Derived, not entered — the seventh criterion, said on the screen
              rather than only in the server. */}
          <Field label="ปีที่เข้าศึกษา">
            <span className={derived}>
              {admissionYearOf(draft.student_id.trim()) || 'คำนวณจากรหัสนักศึกษา'}
            </span>
          </Field>
          <Field label="ชื่อ">
            <input
              className={field}
              value={draft.first_name_th}
              onChange={set('first_name_th')}
              maxLength={100}
              required
            />
          </Field>
          <Field label="นามสกุล">
            <input
              className={field}
              value={draft.last_name_th}
              onChange={set('last_name_th')}
              maxLength={100}
              required
            />
          </Field>
          <Field label="หลักสูตร">
            <select
              className={field}
              value={draft.program_id}
              onChange={set('program_id')}
              required
            >
              <option value="">เลือกหลักสูตร</option>
              {offered.map(program => (
                <option key={program.program_id} value={program.program_id}>
                  {program.program_id} {program.program_name_th}
                </option>
              ))}
            </select>
          </Field>
          {/* Taken from the หลักสูตร, so it is shown and not asked for. */}
          <Field label="ภาควิชา">
            <span className={derived}>
              {picked
                ? `${picked.department_id} ${department?.department_name_th ?? ''}`.trim()
                : 'ตามหลักสูตรที่เลือก'}
            </span>
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
          >
            บันทึก
          </button>
        </div>
      </form>
    </ContentMotionDIV>
  )
}

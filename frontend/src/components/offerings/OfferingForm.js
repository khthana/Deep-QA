import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import { SEMESTERS, isYear } from './terms'
import { listOfferableSubjects } from '../../api/offerings'

/**
 * The form that opens a รายวิชา for a term — #23's first criterion.
 *
 * There is no edit half to this one, and that is the difference from every form
 * before it. All four fields are the key: the หลักสูตร, the รายวิชา, the
 * ปีการศึกษา and the ภาคการศึกษา. Moving an Offering to another term is closing
 * one and opening another, because the sections, the enrolments and every mark
 * beneath it belong to the term they were recorded in.
 *
 * The subject picker is a list rather than a search box, which is the opposite
 * of #18's. What may be opened is what that หลักสูตร contains — a few dozen
 * subjects, not the university's whole catalogue — so it fits in a dropdown, and
 * a person who has to type a code they cannot see is a person guessing. It is
 * also the sixth criterion drawn as a control: a subject that is not in the
 * curriculum is refused by the server, and offering it here would be offering a
 * choice that comes back as a refusal.
 *
 * It reloads whenever the programme changes, because it is a property of the
 * programme and not of the account.
 */

const field =
  'block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
const labelling = 'mb-1 block text-sm text-gray-500'

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className={labelling}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export default function OfferingForm({
  programs,
  defaultProgram,
  defaultYear,
  defaultSemester,
  busy,
  onSave,
  onCancel,
}) {
  const usable = programs.filter(program => program.is_active !== false)
  const onlyOne = usable.length === 1 ? usable[0] : null

  // Every field starts empty, the semester included. `1` looks like a harmless
  // default and is not: the effect below fills a field only when it is falsy,
  // so a semester that starts at `1` can never be replaced by the term the list
  // is being read at, and the form opens on ภาคต้น while the list behind it
  // shows ภาคปลาย. `''` is the honest starting value; the effect supplies `1`
  // when there is nothing better.
  const [draft, setDraft] = useState({
    program_id: '',
    subject_id: '',
    academic_year: '',
    semester: '',
  })
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setDraft(current => ({
      ...current,
      // Whatever the list is being read at: opening a subject is almost always
      // the next thing after looking at the term it belongs to.
      program_id: current.program_id || defaultProgram || onlyOne?.program_id || '',
      academic_year: current.academic_year || defaultYear || '',
      semester: current.semester || defaultSemester || 1,
    }))
  }, [defaultProgram, defaultYear, defaultSemester, onlyOne])

  useEffect(() => {
    if (!draft.program_id) {
      setSubjects([])
      return undefined
    }
    let cancelled = false
    setLoading(true)
    listOfferableSubjects(draft.program_id)
      .then(({ subjects: offerable }) => {
        if (!cancelled) setSubjects(offerable)
      })
      .catch(() => {
        if (!cancelled) setSubjects([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [draft.program_id])

  const set = key => event =>
    setDraft(current => ({
      ...current,
      [key]: event.target.value,
      // A subject belongs to the programme it was picked from, so changing the
      // programme cannot leave the old choice standing.
      ...(key === 'program_id' ? { subject_id: '' } : {}),
    }))

  const complete =
    draft.program_id && draft.subject_id && isYear(draft.academic_year) && draft.semester

  const submit = event => {
    event.preventDefault()
    onSave({
      program_id: draft.program_id,
      subject_id: draft.subject_id,
      academic_year: String(draft.academic_year).trim(),
      semester: Number(draft.semester),
    })
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">เปิดรายวิชาในภาคการศึกษา</h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="หลักสูตร">
            {usable.length > 1 ? (
              <select
                value={draft.program_id}
                onChange={set('program_id')}
                className={field}
                required
              >
                <option value="">เลือกหลักสูตร</option>
                {usable.map(program => (
                  <option key={program.program_id} value={program.program_id}>
                    {program.program_id} {program.program_name_th}
                  </option>
                ))}
              </select>
            ) : (
              <span className="block rounded-lg bg-gray-100 p-2.5 text-sm text-gray-900">
                {onlyOne ? `${onlyOne.program_id} ${onlyOne.program_name_th}` : '—'}
              </span>
            )}
          </Field>

          <Field
            label="รายวิชา"
            hint="เฉพาะรายวิชาที่อยู่ในหลักสูตรนี้และยังใช้งานอยู่ หากไม่พบให้เพิ่มเข้าหลักสูตรที่หน้ารายวิชาในหลักสูตรก่อน"
          >
            <select
              value={draft.subject_id}
              onChange={set('subject_id')}
              className={field}
              disabled={!draft.program_id || loading}
              required
            >
              <option value="">
                {loading ? 'กำลังโหลด…' : 'เลือกรายวิชา'}
              </option>
              {subjects.map(subject => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.subject_id} {subject.subject_name_th}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ปีการศึกษา" hint="พ.ศ. สี่หลัก เช่น 2568">
            <input
              value={draft.academic_year}
              onChange={set('academic_year')}
              className={field}
              inputMode="numeric"
              maxLength={4}
              required
            />
          </Field>

          <Field label="ภาคการศึกษา">
            <select value={draft.semester} onChange={set('semester')} className={field}>
              {SEMESTERS.map(term => (
                <option key={term.value} value={term.value}>
                  {term.value} — {term.label}
                </option>
              ))}
            </select>
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
            disabled={busy || !complete}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
          >
            เปิดรายวิชา
          </button>
        </div>
      </form>
    </ContentMotionDIV>
  )
}

import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import { searchCatalogue } from '../../api/programSubjects'

/**
 * The form for placing a subject into a หลักสูตร and for changing one — #18.
 *
 * One component for both, as #11's, #14's, #15's and #16's are, because the
 * fields are the same and a second copy is a second place for a rule to be
 * forgotten. What is different here is that most of the form is the *key*: a
 * pairing is a หลักสูตร and a รายวิชา, and both are fixed once it exists. So an
 * edit disables both and offers only the two things that can change — whether
 * the subject is บังคับ or เลือก, and whether the pairing is still in use.
 *
 * The catalogue is searched rather than listed. It runs to hundreds of entries
 * across every department — a curriculum contains mathematics and general
 * education subjects, not only its own department's — so the box types into it
 * and the server answers with what matches. Retired subjects are not among them,
 * because placing one is refused; there is no point offering a choice that will
 * come back as a refusal.
 *
 * The pairing that was switched off rather than removed is switched back on
 * here, from the status box. That is the only way back: the pair is the primary
 * key, so placing the same subject again collides with the row that is already
 * there.
 */

const EMPTY = {
  program_id: '',
  subject_id: '',
  subject_type: 'required',
  is_active: true,
}

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

export default function ProgramSubjectForm({
  value,
  programs,
  defaultProgram,
  busy,
  onSave,
  onCancel,
}) {
  const [draft, setDraft] = useState(EMPTY)
  const [term, setTerm] = useState('')
  const [found, setFound] = useState([])
  const [searching, setSearching] = useState(false)
  const editing = Boolean(value?.subject_id)

  // Retired programmes do not count: auto-picking one would put the form in a
  // state the server refuses before the person has touched anything.
  const usable = programs.filter(program => program.is_active !== false)
  const onlyOne = usable.length === 1 ? usable[0] : null

  useEffect(() => {
    setDraft({
      ...EMPTY,
      // A programme to start on: the one the list is filtered to, or the only
      // one this account holds. A committee member never picks.
      program_id: defaultProgram || onlyOne?.program_id || '',
      ...value,
    })
  }, [value, defaultProgram, onlyOne])

  // The catalogue, searched as the person types. Debounced, because a request
  // per keystroke is a request per keystroke; skipped entirely on an edit,
  // where the subject cannot change.
  useEffect(() => {
    if (editing) return undefined
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      searchCatalogue(term)
        .then(({ subjects }) => {
          if (!cancelled) setFound(subjects)
        })
        .catch(() => {
          if (!cancelled) setFound([])
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term, editing])

  const set = key => event => setDraft(current => ({ ...current, [key]: event.target.value }))

  const submit = event => {
    event.preventDefault()
    onSave({
      // Both halves are sent on an edit as well, and ignored there: the server
      // reads the key from the path, so the two cannot disagree.
      program_id: draft.program_id,
      subject_id: draft.subject_id,
      subject_type: draft.subject_type,
      is_active: draft.is_active,
    })
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไขรายวิชาในหลักสูตร' : 'เพิ่มรายวิชาเข้าหลักสูตร'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="หลักสูตร"
            hint={editing ? 'ย้ายรายวิชาข้ามหลักสูตรไม่ได้ ให้ลบออกแล้วเพิ่มในหลักสูตรใหม่' : null}
          >
            <select
              className={field}
              value={draft.program_id}
              onChange={set('program_id')}
              disabled={busy || editing}
              required
            >
              <option value="">เลือกหลักสูตร</option>
              {programs.map(program => (
                <option
                  key={program.program_id}
                  value={program.program_id}
                  disabled={program.is_active === false && program.program_id !== draft.program_id}
                >
                  {program.program_id} {program.program_name_th}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ประเภทรายวิชา">
            <select
              className={field}
              value={draft.subject_type}
              onChange={set('subject_type')}
              disabled={busy}
              required
            >
              <option value="required">วิชาบังคับ</option>
              <option value="elective">วิชาเลือก</option>
            </select>
          </Field>
        </div>

        {editing ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="รายวิชา">
              <input
                className={field}
                value={`${value.subject_id} ${value.subject_name_th ?? ''}`.trim()}
                disabled
                readOnly
              />
            </Field>
            <Field
              label="สถานะ"
              hint="รายวิชาที่มีการเปิดสอนอ้างอิงอยู่จะถูกปิดการใช้งานแทนการลบ และเปิดกลับได้จากที่นี่"
            >
              <select
                className={field}
                value={draft.is_active ? 'active' : 'inactive'}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    is_active: event.target.value === 'active',
                  }))
                }
                disabled={busy}
              >
                <option value="active">ใช้งานอยู่</option>
                <option value="inactive">ปิดใช้งาน</option>
              </select>
            </Field>
          </div>
        ) : (
          <>
            <Field
              label="ค้นหารายวิชาจากคลังรายวิชา"
              hint="พิมพ์รหัสวิชาหรือชื่อวิชา เลือกได้ทุกภาควิชา เพราะหลักสูตรหนึ่งมีรายวิชาของภาควิชาอื่นได้"
            >
              <input
                className={field}
                value={term}
                onChange={event => setTerm(event.target.value)}
                placeholder="เช่น 01076105 หรือ การเขียนโปรแกรม"
                disabled={busy}
              />
            </Field>

            <Field label="รายวิชา">
              <select
                className={field}
                value={draft.subject_id}
                onChange={set('subject_id')}
                disabled={busy}
                size={6}
                required
              >
                <option value="">
                  {searching ? 'กำลังค้นหา…' : 'เลือกรายวิชา'}
                </option>
                {found.map(subject => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_id} {subject.subject_name_th} ({subject.credits} หน่วยกิต)
                  </option>
                ))}
              </select>
            </Field>
            {!searching && found.length === 0 && (
              <p className="text-sm text-slate-500">
                ไม่พบรายวิชาที่ตรงกับคำค้น หากยังไม่มีในคลังรายวิชา ต้องเพิ่มที่หน้าข้อมูลรายวิชาก่อน
              </p>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
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

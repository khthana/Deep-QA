import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The form for writing a Rubric down and for changing one — #21.
 *
 * One component for both, as #11's, #14's, #15's, #16's, #18's and #19's are,
 * because the fields are the same and a second copy is a second place for a
 * rule to be forgotten. Three things about it are decisions.
 *
 * *The hint under รหัส says the opposite of #19's.* There, a code may be reused
 * in another หลักสูตร and the hint says so; here it may not, and a person who
 * carries the earlier screen's rule across writes a code that is refused for a
 * reason they cannot see — the rubric holding it may belong to a curriculum
 * they have no access to. The hint is the only warning before the refusal.
 *
 * *Both names are required, and neither is a translation of the other.* The
 * Thai name is what the committee reads and the English one is what an
 * accreditation reviewer reads, so the form asks for both rather than offering
 * one and leaving the other to be filled in later by nobody.
 *
 * *The หลักสูตร is fixed once the rubric exists.* Moving a rubric to another
 * curriculum is not an edit: its criteria carry no curriculum of their own, so
 * they would follow it anywhere without anything noticing. The select is sent
 * on an edit as well and ignored by the server, which is what stops the two
 * from disagreeing.
 */

const EMPTY = {
  program_id: '',
  rubric_code: '',
  rubric_name_th: '',
  rubric_name_en: '',
  display_order: 1,
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

export default function RubricForm({ value, programs, defaultProgram, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const editing = Boolean(value?.id)

  // Retired curricula do not count: auto-picking one would put the form in a
  // state the server refuses before the person has touched anything.
  const usable = programs.filter(program => program.is_active !== false)
  const onlyOne = usable.length === 1 ? usable[0] : null

  // A curriculum to start on: the one the list is filtered to, or the only one
  // this account holds. A กรรมการหลักสูตร never picks.
  const starting = defaultProgram || onlyOne?.program_id || ''

  // The pool as a value rather than as an array - #232. `programs` is a new
  // array on every answer, so an effect that depended on it, or on anything
  // derived from it by identity, re-ran whenever the screen read the pool
  // again. That is how a form typed and not saved was thrown away by its own
  // effect when a switch of hats which stays put re-read the curricula in
  // reach: the one thing #198 narrowed the remount to keep.
  const pool = usable.map(program => program.program_id).join(' ')

  // The subject changed, so the form starts again: a different rubric is being
  // edited, or the form was opened to add one. This is the only thing that
  // throws away what a person has typed, and `value` is state in the screen
  // above rather than anything derived here, so a re-read cannot move it.
  useEffect(() => {
    setDraft({ ...EMPTY, ...value })
  }, [value])

  // And the curriculum follows the pool, which is the half a re-read may move -
  // #232. The field is left alone while it names something still in reach, and
  // re-picked when it does not: the pool is what this hat may write into, so a
  // value outside it is one the server refuses (ADR-0002), and nothing here may
  // pick one - that would put the form in a refused state before the person had
  // touched anything.
  //
  // An existing rubric is not moved at all, and that branch is not decoration:
  // `GET /api/rubrics/programs` answers with retired curricula too, so a rubric
  // filed in one holds a program_id the pool does not contain, and re-picking
  // would make the form say it belongs somewhere else. `198a` row 5 holds that,
  // and `232:movesanexistingrubric` is the mutant.
  useEffect(() => {
    if (editing) return
    setDraft(current =>
      current.program_id && pool.split(' ').includes(current.program_id)
        ? current
        : { ...current, program_id: starting },
    )
  }, [editing, pool, starting])

  const set = name => event => setDraft(current => ({ ...current, [name]: event.target.value }))

  const submit = event => {
    event.preventDefault()
    onSave({
      program_id: draft.program_id,
      rubric_code: draft.rubric_code,
      rubric_name_th: draft.rubric_name_th,
      rubric_name_en: draft.rubric_name_en,
      display_order: draft.display_order,
    })
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไข Rubric' : 'เพิ่ม Rubric'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="หลักสูตร"
            hint={editing ? 'ย้าย Rubric ข้ามหลักสูตรไม่ได้ ให้ลบแล้วเพิ่มในหลักสูตรใหม่' : null}
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
                  {program.program_name_th}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="รหัส Rubric"
            hint="รหัสนี้ห้ามซ้ำกันทั้งระบบ ไม่ใช่แค่ในหลักสูตรนี้ ต่างจากรหัสผลการเรียนรู้ระดับหลักสูตร"
          >
            <input
              className={field}
              value={draft.rubric_code}
              onChange={set('rubric_code')}
              placeholder="เช่น RUB-12"
              maxLength={20}
              disabled={busy}
              required
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ชื่อ Rubric (ภาษาไทย)">
            <input
              className={field}
              value={draft.rubric_name_th}
              onChange={set('rubric_name_th')}
              placeholder="เช่น การนำเสนอผลงาน"
              maxLength={255}
              disabled={busy}
              required
            />
          </Field>

          <Field label="ชื่อ Rubric (ภาษาอังกฤษ)" hint="ใช้ในเอกสารประกอบการประเมินหลักสูตร">
            <input
              className={field}
              value={draft.rubric_name_en}
              onChange={set('rubric_name_en')}
              placeholder="เช่น Presentation"
              maxLength={255}
              disabled={busy}
              required
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="ลำดับการแสดงผล" hint="เรียงจากน้อยไปมาก ลำดับเท่ากันจะเรียงตามรหัส">
            <input
              className={field}
              type="number"
              value={draft.display_order}
              onChange={set('display_order')}
              step={1}
              min={0}
              disabled={busy}
              required
            />
          </Field>
        </div>

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

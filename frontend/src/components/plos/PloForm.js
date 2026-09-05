import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import { OUTCOME_TYPES } from '../../lib/outcomes'

/**
 * The form for writing a ผลการเรียนรู้ระดับหลักสูตร down and for changing one — #19.
 *
 * One component for both, as #11's, #14's, #15's, #16's and #18's are, because
 * the fields are the same and a second copy is a second place for a rule to be
 * forgotten. Three things about it are decisions.
 *
 * *The parent is a picker over the set already on screen, not a search.* A PLO
 * set is dozens of rows and the person choosing a ข้อหลัก is looking at all of
 * them, so the options are the rows the list is already holding — indented the
 * same way, so the shape of the choice matches the shape of the tree. Only
 * outcomes of the same หลักสูตร are offered, because a parent in another one is
 * refused by the server and by the foreign key underneath it.
 *
 * *The outcome being edited, and everything under it, is not offered as its own
 * parent.* The server refuses a cycle, but a picker that offers a choice the
 * server will turn down is a picker that lies. The descendants are worked out
 * from `parent_outcome_id` across the rows the list gave us, which is the same
 * walk the server makes.
 *
 * *The หลักสูตร is fixed once the outcome exists.* Moving an outcome to another
 * curriculum is not an edit: the subject mappings and the CLOs that name it
 * carry the curriculum in their own keys, and none of that moves with it.
 *
 * The outcome that was switched off rather than removed is switched back on
 * here, from the status box. That is the only way back — the code is unique
 * within the curriculum, so writing the same one again collides with the row
 * that is already there.
 */

const EMPTY = {
  program_id: '',
  outcome_code: '',
  outcome_title: '',
  outcome_description: '',
  outcome_type: 'knowledge',
  parent_outcome_id: '',
  sequence_order: 1,
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

/** Every outcome at or beneath `rootId`, by identifier. */
function subtreeOf(plos, rootId) {
  const inside = new Set([rootId])
  // The rows arrive in tree order, so one pass reaches every descendant: a
  // child is always drawn after the parent that put it in the set.
  for (const plo of plos) {
    if (inside.has(plo.parent_outcome_id)) inside.add(plo.outcome_id)
  }
  return inside
}

export default function PloForm({ value, plos, programs, defaultProgram, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const editing = Boolean(value?.outcome_id)

  // Retired curricula do not count: auto-picking one would put the form in a
  // state the server refuses before the person has touched anything.
  const usable = programs.filter(program => program.is_active !== false)
  const onlyOne = usable.length === 1 ? usable[0] : null

  useEffect(() => {
    setDraft({
      ...EMPTY,
      // A curriculum to start on: the one the list is filtered to, or the only
      // one this account holds. A กรรมการหลักสูตร never picks.
      program_id: defaultProgram || onlyOne?.program_id || '',
      ...value,
      // Both come back from the server as numbers or as null, and a select
      // holds strings. Left as they are, an outcome with no parent would show
      // the first option as chosen rather than "ไม่มี — เป็นข้อหลัก".
      parent_outcome_id: value?.parent_outcome_id ?? '',
      outcome_description: value?.outcome_description ?? '',
    })
  }, [value, defaultProgram, onlyOne])

  const set = name => event => setDraft(current => ({ ...current, [name]: event.target.value }))

  const excluded = editing ? subtreeOf(plos, value.outcome_id) : new Set()
  const candidates = plos.filter(
    plo => plo.program_id === draft.program_id && !excluded.has(plo.outcome_id)
  )

  const submit = event => {
    event.preventDefault()
    onSave({
      // The curriculum is sent on an edit as well and ignored there: the server
      // reads it from the row, so the two cannot disagree.
      program_id: draft.program_id,
      outcome_code: draft.outcome_code,
      outcome_title: draft.outcome_title,
      outcome_description: draft.outcome_description,
      outcome_type: draft.outcome_type,
      // An empty picker means a main outcome, and the server reads null that
      // way. Sending '' would be read as a parent whose number is nothing.
      parent_outcome_id: draft.parent_outcome_id === '' ? null : draft.parent_outcome_id,
      sequence_order: draft.sequence_order,
      is_active: draft.is_active,
    })
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไขผลการเรียนรู้ของหลักสูตร' : 'เพิ่มผลการเรียนรู้ของหลักสูตร'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="หลักสูตร"
            hint={editing ? 'ย้ายผลการเรียนรู้ข้ามหลักสูตรไม่ได้ ให้ลบแล้วเพิ่มในหลักสูตรใหม่' : null}
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

          <Field
            label="รหัสผลการเรียนรู้"
            hint="รหัสนี้ใช้ซ้ำได้ในหลักสูตรอื่น แต่ห้ามซ้ำกันภายในหลักสูตรเดียวกัน"
          >
            <input
              className={field}
              value={draft.outcome_code}
              onChange={set('outcome_code')}
              placeholder="เช่น PLO-1 หรือ PLO-1-2"
              maxLength={50}
              disabled={busy}
              required
            />
          </Field>
        </div>

        <Field label="ชื่อผลการเรียนรู้">
          <input
            className={field}
            value={draft.outcome_title}
            onChange={set('outcome_title')}
            placeholder="สิ่งที่ผู้สำเร็จการศึกษาทำได้"
            maxLength={500}
            disabled={busy}
            required
          />
        </Field>

        <Field label="รายละเอียดเพิ่มเติม" hint="ไม่บังคับ">
          <textarea
            className={field}
            value={draft.outcome_description}
            onChange={set('outcome_description')}
            rows={3}
            disabled={busy}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="ประเภท">
            <select
              className={field}
              value={draft.outcome_type}
              onChange={set('outcome_type')}
              disabled={busy}
              required
            >
              {Object.entries(OUTCOME_TYPES).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="อยู่ใต้ข้อ" hint="เลือกข้อหลักเพื่อทำให้ข้อนี้เป็นข้อย่อย">
            <select
              className={field}
              value={draft.parent_outcome_id}
              onChange={set('parent_outcome_id')}
              disabled={busy}
            >
              <option value="">ไม่มี — เป็นข้อหลัก</option>
              {candidates.map(plo => (
                <option key={plo.outcome_id} value={plo.outcome_id}>
                  {'— '.repeat(Math.max(0, plo.level_depth - 1))}
                  {plo.outcome_code} {plo.outcome_title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ลำดับการแสดงผล" hint="เรียงจากน้อยไปมากภายในข้อหลักเดียวกัน">
            <input
              className={field}
              type="number"
              value={draft.sequence_order}
              onChange={set('sequence_order')}
              step={1}
              disabled={busy}
              required
            />
          </Field>
        </div>

        {editing && (
          <Field
            label="สถานะ"
            hint="ผลการเรียนรู้ที่มีรายวิชาหรือ CLO อ้างอิงอยู่จะถูกปิดการใช้งานแทนการลบ และเปิดกลับได้จากที่นี่"
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

import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The form for adding a department and for editing one — #14.
 *
 * One component for both, as #11's does, because the fields are the same and a
 * second copy is a second place for a rule to be forgotten. Two things differ
 * and both are stated where they happen.
 *
 * The identifier cannot change once it exists. `05` is what the university
 * calls Computer Engineering (ADR-0001, tier one) and four tables reference it,
 * so changing it is a migration rather than an edit; the server refuses to read
 * it on an edit and the field is disabled here to say so before the person
 * types.
 *
 * There is no faculty field. A faculty administrator's faculty is derived from
 * their acting grant server-side and a body naming another one is refused
 * (ADR-0002), so a field for it would be a field whose only possible use is to
 * be rejected.
 *
 * Switching a department off is how one is retired when programmes, subjects
 * and graded work still point at it - which is what the server offers in place
 * of a deletion it will not allow.
 *
 * #228, answered by the owner on 26 October 2569: every **field** here is
 * closed while this form's own save is out, and the status field carries a
 * `hint`. Before that answer `busy` reached the *บันทึก* button and nothing
 * else - not the status field the ticket is named for, not the three text
 * boxes - so what the person saw and what was being saved could part company.
 * On a save that succeeds `Departments.js` closes the form, which takes the
 * parted value with it; on a save the server **refuses**, the form stays open
 * holding a status nobody sent, and stays that way until the person looks
 * again. That refused save is the window this closes, and it is the same answer
 * #199 and #210 gave their own controls - here with no list re-read behind it.
 *
 * **The flag is the form's and not the page's, and *ยกเลิก* keeps none.** The
 * first answer that day was the other one - every control, `busy`, as
 * `ProgramSubjectForm.js` and `PloForm.js` had it until #242 landed on
 * 28 ตุลาคม 2569 and gave those two and two more this form's shape - and what sent
 * it back was the price, measured before anything was written: **19 rows in two
 * closed tickets arrange their situation by pressing *ยกเลิก* while a save is
 * out on these three screens**, `142a`'s `cancelDuringSave` marking exactly
 * these three (3 rows) and `146a`'s `saveAndCancel` being the whole
 * administration block's arrangement (ภาควิชา 6, หลักสูตร 5, รายวิชา 5). Three
 * of those 19 go further and **type into a second form while the first write is
 * still out**, which `busy` on the fields alone would have broken, `busy` being
 * true for the page and not for the form that sent the save. #146's subject is
 * that window: a person may move on while a save is out. So the decision is
 * implemented the way that keeps both tickets standing (#152), and the five
 * forms are alike in what the ticket was about - the field and what is being
 * saved cannot part company - and unlike in what no row and no person had asked
 * for.
 *
 * What that leaves unguarded is said plainly: *ยกเลิก* is still pressable while
 * the save is out, so a person can still abandon a form whose write has not
 * landed. That is what #142 and #146 measured and wrote rows for, and is not a
 * gap this ticket left.
 *
 * The hint is this screen's own sentence and not a copy of the other four's.
 * `REFUSALS.departmentInUse` already ends *หากต้องการเลิกใช้งานให้ปิดการใช้งานแทน*,
 * and this control is the only one that performs it (#178): a department with
 * anything pointing at it is **refused**, where a programme, a subject, a
 * mapping, an outcome and a rubric are closed for you by `lib/removal`'s
 * `deleteOrDeactivate`. A sentence copied from `PloForm.js` would therefore
 * have been wrong here, which is why the wording was the owner's half of the
 * question and not the ticket-taker's.
 *
 * The hint sits **inside** the `<label>`, where the other four put theirs, and
 * so lands in the control's accessible name: measured on 26 October 2569 on
 * `PloForm.js`'s own hinted box, `{ name: '...', exact: true }` finds 0 and the
 * substring form the three screen helpers use finds 1. That is what makes
 * `getByRole('combobox', { name: 'สถานะ' })` - #180's decision, written into
 * `departments-screen.js`, `programs-screen.js` and `subjects-screen.js` - keep
 * working with no re-aim.
 */

const EMPTY = {
  department_id: '',
  department_name_th: '',
  department_name_en: '',
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

export default function DepartmentForm({ value, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const editing = Boolean(value?.department_id)

  useEffect(() => {
    setDraft({ ...EMPTY, ...value })
  }, [value])

  const set = key => event =>
    setDraft(current => ({ ...current, [key]: event.target.value }))

  // `sending` is put up here and down in the `finally` below, rather than being
  // read from `busy` - #228. `busy` belongs to the page and is true while *any*
  // write or read is out, so a form opened after this one was closed would be
  // frozen by a save it did not send. The flag is this form's, so a form that
  // sent nothing is live; `.finally` always lands, because `onSave` is the
  // page's own `save`, which is `async` and catches its own errors. One mount
  // point, measured on 26 October 2569 - `Departments.js:640` - which is what
  // makes that a claim about every place this is mounted (#220).
  //
  // `.finally` lands when the page's `save` resolves, which is *after* its
  // list re-read, not when the answer arrives - so where the form stays open
  // (a refusal) the fields stay closed through that read as well. Wider than
  // the decision's words by one read, and in the direction the decision was
  // about: nothing can be typed into a value that is still being settled.
  const submit = event => {
    event.preventDefault()
    setSending(true)
    onSave({
      // Sent on an edit as well, and ignored there: the server reads the
      // identifier from the path, so the two cannot disagree.
      department_id: draft.department_id.trim(),
      department_name_th: draft.department_name_th.trim(),
      department_name_en: draft.department_name_en.trim(),
      // Sent on a creation too, where the route has ignored it since #180.
      // Left in rather than made conditional: it is the line `181`'s four
      // form mutants are anchored on, and a creation carries `EMPTY`'s
      // `true`, so what it sends is what the server would have written.
      is_active: draft.is_active,
    }).finally(() => setSending(false))
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไขภาควิชา' : 'เพิ่มภาควิชา'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="รหัสภาควิชา">
            <input
              className={field}
              value={draft.department_id}
              onChange={set('department_id')}
              disabled={sending || editing}
              maxLength={10}
              required
            />
          </Field>
          <Field label="ชื่อภาควิชา (ไทย)">
            <input
              className={field}
              value={draft.department_name_th}
              onChange={set('department_name_th')}
              disabled={sending}
              maxLength={200}
              required
            />
          </Field>
          <Field label="ชื่อภาควิชา (อังกฤษ)">
            <input
              className={field}
              value={draft.department_name_en ?? ''}
              onChange={set('department_name_en')}
              disabled={sending}
              maxLength={200}
            />
          </Field>
        </div>

        {/* Only on an edit, like the other four forms - #180, answered by the
            owner on 22 October 2569. A department is created because it takes
            students, and since the same answer the route does not read the
            field on a creation either. */}
        {editing && (
          <Field
            label="สถานะ"
            hint="ภาควิชาที่มีข้อมูลอื่นอ้างอิงอยู่จะลบไม่ได้ ให้ปิดการใช้งานแทน และเปิดกลับได้จากที่นี่"
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
              disabled={sending}
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

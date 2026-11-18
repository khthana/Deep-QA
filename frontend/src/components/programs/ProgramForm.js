import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'

/**
 * The form for adding a programme and for editing one — #15.
 *
 * One component for both, as #11's and #14's are, because the fields are the
 * same and a second copy is a second place for a rule to be forgotten.
 *
 * The identifier cannot change once it exists. `0501` is what the university
 * calls the Computer Engineering programme (ADR-0001, tier one) and five tables
 * reference it, so changing it is a migration rather than an edit; the server
 * refuses to read it on an edit and the field is disabled here to say so before
 * the person types.
 *
 * There is no department field since #282 (the owner's answer of 18 พ.ย.
 * 2569): only a Department Admin reaches this screen, and holds one
 * department, so the server files a new programme under the grant's department
 * and an edit never moves one. The picker it replaced, with its pool, its
 * auto-pick of the only department and its effect that followed a re-read of
 * the pool (#233), went with it; `docs/acceptance/15-programs.md` §#282 says
 * which rows and mutants went too.
 *
 * Switching a programme off is how one is retired when PLOs, Program Subjects,
 * students and graded work still point at it - and is also what the server does
 * by itself when a deletion is asked for and something depends on the record.
 * The box is on the edit form only; a programme being added is being offered.
 *
 * Every field is sent on every save, blank ones included, because the server
 * reads a PUT as a replacement: an emptied year is an intentionally emptied
 * year, and the form is the thing that knows the person emptied it.
 *
 * #228, answered by the owner on 26 October 2569: every **field** here is
 * closed while this form's own save is out - the form's flag and not the page's
 * `busy`, and *ยกเลิก* keeps none - and the status field carries a `hint`.
 * `DepartmentForm.js`'s head comment has the measurement, the 19 rows that
 * decided the shape, and why its own hint had to be a different sentence from
 * this one. Here the sentence follows the **pattern of the two forms that
 * already had a hint** - `PloForm.js:265` and `ProgramSubjectForm.js:176`,
 * which were the only two carrying that tail before this change - with this
 * screen's noun: its removal really is turned into a deactivation by
 * `lib/removal`, so *จะถูกปิดการใช้งานแทนการลบ* is literally what happens.
 * `Programs.js:322` already says the same fact at the moment of the refusal,
 * which is why nothing new had to be decided for this screen.
 */

const EMPTY = {
  program_id: '',
  program_name_th: '',
  program_name_en: '',
  revision_year: '',
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

export default function ProgramForm({ value, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const editing = Boolean(value?.program_id)

  // The subject changed, so the form starts again: another programme is being
  // edited, or the form was opened to add one. `value` is state in the screen
  // above and is not derived from any answer here, so a re-read cannot move it.
  useEffect(() => {
    setDraft({ ...EMPTY, ...value })
  }, [value])

  const set = key => event => setDraft(current => ({ ...current, [key]: event.target.value }))

  // `sending` is put up here and down in the `finally` below, rather than being
  // read from `busy` - #228. `DepartmentForm.js`'s head comment has the reason
  // and the 19 rows that decided it; in one line, `busy` belongs to the page, so
  // a form opened after this one was closed would be frozen by a save it did not
  // send. `.finally` always lands, because `onSave` is the page's own `save`,
  // which is `async` and catches its own errors. One mount point, measured on
  // 26 October 2569 - `Programs.js:360` - which is what makes that a claim
  // about every place this is mounted (#220).
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
      program_id: draft.program_id.trim(),
      program_name_th: draft.program_name_th.trim(),
      program_name_en: draft.program_name_en.trim(),
      revision_year: draft.revision_year.trim(),
      is_active: draft.is_active,
    }).finally(() => setSending(false))
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไขหลักสูตร' : 'เพิ่มหลักสูตร'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="รหัสหลักสูตร">
            <input
              className={field}
              value={draft.program_id}
              onChange={set('program_id')}
              disabled={sending || editing}
              maxLength={10}
              required
            />
          </Field>
          <Field label="ชื่อหลักสูตร (ไทย)">
            <input
              className={field}
              value={draft.program_name_th}
              onChange={set('program_name_th')}
              disabled={sending}
              maxLength={200}
              required
            />
          </Field>
          <Field label="ชื่อหลักสูตร (อังกฤษ)">
            <input
              className={field}
              value={draft.program_name_en ?? ''}
              onChange={set('program_name_en')}
              disabled={sending}
              maxLength={200}
            />
          </Field>
          <Field label="ปีหลักสูตร (พ.ศ.)">
            <input
              className={field}
              value={draft.revision_year ?? ''}
              onChange={set('revision_year')}
              disabled={sending}
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              placeholder="2564"
            />
          </Field>
        </div>

        {/* Only on an edit: a programme is created because it is being offered,
            and the server does not read the field on a creation either. */}
        {/* A select since #180, in the words the table's own badge uses: the
            field was a checkbox reading *เปิดใช้งาน* on three of the five forms
            and a select reading *ใช้งานอยู่ / ปิดใช้งาน* on the other two. */}
        {editing && (
          <Field
            label="สถานะ"
            hint="หลักสูตรที่มีข้อมูลอื่นอ้างอิงอยู่จะถูกปิดการใช้งานแทนการลบ และเปิดกลับได้จากที่นี่"
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

import { useEffect, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import GrantPicker from './GrantPicker'
import useGrantable from './useGrantable'

/**
 * The form for adding an account and for editing one — #11.
 *
 * One component for both, because the fields are the same and a second copy is
 * a second place for a rule to be forgotten. What differs is small and stated
 * where it happens: the identifier cannot change once it exists, and the role
 * pickers are shown only when adding, because that is the one grant made with
 * the account. Every grant after it is managed in the panel beside this form
 * (#12), which is where a person already holding roles has them listed.
 *
 * The validity period is shown for every role and not only for the external
 * assessor, because it is a property of the account rather than of the grant
 * (migration 0005). It is where an assessor's `บัญชีชั่วคราว` is stated, and
 * an ordinary account simply leaves it blank.
 *
 * Nothing here decides what the person may do. The roles and scopes offered
 * are the ones the server said this administrator may hand out, and the server
 * decides again when the form is posted; a form that enforced it alone would
 * be a rule with a way around it (ADR-0002).
 *
 * ## Every field is closed while this form's own save is out
 *
 * **This file carries the reasons for the fifteen forms of #249.** The others
 * point here and keep only what is their own: the mount points they are drawn
 * at, and whatever their own screen does that the shape has to be measured
 * against.
 *
 * #228, answered by the owner on 26 ตุลาคม 2569, decided the shape for the
 * three administration forms: **every field is closed while the form's own save
 * is out, with a flag of the form's own, and *ยกเลิก* holds nothing.** #242
 * carried it to four more, and #243 measured what was left - 57 fields in 15
 * files whose *บันทึก* already holds the page's flag, which is this ticket. The
 * defect is the one #228 is named for: while the save is out, what the person
 * sees and what is being saved can part company, and on a save the server
 * **refuses** the form stays open holding a value nobody sent. That last half
 * was measured on all eleven parent screens before this landed: `setEditing`
 * (or its sibling) is inside the `try` after the `await`, so a refusal skips it
 * and the form stays.
 *
 * ### Why the flag is the form's own and not the page's `busy`
 *
 * Because a person may move on while a save is out, which is what #146 and #149
 * are about. `busy` is true while *any* read or write of the page is out, so a
 * form opened after this one was closed would be frozen by a save it did not
 * send. The flag is this form's, so a form that sent nothing is live - and
 * `.finally` always lands, because `onSubmit` is the page's own `save`, which is
 * `async` and catches its own errors (measured on all eleven, 30 ตุลาคม 2569).
 *
 * ### Where the flag needs a second way down, and where it does not
 *
 * `.finally` alone is not enough everywhere, and which screens that is was this
 * ticket's own measurement. A flag that says *a save of mine is still out* has
 * to come down where that is **reversed** and not only where it completes
 * (#227), and the way it is reversed here is the form being handed another
 * record - or being closed and opened again - while the component stays
 * mounted.
 *
 * Measured on 30 ตุลาคม 2569, at every mount point (#220) - **twice, and the
 * first reading was wrong**. Ten of the fifteen are a form component with a flag
 * of its own, and **six of those ten can reach that state and four cannot**; the
 * other five - `ProfilePhotoDialog.js`, `offerings/SectionsPanel.js`,
 * `pages/StudentGroups.js`, `pages/SubjectStudents.js` and
 * `pages/ActivityScores.js` - hold the flag where the write is sent and clear it
 * in the same `finally`, with nothing that re-seeds a form from a record at all.
 *
 * The six are `improvement/EntrySection.js`, whose card is drawn four times on
 * one screen and never unmounts, and the five ผู้สอน card screens' forms -
 * `clos/CloForm.js`, `achievements/CriterionForm.js`, `behaviors/BehaviorForm.js`,
 * `plan/WeekForm.js` and `activity/ActivityForm.js` - whose ternary swaps the form
 * with the **button that opens it** and leaves the card list, and its pencils,
 * standing underneath. A pencil on another card then arrives while this card's
 * save is out and React re-renders the component instead of remounting it, so
 * the flag is up over a card that has sent nothing. All six clear it in the
 * effect the subject keys, which is the arrival.
 *
 * The four that cannot are this form, `students/StudentForm.js` and
 * `offerings/OfferingForm.js`, drawn in the half of a ternary whose **other half
 * is the list and its filters** - so while the form is open there is no แก้ไข
 * on the screen to press and closing it unmounts the component - and
 * `evidence/EvidenceForm.js`, which has a `key` per file, the same answer by a
 * different mechanism (#147). The two add-only forms say so at their own
 * effects, which are keyed by identity and would put the flag down early
 * (#232, #233).
 *
 * **How the first reading went wrong, because it is the useful half.** A draft of
 * this ticket wrote the line into six forms, on the reading that `Users.js` keeps
 * this component mounted across two rows' แก้ไข. That reading was false, the
 * ternary says otherwise, and a guard no row can reach is a claim nothing holds
 * (#97, #220) - so the six lines came out, and five of them were the five card
 * screens, where the state is real for a different reason the measurement never
 * asked about: not *does the parent keep the form mounted across two แก้ไข* but
 * *is the แก้ไข still on the screen while the form is open*. A conclusion that
 * is right for the wrong reason expires on the wrong day (#141), and this one
 * expired the same evening: the full suite of 30 ตุลาคม 2569 came back with
 * ten rows red - `149a` and `151a`, five screens each - every one of them a
 * pencil on a second card inside a held save, and every one dying at a `fill`
 * and so at a timeout rather than at a claim (#139). The paragraph that stood
 * here even wrote the condition down - *the day a screen draws its form beside
 * its table* - which was already true of five screens while it was being typed.
 * What would re-date **this** paragraph: a page handing one of the four a
 * different record without passing through the list.
 *
 * ### The price, measured before any of it was written
 *
 * `#243` item 2 asks for the census of the **press** (#199, #221) before this
 * shape lands anywhere. Measured on 30 ตุลาคม 2569 by the mechanism - a row that
 * holds a request open (`await <gate>.sent`) and then types, selects, checks or
 * presses a key before letting the answer go: **19 field acts in 9 spec files**,
 * of which **10 land on five of these fifteen forms**. Four of the five are
 * free: `146a` and `149a` type into the *next* form (another evidence file,
 * another section's editor, a form opened again after *ยกเลิก*), which is a
 * remount or a different instance. The fifth is `142a`, whose two Offerings rows
 * type into the panel that sent the write - and of those only the first types
 * **after** the write is out; the second presses กลับไปหน้ารายการ first, which
 * unmounts the panel, so it is free for the same reason. That one row is
 * re-aimed by this ticket and says so on its own row.
 * `_local/presscensus243.py` counted from
 * the `gate(` line, which over-reports: a row that gates, then fills, then
 * presses *บันทึก* has done its typing before the request is out.
 *
 * ### What this does not close
 *
 * *ยกเลิก* stays pressable while the save is out wherever it already was. What
 * this ticket does **not** do is free the four of these fifteen whose *ยกเลิก*
 * still holds the page's flag: `evidence/EvidenceForm.js` is one, and `202a`'s
 * docblock names four `save` sites whose criteria read *structurally
 * unreachable* **because** nothing can take the screen while the write is out.
 * Freeing them expires those dated reasons and re-dates `146a:546`'s own
 * paragraph (#86), which is a ticket of its own rather than a line in this one
 * (#119, #125) - **#253**, opened on 30 ตุลาคม 2569 when the same day's review
 * read this paragraph and asked for the number, because a deferral written into
 * prose and not into the tracker is a decision nobody can find. That ticket
 * measures the population by the mechanism rather than restating the *four*
 * here, which is #202's count and a claim like any other. The owner's sentence of 26 ตุลาคม 2569 is about the form that
 * sent the save and says nothing that makes those four's prose wrong today.
 *
 * And `save-window-fields.js` reads
 * whether a `disabled` **exists**, not whose flag it is or what for: that is the
 * first of the six limits on its own front page, and the one this ticket met on
 * a real site. The witness it printed on 29 ตุลาคม 2569 was
 * `components/offerings/OfferingForm.js:178`, `flagged` behind `loading`, which
 * is the flag of a *read* and is down before anybody can press *บันทึก*. This
 * ticket gave that form a flag of its own, which expired the **witness** and not
 * the limit: the picker is now `OfferingForm.js:203` and reads
 * `sending || !draft.program_id || loading`, which the script still cannot tell
 * from a condition holding the read's flag alone. So `bare 0` means nobody is
 * bare, not that every flag is the right one, and the fix is read per file
 * rather than per number.
 */

const EMPTY = {
  user_id: '',
  email: '',
  title_th: '',
  first_name_th: '',
  last_name_th: '',
  title_en: '',
  first_name_en: '',
  last_name_en: '',
  department_id: '',
  program_id: '',
  password: '',
  valid_from: '',
  valid_until: '',
  role_id: '',
  scope_id: '',
}

const field =
  'block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
const labelling = 'mb-1 block text-sm text-gray-500'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelling}>{label}</span>
      {children}
    </label>
  )
}

export default function UserForm({ user, onSubmit, onCancel, busy }) {
  const editing = Boolean(user)
  const grantable = useGrantable()
  const [draft, setDraft] = useState(EMPTY)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!user) return setDraft(EMPTY)
    setDraft({
      ...EMPTY,
      ...Object.fromEntries(
        Object.entries(user).map(([key, value]) => [key, value ?? ''])
      ),
    })
  }, [user])

  const set = key => event =>
    setDraft(current => ({ ...current, [key]: event.target.value }))

  // The two roles the sign-in rule sends to the password form; everybody else
  // goes to Google. Marked here as well as refused server-side so the person
  // finds out while they are still filling the form in.
  const needsPassword =
    draft.role_id === 'FULL_ADMIN' || draft.role_id === 'EXT_ASSESSOR'

  const submit = event => {
    event.preventDefault()
    setSending(true)
    const { role_id, scope_id, password, ...details } = draft
    // An edit sends the details alone. The grants an existing account holds are
    // the panel's - they are added and revoked one at a time against their own
    // routes - and a role smuggled into an edit body would be one the server
    // has to decide whether to ignore.
    onSubmit(
      editing
        ? details
        : { ...details, password, role: { role_id, scope_id } }
    ).finally(() => setSending(false))
  }

  return (
    <ContentMotionDIV className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-primary">
        {editing ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}
      </h2>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="รหัสผู้ใช้">
            <input
              className={field}
              value={draft.user_id}
              onChange={set('user_id')}
              disabled={sending || editing}
              required
            />
          </Field>
          <Field label="อีเมล">
            <input
              className={field}
              type="email"
              value={draft.email}
              onChange={set('email')}
              disabled={sending}
              required
            />
          </Field>

          <Field label="คำนำหน้า (ไทย)">
            <input
              className={field}
              value={draft.title_th}
              onChange={set('title_th')}
              disabled={sending}
            />
          </Field>
          <Field label="คำนำหน้า (อังกฤษ)">
            <input
              className={field}
              value={draft.title_en}
              onChange={set('title_en')}
              disabled={sending}
            />
          </Field>

          <Field label="ชื่อ (ไทย)">
            <input
              className={field}
              value={draft.first_name_th}
              onChange={set('first_name_th')}
              disabled={sending}
            />
          </Field>
          <Field label="นามสกุล (ไทย)">
            <input
              className={field}
              value={draft.last_name_th}
              onChange={set('last_name_th')}
              disabled={sending}
            />
          </Field>

          <Field label="ชื่อ (อังกฤษ)">
            <input
              className={field}
              value={draft.first_name_en}
              onChange={set('first_name_en')}
              disabled={sending}
            />
          </Field>
          <Field label="นามสกุล (อังกฤษ)">
            <input
              className={field}
              value={draft.last_name_en}
              onChange={set('last_name_en')}
              disabled={sending}
            />
          </Field>

          <Field label="รหัสภาควิชา">
            <input
              className={field}
              value={draft.department_id}
              onChange={set('department_id')}
              disabled={sending}
              placeholder="05"
            />
          </Field>
          <Field label="รหัสหลักสูตร">
            <input
              className={field}
              value={draft.program_id}
              onChange={set('program_id')}
              disabled={sending}
              placeholder="0501"
            />
          </Field>
        </div>

        {/*
          R005's time-boxed account. Both ends are optional and an empty one is
          open: an ordinary staff account leaves both blank, and an external
          assessor is the case the columns exist for.

          Since #88 each end bounds the other - `min` on the later field, `max`
          on the earlier - so the browser's own picker states the rule while the
          dates are being chosen, rather than the window being refused after a
          round trip. `|| undefined` and not `''`, because an empty counterpart
          is an open end: that is the server's own rule (`from && until && from >
          until`), and a field that bounded itself anyway would refuse a window
          the system accepts.

          An addition and not a replacement. `validateUser` and the table's own
          CHECK constraint still decide; a rule a form enforced alone would be a
          rule with a way around it (ADR-0002).
        */}
        <fieldset className="rounded-lg border border-gray-200 p-4">
          <legend className="px-2 text-sm text-gray-500">
            ช่วงเวลาใช้งาน (เว้นว่างได้ ใช้กับบัญชีผู้ประเมินภายนอก)
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="เริ่มใช้งานได้">
              <input
                className={field}
                type="date"
                value={draft.valid_from}
                onChange={set('valid_from')}
                disabled={sending}
                max={draft.valid_until || undefined}
              />
            </Field>
            <Field label="ใช้งานได้ถึง">
              <input
                className={field}
                type="date"
                value={draft.valid_until}
                onChange={set('valid_until')}
                disabled={sending}
                min={draft.valid_from || undefined}
              />
            </Field>
          </div>
        </fieldset>

        {!editing && (
          <div className="grid gap-4 md:grid-cols-3">
            <GrantPicker
              grantable={grantable}
              value={{ role_id: draft.role_id, scope_id: draft.scope_id }}
              onChange={grant =>
                setDraft(current => ({ ...current, ...grant }))
              }
              disabled={sending}
            />
            <Field
              label={
                needsPassword
                  ? 'รหัสผ่าน (บทบาทนี้ต้องกำหนด)'
                  : 'รหัสผ่าน (ถ้าไม่ได้เข้าผ่าน Google)'
              }
            >
              <input
                className={field}
                type="password"
                value={draft.password}
                onChange={set('password')}
                disabled={sending}
                autoComplete="new-password"
                required={needsPassword}
              />
            </Field>
          </div>
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

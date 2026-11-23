import { useEffect, useId, useRef, useState } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import GrantPicker from './GrantPicker'
import Notice from '../Notice'
import useModalFocus from '../useModalFocus'

/**
 * *เพิ่มสิทธิ์* — the dialog the edit page's *สิทธิ์ของระบบ* tab opens - #303.
 *
 * `docs/users-screen.md` rule 8, and the delivered screen's `AddRoleDialog`:
 * a title naming whose account it is, the two pickers, *ยกเลิก* and *บันทึก*.
 * The title is spelt *เพิ่มสิทธิ์* where the delivered one wrote *เพิ่มสิทธ์*,
 * to match the tab (the owner's answer of 22 November 2569). The pickers are
 * `GrantPicker`, which the add form shares, so their own captions are that
 * component's and not this dialog's.
 *
 * **The dialog holds its own draft, its own flag and its own refusal**, and it
 * is drawn only while open, so each opening is a fresh mount. That is what
 * makes two of the rules other dialogs had to write by hand true here by the
 * container (#254's sibling, said as a dated claim rather than a guard): a
 * refusal that arrives after *ยกเลิก* lands on a component that is gone, and
 * cannot be drawn at the next opening; and the draft of a dialog that was
 * dismissed is not there when it is opened again (#167). The day this is drawn
 * with `open` instead of being unmounted, both become the defect again.
 *
 * While its save is out every field and *บันทึก* are closed and *ยกเลิก* is not
 * (#228, #249, #253) - *ยกเลิก* holds nothing and hands control back to the
 * panel, whose answer handler then adds the grant to the cards whether or not
 * the dialog is still there: the grant was made.
 *
 * **What that left open, and the review of 23 November 2569 found** (#146,
 * #254): *เพิ่มสิทธิ์* is live while the dismissed opening's save is out, so
 * the person can be inside a second opening when the first answer lands. Until
 * then the panel closed the dialog on every success, which shut the second
 * opening over whatever was picked in it. So the dialog closes **itself**, and
 * only while it is still mounted - the mount being the opening, the key #185
 * and #254 ask for, which here costs nothing. And a refusal that finds the
 * opening gone is handed to the panel by `onLateRefusal`, which says it where
 * the success would have been said: a person who pressed *บันทึก* and then
 * *ยกเลิก* is told the grant was not made, rather than left to read an
 * unchanged list of cards as an answer (#249's question, *what is the person
 * left with when the refusal arrives*).
 *
 * The cover is `ConfirmDialog`'s, with the same `!m-0` and for the same reason
 * (#274): the edit page mounts this inside a `space-y-6`.
 */
export default function GrantDialog({ grantable, name, onSubmit, onCancel, onLateRefusal }) {
  const box = useRef(null)
  // Whether this opening is still on the screen. Written in the effect and not
  // at render, so StrictMode's mount-unmount-mount leaves it true.
  const live = useRef(false)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])
  const titleId = useId()
  const [draft, setDraft] = useState({ role_id: '', scope_id: '' })
  const [sending, setSending] = useState(false)
  const [refusal, setRefusal] = useState(null)

  useModalFocus(box, true, onCancel)

  const submit = async event => {
    event.preventDefault()
    setSending(true)
    setRefusal(null)
    try {
      await onSubmit(draft)
      if (live.current) onCancel()
    } catch (error) {
      // A 401 already raises the shell's dialog (#131).
      if (error.expired) return
      const said = { error: true, message: error.message }
      if (live.current) setRefusal(said)
      else onLateRefusal(said)
    } finally {
      setSending(false)
    }
  }

  return (
    <ContentMotionDIV className="fixed inset-0 z-[9998] !m-0 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg focus:outline-none"
      >
        <h2 id={titleId} className="mb-4 text-center text-xl font-medium text-secondary">
          เพิ่มสิทธิ์ {name}
        </h2>
        {refusal && (
          <div className="mb-4">
            <Notice notice={refusal} />
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <GrantPicker
            grantable={grantable}
            value={draft}
            onChange={setDraft}
            disabled={sending}
          />
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
              disabled={sending || !draft.role_id || !draft.scope_id}
              className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary_hover disabled:opacity-60"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </ContentMotionDIV>
  )
}

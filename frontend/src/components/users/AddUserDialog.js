import { useId, useRef } from 'react'

import ContentMotionDIV from '../ContentMotionDIV'
import Notice from '../Notice'
import useModalFocus from '../useModalFocus'
import UserForm from './UserForm'

/**
 * Adding an account, in a dialog over the list - #304.
 *
 * The delivered `AddUserDialog.js` was a box over the user table, and the
 * rebuild drew the form in place of the list until the owner's answer of 22
 * November 2569 put it back (`docs/users-screen.md` rule 10): the same fields
 * as the edit page's *ข้อมูลทั่วไป* tab plus the first grant, laid out by
 * `docs/ui-form-layout.md` rather than the delivered two columns, scrolling
 * inside a box no taller than nine tenths of the screen.
 *
 * **The page draws this only while it is open**, so every opening is a fresh
 * mount and every way out - ยกเลิก, Escape, a save that lands - forgets what
 * was typed with nothing written to clear it (#167). What a mount cannot do is
 * tell a late answer which opening it belongs to; `Users.js`' `showing` ref
 * does that, as it did for the form this replaces (#146, #254).
 *
 * `notice` is the page's own. While this is open the page's `Notice` is behind
 * the cover, so `Users.js` hands it here and stops drawing its own - a refusal
 * of this save is read where the person is, and drawn once.
 *
 * Since #307 (25 November 2569) `notice` is this save's own refusal and no
 * longer the page's whole notice - a refusal of anything else drawn here read
 * as this save being refused. The page keeps those until this closes.
 */
export default function AddUserDialog({ notice, onSubmit, onCancel, busy }) {
  const box = useRef(null)
  const titleId = useId()

  useModalFocus(box, true, onCancel)

  return (
    <ContentMotionDIV className="fixed inset-0 z-[9998] !m-0 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg focus:outline-none"
      >
        <h2 id={titleId} className="mb-4 text-center text-xl font-medium text-secondary">
          เพิ่มผู้ใช้งาน
        </h2>
        {notice && (
          <div className="mb-4">
            <Notice notice={notice} />
          </div>
        )}
        <UserForm user={null} onSubmit={onSubmit} onCancel={onCancel} busy={busy} />
      </div>
    </ContentMotionDIV>
  )
}

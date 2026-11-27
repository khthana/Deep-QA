import { useEffect, useId, useRef, useState } from 'react'

import ContentMotionDIV from './ContentMotionDIV'
import Notice from './Notice'
import useModalFocus from './useModalFocus'

/**
 * An add or edit form, in a dialog over the list - `docs/ui-consistency.md`
 * rule 8, the owner's answer of 27 November 2569, first on ข้อมูลภาควิชา (#319)
 * and then one screen at a time (#320-#334).
 *
 * The look is `components/users/AddUserDialog.js`' (#304), which the rule names
 * as the model: the blurred cover, the white box no taller than nine tenths of
 * the screen and scrolling inside it, the title centred in the secondary
 * colour. `AddUserDialog` is left as it is rather than rewritten through this,
 * because #304's mutants quote its lines; the two are kept alike by the walk
 * and not by a shared file, which is a choice that can be reversed when that
 * file is next opened.
 *
 * **The page draws this only while a form is open**, so each opening is a fresh
 * mount and every way out forgets what was typed with nothing written to clear
 * it (#167). Which opening a late answer belongs to is the page's `showing`
 * ref, as it was for the form drawn in place of the list (#146, #254).
 *
 * `notice` is this form's own save's refusal and nothing else - the page's
 * `Notice` is behind the cover, and what lands there while this is open is
 * read once it closes (#307's answer, `pages/Users.js`).
 *
 * Three behaviours the ticket asked for and `AddUserDialog` does not have:
 *
 * - **Escape does nothing while `saving`.** The ticket's words: Escape closes
 *   *when no save is out*. ยกเลิก inside the form is a different control and
 *   keeps what #228 and #249 decided for it - free on this screen - so the two
 *   ways out differ while a save is out, and that difference is the ticket's.
 * - **Focus goes back to what opened it** when this goes, if that is still in
 *   the document: the add button, or the row's แก้ไข. `useModalFocus` is left
 *   alone because `ConfirmDialog` and the import window share it and neither
 *   was asked.
 * - **`!m-0` on the cover**, which `AddUserDialog` has too: the page's
 *   `space-y-6` would otherwise push a `fixed inset-0` cover 24 px down (#274).
 */
export default function FormDialog({ title, notice, saving = false, onCancel, children }) {
  const box = useRef(null)
  const titleId = useId()

  // Whatever held the focus when this opened, read during the first render -
  // before any effect, so before `useModalFocus` has moved the focus into the
  // box, and once, so StrictMode's second run of the effects cannot read the
  // box instead.
  const [opener] = useState(() => document.activeElement)

  // Escape is the way out unless this form's save is out.
  const escape = useRef(onCancel)
  useEffect(() => {
    escape.current = saving ? () => {} : onCancel
  }, [saving, onCancel])

  useModalFocus(box, true, () => escape.current())

  // The opener gets the focus back when this goes. Declared after
  // `useModalFocus`: cleanups run in the order the effects are written, so the
  // focus trap's `focusin` listener is gone before this moves the focus - with
  // it still attached it would pull the focus back into a box that is leaving,
  // and read `box.current` after React has emptied it. Found by review.
  useEffect(
    () => () => {
      if (opener && opener !== document.body && opener.isConnected) opener.focus()
    },
    [opener],
  )

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
          {title}
        </h2>
        {notice && (
          <div className="mb-4">
            <Notice notice={notice} />
          </div>
        )}
        {children}
      </div>
    </ContentMotionDIV>
  )
}

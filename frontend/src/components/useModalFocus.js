import { useEffect } from 'react'

/**
 * What a box drawn over the screen does with the focus - moved in when it
 * opens, kept in while it is open, and Escape as the way out.
 *
 * Written once in `ConfirmDialog.js` by #204 (the focus moved in, Escape) and
 * #217 (the trap), and moved here by #270, whose import window needed the same
 * three behaviours and whose ticket asked for them *not written a second time*.
 * The reasons for each - why a `focusin` listener rather than a tab-order wrap,
 * why Escape is on `window`, why the box and not its first button takes the
 * focus - are in `ConfirmDialog.js`'s docblock and stay there, because that is
 * the file whose rows decided them (#83, #168: what an instrument *means* is
 * documented in the file that uses it on purpose).
 *
 * `box` is the ref of the element carrying `role="dialog"` and `tabIndex={-1}`.
 * `onCancel` is what Escape does; a caller that must not be left while it is
 * busy passes a function that does nothing then, rather than this hook growing
 * a `busy` of its own - `ConfirmDialog` leaves its way out open while busy and
 * the import window does not, and that is each caller's decision.
 *
 * The mutants that were `204:nofocusonopen`, `204:noescape` and `204:notrap` on
 * `ConfirmDialog.js` are aimed here since #270, so each now reaches every box
 * that calls this - `mutation/204-the-question-that-announces-itself.py`.
 */
export default function useModalFocus(box, open, onCancel) {
  useEffect(() => {
    if (open) box.current.focus()
  }, [box, open])

  useEffect(() => {
    if (!open) return undefined
    const keep = event => {
      if (!box.current.contains(event.target)) box.current.focus()
    }
    document.addEventListener('focusin', keep)
    return () => document.removeEventListener('focusin', keep)
  }, [box, open])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = event => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])
}

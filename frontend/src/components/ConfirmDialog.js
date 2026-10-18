import { useEffect, useId, useRef } from 'react'

import ContentMotionDIV from './ContentMotionDIV'

/** Thai letters, vowels and marks - not the digits, ฿, ๏ or ๚๛. */
const THAI = '[\u0E01-\u0E3A\u0E40-\u0E4E]'
const BETWEEN_THAI = new RegExp(`(${THAI})(?=${THAI})`, 'g')

/**
 * The message, with every Thai run glued so the line breaks fall on the spaces
 * its author wrote.
 *
 * #118 found `ปีการศึกษา` broken as `ปีการ` / `ศึกษา`, and the cause is neither
 * of the two the ticket suspected. It is not `break-words`: the paragraph never
 * overflows, and taking the class off leaves the break exactly where it was. It
 * is not the width either, nor `lang`, nor `word-break: keep-all`, nor
 * `line-break: strict` - all four measured, all four change nothing. The cause
 * is that Chromium asks ICU where the Thai words are, and ICU answers
 * `ใน|ปี|การ|ศึกษา`. A break after `การ` is therefore a legitimate dictionary
 * break opportunity, not an emergency one. The same answer splits `ผู้|สอน` and
 * `ภาค|การ|ศึกษา` in the longest confirmation the system has.
 *
 * There is no CSS that narrows those opportunities, so the text says where it
 * may break instead. U+2060 WORD JOINER is the character for that: it forbids a
 * break without occupying any space or printing anything. Gluing every adjacent
 * pair leaves exactly the author's spaces as break opportunities - which is a
 * rule a person can state, and needs no dictionary of compounds.
 *
 * `break-words` on the paragraph stays, and it is not redundant: a Thai run
 * longer than a line still breaks rather than overflowing, because
 * `overflow-wrap` may break where a word joiner forbids it. Measured both ways -
 * a 78-character Thai name overflows the dialog by 213px if this is done with
 * `white-space: nowrap` instead, and does not overflow with the joiners.
 *
 * The cost is that the sentence in the DOM is no longer the sentence in the
 * source: anything matching it by substring has to normalise first. U+2060 is a
 * default-ignorable code point, so find-in-page and screen readers skip it; a
 * copy out of the dialog carries it.
 */
/*
 * The `typeof` guard is reached by no caller today: all 20 of them pass a
 * ternary whose other arm is `''`, so the value is always a string. It is here
 * because without it a caller that passed nothing would go from drawing nothing
 * - which is what `{message}` did - to throwing inside a component 19 screens
 * share. So it is untested rather than unreachable, and the fixture that would
 * reach it is a caller that does not exist.
 *
 * The count is a measurement with a date on it, and it has already moved once:
 * it was written as *19 call sites in 18 files* and read as `removing ? ... : ''`
 * at every one of them. #86 added `Users.js`'s status switch on 16 ตุลาคม 2569,
 * which asks `switching ? asks(switching) : ''`, and `Offerings.js` has held two
 * sites - in two mutually exclusive returns - since `8fe0b6d`. Counted again by
 * AST on 18 ตุลาคม 2569: **20 call sites in 19 files**, at most one of them
 * mounted at a time.
 */
const glued = message =>
  typeof message === 'string' ? message.replace(BETWEEN_THAI, '$1\u2060') : message

/**
 * "Are you sure?" — #14's second criterion, and every deletion after it.
 *
 * docs/06's thirtieth story asks for a confirmation before any deletion, and
 * there are ten more screens with a delete button on them, so this is written
 * once. What it takes is the question and what the button says; what it does is
 * ask, and nothing else. The consequences - what is destroyed, whether the
 * server will even allow it - are the caller's to word and the server's to
 * decide.
 *
 * Deliberately not a `window.confirm`: that dialog cannot be styled, cannot say
 * anything in the record's own words beyond one line, and is suppressible by
 * the browser.
 *
 * ## What #204 added, and the half it did not (18 ตุลาคม 2569)
 *
 * Until #204 this box was, to anything reading the page, a `div`: no role, no
 * modality, no accessible name or description, no focus moved into it and no
 * way out with the keyboard. The owner's decision was to build the half that
 * **announces** and to leave the half that **contains** as a question, because
 * the two have very different prices:
 *
 * - The announcing half - `role`, `aria-modal`, the two id references, the
 *   focus moved in, Escape - costs no row in the browser seam. Every row that
 *   reaches a control under the cover does it with `focus()` or `fill()`, which
 *   move focus from wherever it was, so moving it in on open leaves them
 *   standing. `204a` rows 1-5 hold it.
 * - The containment half - a focus trap, `inert` or `aria-hidden` on the rest
 *   of the screen - is what removes reach, and it costs **10 rows in 5 files**
 *   (`202a` 3, `206a` 2, `207a` 3, `208a` 1, `211a` 1) plus a sweep of the 22
 *   mutants those files hold. That is measured rather than censused: the
 *   `trapsfocus` mutant reddens those ten and this component's own net, and a
 *   census by mechanism had said eleven - it counted one row whose way in is a
 *   `fill()`, which sets a value and does not need focus to stay where it was
 *   put, and two rows that press nothing under the cover at all. Those three
 *   leave eight, not ten: it also missed two rows that reach the cover inline
 *   rather than through a helper it had found, one in `206a` and one in `211a`.
 *   Changing what a keyboard can reach is a change to what a person does with
 *   the screen, so it is the owner's (`docs/06` §Out of Scope) and it waits on a
 *   ticket of its own, #217. `204a` row 6 is the net that says it is still
 *   open, and
 *   its mutant is that proposal made to run (#48).
 *
 * `aria-modal="true"` is worth stating precisely rather than as *it announces*:
 * it asks a screen reader to read nothing outside this box, so for somebody
 * listening the way in is already closed; for a sighted keyboard user the tab
 * order is untouched. The deferred half is therefore *containment for the
 * second kind of reader*, not containment as such.
 *
 * `SessionExpiredDialog` is the same shape and the same gap, one call site in
 * `App.js`, and is outside what #204 asked about.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const box = useRef(null)
  const titleId = useId()
  const messageId = useId()

  // The box takes the focus the ลบ was holding, so that what a screen reader
  // reads next is the name and the description below and not the row behind.
  // `box.current` is set by construction: this runs after the commit in which
  // `open` was true, which is the commit that drew the div.
  useEffect(() => {
    if (open) box.current.focus()
  }, [open])

  // Escape is the ยกเลิก, including while `busy` - the ยกเลิก button is not
  // disabled then either, so the two ways out answer alike. On `window` rather
  // than on the box, because nothing contains the focus yet: a person who has
  // tabbed back into the table still gets the way out.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = event => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <ContentMotionDIV className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      {/*
       * `focus:outline-none` so that giving the box the focus cannot put a ring
       * around it: Chromium draws none for programmatic focus on a
       * non-interactive element today, and this makes that independent of the
       * heuristic rather than reliant on it. An outline costs no layout, which
       * is the rule an accessibility fix is held to here (#111, #122).
       */}
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl focus:outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold text-primary">
          {title}
        </h2>
        <p
          id={messageId}
          className="text-md mt-4 break-words leading-relaxed text-gray-600"
        >
          {glued(message)}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ContentMotionDIV>
  )
}

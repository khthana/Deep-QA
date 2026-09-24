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
 * The `typeof` guard is reached by no caller today: all 19 of them pass
 * `removing ? ... : ''`, so the value is always a string. It is here because
 * without it a caller that passed nothing would go from drawing nothing - which
 * is what `{message}` did - to throwing inside a component 18 screens share. So
 * it is untested rather than unreachable, and the fixture that would reach it is
 * a caller that does not exist.
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
  if (!open) return null

  return (
    <ContentMotionDIV className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="text-md mt-4 break-words leading-relaxed text-gray-600">
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

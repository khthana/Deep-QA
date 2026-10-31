import { useEffect, useRef, useState } from 'react'
import ContentMotionDIV from './ContentMotionDIV'
import { uploadProfilePhoto } from '../api/profile'

/**
 * The caller's own photo, being chosen — #47.
 *
 * A component of its own rather than a third modal written inline in
 * `Navbar.js`: the change-password form is already there at 170 lines, and a
 * navbar holding every dialog it can open is how that file got that long.
 *
 * ## `accept` is a courtesy, not the check
 *
 * `EvidenceForm.js`' sentence, and for #47 it is the sentence that matters most:
 * what was delivered checked the bytes in neither place, and `accept` filters
 * the chooser's list and nothing else. The server reads the first bytes of the
 * file (`lib/userPhoto.js`) and refuses a PDF called `photo.png`. The line under
 * the input says what will be accepted so a refusal is not a surprise, and the
 * megabytes in it come from the server with the shell rather than from a
 * constant here — the picker and the validator must not be able to disagree.
 *
 * ## The preview is the chosen file, read locally
 *
 * An object URL over the `File` the chooser handed us, so the person sees what
 * they picked before anything is uploaded. It is not proof the server will take
 * it: the browser will happily draw a `.png` this application refuses, and that
 * is the right order — the preview answers *is this the right photo*, the
 * refusal answers *is this a photo*.
 *
 * ## The chooser is closed while the upload is out
 *
 * #249, which is #228's answer of 26 ตุลาคม 2569 reaching this box:
 * `components/users/UserForm.js` carries the reasons. Two things here are its
 * own, and both make this the cheapest member of that population of fifteen.
 *
 * The flag is **already** the form's own: `busy` below is this component's
 * state and not the shell's, raised in `submit` and put down in its `finally`,
 * so the line the owner's answer asks for is one `disabled` and no new state.
 * And nothing clears it on a re-seed because `close` does, which is the
 * paragraph above - every way out of this box goes through it, and it sets
 * `busy` false along with the choice and the input's own value.
 *
 * ## ยกเลิก holds nothing - #253, 31 ตุลาคม 2569
 *
 * The second half of the same answer, and here the flag it held was the
 * form's own rather than the page's - which changes nothing: the owner's
 * sentence is that *ยกเลิก holds nothing*, whosever flag it is.
 *
 * This box is where that mattered least and was measured anyway. The
 * backdrop - the `onClick={close}` on the `absolute inset-0` div below, cited
 * by its text because a line number ages the day anything above it grows
 * (#173) - is a way out that never held a flag, so a person could
 * already leave while an upload was out, and the button was the only thing
 * stopping them doing it with the keyboard. Asked of the screen rather than
 * of the component (#217): what they could still do is what priced the
 * owner's question, and it is why that question was about this box and not
 * about the population.
 *
 * **What happens when the answer lands on a box that has gone.** The owner
 * answered on 31 ตุลาคม 2569, option ก: nothing is said, as today. A
 * refusal reaches `setError` on a component the navbar has stopped drawing,
 * so it is drawn nowhere; a success still reaches `onSaved`, so the photo
 * changes in the navbar, which is the confirmation `47a` already says this
 * screen has instead of a sentence. `253a`'s third and fourth rows hold the
 * pair, and the third asserts the silence, because a criterion answered *no*
 * needs a row as much as one answered *yes* (#48).
 *
 * **The one frame that answer does not reach, written down rather than
 * fixed.** `RetiringPresence` keeps this component mounted for its exit
 * tween, about 190ms (measured 21 October 2569, the paragraph below), so a
 * refusal that lands inside that window is `setError` on a box that is still
 * in the document and fading. The person sees the sentence go out with the
 * box. That is not *nothing*, and it is not what the owner was asked about:
 * it is #257, with the measurement on it. `253a` reads past the tween and
 * says so, which is this seam's limit and not a settle point chosen for
 * comfort (#209).
 *
 * **Why no guard here, and the condition that would need one - #254,
 * 31 ตุลาคม 2569.** #254 is the same answer landing on the change-password box
 * in `Navbar.js`, and there it is a defect: the refusal stays in that navbar's
 * own `error` state, nothing unmounts the navbar, and the next open draws the
 * last open's sentence. The census of 30 ตุลาคม 2569 put this file in that
 * population and read it by hand as **immune by lifecycle and not by a
 * guard**: the box is a component, and the paragraph below measures that
 * `RetiringPresence` drops it when its exit tween ends - and at once in a tab
 * getting no frames - so a `setError` arriving after `close` writes to an
 * instance that is going or gone, and the next open is a fresh mount reading
 * `useState`'s initial values. #254's `pwdOpening` ref has no counterpart here
 * because there is nothing to compare: the state it would protect does not
 * outlive the box.
 *
 * That is a property of the container and not of this code, so it is dated
 * rather than left as a sentence about today (#54). **The condition that would
 * make it #254's defect**: the day this box stops being unmounted on the way
 * out - `Navbar.js` rendering it always instead of as
 * `{showPhotoDialog ? <ProfilePhotoDialog .../> : null}`, or
 * `RetiringPresence` holding the child past the tween - its `error` would
 * survive a cancel exactly as the navbar's does, and the fix would be #254's:
 * a ref saying *which opening sent this*, read in the `catch`'s
 * `setError(err.message)`. The reset in `close` is not that fix and does not
 * cover it, for the reason #254 gives - a clearing at the press cannot reach a
 * sentence that arrives after it.
 *
 * The first draft of that condition named a comparator - *as `ConfirmDialog`
 * and the change-password box are kept mounted behind an `open` prop* - and the
 * same day's review refuted it with one grep: **`Navbar.js` holds no `open={`
 * anywhere**, and it renders both boxes conditionally inside
 * `RetiringPresence`, this one at `{showPhotoDialog ? ... : null}` and the
 * change-password box at `{showChangePwd ? ... : null}`. It was borrowed whole
 * from the paragraph below - *which is why `ConfirmDialog` and that box carry
 * an `open` prop* - and a rule borrowed whole borrows its defect (#83, #168).
 * **That sentence is dated, not deleted (#54)**: it was written before #169's
 * measurement of 21 October 2569, which is also what replaced its premise that
 * closing does not unmount; whatever those two boxes carried when it was
 * written, today neither does, and what keeps the change-password refusal alive
 * is that its `error` lives in the navbar and not in the box - which is the
 * property this file does not share, and the whole of its immunity.
 */
/*
 * ## Closing is what clears this box, because closing it does not unmount it
 *
 * The navbar renders this inside an `AnimatePresence`, so the obvious reading is
 * that cancelling unmounts the component and the next open starts from
 * `useState`'s initial values. **The hand-walk measured otherwise**: after
 * `onClose`, the overlay fades to `opacity: 0` and the node stays in the
 * document — `document.querySelector('input[type=file]')` still answers three
 * seconds later — so the same instance, with the same `file` and the same
 * refusal on it, is what the next open shows. The change-password box in the
 * same navbar behaves identically (its fields survive a cancel too), which is
 * why `ConfirmDialog` and that box carry an `open` prop: not as decoration, but
 * because something has to put their state back.
 *
 * An `open` prop would not help here, because `Navbar.js` passes a literal — it
 * would never change, so an effect keyed on it would never run again. What does
 * work is to reset on the way out, which is the one moment this component knows
 * about: `close` below clears the choice, the refusal and the input's own value,
 * then calls `onClose`. Every way out goes through it.
 *
 * The presence bug itself is not this ticket's: it is shared with the
 * change-password dialog, where a typed current password is what survives.
 *
 * **Dated 21 October 2569 (#169, closed).** The mechanism in the paragraph above
 * was measured again, with a Chrome driven over raw CDP rather than through
 * Playwright, which suppresses the condition. In a tab that is getting frames the
 * box is removed when its exit tween ends, about 190ms after `onClose`, so nothing
 * answers three seconds later; in a tab that is getting none the tween never
 * started, so it did not fade to `opacity: 0` either - it stayed at `opacity: 1`,
 * focusable and whole in the accessibility tree, until the person came back. That
 * second half is what the hand-walk met, and `RetiringPresence` in `Navbar.js` now
 * drops the child at once in it. **The reset below stays**: it is what empties the
 * box in both halves, and it is the only one of the two that `e2e/tests/47a` can
 * read.
 */
export default function ProfilePhotoDialog({
  maxBytes,
  currentUrl,
  onClose,
  onSaved,
}) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // One object URL per chosen file, revoked when the choice changes or the
  // dialog goes away. Without the revoke every file a person tries stays in
  // memory for the life of the tab, which is `saveAsFile`'s reason in
  // `client.js` applied to a preview instead of to a download.
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  /*
   * The input's own value, which is not React state and is not reset by
   * anything above. Without this a reopened box lists the refused file beside a
   * chooser that has nothing selected in it as far as this component knows.
   */
  const inputRef = useRef(null)

  /** Every way out of this box: the button, the backdrop, and an ended session. */
  const close = () => {
    setFile(null)
    setError('')
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
    onClose()
  }

  const megabytes = maxBytes ? Math.floor(maxBytes / (1024 * 1024)) : null

  const submit = async event => {
    event.preventDefault()
    if (!file) return
    setError('')
    setBusy(true)
    try {
      await uploadProfilePhoto(file)
      await onSaved()
    } catch (err) {
      // The change-password form's rule, one component over: a 401 is the
      // session having ended while the dialog was open, and the shell draws
      // that. This box closes so that dialog is the only thing on the screen.
      if (err.expired) {
        close()
        return
      }
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const shown = preview ?? currentUrl

  return (
    <ContentMotionDIV
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed left-0 top-0 flex h-screen w-screen items-center justify-center bg-slate-900/50 p-4"
      style={{ zIndex: 99999 }}
    >
      <div onClick={close} className="absolute inset-0" />

      <ContentMotionDIV
        className="relative w-full max-w-[420px] rounded-xl bg-white p-8 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-6 text-center">
          <h3 className="text-xl font-bold text-secondary">รูปโปรไฟล์</h3>
          <p className="text-sm text-slate-500">
            เลือกรูปภาพที่จะใช้แสดงแทนตัวคุณในระบบ
          </p>
        </div>

        {/* Announced as well as drawn — #111, and for the change-password
            form's reason: this banner lives inside a modal, so it takes the
            role directly rather than being `Notice`, whose other job is to
            scroll the content pane. */}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="flex justify-center">
            {shown ? (
              <img
                src={shown}
                alt={preview ? 'ตัวอย่างรูปที่เลือก' : 'รูปโปรไฟล์ปัจจุบัน'}
                className="h-28 w-28 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <p className="text-sm text-slate-500">ยังไม่มีรูปโปรไฟล์</p>
            )}
          </div>

          <label className="block text-sm">
            <span className="text-slate-600">ไฟล์รูปภาพ</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              aria-label="ไฟล์รูปภาพ"
              disabled={busy}
              onChange={event => {
                setError('')
                setFile(event.target.files?.[0] ?? null)
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:text-gray-700"
            />
            <span className="mt-1 block text-xs text-slate-500">
              รับไฟล์ PNG หรือ JPEG
              {megabytes ? ` ขนาดไม่เกิน ${megabytes} MB` : ''}
            </span>
          </label>

          <div className="mt-8 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300 disabled:opacity-60"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={busy || !file}
              className="rounded-lg bg-secondary px-4 py-2 font-medium text-white shadow-md transition disabled:opacity-60"
            >
              บันทึกรูปโปรไฟล์
            </button>
          </div>
        </form>
      </ContentMotionDIV>
    </ContentMotionDIV>
  )
}

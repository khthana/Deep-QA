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
              disabled={busy}
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

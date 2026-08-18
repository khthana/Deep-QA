import ContentMotionDIV from './ContentMotionDIV'

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
          {message}
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

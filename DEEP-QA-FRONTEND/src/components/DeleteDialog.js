import { FaExclamationTriangle } from 'react-icons/fa'
import ContentMotionDIV from './ContentMotionDIV'

function DeleteDialog({ open, onClose, onConfirm, Name, moreText, massage }) {
  if (!open) return null

  return (
    <ContentMotionDIV className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="mb-32 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <FaExclamationTriangle className="text-2xl text-red-500" />
          <h2 className="text-xl font-semibold text-red-500">ยืนยันการลบ</h2>
        </div>

        <p className="mt-4 break-words text-gray-700">
          คุณแน่ใจหรือไม่ว่าต้องการลบ{' '}
          <span className="font-semibold">{Name}</span> {moreText}?
        </p>

        {massage && (
          <p className="mt-2 break-words text-sm text-gray-400">{massage}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-100"
          >
            ยกเลิก
          </button>

          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
          >
            ลบ
          </button>
        </div>
      </div>
    </ContentMotionDIV>
  )
}

export default DeleteDialog

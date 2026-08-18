import ContentMotionDIV from './ContentMotionDIV'

export default function SessionExpiredDialog({ open }) {
  if (!open) return null

  return (
    <ContentMotionDIV className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="mb-20 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <svg
            className="h-6 w-6 text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
            />
          </svg>

          <h2 className="text-lg font-semibold text-primary">
            Session หมดอายุ
          </h2>
        </div>

        <p className="text-md mt-4 break-words leading-relaxed text-gray-600">
          เซสชันของคุณหมดอายุแล้ว กรุณารีเฟรชหน้าเพื่อเข้าสู่ระบบใหม่อีกครั้ง
        </p>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            เข้าสู่ระบบใหม่
          </button>
        </div>
      </div>
    </ContentMotionDIV>
  )
}

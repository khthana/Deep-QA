import React from 'react'
import { HiOutlineHome, HiOutlineExclamationCircle } from 'react-icons/hi'
import ContentMotionDIV from '../components/ContentMotionDIV'

const NotFoundPage = () => {
  // ฟังก์ชันสำหรับการ Refresh หน้าจอ
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <ContentMotionDIV
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0F172A] p-6 text-center"
    >
      {/* Background Decorative Glow (เพิ่มความหรูหราแบบ Production) */}
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Visual 404 Section */}
        <div className="relative mb-4 flex items-center justify-center">
          <h1 className="select-none text-[10rem] font-black leading-none tracking-tighter text-slate-800/40 md:text-[14rem]">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-slate-700/50 bg-slate-900/50 p-4 backdrop-blur-sm">
              <HiOutlineExclamationCircle
                size={64}
                className="animate-pulse text-secondary"
              />
            </div>
          </div>
        </div>

        {/* Text Section */}
        <div className="max-w-xl">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            ไม่พบหน้าที่คุณต้องการ
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-slate-400">
            หน้านี้อาจถูกย้ายไปแล้ว หรือเซสชันการเชื่อมต่อของคุณหมดอายุ
            <br className="hidden md:block" />
            ลองรีเฟรชหน้าจอหรือกลับไปที่หน้าหลักอีกครั้ง
          </p>
        </div>

        {/* Action Buttons */}
        <ContentMotionDIV
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex w-full max-w-sm flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center"
        >
          {/* ปุ่มรีเฟรช (Primary Action) */}
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-8 py-4 text-lg font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(var(--secondary-rgb),0.3)] hover:brightness-110 active:scale-95"
          >
            <HiOutlineHome size={22} />
            กลับหน้าหลัก
          </button>
        </ContentMotionDIV>
      </div>

      {/* Info Footer */}
      <div className="absolute bottom-10 flex flex-col items-center gap-2 text-slate-500">
        <div className="mb-2 h-[1px] w-12 bg-slate-800" />
        <p className="text-xs font-medium uppercase tracking-[0.2em]">
          Error Log:{' '}
          <span className="font-mono italic text-slate-400">
            NS_04_NOT_FOUND
          </span>
        </p>
      </div>
    </ContentMotionDIV>
  )
}

export default NotFoundPage

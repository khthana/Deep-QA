import ContentMotionDIV from '../components/ContentMotionDIV'
import {
  HiOutlineUserCircle,
  HiArrowLeft,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi2'
import { FaSignOutAlt } from 'react-icons/fa'
import { useSearchParams } from 'react-router-dom'

export default function UserNotFound() {
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason')

  const isSuspended = reason === 'บัญชีนี้ถูกระงับการใช้งาน'

  return (
    <ContentMotionDIV className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0A0F1C]">
      {/* Background Decor (ถอดแบบมาจากหน้าหลักของคุณ) */}
      <div className="absolute h-[700px] w-[700px] rounded-full bg-blue-600/10 blur-[180px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0A0F1C] to-slate-950" />

      <div className="relative w-full max-w-lg px-6">
        <ContentMotionDIV className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl md:p-12">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/10 text-white">
                <HiOutlineUserCircle size={48} />
              </div>
            </div>
          </div>

          {/* Typography */}
          <h1 className="mb-2 text-3xl tracking-tight text-white">
            {isSuspended
              ? 'บัญชีของคุณถูกระงับการใช้งาน'
              : 'ไม่พบข้อมูลผู้ใช้งาน'}
          </h1>
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-blue-500">
            Digital Educational Excellence Portfolio.
          </p>

          <div className="mb-8 space-y-4 text-slate-400">
            <p className="text-lg">
              {isSuspended
                ? 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้'
                : 'ขออภัย ระบบไม่สามารถดึงข้อมูลของคุณได้'}
            </p>
            <p className="text-sm leading-relaxed">
              {isSuspended ? (
                <>
                  บัญชีของคุณถูกระงับการใช้งานโดยผู้ดูแลระบบ
                  <br />
                  หากมีข้อสงสัย โปรดติดต่อผู้ดูแลระบบ
                </>
              ) : (
                <>
                  อาจเกิดจากไม่พบข้อมูลผู้ใช้งานของคุณบนฐานข้อมูล
                  <br />
                  กรุณาลองเข้าสู่ระบบใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ
                </>
              )}
            </p>
          </div>

          {/* Action Buttons - ปรับให้ใช้สไตล์เดียวกับเมนูหลัก */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => (window.location.href = '/')}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4  text-secondary transition-all hover:scale-[1.02] hover:bg-blue-50 hover:text-secondary_hover active:scale-95"
            >
              <HiArrowLeft
                size={20}
                className="transition-transform group-hover:-translate-x-1"
              />
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </ContentMotionDIV>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-600">
            © 2026 DEEP-QA | Authorization Error
          </p>
        </footer>
      </div>
    </ContentMotionDIV>
  )
}

import { useMemo } from 'react'
import { BiBookContent } from 'react-icons/bi'
import { HiOutlineAcademicCap, HiOutlineArrowRight } from 'react-icons/hi'
import { FaSignOutAlt } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import ContentMotionDIV from '../components/ContentMotionDIV'
import LoadingScreen from '../components/LoadingScreen'
import { PORTFOLIO_URL } from '../lib/links'

/**
 * The two-application chooser, shown once after signing in.
 *
 * The inherited page fetched the caller's roles by POSTing their email
 * together with a hardcoded `role_id: 'FULL_ADMIN'` and
 * `scope_id: 'FULL_ADMIN'` - the client naming its own privileges, which
 * ADR-0002 forbids - and used the answer only to spot a STUDENT and send them
 * to the portfolio. There is no STUDENT role in this system: students are
 * records, not accounts. Both the request and the branch are gone, and what is
 * left is the chooser.
 */
export default function SelectApp() {
  const { profile, logout, loading } = useAuth()
  const navigate = useNavigate()

  const username = useMemo(
    () =>
      profile
        ? `${profile.first_name_th || ''} ${profile.last_name_th || ''}`
        : '',
    [profile]
  )

  return (
    <ContentMotionDIV>
      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          <ContentMotionDIV className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0A0F1C]">
            <div className="absolute h-[700px] w-[700px] rounded-full bg-blue-600/10 blur-[180px]" />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0A0F1C] to-slate-950" />

            <div className="relative w-full max-w-5xl px-6">
              <ContentMotionDIV className="mb-16 text-center">
                <h1 className="text-5xl font-semibold tracking-tight text-white">
                  ยินดีต้อนรับ
                </h1>

                {username && (
                  <div className="mt-2 text-lg uppercase text-white">
                    {profile?.title_th || ''}
                    {username}
                  </div>
                )}

                <p className="mx-auto mt-4 max-w-xl text-slate-400">
                  เลือกระบบที่ต้องการเพื่อเริ่มต้นการทำงาน
                </p>
              </ContentMotionDIV>

              <ContentMotionDIV className="grid grid-cols-1 gap-10 md:grid-cols-2">
                <button
                  onClick={() => navigate('/main')}
                  className="group relative flex flex-col items-start rounded-3xl border border-white/20 bg-white p-10 shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-white/10 focus:outline-none"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-secondary transition-all group-hover:bg-secondary group-hover:text-white">
                    <BiBookContent size={38} />
                  </div>

                  <h3 className="mb-3 text-3xl font-bold tracking-tight text-secondary">
                    Deep-QA
                  </h3>

                  <p className="mb-8 text-left text-lg text-slate-600">
                    ระบบบริหารจัดการหลักสูตร (Curriculum Management)
                  </p>

                  <div className="mt-auto flex items-center font-bold text-secondary">
                    เข้าใช้งานระบบหลักสูตร
                    <HiOutlineArrowRight className="ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </button>

                <button
                  onClick={() => (window.location.href = PORTFOLIO_URL)}
                  className="group relative flex flex-col items-start rounded-3xl border border-white/20 bg-white p-10 shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-white/10 focus:outline-none"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-orange-400 transition-all group-hover:bg-orange-400 group-hover:text-white">
                    <HiOutlineAcademicCap size={38} />
                  </div>

                  <h3 className="mb-3 text-3xl font-bold tracking-tight text-orange-400">
                    Deep-Portfolio
                  </h3>

                  <p className="mb-8 text-left text-lg text-slate-600">
                    ระบบจัดการงานและกิจกรรมนักเรียนและอาจารย์
                  </p>

                  <div className="mt-auto flex items-center font-bold text-orange-400">
                    เข้าใช้งานระบบพอร์ตโฟลิโอ
                    <HiOutlineArrowRight className="ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </button>
              </ContentMotionDIV>

              <div className="mt-8 flex w-full items-center justify-center border-slate-50">
                <button
                  onClick={logout}
                  className="flex w-48 items-center justify-center rounded-xl bg-gray-100/20 px-3 py-3 text-white transition-all hover:bg-blue-50 hover:text-primary"
                >
                  <FaSignOutAlt className="shrink-0" />
                  <ContentMotionDIV className="ml-3 text-sm font-medium">
                    ออกจากระบบ
                  </ContentMotionDIV>
                </button>
              </div>

              <footer className="mt-8 cursor-pointer text-center">
                <div className="mx-auto mb-6 h-px w-20 bg-white/5" />
                <p
                  onClick={() => navigate('/')}
                  className="text-xs uppercase tracking-[0.25em] text-slate-600"
                >
                  © 2026 Digital Educational Excellence Portfolio.
                </p>
              </footer>
            </div>
          </ContentMotionDIV>
        </>
      )}
    </ContentMotionDIV>
  )
}

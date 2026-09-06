import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import { useAuth } from '../context/AuthContext'
import { post } from '../api/client'
import LoginGoogle from '../components/LoginGoogle'
import LoginForm from '../components/LoginForm'
import ContentMotionDIV from '../components/ContentMotionDIV'

/**
 * What the Google path refuses with.
 *
 * A refusal from Google comes back as a redirect, and a redirect carries no
 * body — only `?error=<reason>`, the key from the server's own refusals table.
 * The words are repeated here because there is nowhere else for them to travel
 * in; the keys are the contract, and backend/auth/refusals.js is where they are
 * decided. A reason this list does not know still says something rather than
 * nothing.
 *
 * The seven keys are `GOOGLE_REFUSAL_REASONS` in backend/auth/accounts.js, and
 * that list is checked against the rules that produce it rather than kept by
 * hand. This end shipped one short: `outsideValidity` was missing, so the
 * account the window exists for — an external assessor whose review round has
 * ended, the only person who meets it — was the one told *เข้าสู่ระบบด้วย
 * Google ไม่สำเร็จ* instead of what was actually wrong. The fallback is for a
 * reason nobody has written yet, not for a hole in this table. #50.
 */
const GOOGLE_REFUSALS = {
  domain: 'กรุณาใช้เมล @kmitl.ac.th ในการเข้าใช้งาน',
  unknown: 'ไม่พบข้อมูลผู้ใช้งานในระบบ กรุณาติดต่อเจ้าหน้าที่เพื่อลงทะเบียน',
  noRole:
    'บัญชีนี้ยังไม่ได้รับสิทธิ์การใช้งาน กรุณาติดต่อเจ้าหน้าที่เพื่อกำหนดบทบาท',
  inactive: 'บัญชีนี้ถูกระงับการใช้งาน',
  unverified: 'บัญชีนี้ยังไม่ได้ผ่านการยืนยันตัวตน',
  outsideValidity: 'บัญชีนี้อยู่นอกช่วงเวลาที่กำหนดให้ใช้งาน',
  googleUnavailable:
    'ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google บนเซิร์ฟเวอร์นี้',
}

/**
 * The id the refusal banner carries, so the two fields can point at it - #85.
 *
 * `role="alert"` gets the sentence *announced* when it appears. It does not
 * get it *attached* to anything: a person who tabs back into the password
 * field a moment later hears the field's name and nothing about why the last
 * attempt was refused. #85 asked for the refusal to be tied to the form, and
 * `aria-describedby` is what ties it - the sentence becomes the description of
 * the fields it is about, readable on demand rather than only once.
 *
 * It is passed down and applied only while there is a refusal on screen. An
 * `aria-describedby` pointing at an id that is not in the document describes
 * nothing, and is worse than no attribute because it reads as though somebody
 * had thought about it.
 */
const REFUSAL_ID = 'sign-in-refusal'

export default function Login() {
  const { reload, setLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [LoadLogin, setLoadLogin] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleGoogleLogin = e => {
    e.preventDefault()
    setLoading(true)
    setLoadLogin(true)
    // A full navigation rather than a fetch: the OAuth round trip belongs to
    // the browser, and it comes back to this application with the cookie set.
    window.location.href = `${
      process.env.REACT_APP_API_URL ?? 'http://localhost:3000'
    }/api/auth/google-login`
  }

  // The Google path refuses by redirecting back here with a reason. Without
  // this the browser lands on a sign-in page that looks as though nothing
  // happened, which is the same unexplained failure #10's sixth criterion is
  // about — in a different corner of the application.
  useEffect(() => {
    const reason = searchParams.get('error')
    if (!reason) return
    setErrorMessage(
      GOOGLE_REFUSALS[reason] ?? 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ'
    )
  }, [searchParams])

  /**
   * Typing is what clears a refusal - #85.
   *
   * It used to be a three-second `setTimeout`, which is short enough that the
   * sentence could not be photographed: a screenshot through CDP takes two to
   * three seconds, and the walk that found this had to install a
   * `MutationObserver` to catch the words at all. A person looking at the
   * keyboard while they type is in the same position, and what they see when
   * they look up is a form that appears to have done nothing - so they press
   * the button again, none the wiser about which of the two things was wrong.
   *
   * WCAG 2.2 §2.2.1 is about exactly this: a time limit the reader did not set
   * and cannot extend. The replacement has no clock in it. The sentence is
   * true until the person changes one of the fields it is about, and changing
   * a field is the act that makes it out of date.
   */
  const clearRefusalAndSet = setter => value => {
    setter(value)
    setErrorMessage('')
  }

  /**
   * Nothing is written to localStorage on the way in. The inherited page set
   * an `isLoggedIn` flag there and the context believed it; the cookie is what
   * proves a sign-in, and `GET /api/me` is what reads it. The refusal shown is
   * the server's own words rather than a sentence invented here, so a
   * suspended account is told it is suspended instead of being told its
   * password was wrong.
   *
   * And it navigates nowhere — #66. It used to end on
   * `navigate('/select-app')`, which put a third opinion about where a
   * signed-in caller belongs in a file that has no business holding one: the
   * moment `reload()` sets the profile, `GuestRoute` redirects this route, and
   * the recorded sequence was `/` → `/select-app` → `/main` → the first menu
   * entry. The chooser drew and was taken away again. Where a signed-in caller
   * goes is `GuestRoute`'s to say and `SidebarItem`'s to finish; this function
   * signs in and stops.
   */
  const handleSubmit = async e => {
    e.preventDefault()

    if (username === '' || password === '') {
      setErrorMessage('กรุณากรอกอีเมล และ รหัสผ่าน')
      return
    }

    setLoadLogin(true)
    try {
      await post('/api/auth/login', { email: username, password })
      await reload()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setLoadLogin(false)
    }
  }

  return (
    <ContentMotionDIV className="flex min-h-screen w-full bg-[#FAFAFB] font-sans text-slate-900 antialiased">
      {/* --- Left Section: Branding & Identity --- */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-[#0F172A] p-16 text-white lg:flex">
        {/* Subtle Background Glow */}
        <div className="absolute right-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[100px]" />

        {/* Top Logo Area */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 font-bold text-white shadow-lg shadow-orange-500/20">
            K
          </div>
          <span className="text-xl font-bold tracking-tight">DEEP-QA</span>
        </div>

        {/* Middle Content */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-semibold leading-[1.1] tracking-tight">
              Digital <br />
              <span className="text-orange-400">
                Educational Excellence
              </span>{' '}
              <br />
              Portfolio.
            </h1>
          </div>
          <p className="max-w-md text-lg leading-relaxed text-slate-400">
            ระบบบริหารจัดการผลการเรียนรู้และพอร์ตโฟลิโอดิจิทัล
            เพื่อการประกันคุณภาพการศึกษาวิศวกรรม
          </p>

          {/* System Badges */}
          <div className="flex gap-4 pt-4">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium text-slate-300">
              Quality Assurance
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 space-y-1">
          <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
            K-Engineering
          </p>
          <p className="text-xs italic text-slate-600">
            Faculty of Engineering, 2026
          </p>
        </div>
      </div>

      {/* --- Right Section: Login Interface --- */}
      <div className="flex w-full items-center justify-center p-8 sm:p-12 lg:w-[58%] lg:p-20">
        <div className="w-full max-w-[400px] space-y-10">
          {/* Welcome Header */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              ลงชื่อเข้าใช้งาน
            </h2>
            <p className="leading-relaxed text-slate-500">
              ยินดีต้อนรับเข้าสู่ระบบ DEEP-QA
              กรุณาเข้าสู่ระบบด้วยบัญชีของคุณเพื่อดำเนินการต่อ
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!LoadLogin ? (
              <ContentMotionDIV className="space-y-8 " key="content">
                <div className="transition-all duration-300 hover:translate-y-[-1px]">
                  {/* สมมติว่า LoginGoogle มีสไตล์ปุ่มที่สะอาดตาอยู่แล้ว */}
                  <LoginGoogle handleSubmit={handleGoogleLogin} />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase  text-slate-400">
                    <span className="bg-[#FAFAFB] px-4">
                      หรือใช้ Email ของคุณ
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {errorMessage && (
                    <ContentMotionDIV
                      role="alert"
                      id={REFUSAL_ID}
                      className="animate-in fade-in slide-in-from-top-2 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-600"
                    >
                      <svg
                        className="h-5 w-5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <span className="font-medium">{errorMessage}</span>
                    </ContentMotionDIV>
                  )}
                </AnimatePresence>

                <div className="group">
                  <LoginForm
                    handleSubmit={handleSubmit}
                    onUsernameChange={clearRefusalAndSet(setUsername)}
                    onPasswordChange={clearRefusalAndSet(setPassword)}
                    refusalId={errorMessage ? REFUSAL_ID : undefined}
                  />
                </div>
              </ContentMotionDIV>
            ) : (
              <ContentMotionDIV
                key="loading"
                className="flex h-64 flex-col items-center justify-center space-y-6"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-16 w-16 animate-ping rounded-full bg-blue-100 opacity-75" />
                  <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-100 border-t-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-primary">
                    กำลังเข้าสู่ระบบ...
                  </p>
                  <p className="text-sm text-slate-400">
                    กรุณารอสักครู่ ระบบกำลังจัดเตรียมข้อมูลของคุณ
                  </p>
                </div>
              </ContentMotionDIV>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ContentMotionDIV>
  )
}

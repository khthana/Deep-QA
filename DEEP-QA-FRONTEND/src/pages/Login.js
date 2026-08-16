import { useState, useEffect } from 'react'
import { redirect, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import LoginGoogle from '../components/LoginGoogle'
import LoginForm from '../components/LoginForm'
import { Navigate } from 'react-router-dom'
import ContentMotionDIV from '../components/ContentMotionDIV'

export default function Login() {
  const {
    token,
    profile,
    setToken,
    setProfile,
    setLoading,
    loading,
  } = useAuth()
  const navigate = useNavigate()
  const [LoadLogin, setLoadLogin] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleGoogleLogin = async (e) => {
    e.preventDefault()
    localStorage.setItem('isLoggedIn', 'true')
    setLoading(true)
    setLoadLogin(true)
    try {
      const googleLoginUrl = `${process.env.REACT_APP_API_GOOGLE}/api/auth/google-login`
      window.location.href = googleLoginUrl
    } catch (error) {
      console.error('Error during Google login:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoadLogin(true)

    if (username === '' || password === '') {
      setLoading(false)
      setErrorMessage('กรุณากรอกอีเมล และ รหัสผ่าน')
      return
    }

    const start = Date.now()

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: username,
            password: password,
          }),
        },
      )

      const data = await response.json()

      const elapsed = Date.now() - start
      if (elapsed < 1000) {
        await new Promise((r) => setTimeout(r, 1000 - elapsed))
      }

      if (response.ok) {
        localStorage.setItem('isLoggedIn', 'true')
        setLoadLogin(false)
        setLoading(true)
        window.location.replace('/select-app')
        // console.log('Login success:', data)
      } else {
        setLoading(false)
        setLoadLogin(false)
        setErrorMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        // console.error('Login failed:', data)
      }
    } catch (error) {
      setLoading(false)
      // console.error('Fetch error:', error)
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
                    <ContentMotionDIV className="animate-in fade-in slide-in-from-top-2 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-600">
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
                    setUsername={setUsername}
                    setPassword={setPassword}
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

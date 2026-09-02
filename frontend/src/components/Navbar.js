import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import RoleDropdown from './RoleDropdown'
import { FaSignOutAlt, FaUser } from 'react-icons/fa'
import { RiLockPasswordFill } from 'react-icons/ri'
import ContentMotionDIV from './ContentMotionDIV'
import { AnimatePresence } from 'framer-motion'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { HiArrowsRightLeft } from 'react-icons/hi2'

function Navber({ setAlert }) {
  const { profile, logout, changePassword, sessionExpired } = useAuth()
  const [username, setUsername] = useState('')
  const [isOpen, setIsOpen] = useState(false) // State สำหรับเปิด/ปิดเมนู
  const dropdownRef = useRef(null) // สำหรับใช้เช็คการคลิกข้างนอกเพื่อปิดเมนู
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [error, setError] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwdData, setPwdData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => {
    if (profile) {
      setUsername(
        `${profile.first_name_th || ''} ${profile.last_name_th || ''}`
      )
    }

    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profile])

  /**
   * The server is the one that checks the current password and the length of
   * the new one; the checks below are the browser being helpful, not the rule.
   *
   * The refusals are told apart rather than lumped together. A 403 here is a
   * wrong current password and the modal stays open with it said; a 401 is the
   * session having ended while the modal was open, which is the sixth
   * criterion and belongs to the shell's expiry dialog rather than to this
   * form. The inherited version read 401 as "wrong password" and any 403 as an
   * expiry, which got both of them backwards.
   *
   * On success the session is left alone. The inherited modal waited two
   * seconds and signed the user out; the account is the same account
   * afterwards and there is nothing to sign out of.
   */
  const handlePasswordSubmit = async e => {
    e.preventDefault()
    setError('')

    if (pwdData.new_password !== pwdData.confirm_password) {
      setError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน')
      return
    }

    try {
      await changePassword(pwdData.old_password, pwdData.new_password)
      setAlert({
        open: true,
        message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
        severity: 'success',
      })
      setShowChangePwd(false)
      setPwdData({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      if (err.expired) {
        setShowChangePwd(false)
        sessionExpired()
        return
      }
      setError(err.message)
    }
  }

  return (
    /* Named for the same reason the side menu is — see SidebarItem.js. */
    <nav
      aria-label="แถบด้านบน"
      className="h-[64px]  bg-primary px-6 shadow-sm backdrop-blur-md"
    >
      <div className="mx-auto flex h-full  items-center justify-between">
        {/* --- ฝั่งซ้าย: Logo --- */}
        <div className="flex w-1/3 justify-start">
          <a
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="relative">
              <img
                src="/Asset2.png"
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
          </a>
        </div>

        <div className="flex  justify-center">
          <RoleDropdown setAlert={setAlert} />
        </div>

        {/* --- ฝั่งขวา: User Profile --- */}
        <div className="flex w-1/3 items-center justify-end gap-4">
          <div className="hidden flex-col text-right sm:flex">
            <span className=" text-white">
              {profile?.title_th || ''}
              {username}
            </span>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-center rounded-full transition-all hover:ring-2 hover:ring-white/50 active:scale-95"
            >
              {/* The photo itself arrives with #47, which is where profile
                  images are stored and served; until then everyone gets the
                  placeholder the inherited navbar already fell back to. */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-slate-700">
                <FaUser className="text-lg text-white" />
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <ContentMotionDIV className="animate-in fade-in zoom-in absolute right-0 z-[100] mt-2 w-64 origin-top-right rounded-xl bg-white py-1 shadow-xl ring-1 ring-black ring-opacity-5 duration-150 focus:outline-none">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-xs text-gray-500">ลงชื่อเข้าใช้โดย</p>
                    <p className="truncate  text-sm text-secondary">
                      {profile?.title_th || ''}
                      {username}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        window.location.href =
                          'https://portfolio.deep-core.net/teacher'
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-secondary"
                    >
                      <HiArrowsRightLeft
                        className=""
                        size={18} // ปรับขนาดตามความเหมาะสม (ปกติ 18-20 จะกำลังดี)
                      />
                      ไปที่ Deep Portfolio
                    </button>
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        setShowChangePwd(true)
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50  hover:text-secondary"
                    >
                      <RiLockPasswordFill className="" size={18} />
                      <span className="font-medium">เปลี่ยนรหัสผ่าน</span>
                    </button>

                    <button
                      onClick={logout} // เรียกใช้ฟังก์ชัน logout จาก AuthContext
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <FaSignOutAlt />
                      ออกจากระบบ
                    </button>
                  </div>
                </ContentMotionDIV>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showChangePwd && (
                <ContentMotionDIV
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed left-0 top-0 flex h-screen w-screen items-center justify-center bg-slate-900/50 p-4"
                  style={{ zIndex: 99999 }}
                >
                  <div
                    onClick={() => {
                      setShowChangePwd(false)
                      setError('')
                    }}
                    className="absolute inset-0"
                  />

                  <ContentMotionDIV
                    className="relative w-full max-w-[500px] rounded-xl bg-white p-8 shadow-2xl"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="mb-6 text-center">
                      <h3 className="text-xl font-bold text-secondary">
                        เปลี่ยนรหัสผ่าน
                      </h3>
                      <p className="text-sm text-slate-500">
                        กรุณาระบุรหัสผ่านเดิมและตั้งรหัสผ่านใหม่
                      </p>
                    </div>

                    {error && (
                      <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                      </p>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm uppercase tracking-wider text-gray-500">
                          รหัสผ่านเดิม
                        </label>
                        <div className="relative">
                          <input
                            type={showOld ? 'text' : 'password'}
                            required
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={pwdData.old_password}
                            onChange={e =>
                              setPwdData({
                                ...pwdData,
                                old_password: e.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowOld(!showOld)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          >
                            {showOld ? (
                              <FiEyeOff size={18} />
                            ) : (
                              <FiEye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <label className="text-sm  uppercase tracking-wider text-gray-500">
                          รหัสผ่านใหม่
                        </label>
                        <div className="relative">
                          <input
                            type={showNew ? 'text' : 'password'}
                            required
                            className={`mt-1 w-full rounded-xl border px-4 py-3 pr-10 text-sm transition focus:outline-none focus:ring-2 ${
                              error &&
                              pwdData.new_password !== pwdData.confirm_password
                                ? 'border-red-300 bg-red-50 focus:ring-red-500'
                                : 'border-slate-200 bg-slate-50 focus:ring-blue-500'
                            }`}
                            value={pwdData.new_password}
                            onChange={e =>
                              setPwdData({
                                ...pwdData,
                                new_password: e.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          >
                            {showNew ? (
                              <FiEyeOff size={18} />
                            ) : (
                              <FiEye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm  uppercase tracking-wider text-gray-500">
                          ยืนยันรหัสผ่านใหม่
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            required
                            className={`mt-1 w-full rounded-xl border px-4 py-3 pr-10 text-sm transition focus:outline-none focus:ring-2 ${
                              error &&
                              pwdData.new_password !== pwdData.confirm_password
                                ? 'border-red-300 bg-red-50 focus:ring-red-500'
                                : 'border-slate-200 bg-slate-50 focus:ring-blue-500'
                            }`}
                            value={pwdData.confirm_password}
                            onChange={e =>
                              setPwdData({
                                ...pwdData,
                                confirm_password: e.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          >
                            {showConfirm ? (
                              <FiEyeOff size={18} />
                            ) : (
                              <FiEye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-8 flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowChangePwd(false)
                            setError('')
                          }}
                          className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 transition hover:bg-gray-300"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-secondary px-4 py-2 font-medium text-white shadow-md transition hover:bg-secondary"
                        >
                          บันทึกรหัสใหม่
                        </button>
                      </div>
                    </form>
                  </ContentMotionDIV>
                </ContentMotionDIV>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navber

import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import RoleDropdown from './RoleDropdown'
import { FaCamera, FaSignOutAlt, FaUser } from 'react-icons/fa'
import { RiLockPasswordFill } from 'react-icons/ri'
import ProfilePhotoDialog from './ProfilePhotoDialog'
import { getProfilePhoto } from '../api/profile'
import ContentMotionDIV from './ContentMotionDIV'
import { AnimatePresence } from 'framer-motion'
import { FiEye, FiEyeOff } from 'react-icons/fi'

function Navber({ setAlert, onStayedPut }) {
  const { profile, photo, logout, changePassword, reload } = useAuth()
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
  const [showPhotoDialog, setShowPhotoDialog] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  // Bumped when a photo is replaced, which is the one change `has_photo` cannot
  // see: it was true before the upload and it is true after it.
  const [photoVersion, setPhotoVersion] = useState(0)
  const photoUrlRef = useRef(null)

  /**
   * The object URL currently being drawn, and the previous one released.
   *
   * Revoking is not optional housekeeping: every photo fetched stays in memory
   * for the life of the tab otherwise, and a person who tries four pictures has
   * four of them held. It is done here rather than in the effect's cleanup so
   * that a replacement never leaves the `<img>` pointed at a URL that has
   * already been revoked — which draws a broken image until the new bytes
   * arrive.
   */
  const showPhoto = useCallback(url => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    photoUrlRef.current = url
    setPhotoUrl(url)
  }, [])

  useEffect(
    () => () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    },
    []
  )

  /**
   * The avatar's bytes — #47.
   *
   * Fetched rather than linked to, for the reason `api/profile.js` gives at
   * length: `/api/me/photo` answers the account in the cookie, and an `<img
   * src>` at the API origin is a request this application's client does not
   * make. `has_photo` is asked first so that an account without one costs no
   * request at all rather than a 404 on every page load.
   *
   * A fetch that fails leaves the placeholder. A 410 — the row whose file is
   * gone — is the one case where something *is* wrong, and the navbar is still
   * the wrong place to say so: it is on every screen, it would say it on every
   * screen, and the person fixes it by uploading another photo.
   */
  useEffect(() => {
    if (!profile?.has_photo) {
      showPhoto(null)
      return undefined
    }
    let live = true
    getProfilePhoto()
      .then(blob => {
        if (live) showPhoto(URL.createObjectURL(blob))
      })
      .catch(() => {
        if (live) showPhoto(null)
      })
    return () => {
      live = false
    }
  }, [profile?.has_photo, photoVersion, showPhoto])

  /**
   * A photo that has just been saved, on the screen.
   *
   * Two things can make the photo appear and only one of them applies at a time.
   * A **first** upload changes what the shell knows — `has_photo` goes from
   * false to true — so `reload` is the honest move, and the fetch follows from
   * the new answer. A **replacement** changes nothing the shell holds, so there
   * is nothing to reload and the counter is what says *ask again*.
   *
   * They are exclusive rather than both, and that is the correction: `reload`
   * puts `loading` up, `AppRoutes` answers a loading shell with `LoadingScreen`,
   * and the whole tree under it — this navbar included — unmounts and comes
   * back. Calling it on a replacement as well would take the counter down with
   * the component that holds it, leaving a piece of state that cannot be
   * observed to do anything, and would throw away the fetched photo of a person
   * who only changed their picture.
   *
   * No snackbar either, and that is a measurement rather than a preference. The
   * same unmount takes `Mainpage`, which holds the snackbar's state, so a
   * success message raised across the first upload is erased by it — `47a`
   * measured that before this comment was written. What says the save worked is
   * the photo itself arriving in the navbar, which is what the person was
   * looking at when they pressed the button.
   */
  const photoSaved = async () => {
    setShowPhotoDialog(false)
    if (profile?.has_photo) setPhotoVersion(version => version + 1)
    else await reload()
  }

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
   * Every way out of the change-password box — #167.
   *
   * The box is not a component: it is written below, and what is typed into it
   * lives in this navbar's `pwdData`. So nothing about closing it clears it, and
   * the navbar is not unmounted by anything a person does here: the next open is
   * drawn from the state the last one left, which is somebody's current password
   * on the screen behind an eye they can press.
   *
   * Clearing on the way out rather than on the way in, for `ProfilePhotoDialog`'s
   * reason: `showChangePwd` is what the box is drawn from, so an effect keyed on
   * it opening would run after the fields had already been drawn from the old
   * values (#164's shape — a box painted holding what was thrown away). The exit
   * is the moment that has nothing after it.
   *
   * The eyes are put back too. A box reopened with a field revealed reveals an
   * empty field, so this is not the defect; it is the same sentence — what the
   * last use of the box chose is not the next one's.
   */
  const closeChangePassword = () => {
    setShowChangePwd(false)
    setError('')
    setPwdData({ old_password: '', new_password: '', confirm_password: '' })
    setShowOld(false)
    setShowNew(false)
    setShowConfirm(false)
  }

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
      closeChangePassword()
    } catch (err) {
      // Close the box, and nothing else - #97. This used to call
      // `sessionExpired()` here as well, which was a second component with an
      // opinion about what a 401 means, and the same shape #97 removed from
      // `AuthContext.load()`. It is not needed: `client.js` announces every
      // 401 and the context decides, and this screen is only reachable by
      // somebody signed in, so the decision is always the same one.
      //
      // What is still needed is the close. A dialog drawn over an open modal
      // is not the same thing as a dialog, and the expiry box has to be the
      // only thing on the screen for its one button to be findable.
      if (err.expired) {
        closeChangePassword()
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
          <RoleDropdown setAlert={setAlert} onStayedPut={onStayedPut} />
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
              {/* The photo when there is one, and otherwise the placeholder
                  the inherited navbar already fell back to — #47. The
                  delivered navbar drew Google's `profile_picture` here, which
                  is an address at another company and blank for everybody who
                  signs in with a password. */}
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="รูปโปรไฟล์"
                  className="h-10 w-10 rounded-full border-2 border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-slate-700">
                  <FaUser className="text-lg text-white" />
                </div>
              )}
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

                  {/* The *ไปที่ Deep Portfolio* entry stood here and is gone —
                      #66. One application now, so there is nowhere else to be
                      sent. It is also what made the chooser's second door
                      redundant while both existed: this menu offered the same
                      destination on every screen, permanently, where the
                      chooser offered it once at sign-in. */}
                  <div className="py-1">
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
                      onClick={() => {
                        setIsOpen(false)
                        setShowPhotoDialog(true)
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50  hover:text-secondary"
                    >
                      <FaCamera size={18} />
                      <span className="font-medium">เปลี่ยนรูปโปรไฟล์</span>
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
              {showPhotoDialog && (
                <ProfilePhotoDialog
                  maxBytes={photo?.max_bytes ?? null}
                  currentUrl={photoUrl}
                  onClose={() => setShowPhotoDialog(false)}
                  onSaved={photoSaved}
                />
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
                    onClick={closeChangePassword}
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

                    {/*
                      Announced as well as drawn - #111. This banner is not
                      `Notice`: it lives inside a modal, it is styled to it,
                      and `Notice`'s one job besides being on the page is to
                      scroll the content pane into view (#55), which is the
                      wrong act inside a dialog that does not scroll. So it
                      keeps its own markup and takes the role directly.
                    */}
                    {error && (
                      <p
                        role="alert"
                        className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
                      >
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
                          onClick={closeChangePassword}
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

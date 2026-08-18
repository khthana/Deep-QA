import React, { useEffect, useState } from 'react'

import { FULL_ADMIN } from './SidebarItem/FullAddmin'
import { FACULTY_ADMIN } from './SidebarItem/FacultyAdmin'
import { DEPT_ADMIN } from './SidebarItem/DeprtAdmin'
import { PROG_MANAGER } from './SidebarItem/ProgManager'
import { TEACHER } from './SidebarItem/Teacher'
import { EXT_ASSESSOR } from './SidebarItem/ExtAssessor'

import { FaChevronDown, FaChevronLeft, FaSignOutAlt } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * The menu each role sees — #10's second criterion.
 *
 * Keyed on the role *code* rather than on its Thai display name, which is what
 * the inherited chain compared against. A menu that turns on a translated
 * string breaks when the translation is edited, and it already had: the
 * external assessor had no name in the map at all, so it fell through to the
 * guest menu.
 *
 * Every set below is the one the delivered system shows, carried over
 * unchanged. That the Central Admin's is one entry long is deliberate and
 * matches both the thesis and CONTEXT.md: they manage accounts and nothing
 * else. Hiding an entry is not what stops another role reaching it - the route
 * refuses them as well - and #10's tests say so at the API.
 */
const MENUS = {
  FULL_ADMIN,
  FACULTY_ADMIN,
  DEPT_ADMIN,
  PROG_MANAGER,
  TEACHER,
  EXT_ASSESSOR,
}

/**
 * The subject the teacher has opened, or null.
 *
 * Read through a guard rather than JSON.parse directly: two of the three call
 * sites below run during render, and the key is a plain string on the same
 * origin that anything - a previous version of this application, a developer's
 * console - may have left in a shape this cannot parse. A throw there blanks
 * the whole shell rather than one menu entry. #24 is where the teacher's
 * screens write it, and this is the shape they have to write.
 */
const savedSubject = () => {
  try {
    return JSON.parse(localStorage.getItem('selectedCourse'))
  } catch {
    return null
  }
}

/** The first thing the menu points at, which '/main' redirects to. */
const firstEntry = menu => (menu[0]?.sub ? menu[0].sub[0] : menu[0])

function SidebarItem({
  role,
  handleClick,
  handleToggleSubmenu,
  setOpenMenu,
  openMenu,
  isCollapsed,
  setIsCollapsed,
}) {
  const [menuForRole, setMenuForRole] = useState([])
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    const menu = MENUS[role] ?? []
    const savedCourse = savedSubject()
    let menuData = menu

    // The teacher's second group is about one subject, so it appears only
    // once a subject has been opened.
    if (role === 'TEACHER') {
      const opened =
        savedCourse && location.pathname !== '/teacher/teacherDashboard'
      menuData = opened ? menu : menu.slice(0, 1)
      setOpenMenu(opened ? [menu[1].key] : [])
    } else {
      setOpenMenu(menu.filter(item => item.sub).map(item => item.key))
    }

    setMenuForRole(menuData)

    const first = firstEntry(menuData)
    if (!first) return
    handleClick(first.key)
    if (location.pathname === '/main') navigate(first.path, { replace: true })
  }, [role, navigate, location.pathname, handleClick, setOpenMenu])

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? '80px' : '320px' }}
      className="scrol relative flex h-full flex-col justify-between border-r border-slate-100 bg-white py-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-200 ease-in-out"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-1/2 z-50 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-400 shadow-md ring-1 ring-slate-200 transition-all hover:-translate-y-[calc(50%+1px)] hover:text-primary hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FaChevronLeft size={12} />
        </motion.div>
      </button>

      <div className="flex h-full flex-col overflow-hidden">
        <ul className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3">
          {menuForRole.map((item, index) => {
            const savedCourse = savedSubject()
            const isActive =
              (role === 'TEACHER' ? !savedCourse : true) &&
              location.pathname.startsWith(item.path)
            const isMenuOpen = openMenu.includes(item.key)

            return (
              <div key={`${item.key}-${index}`}>
                <li className="group relative">
                  <NavLink
                    to={item.path || '#'}
                    className={`flex items-center rounded-xl px-3 py-3 transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-primary hover:bg-blue-50 hover:text-primary'
                    }`}
                    onClick={e => {
                      if (item.sub) {
                        e.preventDefault()
                        if (isCollapsed) setIsCollapsed(false)
                        handleToggleSubmenu(item.key)
                      }
                    }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center text-[20px]">
                      {item.icon ? (
                        item.icon
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      )}
                    </div>

                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-3 flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap"
                      >
                        <span className="text font-medium">{item.label}</span>
                        {item.sub && (
                          <FaChevronDown
                            size={10}
                            className={`transition-transform duration-200 ${
                              isMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </motion.div>
                    )}

                    {/* Tooltip เมื่อหุบ Sidebar */}
                    {isCollapsed && (
                      <div className="invisible absolute left-full z-[60] ml-4 whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs text-white opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                </li>

                {/* Submenu */}
                <AnimatePresence>
                  {!isCollapsed && item.sub && isMenuOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-9 mt-1 space-y-1 border-l border-slate-100"
                    >
                      {item.sub.map((sub, idx) => {
                        // 1. คำนวณ Path สำหรับบทบาทอาจารย์
                        let subPath = sub.path

                        if (role === 'TEACHER') {
                          const savedCourse = savedSubject()
                          const section = localStorage.getItem('section')

                          // ถ้ายังไม่ได้เลือกวิชา ไม่ต้องแสดง Submenu ของวิชานั้นๆ
                          if (!savedCourse) return null

                          const subjectSlug = `${savedCourse.subject_name_en.replace(
                            /\s+/g,
                            '-'
                          )}-Section-${section}`
                          subPath = sub.path.replace('%SUBJECT%', subjectSlug)
                        }

                        return (
                          <li key={`${sub.key}-${idx}`}>
                            <NavLink
                              to={subPath}
                              className={({ isActive }) => `
          group relative flex items-center gap-3 rounded-lg px-4 py-2  font-medium transition-all duration-200
          ${
            isActive
              ? 'bg-blue-50 text-blue-600'
              : 'text-primary hover:bg-blue-50 hover:text-primary'
          }
        `}
                            >
                              {/* เส้นขีดด้านข้างเมื่อ Active เพื่อความมินิมอล */}
                              {({ isActive }) => (
                                <>
                                  <div
                                    className={`h-1 w-1 rounded-full transition-all ${
                                      isActive
                                        ? 'scale-125 bg-blue-600'
                                        : 'bg-blue-100 group-hover:bg-primary'
                                    }`}
                                  />
                                  <span>{sub.label}</span>
                                </>
                              )}
                            </NavLink>
                          </li>
                        )
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </ul>
      </div>

      {/* Logout Button */}
      <div className="mt-auto border-t border-slate-50 px-3 py-4">
        <button
          onClick={logout}
          className={`flex w-full items-center rounded-xl px-3 py-3 text-slate-500 transition-all hover:bg-blue-100 hover:text-primary ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <FaSignOutAlt className="shrink-0" />
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-3 text-sm font-medium"
            >
              ออกจากระบบ
            </motion.span>
          )}
        </button>
      </div>
    </motion.div>
  )
}
export default SidebarItem

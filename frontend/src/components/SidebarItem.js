import React, { useEffect, useState } from 'react'

import { FULL_ADMIN } from './SidebarItem/FullAddmin'
import { FACULTY_ADMIN } from './SidebarItem/FacultyAdmin'
import { DEPT_ADMIN } from './SidebarItem/DeprtAdmin'
import { PROG_MANAGER } from './SidebarItem/ProgManager'
import { TEACHER, SECTION_TOKEN } from './SidebarItem/Teacher'
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
 * The ตอนเรียน the teacher currently has open, read out of the address — or
 * null, which is the dashboard.
 *
 * This read `localStorage.selectedCourse` and `localStorage.section` until #24.
 * ADR-0004 retired both: the section id in the route is the only carrier, so
 * there is nothing to parse, nothing to leave behind, and no way for a
 * remembered section and the address to disagree. It also means the menu is
 * right on the first render after a reload, where the stored copy was right
 * only if it happened to still match.
 *
 * Anchored at the dashboard path and matched against digits, so that neither a
 * screen name nor anything else further along the path can be mistaken for a
 * section.
 */
const openSection = pathname =>
  pathname.match(/^\/teacher\/teacherDashboard\/(\d+)(?:\/|$)/)?.[1] ?? null

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
    let menuData = menu

    // The teacher's second group is about one ตอนเรียน, so it appears only once
    // one is open — #24's third and fourth criteria. What decides that is the
    // address and nothing else, so the group appears and disappears exactly
    // when the route does.
    if (role === 'TEACHER') {
      const opened = openSection(location.pathname)
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
        {/*
          A landmark, because this is not the only navigation on the page: the
          breadcrumb names the screen you are on with a link of its own, so the
          two carry a link of the same name whenever you are inside a Section.
          Labelled, one is *the menu* and the other is *where you are*;
          unlabelled, they are two anonymous lists of links saying the same
          words, and a reader who cannot see which is down the side has no way
          to tell them apart. #109 — where a test hit exactly that ambiguity.
        */}
        <nav
          aria-label="เมนูหลัก"
          className="custom-scrollbar flex-1 overflow-y-auto px-3"
        >
          <ul className="space-y-1">
            {menuForRole.map((item, index) => {
              const isActive =
                (role === 'TEACHER' ? !openSection(location.pathname) : true) &&
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
                            const section = openSection(location.pathname)

                            // ถ้ายังไม่ได้เลือกตอนเรียน ไม่ต้องแสดง Submenu ของตอนเรียนนั้น
                            if (!section) return null

                            subPath = sub.path.replace(SECTION_TOKEN, section)
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
        </nav>
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

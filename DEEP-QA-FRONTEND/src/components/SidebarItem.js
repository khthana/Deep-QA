import React, { useEffect, useState } from 'react'

import { FULL_ADMIN } from './SidebarItem/FullAddmin'
import { FACULTY_ADMIN } from './SidebarItem/FacultyAdmin'
import { DEPT_ADMIN } from './SidebarItem/DeprtAdmin'
import { PROG_MANAGER } from './SidebarItem/ProgManager'
import { TEACHER } from './SidebarItem/Teacher'
import { STUDENT } from './SidebarItem/Student'
import { GUEST } from './SidebarItem/Guest'

import {
  FaChevronDown,
  FaChevronLeft,
  FaSignOutAlt,
  FaBars,
} from 'react-icons/fa' // เพิ่ม Icon
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import ContentMotionDIV from './ContentMotionDIV'
import { useAuth } from '../context/AuthContext'

function SidebarItem({
  selectedRole,
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
  const { profile, logout } = useAuth()

  useEffect(() => {
    let firstPath = ''
    let menuData = []
    const savedCourse = JSON.parse(localStorage.getItem('selectedCourse'))
    if (selectedRole === 'ผู้ดูแลระบบกลาง') {
      setMenuForRole(FULL_ADMIN)
      handleClick(FULL_ADMIN[0].key)
      firstPath = FULL_ADMIN[0].path
    } else if (selectedRole === 'ผู้ดูแลระบบระดับคณะ') {
      setMenuForRole(FACULTY_ADMIN)
      handleClick(FACULTY_ADMIN[0].sub[0].key)
      firstPath = FACULTY_ADMIN[0].sub[0].path
    } else if (selectedRole === 'ผู้ดูแลระบบระดับภาควิชา') {
      setMenuForRole(DEPT_ADMIN)
      handleClick(DEPT_ADMIN[0].sub[0].key)
      firstPath = DEPT_ADMIN[0].sub[0].path
    } else if (selectedRole === 'กรรมการหลักสูตร') {
      setMenuForRole(PROG_MANAGER)
      handleClick(PROG_MANAGER[0].key)
      firstPath = PROG_MANAGER[0].path
    } else if (selectedRole === 'อาจารย์') {
      if (savedCourse) {
        menuData = TEACHER
        setOpenMenu([TEACHER[1].key])
      } else {
        setOpenMenu([])
        menuData = TEACHER.slice(0, 1)
      }

      setMenuForRole(menuData)
      handleClick(menuData[0].key)
      firstPath = menuData[0].path
    } else if (selectedRole === 'นักเรียน') {
      setMenuForRole(STUDENT)
      handleClick(STUDENT[0].key)
      firstPath = STUDENT[0].path
    } else {
      setMenuForRole(GUEST)
      handleClick(GUEST[0].key)
      firstPath = GUEST[0].path
    }
    if (firstPath && location.pathname === '/main') {
      navigate(firstPath, { replace: true })
    }

    if (
      selectedRole === 'อาจารย์' &&
      location.pathname === '/teacher/teacherDashboard'
    ) {
      setOpenMenu([])
      menuData = TEACHER.slice(0, 1)
      setMenuForRole(menuData)
      handleClick(menuData[0].key)
    }

    if (selectedRole !== 'อาจารย์') {
      const initialOpen = menuForRole
        .filter((item) => item.sub)
        .map((item) => item.key)
      setOpenMenu(initialOpen)
    }
  }, [selectedRole, navigate, location.pathname])

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
        <ul className="flex-1 space-y-1 px-3 overflow-y-auto custom-scrollbar">
          {menuForRole.map((item, index) => {
            const savedCourse = JSON.parse(
              localStorage.getItem('selectedCourse'),
            )
            const isActive =
              (selectedRole === 'อาจารย์' ? !savedCourse : true) &&
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
                    onClick={(e) => {
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

                        if (selectedRole === 'อาจารย์') {
                          const savedCourse = JSON.parse(
                            localStorage.getItem('selectedCourse'),
                          )
                          const section = localStorage.getItem('section')

                          // ถ้ายังไม่ได้เลือกวิชา ไม่ต้องแสดง Submenu ของวิชานั้นๆ
                          if (!savedCourse) return null

                          const subjectSlug = `${savedCourse.subject_name_en.replace(
                            /\s+/g,
                            '-',
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

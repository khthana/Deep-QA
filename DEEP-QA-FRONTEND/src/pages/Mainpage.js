import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navber from '../components/Navbar'
import Breadcrumb from '../components/Breadcrumb'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Outlet, useLocation } from 'react-router-dom'
import ContentMotionDIV from '../components/ContentMotionDIV'
import { breadcrumbNameMap } from '../components/breadcrumbNameMap '
import { mapRole } from '../components/MapRole'
import { motion } from 'framer-motion'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'

export default function MainPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, loading } = useAuth()
  const [activePage, setActivePage] = useState('')
  const [Roles, setRoles] = useState([])
  const [selectedRole, setSelectedRole] = useState('')
  const [breadcrumbItem, setBreadcrumbItem] = useState([])
  const [redirected, setRedirected] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  useEffect(() => {
    const pathnames = location.pathname.split('/').filter(Boolean)

    const crumbs = pathnames.map((path, index) => {
      const decodedPath = decodeURIComponent(path)
      let label = breadcrumbNameMap[decodedPath] || decodedPath

      let href = '/' + pathnames.slice(0, index + 1).join('/')

      if (/.*-Section-\d+$/.test(label)) {
        href = '/teacher/teacherDashboard'
      }

      return { label, href }
    })

    if (mapRole(selectedRole) === 'TEACHER') {
      const teacher_crumbs = crumbs.filter((c) => c.label !== 'ข้อมูลหลัก')
      setBreadcrumbItem(teacher_crumbs)
      return
    }
    setBreadcrumbItem(crumbs)
  }, [location])

  useEffect(() => {
    if (!loading && profile && !redirected) {
      navigate('/main', { replace: true })
      setRedirected(true)
    }
  }, [profile, loading, navigate, redirected])

  useEffect(() => {
    if (!profile?.email) return
    fetch(`${process.env.REACT_APP_API_URL}/api/user_roles/user-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: profile.email,
        role_id: 'FULL_ADMIN',
        scope_id: 'FULL_ADMIN',
      }),
    })
      .then((res) =>
        res.json().then((data) => {
          if (res.ok) setRoles(data.roles)
          else console.error('Error:', data)
        }),
      )
      .catch((err) => console.error('Fetch error:', err))
  }, [profile])

  useEffect(() => {
    if (selectedRole === 'ผู้ดูแลระบบกลาง') {
      setActivePage('ผู้ใช้งานระบบ')
    }
  }, [selectedRole, activePage])

  return (
    <ContentMotionDIV className="flex h-screen w-screen flex-col overflow-hidden bg-[#F8FAFC]">
      {/* 1. Navbar */}
      <div className="fixed left-0 top-0 z-[60] w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <Navber
          setSelectedRole={setSelectedRole}
          selectedRole={selectedRole}
          Role={Roles}
          setAlert={setAlert}
        />
      </div>

      <div className="relative flex h-full w-full pt-[64px]">
        <div
          className={`
      fixed inset-y-0 left-0 z-50 transform pt-[64px] transition-all duration-300 ease-in-out
      lg:static lg:translate-x-0 lg:pt-0
      ${
        isCollapsed
          ? '-translate-x-full lg:w-[80px] lg:translate-x-0'
          : 'translate-x-0 lg:w-[320px]'
      }
    `}
        >
          <Sidebar
            activePage={activePage}
            setActivePage={setActivePage}
            selectedRole={selectedRole}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
          />
        </div>

        <main className="relative flex h-full flex-1 flex-col ">
          <div className="sticky top-0 z-40 flex w-full items-center border-b border-slate-200 bg-white/50 px-4 py-3 backdrop-blur-sm lg:px-8">
            <div className="w-full max-w-[1920px]">
              <Breadcrumb items={breadcrumbItem} />
            </div>
          </div>

          {/* Page Content: พื้นที่แสดงผลหลัก */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 lg:px-8">
            <div className="animate-in fade-in mx-auto w-full max-w-[1920px] duration-500">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <Snackbar
        open={alert.open}
        autoHideDuration={5000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <div className="flex flex-col gap-2">
          {alert.messages?.length ? (
            alert.messages.map((e, i) => (
              <Alert
                key={i}
                onClose={() => setAlert({ ...alert, open: false })}
                severity={alert.severity}
                variant="filled"
              >
                แถว {e.row}: {e.message}
              </Alert>
            ))
          ) : (
            <Alert
              onClose={() => setAlert({ ...alert, open: false })}
              severity={alert.severity}
              variant="filled"
            >
              {alert.message}
            </Alert>
          )}
        </div>
      </Snackbar>
    </ContentMotionDIV>
  )
}

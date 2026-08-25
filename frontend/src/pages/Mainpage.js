import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navber from '../components/Navbar'
import Breadcrumb from '../components/Breadcrumb'
import { useAuth } from '../context/AuthContext'
import { Outlet, useLocation } from 'react-router-dom'
import ContentMotionDIV from '../components/ContentMotionDIV'
import { breadcrumbNameMap } from '../components/breadcrumbNameMap'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'

export default function MainPage() {
  const location = useLocation()
  const { acting } = useAuth()
  const [activePage, setActivePage] = useState('')
  const [breadcrumbItem, setBreadcrumbItem] = useState([])
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

    if (acting?.role_id === 'TEACHER') {
      const teacher_crumbs = crumbs.filter(c => c.label !== 'ข้อมูลหลัก')
      setBreadcrumbItem(teacher_crumbs)
      return
    }
    setBreadcrumbItem(crumbs)
  }, [location, acting])

  /**
   * The grants and the acting one come from the context, which reads them
   * from `GET /api/me`. The inherited page fetched them by POSTing its own
   * email together with a hardcoded `role_id: 'FULL_ADMIN'` and
   * `scope_id: 'FULL_ADMIN'` - the client asserting its own privileges, which
   * is the hole ADR-0002 exists to close. There is nothing to fetch here now.
   */

  return (
    <ContentMotionDIV className="flex h-screen w-screen flex-col overflow-hidden bg-[#F8FAFC]">
      {/* 1. Navbar */}
      <div className="fixed left-0 top-0 z-[60] w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <Navber setAlert={setAlert} />
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
            role={acting?.role_id}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
          />
        </div>

        {/*
          `min-w-0` is not decoration. A flex item defaults to `min-width: auto`,
          which is its content's min-content width, so without this `<main>`
          refuses to shrink below the widest table inside it — the criteria
          screen wants about 1,100px — and is pushed off the right of a narrow
          window. The `overflow-x-hidden` below then clips what hangs over, and
          the จัดการ column with its แก้ไข and ลบ buttons becomes unreachable
          rather than scrollable. Each table's own `overflow-x-auto` cannot help
          while its frame is as wide as its contents: nothing overflows it. #98.
        */}
        <main className="relative flex h-full min-w-0 flex-1 flex-col ">
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

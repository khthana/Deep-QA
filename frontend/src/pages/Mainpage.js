import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navber from '../components/Navbar'
import Breadcrumb from '../components/Breadcrumb'
import { useAuth } from '../context/AuthContext'
import { Outlet, useLocation } from 'react-router-dom'
import ContentMotionDIV from '../components/ContentMotionDIV'
import { breadcrumbNameMap } from '../components/breadcrumbNameMap'
import { getMySection } from '../api/teaching'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'

/**
 * Where the Section's id sits in a Teacher address, if it is there at all — #116.
 *
 * `breadcrumbNameMap` turns a segment that is a *word* into a sentence. A
 * segment that is a *value* has no entry and never could, so the trail printed
 * the id: *รายวิชาที่รับผิดชอบ › 3 › …*. The delivered system did not have this
 * problem because its own address carried `{subject}-Section-{n}`, a name; the
 * rebuild made the Section a key in the URL (ADR-0004) and the trail went on
 * printing the segment.
 *
 * The position is returned with the id rather than written down twice, because
 * the rule is one claim: the id is the third segment of a Teacher address, and
 * the crumb to relabel is the third crumb. Everything deeper — a CLO id, an
 * Activity id, a Rubric id — is read out as a number too, and each needs its
 * own name from its own call, which is #185 and not this one.
 */
export function teacherSectionCrumb(pathname) {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] !== 'teacher' || segments[1] !== 'teacherDashboard') return null
  if (!/^\d+$/.test(segments[2] || '')) return null

  return { id: segments[2], index: 2 }
}

export default function MainPage() {
  const location = useLocation()
  const { acting } = useAuth()
  const [activePage, setActivePage] = useState('')
  const [breadcrumbItem, setBreadcrumbItem] = useState([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sectionLabel, setSectionLabel] = useState(null)
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const sectionIdInPath = (() => {
    const crumb = teacherSectionCrumb(location.pathname)
    return crumb ? crumb.id : null
  })()

  /**
   * The Section's own name, which only the server knows — #116.
   *
   * The shell asks because the shell is the only thing that spans the Section's
   * screens: `:sectionId` is a path with no element of its own, so sixteen of
   * the seventeen screens below it never fetch the Section at all. The index,
   * `TeacherSection`, asks for the same thing for its own heading, and that one
   * screen therefore makes the call twice — one small answer per Section
   * visited, which is the price of the trail being readable everywhere else.
   *
   * The label is stored **with the id it was asked for**, and the crumb draws it
   * only where the two agree. `isCurrent` alone would not cover this: it decides
   * whether a late answer is still wanted, and the frame this guards needs no
   * late answer at all. A move between two Sections renders once with the new
   * address and the previous answer still in state — effects run after that
   * render — so a label kept on its own would name one class at another's
   * address, with no race in it (#179). Paired, the crumb falls back to the id
   * for that frame, which is what was there before and says nothing untrue.
   *
   * `isCurrent` is #133's family: the answer is only drawn if the address still
   * wants it. It cannot be reached from a screen today — two Sections of one
   * account are not reachable from one another without the shell coming down,
   * because the dashboard lists this term and this account teaches one Section
   * in it — so there is no row for it, and `docs/acceptance/10` says so with
   * the date rather than with a mark.
   *
   * A refusal is left to say nothing. The id is in the address because someone
   * typed or followed it, and a Section that is somebody else's is answered 404
   * (`api/teaching.js` says why it is the same sentence as one that does not
   * exist). The screen below words that refusal; a trail that invented
   * *ตอนเรียน 2* from the id would be the ticket's own rejected fallback, a
   * sentence about a class that does not exist. An expired session is announced
   * by `api/client.js` wherever the person has got to, and is not this catch's
   * business either.
   *
   * The write in that `catch` cannot be observed today, and this says so rather
   * than letting it read as proved: the effect nulls the label as it starts, so
   * a refusal has nothing to undo, and `isCurrent()` there decides nothing
   * either - a later run has already nulled it on entry. What holds the claim
   * is the *absence* of a write, which is why `refusalinvents` kills row 4 by
   * adding one and not by removing this. The line stays because it says at the
   * site what a refusal must not do, and because it is that mutant's anchor.
   *
   * What the label says is the ticket's own sentence — *ตอนเรียน 1 · ปีการศึกษา 2569* — and
   * not the fallback it offered beside it. *ตอนเรียน {id}*, "without waiting for
   * data from the server", is a sentence about a class that does not exist as
   * soon as the id and the number disagree; and the year is the half that tells
   * two Sections of the same number apart, which `section_id` 1 and 3 are.
   */
  useEffect(() => {
    setSectionLabel(null)
    if (!sectionIdInPath) return

    let current = true

    // Written as an `await` behind an `isCurrent` predicate because that is the
    // shape `scripts/superseded-answers.js` can read: it walks for
    // `AwaitExpression` and nothing else, so the same code spelled `.then(data
    // => …)` would be a drawn answer the census could not count — a population
    // that cannot contain what carries no `await`.
    const load = async isCurrent => {
      try {
        const data = await getMySection(sectionIdInPath)
        if (isCurrent()) {
          setSectionLabel({
            id: sectionIdInPath,
            text: `ตอนเรียน ${data.section.section_number} · ปีการศึกษา ${data.section.academic_year}`,
          })
        }
      } catch (refusal) {
        if (isCurrent()) setSectionLabel(null)
      }
    }

    load(() => current)

    return () => {
      current = false
    }
  }, [sectionIdInPath])

  useEffect(() => {
    const pathnames = location.pathname.split('/').filter(Boolean)
    const sectionCrumb = teacherSectionCrumb(location.pathname)

    const crumbs = pathnames.map((path, index) => {
      const decodedPath = decodeURIComponent(path)
      let label = breadcrumbNameMap[decodedPath] || decodedPath

      const href = '/' + pathnames.slice(0, index + 1).join('/')

      // #116. The href needs no special case the way the delivered system's did:
      // there `/:subjectNameEn` was not a screen, so the crumb was pointed back
      // at the dashboard, and the test for it (`/.*-Section-\d+$/` on the label)
      // could never match an address this router produces. Here the id's own
      // address is `TeacherSection`, so the natural href is already right.
      if (sectionCrumb && index === sectionCrumb.index && sectionLabel?.id === sectionCrumb.id) {
        label = sectionLabel.text
      }

      return { label, href }
    })

    if (acting?.role_id === 'TEACHER') {
      const teacher_crumbs = crumbs.filter(c => c.label !== 'ข้อมูลหลัก')
      setBreadcrumbItem(teacher_crumbs)
      return
    }
    setBreadcrumbItem(crumbs)
  }, [location, acting, sectionLabel])

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

import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navber from '../components/Navbar'
import Breadcrumb from '../components/Breadcrumb'
import { useAuth } from '../context/AuthContext'
import { Outlet, useLocation } from 'react-router-dom'
import ContentMotionDIV from '../components/ContentMotionDIV'
import {
  breadcrumbNameMap,
  breadcrumbNameByParent,
} from '../components/breadcrumbNameMap'
import { getMySection } from '../api/teaching'
import { getCourseOutcome } from '../api/clos'
import { getActivity } from '../api/activities'
import { getRubric } from '../api/rubrics'
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

/**
 * Where a deeper id sits in an address, and which call can name it -- #185.
 *
 * The same defect as `teacherSectionCrumb`'s one segment further down, and in
 * three shapes rather than one: a CLO id under `courseOutcomes`, an Activity
 * id under `learningActivities`, and a Rubric id under `/main/rubrics`. All
 * three are surrogate keys (ADR-0001) that the rebuild put in the address, so
 * `breadcrumbNameMap` has no entry for them and never could, and the trail
 * printed the number. The delivered system printed a name in all three places:
 * it navigated with `CLO-${clo.clo_number}` and used the constant words
 * `activityScores` and `edit-Rubric`, so this is restoring what was there and
 * not adding something new -- which is what #185's own correction settles.
 *
 * One resolver and one table rather than three effects, because the three
 * differ only in which request names the segment. The `kind` travels with the
 * id for the reason #116's index does: the pairing guard below needs both, and
 * two of the three kinds sit at the same index.
 */
export function labelledIdCrumb(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  const numeric = index => /^\d+$/.test(segments[index] || '')

  if (segments[0] === 'main' && segments[1] === 'rubrics' && numeric(2)) {
    return { kind: 'rubric', id: segments[2], index: 2 }
  }

  const section = teacherSectionCrumb(pathname)
  if (!section) return null

  if (segments[3] === 'courseOutcomes' && numeric(4)) {
    return { kind: 'clo', id: segments[4], index: 4, sectionId: section.id }
  }
  if (segments[3] === 'learningActivities' && numeric(4)) {
    return { kind: 'activity', id: segments[4], index: 4, sectionId: section.id }
  }

  return null
}

/**
 * The sentence for a crumb that is a *word*, where the word does not say which
 * screen -- #189.
 *
 * `breadcrumbNameMap` is keyed on the segment and holds one sentence per word,
 * which `criteria` has two screens for. The disambiguating half is the nearest
 * word *above* the crumb -- `rubrics` or `courseOutcomes` -- and it is found by
 * walking up rather than by counting, for the reason written over
 * `breadcrumbNameByParent`: the id between is what puts both parents two
 * crumbs up, and that is a fact about today's addresses.
 *
 * The walk steps over all-digit segments, which is what an id is here: every
 * key in an address is a surrogate integer (ADR-0001). A segment that is not
 * all digits standing in an id's place -- a hand-typed `/courseOutcomes/abc/
 * criteria` -- is therefore read as the word above, the pair misses, and the
 * crumb falls through to the map. That address's screen is a refusal, so the
 * wording under it names no class that exists; this is untested rather than
 * unreachable, and written down (4 October 2569) rather than guarded, because
 * a guard here would be a second claim about the format with nothing to put it
 * at risk (#124).
 *
 * `undefined` when nothing is written for the pair, so the caller falls through
 * to the map and then to the segment, which is the order that was there before.
 */
export function wordCrumbLabel(segments, index) {
  const above = segments
    .slice(0, index)
    .reverse()
    .find(segment => !/^\d+$/.test(segment))

  return breadcrumbNameByParent[`${above}/${segments[index]}`]
}

/**
 * What each kind is called, asked of the server -- #185.
 *
 * Each is the single-item read of its own module and nothing more: the shell
 * is above the screens and holds no list, and sharing a store with the screen
 * below would turn two claims into one no mutant could measure apart (#68).
 *
 * The text is the label a person reads, which is not the id: `clo_number` is
 * *CLO-1* and `rubric_code` is institution-wide, while `clo_id` and
 * `rubric_id` are keys. The CLO's number is drawn as it stands rather than
 * with a word in front of it, because it already carries one.
 */
const DEEPER_NAMES = {
  clo: async crumb => (await getCourseOutcome(crumb.sectionId, crumb.id)).clo.clo_number,
  activity: async crumb => (await getActivity(crumb.sectionId, crumb.id)).activity.activity_name,
  rubric: async crumb => `Rubric ${(await getRubric(crumb.id)).rubric.rubric_code}`,
}

export default function MainPage() {
  const location = useLocation()
  const { acting } = useAuth()
  const [activePage, setActivePage] = useState('')
  const [breadcrumbItem, setBreadcrumbItem] = useState([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sectionLabel, setSectionLabel] = useState(null)
  const [deepLabel, setDeepLabel] = useState(null)
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

  const deeper = labelledIdCrumb(location.pathname)
  const deeperKind = deeper ? deeper.kind : null
  const deeperId = deeper ? deeper.id : null
  const deeperSectionId = deeper ? deeper.sectionId ?? null : null

  /**
   * The name of whatever the deeper id names -- #185.
   *
   * #116's effect one segment down, and deliberately its twin: null on entry,
   * one request per address, the answer drawn only behind `isCurrent()` so a
   * superseded one is dropped (#133's family, and written as an `await` behind
   * a predicate so `scripts/superseded-answers.js` can read it), and the label
   * stored with the key it was asked for.
   *
   * The key is `kind:id` and not the id alone, because `:cloId` and
   * `:activityId` are both the fifth segment: a move from one Activity's
   * evidence to the CLO with the same id renders once with the new address and
   * the old answer still in state, which is #179's raceless sibling and needs
   * no race to be wrong. Paired, the crumb falls back to the number for that
   * frame, which is what was there before and says nothing untrue.
   *
   * A refusal is left to say nothing, for #116's reasons exactly: an id in an
   * address somebody typed may be somebody else's, the screen below words that
   * refusal, and an expired session is announced by `api/client.js` wherever
   * the person has got to. Inventing *CLO-{id}* from the segment would be a
   * sentence about an outcome that does not exist.
   */
  useEffect(() => {
    setDeepLabel(null)
    if (!deeperKind) return

    let current = true

    const load = async isCurrent => {
      try {
        const text = await DEEPER_NAMES[deeperKind]({ id: deeperId, sectionId: deeperSectionId })
        if (isCurrent()) setDeepLabel({ key: `${deeperKind}:${deeperId}`, text })
      } catch (refusal) {
        if (isCurrent()) setDeepLabel(null)
      }
    }

    load(() => current)

    return () => {
      current = false
    }
  }, [deeperKind, deeperId, deeperSectionId])

  useEffect(() => {
    const pathnames = location.pathname.split('/').filter(Boolean)
    const sectionCrumb = teacherSectionCrumb(location.pathname)
    const deepCrumb = labelledIdCrumb(location.pathname)

    const decodedNames = pathnames.map(decodeURIComponent)

    const crumbs = pathnames.map((path, index) => {
      const decodedPath = decodedNames[index]
      let label =
        wordCrumbLabel(decodedNames, index) ||
        breadcrumbNameMap[decodedPath] ||
        decodedPath

      const href = '/' + pathnames.slice(0, index + 1).join('/')

      // #116. The href needs no special case the way the delivered system's did:
      // there `/:subjectNameEn` was not a screen, so the crumb was pointed back
      // at the dashboard, and the test for it (`/.*-Section-\d+$/` on the label)
      // could never match an address this router produces. Here the id's own
      // address is `TeacherSection`, so the natural href is already right.
      if (sectionCrumb && index === sectionCrumb.index && sectionLabel?.id === sectionCrumb.id) {
        label = sectionLabel.text
      }

      // #185, the same pairing one segment down. `deepCrumb` is recomputed here
      // from the address being drawn rather than read from the render above, so
      // the crumb and the key it is compared against come from one source.
      if (
        deepCrumb &&
        index === deepCrumb.index &&
        deepLabel?.key === `${deepCrumb.kind}:${deepCrumb.id}`
      ) {
        label = deepLabel.text
      }

      return { label, href }
    })

    if (acting?.role_id === 'TEACHER') {
      const teacher_crumbs = crumbs.filter(c => c.label !== 'ข้อมูลหลัก')
      setBreadcrumbItem(teacher_crumbs)
      return
    }
    setBreadcrumbItem(crumbs)
  }, [location, acting, sectionLabel, deepLabel])

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

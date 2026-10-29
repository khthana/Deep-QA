import { useCallback, useEffect, useRef, useState } from 'react'

import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import { alsoOutside, outsideFilter } from '../lib/outsideTheFilter'
import Pager from '../components/Pager'
import StudentForm from '../components/students/StudentForm'
import {
  createStudent,
  importStudents,
  importTemplate,
  listReachableDepartments,
  listReachablePrograms,
  listStudents,
} from '../api/students'

/**
 * ข้อมูลนักศึกษากลาง — ticket #17.
 *
 * The register every student first appears in. Nothing beneath it — enrolling
 * one into a Section (#25), marking their work, reporting a CLO result — can
 * name a student who is not here, so the two buttons at the bottom of this
 * screen are what make the whole Teacher half of the application reachable.
 * The inherited screen drew both of them and wired neither.
 *
 * The ผู้ดูแลภาควิชา owns it alone, which the advisor settled the way #61
 * settled the catalogue: a register is departmental master data. The
 * ผู้ดูแลระดับคณะ and the กรรมการหลักสูตร both reached this screen as
 * delivered and neither reaches it now — enforced at the server, as ADR-0002
 * asks, with the menu entry removed as a convenience rather than as the rule.
 *
 * The two filters the ticket asks for are not two dropdowns. An account that
 * reaches this screen reaches one department, so ภาควิชา is stated rather than
 * offered — the same shape ข้อมูลรายวิชา settled on, and for the same reason: a
 * control whose every option returns the same rows is a control that does
 * nothing, and taking the row away entirely would take "which register am I
 * reading?" off the screen. หลักสูตร is the filter that has something to say,
 * because a department has several and a student belongs to exactly one.
 *
 * There is no แก้ไข and no ลบ. docs/06's stories are browse, add and page, and
 * #17 asks for nothing else; a student who leaves is a `status`, which the
 * ticket that needs it can add.
 */

const PAGE_SIZE = 10

const STATUS = {
  active: 'กำลังศึกษา',
  inactive: 'พักการศึกษา',
  graduated: 'สำเร็จการศึกษา',
  suspended: 'พ้นสภาพ',
}

/**
 * What a read of this list is *of*, which is what a sentence handed to
 * `waiting` names - #205. `Departments.js` carries the reasons.
 */
const readOf = (page, program) => `${page}:${program}`

// pager-last-page: the rule the owner settled on 19 ตุลาคม 2569 (#209) is not
// here, because nothing a person can press on this screen makes the list it is
// drawing shorter. The only writes are *เพิ่มนักศึกษา* and the import, and both
// can only add rows; there is no *แก้ไข* and no *ลบ*. The program filter is the
// other way a list narrows, and it calls `setPage(1)` in the same handler that
// calls `setProgram`, so the pager is never left past the end by a filter.
// Measured 28 ตุลาคม 2569 (#239). The day this screen gains a write that can
// take a row out of what the pager asked for, this marker is an exemption and
// nothing here will say so (#93) - the rule belongs in `load` then, in the
// shape `Users.js` carries.
export default function Students() {
  const [page, setPage] = useState(1)
  const [program, setProgram] = useState('')
  const [data, setData] = useState({ students: [], total: 0 })
  const [programs, setPrograms] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  const report = useCallback(error => {
    // A 401 already raises the shell's dialog; saying it again here would put a
    // banner behind that dialog.
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

  /**
   * A sentence waiting for the read that will draw what it is about - #152.
   * `Departments.js` carries the reasons.
   */
  const waiting = useRef(null)

  /**
   * The list for the page the pager is on now - #68.
   *
   * Every paged panel in this codebase read its answer the same way: `setData`
   * on whatever the await returned, with nothing tying that answer to the
   * request that caused it. Two presses of *ถัดไป* while the first list is still
   * in flight, or a filter moved on a slow connection, and **the answer that
   * arrives last wins rather than the one asked for last** - the table draws a
   * page the pager is no longer on, and the older answer's `setLoading(false)`
   * reports the newer request as finished. On this screen that second half is
   * the louder one: the register says *ยังไม่มีข้อมูลนักศึกษาในระบบ* while the
   * list it is waiting for is still on its way.
   *
   * `isCurrent` is asked after the answer arrives and is the whole of the rule.
   * It is a parameter rather than a `let` beside the fetch - the shape the
   * effect below this one uses for its two lists - because `load` has two kinds
   * of caller, and they need two different answers to *is this still current*.
   *
   * **The effect asks whether its render is still mounted, and a handler cannot
   * ask that** - nothing tears a handler down. Until #140 the handlers passed
   * nothing and took a default that said yes, and this comment called that
   * honest; #133 measured it false on `Plos` and `ActivityScores`, and #140
   * measured it false on every screen that reloads from a handler with a
   * control beside it. Here `save` closes the form before it reloads and
   * `onImported` fires with the pager and the filter on screen, so ถัดไป pressed
   * while the reload was out drew page one under a pager on page two. What a
   * handler can ask is *is the list still where it was when I was sent*, which
   * is `onScreen` below, and there is no default any more: a caller that
   * forgets the flag throws rather than quietly drawing a list nobody is on -
   * *a guard written for one caller is a claim about every caller* (#68).
   *
   * Fourteen other panels carry the same guard. Eleven read a list: `Users`,
   * `Departments`, `Programs`, `Subjects`, `ProgramSubjects`, `Rubrics`,
   * `Offerings`, `SubjectStudents`, `users/HistoryPanel`, `groups/GroupHistory`
   * and `UserHistory` - the last of those a search picker rather than a pager,
   * where what supersedes a request is the next keystroke. Three are reports
   * driven by `CohortPickers`: `ProgramLevelByIntake`, `ProgramLevelIndividual`
   * and `ProgramLevelAllStudents`, which #68's own comment measured and left
   * unmeasured, and which take `ProgramLevelCompare`'s spelling of this guard
   * from #129 because only their effects call them.
   *
   * The ticket listed seven files; the other eight came from asking what its
   * grep could not have found and from reading its comments as well as its
   * body. **A ticket's file list is a grep somebody else ran.**
   *
   * This one is where the browser rows and the mutants are - and the reason the
   * fifteen are not a shared `usePagedList` is that a mutant in code they all
   * share kills every screen's rows at once, and a mutant that kills everything
   * proves nothing about any one of them. That is what `intakefrozen` taught
   * #42.
   */
  const load = useCallback(async isCurrent => {
    // Which read this is, for the sentence that may be waiting for it - #205.
    const key = readOf(page, program)
    setLoading(true)
    try {
      const answer = await listStudents({ page, per_page: PAGE_SIZE, program_id: program })
      if (isCurrent()) {
        setData(answer)
        if (waiting.current && waiting.current.of === key) {
          if (formShown.current) {
            waiting.current = { ...waiting.current, held: true }
          } else {
            setNotice(waiting.current.said)
          }
        }
      }
      // Whether it drew, for a handler that has a sentence to say - #203. It
      // answers *the read was not refused* and not *the screen is still the one
      // that asked*, which is the caller's own second clause (#202).
      return true
    } catch (error) {
      if (isCurrent()) report(error)
      return false
    } finally {
      if (isCurrent()) {
        setLoading(false)
        // A read the screen still wants has landed, so whatever was waiting
        // has either just been said above or is about a list that is no
        // longer on the screen. A read that was superseded takes nothing
        // away: the sentence it would have thrown out belongs to the read
        // that replaced it - #205.
        // #246, 29 ตุลาคม 2569 - unless it is held for a form to close,
        // the one case where a landed read has drawn nothing to put a sentence
        // over. The effect beside `formShown` owns a held one from here on.
        if (!waiting.current?.held) waiting.current = null
      }
    }
  }, [page, program, report])

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  /**
   * The list a handler reloads is drawn only if it is still the list the screen
   * is on - #140.
   *
   * It asks about `load` itself rather than about `page` and `program`, which is
   * the other spelling - `Plos` compares its one filter. `load` is rebuilt
   * exactly when what the list asks for changes, because its dependencies are
   * that request, so one comparison answers the question on a screen with two
   * of them (this one) and on a screen with five (`Offerings`) without a second
   * list of values beside the `useCallback` to be kept in step with the first.
   * Compared this way a reload is dropped when anything the list asks for has
   * moved - which is what a stale answer is - and when nothing has, it draws.
   *
   * The ref is written in an effect rather than during render, as `Plos`'s is:
   * the answer that has to lose arrives after the effect that superseded it has
   * run, which is what makes it stale in the first place.
   *
   * **And the handler reads with the loader this ref holds, not with the one it
   * closed over** — #208. Until then every handler called its own `load` and
   * handed it `() => onScreen.current === load`, which is a comparison a
   * handler whose screen has moved can only lose: the loader it is asking is
   * the dead one, so the read refuses itself, and on the screens whose table
   * has a loading row that row is what is left — under the success sentence the
   * handler had already said. The same call on the screens #140 measured drew
   * the page the person had left instead, which is the same staleness from the
   * other end. Reading `onScreen.current` into a local first and calling *that*
   * makes both halves of the read about the loader the screen is on now:
   *
   *     const drawing = onScreen.current
   *     const reloaded = await drawing(() => onScreen.current === drawing)
   *
   * The staleness is not the render's. A handler drawn in JSX closes over the
   * render it was drawn in, which is current the moment it is pressed; what
   * makes its loader old is the **wait** in between, its own `await` or a
   * child's — `ImportPanel` awaits the upload before it calls `onImported`. So
   * the shape is written at every call outside the fetch effect, fifty-nine of
   * them in nineteen page files on the day #208 landed (sixty-two in twenty
   * since #211 brought `Plos.js` in), and not only where a control is measured
   * to be reachable while the answer is out: which controls those are is a
   * claim with a date on it, and the shape is the defect.
   * `frontend/scripts/dead-loaders.js` is the census that counts them.
   *
   * Eighteen other screens carry this ref below their fetch effect, the ten
   * that cannot be proved with two sentences more saying so. Eight have a
   * control beside a handler - `Users`, `Departments`, `Programs`, `Subjects`,
   * `ProgramSubjects`, `Rubrics`, `Offerings` and `SubjectStudents` - and with
   * this screen that is thirty-one sites, each with its own row in
   * `e2e/tests/140a-superseded-handler-reload.spec.js` and its own mutant in
   * `mutation/140-superseded-handler-reload.py`: the refusal of แก้ไข, บันทึก,
   * ลบ, the import, ระงับ, คัดลอก, กลับไปหน้ารายการ, whichever each screen has.
   * `SubjectStudents.reload` is one site with two callers - adding a student and
   * the import, which passes it by name - so it has two rows. The other ten ask
   * for what the route names and nothing on them can change it while a reload
   * is out, so they carry the guard and their sheets say *ยังไม่ได้ทดสอบ*, with
   * the reason and a date, rather than *ไม่ต้องมี*.
   */
  const onScreen = useRef(load)
  useEffect(() => {
    onScreen.current = load
  }, [load])

  /**
   * Whether a form is drawn in place of the list, readable after an await -
   * #246, 29 ตุลาคม 2569.
   *
   * The return below draws the form **or** the table and never both, so a read
   * that lands while one is open has drawn nothing a waiting sentence is about,
   * and the sentence waits for a list to be true of. `load` cannot read
   * `adding` itself: in its dependency list it would rebuild the loader at
   * every press of the opener and the effect above would fetch the list again
   * for each one, and out of the list the closure would see the first render's
   * value (#201). So it is mirrored into a ref the way `onScreen` mirrors
   * `load` just above. `frontend/src/pages/Plos.js` carries the measurement the
   * owner's answer rests on and what this ref is *of* (#185, #207).
   */
  const formShown = useRef(false)
  useEffect(() => {
    formShown.current = Boolean(adding)
  }, [adding])

  /**
   * The held sentence, said when the list comes back - #246.
   *
   * A held sentence whose read is no longer the one the screen is on is owed to
   * nobody and goes without being said, which is the same half of the key rule
   * `load` applies above (#205). That clause is **structurally unreachable**
   * here on 29 ตุลาคม 2569 and is written for the day it is not: the pager
   * and the filters are drawn in the branch the form replaces, so nothing can
   * move the key while a form is open. A control drawn outside that branch
   * would move it, and that is the condition that re-dates this.
   *
   * The clearing here is the whole of it, the `finally` in `load` having stopped
   * clearing a held one: a sentence nothing clears is not a sentence that is
   * lost, it is one the next read says over a list it is not about (#205, #137).
   */
  useEffect(() => {
    if (adding) return
    const held = waiting.current
    if (!held?.held) return
    if (held.of === readOf(page, program)) setNotice(held.said)
    waiting.current = null
  }, [adding, page, program])

  /**
   * The page the pager is on now, for a handler that has to know whether the
   * move it is about to make would cause a read at all - #205. `onScreen`
   * above answers *which* read; this answers *where from*.
   */
  const onPage = useRef(page)
  useEffect(() => {
    onPage.current = page
  }, [page])

  // What this account covers is a property of the grant and does not change
  // with the page being looked at, so both lists are fetched once. The
  // programmes are the filter's options, the form's picker and the way a
  // `program_id` on a row becomes a name; the departments are the way the
  // department behind it becomes one.
  useEffect(() => {
    let cancelled = false
    Promise.all([listReachablePrograms(), listReachableDepartments()])
      .then(([{ programs: reachable }, { departments: covered }]) => {
        if (cancelled) return
        setPrograms(reachable)
        setDepartments(covered)
      })
      .catch(report)
    return () => {
      cancelled = true
    }
  }, [report])

  const programNameOf = programId =>
    programs.find(entry => entry.program_id === programId)?.program_name_th ?? programId

  /**
   * #146 — which opening of the form is on the screen, so the answer to a save
   * closes the form that sent it rather than whichever one it finds.
   *
   * The ticket named three screens and listed twelve more by grepping for
   * `setEditing(null)`. This screen was on no list the ticket carried: it
   * holds one boolean, `adding`, because there is nothing to edit here — so
   * the grep that found the others could not have found it, which is #133's
   * rule about a file list being somebody else's grep.
   *
   * The way in is the shorter one. There is no แก้ไข, so it is ยกเลิก and then
   * เพิ่มนักศึกษา: `StudentForm` disables บันทึก while a write is out and leaves
   * ยกเลิก pressable, and the table it returns to disables nothing. The first
   * save's answer then closed the second form with whatever had been typed into
   * it and put "บันทึกข้อมูลนักศึกษาเรียบร้อยแล้ว" over the register.
   *
   * เพิ่มนักศึกษา writes an object of its own here and ยกเลิก writes nothing, so
   * `save` compares what it was sent from with the last thing that opened; a
   * save that finds a second form says nothing, neither its banner nor its
   * refusal, and one that finds nothing in its place says what it did. What
   * follows the comparison does not depend on it: the register is out of date
   * either way, so the move back to page one happens whichever way it goes
   * (#131).
   *
   * `Departments` carries the rule and the other twelve screens that ask it the
   * same way; `146a-save-closes-a-later-form.spec.js` has the rows.
   */
  const showing = useRef(null)

  const save = async draft => {
    const sent = showing.current
    setBusy(true)
    try {
      await createStudent(draft)
      // #247, 29 ตุลาคม 2569 - the owner's answer ข้อ จ. The หลักสูตร picker here
      // carries no `disabled` of any kind, and this screen has no แก้ไข at all
      // (the docblock above says why), so the one way a row lands outside the
      // register in front of the person is an **add** into another curriculum.
      // The sentence is the same one the other six screens say: the row that was
      // just saved is not in the list it is standing over.
      // `lib/outsideTheFilter.js` carries the measured population of seven.
      const outside = outsideFilter(program, draft.program_id)
      const said = {
        error: false,
        message: alsoOutside('บันทึกข้อมูลนักศึกษาเรียบร้อยแล้ว', outside),
      }
      if (showing.current === sent) setAdding(false)
      // Back to the first page, where the list's newest-first order puts a
      // student who has just been added. Setting the page is a change the
      // effect fetches; calling `load` as well would race it, so only the
      // branch that is already on page one reloads by hand.
      // #203 - a page move is a read the effect does, so the sentence is handed
      // over for `load` to say when it has drawn. `Departments.js` carries the
      // reasons.
      // #205 - the page the pager is on now, not the one this handler was sent
      // from: a pager pressed while the write was out has moved it, and
      // `setPage(1)` on a screen already showing page one asks for no read at
      // all, so a sentence handed over there would wait for a read nobody is
      // going to make. The read is done by hand instead, and the sentence is
      // still handed over: the read of the first page is what says it, and
      // `load` is where its key and the sentence's are compared.
      if (onPage.current === 1) {
        // The loader for that page, which is not the one this render closed
        // over any more.
        const drawing = onScreen.current
        if (showing.current === sent) {
          const target = readOf(1, program)
          waiting.current = { of: target, said }
        }
        await drawing(() => onScreen.current === drawing)
      } else {
        if (showing.current === sent) {
          const target = readOf(1, program)
          waiting.current = { of: target, said }
        }
        setPage(1)
      }
    } catch (error) {
      if (showing.current === sent) report(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Notice notice={notice} />

      {adding ? (
        <StudentForm
          programs={programs}
          departments={departments}
          busy={busy}
          onSave={save}
          onCancel={() => {
            // ยกเลิก does not write this: a form closing is nobody taking the
            // screen, and a save still out is owed its sentence (#146).
            setNotice(null)
            setAdding(false)
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-medium text-primary">ข้อมูลนักศึกษากลาง</h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* Stated, not offered — see the note at the top of the file. */}
              {departments.length === 1 && (
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  ภาควิชา
                  <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                    {departments[0].department_name_th}
                  </span>
                </span>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-600">
                หลักสูตร
                <select
                  value={program}
                  onChange={event => {
                    // Page 3 of the department's register is rarely page 3 of
                    // one หลักสูตร's.
                    setPage(1)
                    setProgram(event.target.value)
                  }}
                  className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                >
                  <option value="">ทุกหลักสูตร</option>
                  {programs.map(entry => (
                    <option key={entry.program_id} value={entry.program_id}>
                      {entry.program_name_th}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  showing.current = {}
                  setNotice(null)
                  setAdding(true)
                }}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
              >
                เพิ่มนักศึกษา
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสนักศึกษา</th>
                  <th className="px-4 py-3">ชื่อ - นามสกุล</th>
                  <th className="px-4 py-3">หลักสูตร</th>
                  <th className="px-4 py-3">ปีที่เข้าศึกษา</th>
                  <th className="px-4 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      กำลังโหลด…
                    </td>
                  </tr>
                )}
                {!loading && data.students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      {program ? 'ยังไม่มีนักศึกษาในหลักสูตรนี้' : 'ยังไม่มีข้อมูลนักศึกษาในระบบ'}
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.students.map(student => (
                    <tr key={student.student_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{student.student_id}</td>
                      <td className="px-4 py-3">{student.full_name_th}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {programNameOf(student.program_id)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{student.admission_year}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            student.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {STATUS[student.status] ?? student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <Pager
            page={page}
            shown={data.page}
            total={data.total}
            perPage={PAGE_SIZE}
            onPage={setPage}
          />

          <ImportPanel
            title="นำเข้ารายชื่อนักศึกษาจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย รหัสนักศึกษาที่มีอยู่แล้วจะถูกปรับปรุงข้อมูลแทนการเพิ่มซ้ำ"
            templateName="students-template.csv"
            target="students"
            fetchTemplate={importTemplate}
            send={importStudents}
            onImported={() => {
              // Going to page one is a change the effect fetches; asking `load`
              // as well would ask from the page being left, and the two answers
              // would race - #68. Only the branch already on page one, where
              // nothing refetches, reloads by hand.
              const drawing = onScreen.current
              if (page === 1) drawing(() => onScreen.current === drawing)
              else setPage(1)
            }}
            onStart={() => setNotice(null)}
            onError={report}
          />
        </>
      )}
    </div>
  )
}

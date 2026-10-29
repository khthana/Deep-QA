import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HiOutlineTrash } from 'react-icons/hi2'

import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import Pager from '../components/Pager'
import {
  enrolStudent,
  importEnrolments,
  importTemplate,
  listEnrolled,
  removeEnrolment,
} from '../api/enrolment'

/**
 * รายชื่อนักศึกษาของรายวิชา — ticket #25.
 *
 * Who is in this ตอนเรียน. A ผู้สอน builds the list by typing a code or by
 * uploading a file of them, and takes somebody back out when they were added by
 * mistake.
 *
 * ## The box takes a code, not a person
 *
 * There is no picker of every student in the system, and that is a decision
 * rather than an omission. The register holds thousands; a dropdown of them is
 * unusable and a search across them would hand a ผู้สอน a way of browsing
 * students who are nothing to do with their class. A code is what a class list
 * from the registry office is made of, so a code is what this takes.
 *
 * The consequence is that a mistyped code has to be answered well, which is the
 * ticket's third criterion and the reason this screen shows the server's
 * sentence verbatim: it names ข้อมูลนักศึกษากลาง as the place to add somebody,
 * and that is where the person has to go. Offering to create the student here
 * would be the half-formed record the ticket exists to prevent — a name with
 * no หลักสูตร and no ภาควิชา that marks would then attach to.
 *
 * ## Removal
 *
 * The fifth criterion asks for the confirmation, and it is this screen's:
 * nothing on a server can tell a considered DELETE from a slip. What the server
 * decides is whether the removal is allowed at all, and it refuses two states
 * this screen does not reword — a student who already has marks in this
 * ตอนเรียน, and one who is in one of its กลุ่มงาน. Both sentences name their own
 * way out, and a screen guessing between them would guess wrong the day a third
 * is added.
 *
 * ## The counts
 *
 * `total` is the whole class and is read from the server rather than from
 * `students.length`, which is one page of ten. It is on the screen because the
 * ตอนเรียน card on the dashboard shows the same number, and two places showing
 * one number is how somebody notices when a list has silently lost a row.
 */
/**
 * What a read of this list is *of*, which is what a sentence handed to
 * `waiting` names - #205. `Departments.js` carries the reasons.
 */
const readOf = (sectionId, page) => `${sectionId}:${page}`

/**
 * `load`'s third answer - #209. `Departments.js` carries the reasons: a read
 * that is told the page it asked for no longer exists has neither drawn nor
 * been refused, and a caller with a sentence hands it over rather than saying
 * it over a page about to be replaced.
 */
const HANDED_ON = 'handed-on'

export default function SubjectStudents() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [code, setCode] = useState('')
  const [removing, setRemoving] = useState(null)

  /**
   * A sentence waiting for the read that will draw what it is about - #152.
   *
   * `reload` can ask for a different page rather than read the one it is on,
   * and that read is the effect's: the handler has nothing to await and
   * cannot know whether it drew. Saying the sentence there says a write
   * succeeded over a refusal the effect is about to write - the one thing
   * #152's decision says must not be said - and it is on the screen for as
   * long as the refusal takes to arrive: measured 11 October 2569 on the
   * page-2 enrolment, one frame of thirty with the refusal answered at once
   * and nineteen of forty-seven with it 300ms late.
   *
   * So the sentence is left here with the key of the read it is for - `readOf`
   * above - and that read is the one that says it. A read that refused, and a
   * read of another list that the screen does still want, take it away without
   * saying it; a read that was superseded before it landed takes nothing away
   * at all. Until #205 measured it on 13 October 2569 the clearing was outside
   * that question and the superseded read threw the sentence out.
   */
  const waiting = useRef(null)

  /**
   * `loading` swaps the rows of the table and nothing above it — Students.js'
   * shape, and here for a reason worth writing down.
   *
   * A reload after an import is a read of a list that is already on the screen.
   * Unmounting the screen for the length of it takes `ImportPanel` with it, and
   * the per-row report lives in that component's own state: a person who had
   * just been told which three lines were wrong would watch the answer vanish.
   * So `data` decides whether there is a screen and survives a reload, and
   * `loading` decides only what the table's body is showing.
   *
   * #68 - the answer that is drawn is the answer to the request the screen is
   * still on; without the flag the answer that **arrives** last wins rather
   * than the one asked for last. The rule, the three rows that prove it, and
   * why fifteen panels repeat it rather than share one hook, are written on
   * `frontend/src/pages/Students.js`.
   */
  const load = useCallback(async isCurrent => {
    // Which read this is, for the sentence that may be waiting for it - #205.
    const key = readOf(sectionId, page)
    setLoading(true)
    // Whether this read handed the page on rather than drawing it - #209. The
    // sentence that was waiting for it belongs to the read that follows, so the
    // `finally` below must not clear it.
    let handedOn = false
    try {
      const answer = await listEnrolled(sectionId, { page })
      if (isCurrent()) {
        // #209 - the owner's answer of 19 ตุลาคม 2569: whether the page the
        // person is on still exists is the server's to say, not this screen's,
        // and the answer carries `total`. This screen asks for no `per_page`,
        // so the size it was paged by is only knowable from the answer - and an
        // answer that does not say stands as drawn rather than being measured
        // against a number this file made up. Nothing is drawn when the page
        // has gone: drawing it would paint an empty page, and the sentence over
        // it, before the correction lands. `Departments.js` carries the
        // measurement.
        const size = answer.per_page
        const lastPage = size ? Math.max(1, Math.ceil(answer.total / size)) : answer.page
        if (answer.page > lastPage) {
          handedOn = true
          if (waiting.current && waiting.current.of === key) {
            waiting.current = { of: readOf(sectionId, lastPage), said: waiting.current.said }
          }
          setPage(lastPage)
          return HANDED_ON
        }
        // held-sentence: the deferral the owner settled on 29 ตุลาคม 2569 (#246) is
        // not here, because no form is drawn in place of this list. The return draws the
        // table under `{data && (` and nothing replaces it: the writes of this screen -
        // *เพิ่มนักศึกษาเข้าตอนเรียน* and the removal - are a dialog **over** the list, so a read
        // that lands while one is open has drawn the very thing its sentence is about.
        // Measured 29 ตุลาคม 2569 (#246). The day this screen draws a form in place of
        // the table, this marker is an exemption and nothing will say so (#93, #141):
        // what it exempts is the sentence below, and the three parts of the deferral go
        // in as they did on the other nine.
        setData(answer)
        if (waiting.current && waiting.current.of === key) {
          setNotice(waiting.current.said)
        }
      }
      return true
    } catch (error) {
      if (isCurrent()) {
        setData(null)
        if (!error.expired) setNotice({ error: true, message: error.message })
      }
      return false
    } finally {
      if (isCurrent()) {
        setLoading(false)
        // A read the screen still wants has landed, so whatever was waiting
        // has either just been said above or is about a list that is no
        // longer on the screen. A read that was superseded takes nothing
        // away: the sentence it would have thrown out belongs to the read
        // that replaced it - #205.
        //
        // A read that handed the page on is the same case one step along: the
        // sentence it was given has just been re-keyed for the read it handed
        // to, so clearing here would throw away a sentence nothing else will
        // say - #209.
        if (!handedOn) waiting.current = null
      }
    }
  }, [sectionId, page])

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  /**
   * #140 - the list a handler reloads is drawn only if it is still the list the
   * screen is on: nothing tears a handler down, so it asks whether `load` is
   * still the one it was sent with. `frontend/src/pages/Students.js` carries the
   * reasons.
   */
  const onScreen = useRef(load)
  useEffect(() => {
    onScreen.current = load
  }, [load])

  /**
   * The page the pager is on now, for a handler that has to know whether the
   * move it is about to make would cause a read at all - #205. `onScreen`
   * above answers *which* read; this answers *where from*.
   */
  const onPage = useRef(page)
  useEffect(() => {
    onPage.current = page
  }, [page])

  /**
   * The ref that counted the list in front of the person - removed on
   * 19 ตุลาคม 2569 by the owner's answer to #209.
   *
   * It held the count of the list that was **drawn** and the key of the read
   * that drew it, and `confirmRemoval` decided the step back from it. A count
   * of a drawing is stale against the database the moment a second writer
   * commits, with nothing on this screen moving, so no reading here could
   * answer *how many rows has that page now*. The question went to the server,
   * which answers every read with `total`.
   *
   * `docs/lessons.md` §#207 and §#209, `docs/acceptance/14-departments.md`
   * §#207 and §#209 and `mutation/207-the-rows-the-step-back-counts.py`
   * carry the reasoning and which mutants went. `onPage` above stays: the
   * sentence a removal hands over is still keyed for wherever the person now
   * is (#206).
   */

  /**
   * The read a write asks for, which is not always the read `load` would do.
   *
   * A student who has just been enrolled is somewhere in a list sorted by code,
   * and that somewhere is almost never the page the person was looking at when
   * they typed it. Reloading the current page leaves the banner saying somebody
   * was added above a table that does not contain them. Students.js answers the
   * same question the same way: go to the first page, unless that is where we
   * already are, in which case nothing would refetch and the reload has to be
   * asked for directly.
   *
   * It answers whether the caller is the one that draws. Either way the
   * sentence goes to `waiting` keyed on the read of the first page, because
   * that read is what says it and `load` is the one place the keys are
   * compared: #152 for the shape, #205 for the key and for asking which page
   * the pager is on now rather than the one this render closed over.
   */
  const reload = useCallback(
    async said => {
      // The sentence is handed over whichever way this goes, because what
      // says it is the read of the first page, and `load` is where the two
      // are compared - #205.
      const target = readOf(sectionId, 1)
      waiting.current = { of: target, said }
      // The page the pager is on now, not the one this render closed over: a
      // pager pressed while the write was out has moved it, and `setPage(1)`
      // on a screen already showing page one asks for no read at all, so a
      // sentence left for that read would wait for one nobody is going to
      // make. Here the read is done by hand instead, and `onScreen.current`
      // is the loader for the page the person is on.
      if (onPage.current === 1) {
        const drawing = onScreen.current
        return drawing(() => onScreen.current === drawing)
      }
      setPage(1)
      return false
    },
    [sectionId],
  )

  /**
   * Adding one student.
   *
   * The list is reloaded rather than having the new row pushed onto it: the
   * page being shown is a page of ten sorted by code, and a student whose code
   * sorts before the last one on it does not belong at the bottom.
   *
   * Not a marker any more - this draws under the ref below (#141, 19 ตุลาคม
   * 2569). The reason written here on 1 October 2569 - nothing can begin a
   * second enrolment while this is out, the submit button `disabled={busy}`
   * stopping Enter in the field too - a way in, not the population (#179).
   * ถัดไป was pressable for as long as the write was out, and it begins no
   * second enrolment while changing what the read is *of*, which was enough.
   * The owner's answer to #199 on 15 October 2569 closed that way in: this
   * screen's `Pager` is `disabled` for as long as one of its own writes is out.
   * The reload is guarded on its own account (#140); the
   * sentence was not, because `load` answers *the read was not refused* and never
   * *it drew* - it returns `true` from inside its `try` whatever `isCurrent()`
   * says (#152). So the handler asks #146's question itself, with the ref this
   * screen already has. Measured 11 October 2569 (#202)
   */
  const add = async event => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    const sent = onScreen.current
    try {
      const { student } = await enrolStudent(sectionId, code.trim())
      setCode('')
      const said = {
        error: false,
        message: `เพิ่ม ${student.student_id} ${student.full_name_th} เข้าตอนเรียนแล้ว`,
      }
      // `reload` hands back whatever the loader answered, so `HANDED_ON`
      // would read as *it drew* here - the one thing the third answer exists to
      // prevent (#209, and the docstring on `Departments.js`). It cannot
      // arrive: the read this awaits is a read of page 1, and a read of page 1
      // is never told its page has gone, `lastPage` being floored at 1.
      // Structurally unreachable rather than untested (#102, #117) - the day
      // something here awaits a read of a page it did not choose, this answer
      // has to be compared with `HANDED_ON` before it is believed.
      const reloaded = await reload(said)
      if (reloaded && onScreen.current === sent) setNotice(said)
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setNotice(null)
    const sent = onScreen.current
    const student = removing
    try {
      await removeEnrolment(sectionId, student.student_id)
      setRemoving(null)
      const said = {
        error: false,
        message: `นำ ${student.student_id} ${student.full_name_th} ออกจากตอนเรียนแล้ว`,
      }
      // **The owner's answer, 19 ตุลาคม 2569 (#209): this handler no longer
      // decides anything about the page.** The last student on the last page
      // leaves an empty page behind them, which reads as a list that lost
      // everything, and #57's screens step back for that reason - but which
      // page still exists is the server's to say, from the `total` of the read
      // that follows, and not this screen's from a count of what is drawn.
      // `load` asks it and hands the page on when the answer says it has gone.
      // `Departments.js` carries the measurement and what went with `onRows`.
      //
      // The sentence is handed over whichever way that goes, keyed for where
      // the person now is (#206) rather than for the page this render closed
      // over, exactly as `reload` hands over the one for the first page: the
      // read that draws says it, and a refused read says nothing over its own
      // refusal (#152, the owner's decision of 10 October 2569).
      // No marker for `swallowed-refusals.js` any more: since #209 this function
      // says no sentence for that census to ask about, and a marker that
      // outlives the gap it documented is an exemption (#141). The read that
      // draws says the sentence, keyed on itself (#205, #208).
      if (onScreen.current === sent) {
        waiting.current = { of: readOf(sectionId, onPage.current), said }
      }
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
    } catch (error) {
      // The dialog closes either way — CourseOutcomes' reason: leaving it open
      // over a refusal puts the banner behind it and offers a button that
      // cannot do anything different.
      setRemoving(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && !data && (
        <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>
      )}

      {data && (
        <>
          <div>
            <p className="text-xs font-medium text-slate-400">
              {/* label-code: the line above the heading, the one place on this screen
                  that says which section is being read (#93) */}
              {data.section.subject_id} {data.section.subject_name_en}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">
              รายชื่อนักศึกษาของรายวิชา
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              ตอนเรียน {data.section.section_number} · ปีการศึกษา{' '}
              {data.section.academic_year} · นักศึกษา {data.total} คน
            </p>
          </div>

          <form
            onSubmit={add}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-1 text-lg font-medium text-primary">
              เพิ่มนักศึกษาเข้าตอนเรียน
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              กรอกรหัสนักศึกษา 8 หลัก
              นักศึกษาต้องมีอยู่ในทะเบียนนักศึกษากลางแล้ว
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="student_id">
                รหัสนักศึกษา
              </label>
              <input
                id="student_id"
                name="student_id"
                value={code}
                onChange={event => setCode(event.target.value)}
                placeholder="รหัสนักศึกษา"
                className="w-56 rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
              >
                เพิ่มนักศึกษา
              </button>
            </div>
          </form>

          <ImportPanel
            title="นำเข้ารายชื่อนักศึกษา"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกรหัสนักศึกษา แล้วอัปโหลดกลับเข้ามา ทุกรหัสต้องมีอยู่ในทะเบียนนักศึกษากลางแล้ว"
            templateName="section-students-template.csv"
            target={sectionId}
            fetchTemplate={() => importTemplate(sectionId)}
            send={csv => importEnrolments(sectionId, csv)}
            onStart={() => setNotice(null)}
            /* `ImportPanel` calls this with nothing and draws its own per-row
               report, so there is no sentence to hand over and nothing for
               #152's `waiting` to hold. Written out rather than passed by
               reference, because `reload`'s first parameter is now that
               sentence. */
            onImported={() => reload()}
            onError={error => {
              if (!error.expired)
                setNotice({ error: true, message: error.message })
            }}
          />

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* The table scrolls inside its own frame rather than pushing the
                  page sideways — #98, and the จัดการ column is the one that
                  goes out of reach when it does not. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-gray-200 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">รหัสนักศึกษา</th>
                    <th className="px-4 py-3 font-medium">ชื่อ - นามสกุล</th>
                    <th className="px-4 py-3 font-medium">หลักสูตร</th>
                    <th className="px-4 py-3 font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {/* The placeholder is what tells a reader, and the browser
                        seam, that the rows on the screen are not last page's:
                        `e2e/support/pager.js` waits it out before reading a
                        single key, because the request answering and the table
                        redrawing are two different moments. */}
                  {loading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        กำลังโหลด…
                      </td>
                    </tr>
                  )}
                  {!loading && data.students.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        ยังไม่มีนักศึกษาในตอนเรียนนี้
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    data.students.map(student => (
                      <tr
                        key={student.student_id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-4 py-3 text-gray-800">
                          {student.student_id}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {student.full_name_th}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {student.program_name_th ?? student.program_id}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setRemoving(student)}
                            aria-label={`นำ ${student.student_id} ออกจากตอนเรียน`}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <HiOutlineTrash className="h-5 w-5" />
                          </button>
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
              perPage={data.per_page}
              onPage={setPage}
              busy={busy}
              className="border-t border-gray-200 px-4 py-3"
            />
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="นำนักศึกษาออกจากตอนเรียน"
        message={
          removing
            ? `ต้องการนำ ${removing.student_id} ${removing.full_name_th} ออกจากตอนเรียนนี้หรือไม่ ข้อมูลนักศึกษาในทะเบียนกลางจะยังคงอยู่`
            : ''
        }
        confirmLabel="นำออก"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </ContentMotionDIV>
  )
}

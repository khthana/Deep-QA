import { useCallback, useEffect, useRef, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import {
  alsoOutside,
  outsideFilter,
  someImportedOutside,
  SOME_IMPORTED_OUTSIDE,
} from '../lib/outsideTheFilter'
import Pager from '../components/Pager'
import SubjectForm from '../components/subjects/SubjectForm'
import {
  createSubject,
  deleteSubject,
  getSubject,
  importSubjects,
  importTemplate,
  listReachableDepartments,
  listSubjects,
  updateSubject,
} from '../api/subjects'

/**
 * ข้อมูลรายวิชา — ticket #16.
 *
 * The catalogue of what the faculty teaches. A subject is a teachable unit with
 * a code, a credit count and a description, and it exists on its own: putting
 * one into a หลักสูตร is รายวิชาในหลักสูตร (#18) and teaching it in a term is
 * การเปิดรายวิชา (#23). Neither appears here.
 *
 * The ผู้ดูแลภาควิชา owns it alone. #61 settled what #16 left open: a subject
 * is what a department teaches, so the department that teaches it maintains it,
 * and the ผู้ดูแลระดับคณะ does not reach this screen at all — not to write and
 * not to read. That is enforced at the server and not by this file, as
 * ADR-0002 asks; what the menu leaves out is a convenience, and what arrives
 * here is simply what that account may see. The Central Admin reaches none of
 * it either.
 *
 * What this screen has that ข้อมูลหลักสูตร does not is a filter by department,
 * which the ticket asks for. Since #61 every account that reaches the screen
 * reaches one department, so what it draws is the name rather than a dropdown —
 * the row is always there, so the screen says which catalogue is being read no
 * matter who is reading it, and nobody is handed a control whose every option
 * returns the same rows. The dropdown it falls back from is kept rather than
 * deleted: it is the same control รายวิชาในหลักสูตร draws live, and a grant
 * covering two departments would need it back. It narrows within the account's
 * reach and cannot widen it either way.
 *
 * The list shows retired subjects as well as current ones, deliberately: this
 * is the screen one is switched back on from. Removing one asks first, and may
 * come back having done something else — a subject nothing points at is
 * deleted, one that a รายวิชาในหลักสูตร or an Offering points at is switched
 * off instead, and the banner says which happened.
 */

const PAGE_SIZE = 10

/**
 * What a read of this list is *of*, which is what a sentence handed to
 * `waiting` names - #205. `Departments.js` carries the reasons.
 */
const readOf = (page, department) => `${page}:${department}`

/**
 * `load`'s third answer - #209. `Departments.js` carries the reasons: a read
 * that is told the page it asked for no longer exists has neither drawn nor
 * been refused, and a caller with a sentence hands it over rather than saying
 * it over a page about to be replaced.
 */
const HANDED_ON = 'handed-on'

export default function Subjects() {
  const [page, setPage] = useState(1)
  const [department, setDepartment] = useState('')
  const [data, setData] = useState({ subjects: [], total: 0 })
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  /**
   * A write holds `writing` and a read holds `reading`, and a read puts down
   * only its own - #142. `Departments.js` carries the reasons.
   */
  const [writing, setWriting] = useState(false)
  const [reading, setReading] = useState(false)
  const busy = writing || reading

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
   * #68 - the answer that is drawn is the answer to the request the screen is
   * still on; without the flag the answer that **arrives** last wins rather
   * than the one asked for last. The rule, the three rows that prove it, and
   * why fifteen panels repeat it rather than share one hook, are written on
   * `frontend/src/pages/Students.js`.
   */
  const load = useCallback(async isCurrent => {
    // Which read this is, for the sentence that may be waiting for it - #205.
    const key = readOf(page, department)
    setLoading(true)
    // Whether this read handed the page on rather than drawing it - #209. The
    // sentence that was waiting for it belongs to the read that follows, so the
    // `finally` below must not clear it.
    let handedOn = false
    try {
      const answer = await listSubjects({ page, per_page: PAGE_SIZE, department_id: department })
      if (isCurrent()) {
        // #209 - the owner's answer of 19 ตุลาคม 2569: whether the page the
        // person is on still exists is the server's to say, not this screen's,
        // and the answer carries `total`. Paged by the size the server says it
        // used, because a mutant that swaps that for `PAGE_SIZE` is invisible
        // wherever the two agree (#117). Nothing is drawn in that case:
        // drawing it would paint an empty page and the sentence over it before
        // the correction lands. `Departments.js` carries the measurement.
        const size = answer.per_page || PAGE_SIZE
        const lastPage = Math.max(1, Math.ceil(answer.total / size))
        if (answer.page > lastPage) {
          handedOn = true
          if (waiting.current && waiting.current.of === key) {
            waiting.current = { of: readOf(lastPage, department), said: waiting.current.said }
          }
          setPage(lastPage)
          return HANDED_ON
        }
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
        //
        // A read that handed the page on is the same case one step along: the
        // sentence it was given has just been re-keyed for the read it handed
        // to, so clearing here would throw away a sentence nothing else will
        // say - #209.
        // #246, 29 ตุลาคม 2569 - unless it is held for a form to close,
        // the one case where a landed read has drawn nothing to put a sentence
        // over. The effect beside `formShown` owns a held one from here on.
        if (!handedOn && !waiting.current?.held) waiting.current = null
      }
    }
  }, [page, department, report])

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
   * Whether a form is drawn in place of the list, readable after an await -
   * #246, 29 ตุลาคม 2569.
   *
   * The return below draws the form **or** the table and never both, so a read
   * that lands while one is open has drawn nothing a waiting sentence is about,
   * and the sentence waits for a list to be true of. `load` cannot read
   * `editing` itself: in its dependency list it would rebuild the loader at
   * every press of the opener and the effect above would fetch the list again
   * for each one, and out of the list the closure would see the first render's
   * value (#201). So it is mirrored into a ref the way `onScreen` mirrors
   * `load` just above. `frontend/src/pages/Plos.js` carries the measurement the
   * owner's answer rests on and what this ref is *of* (#185, #207).
   */
  const formShown = useRef(false)
  useEffect(() => {
    formShown.current = Boolean(editing)
  }, [editing])

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
    if (editing) return
    const held = waiting.current
    if (!held?.held) return
    if (held.of === readOf(page, department)) setNotice(held.said)
    waiting.current = null
  }, [editing, page, department])

  /**
   * The page the pager is on now - #206. A removal steps the page back only
   * while the pager is still on the page that lost its last row; `onScreen`
   * above answers which read, this answers where from.
   * `frontend/src/pages/Departments.js` carries the reasons and the
   * measurement.
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

  // The departments in reach, fetched once: what this account covers is a
  // property of the grant and does not change with the page being looked at.
  // Used three times — to name the department each row sits in, as the pool the
  // form's picker draws from, and as the filter's options.
  useEffect(() => {
    let cancelled = false
    listReachableDepartments()
      .then(({ departments: reachable }) => {
        if (!cancelled) setDepartments(reachable)
      })
      .catch(report)
    return () => {
      cancelled = true
    }
  }, [report])

  const nameOf = departmentId =>
    departments.find(entry => entry.department_id === departmentId)?.department_name_th ??
    departmentId

  /**
   * Which press of แก้ไข the form was last asked for - #139. แก้ไข makes a new
   * ask, and เพิ่มรายวิชา, ลบ and the import say none; a read overtaken by any of them
   * draws neither its form nor its refusal, though the list is still reloaded.
   * `Departments.js` carries the reasons.
   */
  const asked = useRef(null)

  /**
   * The last thing that opened on this screen - #146. เพิ่มรายวิชา writes it and
   * so does แก้ไข, at the press; ยกเลิก does not, and neither does the save that
   * closes its own form. A save whose answer finds a different opening closes
   * nothing and says nothing, neither its banner nor its refusal; one that finds
   * nothing in its place says what it did. `Departments.js` carries the reasons.
   */
  const showing = useRef(null)

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async subject => {
    const ask = {}
    asked.current = ask
    // Written at the press and not where the read lands: pressing แก้ไข is
    // what takes the form on the screen away, and it happens a round trip
    // before the form it opens arrives. ยกเลิก writes nothing now, so a
    // save held across that window would otherwise still find its own
    // opening and put its sentence over the form about to be drawn.
    showing.current = ask
    setNotice(null)
    setReading(true)
    try {
      const { subject: current } = await getSubject(subject.subject_id)
      if (asked.current === ask) setEditing(current)
    } catch (error) {
      if (asked.current === ask) report(error)
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
    } finally {
      setReading(false)
    }
  }

  const save = async draft => {
    const sent = showing.current
    setWriting(true)
    try {
      if (editing?.subject_id) {
        await updateSubject(editing.subject_id, draft)
      } else {
        await createSubject(draft)
      }
      // #247, 29 ตุลาคม 2569 - the owner's answer ข้อ จ. The ภาควิชา field is open
      // on an add and on an edit (it carries only `sending`), so a subject can be
      // written into a department the table is not filtered to.
      // `lib/outsideTheFilter.js` carries the measured population.
      const outside = outsideFilter(department, draft.department_id)
      const said = { error: false, message: alsoOutside('บันทึกข้อมูลเรียบร้อยแล้ว', outside) }
      if (showing.current === sent) setEditing(null)
      // #203 - the sentence waits for the read that draws it, and #209 has it
      // handed over before the await: only `load` learns that the page has gone
      // past the end, and only `load` can re-key the sentence for the read it
      // hands to. `Departments.js` carries the reasons.
      if (showing.current === sent) {
        waiting.current = { of: readOf(onPage.current, department), said }
      }
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
    } catch (error) {
      if (showing.current === sent) report(error)
    } finally {
      setWriting(false)
    }
  }

  // The sentence belongs to the screen that was asked - #202, the rule `save`
  // above has followed since #146. `Departments.js` carries the reasons, and
  // only the sentence is asked about: the dialog closes, the page steps back and
  // the list is reloaded whichever way the comparison goes (#131).
  const confirmRemoval = async () => {
    const sent = showing.current
    setWriting(true)
    try {
      const answer = await deleteSubject(removing.subject_id)
      const deactivated = Boolean(answer?.deactivated)
      setRemoving(null)
      const said = {
        error: false,
        message: deactivated
          ? 'รายวิชานี้มีข้อมูลอื่นอ้างอิงอยู่ ระบบจึงปิดการใช้งานแทนการลบ ข้อมูลเดิมยังเรียกดูได้'
          : 'ลบรายวิชาเรียบร้อยแล้ว',
      }
      // The last row of the last page having gone, staying on that page shows an
      // empty table and reads as "there are none". Stepping back is a change of
      // page and the effect fetches it; calling `load` here as well would race
      // it with a second request for the page just left. A deactivation removes
      // nothing from the list, so it never steps back.
      // #207 - how many rows the page this removal was sent from was showing. The
      // live ref answers that only while the pager is still on it; once the
      // person has moved, the list in front of them is another page's and the
      // render's own count is the only reading of the page they left there is.
      // `Departments.js` carries the reasons.
      // **The owner's answer, 19 ตุลาคม 2569 (#209): this handler no longer
      // decides anything about the page.** It re-reads the page the person is
      // standing on, and `load` asks the server the one question that is
      // answerable there - *does the page I asked for still exist* - handing
      // the page on when it does not. A deactivation needs no clause of
      // its own any more: it takes nothing out of the list, so the page it was
      // sent from is still there and nobody moves. `Departments.js` carries the
      // measurement and what went with `onRows`.
      //
      // The sentence is therefore always handed over rather than said here:
      // the read that draws the list says it, keyed on that read, and if that
      // read is refused the refusal wins and `load` clears it (the owner's
      // decision of 10 October 2569, #152).
      // No marker for `swallowed-refusals.js` any more: since #209 this function
      // says no sentence for that census to ask about, and a marker that
      // outlives the gap it documented is an exemption (#141). The read that
      // draws says the sentence, keyed on itself (#205, #208).
      if (showing.current === sent) {
        waiting.current = { of: readOf(onPage.current, department), said }
      }
      const reader = onScreen.current
      await reader(() => onScreen.current === reader)
    } catch (error) {
      setRemoving(null)
      report(error)
    } finally {
      setWriting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Notice notice={notice} />

      {editing ? (
        <SubjectForm
          value={editing}
          departments={departments}
          busy={busy}
          onSave={save}
          onCancel={() => {
            // ยกเลิก does not write this: a form closing is nobody taking the
            // screen, and a save still out is owed its sentence (#146).
            setNotice(null)
            setEditing(null)
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-medium text-primary">ข้อมูลรายวิชา</h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* A picker when there is a choice to make, and a statement of
                  where one is when there is not. A department administrator
                  reaches one department: a dropdown whose two options - "ทุก
                  ภาควิชา" and their own - return the same rows would be a control
                  that does nothing, and leaving it out entirely would take the
                  answer to "which catalogue am I reading?" off the screen. So
                  the label stays and only the control it carries changes. */}
              {departments.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  ภาควิชา
                  <select
                    value={department}
                    onChange={event => {
                      // Back to the first page: page 3 of the faculty's
                      // catalogue is rarely a page of one department's.
                      setPage(1)
                      setDepartment(event.target.value)
                    }}
                    className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                  >
                    <option value="">ทุกภาควิชา</option>
                    {departments.map(entry => (
                      <option key={entry.department_id} value={entry.department_id}>
                        {entry.department_name_th}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                departments.length === 1 && (
                  <span className="flex items-center gap-2 text-sm text-slate-600">
                    ภาควิชา
                    <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                      {departments[0].department_name_th}
                    </span>
                  </span>
                )
              )}
              <button
                type="button"
                onClick={() => {
                  asked.current = null
                  showing.current = {}
                  setNotice(null)
                  setEditing({})
                }}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
              >
                เพิ่มรายวิชา
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสวิชา</th>
                  <th className="px-4 py-3">ชื่อวิชา</th>
                  <th className="px-4 py-3">หน่วยกิต</th>
                  <th className="px-4 py-3">ภาควิชา</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      กำลังโหลด…
                    </td>
                  </tr>
                )}
                {!loading && data.subjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      {department ? 'ยังไม่มีรายวิชาในภาควิชานี้' : 'ยังไม่มีรายวิชาในระบบ'}
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.subjects.map(subject => (
                    <tr key={subject.subject_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{subject.subject_id}</td>
                      <td className="px-4 py-3">
                        {subject.subject_name_th}
                        <span className="block text-xs text-slate-500">
                          {subject.subject_name_en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{subject.credits}</td>
                      <td className="px-4 py-3 text-slate-500">{nameOf(subject.department_id)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            subject.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {subject.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(subject)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            asked.current = null
                            setNotice(null)
                            setRemoving(subject)
                          }}
                          className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50"
                        >
                          ลบ
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
            perPage={PAGE_SIZE}
            onPage={setPage}
            busy={busy}
          />

          <ImportPanel
            title="นำเข้ารายวิชาจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย"
            templateName="subjects-template.csv"
            target="subjects"
            fetchTemplate={importTemplate}
            send={importSubjects}
            onImported={result => {
              // #252, 30 ตุลาคม 2569 - the owner's answer ข้อ ง. The rows a file
              // makes take their keys from the file, so an import writes outside
              // this table's filter exactly as an *add* does, and the panel's own
              // green line is in another module and says nothing about it. The
              // screen is the only place that knows what its table is filtered
              // to, so the screen says it, out of the answer the panel now hands
              // over. Handed to `load` rather than said here, which is the rule
              // the save above follows (#238, #203): the sentence is keyed for
              // the list it is about - page one, where the reload is going - and
              // `load` is the only thing that says it.
              const outside = someImportedOutside(
                department,
                result?.subjects?.map(row => row.department_id),
              )
              if (outside) {
                waiting.current = {
                  of: readOf(1, department),
                  said: { error: false, message: SOME_IMPORTED_OUTSIDE },
                }
              }
              // Going to page one is a change the effect fetches; asking `load`
              // as well would ask from the page being left, and the two answers
              // would race - #68. Only the branch already on page one, where
              // nothing refetches, reloads by hand.
              const drawing = onScreen.current
              if (page === 1) drawing(() => onScreen.current === drawing)
              else setPage(1)
            }}
            onStart={() => {
              asked.current = null
              setNotice(null)
            }}
            onError={report}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ยืนยันการลบรายวิชา"
        message={
          removing
            // label-code: the question names the record about to be destroyed, where two of them
            // sharing a name is the whole reason the code is in the sentence (#93)
            ? `ต้องการลบรายวิชา ${removing.subject_id} ${removing.subject_name_th} ใช่หรือไม่ หากมีหลักสูตรหรือการเปิดสอนอ้างอิงอยู่ ระบบจะปิดการใช้งานให้แทนการลบ`
            : ''
        }
        confirmLabel="ลบรายวิชา"
        busy={busy}
        onConfirm={confirmRemoval}
        onCancel={() => {
          setNotice(null)
          setRemoving(null)
        }}
      />
    </div>
  )
}

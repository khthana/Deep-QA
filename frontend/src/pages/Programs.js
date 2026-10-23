import { useCallback, useEffect, useRef, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import Pager from '../components/Pager'
import ProgramForm from '../components/programs/ProgramForm'
import { useScreenGeneration } from '../context/ScreenGeneration'
import {
  createProgram,
  deleteProgram,
  getProgram,
  importPrograms,
  importTemplate,
  listPrograms,
  listReachableDepartments,
  updateProgram,
} from '../api/programs'

/**
 * ข้อมูลหลักสูตร — ticket #15.
 *
 * The degree curricula a department offers. The first screen two roles share:
 * the faculty administrator sees every department's, the department
 * administrator sees their own. Neither of them is told so by this file - the
 * server filters the list and refuses the writes, and what arrives is simply
 * what that account may see (ADR-0002). The Central Admin reaches none of it.
 *
 * The paging is server-side, as on ข้อมูลผู้ใช้งาน and ข้อมูลภาควิชา.
 *
 * The list shows retired programmes as well as current ones, deliberately: this
 * is the screen one is switched back on from, and a management list that hid
 * them would make retiring a programme a one-way door. The screens that ask a
 * person to *pick* a programme are the ones that hide them, with `active=1`.
 *
 * Removing one asks first, and may come back having done something else. A
 * programme nothing points at is deleted; a programme with PLOs, รายวิชาใน
 * หลักสูตร, students or graded work behind it is switched off instead, and the
 * banner says which happened. Telling the person "ลบแล้ว" for a record that is
 * still in the table would be a lie they then act on.
 */

const PAGE_SIZE = 10

/**
 * What a read of this list is *of*, which is what a sentence handed to
 * `waiting` names - #205. `Departments.js` carries the reasons.
 */
const readOf = page => `${page}`

/**
 * `load`'s third answer - #209. `Departments.js` carries the reasons: a read
 * that is told the page it asked for no longer exists has neither drawn nor
 * been refused, and a caller with a sentence hands it over rather than saying
 * it over a page about to be replaced.
 */
const HANDED_ON = 'handed-on'

export default function Programs() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ programs: [], total: 0 })
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

  // Which generation of its data this screen is drawn from - #198. A switch of
  // hats that lands where the router already is raises it in `MainPage`, and
  // this screen reads its list again instead of being unmounted, so the page
  // and a curriculum typed into the form but not yet saved both survive the
  // switch.
  // `context/ScreenGeneration.js` carries why #155's remount was narrowed.
  const generation = useScreenGeneration()

  /**
   * #68 - the answer that is drawn is the answer to the request the screen is
   * still on; without the flag the answer that **arrives** last wins rather
   * than the one asked for last. The rule, the three rows that prove it, and
   * why fifteen panels repeat it rather than share one hook, are written on
   * `frontend/src/pages/Students.js`.
   */
  const load = useCallback(async isCurrent => {
    // Which read this is, for the sentence that may be waiting for it - #205.
    const key = readOf(page)
    setLoading(true)
    // Whether this read handed the page on rather than drawing it - #209. The
    // sentence that was waiting for it belongs to the read that follows, so the
    // `finally` below must not clear it.
    let handedOn = false
    try {
      const answer = await listPrograms({ page, per_page: PAGE_SIZE })
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
            waiting.current = { of: readOf(lastPage), said: waiting.current.said }
          }
          setPage(lastPage)
          return HANDED_ON
        }
        setData(answer)
        if (waiting.current && waiting.current.of === key) {
          setNotice(waiting.current.said)
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
        if (!handedOn) waiting.current = null
      }
    }
    // `generation` is in this list and read nowhere in the body on purpose:
    // what it changes is *when* this read happens, not what is asked for, so
    // the rule below sees a dependency it cannot account for - #198.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, report, generation])

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

  // The departments in reach: what this account covers is a property of the
  // grant and does not change with the page being looked at - but it does
  // change with the grant, so this read names the generation too (#198). Used
  // twice - to name the department each row sits in, and as the pool the form's
  // picker draws from - so a list left at the old hat's names rows wrongly as
  // well as offering the wrong choice. `Rubrics.js` carries the same pair for
  // curricula and is where the browser seam proves it (#68, #171).
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
    // `generation` is not read in the body, so the rule calls it unnecessary;
    // it is the reason to ask again, and `context/ScreenGeneration.js` says
    // why that is a dependency here rather than an effect of its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, generation])

  const nameOf = departmentId =>
    departments.find(department => department.department_id === departmentId)
      ?.department_name_th ?? departmentId

  /**
   * Which press of แก้ไข the form was last asked for - #139. แก้ไข makes a new
   * ask, and เพิ่มหลักสูตร, ลบ and the import say none; a read overtaken by any of them
   * draws neither its form nor its refusal, though the list is still reloaded.
   * `Departments.js` carries the reasons.
   */
  const asked = useRef(null)

  /**
   * The last thing that opened on this screen - #146. เพิ่มหลักสูตร writes it and
   * so does แก้ไข, at the press; ยกเลิก does not, and neither does the save that
   * closes its own form. A save whose answer finds a different opening closes
   * nothing and says nothing, neither its banner nor its refusal; one that finds
   * nothing in its place says what it did. `Departments.js` carries the reasons.
   */
  const showing = useRef(null)

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async program => {
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
      const { program: current } = await getProgram(program.program_id)
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
      if (editing?.program_id) {
        await updateProgram(editing.program_id, draft)
      } else {
        await createProgram(draft)
      }
      const said = { error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' }
      if (showing.current === sent) setEditing(null)
      // #203 - the sentence waits for the read that draws it, and #209 has it
      // handed over before the await: only `load` learns that the page has gone
      // past the end, and only `load` can re-key the sentence for the read it
      // hands to. `Departments.js` carries the reasons.
      if (showing.current === sent) {
        waiting.current = { of: readOf(onPage.current), said }
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
      const answer = await deleteProgram(removing.program_id)
      const deactivated = Boolean(answer?.deactivated)
      setRemoving(null)
      const said = {
        error: false,
        message: deactivated
          ? 'หลักสูตรนี้มีข้อมูลอื่นอ้างอิงอยู่ ระบบจึงปิดการใช้งานแทนการลบ ข้อมูลเดิมยังเรียกดูได้'
          : 'ลบหลักสูตรเรียบร้อยแล้ว',
      }
      // **The owner's answer, 19 ตุลาคม 2569 (#209): this handler no longer
      // decides anything about the page.** It re-reads the page the person is
      // standing on, and `load` asks the server the one question that is
      // answerable there - *does the page I asked for still exist* - handing
      // the page on when it does not. A deactivation needs no clause of its
      // own any more: it takes nothing out of the list, so the page it was sent
      // from is still there and nobody moves. `Departments.js` carries the
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
        waiting.current = { of: readOf(onPage.current), said }
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
        <ProgramForm
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
            <h1 className="text-lg font-medium text-primary">ข้อมูลหลักสูตร</h1>
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
              เพิ่มหลักสูตร
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสหลักสูตร</th>
                  <th className="px-4 py-3">ชื่อหลักสูตร</th>
                  <th className="px-4 py-3">ภาควิชา</th>
                  <th className="px-4 py-3">ปีหลักสูตร</th>
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
                {!loading && data.programs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีหลักสูตรในระบบ
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.programs.map(program => (
                    <tr key={program.program_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{program.program_id}</td>
                      <td className="px-4 py-3">
                        {program.program_name_th}
                        {program.program_name_en && (
                          <span className="block text-xs text-slate-500">
                            {program.program_name_en}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {nameOf(program.department_id)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{program.revision_year ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            program.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {program.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(program)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            asked.current = null
                            setNotice(null)
                            setRemoving(program)
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
            title="นำเข้าหลักสูตรจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย"
            templateName="programs-template.csv"
            target="programs"
            fetchTemplate={importTemplate}
            send={importPrograms}
            onImported={() => {
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
        title="ยืนยันการลบหลักสูตร"
        message={
          removing
            // label-code: the question names the record about to be destroyed, where two of them
            // sharing a name is the whole reason the code is in the sentence (#93)
            ? `ต้องการลบหลักสูตร ${removing.program_id} ${removing.program_name_th} ใช่หรือไม่ หากมี PLO รายวิชาในหลักสูตร นักศึกษา หรือผลการเรียนอ้างอิงอยู่ ระบบจะปิดการใช้งานให้แทนการลบ`
            : ''
        }
        confirmLabel="ลบหลักสูตร"
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

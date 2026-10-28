import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import ConfirmDialog from '../components/ConfirmDialog'
import Notice from '../components/Notice'
import Pager from '../components/Pager'
import RubricForm from '../components/rubrics/RubricForm'
import { useScreenGeneration } from '../context/ScreenGeneration'
import {
  createRubric,
  deleteRubric,
  getRubric,
  listRubrics,
  listReachablePrograms,
  updateRubric,
} from '../api/rubrics'

/**
 * ข้อมูล Rubric กลาง — ticket #21.
 *
 * The scales a หลักสูตร marks against, so that two Teachers assessing the same
 * kind of work assess it the same way. The screen belongs to the
 * กรรมการหลักสูตร; the ผู้ดูแลภาควิชา above them reaches it too, over the
 * curricula they hold, and neither is told so by this file — the server filters
 * the list and refuses the writes, and what arrives is simply what that account
 * may see (ADR-0002).
 *
 * Three things about this screen are decisions rather than habit.
 *
 * *A rubric code is unique across the institution.* This is the opposite of the
 * ผลการเรียนรู้ screen, where the whole ticket is that two curricula may each
 * hold a PLO-1. The paragraph under the heading says so, and the form's hint
 * says so again, because the alternative is a person meeting a 409 about a
 * rubric that belongs to a curriculum they cannot see and concluding the screen
 * is broken.
 *
 * *The criteria are a link, not a column of this screen.* The four-level
 * weighted criteria are `rubric_details` and belong to #22. What this screen
 * owes the ticket's fifth criterion is a way in, and what it owes the person is
 * the number — a rubric with no criteria marks nothing, and that is worth
 * seeing from the list rather than after a click.
 *
 * *Removing is final, and the confirmation says how final.* Every other
 * master-data screen may come back having switched a row off instead; there is
 * no such column here and nothing points at a rubric except its own criteria,
 * which CASCADE. So the dialog names the criteria that are about to go, and the
 * banner afterwards says how many did.
 */

const PAGE_SIZE = 10

/**
 * What a read of this list is *of*, which is what a sentence handed to
 * `waiting` names - #205. `Departments.js` carries the reasons.
 */
const readOf = (page, program) => `${page}:${program}`

/**
 * `load`'s third answer - #209. `Departments.js` carries the reasons: a read
 * that is told the page it asked for no longer exists has neither drawn nor
 * been refused, and a caller with a sentence hands it over rather than saying
 * it over a page about to be replaced.
 */
const HANDED_ON = 'handed-on'

export default function Rubrics() {
  const [page, setPage] = useState(1)
  const [program, setProgram] = useState('')
  const [data, setData] = useState({ rubrics: [], total: 0 })
  const [programs, setPrograms] = useState([])
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
  // this screen reads its list again instead of being unmounted, so the page,
  // the curriculum filter and a rubric typed into the form but not yet saved
  // all survive the switch.
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
    const key = readOf(page, program)
    setLoading(true)
    // Whether this read handed the page on rather than drawing it - #209. The
    // sentence that was waiting for it belongs to the read that follows, so the
    // `finally` below must not clear it.
    let handedOn = false
    try {
      const answer = await listRubrics({ page, per_page: PAGE_SIZE, program_id: program })
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
            waiting.current = { of: readOf(lastPage, program), said: waiting.current.said }
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
  }, [page, program, report, generation])

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

  // The curricula in reach: what this account covers is a property of the
  // grant and does not change with the page being looked at - but it does
  // change with the grant, so this read names the generation as well as the
  // list below does (#198). Until 23 ตุลาคม 2569 it was fetched once, which was
  // true while a switch that stayed put remounted the screen; with the remount
  // gone, the statement of which curriculum this screen is in and the pool the
  // form's picker draws from would have stayed the old hat's until a reload.
  useEffect(() => {
    let cancelled = false
    listReachablePrograms()
      .then(({ programs: reachable }) => {
        if (!cancelled) setPrograms(reachable)
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

  const nameOf = programId =>
    programs.find(entry => entry.program_id === programId)?.program_name_th ?? programId

  /**
   * Which press of แก้ไข the form was last asked for - #139. แก้ไข makes a new
   * ask, and เพิ่ม Rubric and ลบ say none; a read overtaken by any of them
   * draws neither its form nor its refusal, though the list is still reloaded.
   * `Departments.js` carries the reasons.
   */
  const asked = useRef(null)

  /**
   * The last thing that opened on this screen - #146, arriving here with #202.
   *
   * เพิ่ม Rubric and แก้ไข write it, แก้ไข at the press for #139's reason;
   * ยกเลิก and ลบ do not. What needs it here is `confirmRemoval`: the question
   * `ConfirmDialog` asks trapped no focus until 18 ตุลาคม 2569 (#204, contained by #217
   * that day), so both of those controls answered to Enter from under it while
   * the removal was out, and are an ordinary click after ยกเลิก since. `Plos.js` carries why this
   * screen had no such ref until now, and `Departments.js` the reasons.
   */
  const showing = useRef(null)

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async rubric => {
    const ask = {}
    asked.current = ask
    showing.current = ask
    setNotice(null)
    setReading(true)
    try {
      const { rubric: current } = await getRubric(rubric.id)
      if (asked.current === ask) setEditing(current)
    } catch (error) {
      if (asked.current === ask) report(error)
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
    } finally {
      setReading(false)
    }
  }

  /**
   * The same question `confirmRemoval` asks, and since #242 it is asked here
   * too - 28 ตุลาคม 2569. Until this ticket `RubricForm` gave ยกเลิก
   * `disabled={busy}`, so nothing could take the screen while a save was out
   * and the guard would have been a clause no row could reach (#97, measured
   * 11 October 2569 for #202). `Plos.js` carries the reasons and the condition
   * that expired.
   */
  const save = async draft => {
    const sent = showing.current
    setWriting(true)
    try {
      if (editing?.id) await updateRubric(editing.id, draft)
      else await createRubric(draft)
      if (showing.current === sent) setEditing(null)
      // No marker for `sentences-after-a-move.js` any more: since #209 this
      // function says no sentence after its await to ask about, and a marker
      // that outlives the gap it documented is an exemption (#141). What that
      // marker claimed - that nothing can take the screen while this save is
      // out - stopped being true on 28 ตุลาคม 2569, which is why the lines
      // below ask (#242).
      const said = { error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' }
      // #203 - the sentence waits for the read that draws it, and #209 has it
      // handed over before the await: only `load` learns that the page has gone
      // past the end, and only `load` can re-key the sentence for the read it
      // hands to, which is what the read compares (#205). `Departments.js`
      // carries the reasons.
      // #242 - and only if the screen is still the one that asked. The key
      // answers *which page and which curriculum this sentence is about* and
      // not *was this form replaced by another one*, both being the same on
      // either side of a ยกเลิก (#205, #207).
      if (showing.current === sent) {
        waiting.current = { of: readOf(onPage.current, program), said }
      }
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
    } catch (error) {
      if (showing.current === sent) report(error)
    } finally {
      setWriting(false)
    }
  }

  // The sentence belongs to the screen that was asked - #202. Only the sentence
  // is asked about: the dialog closes, the page steps back and the list is
  // reloaded whichever way the comparison goes (#131). `Departments.js` carries
  // the reasons.
  const confirmRemoval = async () => {
    const sent = showing.current
    setWriting(true)
    try {
      const answer = await deleteRubric(removing.id)
      const removedCriteria = Number(answer?.criteria_removed ?? 0)
      setRemoving(null)
      const said = {
        error: false,
        message: removedCriteria
          ? `ลบ Rubric เรียบร้อยแล้ว พร้อมเกณฑ์การให้คะแนน ${removedCriteria} ข้อที่อยู่ใต้ Rubric นี้`
          : 'ลบ Rubric เรียบร้อยแล้ว',
      }
      // The last row of the last page having gone, staying on that page shows an
      // empty table and reads as "there are none". Stepping back is a change of
      // page and the effect fetches it; calling `load` here as well would race
      // it with a second request for the page just left.
      // #207 - how many rows the page this removal was sent from was showing. The
      // live ref answers that only while the pager is still on it; once the
      // person has moved, the list in front of them is another page's and the
      // render's own count is the only reading of the page they left there is.
      // `Departments.js` carries the reasons.
      // **The owner's answer, 19 ตุลาคม 2569 (#209): this handler no longer
      // decides anything about the page.** It re-reads the page the person is
      // standing on, and `load` asks the server the one question that is
      // answerable there - *does the page I asked for still exist* - handing
      // the page on when it does not. `Departments.js` carries the
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
        waiting.current = { of: readOf(onPage.current, program), said }
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
        <RubricForm
          value={editing}
          programs={programs}
          defaultProgram={program}
          busy={busy}
          onSave={save}
          onCancel={() => {
            setNotice(null)
            setEditing(null)
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-medium text-primary">ข้อมูล Rubric กลาง</h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* A picker when there is a choice to make, and a statement of
                  where one is when there is not — ผลการเรียนรู้ระดับหลักสูตร's
                  control, for its reasons. A กรรมการหลักสูตร reaches one
                  curriculum and is shown which. */}
              {programs.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  หลักสูตร
                  <select
                    value={program}
                    onChange={event => {
                      // Back to the first page: page 2 of both curricula's
                      // rubrics is rarely page 2 of one of them.
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
              ) : (
                programs.length === 1 && (
                  <span className="flex items-center gap-2 text-sm text-slate-600">
                    หลักสูตร
                    <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                      {programs[0].program_name_th}
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
                เพิ่ม Rubric
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            รหัส Rubric ห้ามซ้ำกันทั้งระบบ ต่างจากรหัสผลการเรียนรู้ระดับหลักสูตรที่ซ้ำข้ามหลักสูตรได้
            รายการเรียงตามลำดับที่ตั้งไว้ และลำดับที่เท่ากันจะเรียงตามรหัส
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัส</th>
                  <th className="px-4 py-3">ชื่อ Rubric</th>
                  <th className="px-4 py-3">ลำดับ</th>
                  <th className="px-4 py-3">เกณฑ์การให้คะแนน</th>
                  <th className="px-4 py-3">หลักสูตร</th>
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
                {!loading && data.rubrics.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มี Rubric ในหลักสูตรนี้
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.rubrics.map(rubric => (
                    <tr key={rubric.id}>
                      {/* The code leads the row because it is this table's
                          natural key, as the code does on every other
                          master-data screen - and because the paging helper the
                          browser seam shares reads the first cell of each row
                          as the key that tells two pages apart. ลำดับ could not
                          do that job: two rubrics may hold the same one. */}
                      <td className="px-4 py-3 font-bold text-gray-900">{rubric.rubric_code}</td>
                      <td className="px-4 py-3">
                        {rubric.rubric_name_th}
                        <span className="block text-xs text-slate-500">
                          {rubric.rubric_name_en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{rubric.display_order}</td>
                      <td className="px-4 py-3">
                        {/* The fifth criterion. The count is here rather than
                            behind the click because a rubric with none marks
                            nothing, and that is worth seeing from the list. */}
                        <Link
                          to={`/main/rubrics/${rubric.id}/criteria`}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          {rubric.criteria_count > 0
                            ? `ดูเกณฑ์ ${rubric.criteria_count} ข้อ`
                            : 'ยังไม่มีเกณฑ์ — กำหนดเกณฑ์'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{nameOf(rubric.program_id)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(rubric)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            asked.current = null
                            setNotice(null)
                            setRemoving(rubric)
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
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ยืนยันการลบ Rubric"
        message={
          removing
            ? `ต้องการลบ Rubric ${removing.rubric_code} ${removing.rubric_name_th} ใช่หรือไม่ ${
                removing.criteria_count > 0
                  ? `เกณฑ์การให้คะแนน ${removing.criteria_count} ข้อที่อยู่ใต้ Rubric นี้จะถูกลบไปด้วย และ`
                  : ''
              }การลบนี้ย้อนกลับไม่ได้`
            : ''
        }
        confirmLabel="ลบ Rubric"
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

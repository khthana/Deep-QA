import { useCallback, useEffect, useRef, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import { OUTCOME_TYPES } from '../lib/outcomes'
import Notice from '../components/Notice'
import PloForm from '../components/plos/PloForm'
import {
  createPlo,
  deletePlo,
  getPlo,
  listPlos,
  listReachablePrograms,
  updatePlo,
} from '../api/plos'

/**
 * ผลการเรียนรู้ระดับหลักสูตร (PLO) — ticket #19.
 *
 * What a graduate of a หลักสูตร can do, as a tree of ข้อหลัก and their ข้อย่อย.
 * The screen belongs to the กรรมการหลักสูตร; the ผู้ดูแลภาควิชา above them
 * reaches it too, over the curricula they hold, and neither is told so by this
 * file — the server filters the list and refuses the writes, and what arrives
 * is simply what that account may see (ADR-0002).
 *
 * Four things about this screen are decisions rather than habit.
 *
 * *There is no pager.* Every other master-data screen has one and this one
 * deliberately does not: a ข้อย่อย on page two whose ข้อหลัก is on page one is
 * not a tree, and no arrangement of the rows on this side puts it back
 * together. The whole set for the chosen curriculum arrives at once.
 *
 * *A curriculum is always chosen, and that is #101.* The picker used to offer
 * ทุกหลักสูตร and the screen then drew both trees end to end — on the seed
 * 56 rows in one scroll, the second curriculum starting at row 53, and every
 * one of its four รหัส already used above it by the first, because a code is
 * unique inside its หลักสูตร and nowhere wider. With no pager there was
 * not even a หน้า 1 จาก 6 to say that anything followed. Two rows reading `PLO-2`
 * next to a ลบ button is the wrong list to be ambiguous on, so the option is
 * gone, the first curriculum in reach is chosen on arrival, and no request
 * leaves this file without one — the route refuses one that does.
 *
 * *The order is the server's, and this file does not re-sort.* The rows come
 * back already walked — each ข้อย่อย directly after its ข้อหลัก, siblings in
 * their stated ลำดับ — so drawing them in the order they arrived is what makes
 * the fourth criterion true. Sorting here would quietly move that decision to
 * a place no test watches.
 *
 * *Nesting is shown by indenting on `level_depth` and by saying so.* A ข้อย่อย
 * is drawn inset from its ข้อหลัก with a rule down its left, and its รหัส is
 * the ข้อหลัก's plus its own — which is how the committee writes them anyway.
 *
 * *The same รหัส in another หลักสูตร is not a clash.* Nothing here treats a
 * code as an identifier: two curricula each holding a PLO-1 is the point of the
 * ticket, and the key every action carries is `outcome_id`.
 *
 * Removing asks first, and may come back having done something else. An outcome
 * nothing points at is deleted; one a subject mapping or a CLO points at is
 * switched off instead; and one that still has ข้อย่อย is refused, because
 * switching a ข้อหลัก off while its children stay listed underneath is not what
 * was asked for. The banner says which of the three happened.
 */

export default function Plos() {
  const [program, setProgram] = useState('')
  const [plos, setPlos] = useState([])
  const [programs, setPrograms] = useState([])
  // Which curriculum the *form* is on, and its outcomes when that is not the
  // one the table is showing. See `parentPool` below.
  const [formProgram, setFormProgram] = useState('')
  const [formOutcomes, setFormOutcomes] = useState([])
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
   * A sentence waiting for the read that will draw what it is about - #205,
   * on this screen since the owner's answer to #238 on 28 ตุลาคม 2569.
   *
   * Until that day `save` and `confirmRemoval` said their own sentence behind
   * their reload, and #241 measured what that does here: this screen says the
   * sentence on every sequence, including one that needs no window at all -
   * nothing held anything, the curriculum picker moved, and
   * *บันทึกข้อมูลเรียบร้อยแล้ว* stood over the outcomes of a curriculum the
   * save had not talked about. That is #210's second question, and the owner's
   * answer is that a sentence belongs to the read that draws what it is about,
   * on every screen (#221's nine arms, #238).
   *
   * What identifies a read here is the **curriculum** and nothing else:
   * `load` asks `listPlos({ program_id: program })` and takes no page and no
   * other filter, so the whole coordinate of a read is that one value (#185).
   * It is held here as what the sentence is *of* and never read as a loader -
   * #211's rule is about which loader does the reading, which `onScreen`
   * below answers and this ref must not be asked.
   *
   * `Departments.js` carries the shape and the two clauses #205 put on it: the
   * key decides whether the sentence is about the list that just landed, and
   * the clearing is inside `isCurrent()` so that a read the screen has already
   * replaced cannot throw away a sentence handed over after it was sent.
   */
  const waiting = useRef(null)

  /**
   * The outcomes of the หลักสูตร the picker is on now - #133.
   *
   * #68's shape, reached by asking what that ticket's grep could not have
   * found: it matched `set...(await ...)` and this line destructures the answer
   * first, so no file list it published could carry this screen. The picker
   * above can be moved while a list is out, and without the flag the answer
   * that **arrives** last wins rather than the one **asked for** last - one
   * curriculum's PLOs under another's name, and each row's แก้ไข opening a form
   * about an outcome the screen is not showing. The flag is required rather
   * than defaulted: the three handlers that reload have a question of their own
   * to answer, and `onScreen` below is how they answer it.
   * `frontend/src/pages/Students.js` carries the rule and the reasons, and
   * `133a-superseded-answer-on-one-screen.spec.js` the rows.
   */
  const load = useCallback(async isCurrent => {
    // Nothing is asked for until a curriculum is chosen. The effect below
    // chooses one as soon as the reach is known; an account that reaches none
    // never gets here, and is told so rather than left loading.
    //
    // `false` here is *it did not draw*, which is what the caller below reads
    // it as, and not *the read was refused* - the read was never made. No
    // handler can arrive with no curriculum chosen, every one of them acting on
    // a PLO of one, so the two readings cannot be told apart from inside this
    // screen as it stands on 12 October 2569 (#203).
    if (!program) return false
    setLoading(true)
    try {
      const { plos: rows } = await listPlos({ program_id: program })
      // Drawn, and then the sentence a write handed over - now that the list it
      // is about is on the screen (#205, #238). The key is the curriculum,
      // which is the whole coordinate of a read here. The comment is above the
      // block and not inside it so that a mutant can quote the block without
      // quoting a comment (#121).
      if (isCurrent()) {
        setPlos(rows)
        if (waiting.current && waiting.current.of === program) {
          setNotice(waiting.current.said)
        }
      }
      // Whether it drew, for a handler that has a sentence to say - #203. It
      // answers *the read was not refused* and not *the screen is still the one
      // that asked*, which is the caller's own second clause (#202).
      //
      // 28 ตุลาคม 2569, #238 - no handler on this screen reads it any more.
      // `load` says the sentence itself now, so `save` and `confirmRemoval`
      // ignore the answer and the only caller left is the effect below, which
      // discards it. Both answers are **structurally unreachable** here rather
      // than untested (#102); `Users.js` carries the same note and the longer
      // reason.
      return true
    } catch (error) {
      if (isCurrent()) report(error)
      return false
    } finally {
      if (isCurrent()) {
        setLoading(false)
        // A read the screen still wants has landed, so whatever was waiting has
        // either just been said above or is about a curriculum that is no
        // longer the one on the screen - #205. Inside `isCurrent()` on purpose:
        // a read the screen has already replaced must not throw away a sentence
        // handed over after it was sent.
        waiting.current = null
      }
    }
  }, [program, report])

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
  }, [load])

  /**
   * The loader the screen is on, readable after an await - #133, and the loader
   * rather than the หลักสูตร since #211.
   *
   * บันทึก, ลบ and a refused แก้ไข each reload the list, and nothing tears a
   * handler down, so the effect's flag cannot serve them: what they have to ask
   * is *is this read still the read the screen is waiting for*, which is a
   * question about now. The form replaces the filter while it is open, but
   * `save` clears it before it reloads, and the dialog behind ลบ leaves it
   * drawn - under a full-screen `bg-black/50` that eats a click (#199) and that
   * the keyboard went straight past until 18 ตุลาคม 2569, `ConfirmDialog` trapping no
   * focus (#204), and that ยกเลิก puts away while the write stays out since #217
   * contained it - so this is reachable from the screen rather than only in
   * principle, either way.
   *
   * It held the chosen หลักสูตร until #211. For the answer that comes back the
   * two comparisons agree, `load` being rebuilt by exactly the thing the ref
   * used to hold; what a coordinate cannot answer is the question one line
   * down, *which loader should do the reading*. A handler that read with the
   * one it closed over raised `loading` for a curriculum nobody is looking at
   * and then refused itself, so nothing lowered it and the table stayed at
   * กำลังโหลด… under the sentence the handler had just said. Reading the loader
   * live out of this ref is what the other nineteen page files do (#208), what
   * `211a-the-loader-a-coordinate-ref-cannot-hold.spec.js` holds here, and what
   * `frontend/scripts/dead-loaders.js` counts - this file joining its
   * population the day this landed.
   */
  const onScreen = useRef(load)
  useEffect(() => {
    onScreen.current = load
  }, [load])

  // The curricula in reach, fetched once: what this account covers is a
  // property of the grant and does not change with what is being looked at.
  // It is also what decides which curriculum the screen opens on, so nothing
  // is listed until it answers.
  useEffect(() => {
    let cancelled = false
    listReachablePrograms()
      .then(({ programs: reachable }) => {
        if (cancelled) return
        setPrograms(reachable)
        // The first curriculum in reach *that is still running*: a retired one
        // is a poor thing to open on, and is landed on only when it is all
        // there is. The form's picker takes the stronger half of the same rule
        // and does not offer a retired curriculum at all, which it can afford
        // because a form nobody has filled in yet can start on nothing.
        //
        // Every curriculum in the seed is active, so no row at either seam can
        // tell this apart from `reachable[0]`, and `landsonthelast` breaks both
        // halves at once. It is the third of #107's three answers - not proved,
        // not unreachable, untested - and it is written down here rather than
        // left for a reader to assume the first.
        const first = reachable.find(entry => entry.is_active !== false) ?? reachable[0]
        // A ผู้ดูแลภาควิชา of a department that runs no หลักสูตร yet is a legal
        // account and reaches nothing. `load` will not fire for them, so this
        // is the only place that can stop the spinner — #43's defect otherwise.
        if (first) setProgram(current => current || first.program_id)
        else setLoading(false)
      })
      .catch(error => {
        if (cancelled) return
        setLoading(false)
        report(error)
      })
    return () => {
      cancelled = true
    }
  }, [report])

  // The table shows one curriculum; the form need not be on that one. An
  // administrator narrowed to 0501 who adds an outcome to 0503 has to be
  // offered 0503's outcomes as ข้อหลัก, or there is nothing to put it under
  // and nothing on screen saying why. This used to be a second, unfiltered
  // request for every outcome in reach; #101 took that shape away, so the
  // curriculum the form is on asks for its own — and only when it differs from
  // the one already on screen.
  useEffect(() => {
    if (!formProgram || formProgram === program) return undefined
    let cancelled = false
    listPlos({ program_id: formProgram })
      .then(({ plos: rows }) => {
        if (!cancelled) setFormOutcomes(rows)
      })
      .catch(report)
    return () => {
      cancelled = true
    }
  }, [formProgram, program, report])

  const parentPool = formProgram && formProgram !== program ? formOutcomes : plos

  const nameOf = programId =>
    programs.find(entry => entry.program_id === programId)?.program_name_th ?? programId

  /**
   * Which press of แก้ไข the form was last asked for - #139.
   *
   * Read afresh rather than editing the row the list happens to be holding, and
   * drawn only if nothing has taken the form's place since: แก้ไข again, on this
   * row or another, เพิ่มผลการเรียนรู้ and ลบ each write this, and a read that
   * lands after them draws neither its form nor its refusal, though the list is
   * still reloaded. `Departments.js` carries the reasons.
   *
   * **The filter does not write it, and that is measured rather than assumed.**
   * #133 wrote here that moving the filter while this read is out opens *an
   * outcome of the curriculum the screen has just left*, the harm the flag on
   * `load` closes. The form is truthful about itself: its หลักสูตร field is the
   * outcome's own and locked, and `parentPool` asks for that curriculum's
   * outcomes rather than handing it the table's. What remains is a form the
   * person asked for opening after they looked elsewhere - which every filter
   * and pager does, not this one alone - and whether that should cancel the ask
   * was put to the person who owns the UI, who said no (17 September 2569).
   * The last row of `139a-superseded-row-detail.spec.js` holds that answer.
   *
   * The error path reloads the list, so it asks `onScreen` like the others.
   */
  const asked = useRef(null)

  /**
   * The last thing that opened on this screen - #146, arriving here with #202.
   *
   * This screen had no such ref: #146 gave the rule to the write that closes a
   * form, and the thirteen screens that ask it are the thirteen that draw a
   * form beside a list and have a `save` that can be overtaken. Here the
   * handler that can be is `confirmRemoval`, because the question
   * `ConfirmDialog` asks trapped no focus until 18 ตุลาคม 2569 (#204, contained by #217
   * that day) and the table underneath it is live either way:
   * เพิ่มผลการเรียนรู้ and another row's แก้ไข answered to Enter where focus
   * already was, and are an ordinary click once ยกเลิก has put the question
   * away.
   *
   * So the two controls that open a form write it, แก้ไข at the press for
   * #139's reason, and ยกเลิก and ลบ do not. The curriculum filter does not
   * either, which is the decision `asked` is documented with above.
   *
   * `Departments.js` carries the reasons.
   */
  const showing = useRef(null)

  const openEditor = async plo => {
    const ask = {}
    asked.current = ask
    showing.current = ask
    setNotice(null)
    setReading(true)
    try {
      const { plo: current } = await getPlo(plo.outcome_id)
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
   * No `showing.current === sent` here, and that is measured rather than
   * forgotten - #202, 11 October 2569.
   *
   * The situation #146 is about cannot be built on this screen: the form
   * replaces the table, so while a save is out the only controls drawn are the
   * form's own, and `PloForm` gives ยกเลิก `disabled={busy}`. Nothing can take
   * the screen, so the guard would be a clause no row and no mutant could reach
   * (#97). The day ยกเลิก stops being disabled - or anything else is drawn
   * beside the form while a save is out - this needs the three lines
   * `confirmRemoval` below has. `Rubrics`, `RubricCriteria` and
   * `ProgramSubjects` are the same shape and carry the same note.
   */
  const save = async draft => {
    setWriting(true)
    try {
      if (editing?.outcome_id) await updatePlo(editing.outcome_id, draft)
      else await createPlo(draft)
      setEditing(null)
      setFormProgram('')
      // A marker for `frontend/scripts/sentences-after-a-move.js` stood here
      // until 28 ตุลาคม 2569, saying that nothing can take this screen while a
      // save is out and so the guard would be a clause no row could reach
      // (#97, measured 11 October 2569 for #202). It is gone rather than kept:
      // no sentence is said after this await any more, so that census stopped
      // matching it the day #238 landed, and a marker the instrument no longer
      // reads is an exemption rather than a reason (#93, #141). What it said is
      // still true and is written in the docblock above, which is where the
      // absent `showing.current === sent` is decided. Its keyword is left
      // unwritten here on purpose, the census reading any comment that carries
      // it as a marker.
      const said = { error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' }
      // #203 - the sentence waits for the reload to draw. `Departments.js`
      // carries the reasons.
      // #238, 28 ตุลาคม 2569 - handed over before the read and keyed for the
      // curriculum this save was about, which is the owner's answer to #210's
      // second question. The sequence #241 measured here needed no window at
      // all: the picker moved, nothing was held, and this sentence stood over
      // another curriculum's outcomes. `load` says it when the list it is
      // about lands, and says nothing when a read of another curriculum lands
      // instead.
      waiting.current = { of: program, said }
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
    } catch (error) {
      report(error)
    } finally {
      setWriting(false)
    }
  }

  // The sentence belongs to the screen that was asked - #202. Only the sentence
  // is asked about: the dialog closes and the list is reloaded whichever way the
  // comparison goes (#131). `Departments.js` carries the reasons.
  const confirmRemoval = async () => {
    const sent = showing.current
    setWriting(true)
    try {
      const answer = await deletePlo(removing.outcome_id)
      const deactivated = Boolean(answer?.deactivated)
      setRemoving(null)
      const said = {
        error: false,
        message: deactivated
          ? 'ผลการเรียนรู้ข้อนี้มีรายวิชาหรือ CLO อ้างอิงอยู่ ระบบจึงปิดการใช้งานแทนการลบ ข้อมูลเดิมยังเรียกดูได้'
          : 'ลบผลการเรียนรู้เรียบร้อยแล้ว',
      }
      // #203 - the sentence waits for the reload to draw. `Departments.js`
      // carries the reasons.
      // #238, 28 ตุลาคม 2569 - handed over before the read and keyed for the
      // curriculum this removal was about, the same way `save` above does it.
      // The dialog leaves the table and the picker drawn and neither is
      // disabled, so the window a person reaches here is real (#199, #204,
      // #217) - and #241 found the sequence that needs no window at all.
      if (showing.current === sent) waiting.current = { of: program, said }
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
    } catch (error) {
      // A ข้อหลัก that still has ข้อย่อย is refused outright, and the sentence
      // the server sends says what to do about it. The dialog closes either
      // way: leaving it open over a banner it cannot be read past is worse.
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
        <PloForm
          value={editing}
          plos={parentPool}
          programs={programs}
          defaultProgram={program}
          busy={busy}
          onSave={save}
          onProgramChange={setFormProgram}
          onCancel={() => {
            setNotice(null)
            setEditing(null)
            // Forgotten rather than left behind: a curriculum the form was on
            // and the table is not would otherwise send a request for its
            // outcomes the next time the filter moves, for a form that is no
            // longer open.
            setFormProgram('')
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-medium text-primary">ผลการเรียนรู้ระดับหลักสูตร</h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* A picker when there is a choice to make, and a statement of
                  where one is when there is not — รายวิชาในหลักสูตร's control,
                  for its reasons. A กรรมการหลักสูตร reaches one curriculum and
                  is shown which. */}
              {programs.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  หลักสูตร
                  <select
                    value={program}
                    onChange={event => setProgram(event.target.value)}
                    className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                  >
                    {/* No ทุกหลักสูตร — #101. A set of outcomes belongs to
                        one curriculum, so a list of two is not a view of
                        anything anybody maintains, and #20's grid had already
                        settled the same question for the same reason. */}
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
                เพิ่มผลการเรียนรู้
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            รหัสผลการเรียนรู้เป็นของหลักสูตรใดหลักสูตรหนึ่ง หลักสูตรอื่นจึงใช้รหัสเดียวกันได้
            และข้อย่อยจะแสดงเยื้องเข้าไปใต้ข้อหลักของตัวเองตามลำดับที่ตั้งไว้
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัส</th>
                  <th className="px-4 py-3">ผลการเรียนรู้</th>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3">ลำดับ</th>
                  <th className="px-4 py-3">หลักสูตร</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      กำลังโหลด…
                    </td>
                  </tr>
                )}
                {!loading && plos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      {/* Two different silences. The second is an account that
                          reaches no หลักสูตร at all: there is no curriculum
                          to be empty, and saying หลักสูตรนี้ would name one
                          that is not there. */}
                      {program
                        ? 'ยังไม่มีผลการเรียนรู้ในหลักสูตรนี้'
                        : 'บัญชีนี้ยังไม่ได้ดูแลหลักสูตรใด จึงยังไม่มีผลการเรียนรู้ให้จัดการ'}
                    </td>
                  </tr>
                )}
                {!loading &&
                  plos.map(plo => (
                    <tr key={plo.outcome_id}>
                      <td className="px-4 py-3">
                        {/* The indent is the nesting. `level_depth` comes from
                            the server and is the parent's plus one, so a ข้อย่อย
                            of a ข้อย่อย steps in again rather than sitting level
                            with its aunt. */}
                        <div
                          className={
                            plo.level_depth > 1 ? 'border-l-2 border-gray-200 pl-3' : 'font-bold'
                          }
                          style={{ marginLeft: `${(plo.level_depth - 1) * 1.5}rem` }}
                        >
                          <span className="text-gray-900">{plo.outcome_code}</span>
                          {plo.level_depth > 1 && (
                            <span className="ml-2 text-xs text-slate-400">ข้อย่อย</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {plo.outcome_title}
                        {plo.outcome_description && (
                          <span className="block text-xs text-slate-500">
                            {plo.outcome_description}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800">
                          {OUTCOME_TYPES[plo.outcome_type] ?? plo.outcome_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{plo.sequence_order}</td>
                      <td className="px-4 py-3 text-slate-500">{nameOf(plo.program_id)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            plo.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {plo.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(plo)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            asked.current = null
                            setNotice(null)
                            setRemoving(plo)
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
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ยืนยันการลบผลการเรียนรู้"
        message={
          removing
            ? `ต้องการลบผลการเรียนรู้ ${removing.outcome_code} ${removing.outcome_title} ใช่หรือไม่ หากมีรายวิชาหรือ CLO อ้างอิงอยู่ ระบบจะปิดการใช้งานให้แทนการลบ และหากยังมีข้อย่อยอยู่จะลบไม่ได้`
            : ''
        }
        confirmLabel="ลบผลการเรียนรู้"
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

import { useCallback, useEffect, useRef, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import CopyTermPanel from '../components/offerings/CopyTermPanel'
import Notice from '../components/Notice'
import OfferingForm from '../components/offerings/OfferingForm'
import Pager from '../components/Pager'
import SectionsPanel from '../components/offerings/SectionsPanel'
import { SEMESTERS, semesterLabel } from '../components/offerings/terms'
import {
  assignTeachers,
  copyTerm,
  createOffering,
  createSection,
  deleteOffering,
  deleteSection,
  getOffering,
  listOfferings,
  listReachablePrograms,
  updateSection,
} from '../api/offerings'

/**
 * การเปิดรายวิชาในภาคการศึกษา — ticket #23.
 *
 * Which of a หลักสูตร's subjects run in a given term, split into ตอนเรียน, each
 * given to ผู้สอน. This is the only screen the กรรมการหลักสูตร holds alone —
 * every other role, Faculty Admin included, is refused at the server, and the
 * sidebar offers the entry to that role only. Nothing in this file checks a
 * role: what arrives is what that account may see (ADR-0002).
 *
 * It is the point at which everything on the Teacher side becomes reachable. A
 * teacher's dashboard is the sections assigned here and nothing else, so an
 * Offering nobody opened is a teacher with an empty screen.
 *
 * ## Two views, one page
 *
 * The list is the term being planned; opening a row goes to that Offering's
 * sections. They are one page rather than two routes for the same reason #18's
 * editor is: the section list is only ever reached from the row above it, and a
 * URL for it would be a URL somebody could arrive at holding an Offering they
 * no longer have.
 *
 * ## The three filters
 *
 * หลักสูตร, ปีการศึกษา and ภาคการศึกษา. The programme is the same control
 * ข้อมูลรายวิชา draws for departments and for the same reason — a committee
 * member reaches one programme and is shown its name rather than a dropdown
 * whose every option returns the same rows. The other two are the term, and the
 * screen is almost always being read one term at a time.
 *
 * ## What a removal means here
 *
 * Not what it means on the four screens above. There is no switching off: an
 * Offering records a term that ran, and a term with enrolled students cannot be
 * made not to have run. So a removal either happens or is refused with a message
 * about what depends on it, the dialog says which is likely before the button is
 * pressed — the section rows carry their enrolment counts — and the banner says
 * what actually happened.
 *
 * ## What the copy panel assumes
 *
 * That the person using it reaches one programme. The panel sends the filter's
 * programme, and for a committee member the filter is not a dropdown at all, so
 * it is always theirs. If `COMMITTEE` ever widens to a role that reaches several
 * — a department administrator, say — an unfiltered copy would target whichever
 * programme sorts first and quietly build a term in the wrong curriculum. The
 * server would not stop it: it checks reach, and the reach would be real. The
 * fix at that point is to make the programme a required choice on this panel
 * rather than to inherit the filter's.
 */

const PAGE_SIZE = 10

/**
 * What a read of this list is *of*, which is what a sentence handed to
 * `waiting` names - #205. `Departments.js` carries the reasons.
 */
const readOf = (page, program, year, semester) =>
  `${page}:${program}:${year}:${semester}`

/**
 * `load`'s third answer - #209. `Departments.js` carries the reasons: a read
 * that is told the page it asked for no longer exists has neither drawn nor
 * been refused, and a caller with a sentence hands it over rather than saying
 * it over a page about to be replaced.
 */
const HANDED_ON = 'handed-on'

/**
 * A section write's sentence, told which Offering it is about - #143.
 *
 * ## What was measured
 *
 * Nothing beside the panel is disabled while a section write is out:
 * กลับไปหน้ารายการ and then ตอนเรียนและผู้สอน of another Offering can both be
 * pressed first, and the answer then arrives over somebody else's panel. The
 * banner is deliberately not guarded against that - the sentence is about a
 * write the person made and not about the panel they are now looking at, which
 * is the decision of 1 October 2026 that `asked` is documented with - so #143
 * asked whether such a sentence is readable at all. Measured at the browser
 * seam on 21 ตุลาคม 2569, all three of its ways in do it: an accepted
 * เพิ่มตอนเรียน, a refused one, and ลบตอนเรียน, each on the list and over
 * another Offering's panel. `143a-a-sentence-that-names-its-offering.spec.js`
 * carries the measurement and the rows.
 *
 * **The owner's answer of 21 ตุลาคม 2569 is #143's third option: the sentence
 * is still drawn whichever panel it lands on, and it names the Offering it is
 * about.** Dropping it once another panel is open was declined because a
 * refusal that really happened would go silent and the person would believe
 * the write went through; leaving it as it was, because the repository would
 * then hold two behaviours for one decision - `ActivityScores.js` has named
 * the activity its sentence is about since 12 ตุลาคม 2569.
 *
 * ## Why the name and the term, and not the หลักสูตร
 *
 * What identifies an Offering is (หลักสูตร, รายวิชา, ปีการศึกษา, ภาคการศึกษา)
 * - ADR-0001's second tier. The term is load-bearing today: asked of the
 * database on 21 ตุลาคม 2569, `01076105` is opened in two terms, so a sentence
 * that named the subject alone would not say which of them it meant.
 *
 * The หลักสูตร is left out because no subject is placed in more than one today
 * (asked the same hour), so the subject and the term name one Offering, and a
 * fourth field is weight on a banner for nothing. **What re-dates this is a
 * subject placed in two หลักสูตร**, which the screen itself makes reachable:
 * its three filters all take a blank, so one list can hold both Offerings and
 * a person can press into either. The condition to measure is therefore the
 * database's, not the screen's.
 *
 * The subject's name and not its code, for #93's reason: a code in front of a
 * name is a label somebody chose from, and this is prose.
 */
const aboutOffering = (offering, sentence) =>
  `${sentence} (รายวิชา ${offering.subject_name_th} ปีการศึกษา ${offering.academic_year} ภาคการศึกษา ${offering.semester})`

export default function Offerings() {
  const [page, setPage] = useState(1)
  const [program, setProgram] = useState('')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')
  const [data, setData] = useState({ offerings: [], total: 0 })
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [opening, setOpening] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [copied, setCopied] = useState(null)
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
   * The same, for a refusal that belongs to one Offering - #143.
   *
   * `report` itself is not changed: the list's own reads go through it and a
   * refusal of the list is about no one Offering. Only a section write's two
   * refusals are named, which are the write's own and the read-back that
   * follows it, both of them about the Offering the press was made on.
   *
   * The `expired` rule is `report`'s and is kept: a 401 raises the shell's
   * dialog, and a banner behind that dialog is a sentence nobody reads.
   */
  const reportAbout = useCallback((offering, error) => {
    if (!error.expired) {
      setNotice({ error: true, message: aboutOffering(offering, error.message) })
    }
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
    const key = readOf(page, program, year, semester)
    setLoading(true)
    // Whether this read handed the page on rather than drawing it - #209. The
    // sentence that was waiting for it belongs to the read that follows, so the
    // `finally` below must not clear it.
    let handedOn = false
    try {
      const answer = await listOfferings({
        page,
        per_page: PAGE_SIZE,
        program_id: program,
        academic_year: year,
        semester,
      })
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
            waiting.current = { of: readOf(lastPage, program, year, semester), said: waiting.current.said }
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
  }, [page, program, year, semester, report])

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

  // The programmes in reach, fetched once: what this account covers is a
  // property of the grant and does not change with the page being looked at.
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
  }, [report])

  const nameOf = programId =>
    programs.find(entry => entry.program_id === programId)?.program_name_th ?? programId

  /**
   * Which press the panel was last asked for - #139.
   *
   * `refresh` below opens the panel and reads it back after every section write,
   * and nothing beside it is disabled while its read is out: ตอนเรียนและผู้สอน
   * again, on this row or another, เปิดรายวิชา, ยกเลิกการเปิด and
   * กลับไปหน้ารายการ can each be pressed first. Drawn unasked, a late answer
   * opened the panel of an Offering the person had moved away from - over the
   * form, under the list's question, or back again after กลับ - or put an older
   * reading of the same Offering over a newer one. Every control that decides
   * what takes the panel's place writes this, each opening with an ask of its
   * own, and `refresh` draws only for the ask it is handed; a section write
   * hands on the ask of the panel it was made on. `Departments.js` carries the
   * reasons for asking with a ref, and for asking by press rather than by row.
   *
   * A refused section write still reports the refusal of its read-back after
   * กลับ: that sentence is about a write the person made, not a panel they left.
   */
  const asked = useRef(null)

  /**
   * The Offering being worked on, read afresh.
   *
   * Every section write ends here rather than patching the copy in hand: the
   * enrolment counts and the teaching are read back from the database, so a
   * panel that has been open a while shows what is there now.
   */
  const refresh = useCallback(
    async (id, ask) => {
      const { offering } = await getOffering(id)
      if (asked.current === ask) setViewing(offering)
      return offering
    },
    []
  )

  const openSections = async offering => {
    const ask = {}
    asked.current = ask
    setNotice(null)
    setReading(true)
    try {
      await refresh(offering.id, ask)
    } catch (error) {
      if (asked.current === ask) report(error)
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
    } finally {
      setReading(false)
    }
  }

  /** One section write, its refusal reported and the panel read back after. */
  /**
   * Answers whether the work went through, because one caller has to know.
   *
   * The refusal is turned into a banner here and not rethrown, which is right
   * for the two callers that have nothing left on the screen afterwards. The
   * teacher picker is the third: it closes when the save returns, so a refusal
   * that came back looking like a success closed the box and threw away every
   * tick with it - and the person then has to remember who they had chosen.
   *
   * superseded-answer: the panel this reads back is guarded - `refresh` draws
   * only for the ask it is handed - and the banner is deliberately not, which is
   * the decision `asked` is documented with above: the sentence is about a write
   * the person made and not about the panel they are now looking at, so it is
   * drawn whichever panel that is. Measured 1 October 2026 (#139, #141).
   *
   * **That decision stands, and since the owner's answer to #143 of
   * 21 ตุลาคม 2569 the sentence names the Offering it is about** - which is
   * what makes it readable wherever it lands. `aboutOffering` carries the
   * wording, what was measured and what would re-date it.
   */
  const onSection = async work => {
    const ask = asked.current
    // The Offering this write is of, named where the press was made (#143).
    //
    // This is a name and not a guard: `onSection` is re-created each render, so
    // the `viewing` this invocation closed over is the panel the press was made
    // on for as long as it runs, however far the person has moved. That is why
    // #143 is a wording change and not a change to what is read - the sentence
    // was always about the right Offering and never said which.
    const offering = viewing
    setNotice(null)
    setWriting(true)
    try {
      const message = await work()
      await refresh(offering.id, ask)
      // sentence-after-a-move: decided 1 October 2026, and named since
      // 21 ตุลาคม 2569 (#143) - the banner is about the write the person
      // ordered and not about the panel they are now looking at, so it is
      // drawn whichever panel that is and says which Offering it is of.
      // (#139, #141, #143)
      if (message) {
        setNotice({ error: false, message: aboutOffering(offering, message) })
      }
      return true
    } catch (error) {
      reportAbout(offering, error)
      // The panel is read back even after a refusal: a 409 on one section says
      // nothing about the state of the others, and leaving a stale panel on the
      // screen under an error banner is how #91 was reported.
      try {
        await refresh(offering.id, ask)
      } catch (again) {
        reportAbout(offering, again)
      }
      return false
    } finally {
      setWriting(false)
    }
  }

  /**
   * The last thing that opened on this screen - #146. เปิดรายวิชา writes it;
   * ยกเลิก does not, and neither does the save that closes its own form. A save
   * whose answer finds the form opened again closes nothing, says nothing and
   * does not take the panel over - the person is somewhere else, and `asked` is
   * theirs to hold. One that finds nothing in its place says what it did, which
   * is the half the advisor answered. `Departments.js` carries the reasons.
   */
  const showing = useRef(null)

  const save = async draft => {
    const sent = showing.current
    setWriting(true)
    try {
      const { offering } = await createOffering(draft)
      const mine = showing.current === sent
      const ask = {}
      const said = {
        error: false,
        // label-code: the notice says what was just created, and the next thing the person
        // does is find that offering by its code in the registrar's list (#93)
        message: `เปิดรายวิชา ${offering.subject_id} ${offering.subject_name_th} ในปีการศึกษา ${offering.academic_year} ภาคการศึกษา ${offering.semester} เรียบร้อยแล้ว ขั้นต่อไปคือเพิ่มตอนเรียน`,
      }
      if (mine) {
        setOpening(false)
        asked.current = ask
      }
      // #203 - the sentence waits for the read that draws it, and #209 has it
      // handed over before the await: only `load` learns that the page has gone
      // past the end, and only `load` can re-key the sentence for the read it
      // hands to. `Departments.js` carries the reasons.
      if (showing.current === sent) {
        waiting.current = { of: readOf(onPage.current, program, year, semester), said }
      }
      const drawing = onScreen.current
      await drawing(() => onScreen.current === drawing)
      if (mine) await refresh(offering.id, ask)
    } catch (error) {
      if (showing.current === sent) report(error)
    } finally {
      setWriting(false)
    }
  }

  /**
   * The sentence belongs to the screen that was asked - #202. `เปิดรายวิชา`
   * carries no `disabled`, so the form can be opened while the copy is out and
   * its answer said *คัดลอกเรียบร้อยแล้ว* over it. The report box is not asked
   * about: it is the copy's own detail and the person asked for it, where a
   * sentence over a form reads as being about that form. `Departments.js`
   * carries the reasons.
   */
  const runCopy = async terms => {
    const sent = showing.current
    setNotice(null)
    setWriting(true)
    try {
      const target = program || programs[0]?.program_id
      // Guarded rather than sent as `undefined`. คัดลอก only needs two years to
      // become pressable, and the programme list arrives on its own request, so
      // a fast hand on a slow connection would send a copy with no programme in
      // it and get back `invalidOffering` for a form that looks complete.
      if (!target) {
        setNotice({ error: true, message: 'กำลังโหลดรายชื่อหลักสูตร กรุณาลองอีกครั้ง' })
        return
      }
      const answer = await copyTerm({ ...terms, program_id: target })
      setCopied(answer)
      const said = {
        error: false,
        message:
          answer.created.length === 0
            ? 'ไม่มีรายวิชาใดถูกคัดลอก รายละเอียดอยู่ในกล่องด้านล่าง'
            : `คัดลอกเรียบร้อยแล้ว เปิดรายวิชาใหม่ ${answer.created.length} รายวิชา รวม ${answer.sections} ตอนเรียน`,
      }
      // The same rule as the import below: page one is a change the effect
      // fetches, and asking `load` as well would race it from the page being
      // left - #68.
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
          const target = readOf(1, program, year, semester)
          waiting.current = { of: target, said }
        }
        await drawing(() => onScreen.current === drawing)
      } else {
        if (showing.current === sent) {
          const target = readOf(1, program, year, semester)
          waiting.current = { of: target, said }
        }
        setPage(1)
      }
    } catch (error) {
      report(error)
    } finally {
      setWriting(false)
    }
  }

  // The sentence belongs to the screen that was asked - #202, at both answers:
  // the dialog trapped no focus until 18 ตุลาคม 2569 (#204), so เปิดรายวิชา was
  // pressable from under it with the keyboard; since #217 contained the focus
  // the way in is ยกเลิก and then a click (`Departments.js` carries it).
  // Only the sentences are asked about - the dialog closes,
  // the panel is read back, the page steps back and the list is reloaded
  // whichever way the comparison goes (#131). `Departments.js` carries the
  // reasons.
  const confirmRemoval = async () => {
    const ask = asked.current
    const sent = showing.current
    setWriting(true)
    try {
      if (removing.kind === 'section') {
        await deleteSection(viewing.id, removing.section.section_id)
        setRemoving(null)
        if (showing.current === sent) {
          // Named since 21 ตุลาคม 2569 - the owner's answer to #143, which
          // `aboutOffering` carries. The removal is the third of its three
          // measured ways in, and the only one whose way to another panel
          // needs ยกเลิก pressed first: since #217 the question covers
          // กลับไปหน้ารายการ until the write answers.
          setNotice({ error: false, message: aboutOffering(viewing, 'ลบตอนเรียนเรียบร้อยแล้ว') })
        }
        await refresh(viewing.id, ask)
      } else {
        await deleteOffering(removing.offering.id)
        setRemoving(null)
        setViewing(null)
        const said = { error: false, message: 'ยกเลิกการเปิดรายวิชาเรียบร้อยแล้ว' }
        // **The owner's answer, 19 ตุลาคม 2569 (#209): this handler no
        // longer decides anything about the page.** It re-reads the page the
        // person is standing on, and `load` asks the server the one question
        // that is answerable there - *does the page I asked for still exist* -
        // handing the page on when it does not. `Departments.js` carries the
        // measurement and what went with `onRows`.
        //
        // The sentence is therefore always handed over rather than said here:
        // the read that draws the list says it, keyed on that read, and if
        // that read is refused the refusal wins and `load` clears it (the
        // owner's decision of 10 October 2569, #152).
        //
        // `reader` and not `drawing`, which is what the term copy above calls
        // the same thing: a one-line anchor is matched as a substring (#154),
        // so eight spaces of indentation are found inside ten.
        // swallowed-refusal: the half above hands its sentence to the read that
        // draws the list, keyed on that read, and reads no answer of its own
        // (#205, #208). The section half earlier in this function is the one
        // this marker still has to answer for: it says its own sentence and
        // then reads the panel back, which is where it stood before #209 -
        // #146's rule on a panel read rather than on a list read - and nothing
        // here changed it (19 ตุลาคม 2569)
        if (showing.current === sent) {
          waiting.current = { of: readOf(onPage.current, program, year, semester), said }
        }
        const reader = onScreen.current
        await reader(() => onScreen.current === reader)
      }
    } catch (error) {
      const wasSection = removing.kind === 'section'
      setRemoving(null)
      report(error)
      if (wasSection && viewing) await refresh(viewing.id, ask).catch(report)
    } finally {
      setWriting(false)
    }
  }

  if (viewing) {
    return (
      <div className="space-y-6">
        <Notice notice={notice} />
        <SectionsPanel
          offering={viewing}
          busy={busy}
          onBack={() => {
            asked.current = null
            setNotice(null)
            setViewing(null)
            const drawing = onScreen.current
            drawing(() => onScreen.current === drawing)
          }}
          onAddSection={number =>
            onSection(async () => {
              await createSection(viewing.id, { section_number: number })
              return `เพิ่มตอนเรียน ${number} เรียบร้อยแล้ว`
            })
          }
          onRenameSection={(section, number) =>
            onSection(async () => {
              await updateSection(viewing.id, section.section_id, { section_number: number })
              return `แก้ไขเลขตอนเรียนเป็น ${number} เรียบร้อยแล้ว`
            })
          }
          onRemoveSection={section => {
            setNotice(null)
            setRemoving({ kind: 'section', section })
          }}
          onAssign={(section, userIds) =>
            onSection(async () => {
              await assignTeachers(viewing.id, section.section_id, userIds)
              return userIds.length === 0
                ? `นำผู้สอนออกจากตอนเรียน ${section.section_number} เรียบร้อยแล้ว`
                : `กำหนดผู้สอน ${userIds.length} คนให้ตอนเรียน ${section.section_number} เรียบร้อยแล้ว`
            })
          }
        />

        <ConfirmDialog
          open={Boolean(removing)}
          title="ยืนยันการลบตอนเรียน"
          message={
            removing?.section
              ? `ต้องการลบตอนเรียน ${removing.section.section_number} ใช่หรือไม่ ผู้สอนที่กำหนดไว้จะถูกนำออกไปด้วย${
                  removing.section.student_count > 0
                    ? ` ตอนเรียนนี้มีนักศึกษาลงทะเบียนอยู่ ${removing.section.student_count} คน ระบบจะไม่อนุญาตให้ลบ`
                    : ''
                }`
              : ''
          }
          confirmLabel="ลบตอนเรียน"
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

  return (
    <div className="space-y-6">
      <Notice notice={notice} />

      {opening ? (
        <OfferingForm
          programs={programs}
          defaultProgram={program}
          defaultYear={year}
          defaultSemester={semester}
          busy={busy}
          onSave={save}
          onCancel={() => {
            // ยกเลิก does not write this: a form closing is nobody taking the
            // screen, and a save still out is owed its sentence (#146).
            setNotice(null)
            setOpening(false)
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-medium text-primary">การเปิดรายวิชาในภาคการศึกษา</h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* A picker when there is a choice to make, and a statement of
                  where one is when there is not — ข้อมูลรายวิชา's control, for
                  ข้อมูลรายวิชา's reasons. A กรรมการหลักสูตร reaches one
                  programme and is shown which. */}
              {programs.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  หลักสูตร
                  <select
                    value={program}
                    onChange={event => {
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

              <label className="flex items-center gap-2 text-sm text-slate-600">
                ปีการศึกษา
                <input
                  value={year}
                  onChange={event => {
                    setPage(1)
                    setYear(event.target.value)
                  }}
                  placeholder="ทุกปี"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-24 rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                ภาคการศึกษา
                <select
                  value={semester}
                  onChange={event => {
                    setPage(1)
                    setSemester(event.target.value)
                  }}
                  className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                >
                  <option value="">ทุกภาค</option>
                  {SEMESTERS.map(term => (
                    <option key={term.value} value={term.value}>
                      {term.value} — {term.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => {
                  asked.current = null
                  showing.current = {}
                  setNotice(null)
                  setOpening(true)
                }}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
              >
                เปิดรายวิชา
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสวิชา</th>
                  <th className="px-4 py-3">ชื่อวิชา</th>
                  <th className="px-4 py-3">ปีการศึกษา</th>
                  <th className="px-4 py-3">ภาคการศึกษา</th>
                  <th className="px-4 py-3">ตอนเรียน</th>
                  <th className="px-4 py-3">หลักสูตร</th>
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
                {!loading && data.offerings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีรายวิชาที่เปิดสอนตามเงื่อนไขนี้
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.offerings.map(offering => (
                    <tr key={offering.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {offering.subject_id}
                      </td>
                      <td className="px-4 py-3">
                        {offering.subject_name_th}
                        <span className="block text-xs text-slate-500">
                          {offering.subject_name_en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{offering.academic_year}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {offering.semester} — {semesterLabel(offering.semester)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {offering.section_count} ตอน
                      </td>
                      <td className="px-4 py-3 text-slate-500">{nameOf(offering.program_id)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openSections(offering)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          ตอนเรียนและผู้สอน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            asked.current = null
                            setNotice(null)
                            setRemoving({ kind: 'offering', offering })
                          }}
                          className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50"
                        >
                          ยกเลิกการเปิด
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

          <CopyTermPanel busy={busy} report={copied} onCopy={runCopy} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ยืนยันการยกเลิกการเปิดรายวิชา"
        message={
          removing?.offering
            // label-code: the question names the record about to be destroyed, where two of them
            // sharing a name is the whole reason the code is in the sentence (#93)
            ? `ต้องการยกเลิกการเปิดรายวิชา ${removing.offering.subject_id} ${removing.offering.subject_name_th} ปีการศึกษา ${removing.offering.academic_year} ภาคการศึกษา ${removing.offering.semester} ใช่หรือไม่ ตอนเรียนทั้งหมดและการกำหนดผู้สอนจะถูกลบไปด้วย หากมีนักศึกษาลงทะเบียนหรือมีการบันทึกคะแนนแล้ว ระบบจะไม่อนุญาตให้ลบ`
            : ''
        }
        confirmLabel="ยกเลิกการเปิดรายวิชา"
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

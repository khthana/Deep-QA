import { useCallback, useEffect, useRef, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import DepartmentForm from '../components/departments/DepartmentForm'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import Pager from '../components/Pager'
import { useScreenGeneration } from '../context/ScreenGeneration'
import {
  createDepartment,
  deleteDepartment,
  getDepartment,
  importDepartments,
  importTemplate,
  listDepartments,
  updateDepartment,
} from '../api/departments'

/**
 * ข้อมูลภาควิชา — ticket #14.
 *
 * The faculty's own structure: which departments it has, what they are called,
 * which are still in use. Reached by the faculty administrator, whose sidebar
 * carries the entry (docs/05 A01), and by nobody else. The Central Admin is
 * refused on all seven of this screen's calls: CONTEXT.md makes the Faculty
 * Admin the only role that manages departments, and the Central Admin manages
 * accounts and grants "and nothing else".
 *
 * A department administrator has no entry for it and, more to the point, is
 * refused by the server on every call this screen makes - the eighth criterion
 * is written that way because a menu that hides an option is a menu, not a
 * permission (ADR-0002).
 *
 * The paging is server-side, as on ข้อมูลผู้ใช้งาน and for the same reason: a
 * screen that fetched every department and sliced ten off the front would look
 * identical and would still be sending the whole faculty down the wire.
 *
 * Removing one asks first, and may still be refused afterwards. The dialog is
 * about the person's intent; whether the department can actually go is the
 * server's answer, and when a programme or an account points at it the refusal
 * arrives in words that name the way round it - switch the department off
 * instead.
 */

const PAGE_SIZE = 10

/**
 * What a read of this list is *of* - #205.
 *
 * A sentence handed to the `waiting` ref below is about one list: the one the
 * read it was handed to will draw. Until 13 October 2569 the ref held the
 * sentence alone, so `load` said it when *any* read drew and threw it away in a
 * `finally` that ran whether or not the read was still the one the screen
 * wanted. Measured at the browser seam on the enrolment screen, which carries
 * the same shape, both halves were wrong: a read superseded before it landed
 * cleared a sentence handed over after it left, and a sentence whose own read
 * never came was said later over a page it was not about.
 *
 * So the ref holds `{ of, said }` and this is what `of` is written with - the
 * loader's own dependency list in one comparable value. `load` says the
 * sentence only when its own read is that read, and clears it only when a read
 * the screen still wants has landed: by then the sentence has either just been
 * said or is about a list that is no longer on the screen.
 *
 * `Programs`, `Subjects`, `ProgramSubjects`, `Rubrics`, `Students`, `Offerings`
 * and `SubjectStudents` carry the same two clauses, each with its own
 * parameters - the id of the thing a list hangs from counts (#185), and so does
 * a filter, because the same page of a different filter is a different list.
 */
const readOf = page => `${page}`

/**
 * `load`'s third answer - #209.
 *
 * A check that can fail to run has three answers and not two (#159), and so has
 * a read that can be told the page it asked for no longer exists: it drew, it
 * was refused, or **it handed the page on** and another read is coming. A caller
 * with a sentence of its own must hand that sentence over in the third case
 * rather than say it, because what is on the screen is still the list the read
 * it has just awaited was not about. Folding it into either of the other two
 * says the wrong thing: `true` draws the sentence over a page about to be
 * replaced, `false` reads as a refusal and the sentence is lost.
 *
 * **Which callers read it, measured 20 ตุลาคม 2569.** None on the six
 * administration screens: each awaits its loader and discards the answer,
 * because the sentence it has to say is left in `waiting` above and said by the
 * read that draws. The only caller anywhere that reads a loader's answer is
 * `add` on `SubjectStudents.js`, and it does not hand its sentence over in this
 * case - it says it whenever the answer is truthy, which `HANDED_ON` is. That
 * is **structurally unreachable** and not untested (#102, #117): the read that
 * caller awaits is a read of page 1, and `answer.page > lastPage` cannot hold
 * there, `lastPage` being floored at 1. The reason is written at that call too,
 * because a guard written for one caller is a claim about every caller (#68,
 * #133) - and the day a caller reads this answer on a page it did not choose,
 * the paragraph above is the clause it owes.
 */
const HANDED_ON = 'handed-on'

export default function Departments() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ departments: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  /**
   * What disables บันทึก and the confirmation - #142.
   *
   * A write holds `writing` from its press to its answer, and a read of one row
   * holds `reading`. They were one flag, and a read that landed late put it
   * down under a write that had started since - บันทึก came back with the save
   * still out, and a second press sent it again. A read started from the table
   * after ยกเลิก, the write still out, did the same from the other side. Now a
   * read puts down `reading` and nothing else.
   *
   * It puts it down whether or not it is still the read the screen wants, as it
   * did the one flag. Which read is wanted is `asked`'s question, and asking it
   * here would change what the screen disables: a read another แก้ไข overtook
   * would leave the flag up until the later one landed, and one that เพิ่ม or
   * ลบ took the place of would never put it down. A count of the writes would
   * be this boolean - every control that starts a write holding `writing` is
   * disabled while one is out, so no two overlap. `ImportPanel` keeps its own
   * flag and touches neither.
   *
   * `Programs`, `Subjects`, `ProgramSubjects`, `Rubrics`, `RubricCriteria`,
   * `Plos` and `Offerings` hold the same two flags the same way.
   * `142a-busy-outlives-a-superseded-read.spec.js` has the orders that reached
   * the defect, three rows on each screen and a fourth on three of them.
   */
  const [writing, setWriting] = useState(false)
  const [reading, setReading] = useState(false)
  const busy = writing || reading

  /**
   * A sentence waiting for the read that will draw what it is about - #152.
   *
   * A removal can step the page back rather than reload the page it is on, and
   * that read is the effect's: the handler has nothing to await and cannot know
   * whether it drew. Saying the sentence there says a row went over a refusal
   * the effect is about to write - the one thing the owner's decision of
   * 10 October 2569 says must not be said - and it is on the screen for as long
   * as the refusal takes to arrive.
   *
   * So the sentence is left here and the read that draws what it is about says
   * it. `Programs`, `Subjects`, `ProgramSubjects`, `Rubrics`, `Students` and
   * `Offerings` keep one for the same reason, and `SubjectStudents.js` carries
   * #152's own, which is where the shape comes from.
   *
   * It holds `{ of, said }`, and which read it is of is `readOf` above. `load`
   * says the sentence only when its own key is that one, and clears it only
   * when a read the screen still wants has landed - the two clauses #205 put
   * there on 13 October 2569.
   *
   * The paragraph this replaces said the clearing could stay outside that
   * question because every control that hands a sentence over is
   * `disabled={busy}`, so no sentence could be handed over while a read was
   * out. That named a way in, not the population (#179): no `Pager` on any of
   * these eight screens carries `busy`, which `SubjectStudents.js`'s own `add`
   * had measured on 11 October 2569 (#199), so ถัดไป is pressable for as long as
   * a write is out and the read it starts is superseded by the handover's own.
   * The owner's answer to #199 on 15 October 2569 gave the enrolment screen's
   * pager a `busy` and left these eight alone, so the sentence above was still
   * true of them and not of every screen - until 19 ตุลาคม 2569, when the answer
   * to #210 gave all six administration pagers one. On this screen the clause is
   * therefore false again and the paragraph it replaced is true again by
   * accident: every control that hands a sentence over is `disabled={busy}`,
   * **except the import panel**, which keeps its own flag. That is the one way
   * in left here (`206a`, `208a`), and `207a` is the net that says what closing
   * the pager made unreachable.
   * Three rows in
   * `e2e/tests/205a-the-handed-over-sentence-and-a-superseded-read.spec.js`
   * measure what that lost, on the screen that carries the same shape.
   *
   * What the key could not tell apart until #206, measured on this screen the
   * same day: a removal that steps the page back wrote its key out of the
   * `page` this render closed over, while the move itself was made from the
   * page the pager was on. The two are the same number only for somebody who
   * stood still, so a person who moved left a sentence for a read nobody was
   * going to make - never said, rather than said over another list, which is
   * the half #205 closed. `onPage` below is the ref that tells them apart, and
   * `confirmRemoval` carries what each branch then does.
   */
  const waiting = useRef(null)

  // Which generation of its data this screen is drawn from - #198. A switch of
  // hats that lands where the router already is raises it in `MainPage`, and
  // this screen reads its list again instead of being unmounted, so the page
  // and a department typed into the form but not yet saved both survive the
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
      const answer = await listDepartments({ page, per_page: PAGE_SIZE })
      if (isCurrent()) {
        // #209 - the owner's answer of 19 ตุลาคม 2569: whether the page the
        // person is on still exists is the server's to say, not this screen's.
        // The answer carries `total`, so the last page that exists is known
        // here with no second request, and the page asked for can be past it
        // because `backend/lib/paging.js` floors `page` at 1 and sets no
        // ceiling. Nothing is drawn in that case: drawing it would paint an
        // empty page and the sentence over it before the correction lands.
        // Paged by the size the server says it used and not by `PAGE_SIZE`:
        // the two agree today, and a mutant that swaps one for the other is
        // invisible wherever they do (#117). `backend/lib/paging.js` is what
        // decides it, from a query string this screen is not the only writer
        // of.
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
      // A 401 already raises the shell's dialog; saying it again here would
      // put a banner behind that dialog.
      if (isCurrent() && !error.expired) setNotice({ error: true, message: error.message })
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
  }, [page, generation])

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
   * The page the pager is on now - #206.
   *
   * `onScreen` above answers *which* read a handler's answer belongs to; this
   * answers *where from*, which is the question a removal that steps the page
   * back has to ask before it moves anybody.
   *
   * A removal steps back because the page it was sent from has lost its last
   * row. That is a fact about the page this render closed over and says nothing
   * about where the person is standing when the answer arrives: this screen's
   * `Pager` was given no `busy` until 19 ตุลาคม 2569 — #199 gave one to the
   * enrolment screen's on 15 October 2569 and to no other, and #210's answer
   * that day gave one to all six administration screens — so the pager's own
   * buttons were pressable for as long as the removal was out. They were
   * reachable from under the confirmation with the keyboard until
   * 18 ตุลาคม 2569, the box trapping no focus (#204); #217 contained it that day
   * and the way in became ยกเลิก and an ordinary click, the same situation
   * (#203); and since #210 it is the import panel, whose `onImported` goes to
   * page one and which carries its own flag. The claim below is reachable
   * through it and `206a` is where it is read.
   * Measured on this screen on 13 October 2569, with the removal held at the
   * route: the step back asked for one page while the sentence was keyed for
   * another, so the sentence was said by nothing at all, and the person was
   * carried off the page they had just moved to. Pressed twice it asked the
   * server for `page=0`, which `backend/lib/paging.js` floors to one.
   *
   * `Programs`, `Subjects`, `ProgramSubjects`, `Rubrics`, `Offerings`,
   * `Students` and `SubjectStudents` keep the same ref - the last three have
   * had it since #205, for the branch that goes back to the first page, which
   * is the same question one step earlier.
   */
  const onPage = useRef(page)
  useEffect(() => {
    onPage.current = page
  }, [page])

  /**
   * The ref that counted the list in front of the person - removed on
   * 19 ตุลาคม 2569 by the owner's answer to #209.
   *
   * It held `{ of, rows }`: the count of the list that was **drawn** and the
   * key of the read that drew it, and `confirmRemoval` decided the step back
   * from it. #207 put the key there, because a count without one is the count
   * of whatever page is in front rather than of the page a removal was sent
   * from. What the key could not fix is that the count is of a *drawing*: a
   * second writer makes it stale against the database with nothing on this
   * screen moving, measured both ways on 19 ตุลาคม 2569, and no reading on this
   * client can answer *how many rows has that page now*. The owner's answer
   * moved the question to the server, which answers every read with `total`,
   * so `load` asks whether the page it asked for still exists and this ref has
   * no reader left.
   *
   * The reasoning it carried is not deleted with it: `docs/lessons.md` §#207
   * and §#209 hold it, `docs/acceptance/14-departments.md` §#207 the rows and
   * §#209 the two readings, and `mutation/207-the-rows-the-step-back-counts.py`
   * which of its mutants went. `onPage` above stays: the sentence a removal
   * hands over is still keyed for wherever the person now is (#206).
   */

  const report = useCallback(error => {
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

/**
 * The banner, and when it goes - ticket #91.
 *
 * `notice` used to be overwritten and never cleared, so it stood there across
 * actions it had nothing to do with: a refusal still on the screen after the
 * form that caused it was cancelled, and *saved* floating above a form that
 * had saved nothing.
 *
 * So every place a new action *begins* clears it: opening the form, cancelling
 * it, asking to remove a row, and calling that question off. The places that
 * *end* one do not - `save` and `confirmRemoval` set the banner that is the
 * answer to what just happened, and clearing there would delete the reply
 * along with the question.
 *
 * That distinction is why this is four one-line edits per screen rather than a
 * shared helper: `setEditing(null)` means "cancelled" in one place and "saved,
 * form closed" in the other, and a helper that cleared on both would take the
 * success banner off the screen the moment it was put there.
 *
 * Not a timer. #85 is the ticket about a banner that disappeared before it
 * could be read, and a screen that hides its own answer after three seconds
 * has the same defect in a nicer costume. What the banner is bound to is the
 * person's next action.
 *
 * One case is a genuine loss and is taken knowingly. A removal refused because
 * something still points at the department answers in words that name the way
 * round it - switch the department off instead - and the click that acts on
 * that advice is แก้ไข, which now clears the sentence that gave it. The advice
 * is kept because the alternative is worse: a red bar saying a department
 * could not be deleted, standing over the form for a different department
 * entirely, which is the whole of #91. If it turns out people need the words
 * while they are in the form, they belong *in* the form rather than in a
 * banner that outlives it.
 */

  /**
   * Which press of แก้ไข the form was last asked for - #139.
   *
   * แก้ไข reads the row afresh, and nothing in the table is disabled while that
   * read is out: another แก้ไข, เพิ่มภาควิชา, ลบ and the import can each be
   * started before it answers. Drawn unasked, the answer that **arrives** last
   * won rather than the one **asked for** last - the first row's form replaced
   * the second's, turned an add form into an edit and threw away what had been
   * typed, opened underneath a question about a different department, or took
   * the import panel off the screen halfway through an upload. Its refusal did
   * the same in words: a red bar about one department over the form for
   * another, which is the loss the paragraph above calls the whole of #91.
   *
   * A handler is torn down by nothing, so what it has to ask is *is this still
   * what I was sent for* - a question about now, and a ref's to answer rather
   * than an effect's flag (#133). Every control that decides what takes the
   * form's place writes it: แก้ไข a new ask, and เพิ่มภาควิชา, ลบ and the
   * import's `onStart` none. **An ask is a press, not a row**: pressed twice on
   * one department, the earlier answer would match the later press and open
   * the form again after ยกเลิก or บันทึก.
   *
   * An overtaken refusal is not reported, but the list is still reloaded: that
   * reload is about the table, which the refusal says may be out of date, not
   * about the form - an effect that must always happen does not go behind one
   * that can fail (#131).
   * The pager does not, and that was decided rather than forgotten: the form
   * belongs to the row that was pressed and says so in its own fields, so a
   * person who pages on while it loads still gets the form they asked for.
   *
   * `Programs`, `Subjects`, `ProgramSubjects`, `Rubrics`, `RubricCriteria` and
   * `Plos` ask the same question the same way, and `Offerings` asks it of its
   * panel. `139a-superseded-row-detail.spec.js` has a row for every way in.
   */
  const asked = useRef(null)

  /**
   * The last thing that opened on this screen - #146.
   *
   * `asked` is about the read that *opens* a form; this is about the form
   * itself, because a save ends by closing one and a write is torn down by
   * nothing either. บันทึก is not the last thing that can happen before its
   * answer arrives: ยกเลิก is not disabled while a write is out, the table it
   * returns to disables nothing, and แก้ไข or เพิ่มภาควิชา then opens a second
   * form. Closed unasked, the first save's answer took that second form off the
   * screen with whatever had been typed into it, and put "บันทึกข้อมูลเรียบร้อยแล้ว"
   * over the table - a sentence about a record the person had stopped looking
   * at, in the place where it reads as being about the one they were.
   *
   * So the question is the same one #139 asks, at the other end: *is the screen
   * still where it was when I was sent*. The ref holds the last thing that
   * opened here - แก้ไข a new object of its own, เพิ่มภาควิชา one of its own -
   * and `save` compares what it was sent from with what is there now. A save
   * whose answer finds a different opening closes nothing and says nothing,
   * neither its banner nor its refusal, which is what an overtaken read already
   * does (#139).
   *
   * ยกเลิก writes nothing, and neither does the save that closes its own form.
   * Closing a form is not somebody taking the screen: with nothing in its place
   * there is no record for the sentence to read as being about except the one
   * it is about, and the person who pressed บันทึก is owed the news of the write
   * they made. So `null` here means only that nothing has opened yet. Whether
   * that bar should be shown at all was the question #146 parked rather than
   * answered - it is about what the person sees, so it was the advisor's to
   * answer and not the rebuild's (`docs/06` §Out of Scope).
   *
   * แก้ไข writes the ref at the press and not where its read lands, and that is
   * a consequence of the sentence above: ยกเลิก leaves the ref alone, so between
   * pressing แก้ไข on a second row and that row's form arriving there is a
   * window with no form on the screen at all. A save held across it would find
   * its own opening and put its sentence over the form about to be drawn -
   * *ask by the press, not by the row* (#139). A review asked for this row when
   * ยกเลิก still wrote `null` and the window could not be entered (#102); the
   * answer to the ticket's question is what opened it.
   *
   * What it does *not* change is what the screen disables: ยกเลิก stays
   * pressable during a save, because disabling it is a change to the screen and
   * that is a question rather than a fix (#142, `docs/06` §Out of Scope). The
   * list is still reloaded whichever way the comparison goes - the table may be
   * out of date, and an effect that must always happen does not go behind one
   * that can fail (#131).
   *
   * `Programs`, `Subjects`, `Users`, `Offerings`, `Students` and the seven
   * teacher screens that draw a form beside their list ask it the same way —
   * thirteen with this one. `146a-save-closes-a-later-form.spec.js` has the rows,
   * and `Students.js` says why the thirteenth was found last.
   */
  const showing = useRef(null)

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async department => {
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
      const { department: current } = await getDepartment(department.department_id)
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
      if (editing?.department_id) {
        await updateDepartment(editing.department_id, draft)
      } else {
        await createDepartment(draft)
      }
      const said = { error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' }
      if (showing.current === sent) setEditing(null)
      // #203 - the refusal wins.
      //
      // `load` reports its own failure and returns normally, so a sentence said
      // before it is a sentence said over a refusal the reload is about to
      // write: the person is told the write worked and hears nothing about the
      // list in front of them. The owner settled it on 10 October 2569 - the
      // refusal wins - and #152 carried that to the ten teacher screens. This
      // is the same shape, on the ten administration screens #152 scoped out:
      // the sentence is said by the read that draws it, and not at all if that
      // read is refused.
      //
      // 19 ตุลาคม 2569, #209 - handed over here rather than said below. A save
      // adds no rows, but a second actor's removals can leave the page this
      // one is on past the end, and then this read draws nothing and hands the
      // page on (`HANDED_ON`). Only `load` learns that, and only `load` can
      // re-key the sentence for the read it hands to, so the hand-over has to
      // be written before the await; saying it afterwards on a truthy answer
      // would put *บันทึกข้อมูลเรียบร้อยแล้ว* over a page about to be replaced.
      // The clause this replaces asked, after the await, whether the screen was
      // still the one that asked; the key the sentence carries answers that for
      // the page it is about (#205), and the press that takes the screen is
      // read here, where it was read before.
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

  /**
   * The same question `save` asks, at the handler that is not a save - #202.
   *
   * #146 gave the rule to the write that closes a form and nothing asked it
   * anywhere else: fifteen success sentences, in fourteen handlers across
   * twelve screens, were set unconditionally, and this was one. Eleven of them
   * are this shape; the other four say their sentence behind the flag #152's
   * loader returns, which answers *the read was not refused* and never *it
   * drew*, and are guarded with `onScreen` rather than with `showing` (#199). A removal is held at the route for as
   * long as the server takes, and the table underneath the question is live the
   * whole time. `ConfirmDialog` draws a `fixed inset-0` overlay, and until
   * 18 ตุลาคม 2569 it trapped nothing, so เพิ่มภาควิชา and another row's แก้ไข both
   * answered to Enter where focus already was, which is the `ลบ` that opened
   * the dialog (#204). **#217 contained the focus that day, and the way in a
   * person has is the box's own ยกเลิก**: it is inside the box where the cover
   * cannot eat the click, it is not disabled while the write is out, and
   * putting the question away cancels nothing that has already left the
   * browser - so the situation below is reached by dismissing and then
   * clicking, unchanged in everything but the way in (#203). The
   * answer then put *ลบภาควิชาเรียบร้อยแล้ว* over the form they had opened, in
   * the one place on the screen where a sentence reads as being about what is
   * in front of it.
   *
   * Only the sentence is asked about. The dialog closes, the page steps back
   * and the list is reloaded whichever way the comparison goes: an effect that
   * must always happen does not go behind one that can fail (#131), and a table
   * the removal may have changed is out of date for the person wherever they
   * have moved to. The refusal below is not guarded either, and that is #179's
   * line rather than an oversight - a 409 saying this department cannot go is
   * news for the person, not for the screen they asked about.
   *
   * `Programs`, `Subjects`, `Plos`, `Rubrics`, `RubricCriteria`,
   * `ProgramSubjects` and `Offerings` ask it in their own `confirmRemoval`,
   * `Users` at its status switch and `Offerings` again at the term copy.
   * `202a-the-sentence-belongs-to-the-screen-asked.spec.js` has the rows - one
   * per shape, because where the code is shared no mutant can tell the screens
   * apart (#68).
   */
  const confirmRemoval = async () => {
    const sent = showing.current
    setWriting(true)
    try {
      await deleteDepartment(removing.department_id)
      setRemoving(null)
      const said = { error: false, message: 'ลบภาควิชาเรียบร้อยแล้ว' }
      // The last row of the last page having gone, staying on that page shows
      // an empty table and reads as "there are none". Until 19 ตุลาคม 2569 this
      // handler decided the step back itself, from a count of the list in
      // front of the person: #207 keyed that count to the read that drew it,
      // and the two readings it then had - the live ref and the render's own
      // `data` - are written up in `docs/lessons.md` §#207 and §#209, in
      // `docs/acceptance/14-departments.md` §#207 and §#209, and in
      // `mutation/207-the-rows-the-step-back-counts.py`. Neither was both
      // fresh and of the right page, and the clause that said so named the
      // screen having moved, which the measurement of 19 ตุลาคม 2569 refuted:
      // a second writer makes a drawn count stale with nothing here moving.
      // **The owner's answer, 19 ตุลาคม 2569 (#209): this handler no longer
      // decides anything about the page.** Both readings above are readings of
      // a count, and a count read here cannot be both fresh and of the right
      // page - the ref is the count of the list that is *drawn*, which a second
      // writer makes stale with nothing on this screen moving, and the render's
      // `data` is the right page read at the wrong time. What does know is the
      // server, which answers every read with `total`. So the removal reloads
      // the page the person is on, and `load` asks the one question that is
      // answerable there: *does the page I asked for still exist* - handing the
      // page on when it does not. `onRows` and the two comparisons it fed are
      // gone; `onPage` stays, because the sentence still has to be keyed for
      // wherever the person now is.
      //
      // The sentence is therefore always handed over rather than said here,
      // which is the shape the branch for *nothing moves* already had (#205,
      // #208): the read that draws the list says it, keyed on that read. Three
      // cases and one line each - the read draws and says it; the read hands
      // the page on and `load` re-keys the sentence for the read it handed to;
      // the read is refused and the refusal wins, the `finally` in `load`
      // clearing a sentence nobody is going to say (the owner's decision of
      // 10 October 2569, #152).
      if (showing.current === sent) {
        waiting.current = { of: readOf(onPage.current), said }
      }
      const reader = onScreen.current
      await reader(() => onScreen.current === reader)
    } catch (error) {
      // Including the refusal for a department something still points at,
      // which is a real answer and is shown in the server's own words.
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
        <DepartmentForm
          value={editing}
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
            <h1 className="text-lg font-medium text-primary">ข้อมูลภาควิชา</h1>
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
              เพิ่มภาควิชา
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสภาควิชา</th>
                  <th className="px-4 py-3">ชื่อภาควิชา (ไทย)</th>
                  <th className="px-4 py-3">ชื่อภาควิชา (อังกฤษ)</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
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
                {!loading && data.departments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีภาควิชาในระบบ
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.departments.map(department => (
                    <tr key={department.department_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {department.department_id}
                      </td>
                      <td className="px-4 py-3">{department.department_name_th}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {department.department_name_en ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            department.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {department.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(department)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            asked.current = null
                            setNotice(null)
                            setRemoving(department)
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
            title="นำเข้าภาควิชาจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย"
            templateName="departments-template.csv"
            target="departments"
            fetchTemplate={importTemplate}
            send={importDepartments}
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
        title="ยืนยันการลบภาควิชา"
        message={
          removing
            // label-code: the question names the record about to be destroyed, where two of them
            // sharing a name is the whole reason the code is in the sentence (#93)
            ? `ต้องการลบภาควิชา ${removing.department_id} ${removing.department_name_th} ใช่หรือไม่ หากมีหลักสูตร รายวิชา หรือผู้ใช้งานอ้างอิงอยู่ ระบบจะไม่ลบให้`
            : ''
        }
        confirmLabel="ลบภาควิชา"
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

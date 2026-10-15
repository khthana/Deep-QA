import { useCallback, useEffect, useRef, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import DepartmentForm from '../components/departments/DepartmentForm'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import Pager from '../components/Pager'
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
   * pager a `busy` and left these eight alone, so the sentence above is still
   * true of them and is no longer true of every screen.
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
    try {
      const answer = await listDepartments({ page, per_page: PAGE_SIZE })
      if (isCurrent()) {
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
        waiting.current = null
      }
    }
  }, [page])

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
   * `Pager` is given no `busy` — #199 gave one to the enrolment screen's on 15
   * October 2569 and to no other — and the confirmation traps no focus (#204),
   * so the pager's own buttons are reachable and pressable for as long as the
   * removal is out.
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
   * How many rows the list on the screen is showing, and which read that
   * list is the answer to - #207.
   *
   * `onPage` above answers *where* the person is standing; this answers *what
   * is in front of them*. A step back is a decision about both - the page that
   * lost its last row, and whether the row it lost was the last one - and the
   * second half was read from `data.departments.length`, the `data` of the
   * render the handler closed over. That is #201's claim and not #205's: two
   * claims on neighbouring lines in one handler, and the one about the count
   * had nothing under it.
   *
   * Measured on this screen on 14 October 2569. After #206 a page move alone
   * cannot reach it, because somebody who moved takes the branch that moves
   * nobody. What reaches it is a read that lands while the removal is out and
   * leaves the pager where it started, which the pager's own two presses do -
   * this screen's `Pager` is given no `busy` (#199 gave one to the enrolment
   * screen's on 15 October 2569 and to no other) and the confirmation traps no
   * focus (#204). The handler then counts a list that is no longer on the
   * screen: it counted two rows and stayed on a page whose one remaining row it
   * was about to remove, and the other way round it carried somebody off a page
   * that had filled up again. Both are in
   * `e2e/tests/207a-the-rows-the-step-back-counts.spec.js`.
   *
   * The count on its own is not enough, which both axes of this ticket's
   * review said and a throwaway row measured the same day: `onPage` is written
   * by an effect on `[page]`, at the press, and this one by an effect on
   * `[data]`, at the answer. So between the press that brings the pager back
   * and that page's list landing, `onPage.current === page` holds while the
   * count is still the previous page's - and with the returning list held at
   * the route, that window asked for page 3 where it owed page 2, which is
   * this ticket's own defect in a narrower one. What the ref carries is
   * therefore the key of the read it is the answer to (#201 - the ref holds
   * what the data is *of*; #185 - a key is what identifies a request), and the
   * coordinates of the read are deliberately not dependencies of the effect.
   *
   * A ref rather than a functional updater: `setData(current => ...)` does see
   * the live value, but it sees it in a later task, and this decision is made
   * here - #201 could read the live state that way because it was writing at
   * the time.
   *
   * `Programs`, `Subjects`, `ProgramSubjects`, `Rubrics`, `Offerings` and
   * `SubjectStudents` keep the same ref, each counting its own list.
   *
   * The coordinates of the read are deliberately not dependencies of the
   * effect below: what is stamped is the count of the list that is **drawn**
   * and the key of the read that drew it, so it is written when the list
   * changes and never when the pager moves.
   */
  const onRows = useRef({ of: readOf(page), rows: data.departments.length })
  useEffect(() => {
    onRows.current = { of: readOf(page), rows: data.departments.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

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
      await load(() => onScreen.current === load)
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
      // `load` answers whether it drew, and the sentence is said only if it did
      // and only if the screen is still the one that asked.
      const reloaded = await load(() => onScreen.current === load)
      if (reloaded && showing.current === sent) setNotice(said)
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
   * whole time - `ConfirmDialog` draws a `fixed inset-0` overlay and traps
   * nothing, so เพิ่มภาควิชา and another row's แก้ไข both answer to Enter where
   * focus already is, which is the `ลบ` that opened the dialog (#204). The
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
      // an empty table and reads as "there are none". Stepping back is a change
      // of page and the effect fetches it; calling `load` here as well would
      // race it with a second request for the page just left, and whichever
      // answered last would win.
      // #207 - how many rows the page this removal was sent from was showing.
      //
      // Two readings of that count are here and neither is both fresh and of
      // the right page. The live ref is the count of the list that is drawn and
      // its key says which read drew it, so while that key is this page's it is
      // the count, and that is the reading this ticket is about. Once the list
      // on the screen is another page's, what is left is the render's own
      // `data`: the right page read at the wrong time. Reading the live ref
      // unconditionally instead - the first round of this fix - took `206a`
      // row 1 red, a person two pages back leaving ten rows live, so the
      // removal stopped stepping back at all and fell into the branch below
      // that reloads with a loader the screen has replaced. A sweep cannot see
      // the row your own fix breaks (#83); the clean suite can.
      //
      // So the two readings answer two questions. *Did the page lose its last
      // row* decides which loader reads, and the stale reading may answer it,
      // which is the branch below that a person who moved takes. *May anybody
      // be moved on it* needs the live count, and nothing else: between the
      // press that brings the pager back and that page's list landing,
      // `onPage.current === page` holds while the count is still the previous
      // page's, and moving on that count carries somebody off a page that has
      // filled up again - what #206 calls the worse answer. Both axes of this
      // ticket's review asked for the key; the window it opens was measured on
      // 14 October 2569 by a throwaway row, which is now `207a` row 3.
      //
      // What no reading here can give is the count of the page the removal was
      // sent from *now*, once the screen is showing another page's list. The
      // step back then does not happen even where it should, and the person is
      // left on a page whose rows are gone with the sentence over it. That half
      // needs a read of a page nobody is looking at; it is written down as a
      // draft ticket and is not this one's claim.
      const liveCountIsOfThisPage = onRows.current.of === readOf(page)
      const lostItsLastRow =
        page > 1 &&
        (liveCountIsOfThisPage ? onRows.current.rows : data.departments.length) === 1
      const stepBack = lostItsLastRow && liveCountIsOfThisPage
      // #203 - a page move is a read the effect does, so the sentence is handed
      // over for `load` to say when it has drawn: the `waiting` ref above.
      //
      // #206 - and the step back belongs to the page that lost its last row, so
      // it happens only while the pager is still on it. A person who moved
      // while the removal was out keeps the page they moved to: the move they
      // did not ask for is the worse answer, and the sentence is keyed for the
      // read of the list in front of them rather than for a read nobody is
      // going to make.
      if (stepBack && onPage.current === page) {
        if (showing.current === sent) {
          const target = readOf(page - 1)
          waiting.current = { of: target, said }
        }
        setPage(current => current - 1)
      } else if (lostItsLastRow) {
        if (showing.current === sent) {
          const target = readOf(onPage.current)
          waiting.current = { of: target, said }
        }
        // Nothing moves, so no read is coming: the list the person is on is
        // read here by the loader that belongs to it, and that read is what
        // says the sentence. Handed over rather than said by this handler
        // because the key is the one place the two are compared - the shape
        // #205 arrived at for the branch whose move would cause no read.
        const drawing = onScreen.current
        await drawing(() => onScreen.current === drawing)
      } else {
        const reloaded = await load(() => onScreen.current === load)
        if (reloaded && showing.current === sent) setNotice(said)
      }
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
              if (page === 1) load(() => onScreen.current === load)
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

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
   * #68 - the answer that is drawn is the answer to the request the screen is
   * still on; without the flag the answer that **arrives** last wins rather
   * than the one asked for last. The rule, the three rows that prove it, and
   * why fifteen panels repeat it rather than share one hook, are written on
   * `frontend/src/pages/Students.js`.
   */
  const load = useCallback(async isCurrent => {
    setLoading(true)
    try {
      const answer = await listDepartments({ page, per_page: PAGE_SIZE })
      if (isCurrent()) setData(answer)
    } catch (error) {
      // A 401 already raises the shell's dialog; saying it again here would
      // put a banner behind that dialog.
      if (isCurrent() && !error.expired) setNotice({ error: true, message: error.message })
    } finally {
      if (isCurrent()) setLoading(false)
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

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async department => {
    const ask = {}
    asked.current = ask
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
    setWriting(true)
    try {
      if (editing?.department_id) {
        await updateDepartment(editing.department_id, draft)
      } else {
        await createDepartment(draft)
      }
      setEditing(null)
      setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })
      await load(() => onScreen.current === load)
    } catch (error) {
      report(error)
    } finally {
      setWriting(false)
    }
  }

  const confirmRemoval = async () => {
    setWriting(true)
    try {
      await deleteDepartment(removing.department_id)
      setRemoving(null)
      setNotice({ error: false, message: 'ลบภาควิชาเรียบร้อยแล้ว' })
      // The last row of the last page having gone, staying on that page shows
      // an empty table and reads as "there are none". Stepping back is a change
      // of page and the effect fetches it; calling `load` here as well would
      // race it with a second request for the page just left, and whichever
      // answered last would win.
      const stepBack = page > 1 && data.departments.length === 1
      if (stepBack) setPage(current => current - 1)
      else await load(() => onScreen.current === load)
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

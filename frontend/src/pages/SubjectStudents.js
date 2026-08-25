import { useCallback, useEffect, useState } from 'react'
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
   * `loading` swaps the rows of the table and nothing above it — Students.js'
   * shape, and here for a reason worth writing down.
   *
   * A reload after an import is a read of a list that is already on the screen.
   * Unmounting the screen for the length of it takes `ImportPanel` with it, and
   * the per-row report lives in that component's own state: a person who had
   * just been told which three lines were wrong would watch the answer vanish.
   * So `data` decides whether there is a screen and survives a reload, and
   * `loading` decides only what the table's body is showing.
   */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await listEnrolled(sectionId, { page }))
    } catch (error) {
      setData(null)
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [sectionId, page])

  useEffect(() => {
    load()
  }, [load])

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
   */
  const reload = useCallback(async () => {
    if (page === 1) await load()
    else setPage(1)
  }, [page, load])

  /**
   * Adding one student.
   *
   * The list is reloaded rather than having the new row pushed onto it: the
   * page being shown is a page of ten sorted by code, and a student whose code
   * sorts before the last one on it does not belong at the bottom.
   */
  const add = async event => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      const { student } = await enrolStudent(sectionId, code.trim())
      setCode('')
      await reload()
      setNotice({
        error: false,
        message: `เพิ่ม ${student.student_id} ${student.full_name_th} เข้าตอนเรียนแล้ว`,
      })
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setNotice(null)
    const student = removing
    try {
      await removeEnrolment(sectionId, student.student_id)
      setRemoving(null)
      // The last student on the last page leaves an empty page behind them,
      // which reads as a list that lost everything. #57's screens step back for
      // the same reason.
      if (data.students.length === 1 && page > 1) setPage(page - 1)
      else await load()
      setNotice({
        error: false,
        message: `นำ ${student.student_id} ${student.full_name_th} ออกจากตอนเรียนแล้ว`,
      })
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
            fetchTemplate={() => importTemplate(sectionId)}
            send={csv => importEnrolments(sectionId, csv)}
            onStart={() => setNotice(null)}
            onImported={reload}
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
                          {student.program_id}
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

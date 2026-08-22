import { useCallback, useEffect, useState } from 'react'

import ContentMotionDIV from '../components/ContentMotionDIV'
import ImportPanel from '../components/ImportPanel'
import Pager from '../components/Pager'
import StudentForm from '../components/students/StudentForm'
import {
  createStudent,
  importStudents,
  importTemplate,
  listReachableDepartments,
  listReachablePrograms,
  listStudents,
} from '../api/students'

/**
 * ข้อมูลนักศึกษากลาง — ticket #17.
 *
 * The register every student first appears in. Nothing beneath it — enrolling
 * one into a Section (#25), marking their work, reporting a CLO result — can
 * name a student who is not here, so the two buttons at the bottom of this
 * screen are what make the whole Teacher half of the application reachable.
 * The inherited screen drew both of them and wired neither.
 *
 * The ผู้ดูแลภาควิชา owns it alone, which the advisor settled the way #61
 * settled the catalogue: a register is departmental master data. The
 * ผู้ดูแลระดับคณะ and the กรรมการหลักสูตร both reached this screen as
 * delivered and neither reaches it now — enforced at the server, as ADR-0002
 * asks, with the menu entry removed as a convenience rather than as the rule.
 *
 * The two filters the ticket asks for are not two dropdowns. An account that
 * reaches this screen reaches one department, so ภาควิชา is stated rather than
 * offered — the same shape ข้อมูลรายวิชา settled on, and for the same reason: a
 * control whose every option returns the same rows is a control that does
 * nothing, and taking the row away entirely would take "which register am I
 * reading?" off the screen. หลักสูตร is the filter that has something to say,
 * because a department has several and a student belongs to exactly one.
 *
 * There is no แก้ไข and no ลบ. docs/06's stories are browse, add and page, and
 * #17 asks for nothing else; a student who leaves is a `status`, which the
 * ticket that needs it can add.
 */

const PAGE_SIZE = 10

const STATUS = {
  active: 'กำลังศึกษา',
  inactive: 'พักการศึกษา',
  graduated: 'สำเร็จการศึกษา',
  suspended: 'พ้นสภาพ',
}

export default function Students() {
  const [page, setPage] = useState(1)
  const [program, setProgram] = useState('')
  const [data, setData] = useState({ students: [], total: 0 })
  const [programs, setPrograms] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  const report = useCallback(error => {
    // A 401 already raises the shell's dialog; saying it again here would put a
    // banner behind that dialog.
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await listStudents({ page, per_page: PAGE_SIZE, program_id: program }))
    } catch (error) {
      report(error)
    } finally {
      setLoading(false)
    }
  }, [page, program, report])

  useEffect(() => {
    load()
  }, [load])

  // What this account covers is a property of the grant and does not change
  // with the page being looked at, so both lists are fetched once. The
  // programmes are the filter's options, the form's picker and the way a
  // `program_id` on a row becomes a name; the departments are the way the
  // department behind it becomes one.
  useEffect(() => {
    let cancelled = false
    Promise.all([listReachablePrograms(), listReachableDepartments()])
      .then(([{ programs: reachable }, { departments: covered }]) => {
        if (cancelled) return
        setPrograms(reachable)
        setDepartments(covered)
      })
      .catch(report)
    return () => {
      cancelled = true
    }
  }, [report])

  const programNameOf = programId =>
    programs.find(entry => entry.program_id === programId)?.program_name_th ?? programId

  const save = async draft => {
    setBusy(true)
    try {
      await createStudent(draft)
      setAdding(false)
      setNotice({ error: false, message: 'บันทึกข้อมูลนักศึกษาเรียบร้อยแล้ว' })
      // Back to the first page, where the list's newest-first order puts a
      // student who has just been added. Setting the page is a change the
      // effect fetches; calling `load` as well would race it, so only the
      // branch that is already on page one reloads by hand.
      if (page === 1) await load()
      else setPage(1)
    } catch (error) {
      report(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {notice && (
        <ContentMotionDIV
          className={`rounded-lg p-3 text-sm ${
            notice.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}
        >
          {notice.message}
        </ContentMotionDIV>
      )}

      {adding ? (
        <StudentForm
          programs={programs}
          departments={departments}
          busy={busy}
          onSave={save}
          onCancel={() => {
            setNotice(null)
            setAdding(false)
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-medium text-primary">ข้อมูลนักศึกษากลาง</h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* Stated, not offered — see the note at the top of the file. */}
              {departments.length === 1 && (
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  ภาควิชา
                  <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                    {departments[0].department_id} {departments[0].department_name_th}
                  </span>
                </span>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-600">
                หลักสูตร
                <select
                  value={program}
                  onChange={event => {
                    // Page 3 of the department's register is rarely page 3 of
                    // one หลักสูตร's.
                    setPage(1)
                    setProgram(event.target.value)
                  }}
                  className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                >
                  <option value="">ทุกหลักสูตร</option>
                  {programs.map(entry => (
                    <option key={entry.program_id} value={entry.program_id}>
                      {entry.program_id} {entry.program_name_th}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setNotice(null)
                  setAdding(true)
                }}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
              >
                เพิ่มนักศึกษา
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสนักศึกษา</th>
                  <th className="px-4 py-3">ชื่อ - นามสกุล</th>
                  <th className="px-4 py-3">หลักสูตร</th>
                  <th className="px-4 py-3">ปีที่เข้าศึกษา</th>
                  <th className="px-4 py-3">สถานะ</th>
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
                {!loading && data.students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      {program ? 'ยังไม่มีนักศึกษาในหลักสูตรนี้' : 'ยังไม่มีข้อมูลนักศึกษาในระบบ'}
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.students.map(student => (
                    <tr key={student.student_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{student.student_id}</td>
                      <td className="px-4 py-3">{student.full_name_th}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {programNameOf(student.program_id)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{student.admission_year}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            student.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {STATUS[student.status] ?? student.status}
                        </span>
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
            title="นำเข้ารายชื่อนักศึกษาจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย รหัสนักศึกษาที่มีอยู่แล้วจะถูกปรับปรุงข้อมูลแทนการเพิ่มซ้ำ"
            templateName="students-template.csv"
            fetchTemplate={importTemplate}
            send={importStudents}
            onImported={() => {
              setPage(1)
              load()
            }}
            onError={report}
          />
        </>
      )}
    </div>
  )
}

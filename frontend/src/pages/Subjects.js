import { useCallback, useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
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

export default function Subjects() {
  const [page, setPage] = useState(1)
  const [department, setDepartment] = useState('')
  const [data, setData] = useState({ subjects: [], total: 0 })
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const report = useCallback(error => {
    // A 401 already raises the shell's dialog; saying it again here would put a
    // banner behind that dialog.
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await listSubjects({ page, per_page: PAGE_SIZE, department_id: department })
      )
    } catch (error) {
      report(error)
    } finally {
      setLoading(false)
    }
  }, [page, department, report])

  useEffect(() => {
    load()
  }, [load])

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

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async subject => {
    setNotice(null)
    setBusy(true)
    try {
      const { subject: current } = await getSubject(subject.subject_id)
      setEditing(current)
    } catch (error) {
      report(error)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const save = async draft => {
    setBusy(true)
    try {
      if (editing?.subject_id) {
        await updateSubject(editing.subject_id, draft)
      } else {
        await createSubject(draft)
      }
      setEditing(null)
      setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })
      await load()
    } catch (error) {
      report(error)
    } finally {
      setBusy(false)
    }
  }

  const confirmRemoval = async () => {
    setBusy(true)
    try {
      const answer = await deleteSubject(removing.subject_id)
      const deactivated = Boolean(answer?.deactivated)
      setRemoving(null)
      setNotice({
        error: false,
        message: deactivated
          ? 'รายวิชานี้มีข้อมูลอื่นอ้างอิงอยู่ ระบบจึงปิดการใช้งานแทนการลบ ข้อมูลเดิมยังเรียกดูได้'
          : 'ลบรายวิชาเรียบร้อยแล้ว',
      })
      // The last row of the last page having gone, staying on that page shows an
      // empty table and reads as "there are none". Stepping back is a change of
      // page and the effect fetches it; calling `load` here as well would race
      // it with a second request for the page just left. A deactivation removes
      // nothing from the list, so it never steps back.
      const stepBack = !deactivated && page > 1 && data.subjects.length === 1
      if (stepBack) setPage(current => current - 1)
      else await load()
    } catch (error) {
      setRemoving(null)
      report(error)
    } finally {
      setBusy(false)
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
                        {entry.department_id} {entry.department_name_th}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                departments.length === 1 && (
                  <span className="flex items-center gap-2 text-sm text-slate-600">
                    ภาควิชา
                    <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                      {departments[0].department_id} {departments[0].department_name_th}
                    </span>
                  </span>
                )
              )}
              <button
                type="button"
                onClick={() => {
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
          />

          <ImportPanel
            title="นำเข้ารายวิชาจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย"
            templateName="subjects-template.csv"
            fetchTemplate={importTemplate}
            send={importSubjects}
            onImported={() => {
              setPage(1)
              load()
            }}
            onStart={() => setNotice(null)}
            onError={report}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ยืนยันการลบรายวิชา"
        message={
          removing
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

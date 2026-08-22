import { useCallback, useEffect, useState } from 'react'

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
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await listDepartments({ page, per_page: PAGE_SIZE }))
    } catch (error) {
      // A 401 already raises the shell's dialog; saying it again here would
      // put a banner behind that dialog.
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
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

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async department => {
    setNotice(null)
    setBusy(true)
    try {
      const { department: current } = await getDepartment(department.department_id)
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
      if (editing?.department_id) {
        await updateDepartment(editing.department_id, draft)
      } else {
        await createDepartment(draft)
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
      else await load()
    } catch (error) {
      // Including the refusal for a department something still points at,
      // which is a real answer and is shown in the server's own words.
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

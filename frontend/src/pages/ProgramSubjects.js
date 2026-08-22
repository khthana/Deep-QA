import { useCallback, useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import ImportPanel from '../components/ImportPanel'
import Pager from '../components/Pager'
import ProgramSubjectForm from '../components/programSubjects/ProgramSubjectForm'
import {
  createProgramSubject,
  deleteProgramSubject,
  getProgramSubject,
  importProgramSubjects,
  importTemplate,
  listProgramSubjects,
  listReachablePrograms,
  updateProgramSubject,
} from '../api/programSubjects'

/**
 * รายวิชาในหลักสูตร — ticket #18.
 *
 * Which subjects a หลักสูตร is made of, and whether each is บังคับ or เลือก.
 * This is the first screen the กรรมการหลักสูตร owns; the two administrators
 * above them reach it too, over the programmes they hold, and neither is told so
 * by this file — the server filters the list and refuses the writes, and what
 * arrives is simply what that account may see (ADR-0002).
 *
 * The programme filter is the same control ข้อมูลรายวิชา draws for departments
 * and for the same two readings: a committee member reaches one programme and is
 * shown its name rather than a dropdown whose every option returns the same
 * rows, and the row stays on the screen either way so it always says which
 * curriculum is being read.
 *
 * The list shows pairings that have been switched off as well as current ones,
 * deliberately: this is the screen one is switched back on from, and it is the
 * only way back — the pair is the key, so placing the same subject again would
 * collide with the row that is already there.
 *
 * Taking a subject out asks first, and may come back having done something else.
 * A pairing nothing points at is deleted; one an Offering points at — and
 * through it the CLOs, the weighting scheme and every mark recorded under them —
 * is switched off instead, and the banner says which happened.
 */

const PAGE_SIZE = 10

const TYPES = { required: 'วิชาบังคับ', elective: 'วิชาเลือก' }

export default function ProgramSubjects() {
  const [page, setPage] = useState(1)
  const [program, setProgram] = useState('')
  const [data, setData] = useState({ program_subjects: [], total: 0 })
  const [programs, setPrograms] = useState([])
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
      setData(await listProgramSubjects({ page, per_page: PAGE_SIZE, program_id: program }))
    } catch (error) {
      report(error)
    } finally {
      setLoading(false)
    }
  }, [page, program, report])

  useEffect(() => {
    load()
  }, [load])

  // The programmes in reach, fetched once: what this account covers is a
  // property of the grant and does not change with the page being looked at.
  // Used three times — to name the programme each row sits in, as the pool the
  // form's picker draws from, and as the filter's options.
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

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async pair => {
    setNotice(null)
    setBusy(true)
    try {
      const { program_subject: current } = await getProgramSubject(
        pair.program_id,
        pair.subject_id
      )
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
        await updateProgramSubject(editing.program_id, editing.subject_id, draft)
      } else {
        await createProgramSubject(draft)
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
      const answer = await deleteProgramSubject(removing.program_id, removing.subject_id)
      const deactivated = Boolean(answer?.deactivated)
      setRemoving(null)
      setNotice({
        error: false,
        message: deactivated
          ? 'รายวิชานี้มีการเปิดสอนหรือข้อมูลอื่นอ้างอิงอยู่ ระบบจึงปิดการใช้งานแทนการลบ ข้อมูลเดิมยังเรียกดูได้'
          : 'นำรายวิชาออกจากหลักสูตรเรียบร้อยแล้ว',
      })
      // The last row of the last page having gone, staying on that page shows an
      // empty table and reads as "there are none". Stepping back is a change of
      // page and the effect fetches it; calling `load` here as well would race it
      // with a second request for the page just left. A deactivation removes
      // nothing from the list, so it never steps back.
      const stepBack = !deactivated && page > 1 && data.program_subjects.length === 1
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
      {notice && (
        <ContentMotionDIV
          className={`rounded-lg p-3 text-sm ${
            notice.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}
        >
          {notice.message}
        </ContentMotionDIV>
      )}

      {editing ? (
        <ProgramSubjectForm
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
            <h1 className="text-lg font-medium text-primary">รายวิชาในหลักสูตร</h1>
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
                      // Back to the first page: page 3 of the faculty's
                      // curricula is rarely a page of one programme's.
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
              ) : (
                programs.length === 1 && (
                  <span className="flex items-center gap-2 text-sm text-slate-600">
                    หลักสูตร
                    <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
                      {programs[0].program_id} {programs[0].program_name_th}
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
                เพิ่มรายวิชาเข้าหลักสูตร
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
                  <th className="px-4 py-3">ประเภท</th>
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
                {!loading && data.program_subjects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีรายวิชาในหลักสูตรนี้
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.program_subjects.map(pair => (
                    <tr key={`${pair.program_id} ${pair.subject_id}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{pair.subject_id}</td>
                      <td className="px-4 py-3">
                        {pair.subject_name_th}
                        <span className="block text-xs text-slate-500">
                          {pair.subject_name_en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{pair.credits}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            pair.subject_type === 'required'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {TYPES[pair.subject_type] ?? pair.subject_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{nameOf(pair.program_id)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            pair.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {pair.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(pair)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null)
                            setRemoving(pair)
                          }}
                          className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50"
                        >
                          นำออก
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
            title="นำเข้ารายวิชาในหลักสูตรจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย"
            templateName="program-subjects-template.csv"
            fetchTemplate={importTemplate}
            send={importProgramSubjects}
            onImported={() => {
              setPage(1)
              load()
            }}
            onError={report}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ยืนยันการนำรายวิชาออกจากหลักสูตร"
        message={
          removing
            ? `ต้องการนำรายวิชา ${removing.subject_id} ${removing.subject_name_th} ออกจากหลักสูตร ${removing.program_id} ใช่หรือไม่ หากมีการเปิดสอนหรือข้อมูลอื่นอ้างอิงอยู่ ระบบจะปิดการใช้งานให้แทนการลบ`
            : ''
        }
        confirmLabel="นำออกจากหลักสูตร"
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

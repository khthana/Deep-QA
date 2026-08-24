import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import ConfirmDialog from '../components/ConfirmDialog'
import Notice from '../components/Notice'
import Pager from '../components/Pager'
import RubricForm from '../components/rubrics/RubricForm'
import {
  createRubric,
  deleteRubric,
  getRubric,
  listRubrics,
  listReachablePrograms,
  updateRubric,
} from '../api/rubrics'

/**
 * ข้อมูล Rubric กลาง — ticket #21.
 *
 * The scales a หลักสูตร marks against, so that two Teachers assessing the same
 * kind of work assess it the same way. The screen belongs to the
 * กรรมการหลักสูตร; the ผู้ดูแลภาควิชา above them reaches it too, over the
 * curricula they hold, and neither is told so by this file — the server filters
 * the list and refuses the writes, and what arrives is simply what that account
 * may see (ADR-0002).
 *
 * Three things about this screen are decisions rather than habit.
 *
 * *A rubric code is unique across the institution.* This is the opposite of the
 * ผลการเรียนรู้ screen, where the whole ticket is that two curricula may each
 * hold a PLO-1. The paragraph under the heading says so, and the form's hint
 * says so again, because the alternative is a person meeting a 409 about a
 * rubric that belongs to a curriculum they cannot see and concluding the screen
 * is broken.
 *
 * *The criteria are a link, not a column of this screen.* The four-level
 * weighted criteria are `rubric_details` and belong to #22. What this screen
 * owes the ticket's fifth criterion is a way in, and what it owes the person is
 * the number — a rubric with no criteria marks nothing, and that is worth
 * seeing from the list rather than after a click.
 *
 * *Removing is final, and the confirmation says how final.* Every other
 * master-data screen may come back having switched a row off instead; there is
 * no such column here and nothing points at a rubric except its own criteria,
 * which CASCADE. So the dialog names the criteria that are about to go, and the
 * banner afterwards says how many did.
 */

const PAGE_SIZE = 10

export default function Rubrics() {
  const [page, setPage] = useState(1)
  const [program, setProgram] = useState('')
  const [data, setData] = useState({ rubrics: [], total: 0 })
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
      setData(await listRubrics({ page, per_page: PAGE_SIZE, program_id: program }))
    } catch (error) {
      report(error)
    } finally {
      setLoading(false)
    }
  }, [page, program, report])

  useEffect(() => {
    load()
  }, [load])

  // The curricula in reach, fetched once: what this account covers is a
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

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async rubric => {
    setNotice(null)
    setBusy(true)
    try {
      const { rubric: current } = await getRubric(rubric.id)
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
      if (editing?.id) await updateRubric(editing.id, draft)
      else await createRubric(draft)
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
      const answer = await deleteRubric(removing.id)
      const removedCriteria = Number(answer?.criteria_removed ?? 0)
      setRemoving(null)
      setNotice({
        error: false,
        message: removedCriteria
          ? `ลบ Rubric เรียบร้อยแล้ว พร้อมเกณฑ์การให้คะแนน ${removedCriteria} ข้อที่อยู่ใต้ Rubric นี้`
          : 'ลบ Rubric เรียบร้อยแล้ว',
      })
      // The last row of the last page having gone, staying on that page shows an
      // empty table and reads as "there are none". Stepping back is a change of
      // page and the effect fetches it; calling `load` here as well would race
      // it with a second request for the page just left.
      const stepBack = page > 1 && data.rubrics.length === 1
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
        <RubricForm
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
            <h1 className="text-lg font-medium text-primary">ข้อมูล Rubric กลาง</h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* A picker when there is a choice to make, and a statement of
                  where one is when there is not — ผลการเรียนรู้ระดับหลักสูตร's
                  control, for its reasons. A กรรมการหลักสูตร reaches one
                  curriculum and is shown which. */}
              {programs.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  หลักสูตร
                  <select
                    value={program}
                    onChange={event => {
                      // Back to the first page: page 2 of both curricula's
                      // rubrics is rarely page 2 of one of them.
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
                เพิ่ม Rubric
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            รหัส Rubric ห้ามซ้ำกันทั้งระบบ ต่างจากรหัสผลการเรียนรู้ระดับหลักสูตรที่ซ้ำข้ามหลักสูตรได้
            รายการเรียงตามลำดับที่ตั้งไว้ และลำดับที่เท่ากันจะเรียงตามรหัส
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัส</th>
                  <th className="px-4 py-3">ชื่อ Rubric</th>
                  <th className="px-4 py-3">ลำดับ</th>
                  <th className="px-4 py-3">เกณฑ์การให้คะแนน</th>
                  <th className="px-4 py-3">หลักสูตร</th>
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
                {!loading && data.rubrics.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มี Rubric ในหลักสูตรนี้
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.rubrics.map(rubric => (
                    <tr key={rubric.id}>
                      {/* The code leads the row because it is this table's
                          natural key, as the code does on every other
                          master-data screen - and because the paging helper the
                          browser seam shares reads the first cell of each row
                          as the key that tells two pages apart. ลำดับ could not
                          do that job: two rubrics may hold the same one. */}
                      <td className="px-4 py-3 font-bold text-gray-900">{rubric.rubric_code}</td>
                      <td className="px-4 py-3">
                        {rubric.rubric_name_th}
                        <span className="block text-xs text-slate-500">
                          {rubric.rubric_name_en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{rubric.display_order}</td>
                      <td className="px-4 py-3">
                        {/* The fifth criterion. The count is here rather than
                            behind the click because a rubric with none marks
                            nothing, and that is worth seeing from the list. */}
                        <Link
                          to={`/main/rubrics/${rubric.id}/criteria`}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          {rubric.criteria_count > 0
                            ? `ดูเกณฑ์ ${rubric.criteria_count} ข้อ`
                            : 'ยังไม่มีเกณฑ์ — กำหนดเกณฑ์'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{nameOf(rubric.program_id)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(rubric)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null)
                            setRemoving(rubric)
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
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ยืนยันการลบ Rubric"
        message={
          removing
            ? `ต้องการลบ Rubric ${removing.rubric_code} ${removing.rubric_name_th} ใช่หรือไม่ ${
                removing.criteria_count > 0
                  ? `เกณฑ์การให้คะแนน ${removing.criteria_count} ข้อที่อยู่ใต้ Rubric นี้จะถูกลบไปด้วย และ`
                  : ''
              }การลบนี้ย้อนกลับไม่ได้`
            : ''
        }
        confirmLabel="ลบ Rubric"
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

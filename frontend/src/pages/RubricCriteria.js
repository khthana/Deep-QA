import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import ConfirmDialog from '../components/ConfirmDialog'
import Notice from '../components/Notice'
import CriterionForm, { BANDS } from '../components/rubrics/CriterionForm'
import {
  createCriterion,
  deleteCriterion,
  getCriterion,
  listCriteria,
  updateCriterion,
} from '../api/rubricCriteria'

/**
 * เกณฑ์การให้คะแนนของ Rubric — ticket #22.
 *
 * What one Rubric scores on: the criteria, their weights, and what work looks
 * like at each of the four bands. #21 keeps the list of rubrics and opens the
 * door here; this screen is what is behind that door.
 *
 * Four things about it are decisions rather than habit.
 *
 * *The rubric is the address, and this screen never asks which one.* ADR-0004's
 * shape one tier down: `/main/rubrics/:rubricId/criteria`. There is no picker,
 * no หลักสูตร dropdown and no filter, because there is nothing to choose — a
 * criterion belongs to exactly one rubric and the rubric belongs to exactly one
 * curriculum. The server reads that rubric to decide whether to answer at all
 * and hands it back with the list, which is what the heading names.
 *
 * *A rubric this account may not open reads as a refusal, not as an empty
 * table.* The list answers 404 for the rubric that was never made and for the
 * one in another curriculum alike, and this screen shows the server's sentence.
 * An empty table would say "this rubric has no criteria", which is a different
 * and false statement — and is what a person typing another curriculum's id
 * into the address bar must not be told.
 *
 * *The four bands are four columns, wide.* A criterion's descriptions are
 * sentences and the marker reads across them; putting them behind a click would
 * make the one thing this screen exists to show the one thing it does not.
 * The table scrolls sideways rather than wrapping them into unreadable
 * columns.
 *
 * *There is no paging.* A rubric is a page of guidance somebody reads while
 * marking; a scoring guide split across pages is worse than a long one. The
 * count is stated instead, so that a rubric with nothing in it says so.
 */

export default function RubricCriteria() {
  const { rubricId } = useParams()
  const [data, setData] = useState({ rubric: null, criteria: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [refusal, setRefusal] = useState(null)
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
      setData(await listCriteria(rubricId))
      setRefusal(null)
    } catch (error) {
      // The whole screen is about one rubric, so a refusal about that rubric is
      // the state of the screen rather than a banner over a table that would
      // otherwise be there.
      if (error.expired) return
      setRefusal(error.message)
      setData({ rubric: null, criteria: [], total: 0 })
    } finally {
      setLoading(false)
    }
  }, [rubricId])

  useEffect(() => {
    load()
  }, [load])

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async criterion => {
    setNotice(null)
    setBusy(true)
    try {
      const { criterion: current } = await getCriterion(rubricId, criterion.id)
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
      if (editing?.id) await updateCriterion(rubricId, editing.id, draft)
      else await createCriterion(rubricId, draft)
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
      const answer = await deleteCriterion(rubricId, removing.id)
      setRemoving(null)
      // The name comes from the answer and not from the row the table was
      // holding: what went is what the server removed.
      setNotice({
        error: false,
        message: answer?.criteria_name_th
          ? `ลบเกณฑ์ ${answer.criteria_name_th} เรียบร้อยแล้ว`
          : 'ลบเกณฑ์เรียบร้อยแล้ว',
      })
      await load()
    } catch (error) {
      setRemoving(null)
      report(error)
    } finally {
      setBusy(false)
    }
  }

  if (refusal) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">{refusal}</p>
          <Link
            to="/main/rubrics"
            className="mt-4 inline-block rounded-lg px-3 py-1.5 text-sm text-primary hover:bg-blue-50"
          >
            กลับไปหน้าข้อมูล Rubric กลาง
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Notice notice={notice} />

      {editing ? (
        <CriterionForm
          value={editing}
          rubric={data.rubric}
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
            <div>
              <h1 className="text-lg font-medium text-primary">
                เกณฑ์การให้คะแนนของ Rubric {data.rubric?.rubric_code}
              </h1>
              <p className="text-sm text-slate-500">
                {data.rubric?.rubric_name_th}
                {data.rubric?.rubric_name_en ? ` · ${data.rubric.rubric_name_en}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/main/rubrics"
                className="rounded-lg px-3 py-1.5 text-sm text-primary hover:bg-blue-50"
              >
                กลับไปหน้าข้อมูล Rubric กลาง
              </Link>
              <button
                type="button"
                onClick={() => {
                  setNotice(null)
                  setEditing({})
                }}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover"
              >
                เพิ่มเกณฑ์
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Rubric นี้มีเกณฑ์การให้คะแนน {data.total} ข้อ
            เรียงตามลำดับที่ตั้งไว้ และทุกข้อต้องมีคำอธิบายครบทั้งสี่ระดับ
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">เกณฑ์การประเมิน</th>
                  <th className="px-4 py-3">น้ำหนัก</th>
                  <th className="px-4 py-3">ลำดับ</th>
                  {BANDS.map(band => (
                    <th key={band.key} className="px-4 py-3">
                      {band.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={4 + BANDS.length} className="px-4 py-8 text-center text-slate-500">
                      กำลังโหลด…
                    </td>
                  </tr>
                )}
                {!loading && data.criteria.length === 0 && (
                  <tr>
                    <td colSpan={4 + BANDS.length} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีเกณฑ์การให้คะแนนใน Rubric นี้
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.criteria.map(criterion => (
                    <tr key={criterion.id}>
                      {/* The Thai name leads the row, as the code does on every
                          screen that has one. A criterion has no code — its
                          name is the only thing a person recognises it by, and
                          ลำดับ could not do that job: two criteria may hold the
                          same one. */}
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {criterion.criteria_name_th}
                        <span className="block text-xs font-normal text-slate-500">
                          {criterion.criteria_name_en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{criterion.weight}</td>
                      <td className="px-4 py-3 text-slate-500">{criterion.display_order}</td>
                      {BANDS.map(band => (
                        <td key={band.key} className="min-w-48 px-4 py-3 text-slate-600">
                          {criterion[band.key]}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(criterion)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null)
                            setRemoving(criterion)
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
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ยืนยันการลบเกณฑ์การให้คะแนน"
        message={
          removing
            ? `ต้องการลบเกณฑ์ ${removing.criteria_name_th} ออกจาก Rubric นี้ใช่หรือไม่ คำอธิบายทั้งสี่ระดับของเกณฑ์นี้จะถูกลบไปด้วย และการลบนี้ย้อนกลับไม่ได้`
            : ''
        }
        confirmLabel="ลบเกณฑ์"
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

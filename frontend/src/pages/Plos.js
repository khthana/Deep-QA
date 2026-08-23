import { useCallback, useEffect, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import Notice from '../components/Notice'
import PloForm, { TYPES } from '../components/plos/PloForm'
import {
  createPlo,
  deletePlo,
  getPlo,
  listPlos,
  listReachablePrograms,
  updatePlo,
} from '../api/plos'

/**
 * ผลการเรียนรู้ระดับหลักสูตร (PLO) — ticket #19.
 *
 * What a graduate of a หลักสูตร can do, as a tree of ข้อหลัก and their ข้อย่อย.
 * The screen belongs to the กรรมการหลักสูตร; the ผู้ดูแลภาควิชา above them
 * reaches it too, over the curricula they hold, and neither is told so by this
 * file — the server filters the list and refuses the writes, and what arrives
 * is simply what that account may see (ADR-0002).
 *
 * Four things about this screen are decisions rather than habit.
 *
 * *There is no pager.* Every other master-data screen has one and this one
 * deliberately does not: a ข้อย่อย on page two whose ข้อหลัก is on page one is
 * not a tree, and no arrangement of the rows on this side puts it back
 * together. The whole set for the chosen curriculum arrives at once.
 *
 * *The order is the server's, and this file does not re-sort.* The rows come
 * back already walked — each ข้อย่อย directly after its ข้อหลัก, siblings in
 * their stated ลำดับ — so drawing them in the order they arrived is what makes
 * the fourth criterion true. Sorting here would quietly move that decision to
 * a place no test watches.
 *
 * *Nesting is shown by indenting on `level_depth` and by saying so.* A ข้อย่อย
 * is drawn inset from its ข้อหลัก with a rule down its left, and its รหัส is
 * the ข้อหลัก's plus its own — which is how the committee writes them anyway.
 *
 * *The same รหัส in another หลักสูตร is not a clash.* Nothing here treats a
 * code as an identifier: two curricula each holding a PLO-1 is the point of the
 * ticket, and the key every action carries is `outcome_id`.
 *
 * Removing asks first, and may come back having done something else. An outcome
 * nothing points at is deleted; one a subject mapping or a CLO points at is
 * switched off instead; and one that still has ข้อย่อย is refused, because
 * switching a ข้อหลัก off while its children stay listed underneath is not what
 * was asked for. The banner says which of the three happened.
 */

export default function Plos() {
  const [program, setProgram] = useState('')
  const [plos, setPlos] = useState([])
  const [everything, setEverything] = useState([])
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
      const { plos: rows } = await listPlos({ program_id: program })
      setPlos(rows)
      // The table shows what was asked for; the form's ข้อหลัก picker has to
      // offer outcomes of whatever curriculum the form is on, which need not be
      // the one the table is filtered to. An administrator who narrows to one
      // curriculum and then adds an outcome to the other would otherwise be
      // offered nothing to put it under, with nothing on screen saying why.
      setEverything(program ? (await listPlos({})).plos : rows)
    } catch (error) {
      report(error)
    } finally {
      setLoading(false)
    }
  }, [program, report])

  useEffect(() => {
    load()
  }, [load])

  // The curricula in reach, fetched once: what this account covers is a
  // property of the grant and does not change with what is being looked at.
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

  // Read afresh rather than editing the row the list happens to be holding.
  const openEditor = async plo => {
    setNotice(null)
    setBusy(true)
    try {
      const { plo: current } = await getPlo(plo.outcome_id)
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
      if (editing?.outcome_id) await updatePlo(editing.outcome_id, draft)
      else await createPlo(draft)
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
      const answer = await deletePlo(removing.outcome_id)
      const deactivated = Boolean(answer?.deactivated)
      setRemoving(null)
      setNotice({
        error: false,
        message: deactivated
          ? 'ผลการเรียนรู้ข้อนี้มีรายวิชาหรือ CLO อ้างอิงอยู่ ระบบจึงปิดการใช้งานแทนการลบ ข้อมูลเดิมยังเรียกดูได้'
          : 'ลบผลการเรียนรู้เรียบร้อยแล้ว',
      })
      await load()
    } catch (error) {
      // A ข้อหลัก that still has ข้อย่อย is refused outright, and the sentence
      // the server sends says what to do about it. The dialog closes either
      // way: leaving it open over a banner it cannot be read past is worse.
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
        <PloForm
          value={editing}
          plos={everything}
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
            <h1 className="text-lg font-medium text-primary">ผลการเรียนรู้ระดับหลักสูตร</h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* A picker when there is a choice to make, and a statement of
                  where one is when there is not — รายวิชาในหลักสูตร's control,
                  for its reasons. A กรรมการหลักสูตร reaches one curriculum and
                  is shown which. */}
              {programs.length > 1 ? (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  หลักสูตร
                  <select
                    value={program}
                    onChange={event => setProgram(event.target.value)}
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
                เพิ่มผลการเรียนรู้
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            รหัสผลการเรียนรู้เป็นของหลักสูตรใดหลักสูตรหนึ่ง หลักสูตรอื่นจึงใช้รหัสเดียวกันได้
            และข้อย่อยจะแสดงเยื้องเข้าไปใต้ข้อหลักของตัวเองตามลำดับที่ตั้งไว้
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัส</th>
                  <th className="px-4 py-3">ผลการเรียนรู้</th>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3">ลำดับ</th>
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
                {!loading && plos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีผลการเรียนรู้ในหลักสูตรนี้
                    </td>
                  </tr>
                )}
                {!loading &&
                  plos.map(plo => (
                    <tr key={plo.outcome_id}>
                      <td className="px-4 py-3">
                        {/* The indent is the nesting. `level_depth` comes from
                            the server and is the parent's plus one, so a ข้อย่อย
                            of a ข้อย่อย steps in again rather than sitting level
                            with its aunt. */}
                        <div
                          className={
                            plo.level_depth > 1 ? 'border-l-2 border-gray-200 pl-3' : 'font-bold'
                          }
                          style={{ marginLeft: `${(plo.level_depth - 1) * 1.5}rem` }}
                        >
                          <span className="text-gray-900">{plo.outcome_code}</span>
                          {plo.level_depth > 1 && (
                            <span className="ml-2 text-xs text-slate-400">ข้อย่อย</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {plo.outcome_title}
                        {plo.outcome_description && (
                          <span className="block text-xs text-slate-500">
                            {plo.outcome_description}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-800">
                          {TYPES[plo.outcome_type] ?? plo.outcome_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{plo.sequence_order}</td>
                      <td className="px-4 py-3 text-slate-500">{nameOf(plo.program_id)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            plo.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {plo.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(plo)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null)
                            setRemoving(plo)
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
        title="ยืนยันการลบผลการเรียนรู้"
        message={
          removing
            ? `ต้องการลบผลการเรียนรู้ ${removing.outcome_code} ${removing.outcome_title} ใช่หรือไม่ หากมีรายวิชาหรือ CLO อ้างอิงอยู่ ระบบจะปิดการใช้งานให้แทนการลบ และหากยังมีข้อย่อยอยู่จะลบไม่ได้`
            : ''
        }
        confirmLabel="ลบผลการเรียนรู้"
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

import { useCallback, useEffect, useRef, useState } from 'react'

import ConfirmDialog from '../components/ConfirmDialog'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import Pager from '../components/Pager'
import ProgramForm from '../components/programs/ProgramForm'
import {
  createProgram,
  deleteProgram,
  getProgram,
  importPrograms,
  importTemplate,
  listPrograms,
  listReachableDepartments,
  updateProgram,
} from '../api/programs'

/**
 * ข้อมูลหลักสูตร — ticket #15.
 *
 * The degree curricula a department offers. The first screen two roles share:
 * the faculty administrator sees every department's, the department
 * administrator sees their own. Neither of them is told so by this file - the
 * server filters the list and refuses the writes, and what arrives is simply
 * what that account may see (ADR-0002). The Central Admin reaches none of it.
 *
 * The paging is server-side, as on ข้อมูลผู้ใช้งาน and ข้อมูลภาควิชา.
 *
 * The list shows retired programmes as well as current ones, deliberately: this
 * is the screen one is switched back on from, and a management list that hid
 * them would make retiring a programme a one-way door. The screens that ask a
 * person to *pick* a programme are the ones that hide them, with `active=1`.
 *
 * Removing one asks first, and may come back having done something else. A
 * programme nothing points at is deleted; a programme with PLOs, รายวิชาใน
 * หลักสูตร, students or graded work behind it is switched off instead, and the
 * banner says which happened. Telling the person "ลบแล้ว" for a record that is
 * still in the table would be a lie they then act on.
 */

const PAGE_SIZE = 10

export default function Programs() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ programs: [], total: 0 })
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  /**
   * A write holds `writing` and a read holds `reading`, and a read puts down
   * only its own - #142. `Departments.js` carries the reasons.
   */
  const [writing, setWriting] = useState(false)
  const [reading, setReading] = useState(false)
  const busy = writing || reading

  const report = useCallback(error => {
    // A 401 already raises the shell's dialog; saying it again here would put a
    // banner behind that dialog.
    if (!error.expired) setNotice({ error: true, message: error.message })
  }, [])

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
      const answer = await listPrograms({ page, per_page: PAGE_SIZE })
      if (isCurrent()) setData(answer)
    } catch (error) {
      if (isCurrent()) report(error)
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [page, report])

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

  // The departments in reach, fetched once: what this account covers is a
  // property of the grant and does not change with the page being looked at.
  // Used twice - to name the department each row sits in, and as the pool the
  // form's picker draws from.
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
    departments.find(department => department.department_id === departmentId)
      ?.department_name_th ?? departmentId

  /**
   * Which press of แก้ไข the form was last asked for - #139. แก้ไข makes a new
   * ask, and เพิ่มหลักสูตร, ลบ and the import say none; a read overtaken by any of them
   * draws neither its form nor its refusal, though the list is still reloaded.
   * `Departments.js` carries the reasons.
   */
  const asked = useRef(null)

  /**
   * The last thing that opened on this screen - #146. เพิ่มหลักสูตร writes it and
   * so does แก้ไข, at the press; ยกเลิก does not, and neither does the save that
   * closes its own form. A save whose answer finds a different opening closes
   * nothing and says nothing, neither its banner nor its refusal; one that finds
   * nothing in its place says what it did. `Departments.js` carries the reasons.
   */
  const showing = useRef(null)

  // Read afresh rather than editing the row the table happens to be holding.
  const openEditor = async program => {
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
      const { program: current } = await getProgram(program.program_id)
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
      if (editing?.program_id) {
        await updateProgram(editing.program_id, draft)
      } else {
        await createProgram(draft)
      }
      if (showing.current === sent) {
        setEditing(null)
        setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })
      }
      await load(() => onScreen.current === load)
    } catch (error) {
      if (showing.current === sent) report(error)
    } finally {
      setWriting(false)
    }
  }

  const confirmRemoval = async () => {
    setWriting(true)
    try {
      const answer = await deleteProgram(removing.program_id)
      const deactivated = Boolean(answer?.deactivated)
      setRemoving(null)
      setNotice({
        error: false,
        message: deactivated
          ? 'หลักสูตรนี้มีข้อมูลอื่นอ้างอิงอยู่ ระบบจึงปิดการใช้งานแทนการลบ ข้อมูลเดิมยังเรียกดูได้'
          : 'ลบหลักสูตรเรียบร้อยแล้ว',
      })
      // The last row of the last page having gone, staying on that page shows an
      // empty table and reads as "there are none". Stepping back is a change of
      // page and the effect fetches it; calling `load` here as well would race
      // it with a second request for the page just left. A deactivation removes
      // nothing from the list, so it never steps back.
      const stepBack = !deactivated && page > 1 && data.programs.length === 1
      if (stepBack) setPage(current => current - 1)
      else await load(() => onScreen.current === load)
    } catch (error) {
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
        <ProgramForm
          value={editing}
          departments={departments}
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
            <h1 className="text-lg font-medium text-primary">ข้อมูลหลักสูตร</h1>
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
              เพิ่มหลักสูตร
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3">รหัสหลักสูตร</th>
                  <th className="px-4 py-3">ชื่อหลักสูตร</th>
                  <th className="px-4 py-3">ภาควิชา</th>
                  <th className="px-4 py-3">ปีหลักสูตร</th>
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
                {!loading && data.programs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีหลักสูตรในระบบ
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.programs.map(program => (
                    <tr key={program.program_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{program.program_id}</td>
                      <td className="px-4 py-3">
                        {program.program_name_th}
                        {program.program_name_en && (
                          <span className="block text-xs text-slate-500">
                            {program.program_name_en}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {nameOf(program.department_id)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{program.year ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            program.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {program.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(program)}
                          className="rounded-lg px-3 py-1.5 text-primary hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            asked.current = null
                            setNotice(null)
                            setRemoving(program)
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
            title="นำเข้าหลักสูตรจากไฟล์"
            subtitle="ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วอัปโหลดกลับ หากมีแถวใดผิดพลาดระบบจะไม่บันทึกรายการใดเลย"
            templateName="programs-template.csv"
            fetchTemplate={importTemplate}
            send={importPrograms}
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
        title="ยืนยันการลบหลักสูตร"
        message={
          removing
            ? `ต้องการลบหลักสูตร ${removing.program_id} ${removing.program_name_th} ใช่หรือไม่ หากมี PLO รายวิชาในหลักสูตร นักศึกษา หรือผลการเรียนอ้างอิงอยู่ ระบบจะปิดการใช้งานให้แทนการลบ`
            : ''
        }
        confirmLabel="ลบหลักสูตร"
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

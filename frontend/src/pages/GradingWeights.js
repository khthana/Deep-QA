import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HiOutlineTrash } from 'react-icons/hi2'

import ConfirmDialog from '../components/ConfirmDialog'
import ContentMotionDIV from '../components/ContentMotionDIV'
import ImportPanel from '../components/ImportPanel'
import Notice from '../components/Notice'
import {
  getWeights,
  saveWeights,
  importTemplate,
  importWeights,
} from '../api/weights'

/**
 * สัดส่วนคะแนน — ticket #30.
 *
 * How the Subject's marks are divided: หมวดคะแนน each carrying a weight, the
 * weights totalling 100. The scheme belongs to the Offering (ADR-0003) — the
 * sentence under the heading says so, as it does on every screen at this
 * grain — and Activities are filed under its rows, which is why removing a
 * category a colleague has Activities in comes back refused by name.
 *
 * ## The screen edits a draft and saves it whole
 *
 * There is no per-row save. Adding a category to a scheme that totals 100
 * necessarily passes through a state that does not, so the only honest unit
 * of persistence is the whole list: the person balances the numbers, watches
 * the running total, and presses บันทึก once it reads 100. The server is the
 * one that enforces it — the total line here is a courtesy, and the refusal
 * sentence (which carries the server's own total) is shown as sent.
 *
 * ## Removal is a draft edit behind a confirmation
 *
 * The dialog says the removal takes effect on save, because that is true —
 * nothing leaves the database until บันทึก, and a removal the server refuses
 * (a category in use) leaves the saved scheme exactly as it was.
 */
export default function GradingWeights() {
  const { sectionId } = useParams()
  const [data, setData] = useState(null)
  const [draft, setDraft] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const answered = await getWeights(sectionId)
      setData(answered)
      setDraft(
        answered.weights.map(row => ({
          score_ratio_id: row.score_ratio_id,
          score_category: row.score_category,
          weight: String(row.weight),
        }))
      )
    } catch (error) {
      setData(null)
      setDraft([])
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    load()
  }, [load])

  const set = (index, field, value) =>
    setDraft(current =>
      current.map((row, at) =>
        at === index ? { ...row, [field]: value } : row
      )
    )

  // The running total the person balances against. Cells that are not a
  // number yet count as nought — the server is the judge of the real thing.
  const total = draft.reduce((sum, row) => {
    const weight = Number(row.weight)
    return sum + (Number.isFinite(weight) ? weight : 0)
  }, 0)

  const save = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await saveWeights(
        sectionId,
        draft.map(row => ({
          ...(row.score_ratio_id ? { score_ratio_id: row.score_ratio_id } : {}),
          score_category: row.score_category,
          // A blank cell is sent as the nothing it is, not as a zero — the
          // server's refusal names the field, and a silent 0 would be the
          // exact coercion readWeight forswears on its side.
          weight: row.weight.trim() === '' ? null : Number(row.weight),
        }))
      )
      await load()
      setNotice({ error: false, message: 'บันทึกสัดส่วนคะแนนแล้ว' })
    } catch (error) {
      if (!error.expired) setNotice({ error: true, message: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = () => {
    setDraft(current => current.filter((row, at) => at !== removing.index))
    setRemoving(null)
  }

  return (
    <ContentMotionDIV className="space-y-4 px-6 py-6">
      <Notice notice={notice} />

      {loading && !data && (
        <p className="text-sm text-slate-500">กำลังโหลดข้อมูล…</p>
      )}

      {/* The screen stays mounted through a reload — unlike its siblings,
          which blank to the loading line. The import panel keeps its own
          report ("นำเข้าสำเร็จ 4 รายการ", or the per-row table), and a
          reload that unmounted the panel would wipe the report at the very
          moment it says what just happened. */}
      {data && (
        <>
          <div>
            <p className="text-xs font-medium text-slate-400">
              {data.offering.subject_id}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">
              สัดส่วนคะแนน
            </h1>
            {/*
              The grain, in words — the line break falls before และ, where a
              space belongs, for CourseOutcomes' reason: JSX joins two lines
              with one space, and Thai does not space inside a word.
            */}
            <p className="mt-2 text-sm text-slate-500">
              ปีการศึกษา {data.offering.academic_year} ·
              ทุกตอนเรียนของรายวิชานี้ในปีการศึกษาเดียวกันใช้ชุดเดียวกันนี้
              และปีการศึกษาอื่นมีชุดของตัวเอง
            </p>
            <p className="mt-1 text-sm text-slate-500">
              น้ำหนักทุกหมวดรวมกันต้องเท่ากับ 100 จึงจะบันทึกได้
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <ul className="space-y-3">
              {draft.map((row, index) => (
                <li
                  key={row.score_ratio_id ?? `new-${index}`}
                  className="flex items-end gap-3"
                >
                  <label className="block grow">
                    <span className="mb-1 block text-sm text-gray-500">
                      หมวดคะแนนที่ {index + 1}
                    </span>
                    <input
                      type="text"
                      value={row.score_category}
                      onChange={event =>
                        set(index, 'score_category', event.target.value)
                      }
                      placeholder="เช่น โครงงาน"
                      aria-label={`ชื่อหมวดคะแนนที่ ${index + 1}`}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
                    />
                  </label>
                  <label className="block w-28">
                    <span className="mb-1 block text-sm text-gray-500">
                      น้ำหนัก
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={row.weight}
                      onChange={event =>
                        set(index, 'weight', event.target.value)
                      }
                      aria-label={`น้ำหนักหมวดคะแนนที่ ${index + 1}`}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setRemoving({ index, name: row.score_category })
                    }
                    aria-label={`ลบหมวดคะแนนที่ ${index + 1}`}
                    className="rounded-lg p-2.5 text-red-600 hover:bg-red-50"
                  >
                    <HiOutlineTrash className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>

            {draft.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-slate-500">
                ยังไม่มีหมวดคะแนนของปีการศึกษา {data.offering.academic_year}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setDraft(current => [
                    ...current,
                    { score_category: '', weight: '' },
                  ])
                }
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                เพิ่มหมวดคะแนน
              </button>

              <div className="flex items-center gap-4">
                {/* The courtesy copy of the rule the server enforces. */}
                <p
                  className={`text-sm font-medium ${
                    total === 100 ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  รวม {total} / 100
                </p>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary_hover disabled:opacity-60"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>

          <ImportPanel
            title="นำเข้าสัดส่วนคะแนนจากไฟล์"
            subtitle="ไฟล์หนึ่งคือทั้งชุด — หมวดที่ไม่อยู่ในไฟล์จะถูกลบออก และน้ำหนักทั้งไฟล์ต้องรวมได้ 100"
            templateName="weighting-scheme-template.csv"
            fetchTemplate={() => importTemplate(sectionId)}
            send={csv => importWeights(sectionId, csv)}
            onStart={() => setNotice(null)}
            onImported={load}
            onError={error => {
              if (!error.expired)
                setNotice({ error: true, message: error.message })
            }}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="ลบหมวดคะแนน"
        message={
          removing
            ? `ต้องการนำ${removing.name ? `หมวด "${removing.name}"` : 'หมวดใหม่'}ออกจากสัดส่วนคะแนนหรือไม่ การลบมีผลเมื่อกดบันทึก และทุกตอนเรียนของรายวิชานี้จะใช้ชุดที่แก้แล้ว`
            : ''
        }
        confirmLabel="ลบ"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </ContentMotionDIV>
  )
}
